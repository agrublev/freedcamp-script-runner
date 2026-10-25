use super::helpers::read_json;
use aes::Aes256;
use base64::{Engine, engine::general_purpose::STANDARD};
use cbc::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit, block_padding::Pkcs7};
use dialoguer::{Confirm, Password, Select};
use md5::{Digest, Md5};
use rand::{RngCore, rngs::OsRng};
use scrypt::{Params, scrypt};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

type AesCbcEnc = cbc::Encryptor<Aes256>;
type AesCbcDec = cbc::Decryptor<Aes256>;

pub fn encrypt_file(path: &Path, output: Option<&Path>, decrypt: bool) -> Result<(), String> {
    let default_output = if decrypt {
        PathBuf::from(path.to_string_lossy().trim_end_matches(".encrypted"))
    } else {
        PathBuf::from(format!("{}.encrypted", path.display()))
    };
    let output = output.unwrap_or(&default_output);
    if output.exists()
        && !Confirm::new()
            .with_prompt(format!("{} exists. Overwrite?", output.display()))
            .default(false)
            .interact()
            .map_err(|e| e.to_string())?
    {
        return Ok(());
    }
    let password = if decrypt {
        Password::new().with_prompt("Secret key").interact()
    } else {
        Password::new()
            .with_prompt("Secret key")
            .with_confirmation("Confirm secret key", "Passwords do not match")
            .interact()
    }
    .map_err(|e| e.to_string())?;
    let input = fs::read(path).map_err(|e| e.to_string())?;
    let result = if decrypt {
        decrypt_bytes(&input, &password)?
    } else {
        encrypt_bytes(&input, &password)?
    };
    if let Some(parent) = output.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(output, result).map_err(|e| e.to_string())?;
    println!("Wrote {}", output.display());
    Ok(())
}

pub fn configured_encryption() -> Result<(), String> {
    let direction = ["encrypt", "decrypt"];
    let choice = Select::new()
        .with_prompt("Which direction?")
        .items(&direction)
        .default(0)
        .interact()
        .map_err(|e| e.to_string())?;
    let decrypt = choice == 1;
    let package = read_json(Path::new("package.json"))?;
    let configured: Vec<String> = package
        .get("fscripts")
        .and_then(|v| v.get("encryptedFiles"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::to_owned)
        .collect();
    if configured.is_empty() {
        return Err("package.json has no fscripts.encryptedFiles list".into());
    }
    let password = if decrypt {
        Password::new().with_prompt("Secret key").interact()
    } else {
        Password::new()
            .with_prompt("Secret key")
            .with_confirmation("Confirm secret key", "Passwords do not match")
            .interact()
    }
    .map_err(|e| e.to_string())?;
    let mut ignored = fs::read_to_string(".gitignore").unwrap_or_default();
    for relative in configured {
        let plain = PathBuf::from(&relative);
        let encrypted = plain.with_file_name(format!(
            ".{}",
            plain.file_name().and_then(|s| s.to_str()).unwrap_or("")
        ));
        let (input, output) = if decrypt {
            (&encrypted, &plain)
        } else {
            (&plain, &encrypted)
        };
        let bytes = fs::read(input).map_err(|e| format!("{}: {e}", input.display()))?;
        if output.exists()
            && !Confirm::new()
                .with_prompt(format!("{} exists. Overwrite?", output.display()))
                .default(false)
                .interact()
                .map_err(|e| e.to_string())?
        {
            continue;
        }
        let result = if decrypt {
            decrypt_bytes(&bytes, &password)?
        } else {
            encrypt_bytes(&bytes, &password)?
        };
        if let Some(parent) = output.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
        }
        fs::write(output, result).map_err(|e| e.to_string())?;
        if !decrypt {
            let entry = relative.trim_start_matches('/');
            if !ignored.lines().any(|line| line == entry) {
                ignored.push_str(&format!("\n{entry}\n"));
            }
        }
    }
    if !decrypt {
        fs::write(".gitignore", ignored).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn encrypt_bytes(input: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; 8];
    OsRng.fill_bytes(&mut salt);
    let (key, iv) = evp_bytes_to_key(password.as_bytes(), &salt);
    let ciphertext = AesCbcEnc::new_from_slices(&key, &iv)
        .map_err(|e| e.to_string())?
        .encrypt_padded_vec_mut::<Pkcs7>(input);
    let mut bytes = b"Salted__".to_vec();
    bytes.extend_from_slice(&salt);
    bytes.extend_from_slice(&ciphertext);
    Ok(STANDARD.encode(bytes).into_bytes())
}

fn decrypt_bytes(input: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let encoded = String::from_utf8_lossy(input).trim().to_owned();
    let decoded = STANDARD.decode(&encoded).ok();
    let data = match decoded {
        Some(data) if data.len() >= 16 && &data[..8] == b"Salted__" => data,
        _ => {
            let ciphertext = hex_decode(&encoded)?;
            let mut key = [0u8; 24];
            scrypt(
                password.as_bytes(),
                b"salt",
                &Params::new(14, 8, 1, 24).map_err(|e| e.to_string())?,
                &mut key,
            )
            .map_err(|e| e.to_string())?;
            let iv = [0u8; 16];
            return cbc::Decryptor::<aes::Aes192>::new_from_slices(&key, &iv)
                .map_err(|e| e.to_string())?
                .decrypt_padded_vec_mut::<Pkcs7>(&ciphertext)
                .map_err(|_| "decryption failed: wrong password or corrupt file".into());
        }
    };
    let (key, iv) = evp_bytes_to_key(password.as_bytes(), &data[8..16]);
    AesCbcDec::new_from_slices(&key, &iv)
        .map_err(|e| e.to_string())?
        .decrypt_padded_vec_mut::<Pkcs7>(&data[16..])
        .map_err(|_| "decryption failed: wrong password or corrupt file".into())
}

fn evp_bytes_to_key(password: &[u8], salt: &[u8]) -> ([u8; 32], [u8; 16]) {
    let mut data = Vec::new();
    let mut block = Vec::new();
    while data.len() < 48 {
        let mut digest = Md5::new();
        digest.update(&block);
        digest.update(password);
        digest.update(salt);
        block = digest.finalize().to_vec();
        data.extend_from_slice(&block);
    }
    let mut key = [0u8; 32];
    let mut iv = [0u8; 16];
    key.copy_from_slice(&data[..32]);
    iv.copy_from_slice(&data[32..48]);
    (key, iv)
}

pub fn decrypt_legacy_file(input: &Path, output: &Path, password: &str) -> Result<(), String> {
    let text = fs::read_to_string(input).map_err(|e| e.to_string())?;
    let bytes = hex_decode(text.trim())?;
    let mut key = [0u8; 24];
    scrypt(
        password.as_bytes(),
        b"salt",
        &Params::new(14, 8, 1, 24).map_err(|e| e.to_string())?,
        &mut key,
    )
    .map_err(|e| e.to_string())?;
    let iv = [0u8; 16];
    let cipher =
        cbc::Decryptor::<aes::Aes192>::new_from_slices(&key, &iv).map_err(|e| e.to_string())?;
    let plaintext = cipher
        .decrypt_padded_vec_mut::<Pkcs7>(&bytes)
        .map_err(|_| "legacy decryption failed".to_owned())?;
    fs::write(output, plaintext).map_err(|e| e.to_string())
}

fn hex_decode(text: &str) -> Result<Vec<u8>, String> {
    if text.len() % 2 != 0 {
        return Err("invalid hex data".into());
    }
    text.as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            u8::from_str_radix(std::str::from_utf8(pair).map_err(|e| e.to_string())?, 16)
                .map_err(|e| e.to_string())
        })
        .collect()
}

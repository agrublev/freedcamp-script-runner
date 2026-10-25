//! Byte-compatible port of `lib/utils/encryption.js`.
//!
//! Current format: base64("Salted__" ‖ 8-byte salt ‖ AES-256-CBC(PKCS7)), key/IV
//! from OpenSSL `EVP_BytesToKey(MD5, 1 iteration)` — i.e. what
//! `openssl enc -aes-256-cbc -salt -base64 -md md5` and CryptoJS produce.
//! Legacy format (decrypt only): hex AES-192-CBC, key = scrypt(pw, "salt", 24)
//! with Node's defaults (N=16384, r=8, p=1), IV = 16 zero bytes.

use aes::cipher::{BlockDecryptMut, BlockEncryptMut, KeyIvInit, block_padding::Pkcs7};
use anyhow::{Result, anyhow};
use base64::{Engine, engine::general_purpose::STANDARD};
use md5::{Digest, Md5};
use rand::RngCore;
use zeroize::{Zeroize, Zeroizing};

const MAGIC: &[u8; 8] = b"Salted__";

fn evp_bytes_to_key(password: &[u8], salt: &[u8]) -> Zeroizing<[u8; 48]> {
    let mut out = Zeroizing::new([0u8; 48]);
    let mut prev: Vec<u8> = Vec::new();
    let mut filled = 0;
    while filled < 48 {
        let mut h = Md5::new();
        h.update(&prev);
        h.update(password);
        h.update(salt);
        let block = h.finalize();
        let n = (48 - filled).min(16);
        out[filled..filled + n].copy_from_slice(&block[..n]);
        filled += n;
        prev.zeroize();
        prev = block.to_vec();
    }
    prev.zeroize();
    out
}

pub fn encrypt_with_salt(plain: &[u8], password: &str, salt: [u8; 8]) -> String {
    let kv = evp_bytes_to_key(password.as_bytes(), &salt);
    let ct = cbc::Encryptor::<aes::Aes256>::new_from_slices(&kv[..32], &kv[32..48])
        .expect("fixed key/iv sizes")
        .encrypt_padded_vec_mut::<Pkcs7>(plain);
    let mut buf = Vec::with_capacity(16 + ct.len());
    buf.extend_from_slice(MAGIC);
    buf.extend_from_slice(&salt);
    buf.extend_from_slice(&ct);
    STANDARD.encode(buf)
}

pub fn encrypt(plain: &[u8], password: &str) -> String {
    let mut salt = [0u8; 8];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    encrypt_with_salt(plain, password, salt)
}

pub fn decrypt(text: &str, password: &str) -> Result<Zeroizing<Vec<u8>>> {
    let raw: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    match STANDARD.decode(&raw) {
        Ok(data) if data.len() >= 16 && &data[..8] == MAGIC => {
            let kv = evp_bytes_to_key(password.as_bytes(), &data[8..16]);
            cbc::Decryptor::<aes::Aes256>::new_from_slices(&kv[..32], &kv[32..48])
                .expect("fixed key/iv sizes")
                .decrypt_padded_vec_mut::<Pkcs7>(&data[16..])
                .map(Zeroizing::new)
                .map_err(|_| anyhow!("Decryption failed — wrong password or corrupted file"))
        }
        _ => decrypt_legacy(text.trim(), password),
    }
}

pub fn decrypt_legacy(hex_text: &str, password: &str) -> Result<Zeroizing<Vec<u8>>> {
    let data = hex::decode(hex_text.trim()).map_err(|_| {
        anyhow!("Not an fsr-encrypted file (neither Salted__ base64 nor legacy hex)")
    })?;
    let mut key = Zeroizing::new([0u8; 24]);
    let params = scrypt::Params::new(14, 8, 1, 24).expect("valid scrypt params");
    scrypt::scrypt(password.as_bytes(), b"salt", &params, &mut key[..])
        .map_err(|e| anyhow!("scrypt: {e}"))?;
    cbc::Decryptor::<aes::Aes192>::new_from_slices(&key[..], &[0u8; 16])
        .expect("fixed key/iv sizes")
        .decrypt_padded_vec_mut::<Pkcs7>(&data)
        .map(Zeroizing::new)
        .map_err(|_| anyhow!("Decryption failed — wrong password or corrupted file"))
}

/// Legacy encrypt — only used by tests to produce fixtures.
#[doc(hidden)]
pub fn encrypt_legacy(plain: &[u8], password: &str) -> String {
    let mut key = [0u8; 24];
    scrypt::scrypt(
        password.as_bytes(),
        b"salt",
        &scrypt::Params::new(14, 8, 1, 24).unwrap(),
        &mut key,
    )
    .unwrap();
    let ct = cbc::Encryptor::<aes::Aes192>::new_from_slices(&key, &[0u8; 16])
        .unwrap()
        .encrypt_padded_vec_mut::<Pkcs7>(plain);
    hex::encode(ct)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn roundtrip() {
        let c = encrypt(b"{\"secret\":1}", "pw");
        assert!(STANDARD.decode(&c).unwrap().starts_with(MAGIC));
        assert_eq!(&*decrypt(&c, "pw").unwrap(), b"{\"secret\":1}");
        assert!(
            decrypt(&c, "wrong").is_err() || &*decrypt(&c, "wrong").unwrap() != b"{\"secret\":1}"
        );
    }
    #[test]
    fn legacy_roundtrip_and_detection() {
        let c = encrypt_legacy(b"old", "pw");
        assert_eq!(&*decrypt(&c, "pw").unwrap(), b"old");
    }
}

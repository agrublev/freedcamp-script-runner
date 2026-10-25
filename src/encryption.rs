//! Port of `lib/encryption/encryption.js` (the `encrypt`, `decrypt` and
//! `encryption` commands). Differences from JS, on purpose:
//! * the file is given as an argument instead of the fc-filepick picker,
//! * writes are atomic, the password and plaintext are zeroized,
//! * errors produce a non-zero exit code (JS logged and exited 0),
//! * `FSR_SECRET` env var can supply the password non-interactively (new).

use crate::{crypto, fsutil};
use anyhow::{Context, Result, bail};
use std::path::{Path, PathBuf};
use zeroize::Zeroizing;

pub fn get_pass() -> Result<Zeroizing<String>> {
    if let Ok(p) = std::env::var("FSR_SECRET") {
        return Ok(Zeroizing::new(p));
    }
    let p = rpassword::prompt_password("Enter a SECRET key (same as pass app) : ")
        .context("reading password")?;
    Ok(Zeroizing::new(p))
}

fn confirm_overwrite(path: &Path, yes: bool) -> Result<bool> {
    if yes || !path.exists() {
        return Ok(true);
    }
    eprintln!("\x1b[1;31mFILE ALREADY EXISTS ARE YOU SURE?\x1b[0m");
    Ok(dialoguer::Confirm::new()
        .with_prompt(format!("Sure wanna override file {}?", path.display()))
        .default(false)
        .interact()?)
}

pub fn encrypt_file(plain: &Path, out: &Path, pass: &str, yes: bool) -> Result<bool> {
    if !confirm_overwrite(out, yes)? {
        return Ok(false);
    }
    let data = Zeroizing::new(
        std::fs::read(plain).with_context(|| format!("reading {}", plain.display()))?,
    );
    fsutil::write_atomic(out, crypto::encrypt(&data, pass).as_bytes())?;
    Ok(true)
}

pub fn decrypt_file(enc: &Path, out: &Path, pass: &str, yes: bool) -> Result<bool> {
    if !confirm_overwrite(out, yes)? {
        return Ok(false);
    }
    let text =
        std::fs::read_to_string(enc).with_context(|| format!("reading {}", enc.display()))?;
    let plain = crypto::decrypt(&text, pass)?;
    fsutil::write_atomic(out, &plain)?;
    eprintln!("\x1b[1;32mDECRYPTED FILE:\x1b[0m {}", out.display());
    Ok(true)
}

/// `fsr encrypt <file>` → `<file>.encrypted` (JS default naming).
pub fn cmd_encrypt(file: &Path, yes: bool) -> Result<()> {
    let out = PathBuf::from(format!("{}.encrypted", file.display()));
    encrypt_file(file, &out, &get_pass()?, yes)?;
    Ok(())
}

/// `fsr decrypt <file.encrypted>` → strip `.encrypted`.
pub fn cmd_decrypt(file: &Path, yes: bool) -> Result<()> {
    let s = file.to_string_lossy();
    let Some(out) = s.strip_suffix(".encrypted") else {
        bail!("expected a *.encrypted file")
    };
    decrypt_file(file, Path::new(out), &get_pass()?, yes)?;
    Ok(())
}

/// Paths for an `encryptedFiles` entry: `dir/name` → (`dir/.name`, `dir/name`).
pub fn configured_paths(root: &Path, entry: &str) -> (PathBuf, PathBuf) {
    let mut parts: Vec<&str> = entry.split('/').collect();
    let name = parts.pop().unwrap_or("");
    let dir = root.join(parts.join("/"));
    (dir.join(format!(".{name}")), dir.join(name))
}

/// `fsr encryption`: encrypt/decrypt every `package.json > fscripts.encryptedFiles`
/// entry and make sure the plaintext paths are in `.gitignore`.
pub fn cmd_encryption(root: &Path, direction: Option<&str>, yes: bool) -> Result<()> {
    let pass = get_pass()?;
    let encrypt = match direction {
        Some("encrypt") => true,
        Some("decrypt") => false,
        Some(o) => bail!("unknown direction {o}"),
        None => {
            dialoguer::Select::new()
                .with_prompt("Which direction?")
                .items(["encrypt", "decrypt"])
                .default(0)
                .interact()?
                == 0
        }
    };
    let pkg = fsutil::read_json(&root.join("package.json"))?;
    let files: Vec<String> = pkg["fscripts"]["encryptedFiles"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();
    let ig_path = root.join(".gitignore");
    let ignore = std::fs::read_to_string(&ig_path).unwrap_or_default();
    let ignored: Vec<&str> = ignore.lines().collect();
    let mut to_add = String::new();
    for e in &files {
        if !ignored.contains(&e.as_str()) {
            to_add.push_str(e);
            to_add.push('\n');
        }
        let (enc, plain) = configured_paths(root, e);
        if encrypt {
            encrypt_file(&plain, &enc, &pass, yes)?;
        } else {
            decrypt_file(&enc, &plain, &pass, yes)?;
        }
    }
    if !to_add.is_empty() {
        fsutil::append(&ig_path, &format!("\n{to_add}\n"))?;
        eprintln!("Added files to .gitignore:\n{to_add}");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn configured_path_mapping() {
        let (e, p) = configured_paths(Path::new("/r"), "conf/config.json");
        assert_eq!(e, Path::new("/r/conf/.config.json"));
        assert_eq!(p, Path::new("/r/conf/config.json"));
        let (e, _) = configured_paths(Path::new("/r"), "config.json");
        assert_eq!(e, Path::new("/r/.config.json"));
    }
}

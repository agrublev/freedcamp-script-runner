//! Cross-implementation tests: the JS module `tests/support/encryption.mjs`
//! (pure Node `crypto`, no npm deps) and the Rust port must read each other's
//! output. Skipped (pass) when `node` is not installed.
use std::process::Command;

fn node(script: &str) -> Option<String> {
    let root = env!("CARGO_MANIFEST_DIR");
    let out = Command::new("node")
        .arg("--input-type=module")
        .arg("-e")
        .arg(script)
        .current_dir(root)
        .output()
        .ok()?;
    assert!(
        out.status.success(),
        "node failed: {}",
        String::from_utf8_lossy(&out.stderr)
    );
    Some(String::from_utf8(out.stdout).unwrap())
}

#[test]
fn js_encrypt_rust_decrypt() {
    let Some(ct) = node(
        "import {encrypt} from './tests/support/encryption.mjs'; process.stdout.write(encrypt(Buffer.from('héllo\\n{\"a\":1}'), 'p@ss'))",
    ) else {
        return;
    };
    assert_eq!(
        &*fsr::crypto::decrypt(&ct, "p@ss").unwrap(),
        "héllo\n{\"a\":1}".as_bytes()
    );
}

#[test]
fn rust_encrypt_js_decrypt() {
    let ct = fsr::crypto::encrypt("secret ✓".as_bytes(), "pw");
    let Some(pt) = node(&format!(
        "import {{decrypt}} from './tests/support/encryption.mjs'; process.stdout.write(decrypt('{ct}', 'pw'))"
    )) else {
        return;
    };
    assert_eq!(pt, "secret ✓");
}

#[test]
fn js_legacy_rust_decrypt() {
    // Produce the legacy format exactly as old fsr did (scrypt + aes-192-cbc, zero IV, hex).
    let Some(ct) = node(
        "import crypto from 'crypto'; const k=crypto.scryptSync('pw','salt',24); const c=crypto.createCipheriv('aes-192-cbc',k,Buffer.alloc(16,0)); process.stdout.write(Buffer.concat([c.update('legacy!'),c.final()]).toString('hex'))",
    ) else {
        return;
    };
    assert_eq!(&*fsr::crypto::decrypt(&ct, "pw").unwrap(), b"legacy!");
    assert_eq!(fsr::crypto::encrypt_legacy(b"legacy!", "pw"), ct);
}

#[test]
fn cli_encrypt_decrypt_roundtrip() {
    let d = tempfile::tempdir().unwrap();
    std::fs::write(d.path().join("config.json"), "{\"k\":1}").unwrap();
    let run = |args: &[&str]| {
        Command::new(env!("CARGO_BIN_EXE_fsr"))
            .args(args)
            .env("FSR_SECRET", "s3cret")
            .current_dir(d.path())
            .status()
            .unwrap()
            .code()
    };
    assert_eq!(run(&["encrypt", "config.json", "-y"]), Some(0));
    std::fs::remove_file(d.path().join("config.json")).unwrap();
    assert_eq!(run(&["decrypt", "config.json.encrypted", "-y"]), Some(0));
    assert_eq!(
        std::fs::read_to_string(d.path().join("config.json")).unwrap(),
        "{\"k\":1}"
    );
    // wrong password → non-zero, plaintext untouched
    let st = Command::new(env!("CARGO_BIN_EXE_fsr"))
        .args(["decrypt", "config.json.encrypted", "-y"])
        .env("FSR_SECRET", "nope")
        .current_dir(d.path())
        .status()
        .unwrap();
    assert_ne!(st.code(), Some(0));
    assert_eq!(
        std::fs::read_to_string(d.path().join("config.json")).unwrap(),
        "{\"k\":1}"
    );
}

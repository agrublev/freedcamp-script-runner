# Security Policy

## Reporting a vulnerability

Please report security issues privately by emailing **agrublev@gmail.com** rather than
opening a public issue. Include a description of the problem, the affected `fsr` version,
and a minimal reproduction if you have one.

You'll receive an acknowledgement within a reasonable window, and we'll work with you on a
fix and disclosure timeline.

## Encryption note

The built-in `fsr encrypt` / `fsr decrypt` commands use **AES-256-CBC** with
OpenSSL-compatible **MD5 (EVP_BytesToKey)** key derivation, chosen for interoperability
with OpenSSL and CryptoJS.

Be aware of the trade-offs this involves:

- It is **unauthenticated** — there is no integrity check (no MAC/AEAD), so tampering with
  ciphertext is not detected.
- It relies on a **legacy KDF** (single-round MD5) that is weak by modern standards.

This makes it suitable for **light secret-at-rest obfuscation** of values committed to a
repo, not for high-threat scenarios. For anything sensitive, use a dedicated secrets
manager instead.

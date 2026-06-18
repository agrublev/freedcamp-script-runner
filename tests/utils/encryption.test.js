import { describe, it, expect } from "vitest";
import crypto from "crypto";

// Direct import of the encryption utilities (encrypt/decrypt)
// These are used by the encrypt/decrypt/encryption commands
let encrypt, decrypt;

describe("encryption utilities", () => {
    beforeEach(async () => {
        const mod = await import("../../lib/utils/encryption.js");
        encrypt = mod.encrypt;
        decrypt = mod.decrypt;
    });

    it("encrypt returns a base64 string", () => {
        const result = encrypt("hello world", "mysecretpassword");
        expect(typeof result).toBe("string");
        // OpenSSL salted format starts with "Salted__" in base64
        const buf = Buffer.from(result, "base64");
        expect(buf.subarray(0, 8).toString("utf8")).toBe("Salted__");
    });

    it("decrypt reverses encrypt", () => {
        const plaintext = "secret data 12345";
        const password = "testpassword";
        const ciphertext = encrypt(plaintext, password);
        const decrypted = decrypt(ciphertext, password);
        expect(decrypted.toString("utf8")).toBe(plaintext);
    });

    it("encrypt produces different output each call (random salt)", () => {
        const c1 = encrypt("same text", "same pass");
        const c2 = encrypt("same text", "same pass");
        expect(c1).not.toBe(c2);
    });

    it("decrypt with wrong password throws or returns garbage", () => {
        const ciphertext = encrypt("secret", "correct-password");
        expect(() => decrypt(ciphertext, "wrong-password")).toThrow();
    });

    it("encrypt accepts Buffer input", () => {
        const buf = Buffer.from("buffer content");
        const result = encrypt(buf, "password");
        expect(typeof result).toBe("string");
        const decrypted = decrypt(result, "password");
        expect(decrypted.toString("utf8")).toBe("buffer content");
    });

    // Legacy format: hex-encoded AES-192-CBC with a scrypt-derived key and a
    // zero IV (no "Salted__" magic header). decrypt() must detect the absence
    // of the magic prefix and fall back to decryptLegacy().
    const makeLegacy = (text, password) => {
        const key = crypto.scryptSync(password, "salt", 24);
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv("aes-192-cbc", key, iv);
        return Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("hex");
    };

    it("decrypt falls back to the legacy hex/AES-192 format when there is no Salted__ header", () => {
        const password = "legacy-pass";
        const legacyHex = makeLegacy("legacy secret", password);
        // Sanity: the base64 view of the hex string must NOT start with the magic.
        const asB64 = Buffer.from(legacyHex, "base64");
        expect(asB64.subarray(0, 8).toString("utf8")).not.toBe("Salted__");

        const decrypted = decrypt(legacyHex, password);
        expect(decrypted.toString("utf8")).toBe("legacy secret");
    });

    it("decrypt trims surrounding whitespace before legacy decoding", () => {
        const password = "legacy-pass";
        const legacyHex = makeLegacy("trimmed", password);
        const decrypted = decrypt(`  \n${legacyHex}\n  `, password);
        expect(decrypted.toString("utf8")).toBe("trimmed");
    });
});

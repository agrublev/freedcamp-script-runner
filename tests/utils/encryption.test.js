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
});

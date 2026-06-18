/**
 * Tests for lib/encryption/encryption.js
 *
 * Default export object: { encrypt, decrypt, init, getPass, toEncrypt, encryptedFiles }
 *
 * Strategy: real AES round-trip through real temp files (the underlying
 * lib/utils/encryption.js crypto is exercised for real). Only the interactive
 * bits are mocked: `inquirer` (password / confirm / select prompts) and
 * `fc-filepick` (file picker). When a password and explicit file paths are
 * passed, neither the password prompt nor the picker is invoked.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const promptMock = vi.fn();

vi.mock("inquirer", () => ({
    default: { prompt: (...args) => promptMock(...args) }
}));

// fc-filepick is only reached when file args are null; mock it so import is safe
// and so any accidental invocation is observable rather than opening a real picker.
vi.mock("fc-filepick", () => ({
    default: { default: vi.fn() }
}));

let encryption;
let tmpDir;

beforeEach(async () => {
    promptMock.mockReset();
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fsr-enc-test-"));
    encryption = (await import("../../lib/encryption/encryption.js")).default;
});

afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
});

describe("getPass", () => {
    it("resolves the password entered at the prompt", async () => {
        promptMock.mockResolvedValueOnce({ pass: "super-secret" });
        const pass = await encryption.getPass();
        expect(pass).toBe("super-secret");
        expect(promptMock).toHaveBeenCalledTimes(1);
    });
});

describe("toEncrypt", () => {
    it("returns true when the user selects 'encrypt'", async () => {
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "encrypt" });
        expect(await encryption.toEncrypt()).toBe(true);
    });

    it("returns false when the user selects 'decrypt'", async () => {
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "decrypt" });
        expect(await encryption.toEncrypt()).toBe(false);
    });
});

describe("encrypt + decrypt round-trip", () => {
    it("encrypts a file and decrypts it back to the original contents", async () => {
        const plaintext = "DB_URL=postgres://user:pw@host/db\nSECRET=42\n";
        const decryptedFile = path.join(tmpDir, "config.env");
        const encryptedFile = path.join(tmpDir, "config.env.encrypted");
        const restoredFile = path.join(tmpDir, "config.restored.env");
        fs.writeFileSync(decryptedFile, plaintext);

        // explicit pass + paths => no prompt, no file picker
        await encryption.encrypt("pw123", encryptedFile, decryptedFile);

        expect(fs.existsSync(encryptedFile)).toBe(true);
        const ciphertext = fs.readFileSync(encryptedFile, "utf8");
        expect(ciphertext).not.toContain("postgres://"); // actually encrypted

        await encryption.decrypt("pw123", encryptedFile, restoredFile);

        expect(fs.readFileSync(restoredFile, "utf8")).toBe(plaintext);
        // pure path: neither prompt nor picker was used
        expect(promptMock).not.toHaveBeenCalled();
    });
});

describe("encrypt overwrite guard", () => {
    it("does NOT overwrite an existing encrypted file when the user declines", async () => {
        const decryptedFile = path.join(tmpDir, "secret.txt");
        const encryptedFile = path.join(tmpDir, "secret.txt.encrypted");
        fs.writeFileSync(decryptedFile, "new plaintext");
        fs.writeFileSync(encryptedFile, "PRE-EXISTING-CIPHERTEXT");

        // existing file -> confirm prompt -> user says no
        promptMock.mockResolvedValueOnce({ sure: false });

        await encryption.encrypt("pw123", encryptedFile, decryptedFile);

        expect(promptMock).toHaveBeenCalledTimes(1);
        // untouched because the user declined
        expect(fs.readFileSync(encryptedFile, "utf8")).toBe("PRE-EXISTING-CIPHERTEXT");
    });

    it("overwrites the existing encrypted file when the user confirms", async () => {
        const decryptedFile = path.join(tmpDir, "secret2.txt");
        const encryptedFile = path.join(tmpDir, "secret2.txt.encrypted");
        fs.writeFileSync(decryptedFile, "fresh plaintext");
        fs.writeFileSync(encryptedFile, "OLD");

        promptMock.mockResolvedValueOnce({ sure: true });

        await encryption.encrypt("pw123", encryptedFile, decryptedFile);

        const ciphertext = fs.readFileSync(encryptedFile, "utf8");
        expect(ciphertext).not.toBe("OLD");
        // round-trips back to the new plaintext
        const restored = path.join(tmpDir, "secret2.restored.txt");
        await encryption.decrypt("pw123", encryptedFile, restored);
        expect(fs.readFileSync(restored, "utf8")).toBe("fresh plaintext");
    });
});

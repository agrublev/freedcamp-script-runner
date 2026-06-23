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
import { encrypt as realEncrypt } from "../../lib/utils/encryption.js";

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
// Files the source forces into process.cwd() (it rejoins picked basenames to
// scriptsDir = cwd). Tracked here so they are always cleaned up.
let cwdArtifacts = [];

beforeEach(async () => {
    promptMock.mockReset();
    cwdArtifacts = [];
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fsr-enc-test-"));
    encryption = (await import("../../lib/encryption/encryption.js")).default;
});

afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    for (const f of cwdArtifacts) {
        try { fs.rmSync(f, { force: true }); } catch { /* best-effort */ }
    }
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

// ────────────────────────────────────────────────────────────────────────────
// encrypt()/decrypt() with NO explicit args — exercises the `pass === null`
// (password prompt) and `*File === null` (file-picker) branches. The source
// keeps only the picked file's basename and rejoins it to scriptsDir (cwd), so
// the backing files must live in cwd for the real fs read/write to resolve.
// ────────────────────────────────────────────────────────────────────────────
describe("encrypt with no explicit args (prompt + picker)", () => {
    it("prompts for a password, picks the file, and encrypts it", async () => {
        const fcFilepicker = (await import("fc-filepick")).default;
        const base = `__fsr_enc_pick_${Date.now()}_${Math.random().toString(36).slice(2)}.env`;
        const decryptedPath = path.join(process.cwd(), base);
        const encryptedPath = `${decryptedPath}.encrypted`;
        cwdArtifacts.push(decryptedPath, encryptedPath);
        fs.writeFileSync(decryptedPath, "TOKEN=abc\n");

        // only the basename survives the rejoin to cwd
        fcFilepicker.default.mockResolvedValueOnce(`/picked/from/anywhere/${base}`);
        // pass === null -> the password prompt fires
        promptMock.mockResolvedValueOnce({ pass: "pw-picked" });

        await encryption.encrypt();

        expect(fcFilepicker.default).toHaveBeenCalledTimes(1);
        expect(promptMock).toHaveBeenCalledTimes(1);
        expect(fs.existsSync(encryptedPath)).toBe(true);
        const ciphertext = fs.readFileSync(encryptedPath, "utf8");
        // genuinely encrypted with the prompted password
        const { decrypt: realDecrypt } = await import("../../lib/utils/encryption.js");
        expect(realDecrypt(ciphertext, "pw-picked").toString()).toBe("TOKEN=abc\n");
    });
});

describe("decrypt with no explicit args (prompt + picker)", () => {
    it("prompts for a password, picks the file, and decrypts it", async () => {
        const fcFilepicker = (await import("fc-filepick")).default;
        const { decrypt: _d, encrypt: _e } = await import("../../lib/utils/encryption.js");
        const base = `__fsr_dec_pick_${Date.now()}_${Math.random().toString(36).slice(2)}.env`;
        const encryptedPath = path.join(process.cwd(), `${base}.encrypted`);
        const decryptedPath = path.join(process.cwd(), base);
        cwdArtifacts.push(encryptedPath, decryptedPath);
        fs.writeFileSync(encryptedPath, realEncrypt(Buffer.from("VALUE=42\n"), "pw-dec"));

        fcFilepicker.default.mockResolvedValueOnce(`/anywhere/${base}.encrypted`);
        promptMock.mockResolvedValueOnce({ pass: "pw-dec" });

        await encryption.decrypt();

        expect(fcFilepicker.default).toHaveBeenCalledTimes(1);
        expect(promptMock).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync(decryptedPath, "utf8")).toBe("VALUE=42\n");
    });
});

// ────────────────────────────────────────────────────────────────────────────
// decrypt() overwrite guard — the target (decrypted) file already exists, so
// the confirm prompt fires; decline skips the write, confirm performs it.
// ────────────────────────────────────────────────────────────────────────────
describe("decrypt overwrite guard", () => {
    it("does NOT overwrite an existing decrypted file when the user declines", async () => {
        const decryptedFile = path.join(tmpDir, "out.env");
        const encryptedFile = path.join(tmpDir, "out.env.encrypted");
        fs.writeFileSync(decryptedFile, "ORIGINAL");
        fs.writeFileSync(encryptedFile, realEncrypt(Buffer.from("NEW-PLAINTEXT"), "pw"));

        promptMock.mockResolvedValueOnce({ sure: false });

        await encryption.decrypt("pw", encryptedFile, decryptedFile);

        expect(promptMock).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync(decryptedFile, "utf8")).toBe("ORIGINAL");
    });

    it("overwrites the existing decrypted file when the user confirms", async () => {
        const decryptedFile = path.join(tmpDir, "out2.env");
        const encryptedFile = path.join(tmpDir, "out2.env.encrypted");
        fs.writeFileSync(decryptedFile, "ORIGINAL");
        fs.writeFileSync(encryptedFile, realEncrypt(Buffer.from("NEW-PLAINTEXT"), "pw"));

        promptMock.mockResolvedValueOnce({ sure: true });

        await encryption.decrypt("pw", encryptedFile, decryptedFile);

        expect(promptMock).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync(decryptedFile, "utf8")).toBe("NEW-PLAINTEXT");
    });
});

// ────────────────────────────────────────────────────────────────────────────
// init() — reads package.json fscripts.encryptedFiles + .gitignore, then runs
// the encrypt or decrypt loop and appends newly-encrypted files to .gitignore.
//
// init() calls the module-local `encrypted.{getPass,toEncrypt,encrypt,decrypt}`
// closures (the default export is a `{...encrypted}` copy, so stubbing the
// export is a no-op). We therefore drive it purely through mocked deps:
//   helpers (readJson/readFile/ensureFile/writeFile/appendToFile/boxInform),
//   utils/encryption (encrypt/decrypt), console (fsrLog), and fs.
// inquirer/fc-filepick stay globally mocked; getPass/toEncrypt resolve via them.
// ────────────────────────────────────────────────────────────────────────────
describe("init", () => {
    async function loadInit({ packageJson = {}, gitignore = "", readJsonThrows = false } = {}) {
        vi.resetModules();
        const helperMocks = {
            readJson: readJsonThrows
                ? vi.fn().mockRejectedValue(new Error("boom"))
                : vi.fn().mockResolvedValue(packageJson),
            readFile: vi.fn().mockResolvedValue(gitignore),
            ensureFile: vi.fn().mockResolvedValue(false),
            writeFile: vi.fn().mockResolvedValue(undefined),
            appendToFile: vi.fn().mockResolvedValue(undefined),
            boxInform: vi.fn()
        };
        const cryptoMocks = {
            encrypt: vi.fn(() => "CIPHER"),
            decrypt: vi.fn(() => "PLAIN")
        };
        const consoleMock = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
        const fsMock = { readFileSync: vi.fn(() => Buffer.from("data")), writeFileSync: vi.fn() };

        vi.doMock("../../lib/utils/helpers.js", () => helperMocks);
        vi.doMock("../../lib/utils/encryption.js", () => cryptoMocks);
        vi.doMock("../../lib/utils/console.js", () => ({ default: consoleMock }));
        vi.doMock("fs", () => ({ ...fsMock, default: fsMock }));

        const mod = await import("../../lib/encryption/encryption.js");
        return { init: mod.default.init, helperMocks, cryptoMocks, consoleMock, fsMock };
    }

    afterEach(() => {
        vi.doUnmock("../../lib/utils/helpers.js");
        vi.doUnmock("../../lib/utils/encryption.js");
        vi.doUnmock("../../lib/utils/console.js");
        vi.doUnmock("fs");
        vi.resetModules();
    });

    it("encrypts each listed file and appends the not-yet-ignored ones to .gitignore", async () => {
        const { init, cryptoMocks, helperMocks } = await loadInit({
            packageJson: { fscripts: { encryptedFiles: ["secret/.env", "already.ignored"] } },
            gitignore: "node_modules\nalready.ignored"
        });
        // getPass prompt, then toEncrypt prompt -> "encrypt"
        promptMock.mockResolvedValueOnce({ pass: "k" });
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "encrypt" });

        await init();

        expect(cryptoMocks.encrypt).toHaveBeenCalledTimes(2);
        expect(cryptoMocks.decrypt).not.toHaveBeenCalled();
        expect(helperMocks.appendToFile).toHaveBeenCalledTimes(1);
        const [, appended] = helperMocks.appendToFile.mock.calls[0];
        expect(appended).toContain("secret/.env");
        // already present in .gitignore -> not re-added
        expect(appended).not.toContain("already.ignored");
        expect(helperMocks.boxInform).toHaveBeenCalledTimes(1);
    });

    it("decrypts each listed file when the user chooses 'decrypt'", async () => {
        const { init, cryptoMocks, helperMocks } = await loadInit({
            packageJson: { fscripts: { encryptedFiles: ["config/.app.env"] } },
            gitignore: ""
        });
        promptMock.mockResolvedValueOnce({ pass: "k" });
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "decrypt" });

        await init();

        expect(cryptoMocks.decrypt).toHaveBeenCalledTimes(1);
        expect(cryptoMocks.encrypt).not.toHaveBeenCalled();
        expect(helperMocks.appendToFile).toHaveBeenCalledTimes(1);
        expect(helperMocks.boxInform).toHaveBeenCalledTimes(1);
    });

    it("does not touch .gitignore when every listed file is already ignored", async () => {
        const { init, cryptoMocks, helperMocks } = await loadInit({
            packageJson: { fscripts: { encryptedFiles: ["dup.env"] } },
            gitignore: "dup.env"
        });
        promptMock.mockResolvedValueOnce({ pass: "k" });
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "encrypt" });

        await init();

        expect(cryptoMocks.encrypt).toHaveBeenCalledTimes(1);
        expect(helperMocks.appendToFile).not.toHaveBeenCalled();
        expect(helperMocks.boxInform).not.toHaveBeenCalled();
    });

    it("does nothing when package.json has no fscripts section", async () => {
        const { init, cryptoMocks, helperMocks } = await loadInit({
            packageJson: { name: "x" }
        });
        promptMock.mockResolvedValueOnce({ pass: "k" });
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "encrypt" });

        await init();

        expect(cryptoMocks.encrypt).not.toHaveBeenCalled();
        expect(cryptoMocks.decrypt).not.toHaveBeenCalled();
        expect(helperMocks.appendToFile).not.toHaveBeenCalled();
    });

    it("does nothing when fscripts exists but has no encryptedFiles", async () => {
        const { init, cryptoMocks, helperMocks } = await loadInit({
            packageJson: { fscripts: {} }
        });
        promptMock.mockResolvedValueOnce({ pass: "k" });
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "encrypt" });

        await init();

        expect(cryptoMocks.encrypt).not.toHaveBeenCalled();
        expect(helperMocks.appendToFile).not.toHaveBeenCalled();
    });

    it("logs the error and swallows it when reading package.json fails", async () => {
        const { init, consoleMock, helperMocks } = await loadInit({ readJsonThrows: true });
        promptMock.mockResolvedValueOnce({ pass: "k" });
        promptMock.mockResolvedValueOnce({ encryptDecrypt: "encrypt" });

        await expect(init()).resolves.toBeUndefined();

        expect(consoleMock.error).toHaveBeenCalledTimes(1);
        expect(helperMocks.appendToFile).not.toHaveBeenCalled();
    });
});

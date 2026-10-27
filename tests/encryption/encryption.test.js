/**
 * Tests for lib/encryption/encryption.js
 *
 * Default export object: { encrypt, decrypt, run, cli }
 *
 * Nothing in this module prompts — the password is always a parameter, and an
 * existing target is an error unless `force` is set. Real AES round-trips run
 * through real temp files (lib/utils/encryption.js is exercised for real); only
 * `fc-filepick` is mocked, and it is reached solely when no file is supplied.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { encrypt as realEncrypt, decrypt as realDecrypt } from "../../lib/utils/encryption.js";

vi.mock("fc-filepick", () => ({
    default: { default: vi.fn() }
}));

let encryption;
let tmpDir;

beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "fsr-enc-test-"));
    encryption = (await import("../../lib/encryption/encryption.js")).default;
    delete process.env.FSR_PASS;
});

afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    delete process.env.FSR_PASS;
    vi.clearAllMocks();
});

describe("encrypt + decrypt round-trip", () => {
    it("encrypts a file and decrypts it back to the original contents", async () => {
        const plaintext = "DB_URL=postgres://user:pw@host/db\nSECRET=42\n";
        const decryptedFile = path.join(tmpDir, "config.env");
        const encryptedFile = path.join(tmpDir, "config.env.encrypted");
        const restoredFile = path.join(tmpDir, "config.restored.env");
        fs.writeFileSync(decryptedFile, plaintext);

        await encryption.encrypt("pw123", encryptedFile, decryptedFile);

        expect(fs.existsSync(encryptedFile)).toBe(true);
        expect(fs.readFileSync(encryptedFile, "utf8")).not.toContain("postgres://");

        await encryption.decrypt("pw123", encryptedFile, restoredFile);

        expect(fs.readFileSync(restoredFile, "utf8")).toBe(plaintext);
    });

    it("preserves binary content byte-for-byte", async () => {
        const binary = Buffer.from([0x00, 0xff, 0x50, 0x4b, 0x03, 0x04, 0x00, 0x7f]);
        const decryptedFile = path.join(tmpDir, "archive.zip");
        const encryptedFile = path.join(tmpDir, "archive.zip.encrypted");
        const restoredFile = path.join(tmpDir, "archive.restored.zip");
        fs.writeFileSync(decryptedFile, binary);

        await encryption.encrypt("pw123", encryptedFile, decryptedFile);
        await encryption.decrypt("pw123", encryptedFile, restoredFile);

        expect(fs.readFileSync(restoredFile).equals(binary)).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Password is a parameter, never a prompt.
// ────────────────────────────────────────────────────────────────────────────
describe("password handling", () => {
    it("refuses to encrypt without a password", async () => {
        const file = path.join(tmpDir, "nopass.env");
        fs.writeFileSync(file, "A=1\n");

        await expect(encryption.encrypt(null, `${file}.encrypted`, file)).rejects.toThrow(
            /password is required/
        );
        expect(fs.existsSync(`${file}.encrypted`)).toBe(false);
    });

    it("refuses to decrypt without a password", async () => {
        const file = path.join(tmpDir, "nopass2.env");
        fs.writeFileSync(`${file}.encrypted`, realEncrypt(Buffer.from("A=1\n"), "pw"));

        await expect(encryption.decrypt("", `${file}.encrypted`, file)).rejects.toThrow(
            /password is required/
        );
    });

    it("falls back to $FSR_PASS when no password is passed", async () => {
        const file = path.join(tmpDir, "envpass.env");
        fs.writeFileSync(file, "FROM=env\n");
        process.env.FSR_PASS = "env-pw";

        await encryption.run({ file });

        expect(realDecrypt(fs.readFileSync(`${file}.encrypted`, "utf8"), "env-pw").toString()).toBe(
            "FROM=env\n"
        );
    });

    it("throws on the wrong password and leaves no decrypted file behind", async () => {
        const encryptedFile = path.join(tmpDir, "wrong.env.encrypted");
        const decryptedFile = path.join(tmpDir, "wrong.env");
        fs.writeFileSync(encryptedFile, realEncrypt(Buffer.from("TOP=secret\n"), "right-pw"));

        await expect(encryption.decrypt("wrong-pw", encryptedFile, decryptedFile)).rejects.toThrow(
            /wrong password or corrupted file/
        );
        expect(fs.existsSync(decryptedFile)).toBe(false);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Overwrite protection — no confirmation prompt, so it is refuse-by-default.
// ────────────────────────────────────────────────────────────────────────────
describe("overwrite protection", () => {
    it("refuses to clobber an existing encrypted file", async () => {
        const decryptedFile = path.join(tmpDir, "secret.txt");
        const encryptedFile = path.join(tmpDir, "secret.txt.encrypted");
        fs.writeFileSync(decryptedFile, "new plaintext");
        fs.writeFileSync(encryptedFile, "PRE-EXISTING-CIPHERTEXT");

        await expect(encryption.encrypt("pw123", encryptedFile, decryptedFile)).rejects.toThrow(
            /already exists.*--force/
        );
        expect(fs.readFileSync(encryptedFile, "utf8")).toBe("PRE-EXISTING-CIPHERTEXT");
    });

    it("overwrites the encrypted file when force is set", async () => {
        const decryptedFile = path.join(tmpDir, "secret2.txt");
        const encryptedFile = path.join(tmpDir, "secret2.txt.encrypted");
        fs.writeFileSync(decryptedFile, "fresh plaintext");
        fs.writeFileSync(encryptedFile, "OLD");

        await encryption.encrypt("pw123", encryptedFile, decryptedFile, true);

        expect(fs.readFileSync(encryptedFile, "utf8")).not.toBe("OLD");
        const restored = path.join(tmpDir, "secret2.restored.txt");
        await encryption.decrypt("pw123", encryptedFile, restored);
        expect(fs.readFileSync(restored, "utf8")).toBe("fresh plaintext");
    });

    it("refuses to clobber an existing decrypted file", async () => {
        const decryptedFile = path.join(tmpDir, "out.env");
        const encryptedFile = path.join(tmpDir, "out.env.encrypted");
        fs.writeFileSync(decryptedFile, "ORIGINAL");
        fs.writeFileSync(encryptedFile, realEncrypt(Buffer.from("NEW-PLAINTEXT"), "pw"));

        await expect(encryption.decrypt("pw", encryptedFile, decryptedFile)).rejects.toThrow(
            /already exists.*--force/
        );
        expect(fs.readFileSync(decryptedFile, "utf8")).toBe("ORIGINAL");
    });

    it("overwrites the decrypted file when force is set", async () => {
        const decryptedFile = path.join(tmpDir, "out2.env");
        const encryptedFile = path.join(tmpDir, "out2.env.encrypted");
        fs.writeFileSync(decryptedFile, "ORIGINAL");
        fs.writeFileSync(encryptedFile, realEncrypt(Buffer.from("NEW-PLAINTEXT"), "pw"));

        await encryption.decrypt("pw", encryptedFile, decryptedFile, true);

        expect(fs.readFileSync(decryptedFile, "utf8")).toBe("NEW-PLAINTEXT");
    });
});

// ────────────────────────────────────────────────────────────────────────────
// File picker — reached only when no file argument is supplied. The picked path
// is used verbatim, so a file anywhere on disk resolves correctly.
// ────────────────────────────────────────────────────────────────────────────
describe("file picker fallback", () => {
    it("encrypts the picked file in place", async () => {
        const fcFilepicker = (await import("fc-filepick")).default;
        const decryptedPath = path.join(tmpDir, "picked.env");
        fs.writeFileSync(decryptedPath, "TOKEN=abc\n");
        fcFilepicker.default.mockResolvedValueOnce(decryptedPath);

        await encryption.encrypt("pw-picked");

        expect(fcFilepicker.default).toHaveBeenCalledTimes(1);
        const ciphertext = fs.readFileSync(`${decryptedPath}.encrypted`, "utf8");
        expect(realDecrypt(ciphertext, "pw-picked").toString()).toBe("TOKEN=abc\n");
    });

    it("decrypts the picked file in place", async () => {
        const fcFilepicker = (await import("fc-filepick")).default;
        const encryptedPath = path.join(tmpDir, "picked2.env.encrypted");
        fs.writeFileSync(encryptedPath, realEncrypt(Buffer.from("VALUE=42\n"), "pw-dec"));
        fcFilepicker.default.mockResolvedValueOnce(encryptedPath);

        await encryption.decrypt("pw-dec");

        expect(fs.readFileSync(path.join(tmpDir, "picked2.env"), "utf8")).toBe("VALUE=42\n");
    });

    it("never writes back over the picked file when the .encrypted suffix is missing", async () => {
        const fcFilepicker = (await import("fc-filepick")).default;
        const pickedPath = path.join(tmpDir, "no-suffix.bin");
        const ciphertext = realEncrypt(Buffer.from("STILL=safe\n"), "pw-sfx");
        fs.writeFileSync(pickedPath, ciphertext);
        fcFilepicker.default.mockResolvedValueOnce(pickedPath);

        await encryption.decrypt("pw-sfx");

        expect(fs.readFileSync(pickedPath, "utf8")).toBe(ciphertext);
        expect(fs.readFileSync(`${pickedPath}.decrypted`, "utf8")).toBe("STILL=safe\n");
    });
});

// ────────────────────────────────────────────────────────────────────────────
// run() — the shared entry behind both the standalone CLI and `fsr encrypt`.
// ────────────────────────────────────────────────────────────────────────────
describe("run", () => {
    it("encrypts <file> into <file>.encrypted", async () => {
        const file = path.join(tmpDir, ".env");
        fs.writeFileSync(file, "A=1\n");

        await encryption.run({ file, pass: "pw" });

        expect(realDecrypt(fs.readFileSync(`${file}.encrypted`, "utf8"), "pw").toString()).toBe("A=1\n");
    });

    it("decrypts <file>.encrypted back into <file> when given the plain name", async () => {
        const file = path.join(tmpDir, ".env");
        fs.writeFileSync(`${file}.encrypted`, realEncrypt(Buffer.from("B=2\n"), "pw"));

        await encryption.run({ file, pass: "pw", decrypt: true });

        expect(fs.readFileSync(file, "utf8")).toBe("B=2\n");
    });

    it("also accepts the .encrypted path directly when decrypting", async () => {
        const file = path.join(tmpDir, "conf.json");
        fs.writeFileSync(`${file}.encrypted`, realEncrypt(Buffer.from('{"k":1}'), "pw"));

        await encryption.run({ file: `${file}.encrypted`, pass: "pw", decrypt: true });

        expect(fs.readFileSync(file, "utf8")).toBe('{"k":1}');
    });

    it("round-trips through both directions with the same file argument", async () => {
        const file = path.join(tmpDir, "secret.txt");
        fs.writeFileSync(file, "round=trip\n");

        await encryption.run({ file, pass: "pw" });
        fs.rmSync(file);
        await encryption.run({ file, pass: "pw", decrypt: true });

        expect(fs.readFileSync(file, "utf8")).toBe("round=trip\n");
    });

    it("throws a clear error when the file is missing", async () => {
        await expect(
            encryption.run({ file: path.join(tmpDir, "nope.env"), pass: "pw" })
        ).rejects.toThrow(/File not found/);
    });

    it("requires a password", async () => {
        const file = path.join(tmpDir, "x.env");
        fs.writeFileSync(file, "A=1\n");

        await expect(encryption.run({ file })).rejects.toThrow(/password is required/);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// cli() — argv parsing for `node lib/encryption/encryption.js <file> [options]`
// ────────────────────────────────────────────────────────────────────────────
describe("cli", () => {
    it("encrypts with `<file> --pass <pw>`", async () => {
        const file = path.join(tmpDir, "cli.env");
        fs.writeFileSync(file, "CLI=yes\n");

        const code = await encryption.cli([file, "--pass", "pw"]);

        expect(code).toBe(0);
        expect(realDecrypt(fs.readFileSync(`${file}.encrypted`, "utf8"), "pw").toString()).toBe(
            "CLI=yes\n"
        );
    });

    it("decrypts with `<file> --pass <pw> --decrypt`", async () => {
        const file = path.join(tmpDir, "cli2.env");
        fs.writeFileSync(`${file}.encrypted`, realEncrypt(Buffer.from("BACK=1\n"), "pw"));

        const code = await encryption.cli([file, "--pass", "pw", "--decrypt"]);

        expect(code).toBe(0);
        expect(fs.readFileSync(file, "utf8")).toBe("BACK=1\n");
    });

    it("accepts short flags, --pass= form, and any flag order", async () => {
        const file = path.join(tmpDir, "cli3.env");
        fs.writeFileSync(file, "SHORT=1\n");
        fs.writeFileSync(`${file}.encrypted`, "PRE-EXISTING");

        const code = await encryption.cli(["-f", "--pass=pw", file]);

        expect(code).toBe(0);
        expect(realDecrypt(fs.readFileSync(`${file}.encrypted`, "utf8"), "pw").toString()).toBe(
            "SHORT=1\n"
        );
    });

    it("prints usage and exits non-zero on a bare invocation", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            expect(await encryption.cli([])).toBe(1);
            expect(logSpy.mock.calls.flat().join(" ")).toContain("--decrypt");
        } finally {
            logSpy.mockRestore();
        }
    });

    it("prints usage and exits zero for --help", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        try {
            expect(await encryption.cli(["--help"])).toBe(0);
        } finally {
            logSpy.mockRestore();
        }
    });

    it("errors when a file is given without any password", async () => {
        const file = path.join(tmpDir, "cli4.env");
        fs.writeFileSync(file, "ASKED=1\n");

        await expect(encryption.cli([file])).rejects.toThrow(/password is required/);
    });
});

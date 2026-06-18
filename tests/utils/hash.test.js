/**
 * Tests for lib/utils/hash.js
 *
 * Pure hashing utilities built on real `crypto` SHA-256 plus real `fs` stat
 * reads. No mocks: deterministic hashing and real temp files exercise the
 * actual behaviour the cache layer depends on.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "fs/promises";
import os from "os";
import path from "path";

let hash, hashMultiple, generateFileKey, hashObject, generateContentKey, getFileMetadata, hasFileChanged;
let mod;

let tmpDir;

beforeEach(async () => {
    mod = await import("../../lib/utils/hash.js");
    ({
        hash,
        hashMultiple,
        generateFileKey,
        hashObject,
        generateContentKey,
        getFileMetadata,
        hasFileChanged
    } = mod);
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "fsr-hash-"));
});

afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
});

describe("hash()", () => {
    it("returns a deterministic lowercase hex string of default length 16", () => {
        const a = hash("hello world");
        const b = hash("hello world");
        expect(a).toBe(b);
        expect(a).toMatch(/^[0-9a-f]{16}$/);
    });

    it("respects the requested length", () => {
        expect(hash("hello", 8)).toHaveLength(8);
        // 64 is the full SHA-256 hex digest length
        expect(hash("hello", 64)).toHaveLength(64);
        // A prefix of the longer digest equals the shorter one
        expect(hash("hello", 64).substring(0, 16)).toBe(hash("hello"));
    });

    it("produces different hashes for different inputs", () => {
        expect(hash("alpha")).not.toBe(hash("beta"));
    });
});

describe("hashMultiple()", () => {
    it("is deterministic for the same inputs", () => {
        expect(hashMultiple("a", "b", "c")).toBe(hashMultiple("a", "b", "c"));
    });

    it("is order-sensitive", () => {
        expect(hashMultiple("a", "b")).not.toBe(hashMultiple("b", "a"));
    });

    it("equals hashing the ':'-joined inputs (default length 16)", () => {
        expect(hashMultiple("a", "b")).toBe(hash("a:b"));
        expect(hashMultiple("a", "b")).toMatch(/^[0-9a-f]{16}$/);
    });
});

describe("hashObject()", () => {
    it("is stable for equal objects regardless of key insertion order", () => {
        const k1 = hashObject({ a: 1, b: 2 });
        const k2 = hashObject({ b: 2, a: 1 });
        expect(k1).toBe(k2);
    });

    it("changes when a value changes", () => {
        expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 }));
    });
});

describe("generateContentKey()", () => {
    it("is deterministic for the same path + content", () => {
        expect(generateContentKey("/some/file.js", "abc")).toBe(
            generateContentKey("/some/file.js", "abc")
        );
    });

    it("changes when the content changes", () => {
        expect(generateContentKey("/some/file.js", "abc")).not.toBe(
            generateContentKey("/some/file.js", "abcd")
        );
    });

    it("changes when the path changes", () => {
        expect(generateContentKey("/a.js", "x")).not.toBe(
            generateContentKey("/b.js", "x")
        );
    });
});

describe("getFileMetadata()", () => {
    it("returns mtime/size/exists for a real file", async () => {
        const file = path.join(tmpDir, "meta.txt");
        const content = "twelve chars";
        await writeFile(file, content, "utf8");

        const meta = getFileMetadata(file);
        expect(meta.exists).toBe(true);
        expect(typeof meta.mtime).toBe("number");
        expect(meta.size).toBe(Buffer.byteLength(content));
    });

    it("returns null mtime/size and exists:false for a missing file", () => {
        const meta = getFileMetadata(path.join(tmpDir, "nope.txt"));
        expect(meta).toEqual({ mtime: null, size: null, exists: false });
    });
});

describe("hasFileChanged()", () => {
    it("returns false when the cached mtime matches", async () => {
        const file = path.join(tmpDir, "stable.txt");
        await writeFile(file, "data", "utf8");
        const { mtime } = getFileMetadata(file);
        expect(hasFileChanged(file, mtime)).toBe(false);
    });

    it("returns true when the cached mtime differs", async () => {
        const file = path.join(tmpDir, "changed.txt");
        await writeFile(file, "data", "utf8");
        const { mtime } = getFileMetadata(file);
        expect(hasFileChanged(file, mtime + 1)).toBe(true);
    });

    it("returns true when the file does not exist", () => {
        expect(hasFileChanged(path.join(tmpDir, "ghost.txt"), 12345)).toBe(true);
    });
});

describe("generateFileKey()", () => {
    it("produces a deterministic key for an unchanged file", async () => {
        const file = path.join(tmpDir, "key.txt");
        await writeFile(file, "content", "utf8");
        const k1 = generateFileKey(file);
        const k2 = generateFileKey(file);
        expect(k1).toBe(k2);
        expect(k1).toMatch(/^[0-9a-f]{16}$/);
    });

    it("includes size only when requested (default omits it)", async () => {
        const file = path.join(tmpDir, "size.txt");
        await writeFile(file, "content", "utf8");
        const withMtimeOnly = generateFileKey(file);
        const withSize = generateFileKey(file, { includeSize: true });
        // Adding the size segment changes the hashed parts.
        expect(withSize).not.toBe(withMtimeOnly);
    });

    it("omits mtime when includeMtime is false (path-only key)", async () => {
        const file = path.join(tmpDir, "nomtime.txt");
        await writeFile(file, "content", "utf8");
        // With neither mtime nor size, the key is just hash(filePath).
        expect(generateFileKey(file, { includeMtime: false })).toBe(hash(file));
    });

    it("throws for a missing file", () => {
        expect(() => generateFileKey(path.join(tmpDir, "missing.txt"))).toThrow(
            /Failed to generate file key/
        );
    });
});

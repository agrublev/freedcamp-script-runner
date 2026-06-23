import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import {
    readCache,
    readCacheEntry,
    writeCacheEntry,
    editCacheEntry,
    deleteCacheEntry,
    listCacheKeys,
    checkCache
} from "../../lib/cache/cache.js";

const TIMESTAMP_RE = /^[A-Z][a-z]{2} \d{1,2}(st|nd|rd|th) \d{4}-\d{1,2}:\d{2}(AM|PM)$/;

let tempHome;

describe("cache JSON CRUD", () => {
    beforeEach(async () => {
        tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-cache-test-"));
        process.env.HOME = tempHome;
        process.env.USERPROFILE = tempHome;
    });

    afterEach(async () => {
        await fs.remove(tempHome);
    });

    it("creates cache file and reads empty cache shape", async () => {
        const data = await readCache();

        expect(data).toHaveProperty("updatedAt");
        expect(data.updatedAt).toMatch(TIMESTAMP_RE);
        expect(data).toHaveProperty("entries");
        expect(data.entries).toEqual({});
    });

    it("writes and reads an entry with changesLog timestamp", async () => {
        await writeCacheEntry("foo", { value: 1 });

        const entry = await readCacheEntry("foo");
        expect(entry.value).toEqual({ value: 1 });
        expect(entry.updatedAt).toMatch(TIMESTAMP_RE);
        expect(entry.changesLog).toHaveLength(1);
        expect(entry.changesLog[0]).toMatch(TIMESTAMP_RE);
    });

    it("merges object values by default instead of replacing keys", async () => {
        await writeCacheEntry("test", { test: 9889, trr: true });
        await writeCacheEntry("test", { test: 222 });

        const entry = await readCacheEntry("test");
        expect(entry.value).toEqual({ test: 222, trr: true });
    });

    it("replaces value when replaceValue flag is true", async () => {
        await writeCacheEntry("test", { test: 9889, trr: true });
        await writeCacheEntry("test", { test: 222 }, true);

        const entry = await readCacheEntry("test");
        expect(entry.value).toEqual({ test: 222 });
    });

    it("replaces object with array when incoming value is not mergeable", async () => {
        await writeCacheEntry("test", { keep: true, count: 1 });
        await writeCacheEntry("test", ["fresh"]);

        const entry = await readCacheEntry("test");
        expect(entry.value).toEqual(["fresh"]);
        expect(entry.changesLog).toHaveLength(2);
    });

    it("replaces primitive with object instead of merging", async () => {
        await writeCacheEntry("test", 5);
        await writeCacheEntry("test", { count: 2 });

        const entry = await readCacheEntry("test");
        expect(entry.value).toEqual({ count: 2 });
        expect(entry.changesLog).toHaveLength(2);
    });

    it("edits an existing entry and appends to changesLog", async () => {
        await writeCacheEntry("counter", { count: 1 });
        await editCacheEntry("counter", (prev) => ({ ...prev, count: prev.count + 1 }));

        const entry = await readCacheEntry("counter");
        expect(entry.value).toEqual({ count: 2 });
        expect(entry.changesLog).toHaveLength(2);
        expect(entry.changesLog[0]).toMatch(TIMESTAMP_RE);
        expect(entry.changesLog[1]).toMatch(TIMESTAMP_RE);
    });

    it("deletes an entry and updates top-level timestamp", async () => {
        await writeCacheEntry("to-delete", true);
        const before = await readCache();

        const deleted = await deleteCacheEntry("to-delete");
        const after = await readCache();

        expect(deleted).toBe(true);
        expect(await readCacheEntry("to-delete")).toBeNull();
        expect(after.updatedAt).toMatch(TIMESTAMP_RE);
    });
});

describe("cache coverage extras", () => {
    beforeEach(async () => {
        tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-cache-cov-"));
        process.env.HOME = tempHome;
        process.env.USERPROFILE = tempHome;
    });

    afterEach(async () => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        await fs.remove(tempHome);
    });

    it("renders every ordinal suffix through the entry timestamp", async () => {
        const cases = [
            [1, "st"],
            [2, "nd"],
            [3, "rd"],
            [4, "th"],
            [11, "th"],
            [12, "th"],
            [13, "th"],
            [21, "st"],
            [22, "nd"],
            [23, "rd"]
        ];

        vi.useFakeTimers({ toFake: ["Date"] });
        for (const [day, suffix] of cases) {
            vi.setSystemTime(new Date(2024, 0, day, 12, 0, 0));
            const entry = await writeCacheEntry(`day-${day}`, day);
            expect(entry.updatedAt).toContain(`Jan ${day}${suffix} 2024`);
        }
    });

    it("edits an entry with a direct (non-function) value", async () => {
        await writeCacheEntry("direct", { a: 1 });
        const updated = await editCacheEntry("direct", { b: 2 });

        expect(updated.value).toEqual({ b: 2 });
        expect(updated.changesLog).toHaveLength(2);
    });

    it("throws when editing a missing entry", async () => {
        await expect(editCacheEntry("ghost", () => 1)).rejects.toThrow(
            "Cache entry not found: ghost"
        );
    });

    it("returns false when deleting a missing entry", async () => {
        expect(await deleteCacheEntry("not-here")).toBe(false);
    });

    it("rejects empty and non-string cache keys", async () => {
        await expect(readCacheEntry("")).rejects.toThrow(
            "Cache key must be a non-empty string."
        );
        await expect(readCacheEntry(123)).rejects.toThrow(
            "Cache key must be a non-empty string."
        );
    });

    it("falls back to a default shape when the cache root is not an object", async () => {
        const cacheFile = path.join(tempHome, ".fsr", "cache.json");
        await fs.ensureDir(path.dirname(cacheFile));
        await fs.writeFile(cacheFile, "[1, 2, 3]");

        const data = await readCache();
        expect(data.entries).toEqual({});
        expect(data.updatedAt).toMatch(TIMESTAMP_RE);
    });

    it("lists the cache keys", async () => {
        await writeCacheEntry("alpha", 1);
        await writeCacheEntry("beta", 2);

        const keys = await listCacheKeys();
        expect(keys).toEqual(expect.arrayContaining(["alpha", "beta"]));
        expect(keys).toHaveLength(2);
    });

    it("reports an operational cache and sizes nested directories", async () => {
        await writeCacheEntry("seed", 1);
        const sub = path.join(tempHome, ".fsr", "sub");
        await fs.ensureDir(sub);
        await fs.writeFile(path.join(sub, "nested.bin"), Buffer.alloc(2048));

        const result = await checkCache();

        expect(result.passed).toBe(true);
        expect(result.message).toMatch(/^Operational \(/);
        expect(result.details.writable).toBe(true);
        expect(result.details.size).toBeGreaterThan(2048);
        expect(result.details.sizeFormatted).toMatch(/KB$/);
        expect(result.details.entryCount).toBe(1);
    });

    it("flags an invalid cache file and fixes it", async () => {
        const cacheFile = path.join(tempHome, ".fsr", "cache.json");
        await fs.ensureDir(path.dirname(cacheFile));
        await fs.writeFile(cacheFile, "{ not valid json");

        const result = await checkCache();

        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/not writable or cache file invalid/);
        expect(typeof result.fix).toBe("function");

        const fixMessage = await result.fix();
        expect(fixMessage).toMatch(/Fixed cache directory/);

        const data = await readCache();
        expect(data.entries).toEqual({});
    });

    it("flags a missing cache directory and creates it", async () => {
        const result = await checkCache();

        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/does not exist/);
        expect(typeof result.fix).toBe("function");

        const fixMessage = await result.fix();
        expect(fixMessage).toMatch(/Created cache directory/);
        expect(await fs.pathExists(path.join(tempHome, ".fsr"))).toBe(true);
    });

    it("captures a failure in the outer check via the error branch", async () => {
        vi.spyOn(fs, "pathExists").mockRejectedValueOnce(new Error("boom"));

        const result = await checkCache();

        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/^Cache check failed: boom/);
    });

    it("treats an unreadable directory as zero size", async () => {
        await writeCacheEntry("seed", 1);
        vi.spyOn(fs, "readdir").mockRejectedValue(new Error("EACCES"));

        const result = await checkCache();

        expect(result.passed).toBe(true);
        expect(result.details.size).toBe(0);
        expect(result.details.sizeFormatted).toBe("0 Bytes");
    });

    it("normalizes object entries that are missing or malformed fields", async () => {
        const cacheFile = path.join(tempHome, ".fsr", "cache.json");
        await fs.ensureDir(path.dirname(cacheFile));
        await fs.writeFile(
            cacheFile,
            JSON.stringify({
                updatedAt: "Jan 1st 2024-12:00PM",
                entries: {
                    weird: { updatedAt: 5, changesLog: "nope" }
                }
            })
        );

        const data = await readCache();
        expect(data.updatedAt).toBe("Jan 1st 2024-12:00PM");
        expect(data.entries.weird).toEqual({
            value: null,
            updatedAt: null,
            changesLog: []
        });
    });

    it("defaults entries and timestamp when an object root lacks them", async () => {
        const cacheFile = path.join(tempHome, ".fsr", "cache.json");
        await fs.ensureDir(path.dirname(cacheFile));
        await fs.writeFile(cacheFile, JSON.stringify({ updatedAt: 123, entries: "broken" }));

        const data = await readCache();
        expect(data.entries).toEqual({});
        expect(data.updatedAt).toMatch(TIMESTAMP_RE);
    });

    it("defaults entries when the entries field is an array", async () => {
        const cacheFile = path.join(tempHome, ".fsr", "cache.json");
        await fs.ensureDir(path.dirname(cacheFile));
        await fs.writeFile(cacheFile, JSON.stringify({ updatedAt: "x", entries: ["a"] }));

        const data = await readCache();
        expect(data.entries).toEqual({});
        expect(data.updatedAt).toBe("x");
    });
});

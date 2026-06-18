import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import {
    readCache,
    readCacheEntry,
    writeCacheEntry,
    editCacheEntry,
    deleteCacheEntry
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

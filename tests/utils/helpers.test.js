/**
 * Tests for lib/utils/helpers.js
 *
 * Real fs-extra is used through temp directories for the file helpers. The
 * notable (and slightly surprising) behaviour is that ensureDir/ensureFile/
 * pathExists are pure existsSync checks — they create NOTHING — so the tests
 * assert that actual behaviour rather than the names' implication.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";

let helpers;
let emptyDir, ensureDir, ensureFile, pathExists, readJson, writeJson, readFile, writeFile, removeFile, appendToFile, chainAsync, boxInform, rainbowGradient, timestamp;

let tmpDir;

beforeEach(async () => {
    helpers = await import("../../lib/utils/helpers.js");
    ({
        emptyDir,
        ensureDir,
        ensureFile,
        pathExists,
        readJson,
        writeJson,
        readFile,
        writeFile,
        removeFile,
        appendToFile,
        chainAsync,
        boxInform,
        rainbowGradient,
        timestamp
    } = helpers);
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "fsr-helpers-"));
});

afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
});

describe("pathExists / ensureDir / ensureFile (existsSync wrappers)", () => {
    it("pathExists reflects whether the path exists", async () => {
        expect(await pathExists(tmpDir)).toBe(true);
        expect(await pathExists(path.join(tmpDir, "missing"))).toBe(false);
    });

    it("ensureDir does NOT create the directory — it only reports existence", async () => {
        const target = path.join(tmpDir, "should-not-be-created");
        const result = await ensureDir(target);
        expect(result).toBe(false);
        // Confirm it really wasn't created.
        expect(await pathExists(target)).toBe(false);
    });

    it("ensureFile does NOT create the file — it only reports existence", async () => {
        const target = path.join(tmpDir, "ghost.txt");
        const result = await ensureFile(target);
        expect(result).toBe(false);
        expect(await pathExists(target)).toBe(false);
    });
});

describe("writeJson / readJson round-trip", () => {
    it("returns the same object that was written", async () => {
        const file = path.join(tmpDir, "data.json");
        const obj = { name: "fscr", nested: { count: 3, list: [1, 2, 3] } };
        await writeJson(file, obj);
        const read = await readJson(file);
        expect(read).toEqual(obj);
    });

    it("readJson returns {} when the file is missing", async () => {
        const read = await readJson(path.join(tmpDir, "nope.json"));
        expect(read).toEqual({});
    });
});

describe("writeFile / readFile round-trip", () => {
    it("reads back exactly what was written", async () => {
        const file = path.join(tmpDir, "note.txt");
        await writeFile(file, "line one\nline two");
        const contents = await readFile(file);
        expect(contents).toBe("line one\nline two");
    });
});

describe("appendToFile", () => {
    it("appends to existing content rather than overwriting", async () => {
        const file = path.join(tmpDir, "log.txt");
        await writeFile(file, "start");
        await appendToFile(file, "-more");
        expect(await readFile(file)).toBe("start-more");
    });
});

describe("removeFile", () => {
    it("removes an existing file", async () => {
        const file = path.join(tmpDir, "delete-me.txt");
        await writeFile(file, "bye");
        expect(await pathExists(file)).toBe(true);
        await removeFile(file);
        expect(await pathExists(file)).toBe(false);
    });
});

describe("chainAsync", () => {
    it("runs the functions in sequence, passing `next` to all but the last", () => {
        const order = [];
        const a = next => {
            order.push("a");
            expect(typeof next).toBe("function");
            next();
        };
        const b = next => {
            order.push("b");
            expect(typeof next).toBe("function");
            next();
        };
        const c = next => {
            order.push("c");
            // The last fn is invoked with no `next`.
            expect(next).toBeUndefined();
        };
        chainAsync([a, b, c]);
        expect(order).toEqual(["a", "b", "c"]);
    });

    it("handles a single-function chain (called with no next)", () => {
        const order = [];
        chainAsync([
            next => {
                order.push("only");
                expect(next).toBeUndefined();
            }
        ]);
        expect(order).toEqual(["only"]);
    });
});

describe("rainbowGradient", () => {
    it("returns an array of length `len` of [r,g,b] integer triples", () => {
        const grad = rainbowGradient(5);
        expect(Array.isArray(grad)).toBe(true);
        expect(grad).toHaveLength(5);
        for (const rgb of grad) {
            expect(rgb).toHaveLength(3);
            for (const channel of rgb) {
                expect(Number.isInteger(channel)).toBe(true);
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(255);
            }
        }
    });

    it("returns an empty array for len 0", () => {
        expect(rainbowGradient(0)).toEqual([]);
    });
});

describe("timestamp", () => {
    it("matches the HH:MM:SS format the implementation actually produces", () => {
        // NOTE: the doc comment claims "m-d-yy_hh:MM:ss" but the implementation
        // only joins hours/minutes/seconds with ':'. We assert real behaviour.
        expect(timestamp()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
});

describe("emptyDir", () => {
    it("empties an existing directory's contents", async () => {
        await writeFile(path.join(tmpDir, "a.txt"), "a");
        await writeFile(path.join(tmpDir, "b.txt"), "b");
        await emptyDir(tmpDir);
        expect(await pathExists(tmpDir)).toBe(true);
        expect(await pathExists(path.join(tmpDir, "a.txt"))).toBe(false);
        expect(await pathExists(path.join(tmpDir, "b.txt"))).toBe(false);
    });

    it("logs an error and resolves when the target cannot be emptied", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        // A path whose parent is a regular file -> ENOTDIR while ensuring the dir.
        const aFile = path.join(tmpDir, "afile");
        await writeFile(aFile, "x");
        await expect(emptyDir(path.join(aFile, "sub"))).resolves.toBeUndefined();
        expect(errSpy).toHaveBeenCalled();
    });
});

describe("file-helper error paths (logged, never thrown)", () => {
    let errSpy;
    beforeEach(() => {
        errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("readFile returns an empty string and logs when the file is missing", async () => {
        const result = await readFile(path.join(tmpDir, "does-not-exist.txt"));
        expect(result).toBe("");
        expect(errSpy).toHaveBeenCalled();
    });

    it("removeFile returns false and logs on an invalid argument", async () => {
        const result = await removeFile(null);
        expect(result).toBe(false);
        expect(errSpy).toHaveBeenCalled();
    });

    it("writeFile swallows the error when the parent directory is missing", async () => {
        await expect(
            writeFile(path.join(tmpDir, "missing", "f.txt"), "x")
        ).resolves.toBeUndefined();
        expect(errSpy).toHaveBeenCalled();
    });

    it("writeJson swallows the error when the parent directory is missing", async () => {
        await expect(
            writeJson(path.join(tmpDir, "missing", "f.json"), { a: 1 })
        ).resolves.toBeUndefined();
        expect(errSpy).toHaveBeenCalled();
    });

    it("appendToFile swallows the error when the parent directory is missing", async () => {
        await expect(
            appendToFile(path.join(tmpDir, "missing", "f.txt"), "x")
        ).resolves.toBeUndefined();
        expect(errSpy).toHaveBeenCalled();
    });
});

describe("boxInform", () => {
    let logSpy;
    beforeEach(() => {
        logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renders a box using the default secondary/padding/margin args", async () => {
        await boxInform("only-primary");
        expect(logSpy).toHaveBeenCalledTimes(1);
        // fsrLog.log prepends a timestamp prefix; the rendered box is the 2nd arg.
        expect(logSpy.mock.calls[0][1]).toContain("only-primary");
    });

    it("renders a box with explicit secondary/padding/margin args", async () => {
        await boxInform("primary", "secondary", 1, { left: 1, top: 1, bottom: 1, right: 1 });
        expect(logSpy).toHaveBeenCalledTimes(1);
        const rendered = logSpy.mock.calls[0][1];
        expect(rendered).toContain("primary");
        expect(rendered).toContain("secondary");
    });
});

describe("rainbowGradient colour branches", () => {
    it("returns greyscale triples (r==g==b) when saturation is 0", () => {
        const grad = rainbowGradient(3, 0, 0.5);
        expect(grad).toHaveLength(3);
        for (const [r, g, b] of grad) {
            expect(r).toBe(g);
            expect(g).toBe(b);
        }
    });

    it("handles lightness below 0.5 (the l<0.5 chroma branch)", () => {
        const grad = rainbowGradient(4, 1, 0.3);
        expect(grad).toHaveLength(4);
        for (const rgb of grad) {
            expect(rgb).toHaveLength(3);
            for (const channel of rgb) {
                expect(Number.isInteger(channel)).toBe(true);
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(255);
            }
        }
    });
});

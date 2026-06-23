/**
 * Tests for lib/utils/clear.js
 *
 * clear(opts) writes ANSI escape sequences to stdout. We spy on
 * process.stdout.write to capture the exact sequence without touching the
 * real terminal, and restore the spy after each test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const FULL_CLEAR = "\x1b[H\x1b[2J\x1b[3J";
const SOFT_CLEAR = "\x1b[0f";

let clear;
let writeSpy;

beforeEach(async () => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    clear = (await import("../../lib/utils/clear.js")).default;
});

afterEach(() => {
    writeSpy.mockRestore();
});

describe("clear()", () => {
    it("clear(true) writes the full clear (home + 2J + 3J) sequence", () => {
        clear(true);
        expect(writeSpy).toHaveBeenCalledTimes(1);
        expect(writeSpy).toHaveBeenCalledWith(FULL_CLEAR);
    });

    it("clear(false) writes the soft clear (home) sequence", () => {
        clear(false);
        expect(writeSpy).toHaveBeenCalledTimes(1);
        expect(writeSpy).toHaveBeenCalledWith(SOFT_CLEAR);
    });

    it("clear() with no argument defaults to a full clear", () => {
        clear();
        expect(writeSpy).toHaveBeenCalledTimes(1);
        expect(writeSpy).toHaveBeenCalledWith(FULL_CLEAR);
    });

    it("clear({ fullClear: false }) honours an explicit options object", () => {
        clear({ fullClear: false });
        expect(writeSpy).toHaveBeenCalledWith(SOFT_CLEAR);
    });

    it("clear({}) with no fullClear key defaults to a full clear", () => {
        clear({});
        expect(writeSpy).toHaveBeenCalledWith(FULL_CLEAR);
    });
});

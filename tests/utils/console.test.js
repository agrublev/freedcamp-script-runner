/**
 * Tests for lib/utils/console.js
 *
 * fsrLog is a thin wrapper that prefixes a timestamp + a coloured tag and then
 * forwards everything to the matching console.* method. We spy on the real
 * console methods (rather than asserting exact colour strings, which are
 * incidental) and verify each level forwards to the right sink AND passes the
 * caller's arguments through untouched.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let fsrLog;

beforeEach(async () => {
    fsrLog = (await import("../../lib/utils/console.js")).default;
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("fsrLog levels forward to the matching console method", () => {
    const cases = [
        ["log", "[LOG]"],
        ["info", "[INFO]"],
        ["warn", "[WARN]"],
        ["error", "[ERROR]"]
    ];

    for (const [method, tag] of cases) {
        it(`${method}() calls console.${method} and forwards the payload`, () => {
            const spy = vi.spyOn(console, method).mockImplementation(() => {});
            const payload = { detail: `${method}-payload` };

            fsrLog[method]("first", payload);

            expect(spy).toHaveBeenCalledTimes(1);
            const callArgs = spy.mock.calls[0];
            // The first arg is the timestamp+tag prefix; caller args follow.
            expect(callArgs[0]).toContain(tag);
            expect(callArgs).toContain("first");
            expect(callArgs).toContain(payload);
        });
    }

    it("forwards multiple arguments in order", () => {
        const spy = vi.spyOn(console, "info").mockImplementation(() => {});
        fsrLog.info("a", "b", "c");
        const callArgs = spy.mock.calls[0];
        // prefix is element 0, then a/b/c.
        expect(callArgs.slice(1)).toEqual(["a", "b", "c"]);
    });
});

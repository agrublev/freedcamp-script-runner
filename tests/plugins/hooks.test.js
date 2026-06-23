import { describe, it, expect, vi, beforeEach } from "vitest";

// Re-import per test to get a fresh in-memory registry.
let registerHook, fireHook;

describe("hooks – registerHook / fireHook", () => {
    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("../../lib/plugins/hooks.js");
        registerHook = mod.registerHook;
        fireHook = mod.fireHook;
    });

    it("calls a registered handler with the provided data", async () => {
        const fn = vi.fn().mockResolvedValue(undefined);
        registerHook("test-event", fn);
        await fireHook("test-event", { key: "value" });
        expect(fn).toHaveBeenCalledOnce();
        expect(fn).toHaveBeenCalledWith({ key: "value" });
    });

    it("calls multiple handlers in registration order", async () => {
        const calls = [];
        registerHook("ordered", vi.fn().mockImplementation(async () => calls.push(1)));
        registerHook("ordered", vi.fn().mockImplementation(async () => calls.push(2)));
        await fireHook("ordered", {});
        expect(calls).toEqual([1, 2]);
    });

    it("only fires handlers for the named hook, not others", async () => {
        const fnA = vi.fn().mockResolvedValue(undefined);
        const fnB = vi.fn().mockResolvedValue(undefined);
        registerHook("hookA", fnA);
        registerHook("hookB", fnB);
        await fireHook("hookA", {});
        expect(fnA).toHaveBeenCalledOnce();
        expect(fnB).not.toHaveBeenCalled();
    });

    it("resolves without error when no handlers are registered", async () => {
        await expect(fireHook("unknown-hook", { foo: "bar" })).resolves.toBeUndefined();
    });

    it("catches a sync-throwing handler and continues to next handler", async () => {
        const bad = vi.fn().mockImplementation(() => { throw new Error("boom"); });
        const good = vi.fn().mockResolvedValue(undefined);
        registerHook("resilient", bad);
        registerHook("resilient", good);
        await expect(fireHook("resilient", {})).resolves.toBeUndefined();
        expect(good).toHaveBeenCalledOnce();
    });

    it("catches a rejected async handler and continues to next handler", async () => {
        const bad = vi.fn().mockRejectedValue(new Error("async failure"));
        const good = vi.fn().mockResolvedValue(undefined);
        registerHook("async-err", bad);
        registerHook("async-err", good);
        await expect(fireHook("async-err", {})).resolves.toBeUndefined();
        expect(good).toHaveBeenCalledOnce();
    });

    it("passes undefined data when none is supplied to fireHook", async () => {
        const fn = vi.fn().mockResolvedValue(undefined);
        registerHook("no-data", fn);
        await fireHook("no-data");
        expect(fn).toHaveBeenCalledWith(undefined);
    });

    it("allows the same function to be registered multiple times", async () => {
        const fn = vi.fn().mockResolvedValue(undefined);
        registerHook("dup", fn);
        registerHook("dup", fn);
        await fireHook("dup", {});
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("passes complex payload to every handler unchanged", async () => {
        const payload = { taskName: "build", duration: 42, success: true };
        const fn = vi.fn().mockResolvedValue(undefined);
        registerHook("complex", fn);
        await fireHook("complex", payload);
        expect(fn).toHaveBeenCalledWith(payload);
    });
});

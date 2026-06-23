/**
 * Tests for lib/plugins/task-notifier/index.js
 *
 * The plugin registers pre-task, post-task, and task-error hooks that log
 * colorized messages via console.log, plus a "notify" command for
 * enable/disable/status control with cache-backed persistence.
 *
 * All side-effects are isolated:
 *   - chalk returns its input via identity (colors are stripped)
 *   - readCacheEntry / writeCacheEntry are fully mocked
 *   - console.log is spied on per-test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks must be declared before imports that trigger them.
vi.mock("../../lib/cache/cache.js", () => ({
    readCacheEntry: vi.fn().mockResolvedValue(undefined),
    writeCacheEntry: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("chalk", () => {
    // Returns a proxy that is both callable and has chainable properties.
    // When called with content (non-hex string), returns that content.
    // When called with a hex color code or with no string, returns another proxy.
    const makeChalk = () => {
        const fn = (...args) => {
            const s = args[0];
            if (typeof s === "string" && !s.startsWith("#")) return s;
            return makeChalk();
        };
        return new Proxy(fn, { get: () => makeChalk() });
    };
    return { default: makeChalk() };
});

vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import plugin from "../../lib/plugins/task-notifier/index.js";
import { readCacheEntry, writeCacheEntry } from "../../lib/cache/cache.js";

const makeCtx = () => ({
    registerHook: vi.fn(),
    registerCommand: vi.fn(),
    logger: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }
});

const getHook = (ctx, name) =>
    ctx.registerHook.mock.calls.find((c) => c[0] === name)?.[1];
const getCommand = (ctx, name) =>
    ctx.registerCommand.mock.calls.find((c) => c[0]?.name === name)?.[0];

describe("task-notifier plugin", () => {
    let ctx;
    let consoleSpy;

    beforeEach(async () => {
        vi.clearAllMocks();
        readCacheEntry.mockResolvedValue(undefined); // default: notifications enabled
        ctx = makeCtx();
        consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await plugin.init(ctx);
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        vi.clearAllMocks();
    });

    it("registers pre-task, post-task, and task-error hooks plus a notify command", () => {
        const hookNames = ctx.registerHook.mock.calls.map((c) => c[0]);
        expect(hookNames).toContain("pre-task");
        expect(hookNames).toContain("post-task");
        expect(hookNames).toContain("task-error");

        expect(ctx.registerCommand).toHaveBeenCalledTimes(1);
        expect(getCommand(ctx, "notify")).toBeTruthy();
    });

    it("pre-task hook logs task name to console.log when enabled", async () => {
        const preTask = getHook(ctx, "pre-task");
        await preTask({ taskName: "build", command: "build" });
        expect(consoleSpy).toHaveBeenCalled();
        const allArgs = consoleSpy.mock.calls.flat().join(" ");
        expect(allArgs).toContain("build");
    });

    it("post-task hook logs task end to console.log when enabled", async () => {
        const postTask = getHook(ctx, "post-task");
        await postTask({ success: true, taskName: "build", duration: 1500 });
        expect(consoleSpy).toHaveBeenCalled();
        const allArgs = consoleSpy.mock.calls.flat().join(" ");
        expect(allArgs).toContain("build");
    });

    it("task-error hook logs error message to console.log when enabled", async () => {
        const taskError = getHook(ctx, "task-error");
        await taskError({ taskName: "build", error: new Error("boom") });
        expect(consoleSpy).toHaveBeenCalled();
        const allArgs = consoleSpy.mock.calls.flat().join(" ");
        expect(allArgs).toContain("build");
    });

    it("disabling notifications gates pre-task hook (nothing logged)", async () => {
        const cmd = getCommand(ctx, "notify");
        const preTask = getHook(ctx, "pre-task");

        await cmd.handler({ disable: true }, ctx);
        consoleSpy.mockClear();

        await preTask({ taskName: "build", command: "build" });
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("disabling notifications gates post-task hook (nothing logged)", async () => {
        const cmd = getCommand(ctx, "notify");
        const postTask = getHook(ctx, "post-task");

        await cmd.handler({ disable: true }, ctx);
        consoleSpy.mockClear();

        await postTask({ success: true, taskName: "build", duration: 1500 });
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("disabling notifications gates task-error hook (nothing logged)", async () => {
        const cmd = getCommand(ctx, "notify");
        const taskError = getHook(ctx, "task-error");

        await cmd.handler({ disable: true }, ctx);
        consoleSpy.mockClear();

        await taskError({ taskName: "build", error: new Error("boom") });
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("re-enabling notifications restores hook output", async () => {
        const cmd = getCommand(ctx, "notify");
        const postTask = getHook(ctx, "post-task");

        await cmd.handler({ disable: true }, ctx);
        await cmd.handler({ enable: true }, ctx);
        consoleSpy.mockClear();

        await postTask({ success: true, taskName: "build", duration: 1500 });
        expect(consoleSpy).toHaveBeenCalled();
    });

    it("notify --enable sets enabled state, logs success, and writes cache", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ enable: true }, ctx);
        expect(ctx.logger.success).toHaveBeenCalledWith("Notifications enabled");
        expect(writeCacheEntry).toHaveBeenCalled();
    });

    it("notify --disable sets disabled state, logs info, and writes cache", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ disable: true }, ctx);
        expect(ctx.logger.info).toHaveBeenCalledWith("Notifications disabled");
        expect(writeCacheEntry).toHaveBeenCalled();
    });

    it("notify --status reports enabled when default", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ status: true }, ctx);
        expect(ctx.logger.info).toHaveBeenCalledWith("Notifications are enabled");
    });

    it("notify --status reports disabled after disabling", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ disable: true }, ctx);
        vi.clearAllMocks();
        await cmd.handler({ status: true }, ctx);
        expect(ctx.logger.info).toHaveBeenCalledWith("Notifications are disabled");
    });

    it("notify with no flags prints usage", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({}, ctx);
        expect(ctx.logger.info).toHaveBeenCalledWith(
            expect.stringContaining("Usage: fsr notify")
        );
    });

    it("reads cached notifications state on init — disabled if cache says false", async () => {
        readCacheEntry.mockResolvedValue({ value: false });
        const freshCtx = makeCtx();
        await plugin.init(freshCtx);

        const postTask = getHook(freshCtx, "post-task");
        consoleSpy.mockClear();
        await postTask({ success: true, taskName: "x", duration: 100 });
        expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("reads cached notifications state on init — enabled if cache value is not false", async () => {
        readCacheEntry.mockResolvedValue({ value: true });
        const freshCtx = makeCtx();
        await plugin.init(freshCtx);

        const postTask = getHook(freshCtx, "post-task");
        consoleSpy.mockClear();
        await postTask({ success: true, taskName: "x", duration: 100 });
        expect(consoleSpy).toHaveBeenCalled();
    });
});

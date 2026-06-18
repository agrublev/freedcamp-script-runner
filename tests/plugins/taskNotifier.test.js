/**
 * Tests for lib/plugins/task-notifier/index.js
 *
 * The plugin default-exports an object whose async init(context) registers:
 *   - a "post-task"  hook  (success/failure completion notifications)
 *   - a "task-error" hook  (error notifications)
 *   - a "notify"     command (enable/disable/status control)
 *
 * Notifications are gated by a closure flag `notificationsEnabled` that the
 * notify command toggles, so each test re-runs init() for a fresh closure.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Silence fsrLog.log output noise (the post-task hook calls fsrLog.log).
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import plugin from "../../lib/plugins/task-notifier/index.js";

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

    beforeEach(async () => {
        vi.clearAllMocks();
        ctx = makeCtx();
        await plugin.init(ctx);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("registers post-task and task-error hooks and a single notify command", () => {
        const hookNames = ctx.registerHook.mock.calls.map((c) => c[0]);
        expect(hookNames).toContain("post-task");
        expect(hookNames).toContain("task-error");

        expect(ctx.registerCommand).toHaveBeenCalledTimes(1);
        const cmd = getCommand(ctx, "notify");
        expect(cmd).toBeTruthy();
        expect(typeof cmd.handler).toBe("function");
    });

    it("post-task hook logs a completion message on success", async () => {
        const postTask = getHook(ctx, "post-task");
        await postTask({ success: true, taskName: "build", duration: 1500 });

        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
        const msg = ctx.logger.info.mock.calls[0][0];
        expect(msg).toContain("Task Completed: build");
        expect(msg).toContain("Duration: 1.50s");
    });

    it("post-task hook logs a failure message on failure", async () => {
        const postTask = getHook(ctx, "post-task");
        await postTask({ success: false, taskName: "build", duration: 2000 });

        const msg = ctx.logger.info.mock.calls[0][0];
        expect(msg).toContain("Task Failed: build");
        expect(msg).toContain("Duration: 2.00s");
    });

    it("task-error hook logs an error message with the error text", async () => {
        const taskError = getHook(ctx, "task-error");
        await taskError({ taskName: "build", error: new Error("boom") });

        expect(ctx.logger.error).toHaveBeenCalledTimes(1);
        const msg = ctx.logger.error.mock.calls[0][0];
        expect(msg).toContain("Task Error: build");
        expect(msg).toContain("boom");
    });

    it("notify --enable logs success", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ enable: true }, ctx);
        expect(ctx.logger.success).toHaveBeenCalledWith("Notifications enabled");
    });

    it("notify --disable logs info", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ disable: true }, ctx);
        expect(ctx.logger.info).toHaveBeenCalledWith("Notifications disabled");
    });

    it("notify --status reports the current (enabled) status", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ status: true }, ctx);
        expect(ctx.logger.info).toHaveBeenCalledWith("Notifications are enabled");
    });

    it("notify --status reports disabled after disabling", async () => {
        const cmd = getCommand(ctx, "notify");
        await cmd.handler({ disable: true }, ctx);
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

    it("disabling notifications gates the post-task hook (no notification fires)", async () => {
        const cmd = getCommand(ctx, "notify");
        const postTask = getHook(ctx, "post-task");

        await cmd.handler({ disable: true }, ctx);
        // Reset call records; the `notificationsEnabled` closure flag stays false.
        vi.clearAllMocks();

        await postTask({ success: true, taskName: "build", duration: 1500 });
        expect(ctx.logger.info).not.toHaveBeenCalled();
    });

    it("disabling notifications gates the task-error hook (no error notification fires)", async () => {
        const cmd = getCommand(ctx, "notify");
        const taskError = getHook(ctx, "task-error");

        await cmd.handler({ disable: true }, ctx);
        // notificationsEnabled closure flag is now false; clear records.
        vi.clearAllMocks();

        await taskError({ taskName: "build", error: new Error("boom") });
        expect(ctx.logger.error).not.toHaveBeenCalled();
    });

    it("re-enabling notifications restores the post-task hook", async () => {
        const cmd = getCommand(ctx, "notify");
        const postTask = getHook(ctx, "post-task");

        await cmd.handler({ disable: true }, ctx);
        await cmd.handler({ enable: true }, ctx);
        vi.clearAllMocks();

        await postTask({ success: true, taskName: "build", duration: 1500 });
        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
        expect(ctx.logger.info.mock.calls[0][0]).toContain("Task Completed: build");
    });
});

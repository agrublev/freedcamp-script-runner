/**
 * Tests for lib/plugins/deployment/index.js
 *
 * The plugin default-exports an object whose async init(context) registers:
 *   - a "post-command" hook    (records {timestamp, success, duration} for
 *                               command==="deploy" and persists via setStorage)
 *   - a "deploy" command       (spawns `npx surge` — registration only, NEVER run)
 *   - a "deploy-history" command (logs recorded deployments)
 *
 * The post-command hook and deploy-history handler share a `deploymentHistory`
 * closure array created per init(), so each test re-runs init() for a clean slate.
 *
 * cross-spawn is mocked defensively so no real process can ever spawn.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("cross-spawn", () => ({ default: vi.fn() }));

import spawn from "cross-spawn";
import plugin from "../../lib/plugins/deployment/index.js";

const makeCtx = () => ({
    registerHook: vi.fn(),
    registerCommand: vi.fn(),
    setStorage: vi.fn(),
    logger: { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }
});

const getHook = (ctx, name) =>
    ctx.registerHook.mock.calls.find((c) => c[0] === name)?.[1];
const getCommand = (ctx, name) =>
    ctx.registerCommand.mock.calls.find((c) => c[0]?.name === name)?.[0];

describe("deployment plugin", () => {
    let ctx;

    beforeEach(async () => {
        vi.clearAllMocks();
        ctx = makeCtx();
        await plugin.init(ctx);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("registers the post-command hook and the deploy and deploy-history commands", () => {
        const hookNames = ctx.registerHook.mock.calls.map((c) => c[0]);
        expect(hookNames).toContain("post-command");

        expect(getCommand(ctx, "deploy")).toBeTruthy();
        expect(getCommand(ctx, "deploy-history")).toBeTruthy();
    });

    it("deploy-history reports nothing recorded before any deploy", async () => {
        const history = getCommand(ctx, "deploy-history");
        await history.handler({}, ctx);
        expect(ctx.logger.info).toHaveBeenCalledWith("No deployment history");
    });

    it("post-command hook ignores non-deploy commands", async () => {
        const postCommand = getHook(ctx, "post-command");
        await postCommand({ command: "build", success: true, duration: 100, timestamp: Date.now() });
        expect(ctx.setStorage).not.toHaveBeenCalled();
    });

    it("post-command hook records deploy commands and persists via setStorage", async () => {
        const postCommand = getHook(ctx, "post-command");
        const ts = Date.UTC(2026, 0, 1, 12, 0, 0);

        await postCommand({ command: "deploy", success: true, duration: 4200, timestamp: ts });

        expect(ctx.setStorage).toHaveBeenCalledTimes(1);
        const stored = ctx.setStorage.mock.calls[0][0];
        expect(stored.deploymentHistory).toHaveLength(1);
        expect(stored.deploymentHistory[0]).toMatchObject({
            success: true,
            duration: 4200,
            timestamp: ts
        });
    });

    it("deploy-history logs a recorded successful deployment after a post-command event", async () => {
        const postCommand = getHook(ctx, "post-command");
        const history = getCommand(ctx, "deploy-history");
        const ts = Date.UTC(2026, 0, 1, 12, 0, 0);

        await postCommand({ command: "deploy", success: true, duration: 4200, timestamp: ts });
        await history.handler({}, ctx);

        const messages = ctx.logger.info.mock.calls.map((c) => c[0]);
        expect(messages).toContain("Recent Deployments:");

        const entryLine = messages.find(
            (m) => typeof m === "string" && m.includes("4200ms")
        );
        expect(entryLine).toBeTruthy();
        expect(entryLine).toContain("✓");
    });

    it("deploy-history marks failed deployments with a failure glyph", async () => {
        const postCommand = getHook(ctx, "post-command");
        const history = getCommand(ctx, "deploy-history");

        await postCommand({ command: "deploy", success: false, duration: 999, timestamp: Date.now() });
        await history.handler({}, ctx);

        const entryLine = ctx.logger.info.mock.calls
            .map((c) => c[0])
            .find((m) => typeof m === "string" && m.includes("999ms"));
        expect(entryLine).toContain("✗");
    });

    it("deploy command refuses to spawn without files/subdomain (no process spawned)", async () => {
        const deploy = getCommand(ctx, "deploy");
        await deploy.handler({}, ctx);

        expect(ctx.logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Usage: fsr deploy")
        );
        // Guard branch returns before deployExec — cross-spawn must never run.
        expect(spawn).not.toHaveBeenCalled();
    });
});

/**
 * Integration tests — end-to-end env-profile propagation.
 *
 * These tests call `runCLICommand` with a REAL (unmocked) spawn so that
 * the actual child process receives the correct environment variables.
 *
 * The child scripts are tiny inline Node.js one-liners executed via
 * `node -e '…'` that print `process.env.NODE_ENV` and `process.env.FSR_ENV`
 * to stdout and exit 0 when the values match expectations, or exit 1 otherwise.
 * We capture stdout through the hooked `fireHook("post-task"…)` success path
 * and confirm the child exited cleanly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We only mock hooks so tests don't blow up on missing plugin infra.
// cross-spawn, runCLICommand, and parseTask are all REAL.
vi.mock("../../lib/plugins/hooks.js", () => ({ fireHook: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

import { fireHook } from "../../lib/plugins/hooks.js";
import runCLICommand from "../../lib/running/runCLICommand.js";
import parseTask from "../../lib/running/parseTask.js";

describe("Integration: --env flag → child process env vars", () => {
    let origNodeEnv;
    let origFsrEnv;

    beforeEach(() => {
        origNodeEnv = process.env.NODE_ENV;
        origFsrEnv = process.env.FSR_ENV;
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (origNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = origNodeEnv;
        }
        if (origFsrEnv === undefined) {
            delete process.env.FSR_ENV;
        } else {
            process.env.FSR_ENV = origFsrEnv;
        }
    });

    it("bash task spawned by runCLICommand inherits NODE_ENV=staging from process.env", async () => {
        // Simulate what index.js --env injection does before yargs runs.
        process.env.NODE_ENV = "staging";
        process.env.FSR_ENV = "staging";

        // A bash task that exits 0 only if NODE_ENV === 'staging'
        const taskData = { name: "check-env", script: "node -e \"process.exit(process.env.NODE_ENV === 'staging' ? 0 : 1)\"", lang: "bash" };
        const parsed = parseTask(taskData);

        await runCLICommand(parsed, /* quiet */ true);

        // post-task hook fires on success (exit code 0); task-error fires on failure.
        expect(fireHook).toHaveBeenCalledWith(
            "post-task",
            expect.objectContaining({ taskName: "check-env", success: true })
        );
        expect(fireHook).not.toHaveBeenCalledWith("task-error", expect.anything());
    });

    it("bash task spawned by runCLICommand inherits FSR_ENV=production from process.env", async () => {
        process.env.NODE_ENV = "production";
        process.env.FSR_ENV = "production";

        const taskData = { name: "check-fsr-env", script: "node -e \"process.exit(process.env.FSR_ENV === 'production' ? 0 : 1)\"", lang: "bash" };
        const parsed = parseTask(taskData);

        await runCLICommand(parsed, true);

        expect(fireHook).toHaveBeenCalledWith(
            "post-task",
            expect.objectContaining({ taskName: "check-fsr-env", success: true })
        );
        expect(fireHook).not.toHaveBeenCalledWith("task-error", expect.anything());
    });

    it("script.env overlay in parseTask(taskData.env) overrides process.env for spawned bash child", async () => {
        // process.env says 'development', but the task's env profile says 'staging'
        process.env.NODE_ENV = "development";
        process.env.FSR_ENV = "development";

        // taskData.env='staging' causes parseTask to set script.env = { NODE_ENV:'staging', FSR_ENV:'staging' }
        // runCLICommand spreads script.env on top of process.env in the spawn call → child sees 'staging'
        const taskData = {
            name: "env-overlay",
            script: "node -e \"process.exit(process.env.NODE_ENV === 'staging' && process.env.FSR_ENV === 'staging' ? 0 : 1)\"",
            lang: "bash",
            env: "staging"
        };
        const parsed = parseTask(taskData);

        await runCLICommand(parsed, true);

        expect(fireHook).toHaveBeenCalledWith(
            "post-task",
            expect.objectContaining({ taskName: "env-overlay", success: true })
        );
        expect(fireHook).not.toHaveBeenCalledWith("task-error", expect.anything());
    });

    it("JS block can read NODE_ENV and FSR_ENV injected by the env profile overlay", async () => {
        process.env.NODE_ENV = "test";
        process.env.FSR_ENV = "test";

        const jsBlock = `
if (process.env.NODE_ENV !== 'test') throw new Error('NODE_ENV mismatch: ' + process.env.NODE_ENV);
if (process.env.FSR_ENV !== 'test')  throw new Error('FSR_ENV mismatch: ' + process.env.FSR_ENV);
`;
        const taskData = { name: "js-env-check", script: jsBlock, lang: "javascript", env: "test" };
        const parsed = parseTask(taskData);

        await runCLICommand(parsed, true);

        expect(fireHook).toHaveBeenCalledWith(
            "post-task",
            expect.objectContaining({ taskName: "js-env-check", success: true })
        );
        expect(fireHook).not.toHaveBeenCalledWith("task-error", expect.anything());
    });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import runCLICommand from "../../lib/running/runCLICommand.js";
import { fireHook } from "../../lib/plugins/hooks.js";
import * as spawnNS from "cross-spawn";
import * as fsPromises from "fs/promises";

vi.mock("cross-spawn", () => ({ default: vi.fn() }));
vi.mock("fs/promises", async () => {
    const actual = await vi.importActual("fs/promises");
    return {
        ...actual,
        writeFile: vi.fn(actual.writeFile),
        rm: vi.fn(actual.rm)
    };
});
vi.mock("../../lib/plugins/hooks.js", () => ({
    fireHook: vi.fn().mockResolvedValue(undefined)
}));
vi.mock("moment-mini", () => ({
    default: () => ({ format: () => "12:00:00" })
}));

const makeProcess = (code = 0) => {
    const emitter = { on: vi.fn() };
    emitter.on.mockImplementation((event, cb) => {
        if (event === "close") setTimeout(() => cb(code), 0);
    });
    return emitter;
};

// Captures the registered event handlers so a test can drive `error`/`close`
// deterministically (the source resolves only after `finish()` runs).
const makeManualProcess = () => {
    const handlers = {};
    const emitter = { on: vi.fn((event, cb) => { handlers[event] = cb; }) };
    return { emitter, handlers };
};

describe("runCLICommand – javascript lang", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fireHook.mockResolvedValue(undefined);
    });

    it("executes javascript scripts by writing a temp .mjs file", async () => {
        await runCLICommand({
            task: { name: "hello" },
            script: { lang: "javascript", full: "// noop", env: {}, type: "node", rest: [] }
        });
        expect(fsPromises.writeFile).toHaveBeenCalledWith(
            expect.stringMatching(/\.fsr-task-[a-f0-9]+\.mjs$/),
            "// noop",
            "utf8"
        );
    });

    it("fires pre-task before post-task for javascript execution", async () => {
        const order = [];
        fireHook.mockImplementation(async (name) => { order.push(name); });
        await runCLICommand({
            task: { name: "my-task" },
            script: { lang: "javascript", full: "// noop", env: {}, type: "node", rest: [] }
        });
        expect(order[0]).toBe("pre-task");
        expect(order[1]).toBe("post-task");
        expect(fireHook).toHaveBeenCalledWith("pre-task", expect.objectContaining({ taskName: "my-task" }));
        expect(fireHook).toHaveBeenCalledWith("post-task", expect.objectContaining({ taskName: "my-task", success: true }));
    });

    it("fires task-error hook when a javascript task throws", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        await runCLICommand({
            task: { name: "js-fail" },
            script: { lang: "javascript", full: "throw new Error('boom');", env: {}, type: "node", rest: [] }
        });
        expect(fireHook).toHaveBeenCalledWith(
            "task-error",
            expect.objectContaining({ taskName: "js-fail" })
        );
        errSpy.mockRestore();
    });

    it("javascript block can read process.env.NODE_ENV and FSR_ENV set by --env injection", async () => {
        const origNodeEnv = process.env.NODE_ENV;
        const origFsrEnv = process.env.FSR_ENV;
        process.env.NODE_ENV = "staging";
        process.env.FSR_ENV = "staging";

        // The block throws if the env vars are not what we expect; a throw would
        // trigger the task-error hook, which we assert is NOT called.
        const jsBlock = [
            "if (process.env.NODE_ENV !== 'staging')",
            "  throw new Error('NODE_ENV expected staging, got ' + process.env.NODE_ENV);",
            "if (process.env.FSR_ENV !== 'staging')",
            "  throw new Error('FSR_ENV expected staging, got ' + process.env.FSR_ENV);"
        ].join("\n");

        await runCLICommand({
            task: { name: "env-read" },
            script: { lang: "javascript", full: jsBlock, env: {}, type: "node", rest: [] }
        });

        expect(fireHook).not.toHaveBeenCalledWith("task-error", expect.anything());

        process.env.NODE_ENV = origNodeEnv;
        process.env.FSR_ENV = origFsrEnv;
    });

    it("script.env NODE_ENV/FSR_ENV overrides are applied to process.env during JS block execution", async () => {
        const origNodeEnv = process.env.NODE_ENV;
        const origFsrEnv = process.env.FSR_ENV;
        process.env.NODE_ENV = "development";
        process.env.FSR_ENV = "development";

        // script.env has production values — they should shadow the process-level values
        // inside the JS block, matching the same override behaviour bash tasks get.
        const jsBlock = [
            "if (process.env.NODE_ENV !== 'production')",
            "  throw new Error('NODE_ENV expected production, got ' + process.env.NODE_ENV);",
            "if (process.env.FSR_ENV !== 'production')",
            "  throw new Error('FSR_ENV expected production, got ' + process.env.FSR_ENV);"
        ].join("\n");

        await runCLICommand({
            task: { name: "env-override" },
            script: {
                lang: "javascript",
                full: jsBlock,
                env: { NODE_ENV: "production", FSR_ENV: "production" },
                type: "node",
                rest: []
            }
        });

        expect(fireHook).not.toHaveBeenCalledWith("task-error", expect.anything());

        // Env vars should be restored after the task completes.
        expect(process.env.NODE_ENV).toBe("development");
        expect(process.env.FSR_ENV).toBe("development");

        process.env.NODE_ENV = origNodeEnv;
        process.env.FSR_ENV = origFsrEnv;
    });
});

describe("runCLICommand – bash lang", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fireHook.mockResolvedValue(undefined);
    });

    it("spawns a shell process for bash scripts", async () => {
        spawnNS.default.mockReturnValue(makeProcess(0));
        await runCLICommand({
            task: { name: "build" },
            script: { lang: "bash", type: "node", full: "dist/index.js", env: {}, rest: [] }
        });
        expect(spawnNS.default).toHaveBeenCalled();
    });

    it("fires pre-task before post-task for bash execution", async () => {
        const order = [];
        fireHook.mockImplementation(async (name) => { order.push(name); });
        spawnNS.default.mockReturnValue(makeProcess(0));
        await runCLICommand({
            task: { name: "build" },
            script: { lang: "bash", type: "node", full: "dist/index.js", env: {}, rest: [] }
        });
        expect(order[0]).toBe("pre-task");
        expect(order[1]).toBe("post-task");
        expect(fireHook).toHaveBeenCalledWith("pre-task", expect.objectContaining({ taskName: "build" }));
        expect(fireHook).toHaveBeenCalledWith("post-task", expect.objectContaining({ taskName: "build", success: true }));
    });

    it("fires task-error hook on non-zero exit code", async () => {
        spawnNS.default.mockReturnValue(makeProcess(1));
        await runCLICommand({
            task: { name: "failing-task" },
            script: { lang: "bash", type: "node", full: "fail.js", env: {}, rest: [] }
        });
        expect(fireHook).toHaveBeenCalledWith(
            "task-error",
            expect.objectContaining({ taskName: "failing-task" })
        );
    });

    it("suppresses console output in quiet mode", async () => {
        spawnNS.default.mockReturnValue(makeProcess(0));
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await runCLICommand(
            {
                task: { name: "quiet-task" },
                script: { lang: "bash", type: "node", full: "quiet.js", env: {}, rest: [] }
            },
            true
        );
        consoleSpy.mockRestore();
        expect(spawnNS.default).toHaveBeenCalled();
    });

    it("fires task-error and ignores a later close once the process emits an error", async () => {
        const { emitter, handlers } = makeManualProcess();
        spawnNS.default.mockReturnValue(emitter);
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const p = runCLICommand({
            task: { name: "err-task" },
            script: { lang: "bash", type: "node", full: "boom.js", env: {}, rest: [] }
        });

        // Allow the pre-task fireHook await to settle before handlers are populated.
        await Promise.resolve();
        await handlers.error(new Error("spawn ENOENT"));
        await p;

        expect(fireHook).toHaveBeenCalledWith(
            "task-error",
            expect.objectContaining({ taskName: "err-task" })
        );

        // A trailing close must hit the settled guard and resolve to nothing.
        await expect(handlers.close(1)).resolves.toBeUndefined();
        errSpy.mockRestore();
    });

    it("spawn env inherits NODE_ENV and FSR_ENV from process.env", async () => {
        const origNodeEnv = process.env.NODE_ENV;
        const origFsrEnv = process.env.FSR_ENV;
        process.env.NODE_ENV = "staging";
        process.env.FSR_ENV = "staging";

        spawnNS.default.mockReturnValue(makeProcess(0));
        await runCLICommand({
            task: { name: "build" },
            script: { lang: "bash", type: "node", full: "dist/index.js", env: {}, rest: [] }
        });

        const spawnEnv = spawnNS.default.mock.calls[0][2].env;
        expect(spawnEnv.NODE_ENV).toBe("staging");
        expect(spawnEnv.FSR_ENV).toBe("staging");

        process.env.NODE_ENV = origNodeEnv;
        process.env.FSR_ENV = origFsrEnv;
    });

    it("script.env NODE_ENV/FSR_ENV override process.env values in spawn (no stripping)", async () => {
        const origNodeEnv = process.env.NODE_ENV;
        const origFsrEnv = process.env.FSR_ENV;
        process.env.NODE_ENV = "development";
        process.env.FSR_ENV = "development";

        spawnNS.default.mockReturnValue(makeProcess(0));
        await runCLICommand({
            task: { name: "build" },
            script: {
                lang: "bash",
                type: "node",
                full: "dist/index.js",
                env: { NODE_ENV: "production", FSR_ENV: "production" },
                rest: []
            }
        });

        const spawnEnv = spawnNS.default.mock.calls[0][2].env;
        expect(spawnEnv.NODE_ENV).toBe("production");
        expect(spawnEnv.FSR_ENV).toBe("production");

        process.env.NODE_ENV = origNodeEnv;
        process.env.FSR_ENV = origFsrEnv;
    });
});

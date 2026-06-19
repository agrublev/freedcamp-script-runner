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
});

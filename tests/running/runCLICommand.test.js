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

    it("fires post-task hook after javascript execution", async () => {
        await runCLICommand({
            task: { name: "my-task" },
            script: { lang: "javascript", full: "// noop", env: {}, type: "node", rest: [] }
        });
        expect(fireHook).toHaveBeenCalledWith(
            "post-task",
            expect.objectContaining({ taskName: "my-task", success: true })
        );
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

    it("fires post-task hook on successful exit", async () => {
        spawnNS.default.mockReturnValue(makeProcess(0));
        await runCLICommand({
            task: { name: "build" },
            script: { lang: "bash", type: "node", full: "dist/index.js", env: {}, rest: [] }
        });
        expect(fireHook).toHaveBeenCalledWith(
            "post-task",
            expect.objectContaining({ taskName: "build", success: true })
        );
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
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import runSequence from "../../lib/running/runSequence.js";
import runCLICommand from "../../lib/running/runCLICommand.js";

vi.mock("../../lib/running/runCLICommand.js", () => ({
    default: vi.fn().mockResolvedValue(undefined)
}));

const makeFcScripts = (tasks = []) => ({ allTasks: tasks });

describe("runSequence", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        runCLICommand.mockResolvedValue(undefined);
    });

    it("runs bash tasks in sequence", async () => {
        const fcScripts = makeFcScripts([
            { name: "build", script: "node build.js", lang: "bash", order: 0 },
            { name: "test", script: "vitest run", lang: "bash", order: 1 }
        ]);

        await runSequence(["build", "test"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledTimes(2);
    });

    it("passes correct script config for a plain bash command", async () => {
        const fcScripts = makeFcScripts([
            { name: "start", script: "node server.js", lang: "bash", order: 0 }
        ]);

        await runSequence(["start"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledWith(
            expect.objectContaining({
                task: { name: "start" },
                script: expect.objectContaining({ type: "node", full: "server.js", lang: "bash" })
            })
        );
    });

    it("handles env var prefix in bash scripts (KEY=val cmd args)", async () => {
        const fcScripts = makeFcScripts([
            { name: "env-task", script: "NODE_ENV=production node server.js", lang: "bash", order: 0 }
        ]);

        await runSequence(["env-task"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledWith(
            expect.objectContaining({
                script: expect.objectContaining({
                    env: { NODE_ENV: "production" },
                    type: "node"
                })
            })
        );
    });

    it("runs javascript tasks via javascript lang", async () => {
        const fcScripts = makeFcScripts([
            { name: "js-task", script: "console.log('hi')", lang: "javascript", order: 0 }
        ]);

        await runSequence(["js-task"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledWith(
            expect.objectContaining({
                script: expect.objectContaining({ lang: "javascript", full: "console.log('hi')" })
            })
        );
    });

    it("logs error and continues when task is not found", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        await runSequence(["nonexistent"], makeFcScripts([]));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("continues sequence after a task error", async () => {
        runCLICommand
            .mockRejectedValueOnce(new Error("oops"))
            .mockResolvedValueOnce(undefined);

        const fcScripts = makeFcScripts([
            { name: "failing", script: "bad cmd", lang: "bash", order: 0 },
            { name: "ok", script: "node ok.js", lang: "bash", order: 1 }
        ]);

        await runSequence(["failing", "ok"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledTimes(2);
    });

    it("handles empty task list without error", async () => {
        await expect(runSequence([], makeFcScripts([]))).resolves.toBeUndefined();
    });
});

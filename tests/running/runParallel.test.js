import { describe, it, expect, vi, beforeEach } from "vitest";
import runParallel from "../../lib/running/runParallel.js";
import runCLICommand from "../../lib/running/runCLICommand.js";

vi.mock("../../lib/running/runCLICommand.js", () => ({
    default: vi.fn().mockResolvedValue(undefined)
}));

const makeFcScripts = (tasks = []) => ({ allTasks: tasks });

describe("runParallel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        runCLICommand.mockResolvedValue(undefined);
    });

    it("runs multiple bash tasks in parallel", async () => {
        const fcScripts = makeFcScripts([
            { name: "web", script: "node web.js", lang: "bash", order: 0 },
            { name: "api", script: "node api.js", lang: "bash", order: 1 }
        ]);

        await runParallel(["web", "api"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledTimes(2);
    });

    it("passes correct script config for bash task", async () => {
        const fcScripts = makeFcScripts([
            { name: "serve", script: "node serve.js", lang: "bash", order: 0 }
        ]);

        await runParallel(["serve"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledWith(
            expect.objectContaining({
                task: { name: "serve" },
                script: expect.objectContaining({ type: "node", full: "serve.js", lang: "bash" })
            })
        );
    });

    it("handles env var prefix in bash scripts", async () => {
        const fcScripts = makeFcScripts([
            { name: "env-task", script: "PORT=3000 node server.js", lang: "bash", order: 0 }
        ]);

        await runParallel(["env-task"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledWith(
            expect.objectContaining({
                script: expect.objectContaining({
                    env: { PORT: "3000" },
                    type: "node"
                })
            })
        );
    });

    it("runs javascript tasks via javascript lang", async () => {
        const fcScripts = makeFcScripts([
            { name: "js-task", script: "require('./thing')", lang: "javascript", order: 0 }
        ]);

        await runParallel(["js-task"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledWith(
            expect.objectContaining({
                script: expect.objectContaining({ lang: "javascript", full: "require('./thing')" })
            })
        );
    });

    it("logs error for missing task and continues", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        await runParallel(["missing-task"], makeFcScripts([]));
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("continues running other tasks even if one throws", async () => {
        runCLICommand
            .mockRejectedValueOnce(new Error("fail"))
            .mockResolvedValueOnce(undefined);

        const fcScripts = makeFcScripts([
            { name: "fail-task", script: "bad", lang: "bash", order: 0 },
            { name: "ok-task", script: "node ok.js", lang: "bash", order: 1 }
        ]);

        await runParallel(["fail-task", "ok-task"], fcScripts);
        expect(runCLICommand).toHaveBeenCalledTimes(2);
    });

    it("handles empty task list without error", async () => {
        await expect(runParallel([], makeFcScripts([]))).resolves.toBeUndefined();
    });
});

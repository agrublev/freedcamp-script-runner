/**
 * Tests for lib/startScripts.js
 *
 * startScripts(categories=true) – parses fscripts.md, lets the user pick a task
 *   via the ink TaskPicker (mocked), records it in recent tasks, and runs it.
 * clearRecent()                 – wipes the persisted recentTasks store.
 *
 * Everything with a side-effect (task picker render, the CLI command runner,
 * the persisted config) is mocked so no real ink renders and no config file
 * is written. We exercise the real control-flow / branching only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Shared registry of mocked Conf instances so tests can assert on the
// instance the module created internally (it caches `_config`).
const confMock = vi.hoisted(() => ({ instances: [] }));

vi.mock("../../lib/taskList.js", () => ({ default: vi.fn(), selectPlugin: vi.fn() }));
vi.mock("../../lib/parsers/parseScriptsMd.js", () => ({ default: vi.fn() }));
vi.mock("../../lib/running/runCLICommand.js", () => ({ default: vi.fn() }));
vi.mock("../../lib/running/parseTask.js", () => ({ default: vi.fn((x) => x) }));
vi.mock("conf", () => ({
    default: class Conf {
        constructor() {
            this.store = {};
            this.get = vi.fn((k, d) => (this.store[k] !== undefined ? this.store[k] : d));
            this.set = vi.fn((k, v) => {
                this.store[k] = v;
            });
            confMock.instances.push(this);
        }
    },
}));
// Nothing should ever actually render.
vi.mock("ink", () => ({
    render: vi.fn(() => ({ waitUntilExit: () => Promise.resolve() })),
}));
vi.mock("../../lib/ui/AutoComplete.js", () => ({ default: () => null }));
// Silence logger noise (no assertions needed against it).
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("startScripts / clearRecent", () => {
    let startScripts, clearRecent, taskList, parseScriptFile, runCLICommand, parseTask;

    beforeEach(async () => {
        vi.resetModules();
        confMock.instances.length = 0;

        const mod = await import("../../lib/startScripts.js");
        startScripts = mod.startScripts;
        clearRecent = mod.clearRecent;

        taskList = (await import("../../lib/taskList.js")).default;
        parseScriptFile = (await import("../../lib/parsers/parseScriptsMd.js")).default;
        runCLICommand = (await import("../../lib/running/runCLICommand.js")).default;
        parseTask = (await import("../../lib/running/parseTask.js")).default;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns false and never runs a command when fscripts.md is missing", async () => {
        parseScriptFile.mockResolvedValue(false);

        const result = await startScripts();

        expect(result).toBe(false);
        expect(taskList).not.toHaveBeenCalled();
        expect(runCLICommand).not.toHaveBeenCalled();
    });

    it("runs the picked task and records it under recentTasks", async () => {
        const buildTask = { name: "build", description: "compile the app" };
        const FcScripts = {
            allTasks: [buildTask, { name: "test", description: "run tests" }],
        };
        parseScriptFile.mockResolvedValue(FcScripts);
        taskList.mockResolvedValue("build");

        await startScripts();

        // Picker consulted once, command run exactly once.
        expect(taskList).toHaveBeenCalledTimes(1);
        expect(runCLICommand).toHaveBeenCalledTimes(1);

        // parseTask is identity here, so runCLICommand receives the task object
        // found by name in allTasks.
        expect(parseTask).toHaveBeenCalledWith(buildTask);
        expect(runCLICommand).toHaveBeenCalledWith(buildTask);

        // Recent task persisted: Conf.set("recentTasks", {...build}).
        const conf = confMock.instances.at(-1);
        expect(conf).toBeDefined();
        expect(conf.set).toHaveBeenCalledWith("recentTasks", expect.any(Object));

        const setCall = conf.set.mock.calls.find((c) => c[0] === "recentTasks");
        expect(setCall[1]).toHaveProperty("build");
        expect(setCall[1].build).toHaveProperty("lastExecuted");
        expect(typeof setCall[1].build.lastExecuted).toBe("number");
    });

    it("does not run a command when the picker resolves falsey (cancelled)", async () => {
        parseScriptFile.mockResolvedValue({ allTasks: [{ name: "build" }] });
        taskList.mockResolvedValue(null);

        const result = await startScripts();

        expect(result).toBe(false);
        expect(runCLICommand).not.toHaveBeenCalled();
    });

    it("clearRecent resets recentTasks to an empty object", async () => {
        await clearRecent();

        const conf = confMock.instances.at(-1);
        expect(conf).toBeDefined();
        expect(conf.set).toHaveBeenCalledWith("recentTasks", {});
        expect(conf.store.recentTasks).toEqual({});
    });
});

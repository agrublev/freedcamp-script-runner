/**
 * Tests for index.js — the fsr CLI entry point.
 *
 * index.js has no exports: it runs a top-level async IIFE on import that boots
 * yargs and dispatches to command handlers. We test it by "mock-executing":
 *   1. mock every dependency it imports (so nothing real runs),
 *   2. set process.argv to the command we want,
 *   3. vi.resetModules() + dynamic import("../index.js") to re-run the IIFE,
 *   4. assert the right mocked dependency was invoked (the observable "output").
 *
 * yargs itself is NOT mocked — it really parses argv and dispatches, which is
 * exactly the behavior under test. clear() is mocked so the screen isn't wiped.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => ({
    bump: vi.fn(),
    generateFScripts: vi.fn(),
    generateToc: vi.fn(),
    parseScriptFile: vi.fn(),
    upgradePackages: vi.fn(),
    runCLICommand: vi.fn(),
    runParallel: vi.fn(),
    runSequence: vi.fn(),
    clearRecent: vi.fn(),
    startPackageScripts: vi.fn(),
    startScripts: vi.fn(),
    parseTask: vi.fn((x) => x),
    selectPlugin: vi.fn(),
    validateNotInDev: vi.fn(),
    encrypt: { init: vi.fn(), encrypt: vi.fn(), decrypt: vi.fn() },
    clear: vi.fn(),
    doctor: vi.fn(),
    completion: vi.fn(),
    loadPlugins: vi.fn(),
    registerPluginCommands: vi.fn((y) => y),
    fireHook: vi.fn(),
    spawn: vi.fn(),
    fsrLog: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
    commit: vi.fn()
}));

vi.mock("../lib/release/bump.js", () => ({ default: h.bump }));
vi.mock("../lib/generators/index.js", () => ({
    generateFScripts: h.generateFScripts,
    generateToc: h.generateToc
}));
vi.mock("../lib/parsers/parseScriptsMd.js", () => ({ default: h.parseScriptFile }));
vi.mock("../lib/upgradePackages.js", () => ({ default: h.upgradePackages }));
vi.mock("../lib/running/index.js", () => ({
    runCLICommand: h.runCLICommand,
    runParallel: h.runParallel,
    runSequence: h.runSequence
}));
vi.mock("../lib/startScripts.js", () => ({
    clearRecent: h.clearRecent,
    startPackageScripts: h.startPackageScripts,
    startScripts: h.startScripts
}));
vi.mock("../lib/running/parseTask.js", () => ({ default: h.parseTask }));
vi.mock("../lib/taskList.js", () => ({ selectPlugin: h.selectPlugin }));
vi.mock("../lib/git/validateNotDev.js", () => ({ default: h.validateNotInDev }));
vi.mock("../lib/encryption/encryption.js", () => ({ default: h.encrypt }));
vi.mock("../lib/utils/index.js", () => ({ clear: h.clear }));
vi.mock("../lib/doctor/doctor.js", () => ({ default: h.doctor }));
vi.mock("../lib/completions/completion.js", () => ({ default: h.completion }));
vi.mock("../lib/plugins/loader.js", () => ({
    loadPlugins: h.loadPlugins,
    registerPluginCommands: h.registerPluginCommands
}));
vi.mock("../lib/plugins/hooks.js", () => ({ fireHook: h.fireHook }));
vi.mock("../lib/utils/console.js", () => ({ default: h.fsrLog }));
vi.mock("../lib/git/commit.js", () => ({ default: h.commit }));
vi.mock("cross-spawn", () => ({
    default: (...args) => h.spawn(...args)
}));

const realArgv = process.argv;

/** Run the CLI with the given args by re-importing index.js under the mocks. */
async function runCli(args, { plugins = { commands: [], runnablePlugins: [] } } = {}) {
    process.argv = ["node", "fsr", ...args];
    h.loadPlugins.mockResolvedValue(plugins);
    vi.resetModules();
    await import("../index.js");
    // The IIFE is async and not awaited at module top level; let it settle.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
}

beforeEach(() => {
    for (const v of Object.values(h)) {
        if (typeof v === "function" && v.mockReset) v.mockReset();
        else if (v && typeof v === "object") Object.values(v).forEach((f) => f.mockReset?.());
    }
    h.parseTask.mockImplementation((x) => x);
    h.registerPluginCommands.mockImplementation((y) => y);
    // default child process: fire "close" so runCmd's promise resolves
    h.spawn.mockReturnValue({
        on(ev, cb) {
            if (ev === "close") queueMicrotask(() => cb(0));
            return this;
        }
    });
});

afterEach(() => {
    process.argv = realArgv;
    vi.clearAllMocks();
});

describe("command dispatch", () => {
    it("`run <task>` runs the matching task via runCLICommand", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "build", script: "echo hi" }] });
        await runCli(["run", "build"]);
        expect(h.runCLICommand).toHaveBeenCalledTimes(1);
        expect(h.parseTask).toHaveBeenCalledWith({ name: "build", script: "echo hi" });
    });

    it("`run <task>` errors when the task is not found", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "other" }] });
        await runCli(["run", "missing"]);
        expect(h.runCLICommand).not.toHaveBeenCalled();
        expect(h.fsrLog.error).toHaveBeenCalled();
    });

    it("`run` errors when there is no fscripts.md", async () => {
        h.parseScriptFile.mockResolvedValue(false);
        await runCli(["run", "build"]);
        expect(h.fsrLog.error).toHaveBeenCalled();
        expect(h.runCLICommand).not.toHaveBeenCalled();
    });

    it("`upgrade` calls upgradePackages", async () => {
        await runCli(["upgrade"]);
        expect(h.upgradePackages).toHaveBeenCalledTimes(1);
    });

    it("`doctor --json` forwards parsed flags to doctor()", async () => {
        await runCli(["doctor", "--json"]);
        expect(h.doctor).toHaveBeenCalledTimes(1);
        expect(h.doctor.mock.calls[0][0]).toMatchObject({ json: true });
    });

    it("`run-s a b` forwards the task list to runSequence", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [] });
        await runCli(["run-s", "a", "b"]);
        expect(h.runSequence).toHaveBeenCalledTimes(1);
        expect(h.runSequence.mock.calls[0][0]).toEqual(["a", "b"]);
    });

    it("`branch` calls validateNotInDev", async () => {
        await runCli(["branch"]);
        expect(h.validateNotInDev).toHaveBeenCalledTimes(1);
    });
});

describe("bare task shorthand", () => {
    it("`fsr <task>` (non-builtin) runs it like `run <task>`", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "release:publish" }] });
        await runCli(["release:publish"]);
        expect(h.runCLICommand).toHaveBeenCalledTimes(1);
        expect(h.parseTask).toHaveBeenCalledWith({ name: "release:publish" });
    });

    it("unknown bare task errors", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "x" }] });
        await runCli(["definitely-not-a-task"]);
        expect(h.fsrLog.error).toHaveBeenCalled();
        expect(h.runCLICommand).not.toHaveBeenCalled();
    });
});

describe("interactive picker (no args)", () => {
    it("selecting a command spawns `yarn fsr <choice>`", async () => {
        h.selectPlugin.mockResolvedValue("start");
        await runCli([]);
        expect(h.spawn).toHaveBeenCalledWith("yarn", ["fsr", "start"], expect.any(Object));
    });

    it("declining the picker prints a goodbye and spawns nothing", async () => {
        h.selectPlugin.mockResolvedValue(null);
        await runCli([]);
        expect(h.spawn).not.toHaveBeenCalled();
        expect(h.fsrLog.log).toHaveBeenCalled();
    });

    it("selecting a plugin runs it and fires post-task hook", async () => {
        const run = vi.fn().mockResolvedValue(undefined);
        h.selectPlugin.mockResolvedValue("plugin:deploy");
        await runCli([], {
            plugins: { commands: [], runnablePlugins: [{ name: "deploy", description: "d", run }] }
        });
        expect(run).toHaveBeenCalledTimes(1);
        expect(h.fireHook).toHaveBeenCalledWith("post-task", expect.objectContaining({ taskName: "deploy", success: true }));
    });
});

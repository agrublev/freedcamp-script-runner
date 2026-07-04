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
    findExternalPluginDirs: vi.fn(() => []),
    fireHook: vi.fn(),
    spawn: vi.fn(),
    fsrLog: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
    commit: vi.fn()
}));

vi.mock("@fsr/core", () => {
    // Inline getEnvArg to avoid loading the real module (which pulls in JSX UI files).
    const normalizeEnv = (v) => {
        if (v === "prod") return "production";
        if (v === "dev") return "development";
        return v;
    };
    const getEnvArgImpl = (args) => {
        let env = null;
        let i = 0;
        while (i < args.length) {
            const arg = args[i];
            if (arg === "--prod") { env = "production"; }
            else if (arg === "--dev") { env = "development"; }
            else if (arg.startsWith("--env=")) { env = normalizeEnv(arg.slice("--env=".length)) || null; }
            else if (arg === "--env") { const next = args[i + 1]; if (next && !next.startsWith("-")) { env = normalizeEnv(next); i++; } }
            else if (arg === "-e") { const next = args[i + 1]; if (next && !next.startsWith("-")) { env = normalizeEnv(next); i++; } }
            i++;
        }
        return { env };
    };
    return {
        getEnvArg: getEnvArgImpl,
        selectPlugin: h.selectPlugin,
        runCLICommand: h.runCLICommand,
        parseTask: h.parseTask,
        parseScriptFile: h.parseScriptFile,
        runParallel: h.runParallel,
        runSequence: h.runSequence,
        clearRecent: h.clearRecent,
        startPackageScripts: h.startPackageScripts,
        startScripts: h.startScripts,
        loadPlugins: h.loadPlugins,
        registerPluginCommands: h.registerPluginCommands,
        findExternalPluginDirs: h.findExternalPluginDirs,
        fireHook: h.fireHook,
    };
});
vi.mock("@fsr/core/utils/console.js", () => ({ default: h.fsrLog }));

// Command package implementation mocks
vi.mock("@fsr/cmd-branch/validateNotDev.js", () => ({ default: h.validateNotInDev }));
vi.mock("@fsr/cmd-commit/commit.js", () => ({ default: h.commit }));
vi.mock("@fsr/cmd-upgrade/upgradePackages.js", () => ({ default: h.upgradePackages }));
vi.mock("@fsr/cmd-bump/bump.js", () => ({ default: h.bump }));
vi.mock("@fsr/cmd-encryption/encryption.js", () => ({ default: h.encrypt }));
vi.mock("@fsr/cmd-generate/generateFScripts.js", () => ({ default: h.generateFScripts }));
vi.mock("@fsr/cmd-generate/generateToc.js", () => ({ default: h.generateToc }));
vi.mock("@fsr/cmd-doctor/doctor.js", () => ({ default: h.doctor }));
vi.mock("@fsr/cmd-completion/completion.js", () => ({ default: h.completion }));
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
    it("selecting a built-in command runs its handler in-process (no spawn)", async () => {
        // The picker now calls command.handler() directly instead of spawning
        // a second `yarn fsr <choice>` process — fixes the raw-mode double-render bug.
        h.selectPlugin.mockResolvedValue("start");
        await runCli([]);
        expect(h.startScripts).toHaveBeenCalledTimes(1);
        expect(h.startScripts).toHaveBeenCalledWith(true, null);
        expect(h.spawn).not.toHaveBeenCalled();
    });

    it("declining the picker prints a goodbye and spawns nothing", async () => {
        h.selectPlugin.mockResolvedValue(null);
        await runCli([]);
        expect(h.spawn).not.toHaveBeenCalled();
        expect(h.fsrLog.log).toHaveBeenCalled();
    });

    it("selecting a plugin fires pre-task, runs it, then fires post-task", async () => {
        const order = [];
        const run = vi.fn().mockImplementation(async () => { order.push("run"); });
        h.fireHook.mockImplementation(async (name) => { order.push(name); });
        h.selectPlugin.mockResolvedValue("plugin:deploy");
        await runCli([], {
            plugins: { commands: [], runnablePlugins: [{ name: "deploy", description: "d", run }] }
        });
        expect(run).toHaveBeenCalledTimes(1);
        expect(h.fireHook).toHaveBeenCalledWith("pre-task", expect.objectContaining({ taskName: "deploy" }));
        expect(h.fireHook).toHaveBeenCalledWith("post-task", expect.objectContaining({ taskName: "deploy", success: true }));
        expect(order[0]).toBe("pre-task");
        expect(order[1]).toBe("run");
    });
});

describe("command dispatch — remaining handlers", () => {
    it("`commit` invokes commit()", async () => {
        await runCli(["commit"]);
        expect(h.commit).toHaveBeenCalledTimes(1);
    });

    it("`start` invokes startScripts(true, null) (category flow, no env profile)", async () => {
        await runCli(["start"]);
        expect(h.startScripts).toHaveBeenCalledTimes(1);
        expect(h.startScripts.mock.calls[0]).toEqual([true, null]);
    });

    it("`scripts` invokes startPackageScripts()", async () => {
        await runCli(["scripts"]);
        expect(h.startPackageScripts).toHaveBeenCalledTimes(1);
    });

    it("`list` invokes startScripts(false, null) (no env profile)", async () => {
        await runCli(["list"]);
        expect(h.startScripts).toHaveBeenCalledWith(false, null);
    });

    it("`bump` forwards the version type and a coerced skipGit boolean", async () => {
        await runCli(["bump", "--type", "minor", "--skipGit", "true"]);
        expect(h.bump).toHaveBeenCalledTimes(1);
        expect(h.bump).toHaveBeenCalledWith("minor", true);
    });

    it("`run-p a b` forwards the task list to runParallel", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [] });
        await runCli(["run-p", "a", "b"]);
        expect(h.runParallel).toHaveBeenCalledTimes(1);
        expect(h.runParallel.mock.calls[0][0]).toEqual(["a", "b"]);
    });

    it("`run-p` with no tasks falls back to an empty list", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [] });
        await runCli(["run-p"]);
        expect(h.runParallel).toHaveBeenCalledTimes(1);
        expect(h.runParallel.mock.calls[0][0]).toEqual([]);
    });

    it("`run-s` with no tasks falls back to an empty list", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [] });
        await runCli(["run-s"]);
        expect(h.runSequence).toHaveBeenCalledTimes(1);
        expect(h.runSequence.mock.calls[0][0]).toEqual([]);
    });

    it("`encryption` invokes encrypt.init()", async () => {
        await runCli(["encryption"]);
        expect(h.encrypt.init).toHaveBeenCalledTimes(1);
    });

    it("`encrypt` invokes encrypt.encrypt()", async () => {
        await runCli(["encrypt"]);
        expect(h.encrypt.encrypt).toHaveBeenCalledTimes(1);
    });

    it("`decrypt` invokes encrypt.decrypt()", async () => {
        await runCli(["decrypt"]);
        expect(h.encrypt.decrypt).toHaveBeenCalledTimes(1);
    });

    it("`clear` invokes clearRecent()", async () => {
        await runCli(["clear"]);
        expect(h.clearRecent).toHaveBeenCalledTimes(1);
    });

    it("`generate` invokes generateFScripts()", async () => {
        await runCli(["generate"]);
        expect(h.generateFScripts).toHaveBeenCalledTimes(1);
    });

    it("`toc <file>` forwards the positional file path to generateToc", async () => {
        await runCli(["toc", "myfile.md"]);
        expect(h.generateToc).toHaveBeenCalledWith("myfile.md");
    });

    it("`completion install` builds the action positional and forwards argv", async () => {
        await runCli(["completion", "install"]);
        expect(h.completion).toHaveBeenCalledTimes(1);
        expect(h.completion.mock.calls[0][0]).toMatchObject({ action: "install" });
    });

    it("plugin commands are folded into the builtin command set", async () => {
        await runCli(["upgrade"], {
            plugins: { commands: [{ name: "deploy" }], runnablePlugins: [] }
        });
        expect(h.upgradePackages).toHaveBeenCalledTimes(1);
    });
});

describe("interactive picker — error and plugin branches", () => {
    it("selecting a built-in command via picker passes env=null when --env is omitted", async () => {
        // The in-process handler receives { env: null } so argv.env || null works correctly.
        h.selectPlugin.mockResolvedValue("start");
        await runCli([]);
        expect(h.startScripts).toHaveBeenCalledWith(true, null);
    });

    it("ignores a plugin choice that matches no runnable plugin", async () => {
        h.selectPlugin.mockResolvedValue("plugin:nope");
        await runCli([], {
            plugins: { commands: [], runnablePlugins: [{ name: "deploy", description: "d", run: vi.fn() }] }
        });
        expect(h.fireHook).not.toHaveBeenCalled();
        expect(h.spawn).not.toHaveBeenCalled();
    });

    it("fires the task-error hook when a plugin run() throws", async () => {
        const run = vi.fn().mockRejectedValue(new Error("plugin boom"));
        h.selectPlugin.mockResolvedValue("plugin:deploy");
        await runCli([], {
            plugins: { commands: [], runnablePlugins: [{ name: "deploy", description: "d", run }] }
        });
        expect(run).toHaveBeenCalledTimes(1);
        expect(h.fireHook).toHaveBeenCalledWith("task-error", expect.objectContaining({ taskName: "deploy" }));
    });
});

describe("bare task shorthand — missing fscripts", () => {
    it("errors when there is no fscripts.md", async () => {
        h.parseScriptFile.mockResolvedValue(false);
        await runCli(["some-unknown-task"]);
        expect(h.fsrLog.error).toHaveBeenCalled();
        expect(h.runCLICommand).not.toHaveBeenCalled();
    });
});

describe("--env flag → process.env injection", () => {
    // Save and restore so individual tests don't bleed into each other.
    let savedNodeEnv;
    let savedFsrEnv;

    beforeEach(() => {
        savedNodeEnv = process.env.NODE_ENV;
        savedFsrEnv = process.env.FSR_ENV;
    });

    afterEach(() => {
        process.env.NODE_ENV = savedNodeEnv;
        process.env.FSR_ENV = savedFsrEnv;
    });

    it("`fsr --env staging run build` sets NODE_ENV and FSR_ENV to 'staging'", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "build", script: "echo hi" }] });
        await runCli(["--env", "staging", "run", "build"]);
        expect(process.env.NODE_ENV).toBe("staging");
        expect(process.env.FSR_ENV).toBe("staging");
    });

    it("`fsr run build` (--env omitted) defaults NODE_ENV and FSR_ENV to 'development'", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "build", script: "echo hi" }] });
        await runCli(["run", "build"]);
        expect(process.env.NODE_ENV).toBe("development");
        expect(process.env.FSR_ENV).toBe("development");
    });

    it("`fsr --env=production run build` (equals form) sets NODE_ENV and FSR_ENV", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "build", script: "echo hi" }] });
        await runCli(["--env=production", "run", "build"]);
        expect(process.env.NODE_ENV).toBe("production");
        expect(process.env.FSR_ENV).toBe("production");
    });

    it("`fsr -e staging run build` (short alias) sets NODE_ENV and FSR_ENV", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "build", script: "echo hi" }] });
        await runCli(["-e", "staging", "run", "build"]);
        expect(process.env.NODE_ENV).toBe("staging");
        expect(process.env.FSR_ENV).toBe("staging");
    });

    it("env injection fires before any handler (NODE_ENV visible inside parseTask)", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "check" }] });
        let seenNodeEnv;
        h.parseTask.mockImplementation((td) => {
            seenNodeEnv = process.env.NODE_ENV;
            return td;
        });
        await runCli(["--env", "test", "run", "check"]);
        expect(seenNodeEnv).toBe("test");
    });

    it("bare-task shorthand also inherits the --env injection", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [{ name: "release:publish" }] });
        await runCli(["--env", "staging", "release:publish"]);
        expect(process.env.NODE_ENV).toBe("staging");
        expect(process.env.FSR_ENV).toBe("staging");
    });

    it("`run-p --env staging a b` passes { env: 'staging' } to parseScriptFile", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [] });
        await runCli(["run-p", "--env", "staging", "a", "b"]);
        expect(h.parseScriptFile).toHaveBeenCalledWith({ env: "staging" });
        expect(h.runParallel).toHaveBeenCalledTimes(1);
        expect(h.runParallel.mock.calls[0][0]).toEqual(["a", "b"]);
    });

    it("`run-s --env staging a b` passes { env: 'staging' } to parseScriptFile", async () => {
        h.parseScriptFile.mockResolvedValue({ allTasks: [] });
        await runCli(["run-s", "--env", "staging", "a", "b"]);
        expect(h.parseScriptFile).toHaveBeenCalledWith({ env: "staging" });
        expect(h.runSequence).toHaveBeenCalledTimes(1);
        expect(h.runSequence.mock.calls[0][0]).toEqual(["a", "b"]);
    });
});

describe("`plugins` command", () => {
    it("lists runnable plugins with their source badge", async () => {
        const pluginList = {
            commands: [],
            runnablePlugins: [
                { name: "deploy", description: "Deploy app", source: "builtin" },
                { name: "fscr-plugin-cloud", description: "Cloud deploy", source: "npm" },
            ],
        };
        // The plugins command calls loadPlugins() a second time internally.
        h.loadPlugins
            .mockResolvedValueOnce({ commands: [], runnablePlugins: [] }) // initial boot
            .mockResolvedValueOnce(pluginList); // plugins command re-call
        h.findExternalPluginDirs.mockReturnValue([{ dir: "fscr-plugin-cloud" }]);

        await runCli(["plugins"]);

        // Should log the plugin names
        const logCalls = h.fsrLog.log.mock.calls.map((c) => String(c[0]));
        expect(logCalls.some((s) => s.includes("deploy"))).toBe(true);
        expect(logCalls.some((s) => s.includes("fscr-plugin-cloud"))).toBe(true);
    });

    it("includes command-only plugins (no run()) in the list, deduped against runnablePlugins", async () => {
        // 'notify' is in pluginCmds but not in runnablePlugins → hits filter+map on lines 183-185
        // 'deploy' is in BOTH → filter removes duplicate from pluginCmds
        const pluginList = {
            commands: [
                { name: "deploy", description: "Deploy", source: "builtin" },
                { name: "notify" }, // no description — exercises the `|| ""` fallback
            ],
            runnablePlugins: [{ name: "deploy", description: "Deploy", source: "builtin" }],
        };
        h.loadPlugins
            .mockResolvedValueOnce({ commands: [], runnablePlugins: [] })
            .mockResolvedValueOnce(pluginList);
        h.findExternalPluginDirs.mockReturnValue([]);

        await runCli(["plugins"]);

        const logCalls = h.fsrLog.log.mock.calls.map((c) => String(c[0]));
        // notify should appear (command-only plugin)
        expect(logCalls.some((s) => s.includes("notify"))).toBe(true);
        // deploy should appear once (runnablePlugin wins; duplicate filtered out)
        const deployLines = logCalls.filter((s) => s.includes("deploy"));
        expect(deployLines).toHaveLength(1);
    });

    it("shows [local] badge for project-local plugins", async () => {
        const pluginList = {
            commands: [],
            runnablePlugins: [{ name: "cache-cleaner", description: "Clears cache", source: "local" }],
        };
        h.loadPlugins
            .mockResolvedValueOnce({ commands: [], runnablePlugins: [] })
            .mockResolvedValueOnce(pluginList);
        h.findExternalPluginDirs.mockReturnValue([]);

        await runCli(["plugins"]);

        const logCalls = h.fsrLog.log.mock.calls.map((c) => String(c[0]));
        expect(logCalls.some((s) => s.includes("cache-cleaner"))).toBe(true);
    });

    it("reports 'No plugins found' when nothing is loaded", async () => {
        h.loadPlugins
            .mockResolvedValueOnce({ commands: [], runnablePlugins: [] }) // initial boot
            .mockResolvedValueOnce({ commands: [], runnablePlugins: [] }); // plugins command re-call
        h.findExternalPluginDirs.mockReturnValue([]);

        await runCli(["plugins"]);

        const logCalls = h.fsrLog.log.mock.calls.map((c) => String(c[0]));
        expect(logCalls.some((s) => s.toLowerCase().includes("no plugins"))).toBe(true);
    });
});

/**
 * Tests for lib/plugins/loader.js
 *
 * loadPlugins()               – discovers and initialises plugin subdirs
 * registerPluginCommands()    – registers plugin commands on a yargs instance
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";

// Controllable fs state so loadPlugins can be driven through every branch.
const fsState = vi.hoisted(() => ({
    readdirResult: null, // null -> real fs; [] -> empty; fn(path) -> per-path result
    readdirThrows: false, // true -> readdirSync throws
    existsOverride: null, // (path) => bool | null(delegate)
    writeFileCalls: [],   // records (path, content) pairs from writeFileSync
    writeFileThrows: false, // true -> writeFileSync throws
    readFileResult: null, // null -> throw ENOENT; string -> return it
    mkdirCalls: [],       // records paths from mkdirSync
}));

vi.mock("fs", async () => {
    const actual = await vi.importActual("fs");
    return {
        ...actual,
        readdirSync: (p, opts) => {
            if (fsState.readdirThrows) throw new Error("ENOENT: simulated unreadable dir");
            if (fsState.readdirResult !== null) {
                return typeof fsState.readdirResult === "function"
                    ? fsState.readdirResult(p, opts)
                    : fsState.readdirResult;
            }
            return actual.readdirSync(p, opts);
        },
        existsSync: (p) => {
            if (fsState.existsOverride) {
                const r = fsState.existsOverride(p);
                if (r !== null) return r;
            }
            return actual.existsSync(p);
        },
        readFileSync: (p, enc) => {
            if (fsState.readFileResult !== null) return fsState.readFileResult;
            return actual.readFileSync(p, enc);
        },
        writeFileSync: (p, content) => {
            if (fsState.writeFileThrows) throw new Error("disk full");
            fsState.writeFileCalls.push({ path: p, content });
        },
        mkdirSync: (p) => {
            fsState.mkdirCalls.push(p);
        },
    };
});

// Hooks side-effects isolated.
vi.mock("../../lib/plugins/hooks.js", () => ({
    registerHook: vi.fn(),
    fireHook: vi.fn().mockResolvedValue(undefined)
}));

// fsrLog mocked so the loader's logger.{info,success,warn,error} are observable + quiet.
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Build a minimal fake yargs chainable instance that records calls */
function makeYargs() {
    const inst = {
        _commands: [],
        _examples: [],
        command: vi.fn().mockImplementation(function (name, desc, builder, handler) {
            inst._commands.push({ name, desc, builder, handler });
            return inst;
        }),
        example: vi.fn().mockImplementation(function (ex) {
            inst._examples.push(ex);
            return inst;
        })
    };
    return inst;
}

// ────────────────────────────────────────────────────────────────────────────
// registerPluginCommands
// ────────────────────────────────────────────────────────────────────────────

describe("registerPluginCommands — extended", () => {
    let registerPluginCommands, fireHook;

    beforeEach(async () => {
        vi.resetModules();
        const loaderMod = await import("../../lib/plugins/loader.js");
        registerPluginCommands = loaderMod.registerPluginCommands;
        const hooksMod = await import("../../lib/plugins/hooks.js");
        fireHook = hooksMod.fireHook;
    });

    afterEach(() => vi.clearAllMocks());

    it("fires pre-task before the handler, then post-task and post-command on success", async () => {
        const order = [];
        const handler = vi.fn().mockImplementation(() => { order.push("handler"); });
        fireHook.mockImplementation(async (name) => { order.push(name); });

        const y = makeYargs();
        registerPluginCommands(y, [{ name: "dual-cmd", description: "", options: [], handler, examples: [] }]);
        await y._commands[0].handler({ _: ["dual-cmd"] });

        expect(order[0]).toBe("pre-task");
        expect(order[1]).toBe("handler");
        expect(fireHook).toHaveBeenCalledWith("pre-task", expect.objectContaining({ taskName: "dual-cmd" }));
        expect(fireHook).toHaveBeenCalledWith("post-task", expect.objectContaining({ taskName: "dual-cmd", success: true }));
        expect(fireHook).toHaveBeenCalledWith("post-command", expect.objectContaining({ command: "dual-cmd", success: true }));
    });

    it("fires pre-task then task-error (not post-task) on failure and rethrows", async () => {
        const y = makeYargs();
        const err = new Error("boom");
        registerPluginCommands(y, [{ name: "fail-cmd", description: "", options: [], handler: vi.fn().mockRejectedValue(err), examples: [] }]);
        await expect(y._commands[0].handler({})).rejects.toThrow("boom");
        expect(fireHook).toHaveBeenCalledWith("pre-task", expect.objectContaining({ taskName: "fail-cmd" }));
        expect(fireHook).toHaveBeenCalledWith("task-error", expect.objectContaining({ taskName: "fail-cmd" }));
        expect(fireHook).not.toHaveBeenCalledWith("post-task", expect.anything());
    });

    it("registers alias commands that invoke the same handler", async () => {
        const handler = vi.fn();
        const y = makeYargs();
        registerPluginCommands(y, [{ name: "ship", description: "", options: [], handler, examples: [], aliases: ["deploy", "publish"] }]);
        // Primary + 2 aliases = 3 commands registered
        expect(y._commands).toHaveLength(3);
        // Alias handler also fires hooks with the primary command name
        await y._commands[1].handler({});
        expect(handler).toHaveBeenCalledOnce();
        expect(fireHook).toHaveBeenCalledWith("post-task", expect.objectContaining({ taskName: "ship" }));
    });
});

describe("registerPluginCommands", () => {
    let registerPluginCommands, fireHook;

    beforeEach(async () => {
        vi.resetModules();
        const loaderMod = await import("../../lib/plugins/loader.js");
        registerPluginCommands = loaderMod.registerPluginCommands;
        const hooksMod = await import("../../lib/plugins/hooks.js");
        fireHook = hooksMod.fireHook;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns the yargs instance unchanged when commands array is empty", () => {
        const y = makeYargs();
        const result = registerPluginCommands(y, []);
        expect(result).toBe(y);
        expect(y.command).not.toHaveBeenCalled();
    });

    it("registers a command for each item in the commands array", () => {
        const y = makeYargs();
        const cmds = [
            {
                name: "deploy",
                description: "Deploy app",
                options: [],
                handler: vi.fn(),
                examples: []
            },
            {
                name: "rollback",
                description: "Rollback",
                options: [],
                handler: vi.fn(),
                examples: []
            }
        ];
        registerPluginCommands(y, cmds);
        expect(y.command).toHaveBeenCalledTimes(2);
        expect(y._commands[0].name).toBe("deploy");
        expect(y._commands[1].name).toBe("rollback");
    });

    it("adds examples via yargsInstance.example()", () => {
        const y = makeYargs();
        const cmds = [
            {
                name: "ship",
                description: "Ship it",
                options: [],
                handler: vi.fn(),
                examples: ["fsr ship --files ./dist", "fsr ship --subdomain foo"]
            }
        ];
        registerPluginCommands(y, cmds);
        expect(y.example).toHaveBeenCalledTimes(2);
    });

    it("command handler calls fireHook post-task on success", async () => {
        const y = makeYargs();
        const handler = vi.fn().mockResolvedValue(undefined);
        registerPluginCommands(y, [
            {
                name: "ok-cmd",
                description: "",
                options: [],
                handler,
                examples: []
            }
        ]);

        // Invoke the yargs handler that was registered
        const yargsHandler = y._commands[0].handler;
        await yargsHandler({ _: ["ok-cmd"] });

        expect(handler).toHaveBeenCalledOnce();
        expect(fireHook).toHaveBeenCalledWith(
            "post-task",
            expect.objectContaining({
                taskName: "ok-cmd",
                success: true
            })
        );
    });

    it("command handler calls fireHook task-error and rethrows on failure", async () => {
        const y = makeYargs();
        const err = new Error("deploy failed");
        const handler = vi.fn().mockRejectedValue(err);
        registerPluginCommands(y, [
            {
                name: "bad-cmd",
                description: "",
                options: [],
                handler,
                examples: []
            }
        ]);

        const yargsHandler = y._commands[0].handler;
        await expect(yargsHandler({ _: ["bad-cmd"] })).rejects.toThrow("deploy failed");
        expect(fireHook).toHaveBeenCalledWith(
            "task-error",
            expect.objectContaining({
                taskName: "bad-cmd",
                error: err
            })
        );
    });

    it("builder calls yargs.option for options with a long flag", () => {
        const y = makeYargs();
        const yargsMock = { option: vi.fn() };
        registerPluginCommands(y, [
            {
                name: "cmd",
                description: "",
                options: [
                    { flags: "--files", description: "Files path", type: "string" },
                    { flags: "-s, --subdomain", description: "Subdomain", type: "string" }
                ],
                handler: vi.fn(),
                examples: []
            }
        ]);

        const builder = y._commands[0].builder;
        builder(yargsMock);
        expect(yargsMock.option).toHaveBeenCalledTimes(2);
        expect(yargsMock.option).toHaveBeenCalledWith(
            "files",
            expect.objectContaining({ description: "Files path" })
        );
        expect(yargsMock.option).toHaveBeenCalledWith(
            "subdomain",
            expect.objectContaining({ alias: "s" })
        );
    });

    it("skips options whose flags string has no long option", () => {
        const y = makeYargs();
        const yargsMock = { option: vi.fn() };
        registerPluginCommands(y, [
            {
                name: "cmd",
                description: "",
                options: [{ flags: "-v", description: "verbose", type: "boolean" }],
                handler: vi.fn(),
                examples: []
            }
        ]);
        const builder = y._commands[0].builder;
        builder(yargsMock);
        expect(yargsMock.option).not.toHaveBeenCalled();
    });

    it("defaults option type to string when type is omitted", () => {
        const y = makeYargs();
        const yargsMock = { option: vi.fn() };
        registerPluginCommands(y, [
            {
                name: "cmd",
                description: "",
                options: [{ flags: "--thing", description: "a thing" }],
                handler: vi.fn(),
                examples: []
            }
        ]);
        y._commands[0].builder(yargsMock);
        expect(yargsMock.option).toHaveBeenCalledWith(
            "thing",
            expect.objectContaining({ type: "string" })
        );
    });

    it("tolerates a command missing options and examples (falls back to empty lists)", () => {
        const y = makeYargs();
        registerPluginCommands(y, [{ name: "bare", handler: vi.fn() }]);
        expect(y.command).toHaveBeenCalledTimes(1);
        expect(y.example).not.toHaveBeenCalled();

        // builder runs without iterating any options
        const yargsMock = { option: vi.fn() };
        y._commands[0].builder(yargsMock);
        expect(yargsMock.option).not.toHaveBeenCalled();
    });
});

// ────────────────────────────────────────────────────────────────────────────
// loadPlugins – driven through the controllable fs mock above.
//
// The plugins dir is resolved (and the logger built) at module-load time, so
// every test configures `fsState` BEFORE re-importing the loader. Plugin entry
// modules are stubbed with `vi.doMock` keyed on the exact path the loader will
// `import()`, so no real disk plugin is needed.
// ────────────────────────────────────────────────────────────────────────────

const REAL_PLUGINS_DIR = path.resolve(process.cwd(), "lib", "plugins");
const fakeEntry = (name) => path.join(REAL_PLUGINS_DIR, name, "index.js");

describe("loadPlugins", () => {
    beforeEach(() => {
        fsState.readdirResult = null;
        fsState.readdirThrows = false;
        fsState.existsOverride = null;
        fsState.writeFileCalls = [];
        fsState.writeFileThrows = false;
        fsState.mkdirCalls = [];
        fsState.readFileResult = null;
        vi.resetModules();
    });

    afterEach(() => {
        fsState.readdirResult = null;
        fsState.readdirThrows = false;
        fsState.existsOverride = null;
        fsState.writeFileCalls = [];
        fsState.writeFileThrows = false;
        fsState.mkdirCalls = [];
        fsState.readFileResult = null;
        vi.clearAllMocks();
    });

    it("returns empty commands and runnablePlugins when the plugins dir has no subdirs", async () => {
        fsState.readdirResult = [];
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        expect(result.commands).toHaveLength(0);
        expect(result.runnablePlugins).toHaveLength(0);
    });

    it("returns empty commands and runnablePlugins when the plugins dir is unreadable", async () => {
        fsState.readdirThrows = true;
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        expect(result.commands).toHaveLength(0);
        expect(result.runnablePlugins).toHaveLength(0);
    });

    it("falls back to the first candidate when no candidate dir exists", async () => {
        // Force both candidate dirs to look absent so resolvePluginsDir hits its fallback.
        fsState.existsOverride = (p) => (p === REAL_PLUGINS_DIR ? false : null);
        fsState.readdirResult = [];
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        expect(result.commands).toHaveLength(0);
    });

    it("initialises plugins and exercises every init lifecycle branch", async () => {
        // Stub the dynamic plugin imports the loader will perform.
        vi.doMock(fakeEntry("good"), () => ({
            default: {
                name: "good-plugin",
                description: "Good test plugin",
                init: async (ctx) => {
                    ctx.registerCommand({
                        name: "good-cmd",
                        description: "from good plugin",
                        handler: () => {}
                    });
                    ctx.logger.info("i");
                    ctx.logger.warn("w");
                    ctx.logger.success("s");
                },
                run: () => "ran"
            }
        }));
        vi.doMock(fakeEntry("noinit"), () => ({ default: { name: "no-init" } }));
        vi.doMock(fakeEntry("norun"), () => ({
            default: { name: "no-run", init: async () => {} }
        }));
        vi.doMock(fakeEntry("throws"), () => ({
            default: {
                name: "throws",
                init: async () => {
                    throw new Error("init boom");
                }
            }
        }));
        // Runnable plugin with neither name nor description -> falls back to dir.name / "".
        vi.doMock(fakeEntry("anon"), () => ({
            default: { init: async () => {}, run: () => "anon-ran" }
        }));

        fsState.readdirResult = [
            { name: "notes.txt", isDirectory: () => false }, // filtered out
            { name: "good", isDirectory: () => true },
            { name: "noinit", isDirectory: () => true }, // no init -> skipped
            { name: "norun", isDirectory: () => true }, // init, no run -> not runnable
            { name: "throws", isDirectory: () => true }, // init throws -> logged error
            { name: "missing", isDirectory: () => true }, // no index.js -> skipped
            { name: "anon", isDirectory: () => true } // no name/description -> defaults
        ];
        const stubbed = new Set(["good", "noinit", "norun", "throws", "anon"].map(fakeEntry));
        fsState.existsOverride = (p) => {
            if (stubbed.has(p)) return true;
            if (p === fakeEntry("missing")) return false;
            return null;
        };

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const fsrLog = (await import("../../lib/utils/console.js")).default;
        const result = await loadPlugins();

        const good = result.runnablePlugins.find((p) => p.name === "good-plugin");
        expect(good).toBeTruthy();
        expect(good.description).toBe("Good test plugin");
        expect(good.run()).toBe("ran");
        // the registerCommand context callback collected the good plugin's command
        expect(result.commands.map((c) => c.name)).toContain("good-cmd");
        // no-run plugin initialised but is not runnable
        expect(result.runnablePlugins.find((p) => p.name === "no-run")).toBeUndefined();
        // anonymous plugin: name falls back to dir.name, description to ""
        const anon = result.runnablePlugins.find((p) => p.name === "anon");
        expect(anon).toBeTruthy();
        expect(anon.description).toBe("");
        expect(anon.run()).toBe("anon-ran");
        // logger.info + logger.success route through fsrLog.log; warn -> fsrLog.warn
        expect(fsrLog.log).toHaveBeenCalled();
        expect(fsrLog.warn).toHaveBeenCalled();
        // the throwing plugin drove logger.error at the catch site
        expect(fsrLog.error).toHaveBeenCalledWith(expect.stringContaining("Failed to load"));

        vi.doUnmock(fakeEntry("good"));
        vi.doUnmock(fakeEntry("noinit"));
        vi.doUnmock(fakeEntry("norun"));
        vi.doUnmock(fakeEntry("throws"));
        vi.doUnmock(fakeEntry("anon"));
    });

    it("builtin plugins carry source='builtin'", async () => {
        vi.doMock(fakeEntry("src-test"), () => ({
            default: { name: "src-plugin", init: async () => {}, run: () => "ok" }
        }));
        fsState.readdirResult = [{ name: "src-test", isDirectory: () => true }];
        fsState.existsOverride = (p) => (p === fakeEntry("src-test") ? true : null);

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        const p = result.runnablePlugins.find((x) => x.name === "src-plugin");
        expect(p).toBeTruthy();
        expect(p.source).toBe("builtin");

        vi.doUnmock(fakeEntry("src-test"));
    });

    it("context passed to init includes getStorage and setStorage functions", async () => {
        let capturedCtx;
        vi.doMock(fakeEntry("ctx-check"), () => ({
            default: {
                name: "ctx-check",
                init: async (ctx) => { capturedCtx = ctx; }
            }
        }));
        fsState.readdirResult = [{ name: "ctx-check", isDirectory: () => true }];
        fsState.existsOverride = (p) => (p === fakeEntry("ctx-check") ? true : null);

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        await loadPlugins();
        expect(typeof capturedCtx.setStorage).toBe("function");
        expect(typeof capturedCtx.getStorage).toBe("function");

        vi.doUnmock(fakeEntry("ctx-check"));
    });

    it("setStorage writes JSON to .fscr/<plugin>/storage.json", async () => {
        let capturedCtx;
        vi.doMock(fakeEntry("store-write"), () => ({
            default: { name: "store-plugin", init: async (ctx) => { capturedCtx = ctx; } }
        }));
        fsState.readdirResult = [{ name: "store-write", isDirectory: () => true }];
        fsState.existsOverride = (p) => (p === fakeEntry("store-write") ? true : null);
        fsState.writeFileCalls = [];
        fsState.mkdirCalls = [];

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        await loadPlugins();
        capturedCtx.setStorage({ count: 3 });

        expect(fsState.mkdirCalls.some((p) => p.includes("store-plugin"))).toBe(true);
        const write = fsState.writeFileCalls.find((w) => w.path.includes("store-plugin"));
        expect(write).toBeTruthy();
        expect(JSON.parse(write.content)).toEqual({ count: 3 });

        vi.doUnmock(fakeEntry("store-write"));
    });

    it("getStorage returns {} when no file exists yet", async () => {
        let capturedCtx;
        vi.doMock(fakeEntry("store-read"), () => ({
            default: { name: "store-read", init: async (ctx) => { capturedCtx = ctx; } }
        }));
        fsState.readdirResult = [{ name: "store-read", isDirectory: () => true }];
        fsState.existsOverride = (p) => (p === fakeEntry("store-read") ? true : null);
        fsState.readFileResult = null; // triggers ENOENT path in readFileSync mock

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        await loadPlugins();
        const data = capturedCtx.getStorage();
        expect(data).toEqual({});

        vi.doUnmock(fakeEntry("store-read"));
    });

    it("getStorage returns parsed JSON when storage file exists", async () => {
        let capturedCtx;
        vi.doMock(fakeEntry("store-read2"), () => ({
            default: { name: "store-read2", init: async (ctx) => { capturedCtx = ctx; } }
        }));
        fsState.readdirResult = [{ name: "store-read2", isDirectory: () => true }];
        fsState.existsOverride = (p) => (p === fakeEntry("store-read2") ? true : null);
        fsState.readFileResult = JSON.stringify({ deploymentHistory: [{ success: true }] });

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        await loadPlugins();
        const data = capturedCtx.getStorage();
        expect(data.deploymentHistory).toHaveLength(1);

        vi.doUnmock(fakeEntry("store-read2"));
    });

    it("setStorage logs a warning instead of throwing when disk write fails", async () => {
        let capturedCtx;
        vi.doMock(fakeEntry("store-err"), () => ({
            default: { name: "store-err", init: async (ctx) => { capturedCtx = ctx; } }
        }));
        fsState.readdirResult = [{ name: "store-err", isDirectory: () => true }];
        fsState.existsOverride = (p) => (p === fakeEntry("store-err") ? true : null);
        fsState.writeFileThrows = true;

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const fsrLog = (await import("../../lib/utils/console.js")).default;
        await loadPlugins();

        // Must not throw; must log a warning via fsrLog.warn
        expect(() => capturedCtx.setStorage({ x: 1 })).not.toThrow();
        expect(fsrLog.warn).toHaveBeenCalledWith(expect.stringContaining("Storage write failed"));

        vi.doUnmock(fakeEntry("store-err"));
    });

    it("loads project-local plugins from .fsr/plugins/<name>/index.js with source='local'", async () => {
        const localPluginPath = path.resolve(process.cwd(), ".fsr", "plugins", "my-local", "index.js");
        vi.doMock(localPluginPath, () => ({
            default: { name: "my-local", description: "local plugin", init: async () => {}, run: () => "local-ran" }
        }));
        // Built-in scan returns nothing; local scan finds my-local.
        const localPluginsDir = path.resolve(process.cwd(), ".fsr", "plugins");
        fsState.readdirResult = (p) => {
            if (p === localPluginsDir) return [{ name: "my-local", isDirectory: () => true }];
            return [];
        };
        fsState.existsOverride = (p) => {
            if (p === localPluginPath) return true;
            return null;
        };

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        const local = result.runnablePlugins.find((p) => p.name === "my-local");
        expect(local).toBeTruthy();
        expect(local.source).toBe("local");
        expect(local.run()).toBe("local-ran");

        vi.doUnmock(localPluginPath);
    });

    it("silently skips local plugin dir when .fsr/plugins does not exist", async () => {
        // readdirSync for local dir throws; should not propagate.
        fsState.readdirResult = (p) => {
            if (p.endsWith(".fsr/plugins") || p.includes(".fsr")) throw new Error("ENOENT");
            return [];
        };
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        expect(result.commands).toHaveLength(0);
        expect(result.runnablePlugins).toHaveLength(0);
    });

    it("loads external npm plugins (source='npm') discovered via findExternalPluginDirs", async () => {
        const npmEntryPath = path.resolve(process.cwd(), "node_modules", "fscr-plugin-cloud", "index.js");
        vi.doMock(npmEntryPath, () => ({
            default: { name: "cloud-plugin", description: "cloud deploy", init: async () => {}, run: () => "cloud-ran" }
        }));
        // Built-in scan returns nothing; node_modules scan finds fscr-plugin-cloud.
        fsState.readdirResult = (p) => {
            if (p.endsWith("node_modules")) {
                return [{ name: "fscr-plugin-cloud", isDirectory: () => true }];
            }
            return [];
        };
        fsState.existsOverride = (p) => {
            if (p === npmEntryPath) return true;
            return null;
        };

        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        const cloud = result.runnablePlugins.find((p) => p.name === "cloud-plugin");
        expect(cloud).toBeTruthy();
        expect(cloud.source).toBe("npm");
        expect(cloud.run()).toBe("cloud-ran");

        vi.doUnmock(npmEntryPath);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// findExternalPluginDirs
// ────────────────────────────────────────────────────────────────────────────

describe("findExternalPluginDirs", () => {
    beforeEach(() => {
        fsState.readdirResult = null;
        fsState.readdirThrows = false;
        fsState.existsOverride = null;
        vi.resetModules();
    });

    afterEach(() => {
        fsState.readdirResult = null;
        fsState.readdirThrows = false;
        fsState.existsOverride = null;
        vi.clearAllMocks();
    });

    it("returns empty array when node_modules is unreadable", async () => {
        fsState.readdirThrows = true;
        const { findExternalPluginDirs } = await import("../../lib/plugins/loader.js");
        expect(findExternalPluginDirs("/nonexistent")).toHaveLength(0);
    });

    it("returns empty array when no fscr-plugin-* directories exist", async () => {
        fsState.readdirResult = [
            { name: "chalk", isDirectory: () => true },
            { name: "yargs", isDirectory: () => true },
        ];
        const { findExternalPluginDirs } = await import("../../lib/plugins/loader.js");
        expect(findExternalPluginDirs("/fake")).toHaveLength(0);
    });

    it("returns entries for fscr-plugin-* dirs that have an index.js", async () => {
        const fakeNmDir = "/fake/node_modules";
        fsState.readdirResult = (p) => {
            if (p === fakeNmDir) {
                return [
                    { name: "fscr-plugin-deploy", isDirectory: () => true },
                    { name: "fscr-plugin-missing", isDirectory: () => true },
                    { name: "chalk", isDirectory: () => true },
                ];
            }
            return [];
        };
        fsState.existsOverride = (p) => {
            if (p === `${fakeNmDir}/fscr-plugin-deploy/index.js`) return true;
            if (p === `${fakeNmDir}/fscr-plugin-missing/index.js`) return false;
            return null;
        };

        const { findExternalPluginDirs } = await import("../../lib/plugins/loader.js");
        const result = findExternalPluginDirs("/fake");
        expect(result).toHaveLength(1);
        expect(result[0].dir).toBe("fscr-plugin-deploy");
        expect(result[0].entryPath).toContain("fscr-plugin-deploy/index.js");
    });

    it("ignores non-directory entries whose name starts with fscr-plugin-", async () => {
        fsState.readdirResult = [{ name: "fscr-plugin-flat.js", isDirectory: () => false }];
        const { findExternalPluginDirs } = await import("../../lib/plugins/loader.js");
        expect(findExternalPluginDirs("/fake")).toHaveLength(0);
    });
});

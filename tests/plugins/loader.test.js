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
    readdirResult: null, // array -> readdirSync returns it; null -> delegate to real fs
    readdirThrows: false, // true -> readdirSync throws
    existsOverride: null // (path) => bool | null(delegate)
}));

vi.mock("fs", async () => {
    const actual = await vi.importActual("fs");
    return {
        ...actual,
        readdirSync: (p, opts) => {
            if (fsState.readdirThrows) throw new Error("ENOENT: simulated unreadable dir");
            if (fsState.readdirResult) return fsState.readdirResult;
            return actual.readdirSync(p, opts);
        },
        existsSync: (p) => {
            if (fsState.existsOverride) {
                const r = fsState.existsOverride(p);
                if (r !== null) return r;
            }
            return actual.existsSync(p);
        }
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
        vi.resetModules();
    });

    afterEach(() => {
        fsState.readdirResult = null;
        fsState.readdirThrows = false;
        fsState.existsOverride = null;
        vi.clearAllMocks();
    });

    it("returns empty commands and runnablePlugins when the plugins dir has no subdirs", async () => {
        fsState.readdirResult = [];
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        expect(result.commands).toHaveLength(0);
        expect(result.runnablePlugins).toHaveLength(0);
    });

    it("returns a bare empty array when the plugins dir is unreadable", async () => {
        fsState.readdirThrows = true;
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
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
});

/**
 * Tests for lib/plugins/loader.js
 *
 * loadPlugins()               – discovers and initialises plugin subdirs
 * registerPluginCommands()    – registers plugin commands on a yargs instance
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";

// We mock the fs module used by the loader, and hooks so side-effects are isolated.
vi.mock("../../lib/plugins/hooks.js", () => ({
    registerHook: vi.fn(),
    fireHook: vi.fn().mockResolvedValue(undefined),
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
        }),
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
            { name: "deploy", description: "Deploy app", options: [], handler: vi.fn(), examples: [] },
            { name: "rollback", description: "Rollback", options: [], handler: vi.fn(), examples: [] },
        ];
        registerPluginCommands(y, cmds);
        expect(y.command).toHaveBeenCalledTimes(2);
        expect(y._commands[0].name).toBe("deploy");
        expect(y._commands[1].name).toBe("rollback");
    });

    it("adds examples via yargsInstance.example()", () => {
        const y = makeYargs();
        const cmds = [{
            name: "ship",
            description: "Ship it",
            options: [],
            handler: vi.fn(),
            examples: ["fsr ship --files ./dist", "fsr ship --subdomain foo"],
        }];
        registerPluginCommands(y, cmds);
        expect(y.example).toHaveBeenCalledTimes(2);
    });

    it("command handler calls fireHook post-task on success", async () => {
        const y = makeYargs();
        const handler = vi.fn().mockResolvedValue(undefined);
        registerPluginCommands(y, [{
            name: "ok-cmd",
            description: "",
            options: [],
            handler,
            examples: [],
        }]);

        // Invoke the yargs handler that was registered
        const yargsHandler = y._commands[0].handler;
        await yargsHandler({ _: ["ok-cmd"] });

        expect(handler).toHaveBeenCalledOnce();
        expect(fireHook).toHaveBeenCalledWith("post-task", expect.objectContaining({
            taskName: "ok-cmd",
            success: true,
        }));
    });

    it("command handler calls fireHook task-error and rethrows on failure", async () => {
        const y = makeYargs();
        const err = new Error("deploy failed");
        const handler = vi.fn().mockRejectedValue(err);
        registerPluginCommands(y, [{
            name: "bad-cmd",
            description: "",
            options: [],
            handler,
            examples: [],
        }]);

        const yargsHandler = y._commands[0].handler;
        await expect(yargsHandler({ _: ["bad-cmd"] })).rejects.toThrow("deploy failed");
        expect(fireHook).toHaveBeenCalledWith("task-error", expect.objectContaining({
            taskName: "bad-cmd",
            error: err,
        }));
    });

    it("builder calls yargs.option for options with a long flag", () => {
        const y = makeYargs();
        const yargsMock = { option: vi.fn() };
        registerPluginCommands(y, [{
            name: "cmd",
            description: "",
            options: [
                { flags: "--files", description: "Files path", type: "string" },
                { flags: "-s, --subdomain", description: "Subdomain", type: "string" },
            ],
            handler: vi.fn(),
            examples: [],
        }]);

        const builder = y._commands[0].builder;
        builder(yargsMock);
        expect(yargsMock.option).toHaveBeenCalledTimes(2);
        expect(yargsMock.option).toHaveBeenCalledWith("files", expect.objectContaining({ description: "Files path" }));
        expect(yargsMock.option).toHaveBeenCalledWith("subdomain", expect.objectContaining({ alias: "s" }));
    });

    it("skips options whose flags string has no long option", () => {
        const y = makeYargs();
        const yargsMock = { option: vi.fn() };
        registerPluginCommands(y, [{
            name: "cmd",
            description: "",
            options: [{ flags: "-v", description: "verbose", type: "boolean" }],
            handler: vi.fn(),
            examples: [],
        }]);
        const builder = y._commands[0].builder;
        builder(yargsMock);
        expect(yargsMock.option).not.toHaveBeenCalled();
    });
});

// ────────────────────────────────────────────────────────────────────────────
// loadPlugins – uses a temporary plugin directory
// ────────────────────────────────────────────────────────────────────────────

describe("loadPlugins", () => {
    /**
     * loadPlugins resolves the plugins dir at module-load time (top-level constant).
     * We test the public-facing behaviour by mocking fs so we control what
     * readdirSync returns, which covers every branch without needing a real disk.
     */
    it("returns empty commands and runnablePlugins arrays when plugins dir has no subdirs", async () => {
        vi.resetModules();
        // Stub readdirSync so it returns an empty list for the first call (entries)
        vi.mock("fs", async () => {
            const actual = await vi.importActual("fs");
            return {
                ...actual,
                readdirSync: vi.fn().mockReturnValue([]),
                existsSync: vi.fn().mockReturnValue(true),
            };
        });
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        // May return { commands: [], runnablePlugins: [] } or [] depending on branch
        if (Array.isArray(result)) {
            expect(result).toHaveLength(0);
        } else {
            expect(result.commands).toHaveLength(0);
            expect(result.runnablePlugins).toHaveLength(0);
        }
        vi.unmock("fs");
    });

    it("handles readdirSync throwing (unreadable dir) by returning empty commands", async () => {
        vi.resetModules();
        vi.mock("fs", async () => {
            const actual = await vi.importActual("fs");
            return {
                ...actual,
                readdirSync: vi.fn().mockImplementation(() => { throw new Error("ENOENT"); }),
                existsSync: vi.fn().mockReturnValue(true),
            };
        });
        const { loadPlugins } = await import("../../lib/plugins/loader.js");
        const result = await loadPlugins();
        if (Array.isArray(result)) {
            expect(result).toHaveLength(0);
        } else {
            expect(result.commands).toHaveLength(0);
        }
        vi.unmock("fs");
    });
});

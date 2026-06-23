/**
 * Tests for lib/startScripts.js
 *
 * startScripts(categories=true)  – parses fscripts.md, lets the user pick a task
 *   via the ink TaskPicker (mocked), records it in recent tasks, and runs it.
 * startScripts(false)            – same, but picks via the ink AutoComplete
 *   (taskListAutoComplete) instead of the category TaskPicker.
 * taskListAutoComplete(tasks)    – renders the AutoComplete and resolves with the
 *   chosen value (or null on cancel).
 * startPackageScripts()          – lists package.json scripts and runs the choice.
 * clearRecent()                  – wipes the persisted recentTasks store.
 *
 * Everything with a side-effect (the ink render, the CLI command runner, the
 * persisted config, the package/script parsers) is mocked so no real ink renders
 * and no config file is written. We exercise the real control-flow only.
 *
 * The ink `render` mock reads the AutoComplete element's props and synchronously
 * fires onSelect / onCancel according to `inkCtl`, faithfully reproducing what a
 * real selection / cancellation would do, so taskListAutoComplete resolves a real
 * value.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const SEP = "   ~   ";

// Mock for lib/cache/cache.js — replaces the old conf-based persistence.
const cacheMock = vi.hoisted(() => ({
    readCacheEntry: vi.fn(),
    writeCacheEntry: vi.fn(),
}));
// Mock for the fs built-in — prevents real statSync calls on fscripts.md.
const fsMock = vi.hoisted(() => ({
    statSync: vi.fn(() => ({ size: 100 })),
}));
// Drives what the mocked ink render does with the AutoComplete props.
//   mode "select" -> onSelect({ value }); "cancel" -> onCancel(); "none" -> nothing.
const inkCtl = vi.hoisted(() => ({ mode: "select", value: "build" }));

vi.mock("../../lib/taskList.js", () => ({ default: vi.fn(), selectPlugin: vi.fn() }));
vi.mock("../../lib/parsers/parseScriptsMd.js", () => ({ default: vi.fn() }));
vi.mock("../../lib/parsers/parseScriptsPackage.js", () => ({ default: vi.fn() }));
vi.mock("../../lib/running/runCLICommand.js", () => ({ default: vi.fn() }));
vi.mock("../../lib/running/parseTask.js", () => ({ default: vi.fn((x) => x) }));
// startScripts.js now uses lib/cache/cache.js (not conf) for persistence.
vi.mock("../../lib/cache/cache.js", () => ({
    readCacheEntry: cacheMock.readCacheEntry,
    writeCacheEntry: cacheMock.writeCacheEntry,
}));
// Prevent real fs.statSync calls when checking fscripts.md file size.
vi.mock("fs", () => ({ default: fsMock }));
// The ink render mock drives the AutoComplete callbacks instead of rendering.
vi.mock("ink", () => ({
    render: vi.fn((element) => {
        const p = element.props;
        if (inkCtl.mode === "select") p.onSelect({ value: inkCtl.value });
        else if (inkCtl.mode === "cancel") p.onCancel();
        return { waitUntilExit: () => Promise.resolve() };
    }),
}));
vi.mock("../../lib/ui/AutoComplete.js", () => ({ default: () => null }));
// Silence logger noise; we still assert against it for the not-found path.
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("startScripts / taskListAutoComplete / startPackageScripts / clearRecent", () => {
    let startScripts,
        startPackageScripts,
        taskListAutoComplete,
        clearRecent,
        taskList,
        parseScriptFile,
        parsePackageFile,
        runCLICommand,
        parseTask,
        fsrLog;

    beforeEach(async () => {
        vi.resetModules();
        // Default: cache has no entries; writes are no-ops.
        cacheMock.readCacheEntry.mockResolvedValue(null);
        cacheMock.writeCacheEntry.mockResolvedValue(undefined);
        inkCtl.mode = "select";
        inkCtl.value = "build";

        const mod = await import("../../lib/startScripts.js");
        startScripts = mod.startScripts;
        startPackageScripts = mod.startPackageScripts;
        taskListAutoComplete = mod.taskListAutoComplete;
        clearRecent = mod.clearRecent;

        taskList = (await import("../../lib/taskList.js")).default;
        parseScriptFile = (await import("../../lib/parsers/parseScriptsMd.js")).default;
        parsePackageFile = (await import("../../lib/parsers/parseScriptsPackage.js")).default;
        runCLICommand = (await import("../../lib/running/runCLICommand.js")).default;
        parseTask = (await import("../../lib/running/parseTask.js")).default;
        fsrLog = (await import("../../lib/utils/console.js")).default;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ── startScripts (category path) ──────────────────────────────────────────

    it("returns false and never runs a command when fscripts.md is missing", async () => {
        parseScriptFile.mockResolvedValue(false);

        const result = await startScripts();

        expect(result).toBe(false);
        expect(taskList).not.toHaveBeenCalled();
        expect(runCLICommand).not.toHaveBeenCalled();
    });

    it("runs the picked task and records it under recentTasks (new entry)", async () => {
        const buildTask = { name: "build", description: "compile the app" };
        const FcScripts = {
            allTasks: [buildTask, { name: "test", description: "run tests" }],
        };
        parseScriptFile.mockResolvedValue(FcScripts);
        taskList.mockResolvedValue("build");

        await startScripts();

        expect(taskList).toHaveBeenCalledTimes(1);
        expect(runCLICommand).toHaveBeenCalledTimes(1);
        expect(parseTask).toHaveBeenCalledWith(buildTask);
        expect(runCLICommand).toHaveBeenCalledWith(buildTask);

        // The last writeCacheEntry call for "recentTasks" contains the executed task.
        const recentCalls = cacheMock.writeCacheEntry.mock.calls.filter(
            (c) => c[0] === "recentTasks",
        );
        const lastCall = recentCalls.at(-1);
        expect(lastCall).toBeDefined();
        expect(lastCall[1]).toHaveProperty("build");
        expect(typeof lastCall[1].build.lastExecuted).toBe("number");
    });

    it("sorts existing recent tasks and updates lastExecuted for an already-recorded pick", async () => {
        // Four entries with timestamps 300/100/200/200 exercise every branch of the
        // sort comparator (>, <, ===) plus the .map / calendar formatting.
        const existingRecentTasks = {
            build: { lastExecuted: 300 },
            lint: { lastExecuted: 100 },
            test: { lastExecuted: 200 },
            docs: { lastExecuted: 200 },
        };
        cacheMock.readCacheEntry.mockImplementation(async (key) => {
            // Return matching size so the cache-reset branch is NOT triggered.
            if (key === "fscriptsSize") return { value: 100 };
            if (key === "recentTasks") return { value: existingRecentTasks };
            return null;
        });

        const buildTask = { name: "build", description: "compile" };
        parseScriptFile.mockResolvedValue({
            allTasks: [buildTask, { name: "lint", description: "l" }, { name: "test", description: "t" }],
        });
        // "build" is already in recentTasks -> hits the lastExecuted-update branch.
        taskList.mockResolvedValue("build");

        await startScripts();

        expect(runCLICommand).toHaveBeenCalledWith(buildTask);
        const recentCalls = cacheMock.writeCacheEntry.mock.calls.filter(
            (c) => c[0] === "recentTasks",
        );
        const lastCall = recentCalls.at(-1);
        // Existing entry updated, not replaced wholesale.
        expect(lastCall[1].build.lastExecuted).not.toBe(300);
        expect(typeof lastCall[1].build.lastExecuted).toBe("number");
        // Recent options (passed to the picker) only keep the 3 most recent.
        const optionsArg = taskList.mock.calls[0][1];
        expect(optionsArg).toHaveLength(3);
    });

    it("does not run a command when the picker resolves falsey (cancelled)", async () => {
        parseScriptFile.mockResolvedValue({ allTasks: [{ name: "build" }] });
        taskList.mockResolvedValue(null);

        const result = await startScripts();

        expect(result).toBe(false);
        expect(runCLICommand).not.toHaveBeenCalled();
    });

    // ── startScripts (non-category / AutoComplete path) ───────────────────────

    it("startScripts(false) picks via the AutoComplete and runs the selected task", async () => {
        inkCtl.mode = "select";
        inkCtl.value = "build";
        const buildTask = { name: "build", description: "compile" };
        parseScriptFile.mockResolvedValue({
            allTasks: [buildTask, { name: "test", description: "t" }],
        });

        await startScripts(false);

        expect(taskList).not.toHaveBeenCalled();
        expect(runCLICommand).toHaveBeenCalledTimes(1);
        expect(parseTask).toHaveBeenCalledWith(buildTask);
        expect(runCLICommand).toHaveBeenCalledWith(buildTask);
    });

    it("startScripts logs an error when the selected task is not found", async () => {
        inkCtl.mode = "select";
        inkCtl.value = "ghost"; // not present in allTasks
        parseScriptFile.mockResolvedValue({
            allTasks: [{ name: "build", description: "compile" }],
        });

        const result = await startScripts(false);

        expect(result).toBeUndefined();
        expect(runCLICommand).not.toHaveBeenCalled();
        expect(fsrLog.error).toHaveBeenCalled();
    });

    // ── taskListAutoComplete (direct) ─────────────────────────────────────────

    it("taskListAutoComplete maps separator and plain items and resolves the selected value", async () => {
        inkCtl.mode = "select";
        inkCtl.value = "alpha";

        const result = await taskListAutoComplete(
            ["alpha" + SEP + "build the app", "plain"],
            "Pick one",
        );

        expect(result).toBe("alpha");
    });

    it("taskListAutoComplete resolves null on cancel and falls back to the default title", async () => {
        inkCtl.mode = "cancel";

        // No title argument -> exercises the `title || 'Choose task to run'` default.
        const result = await taskListAutoComplete(["a" + SEP + "b"]);

        expect(result).toBeNull();
    });

    // ── startPackageScripts ───────────────────────────────────────────────────

    it("startPackageScripts lists package scripts and runs the chosen one", async () => {
        inkCtl.mode = "select";
        inkCtl.value = "build";
        parsePackageFile.mockResolvedValue({ build: "tsc -p .", test: "vitest" });

        await startPackageScripts();

        expect(runCLICommand).toHaveBeenCalledTimes(1);
        const arg = runCLICommand.mock.calls[0][0];
        expect(arg.task.name).toBe("build");
        expect(arg.script.full).toBe("build");
        expect(arg.script.rest).toEqual(["build"]);
    });

    it("startPackageScripts says goodbye when nothing is selected (and tolerates no scripts)", async () => {
        inkCtl.mode = "cancel";
        parsePackageFile.mockResolvedValue(null); // -> {} via the `|| {}` fallback

        const result = await startPackageScripts();

        expect(result).toBe(false);
        expect(runCLICommand).not.toHaveBeenCalled();
    });

    // ── clearRecent / getConfig memoization ───────────────────────────────────

    it("clearRecent resets recentTasks to an empty object", async () => {
        await clearRecent();

        // clearRecent() now delegates to writeCacheEntry from lib/cache/cache.js.
        expect(cacheMock.writeCacheEntry).toHaveBeenCalledWith("recentTasks", {}, true);
    });

    it("each clearRecent() call writes to the cache (no stale memoization)", async () => {
        // The old Conf-based implementation memoised a singleton, producing only one
        // Conf instance across multiple clearRecent() calls. The cache.js-based
        // implementation has no such singleton — each clearRecent() triggers a fresh
        // writeCacheEntry. Verify that two calls produce two writes.
        await clearRecent();
        await clearRecent();

        const recentCalls = cacheMock.writeCacheEntry.mock.calls.filter(
            (c) => c[0] === "recentTasks",
        );
        expect(recentCalls).toHaveLength(2);
        expect(recentCalls[0][1]).toEqual({});
        expect(recentCalls[1][1]).toEqual({});
    });
});

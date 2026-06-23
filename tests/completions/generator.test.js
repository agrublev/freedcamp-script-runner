/**
 * Tests for lib/completions/generator.js
 *
 * getAvailableTasks()            – cached lookup of tasks from fscripts.md (5s TTL)
 * getAvailableCommands()         – static command list
 * getCompletionSubcommands()     – static completion subcommand list
 * generateTaskNames()            – task names only
 * generateBashCompletionData()   – { commands, tasks, completionSubcommands } of names
 * generateZshCompletionData()    – name:description strings (desc sanitised)
 * generateFishCompletionData()   – arrays of { name, description } objects
 * exportTasksForCompletion()     – newline-joined task names
 * clearTaskCache()               – resets the module-level cache
 *
 * Only the parser (parseScriptsMd) is mocked; everything else is real.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// parseScriptFile is the default export; mock it so we control the parsed tasks
// without touching the filesystem (the real one reads fscripts.md from cwd).
vi.mock("../../lib/parsers/parseScriptsMd.js", () => ({
    default: vi.fn(),
}));

// Realistic parse result. Exercises branches in the generators:
//  - "empty"  -> empty description (zsh/fish default to "Run task")
//  - "colon"  -> ':' and '\n' must be stripped from zsh descriptions
//  - "nolang" -> missing lang defaults to "bash" in getAvailableTasks
const SAMPLE = {
    categories: [],
    allTasks: [
        { name: "build", description: "Build the project", lang: "bash" },
        { name: "test", description: "Run tests", lang: "node" },
        { name: "empty", description: "", lang: "bash" },
        { name: "colon", description: "Has: colon\nnewline", lang: "bash" },
        { name: "nolang", description: "no lang field" },
    ],
};

const TASK_NAMES = ["build", "test", "empty", "colon", "nolang"];

describe("completions/generator", () => {
    let gen, parseScriptFile;

    beforeEach(async () => {
        // Fresh module graph each test so the module-level task cache starts empty
        // and the mock factory hands us a clean spy (re-import to capture it).
        vi.resetModules();
        const parserMod = await import("../../lib/parsers/parseScriptsMd.js");
        parseScriptFile = parserMod.default;
        parseScriptFile.mockResolvedValue(SAMPLE);
        gen = await import("../../lib/completions/generator.js");
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    // ────────────────────────────────────────────────────────────────────────
    // getAvailableCommands
    // ────────────────────────────────────────────────────────────────────────

    describe("getAvailableCommands", () => {
        it("returns a non-empty array of { name, description } commands", () => {
            const commands = gen.getAvailableCommands();
            expect(Array.isArray(commands)).toBe(true);
            expect(commands.length).toBeGreaterThan(0);
            for (const c of commands) {
                expect(typeof c.name).toBe("string");
                expect(typeof c.description).toBe("string");
                expect(c.name.length).toBeGreaterThan(0);
            }
        });

        it("contains the known top-level commands", () => {
            const names = gen.getAvailableCommands().map((c) => c.name);
            for (const expected of ["commit", "start", "run", "upgrade", "doctor", "completion"]) {
                expect(names).toContain(expected);
            }
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // getCompletionSubcommands
    // ────────────────────────────────────────────────────────────────────────

    describe("getCompletionSubcommands", () => {
        it("returns exactly the four completion subcommands", () => {
            const subs = gen.getCompletionSubcommands();
            expect(subs.map((s) => s.name)).toEqual([
                "install",
                "uninstall",
                "status",
                "generate",
            ]);
            for (const s of subs) {
                expect(typeof s.description).toBe("string");
                expect(s.description.length).toBeGreaterThan(0);
            }
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // getAvailableTasks – mapping + caching
    // ────────────────────────────────────────────────────────────────────────

    describe("getAvailableTasks", () => {
        it("maps parsed tasks to { name, description, lang } and defaults lang to 'bash'", async () => {
            const tasks = await gen.getAvailableTasks();
            expect(tasks).toEqual([
                { name: "build", description: "Build the project", lang: "bash" },
                { name: "test", description: "Run tests", lang: "node" },
                { name: "empty", description: "", lang: "bash" },
                { name: "colon", description: "Has: colon\nnewline", lang: "bash" },
                { name: "nolang", description: "no lang field", lang: "bash" },
            ]);
        });

        it("caches within the TTL: a second call does not re-parse", async () => {
            await gen.getAvailableTasks();
            await gen.getAvailableTasks();
            expect(parseScriptFile).toHaveBeenCalledTimes(1);
        });

        it("re-parses after clearTaskCache()", async () => {
            await gen.getAvailableTasks();
            expect(parseScriptFile).toHaveBeenCalledTimes(1);
            gen.clearTaskCache();
            await gen.getAvailableTasks();
            expect(parseScriptFile).toHaveBeenCalledTimes(2);
        });

        it("forceRefresh bypasses the cache", async () => {
            await gen.getAvailableTasks();
            await gen.getAvailableTasks(true);
            expect(parseScriptFile).toHaveBeenCalledTimes(2);
        });

        it("re-parses once the 5s TTL has elapsed", async () => {
            vi.useFakeTimers();
            await gen.getAvailableTasks();
            expect(parseScriptFile).toHaveBeenCalledTimes(1);

            // still inside the TTL window -> cache hit
            vi.advanceTimersByTime(4000);
            await gen.getAvailableTasks();
            expect(parseScriptFile).toHaveBeenCalledTimes(1);

            // cross the 5s boundary -> cache miss, re-parse
            vi.advanceTimersByTime(2000);
            await gen.getAvailableTasks();
            expect(parseScriptFile).toHaveBeenCalledTimes(2);
        });

        it("returns [] when the parser rejects", async () => {
            parseScriptFile.mockRejectedValueOnce(new Error("boom"));
            await expect(gen.getAvailableTasks()).resolves.toEqual([]);
        });

        it("returns [] when fscripts.md is missing (parser resolves false)", async () => {
            // parseScriptFile returns `false`; destructuring allTasks yields undefined,
            // .map then throws and is swallowed -> empty array.
            parseScriptFile.mockResolvedValueOnce(false);
            await expect(gen.getAvailableTasks()).resolves.toEqual([]);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // generateTaskNames
    // ────────────────────────────────────────────────────────────────────────

    describe("generateTaskNames", () => {
        it("returns the names of all parsed tasks", async () => {
            await expect(gen.generateTaskNames()).resolves.toEqual(TASK_NAMES);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // generateBashCompletionData
    // ────────────────────────────────────────────────────────────────────────

    describe("generateBashCompletionData", () => {
        it("returns flat name arrays for commands, tasks and subcommands", async () => {
            const data = await gen.generateBashCompletionData();
            expect(data.tasks).toEqual(TASK_NAMES);
            expect(data.completionSubcommands).toEqual([
                "install",
                "uninstall",
                "status",
                "generate",
            ]);
            expect(data.commands).toContain("commit");
            expect(data.commands).toContain("doctor");
            // commands must be plain name strings, not objects
            expect(data.commands.every((c) => typeof c === "string")).toBe(true);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // generateZshCompletionData
    // ────────────────────────────────────────────────────────────────────────

    describe("generateZshCompletionData", () => {
        it("returns name:description strings and sanitises task descriptions", async () => {
            const data = await gen.generateZshCompletionData();

            expect(data.tasks).toContain("build:Build the project");
            // empty description -> "Run task" fallback
            expect(data.tasks).toContain("empty:Run task");
            // ':' and '\n' replaced with spaces, then trimmed
            expect(data.tasks).toContain("colon:Has  colon newline");

            expect(data.completionSubcommands).toContain("install:Install completions");
            // commands are also "name:description"
            expect(data.commands.some((c) => c.startsWith("commit:"))).toBe(true);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // generateFishCompletionData
    // ────────────────────────────────────────────────────────────────────────

    describe("generateFishCompletionData", () => {
        it("returns arrays of { name, description } objects with task fallback", async () => {
            const data = await gen.generateFishCompletionData();

            expect(data.tasks).toContainEqual({ name: "build", description: "Build the project" });
            // empty description falls back to "Run task"
            expect(data.tasks).toContainEqual({ name: "empty", description: "Run task" });
            expect(data.completionSubcommands).toContainEqual({
                name: "install",
                description: "Install completions",
            });
            // commands carry their full descriptions verbatim
            const commit = data.commands.find((c) => c.name === "commit");
            expect(commit).toBeDefined();
            expect(commit.description.length).toBeGreaterThan(0);
        });
    });

    // ────────────────────────────────────────────────────────────────────────
    // exportTasksForCompletion
    // ────────────────────────────────────────────────────────────────────────

    describe("exportTasksForCompletion", () => {
        it("returns task names joined by newlines", async () => {
            const out = await gen.exportTasksForCompletion();
            expect(typeof out).toBe("string");
            expect(out).toBe(TASK_NAMES.join("\n"));
            expect(out.split("\n")).toEqual(TASK_NAMES);
        });
    });
});

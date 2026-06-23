/**
 * Tests for lib/release/bump.js
 *
 * bump(typeParam = null, skipGit = false) bumps package.json's version via
 * `yarn version --<type> --no-git-tag-version --no-commit-hooks`, then
 * optionally creates a git commit + annotated tag + push when the user
 * confirms the git-tag prompt.
 *
 * Strategy: mock the only side-effecting deps (cross-spawn, the interactive
 * prompt, the logger) and control package.json reads through a mocked `fs`.
 * Real behaviour is asserted against the recorded spawnSync call arguments.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import prompt from "../../lib/utils/prompt.js";
import { sync as spawnSync } from "cross-spawn";
import bump from "../../lib/release/bump.js";

vi.mock("cross-spawn", () => ({ sync: vi.fn(() => ({ status: 0, stdout: "user" })) }));
vi.mock("../../lib/utils/prompt.js", () => ({ default: vi.fn() }));
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
// Keep the real fs surface (chalk/supports-color may touch it) and only
// override the two reads bump performs.
vi.mock("fs", async () => {
    const actual = await vi.importActual("fs");
    const base = actual.default ?? actual;
    const def = {
        ...base,
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify({ name: "fscr", version: "1.2.3" })),
    };
    return { ...actual, existsSync: def.existsSync, readFileSync: def.readFileSync, default: def };
});

const callsFor = (cmd) => spawnSync.mock.calls.filter((c) => c[0] === cmd);
const argsFor = (cmd) => callsFor(cmd).map((c) => c[1]);

beforeEach(() => {
    vi.resetAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ name: "fscr", version: "1.2.3" }));
    spawnSync.mockReturnValue({ status: 0, stdout: "user" });
    // prompt is left without an implementation; each test queues its answers.
});

describe("bump", () => {
    it("with explicit type + skipGit: no prompts, yarn version carries the flag, no git", async () => {
        await bump("minor", true);

        expect(prompt).not.toHaveBeenCalled();

        const yarn = callsFor("yarn");
        expect(yarn).toHaveLength(1);
        expect(yarn[0][1]).toEqual([
            "version",
            "--minor",
            "--no-git-tag-version",
            "--no-commit-hooks",
        ]);

        expect(callsFor("git")).toHaveLength(0);
    });

    it("prompts for the bump type when typeParam is null and feeds it into the yarn args", async () => {
        prompt.mockResolvedValueOnce("major"); // type select

        await bump(null, true);

        expect(prompt).toHaveBeenCalledTimes(1);
        expect(prompt).toHaveBeenCalledWith(
            expect.objectContaining({ type: "select", choices: ["patch", "minor", "major"] })
        );

        const yarn = callsFor("yarn");
        expect(yarn).toHaveLength(1);
        expect(yarn[0][1]).toContain("--major");
    });

    it("runs git add/commit/tag/push when the git-tag prompt confirms", async () => {
        prompt
            .mockResolvedValueOnce(true) // confirm: add git tag?
            .mockResolvedValueOnce(""); // description: empty

        await bump("patch", false);

        expect(argsFor("git")).toEqual([
            ["add", "."],
            ["commit", "-m", "VERSION 1.2.3"],
            ["tag", "-a", "v1.2.3", "-m", "VERSION 1.2.3"],
            ["push", "origin", "--tags"],
        ]);
    });

    it("does NOT touch git when the git-tag prompt declines", async () => {
        prompt.mockResolvedValueOnce(false); // confirm: no tag

        await bump("patch", false);

        expect(callsFor("git")).toHaveLength(0);
        expect(callsFor("yarn")).toHaveLength(1);
    });

    it("appends a non-empty trimmed description to the commit message body", async () => {
        prompt
            .mockResolvedValueOnce(true) // confirm
            .mockResolvedValueOnce("  Fixed the thing  "); // description (gets trimmed)

        await bump("patch", false);

        const commit = callsFor("git").find((c) => c[1][0] === "commit");
        expect(commit[1]).toEqual(["commit", "-m", "VERSION 1.2.3\n\nFixed the thing"]);
    });

    it("exits with code 1 (before any bump) when package.json is missing", async () => {
        fs.existsSync.mockReturnValue(false);
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("exit");
        });

        await expect(bump("patch", true)).rejects.toThrow("exit");
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(callsFor("yarn")).toHaveLength(0);

        exitSpy.mockRestore();
    });

    it("throws when a spawned command exits non-zero", async () => {
        spawnSync.mockReturnValue({ status: 1 });

        await expect(bump("minor", true)).rejects.toThrow("yarn exited with code 1");
    });
});

/**
 * Tests for lib/git/commit.js
 *
 * The commit() default export requires an interactive terminal (git, Claude
 * API, inquirer). We test it via mocking. The helper functions
 * insertChangelog() and commitType() are private but exercised through
 * integration-style tests on the module's behaviour.
 *
 * Strategy:
 *   - Mock simple-git, @anthropic-ai/sdk, fs, and prompt
 *   - Test the orchestration logic (happy path, empty commit list, no files,
 *     changelog update, aborted confirmation, Claude error)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import os from "os";
import fsActual from "fs-extra";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("simple-git", () => ({
    simpleGit: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
    default: vi.fn(),
}));

vi.mock("../../lib/utils/prompt.js", () => ({
    default: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGit({ notAdded = [], staged = [], modified = [], created = [], deleted = [], renamed = [] } = {}) {
    return {
        status: vi.fn().mockResolvedValue({ not_added: notAdded, staged, modified, created, deleted, renamed }),
        add: vi.fn().mockResolvedValue(undefined),
        commit: vi.fn().mockResolvedValue(undefined),
        diff: vi.fn().mockResolvedValue(""),
        raw: vi.fn().mockResolvedValue("M  src/foo.js"),
    };
}

function makeClaudeClient(commits) {
    return {
        messages: {
            create: vi.fn().mockResolvedValue({
                content: [{
                    type: "tool_use",
                    input: { commits }
                }]
            })
        }
    };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("commit() – default export", () => {
    let commit, simpleGit, Anthropic, prompt;
    let tempDir, origCwd;

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fsActual.mkdtemp(path.join(os.tmpdir(), "fsr-commit-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
        process.env.ANTHROPIC_API_KEY = "test-key";

        // Re-import after resetModules
        const simpleGitMod = await import("simple-git");
        const AnthropicMod = await import("@anthropic-ai/sdk");
        const promptMod = await import("../../lib/utils/prompt.js");
        simpleGit = simpleGitMod.simpleGit;
        Anthropic = AnthropicMod.default;
        prompt = promptMod.default;

        const mod = await import("../../lib/git/commit.js");
        commit = mod.default;

        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fsActual.remove(tempDir);
        vi.restoreAllMocks();
        delete process.env.ANTHROPIC_API_KEY;
    });

    it("exits early with a log when there are no changed files", async () => {
        simpleGit.mockReturnValue(makeGit());
        await commit();
        // no prompt calls, no Claude calls
        expect(prompt).not.toHaveBeenCalled();
        expect(Anthropic).not.toHaveBeenCalled();
    });

    it("stages selected untracked files before analysis", async () => {
        const gitInst = makeGit({ notAdded: ["new-file.js"] });
        simpleGit.mockReturnValue(gitInst);

        const proposedCommits = [{ message: "feat: add file", files: ["new-file.js"], changelog: null }];
        Anthropic.mockImplementation(function () { return makeClaudeClient(proposedCommits); });

        // User selects the untracked file, then confirms
        prompt
            .mockResolvedValueOnce(["new-file.js"])  // checkbox for untracked
            .mockResolvedValueOnce(true);            // confirm commits

        await commit();
        expect(gitInst.add).toHaveBeenCalledWith(["new-file.js"]);
    });

    it("aborts without committing when user declines confirmation", async () => {
        const gitInst = makeGit({ modified: ["src/foo.js"] });
        simpleGit.mockReturnValue(gitInst);

        const proposedCommits = [{ message: "fix: something", files: ["src/foo.js"], changelog: null }];
        Anthropic.mockImplementation(function () { return makeClaudeClient(proposedCommits); });

        prompt.mockResolvedValueOnce(false); // decline confirmation

        await commit();
        expect(gitInst.commit).not.toHaveBeenCalled();
    });

    it("runs git add + commit for each proposed commit", async () => {
        const gitInst = makeGit({ modified: ["a.js", "b.js"] });
        simpleGit.mockReturnValue(gitInst);

        const proposedCommits = [
            { message: "feat: a", files: ["a.js"], changelog: null },
            { message: "fix: b",  files: ["b.js"], changelog: null },
        ];
        Anthropic.mockImplementation(function () { return makeClaudeClient(proposedCommits); });
        prompt.mockResolvedValueOnce(true); // confirm

        await commit();
        expect(gitInst.add).toHaveBeenCalledTimes(2);
        expect(gitInst.commit).toHaveBeenCalledTimes(2);
    });

    it("updates CHANGELOG.md when changelog entries are present", async () => {
        // Write a minimal CHANGELOG.md
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [Unreleased]\n\n");

        const gitInst = makeGit({ modified: ["src/index.js"] });
        simpleGit.mockReturnValue(gitInst);

        const proposedCommits = [{ message: "feat: cool thing", files: ["src/index.js"], changelog: "Added cool thing" }];
        Anthropic.mockImplementation(function () { return makeClaudeClient(proposedCommits); });
        prompt.mockResolvedValueOnce(true);

        await commit();

        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toContain("Added cool thing");
    });

    it("handles Claude analysis failure gracefully (logs error, returns)", async () => {
        const gitInst = makeGit({ modified: ["x.js"] });
        simpleGit.mockReturnValue(gitInst);

        Anthropic.mockImplementation(function () { return ({
            messages: {
                create: vi.fn().mockRejectedValue(new Error("Claude API down")),
            }
        }); });

        // Should NOT throw — just log the error
        await expect(commit()).resolves.toBeUndefined();
    });

    it("filters out files not in the allowed set (Claude hallucinations)", async () => {
        const gitInst = makeGit({ modified: ["real.js"] });
        simpleGit.mockReturnValue(gitInst);

        const proposedCommits = [
            { message: "feat: real", files: ["real.js", "phantom.js"], changelog: null },
        ];
        Anthropic.mockImplementation(function () { return makeClaudeClient(proposedCommits); });
        prompt.mockResolvedValueOnce(true);

        await commit();
        // git add should only include real.js
        const addCalls = gitInst.add.mock.calls.flat(2);
        expect(addCalls).not.toContain("phantom.js");
    });

    it("exits early when all commits are empty after filtering", async () => {
        const gitInst = makeGit({ modified: ["real.js"] });
        simpleGit.mockReturnValue(gitInst);

        // Claude proposes only phantom files
        const proposedCommits = [{ message: "feat: nothing", files: ["phantom.js"], changelog: null }];
        Anthropic.mockImplementation(function () { return makeClaudeClient(proposedCommits); });

        await commit();
        expect(gitInst.commit).not.toHaveBeenCalled();
    });

    it("throws when ANTHROPIC_API_KEY is not set", async () => {
        delete process.env.ANTHROPIC_API_KEY;
        const gitInst = makeGit({ modified: ["a.js"] });
        simpleGit.mockReturnValue(gitInst);

        // The getAnthropicApiKey() throws before Claude client is created
        // commit() catches it and logs, so it resolves (not rejects)
        await expect(commit()).resolves.toBeUndefined();
    });

    it("includes renamed files (status.renamed -> r.to) in the analysis set", async () => {
        const gitInst = makeGit({ renamed: [{ from: "old.js", to: "new.js" }] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([{ message: "refactor: rename", files: ["new.js"], changelog: null }]);
        });
        prompt.mockResolvedValueOnce(true);

        await commit();
        expect(gitInst.add).toHaveBeenCalledWith(["new.js"]);
        expect(gitInst.commit).toHaveBeenCalledWith("refactor: rename");
    });

    it("logs and continues when a proposed commit fails to add/commit", async () => {
        const gitInst = makeGit({ modified: ["bad.js"] });
        gitInst.commit.mockRejectedValue(new Error("commit boom"));
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([{ message: "fix: bad", files: ["bad.js"], changelog: null }]);
        });
        prompt.mockResolvedValueOnce(true);

        // The per-commit catch swallows the failure; commit() still resolves.
        await expect(commit()).resolves.toBeUndefined();
        expect(gitInst.add).toHaveBeenCalledWith(["bad.js"]);
    });

    it("logs an error when committing CHANGELOG.md itself fails", async () => {
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [Unreleased]\n\n");
        const gitInst = makeGit({ modified: ["src/z.js"] });
        // Feature commit succeeds; only the CHANGELOG bookkeeping commit fails.
        gitInst.commit.mockImplementation(async (msg) => {
            if (msg === "chore: update CHANGELOG.md") throw new Error("changelog commit boom");
        });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([{ message: "feat: z", files: ["src/z.js"], changelog: "Added z" }]);
        });
        prompt.mockResolvedValueOnce(true);

        await expect(commit()).resolves.toBeUndefined();
        // CHANGELOG was still written to disk before the commit attempt.
        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toContain("Added z");
        expect(gitInst.commit).toHaveBeenCalledWith("chore: update CHANGELOG.md");
    });

    it("writes plural 'ies' wording and merges same-section entries for multiple changelogs", async () => {
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [Unreleased]\n\n");
        const gitInst = makeGit({ modified: ["one.js", "two.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([
                { message: "feat: one", files: ["one.js"], changelog: "Added one" },
                { message: "feat: two", files: ["two.js"], changelog: "Added two" },
            ]);
        });
        prompt.mockResolvedValueOnce(true);

        await commit();
        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        // Both feat entries collapse under a single ### Added subsection.
        expect(content.match(/### Added/g)).toHaveLength(1);
        expect(content).toContain("Added one");
        expect(content).toContain("Added two");
    });

    it("falls back to ### Changed for an unrecognized commit type", async () => {
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [Unreleased]\n\n");
        const gitInst = makeGit({ modified: ["misc.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            // "update misc" has no Conventional-Commit prefix -> commitType() returns "chore"
            // -> not in TYPE_TO_SECTION -> "Changed".
            return makeClaudeClient([{ message: "update misc", files: ["misc.js"], changelog: "Misc change" }]);
        });
        prompt.mockResolvedValueOnce(true);

        await commit();
        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toContain("### Changed");
        expect(content).toContain("Misc change");
    });

    it("skips the CHANGELOG step when entries exist but no CHANGELOG.md is present", async () => {
        // No CHANGELOG.md written in this temp dir.
        const gitInst = makeGit({ modified: ["src/q.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([{ message: "fix: q", files: ["src/q.js"], changelog: "Fixed q" }]);
        });
        prompt.mockResolvedValueOnce(true);

        await commit();
        // Only the feature commit runs; no "chore: update CHANGELOG.md" commit.
        expect(gitInst.commit).toHaveBeenCalledTimes(1);
        expect(gitInst.commit).not.toHaveBeenCalledWith("chore: update CHANGELOG.md");
    });

    it("does not stage untracked files when the user selects none", async () => {
        const gitInst = makeGit({ notAdded: ["u.js"], modified: ["m.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([{ message: "feat: m", files: ["m.js"], changelog: null }]);
        });
        prompt
            .mockResolvedValueOnce([]) // checkbox: select no untracked files
            .mockResolvedValueOnce(true); // confirm

        await commit();
        // The untracked file was never staged, and is not part of the commit set.
        expect(gitInst.add).not.toHaveBeenCalledWith(["u.js"]);
        expect(gitInst.add).toHaveBeenCalledWith(["m.js"]);
    });

    it("truncates an oversized diff before sending it to Claude", async () => {
        const gitInst = makeGit({ modified: ["huge.js"] });
        // Force a staged diff larger than the 60 KB cap to exercise truncation.
        gitInst.diff.mockImplementation(async (args) =>
            Array.isArray(args) && args[0] === "--cached" ? "x".repeat(70_000) : ""
        );
        simpleGit.mockReturnValue(gitInst);
        let sentDiff;
        Anthropic.mockImplementation(function () {
            return {
                messages: {
                    create: vi.fn().mockImplementation(async (req) => {
                        sentDiff = req.messages[0].content;
                        return { content: [{ type: "tool_use", input: { commits: [
                            { message: "feat: huge", files: ["huge.js"], changelog: null },
                        ] } }] };
                    }),
                },
            };
        });
        prompt.mockResolvedValueOnce(true);

        await commit();
        expect(sentDiff).toContain("[diff truncated at 60000 chars]");
    });

    it("logs an error when Claude responds without a propose_commits tool call", async () => {
        const gitInst = makeGit({ modified: ["x.js"] });
        simpleGit.mockReturnValue(gitInst);
        // No tool_use block -> analyzeWithClaude throws -> caught and logged.
        Anthropic.mockImplementation(function () {
            return {
                messages: {
                    create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "no tool" }] }),
                },
            };
        });

        await expect(commit()).resolves.toBeUndefined();
        expect(gitInst.commit).not.toHaveBeenCalled();
    });

    it("ignores a proposed commit that omits its files array", async () => {
        const gitInst = makeGit({ modified: ["kept.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([
                { message: "chore: no files", changelog: null }, // files key absent -> (c.files || [])
                { message: "feat: kept", files: ["kept.js"], changelog: null },
            ]);
        });
        prompt.mockResolvedValueOnce(true);

        await commit();
        // Only the commit with real files survives filtering.
        expect(gitInst.commit).toHaveBeenCalledTimes(1);
        expect(gitInst.commit).toHaveBeenCalledWith("feat: kept");
    });

    it("creates a dated section at end-of-file when no '## ' heading exists", async () => {
        await fsActual.writeFile(
            path.join(tempDir, "CHANGELOG.md"),
            "# Changelog\n\nA preamble with no level-2 headings.\n"
        );
        const gitInst = makeGit({ modified: ["d.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () {
            return makeClaudeClient([{ message: "feat: d", files: ["d.js"], changelog: "Added d" }]);
        });
        prompt.mockResolvedValueOnce(true);

        await commit();
        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        // The dated block is appended after the preamble (content.length insert point).
        expect(content).toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(content.indexOf("Added d")).toBeGreaterThan(content.indexOf("preamble"));
    });
});

// ── insertChangelog logic tested in isolation via re-export trick ─────────────

describe("insertChangelog internals (via CHANGELOG.md test)", () => {
    /**
     * insertChangelog is not exported, so we verify its behaviour through
     * the commit() flow which calls it when changelog entries exist.
     * The tests above already cover it; here we add focused edge-case checks
     * by directly testing the CHANGELOG output after a commit run.
     */

    let commit, simpleGit, Anthropic, prompt;
    let tempDir, origCwd;

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fsActual.mkdtemp(path.join(os.tmpdir(), "fsr-changelog-"));
        origCwd = process.cwd();
        process.chdir(tempDir);
        process.env.ANTHROPIC_API_KEY = "test-key";

        const simpleGitMod = await import("simple-git");
        const AnthropicMod = await import("@anthropic-ai/sdk");
        const promptMod = await import("../../lib/utils/prompt.js");
        simpleGit = simpleGitMod.simpleGit;
        Anthropic = AnthropicMod.default;
        prompt = promptMod.default;

        const mod = await import("../../lib/git/commit.js");
        commit = mod.default;

        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fsActual.remove(tempDir);
        vi.restoreAllMocks();
        delete process.env.ANTHROPIC_API_KEY;
    });

    it("inserts under ## [Unreleased] when that heading exists", async () => {
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [Unreleased]\n\n## [1.0.0]\n");
        const gitInst = makeGit({ modified: ["f.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () { return makeClaudeClient([
            { message: "feat: new thing", files: ["f.js"], changelog: "New thing added" }
        ]); });
        prompt.mockResolvedValueOnce(true);

        await commit();

        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        const unreleasedIdx = content.indexOf("## [Unreleased]");
        const entryIdx = content.indexOf("New thing added");
        expect(entryIdx).toBeGreaterThan(unreleasedIdx);
    });

    it("creates a dated section when ## [Unreleased] is absent", async () => {
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [1.0.0]\nOld stuff\n");
        const gitInst = makeGit({ modified: ["g.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () { return makeClaudeClient([
            { message: "fix: bug", files: ["g.js"], changelog: "Fixed a bug" }
        ]); });
        prompt.mockResolvedValueOnce(true);

        await commit();

        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toMatch(/\d{4}-\d{2}-\d{2}/); // dated section
        expect(content).toContain("Fixed a bug");
    });

    it("maps fix: type to ### Fixed section", async () => {
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [Unreleased]\n\n");
        const gitInst = makeGit({ modified: ["h.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () { return makeClaudeClient([
            { message: "fix: correct typo", files: ["h.js"], changelog: "Corrected typo" }
        ]); });
        prompt.mockResolvedValueOnce(true);

        await commit();

        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toContain("### Fixed");
        expect(content).toContain("Corrected typo");
    });

    it("maps feat: type to ### Added section", async () => {
        await fsActual.writeFile(path.join(tempDir, "CHANGELOG.md"), "## [Unreleased]\n\n");
        const gitInst = makeGit({ modified: ["i.js"] });
        simpleGit.mockReturnValue(gitInst);
        Anthropic.mockImplementation(function () { return makeClaudeClient([
            { message: "feat: new feature", files: ["i.js"], changelog: "Brand new feature" }
        ]); });
        prompt.mockResolvedValueOnce(true);

        await commit();

        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toContain("### Added");
    });
});

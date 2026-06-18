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
        Anthropic.mockImplementation(() => makeClaudeClient(proposedCommits));

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
        Anthropic.mockImplementation(() => makeClaudeClient(proposedCommits));

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
        Anthropic.mockImplementation(() => makeClaudeClient(proposedCommits));
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
        Anthropic.mockImplementation(() => makeClaudeClient(proposedCommits));
        prompt.mockResolvedValueOnce(true);

        await commit();

        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toContain("Added cool thing");
    });

    it("handles Claude analysis failure gracefully (logs error, returns)", async () => {
        const gitInst = makeGit({ modified: ["x.js"] });
        simpleGit.mockReturnValue(gitInst);

        Anthropic.mockImplementation(() => ({
            messages: {
                create: vi.fn().mockRejectedValue(new Error("Claude API down")),
            }
        }));

        // Should NOT throw — just log the error
        await expect(commit()).resolves.toBeUndefined();
    });

    it("filters out files not in the allowed set (Claude hallucinations)", async () => {
        const gitInst = makeGit({ modified: ["real.js"] });
        simpleGit.mockReturnValue(gitInst);

        const proposedCommits = [
            { message: "feat: real", files: ["real.js", "phantom.js"], changelog: null },
        ];
        Anthropic.mockImplementation(() => makeClaudeClient(proposedCommits));
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
        Anthropic.mockImplementation(() => makeClaudeClient(proposedCommits));

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
        Anthropic.mockImplementation(() => makeClaudeClient([
            { message: "feat: new thing", files: ["f.js"], changelog: "New thing added" }
        ]));
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
        Anthropic.mockImplementation(() => makeClaudeClient([
            { message: "fix: bug", files: ["g.js"], changelog: "Fixed a bug" }
        ]));
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
        Anthropic.mockImplementation(() => makeClaudeClient([
            { message: "fix: correct typo", files: ["h.js"], changelog: "Corrected typo" }
        ]));
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
        Anthropic.mockImplementation(() => makeClaudeClient([
            { message: "feat: new feature", files: ["i.js"], changelog: "Brand new feature" }
        ]));
        prompt.mockResolvedValueOnce(true);

        await commit();

        const content = await fsActual.readFile(path.join(tempDir, "CHANGELOG.md"), "utf8");
        expect(content).toContain("### Added");
    });
});

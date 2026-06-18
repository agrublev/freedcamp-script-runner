/**
 * Tests for lib/git/validateNotDev.js
 *
 * validateNotInDev() (default export):
 *   - reads `simpleGit(cwd).status()`
 *   - if current branch === "Development": boxen-logs, waits 1000ms,
 *     prompts (inquirer) for a new branch name and, when name !== "Development",
 *     calls git.checkoutLocalBranch(name)
 *   - otherwise resolves immediately.
 *
 * NOTE: the source uses TWO simple-git references that we route to a single
 * shared instance: the module-level `simpleGit()` (named export, used by the
 * internal newBranch -> checkoutLocalBranch) and the dynamic default import
 * `git(cwd).status()`. Sharing one instance lets us assert both regardless of path.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Shared simple-git mocks (hoisted so the vi.mock factory can reference them).
const { statusMock, checkoutLocalBranchMock, gitFn, promptMock } = vi.hoisted(() => {
    const statusMock = vi.fn();
    const checkoutLocalBranchMock = vi.fn().mockResolvedValue(undefined);
    const gitInstance = { status: statusMock, checkoutLocalBranch: checkoutLocalBranchMock };
    const gitFn = vi.fn(() => gitInstance);
    const promptMock = vi.fn();
    return { statusMock, checkoutLocalBranchMock, gitFn, promptMock };
});

vi.mock("simple-git", () => ({ default: gitFn, simpleGit: gitFn }));
vi.mock("inquirer", () => ({ default: { prompt: promptMock } }));
vi.mock("boxen", () => ({ default: (str) => str }));
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("validateNotInDev", () => {
    let validateNotInDev;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.useFakeTimers();
        // console.clear() is called by the source; keep it a no-op so it does not
        // wipe the test runner output.
        vi.spyOn(console, "clear").mockImplementation(() => {});
        // checkoutLocalBranch must remain awaitable after clearAllMocks (clear keeps impl,
        // but be explicit in case it is reset elsewhere).
        checkoutLocalBranchMock.mockResolvedValue(undefined);
        const mod = await import("../../lib/git/validateNotDev.js");
        validateNotInDev = mod.default;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("resolves without prompting when current branch is not Development", async () => {
        statusMock.mockResolvedValue({ current: "main" });

        await validateNotInDev();

        expect(statusMock).toHaveBeenCalledTimes(1);
        expect(promptMock).not.toHaveBeenCalled();
        expect(checkoutLocalBranchMock).not.toHaveBeenCalled();
    });

    it("prompts and checks out the new branch when on Development", async () => {
        statusMock.mockResolvedValue({ current: "Development" });
        promptMock.mockResolvedValue({ branchname: "feature-x" });

        const p = validateNotInDev();
        // Advance past the 1000ms guard wait and flush the prompt/checkout microtasks.
        await vi.runAllTimersAsync();
        await p;

        expect(promptMock).toHaveBeenCalledTimes(1);
        expect(checkoutLocalBranchMock).toHaveBeenCalledTimes(1);
        expect(checkoutLocalBranchMock).toHaveBeenCalledWith("feature-x");
    });

    it("does not check out a branch when the entered name is Development", async () => {
        statusMock.mockResolvedValue({ current: "Development" });
        promptMock.mockResolvedValue({ branchname: "Development" });

        const p = validateNotInDev();
        await vi.runAllTimersAsync();
        await p;

        expect(promptMock).toHaveBeenCalledTimes(1);
        expect(checkoutLocalBranchMock).not.toHaveBeenCalled();
    });
});

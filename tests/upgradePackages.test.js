/**
 * Tests for lib/upgradePackages.js
 *
 * upgradePackages() (default export):
 *   - exits(1) when package.json is missing
 *   - for each of dependencies/devDependencies/peerDependencies present, runs
 *     `yarn add <pkg>@latest ...` via childProcess.execSync, excluding any package
 *     listed in fscripts["ignore-upgrade"]
 *   - re-reads package.json after each group to compute a before/after diff.
 *
 * `packagePath` is resolved from process.cwd() at import time, so we mock `fs`
 * (default import) rather than trying to change cwd.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { existsSyncMock, readFileSyncMock, execSyncMock, logMock } = vi.hoisted(() => ({
    existsSyncMock: vi.fn(),
    readFileSyncMock: vi.fn(),
    execSyncMock: vi.fn(),
    logMock: vi.fn(),
}));

vi.mock("fs", () => ({ default: { existsSync: existsSyncMock, readFileSync: readFileSyncMock } }));
vi.mock("child_process", () => ({ default: { execSync: execSyncMock } }));
vi.mock("../lib/utils/console.js", () => ({
    default: { log: logMock, info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("upgradePackages", () => {
    let upgradePackages;

    beforeEach(async () => {
        vi.resetModules();
        existsSyncMock.mockReset();
        readFileSyncMock.mockReset();
        execSyncMock.mockReset();
        logMock.mockClear();
        const mod = await import("../lib/upgradePackages.js");
        upgradePackages = mod.default;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("runs `yarn add <pkg>@latest` per group, excluding ignored packages", async () => {
        const pkgJson = {
            dependencies: { pkgA: "^1.0.0", pkgB: "^2.0.0" },
            devDependencies: { pkgC: "^3.0.0" },
            fscripts: { "ignore-upgrade": ["pkgA"] },
        };
        existsSyncMock.mockReturnValue(true);
        readFileSyncMock.mockReturnValue(JSON.stringify(pkgJson));

        await upgradePackages();

        const commands = execSyncMock.mock.calls.map((c) => c[0]);
        // dependencies group -> pkgA ignored, only pkgB upgraded.
        expect(commands).toContain("yarn add pkgB@latest");
        // devDependencies group -> pkgC upgraded.
        expect(commands).toContain("yarn add pkgC@latest");
        // No command references the ignored package.
        expect(commands.every((c) => !c.includes("pkgA"))).toBe(true);
        // peerDependencies absent -> only the two groups ran.
        expect(execSyncMock).toHaveBeenCalledTimes(2);
    });

    it("re-reads package.json after upgrade and reports the version diff", async () => {
        const before = {
            dependencies: { pkgB: "^2.0.0" },
            fscripts: { "ignore-upgrade": ["pkgA"] },
        };
        const after = {
            dependencies: { pkgB: "^2.5.0" },
            fscripts: { "ignore-upgrade": ["pkgA"] },
        };
        existsSyncMock.mockReturnValue(true);
        // 1st read = initial parse, 2nd read = post-upgrade diff read.
        readFileSyncMock
            .mockReturnValueOnce(JSON.stringify(before))
            .mockReturnValueOnce(JSON.stringify(after));

        await expect(upgradePackages()).resolves.toBeUndefined();

        expect(readFileSyncMock).toHaveBeenCalledTimes(2);
        // The diff line is emitted through the success logger.
        const logged = logMock.mock.calls.map((c) => c[0]).join("\n");
        expect(logged).toContain("Updated: pkgB");
        expect(logged).toContain("^2.0.0");
        expect(logged).toContain("^2.5.0");
    });

    it("exits(1) when package.json is missing", async () => {
        existsSyncMock.mockReturnValue(false);
        const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
            throw new Error(`exit:${code}`);
        });

        await expect(upgradePackages()).rejects.toThrow("exit:1");
        expect(exitSpy).toHaveBeenCalledWith(1);
        // Never attempted to read or install anything.
        expect(readFileSyncMock).not.toHaveBeenCalled();
        expect(execSyncMock).not.toHaveBeenCalled();
    });
});

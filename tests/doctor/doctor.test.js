/**
 * Tests for lib/doctor/doctor.js  (runDiagnostics + doctor default export)
 *
 * Every sub-check module is mocked so we can drive pass / warning / error /
 * fixable / throwing results for each branch of runDiagnostics without
 * touching the filesystem or spawning processes. doctor.js itself is NEVER
 * mocked — it calls its internal runDiagnostics directly, so module-level
 * mocking of the export cannot intercept it (and only contaminates the suite).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock every sub-check module ──────────────────────────────────────────────

vi.mock("../../lib/doctor/nodeVersion.js", () => ({
    checkNodeVersion: vi.fn(),
    default: vi.fn(),
}));
vi.mock("../../lib/doctor/packageManager.js", () => ({
    checkPackageManager: vi.fn(),
    default: vi.fn(),
}));
vi.mock("../../lib/doctor/gitCheck.js", () => ({
    checkGit: vi.fn(),
    default: vi.fn(),
}));
vi.mock("../../lib/doctor/fileSystem.js", () => ({
    checkFScriptsFile: vi.fn(),
    checkPackageJson: vi.fn(),
    checkFilePermissions: vi.fn(),
    default: {},
}));
vi.mock("../../lib/doctor/cache.js", () => ({
    checkCache: vi.fn(),
    default: vi.fn(),
}));
vi.mock("../../lib/doctor/performance.js", () => ({
    checkStartupTime: vi.fn(),
    checkMemoryUsage: vi.fn(),
    default: {},
}));

// ── Shared result builders ───────────────────────────────────────────────────

const PASS = (name = "test") => ({ name, passed: true, warning: false, message: `${name} OK` });
const WARN = (name = "test") => ({ name, passed: true, warning: true, message: `${name} warn` });
const FAIL = (name = "test", canFix = false) => ({
    name, passed: false, warning: false, message: `${name} fail`, canFix,
});
const FAIL_INSTRUCTIONS = (name = "test") => ({
    ...FAIL(name, false),
    fixInstructions: "Run npm install",
});

// All 9 checks pass (order matches the `checks` array in doctor.js)
const allPass = () => [
    PASS("nodeVersion"), PASS("packageManager"), PASS("git"),
    PASS("fscriptsFile"), PASS("packageJson"), PASS("filePermissions"),
    PASS("cache"), PASS("startupTime"), PASS("memoryUsage"),
];

async function setupMocks(results) {
    const nv = await import("../../lib/doctor/nodeVersion.js");
    const pm = await import("../../lib/doctor/packageManager.js");
    const git = await import("../../lib/doctor/gitCheck.js");
    const fs = await import("../../lib/doctor/fileSystem.js");
    const cache = await import("../../lib/doctor/cache.js");
    const perf = await import("../../lib/doctor/performance.js");

    const [r0, r1, r2, r3, r4, r5, r6, r7, r8] = results;
    nv.checkNodeVersion.mockResolvedValue(r0);
    pm.checkPackageManager.mockResolvedValue(r1);
    git.checkGit.mockResolvedValue(r2);
    fs.checkFScriptsFile.mockResolvedValue(r3);
    fs.checkPackageJson.mockResolvedValue(r4);
    fs.checkFilePermissions.mockResolvedValue(r5);
    cache.checkCache.mockResolvedValue(r6);
    perf.checkStartupTime.mockResolvedValue(r7);
    perf.checkMemoryUsage.mockResolvedValue(r8);
}

// ── runDiagnostics ────────────────────────────────────────────────────────────

describe("runDiagnostics", () => {
    let runDiagnostics;

    beforeEach(async () => {
        vi.resetModules();
        await setupMocks(allPass());
        const mod = await import("../../lib/doctor/doctor.js");
        runDiagnostics = mod.runDiagnostics;
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns passed:true and correct counts when all checks pass", async () => {
        const result = await runDiagnostics();
        expect(result.passed).toBe(true);
        expect(result.summary.passed).toBe(9);
        expect(result.summary.warnings).toBe(0);
        expect(result.summary.errors).toBe(0);
        expect(result.summary.fixed).toBe(0);
        expect(result.summary.total).toBe(9);
        expect(result.results).toHaveLength(9);
        // displaySummary ran (non-json) -> "Summary:" was logged
        const summaryLogged = console.log.mock.calls.some(
            (args) => typeof args[0] === "string" && args[0].includes("Summary:")
        );
        expect(summaryLogged).toBe(true);
    });

    it("counts warnings correctly (passed:true but warning:true)", async () => {
        await setupMocks([
            PASS("nodeVersion"), WARN("packageManager"), PASS("git"),
            PASS("fscriptsFile"), PASS("packageJson"), PASS("filePermissions"),
            PASS("cache"), PASS("startupTime"), PASS("memoryUsage"),
        ]);
        const result = await runDiagnostics();
        expect(result.summary.warnings).toBe(1);
        expect(result.summary.passed).toBe(8);
        expect(result.summary.errors).toBe(0);
        expect(result.passed).toBe(true);
    });

    it("counts errors, sets passed:false, and prints the issues summary (passed===0)", async () => {
        // Every check fails -> passedCount stays 0 (covers the `passed > 0` false branch)
        await setupMocks([
            FAIL("nodeVersion"), FAIL("packageManager"), FAIL("git"),
            FAIL("fscriptsFile"), FAIL("packageJson"), FAIL("filePermissions"),
            FAIL("cache"), FAIL("startupTime"), FAIL("memoryUsage"),
        ]);
        const result = await runDiagnostics();
        expect(result.summary.errors).toBe(9);
        expect(result.summary.passed).toBe(0);
        expect(result.passed).toBe(false);
    });

    it("auto-fixes a fixable failure when fix:true is passed", async () => {
        const fixFn = vi.fn().mockResolvedValue("fixed!");
        const fixable = { ...FAIL("fscriptsFile", true), fix: fixFn };
        await setupMocks([
            PASS("nodeVersion"), PASS("packageManager"), PASS("git"),
            fixable, PASS("packageJson"), PASS("filePermissions"),
            PASS("cache"), PASS("startupTime"), PASS("memoryUsage"),
        ]);
        const result = await runDiagnostics({ fix: true });
        expect(fixFn).toHaveBeenCalledOnce();
        expect(result.summary.fixed).toBe(1);
    });

    it("catches a fix() that throws without breaking the run", async () => {
        const fixFn = vi.fn().mockRejectedValue(new Error("fix exploded"));
        const fixable = { ...FAIL("cache", true), fix: fixFn };
        await setupMocks([
            PASS("nodeVersion"), PASS("packageManager"), PASS("git"),
            PASS("fscriptsFile"), PASS("packageJson"), PASS("filePermissions"),
            fixable, PASS("startupTime"), PASS("memoryUsage"),
        ]);
        const result = await runDiagnostics({ fix: true });
        expect(fixFn).toHaveBeenCalledOnce();
        expect(result.summary.fixed).toBe(0);
        expect(result.passed).toBe(false);
    });

    it("logs fix instructions for a non-fixable failure when fix is not requested", async () => {
        const withInstr = FAIL_INSTRUCTIONS("git");
        await setupMocks([
            PASS("nodeVersion"), PASS("packageManager"), withInstr,
            PASS("fscriptsFile"), PASS("packageJson"), PASS("filePermissions"),
            PASS("cache"), PASS("startupTime"), PASS("memoryUsage"),
        ]);
        await runDiagnostics({ fix: false });
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Run npm install")
        );
    });

    it("handles a check that throws an unhandled error gracefully", async () => {
        const nv = await import("../../lib/doctor/nodeVersion.js");
        nv.checkNodeVersion.mockRejectedValue(new Error("unexpected boom"));
        const result = await runDiagnostics();
        expect(result.summary.errors).toBeGreaterThanOrEqual(1);
        const bad = result.results.find((r) => r.error === "unexpected boom");
        expect(bad).toBeDefined();
        expect(bad.passed).toBe(false);
        expect(bad.name).toBe("nodeVersion");
    });

    it("skips the summary display in json mode but still returns the result", async () => {
        const result = await runDiagnostics({ json: true });
        expect(result).toHaveProperty("summary");
        // displaySummary is skipped -> "Summary:" never logged
        const summaryLogged = console.log.mock.calls.some(
            (args) => typeof args[0] === "string" && args[0].includes("Summary:")
        );
        expect(summaryLogged).toBe(false);
    });
});

// ── doctor() default export (CLI handler) ─────────────────────────────────────

describe("doctor() default export", () => {
    let doctor;
    let exitSpy;

    beforeEach(async () => {
        vi.resetModules();
        await setupMocks(allPass());
        const mod = await import("../../lib/doctor/doctor.js");
        doctor = mod.default;
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
        exitSpy = vi
            .spyOn(process, "exit")
            .mockImplementation(() => {
                throw new Error("process.exit");
            });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("resolves without exiting when all checks pass", async () => {
        await expect(doctor({ fix: false, json: false })).resolves.toBeUndefined();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("prints JSON output when json:true", async () => {
        await expect(doctor({ fix: false, json: true })).resolves.toBeUndefined();
        const jsonLogged = console.log.mock.calls.some(
            (args) => typeof args[0] === "string" && args[0].includes('"summary"')
        );
        expect(jsonLogged).toBe(true);
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("calls process.exit(1) on a critical failure", async () => {
        const nv = await import("../../lib/doctor/nodeVersion.js");
        // nodeVersion is critical:true
        nv.checkNodeVersion.mockResolvedValue({
            name: "Node.js version", passed: false, warning: false, message: "too old",
        });
        await expect(doctor({ fix: false, json: false })).rejects.toThrow("process.exit");
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("does NOT exit when only a non-critical check fails", async () => {
        const git = await import("../../lib/doctor/gitCheck.js");
        // git is critical:false
        git.checkGit.mockResolvedValue({
            name: "git", passed: false, warning: false, message: "no repo",
        });
        await expect(doctor({ fix: false, json: false })).resolves.toBeUndefined();
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it("enters the outer catch and prints the stack when verbose:true", async () => {
        // A malformed argv whose `fix` getter throws forces the outer try/catch.
        const argv = {
            verbose: true,
            get fix() {
                throw new Error("boom");
            },
        };
        await expect(doctor(argv)).rejects.toThrow("process.exit");
        expect(exitSpy).toHaveBeenCalledWith(1);
        // message + stack both logged via console.error
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("boom"));
        expect(console.error).toHaveBeenCalledTimes(2);
    });

    it("enters the outer catch without the stack when verbose is falsy", async () => {
        const argv = {
            get fix() {
                throw new Error("boom");
            },
        };
        await expect(doctor(argv)).rejects.toThrow("process.exit");
        expect(exitSpy).toHaveBeenCalledWith(1);
        // only the failure message line, no stack line
        expect(console.error).toHaveBeenCalledTimes(1);
    });
});

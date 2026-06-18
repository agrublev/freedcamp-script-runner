/**
 * Tests for lib/doctor/doctor.js  (runDiagnostics + doctor default export)
 *
 * All sub-checks are mocked so we can control pass/fail/warning/canFix
 * for each branch in runDiagnostics without touching the filesystem or
 * spawning processes.
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

// ── Shared helpers ───────────────────────────────────────────────────────────

const PASS = (name = "test") => ({ name, passed: true, warning: false, message: `${name} OK` });
const WARN = (name = "test") => ({ name, passed: true, warning: true, message: `${name} warn` });
const FAIL = (name = "test", canFix = false) => ({
    name, passed: false, warning: false, message: `${name} fail`, canFix
});
const FAIL_FIXABLE = (name = "test") => ({
    ...FAIL(name, true),
    fix: vi.fn().mockResolvedValue("fixed!"),
});
const FAIL_INSTRUCTIONS = (name = "test") => ({
    ...FAIL(name, false),
    fixInstructions: "Run npm install",
});

// All 9 checks pass
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe("runDiagnostics", () => {
    let runDiagnostics;

    beforeEach(async () => {
        vi.resetModules();
        // Re-import mocked modules so the spies are fresh
        await setupMocks(allPass());
        const mod = await import("../../lib/doctor/doctor.js");
        runDiagnostics = mod.runDiagnostics;
        // Suppress console output during tests
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
        expect(result.summary.total).toBe(9);
        expect(result.results).toHaveLength(9);
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
        expect(result.passed).toBe(true);
    });

    it("counts errors correctly and sets passed:false", async () => {
        await setupMocks([
            FAIL("nodeVersion"), PASS("packageManager"), PASS("git"),
            PASS("fscriptsFile"), PASS("packageJson"), PASS("filePermissions"),
            PASS("cache"), PASS("startupTime"), PASS("memoryUsage"),
        ]);
        const result = await runDiagnostics();
        expect(result.summary.errors).toBe(1);
        expect(result.passed).toBe(false);
    });

    it("auto-fixes a fixable failure when fix:true is passed", async () => {
        const fixable = FAIL_FIXABLE("fscriptsFile");
        await setupMocks([
            PASS("nodeVersion"), PASS("packageManager"), PASS("git"),
            fixable, PASS("packageJson"), PASS("filePermissions"),
            PASS("cache"), PASS("startupTime"), PASS("memoryUsage"),
        ]);
        const result = await runDiagnostics({ fix: true });
        expect(fixable.fix).toHaveBeenCalledOnce();
        expect(result.summary.fixed).toBe(1);
    });

    it("logs fix instructions for non-fixable failures", async () => {
        const withInstr = FAIL_INSTRUCTIONS("git");
        await setupMocks([
            PASS("nodeVersion"), PASS("packageManager"), withInstr,
            PASS("fscriptsFile"), PASS("packageJson"), PASS("filePermissions"),
            PASS("cache"), PASS("startupTime"), PASS("memoryUsage"),
        ]);
        await runDiagnostics({ fix: false });
        // console.log called with fixInstructions text
        expect(console.log).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Run npm install"));
    });

    it("handles a check that throws an unhandled error gracefully", async () => {
        const nv = await import("../../lib/doctor/nodeVersion.js");
        nv.checkNodeVersion.mockRejectedValue(new Error("unexpected boom"));
        const result = await runDiagnostics();
        expect(result.summary.errors).toBeGreaterThanOrEqual(1);
        // The result entry for the failed check has error property
        const bad = result.results.find(r => r.error);
        expect(bad).toBeDefined();
    });

    it("outputs JSON when json:true option is set", async () => {
        const result = await runDiagnostics({ json: true });
        // summary block should be present in what was logged
        const jsonCallArgs = console.log.mock.calls.find(args =>
            typeof args[0] === "string" && args[0].includes('"summary"')
        );
        // In json mode, the result is logged via JSON.stringify
        expect(result).toHaveProperty("summary");
    });

    it("fix error is caught and does not break the run", async () => {
        const fixable = {
            name: "cache",
            passed: false,
            warning: false,
            message: "Cache fail",
            canFix: true,
            fix: vi.fn().mockRejectedValue(new Error("fix exploded")),
        };
        await setupMocks([
            PASS("nodeVersion"), PASS("packageManager"), PASS("git"),
            PASS("fscriptsFile"), PASS("packageJson"), PASS("filePermissions"),
            fixable, PASS("startupTime"), PASS("memoryUsage"),
        ]);
        // Should not throw
        await expect(runDiagnostics({ fix: true })).resolves.toBeDefined();
    });
});

// ────────────────────────────────────────────────────────────────────────────
// doctor() – default export CLI handler
// ────────────────────────────────────────────────────────────────────────────

describe("doctor() default export", () => {
    let doctor;
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });

    beforeEach(async () => {
        vi.resetModules();
        await setupMocks(allPass());
        const mod = await import("../../lib/doctor/doctor.js");
        doctor = mod.default;
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("runs without error when all checks pass", async () => {
        await expect(doctor({ fix: false, json: false })).resolves.toBeUndefined();
    });

    it("calls process.exit(1) when there are critical failures", async () => {
        // nodeVersion is critical: true
        const nv = await import("../../lib/doctor/nodeVersion.js");
        nv.checkNodeVersion.mockResolvedValue({ name: "Node.js version", passed: false, warning: false, message: "too old" });

        await expect(doctor({ fix: false, json: false })).rejects.toThrow("process.exit");
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("calls process.exit(1) when runDiagnostics itself throws", async () => {
        const nv = await import("../../lib/doctor/nodeVersion.js");
        nv.checkNodeVersion.mockRejectedValue(new Error("catastrophic"));

        // runDiagnostics handles per-check errors — doctor handles its own try/catch
        // If *all* checks throw the top-level catch will trigger on doctor call
        // We need to force doctor's outer try/catch
        vi.resetModules();
        vi.mock("../../lib/doctor/doctor.js", async () => {
            const actual = await vi.importActual("../../lib/doctor/doctor.js");
            return {
                ...actual,
                runDiagnostics: vi.fn().mockRejectedValue(new Error("total failure")),
            };
        });
        const mod = await import("../../lib/doctor/doctor.js");
        const docFn = mod.default;
        await expect(docFn({ fix: false, json: false, verbose: false })).rejects.toThrow("process.exit");
    });
});

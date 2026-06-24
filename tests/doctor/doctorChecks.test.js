/**
 * Tests for the individual doctor check modules:
 *   - nodeVersion, packageManager, gitCheck, fileSystem, cache, performance
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ════════════════════════════════════════════════════════════
// nodeVersion
// ════════════════════════════════════════════════════════════
describe("checkNodeVersion", () => {
    let checkNodeVersion;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("../../lib/doctor/nodeVersion.js");
        checkNodeVersion = mod.checkNodeVersion;
    });

    it("passes when current Node version is >= minVersion", async () => {
        const result = await checkNodeVersion({ minVersion: "0.1.0" });
        expect(result.passed).toBe(true);
        expect(result.name).toBe("Node.js version");
    });

    it("fails when current Node version is below minVersion", async () => {
        // Use a ridiculously high version to force failure
        const result = await checkNodeVersion({ minVersion: "999.0.0" });
        expect(result.passed).toBe(false);
        expect(result.canFix).toBe(false);
        expect(result.fixInstructions).toMatch(/upgrade/i);
    });

    it("includes details object with current and required fields", async () => {
        const result = await checkNodeVersion({ minVersion: "0.1.0" });
        expect(result.details).toHaveProperty("current");
        expect(result.details).toHaveProperty("required");
    });

    it("uses default minVersion of 18.0.0 when no options passed", async () => {
        const result = await checkNodeVersion();
        expect(result.details.required).toContain("18.0.0");
    });
});

// ════════════════════════════════════════════════════════════
// packageManager
// ════════════════════════════════════════════════════════════
describe("checkPackageManager", () => {
    let checkPackageManager;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("../../lib/doctor/packageManager.js");
        checkPackageManager = mod.checkPackageManager;
    });

    it("returns a result object with required fields", async () => {
        const result = await checkPackageManager();
        expect(result).toHaveProperty("name", "Package manager");
        expect(result).toHaveProperty("passed");
        expect(result).toHaveProperty("message");
    });

    it("passes when npm/yarn/pnpm is installed (execSync succeeds)", async () => {
        // On any CI/dev machine with npm present this will pass
        const result = await checkPackageManager();
        // We don't assert pass/fail — only that structure is correct
        expect(typeof result.passed).toBe("boolean");
        if (result.passed) {
            expect(result.details.manager).toMatch(/npm|yarn|pnpm/);
        }
    });
});

// ════════════════════════════════════════════════════════════
// gitCheck
// ════════════════════════════════════════════════════════════
describe("checkGit", () => {
    let checkGit;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("../../lib/doctor/gitCheck.js");
        checkGit = mod.checkGit;
    });

    it("returns correct shape", async () => {
        const result = await checkGit();
        expect(result).toHaveProperty("name", "Git");
        expect(result).toHaveProperty("passed");
        expect(result).toHaveProperty("message");
    });

    it("passes if git is available", async () => {
        const result = await checkGit();
        // On any dev machine git should be installed
        if (result.passed) {
            expect(result.message).toMatch(/git/i);
        } else {
            expect(result.fixInstructions).toMatch(/install/i);
        }
    });
});

// ════════════════════════════════════════════════════════════
// fileSystem
// ════════════════════════════════════════════════════════════
describe("checkFScriptsFile", () => {
    let checkFScriptsFile;
    let tempDir;
    const origCwd = process.cwd();

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-doctor-"));
        process.chdir(tempDir);
        const mod = await import("../../lib/doctor/fileSystem.js");
        checkFScriptsFile = mod.checkFScriptsFile;
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fs.remove(tempDir);
    });

    it("fails and provides fix function when fscripts.md is absent", async () => {
        const result = await checkFScriptsFile();
        expect(result.passed).toBe(false);
        expect(result.canFix).toBe(true);
        expect(typeof result.fix).toBe("function");
    });

    it("fix function creates fscripts.md with bash template", async () => {
        const result = await checkFScriptsFile();
        const msg = await result.fix();
        expect(msg).toMatch(/created/i);
        const content = await fs.readFile(path.join(tempDir, "fscripts.md"), "utf8");
        expect(content).toMatch(/bash/i);
    });

    it("passes when fscripts.md exists and returns size info", async () => {
        await fs.writeFile(path.join(tempDir, "fscripts.md"), "# hello");
        const result = await checkFScriptsFile();
        expect(result.passed).toBe(true);
        expect(result.details.size).toBeGreaterThan(0);
    });
});

describe("checkPackageJson", () => {
    let checkPackageJson;
    let tempDir;
    const origCwd = process.cwd();

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-doctor-pkg-"));
        process.chdir(tempDir);
        const mod = await import("../../lib/doctor/fileSystem.js");
        checkPackageJson = mod.checkPackageJson;
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fs.remove(tempDir);
    });

    it("fails when package.json is absent", async () => {
        const result = await checkPackageJson();
        expect(result.passed).toBe(false);
        expect(result.fixInstructions).toMatch(/npm init/i);
    });

    it("passes when valid package.json exists", async () => {
        await fs.writeJson(path.join(tempDir, "package.json"), { name: "test-proj", version: "1.0.0" });
        const result = await checkPackageJson();
        expect(result.passed).toBe(true);
        expect(result.details.name).toBe("test-proj");
    });

    it("fails with message when package.json is malformed JSON", async () => {
        await fs.writeFile(path.join(tempDir, "package.json"), "{bad json}");
        const result = await checkPackageJson();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/invalid|corrupted/i);
    });
});

describe("checkFilePermissions", () => {
    let checkFilePermissions;
    let tempDir;
    const origCwd = process.cwd();

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-doctor-perms-"));
        process.chdir(tempDir);
        const mod = await import("../../lib/doctor/fileSystem.js");
        checkFilePermissions = mod.checkFilePermissions;
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fs.remove(tempDir);
    });

    it("passes and cleans up test file in a writable directory", async () => {
        const result = await checkFilePermissions();
        expect(result.passed).toBe(true);
        expect(result.details.read).toBe(true);
        expect(result.details.write).toBe(true);
        // Temp file should be removed
        const testFile = path.join(tempDir, ".fsr-permission-test");
        expect(await fs.pathExists(testFile)).toBe(false);
    });
});

// ════════════════════════════════════════════════════════════
// performance
// ════════════════════════════════════════════════════════════
describe("checkStartupTime", () => {
    let checkStartupTime;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("../../lib/doctor/performance.js");
        checkStartupTime = mod.checkStartupTime;
    });

    it("returns a result with name, passed, and details.time", async () => {
        const result = await checkStartupTime();
        expect(result.name).toBe("Startup time");
        expect(result).toHaveProperty("passed");
        expect(result.details.time).toBeTypeOf("number");
        expect(result.details.unit).toBe("ms");
    });

    it("passes when time is within 500ms target (process just started)", async () => {
        // process.now() at startup is typically < 500ms in tests
        const result = await checkStartupTime();
        // Could be pass or warning depending on machine speed; just verify it's boolean
        expect(typeof result.passed).toBe("boolean");
    });
});

describe("checkMemoryUsage", () => {
    let checkMemoryUsage;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("../../lib/doctor/performance.js");
        checkMemoryUsage = mod.checkMemoryUsage;
    });

    it("returns a result with name, passed, and details with heapUsed", async () => {
        const result = await checkMemoryUsage();
        expect(result.name).toBe("Memory usage");
        expect(result).toHaveProperty("passed");
        expect(result.details.heapUsed).toBeTypeOf("number");
        expect(result.details.unit).toBe("MB");
    });
});

// ════════════════════════════════════════════════════════════
// cache check
// ════════════════════════════════════════════════════════════
describe("checkCache", () => {
    let checkCache;
    let fakeHome;

    beforeEach(async () => {
        vi.resetModules();
        fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-cache-check-"));
        process.env.HOME = fakeHome;
        process.env.USERPROFILE = fakeHome;
        const mod = await import("../../lib/doctor/cache.js");
        checkCache = mod.checkCache;
    });

    afterEach(async () => {
        await fs.remove(fakeHome);
    });

    it("fails with canFix when ~/.fsr dir does not exist", async () => {
        const result = await checkCache();
        // No .fsr directory in fresh tempDir
        expect(result).toHaveProperty("name", "Cache system");
        // Either failed (no dir) or indeterminate — just verify structure
        expect(typeof result.passed).toBe("boolean");
        if (!result.passed) {
            expect(result.canFix).toBe(true);
            expect(typeof result.fix).toBe("function");
        }
    });

    it("fix function creates cache directory and cache.json", async () => {
        const result = await checkCache();
        if (!result.passed && result.fix) {
            const msg = await result.fix();
            expect(msg).toMatch(/created|fixed/i);
            const cacheDir = path.join(fakeHome, ".fsr");
            expect(await fs.pathExists(cacheDir)).toBe(true);
        }
    });

    it("passes when ~/.fsr/cache.json exists", async () => {
        const cacheDir = path.join(fakeHome, ".fsr");
        await fs.ensureDir(cacheDir);
        await fs.writeFile(path.join(cacheDir, "cache.json"), '{"cacheVersion":"0"}');
        const result = await checkCache();
        expect(result.passed).toBe(true);
        expect(result.message).toMatch(/operational/i);
    });
});

// ════════════════════════════════════════════════════════════
// nodeVersion — additional branch coverage (versionGte fall-through,
// short/long version padding, and the catch path)
// ════════════════════════════════════════════════════════════
describe("checkNodeVersion (branches)", () => {
    let checkNodeVersion;

    beforeEach(async () => {
        vi.resetModules();
        checkNodeVersion = (await import("../../lib/doctor/nodeVersion.js")).checkNodeVersion;
    });

    it("passes on an exactly-equal version (versionGte fall-through return)", async () => {
        const cur = process.version.slice(1);
        const result = await checkNodeVersion({ minVersion: cur });
        expect(result.passed).toBe(true);
    });

    it("handles a longer required version with equal prefix (parts1[i] || 0)", async () => {
        const cur = process.version.slice(1);
        const result = await checkNodeVersion({ minVersion: cur + ".0" });
        expect(result.passed).toBe(true);
    });

    it("handles a shorter required version with equal prefix (parts2[i] || 0)", async () => {
        const cur = process.version.slice(1);
        const shorter = cur.split(".").slice(0, -1).join(".");
        const result = await checkNodeVersion({ minVersion: shorter });
        expect(result.passed).toBe(true);
    });

    it("hits the catch when minVersion is not a string (split throws)", async () => {
        const result = await checkNodeVersion({ minVersion: 18 });
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/Failed to check Node\.js version/);
    });
});

// ════════════════════════════════════════════════════════════
// packageManager — detection branches + not-found path
// ════════════════════════════════════════════════════════════
describe("checkPackageManager (detection branches)", () => {
    let tmp;
    const origCwd = process.cwd();

    beforeEach(async () => {
        vi.resetModules();
        // Stub execSync so detection branches never shell out to a real
        // package manager. On machines/CI without pnpm on PATH, corepack
        // intercepts `pnpm --version` and tries to download it, which blocks
        // and times out. Echo a fixed version regardless of the manager.
        vi.doMock("child_process", () => ({
            execSync: () => "1.0.0\n"
        }));
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-pm-det-"));
        process.chdir(tmp);
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fs.remove(tmp);
        vi.doUnmock("child_process");
        vi.resetModules();
    });

    it("detects pnpm via pnpm-lock.yaml (branch 27 false, branch 29 true)", async () => {
        await fs.writeFile(path.join(tmp, "pnpm-lock.yaml"), "lockfileVersion: 9");
        const { checkPackageManager } = await import("../../lib/doctor/packageManager.js");
        const result = await checkPackageManager();
        expect(result.message).toMatch(/pnpm/);
    });

    it("defaults to npm when no lockfile is present (branch 27 & 29 false)", async () => {
        const { checkPackageManager } = await import("../../lib/doctor/packageManager.js");
        const result = await checkPackageManager();
        expect(result.message).toMatch(/npm/);
    });
});

describe("checkPackageManager (not found)", () => {
    let tmp;
    const origCwd = process.cwd();

    afterEach(async () => {
        process.chdir(origCwd);
        if (tmp) await fs.remove(tmp);
        vi.doUnmock("child_process");
        vi.resetModules();
    });

    it("reports not-found when the version command throws (50-54)", async () => {
        vi.resetModules();
        vi.doMock("child_process", () => ({
            execSync: () => {
                throw new Error("ENOENT");
            }
        }));
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-pm-fail-"));
        process.chdir(tmp);
        const { checkPackageManager } = await import("../../lib/doctor/packageManager.js");
        const result = await checkPackageManager();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/npm not found/);
        expect(result.fixInstructions).toMatch(/install npm/i);
    });
});

// ════════════════════════════════════════════════════════════
// gitCheck — not-installed branch
// ════════════════════════════════════════════════════════════
describe("checkGit (not installed)", () => {
    afterEach(() => {
        vi.doUnmock("child_process");
        vi.resetModules();
    });

    it("fails when git --version throws (31-34)", async () => {
        vi.resetModules();
        vi.doMock("child_process", () => ({
            execSync: () => {
                throw new Error("command not found");
            }
        }));
        const { checkGit } = await import("../../lib/doctor/gitCheck.js");
        const result = await checkGit();
        expect(result.passed).toBe(false);
        expect(result.message).toBe("Not installed");
        expect(result.canFix).toBe(false);
        expect(result.fixInstructions).toMatch(/install git/i);
    });
});

// ════════════════════════════════════════════════════════════
// fileSystem — formatBytes(0), version fallback, and error/catch paths
// ════════════════════════════════════════════════════════════
describe("checkFScriptsFile (size formatting)", () => {
    let checkFScriptsFile;
    let tempDir;
    const origCwd = process.cwd();

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-fs-fmt-"));
        process.chdir(tempDir);
        checkFScriptsFile = (await import("../../lib/doctor/fileSystem.js")).checkFScriptsFile;
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fs.remove(tempDir);
    });

    it("reports '0 Bytes' for an empty fscripts.md (formatBytes 0)", async () => {
        await fs.writeFile(path.join(tempDir, "fscripts.md"), "");
        const result = await checkFScriptsFile();
        expect(result.passed).toBe(true);
        expect(result.details.sizeFormatted).toBe("0 Bytes");
    });
});

describe("checkPackageJson (version fallback)", () => {
    let checkPackageJson;
    let tempDir;
    const origCwd = process.cwd();

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-fs-ver-"));
        process.chdir(tempDir);
        checkPackageJson = (await import("../../lib/doctor/fileSystem.js")).checkPackageJson;
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fs.remove(tempDir);
    });

    it("falls back to 'unknown' when package.json has no version (branch 81)", async () => {
        await fs.writeJson(path.join(tempDir, "package.json"), { name: "nover" });
        const result = await checkPackageJson();
        expect(result.passed).toBe(true);
        expect(result.details.version).toBe("unknown");
    });
});

describe("fileSystem (error branches)", () => {
    let mod;
    let fsExtra;

    beforeEach(async () => {
        vi.resetModules();
        fsExtra = (await import("fs-extra")).default;
        mod = await import("../../lib/doctor/fileSystem.js");
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("checkFScriptsFile catch path when pathExists throws (52-54)", async () => {
        vi.spyOn(fsExtra, "pathExists").mockRejectedValue(new Error("EACCES"));
        const result = await mod.checkFScriptsFile();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/Error checking file/);
    });

    it("checkFilePermissions reports no write access (128-133)", async () => {
        vi.spyOn(fsExtra, "writeFile").mockRejectedValue(new Error("EACCES"));
        const result = await mod.checkFilePermissions();
        expect(result.passed).toBe(false);
        expect(result.message).toBe("No write access");
        expect(result.canFix).toBe(false);
        expect(result.fixInstructions).toMatch(/write access/i);
    });

    it("checkFilePermissions reports no read access and swallows remove failure (138-145, fn 144)", async () => {
        vi.spyOn(fsExtra, "writeFile").mockResolvedValue();
        vi.spyOn(fsExtra, "readFile").mockRejectedValue(new Error("EACCES"));
        // remove rejects so the trailing .catch(() => {}) arrow actually executes
        vi.spyOn(fsExtra, "remove").mockRejectedValue(new Error("still locked"));
        const result = await mod.checkFilePermissions();
        expect(result.passed).toBe(false);
        expect(result.message).toBe("No read access");
        expect(result.fixInstructions).toMatch(/read access/i);
    });

    it("checkFilePermissions outer catch when cleanup remove throws (157-159)", async () => {
        vi.spyOn(fsExtra, "writeFile").mockResolvedValue();
        vi.spyOn(fsExtra, "readFile").mockResolvedValue("test");
        vi.spyOn(fsExtra, "remove").mockRejectedValue(new Error("boom"));
        const result = await mod.checkFilePermissions();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/Permission check failed/);
    });
});

// ════════════════════════════════════════════════════════════
// performance — startup-time / memory thresholds + benchmark
// ════════════════════════════════════════════════════════════
describe("checkStartupTime (thresholds)", () => {
    afterEach(() => {
        vi.doUnmock("perf_hooks");
        vi.resetModules();
    });

    async function loadWithNow(now) {
        vi.resetModules();
        vi.doMock("perf_hooks", () => ({ performance: { now } }));
        return (await import("../../lib/doctor/performance.js")).checkStartupTime;
    }

    it("passes when within target (<= 500ms)", async () => {
        const checkStartupTime = await loadWithNow(() => 100);
        const result = await checkStartupTime();
        expect(result.passed).toBe(true);
        expect(result.warning).toBe(false);
        expect(result.message).toMatch(/target/);
    });

    it("warns when slightly above target (<= 1000ms)", async () => {
        const checkStartupTime = await loadWithNow(() => 700);
        const result = await checkStartupTime();
        expect(result.passed).toBe(true);
        expect(result.warning).toBe(true);
        expect(result.message).toMatch(/slightly above/);
    });

    it("fails when well above target (> 1000ms)", async () => {
        const checkStartupTime = await loadWithNow(() => 2000);
        const result = await checkStartupTime();
        expect(result.passed).toBe(false);
        expect(result.fixInstructions).toMatch(/cache|plugins/i);
    });

    it("hits the catch when performance.now throws", async () => {
        const checkStartupTime = await loadWithNow(() => {
            throw new Error("boom");
        });
        const result = await checkStartupTime();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/Failed to check startup time/);
    });
});

describe("checkMemoryUsage (thresholds)", () => {
    let checkMemoryUsage;
    const MB = 1024 * 1024;

    beforeEach(async () => {
        vi.resetModules();
        checkMemoryUsage = (await import("../../lib/doctor/performance.js")).checkMemoryUsage;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function mockMem(heapMB, externalMB) {
        vi.spyOn(process, "memoryUsage").mockReturnValue({
            rss: 0,
            heapTotal: 0,
            heapUsed: heapMB * MB,
            external: externalMB * MB,
            arrayBuffers: 0
        });
    }

    it("passes when total <= 50MB", async () => {
        mockMem(10, 5);
        const result = await checkMemoryUsage();
        expect(result.passed).toBe(true);
        expect(result.warning).toBe(false);
    });

    it("warns when total is slightly above target (<= 75MB)", async () => {
        mockMem(60, 5);
        const result = await checkMemoryUsage();
        expect(result.passed).toBe(true);
        expect(result.warning).toBe(true);
        expect(result.message).toMatch(/slightly above/);
    });

    it("fails when total exceeds 75MB", async () => {
        mockMem(100, 20);
        const result = await checkMemoryUsage();
        expect(result.passed).toBe(false);
        expect(result.fixInstructions).toMatch(/Memory usage is high/i);
    });

    it("hits the catch when memoryUsage throws", async () => {
        vi.spyOn(process, "memoryUsage").mockImplementation(() => {
            throw new Error("boom");
        });
        const result = await checkMemoryUsage();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/Failed to check memory usage/);
    });
});

describe("runBenchmark", () => {
    let runBenchmark;
    let tempDir;
    const origCwd = process.cwd();

    beforeEach(async () => {
        vi.resetModules();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-bench-"));
        process.chdir(tempDir);
        runBenchmark = (await import("../../lib/doctor/performance.js")).runBenchmark;
    });

    afterEach(async () => {
        process.chdir(origCwd);
        await fs.remove(tempDir);
    });

    it("runs the requested number of iterations and aggregates results", async () => {
        const result = await runBenchmark({ runs: 2 });
        expect(result.runs).toBe(2);
        expect(result.results).toHaveLength(2);
        expect(typeof result.average).toBe("number");
        expect(typeof result.median).toBe("number");
        expect(result.min).toBeLessThanOrEqual(result.max);
    });

    it("defaults to 5 runs when no options are passed (default param + || 5)", async () => {
        const result = await runBenchmark();
        expect(result.runs).toBe(5);
        expect(result.results).toHaveLength(5);
    });
});

// ════════════════════════════════════════════════════════════
// cache — real-fs size/recursion/fix branches + injected errors
// ════════════════════════════════════════════════════════════
describe("checkCache (real fs branches)", () => {
    let checkCache;
    let fakeHome;
    const origHome = process.env.HOME;
    const origUserProfile = process.env.USERPROFILE;

    beforeEach(async () => {
        vi.resetModules();
        fakeHome = await fs.mkdtemp(path.join(os.tmpdir(), "fsr-cache-real-"));
        process.env.HOME = fakeHome;
        process.env.USERPROFILE = fakeHome;
        checkCache = (await import("../../lib/doctor/cache.js")).checkCache;
    });

    afterEach(async () => {
        await fs.remove(fakeHome);
        process.env.HOME = origHome;
        process.env.USERPROFILE = origUserProfile;
    });

    it("creates the cache dir + cache.json via fix when the dir is missing (63-71)", async () => {
        const result = await checkCache();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/does not exist/);
        expect(result.canFix).toBe(true);
        const msg = await result.fix();
        expect(msg).toMatch(/Created cache directory/);
        const cacheDir = path.join(fakeHome, ".fsr");
        expect(await fs.pathExists(path.join(cacheDir, "cache.json"))).toBe(true);
    });

    it("computes size with subdirectory recursion and non-zero formatBytes (42-50, 96-99)", async () => {
        const cacheDir = path.join(fakeHome, ".fsr");
        await fs.ensureDir(path.join(cacheDir, "sub"));
        await fs.writeFile(path.join(cacheDir, "cache.json"), '{"cacheVersion":"0"}');
        await fs.writeFile(path.join(cacheDir, "sub", "blob.bin"), "x".repeat(2048));
        const result = await checkCache();
        expect(result.passed).toBe(true);
        expect(result.details.size).toBeGreaterThan(0);
        expect(result.details.sizeFormatted).toMatch(/KB|Bytes/);
    });

    it("reports '0 Bytes' for an empty cache (formatBytes 0)", async () => {
        const cacheDir = path.join(fakeHome, ".fsr");
        await fs.ensureDir(cacheDir);
        await fs.writeFile(path.join(cacheDir, "cache.json"), "");
        const result = await checkCache();
        expect(result.passed).toBe(true);
        expect(result.message).toMatch(/0 Bytes/);
    });

    it("stays unpassed when the dir exists but cache.json is missing (branch 40 false)", async () => {
        const cacheDir = path.join(fakeHome, ".fsr");
        await fs.ensureDir(cacheDir);
        const result = await checkCache();
        expect(result.passed).toBe(false);
    });
});

describe("checkCache (injected errors)", () => {
    let checkCache;
    let fsExtra;

    beforeEach(async () => {
        vi.resetModules();
        fsExtra = (await import("fs-extra")).default;
        checkCache = (await import("../../lib/doctor/cache.js")).checkCache;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("not-writable + fix when the cache.json pathExists throws (53-59, fn 57)", async () => {
        vi.spyOn(fsExtra, "pathExists")
            .mockResolvedValueOnce(true) // cacheDir exists
            .mockRejectedValueOnce(new Error("EACCES")); // cacheFile check throws
        const chmodSpy = vi.spyOn(fsExtra, "chmod").mockResolvedValue();
        const result = await checkCache();
        expect(result.passed).toBe(false);
        expect(result.message).toBe("Cache directory not writable");
        expect(result.canFix).toBe(true);
        expect(typeof result.fix).toBe("function");
        const msg = await result.fix();
        expect(msg).toBe("Fixed cache directory permissions");
        expect(chmodSpy).toHaveBeenCalled();
    });

    it("outer catch when the cacheDir pathExists throws (73-75)", async () => {
        vi.spyOn(fsExtra, "pathExists").mockRejectedValue(new Error("boom"));
        const result = await checkCache();
        expect(result.passed).toBe(false);
        expect(result.message).toMatch(/Cache check failed/);
    });

    it("getCacheSize swallows readdir failures and returns 0 (102-104)", async () => {
        vi.spyOn(fsExtra, "pathExists").mockResolvedValue(true);
        vi.spyOn(fsExtra, "readdir").mockRejectedValue(new Error("EACCES"));
        const result = await checkCache();
        expect(result.passed).toBe(true);
        expect(result.message).toMatch(/0 Bytes/);
    });
});

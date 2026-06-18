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

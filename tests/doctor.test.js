import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkNodeVersion } from '../lib/diagnostics/nodeVersion.js';
import { checkPackageManager } from '../lib/diagnostics/packageManager.js';
import { checkGit } from '../lib/diagnostics/gitCheck.js';
import {
    checkFScriptsFile,
    checkPackageJson,
    checkTypeScript,
    checkFilePermissions
} from '../lib/diagnostics/fileSystem.js';
import { checkCache } from '../lib/diagnostics/cache.js';
import { checkStartupTime, checkMemoryUsage } from '../lib/diagnostics/performance.js';

describe('Doctor Command - Diagnostics', () => {
    describe('checkNodeVersion', () => {
        it('should pass with Node.js >= 18.0.0', async () => {
            const result = await checkNodeVersion({ minVersion: '18.0.0' });

            expect(result).toHaveProperty('name', 'Node.js version');
            expect(result).toHaveProperty('passed');
            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('details');

            // Current Node version should be >= 18.0.0
            const currentVersion = process.version.replace('v', '');
            expect(result.details.current).toBe(currentVersion);
        });

        it('should have correct structure', async () => {
            const result = await checkNodeVersion();

            expect(result).toMatchObject({
                name: expect.any(String),
                passed: expect.any(Boolean),
                warning: expect.any(Boolean),
                message: expect.any(String),
                details: expect.any(Object),
                canFix: expect.any(Boolean)
            });
        });
    });

    describe('checkPackageManager', () => {
        it('should detect package manager', async () => {
            const result = await checkPackageManager();

            expect(result).toHaveProperty('name', 'Package manager');
            expect(result).toHaveProperty('passed');
            expect(result).toHaveProperty('message');

            if (result.passed) {
                expect(result.details).toHaveProperty('manager');
                expect(result.details).toHaveProperty('version');
                expect(['npm', 'yarn', 'pnpm']).toContain(result.details.manager);
            }
        });
    });

    describe('checkGit', () => {
        it('should detect Git installation', async () => {
            const result = await checkGit();

            expect(result).toHaveProperty('name', 'Git');
            expect(result).toHaveProperty('passed');
            expect(result).toHaveProperty('message');
        });
    });

    describe('checkFScriptsFile', () => {
        it('should check for fscripts.md', async () => {
            const result = await checkFScriptsFile();

            expect(result).toHaveProperty('name', 'fscripts.md file');
            expect(result).toHaveProperty('passed');
            expect(result).toHaveProperty('canFix', true);

            if (result.passed) {
                expect(result.details).toHaveProperty('path');
                expect(result.details).toHaveProperty('size');
                expect(result.details).toHaveProperty('sizeFormatted');
            } else {
                expect(result).toHaveProperty('fix');
            }
        });
    });

    describe('checkPackageJson', () => {
        it('should detect package.json', async () => {
            const result = await checkPackageJson();

            expect(result).toHaveProperty('name', 'package.json');
            expect(result).toHaveProperty('passed');

            if (result.passed) {
                expect(result.details).toHaveProperty('version');
                expect(result.details).toHaveProperty('name');
            }
        });
    });

    describe('checkTypeScript', () => {
        it('should check TypeScript installation', async () => {
            const result = await checkTypeScript();

            expect(result).toHaveProperty('name', 'TypeScript');
            expect(result).toHaveProperty('warning', true); // TypeScript is optional
            expect(result).toHaveProperty('canFix', true);
        });
    });

    describe('checkFilePermissions', () => {
        it('should verify read/write permissions', async () => {
            const result = await checkFilePermissions();

            expect(result).toHaveProperty('name', 'File permissions');
            expect(result).toHaveProperty('passed');

            if (result.passed) {
                expect(result.details).toMatchObject({
                    read: true,
                    write: true
                });
            }
        });
    });

    describe('checkCache', () => {
        it('should check cache system', async () => {
            const result = await checkCache();

            expect(result).toHaveProperty('name', 'Cache system');
            expect(result).toHaveProperty('canFix', true);

            if (!result.passed && result.fix) {
                // Test that fix function exists
                expect(result.fix).toBeTypeOf('function');
            }
        });
    });

    describe('checkStartupTime', () => {
        it('should measure startup time', async () => {
            const result = await checkStartupTime();

            expect(result).toHaveProperty('name', 'Startup time');
            expect(result.details).toHaveProperty('time');
            expect(result.details).toHaveProperty('target', 50);
            expect(result.details).toHaveProperty('unit', 'ms');
        });
    });

    describe('checkMemoryUsage', () => {
        it('should measure memory usage', async () => {
            const result = await checkMemoryUsage();

            expect(result).toHaveProperty('name', 'Memory usage');
            expect(result.details).toHaveProperty('heapUsed');
            expect(result.details).toHaveProperty('external');
            expect(result.details).toHaveProperty('total');
            expect(result.details).toHaveProperty('unit', 'MB');
            expect(result.details.total).toBeGreaterThan(0);
        });

        it('should have reasonable memory usage', async () => {
            const result = await checkMemoryUsage();

            // Memory usage should be less than 200MB (reasonable limit)
            expect(result.details.total).toBeLessThan(200);
        });
    });
});

describe('Doctor Command - Integration', () => {
    it('all checks should return consistent structure', async () => {
        const checks = [
            checkNodeVersion,
            checkPackageManager,
            checkGit,
            checkFScriptsFile,
            checkPackageJson,
            checkTypeScript,
            checkFilePermissions,
            checkCache,
            checkStartupTime,
            checkMemoryUsage
        ];

        for (const check of checks) {
            const result = await check();

            // All checks must return these fields
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('passed');
            expect(result).toHaveProperty('warning');
            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('details');
            expect(result).toHaveProperty('canFix');

            // Types must be correct
            expect(typeof result.name).toBe('string');
            expect(typeof result.passed).toBe('boolean');
            expect(typeof result.warning).toBe('boolean');
            expect(typeof result.message).toBe('string');
            expect(typeof result.details).toBe('object');
            expect(typeof result.canFix).toBe('boolean');
        }
    });

    it('should have at least some passing checks', async () => {
        const checks = [
            checkNodeVersion,
            checkPackageManager,
            checkFilePermissions,
            checkMemoryUsage
        ];

        const results = await Promise.all(checks.map((check) => check()));
        const passedCount = results.filter((r) => r.passed).length;

        // At least Node.js and memory checks should pass
        expect(passedCount).toBeGreaterThanOrEqual(2);
    });
});

describe('Version Comparison', () => {
    it('should correctly compare semantic versions', async () => {
        // Test with a very old version
        const oldResult = await checkNodeVersion({ minVersion: '0.10.0' });
        expect(oldResult.passed).toBe(true);

        // Current version check
        const currentResult = await checkNodeVersion({ minVersion: '18.0.0' });
        expect(currentResult).toHaveProperty('passed');
    });
});

describe('Auto-fix Capabilities', () => {
    it('cache check should provide fix function', async () => {
        const result = await checkCache();

        if (!result.passed && result.canFix) {
            expect(result.fix).toBeTypeOf('function');
        }
    });

    it('fscripts file check should provide fix function', async () => {
        const result = await checkFScriptsFile();

        if (!result.passed && result.canFix) {
            expect(result.fix).toBeTypeOf('function');
        }
    });
});

describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
        // All checks should not throw errors
        const checks = [
            checkNodeVersion,
            checkPackageManager,
            checkGit,
            checkFScriptsFile,
            checkPackageJson,
            checkTypeScript,
            checkFilePermissions,
            checkCache,
            checkStartupTime,
            checkMemoryUsage
        ];

        for (const check of checks) {
            await expect(check()).resolves.toBeDefined();
        }
    });
});

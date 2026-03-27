/**
 * Integration Tests for CLI Workflows
 *
 * Tests complete user workflows from command input to execution.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runFsr, createTempDir, sampleFscriptsContent } from '../helpers/test-utils.js';
import fs from 'fs-extra';
import path from 'path';

describe('CLI Workflows Integration', () => {
    let tempDir;
    let originalCwd;

    beforeEach(async () => {
        originalCwd = process.cwd();
        tempDir = await createTempDir();
        process.chdir(tempDir.path);

        // Create a test fscripts.md file
        await fs.writeFile(
            path.join(tempDir.path, 'fscripts.md'),
            sampleFscriptsContent
        );

        // Create a test package.json
        await fs.writeFile(
            path.join(tempDir.path, 'package.json'),
            JSON.stringify({
                name: 'test-project',
                version: '1.0.0',
                scripts: {
                    test: 'echo "testing"'
                }
            }, null, 2)
        );
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await tempDir.cleanup();
    });

    describe('Run Command Workflow', () => {
        it('should execute a simple bash task end-to-end', async () => {
            const result = await runFsr('run', ['echo:test'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('TEST_OUTPUT');
        });

        it('should execute JavaScript task', async () => {
            const result = await runFsr('run', ['dev:start'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Development server started');
        });

        it('should handle task with environment variables', async () => {
            const result = await runFsr('run', ['env:test'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('hello');
        });

        it('should fail gracefully for non-existent task', async () => {
            const result = await runFsr('run', ['nonexistent:task'], {
                cwd: tempDir.path
            });

            const output = result.stdout + result.stderr;
            expect(output).toContain('Task not found');
        });
    });

    describe('Sequential Execution Workflow', () => {
        it('should run multiple tasks in sequence', async () => {
            const startTime = Date.now();
            const result = await runFsr('run-s', ['echo:test', 'sleep:short'], {
                cwd: tempDir.path,
                timeout: 15000
            });
            const duration = Date.now() - startTime;

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('TEST_OUTPUT');
            expect(result.stdout).toContain('DONE');
            // Should take at least 1 second due to sleep
            expect(duration).toBeGreaterThan(900);
        });

        it('should execute tasks in correct order', async () => {
            const result = await runFsr('run-s', ['build:index', 'build:lib'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);

            // Check order by looking at stdout
            const indexPos = result.stdout.indexOf('build:index');
            const libPos = result.stdout.indexOf('build:lib');

            expect(indexPos).toBeGreaterThan(-1);
            expect(libPos).toBeGreaterThan(-1);
            expect(indexPos).toBeLessThan(libPos);
        });

        it('should continue with remaining tasks even if one fails', async () => {
            const result = await runFsr('run-s', ['echo:test', 'nonexistent', 'echo:test'], {
                cwd: tempDir.path
            });

            // Should complete successfully despite error
            expect(result.stdout).toContain('TEST_OUTPUT');
        });
    });

    describe('Parallel Execution Workflow', () => {
        it('should run multiple tasks in parallel', async () => {
            const startTime = Date.now();
            const result = await runFsr('run-p', ['sleep:short', 'echo:test', 'sleep:short'], {
                cwd: tempDir.path,
                timeout: 15000
            });
            const duration = Date.now() - startTime;

            expect(result.exitCode).toBe(0);

            // Parallel execution should be faster than sequential
            // 2x sleep:short (1s each) should take ~1s, not 2s
            expect(duration).toBeLessThan(2500);
        });

        it('should execute all tasks even if they take different times', async () => {
            const result = await runFsr('run-p', ['echo:test', 'sleep:short', 'dev:start'], {
                cwd: tempDir.path,
                timeout: 15000
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('TEST_OUTPUT');
            expect(result.stdout).toContain('Development server started');
        });
    });

    describe('Generate Command Workflow', () => {
        it('should generate sample fscripts.md from package.json', async () => {
            // Remove existing fscripts.md
            await fs.remove(path.join(tempDir.path, 'fscripts.md'));

            const result = await runFsr('generate', [], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);

            // Check if sample file was created
            const samplePath = path.join(tempDir.path, 'sample.fscripts.md');
            const exists = await fs.pathExists(samplePath);
            expect(exists).toBe(true);

            if (exists) {
                const content = await fs.readFile(samplePath, 'utf-8');
                expect(content).toContain('# ');
                expect(content).toContain('```bash');

                // Clean up
                await fs.remove(samplePath);
            }
        });
    });

    describe('TOC Generation Workflow', () => {
        it('should generate and update table of contents', async () => {
            const result = await runFsr('toc', ['fscripts.md'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);

            const content = await fs.readFile(
                path.join(tempDir.path, 'fscripts.md'),
                'utf-8'
            );

            expect(content).toContain('<!-- end toc -->');
            expect(content).toContain('[Build Scripts]');
            expect(content).toContain('[Test Scripts]');
        });

        it('should update existing TOC without duplicating', async () => {
            // First generation
            await runFsr('toc', ['fscripts.md'], { cwd: tempDir.path });
            const firstContent = await fs.readFile(
                path.join(tempDir.path, 'fscripts.md'),
                'utf-8'
            );

            // Second generation
            await runFsr('toc', ['fscripts.md'], { cwd: tempDir.path });
            const secondContent = await fs.readFile(
                path.join(tempDir.path, 'fscripts.md'),
                'utf-8'
            );

            // Should have only one TOC marker
            const tocCount = (secondContent.match(/<!-- end toc -->/g) || []).length;
            expect(tocCount).toBe(1);
        });
    });

    describe('Mixed Language Tasks', () => {
        it('should handle both bash and JavaScript tasks in sequence', async () => {
            const result = await runFsr('run-s', ['echo:test', 'dev:start', 'echo:test'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('TEST_OUTPUT');
            expect(result.stdout).toContain('Development server started');
        });

        it('should handle both bash and JavaScript tasks in parallel', async () => {
            const result = await runFsr('run-p', ['echo:test', 'dev:start'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('TEST_OUTPUT');
            expect(result.stdout).toContain('Development server started');
        });
    });

    describe('Error Recovery', () => {
        it('should handle missing fscripts.md gracefully', async () => {
            await fs.remove(path.join(tempDir.path, 'fscripts.md'));

            const result = await runFsr('run', ['test:task'], {
                cwd: tempDir.path
            });

            // Should not crash, but should indicate error
            expect(result.exitCode).toBe(0);
        });

        it('should handle corrupted fscripts.md', async () => {
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                'Invalid markdown content without proper structure'
            );

            const result = await runFsr('run', ['test:task'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
        });
    });

    describe('Complex Real-World Scenarios', () => {
        it('should handle a typical development workflow', async () => {
            // Simulating: clean -> build -> test
            const result = await runFsr('run-s', ['dev:clean', 'build:index', 'test:unit'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
        });

        it('should handle parallel build tasks', async () => {
            // Simulating: build index and lib in parallel
            const startTime = Date.now();
            const result = await runFsr('run-p', ['build:index', 'build:lib'], {
                cwd: tempDir.path
            });
            const duration = Date.now() - startTime;

            expect(result.exitCode).toBe(0);
            // Parallel should be faster than sequential
            expect(duration).toBeLessThan(5000);
        });

        it('should handle watch mode simulation', async () => {
            // Run test:watch would normally run indefinitely, but our test version exits
            const result = await runFsr('run', ['test:watch'], {
                cwd: tempDir.path,
                timeout: 5000
            });

            expect(result.exitCode).toBe(0);
        });
    });

    describe('Environment Isolation', () => {
        it('should not pollute parent process environment', async () => {
            const beforeEnv = { ...process.env };

            await runFsr('run', ['env:test'], {
                cwd: tempDir.path
            });

            const afterEnv = { ...process.env };

            // Environment should remain unchanged
            expect(afterEnv).toEqual(beforeEnv);
        });

        it('should pass custom environment variables to child processes', async () => {
            const result = await runFsr('run', ['env:test'], {
                cwd: tempDir.path,
                env: { ...process.env, CUSTOM_VAR: 'custom_value' }
            });

            expect(result.exitCode).toBe(0);
        });
    });

    describe('Output Handling', () => {
        it('should capture stdout from tasks', async () => {
            const result = await runFsr('run', ['echo:test'], {
                cwd: tempDir.path
            });

            expect(result.stdout).toBeDefined();
            expect(result.stdout.length).toBeGreaterThan(0);
        });

        it('should capture stderr from failed tasks', async () => {
            // Create a task that writes to stderr
            const errorTaskContent = sampleFscriptsContent + `\n\n# Error Tasks\n\n## error:task\n\n\`\`\`bash\necho "error" >&2\n\`\`\`\n`;
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                errorTaskContent
            );

            const result = await runFsr('run', ['error:task'], {
                cwd: tempDir.path
            });

            expect(result.stderr || result.stdout).toContain('error');
        });
    });
});

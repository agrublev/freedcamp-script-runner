/**
 * Performance Benchmarks for FSCR v7.0.0
 *
 * Measures startup time, execution time, and memory usage.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runFsr, createTempDir, sampleFscriptsContent } from '../helpers/test-utils.js';
import fs from 'fs-extra';
import path from 'path';
import { execaNode } from 'execa';

describe('Performance Benchmarks', () => {
    let tempDir;
    let originalCwd;

    beforeEach(async () => {
        originalCwd = process.cwd();
        tempDir = await createTempDir();
        process.chdir(tempDir.path);

        await fs.writeFile(
            path.join(tempDir.path, 'fscripts.md'),
            sampleFscriptsContent
        );
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await tempDir.cleanup();
    });

    describe('Startup Performance', () => {
        it('should start CLI in under 2 seconds', async () => {
            const startTime = Date.now();

            await runFsr('run', ['echo:test'], {
                cwd: tempDir.path,
                timeout: 5000
            });

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(2000);
            console.log(`CLI startup time: ${duration}ms`);
        });

        it('should parse fscripts.md quickly', async () => {
            // Create a large fscripts.md
            let largeFscripts = '';
            for (let i = 0; i < 50; i++) {
                largeFscripts += `# Category ${i}\n\n`;
                for (let j = 0; j < 10; j++) {
                    largeFscripts += `## task:${i}:${j}\n\n\`\`\`bash\necho "test"\n\`\`\`\n\n`;
                }
            }

            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                largeFscripts
            );

            const startTime = Date.now();

            await runFsr('run', ['task:0:0'], {
                cwd: tempDir.path,
                timeout: 10000
            });

            const duration = Date.now() - startTime;

            // Should handle 500 tasks efficiently
            expect(duration).toBeLessThan(5000);
            console.log(`Parse time for 500 tasks: ${duration}ms`);
        });
    });

    describe('Execution Performance', () => {
        it('should execute simple bash commands quickly', async () => {
            const iterations = 5;
            const times = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();

                await runFsr('run', ['echo:test'], {
                    cwd: tempDir.path
                });

                times.push(Date.now() - startTime);
            }

            const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
            const maxTime = Math.max(...times);

            expect(avgTime).toBeLessThan(1000);
            expect(maxTime).toBeLessThan(1500);

            console.log(`Average execution time: ${avgTime.toFixed(2)}ms`);
            console.log(`Max execution time: ${maxTime}ms`);
        });

        it('should execute JavaScript tasks quickly', async () => {
            const startTime = Date.now();

            await runFsr('run', ['dev:start'], {
                cwd: tempDir.path
            });

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(1000);
            console.log(`JavaScript task execution: ${duration}ms`);
        });

        it('should handle parallel execution efficiently', async () => {
            const startTime = Date.now();

            await runFsr('run-p', ['echo:test', 'echo:test', 'echo:test'], {
                cwd: tempDir.path
            });

            const duration = Date.now() - startTime;

            // Parallel execution should not be much slower than single execution
            expect(duration).toBeLessThan(2000);
            console.log(`Parallel execution (3 tasks): ${duration}ms`);
        });

        it('should scale well with many sequential tasks', async () => {
            const startTime = Date.now();

            // 5 sequential tasks
            await runFsr('run-s', [
                'echo:test',
                'echo:test',
                'echo:test',
                'echo:test',
                'echo:test'
            ], {
                cwd: tempDir.path,
                timeout: 10000
            });

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(5000);
            console.log(`Sequential execution (5 tasks): ${duration}ms`);
        });
    });

    describe('Memory Usage', () => {
        it('should not leak memory during task execution', async () => {
            if (global.gc) {
                global.gc();
            }

            const initialMemory = process.memoryUsage().heapUsed;

            // Run 10 tasks
            for (let i = 0; i < 10; i++) {
                await runFsr('run', ['echo:test'], {
                    cwd: tempDir.path
                });
            }

            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // Memory increase should be reasonable (< 50MB)
            const increaseMB = memoryIncrease / 1024 / 1024;
            expect(increaseMB).toBeLessThan(50);

            console.log(`Memory increase after 10 tasks: ${increaseMB.toFixed(2)}MB`);
        });

        it('should handle large fscripts.md without excessive memory', async () => {
            // Create a very large fscripts.md (1000 tasks)
            let hugeFscripts = '';
            for (let i = 0; i < 100; i++) {
                hugeFscripts += `# Category ${i}\n\n`;
                for (let j = 0; j < 10; j++) {
                    hugeFscripts += `## task:${i}:${j}\n\nTask description\n\n\`\`\`bash\necho "test ${i}:${j}"\n\`\`\`\n\n`;
                }
            }

            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                hugeFscripts
            );

            if (global.gc) {
                global.gc();
            }

            const initialMemory = process.memoryUsage().heapUsed;

            await runFsr('run', ['task:0:0'], {
                cwd: tempDir.path,
                timeout: 10000
            });

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

            expect(memoryIncrease).toBeLessThan(100);
            console.log(`Memory for 1000 task file: ${memoryIncrease.toFixed(2)}MB`);
        });
    });

    describe('TOC Generation Performance', () => {
        it('should generate TOC quickly for medium-sized files', async () => {
            const startTime = Date.now();

            await runFsr('toc', [], {
                cwd: tempDir.path
            });

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(2000);
            console.log(`TOC generation time: ${duration}ms`);
        });

        it('should handle large files efficiently', async () => {
            // Create large file with 100 categories
            let largeFscripts = '';
            for (let i = 0; i < 100; i++) {
                largeFscripts += `# Category ${i}\n\n`;
                for (let j = 0; j < 5; j++) {
                    largeFscripts += `## task:${i}:${j}\n\n\`\`\`bash\necho "test"\n\`\`\`\n\n`;
                }
            }

            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                largeFscripts
            );

            const startTime = Date.now();

            await runFsr('toc', [], {
                cwd: tempDir.path,
                timeout: 10000
            });

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(5000);
            console.log(`TOC generation for 500 tasks: ${duration}ms`);
        });
    });

    describe('File I/O Performance', () => {
        it('should read fscripts.md efficiently', async () => {
            const iterations = 10;
            const times = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();

                await runFsr('run', ['echo:test'], {
                    cwd: tempDir.path
                });

                times.push(Date.now() - startTime);
            }

            const avgTime = times.reduce((a, b) => a + b, 0) / iterations;

            // Subsequent reads should be fast (caching)
            const laterTimes = times.slice(5);
            const avgLaterTime = laterTimes.reduce((a, b) => a + b, 0) / laterTimes.length;

            console.log(`First 5 reads avg: ${(times.slice(0, 5).reduce((a, b) => a + b, 0) / 5).toFixed(2)}ms`);
            console.log(`Last 5 reads avg: ${avgLaterTime.toFixed(2)}ms`);
        });
    });

    describe('Comparative Performance', () => {
        it('should show parallel is faster than sequential for I/O tasks', async () => {
            // Sequential
            const seqStart = Date.now();
            await runFsr('run-s', ['sleep:short', 'sleep:short'], {
                cwd: tempDir.path,
                timeout: 15000
            });
            const seqDuration = Date.now() - seqStart;

            // Parallel
            const parStart = Date.now();
            await runFsr('run-p', ['sleep:short', 'sleep:short'], {
                cwd: tempDir.path,
                timeout: 15000
            });
            const parDuration = Date.now() - parStart;

            console.log(`Sequential (2x sleep 1s): ${seqDuration}ms`);
            console.log(`Parallel (2x sleep 1s): ${parDuration}ms`);
            console.log(`Speedup: ${(seqDuration / parDuration).toFixed(2)}x`);

            // Parallel should be at least 1.5x faster
            expect(parDuration).toBeLessThan(seqDuration * 0.7);
        });
    });

    describe('Scalability Metrics', () => {
        it('should provide metrics for different task counts', async () => {
            const taskCounts = [1, 5, 10];
            const results = {};

            for (const count of taskCounts) {
                const tasks = Array(count).fill('echo:test');
                const startTime = Date.now();

                await runFsr('run-s', tasks, {
                    cwd: tempDir.path,
                    timeout: 20000
                });

                const duration = Date.now() - startTime;
                results[count] = duration;

                console.log(`${count} tasks: ${duration}ms (${(duration / count).toFixed(2)}ms per task)`);
            }

            // Check linear scalability (within reason)
            const perTaskTime1 = results[1] / 1;
            const perTaskTime10 = results[10] / 10;

            // Per-task overhead shouldn't increase dramatically
            expect(perTaskTime10).toBeLessThan(perTaskTime1 * 2);
        });
    });

    describe('Bundle Size Tracking', () => {
        it('should track CLI bundle size', async () => {
            const distPath = path.join(process.cwd(), 'dist', 'index.js');

            if (await fs.pathExists(distPath)) {
                const stats = await fs.stat(distPath);
                const sizeKB = stats.size / 1024;

                console.log(`CLI bundle size: ${sizeKB.toFixed(2)}KB`);

                // Bundle should be reasonably sized (< 500KB)
                expect(sizeKB).toBeLessThan(500);
            }
        });

        it('should track total dist size', async () => {
            const distPath = path.join(process.cwd(), 'dist');

            if (await fs.pathExists(distPath)) {
                const files = await fs.readdir(distPath, { withFileTypes: true, recursive: true });
                let totalSize = 0;

                for (const file of files) {
                    if (file.isFile()) {
                        const filePath = path.join(distPath, file.name);
                        const stats = await fs.stat(filePath);
                        totalSize += stats.size;
                    }
                }

                const sizeMB = totalSize / 1024 / 1024;
                console.log(`Total dist size: ${sizeMB.toFixed(2)}MB`);

                // Total dist should be reasonable (< 5MB)
                expect(sizeMB).toBeLessThan(5);
            }
        });
    });
});

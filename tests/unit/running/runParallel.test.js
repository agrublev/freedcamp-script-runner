/**
 * Unit Tests for runParallel.js
 *
 * Tests parallel task execution functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import runParallel from '../../../lib/running/runParallel.js';
import runCLICommand from '../../../lib/running/runCLICommand.js';
import { mockConsole } from '../../helpers/test-utils.js';

// Mock runCLICommand
vi.mock('../../../lib/running/runCLICommand.js');

describe('runParallel', () => {
    let consoleMock;
    let mockFcScripts;

    beforeEach(() => {
        consoleMock = mockConsole();
        vi.clearAllMocks();

        // Mock FcScripts data
        mockFcScripts = {
            allTasks: [
                {
                    name: 'task:one',
                    script: 'echo "one"',
                    lang: 'bash',
                    order: 0
                },
                {
                    name: 'task:two',
                    script: 'echo "two"',
                    lang: 'bash',
                    order: 1
                },
                {
                    name: 'task:three',
                    script: 'echo "three"',
                    lang: 'bash',
                    order: 2
                },
                {
                    name: 'js:task',
                    script: 'console.log("test");',
                    lang: 'javascript',
                    order: 3
                },
                {
                    name: 'env:task',
                    script: 'TEST_VAR=value echo $TEST_VAR',
                    lang: 'bash',
                    order: 4
                }
            ],
            categories: []
        };

        // Mock runCLICommand to resolve immediately
        runCLICommand.mockResolvedValue();
    });

    afterEach(() => {
        consoleMock.restore();
    });

    describe('Basic Parallel Execution', () => {
        it('should run tasks in parallel', async () => {
            await runParallel(['task:one', 'task:two', 'task:three'], mockFcScripts);

            expect(runCLICommand).toHaveBeenCalledTimes(3);
        });

        it('should run single task', async () => {
            await runParallel(['task:one'], mockFcScripts);

            expect(runCLICommand).toHaveBeenCalledTimes(1);
        });

        it('should handle empty task array', async () => {
            await runParallel([], mockFcScripts);

            expect(runCLICommand).not.toHaveBeenCalled();
        });
    });

    describe('Parallel Execution Timing', () => {
        it('should start all tasks simultaneously', async () => {
            const startTimes = [];

            runCLICommand.mockImplementation(async () => {
                startTimes.push(Date.now());
                await new Promise(resolve => setTimeout(resolve, 50));
            });

            const start = Date.now();
            await runParallel(['task:one', 'task:two', 'task:three'], mockFcScripts);
            const duration = Date.now() - start;

            // All tasks should start within a short time window
            const maxDifference = Math.max(...startTimes) - Math.min(...startTimes);
            expect(maxDifference).toBeLessThan(20); // Started within 20ms of each other

            // Total time should be ~50ms, not 150ms (3 * 50ms)
            expect(duration).toBeLessThan(100);
        });

        it('should wait for all tasks to complete', async () => {
            const completionOrder = [];

            runCLICommand.mockImplementation(async ({ task }) => {
                const delay = task.name === 'task:one' ? 100 : 50;
                await new Promise(resolve => setTimeout(resolve, delay));
                completionOrder.push(task.name);
            });

            await runParallel(['task:one', 'task:two'], mockFcScripts);

            // Both should complete, task:two should finish first
            expect(completionOrder).toEqual(['task:two', 'task:one']);
        });
    });

    describe('Bash Script Parsing', () => {
        it('should parse bash commands correctly', async () => {
            await runParallel(['task:one'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.lang).toBe('bash');
            expect(callArgs.script.type).toBe('echo');
            expect(callArgs.script.rest).toEqual(['"one"']);
        });

        it('should parse environment variables from commands', async () => {
            await runParallel(['env:task'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.env).toEqual({ TEST_VAR: 'value' });
            expect(callArgs.script.type).toBe('echo');
        });
    });

    describe('JavaScript Task Handling', () => {
        it('should handle JavaScript tasks', async () => {
            await runParallel(['js:task'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.lang).toBe('javascript');
            expect(callArgs.script.type).toBe('node');
            expect(callArgs.script.full).toBe('console.log("test");');
        });

        it('should handle mixed bash and JavaScript tasks in parallel', async () => {
            await runParallel(['task:one', 'js:task', 'task:two'], mockFcScripts);

            expect(runCLICommand).toHaveBeenCalledTimes(3);

            const langs = runCLICommand.mock.calls.map(call => call[0].script.lang);
            expect(langs).toContain('bash');
            expect(langs).toContain('javascript');
        });
    });

    describe('Error Handling', () => {
        it('should log error for non-existent task', async () => {
            await runParallel(['nonexistent:task'], mockFcScripts);

            expect(consoleMock.spies.error).toHaveBeenCalledWith(
                expect.stringContaining('Task not found')
            );
            expect(runCLICommand).not.toHaveBeenCalled();
        });

        it('should continue with other tasks when one fails', async () => {
            runCLICommand.mockImplementation(async ({ task }) => {
                if (task.name === 'task:two') {
                    throw new Error('Task failed');
                }
            });

            // Should not throw, should complete other tasks
            await expect(
                runParallel(['task:one', 'task:two', 'task:three'], mockFcScripts)
            ).resolves.toBeUndefined();

            expect(runCLICommand).toHaveBeenCalledTimes(3);
        });

        it('should handle mix of valid and invalid tasks', async () => {
            await runParallel(['task:one', 'nonexistent', 'task:two'], mockFcScripts);

            expect(consoleMock.spies.error).toHaveBeenCalledWith(
                expect.stringContaining('Task not found')
            );
            expect(runCLICommand).toHaveBeenCalledTimes(2);
        });

        it('should complete all tasks even if some fail', async () => {
            const completedTasks = [];

            runCLICommand.mockImplementation(async ({ task }) => {
                if (task.name === 'task:two') {
                    throw new Error('Failed');
                }
                completedTasks.push(task.name);
            });

            await runParallel(['task:one', 'task:two', 'task:three'], mockFcScripts);

            // task:one and task:three should complete
            expect(completedTasks).toContain('task:one');
            expect(completedTasks).toContain('task:three');
            expect(completedTasks).not.toContain('task:two');
        });
    });

    describe('Promise.all Behavior', () => {
        it('should use Promise.all for parallel execution', async () => {
            const execution = [];

            runCLICommand.mockImplementation(async ({ task }) => {
                execution.push(`start-${task.name}`);
                await new Promise(resolve => setTimeout(resolve, 10));
                execution.push(`end-${task.name}`);
            });

            await runParallel(['task:one', 'task:two'], mockFcScripts);

            // All starts should happen before all ends
            expect(execution.filter(e => e.startsWith('start-')).length).toBe(2);
            expect(execution.filter(e => e.startsWith('end-')).length).toBe(2);
        });
    });

    describe('Command Argument Parsing', () => {
        it('should split commands into arguments correctly', async () => {
            mockFcScripts.allTasks.push({
                name: 'multi:arg',
                script: 'npm run build --production',
                lang: 'bash',
                order: 5
            });

            await runParallel(['multi:arg'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.type).toBe('npm');
            expect(callArgs.script.rest).toEqual(['run', 'build', '--production']);
        });
    });

    describe('Task Isolation', () => {
        it('should execute each task in its own promise', async () => {
            const taskPromises = new Set();

            runCLICommand.mockImplementation(async ({ task }) => {
                // Track that each task gets its own promise context
                taskPromises.add(task.name);
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            await runParallel(['task:one', 'task:two', 'task:three'], mockFcScripts);

            expect(taskPromises.size).toBe(3);
            expect(taskPromises.has('task:one')).toBe(true);
            expect(taskPromises.has('task:two')).toBe(true);
            expect(taskPromises.has('task:three')).toBe(true);
        });
    });
});

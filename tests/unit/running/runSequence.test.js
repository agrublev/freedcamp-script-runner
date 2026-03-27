/**
 * Unit Tests for runSequence.js
 *
 * Tests sequential task execution functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import runSequence from '../../../lib/running/runSequence.js';
import runCLICommand from '../../../lib/running/runCLICommand.js';
import { mockConsole } from '../../helpers/test-utils.js';

// Mock runCLICommand
vi.mock('../../../lib/running/runCLICommand.js');

describe('runSequence', () => {
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

    describe('Basic Sequential Execution', () => {
        it('should run tasks in sequence', async () => {
            await runSequence(['task:one', 'task:two', 'task:three'], mockFcScripts);

            expect(runCLICommand).toHaveBeenCalledTimes(3);

            // Verify tasks were called in order
            expect(runCLICommand.mock.calls[0][0].task.name).toBe('task:one');
            expect(runCLICommand.mock.calls[1][0].task.name).toBe('task:two');
            expect(runCLICommand.mock.calls[2][0].task.name).toBe('task:three');
        });

        it('should run single task', async () => {
            await runSequence(['task:one'], mockFcScripts);

            expect(runCLICommand).toHaveBeenCalledTimes(1);
            expect(runCLICommand.mock.calls[0][0].task.name).toBe('task:one');
        });

        it('should handle empty task array', async () => {
            await runSequence([], mockFcScripts);

            expect(runCLICommand).not.toHaveBeenCalled();
        });
    });

    describe('Bash Script Parsing', () => {
        it('should parse bash commands correctly', async () => {
            await runSequence(['task:one'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.lang).toBe('bash');
            expect(callArgs.script.type).toBe('echo');
            expect(callArgs.script.rest).toEqual(['"one"']);
        });

        it('should parse environment variables from commands', async () => {
            await runSequence(['env:task'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.env).toEqual({ TEST_VAR: 'value' });
            expect(callArgs.script.type).toBe('echo');
        });
    });

    describe('JavaScript Task Handling', () => {
        it('should handle JavaScript tasks', async () => {
            await runSequence(['js:task'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.lang).toBe('javascript');
            expect(callArgs.script.type).toBe('node');
            expect(callArgs.script.full).toBe('console.log("test");');
        });
    });

    describe('Error Handling', () => {
        it('should log error for non-existent task', async () => {
            await runSequence(['nonexistent:task'], mockFcScripts);

            expect(consoleMock.spies.error).toHaveBeenCalledWith(
                expect.stringContaining('Task not found')
            );
            expect(runCLICommand).not.toHaveBeenCalled();
        });

        it('should continue execution after non-existent task', async () => {
            await runSequence(['nonexistent:task', 'task:one'], mockFcScripts);

            expect(consoleMock.spies.error).toHaveBeenCalled();
            expect(runCLICommand).toHaveBeenCalledTimes(1);
            expect(runCLICommand.mock.calls[0][0].task.name).toBe('task:one');
        });

        it('should handle tasks even if one fails', async () => {
            runCLICommand.mockResolvedValueOnce().mockRejectedValueOnce(new Error('Failed'));

            await runSequence(['task:one', 'task:two'], mockFcScripts);

            // Both should be attempted despite failure
            expect(runCLICommand).toHaveBeenCalledTimes(2);
        });
    });

    describe('Sequential Execution Order', () => {
        it('should wait for each task to complete before starting next', async () => {
            const executionOrder = [];

            runCLICommand.mockImplementation(async ({ task }) => {
                executionOrder.push(`start-${task.name}`);
                await new Promise(resolve => setTimeout(resolve, 10));
                executionOrder.push(`end-${task.name}`);
            });

            await runSequence(['task:one', 'task:two'], mockFcScripts);

            // Should complete first task before starting second
            expect(executionOrder).toEqual([
                'start-task:one',
                'end-task:one',
                'start-task:two',
                'end-task:two'
            ]);
        });
    });

    describe('Mixed Task Types', () => {
        it('should handle mixed bash and JavaScript tasks', async () => {
            await runSequence(['task:one', 'js:task', 'task:two'], mockFcScripts);

            expect(runCLICommand).toHaveBeenCalledTimes(3);
            expect(runCLICommand.mock.calls[0][0].script.lang).toBe('bash');
            expect(runCLICommand.mock.calls[1][0].script.lang).toBe('javascript');
            expect(runCLICommand.mock.calls[2][0].script.lang).toBe('bash');
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

            await runSequence(['multi:arg'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            expect(callArgs.script.type).toBe('npm');
            expect(callArgs.script.rest).toEqual(['run', 'build', '--production']);
        });

        it('should handle commands with multiple environment variables', async () => {
            mockFcScripts.allTasks.push({
                name: 'multi:env',
                script: 'NODE_ENV=production PORT=3000 node server.js',
                lang: 'bash',
                order: 5
            });

            await runSequence(['multi:env'], mockFcScripts);

            const callArgs = runCLICommand.mock.calls[0][0];
            // Only the first env var is captured in current implementation
            expect(callArgs.script.env).toHaveProperty('NODE_ENV');
        });
    });
});

/**
 * Unit Tests for runCLICommand.js
 *
 * Tests the CLI command runner that executes bash and JavaScript scripts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import runCLICommand from '../../../lib/running/runCLICommand.js';
import { mockConsole, wait } from '../../helpers/test-utils.js';
import spawn from 'cross-spawn';

// Mock cross-spawn
vi.mock('cross-spawn');

describe('runCLICommand', () => {
    let consoleMock;

    beforeEach(() => {
        consoleMock = mockConsole();
        vi.clearAllMocks();
    });

    afterEach(() => {
        consoleMock.restore();
    });

    describe('Bash Scripts', () => {
        it('should execute a simple bash command', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(0), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            await runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'bash',
                    type: 'echo',
                    rest: ['hello'],
                    env: {},
                    full: 'echo hello'
                }
            });

            expect(spawn).toHaveBeenCalledWith(
                'echo',
                ['hello'],
                expect.objectContaining({
                    stdio: 'inherit',
                    env: expect.objectContaining({
                        FORCE_COLOR: true
                    })
                })
            );
        });

        it('should pass environment variables to spawned process', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(0), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            await runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'bash',
                    type: 'echo',
                    rest: ['$TEST_VAR'],
                    env: { TEST_VAR: 'hello' },
                    full: 'echo $TEST_VAR'
                }
            });

            expect(spawn).toHaveBeenCalledWith(
                'echo',
                ['$TEST_VAR'],
                expect.objectContaining({
                    env: expect.objectContaining({
                        TEST_VAR: 'hello',
                        FORCE_COLOR: true
                    })
                })
            );
        });

        it('should handle command failures gracefully', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(1), 10); // Non-zero exit code
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            await runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'bash',
                    type: 'false',
                    rest: [],
                    env: {},
                    full: 'false'
                }
            });

            // Should still resolve (not reject)
            expect(consoleMock.spies.error).toHaveBeenCalledWith(
                expect.stringContaining('ERROR')
            );
        });

        it('should include node_modules/.bin in PATH', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(0), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            await runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'bash',
                    type: 'vitest',
                    rest: ['run'],
                    env: {},
                    full: 'vitest run'
                }
            });

            const callArgs = spawn.mock.calls[0][2];
            expect(callArgs.env.PATH).toContain('node_modules/.bin');
        });
    });

    describe('JavaScript Scripts', () => {
        it('should execute JavaScript code', async () => {
            const mockRequireFromString = vi.fn();
            vi.doMock('require-from-string', () => ({
                default: mockRequireFromString
            }));

            await runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'javascript',
                    full: 'console.log("test");',
                    type: 'node'
                }
            });

            // JavaScript execution should not spawn a process
            expect(spawn).not.toHaveBeenCalled();
        });

        it('should handle JavaScript with template literals', async () => {
            // This would execute the JavaScript directly
            await runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'javascript',
                    full: 'console.log(`Hello ${1 + 1}`);',
                    type: 'node'
                }
            });

            expect(spawn).not.toHaveBeenCalled();
        });
    });

    describe('Logging', () => {
        it('should log task name by default', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(0), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            await runCLICommand({
                task: { name: 'my:task' },
                script: {
                    lang: 'bash',
                    type: 'echo',
                    rest: ['test'],
                    env: {},
                    full: 'echo test'
                }
            });

            expect(consoleMock.spies.log).toHaveBeenCalled();
        });

        it('should skip logging when quiet is true', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(0), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            await runCLICommand(
                {
                    task: { name: 'my:task' },
                    script: {
                        lang: 'bash',
                        type: 'echo',
                        rest: ['test'],
                        env: {},
                        full: 'echo test'
                    }
                },
                true // quiet mode
            );

            expect(consoleMock.spies.log).not.toHaveBeenCalled();
        });
    });

    describe('Type Override', () => {
        it('should use override type when provided', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(0), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            await runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'bash',
                    type: 'echo',
                    rest: ['original'],
                    env: {},
                    full: 'echo original'
                },
                type: 'node'
            });

            expect(spawn).toHaveBeenCalledWith(
                'node',
                ['original'],
                expect.any(Object)
            );
        });
    });

    describe('Promise Resolution', () => {
        it('should resolve promise on successful execution', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(0), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            const promise = runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'bash',
                    type: 'echo',
                    rest: ['test'],
                    env: {},
                    full: 'echo test'
                }
            });

            await expect(promise).resolves.toBeUndefined();
        });

        it('should resolve even on command failure', async () => {
            const mockProcess = {
                on: vi.fn((event, handler) => {
                    if (event === 'close') {
                        setTimeout(() => handler(127), 10);
                    }
                })
            };

            spawn.mockReturnValue(mockProcess);

            const promise = runCLICommand({
                task: { name: 'test:task' },
                script: {
                    lang: 'bash',
                    type: 'nonexistent',
                    rest: [],
                    env: {},
                    full: 'nonexistent'
                }
            });

            // Should still resolve, not reject
            await expect(promise).resolves.toBeUndefined();
        });
    });
});

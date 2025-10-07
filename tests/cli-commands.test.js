import { execaNode } from 'execa';
import { describe, it, expect, beforeAll } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Helper to run fsr commands
async function runFsr(command, args = []) {
    const result = await execaNode(join(rootDir, 'dist/index.js'), [command, ...args], {
        cwd: rootDir,
        timeout: 10000,
        reject: false,
    });
    return result;
}

describe('CLI Commands', () => {
    beforeAll(async () => {
        // Ensure dist is built
        console.log('Tests assume project is already built (yarn build)');
    });

    describe('Basic bash commands', () => {
        it('should run run:one command successfully', async () => {
            const result = await runFsr('run', ['run:one']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('ONE');
        });

        it('should run run:one:d (sleep) command', async () => {
            const start = Date.now();
            const result = await runFsr('run', ['run:one:d']);
            const duration = Date.now() - start;

            expect(result.exitCode).toBe(0);
            expect(duration).toBeGreaterThan(900); // At least 0.9 seconds (sleep 1)
        });
    });

    describe('JavaScript commands', () => {
        it('should run node:script with JavaScript code', async () => {
            const result = await runFsr('run', ['node:script']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('RED');
            expect(result.stdout).toContain('DONE');
        });

        it('should run JavaScript with template literals', async () => {
            const result = await runFsr('run', ['say:hello']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(/HELLO!! : \d+/);
        });
    });

    describe('Commands with environment variables', () => {
        it('should pass environment variables correctly', async () => {
            const result = await runFsr('run', ['run:three']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('INPUT: THREE');
        });
    });

    describe('Test file commands', () => {
        it('should run testConsole.js', async () => {
            const result = await runFsr('run', ['run:two']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('TEST CONSOLE OUTPUT');
        });

        it('should run testInput.js with environment variable', async () => {
            const result = await runFsr('run', ['runzz']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(/INPUT:/);
        });
    });

    describe('Sequential execution', () => {
        it('should run multiple commands in sequence with run-s', async () => {
            const result = await runFsr('run-s', ['run:one', 'run:one:d']);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('run:one');
            expect(result.stdout).toContain('run:one:d');
        });
    });

    describe('Parallel execution', () => {
        it('should run multiple commands in parallel with run-p', async () => {
            const start = Date.now();
            const result = await runFsr('run-p', ['run:one', 'run:one:d', 'run:one']);
            const duration = Date.now() - start;

            expect(result.exitCode).toBe(0);
            // Parallel execution should be faster than sequential
            // 3 commands with one sleep(1) should take ~1s not 3s
            expect(duration).toBeLessThan(3000);
        });
    });

    describe('Error handling', () => {
        it('should handle non-existent task gracefully', async () => {
            const result = await runFsr('run', ['non-existent-task']);

            expect(result.exitCode).toBe(0); // Currently doesn't fail, just logs error
            // Check both stdout and stderr since error messages may go to either
            const output = result.stdout + result.stderr;
            expect(output).toContain('Task not found');
        });
    });
});

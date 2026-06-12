/**
 * Test Utilities for FSCR v7.0.0
 *
 * Provides common utilities for testing CLI commands, file operations,
 * and mocking external dependencies.
 */

import { execaNode } from 'execa';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import { vi } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const rootDir = join(__dirname, '../..');
export const distDir = join(rootDir, 'dist');
export const libDir = join(rootDir, 'lib');

/**
 * Run an FSCR command
 * @param {string} command - The command to run (e.g., 'run', 'start', 'bump')
 * @param {string[]} args - Arguments for the command
 * @param {object} options - Additional options
 * @returns {Promise<object>} Result with stdout, stderr, and exitCode
 */
export async function runFsr(command, args = [], options = {}) {
    const defaultOptions = {
        cwd: options.cwd || rootDir,
        timeout: options.timeout || 10000,
        reject: false,
        ...options
    };

    const result = await execaNode(
        join(distDir, 'index.js'),
        [command, ...args],
        defaultOptions
    );

    return result;
}

/**
 * Create a temporary test directory with cleanup
 * @returns {Promise<object>} Object with path and cleanup function
 */
export async function createTempDir() {
    const tempPath = join(rootDir, 'tests', 'fixtures', `temp-${Date.now()}`);
    await fs.ensureDir(tempPath);

    return {
        path: tempPath,
        cleanup: async () => {
            await fs.remove(tempPath);
        }
    };
}

/**
 * Create a test fscripts.md file
 * @param {string} content - The content for the fscripts file
 * @param {string} filename - Optional filename (defaults to fscripts.md)
 * @returns {Promise<string>} Path to the created file
 */
export async function createTestFscripts(content, filename = 'fscripts.md') {
    const tempDir = await createTempDir();
    const filePath = join(tempDir.path, filename);
    await fs.writeFile(filePath, content);
    return { filePath, tempDir };
}

/**
 * Create a test package.json file
 * @param {object} content - The package.json content
 * @returns {Promise<string>} Path to the created file
 */
export async function createTestPackageJson(content) {
    const tempDir = await createTempDir();
    const filePath = join(tempDir.path, 'package.json');
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    return { filePath, tempDir };
}

/**
 * Mock console methods
 * @returns {object} Object with restore function and spies
 */
export function mockConsole() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const spies = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    };

    console.log = spies.log;
    console.error = spies.error;
    console.warn = spies.warn;

    return {
        spies,
        restore: () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        }
    };
}

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a command is available in PATH
 * @param {string} command - Command to check
 * @returns {Promise<boolean>}
 */
export async function commandExists(command) {
    try {
        await execaNode('which', [command], { reject: true });
        return true;
    } catch {
        return false;
    }
}

/**
 * Sample fscripts.md content for testing
 */
export const sampleFscriptsContent = `# Build Scripts

Build the project

## build:index

Build the main index file

\`\`\`bash
babel index.js --out-file dist/index.js
\`\`\`

## build:lib

Build library files

\`\`\`bash
babel lib --out-dir dist/lib --copy-files
\`\`\`

# Test Scripts

Run tests

## test:unit

Run unit tests

\`\`\`bash
vitest run
\`\`\`

## test:watch

Watch mode for tests (test fixture uses a command that exits)

\`\`\`bash
echo "watching for changes"
\`\`\`

# Development Scripts

Development tasks

## dev:start

Start development server

\`\`\`javascript
console.log('Development server started');
console.log(\`Time: \${Date.now()}\`);
\`\`\`

## dev:clean

Clean build artifacts

\`\`\`bash
rm -rf dist
\`\`\`

# Utility Scripts

Utility tasks

## echo:test

Echo a test message

\`\`\`bash
echo "TEST_OUTPUT"
\`\`\`

## sleep:short

Sleep for 1 second

\`\`\`bash
sleep 1 && echo "DONE"
\`\`\`

## env:test

Test environment variables

\`\`\`bash
TEST_VAR=hello echo $TEST_VAR
\`\`\`
`;

/**
 * Sample package.json for testing
 */
export const samplePackageJson = {
    name: 'test-project',
    version: '1.0.0',
    scripts: {
        build: 'echo "building"',
        test: 'echo "testing"',
        start: 'echo "starting"'
    },
    dependencies: {
        'chalk': '^4.1.2'
    },
    devDependencies: {
        'vitest': '^3.2.4'
    }
};

/**
 * Normalize line endings for cross-platform compatibility
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export function normalizeLineEndings(str) {
    return str.replace(/\r\n/g, '\n');
}

/**
 * Strip ANSI color codes from string
 * @param {string} str - String with ANSI codes
 * @returns {string} Clean string
 */
export function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Create a spy for file system operations
 * @returns {object} Spies and restore function
 */
export function spyOnFs() {
    const spies = {
        readFile: vi.spyOn(fs, 'readFile'),
        writeFile: vi.spyOn(fs, 'writeFile'),
        readFileSync: vi.spyOn(fs, 'readFileSync'),
        writeFileSync: vi.spyOn(fs, 'writeFileSync'),
        existsSync: vi.spyOn(fs, 'existsSync'),
        ensureDir: vi.spyOn(fs, 'ensureDir')
    };

    return {
        spies,
        restore: () => {
            Object.values(spies).forEach(spy => spy.mockRestore());
        }
    };
}

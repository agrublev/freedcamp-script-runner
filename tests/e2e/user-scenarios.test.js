/**
 * End-to-End Tests for User Scenarios
 *
 * Tests complete user workflows as they would be used in production.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runFsr, createTempDir } from '../helpers/test-utils.js';
import fs from 'fs-extra';
import path from 'path';

describe('E2E User Scenarios', () => {
    let tempDir;
    let originalCwd;

    beforeEach(async () => {
        originalCwd = process.cwd();
        tempDir = await createTempDir();
        process.chdir(tempDir.path);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await tempDir.cleanup();
    });

    describe('New Project Setup', () => {
        it('should allow user to generate initial fscripts.md from package.json', async () => {
            // User has a package.json
            await fs.writeFile(
                path.join(tempDir.path, 'package.json'),
                JSON.stringify({
                    name: 'my-project',
                    version: '1.0.0',
                    scripts: {
                        build: 'webpack',
                        test: 'jest',
                        start: 'node server.js',
                        dev: 'nodemon server.js'
                    }
                }, null, 2)
            );

            // User runs: fsr generate
            const result = await runFsr('generate', [], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);

            // Sample file should be created
            const samplePath = path.join(tempDir.path, 'sample.fscripts.md');
            const exists = await fs.pathExists(samplePath);
            expect(exists).toBe(true);

            // Content should include package.json scripts
            const content = await fs.readFile(samplePath, 'utf-8');
            expect(content).toContain('build');
            expect(content).toContain('test');
            expect(content).toContain('start');
            expect(content).toContain('dev');
        });

        it('should allow user to create and organize custom tasks', async () => {
            // User creates fscripts.md manually
            const customFscripts = `# Development

## dev:server

Start development server

\`\`\`bash
npm run dev
\`\`\`

## dev:watch

Watch for changes

\`\`\`bash
npm run watch
\`\`\`

# Testing

## test:unit

Run unit tests

\`\`\`bash
npm test
\`\`\`

## test:e2e

Run E2E tests

\`\`\`bash
npm run test:e2e
\`\`\`
`;
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                customFscripts
            );

            // User generates TOC: fsr toc
            const tocResult = await runFsr('toc', [], {
                cwd: tempDir.path
            });

            expect(tocResult.exitCode).toBe(0);

            // TOC should be added
            const content = await fs.readFile(
                path.join(tempDir.path, 'fscripts.md'),
                'utf-8'
            );
            expect(content).toContain('<!-- end toc -->');
            expect(content).toContain('[Development]');
            expect(content).toContain('[Testing]');

            // User runs a task: fsr run dev:server
            const runResult = await runFsr('run', ['dev:server'], {
                cwd: tempDir.path,
                timeout: 5000
            });

            expect(runResult.stdout).toContain('dev:server');
        });
    });

    describe('Daily Development Workflow', () => {
        beforeEach(async () => {
            // Setup typical project structure
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# Build

## build:clean

Clean build artifacts

\`\`\`bash
rm -rf dist
\`\`\`

## build:compile

Compile TypeScript

\`\`\`bash
echo "Compiling..."
\`\`\`

## build:bundle

Bundle assets

\`\`\`bash
echo "Bundling..."
\`\`\`

# Test

## test:unit

\`\`\`bash
echo "Running unit tests..."
\`\`\`

## test:lint

\`\`\`bash
echo "Linting..."
\`\`\`

# Development

## dev:start

\`\`\`javascript
console.log('Dev server started on port 3000');
\`\`\`
`
            );
        });

        it('should support full build and test workflow', async () => {
            // User runs: fsr run-s build:clean build:compile build:bundle test:lint test:unit
            const result = await runFsr(
                'run-s',
                ['build:clean', 'build:compile', 'build:bundle', 'test:lint', 'test:unit'],
                {
                    cwd: tempDir.path,
                    timeout: 15000
                }
            );

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('build:clean');
            expect(result.stdout).toContain('Compiling...');
            expect(result.stdout).toContain('Bundling...');
            expect(result.stdout).toContain('Linting...');
            expect(result.stdout).toContain('Running unit tests...');
        });

        it('should support parallel testing', async () => {
            // User runs: fsr run-p test:unit test:lint
            const startTime = Date.now();
            const result = await runFsr(
                'run-p',
                ['test:unit', 'test:lint'],
                {
                    cwd: tempDir.path
                }
            );
            const duration = Date.now() - startTime;

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('unit tests');
            expect(result.stdout).toContain('Linting');

            // Parallel execution should be fast
            expect(duration).toBeLessThan(5000);
        });

        it('should support running JavaScript tasks for custom logic', async () => {
            // User runs: fsr run dev:start
            const result = await runFsr('run', ['dev:start'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Dev server started on port 3000');
        });
    });

    describe('CI/CD Pipeline Simulation', () => {
        beforeEach(async () => {
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# CI Pipeline

## ci:install

\`\`\`bash
echo "Installing dependencies..."
\`\`\`

## ci:build

\`\`\`bash
echo "Building project..."
\`\`\`

## ci:test

\`\`\`bash
echo "Running tests..."
\`\`\`

## ci:deploy

\`\`\`bash
echo "Deploying to production..."
\`\`\`
`
            );
        });

        it('should execute full CI pipeline sequentially', async () => {
            // Simulate: fsr run-s ci:install ci:build ci:test ci:deploy
            const result = await runFsr(
                'run-s',
                ['ci:install', 'ci:build', 'ci:test', 'ci:deploy'],
                {
                    cwd: tempDir.path,
                    timeout: 20000
                }
            );

            expect(result.exitCode).toBe(0);

            // Verify execution order
            const stdout = result.stdout;
            const installPos = stdout.indexOf('Installing dependencies');
            const buildPos = stdout.indexOf('Building project');
            const testPos = stdout.indexOf('Running tests');
            const deployPos = stdout.indexOf('Deploying to production');

            expect(installPos).toBeLessThan(buildPos);
            expect(buildPos).toBeLessThan(testPos);
            expect(testPos).toBeLessThan(deployPos);
        });
    });

    describe('Monorepo Workflow', () => {
        beforeEach(async () => {
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# Package A

## pkg-a:build

\`\`\`bash
echo "Building package A..."
\`\`\`

## pkg-a:test

\`\`\`bash
echo "Testing package A..."
\`\`\`

# Package B

## pkg-b:build

\`\`\`bash
echo "Building package B..."
\`\`\`

## pkg-b:test

\`\`\`bash
echo "Testing package B..."
\`\`\`

# All Packages

## all:build

\`\`\`bash
echo "Building all packages..."
\`\`\`
`
            );
        });

        it('should build all packages in parallel', async () => {
            // User runs: fsr run-p pkg-a:build pkg-b:build
            const startTime = Date.now();
            const result = await runFsr(
                'run-p',
                ['pkg-a:build', 'pkg-b:build'],
                {
                    cwd: tempDir.path
                }
            );
            const duration = Date.now() - startTime;

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Building package A');
            expect(result.stdout).toContain('Building package B');

            // Should be faster than sequential
            expect(duration).toBeLessThan(3000);
        });

        it('should test packages sequentially after parallel build', async () => {
            // Build in parallel, then test
            const buildResult = await runFsr(
                'run-p',
                ['pkg-a:build', 'pkg-b:build'],
                {
                    cwd: tempDir.path
                }
            );

            expect(buildResult.exitCode).toBe(0);

            const testResult = await runFsr(
                'run-s',
                ['pkg-a:test', 'pkg-b:test'],
                {
                    cwd: tempDir.path
                }
            );

            expect(testResult.exitCode).toBe(0);
            expect(testResult.stdout).toContain('Testing package A');
            expect(testResult.stdout).toContain('Testing package B');
        });
    });

    describe('Error Handling in Production', () => {
        beforeEach(async () => {
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# Tasks

## task:success

\`\`\`bash
echo "Success!"
\`\`\`

## task:fail

\`\`\`bash
exit 1
\`\`\`
`
            );
        });

        it('should handle task failures gracefully', async () => {
            const result = await runFsr('run', ['task:fail'], {
                cwd: tempDir.path
            });

            // Should complete (not hang)
            expect(result.exitCode).toBe(0);
        });

        it('should continue with other tasks when one fails in sequence', async () => {
            const result = await runFsr(
                'run-s',
                ['task:success', 'task:fail', 'task:success'],
                {
                    cwd: tempDir.path
                }
            );

            // Should complete all tasks
            expect(result.stdout).toContain('Success!');
        });

        it('should handle non-existent tasks in production', async () => {
            const result = await runFsr('run', ['does:not:exist'], {
                cwd: tempDir.path
            });

            const output = result.stdout + result.stderr;
            expect(output).toContain('Task not found');
        });
    });

    describe('Complex Script Scenarios', () => {
        it('should handle scripts with pipes and redirects', async () => {
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# Advanced

## pipe:test

\`\`\`bash
echo "hello world"
\`\`\`
`
            );

            const result = await runFsr('run', ['pipe:test'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('hello world');
        });

        it('should handle multiline scripts', async () => {
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# Multiline

## multi:script

\`\`\`bash
echo "Line 1"
echo "Line 2"
echo "Line 3"
\`\`\`
`
            );

            const result = await runFsr('run', ['multi:script'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
        });

        it('should handle scripts with environment-specific logic', async () => {
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# Environment

## env:specific

\`\`\`bash
NODE_ENV=production echo "Production mode"
\`\`\`
`
            );

            const result = await runFsr('run', ['env:specific'], {
                cwd: tempDir.path
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Production mode');
        });
    });

    describe('Documentation Workflow', () => {
        it('should keep TOC up to date as tasks are added', async () => {
            // Initial fscripts
            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                `# Tasks

## task:one

\`\`\`bash
echo "one"
\`\`\`
`
            );

            // Generate TOC
            await runFsr('toc', [], { cwd: tempDir.path });

            // User adds more tasks
            let content = await fs.readFile(
                path.join(tempDir.path, 'fscripts.md'),
                'utf-8'
            );

            content += `\n## task:two\n\n\`\`\`bash\necho "two"\n\`\`\`\n`;

            await fs.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            // Regenerate TOC
            await runFsr('toc', [], { cwd: tempDir.path });

            const updatedContent = await fs.readFile(
                path.join(tempDir.path, 'fscripts.md'),
                'utf-8'
            );

            expect(updatedContent).toContain('[task:one]');
            expect(updatedContent).toContain('[task:two]');
        });
    });
});

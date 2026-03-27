/**
 * Unit Tests for parseScriptsMd.js
 *
 * Tests the markdown parser that extracts categories, tasks, and scripts
 * from fscripts.md files.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import parseScriptFile from '../../../lib/parsers/parseScriptsMd.js';
import { createTempDir, sampleFscriptsContent } from '../../helpers/test-utils.js';

describe('parseScriptsMd', () => {
    let originalCwd;
    let tempDir;

    beforeEach(async () => {
        originalCwd = process.cwd();
        tempDir = await createTempDir();
        process.chdir(tempDir.path);
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await tempDir.cleanup();
    });

    describe('Basic Parsing', () => {
        it('should parse a simple fscripts.md file', async () => {
            const content = `# Category One

## task:one

Description

\`\`\`bash
echo "test"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result).toBeDefined();
            expect(result.categories).toHaveLength(1);
            expect(result.categories[0].name).toBe('Category One');
            expect(result.allTasks).toHaveLength(1);
            expect(result.allTasks[0].name).toBe('task:one');
            expect(result.allTasks[0].script).toBe('echo "test"');
            expect(result.allTasks[0].lang).toBe('bash');
        });

        it('should parse multiple categories', async () => {
            const content = `# Category One

## task:one

\`\`\`bash
echo "one"
\`\`\`

# Category Two

## task:two

\`\`\`bash
echo "two"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.categories).toHaveLength(2);
            expect(result.categories[0].name).toBe('Category One');
            expect(result.categories[1].name).toBe('Category Two');
            expect(result.allTasks).toHaveLength(2);
        });

        it('should parse multiple tasks per category', async () => {
            const content = `# Category One

## task:one

\`\`\`bash
echo "one"
\`\`\`

## task:two

\`\`\`bash
echo "two"
\`\`\`

## task:three

\`\`\`bash
echo "three"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.categories).toHaveLength(1);
            expect(result.allTasks).toHaveLength(3);
            expect(result.categories[0].tasks['task:one']).toBeDefined();
            expect(result.categories[0].tasks['task:two']).toBeDefined();
            expect(result.categories[0].tasks['task:three']).toBeDefined();
        });
    });

    describe('Task Descriptions', () => {
        it('should parse task descriptions', async () => {
            const content = `# Category

## task:one

This is a description

\`\`\`bash
echo "test"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].description).toBe('This is a description');
        });

        it('should parse category descriptions', async () => {
            const content = `# Category One

This is a category description

## task:one

\`\`\`bash
echo "test"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.categories[0].description).toBe('This is a category description');
        });

        it('should handle tasks without descriptions', async () => {
            const content = `# Category

## task:one

\`\`\`bash
echo "test"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].description).toBe('');
        });
    });

    describe('Language Detection', () => {
        it('should detect bash language', async () => {
            const content = `# Category

## task:one

\`\`\`bash
echo "test"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].lang).toBe('bash');
        });

        it('should detect javascript language', async () => {
            const content = `# Category

## task:one

\`\`\`javascript
console.log('test');
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].lang).toBe('javascript');
            expect(result.allTasks[0].script).toBe(`console.log('test');`);
        });

        it('should detect sh language', async () => {
            const content = `# Category

## task:one

\`\`\`sh
echo "test"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].lang).toBe('sh');
        });
    });

    describe('Table of Contents Handling', () => {
        it('should skip content before <!-- end toc -->', async () => {
            const content = `# Should Be Ignored

## ignored:task

\`\`\`bash
echo "ignore"
\`\`\`

<!-- end toc -->

# Real Category

## real:task

\`\`\`bash
echo "real"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.categories).toHaveLength(1);
            expect(result.categories[0].name).toBe('Real Category');
            expect(result.allTasks).toHaveLength(1);
            expect(result.allTasks[0].name).toBe('real:task');
        });
    });

    describe('Task Order', () => {
        it('should preserve task order within a category', async () => {
            const content = `# Category

## task:one

\`\`\`bash
echo "one"
\`\`\`

## task:two

\`\`\`bash
echo "two"
\`\`\`

## task:three

\`\`\`bash
echo "three"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].order).toBe(0);
            expect(result.allTasks[1].order).toBe(1);
            expect(result.allTasks[2].order).toBe(2);
        });

        it('should reset task order for each category', async () => {
            const content = `# Category One

## task:one

\`\`\`bash
echo "one"
\`\`\`

## task:two

\`\`\`bash
echo "two"
\`\`\`

# Category Two

## task:three

\`\`\`bash
echo "three"
\`\`\`

## task:four

\`\`\`bash
echo "four"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].order).toBe(0);
            expect(result.allTasks[1].order).toBe(1);
            expect(result.allTasks[2].order).toBe(0); // Reset for new category
            expect(result.allTasks[3].order).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        it('should return false when fscripts.md does not exist', async () => {
            const result = await parseScriptFile();
            expect(result).toBe(false);
        });

        it('should handle empty fscripts.md', async () => {
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                ''
            );

            const result = await parseScriptFile();

            expect(result.categories).toHaveLength(0);
            expect(result.allTasks).toHaveLength(0);
        });

        it('should handle fscripts.md with only headings', async () => {
            const content = `# Category One

# Category Two
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.categories).toHaveLength(2);
            expect(result.allTasks).toHaveLength(0);
        });

        it('should handle multiline scripts', async () => {
            const content = `# Category

## task:one

\`\`\`bash
echo "line 1"
echo "line 2"
echo "line 3"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].script).toBe(
                'echo "line 1"\necho "line 2"\necho "line 3"'
            );
        });

        it('should handle scripts with special characters', async () => {
            const content = `# Category

## task:one

\`\`\`bash
echo "Special chars: $VAR \${TEST} \`cmd\` $(cmd)"
\`\`\`
`;
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                content
            );

            const result = await parseScriptFile();

            expect(result.allTasks[0].script).toContain('$VAR');
            expect(result.allTasks[0].script).toContain('${TEST}');
        });
    });

    describe('Complex Scenarios', () => {
        it('should parse the sample fscripts content', async () => {
            await fs.promises.writeFile(
                path.join(tempDir.path, 'fscripts.md'),
                sampleFscriptsContent
            );

            const result = await parseScriptFile();

            expect(result.categories.length).toBeGreaterThan(0);
            expect(result.allTasks.length).toBeGreaterThan(0);

            // Check for specific tasks
            const buildIndexTask = result.allTasks.find(t => t.name === 'build:index');
            expect(buildIndexTask).toBeDefined();
            expect(buildIndexTask.lang).toBe('bash');

            const devStartTask = result.allTasks.find(t => t.name === 'dev:start');
            expect(devStartTask).toBeDefined();
            expect(devStartTask.lang).toBe('javascript');
        });
    });
});

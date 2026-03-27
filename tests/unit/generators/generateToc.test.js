/**
 * Unit Tests for generateToc.js
 *
 * Tests the table of contents generator for fscripts.md files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateToc } from '../../../lib/generators/index.js';
import { createTempDir } from '../../helpers/test-utils.js';
import fs from 'fs-extra';
import path from 'path';

describe('generateToc', () => {
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

    describe('Basic TOC Generation', () => {
        it('should generate TOC for simple markdown file', async () => {
            const content = `# Category One

## task:one

Description

\`\`\`bash
echo "test"
\`\`\`

# Category Two

## task:two

\`\`\`bash
echo "test2"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');

            expect(result).toContain('<!-- end toc -->');
            expect(result).toContain('[Category One]');
            expect(result).toContain('[Category Two]');
            expect(result).toContain('[task:one]');
            expect(result).toContain('[task:two]');
        });

        it('should use default filename if not provided', async () => {
            const content = `# Category

## task

\`\`\`bash
echo "test"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'fscripts.md');
            await fs.writeFile(filePath, content);

            await generateToc();

            const result = await fs.readFile(filePath, 'utf-8');
            expect(result).toContain('<!-- end toc -->');
        });
    });

    describe('TOC Structure', () => {
        it('should create hierarchical TOC with categories and tasks', async () => {
            const content = `# Build

## build:index

\`\`\`bash
babel index.js
\`\`\`

## build:lib

\`\`\`bash
babel lib
\`\`\`

# Test

## test:unit

\`\`\`bash
vitest run
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');

            // Should have category links
            expect(result).toMatch(/\[Build\]\(#build\)/);
            expect(result).toMatch(/\[Test\]\(#test\)/);

            // Should have task links
            expect(result).toContain('[build:index]');
            expect(result).toContain('[build:lib]');
            expect(result).toContain('[test:unit]');
        });

        it('should handle special characters in headings', async () => {
            const content = `# Build & Deploy

## build:prod

\`\`\`bash
npm run build
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');
            expect(result).toContain('Build & Deploy');
        });
    });

    describe('Existing TOC Replacement', () => {
        it('should replace existing TOC', async () => {
            const content = `<!-- toc -->
Old TOC content
<!-- end toc -->

# Category

## task

\`\`\`bash
echo "test"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');

            expect(result).not.toContain('Old TOC content');
            expect(result).toContain('<!-- end toc -->');
            expect(result).toContain('[Category]');
        });

        it('should preserve content after TOC marker', async () => {
            const content = `<!-- toc -->
<!-- end toc -->

# Category

Description here

## task

Task description

\`\`\`bash
echo "test"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');

            expect(result).toContain('Description here');
            expect(result).toContain('Task description');
        });
    });

    describe('Multiple Tasks per Category', () => {
        it('should list all tasks under each category', async () => {
            const content = `# Scripts

## script:one

\`\`\`bash
echo "1"
\`\`\`

## script:two

\`\`\`bash
echo "2"
\`\`\`

## script:three

\`\`\`bash
echo "3"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');

            expect(result).toContain('[script:one]');
            expect(result).toContain('[script:two]');
            expect(result).toContain('[script:three]');
        });
    });

    describe('Empty and Edge Cases', () => {
        it('should handle markdown with no tasks', async () => {
            const content = `# Category One

# Category Two
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');

            expect(result).toContain('<!-- end toc -->');
            expect(result).toContain('[Category One]');
            expect(result).toContain('[Category Two]');
        });

        it('should handle markdown with no categories', async () => {
            const content = `Some random content

## task:one

\`\`\`bash
echo "test"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');
            expect(result).toContain('<!-- end toc -->');
        });

        it('should handle empty file', async () => {
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, '');

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');
            expect(result).toContain('<!-- end toc -->');
        });
    });

    describe('Link Generation', () => {
        it('should generate proper anchor links', async () => {
            const content = `# Build Scripts

## build:index

\`\`\`bash
echo "test"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');

            // Category should link to heading
            expect(result).toMatch(/\[Build Scripts\]\(#build-scripts\)/i);

            // Task should link to its heading
            expect(result).toMatch(/\[build:index\]\(#buildindex\)/i);
        });

        it('should handle task names with colons in links', async () => {
            const content = `# Scripts

## task:with:colons

\`\`\`bash
echo "test"
\`\`\`
`;
            const filePath = path.join(tempDir.path, 'test.md');
            await fs.writeFile(filePath, content);

            await generateToc('test.md');

            const result = await fs.readFile(filePath, 'utf-8');
            expect(result).toContain('task:with:colons');
        });
    });

    describe('File Handling', () => {
        it('should throw error if file does not exist', async () => {
            await expect(generateToc('nonexistent.md')).rejects.toThrow();
        });

        it('should preserve file permissions', async () => {
            const filePath = path.join(tempDir.path, 'test.md');
            const content = `# Category\n\n## task\n\n\`\`\`bash\necho "test"\n\`\`\`\n`;
            await fs.writeFile(filePath, content);

            const statsBefore = await fs.stat(filePath);
            await generateToc('test.md');
            const statsAfter = await fs.stat(filePath);

            expect(statsAfter.mode).toBe(statsBefore.mode);
        });
    });
});

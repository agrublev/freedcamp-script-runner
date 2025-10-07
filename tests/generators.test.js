import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';
import { execaNode } from 'execa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

describe('Generators', () => {
    describe('TOC Generator', () => {
        const testMdFile = join(rootDir, 'test-fscripts.md');
        const testContent = `# Category One

## task:one

Description here

\`\`\`bash
echo "test"
\`\`\`

# Category Two

## task:two

Another task

\`\`\`bash
echo "test2"
\`\`\`
`;

        beforeEach(async () => {
            await fs.writeFile(testMdFile, testContent);
        });

        afterEach(async () => {
            await fs.remove(testMdFile);
        });

        it('should generate table of contents', async () => {
            const result = await execaNode(join(rootDir, 'dist/index.js'), ['toc', 'test-fscripts.md'], {
                cwd: rootDir,
                timeout: 10000,
                reject: false,
            });

            expect(result.exitCode).toBe(0);

            const updatedContent = await fs.readFile(testMdFile, 'utf-8');
            expect(updatedContent).toContain('<!-- end toc -->');
            expect(updatedContent).toContain('[Category One]');
            expect(updatedContent).toContain('[task:one]');
        });
    });

    describe('Generate FScripts', () => {
        it('should generate sample fscripts file', async () => {
            const sampleFile = join(rootDir, 'sample.fscripts.md');

            // Clean up if exists
            if (await fs.pathExists(sampleFile)) {
                await fs.remove(sampleFile);
            }

            const result = await execaNode(join(rootDir, 'dist/index.js'), ['generate'], {
                cwd: rootDir,
                timeout: 10000,
                reject: false,
            });

            expect(result.exitCode).toBe(0);

            // Check if file was created
            const exists = await fs.pathExists(sampleFile);
            expect(exists).toBe(true);

            // Verify content structure
            if (exists) {
                const content = await fs.readFile(sampleFile, 'utf-8');
                // expect(content).toContain('# ');
                expect(content).toContain(`## build

run-p build:index build:lib

\`\`\`bash
run-p build:index build:lib
\`\`\``);

                // Clean up
                await fs.remove(sampleFile);
            }
        });
    });
});

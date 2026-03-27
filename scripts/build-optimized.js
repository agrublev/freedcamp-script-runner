/**
 * Optimized Build Script for FSCR v7.0.0
 *
 * Replaces Babel with native ESM + optional bundling
 * Implements tree shaking and minification
 *
 * Usage:
 *   node scripts/build-optimized.js           # Fast copy build
 *   node scripts/build-optimized.js --bundle  # Optimized bundle
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

class OptimizedBuilder {
    constructor(options = {}) {
        this.options = options;
        this.stats = {
            filesProcessed: 0,
            totalSize: 0,
            startTime: Date.now()
        };
    }

    /**
     * Clean dist directory
     */
    async clean() {
        console.log('Cleaning dist directory...');
        const distPath = path.join(projectRoot, 'dist');

        try {
            await fs.rm(distPath, { recursive: true, force: true });
            await fs.mkdir(distPath, { recursive: true });
        } catch (error) {
            // Directory might not exist
        }
    }

    /**
     * Copy file and track stats
     */
    async copyFile(src, dest) {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);

        const stats = await fs.stat(dest);
        this.stats.filesProcessed++;
        this.stats.totalSize += stats.size;
    }

    /**
     * Fast build: Copy source files directly
     */
    async fastBuild() {
        console.log('Starting fast build (copy mode)...');

        // Copy index.js
        await this.copyFile(
            path.join(projectRoot, 'index.js'),
            path.join(projectRoot, 'dist', 'index.js')
        );

        // Copy lib directory recursively
        await this.copyDirectory(
            path.join(projectRoot, 'lib'),
            path.join(projectRoot, 'dist', 'lib')
        );

        console.log('Fast build complete!');
    }

    /**
     * Copy directory recursively
     */
    async copyDirectory(src, dest) {
        await fs.mkdir(dest, { recursive: true });

        const entries = await fs.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else if (entry.isFile() && entry.name.endsWith('.js')) {
                await this.copyFile(srcPath, destPath);
            }
        }
    }

    /**
     * Bundled build using esbuild (if available)
     */
    async bundledBuild() {
        console.log('Starting bundled build...');

        try {
            // Try to use esbuild if available
            const esbuild = await import('esbuild').catch(() => null);

            if (!esbuild) {
                console.log('esbuild not found, falling back to fast build');
                await this.fastBuild();
                return;
            }

            console.log('Using esbuild for optimization...');

            await esbuild.build({
                entryPoints: [path.join(projectRoot, 'index.js')],
                bundle: false, // Don't bundle dependencies
                platform: 'node',
                target: 'node20',
                format: 'esm',
                outdir: path.join(projectRoot, 'dist'),
                treeShaking: true,
                minify: this.options.minify || false,
                sourcemap: this.options.sourcemap || false,
                external: [
                    // Keep external dependencies
                    'chalk',
                    'enquirer',
                    'ink',
                    'react',
                    'yargs',
                    'boxen',
                    'conf',
                    'marked',
                    'simple-git'
                ],
                logLevel: 'info'
            });

            // Copy lib files
            await this.copyDirectory(
                path.join(projectRoot, 'lib'),
                path.join(projectRoot, 'dist', 'lib')
            );

            console.log('Bundled build complete!');
        } catch (error) {
            console.error('Build error:', error.message);
            throw error;
        }
    }

    /**
     * Print build statistics
     */
    printStats() {
        const duration = Date.now() - this.stats.startTime;
        const sizeKB = (this.stats.totalSize / 1024).toFixed(2);

        console.log('\n═══════════════════════════════════════════════════');
        console.log('               Build Statistics');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Files processed: ${this.stats.filesProcessed}`);
        console.log(`Total size: ${sizeKB} KB`);
        console.log(`Build time: ${duration}ms`);
        console.log('═══════════════════════════════════════════════════\n');
    }

    /**
     * Run build
     */
    async build() {
        await this.clean();

        if (this.options.bundle) {
            await this.bundledBuild();
        } else {
            await this.fastBuild();
        }

        this.printStats();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    bundle: args.includes('--bundle'),
    minify: args.includes('--minify'),
    sourcemap: args.includes('--sourcemap')
};

// Run build
const builder = new OptimizedBuilder(options);
builder.build().catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});

export default OptimizedBuilder;

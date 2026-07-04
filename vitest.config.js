import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    esbuild: {
        jsx: 'automatic',
        jsxImportSource: 'react',
    },
    resolve: {
        alias: {
            '@utils': resolve(__dirname, 'lib/utils'),
            '@fsr/core': resolve(__dirname, 'packages/core'),
            '@fsr/cmd-branch': resolve(__dirname, 'packages/cmd-branch'),
            '@fsr/cmd-commit': resolve(__dirname, 'packages/cmd-commit'),
            '@fsr/cmd-upgrade': resolve(__dirname, 'packages/cmd-upgrade'),
            '@fsr/cmd-bump': resolve(__dirname, 'packages/cmd-bump'),
            '@fsr/cmd-encryption': resolve(__dirname, 'packages/cmd-encryption'),
            '@fsr/cmd-generate': resolve(__dirname, 'packages/cmd-generate'),
            '@fsr/cmd-doctor': resolve(__dirname, 'packages/cmd-doctor'),
            '@fsr/cmd-completion': resolve(__dirname, 'packages/cmd-completion'),
            '@fsr/cmd-greet': resolve(__dirname, 'packages/cmd-greet'),
            '@fsr/cmd-start': resolve(__dirname, 'packages/cmd-start'),
            '@fsr/cmd-run': resolve(__dirname, 'packages/cmd-run'),
            '@fsr/cmd-clear': resolve(__dirname, 'packages/cmd-clear'),
            '@fsr/cmd-plugins': resolve(__dirname, 'packages/cmd-plugins'),
        },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.js'],
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            reportsDirectory: 'coverage',
            reportOnFailure: true,
            include: ['lib/**/*.js', 'packages/**/*.js', 'index.js'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'tests/**',
                'lib/test-files/**',
                'lib/ui/**',
                'packages/*/ui/**',
                '**/*.test.js',
                '**/*.spec.js'
            ],
            thresholds: {
                lines: 99,
                functions: 100,
                branches: 99,
                statements: 99
            }
        }
    },
});

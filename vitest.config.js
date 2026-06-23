import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            '@utils': resolve(__dirname, 'lib/utils'),
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
            include: ['lib/**/*.js', 'index.js'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'tests/**',
                'lib/test-files/**',
                'lib/ui/**',
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

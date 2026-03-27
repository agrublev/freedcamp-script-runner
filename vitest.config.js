import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.js'],
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: ['lib/**/*.js', 'index.js'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'tests/**',
                'lib/test-files/**',
                '**/*.test.js',
                '**/*.spec.js'
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80
            }
        }
    },
});

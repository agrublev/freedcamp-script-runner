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
            include: [
                'lib/parsers/parseScriptsMd.js',
                'lib/running/*.js',
                'lib/cache/cli.js',
                'lib/completions/completion.js',
                'lib/generators/generateFScripts.js',
                'lib/generators/generateToc.js',
                'lib/utils/encryption.js'
            ],
            exclude: [
                'node_modules/**',
                'dist/**',
                'tests/**',
                'lib/test-files/**',
                '**/*.test.js',
                '**/*.spec.js'
            ],
            thresholds: {
                lines: 75,
                functions: 75,
                branches: 65,
                statements: 75
            }
        }
    },
});

# FSCR v7.0.0 Test Suite

Comprehensive test suite achieving 80%+ code coverage for the Freedcamp Script Runner (FSCR).

## Test Structure

```
tests/
├── unit/                    # Unit tests (isolated component testing)
│   ├── parsers/            # Parser function tests
│   ├── running/            # Execution utilities tests
│   ├── generators/         # Generator function tests
│   └── release/            # Release utilities tests
├── integration/            # Integration tests (component interactions)
│   └── cli-workflows.test.js
├── e2e/                    # End-to-end tests (complete user scenarios)
│   └── user-scenarios.test.js
├── performance/            # Performance benchmarks
│   └── benchmarks.test.js
├── helpers/                # Test utilities and helpers
│   └── test-utils.js
└── fixtures/               # Test data and sample files
    └── sample-fscripts.md
```

## Test Categories

### Unit Tests

Tests individual functions and modules in isolation:

- **Parser Tests** (`unit/parsers/`)
  - `parseScriptsMd.test.js`: Markdown parsing, task extraction, TOC handling
  - Coverage: Edge cases, language detection, category organization

- **Running Tests** (`unit/running/`)
  - `runCLICommand.test.js`: Command execution, environment variables
  - `runSequence.test.js`: Sequential task execution
  - `runParallel.test.js`: Parallel task execution, Promise.all behavior

- **Generator Tests** (`unit/generators/`)
  - `generateToc.test.js`: Table of contents generation
  - Coverage: TOC structure, link generation, file updates

### Integration Tests

Tests complete workflows and component interactions:

- **CLI Workflows** (`integration/cli-workflows.test.js`)
  - Run command workflows
  - Sequential and parallel execution
  - Generator and TOC workflows
  - Error recovery scenarios
  - Mixed language task execution

### E2E Tests

Tests complete user scenarios as they would be used in production:

- **User Scenarios** (`e2e/user-scenarios.test.js`)
  - New project setup
  - Daily development workflows
  - CI/CD pipeline simulation
  - Monorepo workflows
  - Error handling in production
  - Complex script scenarios
  - Documentation workflows

### Performance Tests

Benchmarks and performance metrics:

- **Benchmarks** (`performance/benchmarks.test.js`)
  - Startup performance (< 2s)
  - Execution performance (< 1s for simple tasks)
  - Memory usage tracking
  - TOC generation performance
  - File I/O performance
  - Scalability metrics
  - Bundle size tracking

## Running Tests

### All Tests

```bash
npm test
# or
yarn test
# or
vitest run
```

### Watch Mode

```bash
npm run test:watch
# or
yarn test:watch
# or
vitest
```

### Coverage Report

```bash
vitest run --coverage
```

This will generate:
- Terminal output (text report)
- `coverage/index.html` (interactive HTML report)
- `coverage/lcov.info` (LCOV format for CI integration)
- `coverage/coverage-final.json` (JSON report)

### Specific Test Suites

```bash
# Unit tests only
vitest run tests/unit

# Integration tests only
vitest run tests/integration

# E2E tests only
vitest run tests/e2e

# Performance benchmarks
vitest run tests/performance

# Specific file
vitest run tests/unit/parsers/parseScriptsMd.test.js
```

## Coverage Targets

| Metric | Target | Status |
|--------|--------|--------|
| Lines | 80% | ✅ |
| Functions | 80% | ✅ |
| Branches | 75% | ✅ |
| Statements | 80% | ✅ |

## Test Helpers

### `test-utils.js`

Provides common utilities:

- `runFsr(command, args, options)`: Execute FSCR commands
- `createTempDir()`: Create temporary test directory with cleanup
- `createTestFscripts(content)`: Create test fscripts.md files
- `createTestPackageJson(content)`: Create test package.json files
- `mockConsole()`: Mock console methods for testing
- `wait(ms)`: Async delay utility
- `commandExists(command)`: Check if command is available
- `sampleFscriptsContent`: Sample markdown content
- `samplePackageJson`: Sample package.json data
- `normalizeLineEndings(str)`: Cross-platform string normalization
- `stripAnsi(str)`: Remove ANSI color codes
- `spyOnFs()`: Spy on file system operations

### Usage Example

```javascript
import { runFsr, createTempDir, sampleFscriptsContent } from '../helpers/test-utils.js';

describe('My Test', () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = await createTempDir();
        await fs.writeFile(
            path.join(tempDir.path, 'fscripts.md'),
            sampleFscriptsContent
        );
    });

    afterEach(async () => {
        await tempDir.cleanup();
    });

    it('should run a command', async () => {
        const result = await runFsr('run', ['test:task'], {
            cwd: tempDir.path
        });

        expect(result.exitCode).toBe(0);
    });
});
```

## Test Fixtures

### `sample-fscripts.md`

Comprehensive test file with:
- Multiple categories
- Bash and JavaScript tasks
- Environment variable examples
- Parallel execution test tasks
- Error scenarios

### Custom Fixtures

Create custom fixtures in `tests/fixtures/` for specific test scenarios.

## Writing New Tests

### Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up temporary files and resources
3. **Descriptive Names**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Structure tests clearly
5. **Edge Cases**: Test boundary conditions and error scenarios
6. **Performance**: Include timeout limits for long-running tests

### Template

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir } from '../helpers/test-utils.js';

describe('Feature Name', () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = await createTempDir();
        // Setup
    });

    afterEach(async () => {
        await tempDir.cleanup();
        // Teardown
    });

    describe('Specific Behavior', () => {
        it('should do something specific', async () => {
            // Arrange
            const input = 'test input';

            // Act
            const result = await someFunction(input);

            // Assert
            expect(result).toBe('expected output');
        });
    });
});
```

## CI Integration

### GitHub Actions

```yaml
- name: Run tests
  run: npm test

- name: Run coverage
  run: vitest run --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Test Artifacts

Coverage reports are generated in the `coverage/` directory:
- Add `coverage/` to `.gitignore`
- Upload coverage reports to CI artifacts
- Integrate with coverage services (Codecov, Coveralls)

## Performance Benchmarks

Run benchmarks to track performance over time:

```bash
vitest run tests/performance
```

### Key Metrics

- **Startup Time**: < 2 seconds
- **Simple Task Execution**: < 1 second
- **Memory Usage**: < 50MB increase for 10 tasks
- **TOC Generation**: < 2 seconds for medium files
- **Parallel Speedup**: 1.5x+ faster than sequential

## Debugging Tests

### VS Code

Create `.vscode/launch.json`:

```json
{
    "type": "node",
    "request": "launch",
    "name": "Debug Tests",
    "runtimeExecutable": "npm",
    "runtimeArgs": ["run", "test:watch"],
    "console": "integratedTerminal"
}
```

### Node Inspector

```bash
node --inspect-brk node_modules/.bin/vitest run
```

## Maintenance

### Updating Tests

When adding new features:
1. Write unit tests first (TDD)
2. Add integration tests for workflows
3. Update E2E tests for user scenarios
4. Add performance benchmarks if relevant
5. Update coverage thresholds if needed

### Coverage Monitoring

```bash
# Check current coverage
vitest run --coverage

# Generate HTML report
vitest run --coverage --reporter=html

# Open coverage report
open coverage/index.html
```

## Troubleshooting

### Common Issues

1. **Timeout errors**: Increase `testTimeout` in vitest.config.js
2. **File permission errors**: Check temp directory cleanup
3. **Async issues**: Ensure all promises are awaited
4. **Mock conflicts**: Clear mocks in beforeEach/afterEach

### Debug Mode

```bash
DEBUG=* vitest run
```

## Contributing

When contributing tests:
1. Follow existing patterns
2. Maintain or improve coverage
3. Add tests for bug fixes
4. Document complex test scenarios
5. Run full test suite before submitting

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Coverage Guide](https://istanbul.js.org/)

---

**Last Updated**: 2024-10-07
**Test Suite Version**: 7.0.0
**Maintainer**: FSCR Team

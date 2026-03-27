# FSCR v7.0.0 - Testing Implementation Guide

## Quick Start

### Installation

```bash
# Install dependencies
npm install
# or
yarn install

# Build the project (required before testing)
npm run build
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # E2E tests only
npm run test:performance  # Performance benchmarks only
```

## Test Development Workflow

### 1. Create Test File

```bash
# For unit tests
touch tests/unit/[module]/[feature].test.js

# For integration tests
touch tests/integration/[workflow].test.js

# For E2E tests
touch tests/e2e/[scenario].test.js
```

### 2. Write Test Structure

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir } from '../helpers/test-utils.js';

describe('Feature Name', () => {
    let tempDir;
    let originalCwd;

    beforeEach(async () => {
        originalCwd = process.cwd();
        tempDir = await createTempDir();
        process.chdir(tempDir.path);
        // Additional setup
    });

    afterEach(async () => {
        process.chdir(originalCwd);
        await tempDir.cleanup();
        // Additional teardown
    });

    describe('Specific Behavior', () => {
        it('should do something specific', async () => {
            // Arrange
            const input = 'test';

            // Act
            const result = await functionUnderTest(input);

            // Assert
            expect(result).toBe('expected');
        });
    });
});
```

### 3. Run in Watch Mode

```bash
npm run test:watch
```

Tests will automatically re-run when files change.

### 4. Check Coverage

```bash
npm run test:coverage
```

Open `coverage/index.html` to see detailed coverage report.

## Testing Patterns

### Unit Test Pattern

**Goal**: Test individual functions in isolation

```javascript
import { describe, it, expect, vi } from 'vitest';
import functionToTest from '../../../lib/module/function.js';

// Mock dependencies
vi.mock('dependency-module');

describe('functionToTest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle normal input', () => {
        const result = functionToTest('input');
        expect(result).toBe('output');
    });

    it('should handle edge cases', () => {
        expect(() => functionToTest(null)).toThrow();
    });

    it('should handle async operations', async () => {
        const result = await functionToTest('async');
        expect(result).resolves.toBe('done');
    });
});
```

### Integration Test Pattern

**Goal**: Test multiple components working together

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runFsr, createTempDir } from '../helpers/test-utils.js';
import fs from 'fs-extra';
import path from 'path';

describe('CLI Workflow Integration', () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = await createTempDir();
        await fs.writeFile(
            path.join(tempDir.path, 'fscripts.md'),
            sampleContent
        );
    });

    afterEach(async () => {
        await tempDir.cleanup();
    });

    it('should complete full workflow', async () => {
        const result = await runFsr('run', ['task:name'], {
            cwd: tempDir.path
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('expected output');
    });
});
```

### E2E Test Pattern

**Goal**: Test complete user scenarios

```javascript
describe('User Scenario: New Project Setup', () => {
    let tempDir;

    beforeEach(async () => {
        tempDir = await createTempDir();
        // Setup complete project structure
        await setupProjectStructure(tempDir.path);
    });

    afterEach(async () => {
        await tempDir.cleanup();
    });

    it('should allow user to setup and run project', async () => {
        // Step 1: Generate fscripts
        const generateResult = await runFsr('generate', [], {
            cwd: tempDir.path
        });
        expect(generateResult.exitCode).toBe(0);

        // Step 2: Create TOC
        const tocResult = await runFsr('toc', [], {
            cwd: tempDir.path
        });
        expect(tocResult.exitCode).toBe(0);

        // Step 3: Run task
        const runResult = await runFsr('run', ['build'], {
            cwd: tempDir.path
        });
        expect(runResult.exitCode).toBe(0);
    });
});
```

### Performance Test Pattern

**Goal**: Measure and track performance

```javascript
describe('Performance: Task Execution', () => {
    it('should execute tasks within time limit', async () => {
        const startTime = Date.now();

        await runFsr('run-p', tasks, { cwd: tempDir.path });

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(2000);
        console.log(`Execution time: ${duration}ms`);
    });

    it('should not leak memory', async () => {
        if (global.gc) global.gc();

        const initialMemory = process.memoryUsage().heapUsed;

        for (let i = 0; i < 10; i++) {
            await runFsr('run', ['task'], { cwd: tempDir.path });
        }

        if (global.gc) global.gc();

        const finalMemory = process.memoryUsage().heapUsed;
        const increase = (finalMemory - initialMemory) / 1024 / 1024;

        expect(increase).toBeLessThan(50); // < 50MB
        console.log(`Memory increase: ${increase.toFixed(2)}MB`);
    });
});
```

## Common Testing Scenarios

### Testing CLI Commands

```javascript
import { runFsr } from '../helpers/test-utils.js';

it('should run CLI command', async () => {
    const result = await runFsr('run', ['task:name'], {
        cwd: '/path/to/test/dir',
        timeout: 5000
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('expected output');
});
```

### Testing File Operations

```javascript
import fs from 'fs-extra';
import path from 'path';

it('should create and modify files', async () => {
    const filePath = path.join(tempDir.path, 'test.md');

    // Create file
    await fs.writeFile(filePath, 'initial content');

    // Test operation
    await generateToc('test.md');

    // Verify changes
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('<!-- end toc -->');
});
```

### Testing Async Operations

```javascript
it('should handle async operations', async () => {
    const promise = asyncFunction();

    await expect(promise).resolves.toBe('success');
    // or
    await expect(promise).rejects.toThrow('error');
});
```

### Testing Timeouts

```javascript
it('should complete within timeout', async () => {
    const startTime = Date.now();

    await longRunningOperation();

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
}, 10000); // 10s test timeout
```

### Testing Error Conditions

```javascript
it('should handle errors gracefully', async () => {
    const result = await runFsr('run', ['nonexistent'], {
        cwd: tempDir.path
    });

    const output = result.stdout + result.stderr;
    expect(output).toContain('Task not found');
});
```

### Testing Console Output

```javascript
import { mockConsole } from '../helpers/test-utils.js';

it('should log to console', () => {
    const consoleMock = mockConsole();

    functionThatLogs();

    expect(consoleMock.spies.log).toHaveBeenCalledWith(
        expect.stringContaining('expected message')
    );

    consoleMock.restore();
});
```

### Mocking Dependencies

```javascript
import { vi } from 'vitest';
import spawn from 'cross-spawn';

vi.mock('cross-spawn');

beforeEach(() => {
    const mockProcess = {
        on: vi.fn((event, handler) => {
            if (event === 'close') handler(0);
        })
    };

    spawn.mockReturnValue(mockProcess);
});

it('should use mocked spawn', async () => {
    await runCommand();

    expect(spawn).toHaveBeenCalledWith(
        'echo',
        ['test'],
        expect.any(Object)
    );
});
```

## Debugging Tests

### VS Code Configuration

Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Tests",
            "runtimeExecutable": "npm",
            "runtimeArgs": ["run", "test:watch"],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Current Test File",
            "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
            "args": ["run", "${file}"],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
```

### Node Inspector

```bash
node --inspect-brk node_modules/.bin/vitest run
```

Then open Chrome DevTools at `chrome://inspect`

### Console Debug

```javascript
it('should debug', async () => {
    const result = await functionUnderTest();

    console.log('DEBUG:', result);
    console.log('Type:', typeof result);
    console.log('Keys:', Object.keys(result));

    expect(result).toBeDefined();
});
```

### Vitest UI

```bash
npm run test:ui
```

Opens interactive test browser at `http://localhost:51204/__vitest__/`

## Best Practices

### 1. Test Independence

✅ **Good**: Tests don't depend on each other
```javascript
describe('Independent tests', () => {
    beforeEach(() => {
        // Reset state for each test
    });

    it('test 1', () => {
        // Standalone test
    });

    it('test 2', () => {
        // Standalone test
    });
});
```

❌ **Bad**: Tests depend on execution order
```javascript
describe('Dependent tests', () => {
    let sharedState;

    it('test 1', () => {
        sharedState = 'value';
    });

    it('test 2', () => {
        // Depends on test 1 running first
        expect(sharedState).toBe('value');
    });
});
```

### 2. Clear Test Names

✅ **Good**: Descriptive, explains what and why
```javascript
it('should parse fscripts.md with multiple categories', async () => {
    // ...
});
```

❌ **Bad**: Vague, unclear purpose
```javascript
it('works', async () => {
    // ...
});
```

### 3. Single Responsibility

✅ **Good**: One assertion per test
```javascript
it('should return correct status code', () => {
    expect(result.exitCode).toBe(0);
});

it('should return correct output', () => {
    expect(result.stdout).toContain('success');
});
```

❌ **Bad**: Multiple unrelated assertions
```javascript
it('should work correctly', () => {
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('success');
    expect(result.duration).toBeLessThan(1000);
    expect(result.memory).toBeLessThan(100);
});
```

### 4. Proper Cleanup

✅ **Good**: Always cleanup resources
```javascript
afterEach(async () => {
    await tempDir.cleanup();
    mock.restore();
});
```

❌ **Bad**: No cleanup
```javascript
// Missing afterEach - temp files left behind
```

### 5. Meaningful Assertions

✅ **Good**: Specific assertions
```javascript
expect(result.categories).toHaveLength(2);
expect(result.categories[0].name).toBe('Build Scripts');
```

❌ **Bad**: Weak assertions
```javascript
expect(result).toBeDefined();
expect(result.categories.length).toBeGreaterThan(0);
```

## Coverage Guidelines

### What to Test

✅ **High Priority**:
- Critical business logic
- Error handling
- Edge cases
- User-facing features
- Security-sensitive code

✅ **Medium Priority**:
- Helper functions
- Utility modules
- Configuration handling

⚠️ **Low Priority**:
- Simple getters/setters
- Trivial wrappers
- Generated code

### Coverage Goals

| Component | Target |
|-----------|--------|
| Core CLI | 90%+ |
| Parsers | 85%+ |
| Executors | 85%+ |
| Generators | 80%+ |
| Utilities | 75%+ |
| Overall | 80%+ |

## Troubleshooting

### Tests Timeout

```javascript
// Increase timeout
it('long running test', async () => {
    // ...
}, 60000); // 60 second timeout
```

Or in config:
```javascript
// vitest.config.js
export default {
    test: {
        testTimeout: 30000 // 30 seconds
    }
}
```

### Flaky Tests

1. **Check for race conditions**
```javascript
// Add proper awaits
await Promise.all([...]);
```

2. **Use deterministic data**
```javascript
// Bad: Date.now()
// Good: Fixed timestamp
```

3. **Isolate external dependencies**
```javascript
// Mock file system, network, etc.
```

### Memory Leaks

```bash
# Run with garbage collection exposed
node --expose-gc node_modules/.bin/vitest run
```

```javascript
if (global.gc) {
    global.gc();
}
```

## CI/CD Integration

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
npm run test:unit
```

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Test Doubles](https://martinfowler.com/bliki/TestDouble.html)
- [Coverage.js](https://istanbul.js.org/)

---

**Quick Reference**: For detailed test cases, see `docs/TEST-SUITE.md`

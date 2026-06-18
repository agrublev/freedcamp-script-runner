-   [First category of scripts](#first-category-of-scripts)
    -   [build](#build)
    -   [fsr](#fsr)
    -   [release](#release)
    -   [release:publish](#releasepublish)
    -   [start](#start)

## say:hello

Say hello task outside any category.

```javascript
console.log("Say hello to my little friend!");
```

# Main Scripts

Welcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.

## build

Cleans the `dist/` output directory using `rimraf`, recreates `dist/lib/`, copies the entire `lib/` source tree into it, and copies `index.js` to `dist/index.js`. Run this before publishing or before running the CLI from `dist/`. The output in `dist/` is what gets shipped via the `files` field in `package.json`.

```bash
rimraf dist && mkdir -p dist/lib && cp -r lib/. dist/lib && cp index.js dist/index.js
```

## fsr

Runs the built `fsr` CLI directly from `dist/index.js`. Use this after a `build` to smoke-test the compiled output. In normal development you would run `yarn start` (which builds first) rather than this directly.

```bash
node dist/index.js
```

## release

Prepares a release in two steps: first bumps the version in `package.json` (via `fsr bump`, which also handles git tagging), then rebuilds the `dist/` output so the published package reflects the new version. Run this when you are ready to cut a new version before publishing to npm.

```bash
yarn fsr bump && yarn build
```

## release:publish

Executes `lib/release/publish.js`, which handles the full npm publish workflow — typically setting the dist-tag, running `npm publish`, and any post-publish steps. Run this after `release` to push the new version to the registry.

```bash
node lib/release/publish.js
```

## start

Builds the project and then immediately runs the CLI. Equivalent to running `build` followed by `start:run` in sequence using `npm-run-all`'s `run-s`. Use this as the single command to go from source to a running CLI during development when you want a clean build first.

```bash
run-s build start:run
```

## start:run

Runs the built CLI from `dist/index.js`. This is the second step of `start` and can also be called on its own when you know `dist/` is already up to date and you just want to relaunch the CLI without rebuilding.

```bash
node dist/index.js
```

## watch

Starts a `nodemon` watcher over `lib/` and `index.js`. Whenever any `.js` file changes, it automatically syncs the changed files to `dist/` (same copy commands as `build`, but without `rimraf` so it is fast). The `-I` flag keeps nodemon from reading stdin. Use this during active development so you can run `yarn fsr` after each save without manually rebuilding.

```bash
nodemon --watch lib --watch index.js --ext js --exec "mkdir -p dist/lib && cp -r lib/. dist/lib && cp index.js dist/index.js" --ignore 'node_modules' -I
```

## test

Runs the full test suite once with Vitest in non-watch (CI) mode. Exits with a non-zero code if any test fails, making it suitable for CI pipelines. Covers all test types (unit, integration, e2e, performance) in a single pass.

```bash
vitest run
```

## test:watch

Starts Vitest in interactive watch mode. Re-runs only the affected tests on every file save. Use this during development to get instant feedback as you write code.

```bash
vitest
```

## test:ui

Opens the Vitest browser-based UI at `localhost:51204` (or similar). Provides a visual dashboard to browse test files, inspect individual test results, and re-run tests interactively. Useful for exploring test output without reading terminal logs.

```bash
vitest --ui
```

## test:coverage

Runs the full test suite once and generates a V8 code coverage report via `@vitest/coverage-v8`. Outputs a summary to the terminal and writes detailed HTML/JSON reports to `coverage/`. Use this to check overall coverage before a release or PR.

```bash
vitest run --coverage
```

## test:unit

Runs only the files inside `tests/unit/` — fast, isolated unit tests for individual functions and modules with no external dependencies. Use this for a quick sanity check focused on pure logic.

```bash
vitest run tests/unit
```

## test:integration

Runs only the files inside `tests/integration/` — tests that exercise multiple modules working together (e.g., the parser + runner pipeline, file I/O, or CLI command handlers). Slower than unit tests but still headless.

```bash
vitest run tests/integration
```

## test:e2e

Runs only the files inside `tests/e2e/` — end-to-end tests that exercise the full CLI from the outside, simulating real user invocations. These are the slowest tests and validate the complete user-facing behavior.

```bash
vitest run tests/e2e
```

## test:performance

Runs only the files inside `tests/performance/` — benchmark and regression tests that assert timing or throughput constraints. Use these to catch regressions in hot paths such as parsing, task resolution, or plugin loading.

```bash
vitest run tests/performance
```

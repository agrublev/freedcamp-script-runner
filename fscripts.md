-   [Build](#build)
    -   [build](#build)
    -   [build:ui](#buildui)
    -   [watch](#watch)
-   [Development](#development)
    -   [fsr](#fsr)
    -   [start](#start)
    -   [start:run](#startrun)
-   [Release](#release)
    -   [release](#release-1)
    -   [release:publish](#releasepublish)
-   [Testing](#testing)
    -   [test](#test)
    -   [test:watch](#testwatch)
    -   [test:ui](#testui)
    -   [test:coverage](#testcoverage)
    -   [test:unit](#testunit)
    -   [test:integration](#testintegration)
    -   [test:e2e](#teste2e)
    -   [test:performance](#testperformance)

<!-- end toc -->

# Build

Everything needed to compile source into `dist/` — from a full clean rebuild to incremental UI-only transpilation and file watching.

## build

Wipes `dist/`, recreates `dist/lib/`, copies the full `lib/` source tree and `index.js`, then transpiles the three JSX UI components via esbuild (overwriting the raw copies). Run before publishing or before running the CLI from `dist/`.

```bash
node scripts/build.mjs
```

## build:ui

Transpiles only the three JSX UI components (`TaskPicker`, `AutoComplete`, `PluginPicker`) into `dist/lib/ui/` using esbuild. Much faster than a full `build` when only the TUI layer changed and the rest of `dist/` is already current.

```bash
node scripts/build-ui.mjs
```

## watch

Starts a nodemon watcher over `lib/` and `index.js`. On any `.js` change it runs the full `build.mjs` so `dist/` stays in sync automatically. Use during active development alongside a separate terminal running `fsr`.

```bash
nodemon --watch lib --watch index.js --ext js --exec "node scripts/build.mjs" --ignore 'node_modules' -I
```

# Development

Run and explore the CLI during day-to-day development.

## fsr

Launches the built CLI directly from `dist/index.js`. Use after a `build` to smoke-test the compiled output or to open the interactive task picker.

```bash
node dist/index.js
```

## start

Builds the project from source, then immediately launches the interactive CLI. The safe all-in-one command for starting a fresh development session when you want a clean build first.

```bash
node scripts/build.mjs && node dist/index.js
```

## start:run

Launches the CLI from `dist/index.js` without rebuilding. Use when `dist/` is already up to date and you just need to reopen the picker without the overhead of a full build.

```bash
node dist/index.js
```

# Release

Scripts for cutting and publishing new versions of the package.

## release

Bumps the version in `package.json` via `fsr bump` (which handles the git tag as well), then rebuilds `dist/` so the published package reflects the new version. Run when you are ready to cut a new release before publishing to npm.

```bash
yarn fsr run-s release:bump build commit release:publish
```

## release:bump

Bump version

```bash
yarn fsr bump
```

## release:commit

Commit latest changes

```bash
yarn fsr commit
```

## release:publish

Runs `lib/release/publish.js`, which handles the full npm publish workflow — sets the dist-tag, calls `npm publish`, and executes any post-publish steps. Run after `release` to push the new version to the registry.

```bash
node lib/release/publish.js
```

# Testing

All Vitest-based test commands, from a single CI pass to interactive watch mode and per-layer targeted runs.

## test

Runs the full test suite once with Vitest in non-watch (CI) mode. Exits with a non-zero code on failure, making it safe for CI pipelines.

```bash
vitest run
```

## test:watch

Starts Vitest in interactive watch mode. Re-runs only the affected tests on every file save — the fastest feedback loop during active development.

```bash
vitest
```

## test:ui

Opens the Vitest browser UI. Provides a visual dashboard to browse test files, inspect individual results, and re-run tests interactively without reading terminal logs.

```bash
vitest --ui
```

## test:coverage

Runs the full test suite once and generates a V8 coverage report via `@vitest/coverage-v8`. Writes HTML/JSON details to `coverage/`. Use before a release or PR to verify coverage targets.

```bash
vitest run --coverage
```

## test:unit

Runs only the files inside `tests/unit/` — fast, isolated unit tests for individual functions and modules with no external dependencies.

```bash
vitest run tests/unit
```

## test:integration

Runs only the files inside `tests/integration/` — tests that exercise multiple modules together (parser + runner pipeline, file I/O, CLI command handlers). Slower than unit tests but still headless.

```bash
vitest run tests/integration
```

## test:e2e

Runs only the files inside `tests/e2e/` — end-to-end tests that invoke the full CLI from the outside, simulating real user invocations. These are the slowest tests and validate complete user-facing behavior.

```bash
vitest run tests/e2e
```

## test:performance

Runs only the files inside `tests/performance/` — benchmark and regression tests that assert timing or throughput constraints. Use to catch regressions in hot paths such as parsing, task resolution, or plugin loading.

```bash
vitest run tests/performance
```

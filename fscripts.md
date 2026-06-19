-   [Fun](#fun)
    -   [awesome](#awesome)
-   [Build](#build)
    -   [build](#build)
    -   [build:ui](#buildui)
    -   [watch](#watch)
-   [Development](#development)
    -   [fsr](#fsr)
    -   [start](#start)
    -   [start:run](#startrun)
-   [Release](#release)
    -   [release](#release)
    -   [release:bump](#releasebump)
    -   [release:commit](#releasecommit)
    -   [release:publish](#releasepublish)
-   [Testing](#testing)
_ [test](#test)
_ [test:watch](#testwatch)
_ [test:coverage](#testcoverage)
_ [test:coverage:open](#testcoverageopen)
<!-- end toc -->

# Fun

## awesome

```bash
sleep 2
echo "----"
```

# Build

Everything needed to compile source into `dist/` — from a full clean rebuild to incremental UI-only transpilation and file watching.

## build

Wipes `dist/`, recreates `dist/lib/`, copies the full `lib/` source tree and `index.js`, then transpiles the three JSX UI components via esbuild (overwriting the raw copies). Run before publishing or before running the CLI from `dist/`.

```bash
bun scripts/bun.build.mjs
```

## build:ui

Transpiles only the three JSX UI components (`TaskPicker`, `AutoComplete`, `PluginPicker`) into `dist/lib/ui/` using esbuild. Much faster than a full `build` when only the TUI layer changed and the rest of `dist/` is already current.

```bash
node scripts/build-ui.mjs
```

## watch

Starts a nodemon watcher over `lib/` and `index.js`. On any `.js` change it runs the full `bun.build.mjs` so `dist/` stays in sync automatically. Use during active development alongside a separate terminal running `fsr`.

```bash
nodemon --watch lib --watch index.js --ext js --exec "bun scripts/bun.build.mjs" --ignore 'node_modules' -I
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
bun scripts/bun.build.mjs && node dist/index.js
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
yarn fsr run-s release:bump build release:commit release:publish
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

## test:coverage

Runs the full test suite once and generates a V8 coverage report via `@vitest/coverage-v8`. Writes HTML/JSON details to `coverage/`. Use before a release or PR to verify coverage targets.

```bash
vitest run --coverage
```

## test:coverage:open

Generates the V8 coverage report and opens the HTML dashboard (`coverage/index.html`) in your default browser. Cross-platform (macOS/Windows/Linux). Unlike `test:coverage`, it ignores the exit code so the report still opens even when tests fail or coverage thresholds are not met — useful for inspecting gaps while iterating.

```javascript
import { spawnSync } from "node:child_process";
import path from "node:path";

const binDir = path.resolve("node_modules/.bin");
const env = {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
    FORCE_COLOR: "1"
};

spawnSync("vitest", ["run", "--coverage"], { stdio: "inherit", shell: true, env });

const report = path.resolve("coverage/index.html");
const opener =
    process.platform === "darwin"
        ? { cmd: "open", args: [report] }
        : process.platform === "win32"
        ? { cmd: "start", args: ["", report] }
        : { cmd: "xdg-open", args: [report] };

spawnSync(opener.cmd, opener.args, { stdio: "inherit", shell: true });
console.log(`\nCoverage report: ${report}`);
```

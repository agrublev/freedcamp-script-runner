# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`fsr` (freedcamp-script-runner, npm package `fscr`) is a CLI tool that turns a `fscripts.md` Markdown file into an interactive script runner. Scripts live as `##` headings in the Markdown, and their code blocks (bash or JavaScript) are executed by the CLI. The built binary is at `dist/index.js`; source lives in `lib/` and `index.js`.

## Commands

**Build**
```bash
bun scripts/bun.build.mjs        # full build: wipes dist/, bundles index.js + lib/ via Bun
node scripts/build-ui.mjs        # rebuild only the three JSX TUI components (faster)
bun --watch lib                  # watch mode: auto-rebuild on any lib/*.js or index.js change
```

**Test**
```bash
vitest run                       # single-pass (CI mode)
vitest                           # interactive watch mode
vitest run --coverage            # with V8 coverage → coverage/
vitest run tests/parsers/        # run a single test directory
vitest run tests/parsers/parse.test.js  # run a single test file
```

**Run CLI from source (must build first)**
```bash
node dist/index.js               # interactive picker
node dist/index.js run <task>    # run specific task
node dist/index.js --help        # show all commands
```

Test coverage thresholds are strict: 99% lines/branches/statements, 100% functions.

## Architecture

### Execution Flow

1. **`index.js`** — Entry point. Defines `COMMANDS` (single source of truth for all built-in commands), loads plugins, wires yargs, and either opens the interactive picker or dispatches to a command handler.
2. **`lib/parsers/parseScriptsMd.js`** — Reads `fscripts.md` from `cwd()`, strips TOC (split on `<!-- end toc -->`), delegates to `lib/parsers/parse.js`, and applies env-profile filtering via `filterByEnv`.
3. **`lib/parsers/parse.js`** — Uses `marked.lexer()` to tokenize Markdown. `#` headings create categories, `##` headings create tasks. `## [env:name]` markers tag subsequent tasks with an environment profile (`env: "name"`). Tasks get a non-enumerable `_category` property so env filtering can reconstruct category structures without last-write-wins collisions.
4. **`lib/running/runCLICommand.js`** — Dispatches to either `spawn` (bash tasks) or `runJavascript` (JS blocks). JS tasks are written to a temp `.fsr-task-*.mjs` file in cwd and imported as an ESM module to support top-level `await`. Temp file is always cleaned up in `finally`.
5. **`lib/startScripts.js`** — Interactive mode. Parses `fscripts.md`, checks cache for recent tasks (invalidated by file size change), renders Ink TUI components (`AutoComplete`, `TaskPicker`).

### TUI Layer (`lib/ui/`)

Three Ink/React components compiled separately via `scripts/build-ui.mjs` (esbuild with JSX loader). They are not bundled into the main output by the Bun build — `build-ui.mjs` outputs them as `.js` to `dist/lib/ui/`. The main Bun build bundles everything else.

### Plugin System (`lib/plugins/`)

- **`loader.js`** — Discovers plugins from three sources in order: built-in (`lib/plugins/<name>/index.js`), local (`.fsr/plugins/<name>/index.js` in project root), npm (`fscr-plugin-*` packages in `node_modules`). Calls each plugin's `init(context)` with a context object that provides `registerHook`, `registerCommand`, `logger`, `getStorage`, `setStorage`.
- **`hooks.js`** — Simple pub/sub. Lifecycle hooks: `pre-task`, `post-task`, `post-command`, `task-error`. `fireHook` is called around every command execution in `runCLICommand.js` and the interactive menu handler in `index.js`.
- Plugin storage is scoped JSON written to `.fscr/<plugin-name>/storage.json` in the project root.

### Key Data Shape

`parseScriptFile()` returns `{ categories: Array, allTasks: Array }`:
- `categories[n]` → `{ name, description, tasks: { [taskName]: taskObject } }` — `tasks` is name-keyed (last env wins when no `--env` filter); use `allTasks` for env-aware filtering.
- `allTasks[n]` → `{ name, script, lang, description, env, order, _category }` — `lang` is `"bash"` or `"javascript"`; `env` is a string profile name or `null`.

### Cache (`lib/cache/cache.js`)

Global JSON cache at `~/.fsr/cache.json`. Stores recent task history per project. Cache is invalidated when `fscripts.md` file size changes.

## Development Notes

- **No TypeScript.** Pure ES modules (`"type": "module"` in package.json). Do not add `.ts` files.
- **Build tool is Bun** (`bun scripts/bun.build.mjs`). The dist output is a single bundled `dist/index.js`. Always build before testing CLI changes.
- **Test runner is Vitest** (not Jest). Tests live in `tests/` mirroring `lib/` structure.
- The `@utils` alias resolves to `lib/utils/` — configured in both `vitest.config.js` and the Bun build's `alias` option.
- `lib/test-files/` and `lib/ui/` are excluded from coverage.
- The `fscripts.md` in this repo is the project's own script runner — it defines build, test, and release tasks for `fsr` itself.

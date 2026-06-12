# `fsr` — The Freedcamp Script Runner

> Run beautifully documented Markdown scripts from your terminal.
> Package name: **`fsr`** · Binaries: **`fsr`** and **`fsr`** (identical) · Current version: **7.2.6**

`fsr` replaces the headache of cramming logic into `package.json` `"scripts"`. Instead, you
write a human‑readable **`fscripts.md`** file where every task is a Markdown section with a
title, an optional description, and a fenced code block. `fsr` parses that file and runs the
task you choose — interactively or by name.

---

## Table of Contents

- [Installation](#installation)
- [The `fscripts.md` file](#the-fscriptsmd-file)
  - [Anatomy](#anatomy)
  - [Bash tasks](#bash-tasks)
  - [JavaScript tasks](#javascript-tasks)
  - [Inline environment variables](#inline-environment-variables)
  - [Table of contents marker](#table-of-contents-marker)
- [Running `fsr`](#running-fsr)
  - [Interactive mode (no arguments)](#interactive-mode-no-arguments)
- [Command reference](#command-reference)
  - [`start`](#start) · [`list`](#list) · [`run`](#run-task) · [`run-s`](#run-s-tasks) · [`run-p`](#run-p-tasks)
  - [`scripts`](#scripts) · [`generate`](#generate) · [`toc`](#toc) · [`clear`](#clear)
  - [`upgrade`](#upgrade) · [`bump`](#bump) · [`branch`](#branch)
  - [`encryption`](#encryption) · [`remote`](#remote)
  - [`doctor`](#doctor) · [`cache`](#cache-action) · [`completion`](#completion-action)
- [Configuration (`package.json`)](#configuration-packagejson)
- [Recent‑task history](#recent-task-history)
- [How tasks are executed](#how-tasks-are-executed)
- [Status of subsystems](#status-of-subsystems)
- [Troubleshooting](#troubleshooting)

---

## Installation

```bash
# Global (gives you the `fsr` / `fsr` commands everywhere)
npm install -g fsr
# or
yarn global add fsr

# Per‑project dev dependency
yarn add -D fsr
```

Both `fsr` and `fsr` are registered binaries pointing at the same entry point, so use
whichever you prefer. The runnable artifact is `dist/index.js` (built from `index.js` with
`yarn build`); the `bin` shim simply `import()`s it.

Run any command from a directory that contains an `fscripts.md` file (for task running) and a
`package.json` (always required).

---

## The `fscripts.md` file

`fsr` reads `fscripts.md` from the **current working directory** (`process.cwd()`).

### Anatomy

| Markdown element | Becomes |
|---|---|
| `#` heading (h1) | A **category** (group) name |
| Paragraph right after an h1 | The category **description** |
| `##` heading (h2) | A **task** name |
| Paragraph right after an h2 | The task **description** (optional) |
| Fenced code block after the h2/description | The task **script** |
| Code fence language (` ```bash ` / ` ```javascript `) | The task **language** |

````markdown
# Start Scripts

Start running in development mode

## start:web

Boots the web server with hot reload.

```bash
NODE_ENV=development vite
```

## say:hello

```javascript
console.log(`HELLO! ${Date.now()}`);
```
````

Notes on parsing:
- A task may have **just a code block** (no description paragraph) — that is fully supported.
- Tasks keep their declaration order within a category (used for menu ordering).
- Category/task **names are the keys** you pass to `run`, `run-s`, and `run-p`.

### Bash tasks

Any non‑`javascript` fence (e.g. ` ```bash `) is treated as a shell command. The first token is
the executable (`node`, `vite`, `echo`, `yarn`, …) and the remainder are arguments. The command
is spawned via `cross-spawn` with stdio inherited, so colors and interactive prompts work.

```bash
node lib/test-files/consoleSample.js
```

> `node_modules/.bin` is prepended to `PATH`, so locally‑installed CLIs (vite, eslint, vitest,
> etc.) resolve without a `npx`/`yarn` prefix.

### JavaScript tasks

A ` ```javascript ` fence runs **in‑process** via `require-from-string` — no temp file, no
separate `node` invocation. You can `require()` dependencies and use top‑level async IIFEs.

````markdown
## node:script

```javascript
const chalk = require("chalk");
console.log("NODE_ENV", process.env.NODE_ENV);
(async () => {
    console.log(`-- ${chalk.bold.red("RED")} --`);
    await new Promise((r) => setTimeout(() => { console.log("DONE"); r(); }, 2000));
})();
```
````

Because JavaScript tasks run inside the `fsr` process, environment‑variable prefixes in the
script body are **not** parsed for them — set process env beforehand or read existing
`process.env` values.

### Inline environment variables

For **bash** tasks, a single leading `KEY=value` token is lifted out and injected into the
child process environment:

```bash
NODE_ENV=production node build.js
#  └─ becomes env { NODE_ENV: "production" }, command: node build.js
```

Only one leading `KEY=value` pair is parsed this way (it is the documented/tested behavior).
For multiple variables, set them inside the script or use a wrapper.

### Table of contents marker

`fsr` and the `toc` command use a sentinel comment to separate a generated TOC from your
content:

```markdown
- [Run](#run)
  * [start:web](#startweb)
<!-- end toc -->

# Run
...
```

When parsing, everything **before** `<!-- end toc -->` is ignored, so a stale TOC never
interferes with task discovery. See [`toc`](#toc) to (re)generate it.

---

## Running `fsr`

```
Usage: fsr <command> [options]
```

Every invocation first **clears the screen**, then dispatches your command. Console output is
timestamped automatically (each `log`/`info`/`warn`/`error` is prefixed with `HH:MM:SS` and a
colored level tag).

### Interactive mode (no arguments)

Running `fsr` with **no command** opens a top‑level menu (built with `enquirer`) listing the
high‑level actions:

```
What category do you want to run?
❯ start      : Choose category then task to run
  list       : Select any task with text autocompletion
  scripts    : Choose a script from package.json
  upgrade    : Upgrade all your packages except 'ignore-upgrade'
  remote     : Get remote configuration with your fc email
  bump       : Bump package.json and beautify it!
  encryption : Encrypt/Decrypt secret files
  clear      : Clear recent task history
  generate   : Generate a sample fscripts.md from package.json
  toc        : Generate updated Table of Contents
  --help     : See full help documentation
```

Picking an entry re‑invokes `fsr <choice>`. Press Esc/Ctrl‑C to exit (`See you soon!`).

---

## Command reference

### `start`

Two‑step interactive picker: choose a **category**, then a **task** within it. Your three most
recently run tasks appear pinned at the top for quick re‑runs.

```bash
fsr start
```

- Page size adapts to your terminal height.
- Category and task descriptions are rendered with `**bold**` and `_underline_` Markdown
  converted to terminal colors.
- The selected task is recorded in [recent‑task history](#recent-task-history).

### `list`

Single‑step **fuzzy autocomplete** across *all* tasks (flattened, ignoring categories). Start
typing to filter by task name or description.

```bash
fsr list
```

### `run [task]`

Run one task by its exact name.

```bash
fsr run start:web
fsr run say:hello
```

- If the task isn't found, prints `Task not found` (and exits cleanly).
- JavaScript tasks run in‑process; bash tasks are spawned with parsed env/args.

### `run-s [tasks...]`

Run multiple tasks **sequentially** — each waits for the previous to finish.

```bash
fsr run-s build test deploy
```

Useful inside an `fscripts.md` task itself to compose pipelines:

````markdown
## release

```bash
fsr run-s build test publish
```
````

### `run-p [tasks...]`

Run multiple tasks **in parallel** — all start at once, the command resolves when all finish.

```bash
fsr run-p start:web start:api
```

> Parallel output is interleaved. Use for independent long‑running processes (servers,
> watchers).

### `scripts`

Bypass `fscripts.md` and pick directly from your `package.json` `"scripts"` via the same fuzzy
autocomplete. The chosen script runs through `yarn`.

```bash
fsr scripts
```

### `generate`

Scaffold a starter file from your existing `package.json` scripts. Each script becomes an h2
task with a bash code block. Output is written to **`sample.fscripts.md`** (so it never
overwrites an existing `fscripts.md`).

```bash
fsr generate
# → creates ./sample.fscripts.md ; review it, then rename to fscripts.md
```

### `toc`

Generate/refresh a Markdown table of contents at the top of the file, delimited by the
`<!-- end toc -->` marker. Re‑running replaces the previous TOC in place.

```bash
fsr toc                 # operates on fscripts.md
fsr toc CHANGELOG.md    # operate on a different file
```

If the target file is missing, it tells you to run `fsr generate`.

### `clear`

Wipe the [recent‑task history](#recent-task-history) (the pinned “recent” entries in `start`).

```bash
fsr clear
```

### `upgrade`

Upgrade **all** dependencies (`dependencies`, `devDependencies`, `peerDependencies`) to
`@latest` via `yarn add`, then print a per‑package before→after diff. Packages listed under
`fscripts.ignore-upgrade` are skipped.

```bash
fsr upgrade
```

### `bump`

Bump the `package.json` version and optionally tag/commit/push.

```bash
fsr bump
```

Flow:
1. Prompts for bump size (`patch` / `minor` / `major`) — or pass `--type`.
2. Asks whether to add a **git tag** (skip with `--skipGit true`).
3. Runs `yarn version --<type> --no-commit-hooks`.
4. If tagging: prompts for an optional change description, then
   `git add .` → `git commit -m "VERSION x.y.z [+ description]"` →
   `git tag -a vX.Y.Z` → `git push origin --tags`.

### `branch`

Guard against committing on `Development`. If you're on the `Development` branch it warns
loudly and prompts you to create a new feature branch (`git checkout -b <name>`).

```bash
fsr branch
```

### `encryption`

Symmetric **encrypt/decrypt** of secret files using AES‑192‑CBC. Files to manage are listed
under `fscripts.encryptedFiles` in `package.json`.

```bash
fsr encryption
```

Flow:
1. Prompts for a SECRET key (password).
2. Prompts for direction: `encrypt` or `decrypt`.
3. For each configured file `path/to/config.json`, it maps between the **plaintext**
   (`config.json`) and the **encrypted twin** prefixed with a dot (`.config.json`):
   - *encrypt* → reads `config.json`, writes ciphertext to `.config.json`.
   - *decrypt* → reads `.config.json`, writes plaintext to `config.json`.
4. Overwrites prompt for confirmation if the target already exists.
5. Plaintext files are automatically appended to `.gitignore` so secrets aren't committed.

> The sample `config.json` shipped in this repo decrypts with the password **`secret`**.

### `remote`

Fetch remote configuration via a tiny one‑shot local web flow: `fsr` starts an HTTP server on
**`localhost:5252`**, opens your browser to it, and waits for the page to `POST` a config
payload back. The result is written to `config.json` (or to the path set by `fscripts.config`).

```bash
fsr remote
```

The server self‑destructs after receiving the response. CORS is wide open since it's a
localhost, single‑use exchange.

### `doctor`

Run environment diagnostics and (optionally) auto‑fix issues.

```bash
fsr doctor                 # run all checks
fsr doctor --fix           # attempt automatic fixes
fsr doctor --json          # machine-readable output
fsr doctor --verbose       # extra detail / stack traces on error
```

Checks performed:

| Check | Critical | Notes |
|---|---|---|
| Node.js version | ✅ | Recommends a supported runtime |
| Package manager | ✅ | npm/yarn availability |
| Git | – | Presence/version |
| `fscripts.md` file | – | Exists; can create a basic template with `--fix` |
| `package.json` | ✅ | Valid JSON |
| TypeScript | – | Optional |
| File permissions | ✅ | Read/write access |
| Cache system | – | Operational |
| Startup time | – | Performance probe |
| Memory usage | – | Performance probe |

A summary box reports passed / warnings / errors / fixed counts. Exits non‑zero if a
**critical** check fails.

### `cache <action>`

Inspect and manage the in‑memory TTL cache used to speed up repeated `fscripts.md` parsing.

```bash
fsr cache stats              # show hit/miss/size statistics
fsr cache stats --verbose    # detailed stats
fsr cache list               # list cached entries
fsr cache list --limit 25    # cap the list (default 10)
fsr cache clear              # remove all entries
fsr cache benchmark          # cold vs warm parse, reports speedup (target 10x)
fsr cache export             # print stats JSON to stdout
fsr cache export -o out.json # write stats JSON to a file
```

Cache mechanics: keyed by `sha256(filePath:mtime)`, default **TTL 5 minutes**, max **100
entries**, LRU‑style eviction of the oldest entry when full, and automatic invalidation when
the underlying file's modification time changes. Expired entries are swept once a minute.

### `completion [action]`

Install shell tab‑completion for `fsr`/`fsr`.

```bash
fsr completion                 # interactive: confirm install for detected shell
fsr completion install         # install for detected shell
fsr completion install -s zsh  # target a specific shell
fsr completion uninstall       # remove
fsr completion status          # show install state across all shells
fsr completion generate        # print the completion script to stdout
fsr completion install --force # reinstall over an existing block
```

Supported shells: **bash, zsh, fish, powershell**. Behavior:
- The current shell is auto‑detected from `$SHELL` (or PowerShell on Windows).
- For bash/zsh/powershell, a delimited block (`# FSCR completion … # End FSCR completion`) is
  appended to the respective rc/profile file (idempotent; `--force` to replace).
- For fish, a `fsr.fish` file is written to `~/.config/fish/completions/`.
- After install it tells you how to activate (e.g. `source ~/.zshrc`).

### `--help`

```bash
fsr --help
```

Yargs‑generated help listing every command with its example.

---

## Configuration (`package.json`)

`fsr` reads two optional top‑level keys from your project's `package.json`.

```json
{
  "fscripts": {
    "encryptedFiles": ["config.json"],
    "ignore-upgrade": ["micromatch"],
    "config": "test.json"
  },
  "staticPath": {
    "source": "lib/auth/index.html",
    "target": "dist/index.html"
  }
}
```

| Key | Used by | Meaning |
|---|---|---|
| `fscripts.encryptedFiles` | [`encryption`](#encryption) | Files to encrypt/decrypt; each gets a dot‑prefixed encrypted twin and is added to `.gitignore`. |
| `fscripts.ignore-upgrade` | [`upgrade`](#upgrade) | Package names to skip when upgrading to `@latest`. |
| `fscripts.config` | [`remote`](#remote) | Destination path for the fetched remote config (defaults to `config.json`). |
| `staticPath` | build | Source/target for copying the auth HTML into `dist` during build. |

---

## Recent‑task history

`fsr` persists your task runs using [`conf`](https://github.com/sindresorhus/conf) under your
OS config directory (project‑scoped by `package.json` `name`). The `start` picker surfaces the
**three most recent** tasks, sorted by last‑executed time, for one‑keystroke re‑runs. Clear it
anytime with [`fsr clear`](#clear).

---

## How tasks are executed

- **Bash** tasks → `cross-spawn(type, args, { stdio: "inherit" })` with:
  - `FORCE_COLOR=true` (preserves colored output),
  - `node_modules/.bin` prepended to `PATH`,
  - any inline `KEY=value` merged into the child env.
  - Non‑zero exit codes are reported but do **not** crash `fsr` (it resolves and continues).
- **JavaScript** tasks → executed in‑process via `require-from-string` (synchronous require of
  the code string), so they share the `fsr` process and its `process.env`.
- Each run prints a timestamped header: `[HH:MM:SS] <task name>:`.

---

## Status of subsystems

The shipped `fsr` CLI exposes the commands documented above. The repository also contains
**experimental / in‑progress subsystems** under `lib/` (a plugin system, configuration
profiles, lazy‑loading and performance monitoring) that are **not yet wired into the `fsr`
command surface**. Treat any `plugin …` / `profile …` commands, `--dry-run`, `--silent`, or
watch‑mode references found in archived design notes (`docs/archive/`) as **roadmap, not
current behavior**. This document describes what the CLI actually does today.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `Task not found` | The name doesn't match any `##` task in `fscripts.md`. Run `fsr list` to see exact names. |
| Nothing happens / no tasks | No `fscripts.md` in the current directory. Run `fsr generate` then rename `sample.fscripts.md`. |
| Local CLI “command not found” in a task | It's not installed in `node_modules`. Install it, or call it via `yarn`/`npx`. |
| Env var not applied (bash task) | Only a **single leading** `KEY=value` is parsed. Put extra vars in the script body. |
| Env var not applied (JS task) | JS tasks run in‑process; set env before running `fsr`, or read existing `process.env`. |
| Decryption fails | Wrong SECRET key, or you're pointing at the wrong (non‑dot) file. |
| Stale TOC breaks parsing | Regenerate with `fsr toc`; parsing always uses content after `<!-- end toc -->`. |

---

*For deeper, subsystem‑specific notes (caching internals, completions, doctor, and the
in‑progress plugin/profile/TypeScript work) see the other files in [`docs/`](./).
Historical v7 implementation reports are preserved in [`docs/archive/`](./archive/).*

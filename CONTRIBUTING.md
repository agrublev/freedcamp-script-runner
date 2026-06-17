# Contributing to fsr

Thanks for wanting to help! `fsr` is intentionally small and focused — a script runner that lives in a Markdown file. Contributions that keep it sharp and simple are very welcome.

---

## Quick start

```bash
git clone https://github.com/agrublev/freedcamp-script-runner.git
cd freedcamp-script-runner
yarn          # install deps
yarn test     # make sure everything passes before you touch anything
```

---

## How the project is structured

```
index.js              # CLI entry — all yargs commands live here
lib/
  parsers/            # markdown → task data
  running/            # execute tasks (sequence, parallel, CLI command)
  generators/         # fscripts.md / TOC generation
  cache/              # parse result caching with TTL + file watching
  completions/        # shell tab-completion (bash, zsh, fish, powershell)
  commands/           # doctor, diagnostics
  encryption/         # encrypt / decrypt secret files
  plugins/            # plugin loader + hook system
  release/            # version bumping + publishing
  git/                # git branch validation
  utils/              # shared helpers (encryption primitives, console, etc.)
tests/                # vitest unit tests, mirrors lib/ structure
```

**Key rules the codebase already follows — don't break them:**

- **JS only, no TypeScript.** No `.ts` files, no type annotations, no `tsconfig`.
- **ESM throughout.** Every file uses `import`/`export`. No `require()`.
- **`yarn`, not `npm`.** Don't commit `package-lock.json`.
- **No new dependencies unless necessary.** Ask first if you think you need one.

---

## Making changes

### 1. Branch off `Development`

```bash
git checkout Development
git pull
git checkout -b feat/my-thing
```

Never commit directly to `Development` or `master` — `fsr branch` will even warn you about this.

### 2. Write the code

- Keep files under ~400 lines. If a file is growing, extract a helper.
- Route side effects (file I/O, network, spawning processes) through `lib/` modules, not inline in `index.js`.
- If you add a new yargs command to `index.js`, put the implementation in `lib/`.

### 3. Write or update tests

Every change to `lib/` should have a corresponding test in `tests/`. The project uses [Vitest](https://vitest.dev/).

```bash
yarn test             # run tests (fast, no coverage)
yarn test:coverage    # run tests + coverage report
```

Coverage thresholds (enforced in CI):

| Metric     | Threshold |
|------------|-----------|
| Statements | 75%       |
| Functions  | 75%       |
| Lines      | 75%       |
| Branches   | 65%       |

Test files go in `tests/<same-path-as-lib-file>.test.js`. For example, a change to `lib/running/runSequence.js` gets tests in `tests/running/runSequence.test.js`.

**Mocking guidelines:**
- Mock external I/O (filesystem, child_process, git) — don't rely on the real filesystem in unit tests.
- Use `vi.mock()` at the top of the test file; avoid `vi.resetModules()` inside `beforeEach` (it breaks v8 coverage tracking).
- Use `vi.clearAllMocks()` in `beforeEach` to reset call counts between tests.

### 4. Commit

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add --dry-run flag to bump command
fix: handle empty fscripts.md without crashing
chore: bump vitest to 4.2
docs: update CONTRIBUTING with plugin guide
test: add coverage for runParallel env var parsing
```

### 5. Open a pull request

- Target the `Development` branch.
- Describe **what** you changed and **why** — not a list of files touched.
- CI must be green before a review. Fix any failing tests or coverage drops first.

---

## Adding a new command

1. Add the yargs `.command(...)` block in `index.js`.
2. Put the implementation in `lib/<your-feature>/`.
3. Add tests in `tests/<your-feature>/`.
4. Run `yarn test:coverage` to make sure thresholds still pass.
5. Update `fscripts.md` with a new task entry if your command is useful for contributors.

---

## Adding a plugin

Plugins live in `lib/plugins/` and are auto-discovered at startup. A plugin is a directory with an `index.js` that exports:

```js
export const name = "my-plugin";
export const description = "What this plugin does";
export async function run() { /* ... */ }
```

Drop it in `lib/plugins/` and `fsr` will pick it up. You can also fire lifecycle hooks:

```js
import { fireHook } from "../plugins/hooks.js";
await fireHook("post-task", { taskName: "my-plugin", duration: 500, success: true });
```

---

## Reporting bugs

Open a GitHub issue with:
- `node --version` and OS
- The command you ran
- What you expected vs what happened
- A minimal `fscripts.md` that reproduces it (if relevant)

---

## What we probably won't accept

- TypeScript, CSS-in-JS, or any bundler that isn't already here
- Dependencies that replicate functionality already in Node.js built-ins
- Interactive UI changes that break headless / non-TTY environments
- Changes that lower test coverage below the thresholds

When in doubt, open an issue first and discuss before writing code.

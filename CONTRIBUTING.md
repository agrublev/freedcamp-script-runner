# Contributing to fsr

Thanks for helping! `fsr` is intentionally small — a script runner that lives in a Markdown file. Since the Rust rewrite, the whole CLI is one Rust binary; the only JavaScript left is the user-plugin host.

---

## Quick start

```bash
git clone https://github.com/agrublev/freedcamp-script-runner.git
cd freedcamp-script-runner
cargo build --release        # binary at target/release/fsr
cargo test                   # make sure everything passes before you touch anything
```

Requirements: Rust (stable), and Node 22+ only if you want to exercise the plugin host.

---

## How the project is structured

```
src/
  main.rs            # CLI entry — all clap commands live here
  parse.rs           # fscripts.md → tasks (headings + fenced code blocks)
  runner.rs          # task execution (bash + JS blocks, run-s / run-p)
  plugins.rs         # user-plugin host (spawns src/plugins/host.mjs via Node)
  ui/                # ratatui pickers (task, fuzzy, autocomplete)
  encryption.rs      # encrypt/decrypt (OpenSSL/CryptoJS-compatible)
  release.rs         # bump + upgrade
  ai_commit.rs       # AI-powered commit grouping (Anthropic API)
  ...
src/plugins/host.mjs  # JSON-lines plugin host, embedded into the binary
tests/                # cargo tests + golden fixtures from the JS era
```

**Key rules:**

- **Rust for the binary.** Everything `fsr` ships as a command is implemented in `src/`. No new JavaScript runtime modules.
- **Plugins stay JavaScript.** A plugin is a directory with an `index.js`; the Rust binary embeds `src/plugins/host.mjs` and talks to it over JSON lines.
- **Port parity.** `src/` mirrors the old JS implementation (`lib/`) — keep names and behaviour aligned when touching a ported module.

---

## Making changes

### 1. Branch off `Development`

Never commit directly to `Development` — `fsr branch` creates a branch to prevent it.

```bash
git checkout -b feat/my-change Development
```

### 2. Write the code

- Keep files under ~400 lines; split larger concerns into their own module.
- Route side effects (file I/O, network, process spawning) through dedicated modules, not inline in `main.rs`.
- Prefer `anyhow::Result` for fallible paths and keep user-facing errors actionable.

### 3. Test

```bash
cargo test                 # run tests (fast, no coverage)
cargo test --test rust_ui  # snapshot tests for the pickers
cargo clippy               # lint
```

Every change to `src/` should have a corresponding test. Golden fixtures in `tests/rust_fixtures/` are frozen snapshots of the JS-era parser; don't regenerate them unless you deliberately change parser behaviour.

### 4. Commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add fsr deploy:staging
fix: handle empty fscripts.md gracefully
chore: bump rust to 1.90
```

---

## Adding a new command

1. Add a `#[derive(Subcommand)]` variant in `src/main.rs`.
2. Implement the behaviour in `src/` (a new module or an existing one).
3. Add tests in `tests/`.
4. Update `Readme.md` and `fscripts.md` if the command is user-facing.

---

## Plugins

Plugins are JavaScript and live in one of these places:

- `examples/plugins/` — shipped examples (`hello-world`, `task-timer`, `task-notifier`, `deployment`)
- `.fsr/plugins/<name>/` — project-local plugins
- `node_modules/fscr-plugin-*/` — npm plugins

A plugin is a directory with an `index.js` that exports a default object:

```js
export default {
    name: "my-plugin",
    description: "What it does",
    async init(context) {
        context.registerHook("pre-task", ({ taskName }) => {
            context.logger.info(`About to run: ${taskName}`);
        });
    },
};
```

Drop it in `.fsr/plugins/my-plugin/` and `fsr` will pick it up. See `examples/plugins/README.md` for the full contract.

---

## Reporting bugs

Open an issue with:
- `fsr --version`
- OS
- A minimal `fscripts.md` that reproduces the problem

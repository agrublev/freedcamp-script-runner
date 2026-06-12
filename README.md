# fscr — the Freedcamp Script Runner (`fsr`)

> The simplest way to run your npm‑type tasks. Write a beautiful, documented Markdown file —
> `fsr` runs it for you, with a lot of flexibility.

Instead of cramming logic into `package.json` `"scripts"`, you keep an **`fscripts.md`** file
where every task is a Markdown section: a title, an optional description, and a fenced code
block. `fsr` parses it and runs the task you pick — interactively or by name.

```bash
npm install -g fscr      # gives you the `fsr` and `fscr` commands
fsr                       # interactive menu
fsr run start:web         # run a specific task
fsr list                  # fuzzy-find any task
```

## Example `fscripts.md`

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

Each `#` heading is a **category**; each `##` heading is a **task** (its title is the task
name, the paragraph after it is the description, and the following code block is the script).
` ```bash ` blocks run as shell commands; ` ```javascript ` blocks run in‑process.

## Common commands

| Command | What it does |
|---|---|
| `fsr` | Interactive top‑level menu |
| `fsr start` | Pick a category, then a task (recent tasks pinned on top) |
| `fsr list` | Fuzzy‑autocomplete across all tasks |
| `fsr run <task>` | Run one task by name |
| `fsr run-s <a> <b>` | Run tasks **sequentially** |
| `fsr run-p <a> <b>` | Run tasks **in parallel** |
| `fsr generate` | Scaffold `sample.fscripts.md` from `package.json` |
| `fsr toc` | Generate/refresh the table of contents |
| `fsr doctor` | Environment diagnostics (`--fix` to auto‑fix) |
| `fsr encryption` | Encrypt/decrypt secret files (AES‑192‑CBC) |
| `fsr upgrade` / `fsr bump` | Upgrade deps / bump version |

## 📖 Full documentation

**See [`docs/FSR.md`](./docs/FSR.md) for the complete guide** to the `fscripts.md` format,
every command and option, configuration, encryption, caching, and shell completions.

Other references live in [`docs/`](./docs); historical v7 implementation notes are archived in
[`docs/archive/`](./docs/archive).

---

> The sample `config.json` in this repo decrypts with the password **`secret`**.

MIT © Angel Grablev

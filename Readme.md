# ⚡ fsr

> ✨ **Your scripts. Documented. Runnable. In one Markdown file.**

`fsr` is the script runner that lives in your docs — not buried in JSON. 🚀

You know the drill 😤: you clone a repo, there's a `README.md` that vaguely gestures at some scripts, and a `package.json` full of cryptic one-liners. Nobody knows what to run. Nobody knows what anything does. You Slack someone. They don't know either. Someone runs the wrong thing. Staging goes down at 9am. ☠️

**`fsr` fixes this.** It collapses your documentation AND your scripts into a single file — `fscripts.md`. It's Markdown. It's human-readable. And it actually runs. 🎉

---

## 📦 install

```bash
npm i -g fscr
```

> 💡 Package name: `fscr`. Command: `fsr`. Yes, on purpose. 😄

---

## 🚀 get started in 3 commands

```bash
npm i -g fscr        # 📦 install fsr globally
fsr generate         # ✨ imports your package.json scripts → fscripts.md
fsr                  # 🎯 interactive picker — choose and run
```

That's it. Your `package.json` scripts are now **documented, readable, and runnable** from a single Markdown file. No more mystery. No more Slack messages. No more broken staging environments. 🙌

---

## 🤔 what is fscripts.md?

`fscripts.md` is your **new source of truth**. 📖

It's a plain Markdown file where:

-   📝 Each script is a **heading**
-   💬 The **description** is prose right below it
-   ▶️ The actual **command** lives in a code block
-   🟰 The **docs** and the **runner** are the same file — always in sync

```markdown
## start:web
```

🌐 Starts the local dev server on port 3000. Run this first.

```bash
node server.js
```

## build:prod

🏗️ Full production build. Cleans dist/, compiles, minifies. Takes ~2 min.

```bash
npm run clean && npm run compile && npm run minify
```

---

## 🤯 full javascript blocks — yes, really

`fscripts.md` isn't just for bash. You can write **full executable JavaScript** right in your Markdown: 🔥

````markdown
## db:seed

🌱 Seeds the local database with test fixtures. Wipes existing data first — don't run on prod.

```javascript
import { seed } from "./db/seed.js";
await seed({ wipe: true });
```
````

Real Node.js. Executed directly. Documented inline. No extra files. 💥

---

## 🎮 commands

| command              | what it does                                                        |
| -------------------- | ------------------------------------------------------------------- |
| ⚡ `fsr`             | interactive picker — shows all scripts + plugins, just pick and run |
| 🗂️ `fsr start`       | browse scripts by category                                          |
| 🔍 `fsr list`        | fuzzy search across all tasks                                       |
| ▶️ `fsr run [task]`  | run a specific named task directly                                  |
| 🔗 `fsr run-s t1 t2` | run tasks sequentially, one after another                           |
| ⚡ `fsr run-p t1 t2` | run tasks in parallel, at the same time                             |
| ✨ `fsr generate`    | import `package.json` scripts → `fscripts.md`                       |
| 📋 `fsr toc`         | generate / update Table of Contents in `fscripts.md`                |
| 📦 `fsr scripts`     | interactive picker for `package.json` scripts only                  |
| 🔐 `fsr encrypt`     | password-protect secret file(s)                                     |
| 🔓 `fsr decrypt`     | decrypt secret file(s)                                              |
| 🔒 `fsr encryption`  | interactive encrypt/decrypt menu                                    |
| 🚀 `fsr bump`        | bump version in `package.json` + beautify it                        |
| ⬆️ `fsr upgrade`     | upgrade all packages (respects `ignore-upgrade` list)               |
| 🩺 `fsr doctor`      | run diagnostics & health check                                      |
| 💻 `fsr completion`  | shell completions for bash, zsh, fish, powershell                   |
| 🌿 `fsr branch`      | validate you're not on dev, create a new branch                     |
| 🧹 `fsr clear`       | clear recent task history                                           |

---

## ⚡ parallel & sequential execution

Run multiple scripts **at the same time** 🚀:

```bash
fsr run-p start:web start:desktop start:api
```

Or **one after another** 🔗:

```bash
fsr run-s lint test build
```

No extra config. No setup. Just works. ✅

---

## 🔐 encryption

Keep secrets safe without a third-party vault 🔒:

```bash
fsr encrypt    # 🔐 password-protect any file(s)
fsr decrypt    # 🔓 unlock them when you need them
```

Perfect for `.env` files, credentials, config secrets. Built right in. No extra tools needed. 🛡️

---

## 🔌 plugins

`fsr` has a **plugin system** 🧩. Plugins hook into execution — fire logic **before or after** any script runs.

Perfect for:

-   🧹 Clearing cache before a build
-   📬 Sending notifications after deploy
-   📊 Logging execution time
-   🔍 Anything your workflow needs

Plugins show up right alongside built-in commands in the **interactive picker**. No extra steps. No ceremony. 🎉

---

## 📋 table of contents

Your `fscripts.md` grows fast 📈. Keep it navigable:

```bash
fsr toc
```

Generates and updates a **Table of Contents** at the top of your `fscripts.md`. Auto-linked. Always current. ✅

---

## 🩺 doctor

Something broken? Run the doc 🏥:

```bash
fsr doctor            # 🔍 check system health
fsr doctor --fix      # 🔧 auto-fix where possible
fsr doctor --json     # 📊 output results as JSON (great for CI)
fsr doctor --verbose  # 🔬 show everything
```

---

## 😤 why not just use package.json?

`package.json` scripts have **four problems**:

| problem            | reality                                          |
| ------------------ | ------------------------------------------------ |
| 😵 **Invisible**   | cryptic one-liners with zero explanation         |
| 🏝️ **Isolated**    | docs live somewhere else — or nowhere at all     |
| 🚧 **Inflexible**  | no prose, no full scripts, no real structure     |
| 🕵️ **A black box** | every new teammate asks the exact same questions |

`fsr` doesn't replace `package.json`. It makes it **irrelevant as an interface**. 😎

You write in Markdown. Humans read it. `fsr` runs it.

---

## 📝 the fscripts.md format

````markdown
# 🗂️ Group Name

## script-name

Description of what this does, when to run it, any gotchas. ✍️

```bash
your-command --here
```
````

## another-script

```javascript
// 🟨 full Node.js — executed directly
import { something } from "./lib/index.js";
await something();
```

-   🗂️ **Groups** = top-level `#` headings
-   ▶️ **Tasks** = `##` headings (the script name)
-   💬 **Docs** = prose between the heading and code block
-   🔥 **Runner** = the code block itself (`bash` or `javascript`)

---

## 🆚 fsr vs. the alternatives

|                          | `fsr` | raw `package.json` | Makefile | nx / turbo |
| ------------------------ | ----- | ------------------ | -------- | ---------- |
| 📖 Human-readable docs   | ✅    | ❌                 | 😬       | ❌         |
| ▶️ Run from Markdown     | ✅    | ❌                 | ❌       | ❌         |
| 🟨 Full JS script blocks | ✅    | ❌                 | ❌       | ❌         |
| ⚡ Parallel execution    | ✅    | ⚠️                 | ⚠️       | ✅         |
| 🔐 Built-in encryption   | ✅    | ❌                 | ❌       | ❌         |
| 🎮 Interactive picker    | ✅    | ❌                 | ❌       | ❌         |
| 🔌 Plugin system         | ✅    | ❌                 | ❌       | ✅         |
| 📦 Zero config           | ✅    | ✅                 | ❌       | ❌         |
| 🚀 3-command onboarding  | ✅    | ❌                 | ❌       | ❌         |

---

## 💡 pro tips

-   🔄 Run `fsr generate` on any existing repo — instant `fscripts.md` from your `package.json`
-   🎯 Just type `fsr` — the interactive picker means you never have to memorize a command name
-   🟨 Use `javascript` blocks for scripts that need real logic — imports, async, conditionals
-   🔌 Build a plugin to clear cache before every run — set it once, forget it forever
-   📋 Run `fsr toc` after adding new scripts — keeps your `fscripts.md` navigable
-   🩺 Run `fsr doctor` when something feels off — it'll tell you what's wrong

---

## 📄 license

MIT 🎉

---

_⚡ Built by the [Freedcamp](https://freedcamp.com) team. Battle-tested on our own repos before unleashing it on yours. We eat our own cooking. 🍳_

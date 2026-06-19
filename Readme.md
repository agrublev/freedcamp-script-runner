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
| 💬 `fsr commit`      | stage + commit with AI-generated conventional commit messages        |
| 🔌 `fsr plugins`     | list all installed plugins (built-in and npm `fscr-plugin-*`)       |

> 🌍 **`--env <name>`** (alias `-e`) is a global flag that works with every command above. It restricts the visible and runnable tasks to a specific [environment profile](#-environment-profiles).

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

### built-in plugins

Drop a folder into `lib/plugins/` with an `index.js` that exports a default plugin object:

```js
// lib/plugins/my-plugin/index.js
export default {
    name: "my-plugin",
    version: "1.0.0",
    description: "Does something great",

    async init(context) {
        // Hook into lifecycle events
        context.registerHook("post-task", async ({ taskName, duration, success }) => {
            context.logger.info(`[my-plugin] ${taskName} finished in ${duration}ms`);
        });

        // Register new fsr commands
        context.registerCommand({
            name: "my-cmd",
            description: "My custom command",
            handler: async (options, ctx) => {
                ctx.logger.success("Hello from my-plugin!");
            }
        });
    },

    // Optional: appear in the interactive picker
    async run(ctx) {
        ctx.logger.success("Running my-plugin interactively");
    }
};
```

### project-local plugins

Drop a plugin into `.fsr/plugins/<name>/index.js` in your project root — no config, no install step:

```
my-repo/
  .fsr/
    plugins/
      cache-cleaner/
        index.js   ← same export contract as built-in plugins
```

Useful for repo-specific automation you don't want to publish. Committed to the repo alongside your code.

### npm plugins

Any npm package named `fscr-plugin-*` is **auto-discovered** at startup — no config needed. Just install it:

```bash
npm i fscr-plugin-notify
```

`fsr` picks it up automatically on next run. Same plugin contract as built-in plugins.

### plugin storage

Plugins get persistent key-value storage scoped to their name, written to `.fscr/<plugin-name>/storage.json`:

```js
async init(context) {
    // Read previously saved data (returns {} if nothing saved yet)
    const data = context.getStorage();

    context.registerHook("post-task", async ({ taskName }) => {
        data.runs = (data.runs || 0) + 1;
        context.setStorage(data); // persists to disk
    });
}
```

### lifecycle hooks

| hook | when it fires |
| ---- | ------------- |
| `pre-task` | before any fsr command or plugin run starts |
| `post-task` | after any fsr command or plugin run completes successfully |
| `post-command` | after any plugin-registered command completes |
| `task-error` | when a command or plugin run throws |

### list installed plugins

```bash
fsr plugins
```

Shows all loaded plugins with their source (`[builtin]`, `[local]`, or `[npm]`) and description.

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
-   🌍 **Env boundary** = `## [env:name]` heading — tags all subsequent tasks in the group with that environment profile (see [environment profiles](#-environment-profiles))

---

## 🌍 environment profiles

Different environments — same `fscripts.md`. Use `## [env:name]` headers inside any group to tag tasks to a specific deployment target, then pass `--env <name>` to surface only those tasks.

### syntax

Add an `## [env:name]` heading anywhere inside a `#` group. Every `##` task that follows it (until the next `## [env:…]` header or the next `#` group) inherits that environment tag:

````markdown
# Deployment

## [env:staging]

## deploy:api

Deploy the API to the staging cluster.

```bash
node deploy.js --env staging
```

## deploy:web

```bash
node web.js --env staging
```

## [env:production]

## deploy:api

Deploy the API to the production cluster.

```bash
node deploy.js --env production
```
````

### using `--env`

Pass `--env <name>` (alias `-e`) to **any** `fsr` command. Only tasks tagged with that profile are shown or executed. Tasks defined before any `## [env:…]` header (i.e. with no profile) are excluded when `--env` is set.

```bash
fsr --env staging          # 🎯 interactive picker — staging tasks only
fsr start --env staging    # 🗂️  browse staging tasks by category
fsr list --env production  # 🔍 fuzzy-search production tasks
fsr run deploy:api --env staging   # ▶️  run the staging variant of deploy:api
fsr run-s deploy:api deploy:web --env staging  # 🔗 sequential, staging only
fsr run-p deploy:api deploy:web --env staging  # ⚡ parallel, staging only
```

The `--env` flag is **global**: it works on every command that reads `fscripts.md`.

### behaviour at a glance

| scenario | result |
| -------- | ------ |
| No `--env` flag | all tasks returned (env-tagged and plain alike) |
| `--env staging` | only tasks under `## [env:staging]` blocks |
| New `#` group heading | env resets to none for tasks in that group |
| Same task name in two env sections | both preserved; `--env` picks the right one |
| `--env unknown` | empty result — no tasks, no error |

### worked example

```markdown
# Deploy

## build

Build the project (no env tag — always available).

```bash
npm run build
```

## [env:staging]

## push

Push image to staging registry.

```bash
docker push registry/myapp:staging
```

## [env:production]

## push

Push image to production registry.

```bash
docker push registry/myapp:production
```
```

```bash
fsr run push --env staging     # runs: docker push registry/myapp:staging
fsr run push --env production  # runs: docker push registry/myapp:production
```

---

## 🆚 fsr vs. the alternatives

|                              | `fsr` | raw `package.json` | Makefile | nx / turbo |
| ---------------------------- | ----- | ------------------ | -------- | ---------- |
| 📖 Human-readable docs       | ✅    | ❌                 | 😬       | ❌         |
| ▶️ Run from Markdown         | ✅    | ❌                 | ❌       | ❌         |
| 🟨 Full JS script blocks     | ✅    | ❌                 | ❌       | ❌         |
| ⚡ Parallel execution        | ✅    | ⚠️                 | ⚠️       | ✅         |
| 🔐 Built-in encryption       | ✅    | ❌                 | ❌       | ❌         |
| 🎮 Interactive picker        | ✅    | ❌                 | ❌       | ❌         |
| 🔌 Plugin system (npm-based) | ✅    | ❌                 | ❌       | ✅         |
| 🌍 Environment profiles      | ✅    | ❌                 | ❌       | ⚠️         |
| 📦 Zero config               | ✅    | ✅                 | ❌       | ❌         |
| 🚀 3-command onboarding      | ✅    | ❌                 | ❌       | ❌         |

---

## 💡 pro tips

-   🔄 Run `fsr generate` on any existing repo — instant `fscripts.md` from your `package.json`
-   🎯 Just type `fsr` — the interactive picker means you never have to memorize a command name
-   🟨 Use `javascript` blocks for scripts that need real logic — imports, async, conditionals
-   🔌 Build a plugin to clear cache before every run — set it once, forget it forever
-   📦 Publish a plugin as `fscr-plugin-<name>` on npm — anyone who installs it gets it auto-loaded
-   📋 Run `fsr toc` after adding new scripts — keeps your `fscripts.md` navigable
-   🩺 Run `fsr doctor` when something feels off — it'll tell you what's wrong
-   💬 Run `fsr commit` to stage and commit with AI-written conventional commit messages
-   🌍 Use `## [env:staging]` / `## [env:production]` sections and `fsr --env staging` in CI — one `fscripts.md`, zero duplicated scripts

---

## 📄 license

MIT 🎉

---

_⚡ Built by the [Freedcamp](https://freedcamp.com) team. Battle-tested on our own repos before unleashing it on yours. We eat our own cooking. 🍳_

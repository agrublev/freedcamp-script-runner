// Plugin host for the Rust fsr binary. Loads user plugins exactly like
// lib/plugins/loader.js (project-local .fsr/plugins/<name>/index.js and npm
// node_modules/fscr-plugin-*/index.js, plus FSR_PLUGIN_DIRS for extra roots)
// and speaks JSON lines. Built-in plugins (deployment, task-notifier) are
// native in Rust and are not loaded here.
//
// Modes (argv[2]):
//   list                  → one message {type:"list", plugins, commands}
//   serve                 → request/response loop on stdin:
//                           {id, op:"hook", name, data} → {id, ok, error?}
//   command <name> <json> → run a registered command handler with argv json
//   run <name>            → run a plugin's run()
// Protocol messages are written to stdout prefixed by "\x1eFSR " so plugin
// console output can be passed through untouched.
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, delimiter } from "node:path";
import { pathToFileURL } from "node:url";
import readline from "node:readline";

const MARK = "\x1eFSR ";
const send = (o) => process.stdout.write(MARK + JSON.stringify(o) + "\n");
const cwd = process.cwd();

const ts = () => {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
};
const gray = (s) => `\x1b[90m${s}\x1b[39m`;
// Same shape as fsrLog.log/error/warn wrapping chalk colors in loader.js.
const logger = {
    info: (m) => console.log(`${gray(ts())} \x1b[90;1m[LOG]\x1b[0m \x1b[36m${m}\x1b[39m`),
    success: (m) => console.log(`${gray(ts())} \x1b[90;1m[LOG]\x1b[0m \x1b[32m${m}\x1b[39m`),
    error: (m) => console.error(`${gray(ts())} \x1b[31;1m× [ERROR]\x1b[0m \x1b[31m${m}\x1b[39m`),
    warn: (m) => console.warn(`${gray(ts())} \x1b[33;1m⚠ [WARN]\x1b[0m \x1b[33m${m}\x1b[39m`),
};

const entries = () => {
    const out = [];
    const scan = (root, source, prefix) => {
        try {
            for (const e of readdirSync(root, { withFileTypes: true })) {
                if (!e.isDirectory() || (prefix && !e.name.startsWith(prefix))) continue;
                const entryPath = join(root, e.name, "index.js");
                if (existsSync(entryPath)) out.push({ dir: e.name, entryPath, source });
            }
        } catch { /* missing dir is fine */ }
    };
    for (const extra of (process.env.FSR_PLUGIN_DIRS || "").split(delimiter).filter(Boolean)) scan(extra, "local");
    scan(join(cwd, ".fsr", "plugins"), "local");
    scan(join(cwd, "node_modules"), "npm", "fscr-plugin-");
    return out;
};

// Same storage layout as loader.js makeStorage: <cwd>/.fscr/<plugin>/storage.json
const makeStorage = (name) => {
    const dir = join(cwd, ".fscr", name);
    const file = join(dir, "storage.json");
    return {
        getStorage: () => { try { return JSON.parse(readFileSync(file, "utf8")); } catch { return {}; } },
        setStorage: (data) => {
            try { mkdirSync(dir, { recursive: true }); writeFileSync(file, JSON.stringify(data, null, 2)); }
            catch (e) { logger.warn(`[plugin:${name}] Storage write failed: ${e.message}`); }
        },
    };
};

const hooks = new Map();
const commands = [];
const plugins = [];

const load = async () => {
    for (const { dir, entryPath, source } of entries()) {
        try {
            const { default: plugin } = await import(pathToFileURL(entryPath).href);
            if (!plugin?.init) continue;
            const name = plugin.name || dir;
            const context = {
                logger,
                version: process.env.FSR_VERSION,
                registerHook: (h, fn) => { if (!hooks.has(h)) hooks.set(h, []); hooks.get(h).push(fn); },
                registerCommand: (def) => commands.push({ ...def, plugin: name }),
                ...makeStorage(name),
            };
            await plugin.init(context);
            plugins.push({ name, description: plugin.description || "", source, runnable: typeof plugin.run === "function", plugin });
        } catch (err) {
            logger.error(`[plugin:${dir}] Failed to load: ${err.message}`);
        }
    }
};

const fire = async (name, data) => {
    for (const fn of hooks.get(name) ?? []) {
        try { await fn(data); } catch (err) { logger.error(`[hook:${name}] ${err.message}`); }
    }
};

const describe = () => ({
    plugins: plugins.map(({ name, description, source, runnable }) => ({ name, description, source, runnable })),
    commands: commands.map((c) => ({
        name: c.name, description: c.description || "", aliases: c.aliases || [], plugin: c.plugin,
        options: (c.options || []).map((o) => ({ flags: o.flags, description: o.description || "", type: o.type || "string" })),
    })),
});

const mode = process.argv[2];
await load();
if (mode === "list") {
    send({ type: "list", ...describe() });
} else if (mode === "serve") {
    send({ type: "ready", ...describe() });
    const rl = readline.createInterface({ input: process.stdin });
    for await (const line of rl) {
        if (!line.trim()) continue;
        let req;
        try { req = JSON.parse(line); } catch { continue; }
        if (req.op === "hook") {
            const data = { ...req.data };
            if (data.error && typeof data.error === "string") data.error = new Error(data.error);
            await fire(req.name, data);
            send({ id: req.id, ok: true });
        } else if (req.op === "exit") {
            send({ id: req.id, ok: true });
            break;
        }
    }
    process.exit(0);
} else if (mode === "command") {
    const name = process.argv[3];
    const argv = JSON.parse(process.argv[4] || "{}");
    const cmd = commands.find((c) => c.name === name || (c.aliases || []).includes(name));
    if (!cmd) { logger.error(`Unknown plugin command: ${name}`); process.exit(2); }
    const start = Date.now();
    await fire("pre-task", { taskName: cmd.name, command: cmd.name });
    try {
        await cmd.handler(argv, { logger });
        const d = { taskName: cmd.name, command: cmd.name, duration: Date.now() - start, success: true };
        await fire("post-task", d);
        await fire("post-command", d);
    } catch (err) {
        await fire("task-error", { taskName: cmd.name, command: cmd.name, duration: Date.now() - start, error: err });
        logger.error(err.message);
        process.exit(1);
    }
} else if (mode === "run") {
    const p = plugins.find((x) => x.name === process.argv[3] && x.runnable);
    if (!p) { logger.error(`Unknown or non-runnable plugin: ${process.argv[3]}`); process.exit(2); }
    const start = Date.now();
    await fire("pre-task", { taskName: p.name });
    try {
        await p.plugin.run({ logger });
        await fire("post-task", { taskName: p.name, duration: Date.now() - start, success: true });
    } catch (err) {
        await fire("task-error", { taskName: p.name, duration: Date.now() - start, error: err });
        logger.error(err.message);
        process.exit(1);
    }
} else {
    console.error("usage: host.mjs list|serve|command <name> <argv-json>|run <name>");
    process.exit(2);
}

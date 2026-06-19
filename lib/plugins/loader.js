import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { registerHook, fireHook } from "./hooks.js";
import fsrLog from "../utils/console.js";

const resolvePluginsDir = () => {
    const candidates = [join(dirname(fileURLToPath(import.meta.url))), resolve(process.cwd(), "lib", "plugins")];

    for (const dirPath of candidates) {
        if (!existsSync(dirPath)) continue;
        try {
            const entries = readdirSync(dirPath, { withFileTypes: true });
            if (entries.some((e) => e.isDirectory() && existsSync(join(dirPath, e.name, "index.js")))) {
                return dirPath;
            }
        } catch {
            // fall through to next candidate
        }
    }

    return candidates[0];
};

const pluginsDir = resolvePluginsDir();

const logger = {
    info: (msg) => fsrLog.log(chalk.cyan(msg)),
    success: (msg) => fsrLog.log(chalk.green(msg)),
    error: (msg) => fsrLog.error(chalk.red(msg)),
    warn: (msg) => fsrLog.warn(chalk.yellow(msg)),
};

/** Scan node_modules for fscr-plugin-* packages that have an index.js. */
export const findExternalPluginDirs = (cwd = process.cwd()) => {
    const nmDir = join(cwd, "node_modules");
    const result = [];
    try {
        const entries = readdirSync(nmDir, { withFileTypes: true });
        for (const e of entries) {
            if (!e.isDirectory() || !e.name.startsWith("fscr-plugin-")) continue;
            const entryPath = join(nmDir, e.name, "index.js");
            if (existsSync(entryPath)) result.push({ dir: e.name, entryPath });
        }
    } catch { /* no node_modules or unreadable — not an error */ }
    return result;
};

/** Simple JSON key-value store scoped to a plugin name. */
const makeStorage = (pluginName, cwd = process.cwd()) => {
    const storageDir = join(cwd, ".fscr", pluginName);
    const storageFile = join(storageDir, "storage.json");
    return {
        getStorage: () => {
            try { return JSON.parse(readFileSync(storageFile, "utf8")); } catch { return {}; }
        },
        setStorage: (data) => {
            try {
                mkdirSync(storageDir, { recursive: true });
                writeFileSync(storageFile, JSON.stringify(data, null, 2));
            } catch (e) {
                logger.warn(`[plugin:${pluginName}] Storage write failed: ${e.message}`);
            }
        },
    };
};

export const loadPlugins = async (cwd = process.cwd()) => {
    const commands = [];
    const runnablePlugins = [];

    // Collect (dir, entryPath, source) tuples — built-ins, then local, then npm.
    const pluginEntries = [];

    let builtinEntries;
    try {
        builtinEntries = readdirSync(pluginsDir, { withFileTypes: true });
    } catch {
        return { commands, runnablePlugins };
    }

    for (const dir of builtinEntries.filter((e) => e.isDirectory())) {
        const entryPath = join(pluginsDir, dir.name, "index.js");
        if (existsSync(entryPath)) pluginEntries.push({ dir: dir.name, entryPath, source: "builtin" });
    }

    // Project-local plugins at <cwd>/.fsr/plugins/<name>/index.js
    const localPluginsDir = join(cwd, ".fsr", "plugins");
    try {
        const localEntries = readdirSync(localPluginsDir, { withFileTypes: true });
        for (const dir of localEntries.filter((e) => e.isDirectory())) {
            const entryPath = join(localPluginsDir, dir.name, "index.js");
            if (existsSync(entryPath)) pluginEntries.push({ dir: dir.name, entryPath, source: "local" });
        }
    } catch { /* .fsr/plugins doesn't exist — fine */ }

    for (const { dir, entryPath } of findExternalPluginDirs(cwd)) {
        pluginEntries.push({ dir, entryPath, source: "npm" });
    }

    for (const { dir, entryPath, source } of pluginEntries) {
        try {
            const { default: plugin } = await import(entryPath);
            if (!plugin?.init) continue;

            const { getStorage, setStorage } = makeStorage(plugin.name || dir, cwd);
            const context = {
                logger,
                registerHook,
                registerCommand: (def) => commands.push(def),
                getStorage,
                setStorage,
            };

            await plugin.init(context);

            if (typeof plugin.run === "function") {
                runnablePlugins.push({
                    name: plugin.name || dir,
                    description: plugin.description || "",
                    source,
                    run: () => plugin.run({ logger }),
                });
            }
        } catch (err) {
            logger.error(`[plugin:${dir}] Failed to load: ${err.message}`);
        }
    }

    return { commands, runnablePlugins };
};

export const registerPluginCommands = (yargsInstance, commands) => {
    for (const cmd of commands) {
        const buildHandler = (name) => async (argv) => {
            const start = Date.now();
            await fireHook("pre-task", { taskName: name, command: name });
            try {
                await cmd.handler(argv, { logger });
                const hookData = { taskName: name, command: name, duration: Date.now() - start, success: true };
                await fireHook("post-task", hookData);
                await fireHook("post-command", hookData);
            } catch (err) {
                const hookData = { taskName: name, command: name, duration: Date.now() - start, error: err };
                await fireHook("task-error", hookData);
                throw err;
            }
        };

        const buildOptions = (yargs) => {
            for (const opt of cmd.options || []) {
                const long = opt.flags.match(/--([a-z-]+)/)?.[1];
                const short = opt.flags.match(/-([a-z])[^-]/)?.[1];
                if (!long) continue;
                yargs.option(long, {
                    alias: short,
                    description: opt.description,
                    type: opt.type || "string",
                });
            }
        };

        yargsInstance = yargsInstance.command(cmd.name, cmd.description || "", buildOptions, buildHandler(cmd.name));

        for (const alias of cmd.aliases || []) {
            yargsInstance = yargsInstance.command(alias, false, buildOptions, buildHandler(cmd.name));
        }

        for (const ex of cmd.examples || []) {
            yargsInstance = yargsInstance.example(ex, "");
        }
    }
    return yargsInstance;
};

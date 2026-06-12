import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { registerHook, fireHook } from "./hooks.js";

const pluginsDir = join(dirname(fileURLToPath(import.meta.url)));

const logger = {
    info: (msg) => console.log(chalk.cyan(msg)),
    success: (msg) => console.log(chalk.green(msg)),
    error: (msg) => console.error(chalk.red(msg)),
    warn: (msg) => console.warn(chalk.yellow(msg)),
};

export const loadPlugins = async () => {
    const commands = [];

    let entries;
    try {
        entries = readdirSync(pluginsDir, { withFileTypes: true });
    } catch {
        return commands;
    }

    const dirs = entries.filter((e) => e.isDirectory());

    const runnablePlugins = [];

    for (const dir of dirs) {
        const entryPath = join(pluginsDir, dir.name, "index.js");
        if (!existsSync(entryPath)) continue;

        try {
            const { default: plugin } = await import(entryPath);
            if (!plugin?.init) continue;

            const context = {
                logger,
                registerHook,
                registerCommand: (def) => commands.push(def),
            };

            await plugin.init(context);

            if (typeof plugin.run === "function") {
                runnablePlugins.push({ name: plugin.name || dir.name, description: plugin.description || "", run: () => plugin.run({ logger }) });
            }
        } catch (err) {
            logger.error(`[plugin:${dir.name}] Failed to load: ${err.message}`);
        }
    }

    return { commands, runnablePlugins };
};

export const registerPluginCommands = (yargsInstance, commands) => {
    for (const cmd of commands) {
        yargsInstance = yargsInstance.command(
            cmd.name,
            cmd.description || "",
            (yargs) => {
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
            },
            async (argv) => {
                const start = Date.now();
                try {
                    await cmd.handler(argv, { logger });
                    await fireHook("post-task", { taskName: cmd.name, duration: Date.now() - start, success: true });
                } catch (err) {
                    await fireHook("task-error", { taskName: cmd.name, duration: Date.now() - start, error: err });
                    throw err;
                }
            }
        );

        for (const ex of cmd.examples || []) {
            yargsInstance = yargsInstance.example(ex, "");
        }
    }
    return yargsInstance;
};

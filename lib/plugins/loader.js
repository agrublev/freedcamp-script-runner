import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

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

    for (const dir of dirs) {
        const entryPath = join(pluginsDir, dir.name, "index.js");
        if (!existsSync(entryPath)) continue;

        try {
            const { default: plugin } = await import(entryPath);
            if (!plugin?.init) continue;

            const context = {
                logger,
                registerHook: () => {},
                registerCommand: (def) => commands.push(def),
            };

            await plugin.init(context);
        } catch (err) {
            logger.error(`[plugin:${dir.name}] Failed to load: ${err.message}`);
        }
    }

    return commands;
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
                        type: "boolean",
                    });
                }
            },
            async (argv) => {
                await cmd.handler(argv, { logger });
            }
        );

        for (const ex of cmd.examples || []) {
            yargsInstance = yargsInstance.example(ex, "");
        }
    }
    return yargsInstance;
};

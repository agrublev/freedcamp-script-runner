import chalk from "chalk";
import { loadPlugins, findExternalPluginDirs } from "@fsr/core";
import fsrLog from "@fsr/core/utils/console.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "plugins",
    desc: "List all installed plugins (built-in and npm fscr-plugin-*)",
    handler: async () => {
        const { runnablePlugins, commands: pluginCmds } = await loadPlugins();
        const external = findExternalPluginDirs();
        const allPlugins = [
            ...runnablePlugins,
            ...pluginCmds
                .filter((c) => !runnablePlugins.some((p) => p.name === c.name))
                .map((c) => ({
                    name: c.name,
                    description: c.description || "",
                    source: "builtin"
                }))
        ];
        if (allPlugins.length === 0) {
            fsrLog.log(chalk.yellow("No plugins found."));
            return;
        }
        fsrLog.log(chalk.bold(`\nInstalled plugins (${allPlugins.length}):`));
        fsrLog.log(chalk.dim("─".repeat(60)));
        for (const p of allPlugins) {
            const badge =
                p.source === "npm"
                    ? chalk.blue("[npm]")
                    : p.source === "local"
                    ? chalk.green("[local]")
                    : chalk.dim("[builtin]");
            fsrLog.log(`  ${badge} ${chalk.bold(p.name)}  ${chalk.dim(p.description)}`);
        }
        if (external.length > 0) {
            fsrLog.log(
                chalk.dim(`\n${external.length} npm plugin(s) discovered in node_modules.`)
            );
        }
        fsrLog.log("");
    },
    menu: true
};

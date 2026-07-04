import chalk from "chalk";
import { getEnvArg, selectPlugin, fsrLog } from "@fsr/core";
import { runCLICommand, parseTask, parseScriptFile } from "@fsr/core";
import { loadPlugins, registerPluginCommands } from "@fsr/core";
import { fireHook } from "@fsr/core";
import yargs from "yargs";

// Command packages
import branchCmd from "@fsr/cmd-branch";
import commitCmd from "@fsr/cmd-commit";
import startCmds from "@fsr/cmd-start";
import runCmds from "@fsr/cmd-run";
import upgradeCmd from "@fsr/cmd-upgrade";
import bumpCmd from "@fsr/cmd-bump";
import encryptionCmds from "@fsr/cmd-encryption";
import clearCmd from "@fsr/cmd-clear";
import generateCmds from "@fsr/cmd-generate";
import doctorCmd from "@fsr/cmd-doctor";
import pluginsCmd from "@fsr/cmd-plugins";
import completionCmd from "@fsr/cmd-completion";
import greetCmd from "@fsr/cmd-greet";

const taskName = chalk.rgb(39, 173, 96).bold.underline;
const textDescription = chalk.rgb(159, 161, 181);

/**
 * Single source of truth for all built-in fsr commands.
 *
 * Fields:
 *   cmd      — yargs command string (e.g. "run [task]")
 *   desc     — description shown in --help and the interactive picker
 *   builder  — optional yargs builder fn for positionals/options
 *   handler  — async (argv) => void
 *   examples — optional [[usage, description], ...] for multi-variant commands
 *   menu     — include in the bare-`fsr` interactive picker (default false)
 */
const COMMANDS = [
    branchCmd,
    commitCmd,
    ...startCmds,
    ...runCmds,
    upgradeCmd,
    bumpCmd,
    ...encryptionCmds,
    clearCmd,
    ...generateCmds,
    doctorCmd,
    pluginsCmd,
    completionCmd,
    greetCmd
];

(async () => {
    // ------------------------------------------------------------------
    // Inject NODE_ENV and FSR_ENV as early as possible — before yargs
    // invokes any command handler and before any child process spawns —
    // so that all subsequent code and spawned children inherit the value.
    //
    // We scan process.argv directly (rather than waiting for yargs) to
    // guarantee the assignment happens before yi.argv triggers handlers.
    // Handles both "--env staging" / "-e staging" and "--env=staging" forms.
    // ------------------------------------------------------------------
    const { env: _envProfile } = getEnvArg(process.argv.slice(2));
    const _profile = _envProfile || "development";
    process.env.NODE_ENV = _profile;
    process.env.FSR_ENV = _profile;
    // NOTE: We intentionally do NOT overwrite process.argv here.
    // --env / -e is registered as a global yargs option, so yargs will parse
    // it correctly from the original argv.  Stripping it was preventing
    // argv.env from being set inside command handlers (run-p, run-s, etc.).

    // clear();
    const { commands: pluginCommands, runnablePlugins } = await loadPlugins();

    // Build yargs from COMMANDS — single source of truth for registration,
    // examples, BUILTIN_COMMANDS, and the interactive picker menu.
    let yi = yargs(process.argv.slice(2)).usage("Usage: $0 <command> [options]");

    for (const { cmd, desc, builder, handler, examples } of COMMANDS) {
        yi = yi.command(cmd, desc, builder || (() => {}), handler);
        // Auto-generate a base example from the command name and description.
        const base = cmd.split(" ")[0];
        yi = yi.example(taskName(`$0 ${base}`), textDescription(desc));
        for (const [ex, exDesc] of examples || []) {
            yi = yi.example(taskName(ex), textDescription(exDesc));
        }
    }

    yi = yi
        .option("env", {
            alias: "e",
            type: "string",
            description:
                "Filter scripts to the named environment profile (defined via `## [env:name]` sections in fscripts.md)",
            global: true
        })
        .help();
    registerPluginCommands(yi, pluginCommands);

    // Derived from COMMANDS — no manual maintenance required.
    const BUILTIN_COMMANDS = new Set([
        ...COMMANDS.map((c) => c.cmd.split(" ")[0]),
        "help",
        ...pluginCommands.map((c) => c.name)
    ]);

    const argv = yi.argv;

    if (argv && argv._ && argv._.length === 0) {
        // Interactive picker: menu-flagged commands + plugins.
        const commandItems = COMMANDS.filter((c) => c.menu).map((c) => ({
            name: c.cmd.split(" ")[0],
            message: c.desc
        }));

        const pluginItems = runnablePlugins.map((p) => ({
            name: `plugin:${p.name}`,
            message: p.description
        }));

        const choice = await selectPlugin([...commandItems, ...pluginItems]);

        if (!choice) {
            fsrLog.log(chalk.green.bold("See you soon!"));
            return;
        }

        if (choice.startsWith("plugin:")) {
            const pluginName = choice.replace("plugin:", "");
            const pluginMatch = runnablePlugins.find((p) => p.name === pluginName);
            if (pluginMatch) {
                const start = Date.now();
                await fireHook("pre-task", { taskName: pluginMatch.name });
                try {
                    await pluginMatch.run();
                    await fireHook("post-task", {
                        taskName: pluginMatch.name,
                        duration: Date.now() - start,
                        success: true
                    });
                } catch (err) {
                    await fireHook("task-error", {
                        taskName: pluginMatch.name,
                        duration: Date.now() - start,
                        error: err
                    });
                }
            }
        } else {
            // Run the built-in command in-process instead of spawning a second
            // `yarn fsr <choice>`. Spawning a child renders a second Ink app on
            // the same inherited TTY, and the raw-mode handoff between the two
            // Ink runtimes intermittently swallows the first keypress (the
            // "press Enter twice to load a script" bug).
            const command = COMMANDS.find((c) => c.cmd.split(" ")[0] === choice);
            if (command) {
                await command.handler({ _: [choice], $0: "fsr", env: argv.env || null });
            }
        }
    } else if (argv._ && argv._.length > 0 && !BUILTIN_COMMANDS.has(argv._[0])) {
        // Bare task shorthand: `fsr release:publish` → same as `fsr run release:publish`
        const taskArg = argv._[0];
        const parsed = await parseScriptFile(argv.env ? { env: argv.env } : {});
        if (!parsed) {
            fsrLog.error(chalk.bold.underline.red("No fscripts.md file found"));
            return;
        }
        const taskData = parsed.allTasks.find((t) => t.name === taskArg);
        if (!taskData) {
            fsrLog.error(`${chalk.bold.underline.red("Task not found:")} ${taskArg}`);
            return;
        }
        await runCLICommand(parseTask(taskData));
    }
})();

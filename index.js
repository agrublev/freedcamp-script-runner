import bump from "./lib/release/bump.js";
import chalk from "chalk";
import { generateFScripts, generateToc } from "./lib/generators/index.js";
import parseScriptFile from "./lib/parsers/parseScriptsMd.js";
import upgradePackages from "./lib/upgradePackages.js";
import { runCLICommand, runParallel, runSequence } from "./lib/running/index.js";
import { clearRecent, startPackageScripts, startScripts } from "./lib/startScripts.js";
import parseTask from "./lib/running/parseTask.js";
import { selectPlugin } from "./lib/taskList.js";
import validateNotInDev from "./lib/git/validateNotDev.js";
import encrypt from "./lib/encryption/encryption.js";
import { clear } from "./lib/utils/index.js";
import doctor from "./lib/doctor/doctor.js";
import completion from "./lib/completions/completion.js";
import {
    loadPlugins,
    registerPluginCommands,
    findExternalPluginDirs
} from "./lib/plugins/loader.js";
import { fireHook } from "./lib/plugins/hooks.js";
import yargs from "yargs";
import fsrLog from "./lib/utils/console.js";
import commit from "./lib/git/commit.js";

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
    {
        cmd: "branch",
        desc: "Create a new branch — prevents commits directly on master or development",
        handler: async () => validateNotInDev()
    },
    {
        cmd: "commit",
        desc: "Stage and commit changes with AI-generated conventional commit messages",
        handler: async () => commit()
    },
    {
        cmd: "start",
        desc: "Choose a category then a task to run interactively",
        handler: async () => startScripts(),
        menu: true
    },
    {
        cmd: "scripts",
        desc: "Choose a script from package.json",
        handler: async () => startPackageScripts(),
        menu: true
    },
    {
        cmd: "list",
        desc: "Select any task with text autocompletion",
        handler: async () => startScripts(false),
        menu: true
    },
    {
        cmd: "run [task]",
        desc: "Run a specific task by name",
        builder: (y) => y.positional("task", { describe: "task name", default: "" }),
        handler: async (argv) => {
            const { task } = argv;
            const parsed = await parseScriptFile();
            if (!parsed) {
                fsrLog.error(chalk.bold.underline.red("No fscripts.md file found"));
                return;
            }
            const taskData = parsed.allTasks.find((t) => t.name === task);
            if (!taskData) {
                fsrLog.error(`${chalk.bold.underline.red("Task not found")} ${task}`);
                return;
            }
            await runCLICommand(parseTask(taskData));
        },
        examples: [["$0 run start:web", "Run task 'start:web'"]],
        menu: true
    },
    {
        cmd: "upgrade",
        desc: "Upgrade all packages except those listed in 'ignore-upgrade'",
        handler: async () => upgradePackages(),
        menu: true
    },
    {
        cmd: "bump",
        desc: "Bump the version in package.json and beautify it",
        handler: async (argv) => bump(argv.type, argv.skipGit === "true"),
        menu: true
    },
    {
        cmd: "run-s [tasks..]",
        desc: "Run a set of tasks sequentially",
        handler: async (argv) => runSequence(argv.tasks || [], await parseScriptFile()),
        examples: [["$0 run-s start:web start:desktop", "Run start:web then start:desktop"]],
        menu: true
    },
    {
        cmd: "run-p [tasks..]",
        desc: "Run tasks in parallel",
        handler: async (argv) => runParallel(argv.tasks || [], await parseScriptFile()),
        examples: [
            ["$0 run-p start:web start:desktop", "Run start:web and start:desktop simultaneously"]
        ],
        menu: true
    },
    {
        cmd: "encryption",
        desc: "Encrypt or decrypt secret files interactively",
        handler: async () => encrypt.init(),
        menu: true
    },
    {
        cmd: "encrypt",
        desc: "Encrypt secret files",
        handler: async () => encrypt.encrypt()
    },
    {
        cmd: "decrypt",
        desc: "Decrypt secret files",
        handler: async () => encrypt.decrypt()
    },
    {
        cmd: "clear",
        desc: "Clear recent task history",
        handler: async () => clearRecent()
    },
    {
        cmd: "generate",
        desc: "Generate a sample fscripts.md from package.json",
        handler: async () => generateFScripts(),
        menu: true
    },
    {
        cmd: "toc",
        desc: "Regenerate the Table of Contents in fscripts.md",
        handler: async (argv) => generateToc(argv._[1]),
        menu: true
    },
    {
        cmd: "doctor",
        desc: "Run diagnostics and check system health",
        builder: (y) =>
            y
                .option("fix", {
                    alias: "f",
                    type: "boolean",
                    description: "Auto-fix issues when possible",
                    default: false
                })
                .option("json", {
                    type: "boolean",
                    description: "Output results as JSON",
                    default: false
                })
                .option("verbose", {
                    alias: "v",
                    type: "boolean",
                    description: "Show verbose output",
                    default: false
                }),
        handler: async (argv) => doctor(argv),
        examples: [
            ["$0 doctor --fix", "Run diagnostics and auto-fix issues"],
            ["$0 doctor --json", "Output results as JSON"]
        ],
        menu: true
    },
    {
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
    },
    {
        cmd: "completion [action]",
        desc: "Manage shell tab completions",
        builder: (y) =>
            y
                .positional("action", {
                    describe: "Action to perform",
                    type: "string",
                    choices: ["install", "uninstall", "status", "generate"]
                })
                .option("shell", {
                    alias: "s",
                    type: "string",
                    description: "Target shell",
                    choices: ["bash", "zsh", "fish", "powershell"]
                })
                .option("force", {
                    alias: "f",
                    type: "boolean",
                    description: "Force reinstall",
                    default: false
                }),
        handler: async (argv) => completion(argv),
        examples: [
            ["$0 completion install", "Install completions for your shell"],
            ["$0 completion status", "Check completion installation status"],
            ["$0 completion --shell zsh", "Install completions for zsh"]
        ],
        menu: true
    }
];

(async () => {
    clear();
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

    yi = yi.help();
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
                await command.handler({ _: [choice], $0: "fsr" });
            }
        }
    } else if (argv._ && argv._.length > 0 && !BUILTIN_COMMANDS.has(argv._[0])) {
        // Bare task shorthand: `fsr release:publish` → same as `fsr run release:publish`
        const taskArg = argv._[0];
        const parsed = await parseScriptFile();
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

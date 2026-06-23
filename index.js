import bump from "./lib/release/bump.js";
import chalk from "chalk";
import { generateFScripts, generateToc } from "./lib/generators/index.js";
import parseScriptFile from "./lib/parsers/parseScriptsMd.js";
import upgradePackages from "./lib/upgradePackages.js";
import { runCLICommand, runParallel, runSequence } from "./lib/running/index.js";
import { clearRecent, startPackageScripts, startScripts } from "./lib/startScripts.js";
import optionList from "./lib/optionList.js";
import { selectPlugin } from "./lib/taskList.js";
import validateNotInDev from "./lib/git/validateNotDev.js";
import encrypt from "./lib/encryption/encryption.js";
import { clear } from "./lib/utils/index.js";
import doctor from "./lib/commands/doctor.js";
import completion from "./lib/completions/completion.js";
import * as cacheCommands from "./lib/cache/cli.js";
import { loadPlugins, registerPluginCommands } from "./lib/plugins/loader.js";
import { fireHook } from "./lib/plugins/hooks.js";
import { spawn } from "child_process";
import yargs from "yargs";

import "./lib/utils/console.js";

const taskName = chalk.rgb(39, 173, 96).bold.underline;
const textDescription = chalk.rgb(159, 161, 181);

/**
 * RUN
 * @param app
 * @param argsList
 * @returns {Promise<unknown>}
 */
const runCmd = async (app, argsList = []) => {
    let shell;

    shell = spawn(app, argsList, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: { ...process.env, ...{ FORCE_COLOR: true } }
    });
    return new Promise((resolve) => {
        shell.on("close", (code) => {
            resolve();
        });
    });
};

(async () => {
    clear();
    const { commands: pluginCommands, runnablePlugins } = await loadPlugins();
    const yargsInstance = yargs(process.argv.slice(2))
        .usage("Usage: $0 <command> [options]")

        /**
         *  fsr
         * branch --
         */
        .command(
            "branch",
            "Create new branch instead of Development",
            (yargs) => {},
            async function () {
                await validateNotInDev();
            }
        )
        .example(`${taskName("$0")}`, `${textDescription("Validates branch and creates new")}`)

        /**
         * fsr
         * start --
         */
        .usage("$0 <task> name:of:task")
        .command(
            "start",
            "Choose category then task to run",
            (yargs) => {},
            async () => {
                await startScripts(); // if ((await startScripts()) === false) {
                //     await startPackageScripts();
                // }
            }
        )
        .example(`${taskName("$0 start")}`, `${textDescription("Open a task selection selector")}`)

        /**
         * fsr
         * scripts --
         */
        .command(
            "scripts",
            "Choose a script from package.json",
            (yargs) => {},
            async function () {
                await startPackageScripts();
            }
        )
        .example(
            `${taskName("$0 scripts")}`,
            `${textDescription("Choose a script from package.json")}`
        )

        /**
         * fsr
         * list --
         */
        .command(
            "list",
            "Select any task with text autocompletion",
            () => {},
            async function (argv) {
                await startScripts(false);
                // const tasks = await scriptsParsed().allTasks;
            }
        )
        .example(`${taskName("$0 list")}`, `${textDescription("Show you all tasks you can run")}`)

        /**
         * fsr
         * run --
         */
        .command(
            "run [task]",
            "Run a specific task",
            (yargs) => {
                yargs
                    .positional("task", {
                        describe: "name of task to start",
                        default: ""
                    })
                    .option("retry", {
                        alias: "r",
                        type: "number",
                        description: "Number of times to retry on failure",
                        default: 0
                    })
                    .option("retry-delay", {
                        type: "string",
                        description: "Delay between retries in ms, or 'exponential'",
                        default: "0"
                    });
            },
            async function (argv) {
                let { task, retry, retryDelay } = argv;
                const parsed = await parseScriptFile();
                if (!parsed) {
                    console.error(`${chalk.bold.underline.red("No fscripts.md file found")}`);
                    return;
                }
                const { allTasks } = parsed;
                const taskData = allTasks.find((t) => t.name === task);
                if (!taskData) {
                    console.error(`${chalk.bold.underline.red("Task not found")}`);
                    return;
                }
                let { script, lang } = taskData;
                const parsedDelay = retryDelay === "exponential" ? "exponential" : Number(retryDelay) || 0;

                if (lang === "javascript") {
                    await runCLICommand(
                        { task: { name: task }, script: { lang, env: {}, type: "node", full: script, rest: [] } },
                        { restartTries: retry, restartDelay: parsedDelay }
                    );
                } else {
                    const pars = script.trim().split(/\s+/);
                    const env = {};
                    let startIdx = 0;
                    while (startIdx < pars.length && pars[startIdx].includes("=") && !pars[startIdx].startsWith("-")) {
                        const [key, ...vals] = pars[startIdx].split("=");
                        env[key] = vals.join("=");
                        startIdx++;
                    }
                    const type = pars[startIdx];
                    const rest = pars.slice(startIdx + 1).join(" ");
                    await runCLICommand(
                        { task: { name: task }, script: { lang, env, type, full: rest, rest: rest.split(" ") } },
                        { restartTries: retry, restartDelay: parsedDelay }
                    );
                }
            }
        )
        .example(`${taskName("$0 run start:web")}`, `${textDescription("Run task 'start:web'")}`)
        .example(`${taskName("$0 run build --retry 3")}`, `${textDescription("Retry build up to 3 times on failure")}`)
        .example(`${taskName("$0 run build --retry 3 --retry-delay exponential")}`, `${textDescription("Retry with exponential backoff")}`)

        /**
         * fsr
         * upgrade --
         */
        .command(
            "upgrade",
            "Upgrade all your packages except ones specified by 'ignore-upgrade':[]",
            () => {},
            async function (argv) {
                let task = argv._[1];
                await upgradePackages();
            }
        )
        .example(`${taskName("$0 upgrade")}`, `${textDescription("Upgraded!")}`)

        /**
         * fsr
         * bump --
         */
        .command(
            "bump",
            "Bump package.json and beautify it!",
            () => {},
            async function (argv) {
                let type = argv.type;
                let skipGit = argv.skipGit;
                await bump(type, skipGit === "true");
            }
        )
        .example(`${taskName("$0 bump")}`, `${textDescription("BUMPED AND PRETTY!")}`)

        /**
         * fsr
         * run-s --
         */
        .command(
            "run-s",
            "Run a set of tasks one after another",
            (yargs) => {
                yargs
                    .option("no-stop-on-error", {
                        type: "boolean",
                        description: "Continue sequence even when a task fails",
                        default: false
                    })
                    .option("retry", {
                        alias: "r",
                        type: "number",
                        description: "Retry each failed task N times before stopping",
                        default: 0
                    })
                    .option("retry-delay", {
                        type: "string",
                        description: "Delay between retries in ms, or 'exponential'",
                        default: "0"
                    });
            },
            async function (argv) {
                let tasks = argv._.slice();
                tasks.shift();
                const stopOnError = !argv["no-stop-on-error"];
                const parsedDelay = argv.retryDelay === "exponential" ? "exponential" : Number(argv.retryDelay) || 0;
                const FcScripts = await parseScriptFile();
                const result = await runSequence(tasks, FcScripts, {
                    stopOnError,
                    restartTries: argv.retry || 0,
                    restartDelay: parsedDelay
                });
                if (!result.success) process.exit(1);
            }
        )
        .example(
            `${taskName("$0 run-s start:web start:desktop")}`,
            `${textDescription("Run task 'start:web' and afterwards 'start:desktop'")}`
        )
        .example(
            `${taskName("$0 run-s build test --retry 2")}`,
            `${textDescription("Run build then test, retry each up to 2 times")}`
        )
        .example(
            `${taskName("$0 run-s build test --no-stop-on-error")}`,
            `${textDescription("Run all tasks even if one fails")}`
        )

        /**
         * fsr
         * run-p --
         */
        .command(
            "run-p",
            "Run tasks in parallel with process lifecycle management",
            (yargs) => {
                yargs
                    .option("kill-others", {
                        alias: "k",
                        type: "boolean",
                        description: "Kill all processes when one fails",
                        default: true
                    })
                    .option("kill-others-on-success", {
                        type: "boolean",
                        description: "Kill all processes when one succeeds",
                        default: false
                    })
                    .option("retry", {
                        alias: "r",
                        type: "number",
                        description: "Restart failed processes N times",
                        default: 0
                    })
                    .option("retry-delay", {
                        type: "string",
                        description: "Delay between restarts in ms, or 'exponential'",
                        default: "0"
                    })
                    .option("max-processes", {
                        alias: "m",
                        type: "number",
                        description: "Max concurrent processes (sliding window)",
                        default: 0
                    })
                    .option("timings", {
                        alias: "t",
                        type: "boolean",
                        description: "Show per-process timing table on finish",
                        default: false
                    });
            },
            async function (argv) {
                let tasks = argv._.slice();
                tasks.shift();

                const killOthers = [];
                if (argv.killOthers) killOthers.push("failure");
                if (argv.killOthersOnSuccess) killOthers.push("success");

                const parsedDelay = argv.retryDelay === "exponential" ? "exponential" : Number(argv.retryDelay) || 0;
                const maxProcs = argv.maxProcesses > 0 ? argv.maxProcesses : Infinity;

                const FcScripts = await parseScriptFile();
                const result = await runParallel(tasks, FcScripts, {
                    killOthers,
                    restartTries: argv.retry || 0,
                    restartDelay: parsedDelay,
                    maxProcesses: maxProcs,
                    timings: argv.timings
                });
                if (result && !result.success) process.exit(1);
            }
        )
        .example(
            `${taskName("$0 run-p start:web start:desktop")}`,
            `${textDescription("Run tasks in parallel, kill all if one fails")}`
        )
        .example(
            `${taskName("$0 run-p build watch --no-kill-others")}`,
            `${textDescription("Run in parallel, let all finish regardless")}`
        )
        .example(
            `${taskName("$0 run-p build watch --retry 3 --retry-delay exponential")}`,
            `${textDescription("Restart failed processes up to 3 times with exponential backoff")}`
        )
        .example(
            `${taskName("$0 run-p t1 t2 t3 t4 --max-processes 2")}`,
            `${textDescription("Run at most 2 tasks concurrently (sliding window)")}`
        )
        /**
         * fsr
         * encryption --
         */
        .command(
            "encryption",
            "Encrypt/Decrypt secret files",
            () => {},
            async function (argv) {
                await encrypt.init();
            }
        )
        /**
         * fsr
         * encrypt --
         */
        .command(
            "encrypt",
            "Encrypt a secret file/s",
            () => {},
            async function (argv) {
                await encrypt.encrypt();
            }
        )
        /**
         * fsr
         * decrypt --
         */
        .command(
            "decrypt",
            "Decrypt a secret file/s",
            () => {},
            async function (argv) {
                await encrypt.decrypt();
            }
        )
        .example(
            `${taskName("$0 encryption")}`,
            `${textDescription("Encrypt/Decrypt secret files")}`
        )

        /**
         * fsr
         * clear --
         */
        .command(
            "clear",
            "Clear recent task history",
            () => {},
            async function (argv) {
                await clearRecent();
            }
        )
        .example(`${taskName("$0 clear")}`, `${textDescription("Clear your recently run tasks")}`)
        .example(`${taskName("$0 config")}`, `${textDescription("Update a config value")}`)
        .command(
            "generate",
            "Generate a sample fscripts.md file from the package.json",
            () => {},
            async function (argv) {
                await generateFScripts();
            }
        )
        .example(
            `${taskName("$0 generate")}`,
            `${textDescription(
                "Generates a sample.fscripts.md you can use as template for your fscripts file"
            )}`
        )
        .command(
            "toc",
            "Generate updated Table of Contents on top of the fscripts.md file",
            () => {},
            async function (argv) {
                let mdFile = argv._[1];
                await generateToc(mdFile);
            }
        )
        .example(
            `${taskName("$0 toc")}`,
            `${textDescription(
                "Generate updated Table of Contents on top of the fscripts.md file"
            )}`
        )

        /**
         * fsr
         * doctor --
         */
        .command(
            "doctor",
            "Run diagnostics and check system health",
            (yargs) => {
                yargs
                    .option("fix", {
                        alias: "f",
                        type: "boolean",
                        description: "Automatically fix issues when possible",
                        default: false
                    })
                    .option("json", {
                        type: "boolean",
                        description: "Output results in JSON format",
                        default: false
                    })
                    .option("verbose", {
                        alias: "v",
                        type: "boolean",
                        description: "Show verbose output",
                        default: false
                    });
            },
            async function (argv) {
                await doctor(argv);
            }
        )
        .example(`${taskName("$0 doctor")}`, `${textDescription("Run system diagnostics")}`)
        .example(
            `${taskName("$0 doctor --fix")}`,
            `${textDescription("Run diagnostics and auto-fix issues")}`
        )
        .example(`${taskName("$0 doctor --json")}`, `${textDescription("Output results as JSON")}`)

        /**
         * fsr
         * cache --
         */
        .command(
            "cache <action>",
            "Manage cache system",
            (yargs) => {
                yargs
                    .positional("action", {
                        describe: "Cache action to perform",
                        choices: ["stats", "clear", "list", "benchmark", "export"]
                    })
                    .option("verbose", {
                        alias: "v",
                        type: "boolean",
                        description: "Show verbose output",
                        default: false
                    })
                    .option("limit", {
                        alias: "l",
                        type: "number",
                        description: "Limit number of entries to display",
                        default: 10
                    })
                    .option("output", {
                        alias: "o",
                        type: "string",
                        description: "Output file path for export"
                    });
            },
            async function (argv) {
                const { action, verbose, limit, output } = argv;

                switch (action) {
                    case "stats":
                        await cacheCommands.showCacheStats({ verbose });
                        break;
                    case "clear":
                        await cacheCommands.clearCache();
                        break;
                    case "list":
                        await cacheCommands.listCacheEntries({ limit });
                        break;
                    case "benchmark":
                        await cacheCommands.benchmarkCache();
                        break;
                    case "export":
                        await cacheCommands.exportCacheStats(output);
                        break;
                    default:
                        console.log(chalk.yellow(`Unknown cache action: ${action}`));
                }
            }
        )
        .example(`${taskName("$0 cache stats")}`, `${textDescription("Show cache statistics")}`)
        .example(`${taskName("$0 cache clear")}`, `${textDescription("Clear all cache entries")}`)
        .example(`${taskName("$0 cache list")}`, `${textDescription("List cached entries")}`)
        .example(
            `${taskName("$0 cache benchmark")}`,
            `${textDescription("Run cache performance benchmark")}`
        )

        /**
         * fsr
         * completion --
         */
        .command(
            "completion [action]",
            "Manage shell completions",
            (yargs) => {
                yargs
                    .positional("action", {
                        describe: "Action to perform (install, uninstall, status, generate)",
                        type: "string",
                        choices: ["install", "uninstall", "status", "generate"]
                    })
                    .option("shell", {
                        alias: "s",
                        type: "string",
                        description: "Target shell (bash, zsh, fish, powershell)",
                        choices: ["bash", "zsh", "fish", "powershell"]
                    })
                    .option("force", {
                        alias: "f",
                        type: "boolean",
                        description: "Force reinstall completions",
                        default: false
                    });
            },
            async function (argv) {
                await completion(argv);
            }
        )
        .example(
            `${taskName("$0 completion install")}`,
            `${textDescription("Install completions for your shell")}`
        )
        .example(
            `${taskName("$0 completion status")}`,
            `${textDescription("Check completion installation status")}`
        )
        .example(
            `${taskName("$0 completion --shell zsh")}`,
            `${textDescription("Install completions for zsh")}`
        )
        .help();

    registerPluginCommands(yargsInstance, pluginCommands);
    yargsInstance.strict();

    const argv = yargsInstance.argv;

    if (argv && argv._ && argv._.length === 0) {
        // Combine commands and plugins into a single menu
        const commandItems = [
            { name: "start", message: "Choose category then task to run" },
            { name: "scripts", message: "Choose a script from package.json" },
            { name: "list", message: "Select any task with text autocompletion" },
            { name: "run", message: "Run a specific task" },
            { name: "upgrade", message: "Upgrade all your packages" },
            { name: "bump", message: "Bump package.json and beautify it" },
            { name: "run-s", message: "Run a set of tasks one after another" },
            { name: "run-p", message: "Run tasks in parallel" },
            { name: "encryption", message: "Encrypt/Decrypt secret files" },
            { name: "doctor", message: "Run diagnostics and check system health" },
            { name: "cache", message: "Manage cache system" },
            { name: "completion", message: "Manage shell completions" },
            { name: "generate", message: "Generate sample fscripts.md file" },
            { name: "toc", message: "Generate Table of Contents" }
        ];

        const pluginItems = runnablePlugins.map((p) => ({
            name: `plugin:${p.name}`,
            message: p.description
        }));

        const allChoices = [...commandItems, ...pluginItems];
        const choice = await selectPlugin(allChoices);

        if (!choice) {
            console.log(chalk.green.bold("See you soon!"));
            return;
        }

        // Check if it's a plugin
        if (choice.startsWith("plugin:")) {
            const pluginName = choice.replace("plugin:", "");
            const pluginMatch = runnablePlugins.find((p) => p.name === pluginName);
            if (pluginMatch) {
                const start = Date.now();
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
            // It's a regular command
            await runCmd("yarn", ["fsr", choice]);
        }
    }
})();

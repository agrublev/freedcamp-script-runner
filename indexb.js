import bump from "./lib/release/bump.js";
import chalk from "chalk";
import { generateFScripts, generateToc } from "./lib/generators";
import parseScriptFile from "./lib/parsers/parseScriptsMd.js";
import upgradePackages from "./lib/upgradePackages";
import { runSequence, runParallel, runCLICommand } from "./lib/running";
import { startPackageScripts, startScripts, clearRecent } from "./lib/startScripts.js";
const taskName = chalk.rgb(39, 173, 96).bold.underline;
const textDescription = chalk.rgb(159, 161, 181);
import optionList from "./lib/optionList";
import validateNotInDev from "./lib/git/validateNotDev.js";
import encrypt from "./lib/encryption/encryption";
import { clear } from "@utils";
require("@utils/console");

(async () => {
    clear();
    const argv = require("yargs")
        .usage("Usage: $0 <command> [options]")

        /**
         *  fsr
         */
        .command("", "Choose a script runner command", yargs => {}, async function() {})
        .example(`${taskName("$0")}`, `${textDescription("Choose a script runner command")}`)

        /**
         *  fsr
         */
        .command(
            "branch",
            "Create new branch instead of Development",
            yargs => {},
            async function() {
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
            yargs => {},
            async () => {
                if ((await startScripts()) === false) {
                    await startPackageScripts();
                }
            }
        )
        .example(`${taskName("$0 start")}`, `${textDescription("Open a task selection selector")}`)

        /**
         * fsr
         * scripts --
         */
        .command("scripts", "Choose a script from package.json", yargs => {}, async function() {
            await startPackageScripts();
        })
        .example(
            `${taskName("$0 scripts")}`,
            `${textDescription("Choose a script from package.json")}`
        )

        /**
         * fsr
         * list --
         */
        .command("list", "Select any task with text autocompletion", () => {}, async function(
            argv
        ) {
            await startScripts(false);
            // const tasks = await scriptsParsed().allTasks;
        })
        .example(`${taskName("$0 list")}`, `${textDescription("Show you all tasks you can run")}`)

        /**
         * fsr
         * run --
         */
        .command(
            "run [task]",
            "Run a specific task",
            yargs => {
                yargs.positional("task", {
                    describe: "name of task to start",
                    default: ""
                });
            },
            async function(argv) {
                let task = argv._[1];
                const FcScripts = await parseScriptFile();
                let taskIndex = FcScripts.allTasks.findIndex(t => t.name === task);
                let taskData = FcScripts.allTasks[taskIndex];
                if (!taskData) {
                    console.log("no task");
                    console.info("no task");
                    console.warn("no task");
                    console.error("no task");
                    return;
                }
                let runCommand = taskData["script"].split(" ");
                let type = runCommand.shift();
                let params = runCommand.join(" ");
                let args = Object.keys(argv)
                    .filter(e => e !== "_" && e !== "$0")
                    .map(e => ` --${e}=${argv[e]}`);
                params += " " + args.join(" ");
                await runCLICommand({
                    task: { name: task },
                    script: {
                        type: type,
                        rest: params.split(" ")
                    }
                });
            }
        )
        .example(`${taskName("$0 run start:web")}`, `${textDescription("Run task 'start:web'")}`)

        /**
         * fsr
         * upgrade --
         */
        .command(
            "upgrade",
            "Upgrade all your packages except ones specified by 'ignore-upgrade':[]",
            () => {},
            async function(argv) {
                let task = argv._[1];
                await upgradePackages();
            }
        )
        .example(`${taskName("$0 upgrade")}`, `${textDescription("Upgraded!")}`)

        /**
         * fsr
         * bump --
         */
        .command("bump", "Bump package.json and beautify it!", () => {}, async function(argv) {
            let shouldNotPretty = argv.pretty;
            let type = argv.type;
            await bump(shouldNotPretty, type);
        })
        .example(`${taskName("$0 bump")}`, `${textDescription("BUMPED AND PRETTY!")}`)

        /**
         * fsr
         * run-s --
         */
        .command("run-s", "Run a set of tasks one after another", () => {}, async function(argv) {
            let tasks = argv._.slice();
            tasks.shift();
            const FcScripts = await parseScriptFile();
            await runSequence(tasks, FcScripts);
        })
        .example(
            `${taskName("$0 run-s start:web start:desktop")}`,
            `${textDescription("Run task 'start:web' and afterwards 'start:desktop'")}`
        )

        /**
         * fsr
         * run-p --
         */
        .command("run-p", "Run tasks in parallel", () => {}, async function(argv) {
            let tasks = argv._.slice();
            tasks.shift();
            const FcScripts = await parseScriptFile();
            await runParallel(tasks, FcScripts);
        })
        .example(
            `${taskName("$0 run-p start:web start:desktop")}`,
            `${textDescription("Run task 'start:web' and at the same time 'start:desktop'")}`
        )

        /**
         * fsr
         * encryption --
         */
        .command("encryption", "Encrypt/Decrypt secret files", () => {}, async function(argv) {
            await encrypt.init();
        })
        .example(
            `${taskName("$0 encryption")}`,
            `${textDescription("Encrypt/Decrypt secret files")}`
        )

        /**
         * fsr
         * clear --
         */
        .command("clear", "Clear recent task history", () => {}, async function(argv) {
            await clearRecent();
        })
        .example(`${taskName("$0 clear")}`, `${textDescription("Clear your recently run tasks")}`)
        .command(
            "generate",
            "Generate a sample fscripts.md file from the package.json",
            () => {},
            async function(argv) {
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
            async function(argv) {
                await generateToc();
            }
        )
        .example(
            `${taskName("$0 toc")}`,
            `${textDescription(
                "Generate updated Table of Contents on top of the fscripts.md file"
            )}`
        ).argv;

    if (argv._.length === 0) {
        (async function() {
            const choice = await optionList();
            if (choice) {
                await runCLICommand(
                    { task: { name: choice }, script: { type: "fsr", rest: [choice] } },
                    true
                );
            } else {
                console.log(chalk.green.bold("See you soon!"));
            }
        })();
    }
})();

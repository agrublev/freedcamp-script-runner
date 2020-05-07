import { updateConfig } from "./lib/startScripts";

const bump = require("./lib/release/bump.js");
const chalk = require("chalk");
const { generateFScripts, generateToc } = require("./lib/generators");
const parseScriptFile = require("./lib/parsers/parseScriptsMd.js");
const upgradePackages = require("./lib/upgradePackages");
const { runSequence, runParallel, runCLICommand } = require("./lib/running");
const { startPackageScripts, startScripts, clearRecent } = require("./lib/startScripts.js");
const taskName = chalk.rgb(39, 173, 96).bold.underline;
const textDescription = chalk.rgb(159, 161, 181);
const optionList = require("./lib/optionList");
const validateNotInDev = require("./lib/git/validateNotDev.js");
const encrypt = require("./lib/encryption/encryption");
const { clear } = require("./lib/utils/index");
const authConfig = require("./lib/auth/auth-conf");

require("./lib/utils/console");

const runCmd = async (app, argsList = []) => {
    const { spawn } = require("child_process");
    let shell;

    shell = spawn(app, argsList, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: { ...process.env, ...{ FORCE_COLOR: true } },
    });
    return new Promise((resolve) => {
        shell.on("close", (code) => {
            resolve();
        });
    });
};

(async () => {
    clear();
    const argv = require("yargs")
        .usage("Usage: $0 <command> [options]")

        /**
         *  fsr
         */
        .command(
            "",
            "Choose a script runner command",
            (yargs) => {},
            async function () {}
        )
        .example(`${taskName("$0")}`, `${textDescription("Choose a script runner command")}`)

        /**
         *  fsr
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
                yargs.positional("task", {
                    describe: "name of task to start",
                    default: "",
                });
            },
            async function (argv) {
                let { task } = argv;
                const { allTasks } = await parseScriptFile();
                const taskData = allTasks.find((t) => t.name === task);
                if (!taskData) {
                    console.error(`${chalk.bold.underline.red("Task not found")}`);
                    return;
                }
                let { script, lang } = taskData;
                let pars = script.split(" ");
                let type = pars[0];
                let env = {};
                if (pars[0].includes("=")) {
                    let envs = type.split("=");
                    env[envs[0]] = envs[1];
                    type = pars[1];
                    pars.shift();
                    pars.shift();
                    script = pars.join(" ");
                } else {
                    pars.shift();
                    script = pars.join(" ");
                }
                await runCLICommand({
                    task: { name: task },
                    script: {
                        lang: lang,
                        env: env,
                        type: type,
                        full: script,
                        rest: script.split(" "),
                    },
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
                await bump(type);
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
            () => {},
            async function (argv) {
                let tasks = argv._.slice();
                tasks.shift();
                const FcScripts = await parseScriptFile();
                await runSequence(tasks, FcScripts);
            }
        )
        .example(
            `${taskName("$0 run-s start:web start:desktop")}`,
            `${textDescription("Run task 'start:web' and afterwards 'start:desktop'")}`
        )

        /**
         * fsr
         * run-p --
         */
        .command(
            "run-p",
            "Run tasks in parallel",
            () => {},
            async function (argv) {
                let tasks = argv._.slice();
                tasks.shift();

                const FcScripts = await parseScriptFile();
                await runParallel(tasks, FcScripts);
            }
        )
        .example(
            `${taskName("$0 run-p start:web start:desktop")}`,
            `${textDescription("Run task 'start:web' and at the same time 'start:desktop'")}`
        )

        /**
         * fsr
         * remote config --
         */
        .command(
            "remote",
            "Get remote configuration",
            () => {},
            async function (argv) {
                await authConfig().catch(console.error);
            }
        )
        .example(`${taskName("$0 remote")}`, `${textDescription("Get remote config")}`)
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
        /**
         * fsr
         * config --
         */
        .command(
            "config",
            "Update a config value",
            () => {},
            async function (argv) {
                let key = argv._.slice();
                console.log("--- INFO ", key[0], key[1]);
                key = !key[0] ? false : key[0] === "config" && key[1] ? key[1] : key[0];
                console.log("--- INFO2 ", key);
                await updateConfig(key);
            }
        )
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
        ).argv;

    if (argv._.length === 0) {
        (async function () {
            const choice = await optionList();

            if (choice) {
                await runCmd("yarn", ["fsr", choice]);
            } else {
                console.log(chalk.green.bold("See you soon!"));
            }
        })();
    }
})();

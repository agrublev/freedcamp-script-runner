#!/usr/bin/env node

const chalk = require("chalk");
const generateFScripts = require("./lib/generateFScripts.js");
const parseScriptFile = require("./lib/parseScriptsMd.js");
// const parseScriptPackage = require("./lib/parseScriptsPackage");
const generateToc = require("./lib/generateToc");
const runSequence = require("./lib/runSequence");
const runParallel = require("./lib/runParallel");
const runCLICommand = require("./lib/runCLICommand");
const { startPackageScripts, startScripts, clearRecent } = require("./lib/startScripts.js");
const taskName = chalk.rgb(39, 173, 96).bold.underline;
const textDescription = chalk.rgb(159, 161, 181);
const optionList = require("./lib/optionList");
const validateNotInDev = require("./lib/git/validateNotDev.js");

(async () => {
    await validateNotInDev();

    const argv = require("yargs")
    .usage("Usage: $0 <command> [options]")
    .command("", "Choose a script runner command", yargs => {}, async function() {})
    .example(`${taskName("$0")}`, `${textDescription("Choose a script runner command")}`)
    .command("start", "Choose category then task to run", yargs => {}, async function() {
        if ((await startScripts()) === false) {
            await startPackageScripts();
        }
    })
    .example(`${taskName("$0 start")}`, `${textDescription("Open a task selection selector")}`)
    .command("scripts", "Choose a script from package.json", yargs => {}, async function() {
        await startPackageScripts();
    })
    .example(`${taskName("$0 scripts")}`, `${textDescription("Choose a script from package.json")}`)
    .command("list", "Select any task with text autocompletion", () => {}, async function(argv) {
        await startScripts(false);
        // const tasks = await scriptsParsed().allTasks;
    })
    .example(`${taskName("$0 list")}`, `${textDescription("Show you all tasks you can run")}`)
    .command("run", "Run a specific task", () => {}, async function(argv) {
        let tasks = argv._.slice();
        tasks.shift();
        const FcScripts = await parseScriptFile();
        await runSequence(tasks, FcScripts);
    })
    .example(`${taskName("$0 run start:web")}`, `${textDescription("Run task 'start:web'")}`)
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
        `${textDescription("Generate updated Table of Contents on top of the fscripts.md file")}`
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

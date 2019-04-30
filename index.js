#!/usr/bin/env node

const chalk = require("chalk");
const moment = require("moment");
const runCLICommand = require("./lib/runCLICommand.js");
const parseScriptFile = require("./lib/parseScriptsMd.js");
const taskList = require("./lib/taskList");
const path = require("path");
const scriptsDir = process.cwd();
const rootDir = path.join(scriptsDir, "./");
const separator = "   ~   ";

const Conf = require("conf");
const config = new Conf();

const scriptsParsed = async () => {
    const FcScripts = await parseScriptFile();
    return FcScripts;
};

const startScripts = async () => {
    const FcScripts = await scriptsParsed();
    const recentTasks = config.get("recentTasks", {});
    console.warn("-- Console REC", recentTasks);
    let recentTaskArr = Object.keys(recentTasks).map(taskName => {
            let task = recentTasks[taskName];
            return { name: taskName, lastExecuted: task.lastExecuted };
        })
        .sort((a, b) =>
            a.lastExecuted > b.lastExecuted ? 1 : b.lastExecuted > a.lastExecuted ? -1 : 0
        )
        .reverse()
        .slice(0, 3);
    let recentTaskOptions = recentTaskArr.map(task => {
        return task.name + separator + moment(task.lastExecuted).calendar();
    });
    let taskToRun = await taskList(FcScripts, recentTaskOptions);
    // + separator + moment().format("MMMM Do YYYY, h:mm:ss a")
    if (recentTasks[taskToRun] === undefined) {
        recentTasks[taskToRun] = { lastExecuted: Date.now() };
    } else {
        recentTasks[taskToRun].lastExecuted = Date.now();
    }
    config.set("recentTasks", recentTasks);
    console.log("WILL RUN", taskToRun);
};

const argv = require("yargs")
    .usage("Usage: $0 <command> [options]")
    .scriptName("yarn fsr")
    .example(
        `${chalk.rgb(39, 173, 96)("$0")}`,
        `${chalk.rgb(159, 161, 181)("will open a task selection selector")}`
    )
    .command("start", "Start the scripts!", yargs => {}, async function() {
        await startScripts();
    })
    .example(
        `${chalk.rgb(39, 173, 96)("$0 start")}`,
        `${chalk.rgb(159, 161, 181)("will open a task selection selector")}`
    )
    .command("run", "Run a specific task", () => {}, async function(argv) {
        let task = argv._[1];
    })
    .example(
        `${chalk.rgb(39, 173, 96)("$0 run start:web")}`,
        `${chalk.rgb(159, 161, 181)("will run task 'start:web'")}`
    )
    .command("run-s", "Series as a sequence", () => {}, async function(argv) {
        let tasks = argv._.slice();
        tasks.shift();
        const FcScripts = await parseScriptFile();

        for (let t in tasks) {
            let taskName = tasks[t];
            let script = FcScripts.allTasks[taskName].script;
            let params = script.split(" ");
            let type = params.shift();
            await runCLICommand({
                task: { name: taskName },
                script: {
                    type: type,
                    rest: params
                }
            });
        }
    })
    .example(
        `${chalk.rgb(39, 173, 96)("$0 run-s start:web start:desktop")}`,
        `${chalk.rgb(159, 161, 181)("will run task 'start:web' and afterwards 'start:desktop'")}`
    ).command("clear", "Clear history", () => {}, async function(argv) {
        let tasks = argv._.slice();
        tasks.shift();
        const FcScripts = await parseScriptFile();

        for (let t in tasks) {
            let taskName = tasks[t];
            let script = FcScripts.allTasks[taskName].script;
            let params = script.split(" ");
            let type = params.shift();
            await runCLICommand({
                task: { name: taskName },
                script: {
                    type: type,
                    rest: params
                }
            });
        }
    })
    .example(
        `${chalk.rgb(39, 173, 96)("$0 run-s start:web start:desktop")}`,
        `${chalk.rgb(159, 161, 181)("will run task 'start:web' and afterwards 'start:desktop'")}`
    )
    .command("run-p", "Run tasks in parallel", () => {}, async function(argv) {
        let tasks = argv._.slice();
        tasks.shift();
        const FcScripts = await parseScriptFile();

        for (let t in tasks) {
            let taskName = tasks[t];
            let script = FcScripts.allTasks[taskName].script;
            let params = script.split(" ");
            let type = params.shift();
            runCLICommand({
                task: { name: taskName },
                script: {
                    type: type,
                    rest: params
                }
            });
        }
    })
    .example(
        `${chalk.rgb(39, 173, 96)("$0 run-p start:web start:desktop")}`,
        `${chalk.rgb(159, 161, 181)(
            "will run task 'start:web' and at the same time 'start:desktop'"
        )}`
    ).argv;

if (argv._.length === 0) {
    (async function() {
        await startScripts();
    })();
}

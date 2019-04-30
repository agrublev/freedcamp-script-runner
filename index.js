#!/usr/bin/env node

const fcr = require("./lib/index.js");
const chalk = require("chalk");
const getStream = require("get-stream");
const execa = require("execa");
let hasBeenCleared = false;
const runCLICommand = require("./lib/runCLICommand.js");
const parseScriptFile = require("./lib/parseScriptsMd.js");

const pipeAsyncFunctions = (...fns) => arg => fns.reduce((p, f) => p.then(f), Promise.resolve(arg));

const exec = async command => {
    const output = await execa.shell(command, { env: { FORCE_COLOR: true }, cleanup: true }).stdout;

    output.pipe(process.stdout);
    output.pipe(process.stderr);
    // getStream(output).then(value => {
    // 	console.log('child output:', value);
    // });

    // output.
    return output;
};
const argv = require("yargs")
.usage("Usage: $0 <command> [options]")
.scriptName("yarn fsr")
.example(
    `${chalk.rgb(39, 173, 96)("$0")}`,
    `${chalk.rgb(159, 161, 181)("will open a task selection selector")}`
)
.command("start", "Start the scripts!", yargs => {}, async function() {
    // let ff = await fcr(hasBeenCleared);
    // if (!hasBeenCleared) {
    //     hasBeenCleared = true;
    // }
    // ff.runList();
    const FcScripts = await parseScriptFile();
    console.warn("-- Console ", FcScripts);
})
.example(
    `${chalk.rgb(39, 173, 96)("$0 start")}`,
    `${chalk.rgb(159, 161, 181)("will open a task selection selector")}`
)
.command("run", "Run a specific task", () => {}, async function(argv) {
    let task = argv._[1];
    let ff = await fcr(hasBeenCleared);
    if (!hasBeenCleared) {
        hasBeenCleared = true;
    }
    await ff.runFile(task);
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
    fcr().then(ff => ff.runList());
}

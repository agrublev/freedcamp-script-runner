#!/usr/bin/env node

const Conf = require("conf");

const config = new Conf({ configName: "fcConf", projectName: "Freedcamp" });

let fcConf = config.get("fcConf");

if (fcConf === undefined) {
    config.set("fcConf", { version: "0.1.2" });
    fcConf = { version: "0.1.2" };
}

const parseScriptFile = require("./parseScriptFile.js");
const chalk = require("chalk");
const getFileTasks = async () => {
    const parsedFile = await parseScriptFile();
    return parsedFile;
};
const kill = require("./kill.js");
// const exec = require("./exec.js");
// const taskExecutor = require("./taskExecutor.js");
// const startTerminal = require("./terminalDashboard.js");
const figures = require("figures");

console.log(figures.tick, fcConf);

const argv = require("yargs")
    .usage("Usage: $0 <command> [options]")
    .scriptName("fsr")
    .example(
        `${chalk.rgb(39, 173, 96)("$0")}`,
        `${chalk.rgb(159, 161, 181)("will open a task selection selector")}`
    )
    .command("start", "Show the task selector!", yargs => {}, async function(argv) {
        const { categories, allTasks } = await getFileTasks();
    })
    .command("preview", "Show the task selector!", yargs => {}, async function(argv) {
        exec("npx pen FcScripts.md");
    })
    .command("peek", "Show the task selector!", yargs => {}, async function(argv) {
        exec("npx jsome -s 4 package.json");
    })
    .command("kill", "Show the task selector!", yargs => {}, async function(argv) {
        // exec("node src/kill.js").then(() => {
        //     process.exit(0);
        // });
        kill().then(() => {
            console.log(figure.circleCross, " Killed it!");
            return 0;
            // process.exit(0);
        });
    })
    .command("run", "Run a task!", yargs => {}, async function(argv) {
        // const { categories, allTasks } = await getFileTasks();
        // let task = argv._[1];
        //
        // console.log(
        //     `\n${chalk.bold.underline.green("Running task:")} ${chalk.bold.magenta(task)}\n\n`
        // );
        // const taskDetails = allTasks[task];
        // startTerminal.openTerminal(task);
        // taskExecutor(task, taskDetails.type, taskDetails.script, startTerminal);
        // // console.warn("-- Console \n\n\n", JSON.stringify(categories), JSON.stringify(allTasks));
    })
    .example(
        `${chalk.rgb(39, 173, 96)("$0 run")}`,
        `${chalk.rgb(159, 161, 181)("will run selected task")}`
    ).argv;
if (argv._.length === 0) {
    console.log("RUN IOT!");
    // getFileTasks().then(({ categories, allTasks }) => {
    // console.warn("-- Console NO LIST", categories, allTasks);
    // });
}

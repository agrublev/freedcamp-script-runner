const taskList = require("./taskList");
const separator = "   ~   ";
const Conf = require("conf");
const config = new Conf();
const moment = require("moment");
const chalk = require("chalk");
const parseScriptFile = require("./parseScriptsMd.js");
const parsePackageFile = require("./parseScriptsPackage.js");
const runCLICommand = require("./runCLICommand");
const { prompt } = require("enquirer");

const taskListAutoComplete = async tasks => {
    let { answer } = await prompt({
        type: "autocomplete",
        message: `${chalk.green.bold.underline("Choose task to run")}`,
        choices: tasks,
        name: `answer`
    });
    return answer.split(separator)[0].trim();
};
const scriptsParsed = async () => {
    return await parseScriptFile();
};

const startScripts = async (categories = true) => {
    const FcScripts = await scriptsParsed();
    let recentTasks = config.get("recentTasks", {});
    let recentTaskArr = Object.keys(recentTasks)
        .map(taskName => {
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
    let taskToRun;
    if (categories) {
        taskToRun = await taskList(FcScripts, recentTaskOptions);
    } else {
        let tasks = FcScripts.allTasks;

        taskToRun = await taskListAutoComplete(
            tasks.map(task => {
                return `${task.name}${separator}${task.description}`;
            })
        );
    }
    if (recentTasks[taskToRun] === undefined) {
        recentTasks[taskToRun] = { lastExecuted: Date.now() };
    } else {
        recentTasks[taskToRun].lastExecuted = Date.now();
    }
    config.set("recentTasks", recentTasks);
    let taskIndex = FcScripts.allTasks.findIndex(t => t.name === taskToRun);
    let script = FcScripts.allTasks[taskIndex].script;
    let params = script.split(" ");
    let type = params.shift();
    await runCLICommand({
        task: { name: taskToRun },
        script: {
            type: type,
            rest: params
        }
    });
};

const startPackageScripts = async () => {
    const packageScripts = await parsePackageFile();
    console.warn("-- Console ", packageScripts);
    let tasks = Object.keys(packageScripts).map(e => {
        return { name: e, script: packageScripts[e] };
    });

    let taskToRun = await taskListAutoComplete(
        tasks.map(task => {
            return `${task.name}${separator}${task.script}`;
        })
    );
    //
    // let taskIndex = FcScripts.allTasks.findIndex(t => t.name === taskToRun);
    // let script = FcScripts.allTasks[taskIndex].script;
    // let type = params.shift();
    await runCLICommand({
        task: { name: taskToRun },
        script: {
            type: "yarn",
            rest: [taskToRun]
        }
    });
};

const clearRecent = async () => {
    config.set("recentTasks", {});
};
module.exports = {
    startScripts,
    scriptsParsed,
    taskListAutoComplete,
    clearRecent,
    startPackageScripts
};

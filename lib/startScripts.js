const taskList = require("./taskList");
const separator = "   ~   ";
const Conf = require("conf");
const config = new Conf();
const moment = require("moment-mini");
const chalk = require("chalk");
const parseScriptFile = require("./parsers/parseScriptsMd.js");
const parsePackageFile = require("./parsers/parseScriptsPackage.js");
const runCLICommand = require("./running/runCLICommand");
const { prompt } = require("enquirer");

const taskListAutoComplete = async tasks => {
    try {
        let { answer } = await prompt({
            type: "autocomplete",
            message: `${chalk.green.bold.underline("Choose task to run")}`,
            choices: tasks,
            name: `answer`
        });
        return answer.split(separator)[0].trim();
    } catch (e) {
        return false;
    }
};

const startScripts = async (categories = true) => {
    const FcScripts = await parseScriptFile();
    if (FcScripts === false) {
        return false;
    }
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

    const taskData = FcScripts.allTasks.find(t => t.name === taskToRun);
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
        task: { name: taskToRun },
        script: {
            lang: lang,
            type: type,
            env: env,
            full: script,
            rest: script.split(" ")
        }
    });
};

const startPackageScripts = async () => {
    const packageScripts = await parsePackageFile();

    let tasks = Object.keys(packageScripts).map(e => {
        return { name: e, script: packageScripts[e] };
    });

    let taskToRun = await taskListAutoComplete(
        tasks.map(task => {
            return `${task.name}${separator}${task.script}`;
        })
    );

    if (taskToRun === false) {
        console.log(chalk.green.bold("See you soon!"));
        return false;
    }
    await runCLICommand({
        task: { name: taskToRun },
        script: {
            lang: taskToRun.lang,
            type: "yarn",
            full: taskToRun.script,
            rest: taskToRun.script.split(" ").slice(1)
        }
    });
};

const clearRecent = async () => {
    config.set("recentTasks", {});
};
module.exports = {
    startScripts,
    taskListAutoComplete,
    clearRecent,
    startPackageScripts
};

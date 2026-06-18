import taskList from "./taskList.js";
const separator = "   ~   ";
import Conf from "conf";
import moment from "moment-mini";
import chalk from "chalk";
import parseScriptFile from "./parsers/parseScriptsMd.js";
import parsePackageFile from "./parsers/parseScriptsPackage.js";
import runCLICommand from "./running/runCLICommand.js";
import parseTask from "./running/parseTask.js";
import React from "react";
import { render } from "ink";
import AutoComplete from "./ui/AutoComplete.js";
import path from "path";
import fs from "fs";
import fsrLog from "./utils/console.js";

let _config;
const getConfig = () => {
    if (!_config) {
        const packagePath = path.resolve(process.cwd(), "package.json");
        const packageJson = JSON.parse(fs.readFileSync(packagePath));
        _config = new Conf({ projectName: packageJson.name });
    }
    return _config;
};

const taskListAutoComplete = (tasks, title) => {
    const items = tasks.map(t => {
        const i = t.indexOf(separator);
        return i > -1
            ? { label: t.slice(0, i).trim(), sublabel: t.slice(i + separator.length).trim(), value: t.slice(0, i).trim() }
            : { label: t.trim(), sublabel: '', value: t.trim() };
    });

    return new Promise((resolve) => {
        let result = null;
        const { waitUntilExit } = render(
            React.createElement(AutoComplete, {
                items,
                title: title || 'Choose task to run',
                onSelect: (item) => { result = item.value; },
                onCancel: () => { result = null; }
            })
        );
        waitUntilExit().then(() => resolve(result));
    });
};

const startScripts = async (categories = true) => {
    const FcScripts = await parseScriptFile();
    if (FcScripts === false) {
        return false;
    }
    const config = getConfig();
    let recentTasks = config.get("recentTasks", {});
    let recentTaskArr = Object.keys(recentTasks)
        .map((taskName) => {
            let task = recentTasks[taskName];
            return { name: taskName, lastExecuted: task.lastExecuted };
        })
        .sort((a, b) =>
            a.lastExecuted > b.lastExecuted ? 1 : b.lastExecuted > a.lastExecuted ? -1 : 0
        )
        .reverse()
        .slice(0, 3);
    let recentTaskOptions = recentTaskArr.map((task) => {
        return task.name + separator + moment(task.lastExecuted).calendar();
    });

    let taskToRun;
    if (categories) {
        taskToRun = await taskList(FcScripts, recentTaskOptions);
    } else {
        const tasks = FcScripts.allTasks;
        taskToRun = await taskListAutoComplete(
            tasks.map((task) => `${task.name}${separator}${task.description}`),
            'Choose task to run'
        );
    }

    if (!taskToRun) {
        fsrLog.log(chalk.green.bold("See you soon!"));
        return false;
    }

    if (recentTasks[taskToRun] === undefined) {
        recentTasks[taskToRun] = { lastExecuted: Date.now() };
    } else {
        recentTasks[taskToRun].lastExecuted = Date.now();
    }
    config.set("recentTasks", recentTasks);

    const taskData = FcScripts.allTasks.find((t) => t.name === taskToRun);
    if (!taskData) {
        fsrLog.error(`${chalk.bold.underline.red("Task not found")}`);
        return;
    }

    await runCLICommand(parseTask(taskData));
};

const startPackageScripts = async () => {
    const packageScripts = (await parsePackageFile()) || {};

    const tasks = Object.keys(packageScripts).map((name) => ({
        name,
        script: packageScripts[name]
    }));

    const selection = await taskListAutoComplete(
        tasks.map((task) => `${task.name}${separator}${task.script}`),
        "Choose package script"
    );

    if (!selection) {
        fsrLog.log(chalk.green.bold("See you soon!"));
        return false;
    }

    const scriptName = String(selection).split(separator)[0].trim();
    await runCLICommand({
        task: { name: scriptName },
        script: { lang: "bash", type: "yarn", env: {}, full: scriptName, rest: [scriptName] }
    });
};

const clearRecent = async () => {
    getConfig().set("recentTasks", {});
};

export {
    startScripts,
    taskListAutoComplete,
    clearRecent,
    startPackageScripts
};

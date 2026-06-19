import taskList from "./taskList.js";
const separator = "   ~   ";
import moment from "moment-mini";
import chalk from "chalk";
import parseScriptFile from "./parsers/parseScriptsMd.js";
import parsePackageFile from "./parsers/parseScriptsPackage.js";
import runCLICommand from "./running/runCLICommand.js";
import parseTask from "./running/parseTask.js";
import React from "react";
import { render } from "ink";
import AutoComplete from "./ui/AutoComplete.js";
import fsrLog from "./utils/console.js";
import { readCacheEntry, writeCacheEntry } from "./cache/cache.js";
import fs from "fs";
import path from "path";

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

const startScripts = async (categories = true, env = null) => {
    const FcScripts = await parseScriptFile(env ? { env } : {});
    if (FcScripts === false) {
        return false;
    }
    const fscriptsPath = path.resolve(process.cwd(), "fscripts.md");
    const currentSize = fs.statSync(fscriptsPath).size;
    const sizeEntry = await readCacheEntry("fscriptsSize");
    const cachedSize = sizeEntry?.value ?? null;
    if (cachedSize !== currentSize) {
        await writeCacheEntry("recentTasks", {}, true);
        await writeCacheEntry("fscriptsSize", currentSize, true);
    }

    const recentEntry = await readCacheEntry("recentTasks");
    let recentTasks = recentEntry?.value ?? {};
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
    await writeCacheEntry("recentTasks", recentTasks, true);

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
    await writeCacheEntry("recentTasks", {}, true);
};

export {
    startScripts,
    taskListAutoComplete,
    clearRecent,
    startPackageScripts
};

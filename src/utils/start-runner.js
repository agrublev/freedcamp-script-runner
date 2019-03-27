const moment = require("moment");
const configManager = require("../utils/config-manager.js");
const chalk = require("chalk");
const runTask = require("../utils/task-runner.js");
const advancedInput = require("../utils/advanced-input.js");
const viewMoreText = `~~ view more ~~`;
const fixedWidthString = require("fixed-width-string");
const stringWidth = require("string-width");

async function inputChoices2(choiceCategories, conf, latestTasks) {
    advancedInput("Select an recent item or a category:", choiceCategories).then(async e => {
        // if (e.type !== "more") {
        let moreIndex = choiceCategories.indexOf(viewMoreText);
        if (moreIndex === e.ind) {
            advancedInput("Which task do you want to run:", latestTasks).then(async e => {
                let taskToRun = latestTasks[e.ind].split("~")[0].trim();
                try {
                    await runTask(taskToRun, configManager);
                } catch (e) {
                    throw new Error("something bad happened " + e);
                }
            });
        } else if (e.ind < moreIndex) {
            let taskToRun = e.txt.split("~")[0].trim();
            try {
                await runTask(taskToRun, configManager);
            } catch (e) {
                throw new Error("something bad happened" + e);
            }
        } else {
            let category = e.txt;
            let catIndex = conf.categories.findIndex(e => category.includes(e.title));
            if (catIndex === -1) {
                throw new Error("Seems no category found!");
            }
            let taskList = Object.keys(conf.categories[catIndex].tasks).map(task => {
                let tmpTask = conf.categories[catIndex].tasks[task];
                tmpTask.name = task;
                return tmpTask;
            });
            let taskNames = taskList.map(
                task =>
                    `${task.name} ${
                        task.description ? "~" + task.description.replace(/\n/g, " ").trim() : ""
                    }`
            );
            advancedInput("Which task do you want to run:", taskNames).then(async e => {
                let taskToRun = taskNames[e.ind].split("~")[0].trim();
                try {
                    await runTask(taskToRun, configManager);
                } catch (e) {
                    throw new Error("something bad happened" + e);
                }
            });
        }
    });
}

async function startRunner() {
    const conf = await configManager.init();
    // const name = flags.name;
    // const isFirst = args.isFirst;
    // this.log(`Flag name: ${name} Arg isFirst: ${isFirst}, should? ${flags.should}`);
    let latestTasks = Object.keys(conf.tasks).map(e => {
        let tempObj = {};
        tempObj.name = e;
        return { ...tempObj, ...conf.tasks[e] };
    });
    latestTasks = latestTasks.filter(e => e.lastRan !== undefined);
    latestTasks = latestTasks
        .sort((a, b) => (a.lastRan > b.lastRan ? 1 : b.lastRan > a.lastRan ? -1 : 0))
        .reverse()
        .map(e => {
            let taskItem = e.name.split(" ")[0];
            taskItem += "~" + moment(e.lastRan).calendar() + "";
            return taskItem;
        });
    let recentTasks = latestTasks.slice(0, 3);
    let rLen = recentTasks.length;
    let hasRecent = rLen === 3 ? 1 : rLen === 0 ? -1 : 0;
    recentTasks =
        hasRecent > -1 ? (hasRecent === 1 ? recentTasks.concat(viewMoreText) : recentTasks) : [];
    let lengthMax = 0;
    let limit = process.stdout.columns;
    let cats = conf.categories.map(e => {
        let ln = `${chalk.bold(e.title)}`;
        lengthMax = lengthMax < stringWidth(ln) ? stringWidth(ln) : lengthMax;
        ln += `${e.description ? "~~" + chalk.dim(e.description.trim()) : ""}`;
        return ln;
    });
    lengthMax += 15;

    let choiceCategories = [
        ...recentTasks,
        ...cats.map(e => {
            let z = e.split("~~");
            let lef = z[0].padEnd(lengthMax, " ");
            let rig = z[1]; //;.padStart(z[1].length + sep, " ");
            //process.stdout.columns - 5
            return fixedWidthString(lef + rig, limit);
        })
    ];
    await inputChoices2(choiceCategories, conf, latestTasks);
}

module.exports = startRunner;

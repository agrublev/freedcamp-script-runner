const moment = require("moment");
const { Command, flags } = require("@oclif/command");
const configManager = require("../utils/config-manager.js");
const inquirer = require("inquirer");
const runTask = require("../utils/task-runner.js");
const advancedInput = require("../utils/advanced-input.js");
const viewMoreText = `~~ view more ~~`;

async function inputChoices2(choiceCategories, conf, latestTasks) {
    advancedInput("Select an recent item or a category:", choiceCategories).then(async e => {
        // console.log(e);
        // if (e.type !== "more") {
            let moreIndex = choiceCategories.indexOf(viewMoreText);
            if (moreIndex === e.ind) {
                inquirer
                    .prompt([
                        {
                            type: "list",
                            name: "taskToRun",
                            message: "Which task do you want to run",
                            choices: latestTasks
                        }
                    ])
                    .then(async ({ taskToRun }) => {
                        taskToRun = taskToRun.split("~")[0].trim();
                        await runTask(taskToRun, configManager);
                    });
            } else if (e.ind < moreIndex) {
                // console.log("RUN ME", e);
                let taskToRun = e.txt.split("~")[0].trim();
                await runTask(taskToRun, configManager);
            } else {
                console.log("CATEEEEEE", e);
                let category = e.txt;
                let catIndex = conf.categories.findIndex(e => e.title === category);
                let taskList = Object.keys(conf.categories[catIndex].tasks).map(task => {
                    let tmpTask = conf.categories[catIndex].tasks[task];
                    tmpTask.name = task;
                    return tmpTask;
                });
                let taskNames = taskList.map(
                    task =>
                        `${task.name} ${
                            task.description
                                ? "~" + task.description.replace(/\n/g, " ").trim()
                                : ""
                        }`
                );
                inquirer
                    .prompt([
                        {
                            type: "list",
                            name: "taskToRun",
                            message: "Which task do you want to run",
                            choices: taskNames
                        }
                    ])
                    .then(async ({ taskToRun }) => {
                        taskToRun = taskToRun.split("~")[0].trim();
                        await runTask(taskToRun, configManager);
                    });
            }
        // } else {
        //     console.log("MORE MORE", e);
        //     inquirer
        //         .prompt([
        //             {
        //                 type: "rawlist",
        //                 name: "action",
        //                 message: "What to do",
        //                 choices: ["bookmark", "clear"]
        //             }
        //         ])
        //         .then(async ({ action }) => {
        //             // taskToRun = taskToRun.split("~")[0].trim();
        //             // await runTask(taskToRun, configManager);
        //             console.warn("-- Console action", action);
        //         });
        // }
    });
}

class StartCommand extends Command {
    async run() {
        const conf = await configManager.init();
        const { args, flags } = this.parse(StartCommand);
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
            hasRecent > -1
                ? hasRecent === 1
                    ? recentTasks.concat(viewMoreText)
                    : recentTasks
                : [];
        let choiceCategories = [...recentTasks, ...conf.categories.map(e => e.title)];
        await inputChoices2(choiceCategories, conf, latestTasks);
    }
}

StartCommand.description = `Start the task picker
...
Picking a task to run!
`;

StartCommand.args = [
    {
        name: "isFirst",
        description: "This is if isFirst was passed or not returns boolean with default false",
        default: false
    },
    { name: "isSecond" }
];

StartCommand.flags = {
    name: flags.string({
        required: false, // make the arg required with `required: true`
        description: "The name", // help description
        // hidden: true, // hide this arg from help
        char: "n", //short --n
        // parse: input => "output", // instead of the user input, return a different value
        default: "flagDef" //, // default value if no arg input
        // options: ["a", "b"]
    }),
    should: flags.boolean({
        required: false, // make the arg required with `required: true`
        description: "Should do it?", // help description
        char: "s",
        default: true, // default value if no arg input
        options: ["", "true", "false"]
    })
};

// StartCommand.examples = ["$ fexa bye --name=test", "$ fexa bye isFirst"];

StartCommand.strict = false;
StartCommand.aliases = ["e"];
module.exports = StartCommand;

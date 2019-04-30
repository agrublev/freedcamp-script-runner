const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const mm = require("micromatch");
const requireFromString = require("require-from-string");
const runCLICommand = require("./runCLICommand");
const inquirer = require("inquirer");
const moment = require("moment");
const getColonTimeFromDate = () => new Date().toTimeString().slice(0, 8);
const secretFilePath = path.join(process.cwd(), "./.secret.json");
const separator = "   ~   ";
const scriptsDir = process.cwd();
const rootDir = path.join(scriptsDir, "./");
const packageFileDir = path.join(scriptsDir, "./package.json");

class FcScripts {
    constructor(opts = {}) {
        // logger.clear();
        // logger.setOptions({ quiet: opts.quiet });
        return this.loadAsync(opts);
    }

    async runTasks(taskNames, inParallel) {
        if (!taskNames || taskNames.length === 0) return;

        if (inParallel) {
            await Promise.all(
                taskNames.map(taskName => {
                    return this.runTask(taskName);
                })
            );
        } else {
            for (const taskName of taskNames) {
                await this.runTask(taskName);
            }
        }
    }

    async runFile(taskName) {
        await this.runTask("beforeAll", false);
        await this.runTask(taskName);
        await this.runTask("afterAll", false);
    }

    async runTask(taskName, throwWhenNoMatchedTask = true) {
        const task =
            taskName && this.maidfile && this.maidfile.tasks.find(task => task.name === taskName);

        if (!task) {
            if (throwWhenNoMatchedTask) {
                console.log(`No task called "${taskName}" was found. Stop.`);
            } else {
                return;
            }
        }

        await this.runTaskHooks(task, "before");

        const start = Date.now();
        console.log("Starting", '"' + task.name + '..."');

        for (const script of task.scripts) {
            await this.runScript(script, task);
        }
        await this.runTaskHooks(task, "after");

        console.log("Finished", '"' + task.name + ` after ${Date.now() - start} ms`);
    }

    runScript(script, task) {
        return new Promise((resolve, reject) => {
            const handleError = err => {
                console.log(`Task '${task.name}' failed.\n${err.stack}`);
            };
            if (checkTypes(script, ["sh", "bash"])) {
                return runCLICommand({ script, task, resolve, reject });
            }
            if (checkTypes(script, ["py", "python"])) {
                return runCLICommand({ type: "python", script, task, resolve, reject });
            }
            if (checkTypes(script, ["js", "javascript"])) {
                let res;
                try {
                    res = requireFromString(script.src, this.maidfile.filepath);
                } catch (err) {
                    return handleError(err);
                }
                res = res.default || res;
                return resolve(
                    typeof res === "function" ? Promise.resolve(res()).catch(handleError) : res
                );
            }

            return resolve();
        });
    }

    async runTaskHooks(task, when) {
        const prefix = when === "before" ? "pre" : "post";
        const tasks = this.maidfile.tasks.filter(({ name }) => {
            return name === `${prefix}${task.name}`;
        });
        await this.runTasks(tasks.map(task => task.name));
        for (const item of task[when]) {
            const { taskNames, inParallel } = item;
            await this.runTasks(taskNames, inParallel);
        }
    }

    getHelp(patterns) {
        patterns = [].concat(patterns);
        const tasks =
            patterns.length > 0
                ? this.maidfile.tasks.filter(task => {
                      return mm.some(task.name, patterns);
                  })
                : this.maidfile.tasks;

        if (tasks.length === 0) {
            console.log(`No tasks for pattern "${patterns.join(" ")}" was found. Stop.`);
        }

        logger.log(
            `\n  ${chalk.magenta.bold(
                `Task${tasks.length > 1 ? "s" : ""} in ${path.relative(
                    process.cwd(),
                    this.maidfile.filepath
                )}:`
            )}\n\n` +
                tasks
                    .map(
                        task =>
                            `  ${chalk.bold(task.name)}\n${chalk.dim(
                                task.description
                                    ? task.description
                                          .split("\n")
                                          .map(v => `      ${v.trim()}`)
                                          .join("\n")
                                    : "      No description"
                            )}`
                    )
                    .join("\n\n") +
                "\n"
        );
    }

    runList(patterns) {}

    getList() {
        const tasks = this.maidfile.tasks;
    }
}

function checkTypes(task, types) {
    return types.some(type => type === task.type);
}

const taskList = async (FcScripts, recentTasks) => {
    return new Promise(resolve => {
        let choiceCategories = [
            ...recentTasks,
            ...["-------------"],
            ...FcScripts.categories.map(cat => {
                return cat.title + separator + cat.description;
            })
        ];
        inquirer
            .prompt([
                {
                    type: "list",
                    name: "category",
                    message: "What category do you want to run?",
                    choices: choiceCategories
                }
            ])
            .then(({ category }) => {
                let sepInd = choiceCategories.indexOf("-------------");
                let chosenInd = choiceCategories.indexOf(category);
                if (sepInd === chosenInd) {
                    console.log("Can't select divider");
                } else if (chosenInd < sepInd) {
                    let taskToRun = category.split(separator)[0].trim();
                    resolve(taskToRun);
                } else {
                    let categoryName = category.split(separator)[0];
                    let catObj = FcScripts.categories.findIndex(e => e.title === categoryName);
                    catObj = FcScripts.categories[catObj];
                    let taskNames = Object.keys(catObj.tasks).map(taskName => {
                        let task = catObj.tasks[taskName];
                        return `${taskName} ${
                            task.description
                                ? separator + task.description.replace(/\n/g, " ").trim()
                                : ""
                        }`;
                    });
                    inquirer
                        .prompt([
                            {
                                type: "list",
                                name: "taskToRun",
                                message: "Which task do you want to run",
                                choices: taskNames
                            }
                        ])
                        .then(({ taskToRun }) => {
                            taskToRun = taskToRun.split(separator)[0].trim();
                            resolve(taskToRun);
                        });
                }
            });
    });
};

module.exports = taskList;

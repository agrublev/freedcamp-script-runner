const path = require("path");
const chalk = require("chalk");
const fs = require("fs");
const mm = require("micromatch");
const requireFromString = require("require-from-string");
const logger = require("./logger");
const readMaidFile = require("./readMaidFile");
const MaidError = require("./MaidError");
const runCLICommand = require("./runCLICommand");
const inquirer = require("inquirer");
const moment = require("moment");
const getColonTimeFromDate = () => new Date().toTimeString().slice(0, 8);
const secretFilePath = path.join(process.cwd(), "./.secret.json");
// const spawn = require('cross-spawn')
let secretFile = { tasks: [] };
let taskListSorted = [];

if (fs.existsSync(secretFilePath)) {
    secretFile = require(secretFilePath);
    taskListSorted = secretFile.tasks
        .sort((a, b) => (a.time > b.time ? 1 : b.time > a.time ? -1 : 0))
        .reverse()
        .slice(0, 3)
        .map(e => {
            if (e.task === undefined) {
                return e;
            }

            let taskItem = e.task.split(" ")[0];
            taskItem += "\t~\t" + moment(e.time).calendar() + "";
            return taskItem;
        });
} else {
    fs.writeFileSync(secretFilePath, JSON.stringify(secretFile), "utf8");
}
class FcScripts {
    constructor(opts = {}) {
        // logger.clear();
        // logger.setOptions({ quiet: opts.quiet });
        return this.loadAsync(opts);
    }

    async loadAsync(opts) {
        this.maidfile = await readMaidFile(opts.section);
        if (!this.maidfile) {
            throw new MaidError("No maidfile was found. Stop.");
        }
        return this;
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
                throw new MaidError(`No task called "${taskName}" was found. Stop.`);
            } else {
                return;
            }
        }

        await this.runTaskHooks(task, "before");

        const start = Date.now();
        logger.l("Starting", '"' + task.name + '..."');

        for (const script of task.scripts) {
            await this.runScript(script, task);
        }
        await this.runTaskHooks(task, "after");

        logger.l("Finished", '"' + task.name + ` after ${Date.now() - start} ms`);
    }

    runScript(script, task) {
        return new Promise((resolve, reject) => {
            const handleError = err => {
                throw new MaidError(`Task '${task.name}' failed.\n${err.stack}`);
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
            throw new MaidError(`No tasks for pattern "${patterns.join(" ")}" was found. Stop.`);
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

    runList(patterns) {
        let choiceCategories = [
            ...taskListSorted,
            ...["-------------"],
            ...Object.keys(this.maidfile.catScripts)
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
                    console.log("NOPE");
                } else if (chosenInd < sepInd) {
                    console.log(" RUUNNNING", category);
                    let taskToRun = category.split("\t~\t")[0].trim();
                    updateTimeTask(taskToRun, { category: "" });
                    this.runTask(taskToRun);
                } else {
                    let taskNames = this.maidfile.catScripts[category].map(
                        task =>
                            `${task.name} ${
                                task.desc ? "\t~\t" + task.desc.replace(/\n/g, " ").trim() : ""
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
                        .then(({ taskToRun }) => {
                            // taskToRun.split(" ")[0] ?
                            taskToRun = taskToRun.split("\t~\t")[0].trim();
                            updateTimeTask(taskToRun, category);
                            this.runTask(taskToRun);
                        });
                }
            });
    }

    getList() {
        const tasks = this.maidfile.tasks;
    }
}

function updateTimeTask(taskToRun, category) {
    let taskIndex = secretFile.tasks.findIndex(e => e.task.split(" ")[0] === taskToRun);
    if (taskIndex === -1) {
        secretFile.tasks.push({
            category,
            task: taskToRun,
            time: Date.now()
        });
    } else {
        secretFile.tasks[taskIndex].time = Date.now();
    }
    fs.writeFileSync(secretFilePath, JSON.stringify(secretFile), "utf8");
}

function checkTypes(task, types) {
    return types.some(type => type === task.type);
}

module.exports = opts => new FcScripts(opts);

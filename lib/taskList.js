const inquirer = require("inquirer");
const separator = "   ~   ";
const termSize = require("term-size");
const chalk = require("chalk");
const convertBold = e => {
    let reg = /(\*\*|^\*\*)(?=\S)([\s\S]*?\S)\*\*(?![\*\*\S])/g;
    let boldMatches = e.match(reg);
    if (boldMatches !== null) {
        boldMatches.forEach(m => {
            e = e.replace(m, chalk.bold.redBright(m.replace(/\*\*/g, ""))); //.underline.bgBlack.whiteBright
        });
    }
    let regunderline = /(_|^_)(?=\S)([\s\S]*?\S)_(?![_\S])/g;
    let underlineMatches = e.match(regunderline);
    if (underlineMatches !== null) {
        underlineMatches.forEach(m => {
            e = e.replace(m, chalk.underline.greenBright(m.replace(/\_\_/g, ""))); //.underline.bgBlack.whiteBright
        });
    }
    return e;
};
const convertBoldArray = arr => {
    return arr.map(e => {
        return convertBold(e);
    });
};
const taskList = async (FcScripts, recentTasks) => {
    return new Promise(resolve => {
        let choiceCategories = [
            ...recentTasks.map(cat => {
                return {
                    name: `${chalk.bold.underline.green(cat)}`,
                    value: { type: "task", name: cat }
                };
            }),
            { name: "-------------", value: null },
            ...FcScripts.categories.map(cat => {
                return {
                    name: `${chalk.bold.underline.green(cat.name)} ${separator} ${convertBold(
                        cat.description
                    )}`,
                    value: { type: "category", name: cat.name }
                };
            })
        ];

        const { rows } = termSize();
        //=> {columns: 143, rows: 24}
        inquirer
            .prompt([
                {
                    type: "list",
                    name: "category",
                    message: "What category do you want to run?",
                    pageSize: rows - 1,
                    choices: choiceCategories
                }
            ])
            .then(({ category }) => {
                let sepInd = choiceCategories.indexOf("-------------");
                let chosenInd = choiceCategories.indexOf(category);
                if (category === null) {
                    console.log("Can't select divider");
                } else if (category.type === "task") {
                    let taskToRun = category.name.split(separator)[0].trim();
                    resolve(taskToRun);
                } else {
                    let categoryName = category.name.split(separator)[0];
                    let catObj = FcScripts.categories.findIndex(e => e.name === category.name);
                    catObj = FcScripts.categories[catObj];
                    let taskNames = Object.keys(catObj.tasks).map(taskName => {
                        let task = catObj.tasks[taskName];
                        return `${taskName} ${
                            task.description
                                ? separator + task.description.replace(/\n/g, " ").trim()
                                : ""
                        }`;
                    });
                    taskNames = convertBoldArray(taskNames);
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

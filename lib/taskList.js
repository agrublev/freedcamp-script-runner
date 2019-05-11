const inquirer = require("inquirer");
const separator = "   ~   ";

const taskList = async (FcScripts, recentTasks) => {
    return new Promise(resolve => {
        let choiceCategories = [
            ...recentTasks,
            ...["-------------"],
            ...FcScripts.categories.map(cat => {
                return cat.name + separator + cat.description;
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
                    let catObj = FcScripts.categories.findIndex(e => e.name === categoryName);
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

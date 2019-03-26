const chalk = require("chalk");
const inquirer = require("inquirer");

inquirer
    .prompt([
        {
            type: "list",
            name: "category",
            message: "What category do you want to run?",
            choices: ["one", "two"]
        }
    ])
    .then(({ category }) => {
        console.log(`${chalk.red(category)}`);
    });

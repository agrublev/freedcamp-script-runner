const chalk = require("chalk");
const inquirer = require("inquirer");

(async function() {
    console.log(`${chalk.green("PRE INPUT")}\n`);
    inquirer
        .prompt([
            {
                type: "list",
                name: "category",
                message: "What category do you want to run?",
                choices: [1, 2, 3, 4, 5]
            }
        ])
        .then(({ category }) => {
            console.log(`${chalk.green("CHOSEN ", category)}`);
        });
    console.log(`${chalk.green("POST INPUT")}`);
})();

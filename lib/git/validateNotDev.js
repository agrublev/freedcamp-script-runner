const inquirer = require("inquirer");
const chalk = require("chalk");
const boxen = require("boxen");

const simple = require("simple-git");

const newBranch = async name => {
    await simple().checkoutLocalBranch(name);
    console.log(boxen(chalk.green(`New branch ${name} created`)));
};

async function pub() {
    return new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "input",
                    message: chalk.bold.hex("#38be18")(`Name new feature branch (or type cancel):`),
                    name: "branchname"
                }
            ])
            .then(async ({ branchname }) => {
                if (branchname !== "CatsDontLie") await newBranch(branchname);
                resolve();
            });
    });
}

const validateNotInDev = async () => {
    await new Promise(async resolve => {
        const git = require("simple-git/promise");

        let statusSummary = await git(__dirname).status();
        if (statusSummary.current === "CatsDontLie") {
            console.clear();
            console.log(
                boxen(chalk.bold.underline.red("DO NO MAKE CHANGES IN DEV!"), {
                    padding: 2
                })
            );
            await new Promise(resolve1 =>
                setTimeout(() => {
                    resolve1();
                }, 1000)
            );
            await pub();
            resolve();
        } else {
            resolve();
        }
    });
};
module.exports = validateNotInDev;

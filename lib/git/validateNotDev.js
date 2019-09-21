const inquirer = require("inquirer");
const chalk = require("chalk");
const boxen = require("boxen");
const { boxInform } = require("../helpers.js");
const git = require("git-state");
const simple = require("simple-git");
const pathToCwd = process.cwd();

const newBranch = async name => {
    // const last = await new Promise(rzz => {
    //     git.isGit(pathToCwd, function(exists) {
    //         if (!exists) return;

    //
    //         git.commit(pathToCwd, function(err, result) {
    //             if (err) throw err;
    //             rzz(result);
    //         });
    //     });
    // });

    // await simple().checkoutLocalBranch(name);
    await simple().checkoutBranch(name, "origin");
    boxInform(chalk.green(`New branch ${name} created`, "", 5));
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
                if (branchname !== "Development") await newBranch(branchname);
                resolve();
            });
    });
}

const validateNotInDev = async () => {
    await new Promise(async resolve => {
        const git = require("simple-git/promise");

        let statusSummary = await git(__dirname).status();
        if (statusSummary.current === "Development") {
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

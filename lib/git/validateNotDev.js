import inquirer from "inquirer";
import chalk from "chalk";
import boxen from "boxen";
import { simpleGit } from "simple-git";
import fsrLog from "../utils/console.js";
const pathToCwd = process.cwd();
const git = simpleGit();

const newBranch = async (name) => {
    try {
        await git.checkoutLocalBranch(name);
    } catch (e) {
        fsrLog.error(e);
    }

    console.clear();
    fsrLog.log(`
${chalk.yellow(`New branch ${name} created`, "")}
`);
};

async function pub() {
    return new Promise((resolve) => {
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
        const { default: git } = await import("simple-git");

        let statusSummary = await git(pathToCwd).status();
        if (statusSummary.current === "Development") {
            console.clear();
            fsrLog.log(
                boxen(chalk.bold.underline.red("DO NO MAKE CHANGES IN DEV!"), {
                    padding: 2
                })
            );
            await new Promise((resolve1) =>
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
export default validateNotInDev;

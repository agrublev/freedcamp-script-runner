import inquirer from "inquirer";
import chalk from "chalk";
import boxen from "boxen";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { boxInform } from "../utils/helpers.js";
import git from "git-state";
import simple from "simple-git";
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
    await simple().checkoutBranch(name, "origin/Development");
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
        const { default: git } = await import("simple-git/promise");

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
export default validateNotInDev;

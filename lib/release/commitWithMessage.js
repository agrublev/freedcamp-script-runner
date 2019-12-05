var inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");
const { readJson } = require("../helpers.js");
const seeChangedFiles = require("./seeChangedFiles.js");
const bump = require("./bump.js");
const childProcess = require("child_process");
const validateNotDev = require("./validateNotDev.js");
const push = require("./pushToGit");

async function pub() {
    await validateNotDev();
    await bump();
    let pack = await readJson("package.json");
    await seeChangedFiles();
    let commitMsg = "";
    const type = await new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "list",
                    message: chalk.green.bold.underline("What type of change is this?"),
                    choices: [
                        "refactor",
                        "fix",
                        "improvement",
                        "docs",
                        "style",
                        "php",
                        "test",
                        "build",
                        "ci",
                        "chore",
                        "revert"
                    ],
                    name: "retType"
                }
            ])
            .then(async ({ retType }) => {
                resolve(retType);
            });
    });
    commitMsg += `[${type}] `;
    await new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "input",
                    message: chalk.bold.hex("#38be18")(
                        `TITLE: What's new this version ${pack.version}: `
                    ),
                    name: "commitTitle"
                }
            ])
            .then(({ commitTitle }) => {
                commitMsg += commitTitle + `\t\tVERSION ${pack.version}`;
                // inquirer
                //     .prompt([
                //         {
                //             type: "message",
                //             message: chalk.bold.hex("#38be18")(`Explain in detail!`),
                //             name: "commitDescription"
                //         }
                //     ])
                //     .then(async ({ commitDescription }) => {
                // commitMsg += "\n" + commitDescription;
                childProcess.execSync(`git add .`, {
                    stdio: "inherit",
                    env: Object.assign({}, process.env, {
                        FORCE_COLOR: true,
                        PATH: `${path.resolve("node_modules")}:${process.env.PATH}`
                    })
                });
                childProcess.execSync(`git commit -m "${commitMsg}"`, {
                    stdio: "inherit",
                    env: Object.assign({}, process.env, {
                        FORCE_COLOR: true,
                        PATH: `${path.resolve("node_modules")}:${process.env.PATH}`
                    })
                });
                push();
                resolve();
            });
    });
}
(async () => {
    await pub();
})();

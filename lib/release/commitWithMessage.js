var inquirer = require("inquirer");
const chalk = require("chalk");
const { readJson } = require("../helpers.js");
const seeChangedFiles = require("./seeChangedFiles.js");
const bump = require("./bump.js");
const validateNotDev = require("./validateNotDev.js");

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
            inquirer
                .prompt([
                    {
                        type: "message",
                        message: chalk.bold.hex("#38be18")(`Explain in detail!`),
                        name: "commitDescription"
                    }
                ])
                .then(async ({ commitDescription }) => {
                    commitMsg += "\n" + commitDescription;
                    require("simple-git")()
                        .add("./*")
                        .commit(`${commitMsg}`);
                    try {
                        // logInfo(command);
                        childProcess.execSync("git -c credential.helper= -c core.quotepath=false -c log.showSignature=false push --progress --porcelain origin TT --set-upstream --tags", {
                            stdio: "inherit",
                            env: Object.assign({}, process.env, {
                                FORCE_COLOR: true,
                                PATH: `${path.resolve("node_modules")}:${process.env.PATH}`
                            })
                        });
                    } catch (e) {}
                    require("simple-git")()
                        .push(["--set-upstream", "-u"], () => console.log("done"))
                        .addTag(`${pack.version}`, () => console.warn("-- Console TAGGED", 52))
                        .pushTags();
                });
        });
}
pub();

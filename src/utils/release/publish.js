var inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");
const runTask = require("../task-runner.js");
const { readJson } = require("../index.js");

async function pub() {
    runTask("sh " + path.join(__dirname, "publish.sh") + " --")
        .then(async () => {
            let pack = await readJson("package.json");
            // console.log(pack.version);
            inquirer
                .prompt([
                    {
                        type: "input",
                        message: chalk.bold.hex("#38be18")(
                            `What's new this version ${pack.version}: `
                        ),
                        name: "commitmsg"
                    }
                ])
                .then(async ({ commitmsg }) => {
                    commitmsg;
                    require("simple-git")()
                        .add("./*")
                        .commit(
                            `VERSION ${pack.version}
${commitmsg}`
                        )
                        .push(["-u"], () => console.log("done"))
                        .addTag(`${pack.version}`, () => console.warn("-- Console TAGGED", 52))
                        .pushTags("origin", () => {
                            console.warn("-- Console 3", 3);
                        });
                    // await require("simple-git")()
                });
        })
        .catch(e => {
            console.warn("-- Console ERR", e);
        });
}
pub();

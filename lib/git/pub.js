var inquirer = require("inquirer");
const chalk = require("chalk");
const boxen = require("boxen");
const path = require("path");
const runTask = require("./taskRunner");
const { readJson } = require("../helpers");
const simple = require("simple-git");
// pub();
const newBranch = async name => {
    await simple().checkoutLocalBranch(name);
};

async function pub() {
    // runTask("sh " + path.join(__dirname, "publish.sh") + " --")
    // .then(async () => {
    // })
    // .catch(e => {
    //     console.warn("-- Console ERR", e);
    // });
}

const validateNotInDev = require("./validateNotDev.js");

(async () => {
    await validateNotInDev();
    await new Promise(resolve => {
        let pack = readJson(path.resolve(__dirname + "package.json"));

        inquirer
        .prompt([
            {
                type: "input",
                message: chalk.bold.hex("#38be18")(`What's new this version ${pack.version}: `),
                name: "commitmsg"
            }
        ])
        .then(async ({ commitmsg }) => {
            simple()
            .add("./*")
            .commit(`VERSION ${pack.version}\n${commitmsg}`)
            .push(["-u"], () => console.log("done"))
            .addTag(`${pack.version}`, () => console.warn(""))
            .pushTags("origin", () => {
                console.warn("-- Console 3", 3);
                resolve();
            });
            // await require("simple-git")()
        });
    });
})();

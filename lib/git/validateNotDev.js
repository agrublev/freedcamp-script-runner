var inquirer = require("inquirer");
const chalk = require("chalk");
const boxen = require("boxen");
const path = require("path");
const runTask = require("./taskRunner");
const { readJson } = require("../helpers");
const simple = require("simple-git");
async function pub() {
    // runTask("sh " + path.join(__dirname, "publish.sh") + " --")
    // .then(async () => {
    let pack = await readJson("package.json");
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
                });
            // await require("simple-git")()
        });
    // })
    // .catch(e => {
    //     console.warn("-- Console ERR", e);
    // });
}
// pub();
const newBranch = async name => {
    await simple().checkoutLocalBranch(name);
};
(async () => {
    // await simple().branch({}, function(e) {
    //     console.warn("-- Console EE", e);
    // });
    const git = require("simple-git/promise");

    let statusSummary = null;
    try {
        // status(__dirname + '/some-repo').then(status => console.log(status));

        statusSummary = await git(__dirname).status();

        if (statusSummary.current === "Development") {
            console.clear();
            console.log(
                boxen(chalk.bold.underline.red("DO NO MAKE CHANGES IN DEV!"), {
                    padding: 2
                })
            );
        } else {

        }
        // console.warn("-- Console st", statusSummary);
    } catch (e) {
        // handle the error
        console.warn("-- Console e", e);
    }

    return statusSummary;
})();

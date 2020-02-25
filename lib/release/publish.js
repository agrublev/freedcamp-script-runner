const childProcess = require("child_process");
const path = require("path");
const { boxInform } = require("../utils/helpers.js");
const chalk = require("chalk");

async function pub() {
    let command = `sh ${path.resolve(__dirname, "publish.sh")}`;
    try {
        childProcess.execSync(command, {
            stdio: "inherit",
            env: Object.assign({}, process.env, {
                FORCE_COLOR: true,
                PATH: `${path.resolve("node_modules")}:${process.env.PATH}`
            })
        });
        boxInform(
            chalk.green.bold.underline("PUBLISHED"),
            "https://www.npmjs.com/package/fscripts",
            3
        );
    } catch (e) {
        console.error(`${command} - ${e}`);
    }
}
pub();

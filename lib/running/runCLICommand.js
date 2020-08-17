const chalk = require("chalk");
const path = require("path");
const moment = require("moment-mini");
const spawn = require("cross-spawn");
const requireFromString = require("require-from-string");

module.exports = async ({ script, task, type = script.type }, quiet = false) => {
    if (!quiet) {
        console.log(
            `${chalk.green
                .bgHex("#181c24")
                .bold("[" + moment().format("HH:MM:SS") + "]")}${chalk
                .bgHex("#181c24")
                .bold.hex("#8c91a7")(" " + task.name + ": ")}`
        );
    }
    return new Promise(resolve => {
        if (script.lang === "javascript") {
            requireFromString(script.full, "./fscripts.md");
            resolve();
        } else {
            const cmd = spawn(type, [...script.rest], {
                stdio: "inherit",
                env: Object.assign({}, process.env, {
                    FORCE_COLOR: true,
                    PATH: `${path.resolve("node_modules/.bin")}:${process.env.PATH}`,
                    ...script.env
                })
            });

            cmd.on("close", code => {
                if (code === 0) {
                    resolve();
                } else {
                    console.error(`${chalk.red("ERROR")} ${code} runCli`);
                    resolve();
                }
            });
            // }
        }
    });
};

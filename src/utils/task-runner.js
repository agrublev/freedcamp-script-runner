const moment = require("moment");
const tryPath = process.cwd();
const chalk = require("chalk");
const prettyMs = require("pretty-ms");
const spawn = require("cross-spawn");
const boxen = require("boxen");
const helpers = require("../helpers/index.js");

const runTask = async (name, conf = false) => {
    let output;
    let startTime = Date.now();
    let input = name.slice(-1) === "-";
    let task = {};
    let tasks = [];
    if (conf !== false) {
        conf.set("tasks." + name + ".lastRan", startTime);
        await conf.updateConfigFile();
        tasks = conf.get("tasks");
    }
    let command =
        conf === false ? name : tasks[name].file ? "node " + tasks[name].file : tasks[name].script;
    helpers.clear();
    console.log(
        input
            ? chalk.hex("#4b5150")(" Running: ") + chalk.bold.underline.hex("#438b34")(name)
            : boxen(
                  chalk.hex("#717877")(" Running: ") +
                      chalk.bold.underline.hex("#438b34")(name) +
                      chalk.hex("#717877")(" "),
                  {
                      padding: 0,
                      margin: { left: 2, top: 0, bottom: 0, right: 0 },
                      borderStyle: {
                          topLeft: chalk.hex("#5a596d")("╔"),
                          topRight: chalk.hex("#5a596d")("╗"),
                          bottomLeft: chalk.hex("#5a596d")("╚"),
                          bottomRight: chalk.hex("#5a596d")("╝"),
                          horizontal: chalk.hex("#5a596d")("═"),
                          vertical: chalk.hex("#5a596d")("║")
                      }, //"round",
                      // dimBorder: true,
                      align: "center" //,
                      // float: "center"
                  }
              )
    );
    try {
        let pars = command.split(" ");

        output = spawn(pars[0], pars.slice(1, pars.length), {
            cwd: tryPath,
            env: { ...process.env, ...{ FORCE_COLOR: true } },
            stdio: input ? "inherit" : "pipe"
        });
        if (!input) {
            output.stdout.on("data", code => {
                code = code + "";
                console.log(
                    `${chalk.bgHex("#181c24").hex("#8c91a7")(
                        moment().format("HH:MM:SS") + ":"
                    )} ${code}`.trim()
                );
            });
            output.stderr.on("data", code => {
                code = code + "";
                console.log(
                    `${chalk.bgHex("#181c24").hex("#a72e32")(
                        moment().format("HH:MM:SS") + "ERR :"
                    )} ${code}`.trim()
                );
            });
        }
        return new Promise((resolve, reject) => {
            output.on("close", code => {
                if (code === 0) {
                    let elapsed = Date.now() - startTime;
                    console.log(`${chalk.bold.green("Finished in " + prettyMs(elapsed), code)}`);
                    resolve();
                } else {
                    // console.log(`${chalk.bold.green("Finished in " + prettyMs(elapsed), code)}`);
                    reject(`task exited with code ${code}`);
                }
            });
        });
    } catch (error) {
        console.log(`${chalk.red.bold(error)}`);
    }
};

module.exports = runTask;

const chalk = require("chalk");
const tryPath = process.cwd();

const execCommand = cmdChoice => {
    console.warn("-- Console WHAT IS INSIDE ", cmdChoice);
    const { spawn } = require("child_process");
    let command = cmdChoice.src ? cmdChoice.src : cmdChoice;
    let dirPath = command.replace("./", tryPath + "/").replace("\n", "");
    let pars = dirPath.split(" ");
    const shell = spawn(pars[0], pars.slice(1, pars.length), { stdio: "inherit", cwd: tryPath });
    return new Promise(resolve => {
        shell.on("close", code => {
            console.log(`${chalk.bold.green("Finished")}`);
            resolve();
        });
    });
};
///DEVELOPMENT/freedcamp-script-runner/test
module.exports = execCommand;

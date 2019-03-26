const fs = require("fs");
const runCommand = require("./runCommand.js");
const path = require("path");
const chalk = require("chalk");
const requireFromString = require("./requireFromString.js");
const nodeEval = require("node-eval");
let tempFile = path.join(process.cwd(), ".temp.js");
const taskExecutor = async (taskName, type, script, executor) => {
    if (type === "js") {
        fs.writeFileSync(tempFile, script, "utf8");
        script = "node .temp.js";
    }
    const shell = runCommand(script);
    shell.stdout.on("data", code => {
        code = code + "";
        // console.log("THE MESSAGE IS", code);
        if (
            code.indexOf("[1A") !== -1 ||
            code.indexOf("[1G") !== -1 ||
            code.indexOf("[2K") !== -1
        ) {
            //
        } else if (code.indexOf("Built") !== -1) {
            executor.clearContent();
            executor.outputToTerminal(code);
        } else {
            executor.outputToTerminal(code);
        }
    });
    shell.stderr.on("data", code => {
        executor.outputError(`${chalk.bold.red(code)}`);
    });
    // return new Promise(resolve => {
    shell.on("close", code => {
        // fs.unlinkSync(tempFile);
        executor.outputFinished(`${chalk.bold.green("Finished", code)}`);
    });
    // process.on("exit", () => {
    //     console.log("EXITED");
    //     fs.unlinkSync(tempFile);
    // });

    // //catches ctrl+c event
    // process.on("SIGINT", () => {
    //     console.log("SOGGG");
    //     fs.unlinkSync(tempFile);
    // });
    //
    // // catches "kill pid" (for example: nodemon restart)
    // process.on("SIGUSR1", () => {
    //     console.log("SIG1");
    //     fs.unlinkSync(tempFile);
    // });
    // process.on("SIGUSR2", () => {
    //     console.log("SIG2");
    //     fs.unlinkSync(tempFile);
    // });

    //catches uncaught exceptions
    process.on("uncaughtException", e => {
        console.log("UINMCAHT", e);
        // fs.unlinkSync(tempFile);
    });
};

module.exports = taskExecutor;

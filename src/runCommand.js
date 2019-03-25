//var colors = require('colors');
// colors.enabled = true;
const chalk = require("chalk");
const tryPath = process.cwd();

const execCommand = cmdChoice => {
    const { spawn } = require("child_process");
    let pars = cmdChoice.split(" ");
    return spawn(pars[0], pars.slice(1, pars.length), {
        stdio: "pipe",
        cwd: tryPath,
        env: { ...process.env, ...{ FORCE_COLOR: true } }
    });
    // shell.stdout.on("data", code => {
    //     // console.log(`${chalk.bold.yellow("TIME:", code)}`);
    //     code = code + "";
    //     console.log(code);
    //     // code.split("\n").forEach(line => {
    //     //     console.log(line);
    //     // });
    //     // let rs = await getStream.buffer(code);
    //     // console.log(rs);
    //     // getStream(code)
    //     //     .then(res => {
    //     //         console.log(res);
    //     //     })
    //     //     .catch(e => console.log("ERROR", e));
    // });
    // return new Promise(resolve => {
    //     shell.on("close", code => {
    //         console.log(`${chalk.bold.green("Finished")}`);
    //         resolve();
    //     });
    // });
};
///DEVELOPMENT/freedcamp-script-runner/test
module.exports = execCommand;

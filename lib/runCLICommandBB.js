const getStream = require("get-stream");
const chalk = require("chalk");
// const notifier = require("node-notifier");
const tryPath = process.cwd();
const moment = require("moment");
const prettyMs = require("pretty-ms");

// custom simple logger
// use it like console
const execa = require("execa");
const exec = async command => {
    let startTime = Date.now();
    let output;
    let input = false;
    // try {
    // console.log("Starting to run: ");
    console.log(`${chalk.green.bold("Running: ")}: ${chalk.underline(command)}`);
    output = execa.shell(command, {
        cwd: tryPath,
        stdio: input ? "inherit" : "pipe",
        env: {
            ...process.env,
            FORCE_COLOR: true
        }
    }); //.stdout; //.pipe(process.stdout);
    if (!input) {
        output.stdout.on("data", code => {
            code = code + "";
            console.log(
                `${chalk.bgHex("#181c24").hex("#8c91a7")(
                    command + " " + moment().format("HH:MM:SS") + ":"
                )} ${code}`.trim()
            );
        });
        // output.stderr.on("data", code => {
        //     code = code + "";
        //     console.log(
        //         `${chalk.bgHex("#181c24").hex("#a72e32")(
        //             command + " " + moment().format("HH:MM:SS") + "ERR :"
        //         )} ${code}`.trim()
        //     );
        // });
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
    //
    //     // getStream(output).then(() => {
    //     // notifier.notify({
    //     // 	title: "Something went wrong when trying to run " + command,
    //     // 	message: "OOOPS"
    //     // });
    //     // process.exit();
    //     // });
    //     // console.log(output);
    // } catch (error) {
    //     // console.log(`${chalk.red.bold(error)}`);
    //     //
    // }
    // output.pipe(process.stdout);
    // return output;
};

module.exports = async ({ script }) => {
    return await exec(script.src + process.argv.slice(2));
};
//const getStream = require("get-stream");
//
// // const notifier = require("node-notifier");
// const util = require('util');
//
// // async function main() {
// //
// // }
//
// // custom simple logger
// // use it like console
// const execa = require("execa");
// // const exec = async command => {
// // 	let output;
// //
// // 	try {
// // 		output = execa.shell(command, { env: { FORCE_COLOR: true } }).stdout;
// //
// // 		getStream(output).then(() => {
// // 			// notifier.notify({
// // 			// 	title: "Something went wrong when trying to run " + command,
// // 			// 	message: "OOOPS"
// // 			// });
// // 			process.exit();
// // 		});
// // 		// console.log(output);
// // 	} catch (error) {
// // 		// console.log(`${chalk.red.bold(error)}`);
// // 		//
// // 	}
// // 	output.pipe(process.stdout);
// // 	return output;
// // };
//
// module.exports = async ({ script }) => {
// 	const exec = util.promisify(require('child_process').exec);
//
// 	// return console.log("ASIDJASODOISADIOJSAD");
// 	// const spawn = require("child_process").spawn;
//
// 	const { stdout, stderr } = await exec(script.src+ process.argv.slice(2));
//
// 	if (stderr) {
// 		console.error(`error: ${stderr}`);
// 	}
// 	console.log(`Number of files ${stdout}`);
// 	// return await spawn(script.src+ process.argv.slice(2), { stdio: "inherit", env: process.env });
// };

const getStream = require("get-stream");
const chalk = require("chalk");
// const notifier = require("node-notifier");

// custom simple logger
// use it like console
const execa = require("execa");
const exec = async command => {
	let output;

	try {
		// console.log("Starting to run: ");
		console.log(`${chalk.green.bold("Running: ")}: ${chalk.underline(command)}`);
		output = execa.shell(command, { env: { FORCE_COLOR: true } }).stdout; //.pipe(process.stdout);

		// getStream(output).then(() => {
		// notifier.notify({
		// 	title: "Something went wrong when trying to run " + command,
		// 	message: "OOOPS"
		// });
		// process.exit();
		// });
		// console.log(output);
	} catch (error) {
		// console.log(`${chalk.red.bold(error)}`);
		//
	}
	output.pipe(process.stdout);
	return output;
};

module.exports = async ({ script }) => {
	return await exec(script.src + process.argv.slice(2));
};
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
const execa = require("execa");
const exec = async command => {
	let output;

	try {
		output = execa.shell(command, { env: { FORCE_COLOR: true } }).stdout;

		getStream(output).then(() => {
			// notifier.notify({
			// 	title: "Something went wrong when trying to run " + command,
			// 	message: "OOOPS"
			// });
			process.exit();
		});
		// console.log(output);
	} catch (error) {
		// console.log(`${chalk.red.bold(error)}`);
		//
	}
	output.pipe(process.stdout);
	return output;
};
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

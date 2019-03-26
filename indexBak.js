#!/usr/bin/env node

const fcr = require("./lib/index.js");
const chalk = require("chalk");
const getStream = require('get-stream');
const execa = require("execa");
let hasBeenCleared = false;
const exec = async command => {
	const output = await execa
		.shell(command, { env: { FORCE_COLOR: true },cleanup:true }).stdout;

	output.pipe(process.stdout);
	output.pipe(process.stderr);
	// getStream(output).then(value => {
	// 	console.log('child output:', value);
	// });

	// output.
	return output;
};
const argv = require("yargs")
	.usage("Usage: $0 <command> [options]")
	.scriptName("yarn fsr")
	.example(
		`${chalk.rgb(39, 173, 96)("$0")}`,
		`${chalk.rgb(159, 161, 181)("will open a task selection selector")}`
	)
	.command("start", "Start the scripts!", yargs => {}, async function() {
		let ff = await fcr(hasBeenCleared);
		if (!hasBeenCleared) {
			hasBeenCleared = true;
		}
		ff.runList();
	})
	.example(
		`${chalk.rgb(39, 173, 96)("$0 start")}`,
		`${chalk.rgb(159, 161, 181)("will open a task selection selector")}`
	)
	.command("run", "Run a specific task", () => {}, async function(argv) {
		let task = argv._[1];
		let ff = await fcr(hasBeenCleared);
		if (!hasBeenCleared) {
			hasBeenCleared = true;
		}
		await ff.runFile(task);
	})
	.example(
		`${chalk.rgb(39, 173, 96)("$0 run start:web")}`,
		`${chalk.rgb(159, 161, 181)("will run task 'start:web'")}`
	)
	.command("run-s", "Series as a sequence", () => {}, async function(argv) {
		let tasks = argv._.slice();
		tasks.shift();
		let taskString = tasks
			.map(e => "yarn fsr run " + e + "; ")
			.join("")
			.slice(0, -2);
		console.log("About to run task string ", taskString);
		await exec(taskString);
	})
	.example(
		`${chalk.rgb(39, 173, 96)("$0 run-s start:web start:desktop")}`,
		`${chalk.rgb(159, 161, 181)("will run task 'start:web' and afterwards 'start:desktop'")}`
	)
	.command("run-p", "Run tasks in parallel", () => {}, async function(argv) {
		let tasks = argv._.slice();
		tasks.shift();
		// let ff = await fcr(hasBeenCleared);
		// await ff.runTasks(tasks, false);
		tasks.map(async e => await exec("yarn fsr run " + e));
	})
	.example(
		`${chalk.rgb(39, 173, 96)("$0 run-p start:web start:desktop")}`,
		`${chalk.rgb(159, 161, 181)(
			"will run task 'start:web' and at the same time 'start:desktop'"
		)}`
	).argv;
if (argv._.length === 0) {
	fcr().then(ff => ff.runList());
}

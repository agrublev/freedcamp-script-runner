#!/usr/bin/env node
const cli = require("cac")();
// const chalk = require("chalk");
const literally = require("./index.js");
// // const literally = require('..')
//
// // console.log(toc.insert('./FcScripts.md'))
// async function run() {
// 	const runner = await literally({
// 		version: false,
// 		v: false,
// 		help: false,
// 		h: false,
// 		quiet: false,
// 		path: "FcScripts.md",
// 		p: "FcScripts.md",
// 		"--": []
// 	});
// 	runner.runList([]);
// }
//
cli.command("*", "Run a task in current working directory", (input, flags) => {
	const taskName = input[0];
	if (!taskName) {
		return cli.showHelp();
	}
	// const runner = await literally(flags)
	return run.runFile(taskName);
});

cli.command("help", "Display task description", (input, flags) => {
	// const runner = await literally(flags)
	return run.getHelp(input);
});

cli.command("run", "Choose which task to run from a list", (input, flags) => {
	console.log("ASD");
	// const runner = await literally(flags)
	return run.runList(input);
});

cli.command("list", "Display task list", (input, flags) => {
	// const runner = await literally(flags)
	return run.getList();
});

cli.on("error", err => {
	if (err.name === "MaidError") {
		require("../lib/logger").error(chalk.red(err.message));
		process.exitCode = 1;
	} else {
		console.error(err.stack);
	}
});

cli.option("quiet", {
	desc: "Be less verbose, output error logs only",
	type: "boolean",
	default: false
});

cli.option("path", {
	desc: "Path to markdown file",
	type: "string",
	default: "FcScripts.md",
	alias: "p"
});

cli.option("section", {
	desc: "Which `h2` section to look under",
	type: "string",
	alias: "s"
});

cli.parse();

// console.log(toc.insert('./FcScripts.md'))
const run = async () => {
	const runner = await literally({
		version: false,
		v: false,
		help: false,
		h: false,
		quiet: false,
		path: "FcScripts.md",
		p: "FcScripts.md",
		"--": []
	});
	runner.runList([]);
};

run();

// const test = require("..");
const test = require("./index.js");

// console.log(toc.insert('./FcScripts.md'))
async function run() {
	const runner = await test({
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
}

run();

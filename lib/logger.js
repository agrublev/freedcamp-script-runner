const log = require("fancy-log");
const getColonTimeFromDate = () => new Date().toTimeString().slice(0, 8);
const chalk = require("chalk");

class Logger {
	constructor() {
		this.opts = {};
	}

	setOptions({ quiet }) {
		if (quiet !== undefined) {
			this.opts.quiet = typeof quiet === "boolean" ? quiet : false;
		}
	}

	log(...args) {
		if (this.opts.quiet) return;

		log(...args);
	}
	l(msg = "", additional = "") {
		console.log(
			`${chalk.rgb(58, 65, 255).bold("_".repeat(msg.length + additional.length + 12))}`
		);
		console.log(
			`${chalk.gray(getColonTimeFromDate())}${chalk.magenta.bold(":")} ${chalk.magenta.bold(
				msg || "--"
			)} ${additional ? chalk.cyan.underline.bold(additional) : ""}`
		);
	}
	error(...args) {
		log.error(...args);
	}
	clear() {
		process.stdout.write("\x1B[2J\x1B[0f");
	}
}

module.exports = new Logger();

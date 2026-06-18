import { timestamp } from "./helpers.js";
import chalk from "chalk";

const fsrLog = {
    log: (...args) => {
        console.log(`${chalk.gray(timestamp())} ${chalk.gray.bold("[LOG]")}`, ...args);
    },
    info: (...args) => {
        console.info(`${chalk.gray(timestamp())} ${chalk.blue.bold("i [INFO]")}`, ...args);
    },
    warn: (...args) => {
        console.warn(`${chalk.gray(timestamp())} ${chalk.yellow.bold("⚠ [WARN]")}`, ...args);
    },
    error: (...args) => {
        console.error(`${chalk.gray(timestamp())} ${chalk.red.bold("× [ERROR]")}`, ...args);
    }
};

export default fsrLog;

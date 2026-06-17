import { timestamp } from "./helpers.js";
import chalk from "chalk";

// Wrap the native console methods so every fsr log line is prefixed with a live
// timestamp and a level tag. The originals are captured once and reused so each
// method writes to its correct stream (stdout for log/info, stderr for warn/error).
const logLog = console.log;
const infoLog = console.info;
const warnLog = console.warn;
const errorLog = console.error;

console.log = function (...args) {
    logLog(`${chalk.gray(timestamp())} ${chalk.gray.bold("[LOG]")}`, ...args);
};

console.info = function (...args) {
    infoLog(`${chalk.gray(timestamp())} ${chalk.blue.bold("i [INFO]")}`, ...args);
};

console.warn = function (...args) {
    warnLog(`${chalk.gray(timestamp())} ${chalk.yellow.bold("⚠ [WARN]")}`, ...args);
};

console.error = function (...args) {
    errorLog(`${chalk.gray(timestamp())} ${chalk.red.bold("× [ERROR]")}`, ...args);
};

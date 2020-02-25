import { timestamp } from "./helpers";
import chalk from "chalk";

const d = timestamp();

const colors = {
    Reset: "\x1b[0m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m"
};

const infoLog = console.info;
const logLog = console.log;
const warnLog = console.warn;
const errorLog = console.error;

console.log = function(args) {
    const copyArgs = Array.prototype.slice.call(arguments);
    copyArgs.unshift(`${chalk.gray(d)} ${chalk.gray.bold("[LOG]")}️`);
    infoLog.apply(null, copyArgs);
};
console.info = function(args) {
    const copyArgs = Array.prototype.slice.call(arguments);
    copyArgs.unshift(`${chalk.gray(d)} ${chalk.blue.bold("i [INFO]")}️`);
    infoLog.apply(null, copyArgs);
};

console.warn = function(args) {
    const copyArgs = Array.prototype.slice.call(arguments);
    copyArgs.unshift(`${chalk.gray(d)} ${chalk.yellow.bold("⚠ [WARN]")}️`);
    warnLog.apply(null, copyArgs);
};

console.error = function(args) {
    const copyArgs = Array.prototype.slice.call(arguments);
    copyArgs.unshift(`${chalk.gray(d)} ${chalk.red.bold("× [ERROR]")}️`);
    warnLog.apply(null, copyArgs);
};

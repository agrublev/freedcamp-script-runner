const getStream = require("get-stream");
const chalk = require("chalk");
const path = require("path");
// const notifier = require("node-notifier");
const tryPath = process.cwd();
const moment = require("moment");
const prettyMs = require("pretty-ms");
const spawn = require("cross-spawn");

module.exports = async ({ script, task, type = script.type }) => {
    return new Promise((resolve, reject) => {
        const cmd = spawn(type, [...script.rest], {
            stdio: "inherit",
            env: Object.assign({}, process.env, {
                FORCE_COLOR: true,
                PATH: `${path.resolve("node_modules/.bin")}:${process.env.PATH}`
            })
        });

        cmd.on("close", code => {
            if (code === 0) {
                resolve();
            } else {
                reject("ERROR --");
            }
        });
    });
};

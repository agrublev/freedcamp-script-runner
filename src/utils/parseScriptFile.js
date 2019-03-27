const fs = require("fs");
const JoyCon = require("joycon");
const path = require("path");
const chalk = require("chalk");
const md2json = require("./parseMarkdown.js");

const joyRead = new JoyCon({
    // Stop reading at parent dir
    // i.e. Only read file from process.cwd()
    stopDir: path.dirname(process.cwd())
});
const parseScriptFile = async () => {
    const { path: filepath, data } = joyRead.loadSync([".fscripts.md"]);
    if (!filepath) {
        console.warn(`${chalk.bold.red("You're missing the .fscripts.md file!")}`);
        return null;
    } else {
        console.warn(`${chalk.bold.green("Located .fscripts.md file!")}`);
        let newContent = data.replace(/(<!-- toc -->(\s|\S)*?<!-- tocstop -->)/g, "").trim();

        return md2json.parse(newContent);
    }
};

module.exports = parseScriptFile;

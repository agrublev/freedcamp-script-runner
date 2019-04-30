"use strict";
const fs = require("fs");
const JoyCon = require("joycon");
const path = require("path");
const chalk = require("chalk");

const joyRead = new JoyCon({
    // Stop reading at parent dir
    // i.e. Only read file from process.cwd()
    stopDir: path.dirname(process.cwd())
});
const marked = require("marked");

let parse = function(mdContent) {
    let js = marked.lexer(mdContent);

    js = js.filter(e => e.type !== "space");

    let categories = [];
    let tempItem = {};
    js.forEach((item, indx) => {
        if (!tempItem.title && item.depth === 1) {
            tempItem.title = item.text;
            let nxt = js[indx + 1];
            tempItem.description = nxt && nxt.type === "paragraph" ? nxt.text : "";
            tempItem.subitems = [];
        } else if (tempItem.title && item.depth === 1) {
            categories.push(tempItem);
            tempItem = {};
            tempItem.title = item.text;
            let nxt = js[indx + 1];
            tempItem.description = nxt && nxt.type === "paragraph" ? nxt.text : "";
            tempItem.subitems = [];
        } else {
            tempItem.subitems.push(item);
        }
    });
    categories.push(tempItem);
    tempItem = {};
    let currTask = false;
    let allTasks = {};
    categories.forEach(cat => {
        cat.tasks = {};
        cat.subitems.forEach(item => {
            if (!tempItem.title && item.depth === 2) {
                currTask = item.text;
                cat.tasks[currTask] = {};
            } else if (tempItem.title && item.depth === 2) {
                currTask = item.text;
                cat.tasks[currTask] = {};
                allTasks[currTask] = {};
            } else {
                if (item.type === "paragraph" && cat.tasks[currTask] !== undefined) {
                    cat.tasks[currTask]["description"] = item.text;
                }
                if (item.type === "code") {
                    cat.tasks[currTask]["code"] = { type: item.lang, code: item.text };
                    allTasks[currTask] = { script: item.text, type: item.lang };
                }
            }
        });
        delete cat.subitems;
    });
    return { categories, allTasks };
};
const parseScriptFile = async () => {
    const { path: filepath, data } = joyRead.loadSync(["FcScripts.md"]);
    if (!filepath) {
        console.warn(`${chalk.bold.red("You're missing the FcScripts.md file!")}`);
        return null;
    } else {
        console.warn(`${chalk.bold.green("Located FcScripts.md file!")}`);
        let newContent = data.replace(/(<!-- toc -->(\s|\S)*?<!-- tocstop -->)/g, "").trim();

        return parse(newContent);
    }
};

module.exports = parseScriptFile;

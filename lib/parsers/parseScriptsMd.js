"use strict";
const JoyCon = require("joycon");
const path = require("path");
const chalk = require("chalk");

const joyRead = new JoyCon({
    // Stop reading at parent dir
    // i.e. Only read file from process.cwd()
    stopDir: path.dirname(process.cwd())
});
const flattenObject = (obj, prefix = "") =>
    Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + "." : "";
        if (typeof obj[k] === "object") Object.assign(acc, flattenObject(obj[k], pre + k));
        else acc[pre + k] = obj[k];
        return acc;
    }, {});

const marked = require("marked");

let parse = function(mdContent) {
    let js = marked.lexer(mdContent);
    js = js.filter(e => e.type !== "space");

    // let firstHeading = js.findIndex(e => e.type === "heading" && e.depth === 1); //?
    let listMe = js.slice();
    let tempItem = {};
    let currentCategory = "";
    let currentTask = "";
    let taskOrder = 0;
    listMe.forEach((item, indx) => {
        if (item.type === "heading" && item.depth === 1) {
            taskOrder = 0;
            currentCategory = item.text;
            tempItem[currentCategory] = { name: item.text, tasks: {}, description: "" };
            let descriptor = js[indx + 1];
            if (descriptor.type === "paragraph") {
                tempItem[currentCategory].description = descriptor.text;
            }
        } else if (item.type === "heading" && item.depth === 2) {
            currentTask = item.text;
            tempItem[currentCategory].tasks[currentTask] = {
                script: "",
                name: currentTask,
                description: "",
                order: taskOrder
            };
            taskOrder++;
            let descriptor = js[indx + 1];
            let code = js[indx + 2];
            if (descriptor.type === "paragraph" && code.type === "code") {
                tempItem[currentCategory].tasks[currentTask].description = descriptor.text;
                tempItem[currentCategory].tasks[currentTask].script = code.text;
            } else if (descriptor.type === "code") {
                tempItem[currentCategory].tasks[currentTask].script = descriptor.text;
            }
        }
    });
    let allTasks = [];
    let categories = Object.keys(tempItem).map(catName => {
        let ts = tempItem[catName].tasks;
        let tasksArr = Object.keys(ts).map(tn => ts[tn]);
        allTasks = [...allTasks, ...tasksArr];
        return { name: catName, ...tempItem[catName] };
    });
    return { categories, allTasks };
};
const parseScriptFile = async () => {
    const { path: filepath, data } = joyRead.loadSync(["fscripts.md"]);
    if (!filepath) {
        //         console.warn(
        //             `${chalk.bold.red("You're missing the fscripts.md file!")}
        // ${chalk.green("Please run 'fsr generate' to get started!")}`
        //         );
        //
        //         process.exit(0);
        //         return null;
        return false;
    } else {
        // console.warn(`${chalk.bold.green("Located fscripts.md file!")}`);
        let newContent = data.split("<!-- end toc -->");
        newContent = newContent[newContent.length === 2 ? 1 : 0];
        return parse(newContent);
    }
};

module.exports = parseScriptFile;

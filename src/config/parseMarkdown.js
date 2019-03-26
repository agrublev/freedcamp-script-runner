"use strict";

let marked = require("marked");

let parse = function(mdContent) {
    let js = marked.lexer(mdContent);

    js = js.filter(e => e.type !== "space");

    let categories = [];
    let tempItem = {};
    js.forEach(item => {
        if (!tempItem.title && item.depth === 1) {
            tempItem.title = item.text;
            tempItem.subitems = [];
        } else if (tempItem.title && item.depth === 1) {
            categories.push(tempItem);
            tempItem = {};
            tempItem.title = item.text;
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
exports.parse = parse;

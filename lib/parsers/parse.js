import { marked } from "marked";

/**
 * Parse fscripts.md content into a `{ categories, allTasks }` structure.
 *
 * Layout: `#` headings are groups, `##` headings are tasks. The paragraph and
 * the first code block following a task heading become its description and
 * script (a code block directly under the heading is treated as the script).
 *
 * @param {string} mdContent - Raw markdown (with any TOC already stripped).
 * @returns {{ categories: Array, allTasks: Array }}
 */
const parse = (mdContent) => {
    const tokens = marked.lexer(mdContent).filter((e) => e.type !== "space");

    const tempItem = {};
    let currentCategory = "";
    let taskOrder = 0;

    const ensureCategory = (name) => {
        if (!tempItem[name]) {
            tempItem[name] = { name, tasks: {}, description: "" };
        }
        return tempItem[name];
    };

    tokens.forEach((item, indx) => {
        if (item.type === "heading" && item.depth === 1) {
            taskOrder = 0;
            currentCategory = item.text;
            const category = ensureCategory(currentCategory);
            const descriptor = tokens[indx + 1];
            if (descriptor && descriptor.type === "paragraph") {
                category.description = descriptor.text;
            }
        } else if (item.type === "heading" && item.depth === 2) {
            const category = ensureCategory(currentCategory);
            const currentTask = item.text;
            category.tasks[currentTask] = {
                script: "",
                name: currentTask,
                description: "",
                order: taskOrder
            };
            taskOrder++;

            const descriptor = tokens[indx + 1];
            const code = tokens[indx + 2];
            if (descriptor && descriptor.type === "paragraph" && code && code.type === "code") {
                category.tasks[currentTask].description = descriptor.text;
                category.tasks[currentTask].lang = code.lang;
                category.tasks[currentTask].script = code.text;
            } else if (descriptor && descriptor.type === "code") {
                category.tasks[currentTask].lang = descriptor.lang;
                category.tasks[currentTask].script = descriptor.text;
            }
        }
    });

    let allTasks = [];
    const categories = Object.keys(tempItem).map((catName) => {
        const ts = tempItem[catName].tasks;
        const tasksArr = Object.keys(ts).map((tn) => ts[tn]);
        allTasks = [...allTasks, ...tasksArr];
        return { name: catName, ...tempItem[catName] };
    });

    return { categories, allTasks };
};

export default parse;

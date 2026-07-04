import { marked } from "marked";

/**
 * Regex that matches an environment profile section header of the form `[env:name]`.
 * The captured group (index 1) is the profile name.
 *
 * @example
 * "## [env:production]" → after extracting item.text → "[env:production]" → match[1] === "production"
 */
const ENV_SECTION_RE = /^\[env:([^\]]+)\]$/;

/**
 * Parse fscripts.md content into a `{ categories, allTasks }` structure.
 *
 * Layout: `#` headings are groups, `##` headings are tasks. The paragraph and
 * the first code block following a task heading become its description and
 * script (a code block directly under the heading is treated as the script).
 *
 * Environment profiles: a `##` heading whose text matches `[env:name]` (e.g.
 * `## [env:production]`) is treated as a profile boundary, not a runnable task.
 * Every task defined after such a boundary (until the next `#` group heading or
 * another `## [env:…]` boundary) receives `env: "name"` on its task object.
 * Tasks defined before any profile boundary receive `env: null`.
 *
 * Multiple tasks with the same name but different envs in the same category are
 * fully supported: `allTasks` contains every version (useful for env filtering),
 * while `category.tasks` uses name as a key so the last definition wins for
 * the interactive picker when no `--env` filter is applied.
 *
 * Each task carries a non-enumerable `_category` string so that `filterByEnv`
 * can reconstruct category structures without relying on the potentially-
 * overwritten `category.tasks` object.
 *
 * @param {string} mdContent - Raw markdown (with any TOC already stripped).
 * @returns {{ categories: Array, allTasks: Array }}
 */
const parse = (mdContent) => {
    const tokens = marked.lexer(mdContent).filter((e) => e.type !== "space");

    const tempItem = {};
    /**
     * Separate accumulator for allTasks.  We push every task here as it is
     * created, so same-name tasks from different env sections are preserved
     * even though `category.tasks[name]` may later be overwritten.
     */
    const allTasksList = [];
    let currentCategory = "";
    let taskOrder = 0;
    /** @type {string|null} Active environment profile name; null means "no profile". */
    let currentEnv = null;

    const ensureCategory = (name) => {
        if (!tempItem[name]) {
            tempItem[name] = { name, tasks: {}, description: "" };
        }
        return tempItem[name];
    };

    tokens.forEach((item, indx) => {
        if (item.type === "heading" && item.depth === 1) {
            taskOrder = 0;
            currentEnv = null; // env sections are scoped to their category
            currentCategory = item.text;
            const category = ensureCategory(currentCategory);
            const descriptor = tokens[indx + 1];
            if (descriptor && descriptor.type === "paragraph") {
                category.description = descriptor.text;
            }
        } else if (item.type === "heading" && item.depth === 2) {
            const envMatch = item.text.match(ENV_SECTION_RE);
            if (envMatch) {
                // This is a profile boundary marker, not a runnable task.
                currentEnv = envMatch[1];
                return; // skip task creation
            }

            const category = ensureCategory(currentCategory);
            const currentTask = item.text;
            const taskObj = {
                script: "",
                name: currentTask,
                description: "",
                order: taskOrder,
                env: currentEnv,
                _category: currentCategory
            };
            taskOrder++;

            const descriptor = tokens[indx + 1];
            const code = tokens[indx + 2];
            if (descriptor && descriptor.type === "paragraph" && code && code.type === "code") {
                taskObj.description = descriptor.text;
                taskObj.lang = code.lang;
                taskObj.script = code.text;
            } else if (descriptor && descriptor.type === "code") {
                taskObj.lang = descriptor.lang;
                taskObj.script = descriptor.text;
            }

            // Preserve all versions in allTasksList (no overwrite).
            allTasksList.push(taskObj);
            // The tasks object uses name as key — last definition wins
            // when the same name appears under multiple env sections.
            category.tasks[currentTask] = taskObj;
        }
    });

    const categories = Object.keys(tempItem).map((catName) => ({
        name: catName,
        ...tempItem[catName]
    }));

    return { categories, allTasks: allTasksList };
};

export default parse;

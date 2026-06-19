import path from "path";
import fs from "fs";
import parse from "./parse.js";

/**
 * Filter a parsed scripts result to only the tasks that belong to the given
 * environment profile. Categories with no remaining tasks are dropped.
 *
 * @param {{ categories: Array, allTasks: Array }} parsed
 * @param {string} env - The environment profile name to keep.
 * @returns {{ categories: Array, allTasks: Array }}
 */
const filterByEnv = (parsed, env) => {
    const allTasks = parsed.allTasks.filter((t) => t.env === env);

    // Reconstruct category.tasks from allTasks rather than from cat.tasks.
    // cat.tasks uses name-as-key with last-write-wins semantics, so when the
    // same task name appears under multiple env sections (e.g. deploy:api
    // under both [env:staging] and [env:production]), the staging version is
    // overwritten by the production version. allTasks preserves every version,
    // so we build the filtered tasks map from there instead, using the
    // _category property that the parser attaches to every task object.
    const tasksByCategory = {};
    for (const task of allTasks) {
        const catName = task._category;
        if (catName != null) {
            if (!tasksByCategory[catName]) {
                tasksByCategory[catName] = {};
            }
            tasksByCategory[catName][task.name] = task;
        }
    }

    const categories = parsed.categories
        .map((cat) => {
            // Prefer the allTasks-derived map when available (correctly handles
            // same-name tasks under different env sections). Fall back to
            // filtering cat.tasks for callers whose task objects lack _category
            // (e.g. hand-crafted test fixtures).
            if (tasksByCategory[cat.name] != null) {
                return { ...cat, tasks: tasksByCategory[cat.name] };
            }
            const tasks = Object.fromEntries(
                Object.entries(cat.tasks).filter(([, t]) => t.env === env)
            );
            return { ...cat, tasks };
        })
        .filter((cat) => Object.keys(cat.tasks).length > 0);

    return { categories, allTasks };
};

/**
 * Read and parse fscripts.md from the current working directory.
 *
 * @param {Object} [options]
 * @param {string} [options.env]  When set, only tasks belonging to the named
 *   environment profile are returned. Tasks with no profile tag are excluded.
 * @returns {Promise<{categories: Array, allTasks: Array}|false>} Parsed scripts,
 *   or `false` when fscripts.md does not exist.
 */
const parseScriptFile = async (options = {}) => {
    const fscriptsPath = path.resolve(process.cwd(), "fscripts.md");
    if (!fs.existsSync(fscriptsPath)) {
        return false;
    }

    const data = fs.readFileSync(fscriptsPath, "utf-8");
    if (data === "") {
        return { categories: [], allTasks: [] };
    }

    const sections = data.split("<!-- end toc -->");
    const content = sections[sections.length === 2 ? 1 : 0];
    const parsed = parse(content);

    if (options.env) {
        return filterByEnv(parsed, options.env);
    }

    return parsed;
};

export { filterByEnv };
export default parseScriptFile;

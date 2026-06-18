import path from "path";
import fs from "fs";
import parse from "./parse.js";

/**
 * Read and parse fscripts.md from the current working directory.
 *
 * @param {Object} [options]
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
    return parse(content);
};

export default parseScriptFile;

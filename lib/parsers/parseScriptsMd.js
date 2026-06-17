import path from "path";
import fs from "fs";
import parse from "./parse.js";

/**
 * Read and parse fscripts.md from the current working directory.
 *
 * Caching is enabled by default (delegates to parseScriptsMd.cached.js). Pass
 * `{ useCache: false }` to read and parse the file directly with no caching.
 *
 * @param {Object} [options]
 * @param {boolean} [options.useCache=true] - Whether to use the cache layer.
 * @returns {Promise<{categories: Array, allTasks: Array}|false>} Parsed scripts,
 *   or `false` when fscripts.md does not exist.
 */
const parseScriptFile = async (options = {}) => {
    const useCache = options.useCache !== false;

    if (useCache) {
        try {
            const { default: cachedParse } = await import("./parseScriptsMd.cached.js");
            return cachedParse(options);
        } catch (error) {
            // Fall back to direct parsing if the cache module fails to load.
            console.warn("Cache module not available, using direct parsing");
        }
    }

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

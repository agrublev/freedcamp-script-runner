/**
 * Cached version of parseScriptsMd
 * Adds smart caching with TTL and file watching
 */

import path from "path";
import fs from "fs";
import { getCache } from "../cache/index.js";
import FileWatcher from "../cache/file-watcher.js";
import { marked } from "marked";

// Initialize cache and file watcher
let cache = null;
let fileWatcher = null;

/**
 * Get or create cache instance
 */
function getOrCreateCache() {
    if (!cache) {
        cache = getCache({
            defaultTTL: 300000, // 5 minutes
            maxSize: 100,
            enableStats: true
        });
    }
    return cache;
}

/**
 * Get or create file watcher
 */
function getOrCreateWatcher() {
    if (!fileWatcher) {
        const cacheInstance = getOrCreateCache();
        fileWatcher = new FileWatcher(cacheInstance, {
            debounceMs: 100
        });
    }
    return fileWatcher;
}

/**
 * Parse markdown content to script structure
 * (Same logic as original parseScriptFile)
 */
const parse = function(mdContent) {
    let js = marked.lexer(mdContent);
    js = js.filter(e => e.type !== "space");

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
            if (descriptor && descriptor.type === "paragraph") {
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
            if (descriptor && descriptor.type === "paragraph" && code && code.type === "code") {
                tempItem[currentCategory].tasks[currentTask].description = descriptor.text;
                tempItem[currentCategory].tasks[currentTask].lang = code.lang;
                tempItem[currentCategory].tasks[currentTask].script = code.text;
            } else if (descriptor && descriptor.type === "code") {
                tempItem[currentCategory].tasks[currentTask].lang = descriptor.lang;
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

/**
 * Parse script file with caching
 * @param {Object} options - Options
 * @param {boolean} [options.useCache=true] - Whether to use cache
 * @param {boolean} [options.watchFile=true] - Whether to watch file for changes
 * @returns {Promise<Object|boolean>} Parsed scripts or false
 */
const parseScriptFile = async (options = {}) => {
    const useCache = options.useCache !== false;
    const watchFile = options.watchFile !== false;

    const fscriptsPath = path.resolve(process.cwd(), "fscripts.md");

    // Check if file exists
    if (!fs.existsSync(fscriptsPath)) {
        return false;
    }

    // Try cache first
    if (useCache) {
        const cacheInstance = getOrCreateCache();
        const cacheKey = cacheInstance.generateFileKey(fscriptsPath);
        const cached = cacheInstance.get(cacheKey);

        if (cached) {
            // Cache hit - return cached data
            return cached;
        }

        // Cache miss - parse file
        const data = fs.readFileSync(fscriptsPath, "utf-8");
        if (data === null || data === undefined) {
            return false;
        }

        // Handle empty file - return empty structure
        if (data === "") {
            const emptyResult = { categories: [], allTasks: [] };
            cacheInstance.set(cacheKey, emptyResult, { filePath: fscriptsPath });
            return emptyResult;
        }

        let newContent = data.split("<!-- end toc -->");
        newContent = newContent[newContent.length === 2 ? 1 : 0];
        const parsed = parse(newContent);

        // Store in cache
        cacheInstance.set(cacheKey, parsed, { filePath: fscriptsPath });

        // Watch file for changes if enabled
        if (watchFile) {
            const watcher = getOrCreateWatcher();
            if (!watcher.isWatching(fscriptsPath)) {
                watcher.watch(fscriptsPath);
            }
        }

        return parsed;
    } else {
        // No cache - parse directly
        const data = fs.readFileSync(fscriptsPath, "utf-8");
        if (data === null || data === undefined) {
            return false;
        }

        // Handle empty file - return empty structure
        if (data === "") {
            return { categories: [], allTasks: [] };
        }

        let newContent = data.split("<!-- end toc -->");
        newContent = newContent[newContent.length === 2 ? 1 : 0];
        return parse(newContent);
    }
};

/**
 * Clear cache manually
 */
export function clearCache() {
    if (cache) {
        cache.clear();
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    if (cache) {
        return cache.getStats();
    }
    return null;
}

/**
 * Destroy cache and watcher (cleanup)
 */
export function destroyCache() {
    if (fileWatcher) {
        fileWatcher.destroy();
        fileWatcher = null;
    }
    if (cache) {
        cache.destroy();
        cache = null;
    }
}

export default parseScriptFile;

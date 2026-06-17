/**
 * Cached version of parseScriptsMd
 * Adds smart caching with TTL and file watching
 */

import path from "path";
import fs from "fs";
import { getCache } from "../cache/index.js";
import FileWatcher from "../cache/file-watcher.js";
import parse from "./parse.js";

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

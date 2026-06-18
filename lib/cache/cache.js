import fs from "fs-extra";
import path from "path";
import os from "os";

const CACHE_FILENAME = "cache.json";

function getCacheDir() {
    return path.join(os.homedir(), ".fsr");
}

function getCacheFilePath() {
    return path.join(getCacheDir(), CACHE_FILENAME);
}

function getOrdinal(day) {
    const mod100 = day % 100;
    if (mod100 >= 11 && mod100 <= 13) return "th";
    switch (day % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

function formatTimestamp(date = new Date()) {
    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hour = date.getHours();
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${month} ${day}${getOrdinal(day)} ${year}-${hour}:${minute}${ampm}`;
}

function createDefaultCache(now = new Date()) {
    return {
        updatedAt: formatTimestamp(now),
        entries: {}
    };
}

function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return {
            value: entry,
            updatedAt: null,
            changesLog: []
        };
    }

    return {
        value: Object.prototype.hasOwnProperty.call(entry, "value") ? entry.value : null,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : null,
        changesLog: Array.isArray(entry.changesLog)
            ? entry.changesLog.filter((v) => typeof v === "string")
            : []
    };
}
function isMergeableObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}


function normalizeCache(passedRaw) {
    const fallback = createDefaultCache();
    let raw = passedRaw;
    if (typeof passedRaw === "string") {
        raw = JSON.parse(passedRaw);
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return fallback;
    }

    const entriesRaw =
        raw.entries && typeof raw.entries === "object" && !Array.isArray(raw.entries)
            ? raw.entries
            : {};

    const entries = Object.fromEntries(
        Object.entries(entriesRaw).map(([key, value]) => [key, normalizeEntry(value)])
    );

    return {
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : fallback.updatedAt,
        entries
    };
}

async function ensureCacheFile() {
    const cacheDir = getCacheDir();
    const cacheFile = getCacheFilePath();

    await fs.ensureDir(cacheDir);

    if (!(await fs.pathExists(cacheFile))) {
        await fs.writeJson(cacheFile, createDefaultCache(), { spaces: 2 });
    }

    return cacheFile;
}

async function readCacheData() {
    const cacheFile = await ensureCacheFile();
    const raw = await fs.readFile(cacheFile, "utf-8");
    return normalizeCache(raw);
}

async function writeCacheData(cache) {
    const cacheFile = await ensureCacheFile();
    const normalized = normalizeCache(cache);
    normalized.updatedAt = formatTimestamp();
    await fs.writeJson(cacheFile, normalized, { spaces: 2 });
    return normalized;
}

function assertCacheKey(key) {
    if (typeof key !== "string" || key.trim().length === 0) {
        throw new Error("Cache key must be a non-empty string.");
    }
}

export async function readCache() {
    return readCacheData();
}

export async function readCacheEntry(key) {
    assertCacheKey(key);
    const cache = await readCacheData();
    return cache.entries[key] ?? null;
}

export async function writeCacheEntry(key, value, replaceValue = false) {
    assertCacheKey(key);

    const cache = await readCacheData();
    const timestamp = formatTimestamp();
    const existing = normalizeEntry(cache.entries[key]);

    const nextValue =
        !replaceValue && isMergeableObject(existing.value) && isMergeableObject(value)
            ? { ...existing.value, ...value }
            : value;

    cache.entries[key] = {
        value: nextValue,
        updatedAt: timestamp,
        changesLog: [...existing.changesLog, timestamp]
    };

    const updated = await writeCacheData(cache);
    return updated.entries[key];
}

export async function editCacheEntry(key, nextValueOrUpdater) {
    assertCacheKey(key);

    const cache = await readCacheData();
    const existing = cache.entries[key];

    if (!existing) {
        throw new Error(`Cache entry not found: ${key}`);
    }

    const normalized = normalizeEntry(existing);
    const nextValue =
        typeof nextValueOrUpdater === "function"
            ? await nextValueOrUpdater(normalized.value)
            : nextValueOrUpdater;

    const timestamp = formatTimestamp();
    cache.entries[key] = {
        ...normalized,
        value: nextValue,
        updatedAt: timestamp,
        changesLog: [...normalized.changesLog, timestamp]
    };

    const updated = await writeCacheData(cache);
    return updated.entries[key];
}

export async function deleteCacheEntry(key) {
    assertCacheKey(key);

    const cache = await readCacheData();
    if (!cache.entries[key]) {
        return false;
    }

    delete cache.entries[key];
    await writeCacheData(cache);
    return true;
}

export async function listCacheKeys() {
    const cache = await readCacheData();
    return Object.keys(cache.entries);
}

/**
 * Check cache system
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkCache(options = {}) {
    const result = {
        name: "Cache system",
        passed: false,
        warning: false,
        message: "",
        details: {},
        canFix: true,
        fix: null
    };

    try {
        const cacheDir = getCacheDir();
        const cacheFile = getCacheFilePath();

        if (await fs.pathExists(cacheDir)) {
            try {
                await ensureCacheFile();
                const cache = await readCacheData();
                const size = await getCacheSize(cacheDir);

                result.passed = true;
                result.message = `Operational (${formatBytes(size)})`;
                result.details = {
                    path: cacheDir,
                    file: cacheFile,
                    size,
                    sizeFormatted: formatBytes(size),
                    writable: true,
                    entryCount: Object.keys(cache.entries).length,
                    updatedAt: cache.updatedAt
                };
            } catch (writeError) {
                result.passed = false;
                result.message = "Cache directory not writable or cache file invalid";
                result.canFix = true;
                result.fix = async () => {
                    await fs.ensureDir(cacheDir);
                    await fs.chmod(cacheDir, 0o755);
                    await fs.writeJson(cacheFile, createDefaultCache(), { spaces: 2 });
                    return "Fixed cache directory and reset cache file";
                };
            }
        } else {
            result.passed = false;
            result.message = "Cache directory does not exist";
            result.canFix = true;
            result.fix = async () => {
                await fs.ensureDir(cacheDir);
                await fs.writeJson(cacheFile, createDefaultCache(), { spaces: 2 });
                return `Created cache directory at ${cacheDir}`;
            };
        }
    } catch (error) {
        result.passed = false;
        result.message = `Cache check failed: ${error.message}`;
    }

    return result;
}

/**
 * Calculate total size of cache directory
 * @param {string} dir - Directory path
 * @returns {Promise<number>} Total size in bytes
 */
async function getCacheSize(dir) {
    let totalSize = 0;

    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                totalSize += await getCacheSize(filePath);
            } else {
                totalSize += stats.size;
            }
        }
    } catch {
        return 0;
    }

    return totalSize;
}

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default checkCache;

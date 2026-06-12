import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

/**
 * Get cache directory path
 * @returns {string} Cache directory path
 */
function getCacheDir() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.fsr', 'cache');
}

/**
 * Check cache system
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkCache(options = {}) {
    const result = {
        name: 'Cache system',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: true,
        fix: null
    };

    try {
        const cacheDir = getCacheDir();

        // Check if cache directory exists
        if (await fs.pathExists(cacheDir)) {
            // Check if we can write to it
            const testFile = path.join(cacheDir, '.test');
            try {
                await fs.writeFile(testFile, 'test', 'utf8');
                await fs.remove(testFile);

                // Calculate cache size
                const size = await getCacheSize(cacheDir);

                result.passed = true;
                result.message = `Operational (${formatBytes(size)})`;
                result.details = {
                    path: cacheDir,
                    size: size,
                    sizeFormatted: formatBytes(size),
                    writable: true
                };
            } catch (writeError) {
                result.passed = false;
                result.message = 'Cache directory not writable';
                result.canFix = true;
                result.fix = async () => {
                    await fs.chmod(cacheDir, 0o755);
                    return 'Fixed cache directory permissions';
                };
            }
        } else {
            result.passed = false;
            result.message = 'Cache directory does not exist';
            result.canFix = true;
            result.fix = async () => {
                await fs.ensureDir(cacheDir);
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
    } catch (error) {
        // Directory doesn't exist or can't be read
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default checkCache;

/**
 * Hash utilities for cache key generation
 * @module utils/hash
 */

import { createHash } from 'crypto';
import { statSync } from 'fs';

/**
 * Generate a SHA-256 hash from a string
 * @param {string} input - Input string
 * @param {number} [length=16] - Output length (characters)
 * @returns {string} Hash string
 */
export function hash(input, length = 16) {
    return createHash('sha256')
        .update(input)
        .digest('hex')
        .substring(0, length);
}

/**
 * Generate a hash from multiple inputs
 * @param {...string} inputs - Input strings
 * @returns {string} Combined hash
 */
export function hashMultiple(...inputs) {
    const combined = inputs.join(':');
    return hash(combined);
}

/**
 * Generate a cache key from file path and metadata
 * @param {string} filePath - File path
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.includeMtime=true] - Include modification time
 * @param {boolean} [options.includeSize=false] - Include file size
 * @returns {string} Cache key
 */
export function generateFileKey(filePath, options = {}) {
    const includeMtime = options.includeMtime !== false;
    const includeSize = options.includeSize || false;

    try {
        const stats = statSync(filePath);
        const parts = [filePath];

        if (includeMtime) {
            parts.push(stats.mtimeMs.toString());
        }

        if (includeSize) {
            parts.push(stats.size.toString());
        }

        return hash(parts.join(':'));
    } catch (error) {
        throw new Error(`Failed to generate file key for ${filePath}: ${error.message}`);
    }
}

/**
 * Generate a cache key from an object
 * @param {Object} obj - Object to hash
 * @returns {string} Cache key
 */
export function hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return hash(str);
}

/**
 * Generate a cache key from file path and content hash
 * @param {string} filePath - File path
 * @param {string} content - File content
 * @returns {string} Cache key
 */
export function generateContentKey(filePath, content) {
    const contentHash = hash(content);
    return hash(`${filePath}:${contentHash}`);
}

/**
 * Get file metadata for cache validation
 * @param {string} filePath - File path
 * @returns {Object} File metadata
 */
export function getFileMetadata(filePath) {
    try {
        const stats = statSync(filePath);
        return {
            mtime: stats.mtimeMs,
            size: stats.size,
            exists: true
        };
    } catch (error) {
        return {
            mtime: null,
            size: null,
            exists: false
        };
    }
}

/**
 * Check if file has changed based on metadata
 * @param {string} filePath - File path
 * @param {number} cachedMtime - Cached modification time
 * @returns {boolean} True if file has changed
 */
export function hasFileChanged(filePath, cachedMtime) {
    try {
        const stats = statSync(filePath);
        return stats.mtimeMs !== cachedMtime;
    } catch {
        return true; // Consider changed if file doesn't exist
    }
}

export default {
    hash,
    hashMultiple,
    hashObject,
    generateFileKey,
    generateContentKey,
    getFileMetadata,
    hasFileChanged
};

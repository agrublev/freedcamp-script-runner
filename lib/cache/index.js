/**
 * Cache Manager with TTL support
 * Two-tier cache: an in-memory Map backed by a persistent file store at
 * ~/.fsr/cache, so entries survive between one-shot CLI invocations.
 * @module cache
 */

import { createHash } from 'crypto';
import {
    statSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
    rmSync,
    readdirSync
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import EventEmitter from 'events';

/**
 * Resolve the persistent cache directory (~/.fsr/cache).
 * Matches the convention asserted by lib/diagnostics/cache.js.
 * @returns {string} Absolute cache directory path
 */
function defaultCacheDir() {
    return join(homedir(), '.fsr', 'cache');
}

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} data - Cached data
 * @property {number} timestamp - Creation timestamp
 * @property {number} ttl - Time to live in milliseconds
 * @property {string} key - Cache key
 * @property {string} [filePath] - Associated file path for file-based caching
 * @property {number} [mtime] - File modification time
 */

/**
 * Cache statistics
 * @typedef {Object} CacheStats
 * @property {number} hits - Cache hit count
 * @property {number} misses - Cache miss count
 * @property {number} invalidations - Cache invalidation count
 * @property {number} size - Current cache size
 * @property {number} hitRate - Cache hit rate percentage
 */

/**
 * CacheManager - Two-tier cache (in-memory + ~/.fsr/cache) with TTL and file watching
 * @class
 * @extends EventEmitter
 */
class CacheManager extends EventEmitter {
    /**
     * Create a cache manager
     * @param {Object} options - Configuration options
     * @param {number} [options.defaultTTL=300000] - Default TTL in milliseconds (5 minutes)
     * @param {number} [options.maxSize=100] - Maximum number of cache entries
     * @param {boolean} [options.enableStats=true] - Enable statistics tracking
     * @param {boolean} [options.persist=true] - Persist entries to ~/.fsr/cache
     * @param {string} [options.cacheDir] - Override the persistent cache directory
     */
    constructor(options = {}) {
        super();

        this.cache = new Map();
        this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
        this.maxSize = options.maxSize || 100;
        this.enableStats = options.enableStats !== false;

        // Persistent file-system tier (~/.fsr/cache). Survives CLI restarts.
        // Disabled gracefully if the directory can't be created.
        this.persist = options.persist !== false;
        this.cacheDir = options.cacheDir || defaultCacheDir();
        if (this.persist) {
            try {
                mkdirSync(this.cacheDir, { recursive: true });
            } catch (error) {
                console.warn(`Warning: disabling cache persistence (${error.message})`);
                this.persist = false;
            }
        }

        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            invalidations: 0,
            evictions: 0,
            startTime: Date.now()
        };

        // Cleanup interval - run every minute.
        // unref() so this background timer never keeps a one-shot CLI process alive.
        this.cleanupInterval = setInterval(() => this._cleanup(), 60000);
        if (this.cleanupInterval && typeof this.cleanupInterval.unref === "function") {
            this.cleanupInterval.unref();
        }

        // Ensure cleanup on exit
        process.on('exit', () => this.destroy());
    }

    /**
     * Generate a cache key from file path and modification time
     * @param {string} filePath - File path
     * @returns {string} Cache key
     */
    generateFileKey(filePath) {
        try {
            const stats = statSync(filePath);
            const mtime = stats.mtimeMs;
            return this._hash(`${filePath}:${mtime}`);
        } catch (error) {
            throw new Error(`Failed to generate cache key for ${filePath}: ${error.message}`);
        }
    }

    /**
     * Generate a hash-based cache key
     * @private
     * @param {string} input - Input string
     * @returns {string} Hash
     */
    _hash(input) {
        return createHash('sha256').update(input).digest('hex').substring(0, 16);
    }

    /**
     * Resolve the on-disk path for a cache key.
     * @private
     * @param {string} key - Cache key
     * @returns {string} Absolute file path
     */
    _diskPath(key) {
        return join(this.cacheDir, `${this._hash(key)}.json`);
    }

    /**
     * Write an entry through to the persistent store.
     * @private
     * @param {string} key - Cache key
     * @param {CacheEntry} entry - Cache entry
     */
    _writeDisk(key, entry) {
        if (!this.persist) return;
        try {
            writeFileSync(this._diskPath(key), JSON.stringify(entry), 'utf-8');
        } catch (error) {
            console.warn(`Warning: failed to persist cache entry (${error.message})`);
        }
    }

    /**
     * Read an entry from the persistent store.
     * @private
     * @param {string} key - Cache key
     * @returns {CacheEntry|null} Persisted entry or null
     */
    _readDisk(key) {
        if (!this.persist) return null;
        try {
            return JSON.parse(readFileSync(this._diskPath(key), 'utf-8'));
        } catch {
            // Missing or corrupt entry — treat as a miss.
            return null;
        }
    }

    /**
     * Remove an entry from the persistent store.
     * @private
     * @param {string} key - Cache key
     */
    _removeDisk(key) {
        if (!this.persist) return;
        try {
            rmSync(this._diskPath(key), { force: true });
        } catch {
            // Best-effort removal; ignore failures.
        }
    }

    /**
     * Get value from cache
     * @template T
     * @param {string} key - Cache key
     * @returns {T|null} Cached value or null
     */
    get(key) {
        let entry = this.cache.get(key);

        // Memory miss: try to rehydrate from the persistent store (warm cache
        // populated by a prior CLI run).
        if (!entry) {
            const disk = this._readDisk(key);
            if (disk) {
                this.cache.set(key, disk);
                entry = disk;
            }
        }

        if (!entry) {
            this._recordMiss();
            return null;
        }

        // Check if entry is expired
        if (this._isExpired(entry)) {
            this.invalidate(key);
            this._recordMiss();
            return null;
        }

        // Check if file-based cache is still valid
        if (entry.filePath) {
            try {
                const stats = statSync(entry.filePath);
                if (stats.mtimeMs !== entry.mtime) {
                    this.invalidate(key);
                    this._recordMiss();
                    return null;
                }
            } catch (error) {
                // File might have been deleted
                this.invalidate(key);
                this._recordMiss();
                return null;
            }
        }

        this._recordHit();
        this.emit('hit', { key, data: entry.data });
        return entry.data;
    }

    /**
     * Set value in cache
     * @template T
     * @param {string} key - Cache key
     * @param {T} data - Data to cache
     * @param {Object} [options] - Cache options
     * @param {number} [options.ttl] - Custom TTL in milliseconds
     * @param {string} [options.filePath] - Associated file path
     * @returns {void}
     */
    set(key, data, options = {}) {
        // Evict oldest entry if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this._evictOldest();
        }

        const ttl = options.ttl !== undefined ? options.ttl : this.defaultTTL;
        const entry = {
            data,
            timestamp: Date.now(),
            ttl,
            key
        };

        // Add file tracking if provided
        if (options.filePath) {
            try {
                const stats = statSync(options.filePath);
                entry.filePath = options.filePath;
                entry.mtime = stats.mtimeMs;
            } catch (error) {
                console.warn(`Warning: Could not stat file ${options.filePath}`);
            }
        }

        this.cache.set(key, entry);
        this._writeDisk(key, entry);
        this.emit('set', { key, data, ttl });
    }

    /**
     * Invalidate a cache entry
     * @param {string} key - Cache key
     * @returns {boolean} True if entry was deleted
     */
    invalidate(key) {
        const inMemory = this.cache.delete(key);
        // Persisted entries may exist even when the in-memory tier is cold
        // (e.g. a stale entry rehydrated then invalidated). Always clear disk.
        this._removeDisk(key);
        if (inMemory) {
            this.stats.invalidations++;
            this.emit('invalidate', { key });
        }
        return inMemory;
    }

    /**
     * Invalidate all entries for a specific file path
     * @param {string} filePath - File path
     * @returns {number} Number of invalidated entries
     */
    invalidateFile(filePath) {
        let count = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.filePath === filePath) {
                this.invalidate(key);
                count++;
            }
        }
        return count;
    }

    /**
     * Clear all cache entries
     * @returns {void}
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this._clearDisk();
        this.stats.invalidations += size;
        this.emit('clear');
    }

    /**
     * Remove every persisted entry from the cache directory.
     * @private
     */
    _clearDisk() {
        if (!this.persist) return;
        try {
            for (const file of readdirSync(this.cacheDir)) {
                if (file.endsWith('.json')) {
                    rmSync(join(this.cacheDir, file), { force: true });
                }
            }
        } catch {
            // Directory missing or unreadable; nothing to clear.
        }
    }

    /**
     * Check if a cache entry is valid
     * @param {string} key - Cache key
     * @returns {boolean} True if valid
     */
    isValid(key) {
        const entry = this.cache.get(key) || this._readDisk(key);
        if (!entry) return false;

        if (this._isExpired(entry)) return false;

        // Check file modification time if applicable
        if (entry.filePath) {
            try {
                const stats = statSync(entry.filePath);
                return stats.mtimeMs === entry.mtime;
            } catch {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if an entry is expired
     * @private
     * @param {CacheEntry} entry - Cache entry
     * @returns {boolean} True if expired
     */
    _isExpired(entry) {
        if (entry.ttl === 0) return false; // TTL of 0 means never expire
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * Get cache statistics
     * @returns {CacheStats} Statistics object
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        const uptime = Date.now() - this.stats.startTime;

        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            invalidations: this.stats.invalidations,
            evictions: this.stats.evictions,
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: hitRate.toFixed(2),
            uptime,
            totalRequests: total
        };
    }

    /**
     * Reset statistics
     * @returns {void}
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            invalidations: 0,
            evictions: 0,
            startTime: Date.now()
        };
    }

    /**
     * Cleanup expired entries
     * @private
     * @returns {number} Number of cleaned entries
     */
    _cleanup() {
        let cleaned = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (this._isExpired(entry)) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.emit('cleanup', { count: cleaned });
        }

        return cleaned;
    }

    /**
     * Evict the oldest cache entry
     * @private
     * @returns {void}
     */
    _evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.evictions++;
            this.emit('evict', { key: oldestKey });
        }
    }

    /**
     * Record a cache hit
     * @private
     */
    _recordHit() {
        if (this.enableStats) {
            this.stats.hits++;
        }
    }

    /**
     * Record a cache miss
     * @private
     */
    _recordMiss() {
        if (this.enableStats) {
            this.stats.misses++;
        }
    }

    /**
     * Destroy the cache manager and cleanup resources.
     * Releases the in-memory tier only — the persistent store at
     * ~/.fsr/cache is intentionally left intact so it survives process exit.
     * Use clear() to wipe persisted entries.
     * @returns {void}
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.cache.clear();
        this.removeAllListeners();
    }

    /**
     * Get all cache keys
     * @returns {string[]} Array of cache keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache size
     * @returns {number} Number of entries
     */
    size() {
        return this.cache.size;
    }

    /**
     * Check if cache has a key
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists
     */
    has(key) {
        return (this.cache.has(key) || this._readDisk(key) !== null) && this.isValid(key);
    }
}

// Singleton instance
let globalCache = null;

/**
 * Get the global cache instance
 * @param {Object} [options] - Configuration options
 * @returns {CacheManager} Cache manager instance
 */
export function getCache(options) {
    if (!globalCache) {
        globalCache = new CacheManager(options);
    }
    return globalCache;
}

/**
 * Reset the global cache instance
 * @returns {void}
 */
export function resetCache() {
    if (globalCache) {
        globalCache.destroy();
        globalCache = null;
    }
}

export { CacheManager };
export default CacheManager;

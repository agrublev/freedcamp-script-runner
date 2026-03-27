/**
 * Cache Manager with TTL support
 * Provides in-memory caching with automatic invalidation
 * @module cache
 */

import { createHash } from 'crypto';
import { statSync } from 'fs';
import EventEmitter from 'events';

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
 * CacheManager - In-memory cache with TTL and file watching
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
     */
    constructor(options = {}) {
        super();

        this.cache = new Map();
        this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
        this.maxSize = options.maxSize || 100;
        this.enableStats = options.enableStats !== false;

        // Statistics
        this.stats = {
            hits: 0,
            misses: 0,
            invalidations: 0,
            evictions: 0,
            startTime: Date.now()
        };

        // Cleanup interval - run every minute
        this.cleanupInterval = setInterval(() => this._cleanup(), 60000);

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
     * Get value from cache
     * @template T
     * @param {string} key - Cache key
     * @returns {T|null} Cached value or null
     */
    get(key) {
        const entry = this.cache.get(key);

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
        this.emit('set', { key, data, ttl });
    }

    /**
     * Invalidate a cache entry
     * @param {string} key - Cache key
     * @returns {boolean} True if entry was deleted
     */
    invalidate(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.invalidations++;
            this.emit('invalidate', { key });
        }
        return deleted;
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
        this.stats.invalidations += size;
        this.emit('clear');
    }

    /**
     * Check if a cache entry is valid
     * @param {string} key - Cache key
     * @returns {boolean} True if valid
     */
    isValid(key) {
        const entry = this.cache.get(key);
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
     * Destroy the cache manager and cleanup resources
     * @returns {void}
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
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
        return this.cache.has(key) && this.isValid(key);
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

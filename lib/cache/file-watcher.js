/**
 * File watcher for automatic cache invalidation
 * @module cache/file-watcher
 */

import { watch } from 'fs';
import { resolve } from 'path';
import EventEmitter from 'events';
import fsrLog from "../utils/console.js";

/**
 * FileWatcher - Monitors files and triggers cache invalidation
 * @class
 * @extends EventEmitter
 */
class FileWatcher extends EventEmitter {
    /**
     * Create a file watcher
     * @param {CacheManager} cacheManager - Cache manager instance
     * @param {Object} options - Configuration options
     * @param {number} [options.debounceMs=100] - Debounce time in milliseconds
     */
    constructor(cacheManager, options = {}) {
        super();

        this.cacheManager = cacheManager;
        this.debounceMs = options.debounceMs || 100;
        this.watchers = new Map();
        this.debounceTimers = new Map();

        // Statistics
        this.stats = {
            filesWatched: 0,
            changeEvents: 0,
            invalidations: 0
        };
    }

    /**
     * Watch a file for changes
     * @param {string} filePath - Path to file
     * @returns {void}
     */
    watch(filePath) {
        const absolutePath = resolve(filePath);

        // Don't watch if already watching
        if (this.watchers.has(absolutePath)) {
            return;
        }

        try {
            const watcher = watch(absolutePath, (eventType) => {
                this._handleChange(absolutePath, eventType);
            });

            // unref() so watching a file never keeps a one-shot CLI process alive.
            if (typeof watcher.unref === 'function') {
                watcher.unref();
            }

            watcher.on('error', (error) => {
                fsrLog.warn(`File watcher error for ${absolutePath}:`, error.message);
                this.unwatch(absolutePath);
            });

            this.watchers.set(absolutePath, watcher);
            this.stats.filesWatched++;

            this.emit('watch', { filePath: absolutePath });
        } catch (error) {
            fsrLog.warn(`Failed to watch file ${absolutePath}:`, error.message);
        }
    }

    /**
     * Stop watching a file
     * @param {string} filePath - Path to file
     * @returns {boolean} True if file was being watched
     */
    unwatch(filePath) {
        const absolutePath = resolve(filePath);
        const watcher = this.watchers.get(absolutePath);

        if (watcher) {
            watcher.close();
            this.watchers.delete(absolutePath);
            this.stats.filesWatched--;
            this.emit('unwatch', { filePath: absolutePath });
            return true;
        }

        return false;
    }

    /**
     * Handle file change event
     * @private
     * @param {string} filePath - Path to changed file
     * @param {string} eventType - Type of change event
     */
    _handleChange(filePath, eventType) {
        // Clear existing debounce timer
        if (this.debounceTimers.has(filePath)) {
            clearTimeout(this.debounceTimers.get(filePath));
        }

        // Debounce the invalidation
        const timer = setTimeout(() => {
            this._invalidateFile(filePath, eventType);
            this.debounceTimers.delete(filePath);
        }, this.debounceMs);
        if (typeof timer.unref === 'function') {
            timer.unref();
        }

        this.debounceTimers.set(filePath, timer);
    }

    /**
     * Invalidate cache entries for a file
     * @private
     * @param {string} filePath - Path to file
     * @param {string} eventType - Type of change event
     */
    _invalidateFile(filePath, eventType) {
        this.stats.changeEvents++;

        const invalidated = this.cacheManager.invalidateFile(filePath);

        if (invalidated > 0) {
            this.stats.invalidations += invalidated;
            this.emit('invalidate', {
                filePath,
                eventType,
                count: invalidated
            });
        }
    }

    /**
     * Stop watching all files
     * @returns {void}
     */
    unwatchAll() {
        for (const [filePath, watcher] of this.watchers.entries()) {
            watcher.close();
        }
        this.watchers.clear();
        this.stats.filesWatched = 0;

        // Clear all debounce timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }
        this.debounceTimers.clear();

        this.emit('unwatchAll');
    }

    /**
     * Get watcher statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            filesWatched: this.stats.filesWatched,
            changeEvents: this.stats.changeEvents,
            invalidations: this.stats.invalidations,
            watchedFiles: Array.from(this.watchers.keys())
        };
    }

    /**
     * Check if a file is being watched
     * @param {string} filePath - Path to file
     * @returns {boolean} True if being watched
     */
    isWatching(filePath) {
        const absolutePath = resolve(filePath);
        return this.watchers.has(absolutePath);
    }

    /**
     * Destroy the file watcher and cleanup resources
     * @returns {void}
     */
    destroy() {
        this.unwatchAll();
        this.removeAllListeners();
    }
}

export default FileWatcher;

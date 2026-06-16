/**
 * Cache monitoring and statistics
 * @module cache/monitor
 */

import chalk from 'chalk';

/**
 * CacheMonitor - Collects and displays cache performance metrics
 * @class
 */
class CacheMonitor {
    /**
     * Create a cache monitor
     * @param {CacheManager} cacheManager - Cache manager instance
     * @param {FileWatcher} [fileWatcher] - Optional file watcher instance
     */
    constructor(cacheManager, fileWatcher = null) {
        this.cacheManager = cacheManager;
        this.fileWatcher = fileWatcher;

        // Performance tracking
        this.metrics = {
            coldCacheTime: [],
            warmCacheTime: [],
            avgColdTime: 0,
            avgWarmTime: 0,
            speedup: 0
        };

        // Listen to cache events
        this._attachListeners();
    }

    /**
     * Attach event listeners to cache manager
     * @private
     */
    _attachListeners() {
        this.cacheManager.on('hit', () => {
            // Cache hit event
        });

        this.cacheManager.on('miss', () => {
            // Cache miss event
        });

        this.cacheManager.on('invalidate', ({ key }) => {
            // Invalidation event
        });

        this.cacheManager.on('evict', ({ key }) => {
            // Eviction event
        });

        this.cacheManager.on('cleanup', ({ count }) => {
            // Cleanup event
        });
    }

    /**
     * Record a cold cache operation time
     * @param {number} timeMs - Time in milliseconds
     */
    recordColdCache(timeMs) {
        this.metrics.coldCacheTime.push(timeMs);
        this._updateAverages();
    }

    /**
     * Record a warm cache operation time
     * @param {number} timeMs - Time in milliseconds
     */
    recordWarmCache(timeMs) {
        this.metrics.warmCacheTime.push(timeMs);
        this._updateAverages();
    }

    /**
     * Update average times and speedup
     * @private
     */
    _updateAverages() {
        if (this.metrics.coldCacheTime.length > 0) {
            const sum = this.metrics.coldCacheTime.reduce((a, b) => a + b, 0);
            this.metrics.avgColdTime = sum / this.metrics.coldCacheTime.length;
        }

        if (this.metrics.warmCacheTime.length > 0) {
            const sum = this.metrics.warmCacheTime.reduce((a, b) => a + b, 0);
            this.metrics.avgWarmTime = sum / this.metrics.warmCacheTime.length;
        }

        if (this.metrics.avgWarmTime > 0 && this.metrics.avgColdTime > 0) {
            this.metrics.speedup = this.metrics.avgColdTime / this.metrics.avgWarmTime;
        }
    }

    /**
     * Get comprehensive statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const cacheStats = this.cacheManager.getStats();
        const watcherStats = this.fileWatcher ? this.fileWatcher.getStats() : null;

        return {
            cache: cacheStats,
            watcher: watcherStats,
            performance: {
                avgColdTime: Math.round(this.metrics.avgColdTime),
                avgWarmTime: Math.round(this.metrics.avgWarmTime),
                speedup: this.metrics.speedup.toFixed(2) + 'x',
                coldCacheSamples: this.metrics.coldCacheTime.length,
                warmCacheSamples: this.metrics.warmCacheTime.length
            }
        };
    }

    /**
     * Print statistics to console
     * @param {Object} [options] - Display options
     * @param {boolean} [options.verbose=false] - Show detailed stats
     */
    printStats(options = {}) {
        const verbose = options.verbose || false;
        const stats = this.getStats();

        console.log('\n' + chalk.bold.cyan('=== Cache Statistics ==='));

        // Cache stats
        console.log(chalk.bold('\nCache:'));
        console.log(`  Size: ${chalk.green(stats.cache.size)}/${stats.cache.maxSize}`);
        console.log(`  Hits: ${chalk.green(stats.cache.hits)}`);
        console.log(`  Misses: ${chalk.yellow(stats.cache.misses)}`);
        console.log(`  Hit Rate: ${this._colorizeHitRate(stats.cache.hitRate)}%`);
        console.log(`  Invalidations: ${chalk.yellow(stats.cache.invalidations)}`);
        console.log(`  Evictions: ${chalk.yellow(stats.cache.evictions)}`);

        // Performance stats
        if (stats.performance.warmCacheSamples > 0) {
            console.log(chalk.bold('\nPerformance:'));
            console.log(`  Cold Cache: ${chalk.yellow(stats.performance.avgColdTime + 'ms')}`);
            console.log(`  Warm Cache: ${chalk.green(stats.performance.avgWarmTime + 'ms')}`);
            console.log(`  Speedup: ${chalk.bold.green(stats.performance.speedup)}`);
        }

        // File watcher stats
        if (stats.watcher) {
            console.log(chalk.bold('\nFile Watcher:'));
            console.log(`  Files Watched: ${chalk.green(stats.watcher.filesWatched)}`);
            console.log(`  Change Events: ${chalk.yellow(stats.watcher.changeEvents)}`);
            console.log(`  Invalidations: ${chalk.yellow(stats.watcher.invalidations)}`);

            if (verbose && stats.watcher.watchedFiles.length > 0) {
                console.log(chalk.bold('\n  Watched Files:'));
                stats.watcher.watchedFiles.forEach(file => {
                    console.log(`    - ${chalk.gray(file)}`);
                });
            }
        }

        // Uptime
        const uptimeMinutes = Math.floor(stats.cache.uptime / 60000);
        console.log(chalk.bold('\nUptime:'), chalk.green(`${uptimeMinutes} minutes`));

        console.log(chalk.bold.cyan('\n========================\n'));
    }

    /**
     * Colorize hit rate based on percentage
     * @private
     * @param {string|number} hitRate - Hit rate percentage
     * @returns {string} Colored hit rate
     */
    _colorizeHitRate(hitRate) {
        const rate = parseFloat(hitRate);
        if (rate >= 80) return chalk.green(hitRate);
        if (rate >= 50) return chalk.yellow(hitRate);
        return chalk.red(hitRate);
    }

    /**
     * Get summary statistics as a single line
     * @returns {string} Summary string
     */
    getSummary() {
        const stats = this.getStats();
        const parts = [
            `${stats.cache.size} entries`,
            `${stats.cache.hitRate}% hit rate`
        ];

        if (stats.performance.warmCacheSamples > 0) {
            parts.push(`${stats.performance.speedup} speedup`);
        }

        return parts.join(', ');
    }

    /**
     * Export statistics as JSON
     * @returns {string} JSON string
     */
    toJSON() {
        return JSON.stringify(this.getStats(), null, 2);
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.metrics = {
            coldCacheTime: [],
            warmCacheTime: [],
            avgColdTime: 0,
            avgWarmTime: 0,
            speedup: 0
        };
        this.cacheManager.resetStats();
    }
}

export default CacheMonitor;

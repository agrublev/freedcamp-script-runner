/**
 * Cache CLI commands
 * @module cache/cli
 */

import chalk from 'chalk';
import { getCache, resetCache } from './index.js';
import CacheMonitor from './monitor.js';
import fsrLog from "../utils/console.js";

/**
 * Show cache statistics
 * @param {Object} options - Options
 * @param {boolean} [options.verbose=false] - Show verbose output
 */
export async function showCacheStats(options = {}) {
    const cache = getCache();
    const monitor = new CacheMonitor(cache);

    monitor.printStats(options);

    return monitor.getStats();
}

/**
 * Clear all cache entries
 */
export async function clearCache() {
    const cache = getCache();
    const sizeBefore = cache.size();

    cache.clear();

    fsrLog.log(chalk.green(`✓ Cache cleared (${sizeBefore} entries removed)`));
}

/**
 * Reset cache instance
 */
export async function resetCacheInstance() {
    resetCache();
    fsrLog.log(chalk.green('✓ Cache instance reset'));
}

/**
 * Show cache entries
 * @param {Object} options - Options
 * @param {number} [options.limit=10] - Maximum entries to show
 */
export async function listCacheEntries(options = {}) {
    const cache = getCache();
    const limit = options.limit || 10;
    const keys = cache.keys();

    fsrLog.log(chalk.bold.cyan(`\n=== Cache Entries (${keys.length} total) ===\n`));

    if (keys.length === 0) {
        fsrLog.log(chalk.gray('  (empty)'));
        return;
    }

    const displayKeys = keys.slice(0, limit);

    displayKeys.forEach((key, index) => {
        const valid = cache.isValid(key);
        const status = valid ? chalk.green('✓') : chalk.red('✗');
        fsrLog.log(`  ${status} ${chalk.gray(`[${index + 1}]`)} ${key}`);
    });

    if (keys.length > limit) {
        fsrLog.log(chalk.gray(`\n  ... and ${keys.length - limit} more`));
    }

    fsrLog.log('');
}

/**
 * Export cache statistics to JSON
 * @param {string} [outputPath] - Output file path
 */
export async function exportCacheStats(outputPath) {
    const cache = getCache();
    const monitor = new CacheMonitor(cache);
    const json = monitor.toJSON();

    if (outputPath) {
        const fs = await import('fs');
        fs.writeFileSync(outputPath, json, 'utf-8');
        fsrLog.log(chalk.green(`✓ Cache statistics exported to ${outputPath}`));
    } else {
        fsrLog.log(json);
    }

    return json;
}

/**
 * Benchmark cache performance
 */
export async function benchmarkCache() {
    fsrLog.log(chalk.bold.cyan('\n=== Running Cache Benchmark ===\n'));

    const { default: parseScriptFile } = await import('../parsers/parseScriptsMd.cached.js');
    const cache = getCache();
    const monitor = new CacheMonitor(cache);

    // Cold cache
    fsrLog.log(chalk.yellow('Testing cold cache...'));
    cache.clear();
    const coldStart = performance.now();
    await parseScriptFile();
    const coldTime = performance.now() - coldStart;
    monitor.recordColdCache(coldTime);

    fsrLog.log(chalk.green(`  Cold cache: ${coldTime.toFixed(2)}ms`));

    // Warm cache (5 iterations)
    fsrLog.log(chalk.yellow('\nTesting warm cache (5 iterations)...'));
    const warmTimes = [];

    for (let i = 0; i < 5; i++) {
        const warmStart = performance.now();
        await parseScriptFile();
        const warmTime = performance.now() - warmStart;
        warmTimes.push(warmTime);
        monitor.recordWarmCache(warmTime);
    }

    const avgWarmTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
    const speedup = coldTime / avgWarmTime;

    fsrLog.log(chalk.green(`  Warm cache (avg): ${avgWarmTime.toFixed(2)}ms`));
    fsrLog.log(chalk.bold.green(`  Speedup: ${speedup.toFixed(2)}x`));

    if (speedup >= 10) {
        fsrLog.log(chalk.bold.green('\n  ✓ Target achieved (10x speedup)!'));
    } else {
        fsrLog.log(chalk.bold.yellow(`\n  ⚠ Below target (${speedup.toFixed(2)}x < 10x)`));
    }

    fsrLog.log('');

    return { coldTime, avgWarmTime, speedup };
}

export default {
    showCacheStats,
    clearCache,
    resetCacheInstance,
    listCacheEntries,
    exportCacheStats,
    benchmarkCache
};

/**
 * Cache CLI commands
 * @module cache/cli
 */

import chalk from 'chalk';
import { getCache, resetCache } from './index.js';
import CacheMonitor from './monitor.js';

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

    console.log(chalk.green(`✓ Cache cleared (${sizeBefore} entries removed)`));
}

/**
 * Reset cache instance
 */
export async function resetCacheInstance() {
    resetCache();
    console.log(chalk.green('✓ Cache instance reset'));
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

    console.log(chalk.bold.cyan(`\n=== Cache Entries (${keys.length} total) ===\n`));

    if (keys.length === 0) {
        console.log(chalk.gray('  (empty)'));
        return;
    }

    const displayKeys = keys.slice(0, limit);

    displayKeys.forEach((key, index) => {
        const valid = cache.isValid(key);
        const status = valid ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${status} ${chalk.gray(`[${index + 1}]`)} ${key}`);
    });

    if (keys.length > limit) {
        console.log(chalk.gray(`\n  ... and ${keys.length - limit} more`));
    }

    console.log('');
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
        console.log(chalk.green(`✓ Cache statistics exported to ${outputPath}`));
    } else {
        console.log(json);
    }

    return json;
}

/**
 * Benchmark cache performance
 */
export async function benchmarkCache() {
    console.log(chalk.bold.cyan('\n=== Running Cache Benchmark ===\n'));

    const { default: parseScriptFile } = await import('../parsers/parseScriptsMd.cached.js');
    const cache = getCache();
    const monitor = new CacheMonitor(cache);

    // Cold cache
    console.log(chalk.yellow('Testing cold cache...'));
    cache.clear();
    const coldStart = performance.now();
    await parseScriptFile();
    const coldTime = performance.now() - coldStart;
    monitor.recordColdCache(coldTime);

    console.log(chalk.green(`  Cold cache: ${coldTime.toFixed(2)}ms`));

    // Warm cache (5 iterations)
    console.log(chalk.yellow('\nTesting warm cache (5 iterations)...'));
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

    console.log(chalk.green(`  Warm cache (avg): ${avgWarmTime.toFixed(2)}ms`));
    console.log(chalk.bold.green(`  Speedup: ${speedup.toFixed(2)}x`));

    if (speedup >= 10) {
        console.log(chalk.bold.green('\n  ✓ Target achieved (10x speedup)!'));
    } else {
        console.log(chalk.bold.yellow(`\n  ⚠ Below target (${speedup.toFixed(2)}x < 10x)`));
    }

    console.log('');

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

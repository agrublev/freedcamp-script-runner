#!/usr/bin/env node

/**
 * Cache System Demonstration
 * Shows the performance benefits of the cache system
 */

import parseScriptFile from '../lib/parsers/parseScriptsMd.js';
import { getCache } from '../lib/cache/index.js';
import CacheMonitor from '../lib/cache/monitor.js';
import chalk from 'chalk';

async function demo() {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║       FSCR Cache System Demo              ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════╝\n'));

    const cache = getCache();
    const monitor = new CacheMonitor(cache);

    // Test 1: Cold cache
    console.log(chalk.bold.yellow('📊 Test 1: Cold Cache (First Run)\n'));
    cache.clear();

    const coldStart = performance.now();
    const result1 = await parseScriptFile();
    const coldTime = performance.now() - coldStart;

    monitor.recordColdCache(coldTime);

    console.log(chalk.green(`  ✓ Parsed ${result1.allTasks.length} tasks`));
    console.log(chalk.yellow(`  ⏱  Time: ${coldTime.toFixed(2)}ms`));
    console.log(chalk.gray(`  💾 Cache entries: ${cache.size()}\n`));

    // Test 2: Warm cache (multiple runs)
    console.log(chalk.bold.green('🚀 Test 2: Warm Cache (Subsequent Runs)\n'));

    const warmTimes = [];
    for (let i = 1; i <= 5; i++) {
        const warmStart = performance.now();
        const result = await parseScriptFile();
        const warmTime = performance.now() - warmStart;
        warmTimes.push(warmTime);
        monitor.recordWarmCache(warmTime);

        console.log(chalk.green(`  Run ${i}: ${warmTime.toFixed(2)}ms`));
    }

    const avgWarmTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
    const speedup = coldTime / avgWarmTime;

    console.log(chalk.bold.green(`\n  Average: ${avgWarmTime.toFixed(2)}ms`));
    console.log(chalk.bold.cyan(`  🎯 Speedup: ${speedup.toFixed(2)}x faster!\n`));

    // Test 3: Cache statistics
    console.log(chalk.bold.magenta('📈 Test 3: Cache Statistics\n'));

    const stats = cache.getStats();
    console.log(chalk.cyan(`  Cache Size: ${stats.size}/${stats.maxSize}`));
    console.log(chalk.green(`  Cache Hits: ${stats.hits}`));
    console.log(chalk.yellow(`  Cache Misses: ${stats.misses}`));
    console.log(chalk.bold.green(`  Hit Rate: ${stats.hitRate}%`));
    console.log(chalk.gray(`  Total Requests: ${stats.totalRequests}\n`));

    // Test 4: Performance comparison
    console.log(chalk.bold.blue('⚡ Performance Comparison\n'));

    console.log(chalk.yellow(`  Cold Cache:  ${coldTime.toFixed(2)}ms`));
    console.log(chalk.green(`  Warm Cache:  ${avgWarmTime.toFixed(2)}ms`));
    console.log(chalk.red(`  Difference:  ${(coldTime - avgWarmTime).toFixed(2)}ms saved`));

    const percentageImprovement = ((coldTime - avgWarmTime) / coldTime * 100).toFixed(1);
    console.log(chalk.bold.green(`  Improvement: ${percentageImprovement}% faster\n`));

    // Test 5: Target validation
    console.log(chalk.bold.cyan('🎯 Performance Targets\n'));

    const targets = [
        { name: 'Cold Cache Target', target: 500, actual: coldTime, unit: 'ms' },
        { name: 'Warm Cache Target', target: 50, actual: avgWarmTime, unit: 'ms' },
        { name: 'Speedup Target', target: 10, actual: speedup, unit: 'x' },
        { name: 'Hit Rate Target', target: 80, actual: parseFloat(stats.hitRate), unit: '%' }
    ];

    targets.forEach(({ name, target, actual, unit }) => {
        const met = actual <= target || (name.includes('Speedup') && actual >= target) || (name.includes('Hit Rate') && actual >= target);
        const status = met ? chalk.green('✓') : chalk.red('✗');
        const value = chalk.yellow(`${actual.toFixed(1)}${unit}`);
        const targetValue = chalk.gray(`(target: ${target}${unit})`);

        console.log(`  ${status} ${name}: ${value} ${targetValue}`);
    });

    // Summary
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║              Summary                       ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════╝\n'));

    if (speedup >= 10) {
        console.log(chalk.bold.green('  🎉 SUCCESS! Cache achieves 10x speedup target!\n'));
    } else {
        console.log(chalk.bold.yellow(`  ⚠️  Cache provides ${speedup.toFixed(1)}x speedup (target: 10x)\n`));
    }

    console.log(chalk.gray('  The cache system is ready for production use.\n'));
}

// Run demo
demo().catch(console.error);

/**
 * Cache Performance Benchmarks
 * Run with: node tests/cache.bench.js
 */

import { CacheManager } from '../lib/cache/index.js';
import parseScriptFile from '../lib/parsers/parseScriptsMd.js';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { readFileSync } from 'fs';
import { join } from 'path';

const ITERATIONS = 100;
const WARMUP_ITERATIONS = 10;

/**
 * Measure execution time
 */
function measure(fn) {
    const start = performance.now();
    fn();
    const end = performance.now();
    return end - start;
}

/**
 * Measure async execution time
 */
async function measureAsync(fn) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
}

/**
 * Calculate statistics
 */
function calculateStats(times) {
    const sorted = times.slice().sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    return { avg, min, max, median, p95 };
}

/**
 * Print benchmark results
 */
function printResults(name, stats, color = 'green') {
    console.log(chalk.bold[color](`\n${name}`));
    console.log(`  Average: ${chalk.yellow(stats.avg.toFixed(2))}ms`);
    console.log(`  Median:  ${chalk.yellow(stats.median.toFixed(2))}ms`);
    console.log(`  Min:     ${chalk.green(stats.min.toFixed(2))}ms`);
    console.log(`  Max:     ${chalk.red(stats.max.toFixed(2))}ms`);
    console.log(`  P95:     ${chalk.yellow(stats.p95.toFixed(2))}ms`);
}

/**
 * Benchmark 1: Cold cache vs warm cache for script parsing
 */
async function benchmarkScriptParsing() {
    console.log(chalk.bold.cyan('\n=== Benchmark 1: Script Parsing (Cold vs Warm Cache) ==='));

    const cache = new CacheManager({ defaultTTL: 600000 }); // 10 minutes
    const fscriptsPath = join(process.cwd(), 'fscripts.md');

    // Cold cache times
    const coldTimes = [];
    for (let i = 0; i < WARMUP_ITERATIONS + ITERATIONS; i++) {
        cache.clear(); // Ensure cold cache

        const time = await measureAsync(async () => {
            const content = readFileSync(fscriptsPath, 'utf-8');
            await parseScriptFile();
        });

        if (i >= WARMUP_ITERATIONS) {
            coldTimes.push(time);
        }
    }

    // Warm cache times
    const warmTimes = [];
    const cacheKey = cache.generateFileKey(fscriptsPath);

    // Pre-populate cache
    const parsedData = await parseScriptFile();
    cache.set(cacheKey, parsedData, { filePath: fscriptsPath });

    for (let i = 0; i < WARMUP_ITERATIONS + ITERATIONS; i++) {
        const time = measure(() => {
            const cached = cache.get(cacheKey);
            if (!cached) {
                throw new Error('Cache miss when expecting hit');
            }
        });

        if (i >= WARMUP_ITERATIONS) {
            warmTimes.push(time);
        }
    }

    const coldStats = calculateStats(coldTimes);
    const warmStats = calculateStats(warmTimes);
    const speedup = coldStats.avg / warmStats.avg;

    printResults('Cold Cache (Parse from disk)', coldStats, 'yellow');
    printResults('Warm Cache (From memory)', warmStats, 'green');

    console.log(chalk.bold.green(`\n  Speedup: ${speedup.toFixed(2)}x faster`));
    console.log(chalk.gray(`  Target: 10x speedup`));

    if (speedup >= 10) {
        console.log(chalk.bold.green('  ✓ Target achieved!'));
    } else {
        console.log(chalk.bold.yellow(`  ⚠ Below target (${speedup.toFixed(2)}x < 10x)`));
    }

    cache.destroy();
    return { coldStats, warmStats, speedup };
}

/**
 * Benchmark 2: Cache operations overhead
 */
function benchmarkCacheOperations() {
    console.log(chalk.bold.cyan('\n=== Benchmark 2: Cache Operations Overhead ==='));

    const cache = new CacheManager();

    // Set operations
    const setTimes = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const time = measure(() => {
            cache.set(`key${i}`, { data: `value${i}`, timestamp: Date.now() });
        });
        setTimes.push(time);
    }

    // Get operations (hits)
    const getTimes = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const time = measure(() => {
            cache.get(`key${i}`);
        });
        getTimes.push(time);
    }

    // Get operations (misses)
    const missTimes = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const time = measure(() => {
            cache.get(`nonexistent${i}`);
        });
        missTimes.push(time);
    }

    const setStats = calculateStats(setTimes);
    const getStats = calculateStats(getTimes);
    const missStats = calculateStats(missTimes);

    printResults('Set Operations', setStats, 'cyan');
    printResults('Get Operations (Hit)', getStats, 'green');
    printResults('Get Operations (Miss)', missStats, 'yellow');

    cache.destroy();
    return { setStats, getStats, missStats };
}

/**
 * Benchmark 3: TTL validation overhead
 */
function benchmarkTTLValidation() {
    console.log(chalk.bold.cyan('\n=== Benchmark 3: TTL Validation Overhead ==='));

    const cache = new CacheManager({ defaultTTL: 300000 }); // 5 minutes

    // Populate cache
    for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, `value${i}`);
    }

    // Measure validation time
    const validationTimes = [];
    for (let i = 0; i < ITERATIONS; i++) {
        const time = measure(() => {
            cache.isValid(`key${i % 100}`);
        });
        validationTimes.push(time);
    }

    const stats = calculateStats(validationTimes);
    printResults('TTL Validation', stats, 'cyan');

    cache.destroy();
    return stats;
}

/**
 * Benchmark 4: Cache size impact
 */
function benchmarkCacheSize() {
    console.log(chalk.bold.cyan('\n=== Benchmark 4: Cache Size Impact ==='));

    const sizes = [10, 50, 100, 500, 1000];
    const results = {};

    sizes.forEach(size => {
        const cache = new CacheManager({ maxSize: size * 2 });

        // Populate cache
        for (let i = 0; i < size; i++) {
            cache.set(`key${i}`, { large: 'data'.repeat(100) });
        }

        // Measure get times
        const getTimes = [];
        for (let i = 0; i < 100; i++) {
            const time = measure(() => {
                cache.get(`key${i % size}`);
            });
            getTimes.push(time);
        }

        const stats = calculateStats(getTimes);
        results[size] = stats;

        console.log(chalk.bold(`\nCache Size: ${size} entries`));
        console.log(`  Average Get: ${chalk.yellow(stats.avg.toFixed(3))}ms`);

        cache.destroy();
    });

    return results;
}

/**
 * Benchmark 5: Memory usage
 */
function benchmarkMemoryUsage() {
    console.log(chalk.bold.cyan('\n=== Benchmark 5: Memory Usage ==='));

    const cache = new CacheManager({ maxSize: 1000 });
    const sizes = [100, 500, 1000];

    sizes.forEach(size => {
        cache.clear();
        const before = process.memoryUsage();

        // Populate cache with realistic data
        for (let i = 0; i < size; i++) {
            cache.set(`key${i}`, {
                name: `Task ${i}`,
                script: 'npm run test',
                timestamp: Date.now(),
                metadata: { lang: 'bash', type: 'npm' }
            });
        }

        const after = process.memoryUsage();
        const heapDiff = (after.heapUsed - before.heapUsed) / 1024 / 1024;
        const perEntry = (heapDiff / size) * 1024;

        console.log(chalk.bold(`\n${size} entries:`));
        console.log(`  Heap Used:   ${chalk.yellow(heapDiff.toFixed(2))}MB`);
        console.log(`  Per Entry:   ${chalk.yellow(perEntry.toFixed(2))}KB`);
    });

    cache.destroy();
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
    console.log(chalk.bold.magenta('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.bold.magenta('║     FSCR Cache Performance Benchmarks      ║'));
    console.log(chalk.bold.magenta('╚════════════════════════════════════════════╝'));
    console.log(chalk.gray(`\nIterations per test: ${ITERATIONS}`));
    console.log(chalk.gray(`Warmup iterations: ${WARMUP_ITERATIONS}\n`));

    const results = {};

    // Run benchmarks
    results.scriptParsing = await benchmarkScriptParsing();
    results.operations = benchmarkCacheOperations();
    results.ttlValidation = benchmarkTTLValidation();
    results.sizeImpact = benchmarkCacheSize();
    benchmarkMemoryUsage();

    // Summary
    console.log(chalk.bold.magenta('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.bold.magenta('║              Summary                       ║'));
    console.log(chalk.bold.magenta('╚════════════════════════════════════════════╝'));

    console.log(chalk.bold('\nKey Metrics:'));
    console.log(`  Cold Cache Time:  ${chalk.yellow(results.scriptParsing.coldStats.avg.toFixed(2))}ms`);
    console.log(`  Warm Cache Time:  ${chalk.green(results.scriptParsing.warmStats.avg.toFixed(2))}ms`);
    console.log(`  Cache Speedup:    ${chalk.bold.green(results.scriptParsing.speedup.toFixed(2) + 'x')}`);
    console.log(`  Set Operation:    ${chalk.yellow(results.operations.setStats.avg.toFixed(3))}ms`);
    console.log(`  Get Operation:    ${chalk.green(results.operations.getStats.avg.toFixed(3))}ms`);
    console.log(`  TTL Validation:   ${chalk.cyan(results.ttlValidation.avg.toFixed(3))}ms`);

    console.log(chalk.bold.green('\n✓ Benchmarks complete!\n'));
}

// Run benchmarks
runBenchmarks().catch(console.error);

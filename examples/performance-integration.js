/**
 * FSCR v7.0.0 Performance Integration Examples
 *
 * Demonstrates how to use the new performance features:
 * - Lazy loading
 * - Caching
 * - Performance monitoring
 */

import { performance } from 'perf_hooks';

/**
 * Example 1: Using Lazy Loading
 */
async function exampleLazyLoading() {
    console.log('\n=== Example 1: Lazy Loading ===\n');

    const { getLazyLoader, registerLazyModule } = await import('../lib/performance/lazy-loader.js');

    const loader = getLazyLoader();

    // Register modules (fast - no loading yet)
    console.time('Register modules');
    registerLazyModule('chalk', () => import('chalk'));
    registerLazyModule('enquirer', () => import('enquirer'));
    registerLazyModule('marked', () => import('marked'));
    console.timeEnd('Register modules');
    // Output: Register modules: ~0.5ms

    // Load module on-demand (slower - actual import)
    console.time('Load chalk');
    const chalk = await loader.load('chalk');
    console.timeEnd('Load chalk');
    // Output: Load chalk: ~15ms

    // Subsequent loads are instant (cached)
    console.time('Load chalk again');
    const chalkAgain = await loader.load('chalk');
    console.timeEnd('Load chalk again');
    // Output: Load chalk again: ~0.1ms

    console.log('\nLoader stats:', loader.getStats());
}

/**
 * Example 2: Using Cache System
 */
async function exampleCaching() {
    console.log('\n=== Example 2: Caching ===\n');

    const { getCache } = await import('../lib/performance/cache.js');

    const cache = getCache({
        ttl: 5 * 60 * 1000,  // 5 minutes
        maxSize: 100
    });

    // Expensive operation (simulate parse)
    async function expensiveParse(file) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { tasks: ['task1', 'task2'], parsed: Date.now() };
    }

    // First call - uncached
    console.time('Parse (uncached)');
    let result = await cache.get('tasks', 'fscripts.md');
    if (!result) {
        result = await expensiveParse('fscripts.md');
        await cache.set('tasks', result, 'fscripts.md');
    }
    console.timeEnd('Parse (uncached)');
    // Output: Parse (uncached): ~102ms

    // Second call - cached
    console.time('Parse (cached)');
    result = await cache.get('tasks', 'fscripts.md');
    console.timeEnd('Parse (cached)');
    // Output: Parse (cached): ~0.5ms

    console.log('\nCache stats:', cache.getStats());
    // Output:
    // {
    //   size: 1,
    //   maxSize: 100,
    //   hits: 1,
    //   misses: 1,
    //   hitRate: '50.00%',
    //   memoryUsage: '0.01 MB'
    // }
}

/**
 * Example 3: Performance Monitoring
 */
async function exampleMonitoring() {
    console.log('\n=== Example 3: Performance Monitoring ===\n');

    const { getMonitor } = await import('../lib/performance/monitor.js');

    const monitor = getMonitor();

    // Track startup
    monitor.startupBegin();

    // Simulate app initialization
    await new Promise(resolve => setTimeout(resolve, 50));

    monitor.startupEnd();

    // Track command execution
    const cmdStart = performance.now();
    await new Promise(resolve => setTimeout(resolve, 30));
    monitor.trackCommand('test-command', performance.now() - cmdStart);

    // Get report
    const report = monitor.getReport();

    console.log('Startup:', report.startup);
    console.log('Memory:', report.memory.current);
    console.log('Commands:', report.commands);

    // Print full report
    monitor.printReport();
}

/**
 * Example 4: Complete Integration
 */
async function exampleCompleteIntegration() {
    console.log('\n=== Example 4: Complete Integration ===\n');

    // Import performance utilities
    const { getLazyLoader, registerLazyModule } = await import('../lib/performance/lazy-loader.js');
    const { getCache } = await import('../lib/performance/cache.js');
    const { getMonitor } = await import('../lib/performance/monitor.js');

    const loader = getLazyLoader();
    const cache = getCache();
    const monitor = getMonitor();

    // Start monitoring
    monitor.startupBegin();

    // Register lazy modules
    registerLazyModule('parser', () => import('../lib/parsers/parseScriptsMd.js'));

    // Simulate command execution
    async function runCommand(commandName) {
        const cmdStart = performance.now();

        try {
            // Check cache first
            let tasks = await cache.get('allTasks');

            if (!tasks) {
                // Load parser lazily
                const parser = (await loader.load('parser')).default;

                // Parse (expensive)
                const parsed = await parser();
                tasks = parsed.allTasks;

                // Cache result
                await cache.set('allTasks', tasks);
            }

            console.log(`Found ${tasks.length} tasks (cached: ${tasks ? 'yes' : 'no'})`);

            // Track success
            monitor.trackCommand(commandName, performance.now() - cmdStart, true);
        } catch (error) {
            // Track failure
            monitor.trackCommand(commandName, performance.now() - cmdStart, false);
            throw error;
        }
    }

    // Run command twice (first uncached, second cached)
    console.log('First run (uncached):');
    await runCommand('list');

    console.log('\nSecond run (cached):');
    await runCommand('list');

    // End monitoring
    monitor.startupEnd();

    // Print comprehensive stats
    console.log('\n--- Performance Stats ---');
    console.log('Loader:', loader.getStats());
    console.log('Cache:', cache.getStats());
    console.log('Monitor:', monitor.getReport());
}

/**
 * Example 5: Custom Cache Strategy
 */
async function exampleCustomCache() {
    console.log('\n=== Example 5: Custom Cache Strategy ===\n');

    const { getCache } = await import('../lib/performance/cache.js');

    // Create cache with custom settings
    const cache = getCache({
        ttl: 2 * 60 * 1000,  // 2 minutes (shorter TTL)
        maxSize: 50           // Smaller cache
    });

    // Cache multiple items
    await cache.set('config', { theme: 'dark' });
    await cache.set('user', { name: 'John' });
    await cache.set('settings', { verbose: true });

    // Retrieve
    const config = await cache.get('config');
    const user = await cache.get('user');

    console.log('Cached items:', { config, user });
    console.log('Cache stats:', cache.getStats());

    // Clear cache
    cache.clear();
    console.log('After clear:', cache.getStats());
}

/**
 * Example 6: Performance Benchmarking
 */
async function exampleBenchmarking() {
    console.log('\n=== Example 6: Benchmarking ===\n');

    // Function to benchmark
    async function slowFunction() {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
    }

    async function fastFunction() {
        await new Promise(resolve => setTimeout(resolve, 5));
        return 'result';
    }

    // Benchmark multiple runs
    async function benchmark(fn, iterations = 10) {
        const times = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await fn();
            times.push(performance.now() - start);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        return { avg, min, max, times };
    }

    console.log('Benchmarking slow function...');
    const slowResults = await benchmark(slowFunction, 5);
    console.log(`  Avg: ${slowResults.avg.toFixed(2)}ms`);
    console.log(`  Min: ${slowResults.min.toFixed(2)}ms`);
    console.log(`  Max: ${slowResults.max.toFixed(2)}ms`);

    console.log('\nBenchmarking fast function...');
    const fastResults = await benchmark(fastFunction, 5);
    console.log(`  Avg: ${fastResults.avg.toFixed(2)}ms`);
    console.log(`  Min: ${fastResults.min.toFixed(2)}ms`);
    console.log(`  Max: ${fastResults.max.toFixed(2)}ms`);

    const speedup = slowResults.avg / fastResults.avg;
    console.log(`\nSpeedup: ${speedup.toFixed(2)}x faster`);
}

/**
 * Run all examples
 */
async function runAllExamples() {
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║   FSCR v7.0.0 Performance Integration Examples   ║');
    console.log('╚═══════════════════════════════════════════════════╝');

    try {
        await exampleLazyLoading();
        await exampleCaching();
        await exampleMonitoring();
        await exampleCustomCache();
        await exampleBenchmarking();
        // await exampleCompleteIntegration(); // Requires full project setup

        console.log('\n✅ All examples completed successfully!\n');
    } catch (error) {
        console.error('\n❌ Example failed:', error.message);
        console.error(error.stack);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllExamples();
}

export {
    exampleLazyLoading,
    exampleCaching,
    exampleMonitoring,
    exampleCompleteIntegration,
    exampleCustomCache,
    exampleBenchmarking
};

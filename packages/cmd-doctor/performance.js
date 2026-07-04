import { performance } from 'perf_hooks';
import parseScriptsMd from '@fsr/core/parsers/parseScriptsMd.js';

/**
 * Check startup time
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkStartupTime(options = {}) {
    const result = {
        name: 'Startup time',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: false,
        fix: null
    };

    try {
        // Calculate startup time from process start
        const startupTime = performance.now();
        const targetTime = 500; // 500ms — realistic floor for a bundled Node CLI

        result.details = {
            time: startupTime,
            target: targetTime,
            unit: 'ms'
        };

        if (startupTime <= targetTime) {
            result.passed = true;
            result.message = `${startupTime.toFixed(2)}ms (target: <${targetTime}ms)`;
        } else if (startupTime <= targetTime * 2) {
            result.passed = true;
            result.warning = true;
            result.message = `${startupTime.toFixed(2)}ms (slightly above target of ${targetTime}ms)`;
        } else {
            result.passed = false;
            result.message = `${startupTime.toFixed(2)}ms (target: <${targetTime}ms)`;
            result.fixInstructions = 'Consider clearing cache or reducing number of plugins/hooks.';
        }
    } catch (error) {
        result.passed = false;
        result.message = `Failed to check startup time: ${error.message}`;
    }

    return result;
}

/**
 * Check memory usage
 * @param {Object} options - Check options
 * @returns {Object} Check result
 */
export async function checkMemoryUsage(options = {}) {
    const result = {
        name: 'Memory usage',
        passed: false,
        warning: false,
        message: '',
        details: {},
        canFix: false,
        fix: null
    };

    try {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
        const externalMB = Math.round((usage.external / 1024 / 1024) * 100) / 100;
        const totalMB = heapUsedMB + externalMB;
        const targetMB = 50; // 50MB target

        result.details = {
            heapUsed: heapUsedMB,
            external: externalMB,
            total: totalMB,
            unit: 'MB',
            raw: usage
        };

        if (totalMB <= targetMB) {
            result.passed = true;
            result.message = `${totalMB}MB (target: <${targetMB}MB)`;
        } else if (totalMB <= targetMB * 1.5) {
            result.passed = true;
            result.warning = true;
            result.message = `${totalMB}MB (slightly above target of ${targetMB}MB)`;
        } else {
            result.passed = false;
            result.message = `${totalMB}MB (target: <${targetMB}MB)`;
            result.fixInstructions = 'Memory usage is high. Consider optimizing dependencies or clearing cache.';
        }
    } catch (error) {
        result.passed = false;
        result.message = `Failed to check memory usage: ${error.message}`;
    }

    return result;
}

/**
 * Run performance benchmark
 * @param {Object} options - Benchmark options
 * @returns {Object} Benchmark result
 */
export async function runBenchmark(options = {}) {
    const runs = options.runs || 5;
    const results = [];

    for (let i = 0; i < runs; i++) {
        const start = performance.now();
        await parseScriptsMd({ useCache: false });
        results.push(performance.now() - start);
    }

    const sorted = [...results].sort((a, b) => a - b);
    const avg = results.reduce((a, b) => a + b, 0) / results.length;

    return {
        average: avg,
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        runs,
        results
    };
}

export default {
    checkStartupTime,
    checkMemoryUsage,
    runBenchmark
};

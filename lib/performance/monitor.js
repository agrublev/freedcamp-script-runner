/**
 * Performance Monitoring System for FSCR v7.0.0
 *
 * Tracks startup time, memory usage, and command execution performance.
 * Provides utilities for benchmarking and regression detection.
 */

import { performance } from 'perf_hooks';

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            startup: {
                startTime: 0,
                endTime: 0,
                duration: 0
            },
            memory: {
                initial: null,
                current: null,
                peak: null
            },
            commands: new Map(),
            cache: {
                hits: 0,
                misses: 0
            }
        };
        this.timers = new Map();
    }

    /**
     * Mark startup beginning
     */
    startupBegin() {
        this.metrics.startup.startTime = performance.now();
        this.metrics.memory.initial = process.memoryUsage();
    }

    /**
     * Mark startup completion
     */
    startupEnd() {
        this.metrics.startup.endTime = performance.now();
        this.metrics.startup.duration =
            this.metrics.startup.endTime - this.metrics.startup.startTime;
        this.updateMemory();
    }

    /**
     * Start a named timer
     */
    startTimer(name) {
        this.timers.set(name, performance.now());
    }

    /**
     * End a named timer and return duration
     */
    endTimer(name) {
        const startTime = this.timers.get(name);
        if (!startTime) {
            return 0;
        }

        const duration = performance.now() - startTime;
        this.timers.delete(name);
        return duration;
    }

    /**
     * Track command execution
     */
    trackCommand(commandName, duration, success = true) {
        if (!this.metrics.commands.has(commandName)) {
            this.metrics.commands.set(commandName, {
                executions: 0,
                totalTime: 0,
                avgTime: 0,
                minTime: Infinity,
                maxTime: 0,
                failures: 0
            });
        }

        const stats = this.metrics.commands.get(commandName);
        stats.executions++;
        stats.totalTime += duration;
        stats.avgTime = stats.totalTime / stats.executions;
        stats.minTime = Math.min(stats.minTime, duration);
        stats.maxTime = Math.max(stats.maxTime, duration);

        if (!success) {
            stats.failures++;
        }
    }

    /**
     * Update current memory usage
     */
    updateMemory() {
        const current = process.memoryUsage();
        this.metrics.memory.current = current;

        if (!this.metrics.memory.peak) {
            this.metrics.memory.peak = { ...current };
        } else {
            // Update peak values
            for (const key of Object.keys(current)) {
                if (current[key] > this.metrics.memory.peak[key]) {
                    this.metrics.memory.peak[key] = current[key];
                }
            }
        }
    }

    /**
     * Get memory delta from startup
     */
    getMemoryDelta() {
        if (!this.metrics.memory.initial || !this.metrics.memory.current) {
            return null;
        }

        const initial = this.metrics.memory.initial;
        const current = this.metrics.memory.current;

        return {
            heapUsed: current.heapUsed - initial.heapUsed,
            heapTotal: current.heapTotal - initial.heapTotal,
            external: current.external - initial.external,
            rss: current.rss - initial.rss
        };
    }

    /**
     * Format bytes to human-readable size
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        if (bytes < 0) return '-' + this._formatBytes(-bytes);

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    /**
     * Get comprehensive performance report
     */
    getReport() {
        this.updateMemory();

        const report = {
            startup: {
                duration: this.metrics.startup.duration.toFixed(2) + 'ms',
                target: '<50ms',
                status: this.metrics.startup.duration < 50 ? '✓ PASS' : '✗ FAIL'
            },
            memory: {
                initial: {
                    heapUsed: this._formatBytes(this.metrics.memory.initial?.heapUsed || 0),
                    heapTotal: this._formatBytes(this.metrics.memory.initial?.heapTotal || 0),
                    external: this._formatBytes(this.metrics.memory.initial?.external || 0)
                },
                current: {
                    heapUsed: this._formatBytes(this.metrics.memory.current?.heapUsed || 0),
                    heapTotal: this._formatBytes(this.metrics.memory.current?.heapTotal || 0),
                    external: this._formatBytes(this.metrics.memory.current?.external || 0)
                },
                peak: {
                    heapUsed: this._formatBytes(this.metrics.memory.peak?.heapUsed || 0),
                    heapTotal: this._formatBytes(this.metrics.memory.peak?.heapTotal || 0),
                    external: this._formatBytes(this.metrics.memory.peak?.external || 0)
                },
                delta: this.getMemoryDelta() ? {
                    heapUsed: this._formatBytes(this.getMemoryDelta().heapUsed),
                    heapTotal: this._formatBytes(this.getMemoryDelta().heapTotal),
                    external: this._formatBytes(this.getMemoryDelta().external)
                } : null,
                targets: {
                    heapUsed: '<35MB',
                    external: '<8MB'
                }
            },
            commands: {},
            cache: this.metrics.cache
        };

        // Add command stats
        for (const [name, stats] of this.metrics.commands.entries()) {
            report.commands[name] = {
                executions: stats.executions,
                avgTime: stats.avgTime.toFixed(2) + 'ms',
                minTime: stats.minTime.toFixed(2) + 'ms',
                maxTime: stats.maxTime.toFixed(2) + 'ms',
                failures: stats.failures,
                successRate: ((stats.executions - stats.failures) / stats.executions * 100).toFixed(1) + '%'
            };
        }

        return report;
    }

    /**
     * Print performance report to console
     */
    printReport() {
        const report = this.getReport();

        console.log('\n═══════════════════════════════════════════════════');
        console.log('           FSCR v7.0.0 Performance Report');
        console.log('═══════════════════════════════════════════════════\n');

        console.log('STARTUP PERFORMANCE:');
        console.log(`  Duration: ${report.startup.duration} (target: ${report.startup.target})`);
        console.log(`  Status: ${report.startup.status}\n`);

        console.log('MEMORY USAGE:');
        console.log('  Current:');
        console.log(`    Heap: ${report.memory.current.heapUsed} / ${report.memory.current.heapTotal}`);
        console.log(`    External: ${report.memory.current.external}`);
        console.log('  Targets:');
        console.log(`    Heap: ${report.memory.targets.heapUsed}`);
        console.log(`    External: ${report.memory.targets.external}\n`);

        if (Object.keys(report.commands).length > 0) {
            console.log('COMMAND STATISTICS:');
            for (const [name, stats] of Object.entries(report.commands)) {
                console.log(`  ${name}:`);
                console.log(`    Executions: ${stats.executions}`);
                console.log(`    Avg Time: ${stats.avgTime}`);
                console.log(`    Success Rate: ${stats.successRate}`);
            }
            console.log('');
        }

        console.log('═══════════════════════════════════════════════════\n');
    }

    /**
     * Check if targets are met
     */
    checkTargets() {
        const report = this.getReport();
        const startupOk = this.metrics.startup.duration < 50;
        const heapOk = this.metrics.memory.current.heapUsed < 35 * 1024 * 1024;
        const externalOk = this.metrics.memory.current.external < 8 * 1024 * 1024;

        return {
            startup: startupOk,
            heap: heapOk,
            external: externalOk,
            allPassed: startupOk && heapOk && externalOk
        };
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics = {
            startup: { startTime: 0, endTime: 0, duration: 0 },
            memory: { initial: null, current: null, peak: null },
            commands: new Map(),
            cache: { hits: 0, misses: 0 }
        };
        this.timers.clear();
    }
}

// Singleton instance
let monitorInstance = null;

export function getMonitor() {
    if (!monitorInstance) {
        monitorInstance = new PerformanceMonitor();
    }
    return monitorInstance;
}

export function startupBegin() {
    getMonitor().startupBegin();
}

export function startupEnd() {
    getMonitor().startupEnd();
}

export function trackCommand(name, duration, success) {
    getMonitor().trackCommand(name, duration, success);
}

export function getPerformanceReport() {
    return getMonitor().getReport();
}

export function printPerformanceReport() {
    getMonitor().printReport();
}

export default PerformanceMonitor;

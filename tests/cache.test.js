/**
 * Cache Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, getCache, resetCache } from '../lib/cache/index.js';
import FileWatcher from '../lib/cache/file-watcher.js';
import CacheMonitor from '../lib/cache/monitor.js';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('CacheManager', () => {
    let cache;

    beforeEach(() => {
        cache = new CacheManager({
            defaultTTL: 1000, // 1 second for testing
            maxSize: 5
        });
    });

    afterEach(() => {
        cache.destroy();
    });

    describe('Basic Operations', () => {
        it('should set and get values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('should return null for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeNull();
        });

        it('should invalidate entries', () => {
            cache.set('key1', 'value1');
            expect(cache.invalidate('key1')).toBe(true);
            expect(cache.get('key1')).toBeNull();
        });

        it('should clear all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.size()).toBe(0);
        });

        it('should check if key exists', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
            expect(cache.has('key2')).toBe(false);
        });

        it('should get all keys', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            const keys = cache.keys();
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys.length).toBe(2);
        });
    });

    describe('TTL Expiration', () => {
        it('should expire entries after TTL', async () => {
            cache.set('key1', 'value1', { ttl: 100 });
            expect(cache.get('key1')).toBe('value1');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));

            expect(cache.get('key1')).toBeNull();
        });

        it('should not expire entries with TTL of 0', async () => {
            cache.set('key1', 'value1', { ttl: 0 });
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(cache.get('key1')).toBe('value1');
        });

        it('should validate entry freshness', () => {
            cache.set('key1', 'value1');
            expect(cache.isValid('key1')).toBe(true);
        });

        it('should invalidate expired entries on isValid check', async () => {
            cache.set('key1', 'value1', { ttl: 50 });
            await new Promise(resolve => setTimeout(resolve, 100));
            expect(cache.isValid('key1')).toBe(false);
        });
    });

    describe('Size Management', () => {
        it('should enforce max size', () => {
            // Add 6 entries (max is 5)
            for (let i = 1; i <= 6; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            expect(cache.size()).toBe(5);
        });

        it('should evict oldest entry when full', () => {
            for (let i = 1; i <= 5; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            // This should evict key1 (oldest)
            cache.set('key6', 'value6');

            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key6')).toBe('value6');
        });
    });

    describe('Statistics', () => {
        it('should track hits and misses', () => {
            cache.set('key1', 'value1');

            cache.get('key1'); // Hit
            cache.get('key2'); // Miss
            cache.get('key1'); // Hit

            const stats = cache.getStats();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
        });

        it('should calculate hit rate', () => {
            cache.set('key1', 'value1');

            cache.get('key1'); // Hit
            cache.get('key2'); // Miss

            const stats = cache.getStats();
            expect(parseFloat(stats.hitRate)).toBe(50);
        });

        it('should track invalidations', () => {
            cache.set('key1', 'value1');
            cache.invalidate('key1');

            const stats = cache.getStats();
            expect(stats.invalidations).toBe(1);
        });

        it('should reset statistics', () => {
            cache.set('key1', 'value1');
            cache.get('key1');

            cache.resetStats();
            const stats = cache.getStats();

            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(0);
        });
    });

    describe('File-based Caching', () => {
        const testDir = join(process.cwd(), 'tests', '.cache-test');
        const testFile = join(testDir, 'test.txt');

        beforeEach(() => {
            if (!existsSync(testDir)) {
                mkdirSync(testDir, { recursive: true });
            }
            writeFileSync(testFile, 'initial content');
        });

        afterEach(() => {
            try {
                if (existsSync(testFile)) unlinkSync(testFile);
            } catch (e) {
                // Ignore
            }
        });

        it('should generate file-based cache keys', () => {
            const key = cache.generateFileKey(testFile);
            expect(typeof key).toBe('string');
            expect(key.length).toBeGreaterThan(0);
        });

        it('should cache file-based data', () => {
            const key = cache.generateFileKey(testFile);
            cache.set(key, 'cached data', { filePath: testFile });

            expect(cache.get(key)).toBe('cached data');
        });

        it('should invalidate when file changes', async () => {
            const key = cache.generateFileKey(testFile);
            cache.set(key, 'cached data', { filePath: testFile });

            // Modify file
            await new Promise(resolve => setTimeout(resolve, 10));
            writeFileSync(testFile, 'new content');

            // Cache should be invalidated
            expect(cache.get(key)).toBeNull();
        });

        it('should invalidate all entries for a file', () => {
            cache.set('key1', 'data1', { filePath: testFile });
            cache.set('key2', 'data2', { filePath: testFile });
            cache.set('key3', 'data3', { filePath: '/other/file.txt' });

            const count = cache.invalidateFile(testFile);
            expect(count).toBe(2);
            expect(cache.get('key3')).toBe('data3');
        });
    });

    describe('Events', () => {
        it('should emit set event', () => {
            const handler = vi.fn();
            cache.on('set', handler);

            cache.set('key1', 'value1');

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: 'key1',
                    data: 'value1'
                })
            );
        });

        it('should emit invalidate event', () => {
            const handler = vi.fn();
            cache.on('invalidate', handler);

            cache.set('key1', 'value1');
            cache.invalidate('key1');

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'key1' })
            );
        });

        it('should emit evict event when cache is full', () => {
            const handler = vi.fn();
            cache.on('evict', handler);

            for (let i = 1; i <= 6; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            expect(handler).toHaveBeenCalled();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup expired entries', async () => {
            cache.set('key1', 'value1', { ttl: 50 });
            cache.set('key2', 'value2', { ttl: 0 });

            await new Promise(resolve => setTimeout(resolve, 100));

            const cleaned = cache._cleanup();
            expect(cleaned).toBe(1);
            expect(cache.get('key2')).toBe('value2');
        });

        it('should emit cleanup event', async () => {
            const handler = vi.fn();
            cache.on('cleanup', handler);

            cache.set('key1', 'value1', { ttl: 50 });
            await new Promise(resolve => setTimeout(resolve, 100));

            cache._cleanup();
            expect(handler).toHaveBeenCalled();
        });
    });
});

describe('Global Cache Instance', () => {
    afterEach(() => {
        resetCache();
    });

    it('should return singleton instance', () => {
        const cache1 = getCache();
        const cache2 = getCache();
        expect(cache1).toBe(cache2);
    });

    it('should reset global instance', () => {
        const cache1 = getCache();
        resetCache();
        const cache2 = getCache();
        expect(cache1).not.toBe(cache2);
    });
});

describe('FileWatcher', () => {
    let cache;
    let watcher;
    const testDir = join(process.cwd(), 'tests', '.cache-test');
    const testFile = join(testDir, 'watch.txt');

    beforeEach(() => {
        cache = new CacheManager();
        watcher = new FileWatcher(cache);

        if (!existsSync(testDir)) {
            mkdirSync(testDir, { recursive: true });
        }
        writeFileSync(testFile, 'initial');
    });

    afterEach(() => {
        watcher.destroy();
        cache.destroy();
        try {
            if (existsSync(testFile)) unlinkSync(testFile);
        } catch (e) {
            // Ignore
        }
    });

    it('should watch a file', () => {
        watcher.watch(testFile);
        expect(watcher.isWatching(testFile)).toBe(true);
    });

    it('should unwatch a file', () => {
        watcher.watch(testFile);
        watcher.unwatch(testFile);
        expect(watcher.isWatching(testFile)).toBe(false);
    });

    it('should invalidate cache on file change', async () => {
        cache.set('key1', 'data1', { filePath: testFile });
        watcher.watch(testFile);

        const handler = vi.fn();
        watcher.on('invalidate', handler);

        // Modify file
        await new Promise(resolve => setTimeout(resolve, 50));
        writeFileSync(testFile, 'modified');

        // Wait for debounce
        await new Promise(resolve => setTimeout(resolve, 200));

        expect(handler).toHaveBeenCalled();
    });

    it('should track statistics', () => {
        watcher.watch(testFile);
        const stats = watcher.getStats();

        expect(stats.filesWatched).toBe(1);
        expect(stats.watchedFiles).toContain(testFile);
    });

    it('should unwatch all files', () => {
        watcher.watch(testFile);
        watcher.unwatchAll();

        const stats = watcher.getStats();
        expect(stats.filesWatched).toBe(0);
    });
});

describe('CacheMonitor', () => {
    let cache;
    let monitor;

    beforeEach(() => {
        cache = new CacheManager();
        monitor = new CacheMonitor(cache);
    });

    afterEach(() => {
        cache.destroy();
    });

    it('should record cold cache times', () => {
        monitor.recordColdCache(500);
        monitor.recordColdCache(450);

        const stats = monitor.getStats();
        expect(stats.performance.avgColdTime).toBe(475);
    });

    it('should record warm cache times', () => {
        monitor.recordWarmCache(50);
        monitor.recordWarmCache(45);

        const stats = monitor.getStats();
        expect(Math.round(stats.performance.avgWarmTime)).toBe(48);
    });

    it('should calculate speedup', () => {
        monitor.recordColdCache(450);
        monitor.recordWarmCache(45);

        const stats = monitor.getStats();
        expect(parseFloat(stats.performance.speedup)).toBe(10);
    });

    it('should get comprehensive stats', () => {
        cache.set('key1', 'value1');
        cache.get('key1');

        const stats = monitor.getStats();

        expect(stats).toHaveProperty('cache');
        expect(stats).toHaveProperty('performance');
        expect(stats.cache.hits).toBe(1);
    });

    it('should export JSON stats', () => {
        const json = monitor.toJSON();
        const parsed = JSON.parse(json);

        expect(parsed).toHaveProperty('cache');
        expect(parsed).toHaveProperty('performance');
    });

    it('should reset metrics', () => {
        monitor.recordColdCache(500);
        monitor.resetMetrics();

        const stats = monitor.getStats();
        expect(stats.performance.coldCacheSamples).toBe(0);
    });
});

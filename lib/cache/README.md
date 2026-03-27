# FSCR Cache System

Smart caching system with TTL support, automatic invalidation, and performance monitoring for FSCR v7.0.0.

## Features

- **In-memory caching** with configurable TTL
- **File-based invalidation** using modification time tracking
- **Automatic file watching** for cache invalidation on changes
- **Performance monitoring** with hit rate tracking
- **Size management** with LRU eviction
- **Event system** for cache lifecycle hooks
- **CLI commands** for cache management

## Quick Start

### Using the Cache

The cache is automatically used when parsing scripts:

```javascript
import parseScriptFile from './lib/parsers/parseScriptsMd.js';

// Uses cache by default
const scripts = await parseScriptFile();

// Disable cache for specific call
const scripts = await parseScriptFile({ useCache: false });
```

### CLI Commands

```bash
# Show cache statistics
fsr cache stats

# Show verbose statistics
fsr cache stats --verbose

# Clear all cache entries
fsr cache clear

# List cached entries
fsr cache list

# List with custom limit
fsr cache list --limit 20

# Run performance benchmark
fsr cache benchmark

# Export statistics to JSON
fsr cache export --output stats.json
```

## Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Cold cache | ~450ms | 450-500ms |
| Warm cache | ~45ms | 40-50ms |
| Speedup | 10x | 10-12x |
| Hit rate | >80% | 85-95% |

## Architecture

### Core Components

1. **CacheManager** (`lib/cache/index.js`)
   - In-memory cache with TTL support
   - File-based cache key generation
   - Automatic expiration and cleanup
   - Statistics tracking

2. **FileWatcher** (`lib/cache/file-watcher.js`)
   - Monitors files for changes
   - Automatic cache invalidation
   - Debounced event handling

3. **CacheMonitor** (`lib/cache/monitor.js`)
   - Performance metrics collection
   - Statistics display and reporting
   - Hit rate calculation

4. **Hash Utilities** (`lib/utils/hash.js`)
   - Cache key generation
   - File metadata tracking
   - Content hashing

## API Reference

### CacheManager

```javascript
import { CacheManager, getCache } from './lib/cache/index.js';

// Create a new cache instance
const cache = new CacheManager({
    defaultTTL: 300000,  // 5 minutes
    maxSize: 100,
    enableStats: true
});

// Use global singleton
const cache = getCache();

// Set a value
cache.set('key', data, {
    ttl: 60000,           // Optional custom TTL
    filePath: '/path/to/file.txt'  // Optional file tracking
});

// Get a value
const data = cache.get('key');  // Returns null if not found or expired

// Invalidate an entry
cache.invalidate('key');

// Invalidate all entries for a file
cache.invalidateFile('/path/to/file.txt');

// Clear all entries
cache.clear();

// Check if valid
cache.isValid('key');

// Get statistics
const stats = cache.getStats();
```

### FileWatcher

```javascript
import FileWatcher from './lib/cache/file-watcher.js';
import { getCache } from './lib/cache/index.js';

const cache = getCache();
const watcher = new FileWatcher(cache);

// Watch a file
watcher.watch('/path/to/file.txt');

// Unwatch a file
watcher.unwatch('/path/to/file.txt');

// Check if watching
watcher.isWatching('/path/to/file.txt');

// Get statistics
const stats = watcher.getStats();

// Cleanup
watcher.destroy();
```

### CacheMonitor

```javascript
import CacheMonitor from './lib/cache/monitor.js';
import { getCache } from './lib/cache/index.js';

const cache = getCache();
const monitor = new CacheMonitor(cache);

// Record performance
monitor.recordColdCache(450);  // 450ms
monitor.recordWarmCache(45);   // 45ms

// Get statistics
const stats = monitor.getStats();

// Print to console
monitor.printStats({ verbose: true });

// Export as JSON
const json = monitor.toJSON();
```

## Cache Configuration

Default configuration:

```javascript
{
    defaultTTL: 300000,      // 5 minutes
    maxSize: 100,            // Maximum entries
    enableStats: true        // Track statistics
}
```

### Environment Variables

```bash
# Disable cache globally
FSCR_CACHE_ENABLED=false

# Custom TTL (milliseconds)
FSCR_CACHE_TTL=600000

# Custom max size
FSCR_CACHE_MAX_SIZE=200
```

## Cache Invalidation

### Automatic Invalidation

1. **TTL Expiration**: Entries expire after configured TTL
2. **File Changes**: Monitored files trigger invalidation
3. **Size Limits**: LRU eviction when cache is full

### Manual Invalidation

```javascript
import { getCache } from './lib/cache/index.js';

const cache = getCache();

// Invalidate specific entry
cache.invalidate('key');

// Invalidate by file path
cache.invalidateFile('/path/to/fscripts.md');

// Clear all
cache.clear();
```

## Events

The cache emits events for lifecycle hooks:

```javascript
cache.on('set', ({ key, data, ttl }) => {
    console.log(`Cache set: ${key}`);
});

cache.on('hit', ({ key, data }) => {
    console.log(`Cache hit: ${key}`);
});

cache.on('invalidate', ({ key }) => {
    console.log(`Cache invalidated: ${key}`);
});

cache.on('evict', ({ key }) => {
    console.log(`Cache evicted: ${key}`);
});

cache.on('cleanup', ({ count }) => {
    console.log(`Cleaned ${count} expired entries`);
});
```

## Testing

### Unit Tests

```bash
# Run all cache tests
npm test tests/cache.test.js

# Run with coverage
npm test -- --coverage tests/cache.test.js
```

### Benchmarks

```bash
# Run performance benchmarks
node tests/cache.bench.js

# Via CLI
fsr cache benchmark
```

## Memory Usage

Typical memory usage per cache entry:

- Small entry (task metadata): ~1-2KB
- Medium entry (parsed script): ~3-5KB
- Large entry (full fscripts.md): ~10-20KB

For 100 cached entries: ~500KB - 2MB

## Troubleshooting

### Cache Not Working

1. Check if cache is enabled:
   ```javascript
   const cache = getCache();
   console.log(cache.size());  // Should be > 0 after use
   ```

2. Verify file watching:
   ```javascript
   const stats = watcher.getStats();
   console.log(stats.filesWatched);
   ```

3. Check hit rate:
   ```bash
   fsr cache stats
   ```

### Low Hit Rate

- Increase TTL if files don't change often
- Check for frequent file modifications
- Verify cache size is sufficient

### High Memory Usage

- Reduce `maxSize` configuration
- Decrease `defaultTTL` for faster cleanup
- Monitor with `cache.getStats()`

## Best Practices

1. **Use default settings** for most cases
2. **Enable file watching** for automatic invalidation
3. **Monitor hit rate** to verify cache effectiveness
4. **Clear cache** after bulk file operations
5. **Use TTL of 0** for data that rarely changes
6. **Benchmark** to verify 10x speedup target

## Future Enhancements

- [ ] Persistent cache (Redis/SQLite)
- [ ] Cache warming on startup
- [ ] Distributed cache support
- [ ] Cache compression
- [ ] Smart preloading based on patterns
- [ ] Cache metrics dashboard

## License

MIT

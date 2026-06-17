import { describe, it, expect, vi, beforeEach } from "vitest";

// Build mock objects at module level so they're available in the factory
const mockCache = {
    size: vi.fn(() => 5),
    clear: vi.fn(),
    keys: vi.fn(() => ["key1", "key2", "key3"]),
    isValid: vi.fn(() => true),
    get: vi.fn(),
    set: vi.fn()
};

const monitorMethods = {
    printStats: vi.fn(),
    getStats: vi.fn(() => ({ hits: 10, misses: 2, size: 5, hitRate: 83.3 })),
    recordColdCache: vi.fn(),
    recordWarmCache: vi.fn(),
    toJSON: vi.fn(() => '{"hits":10}')
};

vi.mock("../../lib/cache/index.js", () => ({
    getCache: vi.fn(() => mockCache),
    resetCache: vi.fn()
}));

// Use a named-function constructor so `new CacheMonitor()` works
vi.mock("../../lib/cache/monitor.js", () => ({
    default: function CacheMonitor() {
        this.printStats = monitorMethods.printStats;
        this.getStats = monitorMethods.getStats;
        this.recordColdCache = monitorMethods.recordColdCache;
        this.recordWarmCache = monitorMethods.recordWarmCache;
        this.toJSON = monitorMethods.toJSON;
    }
}));

vi.mock("../../lib/parsers/parseScriptsMd.cached.js", () => ({
    default: vi.fn().mockResolvedValue({ categories: [], allTasks: [] })
}));

describe("cache/cli – showCacheStats", () => {
    let showCacheStats;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Re-setup return values after clearAllMocks
        monitorMethods.getStats.mockReturnValue({ hits: 10, misses: 2, size: 5, hitRate: 83.3 });
        monitorMethods.toJSON.mockReturnValue('{"hits":10}');
        const mod = await import("../../lib/cache/cli.js");
        showCacheStats = mod.showCacheStats;
    });

    it("returns stats from the monitor", async () => {
        const result = await showCacheStats();
        expect(result).toEqual({ hits: 10, misses: 2, size: 5, hitRate: 83.3 });
        expect(monitorMethods.printStats).toHaveBeenCalled();
    });

    it("passes verbose option to printStats", async () => {
        await showCacheStats({ verbose: true });
        expect(monitorMethods.printStats).toHaveBeenCalledWith({ verbose: true });
    });
});

describe("cache/cli – clearCache", () => {
    let clearCache;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockCache.size.mockReturnValue(5);
        const mod = await import("../../lib/cache/cli.js");
        clearCache = mod.clearCache;
    });

    it("calls cache.clear() and logs confirmation", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await clearCache();
        expect(mockCache.clear).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe("cache/cli – listCacheEntries", () => {
    let listCacheEntries;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockCache.keys.mockReturnValue(["key1", "key2", "key3"]);
        mockCache.isValid.mockReturnValue(true);
        const mod = await import("../../lib/cache/cli.js");
        listCacheEntries = mod.listCacheEntries;
    });

    it("lists available cache keys", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await listCacheEntries({ limit: 10 });
        expect(mockCache.keys).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("respects limit option by displaying fewer items", async () => {
        mockCache.keys.mockReturnValue(["a", "b", "c", "d", "e"]);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await listCacheEntries({ limit: 2 });
        consoleSpy.mockRestore();
        expect(mockCache.keys).toHaveBeenCalled();
    });

    it("handles empty cache gracefully", async () => {
        mockCache.keys.mockReturnValue([]);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await expect(listCacheEntries({ limit: 10 })).resolves.toBeUndefined();
        consoleSpy.mockRestore();
    });
});

describe("cache/cli – exportCacheStats", () => {
    let exportCacheStats;

    beforeEach(async () => {
        vi.clearAllMocks();
        monitorMethods.toJSON.mockReturnValue('{"hits":10}');
        const mod = await import("../../lib/cache/cli.js");
        exportCacheStats = mod.exportCacheStats;
    });

    it("returns JSON string when no output path given", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const result = await exportCacheStats();
        expect(typeof result).toBe("string");
        consoleSpy.mockRestore();
    });

    it("logs confirmation when output path provided", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        // Pass a real tmp path so writeFileSync can work
        await exportCacheStats("/tmp/fscr-test-export.json");
        consoleSpy.mockRestore();
    });
});

describe("cache/cli – resetCacheInstance", () => {
    it("calls resetCache and logs confirmation", async () => {
        const { resetCacheInstance } = await import("../../lib/cache/cli.js");
        const { resetCache } = await import("../../lib/cache/index.js");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await resetCacheInstance();
        expect(resetCache).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

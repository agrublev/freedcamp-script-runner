/**
 * Plugin System Integration Tests
 * FSCR v7.0.0 - End-to-end plugin system testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManager } from '../src/lib/plugins.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Test utilities
const createTestLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn()
});

const createTestCache = () => ({
  data: new Map(),
  get(key) { return this.data.get(key); },
  set(key, value) { this.data.set(key, value); },
  has(key) { return this.data.has(key); },
  delete(key) { return this.data.delete(key); },
  clear() { this.data.clear(); },
  size() { return this.data.size; }
});

describe('Plugin System Integration', () => {
  let testDir;
  let pluginManager;
  let logger;
  let cache;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `fscr-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    logger = createTestLogger();
    cache = createTestCache();

    pluginManager = new PluginManager(
      {
        pluginsDir: join(testDir, '.fscr/plugins'),
        autoDiscover: false,
        enabledPlugins: []
      },
      logger,
      cache,
      testDir,
      '7.0.0'
    );
  });

  afterEach(async () => {
    // Cleanup
    await pluginManager.shutdown();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Plugin Loading', () => {
    it('should load a valid plugin', async () => {
      // Create test plugin
      const pluginDir = join(testDir, '.fscr/plugins/test-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'test-plugin',
          version: '1.0.0',
          async init(context) {
            context.logger.info('Plugin initialized');
          }
        };
        `
      );

      const result = await pluginManager.loadPlugin('test-plugin');

      expect(result.enabled).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.plugin.name).toBe('test-plugin');
      expect(result.loadTime).toBeGreaterThan(0);
    });

    it('should reject plugin with invalid structure', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/invalid-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'invalid-plugin'
          // Missing version and init
        };
        `
      );

      const result = await pluginManager.loadPlugin('invalid-plugin');

      expect(result.enabled).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should check version compatibility', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/version-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'version-plugin',
          version: '1.0.0',
          minFscrVersion: '8.0.0', // Requires newer FSCR
          async init() {}
        };
        `
      );

      const result = await pluginManager.loadPlugin('version-plugin');

      expect(result.enabled).toBe(false);
      expect(result.error?.message).toContain('requires FSCR >= 8.0.0');
    });
  });

  describe('Command Registration', () => {
    it('should register commands from plugins', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/cmd-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'cmd-plugin',
          version: '1.0.0',
          async init(context) {
            context.registerCommand({
              name: 'test-cmd',
              description: 'Test command',
              handler: async (opts, ctx) => {
                ctx.logger.success('Command executed');
              }
            });
          }
        };
        `
      );

      await pluginManager.loadPlugin('cmd-plugin');

      const commands = pluginManager.getCommands();
      expect(commands.has('test-cmd')).toBe(true);
      expect(commands.get('test-cmd').pluginName).toBe('cmd-plugin');
    });

    it('should prevent duplicate command names', async () => {
      const plugin1Dir = join(testDir, '.fscr/plugins/plugin1');
      const plugin2Dir = join(testDir, '.fscr/plugins/plugin2');

      await mkdir(plugin1Dir, { recursive: true });
      await mkdir(plugin2Dir, { recursive: true });

      const pluginCode = (name) => `
        export default {
          name: '${name}',
          version: '1.0.0',
          async init(context) {
            context.registerCommand({
              name: 'duplicate',
              handler: async () => {}
            });
          }
        };
      `;

      await writeFile(join(plugin1Dir, 'index.js'), pluginCode('plugin1'));
      await writeFile(join(plugin2Dir, 'index.js'), pluginCode('plugin2'));

      await pluginManager.loadPlugin('plugin1');
      const result = await pluginManager.loadPlugin('plugin2');

      expect(result.enabled).toBe(false);
      expect(result.error?.message).toContain('already registered');
    });
  });

  describe('Hook System', () => {
    it('should register and execute hooks', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/hook-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'hook-plugin',
          version: '1.0.0',
          async init(context) {
            context.registerHook('pre-task', async (data, ctx) => {
              ctx.logger.info('Hook executed: ' + data.taskName);
            });
          }
        };
        `
      );

      await pluginManager.loadPlugin('hook-plugin');

      const hookManager = pluginManager.getHookManager();
      expect(hookManager.hasHooks('pre-task')).toBe(true);

      const result = await hookManager.execute('pre-task', {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      });

      expect(result.executedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Hook executed: test')
      );
    });

    it('should execute hooks in priority order', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/priority-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        const order = [];
        export default {
          name: 'priority-plugin',
          version: '1.0.0',
          async init(context) {
            context.registerHook('pre-task', () => {
              context.logger.info('low');
            }, { priority: 'low' });

            context.registerHook('pre-task', () => {
              context.logger.info('high');
            }, { priority: 'high' });

            context.registerHook('pre-task', () => {
              context.logger.info('normal');
            }, { priority: 'normal' });
          }
        };
        `
      );

      await pluginManager.loadPlugin('priority-plugin');

      const hookManager = pluginManager.getHookManager();
      await hookManager.execute('pre-task', {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      });

      const calls = logger.info.mock.calls.map(call => call[0]);
      const hookCalls = calls.filter(c => c.includes('high') || c.includes('normal') || c.includes('low'));

      // Should be executed in order: high, normal, low
      expect(hookCalls[0]).toContain('high');
      expect(hookCalls[1]).toContain('normal');
      expect(hookCalls[2]).toContain('low');
    });
  });

  describe('Plugin Storage', () => {
    it('should persist data across hook executions', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/storage-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'storage-plugin',
          version: '1.0.0',
          async init(context) {
            const data = context.getStorage() || { count: 0 };

            context.registerHook('pre-task', () => {
              data.count++;
              context.setStorage(data);
              context.logger.info('Count: ' + data.count);
            });
          }
        };
        `
      );

      await pluginManager.loadPlugin('storage-plugin');

      const hookManager = pluginManager.getHookManager();
      const hookData = {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      };

      // Execute hook multiple times
      await hookManager.execute('pre-task', hookData);
      await hookManager.execute('pre-task', hookData);
      await hookManager.execute('pre-task', hookData);

      const calls = logger.info.mock.calls.map(call => call[0]);
      const countCalls = calls.filter(c => c.includes('Count:'));

      // Plugin logger prepends [plugin-name] to messages
      expect(countCalls.some(c => c.includes('Count: 1'))).toBe(true);
      expect(countCalls.some(c => c.includes('Count: 2'))).toBe(true);
      expect(countCalls.some(c => c.includes('Count: 3'))).toBe(true);
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should call destroy on unload', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/lifecycle-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'lifecycle-plugin',
          version: '1.0.0',
          async init(context) {
            context.logger.info('init');
          },
          async destroy() {
            console.log('destroy called');
          }
        };
        `
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await pluginManager.loadPlugin('lifecycle-plugin');
      await pluginManager.unloadPlugin('lifecycle-plugin');

      expect(consoleSpy).toHaveBeenCalledWith('destroy called');

      consoleSpy.mockRestore();
    });

    it('should execute shutdown hooks', async () => {
      const pluginDir = join(testDir, '.fscr/plugins/shutdown-plugin');
      await mkdir(pluginDir, { recursive: true });

      await writeFile(
        join(pluginDir, 'index.js'),
        `
        export default {
          name: 'shutdown-plugin',
          version: '1.0.0',
          async init(context) {
            context.registerHook('shutdown', (data, ctx) => {
              ctx.logger.info('Shutting down at: ' + data.timestamp);
            });
          }
        };
        `
      );

      await pluginManager.loadPlugin('shutdown-plugin');
      await pluginManager.shutdown();

      const shutdownCalls = logger.info.mock.calls.filter(
        call => call[0].includes('Shutting down')
      );

      expect(shutdownCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should track plugin statistics', async () => {
      const plugin1Dir = join(testDir, '.fscr/plugins/stats-plugin-1');
      const plugin2Dir = join(testDir, '.fscr/plugins/stats-plugin-2');

      await mkdir(plugin1Dir, { recursive: true });
      await mkdir(plugin2Dir, { recursive: true });

      const pluginCode = (name, cmdCount) => `
        export default {
          name: '${name}',
          version: '1.0.0',
          async init(context) {
            ${Array.from({ length: cmdCount }, (_, i) => `
              context.registerCommand({
                name: '${name}-cmd-${i}',
                handler: async () => {}
              });
            `).join('\n')}

            context.registerHook('pre-task', async () => {});
            context.registerHook('post-task', async () => {});
          }
        };
      `;

      await writeFile(join(plugin1Dir, 'index.js'), pluginCode('stats-plugin-1', 2));
      await writeFile(join(plugin2Dir, 'index.js'), pluginCode('stats-plugin-2', 3));

      await pluginManager.loadPlugin('stats-plugin-1');
      await pluginManager.loadPlugin('stats-plugin-2');

      const stats = pluginManager.getStats();

      expect(stats.totalPlugins).toBe(2);
      expect(stats.totalCommands).toBe(5); // 2 + 3
      expect(stats.totalHooks).toBe(4); // 2 hooks per plugin
    });
  });
});

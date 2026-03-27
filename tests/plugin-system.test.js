/**
 * Plugin System Tests
 * FSCR v7.0.0 - Comprehensive plugin and hook system tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookManager } from '../src/lib/hooks.js';
import { PluginManager } from '../src/lib/plugins.js';

// Mock logger
const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  success: vi.fn()
});

// Mock cache manager
const createMockCache = () => ({
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  size: vi.fn(() => 0)
});

// Mock plugin context
const createMockContext = () => ({
  version: '7.0.0',
  cwd: '/test',
  config: {},
  logger: createMockLogger(),
  cache: createMockCache(),
  registerCommand: vi.fn(),
  registerHook: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  getStorage: vi.fn(),
  setStorage: vi.fn()
});

describe('HookManager', () => {
  let hookManager;
  let context;

  beforeEach(() => {
    context = createMockContext();
    hookManager = new HookManager(context);
  });

  describe('Hook Registration', () => {
    it('should register a hook', () => {
      const handler = vi.fn();
      hookManager.register('pre-task', handler, 'test-plugin', 'normal');

      expect(hookManager.hasHooks('pre-task')).toBe(true);
      expect(hookManager.getHookCount('pre-task')).toBe(1);
    });

    it('should register multiple hooks for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      hookManager.register('pre-task', handler1, 'plugin1', 'normal');
      hookManager.register('pre-task', handler2, 'plugin2', 'normal');

      expect(hookManager.getHookCount('pre-task')).toBe(2);
    });

    it('should sort hooks by priority', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      hookManager.register('pre-task', handler1, 'plugin1', 'low');
      hookManager.register('pre-task', handler2, 'plugin2', 'highest');
      hookManager.register('pre-task', handler3, 'plugin3', 'normal');

      const hooks = hookManager.getAllHooks().get('pre-task');
      expect(hooks[0].priority).toBe('highest');
      expect(hooks[1].priority).toBe('normal');
      expect(hooks[2].priority).toBe('low');
    });
  });

  describe('Hook Execution', () => {
    it('should execute hooks in priority order', async () => {
      const executionOrder = [];

      const handler1 = vi.fn(() => executionOrder.push('low'));
      const handler2 = vi.fn(() => executionOrder.push('high'));
      const handler3 = vi.fn(() => executionOrder.push('normal'));

      hookManager.register('pre-task', handler1, 'plugin1', 'low');
      hookManager.register('pre-task', handler2, 'plugin2', 'high');
      hookManager.register('pre-task', handler3, 'plugin3', 'normal');

      const data = {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      };

      await hookManager.execute('pre-task', data);

      expect(executionOrder).toEqual(['high', 'normal', 'low']);
    });

    it('should execute async hooks', async () => {
      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      hookManager.register('pre-task', handler, 'test-plugin', 'normal');

      const data = {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      };

      const result = await hookManager.execute('pre-task', data);

      expect(handler).toHaveBeenCalled();
      expect(result.executedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle hook errors gracefully', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Hook error');
      });

      const successHandler = vi.fn();

      hookManager.register('pre-task', errorHandler, 'error-plugin', 'high');
      hookManager.register('pre-task', successHandler, 'success-plugin', 'low');

      const data = {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      };

      const result = await hookManager.execute('pre-task', data);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].plugin).toBe('error-plugin');
      expect(successHandler).toHaveBeenCalled();
    });

    it('should execute hooks in parallel mode', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      hookManager.register('pre-task', handler1, 'plugin1', 'normal');
      hookManager.register('pre-task', handler2, 'plugin2', 'normal');

      const data = {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      };

      const result = await hookManager.executeParallel('pre-task', data);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(result.executedCount).toBe(2);
    });
  });

  describe('Hook Unregistration', () => {
    it('should unregister all hooks for a plugin', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      hookManager.register('pre-task', handler1, 'plugin1', 'normal');
      hookManager.register('post-task', handler2, 'plugin1', 'normal');

      expect(hookManager.getPluginHooks('plugin1')).toHaveLength(2);

      hookManager.unregisterPlugin('plugin1');

      expect(hookManager.getPluginHooks('plugin1')).toHaveLength(0);
      expect(hookManager.hasHooks('pre-task')).toBe(false);
      expect(hookManager.hasHooks('post-task')).toBe(false);
    });
  });

  describe('Hook Statistics', () => {
    it('should return correct statistics', () => {
      hookManager.register('pre-task', vi.fn(), 'plugin1', 'normal');
      hookManager.register('pre-task', vi.fn(), 'plugin2', 'normal');
      hookManager.register('post-task', vi.fn(), 'plugin1', 'normal');

      const stats = hookManager.getStats();

      expect(stats.totalHooks).toBe(3);
      expect(stats.hooksByEvent['pre-task']).toBe(2);
      expect(stats.hooksByEvent['post-task']).toBe(1);
      expect(stats.hooksByPlugin['plugin1']).toBe(2);
      expect(stats.hooksByPlugin['plugin2']).toBe(1);
    });
  });
});

describe('PluginManager', () => {
  let pluginManager;
  let logger;
  let cache;

  beforeEach(() => {
    logger = createMockLogger();
    cache = createMockCache();
    pluginManager = new PluginManager(
      {
        autoDiscover: false,
        enabledPlugins: []
      },
      logger,
      cache,
      '/test',
      '7.0.0'
    );
  });

  describe('Plugin Validation', () => {
    it('should validate plugin structure', () => {
      const invalidPlugin = {
        name: 'test'
        // Missing version and init
      };

      expect(() => {
        pluginManager['validatePlugin'](invalidPlugin);
      }).toThrow('Plugin must have a version property');
    });

    it('should validate version compatibility', () => {
      const plugin = {
        name: 'test',
        version: '1.0.0',
        minFscrVersion: '8.0.0',
        init: vi.fn()
      };

      expect(() => {
        pluginManager['checkVersionCompatibility'](plugin);
      }).toThrow('requires FSCR >= 8.0.0');
    });
  });

  describe('Version Comparison', () => {
    it('should compare versions correctly', () => {
      const compare = pluginManager['compareVersions'].bind(pluginManager);

      expect(compare('7.0.0', '7.0.0')).toBe(0);
      expect(compare('7.1.0', '7.0.0')).toBe(1);
      expect(compare('7.0.0', '7.1.0')).toBe(-1);
      expect(compare('8.0.0', '7.9.9')).toBe(1);
    });
  });

  describe('Plugin Context', () => {
    it('should create plugin context with all required methods', () => {
      const context = pluginManager['createPluginContext']('test-plugin');

      expect(context.version).toBe('7.0.0');
      expect(context.cwd).toBe('/test');
      expect(typeof context.registerCommand).toBe('function');
      expect(typeof context.registerHook).toBe('function');
      expect(typeof context.emit).toBe('function');
      expect(typeof context.on).toBe('function');
      expect(typeof context.getStorage).toBe('function');
      expect(typeof context.setStorage).toBe('function');
    });

    it('should create scoped logger for plugin', () => {
      const context = pluginManager['createPluginContext']('test-plugin');

      context.logger.info('test message');

      expect(logger.info).toHaveBeenCalledWith(
        '[test-plugin] test message'
      );
    });
  });

  describe('Command Registration', () => {
    it('should register commands from plugins', () => {
      const command = {
        name: 'test',
        description: 'Test command',
        handler: vi.fn()
      };

      pluginManager['registerCommand'](command, 'test-plugin');

      const commands = pluginManager.getCommands();
      expect(commands.has('test')).toBe(true);
      expect(commands.get('test').pluginName).toBe('test-plugin');
    });

    it('should prevent duplicate command names', () => {
      const command1 = {
        name: 'test',
        description: 'Test command',
        handler: vi.fn()
      };

      const command2 = {
        name: 'test',
        description: 'Another test command',
        handler: vi.fn()
      };

      pluginManager['registerCommand'](command1, 'plugin1');

      expect(() => {
        pluginManager['registerCommand'](command2, 'plugin2');
      }).toThrow('Command test already registered');
    });
  });

  describe('Plugin Statistics', () => {
    it('should return correct statistics', () => {
      const stats = pluginManager.getStats();

      expect(stats).toHaveProperty('totalPlugins');
      expect(stats).toHaveProperty('totalCommands');
      expect(stats).toHaveProperty('totalHooks');
    });
  });
});

describe('Hook Utilities', () => {
  describe('createSafeHookHandler', () => {
    it('should timeout long-running hooks', async () => {
      const { createSafeHookHandler } = await import('../src/lib/hooks.js');

      const slowHandler = async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
      };

      const safeHandler = createSafeHookHandler(slowHandler, 100);

      const context = createMockContext();
      const data = {
        taskName: 'test',
        args: [],
        env: {},
        timestamp: Date.now()
      };

      await expect(safeHandler(data, context)).rejects.toThrow('timeout');
    });
  });
});

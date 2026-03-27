/**
 * Plugin Manager
 * FSCR v7.0.0 - Plugin discovery, loading, and lifecycle management
 */

import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { EventEmitter } from 'events';
import { pathToFileURL } from 'url';
import { HookManager } from './hooks.js';
import type {
  Plugin,
  PluginContext,
  PluginLoadResult,
  PluginManagerConfig,
  Command,
  Logger,
  CacheManager,
  HookEvent,
  HookHandler,
  HookPriority
} from '../types/plugin.js';

/**
 * Default plugin manager configuration
 */
const DEFAULT_CONFIG: PluginManagerConfig = {
  pluginsDir: '.fscr/plugins',
  autoDiscover: true,
  enabledPlugins: [],
  disabledPlugins: [],
  allowNodeModules: true,
  initTimeout: 30000
};

/**
 * Plugin manager handles plugin lifecycle
 */
export class PluginManager {
  private config: PluginManagerConfig;
  private plugins: Map<string, Plugin> = new Map();
  private loadResults: Map<string, PluginLoadResult> = new Map();
  private commands: Map<string, { command: Command; pluginName: string }> = new Map();
  private hookManager: HookManager;
  private eventEmitter: EventEmitter = new EventEmitter();
  private storage: Map<string, any> = new Map();
  private logger: Logger;
  private cache: CacheManager;
  private cwd: string;
  private version: string;

  constructor(
    config: Partial<PluginManagerConfig> = {},
    logger: Logger,
    cache: CacheManager,
    cwd: string,
    version: string
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = logger;
    this.cache = cache;
    this.cwd = cwd;
    this.version = version;

    // Create plugin context for hooks
    const context = this.createPluginContext('__system__');
    this.hookManager = new HookManager(context);
  }

  /**
   * Initialize plugin system - discover and load plugins
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing plugin system...');

    if (this.config.autoDiscover) {
      await this.discoverPlugins();
    }

    // Load enabled plugins
    const enabledPlugins = this.config.enabledPlugins || [];
    for (const pluginName of enabledPlugins) {
      await this.loadPlugin(pluginName);
    }

    // Emit init hooks
    await this.hookManager.execute('init', {
      version: this.version,
      timestamp: Date.now()
    });

    this.logger.success(
      `Plugin system initialized. Loaded ${this.plugins.size} plugins.`
    );
  }

  /**
   * Discover plugins in the plugins directory
   */
  async discoverPlugins(): Promise<string[]> {
    const pluginsDir = resolve(this.cwd, this.config.pluginsDir!);
    const discovered: string[] = [];

    try {
      const entries = await readdir(pluginsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = join(pluginsDir, entry.name);
          const hasIndex = await this.hasIndexFile(pluginPath);

          if (hasIndex) {
            discovered.push(entry.name);
            this.logger.debug(`Discovered plugin: ${entry.name}`);
          }
        }
      }
    } catch (error) {
      // Plugins directory doesn't exist - not an error
      this.logger.debug(`Plugins directory not found: ${pluginsDir}`);
    }

    // Also check node_modules for fscr-plugin-* packages
    if (this.config.allowNodeModules) {
      const nodeModulesPlugins = await this.discoverNodeModulesPlugins();
      discovered.push(...nodeModulesPlugins);
    }

    return discovered;
  }

  /**
   * Discover plugins in node_modules with fscr-plugin-* prefix
   */
  private async discoverNodeModulesPlugins(): Promise<string[]> {
    const nodeModulesDir = resolve(this.cwd, 'node_modules');
    const discovered: string[] = [];

    try {
      const entries = await readdir(nodeModulesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('fscr-plugin-')) {
          discovered.push(entry.name);
          this.logger.debug(`Discovered npm plugin: ${entry.name}`);
        }
      }
    } catch (error) {
      // node_modules doesn't exist - not an error
    }

    return discovered;
  }

  /**
   * Check if directory has an index file
   */
  private async hasIndexFile(dir: string): Promise<boolean> {
    const extensions = ['.js', '.mjs', '.cjs', '.ts'];

    for (const ext of extensions) {
      try {
        const indexPath = join(dir, `index${ext}`);
        await stat(indexPath);
        return true;
      } catch {
        continue;
      }
    }

    return false;
  }

  /**
   * Load a plugin by name
   */
  async loadPlugin(name: string): Promise<PluginLoadResult> {
    const startTime = Date.now();

    // Check if already loaded
    if (this.plugins.has(name)) {
      this.logger.warn(`Plugin already loaded: ${name}`);
      return this.loadResults.get(name)!;
    }

    // Check if disabled
    if (this.config.disabledPlugins?.includes(name)) {
      const result: PluginLoadResult = {
        plugin: null as any,
        enabled: false,
        error: new Error('Plugin is disabled')
      };
      this.loadResults.set(name, result);
      return result;
    }

    try {
      const plugin = await this.importPlugin(name);

      // Validate plugin
      this.validatePlugin(plugin);

      // Check version compatibility
      this.checkVersionCompatibility(plugin);

      // Create plugin context
      const context = this.createPluginContext(name);

      // Initialize plugin with timeout
      await this.initializePlugin(plugin, context);

      // Store plugin
      this.plugins.set(name, plugin);

      const loadTime = Date.now() - startTime;
      const result: PluginLoadResult = {
        plugin,
        enabled: true,
        loadTime
      };

      this.loadResults.set(name, result);
      this.logger.success(`Plugin loaded: ${name} (${loadTime}ms)`);

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to load plugin ${name}: ${err.message}`);

      const result: PluginLoadResult = {
        plugin: null as any,
        enabled: false,
        error: err
      };

      this.loadResults.set(name, result);
      return result;
    }
  }

  /**
   * Import plugin module
   */
  private async importPlugin(name: string): Promise<Plugin> {
    let pluginPath: string;

    // Try local plugins directory first
    const localPath = resolve(this.cwd, this.config.pluginsDir!, name);
    const hasLocal = await this.hasIndexFile(localPath);

    if (hasLocal) {
      pluginPath = localPath;
    } else if (this.config.allowNodeModules) {
      // Try node_modules
      pluginPath = name;
    } else {
      throw new Error(`Plugin not found: ${name}`);
    }

    // Dynamic import
    const moduleUrl = pathToFileURL(join(pluginPath, 'index.js')).href;
    const module = await import(moduleUrl);

    return module.default || module;
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: any): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a name property');
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a version property');
    }

    if (!plugin.init || typeof plugin.init !== 'function') {
      throw new Error('Plugin must have an init function');
    }
  }

  /**
   * Check FSCR version compatibility
   */
  private checkVersionCompatibility(plugin: Plugin): void {
    if (plugin.minFscrVersion && this.compareVersions(this.version, plugin.minFscrVersion) < 0) {
      throw new Error(
        `Plugin ${plugin.name} requires FSCR >= ${plugin.minFscrVersion}, got ${this.version}`
      );
    }

    if (plugin.maxFscrVersion && this.compareVersions(this.version, plugin.maxFscrVersion) > 0) {
      throw new Error(
        `Plugin ${plugin.name} requires FSCR <= ${plugin.maxFscrVersion}, got ${this.version}`
      );
    }
  }

  /**
   * Simple semver comparison
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  /**
   * Initialize plugin with timeout
   */
  private async initializePlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    const timeout = this.config.initTimeout!;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Plugin initialization timeout')), timeout);
    });

    await Promise.race([
      Promise.resolve(plugin.init(context)),
      timeoutPromise
    ]);
  }

  /**
   * Create plugin context
   */
  private createPluginContext(pluginName: string): PluginContext {
    const self = this;

    return {
      version: this.version,
      cwd: this.cwd,
      config: {}, // TODO: Add config access
      logger: this.createPluginLogger(pluginName),
      cache: this.cache,

      registerCommand(command: Command) {
        self.registerCommand(command, pluginName);
      },

      registerHook<T extends HookEvent>(
        event: T,
        handler: HookHandler<T>,
        options?: { priority?: HookPriority }
      ) {
        const priority = options?.priority || 'normal';
        self.hookManager.register(event, handler, pluginName, priority);
      },

      emit(event: string, data: any) {
        self.eventEmitter.emit(event, data);
      },

      on(event: string, handler: (data: any) => void) {
        self.eventEmitter.on(event, handler);
      },

      getStorage() {
        return self.storage.get(pluginName);
      },

      setStorage(data: any) {
        self.storage.set(pluginName, data);
      }
    };
  }

  /**
   * Create logger for a plugin
   */
  private createPluginLogger(pluginName: string): Logger {
    const prefix = `[${pluginName}]`;

    return {
      debug: (msg, ...args) => this.logger.debug(`${prefix} ${msg}`, ...args),
      info: (msg, ...args) => this.logger.info(`${prefix} ${msg}`, ...args),
      warn: (msg, ...args) => this.logger.warn(`${prefix} ${msg}`, ...args),
      error: (msg, ...args) => this.logger.error(`${prefix} ${msg}`, ...args),
      success: (msg, ...args) => this.logger.success(`${prefix} ${msg}`, ...args)
    };
  }

  /**
   * Register a command from a plugin
   */
  private registerCommand(command: Command, pluginName: string): void {
    if (this.commands.has(command.name)) {
      throw new Error(
        `Command ${command.name} already registered by ${this.commands.get(command.name)?.pluginName}`
      );
    }

    this.commands.set(command.name, { command, pluginName });
    this.logger.debug(`Command registered: ${command.name} (plugin: ${pluginName})`);
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      this.logger.warn(`Plugin not loaded: ${name}`);
      return;
    }

    // Call destroy hook if exists
    if (plugin.destroy) {
      try {
        await Promise.resolve(plugin.destroy());
      } catch (error) {
        this.logger.error(`Error destroying plugin ${name}: ${(error as Error).message}`);
      }
    }

    // Remove hooks
    this.hookManager.unregisterPlugin(name);

    // Remove commands
    for (const [cmdName, { pluginName }] of this.commands.entries()) {
      if (pluginName === name) {
        this.commands.delete(cmdName);
      }
    }

    // Remove storage
    this.storage.delete(name);

    // Remove plugin
    this.plugins.delete(name);
    this.loadResults.delete(name);

    this.logger.success(`Plugin unloaded: ${name}`);
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down plugin system...');

    // Execute shutdown hooks
    await this.hookManager.execute('shutdown', {
      timestamp: Date.now()
    });

    // Unload all plugins
    const pluginNames = Array.from(this.plugins.keys());
    for (const name of pluginNames) {
      await this.unloadPlugin(name);
    }

    this.logger.success('Plugin system shut down');
  }

  /**
   * Get loaded plugins
   */
  getPlugins(): Map<string, Plugin> {
    return new Map(this.plugins);
  }

  /**
   * Get registered commands
   */
  getCommands(): Map<string, { command: Command; pluginName: string }> {
    return new Map(this.commands);
  }

  /**
   * Get hook manager
   */
  getHookManager(): HookManager {
    return this.hookManager;
  }

  /**
   * Get plugin load results
   */
  getLoadResults(): Map<string, PluginLoadResult> {
    return new Map(this.loadResults);
  }

  /**
   * Get plugin statistics
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      totalCommands: this.commands.size,
      ...this.hookManager.getStats()
    };
  }
}

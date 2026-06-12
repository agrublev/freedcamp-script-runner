# Plugin System Architecture

**Version:** 7.0.0
**Status:** Design Phase
**Last Updated:** 2026-03-28

## Overview

The plugin system allows extending FSCR with custom commands, hooks, and functionality without modifying the core codebase. Plugins are discovered automatically, loaded on-demand, and can register lifecycle hooks.

## Goals

1. **Extensibility** - Add custom functionality without forking
2. **Isolation** - Plugins don't interfere with each other
3. **Type Safety** - Full TypeScript support for plugin development
4. **Performance** - Lazy loading, minimal overhead
5. **Developer Experience** - Simple plugin API, great documentation

## Architecture

### High-Level Design

```
┌──────────────────────────────────────────────────────┐
│                   FSCR Core                          │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │         Plugin Manager                     │    │
│  │                                            │    │
│  │  ┌──────────────┐    ┌─────────────────┐ │    │
│  │  │  Discovery   │───▶│  Plugin Loader  │ │    │
│  │  └──────────────┘    └─────────────────┘ │    │
│  │                                            │    │
│  │  ┌──────────────┐    ┌─────────────────┐ │    │
│  │  │Hook Registry │◀──▶│ Command Registry│ │    │
│  │  └──────────────┘    └─────────────────┘ │    │
│  └────────────────────────────────────────────┘    │
│                        │                            │
└────────────────────────┼────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │         Plugins               │
         │                               │
         │  ┌─────────┐  ┌─────────┐   │
         │  │Plugin 1 │  │Plugin 2 │   │
         │  │         │  │         │   │
         │  │Commands │  │Commands │   │
         │  │Hooks    │  │Hooks    │   │
         │  └─────────┘  └─────────┘   │
         └───────────────────────────────┘
```

## Plugin Structure

### Directory Layout

```
.fsr/
└── plugins/
    ├── my-plugin/
    │   ├── index.js           # Plugin entry point
    │   ├── package.json       # Plugin metadata
    │   ├── commands/          # Custom commands
    │   │   └── deploy.js
    │   └── hooks/             # Hook handlers
    │       └── pre-task.js
    │
    └── another-plugin/
        ├── index.ts           # TypeScript supported
        ├── package.json
        └── ...
```

### Plugin Entry Point

Every plugin must export a default object implementing the `Plugin` interface:

```typescript
// .fsr/plugins/my-plugin/index.js
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'Custom deployment plugin',
  author: 'John Doe',

  async init(context) {
    // Register custom commands
    context.registerCommand({
      name: 'deploy',
      description: 'Deploy to production',
      options: [
        {
          flags: '-e, --env <environment>',
          description: 'Target environment',
          defaultValue: 'production'
        }
      ],
      handler: async (options, ctx) => {
        ctx.console.log(`Deploying to ${options.env}...`);
        // Deployment logic
      }
    });

    // Register hooks
    context.registerHook('pre-task', async (data) => {
      context.console.log(`[Plugin] Task starting: ${data.payload.taskName}`);
    });

    context.registerHook('post-task', async (data) => {
      if (data.payload.success) {
        context.console.success('[Plugin] Task completed successfully');
      }
    });
  },

  async destroy() {
    // Cleanup when plugin is unloaded
    console.log('Plugin unloaded');
  }
};
```

### Plugin Metadata (package.json)

```json
{
  "name": "fsr-plugin-deploy",
  "version": "1.0.0",
  "description": "Deployment plugin for FSCR",
  "main": "index.js",
  "type": "module",
  "keywords": ["fsr", "plugin", "deploy"],
  "author": "John Doe",
  "license": "MIT",
  "peerDependencies": {
    "fsr": "^7.0.0"
  },
  "fsr": {
    "plugin": true,
    "minVersion": "7.0.0",
    "permissions": ["fs", "network"]
  }
}
```

## Plugin Manager

### Discovery

The plugin manager automatically discovers plugins in `.fsr/plugins/`:

```typescript
// src/lib/plugins.ts
export class PluginManager {
  private plugins = new Map<string, Plugin>();
  private hooks = new Map<HookType, HookHandler[]>();
  private commands = new Map<string, Command>();

  /**
   * Discover plugins in .fsr/plugins/ directory
   */
  async discoverPlugins(): Promise<string[]> {
    const pluginDir = path.join(process.cwd(), '.fsr', 'plugins');

    if (!fs.existsSync(pluginDir)) {
      return [];
    }

    const entries = await fs.promises.readdir(pluginDir, { withFileTypes: true });

    const pluginPaths = entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(pluginDir, entry.name))
      .filter(pluginPath => {
        // Check if plugin has index.js or index.ts
        return (
          fs.existsSync(path.join(pluginPath, 'index.js')) ||
          fs.existsSync(path.join(pluginPath, 'index.ts'))
        );
      });

    return pluginPaths;
  }

  /**
   * Load all discovered plugins
   */
  async loadAll(): Promise<void> {
    const pluginPaths = await this.discoverPlugins();

    for (const pluginPath of pluginPaths) {
      try {
        await this.load(pluginPath);
      } catch (error) {
        console.error(`Failed to load plugin at ${pluginPath}:`, error);
      }
    }
  }

  /**
   * Load a specific plugin
   */
  async load(pluginPath: string): Promise<Plugin> {
    const entryPoint = this.findEntryPoint(pluginPath);
    const module = await import(entryPoint);
    const plugin: Plugin = module.default;

    // Validate plugin
    this.validatePlugin(plugin);

    // Create plugin context
    const context: PluginContext = {
      registerCommand: (command) => this.registerCommand(plugin.name, command),
      registerHook: (hook, handler) => this.registerHook(plugin.name, hook, handler),
      config: this.configManager,
      cache: this.cacheManager,
      console: this.console
    };

    // Initialize plugin
    if (plugin.init) {
      await plugin.init(context);
    }

    // Store loaded plugin
    this.plugins.set(plugin.name, plugin);

    return plugin;
  }

  /**
   * Find plugin entry point (index.js or index.ts)
   */
  private findEntryPoint(pluginPath: string): string {
    const candidates = [
      path.join(pluginPath, 'index.js'),
      path.join(pluginPath, 'index.ts'),
      path.join(pluginPath, 'src', 'index.js'),
      path.join(pluginPath, 'src', 'index.ts')
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(`No entry point found for plugin at ${pluginPath}`);
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: unknown): asserts plugin is Plugin {
    if (typeof plugin !== 'object' || plugin === null) {
      throw new Error('Plugin must export a default object');
    }

    if (!('name' in plugin) || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a name property');
    }

    if (!('version' in plugin) || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a version property');
    }

    if ('init' in plugin && typeof plugin.init !== 'function') {
      throw new Error('Plugin init must be a function');
    }
  }

  /**
   * Unload a plugin
   */
  async unload(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    // Call destroy hook
    if (plugin.destroy) {
      await plugin.destroy();
    }

    // Unregister commands
    for (const [name, command] of this.commands.entries()) {
      if (command.pluginName === pluginName) {
        this.commands.delete(name);
      }
    }

    // Unregister hooks
    for (const [hookType, handlers] of this.hooks.entries()) {
      const filtered = handlers.filter(h => h.pluginName !== pluginName);
      this.hooks.set(hookType, filtered);
    }

    // Remove from loaded plugins
    this.plugins.delete(pluginName);
  }

  /**
   * Get loaded plugin
   */
  get(pluginName: string): Plugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * List all loaded plugins
   */
  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}
```

### Command Registration

Plugins can register custom commands:

```typescript
/**
 * Register a command from a plugin
 */
private registerCommand(pluginName: string, command: Command): void {
  // Check for name conflicts
  if (this.commands.has(command.name)) {
    throw new Error(
      `Command "${command.name}" already registered by another plugin`
    );
  }

  // Add plugin reference
  const commandWithPlugin = {
    ...command,
    pluginName
  };

  this.commands.set(command.name, commandWithPlugin);
}

/**
 * Get command (including plugin commands)
 */
getCommand(name: string): Command | undefined {
  return this.commands.get(name);
}

/**
 * Get all commands (core + plugin)
 */
getAllCommands(): Command[] {
  return Array.from(this.commands.values());
}
```

### Hook System

Plugins can register hooks for lifecycle events:

```typescript
/**
 * Available hook types
 */
export type HookType =
  | 'pre-task'      // Before task execution
  | 'post-task'     // After task execution
  | 'pre-config'    // Before config loads
  | 'post-config'   // After config loads
  | 'pre-parse'     // Before script parsing
  | 'post-parse';   // After script parsing

/**
 * Register a hook handler
 */
private registerHook(
  pluginName: string,
  hookType: HookType,
  handler: HookHandler
): void {
  const handlers = this.hooks.get(hookType) || [];

  handlers.push({
    pluginName,
    handler
  });

  this.hooks.set(hookType, handlers);
}

/**
 * Execute all handlers for a hook
 */
async executeHook(hookType: HookType, payload: unknown): Promise<void> {
  const handlers = this.hooks.get(hookType) || [];

  const data: HookData = {
    type: hookType,
    payload,
    timestamp: Date.now(),
    context: this.context
  };

  // Execute handlers in parallel
  await Promise.all(
    handlers.map(({ handler }) => handler(data))
  );
}
```

### Hook Usage Example

```typescript
// Before executing a task
await pluginManager.executeHook('pre-task', {
  taskName: 'build',
  script: buildScript
});

// Execute task
const result = await runCLICommand(buildScript);

// After executing a task
await pluginManager.executeHook('post-task', {
  taskName: 'build',
  success: result.success,
  exitCode: result.exitCode,
  duration: result.duration
});
```

## Plugin API

### PluginContext

The context object provided to plugins during initialization:

```typescript
export interface PluginContext {
  /**
   * Register a custom command
   */
  registerCommand(command: Command): void;

  /**
   * Register a hook handler
   */
  registerHook(hook: HookType, handler: HookHandler): void;

  /**
   * Access config manager
   */
  config: ConfigManager;

  /**
   * Access cache manager
   */
  cache: CacheManager;

  /**
   * Console utilities
   */
  console: ConsoleUtils;
}
```

### Command Definition

```typescript
export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  options?: CommandOption[];
  arguments?: CommandArgument[];
  handler: CommandHandler;
  examples?: CommandExample[];
}
```

### Hook Handler

```typescript
export type HookHandler = (data: HookData) => Promise<void> | void;

export interface HookData {
  type: HookType;
  payload: unknown;
  timestamp: number;
  context: CommandContext;
}
```

## Plugin Examples

### Example 1: Deployment Plugin

```typescript
// .fsr/plugins/deploy/index.ts
import type { Plugin, PluginContext, CommandOptions } from 'fsr';
import { deploy } from './deploy-logic.js';

export default {
  name: 'fsr-plugin-deploy',
  version: '1.0.0',
  description: 'Deploy your application to various platforms',

  async init(context: PluginContext) {
    // Register deploy command
    context.registerCommand({
      name: 'deploy',
      description: 'Deploy to a platform',
      options: [
        {
          flags: '-p, --platform <platform>',
          description: 'Target platform (aws, vercel, netlify)',
          required: true
        },
        {
          flags: '-e, --env <environment>',
          description: 'Environment',
          defaultValue: 'production'
        }
      ],
      handler: async (options: CommandOptions, ctx) => {
        const platform = options.platform as string;
        const environment = options.env as string;

        ctx.console.log(`Deploying to ${platform} (${environment})...`);

        try {
          await deploy(platform, environment);
          ctx.console.success('Deployment successful!');
        } catch (error) {
          ctx.console.error('Deployment failed', error as Error);
        }
      }
    });

    // Log all task executions
    context.registerHook('post-task', async (data) => {
      const { taskName, success, duration } = data.payload as any;

      // Log to analytics service
      await logToAnalytics({
        event: 'task_executed',
        taskName,
        success,
        duration
      });
    });
  }
} satisfies Plugin;
```

### Example 2: Notification Plugin

```typescript
// .fsr/plugins/notify/index.ts
import type { Plugin, PluginContext } from 'fsr';
import notifier from 'node-notifier';

export default {
  name: 'fsr-plugin-notify',
  version: '1.0.0',
  description: 'Send desktop notifications on task completion',

  async init(context: PluginContext) {
    // Notify on task completion
    context.registerHook('post-task', async (data) => {
      const { taskName, success } = data.payload as any;

      notifier.notify({
        title: 'FSCR Task Complete',
        message: `Task "${taskName}" ${success ? 'succeeded' : 'failed'}`,
        sound: success,
        icon: success ? './success.png' : './error.png'
      });
    });
  }
} satisfies Plugin;
```

### Example 3: Git Integration Plugin

```typescript
// .fsr/plugins/git/index.ts
import type { Plugin, PluginContext } from 'fsr';
import simpleGit from 'simple-git';

const git = simpleGit();

export default {
  name: 'fsr-plugin-git',
  version: '1.0.0',

  async init(context: PluginContext) {
    // Ensure clean working tree before deploy
    context.registerHook('pre-task', async (data) => {
      const { taskName } = data.payload as any;

      if (taskName === 'deploy') {
        const status = await git.status();

        if (!status.isClean()) {
          throw new Error('Working tree is not clean. Commit or stash changes before deploying.');
        }
      }
    });

    // Auto-tag on successful deploy
    context.registerHook('post-task', async (data) => {
      const { taskName, success } = data.payload as any;

      if (taskName === 'deploy' && success) {
        const version = context.config.getValue('version');
        await git.addTag(`v${version}`);
        await git.pushTags();

        context.console.success(`Tagged version v${version}`);
      }
    });
  }
} satisfies Plugin;
```

## Plugin CLI Commands

### List Plugins

```bash
$ fsr plugin list

Loaded Plugins:
  • fsr-plugin-deploy (v1.0.0)
    Deploy your application to various platforms

  • fsr-plugin-notify (v1.0.0)
    Send desktop notifications on task completion

  • fsr-plugin-git (v1.0.0)
    Git integration for FSCR

Total: 3 plugins
```

### Install Plugin

```bash
# Install from npm
$ fsr plugin install fsr-plugin-deploy

# Install from local directory
$ fsr plugin install ./my-plugin

# Install from git
$ fsr plugin install github:user/fsr-plugin-name
```

### Uninstall Plugin

```bash
$ fsr plugin uninstall fsr-plugin-deploy
```

### Plugin Info

```bash
$ fsr plugin info fsr-plugin-deploy

Name: fsr-plugin-deploy
Version: 1.0.0
Description: Deploy your application to various platforms
Author: John Doe

Commands:
  • deploy - Deploy to a platform

Hooks:
  • post-task - Log deployment analytics
```

## Security Considerations

### Plugin Permissions

Plugins can request specific permissions:

```json
{
  "fsr": {
    "permissions": [
      "fs",       // File system access
      "network",  // Network access
      "process",  // Process spawning
      "env"       // Environment variables
    ]
  }
}
```

### Sandboxing (Future)

For untrusted plugins, run in a sandbox:

```typescript
// Future feature: Sandboxed plugin execution
const sandboxedContext: PluginContext = {
  registerCommand: context.registerCommand,
  registerHook: context.registerHook,

  // Limited access
  config: createReadOnlyProxy(context.config),
  cache: createLimitedCacheProxy(context.cache),
  console: context.console,

  // No direct fs/network access
  fs: undefined,
  network: undefined
};

await plugin.init(sandboxedContext);
```

## Performance Impact

### Lazy Loading

Plugins are only loaded when needed:

```typescript
// Load plugins only when plugin command is used
program
  .command('plugin')
  .action(async (...args) => {
    const { PluginManager } = await import('./lib/plugins.js');
    const manager = new PluginManager();
    // ...
  });

// Or load on first hook execution
async executeHook(hookType: HookType, payload: unknown) {
  if (!this.pluginsLoaded) {
    await this.loadAll();
    this.pluginsLoaded = true;
  }

  // Execute hooks
  // ...
}
```

### Performance Targets

- Plugin discovery: <5ms
- Plugin loading (per plugin): <10ms
- Hook execution: <1ms per hook
- Total overhead: <20ms with 3-5 plugins

## Testing Plugins

### Unit Tests

```typescript
// tests/plugins/my-plugin.test.ts
import { describe, it, expect } from 'vitest';
import plugin from './.fsr/plugins/my-plugin/index.js';

describe('My Plugin', () => {
  it('should have required fields', () => {
    expect(plugin.name).toBe('my-plugin');
    expect(plugin.version).toBeTruthy();
    expect(plugin.init).toBeTypeOf('function');
  });

  it('should register commands', async () => {
    const commands: Command[] = [];

    const context = {
      registerCommand: (cmd: Command) => commands.push(cmd),
      registerHook: () => {},
      config: {} as any,
      cache: {} as any,
      console: {} as any
    };

    await plugin.init(context);

    expect(commands).toHaveLength(1);
    expect(commands[0].name).toBe('deploy');
  });
});
```

### Integration Tests

```typescript
// tests/integration/plugin-system.test.ts
import { describe, it, expect } from 'vitest';
import { PluginManager } from '../src/lib/plugins.js';

describe('Plugin System', () => {
  it('should discover plugins', async () => {
    const manager = new PluginManager();
    const plugins = await manager.discoverPlugins();

    expect(plugins.length).toBeGreaterThan(0);
  });

  it('should load and execute plugin hooks', async () => {
    const manager = new PluginManager();
    await manager.loadAll();

    let hookExecuted = false;

    manager.registerHook('test-plugin', 'pre-task', async () => {
      hookExecuted = true;
    });

    await manager.executeHook('pre-task', { taskName: 'test' });

    expect(hookExecuted).toBe(true);
  });
});
```

## Documentation

### Plugin Developer Guide

Create comprehensive documentation for plugin developers:

- Plugin structure and requirements
- API reference
- Hook types and usage
- Example plugins
- Testing strategies
- Publishing guidelines

### Plugin Registry (Future)

```bash
# Search for plugins
$ fsr plugin search deploy

# Browse all plugins
$ fsr plugin browse

# Get plugin info
$ fsr plugin info fsr-plugin-deploy
```

## Summary

The plugin system provides:

✅ **Extensibility** - Custom commands and hooks
✅ **Type Safety** - Full TypeScript support
✅ **Auto-Discovery** - Automatic plugin loading
✅ **Isolation** - Plugins don't interfere
✅ **Performance** - Lazy loading, minimal overhead
✅ **Developer Experience** - Simple API, great docs

This enables a vibrant ecosystem of community plugins while keeping the core lean and fast.

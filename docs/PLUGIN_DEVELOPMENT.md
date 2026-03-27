# Plugin Development Guide

FSCR v7.0.0 - Complete guide to developing plugins for the Freedcamp Script Runner

## Table of Contents

- [Introduction](#introduction)
- [Plugin Structure](#plugin-structure)
- [Plugin API](#plugin-api)
- [Hook System](#hook-system)
- [Command Registration](#command-registration)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Publishing](#publishing)

---

## Introduction

FSCR's plugin system allows you to extend the CLI with custom commands and hooks. Plugins can:

- Register custom commands
- Hook into task lifecycle events
- Communicate with other plugins
- Store persistent data
- Access FSCR's configuration and cache

### Quick Start

```javascript
// .fscr/plugins/my-plugin/index.js
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My awesome plugin',

  async init(context) {
    context.logger.info('Plugin initializing...');

    // Register a command
    context.registerCommand({
      name: 'hello',
      description: 'Say hello',
      handler: async (options, ctx) => {
        ctx.logger.success('Hello from my plugin!');
      }
    });

    context.logger.success('Plugin initialized');
  }
};
```

---

## Plugin Structure

### Required Properties

```typescript
interface Plugin {
  name: string;        // Unique plugin identifier
  version: string;     // Semver version
  init: (context: PluginContext) => Promise<void> | void;
}
```

### Optional Properties

```typescript
interface Plugin {
  description?: string;      // Plugin description
  author?: string;          // Plugin author
  minFscrVersion?: string;  // Minimum FSCR version (e.g., '7.0.0')
  maxFscrVersion?: string;  // Maximum FSCR version
  dependencies?: string[];  // Other plugins this depends on
  tags?: string[];         // Categories/tags
  homepage?: string;       // Homepage URL
  repository?: string;     // Repository URL
  destroy?: () => Promise<void> | void;  // Cleanup hook
}
```

### File Structure

```
.fscr/plugins/my-plugin/
├── index.js           # Main plugin file
├── package.json       # Optional: for npm plugins
├── README.md          # Plugin documentation
└── lib/              # Additional modules
    └── utils.js
```

---

## Plugin API

### PluginContext

The `context` object passed to `init()` provides access to FSCR functionality:

```typescript
interface PluginContext {
  // FSCR information
  version: string;        // FSCR version (e.g., '7.0.0')
  cwd: string;           // Current working directory

  // Services
  logger: Logger;        // Logging interface
  cache: CacheManager;   // Cache access
  config: any;          // Configuration access

  // Plugin capabilities
  registerCommand: (command: Command) => void;
  registerHook: (event: HookEvent, handler: HookHandler, options?: HookOptions) => void;

  // Inter-plugin communication
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;

  // Storage
  getStorage: () => any;
  setStorage: (data: any) => void;
}
```

### Logger

```typescript
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
}
```

**Example:**

```javascript
context.logger.info('Processing task...');
context.logger.success('Task completed!');
context.logger.error('Something went wrong:', error);
```

### Cache Manager

```typescript
interface CacheManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
}
```

**Example:**

```javascript
// Store data with 5-minute TTL
context.cache.set('my-data', { foo: 'bar' }, 300000);

// Retrieve data
const data = context.cache.get('my-data');

// Check if exists
if (context.cache.has('my-data')) {
  // ...
}
```

### Storage

Plugins can store persistent data:

```javascript
async init(context) {
  // Get stored data
  const stored = context.getStorage() || { count: 0 };

  // Modify
  stored.count++;

  // Save
  context.setStorage(stored);
}
```

---

## Hook System

Plugins can hook into FSCR's lifecycle events.

### Available Hooks

| Hook Event | When Triggered | Data Type |
|------------|---------------|-----------|
| `init` | FSCR initializes | `{ version, timestamp }` |
| `pre-task` | Before task runs | `{ taskName, args, env, timestamp }` |
| `post-task` | After task completes | `{ taskName, exitCode, duration, timestamp, success }` |
| `pre-command` | Before command runs | `{ command, args, timestamp }` |
| `post-command` | After command completes | `{ command, exitCode, duration, timestamp, success }` |
| `task-error` | Task throws error | `{ taskName, error, timestamp }` |
| `shutdown` | FSCR shuts down | `{ timestamp }` |

### Registering Hooks

```javascript
context.registerHook('pre-task', async (data, ctx) => {
  ctx.logger.info(`Starting task: ${data.taskName}`);
}, { priority: 'high' });
```

### Hook Priorities

Control execution order with priorities:

- `highest` - Runs first
- `high`
- `normal` (default)
- `low`
- `lowest` - Runs last

**Example:**

```javascript
// Validation hook (runs first)
context.registerHook('pre-task', validateTask, { priority: 'highest' });

// Logging hook (runs last)
context.registerHook('pre-task', logTask, { priority: 'lowest' });
```

### Hook Data Types

```typescript
// Pre-task hook
interface PreTaskData {
  taskName: string;
  args: string[];
  env: Record<string, string>;
  timestamp: number;
}

// Post-task hook
interface PostTaskData {
  taskName: string;
  exitCode: number;
  duration: number;
  timestamp: number;
  success: boolean;
}

// Task error hook
interface TaskErrorData {
  taskName: string;
  error: Error;
  timestamp: number;
}
```

### Async Hooks

Hooks support async operations:

```javascript
context.registerHook('post-task', async (data, ctx) => {
  // Send notification
  await sendNotification({
    title: `Task ${data.taskName} completed`,
    duration: data.duration
  });
});
```

---

## Command Registration

### Basic Command

```javascript
context.registerCommand({
  name: 'greet',
  description: 'Greet the user',
  handler: async (options, ctx) => {
    ctx.logger.success('Hello!');
  }
});
```

### Command with Options

```javascript
context.registerCommand({
  name: 'deploy',
  description: 'Deploy to environment',
  options: [
    {
      flags: '-e, --env <environment>',
      description: 'Target environment',
      required: true
    },
    {
      flags: '--dry-run',
      description: 'Simulate deployment'
    }
  ],
  handler: async (options, ctx) => {
    const env = options.env;
    const dryRun = options.dryRun || false;

    ctx.logger.info(`Deploying to ${env}...`);

    if (dryRun) {
      ctx.logger.info('[DRY RUN] Would deploy here');
    }
  }
});
```

### Command with Aliases

```javascript
context.registerCommand({
  name: 'deploy',
  description: 'Deploy application',
  aliases: ['ship', 'publish'],
  handler: async (options, ctx) => {
    // Can be called with: fscr deploy, fscr ship, or fscr publish
  }
});
```

### Command with Examples

```javascript
context.registerCommand({
  name: 'deploy',
  description: 'Deploy application',
  examples: [
    'fscr deploy --env staging',
    'fscr deploy --env prod --branch main',
    'fscr deploy --dry-run'
  ],
  handler: async (options, ctx) => {
    // ...
  }
});
```

### Hidden Commands

```javascript
context.registerCommand({
  name: 'internal',
  description: 'Internal command',
  hidden: true,  // Won't appear in help
  handler: async (options, ctx) => {
    // ...
  }
});
```

### CommandContext

The `ctx` parameter in command handlers:

```typescript
interface CommandContext {
  args: string[];                    // CLI arguments
  cwd: string;                       // Current directory
  config: any;                       // FSCR config
  logger: Logger;                    // Logger instance
  cache: CacheManager;               // Cache manager
  runTask: (name: string, opts?: any) => Promise<void>;
  getTasks: () => Promise<Array<{ name: string; description: string }>>;
}
```

**Example:**

```javascript
handler: async (options, ctx) => {
  // Get all available tasks
  const tasks = await ctx.getTasks();

  // Run a task programmatically
  await ctx.runTask('build');

  // Access config
  const config = ctx.config;
}
```

---

## Examples

### Example 1: Task Timer

Track task execution times:

```javascript
export default {
  name: 'task-timer',
  version: '1.0.0',

  async init(context) {
    const times = new Map();

    context.registerHook('pre-task', async (data) => {
      times.set(data.taskName, Date.now());
    });

    context.registerHook('post-task', async (data, ctx) => {
      const start = times.get(data.taskName);
      if (start) {
        const duration = Date.now() - start;
        ctx.logger.info(`⏱️  ${data.taskName}: ${duration}ms`);
        times.delete(data.taskName);
      }
    });
  }
};
```

### Example 2: Environment Validator

Validate environment before deployment:

```javascript
export default {
  name: 'env-validator',
  version: '1.0.0',

  async init(context) {
    context.registerHook('pre-command', async (data, ctx) => {
      if (data.command === 'deploy') {
        const requiredVars = ['API_KEY', 'DATABASE_URL'];

        for (const varName of requiredVars) {
          if (!process.env[varName]) {
            ctx.logger.error(`Missing environment variable: ${varName}`);
            throw new Error('Environment validation failed');
          }
        }

        ctx.logger.success('Environment validated');
      }
    }, { priority: 'highest' });
  }
};
```

### Example 3: Git Status Checker

Prevent tasks when git repo is dirty:

```javascript
import { execSync } from 'child_process';

export default {
  name: 'git-checker',
  version: '1.0.0',

  async init(context) {
    const checkGit = (taskName) => {
      // Only check for specific tasks
      const protectedTasks = ['deploy', 'release', 'publish'];
      return protectedTasks.includes(taskName);
    };

    context.registerHook('pre-task', async (data, ctx) => {
      if (!checkGit(data.taskName)) return;

      try {
        const status = execSync('git status --porcelain').toString();

        if (status.trim()) {
          ctx.logger.warn('Git working directory is dirty!');
          ctx.logger.info('Uncommitted changes detected');
          throw new Error('Commit or stash changes before deploying');
        }

        ctx.logger.success('Git status clean');
      } catch (error) {
        ctx.logger.error('Git check failed:', error.message);
        throw error;
      }
    }, { priority: 'highest' });
  }
};
```

### Example 4: Slack Notifier

Send Slack notifications on task completion:

```javascript
export default {
  name: 'slack-notifier',
  version: '1.0.0',

  async init(context) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      context.logger.warn('SLACK_WEBHOOK_URL not set, notifications disabled');
      return;
    }

    context.registerHook('post-task', async (data, ctx) => {
      // Only notify for long tasks
      if (data.duration < 10000) return;

      const status = data.success ? '✅' : '❌';
      const message = {
        text: `${status} Task ${data.taskName} ${data.success ? 'completed' : 'failed'}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Task:* ${data.taskName}\n*Duration:* ${(data.duration / 1000).toFixed(2)}s\n*Status:* ${data.success ? 'Success' : 'Failed'}`
            }
          }
        ]
      };

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
      } catch (error) {
        ctx.logger.error('Failed to send Slack notification:', error);
      }
    });
  }
};
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```javascript
async init(context) {
  try {
    // Plugin initialization
  } catch (error) {
    context.logger.error('Plugin init failed:', error);
    throw error; // Re-throw to prevent loading
  }
}
```

### 2. Async Operations

Use async/await properly:

```javascript
context.registerHook('post-task', async (data, ctx) => {
  try {
    await someAsyncOperation();
  } catch (error) {
    ctx.logger.error('Async operation failed:', error);
  }
});
```

### 3. Resource Cleanup

Implement `destroy()` for cleanup:

```javascript
export default {
  name: 'my-plugin',
  version: '1.0.0',

  async init(context) {
    this.interval = setInterval(() => {
      // Do something
    }, 1000);
  },

  async destroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
};
```

### 4. Performance

- Keep hooks fast (< 100ms)
- Use caching for expensive operations
- Avoid blocking operations in hooks

```javascript
// Good: Async, non-blocking
context.registerHook('post-task', async (data, ctx) => {
  setImmediate(async () => {
    await expensiveOperation();
  });
});

// Bad: Blocking
context.registerHook('post-task', (data, ctx) => {
  const result = expensiveBlockingOperation(); // Blocks
});
```

### 5. Version Compatibility

Specify version requirements:

```javascript
export default {
  name: 'my-plugin',
  version: '1.0.0',
  minFscrVersion: '7.0.0',
  maxFscrVersion: '7.99.99',
  // ...
};
```

### 6. Logging

Use appropriate log levels:

```javascript
ctx.logger.debug('Detailed info for debugging');
ctx.logger.info('General information');
ctx.logger.warn('Something unexpected');
ctx.logger.error('Error occurred');
ctx.logger.success('Operation successful');
```

---

## Testing

### Unit Testing

```javascript
import { describe, it, expect, vi } from 'vitest';

describe('MyPlugin', () => {
  it('should register command', async () => {
    const context = {
      logger: {
        info: vi.fn(),
        success: vi.fn()
      },
      registerCommand: vi.fn(),
      registerHook: vi.fn()
    };

    const plugin = await import('./index.js');
    await plugin.default.init(context);

    expect(context.registerCommand).toHaveBeenCalled();
  });
});
```

### Integration Testing

```javascript
import { PluginManager } from 'fscr/lib/plugins';

describe('Plugin Integration', () => {
  it('should load and execute plugin', async () => {
    const manager = new PluginManager(/* ... */);
    await manager.loadPlugin('my-plugin');

    const plugins = manager.getPlugins();
    expect(plugins.has('my-plugin')).toBe(true);
  });
});
```

---

## Publishing

### npm Package

To publish as an npm package, add `package.json`:

```json
{
  "name": "fscr-plugin-my-plugin",
  "version": "1.0.0",
  "description": "My FSCR plugin",
  "main": "index.js",
  "keywords": ["fscr", "plugin"],
  "peerDependencies": {
    "fscr": "^7.0.0"
  }
}
```

Then publish:

```bash
npm publish
```

Users can install with:

```bash
npm install fscr-plugin-my-plugin
```

FSCR auto-discovers plugins with `fscr-plugin-*` prefix in `node_modules`.

### Local Plugin

Place in `.fscr/plugins/my-plugin/`:

```
.fscr/
└── plugins/
    └── my-plugin/
        ├── index.js
        └── README.md
```

---

## API Reference

See [API.md](./API.md) for complete TypeScript type definitions.

---

## Support

- [GitHub Issues](https://github.com/agrublev/freedcamp-script-runner/issues)
- [Discussions](https://github.com/agrublev/freedcamp-script-runner/discussions)

---

**Happy Plugin Development! 🚀**

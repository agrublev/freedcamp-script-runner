# Plugin API Reference

Complete TypeScript API reference for FSCR v7.0.0 plugin system.

## Core Types

### Plugin

```typescript
interface Plugin extends PluginMetadata {
  /**
   * Initialize the plugin
   * Called once when plugin is loaded
   */
  init: (context: PluginContext) => Promise<void> | void;

  /**
   * Cleanup resources when plugin is unloaded
   * Optional lifecycle hook
   */
  destroy?: () => Promise<void> | void;
}
```

### PluginMetadata

```typescript
interface PluginMetadata {
  /** Plugin name (must be unique) */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Plugin description */
  description?: string;

  /** Plugin author */
  author?: string;

  /** Minimum FSCR version required */
  minFscrVersion?: string;

  /** Maximum FSCR version supported */
  maxFscrVersion?: string;

  /** Dependencies on other plugins */
  dependencies?: string[];

  /** Plugin tags/categories */
  tags?: string[];

  /** Homepage URL */
  homepage?: string;

  /** Repository URL */
  repository?: string;
}
```

### PluginContext

```typescript
interface PluginContext {
  /** FSCR version */
  version: string;

  /** Current working directory */
  cwd: string;

  /** Configuration manager */
  config: any;

  /** Logger instance */
  logger: Logger;

  /** Cache manager */
  cache: CacheManager;

  /** Register a custom command */
  registerCommand: (command: Command) => void;

  /** Register a hook */
  registerHook: <T extends HookEvent>(
    event: T,
    handler: HookHandler<T>,
    options?: { priority?: HookPriority }
  ) => void;

  /** Emit an event (for inter-plugin communication) */
  emit: (event: string, data: any) => void;

  /** Listen to custom events */
  on: (event: string, handler: (data: any) => void) => void;

  /** Get data from plugin storage */
  getStorage: () => any;

  /** Set data in plugin storage */
  setStorage: (data: any) => void;
}
```

## Hook System

### HookEvent

```typescript
type HookEvent =
  | 'pre-task'      // Before a task runs
  | 'post-task'     // After a task completes
  | 'pre-command'   // Before any command runs
  | 'post-command'  // After any command completes
  | 'task-error'    // When a task throws an error
  | 'init'          // When FSCR initializes
  | 'shutdown';     // When FSCR is shutting down
```

### HookPriority

```typescript
type HookPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest';
```

### HookHandler

```typescript
type HookHandler<T extends HookEvent = HookEvent> = (
  data: HookData[T],
  context: PluginContext
) => Promise<void> | void;
```

### HookData

```typescript
interface HookData {
  'pre-task': {
    taskName: string;
    args: string[];
    env: Record<string, string>;
    timestamp: number;
  };
  'post-task': {
    taskName: string;
    exitCode: number;
    duration: number;
    timestamp: number;
    success: boolean;
  };
  'pre-command': {
    command: string;
    args: string[];
    timestamp: number;
  };
  'post-command': {
    command: string;
    exitCode: number;
    duration: number;
    timestamp: number;
    success: boolean;
  };
  'task-error': {
    taskName: string;
    error: Error;
    timestamp: number;
  };
  'init': {
    version: string;
    timestamp: number;
  };
  'shutdown': {
    timestamp: number;
  };
}
```

### HookRegistration

```typescript
interface HookRegistration {
  event: HookEvent;
  handler: HookHandler<any>;
  priority: HookPriority;
  pluginName: string;
}
```

### HookExecutionResult

```typescript
interface HookExecutionResult {
  event: HookEvent;
  executedCount: number;
  errors: Array<{ plugin: string; error: Error }>;
  duration: number;
}
```

## Command System

### Command

```typescript
interface Command {
  /** Command name (e.g., 'deploy', 'test') */
  name: string;

  /** Short description shown in help */
  description: string;

  /** Command aliases */
  aliases?: string[];

  /** Command options/flags */
  options?: CommandOption[];

  /** Command handler */
  handler: CommandHandler;

  /** Usage examples */
  examples?: string[];

  /** Whether command is hidden from help */
  hidden?: boolean;
}
```

### CommandOption

```typescript
interface CommandOption {
  /** Flag name (e.g., '-f, --force') */
  flags: string;

  /** Option description */
  description: string;

  /** Default value */
  defaultValue?: any;

  /** Whether option is required */
  required?: boolean;
}
```

### CommandHandler

```typescript
type CommandHandler = (
  options: Record<string, any>,
  context: CommandContext
) => Promise<void> | void;
```

### CommandContext

```typescript
interface CommandContext {
  /** CLI arguments */
  args: string[];

  /** Current working directory */
  cwd: string;

  /** FSCR configuration */
  config: any;

  /** Logger instance */
  logger: Logger;

  /** Cache manager */
  cache: CacheManager;

  /** Run a task */
  runTask: (taskName: string, options?: any) => Promise<void>;

  /** Get all available tasks */
  getTasks: () => Promise<Array<{ name: string; description: string }>>;
}
```

## Utility Interfaces

### Logger

```typescript
interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  success: (message: string, ...args: any[]) => void;
}
```

### CacheManager

```typescript
interface CacheManager {
  /** Get value from cache */
  get: <T = any>(key: string) => T | undefined;

  /** Set value in cache with optional TTL (milliseconds) */
  set: <T = any>(key: string, value: T, ttl?: number) => void;

  /** Check if key exists in cache */
  has: (key: string) => boolean;

  /** Delete key from cache */
  delete: (key: string) => boolean;

  /** Clear all cache entries */
  clear: () => void;

  /** Get number of cached items */
  size: () => number;
}
```

## Plugin Manager

### PluginManager

```typescript
class PluginManager {
  constructor(
    config: Partial<PluginManagerConfig>,
    logger: Logger,
    cache: CacheManager,
    cwd: string,
    version: string
  );

  /** Initialize plugin system */
  initialize(): Promise<void>;

  /** Discover available plugins */
  discoverPlugins(): Promise<string[]>;

  /** Load a plugin */
  loadPlugin(name: string): Promise<PluginLoadResult>;

  /** Unload a plugin */
  unloadPlugin(name: string): Promise<void>;

  /** Shutdown all plugins */
  shutdown(): Promise<void>;

  /** Get loaded plugins */
  getPlugins(): Map<string, Plugin>;

  /** Get registered commands */
  getCommands(): Map<string, { command: Command; pluginName: string }>;

  /** Get hook manager */
  getHookManager(): HookManager;

  /** Get plugin load results */
  getLoadResults(): Map<string, PluginLoadResult>;

  /** Get statistics */
  getStats(): {
    totalPlugins: number;
    totalCommands: number;
    totalHooks: number;
    hooksByEvent: Record<HookEvent, number>;
    hooksByPlugin: Record<string, number>;
  };
}
```

### PluginManagerConfig

```typescript
interface PluginManagerConfig {
  /** Directory to load plugins from */
  pluginsDir?: string;

  /** Whether to auto-discover plugins */
  autoDiscover?: boolean;

  /** Plugins to enable by default */
  enabledPlugins?: string[];

  /** Plugins to disable */
  disabledPlugins?: string[];

  /** Whether to allow loading from node_modules */
  allowNodeModules?: boolean;

  /** Maximum time to wait for plugin init (ms) */
  initTimeout?: number;
}
```

### PluginLoadResult

```typescript
interface PluginLoadResult {
  plugin: Plugin;
  enabled: boolean;
  error?: Error;
  loadTime?: number;
}
```

## Hook Manager

### HookManager

```typescript
class HookManager {
  constructor(context: PluginContext);

  /** Register a hook handler */
  register<T extends HookEvent>(
    event: T,
    handler: HookHandler<T>,
    pluginName: string,
    priority?: HookPriority
  ): void;

  /** Unregister all hooks for a plugin */
  unregisterPlugin(pluginName: string): void;

  /** Execute all hooks for an event (sequential) */
  execute<T extends HookEvent>(
    event: T,
    data: HookData[T]
  ): Promise<HookExecutionResult>;

  /** Execute hooks in parallel */
  executeParallel<T extends HookEvent>(
    event: T,
    data: HookData[T]
  ): Promise<HookExecutionResult>;

  /** Check if any hooks are registered for an event */
  hasHooks(event: HookEvent): boolean;

  /** Get count of registered hooks for an event */
  getHookCount(event: HookEvent): number;

  /** Get all registered hooks */
  getAllHooks(): Map<HookEvent, HookRegistration[]>;

  /** Clear all hooks */
  clear(): void;

  /** Get hooks for a specific plugin */
  getPluginHooks(pluginName: string): HookRegistration[];

  /** Get statistics */
  getStats(): {
    totalHooks: number;
    hooksByEvent: Record<HookEvent, number>;
    hooksByPlugin: Record<string, number>;
  };
}
```

## Utility Functions

### createSafeHookHandler

```typescript
function createSafeHookHandler<T extends HookEvent>(
  handler: HookHandler<T>,
  timeout?: number
): HookHandler<T>;
```

Creates a hook handler with timeout protection.

**Parameters:**
- `handler` - The hook handler to wrap
- `timeout` - Timeout in milliseconds (default: 5000)

**Returns:** Protected hook handler

**Example:**
```typescript
const safeHandler = createSafeHookHandler(myHandler, 3000);
context.registerHook('pre-task', safeHandler);
```

### createDebouncedHookHandler

```typescript
function createDebouncedHookHandler<T extends HookEvent>(
  handler: HookHandler<T>,
  delay?: number
): HookHandler<T>;
```

Creates a debounced hook handler.

**Parameters:**
- `handler` - The hook handler to debounce
- `delay` - Debounce delay in milliseconds (default: 300)

**Returns:** Debounced hook handler

**Example:**
```typescript
const debouncedHandler = createDebouncedHookHandler(myHandler, 500);
context.registerHook('pre-task', debouncedHandler);
```

### createThrottledHookHandler

```typescript
function createThrottledHookHandler<T extends HookEvent>(
  handler: HookHandler<T>,
  interval?: number
): HookHandler<T>;
```

Creates a throttled hook handler.

**Parameters:**
- `handler` - The hook handler to throttle
- `interval` - Throttle interval in milliseconds (default: 1000)

**Returns:** Throttled hook handler

**Example:**
```typescript
const throttledHandler = createThrottledHookHandler(myHandler, 2000);
context.registerHook('pre-task', throttledHandler);
```

## Version

All types are available from:

```typescript
import type {
  Plugin,
  PluginContext,
  Command,
  HookEvent,
  HookHandler,
  // ... etc
} from 'fscr/types/plugin';
```

---

**Version:** 7.0.0
**Last Updated:** 2024

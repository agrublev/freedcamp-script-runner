# TypeScript Type Definitions

**Version:** 7.0.0
**Status:** Design Phase
**Last Updated:** 2026-03-28

## Overview

This document defines all TypeScript types, interfaces, and enums for FSCR v7.0.0. All types are exported from `src/types/index.ts` for centralized type management.

## Core Types

### Script Types

```typescript
/**
 * Represents a parsed script/task from fscripts.md or package.json
 */
export interface Script {
  /** Unique identifier for the script (e.g., "start:web") */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Script content/command to execute */
  script: string;

  /** Script language (bash, javascript, typescript, python, etc.) */
  language: ScriptLanguage;

  /** Script type (npm, node, custom) */
  type: ScriptType;

  /** Environment variables for this script */
  env?: Record<string, string>;

  /** Working directory for execution */
  cwd?: string;

  /** Script source (fscripts.md or package.json) */
  source: ScriptSource;

  /** Tags/categories for filtering */
  tags?: string[];

  /** Dependencies (other scripts that must run first) */
  dependencies?: string[];
}

/**
 * Script language types
 */
export type ScriptLanguage =
  | 'bash'
  | 'sh'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'ruby'
  | 'go'
  | 'unknown';

/**
 * Script execution types
 */
export type ScriptType =
  | 'npm'        // npm run command
  | 'node'       // node script.js
  | 'shell'      // shell command
  | 'custom';    // custom executor

/**
 * Script source types
 */
export type ScriptSource =
  | 'fscripts'   // From fscripts.md
  | 'package'    // From package.json
  | 'plugin';    // From plugin

/**
 * Collection of scripts indexed by name
 */
export interface ScriptsMap {
  [scriptName: string]: Script;
}
```

### Config Types

```typescript
/**
 * FSCR configuration structure
 */
export interface FSCRConfig {
  /** Default profile to use */
  defaultProfile?: string;

  /** Available profiles */
  profiles?: Record<string, Profile>;

  /** Scripts file path (default: fscripts.md) */
  scriptsFile?: string;

  /** Package.json file path */
  packageFile?: string;

  /** Cache settings */
  cache?: CacheConfig;

  /** Plugin settings */
  plugins?: PluginConfig;

  /** Environment variables */
  env?: Record<string, string>;

  /** Ignore patterns for script discovery */
  ignore?: string[];
}

/**
 * Profile configuration
 */
export interface Profile {
  /** Profile name */
  name: string;

  /** Scripts file for this profile */
  scriptsFile?: string;

  /** Environment variables */
  env?: Record<string, string>;

  /** Working directory */
  cwd?: string;

  /** Profile-specific config overrides */
  config?: Partial<FSCRConfig>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable/disable caching */
  enabled: boolean;

  /** TTL in milliseconds (default: 5 minutes) */
  ttl: number;

  /** Cache directory */
  dir?: string;

  /** Max cache size in bytes */
  maxSize?: number;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** Enable/disable plugins */
  enabled: boolean;

  /** Plugin directory */
  dir: string;

  /** Auto-discover plugins */
  autoDiscover: boolean;

  /** Explicitly enabled plugins */
  plugins?: string[];
}
```

### Command Types

```typescript
/**
 * Command definition for CLI
 */
export interface Command {
  /** Command name */
  name: string;

  /** Command description */
  description: string;

  /** Command aliases */
  aliases?: string[];

  /** Command options */
  options?: CommandOption[];

  /** Command arguments */
  arguments?: CommandArgument[];

  /** Command handler */
  handler: CommandHandler;

  /** Command examples */
  examples?: CommandExample[];
}

/**
 * Command option definition
 */
export interface CommandOption {
  /** Option flag (e.g., "-s, --silent") */
  flags: string;

  /** Option description */
  description: string;

  /** Default value */
  defaultValue?: string | boolean | number;

  /** Option is required */
  required?: boolean;
}

/**
 * Command argument definition
 */
export interface CommandArgument {
  /** Argument name */
  name: string;

  /** Argument description */
  description: string;

  /** Argument is required */
  required?: boolean;

  /** Allow multiple values */
  variadic?: boolean;
}

/**
 * Command example
 */
export interface CommandExample {
  /** Example description */
  description: string;

  /** Example command */
  command: string;
}

/**
 * Command handler function
 */
export type CommandHandler = (
  options: CommandOptions,
  context: CommandContext
) => Promise<void> | void;

/**
 * Parsed command options
 */
export interface CommandOptions {
  /** Option values indexed by name */
  [key: string]: string | boolean | number | string[] | undefined;
}

/**
 * Command execution context
 */
export interface CommandContext {
  /** Config manager instance */
  config: ConfigManager;

  /** Cache manager instance */
  cache: CacheManager;

  /** Plugin manager instance */
  plugins: PluginManager;

  /** Console utilities */
  console: ConsoleUtils;

  /** Current working directory */
  cwd: string;

  /** Environment variables */
  env: Record<string, string>;

  /** Active profile */
  profile?: Profile;
}
```

### Plugin Types

```typescript
/**
 * Plugin definition
 */
export interface Plugin {
  /** Plugin name */
  name: string;

  /** Plugin version */
  version: string;

  /** Plugin description */
  description?: string;

  /** Plugin author */
  author?: string;

  /** Plugin initialization */
  init?: (context: PluginContext) => Promise<void> | void;

  /** Plugin cleanup */
  destroy?: () => Promise<void> | void;

  /** Custom commands provided by plugin */
  commands?: Command[];

  /** Hooks registered by plugin */
  hooks?: PluginHooks;
}

/**
 * Plugin context provided during initialization
 */
export interface PluginContext {
  /** Register a custom command */
  registerCommand: (command: Command) => void;

  /** Register a hook */
  registerHook: (hook: HookType, handler: HookHandler) => void;

  /** Access config manager */
  config: ConfigManager;

  /** Access cache manager */
  cache: CacheManager;

  /** Console utilities */
  console: ConsoleUtils;
}

/**
 * Plugin hooks
 */
export interface PluginHooks {
  /** Before any task executes */
  'pre-task'?: HookHandler;

  /** After task completes */
  'post-task'?: HookHandler;

  /** Before config loads */
  'pre-config'?: HookHandler;

  /** After config loads */
  'post-config'?: HookHandler;

  /** Before script parsing */
  'pre-parse'?: HookHandler;

  /** After script parsing */
  'post-parse'?: HookHandler;
}

/**
 * Hook types
 */
export type HookType = keyof PluginHooks;

/**
 * Hook handler function
 */
export type HookHandler = (data: HookData) => Promise<void> | void;

/**
 * Hook data passed to handlers
 */
export interface HookData {
  /** Hook type */
  type: HookType;

  /** Payload specific to hook */
  payload: unknown;

  /** Timestamp */
  timestamp: number;

  /** Context */
  context: CommandContext;
}
```

### Runner Types

```typescript
/**
 * Task execution options
 */
export interface RunOptions {
  /** Script to execute */
  script: Script;

  /** Dry run mode (don't actually execute) */
  dryRun?: boolean;

  /** Silent mode (no output) */
  silent?: boolean;

  /** Environment variable overrides */
  env?: Record<string, string>;

  /** Working directory */
  cwd?: string;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Retry count on failure */
  retries?: number;
}

/**
 * Task execution result
 */
export interface RunResult {
  /** Execution was successful */
  success: boolean;

  /** Exit code */
  exitCode: number;

  /** Standard output */
  stdout?: string;

  /** Standard error */
  stderr?: string;

  /** Execution duration in milliseconds */
  duration: number;

  /** Error if execution failed */
  error?: Error;
}

/**
 * Sequential execution options
 */
export interface SequenceOptions {
  /** Scripts to execute in order */
  scripts: Script[];

  /** Stop on first failure */
  stopOnError?: boolean;

  /** Base run options */
  runOptions?: Partial<RunOptions>;
}

/**
 * Parallel execution options
 */
export interface ParallelOptions {
  /** Scripts to execute in parallel */
  scripts: Script[];

  /** Maximum concurrent executions */
  concurrency?: number;

  /** Base run options */
  runOptions?: Partial<RunOptions>;
}
```

### Cache Types

```typescript
/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  /** Cached value */
  value: T;

  /** Timestamp when cached */
  timestamp: number;

  /** TTL in milliseconds */
  ttl: number;

  /** Cache key */
  key: string;

  /** File path that generated this cache (for invalidation) */
  sourceFile?: string;
}

/**
 * Cache stats
 */
export interface CacheStats {
  /** Total cache entries */
  size: number;

  /** Cache hits */
  hits: number;

  /** Cache misses */
  misses: number;

  /** Hit rate percentage */
  hitRate: number;

  /** Total cache size in bytes */
  totalSize: number;
}
```

### Console Types

```typescript
/**
 * Console style options
 */
export interface ConsoleStyle {
  /** Text color */
  color?: 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';

  /** Background color */
  bgColor?: 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';

  /** Text modifiers */
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/**
 * Progress bar options
 */
export interface ProgressOptions {
  /** Total number of steps */
  total: number;

  /** Current progress */
  current: number;

  /** Progress bar width */
  width?: number;

  /** Show percentage */
  showPercentage?: boolean;

  /** Custom format string */
  format?: string;
}
```

### Doctor Types

```typescript
/**
 * Health check result
 */
export interface HealthCheck {
  /** Check name */
  name: string;

  /** Check passed */
  passed: boolean;

  /** Check message */
  message: string;

  /** Severity level */
  level: 'error' | 'warning' | 'info';

  /** Fix available */
  fixable?: boolean;

  /** Auto-fix function */
  fix?: () => Promise<void>;
}

/**
 * Doctor report
 */
export interface DoctorReport {
  /** All health checks */
  checks: HealthCheck[];

  /** Total checks run */
  total: number;

  /** Passed checks */
  passed: number;

  /** Failed checks */
  failed: number;

  /** Warnings */
  warnings: number;

  /** Overall health status */
  status: 'healthy' | 'warning' | 'critical';
}
```

## Manager Interfaces

### ConfigManager

```typescript
/**
 * Configuration manager
 */
export interface ConfigManager {
  /** Load configuration */
  load(): Promise<FSCRConfig>;

  /** Save configuration */
  save(config: FSCRConfig): Promise<void>;

  /** Get current configuration */
  get(): FSCRConfig;

  /** Get specific config value */
  getValue<T>(key: string): T | undefined;

  /** Set specific config value */
  setValue(key: string, value: unknown): void;

  /** Get active profile */
  getActiveProfile(): Profile | undefined;

  /** Switch profile */
  switchProfile(profileName: string): Promise<void>;

  /** Create new profile */
  createProfile(profile: Profile): Promise<void>;

  /** Delete profile */
  deleteProfile(profileName: string): Promise<void>;

  /** List all profiles */
  listProfiles(): Profile[];
}
```

### CacheManager

```typescript
/**
 * Cache manager
 */
export interface CacheManager {
  /** Get cached value */
  get<T>(key: string): T | undefined;

  /** Set cached value */
  set<T>(key: string, value: T, ttl?: number): void;

  /** Check if key exists and is valid */
  has(key: string): boolean;

  /** Delete cached value */
  delete(key: string): void;

  /** Clear all cache */
  clear(): void;

  /** Invalidate cache for file */
  invalidateFile(filePath: string): void;

  /** Get cache statistics */
  getStats(): CacheStats;

  /** Prune expired entries */
  prune(): number;
}
```

### PluginManager

```typescript
/**
 * Plugin manager
 */
export interface PluginManager {
  /** Load all plugins */
  loadAll(): Promise<void>;

  /** Load specific plugin */
  load(pluginName: string): Promise<Plugin>;

  /** Unload plugin */
  unload(pluginName: string): Promise<void>;

  /** Get loaded plugin */
  get(pluginName: string): Plugin | undefined;

  /** List all loaded plugins */
  list(): Plugin[];

  /** Install plugin */
  install(pluginPath: string): Promise<void>;

  /** Uninstall plugin */
  uninstall(pluginName: string): Promise<void>;

  /** Execute hook */
  executeHook(hook: HookType, data: HookData): Promise<void>;
}
```

### ConsoleUtils

```typescript
/**
 * Console utilities
 */
export interface ConsoleUtils {
  /** Print styled message */
  log(message: string, style?: ConsoleStyle): void;

  /** Print success message */
  success(message: string): void;

  /** Print error message */
  error(message: string, error?: Error): void;

  /** Print warning message */
  warn(message: string): void;

  /** Print info message */
  info(message: string): void;

  /** Print debug message */
  debug(message: string): void;

  /** Show progress bar */
  progress(options: ProgressOptions): void;

  /** Show spinner */
  spinner(message: string): { stop: () => void };

  /** Clear console */
  clear(): void;
}
```

## Utility Types

```typescript
/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Async or sync return type
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Extract function parameters
 */
export type ExtractParams<T> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Extract function return type
 */
export type ExtractReturn<T> = T extends (...args: unknown[]) => infer R ? R : never;
```

## Enums

```typescript
/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * Exit codes
 */
export enum ExitCode {
  SUCCESS = 0,
  GENERAL_ERROR = 1,
  MISUSE = 2,
  COMMAND_NOT_FOUND = 127,
  INVALID_EXIT = 128,
  TIMEOUT = 124
}

/**
 * Shell types for completion
 */
export enum ShellType {
  BASH = 'bash',
  ZSH = 'zsh',
  FISH = 'fish',
  POWERSHELL = 'powershell'
}
```

## Type Guards

```typescript
/**
 * Check if value is a Script
 */
export function isScript(value: unknown): value is Script {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'script' in value &&
    'language' in value
  );
}

/**
 * Check if value is a Plugin
 */
export function isPlugin(value: unknown): value is Plugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'version' in value
  );
}

/**
 * Check if value is a Command
 */
export function isCommand(value: unknown): value is Command {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'handler' in value
  );
}
```

## Usage Examples

### Type-Safe Command Handler

```typescript
import type { Command, CommandOptions, CommandContext } from './types';

export const runCommand: Command = {
  name: 'run',
  description: 'Run a task',
  options: [
    {
      flags: '-d, --dry-run',
      description: 'Show what would be executed',
      defaultValue: false
    }
  ],
  handler: async (options: CommandOptions, context: CommandContext) => {
    const taskName = options.task as string;
    const dryRun = options.dryRun as boolean;

    // Type-safe access to context
    const scripts = await context.cache.get<ScriptsMap>('scripts');
    const script = scripts?.[taskName];

    if (!script) {
      context.console.error(`Task "${taskName}" not found`);
      return;
    }

    if (dryRun) {
      context.console.info(`Would execute: ${script.script}`);
    } else {
      // Execute task
    }
  }
};
```

### Type-Safe Plugin

```typescript
import type { Plugin, PluginContext, HookData } from './types';

export default {
  name: 'my-plugin',
  version: '1.0.0',

  async init(context: PluginContext) {
    // Register hook with type safety
    context.registerHook('pre-task', async (data: HookData) => {
      context.console.log(`Running task: ${data.payload}`);
    });

    // Register command
    context.registerCommand({
      name: 'custom',
      description: 'Custom command',
      handler: async (options, ctx) => {
        ctx.console.success('Custom command executed!');
      }
    });
  }
} satisfies Plugin;
```

## Export Structure

All types are exported from a single entry point:

```typescript
// src/types/index.ts
export * from './script.types';
export * from './config.types';
export * from './command.types';
export * from './plugin.types';
export * from './runner.types';
export * from './cache.types';
export * from './console.types';
export * from './doctor.types';
export * from './manager.types';
export * from './utility.types';
export * from './guards';
```

## Type Testing

All types should be tested for correctness:

```typescript
// tests/types/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Script, Plugin, Command } from '../src/types';

describe('Type Tests', () => {
  it('should accept valid Script', () => {
    const script: Script = {
      name: 'test',
      script: 'echo "test"',
      language: 'bash',
      type: 'shell',
      source: 'fscripts'
    };

    expect(script.name).toBe('test');
  });

  it('should enforce required fields', () => {
    // @ts-expect-error - missing required field
    const invalid: Script = {
      name: 'test'
    };
  });
});
```

## Summary

This type system provides:

- ✅ **100% type coverage** for all public APIs
- ✅ **Type safety** at compile time
- ✅ **IDE autocomplete** and IntelliSense
- ✅ **Runtime validation** with type guards
- ✅ **Extensibility** for plugins
- ✅ **Documentation** via TSDoc comments

All types are designed to be:
- Immutable where possible
- Composable and reusable
- Self-documenting
- Performance-friendly (no runtime overhead)

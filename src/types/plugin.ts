/**
 * Plugin System Type Definitions
 * FSCR v7.0.0 - Plugin Architecture
 */

/**
 * Hook event types that plugins can listen to
 */
export type HookEvent =
  | 'pre-task'      // Before a task runs
  | 'post-task'     // After a task completes
  | 'pre-command'   // Before any command runs
  | 'post-command'  // After any command completes
  | 'task-error'    // When a task throws an error
  | 'init'          // When FSCR initializes
  | 'shutdown';     // When FSCR is shutting down

/**
 * Priority for hook execution order
 */
export type HookPriority = 'highest' | 'high' | 'normal' | 'low' | 'lowest';

/**
 * Hook execution data for different event types
 */
export interface HookData {
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

/**
 * Hook handler function signature
 */
export type HookHandler<T extends HookEvent = HookEvent> = (
  data: HookData[T],
  context: PluginContext
) => Promise<void> | void;

/**
 * Hook registration with metadata
 */
export interface HookRegistration {
  event: HookEvent;
  handler: HookHandler<any>;
  priority: HookPriority;
  pluginName: string;
}

/**
 * Command definition that plugins can register
 */
export interface Command {
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

/**
 * Command option definition
 */
export interface CommandOption {
  /** Flag name (e.g., '-f, --force') */
  flags: string;

  /** Option description */
  description: string;

  /** Default value */
  defaultValue?: any;

  /** Whether option is required */
  required?: boolean;
}

/**
 * Command handler function
 */
export type CommandHandler = (
  options: Record<string, any>,
  context: CommandContext
) => Promise<void> | void;

/**
 * Context passed to command handlers
 */
export interface CommandContext {
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

/**
 * Context passed to plugins during initialization
 */
export interface PluginContext {
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

/**
 * Plugin metadata
 */
export interface PluginMetadata {
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

/**
 * Main plugin interface
 */
export interface Plugin extends PluginMetadata {
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

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
  plugin: Plugin;
  enabled: boolean;
  error?: Error;
  loadTime?: number;
}

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  success: (message: string, ...args: any[]) => void;
}

/**
 * Cache manager interface
 */
export interface CacheManager {
  get: <T = any>(key: string) => T | undefined;
  set: <T = any>(key: string, value: T, ttl?: number) => void;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  size: () => number;
}

/**
 * Plugin manager configuration
 */
export interface PluginManagerConfig {
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

/**
 * Hook execution result
 */
export interface HookExecutionResult {
  event: HookEvent;
  executedCount: number;
  errors: Array<{ plugin: string; error: Error }>;
  duration: number;
}

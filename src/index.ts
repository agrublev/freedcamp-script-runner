/**
 * FSCR v7.0.0 - Plugin System Entry Point
 * Export all types and utilities for plugin development
 */

// Type exports
export type {
  // Core plugin types
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginLoadResult,
  PluginManagerConfig,

  // Hook types
  HookEvent,
  HookPriority,
  HookHandler,
  HookData,
  HookRegistration,
  HookExecutionResult,

  // Command types
  Command,
  CommandOption,
  CommandHandler,
  CommandContext,

  // Utility types
  Logger,
  CacheManager
} from './types/plugin.js';

// Class exports
export { PluginManager } from './lib/plugins.js';
export { HookManager } from './lib/hooks.js';

// Utility exports
export {
  createSafeHookHandler,
  createDebouncedHookHandler,
  createThrottledHookHandler
} from './lib/hooks.js';

/**
 * Version
 */
export const VERSION = '7.0.0';

/**
 * Re-export for convenience
 */
export * from './types/plugin.js';

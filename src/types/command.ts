/**
 * FSCR v7.0.0 - Command Type Definitions
 * Type-safe command structure for CLI
 */

/**
 * Command argument configuration
 */
export interface ArgumentConfig {
  name: string;
  description: string;
  required?: boolean;
  default?: string | number | boolean;
  type?: 'string' | 'number' | 'boolean' | 'array';
  variadic?: boolean;
}

/**
 * Command option configuration
 */
export interface OptionConfig {
  name: string;
  alias?: string;
  description: string;
  type?: 'string' | 'number' | 'boolean' | 'array';
  default?: string | number | boolean | string[];
  required?: boolean;
  choices?: string[];
}

/**
 * Command execution context
 */
export interface CommandContext {
  args: Record<string, any>;
  options: Record<string, any>;
  cwd: string;
  config: CommandConfig;
  dryRun?: boolean;
}

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
  exitCode?: number;
}

/**
 * Command handler function
 */
export type CommandHandler = (context: CommandContext) => Promise<CommandResult>;

/**
 * Command definition
 */
export interface Command {
  name: string;
  description: string;
  category?: 'core' | 'utility' | 'config' | 'plugin' | 'advanced';
  arguments?: ArgumentConfig[];
  options?: OptionConfig[];
  examples?: string[];
  handler: CommandHandler;
  aliases?: string[];
  deprecated?: boolean;
  experimental?: boolean;
  hidden?: boolean;
}

/**
 * Global command configuration
 */
export interface CommandConfig {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
  quiet?: boolean;
  color?: boolean;
  profile?: string;
}

/**
 * Command registry entry
 */
export interface CommandRegistryEntry {
  command: Command;
  loader: () => Promise<Command>;
  loaded: boolean;
}

/**
 * Command execution options
 */
export interface ExecuteOptions {
  showProgress?: boolean;
  throwOnError?: boolean;
  timeout?: number;
  signal?: AbortSignal;
}

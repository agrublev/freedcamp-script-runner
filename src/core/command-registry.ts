/**
 * FSCR v7.0.0 - Command Registry
 * Lazy-loading command registry with dynamic imports
 */

import type { Command, CommandRegistryEntry } from '../types';

/**
 * Command registry with lazy loading support
 */
export class CommandRegistry {
  private commands: Map<string, CommandRegistryEntry> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a command with lazy loading
   */
  register(name: string, loader: () => Promise<Command>): void {
    this.commands.set(name, {
      command: null as any, // Will be loaded lazily
      loader,
      loaded: false
    });
  }

  /**
   * Register a command alias
   */
  registerAlias(alias: string, commandName: string): void {
    this.aliases.set(alias, commandName);
  }

  /**
   * Get a command by name (loads if not loaded)
   */
  async get(name: string): Promise<Command | null> {
    // Resolve alias
    const resolvedName = this.aliases.get(name) || name;

    const entry = this.commands.get(resolvedName);
    if (!entry) {
      return null;
    }

    // Load command if not loaded
    if (!entry.loaded) {
      try {
        const module = await entry.loader();
        entry.command = module.default || module;
        entry.loaded = true;
      } catch (error) {
        console.error(`Failed to load command '${resolvedName}':`, error);
        return null;
      }
    }

    return entry.command;
  }

  /**
   * Check if a command exists
   */
  has(name: string): boolean {
    const resolvedName = this.aliases.get(name) || name;
    return this.commands.has(resolvedName);
  }

  /**
   * Get all registered command names
   */
  getNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get all registered aliases
   */
  getAliases(): Record<string, string> {
    return Object.fromEntries(this.aliases);
  }

  /**
   * Get commands by category
   */
  async getByCategory(category: string): Promise<Command[]> {
    const commands: Command[] = [];

    for (const [name, entry] of this.commands) {
      const command = await this.get(name);
      if (command && command.category === category) {
        commands.push(command);
      }
    }

    return commands;
  }

  /**
   * List all available commands (without loading them)
   */
  list(): Array<{ name: string; loaded: boolean }> {
    return Array.from(this.commands.entries()).map(([name, entry]) => ({
      name,
      loaded: entry.loaded
    }));
  }

  /**
   * Preload specific commands
   */
  async preload(names: string[]): Promise<void> {
    await Promise.all(names.map(name => this.get(name)));
  }

  /**
   * Preload all commands
   */
  async preloadAll(): Promise<void> {
    const names = this.getNames();
    await this.preload(names);
  }

  /**
   * Clear the registry
   */
  clear(): void {
    this.commands.clear();
    this.aliases.clear();
  }
}

/**
 * Global command registry instance
 */
export const registry = new CommandRegistry();

/**
 * Initialize and register all commands
 */
export async function initializeRegistry(): Promise<void> {
  // Core commands
  registry.register('run', () => import('../commands/run'));
  registry.register('list', () => import('../commands/list'));
  registry.register('scripts', () => import('../commands/scripts'));
  registry.register('run-s', () => import('../commands/run-s'));
  registry.register('run-p', () => import('../commands/run-p'));

  // Utility commands
  registry.register('generate', () => import('../commands/generate'));
  registry.register('toc', () => import('../commands/toc'));
  registry.register('clear', () => import('../commands/clear'));
  registry.register('doctor', () => import('../commands/doctor'));
  registry.register('completion', () => import('../commands/completion'));

  // Profile commands
  registry.register('profile:list', () => import('../commands/profile/list'));
  registry.register('profile:create', () => import('../commands/profile/create'));
  registry.register('profile:switch', () => import('../commands/profile/switch'));
  registry.register('profile:delete', () => import('../commands/profile/delete'));

  // Plugin commands
  registry.register('plugin:list', () => import('../commands/plugin/list'));
  registry.register('plugin:install', () => import('../commands/plugin/install'));
  registry.register('plugin:uninstall', () => import('../commands/plugin/uninstall'));

  // Register common aliases
  registry.registerAlias('r', 'run');
  registry.registerAlias('ls', 'list');
  registry.registerAlias('gen', 'generate');
  registry.registerAlias('doc', 'doctor');
}

/**
 * Execute a command by name
 */
export async function executeCommand(
  name: string,
  args: Record<string, any>,
  options: Record<string, any>,
  cwd: string = process.cwd()
): Promise<any> {
  const command = await registry.get(name);

  if (!command) {
    throw new Error(`Command not found: ${name}`);
  }

  const context = {
    args,
    options,
    cwd,
    config: {
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      force: options.force || false,
      quiet: options.quiet || false,
      color: options.color !== false
    }
  };

  return await command.handler(context);
}

export default registry;

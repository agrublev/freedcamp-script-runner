/**
 * FSCR v7.0.0 - Plugin Uninstall Command
 */

import type { Command, CommandContext, CommandResult } from '../../types';
import chalk from 'chalk';

export const pluginUninstallCommand: Command = {
  name: 'plugin uninstall',
  description: 'Uninstall a plugin',
  category: 'plugin',

  arguments: [
    {
      name: 'name',
      description: 'Plugin name to uninstall',
      required: true,
      type: 'string'
    }
  ],

  options: [
    {
      name: 'force',
      alias: 'f',
      description: 'Skip confirmation prompt',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr plugin uninstall notifications',
    'fsr plugin uninstall old-plugin --force'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const name = args.name as string;
    const fs = await import('fs-extra');
    const path = await import('path');

    try {
      const pluginsDir = path.join(context.cwd, '.fscr', 'plugins');
      const registryPath = path.join(context.cwd, '.fscr', 'plugin-registry.json');

      if (!await fs.pathExists(registryPath)) {
        return {
          success: false,
          message: 'No plugins installed',
          exitCode: 1
        };
      }

      const registry = await fs.readJSON(registryPath);
      const plugin = registry.plugins.find((p: any) => p.name === name);

      if (!plugin) {
        return {
          success: false,
          message: `Plugin '${name}' not found`,
          exitCode: 1
        };
      }

      if (!options.force) {
        const { default: inquirer } = await import('inquirer');
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Uninstall plugin '${name}'?`,
            default: false
          }
        ]);

        if (!confirmed) {
          console.log(chalk.gray('Cancelled.'));
          return {
            success: false,
            message: 'Operation cancelled',
            exitCode: 0
          };
        }
      }

      // Remove plugin files
      if (plugin.installedPath && await fs.pathExists(plugin.installedPath)) {
        await fs.remove(plugin.installedPath);
      }

      // Update registry
      registry.plugins = registry.plugins.filter((p: any) => p.name !== name);
      await fs.writeJSON(registryPath, registry, { spaces: 2 });

      console.log(chalk.green(`✓ Uninstalled plugin '${name}'`));

      return {
        success: true,
        message: `Plugin '${name}' uninstalled`,
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to uninstall plugin',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default pluginUninstallCommand;

/**
 * FSCR v7.0.0 - Plugin List Command
 */

import type { Command, CommandContext, CommandResult } from '../../types';
import chalk from 'chalk';

export const pluginListCommand: Command = {
  name: 'plugin list',
  description: 'List installed plugins',
  category: 'plugin',

  options: [
    {
      name: 'format',
      alias: 'f',
      description: 'Output format (table, json)',
      type: 'string',
      choices: ['table', 'json'],
      default: 'table'
    },
    {
      name: 'enabled-only',
      alias: 'e',
      description: 'Show only enabled plugins',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr plugin list',
    'fsr plugin list --format json',
    'fsr plugin list --enabled-only'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { options } = context;
    const fs = await import('fs-extra');
    const path = await import('path');

    try {
      const pluginsDir = path.join(context.cwd, '.fscr', 'plugins');
      const registryPath = path.join(context.cwd, '.fscr', 'plugin-registry.json');

      if (!await fs.pathExists(pluginsDir)) {
        console.log(chalk.yellow('No plugins installed.'));
        return {
          success: true,
          data: { plugins: [] },
          exitCode: 0
        };
      }

      let registry: any = { plugins: [] };
      if (await fs.pathExists(registryPath)) {
        registry = await fs.readJSON(registryPath);
      }

      const installedPlugins = registry.plugins || [];

      let filtered = installedPlugins;
      if (options.enabledOnly) {
        filtered = filtered.filter((p: any) => p.enabled);
      }

      if (filtered.length === 0) {
        console.log(chalk.yellow('No plugins found.'));
        return {
          success: true,
          data: { plugins: [] },
          exitCode: 0
        };
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(filtered, null, 2));
      } else {
        console.log(chalk.bold('\nInstalled Plugins:\n'));

        filtered.forEach((plugin: any) => {
          const status = plugin.enabled
            ? chalk.green('✓')
            : chalk.gray('○');
          const name = plugin.enabled
            ? chalk.cyan.bold(plugin.name)
            : chalk.gray(plugin.name);
          const version = chalk.gray(`v${plugin.version || '0.0.0'}`);

          console.log(`  ${status} ${name} ${version}`);

          if (plugin.description) {
            console.log(chalk.gray(`    ${plugin.description}`));
          }
        });

        console.log(chalk.gray(`\nTotal: ${filtered.length} plugin(s)\n`));
      }

      return {
        success: true,
        data: { plugins: filtered },
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to list plugins',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default pluginListCommand;

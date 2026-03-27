/**
 * FSCR v7.0.0 - Clear Command
 * Clear recent task execution history
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clear recent task history',
  category: 'utility',

  options: [
    {
      name: 'all',
      alias: 'a',
      description: 'Clear all history (including cache)',
      type: 'boolean',
      default: false
    },
    {
      name: 'confirm',
      alias: 'y',
      description: 'Skip confirmation prompt',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr clear',
    'fsr clear --all',
    'fsr clear -y'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { options } = context;

    try {
      // Ask for confirmation if not provided
      if (!options.confirm) {
        const { default: inquirer } = await import('inquirer');
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: options.all
              ? 'Are you sure you want to clear all history and cache?'
              : 'Are you sure you want to clear recent task history?',
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

      const { clearRecent } = await import('../../../lib/startScripts.js');

      console.log(chalk.blue('Clearing history...'));

      await clearRecent();

      if (options.all) {
        // Clear additional cache/config files if needed
        const fs = await import('fs-extra');
        const path = await import('path');
        const Conf = (await import('conf')).default;

        const config = new Conf({ projectName: 'fscr' });
        config.clear();

        console.log(chalk.green('✓ Cleared all history and cache'));
      } else {
        console.log(chalk.green('✓ Cleared recent task history'));
      }

      return {
        success: true,
        message: 'History cleared successfully',
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear history',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default clearCommand;

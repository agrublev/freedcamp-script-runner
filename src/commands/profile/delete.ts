/**
 * FSCR v7.0.0 - Profile Delete Command
 */

import type { Command, CommandContext, CommandResult } from '../../types';
import chalk from 'chalk';

export const profileDeleteCommand: Command = {
  name: 'profile delete',
  description: 'Delete a profile',
  category: 'config',

  arguments: [
    {
      name: 'name',
      description: 'Profile name to delete',
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
    'fsr profile delete old-profile',
    'fsr profile delete temp --force'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const name = args.name as string;
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');

    try {
      const profilesDir = path.join(os.homedir(), '.fscr', 'profiles');
      const profilePath = path.join(profilesDir, `${name}.json`);

      if (!await fs.pathExists(profilePath)) {
        return {
          success: false,
          message: `Profile '${name}' not found`,
          exitCode: 1
        };
      }

      const activeProfilePath = path.join(os.homedir(), '.fscr', 'active-profile');
      let activeProfile = 'default';

      if (await fs.pathExists(activeProfilePath)) {
        activeProfile = (await fs.readFile(activeProfilePath, 'utf-8')).trim();
      }

      if (activeProfile === name) {
        return {
          success: false,
          message: `Cannot delete active profile '${name}'. Switch to another profile first.`,
          exitCode: 1
        };
      }

      if (!options.force) {
        const { default: inquirer } = await import('inquirer');
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Delete profile '${name}'? This cannot be undone.`,
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

      await fs.remove(profilePath);

      console.log(chalk.green(`✓ Deleted profile '${name}'`));

      return {
        success: true,
        message: `Profile '${name}' deleted`,
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete profile',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default profileDeleteCommand;

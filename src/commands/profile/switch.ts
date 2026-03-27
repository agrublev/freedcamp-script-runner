/**
 * FSCR v7.0.0 - Profile Switch Command
 */

import type { Command, CommandContext, CommandResult } from '../../types';
import chalk from 'chalk';

export const profileSwitchCommand: Command = {
  name: 'profile switch',
  description: 'Switch to a different profile',
  category: 'config',

  arguments: [
    {
      name: 'name',
      description: 'Profile name to switch to',
      required: true,
      type: 'string'
    }
  ],

  options: [
    {
      name: 'force',
      alias: 'f',
      description: 'Force switch without confirmation',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr profile switch production',
    'fsr profile switch dev --force'
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
      let currentProfile = 'default';

      if (await fs.pathExists(activeProfilePath)) {
        currentProfile = (await fs.readFile(activeProfilePath, 'utf-8')).trim();
      }

      if (currentProfile === name) {
        console.log(chalk.yellow(`Already using profile '${name}'`));
        return {
          success: true,
          message: `Profile '${name}' is already active`,
          exitCode: 0
        };
      }

      if (!options.force) {
        const { default: inquirer } = await import('inquirer');
        const { confirmed } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: `Switch from '${currentProfile}' to '${name}'?`,
            default: true
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

      await fs.writeFile(activeProfilePath, name);

      console.log(chalk.green(`✓ Switched to profile '${name}'`));

      return {
        success: true,
        message: `Switched to profile '${name}'`,
        data: { from: currentProfile, to: name },
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to switch profile',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default profileSwitchCommand;

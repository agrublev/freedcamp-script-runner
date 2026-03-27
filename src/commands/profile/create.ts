/**
 * FSCR v7.0.0 - Profile Create Command
 */

import type { Command, CommandContext, CommandResult } from '../../types';
import chalk from 'chalk';

export const profileCreateCommand: Command = {
  name: 'profile create',
  description: 'Create a new profile',
  category: 'config',

  arguments: [
    {
      name: 'name',
      description: 'Profile name',
      required: true,
      type: 'string'
    }
  ],

  options: [
    {
      name: 'description',
      alias: 'd',
      description: 'Profile description',
      type: 'string'
    },
    {
      name: 'copy-from',
      alias: 'c',
      description: 'Copy settings from existing profile',
      type: 'string'
    },
    {
      name: 'activate',
      alias: 'a',
      description: 'Activate after creation',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr profile create work',
    'fsr profile create personal --description "Personal projects"',
    'fsr profile create staging --copy-from production',
    'fsr profile create dev --activate'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const name = args.name as string;
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');

    try {
      const profilesDir = path.join(os.homedir(), '.fscr', 'profiles');
      await fs.ensureDir(profilesDir);

      const profilePath = path.join(profilesDir, `${name}.json`);

      if (await fs.pathExists(profilePath)) {
        return {
          success: false,
          message: `Profile '${name}' already exists`,
          exitCode: 1
        };
      }

      let settings = {};

      if (options.copyFrom) {
        const copyFromPath = path.join(profilesDir, `${options.copyFrom}.json`);
        if (await fs.pathExists(copyFromPath)) {
          const sourceProfile = await fs.readJSON(copyFromPath);
          settings = sourceProfile.settings || {};
        } else {
          console.log(chalk.yellow(`Warning: Source profile '${options.copyFrom}' not found. Creating empty profile.`));
        }
      }

      const profile = {
        name,
        description: options.description || '',
        created: Date.now(),
        modified: Date.now(),
        settings
      };

      await fs.writeJSON(profilePath, profile, { spaces: 2 });

      console.log(chalk.green(`✓ Created profile '${name}'`));

      if (options.activate) {
        const activeProfilePath = path.join(os.homedir(), '.fscr', 'active-profile');
        await fs.writeFile(activeProfilePath, name);
        console.log(chalk.green(`✓ Activated profile '${name}'`));
      }

      return {
        success: true,
        message: `Profile '${name}' created`,
        data: { profile },
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to create profile',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default profileCreateCommand;

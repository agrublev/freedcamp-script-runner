/**
 * FSCR v7.0.0 - Profile List Command
 * List all available profiles
 */

import type { Command, CommandContext, CommandResult } from '../../types';
import chalk from 'chalk';

export const profileListCommand: Command = {
  name: 'profile list',
  description: 'List all available profiles',
  category: 'config',

  options: [
    {
      name: 'format',
      alias: 'f',
      description: 'Output format (table, json, simple)',
      type: 'string',
      choices: ['table', 'json', 'simple'],
      default: 'table'
    },
    {
      name: 'detailed',
      alias: 'd',
      description: 'Show detailed information',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr profile list',
    'fsr profile list --format json',
    'fsr profile list --detailed'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { options } = context;
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');

    try {
      const profilesDir = path.join(os.homedir(), '.fscr', 'profiles');
      const activeProfilePath = path.join(os.homedir(), '.fscr', 'active-profile');

      // Ensure profiles directory exists
      await fs.ensureDir(profilesDir);

      // Get active profile
      let activeProfile = 'default';
      if (await fs.pathExists(activeProfilePath)) {
        activeProfile = (await fs.readFile(activeProfilePath, 'utf-8')).trim();
      }

      // Read all profiles
      const files = await fs.readdir(profilesDir);
      const profileFiles = files.filter(f => f.endsWith('.json'));

      if (profileFiles.length === 0) {
        console.log(chalk.yellow('No profiles found.'));
        console.log(chalk.gray('Create one with: fsr profile create <name>'));
        return {
          success: true,
          data: { profiles: [] },
          exitCode: 0
        };
      }

      const profiles = await Promise.all(
        profileFiles.map(async (file) => {
          const name = file.replace('.json', '');
          const filePath = path.join(profilesDir, file);
          const profile = await fs.readJSON(filePath);
          const stats = await fs.stat(filePath);

          return {
            name,
            description: profile.description || '',
            active: name === activeProfile,
            created: profile.created || stats.birthtimeMs,
            modified: profile.modified || stats.mtimeMs,
            settings: profile.settings || {}
          };
        })
      );

      // Sort by active first, then by name
      profiles.sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.name.localeCompare(b.name);
      });

      if (options.format === 'json') {
        console.log(JSON.stringify(profiles, null, 2));
      } else if (options.format === 'simple') {
        profiles.forEach(p => {
          console.log(`${p.active ? '* ' : '  '}${p.name}`);
        });
      } else {
        // Table format
        console.log(chalk.bold('\nProfiles:\n'));

        profiles.forEach(p => {
          const indicator = p.active ? chalk.green('* ') : '  ';
          const name = p.active ? chalk.green.bold(p.name) : chalk.cyan(p.name);
          const desc = p.description ? chalk.gray(` - ${p.description}`) : '';

          console.log(`${indicator}${name}${desc}`);

          if (options.detailed) {
            const created = new Date(p.created).toLocaleDateString();
            const modified = new Date(p.modified).toLocaleDateString();
            console.log(chalk.gray(`    Created: ${created}, Modified: ${modified}`));

            if (Object.keys(p.settings).length > 0) {
              console.log(chalk.gray(`    Settings: ${Object.keys(p.settings).length} configured`));
            }
          }
        });

        console.log(chalk.gray(`\nTotal: ${profiles.length} profile(s)`));
        console.log(chalk.gray(`Active: ${activeProfile}\n`));
      }

      return {
        success: true,
        data: { profiles, active: activeProfile },
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to list profiles',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default profileListCommand;

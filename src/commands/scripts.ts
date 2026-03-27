/**
 * FSCR v7.0.0 - Scripts Command
 * Choose and run scripts from package.json
 */

import type { Command, CommandContext, CommandResult } from '../types';

export const scriptsCommand: Command = {
  name: 'scripts',
  description: 'Choose a script from package.json',
  category: 'core',

  options: [
    {
      name: 'format',
      alias: 'f',
      description: 'Output format (interactive, list, json)',
      type: 'string',
      choices: ['interactive', 'list', 'json'],
      default: 'interactive'
    }
  ],

  examples: [
    'fsr scripts',
    'fsr scripts --format list',
    'fsr scripts --format json'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { options } = context;

    try {
      const { startPackageScripts } = await import('../../../lib/startScripts.js');

      if (options.format === 'json' || options.format === 'list') {
        // Read package.json
        const fs = await import('fs-extra');
        const path = await import('path');
        const packagePath = path.join(context.cwd, 'package.json');

        if (!await fs.pathExists(packagePath)) {
          return {
            success: false,
            message: 'package.json not found in current directory',
            exitCode: 1
          };
        }

        const packageJson = await fs.readJSON(packagePath);
        const scripts = packageJson.scripts || {};

        if (options.format === 'json') {
          console.log(JSON.stringify(scripts, null, 2));
        } else {
          console.log('\nAvailable scripts:\n');
          Object.keys(scripts).forEach(name => {
            console.log(`  ${name}: ${scripts[name]}`);
          });
          console.log();
        }

        return {
          success: true,
          data: scripts,
          exitCode: 0
        };
      }

      // Interactive mode
      await startPackageScripts();

      return {
        success: true,
        message: 'Script selection completed',
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to load package.json scripts',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default scriptsCommand;

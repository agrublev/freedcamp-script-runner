/**
 * FSCR v7.0.0 - Generate Command
 * Generate sample fscripts.md from package.json
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const generateCommand: Command = {
  name: 'generate',
  description: 'Generate a sample fscripts.md file from the package.json',
  category: 'utility',

  options: [
    {
      name: 'output',
      alias: 'o',
      description: 'Output file path',
      type: 'string',
      default: 'sample.fscripts.md'
    },
    {
      name: 'force',
      alias: 'f',
      description: 'Overwrite existing file',
      type: 'boolean',
      default: false
    },
    {
      name: 'include-categories',
      alias: 'c',
      description: 'Generate with categories',
      type: 'boolean',
      default: true
    }
  ],

  examples: [
    'fsr generate',
    'fsr generate --output my-scripts.md',
    'fsr generate --force',
    'fsr generate --no-include-categories'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { options } = context;

    try {
      const { generateFScripts } = await import('../../../lib/generators/index.js');
      const fs = await import('fs-extra');
      const path = await import('path');

      const outputPath = path.join(context.cwd, options.output as string);

      // Check if file exists and force flag is not set
      if (await fs.pathExists(outputPath) && !options.force) {
        console.log(chalk.yellow(`File ${options.output} already exists.`));
        console.log(chalk.gray('Use --force to overwrite.'));
        return {
          success: false,
          message: 'File already exists',
          exitCode: 1
        };
      }

      console.log(chalk.blue('Generating fscripts.md from package.json...'));

      await generateFScripts();

      // If custom output path, rename the generated file
      if (options.output !== 'sample.fscripts.md') {
        const defaultPath = path.join(context.cwd, 'sample.fscripts.md');
        if (await fs.pathExists(defaultPath)) {
          await fs.move(defaultPath, outputPath, { overwrite: options.force });
        }
      }

      console.log(chalk.green(`✓ Generated ${options.output}`));
      console.log(chalk.gray('\nYou can now use this as a template for your fscripts file.'));

      return {
        success: true,
        message: `Generated ${options.output}`,
        data: { outputPath },
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate fscripts.md',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default generateCommand;

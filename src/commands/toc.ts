/**
 * FSCR v7.0.0 - Table of Contents Command
 * Generate updated ToC for fscripts.md
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const tocCommand: Command = {
  name: 'toc',
  description: 'Generate updated Table of Contents on top of the fscripts.md file',
  category: 'utility',

  arguments: [
    {
      name: 'file',
      description: 'Markdown file to generate ToC for',
      required: false,
      type: 'string',
      default: 'fscripts.md'
    }
  ],

  options: [
    {
      name: 'depth',
      alias: 'd',
      description: 'Maximum heading depth for ToC',
      type: 'number',
      default: 3
    },
    {
      name: 'backup',
      alias: 'b',
      description: 'Create backup before modifying',
      type: 'boolean',
      default: true
    }
  ],

  examples: [
    'fsr toc',
    'fsr toc README.md',
    'fsr toc --depth 2',
    'fsr toc custom.md --no-backup'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const mdFile = (args.file || 'fscripts.md') as string;

    try {
      const { generateToc } = await import('../../../lib/generators/index.js');
      const fs = await import('fs-extra');
      const path = await import('path');

      const filePath = path.join(context.cwd, mdFile);

      // Check if file exists
      if (!await fs.pathExists(filePath)) {
        return {
          success: false,
          message: `File ${mdFile} not found`,
          exitCode: 1
        };
      }

      // Create backup if requested
      if (options.backup) {
        const backupPath = `${filePath}.backup`;
        await fs.copy(filePath, backupPath);
        console.log(chalk.gray(`Created backup: ${mdFile}.backup`));
      }

      console.log(chalk.blue(`Generating Table of Contents for ${mdFile}...`));

      await generateToc(mdFile);

      console.log(chalk.green(`✓ Updated Table of Contents in ${mdFile}`));

      return {
        success: true,
        message: `Updated ToC in ${mdFile}`,
        data: { file: mdFile },
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate Table of Contents',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default tocCommand;

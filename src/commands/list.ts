/**
 * FSCR v7.0.0 - List Command
 * Display all available tasks with interactive selection
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const listCommand: Command = {
  name: 'list',
  description: 'Select any task with text autocompletion',
  category: 'core',

  options: [
    {
      name: 'category',
      alias: 'c',
      description: 'Filter tasks by category',
      type: 'string'
    },
    {
      name: 'search',
      alias: 's',
      description: 'Search tasks by name or description',
      type: 'string'
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Output format',
      type: 'string',
      choices: ['interactive', 'table', 'json', 'simple'],
      default: 'interactive'
    }
  ],

  examples: [
    'fsr list',
    'fsr list --category build',
    'fsr list --search test',
    'fsr list --format json'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { options } = context;

    try {
      const { startScripts } = await import('../../../lib/startScripts.js');
      const { parseScriptFile } = await import('../../../lib/parsers/parseScriptsMd.js');

      if (options.format === 'json' || options.format === 'table' || options.format === 'simple') {
        // Non-interactive formats
        const { allTasks } = await parseScriptFile();
        let filteredTasks = allTasks;

        if (options.category) {
          filteredTasks = filteredTasks.filter((t: any) =>
            t.category === options.category
          );
        }

        if (options.search) {
          const searchLower = options.search.toLowerCase();
          filteredTasks = filteredTasks.filter((t: any) =>
            t.name.toLowerCase().includes(searchLower) ||
            (t.description && t.description.toLowerCase().includes(searchLower))
          );
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(filteredTasks, null, 2));
        } else if (options.format === 'table') {
          console.log(chalk.bold('\nAvailable Tasks:\n'));
          filteredTasks.forEach((task: any) => {
            const nameColumn = task.name.padEnd(30);
            console.log(chalk.cyan(`  ${nameColumn}`),
                       chalk.gray(task.description || ''));
          });
          console.log(chalk.gray(`\nTotal: ${filteredTasks.length} tasks\n`));
        } else {
          filteredTasks.forEach((task: any) => {
            console.log(task.name);
          });
        }

        return {
          success: true,
          data: filteredTasks,
          exitCode: 0
        };
      }

      // Interactive mode (default)
      await startScripts(false);

      return {
        success: true,
        message: 'Task selection completed',
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to list tasks',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default listCommand;

/**
 * FSCR v7.0.0 - Run Sequential Command
 * Execute multiple tasks one after another
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const runSequentialCommand: Command = {
  name: 'run-s',
  description: 'Run a set of tasks one after another',
  category: 'core',

  arguments: [
    {
      name: 'tasks',
      description: 'Task names to run sequentially',
      required: true,
      type: 'array',
      variadic: true
    }
  ],

  options: [
    {
      name: 'stop-on-error',
      alias: 'e',
      description: 'Stop execution if a task fails',
      type: 'boolean',
      default: true
    },
    {
      name: 'verbose',
      alias: 'v',
      description: 'Show detailed execution information',
      type: 'boolean',
      default: false
    },
    {
      name: 'dry-run',
      alias: 'n',
      description: 'Show execution plan without running',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr run-s start:web start:desktop',
    'fsr run-s clean build test',
    'fsr run-s lint test build --verbose',
    'fsr run-s task1 task2 task3 --dry-run'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const tasks = args.tasks as string[];

    if (!tasks || tasks.length === 0) {
      return {
        success: false,
        message: 'No tasks specified',
        exitCode: 1
      };
    }

    try {
      const { parseScriptFile } = await import('../../../lib/parsers/parseScriptsMd.js');
      const { runSequence } = await import('../../../lib/running/index.js');

      if (options.verbose) {
        console.log(chalk.blue(`Running ${tasks.length} tasks sequentially:`));
        tasks.forEach((task, index) => {
          console.log(chalk.cyan(`  ${index + 1}. ${task}`));
        });
      }

      if (options.dryRun) {
        console.log(chalk.yellow('\nDry run mode - would execute in order:'));
        tasks.forEach((task, index) => {
          console.log(chalk.cyan(`  ${index + 1}. ${task}`));
        });
        return {
          success: true,
          message: 'Dry run completed',
          data: { tasks, order: 'sequential' },
          exitCode: 0
        };
      }

      const FcScripts = await parseScriptFile();
      await runSequence(tasks, FcScripts);

      return {
        success: true,
        message: `All ${tasks.length} tasks completed successfully`,
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Sequential execution failed',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default runSequentialCommand;

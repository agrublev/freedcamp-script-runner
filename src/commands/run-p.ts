/**
 * FSCR v7.0.0 - Run Parallel Command
 * Execute multiple tasks concurrently
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const runParallelCommand: Command = {
  name: 'run-p',
  description: 'Run tasks in parallel',
  category: 'core',

  arguments: [
    {
      name: 'tasks',
      description: 'Task names to run in parallel',
      required: true,
      type: 'array',
      variadic: true
    }
  ],

  options: [
    {
      name: 'max-concurrent',
      alias: 'm',
      description: 'Maximum number of concurrent tasks',
      type: 'number'
    },
    {
      name: 'fail-fast',
      alias: 'f',
      description: 'Stop all tasks if one fails',
      type: 'boolean',
      default: false
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
    'fsr run-p start:web start:desktop',
    'fsr run-p lint test build',
    'fsr run-p task1 task2 task3 --max-concurrent 2',
    'fsr run-p test:unit test:integration --fail-fast'
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
      const { runParallel } = await import('../../../lib/running/index.js');

      if (options.verbose) {
        console.log(chalk.blue(`Running ${tasks.length} tasks in parallel:`));
        tasks.forEach((task, index) => {
          console.log(chalk.cyan(`  ${index + 1}. ${task}`));
        });
        if (options.maxConcurrent) {
          console.log(chalk.gray(`  Max concurrent: ${options.maxConcurrent}`));
        }
      }

      if (options.dryRun) {
        console.log(chalk.yellow('\nDry run mode - would execute in parallel:'));
        tasks.forEach((task, index) => {
          console.log(chalk.cyan(`  ${index + 1}. ${task}`));
        });
        if (options.maxConcurrent) {
          console.log(chalk.gray(`\n  Max concurrent: ${options.maxConcurrent}`));
        }
        return {
          success: true,
          message: 'Dry run completed',
          data: { tasks, mode: 'parallel', maxConcurrent: options.maxConcurrent },
          exitCode: 0
        };
      }

      const FcScripts = await parseScriptFile();
      await runParallel(tasks, FcScripts);

      return {
        success: true,
        message: `All ${tasks.length} tasks completed`,
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Parallel execution failed',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default runParallelCommand;

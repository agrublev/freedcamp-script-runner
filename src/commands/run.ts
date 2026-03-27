/**
 * FSCR v7.0.0 - Run Command
 * Execute a specific task from fscripts.md
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const runCommand: Command = {
  name: 'run',
  description: 'Run a specific task',
  category: 'core',
  
  arguments: [
    {
      name: 'task',
      description: 'Name of the task to execute',
      required: true,
      type: 'string'
    }
  ],
  
  options: [
    {
      name: 'dry-run',
      alias: 'n',
      description: 'Show what would be executed without running',
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
      name: 'env',
      alias: 'e',
      description: 'Additional environment variables (KEY=VALUE)',
      type: 'array'
    }
  ],
  
  examples: [
    'fsr run start:web',
    'fsr run test --verbose',
    'fsr run deploy --dry-run',
    'fsr run build --env NODE_ENV=production'
  ],
  
  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options, config } = context;
    const taskName = args.task as string;
    
    try {
      // Dynamic import to avoid circular dependencies
      const { parseScriptFile } = await import('../../../lib/parsers/parseScriptsMd.js');
      const { runCLICommand } = await import('../../../lib/running/index.js');
      
      if (options.verbose) {
        console.log(chalk.blue(`Looking for task: ${taskName}`));
      }
      
      const { allTasks } = await parseScriptFile();
      const taskData = allTasks.find((t: any) => t.name === taskName);
      
      if (!taskData) {
        return {
          success: false,
          message: `Task '${taskName}' not found`,
          error: new Error(`Task not found: ${taskName}`),
          exitCode: 1
        };
      }
      
      const { script, lang } = taskData;
      
      if (options.dryRun) {
        console.log(chalk.yellow('Dry run mode - would execute:'));
        console.log(chalk.cyan(`  Task: ${taskName}`));
        console.log(chalk.cyan(`  Language: ${lang}`));
        console.log(chalk.cyan(`  Script: ${script}`));
        
        return {
          success: true,
          message: 'Dry run completed',
          data: { task: taskName, script, lang },
          exitCode: 0
        };
      }
      
      // Parse additional environment variables
      const additionalEnv: Record<string, string> = {};
      if (options.env && Array.isArray(options.env)) {
        for (const envPair of options.env) {
          const [key, ...valueParts] = envPair.split('=');
          if (key && valueParts.length > 0) {
            additionalEnv[key] = valueParts.join('=');
          }
        }
      }
      
      if (lang === 'javascript' || lang === 'typescript') {
        // For JavaScript/TypeScript, use the script as-is
        await runCLICommand({
          task: { name: taskName },
          script: {
            lang: lang === 'typescript' ? 'node' : lang,
            env: additionalEnv,
            type: 'node',
            full: script,
            rest: []
          }
        });
      } else {
        // For bash/shell scripts, parse command and environment variables
        let pars = script.split(' ');
        let type = pars[0];
        let env = { ...additionalEnv };
        
        if (pars[0].includes('=')) {
          const envs = type.split('=');
          env[envs[0]] = envs[1];
          type = pars[1];
          pars.shift();
          pars.shift();
        } else {
          pars.shift();
        }
        
        const finalScript = pars.join(' ');
        
        await runCLICommand({
          task: { name: taskName },
          script: {
            lang: lang,
            env: env,
            type: type,
            full: finalScript,
            rest: finalScript.split(' ')
          }
        });
      }
      
      return {
        success: true,
        message: `Task '${taskName}' completed successfully`,
        exitCode: 0
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute task '${taskName}'`,
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default runCommand;

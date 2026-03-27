/**
 * FSCR v7.0.0 - Main CLI Entry Point
 * TypeScript implementation with lazy-loaded commands
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { initializeRegistry, executeCommand } from './core/command-registry';

const taskName = chalk.rgb(39, 173, 96).bold.underline;
const textDescription = chalk.rgb(159, 161, 181);

/**
 * Main CLI application
 */
export async function main(argv: string[] = process.argv): Promise<void> {
  // Initialize command registry
  await initializeRegistry();

  const cli = yargs(hideBin(argv))
    .scriptName('fsr')
    .usage('Usage: $0 <command> [options]')
    .version('7.0.0')
    .help('help')
    .alias('h', 'help')
    .alias('v', 'version')
    .wrap(Math.min(120, yargs.terminalWidth()))
    .strict()
    .recommendCommands()
    .fail((msg, err, yargs) => {
      if (err) {
        console.error(chalk.red('Error:'), err.message);
        if (process.env.DEBUG) {
          console.error(err.stack);
        }
      } else {
        console.error(chalk.red('Error:'), msg);
        console.log('\n' + yargs.help());
      }
      process.exit(1);
    });

  // Global options
  cli.option('verbose', {
    alias: 'V',
    type: 'boolean',
    description: 'Show detailed output',
    global: true
  });

  cli.option('quiet', {
    alias: 'q',
    type: 'boolean',
    description: 'Suppress non-error output',
    global: true
  });

  cli.option('dry-run', {
    alias: 'n',
    type: 'boolean',
    description: 'Show what would be done without doing it',
    global: true
  });

  // Core commands
  cli.command(
    'run <task>',
    'Run a specific task',
    (yargs) => {
      return yargs
        .positional('task', {
          describe: 'Task name to execute',
          type: 'string'
        })
        .option('env', {
          alias: 'e',
          describe: 'Environment variables (KEY=VALUE)',
          type: 'array'
        });
    },
    async (argv) => {
      await executeCommand('run', { task: argv.task }, argv);
    }
  ).example(taskName('$0 run start:web'), textDescription('Run task "start:web"'));

  cli.command(
    'list',
    'List all available tasks',
    (yargs) => {
      return yargs
        .option('category', {
          alias: 'c',
          describe: 'Filter by category',
          type: 'string'
        })
        .option('search', {
          alias: 's',
          describe: 'Search tasks',
          type: 'string'
        })
        .option('format', {
          alias: 'f',
          describe: 'Output format',
          choices: ['interactive', 'table', 'json', 'simple'],
          default: 'interactive'
        });
    },
    async (argv) => {
      await executeCommand('list', {}, argv);
    }
  ).example(taskName('$0 list'), textDescription('Show all tasks'));

  cli.command(
    'scripts',
    'Choose script from package.json',
    (yargs) => {
      return yargs.option('format', {
        alias: 'f',
        describe: 'Output format',
        choices: ['interactive', 'list', 'json'],
        default: 'interactive'
      });
    },
    async (argv) => {
      await executeCommand('scripts', {}, argv);
    }
  ).example(taskName('$0 scripts'), textDescription('Select package.json script'));

  cli.command(
    'run-s <tasks..>',
    'Run tasks sequentially',
    (yargs) => {
      return yargs
        .positional('tasks', {
          describe: 'Tasks to run in sequence',
          type: 'string',
          array: true
        })
        .option('stop-on-error', {
          alias: 'e',
          describe: 'Stop on first error',
          type: 'boolean',
          default: true
        });
    },
    async (argv) => {
      await executeCommand('run-s', { tasks: argv.tasks }, argv);
    }
  ).example(taskName('$0 run-s lint test build'), textDescription('Run tasks in order'));

  cli.command(
    'run-p <tasks..>',
    'Run tasks in parallel',
    (yargs) => {
      return yargs
        .positional('tasks', {
          describe: 'Tasks to run in parallel',
          type: 'string',
          array: true
        })
        .option('max-concurrent', {
          alias: 'm',
          describe: 'Max concurrent tasks',
          type: 'number'
        })
        .option('fail-fast', {
          alias: 'f',
          describe: 'Stop all on first failure',
          type: 'boolean',
          default: false
        });
    },
    async (argv) => {
      await executeCommand('run-p', { tasks: argv.tasks }, argv);
    }
  ).example(taskName('$0 run-p test:unit test:e2e'), textDescription('Run tests in parallel'));

  // Utility commands
  cli.command(
    'generate',
    'Generate sample fscripts.md',
    (yargs) => {
      return yargs
        .option('output', {
          alias: 'o',
          describe: 'Output file',
          type: 'string',
          default: 'sample.fscripts.md'
        })
        .option('force', {
          alias: 'f',
          describe: 'Overwrite existing',
          type: 'boolean'
        });
    },
    async (argv) => {
      await executeCommand('generate', {}, argv);
    }
  ).example(taskName('$0 generate'), textDescription('Generate sample fscripts.md'));

  cli.command(
    'toc [file]',
    'Generate table of contents',
    (yargs) => {
      return yargs
        .positional('file', {
          describe: 'Markdown file',
          type: 'string',
          default: 'fscripts.md'
        })
        .option('depth', {
          alias: 'd',
          describe: 'Max heading depth',
          type: 'number',
          default: 3
        })
        .option('backup', {
          alias: 'b',
          describe: 'Create backup',
          type: 'boolean',
          default: true
        });
    },
    async (argv) => {
      await executeCommand('toc', { file: argv.file }, argv);
    }
  ).example(taskName('$0 toc'), textDescription('Update ToC in fscripts.md'));

  cli.command(
    'clear',
    'Clear task history',
    (yargs) => {
      return yargs
        .option('all', {
          alias: 'a',
          describe: 'Clear all history',
          type: 'boolean'
        })
        .option('confirm', {
          alias: 'y',
          describe: 'Skip confirmation',
          type: 'boolean'
        });
    },
    async (argv) => {
      await executeCommand('clear', {}, argv);
    }
  ).example(taskName('$0 clear'), textDescription('Clear recent tasks'));

  cli.command(
    'doctor',
    'Run system diagnostics',
    (yargs) => {
      return yargs
        .option('fix', {
          alias: 'f',
          describe: 'Attempt auto-fix',
          type: 'boolean'
        })
        .option('verbose', {
          alias: 'v',
          describe: 'Detailed output',
          type: 'boolean'
        });
    },
    async (argv) => {
      await executeCommand('doctor', {}, argv);
    }
  ).example(taskName('$0 doctor'), textDescription('Check system health'));

  cli.command(
    'completion [shell]',
    'Generate shell completions',
    (yargs) => {
      return yargs
        .positional('shell', {
          describe: 'Shell type',
          type: 'string',
          choices: ['bash', 'zsh', 'fish', 'powershell']
        })
        .option('install', {
          alias: 'i',
          describe: 'Install automatically',
          type: 'boolean'
        });
    },
    async (argv) => {
      await executeCommand('completion', { shell: argv.shell }, argv);
    }
  ).example(taskName('$0 completion bash'), textDescription('Generate bash completions'));

  // Profile commands
  cli.command('profile <action> [name]', 'Manage profiles', (yargs) => {
    return yargs
      .positional('action', {
        describe: 'Profile action',
        type: 'string',
        choices: ['list', 'create', 'switch', 'delete']
      })
      .positional('name', {
        describe: 'Profile name',
        type: 'string'
      })
      .option('description', {
        alias: 'd',
        describe: 'Profile description',
        type: 'string'
      })
      .option('copy-from', {
        alias: 'c',
        describe: 'Copy from profile',
        type: 'string'
      })
      .option('activate', {
        alias: 'a',
        describe: 'Activate after create',
        type: 'boolean'
      })
      .option('force', {
        alias: 'f',
        describe: 'Force action',
        type: 'boolean'
      })
      .option('format', {
        describe: 'Output format',
        type: 'string',
        choices: ['table', 'json']
      });
  }, async (argv) => {
    const commandName = `profile:${argv.action}`;
    await executeCommand(commandName, { name: argv.name }, argv);
  }).example(taskName('$0 profile list'), textDescription('List all profiles'));

  // Plugin commands
  cli.command('plugin <action> [source]', 'Manage plugins', (yargs) => {
    return yargs
      .positional('action', {
        describe: 'Plugin action',
        type: 'string',
        choices: ['list', 'install', 'uninstall']
      })
      .positional('source', {
        describe: 'Plugin source or name',
        type: 'string'
      })
      .option('type', {
        alias: 't',
        describe: 'Source type',
        type: 'string',
        choices: ['npm', 'git', 'local']
      })
      .option('enable', {
        alias: 'e',
        describe: 'Enable after install',
        type: 'boolean',
        default: true
      })
      .option('force', {
        alias: 'f',
        describe: 'Force action',
        type: 'boolean'
      })
      .option('format', {
        describe: 'Output format',
        type: 'string',
        choices: ['table', 'json']
      });
  }, async (argv) => {
    const commandName = `plugin:${argv.action}`;
    await executeCommand(commandName, { source: argv.source, name: argv.source }, argv);
  }).example(taskName('$0 plugin list'), textDescription('List installed plugins'));

  // Parse and execute
  await cli.parseAsync();
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

export default main;

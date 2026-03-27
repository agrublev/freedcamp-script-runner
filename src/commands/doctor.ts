/**
 * FSCR v7.0.0 - Doctor Command
 * Diagnostic tool for system health checks
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

interface DiagnosticCheck {
  name: string;
  check: () => Promise<{ passed: boolean; message: string; fix?: string }>;
  critical?: boolean;
}

export const doctorCommand: Command = {
  name: 'doctor',
  description: 'Run system diagnostics and health checks',
  category: 'utility',

  options: [
    {
      name: 'fix',
      alias: 'f',
      description: 'Attempt to fix issues automatically',
      type: 'boolean',
      default: false
    },
    {
      name: 'verbose',
      alias: 'v',
      description: 'Show detailed diagnostic information',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr doctor',
    'fsr doctor --fix',
    'fsr doctor --verbose'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { options } = context;
    const fs = await import('fs-extra');
    const path = await import('path');

    console.log(chalk.bold.blue('\n🔍 Running FSCR diagnostics...\n'));

    const checks: DiagnosticCheck[] = [
      {
        name: 'Node.js version',
        critical: true,
        check: async () => {
          try {
            const version = process.version;
            const major = parseInt(version.slice(1).split('.')[0]);
            if (major >= 16) {
              return { passed: true, message: `${version} ✓` };
            }
            return {
              passed: false,
              message: `${version} (Node.js 16+ required)`,
              fix: 'Upgrade Node.js to version 16 or higher'
            };
          } catch (error) {
            return { passed: false, message: 'Could not detect version' };
          }
        }
      },
      {
        name: 'npm/yarn installation',
        check: async () => {
          try {
            await exec('npm --version');
            return { passed: true, message: 'npm available ✓' };
          } catch {
            try {
              await exec('yarn --version');
              return { passed: true, message: 'yarn available ✓' };
            } catch {
              return {
                passed: false,
                message: 'Neither npm nor yarn found',
                fix: 'Install Node.js and npm'
              };
            }
          }
        }
      },
      {
        name: 'fscripts.md file',
        check: async () => {
          const scriptsPath = path.join(context.cwd, 'fscripts.md');
          if (await fs.pathExists(scriptsPath)) {
            const stats = await fs.stat(scriptsPath);
            return {
              passed: true,
              message: `Found (${(stats.size / 1024).toFixed(2)} KB) ✓`
            };
          }
          return {
            passed: false,
            message: 'Not found',
            fix: 'Run "fsr generate" to create a sample file'
          };
        }
      },
      {
        name: 'package.json file',
        critical: true,
        check: async () => {
          const packagePath = path.join(context.cwd, 'package.json');
          if (await fs.pathExists(packagePath)) {
            try {
              const pkg = await fs.readJSON(packagePath);
              if (pkg.name) {
                return { passed: true, message: `${pkg.name} v${pkg.version || '0.0.0'} ✓` };
              }
              return { passed: false, message: 'Invalid format' };
            } catch {
              return { passed: false, message: 'Invalid JSON' };
            }
          }
          return {
            passed: false,
            message: 'Not found',
            fix: 'Initialize project with "npm init"'
          };
        }
      },
      {
        name: 'Git installation',
        check: async () => {
          try {
            const { stdout } = await exec('git --version');
            return { passed: true, message: stdout.trim() + ' ✓' };
          } catch {
            return {
              passed: false,
              message: 'Not installed',
              fix: 'Install Git from https://git-scm.com'
            };
          }
        }
      },
      {
        name: 'Git repository',
        check: async () => {
          const gitPath = path.join(context.cwd, '.git');
          if (await fs.pathExists(gitPath)) {
            try {
              const { stdout } = await exec('git branch --show-current');
              return { passed: true, message: `Branch: ${stdout.trim()} ✓` };
            } catch {
              return { passed: true, message: 'Initialized ✓' };
            }
          }
          return {
            passed: false,
            message: 'Not a git repository',
            fix: 'Run "git init" to initialize'
          };
        }
      },
      {
        name: 'Write permissions',
        check: async () => {
          try {
            const testFile = path.join(context.cwd, '.fscr-test');
            await fs.writeFile(testFile, 'test');
            await fs.remove(testFile);
            return { passed: true, message: 'OK ✓' };
          } catch {
            return {
              passed: false,
              message: 'No write access',
              fix: 'Check directory permissions'
            };
          }
        }
      },
      {
        name: 'Node modules',
        check: async () => {
          const modulesPath = path.join(context.cwd, 'node_modules');
          if (await fs.pathExists(modulesPath)) {
            const dirs = await fs.readdir(modulesPath);
            const count = dirs.filter(d => !d.startsWith('.')).length;
            return { passed: true, message: `${count} packages installed ✓` };
          }
          return {
            passed: false,
            message: 'Not found',
            fix: 'Run "npm install" or "yarn install"'
          };
        }
      }
    ];

    let passedCount = 0;
    let failedCount = 0;
    const issues: string[] = [];

    for (const check of checks) {
      process.stdout.write(chalk.gray(`  Checking ${check.name}... `));

      try {
        const result = await check.check();

        if (result.passed) {
          console.log(chalk.green(result.message));
          passedCount++;
        } else {
          console.log(chalk.red(result.message));
          failedCount++;

          if (result.fix) {
            issues.push(`${check.name}: ${result.fix}`);
          }

          if (check.critical) {
            console.log(chalk.red(`  ⚠️  Critical issue detected`));
          }
        }
      } catch (error) {
        console.log(chalk.red('ERROR'));
        if (options.verbose) {
          console.log(chalk.gray(`    ${(error as Error).message}`));
        }
        failedCount++;
      }
    }

    console.log();
    console.log(chalk.bold(`Results: ${chalk.green(passedCount + ' passed')}, ${chalk.red(failedCount + ' failed')}`));

    if (issues.length > 0) {
      console.log(chalk.bold.yellow('\n💡 Suggested fixes:\n'));
      issues.forEach((issue, index) => {
        console.log(chalk.yellow(`  ${index + 1}. ${issue}`));
      });
    }

    if (failedCount === 0) {
      console.log(chalk.green.bold('\n✓ All checks passed! Your system is healthy.\n'));
      return {
        success: true,
        message: 'All diagnostics passed',
        data: { passed: passedCount, failed: failedCount },
        exitCode: 0
      };
    }

    console.log();
    return {
      success: false,
      message: `${failedCount} diagnostic checks failed`,
      data: { passed: passedCount, failed: failedCount, issues },
      exitCode: 1
    };
  }
};

export default doctorCommand;

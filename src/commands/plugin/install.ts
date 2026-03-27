/**
 * FSCR v7.0.0 - Plugin Install Command
 */

import type { Command, CommandContext, CommandResult } from '../../types';
import chalk from 'chalk';
import { spawn } from 'child_process';

export const pluginInstallCommand: Command = {
  name: 'plugin install',
  description: 'Install a plugin',
  category: 'plugin',

  arguments: [
    {
      name: 'source',
      description: 'Plugin source (npm package, git url, or local path)',
      required: true,
      type: 'string'
    }
  ],

  options: [
    {
      name: 'type',
      alias: 't',
      description: 'Source type (npm, git, local)',
      type: 'string',
      choices: ['npm', 'git', 'local']
    },
    {
      name: 'enable',
      alias: 'e',
      description: 'Enable plugin after installation',
      type: 'boolean',
      default: true
    },
    {
      name: 'force',
      alias: 'f',
      description: 'Force reinstall if already installed',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr plugin install fscr-plugin-notifications',
    'fsr plugin install https://github.com/user/fscr-plugin.git --type git',
    'fsr plugin install ./my-plugin --type local',
    'fsr plugin install some-plugin --no-enable'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const source = args.source as string;
    const fs = await import('fs-extra');
    const path = await import('path');

    try {
      const pluginsDir = path.join(context.cwd, '.fscr', 'plugins');
      const registryPath = path.join(context.cwd, '.fscr', 'plugin-registry.json');

      await fs.ensureDir(pluginsDir);

      // Detect source type if not specified
      let sourceType = options.type;
      if (!sourceType) {
        if (source.startsWith('http') || source.endsWith('.git')) {
          sourceType = 'git';
        } else if (source.startsWith('.') || source.startsWith('/')) {
          sourceType = 'local';
        } else {
          sourceType = 'npm';
        }
      }

      console.log(chalk.blue(`Installing plugin from ${sourceType}...`));

      let pluginName: string;
      let pluginPath: string;
      let metadata: any;

      switch (sourceType) {
        case 'npm':
          // Install via npm
          pluginName = source;
          pluginPath = path.join(pluginsDir, 'node_modules', pluginName);

          await new Promise<void>((resolve, reject) => {
            const npm = spawn('npm', ['install', source, '--prefix', pluginsDir], {
              stdio: 'inherit'
            });

            npm.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`npm install failed with code ${code}`));
            });
          });

          // Read package.json
          const packagePath = path.join(pluginPath, 'package.json');
          if (await fs.pathExists(packagePath)) {
            metadata = await fs.readJSON(packagePath);
          }
          break;

        case 'git':
          // Clone from git
          const gitUrl = source;
          pluginName = path.basename(gitUrl, '.git');
          pluginPath = path.join(pluginsDir, pluginName);

          if (await fs.pathExists(pluginPath) && !options.force) {
            return {
              success: false,
              message: `Plugin '${pluginName}' already installed. Use --force to reinstall.`,
              exitCode: 1
            };
          }

          await new Promise<void>((resolve, reject) => {
            const git = spawn('git', ['clone', gitUrl, pluginPath], {
              stdio: 'inherit'
            });

            git.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`git clone failed with code ${code}`));
            });
          });

          // Read plugin metadata
          const gitPackagePath = path.join(pluginPath, 'package.json');
          if (await fs.pathExists(gitPackagePath)) {
            metadata = await fs.readJSON(gitPackagePath);
          }
          break;

        case 'local':
          // Copy from local path
          const sourcePath = path.resolve(context.cwd, source);

          if (!await fs.pathExists(sourcePath)) {
            return {
              success: false,
              message: `Local path not found: ${source}`,
              exitCode: 1
            };
          }

          pluginName = path.basename(sourcePath);
          pluginPath = path.join(pluginsDir, pluginName);

          if (await fs.pathExists(pluginPath) && !options.force) {
            return {
              success: false,
              message: `Plugin '${pluginName}' already installed. Use --force to reinstall.`,
              exitCode: 1
            };
          }

          await fs.copy(sourcePath, pluginPath);

          // Read plugin metadata
          const localPackagePath = path.join(pluginPath, 'package.json');
          if (await fs.pathExists(localPackagePath)) {
            metadata = await fs.readJSON(localPackagePath);
          }
          break;

        default:
          return {
            success: false,
            message: `Invalid source type: ${sourceType}`,
            exitCode: 1
          };
      }

      // Update registry
      let registry: any = { plugins: [] };
      if (await fs.pathExists(registryPath)) {
        registry = await fs.readJSON(registryPath);
      }

      const pluginEntry = {
        name: pluginName,
        version: metadata?.version || '0.0.0',
        description: metadata?.description || '',
        enabled: options.enable,
        installedAt: Date.now(),
        installedPath: pluginPath,
        sourceType,
        source
      };

      // Remove existing entry if present
      registry.plugins = registry.plugins.filter((p: any) => p.name !== pluginName);
      registry.plugins.push(pluginEntry);

      await fs.writeJSON(registryPath, registry, { spaces: 2 });

      console.log(chalk.green(`✓ Installed plugin '${pluginName}'`));

      if (options.enable) {
        console.log(chalk.green(`✓ Plugin '${pluginName}' is enabled`));
      }

      return {
        success: true,
        message: `Plugin '${pluginName}' installed successfully`,
        data: { plugin: pluginEntry },
        exitCode: 0
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to install plugin',
        error: error as Error,
        exitCode: 1
      };
    }
  }
};

export default pluginInstallCommand;

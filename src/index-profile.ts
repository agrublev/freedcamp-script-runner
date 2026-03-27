/**
 * Profile command integration for main CLI
 * Add this to your main index.js file:
 *
 * import { addProfileCommand } from './src/index-profile.js';
 * // In your yargs instance:
 * addProfileCommand(yargsInstance);
 */

import type { Argv } from 'yargs';
import {
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  showCurrentProfile,
  setDefaultProfile
} from './commands/profile.js';

/**
 * Add profile command to yargs instance
 */
export function addProfileCommand(yargs: Argv): Argv {
  return yargs.command(
    'profile <command>',
    'Manage configuration profiles',
    (yargs) => {
      return yargs
        .command(
          'list',
          'List all profiles',
          () => {},
          async () => {
            await listProfiles();
          }
        )
        .command(
          'create <name>',
          'Create a new profile',
          (yargs) => {
            return yargs
              .positional('name', {
                describe: 'Profile name',
                type: 'string',
                demandOption: true
              })
              .option('scripts-file', {
                alias: 's',
                describe: 'Path to scripts file',
                type: 'string',
                default: 'fscripts.md'
              })
              .option('env', {
                alias: 'e',
                describe: 'Environment variables (KEY=value,KEY2=value2)',
                type: 'string'
              })
              .option('inherits', {
                alias: 'i',
                describe: 'Inherit from another profile',
                type: 'string'
              })
              .option('set-default', {
                alias: 'd',
                describe: 'Set as default profile',
                type: 'boolean',
                default: false
              })
              .option('set-active', {
                alias: 'a',
                describe: 'Set as active profile',
                type: 'boolean',
                default: false
              });
          },
          async (argv) => {
            await createProfile(argv.name as string, {
              scriptsFile: argv.scriptsFile as string,
              env: argv.env as string | undefined,
              inherits: argv.inherits as string | undefined,
              setDefault: argv.setDefault as boolean,
              setActive: argv.setActive as boolean
            });
          }
        )
        .command(
          'switch <name>',
          'Switch to a different profile',
          (yargs) => {
            return yargs.positional('name', {
              describe: 'Profile name',
              type: 'string',
              demandOption: true
            });
          },
          async (argv) => {
            await switchProfile(argv.name as string);
          }
        )
        .command(
          'delete <name>',
          'Delete a profile',
          (yargs) => {
            return yargs
              .positional('name', {
                describe: 'Profile name',
                type: 'string',
                demandOption: true
              })
              .option('force', {
                alias: 'f',
                describe: 'Skip confirmation',
                type: 'boolean',
                default: false
              });
          },
          async (argv) => {
            await deleteProfile(argv.name as string, {
              force: argv.force as boolean
            });
          }
        )
        .command(
          'current',
          'Show current active profile',
          () => {},
          async () => {
            await showCurrentProfile();
          }
        )
        .command(
          'default <name>',
          'Set default profile',
          (yargs) => {
            return yargs.positional('name', {
              describe: 'Profile name',
              type: 'string',
              demandOption: true
            });
          },
          async (argv) => {
            await setDefaultProfile(argv.name as string);
          }
        )
        .demandCommand(1, 'You must specify a profile command')
        .help();
    },
    () => {}
  );
}

/**
 * Example usage in index.js:
 *
 * ```javascript
 * import { addProfileCommand } from './src/index-profile.js';
 *
 * const yargsInstance = yargs(process.argv.slice(2))
 *   .usage("Usage: $0 <command> [options]")
 *   // ... other commands ...
 *
 * addProfileCommand(yargsInstance);
 *
 * yargsInstance.help().argv;
 * ```
 */

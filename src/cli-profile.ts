#!/usr/bin/env node

/**
 * Profile command CLI integration
 * This file provides the profile command interface for the main CLI
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  showCurrentProfile,
  setDefaultProfile
} from './commands/profile.js';

export async function profileCommand(argv: string[]): Promise<void> {
  await yargs(hideBin(argv))
    .scriptName('fscr profile')
    .usage('Usage: $0 <command> [options]')
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
    .help()
    .alias('h', 'help')
    .alias('v', 'version')
    .parse();
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  profileCommand(process.argv).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

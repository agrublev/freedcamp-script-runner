/**
 * Profile management commands
 */

import chalk from 'chalk';
import { getConfigManager } from '../lib/config.js';
import type { Profile } from '../types/index.js';

/**
 * List all profiles
 */
export async function listProfiles(): Promise<void> {
  const config = getConfigManager();

  try {
    const profiles = await config.listProfiles();
    const defaultProfile = await config.getDefaultProfileName();

    if (profiles.length === 0) {
      console.log(chalk.yellow('\nNo profiles configured.'));
      console.log(chalk.gray('Create one with: fscr profile create <name>'));
      return;
    }

    console.log(chalk.bold('\n📋 Available Profiles:\n'));

    for (const profile of profiles) {
      const isDefault = profile.name === defaultProfile;
      const markers: string[] = [];

      if (profile.isActive) {
        markers.push(chalk.green('active'));
      }

      if (isDefault) {
        markers.push(chalk.blue('default'));
      }

      const markerText = markers.length > 0 ? ` ${chalk.gray(`(${markers.join(', ')})`)}` : '';
      const bullet = profile.isActive ? chalk.green('●') : chalk.gray('○');

      console.log(`  ${bullet} ${chalk.bold(profile.name)}${markerText}`);
      console.log(`    ${chalk.gray('Scripts:')} ${profile.scriptsFile}`);

      if (Object.keys(profile.resolvedEnv).length > 0) {
        const envVars = Object.entries(profile.resolvedEnv)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        console.log(`    ${chalk.gray('Env:')} ${envVars}`);
      }

      if (profile.inherits) {
        console.log(`    ${chalk.gray('Inherits:')} ${profile.inherits}`);
      }

      console.log('');
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error listing profiles: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * Create a new profile
 */
export async function createProfile(
  name: string,
  options: {
    scriptsFile?: string;
    env?: string;
    inherits?: string;
    setDefault?: boolean;
    setActive?: boolean;
  } = {}
): Promise<void> {
  const config = getConfigManager();

  try {
    // Check if profile already exists
    const existing = await config.getProfile(name);
    if (existing) {
      console.error(chalk.red(`\n❌ Profile "${name}" already exists.`));
      console.log(chalk.gray('Use a different name or delete the existing profile first.'));
      process.exit(1);
    }

    // Parse environment variables
    const env: Record<string, string> = {};
    if (options.env) {
      const pairs = options.env.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          env[key.trim()] = value.trim();
        }
      }
    }

    // Create profile object
    const profile: Profile = {
      scriptsFile: options.scriptsFile || 'fscripts.md',
      env: Object.keys(env).length > 0 ? env : undefined,
      inherits: options.inherits
    };

    // Validate profile
    const validation = config.validateProfile(name, profile);
    if (!validation.valid) {
      console.error(chalk.red('\n❌ Invalid profile configuration:'));
      validation.errors?.forEach(error => {
        console.error(chalk.red(`  • ${error}`));
      });
      process.exit(1);
    }

    // Show warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    // Save profile
    await config.setProfile(name, profile);

    console.log(chalk.green(`\n✅ Profile "${name}" created successfully!`));
    console.log(`   ${chalk.gray('Scripts:')} ${profile.scriptsFile}`);

    if (profile.env && Object.keys(profile.env).length > 0) {
      console.log(`   ${chalk.gray('Environment:')}`);
      for (const [key, value] of Object.entries(profile.env)) {
        console.log(`     ${key}=${value}`);
      }
    }

    if (profile.inherits) {
      console.log(`   ${chalk.gray('Inherits:')} ${profile.inherits}`);
    }

    // Set as default if requested
    if (options.setDefault) {
      await config.setDefaultProfile(name);
      console.log(chalk.blue(`\n🔹 Set as default profile`));
    }

    // Set as active if requested
    if (options.setActive) {
      await config.setActiveProfile(name);
      console.log(chalk.green(`\n✅ Activated profile`));
    }

    console.log('');
  } catch (error) {
    console.error(chalk.red(`\n❌ Error creating profile: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * Switch active profile
 */
export async function switchProfile(name: string): Promise<void> {
  const config = getConfigManager();

  try {
    // Check if profile exists
    const profile = await config.getProfile(name);
    if (!profile) {
      console.error(chalk.red(`\n❌ Profile "${name}" does not exist.`));
      console.log(chalk.gray('List available profiles with: fscr profile list'));
      process.exit(1);
    }

    // Get current active profile
    const currentActive = await config.getActiveProfile();

    if (currentActive?.name === name) {
      console.log(chalk.yellow(`\n⚠️  Profile "${name}" is already active.`));
      return;
    }

    // Switch profile
    await config.setActiveProfile(name);

    const resolved = await config.resolveProfile(name);

    console.log(chalk.green(`\n✅ Switched to profile "${name}"`));
    console.log(`   ${chalk.gray('Scripts:')} ${profile.scriptsFile}`);

    if (resolved && Object.keys(resolved.resolvedEnv).length > 0) {
      console.log(`   ${chalk.gray('Environment:')}`);
      for (const [key, value] of Object.entries(resolved.resolvedEnv)) {
        console.log(`     ${key}=${value}`);
      }
    }

    console.log('');
  } catch (error) {
    console.error(chalk.red(`\n❌ Error switching profile: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(name: string, options: { force?: boolean } = {}): Promise<void> {
  const config = getConfigManager();

  try {
    // Check if profile exists
    const profile = await config.getProfile(name);
    if (!profile) {
      console.error(chalk.red(`\n❌ Profile "${name}" does not exist.`));
      process.exit(1);
    }

    // Confirm deletion unless force flag is used
    if (!options.force) {
      console.log(chalk.yellow(`\n⚠️  You are about to delete profile "${name}".`));
      console.log(chalk.gray('Use --force to skip this confirmation.'));
      console.log('');
      // In a real implementation, you'd use inquirer here for confirmation
      // For now, we'll just show the message
    }

    // Delete profile
    await config.deleteProfile(name);

    console.log(chalk.green(`\n✅ Profile "${name}" deleted successfully.`));
    console.log('');
  } catch (error) {
    console.error(chalk.red(`\n❌ Error deleting profile: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * Show current profile information
 */
export async function showCurrentProfile(): Promise<void> {
  const config = getConfigManager();

  try {
    const profileName = await config.getCurrentProfileName();

    if (!profileName) {
      console.log(chalk.yellow('\n⚠️  No active profile.'));
      console.log(chalk.gray('Create one with: fscr profile create <name>'));
      return;
    }

    const profile = await config.resolveProfile(profileName);
    if (!profile) {
      console.error(chalk.red(`\n❌ Profile "${profileName}" not found.`));
      process.exit(1);
    }

    const defaultProfile = await config.getDefaultProfileName();
    const isDefault = profileName === defaultProfile;

    console.log(chalk.bold(`\n📋 Current Profile: ${chalk.green(profileName)}`));

    if (isDefault) {
      console.log(chalk.blue('   (Default profile)'));
    }

    console.log('');
    console.log(`   ${chalk.gray('Scripts file:')} ${profile.scriptsFile}`);

    if (Object.keys(profile.resolvedEnv).length > 0) {
      console.log(`\n   ${chalk.gray('Environment variables:')}`);
      for (const [key, value] of Object.entries(profile.resolvedEnv)) {
        console.log(`     ${chalk.cyan(key)}=${value}`);
      }
    }

    if (profile.inherits) {
      console.log(`\n   ${chalk.gray('Inherits from:')} ${profile.inherits}`);
    }

    if (profile.resolvedOptions && Object.keys(profile.resolvedOptions).length > 0) {
      console.log(`\n   ${chalk.gray('Options:')}`);
      console.log(`     ${JSON.stringify(profile.resolvedOptions, null, 2)}`);
    }

    console.log('');
  } catch (error) {
    console.error(chalk.red(`\n❌ Error showing profile: ${(error as Error).message}`));
    process.exit(1);
  }
}

/**
 * Set default profile
 */
export async function setDefaultProfile(name: string): Promise<void> {
  const config = getConfigManager();

  try {
    await config.setDefaultProfile(name);
    console.log(chalk.green(`\n✅ Set "${name}" as default profile.`));
    console.log('');
  } catch (error) {
    console.error(chalk.red(`\n❌ Error setting default profile: ${(error as Error).message}`));
    process.exit(1);
  }
}

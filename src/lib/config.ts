/**
 * Profile-aware configuration management
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type {
  PackageJson,
  FscrConfig,
  Profile,
  ProfilesConfig,
  ActiveProfile,
  ResolvedProfile,
  ProfileValidationResult,
  ProfileEnvironment
} from '../types/index.js';

/**
 * Configuration manager with profile support
 */
export class ConfigManager {
  private packageJsonPath: string;
  private activeProfilePath: string;
  private globalConfigPath: string;

  constructor(cwd: string = process.cwd()) {
    this.packageJsonPath = join(cwd, 'package.json');
    this.activeProfilePath = join(cwd, '.fscr', 'active-profile');
    this.globalConfigPath = join(homedir(), '.fscr', 'config');
  }

  /**
   * Read package.json
   */
  async readPackageJson(): Promise<PackageJson> {
    try {
      const content = await readFile(this.packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read package.json: ${(error as Error).message}`);
    }
  }

  /**
   * Write package.json
   */
  async writePackageJson(packageJson: PackageJson): Promise<void> {
    try {
      const content = JSON.stringify(packageJson, null, 2) + '\n';
      await writeFile(this.packageJsonPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write package.json: ${(error as Error).message}`);
    }
  }

  /**
   * Get FSCR configuration from package.json
   */
  async getFscrConfig(): Promise<FscrConfig> {
    const packageJson = await this.readPackageJson();
    return packageJson.fscripts || {};
  }

  /**
   * Update FSCR configuration in package.json
   */
  async updateFscrConfig(config: Partial<FscrConfig>): Promise<void> {
    const packageJson = await this.readPackageJson();
    packageJson.fscripts = {
      ...packageJson.fscripts,
      ...config
    };
    await this.writePackageJson(packageJson);
  }

  /**
   * Get all profiles
   */
  async getProfiles(): Promise<ProfilesConfig> {
    const config = await this.getFscrConfig();
    return config.profiles || {};
  }

  /**
   * Get a specific profile
   */
  async getProfile(name: string): Promise<Profile | null> {
    const profiles = await this.getProfiles();
    return profiles[name] || null;
  }

  /**
   * Create or update a profile
   */
  async setProfile(name: string, profile: Profile): Promise<void> {
    const config = await this.getFscrConfig();
    const profiles = config.profiles || {};

    profiles[name] = profile;

    await this.updateFscrConfig({
      profiles,
      // Set as default if it's the first profile
      defaultProfile: config.defaultProfile || name
    });
  }

  /**
   * Delete a profile
   */
  async deleteProfile(name: string): Promise<void> {
    const config = await this.getFscrConfig();
    const profiles = config.profiles || {};

    if (!profiles[name]) {
      throw new Error(`Profile "${name}" does not exist`);
    }

    // Check if this is the active profile
    const activeProfile = await this.getActiveProfile();
    if (activeProfile?.name === name) {
      throw new Error(`Cannot delete active profile "${name}". Switch to another profile first.`);
    }

    // Check if this is the default profile
    if (config.defaultProfile === name) {
      throw new Error(`Cannot delete default profile "${name}". Set another default profile first.`);
    }

    delete profiles[name];

    await this.updateFscrConfig({ profiles });
  }

  /**
   * Get the active profile
   */
  async getActiveProfile(): Promise<ActiveProfile | null> {
    try {
      if (!existsSync(this.activeProfilePath)) {
        return null;
      }
      const content = await readFile(this.activeProfilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set the active profile
   */
  async setActiveProfile(name: string): Promise<void> {
    // Verify profile exists
    const profile = await this.getProfile(name);
    if (!profile) {
      throw new Error(`Profile "${name}" does not exist`);
    }

    // Ensure .fscr directory exists
    const fscrDir = dirname(this.activeProfilePath);
    if (!existsSync(fscrDir)) {
      await mkdir(fscrDir, { recursive: true });
    }

    const activeProfile: ActiveProfile = {
      name,
      activatedAt: new Date().toISOString()
    };

    await writeFile(
      this.activeProfilePath,
      JSON.stringify(activeProfile, null, 2),
      'utf-8'
    );
  }

  /**
   * Get the default profile name
   */
  async getDefaultProfileName(): Promise<string | null> {
    const config = await this.getFscrConfig();
    return config.defaultProfile || null;
  }

  /**
   * Set the default profile
   */
  async setDefaultProfile(name: string): Promise<void> {
    // Verify profile exists
    const profile = await this.getProfile(name);
    if (!profile) {
      throw new Error(`Profile "${name}" does not exist`);
    }

    await this.updateFscrConfig({ defaultProfile: name });
  }

  /**
   * Get current profile (active > default > null)
   */
  async getCurrentProfileName(): Promise<string | null> {
    const active = await this.getActiveProfile();
    if (active) {
      return active.name;
    }

    return await this.getDefaultProfileName();
  }

  /**
   * Resolve profile with inheritance
   */
  async resolveProfile(name: string): Promise<ResolvedProfile | null> {
    const profile = await this.getProfile(name);
    if (!profile) {
      return null;
    }

    const activeProfile = await this.getActiveProfile();
    const isActive = activeProfile?.name === name;

    // Start with the profile's own values
    let resolvedEnv: ProfileEnvironment = { ...profile.env };
    let resolvedOptions: Record<string, any> = { ...profile.options };

    // Resolve inheritance
    if (profile.inherits) {
      const parent = await this.resolveProfile(profile.inherits);
      if (parent) {
        // Merge parent values (current profile takes precedence)
        resolvedEnv = { ...parent.resolvedEnv, ...resolvedEnv };
        resolvedOptions = { ...parent.resolvedOptions, ...resolvedOptions };
      }
    }

    return {
      ...profile,
      name,
      isActive,
      resolvedEnv,
      resolvedOptions
    };
  }

  /**
   * Validate profile configuration
   */
  validateProfile(name: string, profile: Profile): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate profile name
    if (!name || name.trim() === '') {
      errors.push('Profile name cannot be empty');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      errors.push('Profile name can only contain letters, numbers, hyphens, and underscores');
    }

    // Validate scriptsFile
    if (!profile.scriptsFile) {
      errors.push('scriptsFile is required');
    } else if (typeof profile.scriptsFile !== 'string') {
      errors.push('scriptsFile must be a string');
    }

    // Validate env if present
    if (profile.env) {
      if (typeof profile.env !== 'object') {
        errors.push('env must be an object');
      } else {
        for (const [key, value] of Object.entries(profile.env)) {
          if (typeof value !== 'string') {
            errors.push(`Environment variable "${key}" must be a string`);
          }
        }
      }
    }

    // Validate options if present
    if (profile.options && typeof profile.options !== 'object') {
      errors.push('options must be an object');
    }

    // Validate inherits if present
    if (profile.inherits) {
      if (typeof profile.inherits !== 'string') {
        errors.push('inherits must be a string');
      } else if (profile.inherits === name) {
        errors.push('Profile cannot inherit from itself');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * List all profiles with their status
   */
  async listProfiles(): Promise<ResolvedProfile[]> {
    const profiles = await this.getProfiles();
    const profileNames = Object.keys(profiles);

    const resolved: ResolvedProfile[] = [];
    for (const name of profileNames) {
      const profile = await this.resolveProfile(name);
      if (profile) {
        resolved.push(profile);
      }
    }

    return resolved;
  }

  /**
   * Get scripts file path for current profile
   */
  async getScriptsFilePath(): Promise<string> {
    const profileName = await this.getCurrentProfileName();

    if (profileName) {
      const profile = await this.resolveProfile(profileName);
      if (profile) {
        return join(process.cwd(), profile.scriptsFile);
      }
    }

    // Fallback to default fscripts.md
    return join(process.cwd(), 'fscripts.md');
  }

  /**
   * Get environment variables for current profile
   */
  async getProfileEnvironment(): Promise<ProfileEnvironment> {
    const profileName = await this.getCurrentProfileName();

    if (profileName) {
      const profile = await this.resolveProfile(profileName);
      if (profile) {
        return profile.resolvedEnv;
      }
    }

    return {};
  }
}

/**
 * Get default config manager instance
 */
export function getConfigManager(cwd?: string): ConfigManager {
  return new ConfigManager(cwd);
}

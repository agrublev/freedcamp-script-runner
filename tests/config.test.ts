/**
 * Tests for profile-aware configuration system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../src/lib/config.js';
import type { Profile, PackageJson } from '../src/types/index.js';

describe('ConfigManager', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'test-project');
  const packageJsonPath = join(testDir, 'package.json');
  let configManager: ConfigManager;

  beforeEach(() => {
    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Create a basic package.json
    const packageJson: PackageJson = {
      name: 'test-project',
      version: '1.0.0',
      fscripts: {}
    };
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    configManager = new ConfigManager(testDir);
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Package.json Operations', () => {
    it('should read package.json', async () => {
      const packageJson = await configManager.readPackageJson();
      expect(packageJson.name).toBe('test-project');
      expect(packageJson.version).toBe('1.0.0');
    });

    it('should write package.json', async () => {
      const packageJson = await configManager.readPackageJson();
      packageJson.description = 'Updated description';
      await configManager.writePackageJson(packageJson);

      const updated = await configManager.readPackageJson();
      expect(updated.description).toBe('Updated description');
    });

    it('should get FSCR config', async () => {
      const config = await configManager.getFscrConfig();
      expect(config).toBeDefined();
      expect(config).toEqual({});
    });

    it('should update FSCR config', async () => {
      await configManager.updateFscrConfig({
        defaultProfile: 'development'
      });

      const config = await configManager.getFscrConfig();
      expect(config.defaultProfile).toBe('development');
    });
  });

  describe('Profile Management', () => {
    const devProfile: Profile = {
      scriptsFile: 'fscripts.md',
      env: { NODE_ENV: 'development' }
    };

    const prodProfile: Profile = {
      scriptsFile: 'fscripts.prod.md',
      env: { NODE_ENV: 'production' }
    };

    it('should create a profile', async () => {
      await configManager.setProfile('development', devProfile);

      const profile = await configManager.getProfile('development');
      expect(profile).toBeDefined();
      expect(profile?.scriptsFile).toBe('fscripts.md');
      expect(profile?.env?.NODE_ENV).toBe('development');
    });

    it('should get all profiles', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setProfile('production', prodProfile);

      const profiles = await configManager.getProfiles();
      expect(Object.keys(profiles)).toHaveLength(2);
      expect(profiles.development).toBeDefined();
      expect(profiles.production).toBeDefined();
    });

    it('should delete a profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setProfile('production', prodProfile);

      // Set production as active to avoid deletion error
      await configManager.setActiveProfile('production');

      await configManager.deleteProfile('development');

      const profiles = await configManager.getProfiles();
      expect(Object.keys(profiles)).toHaveLength(1);
      expect(profiles.development).toBeUndefined();
    });

    it('should not delete active profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setActiveProfile('development');

      await expect(
        configManager.deleteProfile('development')
      ).rejects.toThrow('Cannot delete active profile');
    });

    it('should not delete default profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setProfile('production', prodProfile);
      await configManager.setDefaultProfile('development');

      await expect(
        configManager.deleteProfile('development')
      ).rejects.toThrow('Cannot delete default profile');
    });
  });

  describe('Active Profile', () => {
    const devProfile: Profile = {
      scriptsFile: 'fscripts.md',
      env: { NODE_ENV: 'development' }
    };

    it('should set active profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setActiveProfile('development');

      const active = await configManager.getActiveProfile();
      expect(active).toBeDefined();
      expect(active?.name).toBe('development');
      expect(active?.activatedAt).toBeDefined();
    });

    it('should get active profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setActiveProfile('development');

      const active = await configManager.getActiveProfile();
      expect(active?.name).toBe('development');
    });

    it('should return null if no active profile', async () => {
      const active = await configManager.getActiveProfile();
      expect(active).toBeNull();
    });

    it('should create .fsr directory when setting active profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setActiveProfile('development');

      const fscrDir = join(testDir, '.fsr');
      expect(existsSync(fscrDir)).toBe(true);
    });
  });

  describe('Default Profile', () => {
    const devProfile: Profile = {
      scriptsFile: 'fscripts.md',
      env: { NODE_ENV: 'development' }
    };

    it('should set default profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setDefaultProfile('development');

      const defaultProfile = await configManager.getDefaultProfileName();
      expect(defaultProfile).toBe('development');
    });

    it('should get default profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setDefaultProfile('development');

      const defaultProfile = await configManager.getDefaultProfileName();
      expect(defaultProfile).toBe('development');
    });

    it('should auto-set first profile as default', async () => {
      await configManager.setProfile('development', devProfile);

      const defaultProfile = await configManager.getDefaultProfileName();
      expect(defaultProfile).toBe('development');
    });
  });

  describe('Profile Resolution', () => {
    it('should resolve profile without inheritance', async () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development', DEBUG: 'true' }
      };

      await configManager.setProfile('development', profile);
      const resolved = await configManager.resolveProfile('development');

      expect(resolved).toBeDefined();
      expect(resolved?.name).toBe('development');
      expect(resolved?.scriptsFile).toBe('fscripts.md');
      expect(resolved?.resolvedEnv).toEqual({
        NODE_ENV: 'development',
        DEBUG: 'true'
      });
    });

    it('should resolve profile with inheritance', async () => {
      const baseProfile: Profile = {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development', DEBUG: 'true' }
      };

      const childProfile: Profile = {
        scriptsFile: 'fscripts.staging.md',
        env: { NODE_ENV: 'staging' },
        inherits: 'base'
      };

      await configManager.setProfile('base', baseProfile);
      await configManager.setProfile('staging', childProfile);

      const resolved = await configManager.resolveProfile('staging');

      expect(resolved).toBeDefined();
      expect(resolved?.scriptsFile).toBe('fscripts.staging.md');
      expect(resolved?.resolvedEnv).toEqual({
        NODE_ENV: 'staging', // Overridden
        DEBUG: 'true' // Inherited
      });
    });

    it('should mark active profile correctly', async () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development' }
      };

      await configManager.setProfile('development', profile);
      await configManager.setActiveProfile('development');

      const resolved = await configManager.resolveProfile('development');
      expect(resolved?.isActive).toBe(true);
    });

    it('should return null for non-existent profile', async () => {
      const resolved = await configManager.resolveProfile('nonexistent');
      expect(resolved).toBeNull();
    });
  });

  describe('Profile Validation', () => {
    it('should validate valid profile', () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development' }
      };

      const result = configManager.validateProfile('development', profile);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject empty profile name', () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.md'
      };

      const result = configManager.validateProfile('', profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Profile name cannot be empty');
    });

    it('should reject invalid profile name characters', () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.md'
      };

      const result = configManager.validateProfile('dev@profile!', profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Profile name can only contain letters, numbers, hyphens, and underscores'
      );
    });

    it('should reject missing scriptsFile', () => {
      const profile = {} as Profile;

      const result = configManager.validateProfile('development', profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('scriptsFile is required');
    });

    it('should reject self-inheritance', () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.md',
        inherits: 'development'
      };

      const result = configManager.validateProfile('development', profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Profile cannot inherit from itself');
    });

    it('should reject non-string environment values', () => {
      const profile = {
        scriptsFile: 'fscripts.md',
        env: { DEBUG: true } // Should be string
      } as any;

      const result = configManager.validateProfile('development', profile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Environment variable "DEBUG" must be a string');
    });
  });

  describe('Current Profile', () => {
    const devProfile: Profile = {
      scriptsFile: 'fscripts.md',
      env: { NODE_ENV: 'development' }
    };

    it('should return active profile as current', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setActiveProfile('development');

      const current = await configManager.getCurrentProfileName();
      expect(current).toBe('development');
    });

    it('should return default profile if no active profile', async () => {
      await configManager.setProfile('development', devProfile);
      await configManager.setDefaultProfile('development');

      const current = await configManager.getCurrentProfileName();
      expect(current).toBe('development');
    });

    it('should return null if no profiles configured', async () => {
      const current = await configManager.getCurrentProfileName();
      expect(current).toBeNull();
    });
  });

  describe('Scripts File Path', () => {
    it('should get scripts file path for current profile', async () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.custom.md'
      };

      await configManager.setProfile('custom', profile);
      await configManager.setActiveProfile('custom');

      const scriptsPath = await configManager.getScriptsFilePath();
      expect(scriptsPath).toBe(join(testDir, 'fscripts.custom.md'));
    });

    it('should fallback to default fscripts.md', async () => {
      const scriptsPath = await configManager.getScriptsFilePath();
      expect(scriptsPath).toBe(join(testDir, 'fscripts.md'));
    });
  });

  describe('Profile Environment', () => {
    it('should get environment for current profile', async () => {
      const profile: Profile = {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development', DEBUG: 'true' }
      };

      await configManager.setProfile('development', profile);
      await configManager.setActiveProfile('development');

      const env = await configManager.getProfileEnvironment();
      expect(env).toEqual({
        NODE_ENV: 'development',
        DEBUG: 'true'
      });
    });

    it('should return empty object if no profile', async () => {
      const env = await configManager.getProfileEnvironment();
      expect(env).toEqual({});
    });
  });

  describe('List Profiles', () => {
    it('should list all profiles with resolution', async () => {
      const devProfile: Profile = {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development' }
      };

      const prodProfile: Profile = {
        scriptsFile: 'fscripts.prod.md',
        env: { NODE_ENV: 'production' }
      };

      await configManager.setProfile('development', devProfile);
      await configManager.setProfile('production', prodProfile);
      await configManager.setActiveProfile('development');

      const profiles = await configManager.listProfiles();

      expect(profiles).toHaveLength(2);
      expect(profiles.find(p => p.name === 'development')?.isActive).toBe(true);
      expect(profiles.find(p => p.name === 'production')?.isActive).toBe(false);
    });
  });
});

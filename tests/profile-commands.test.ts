/**
 * Tests for profile commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../src/lib/config.js';
import type { PackageJson } from '../src/types/index.js';

describe('Profile Commands', () => {
  const testDir = join(process.cwd(), 'tests', 'fixtures', 'test-profile-commands');
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

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    vi.restoreAllMocks();
  });

  describe('Create Profile', () => {
    it('should create a basic profile', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development' }
      });

      const profile = await configManager.getProfile('development');
      expect(profile).toBeDefined();
      expect(profile?.scriptsFile).toBe('fscripts.md');
      expect(profile?.env?.NODE_ENV).toBe('development');
    });

    it('should create profile with inheritance', async () => {
      // Create base profile
      await configManager.setProfile('base', {
        scriptsFile: 'fscripts.md',
        env: { DEBUG: 'true' }
      });

      // Create child profile
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.dev.md',
        env: { NODE_ENV: 'development' },
        inherits: 'base'
      });

      const profile = await configManager.getProfile('development');
      expect(profile?.inherits).toBe('base');

      const resolved = await configManager.resolveProfile('development');
      expect(resolved?.resolvedEnv).toEqual({
        DEBUG: 'true',
        NODE_ENV: 'development'
      });
    });

    it('should set as default when requested', async () => {
      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md'
      });

      await configManager.setDefaultProfile('production');

      const defaultProfile = await configManager.getDefaultProfileName();
      expect(defaultProfile).toBe('production');
    });

    it('should set as active when requested', async () => {
      await configManager.setProfile('staging', {
        scriptsFile: 'fscripts.staging.md'
      });

      await configManager.setActiveProfile('staging');

      const active = await configManager.getActiveProfile();
      expect(active?.name).toBe('staging');
    });
  });

  describe('Switch Profile', () => {
    it('should switch to existing profile', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md'
      });

      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md'
      });

      await configManager.setActiveProfile('development');
      let active = await configManager.getActiveProfile();
      expect(active?.name).toBe('development');

      await configManager.setActiveProfile('production');
      active = await configManager.getActiveProfile();
      expect(active?.name).toBe('production');
    });

    it('should fail for non-existent profile', async () => {
      await expect(
        configManager.setActiveProfile('nonexistent')
      ).rejects.toThrow('Profile "nonexistent" does not exist');
    });
  });

  describe('Delete Profile', () => {
    it('should delete profile', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md'
      });

      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md'
      });

      // Set production as active
      await configManager.setActiveProfile('production');

      await configManager.deleteProfile('development');

      const profile = await configManager.getProfile('development');
      expect(profile).toBeNull();
    });

    it('should not allow deleting active profile', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md'
      });

      await configManager.setActiveProfile('development');

      await expect(
        configManager.deleteProfile('development')
      ).rejects.toThrow('Cannot delete active profile');
    });

    it('should not allow deleting default profile', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md'
      });

      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md'
      });

      await configManager.setDefaultProfile('development');

      await expect(
        configManager.deleteProfile('development')
      ).rejects.toThrow('Cannot delete default profile');
    });
  });

  describe('List Profiles', () => {
    it('should list all profiles', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development' }
      });

      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md',
        env: { NODE_ENV: 'production' }
      });

      await configManager.setProfile('staging', {
        scriptsFile: 'fscripts.staging.md',
        env: { NODE_ENV: 'staging' }
      });

      const profiles = await configManager.listProfiles();
      expect(profiles).toHaveLength(3);

      const names = profiles.map(p => p.name);
      expect(names).toContain('development');
      expect(names).toContain('production');
      expect(names).toContain('staging');
    });

    it('should mark active profile', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md'
      });

      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md'
      });

      await configManager.setActiveProfile('development');

      const profiles = await configManager.listProfiles();
      const dev = profiles.find(p => p.name === 'development');
      const prod = profiles.find(p => p.name === 'production');

      expect(dev?.isActive).toBe(true);
      expect(prod?.isActive).toBe(false);
    });
  });

  describe('Current Profile', () => {
    it('should show current active profile', async () => {
      await configManager.setProfile('development', {
        scriptsFile: 'fscripts.md',
        env: { NODE_ENV: 'development', DEBUG: 'true' }
      });

      await configManager.setActiveProfile('development');

      const current = await configManager.getCurrentProfileName();
      expect(current).toBe('development');

      const profile = await configManager.resolveProfile(current!);
      expect(profile?.resolvedEnv).toEqual({
        NODE_ENV: 'development',
        DEBUG: 'true'
      });
    });

    it('should return default if no active profile', async () => {
      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md'
      });

      await configManager.setDefaultProfile('production');

      const current = await configManager.getCurrentProfileName();
      expect(current).toBe('production');
    });
  });

  describe('Set Default Profile', () => {
    it('should set default profile', async () => {
      await configManager.setProfile('production', {
        scriptsFile: 'fscripts.prod.md'
      });

      await configManager.setDefaultProfile('production');

      const defaultProfile = await configManager.getDefaultProfileName();
      expect(defaultProfile).toBe('production');
    });

    it('should fail for non-existent profile', async () => {
      await expect(
        configManager.setDefaultProfile('nonexistent')
      ).rejects.toThrow('Profile "nonexistent" does not exist');
    });
  });

  describe('Profile with Options', () => {
    it('should support custom options', async () => {
      await configManager.setProfile('custom', {
        scriptsFile: 'fscripts.md',
        options: {
          timeout: 30000,
          silent: true,
          color: 'auto'
        }
      });

      const resolved = await configManager.resolveProfile('custom');
      expect(resolved?.resolvedOptions).toEqual({
        timeout: 30000,
        silent: true,
        color: 'auto'
      });
    });

    it('should inherit and merge options', async () => {
      await configManager.setProfile('base', {
        scriptsFile: 'fscripts.md',
        options: {
          timeout: 30000,
          silent: false
        }
      });

      await configManager.setProfile('custom', {
        scriptsFile: 'fscripts.custom.md',
        options: {
          silent: true,
          color: 'auto'
        },
        inherits: 'base'
      });

      const resolved = await configManager.resolveProfile('custom');
      expect(resolved?.resolvedOptions).toEqual({
        timeout: 30000, // Inherited
        silent: true,   // Overridden
        color: 'auto'   // Added
      });
    });
  });
});

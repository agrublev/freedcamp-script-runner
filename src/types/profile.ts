/**
 * FSCR v7.0.0 - Profile Type Definitions
 * Multi-profile configuration support
 */

/**
 * Profile configuration
 */
export interface Profile {
  name: string;
  description?: string;
  active?: boolean;
  created: number;
  modified: number;
  settings: ProfileSettings;
}

/**
 * Profile settings
 */
export interface ProfileSettings {
  // Script execution
  defaultShell?: string;
  timeout?: number;
  maxConcurrent?: number;

  // Display options
  color?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  progressBar?: boolean;

  // File paths
  scriptsFile?: string;
  configFile?: string;
  historyFile?: string;

  // Git integration
  validateBranch?: boolean;
  allowedBranches?: string[];

  // Package management
  ignoreUpgrade?: string[];
  autoUpgrade?: boolean;

  // Encryption
  encryptedFiles?: string[];
  encryptionKey?: string;

  // Custom settings
  custom?: Record<string, any>;
}

/**
 * Profile manager configuration
 */
export interface ProfileManagerConfig {
  profilesDir: string;
  activeProfileFile: string;
  defaultProfile: string;
}

/**
 * Profile creation options
 */
export interface ProfileCreateOptions {
  name: string;
  description?: string;
  copyFrom?: string;
  setActive?: boolean;
  settings?: Partial<ProfileSettings>;
}

/**
 * Profile switch options
 */
export interface ProfileSwitchOptions {
  name: string;
  force?: boolean;
  backup?: boolean;
}

/**
 * Profile list options
 */
export interface ProfileListOptions {
  showDetails?: boolean;
  format?: 'table' | 'json' | 'yaml';
}

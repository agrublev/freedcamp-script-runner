/**
 * Type definitions for FSCR configuration and profiles
 */

/**
 * Environment variables for a profile
 */
export interface ProfileEnvironment {
  [key: string]: string;
}

/**
 * Profile configuration
 */
export interface Profile {
  /**
   * Path to the scripts file (e.g., "fscripts.md", "fscripts.prod.md")
   */
  scriptsFile: string;

  /**
   * Environment variables for this profile
   */
  env?: ProfileEnvironment;

  /**
   * Custom options for this profile
   */
  options?: Record<string, any>;

  /**
   * Optional parent profile to inherit from
   */
  inherits?: string;
}

/**
 * Profiles configuration
 */
export interface ProfilesConfig {
  [profileName: string]: Profile;
}

/**
 * FSCR configuration in package.json
 */
export interface FscrConfig {
  /**
   * Files to encrypt/decrypt
   */
  encryptedFiles?: string[];

  /**
   * Packages to ignore during upgrade
   */
  'ignore-upgrade'?: string[];

  /**
   * Path to config file
   */
  config?: string;

  /**
   * Profile configurations
   */
  profiles?: ProfilesConfig;

  /**
   * Default profile name
   */
  defaultProfile?: string;
}

/**
 * Package.json structure with FSCR config
 */
export interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  scripts?: Record<string, string>;
  fscripts?: FscrConfig;
  [key: string]: any;
}

/**
 * Active profile information
 */
export interface ActiveProfile {
  /**
   * Name of the active profile
   */
  name: string;

  /**
   * Timestamp when profile was activated
   */
  activatedAt: string;
}

/**
 * Profile validation result
 */
export interface ProfileValidationResult {
  /**
   * Whether the profile is valid
   */
  valid: boolean;

  /**
   * Validation errors if any
   */
  errors?: string[];

  /**
   * Validation warnings if any
   */
  warnings?: string[];
}

/**
 * Resolved profile with inherited values
 */
export interface ResolvedProfile extends Profile {
  /**
   * The profile name
   */
  name: string;

  /**
   * Whether this is the active profile
   */
  isActive: boolean;

  /**
   * Resolved environment (including inherited values)
   */
  resolvedEnv: ProfileEnvironment;

  /**
   * Resolved options (including inherited values)
   */
  resolvedOptions: Record<string, any>;
}

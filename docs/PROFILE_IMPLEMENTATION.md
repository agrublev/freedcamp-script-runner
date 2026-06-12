# Profile System Implementation Guide

## Overview

This document provides technical details about the profile management system implementation in FSCR v7.0.0.

## Architecture

### Directory Structure

```
src/
├── types/
│   ├── config.ts                 # Type definitions for profiles and config
│   └── index.ts                  # Central type exports
├── lib/
│   └── config.ts                 # ConfigManager class (core logic)
├── commands/
│   └── profile.ts                # Profile CLI commands
├── cli-profile.ts                # Standalone CLI for profile commands
└── index-profile.ts              # Integration helper for main CLI

tests/
├── config.test.ts                # ConfigManager tests
└── profile-commands.test.ts      # Profile command tests

docs/
├── PROFILES.md                   # User documentation
└── PROFILE_IMPLEMENTATION.md     # This file
```

## Core Components

### 1. ConfigManager (`src/lib/config.ts`)

The `ConfigManager` class is the heart of the profile system. It handles:

- Reading/writing `package.json`
- Managing profiles (create, read, update, delete)
- Active profile tracking (`.fsr/active-profile`)
- Default profile management
- Profile resolution with inheritance
- Profile validation

**Key Methods:**

```typescript
class ConfigManager {
  // Package.json operations
  async readPackageJson(): Promise<PackageJson>
  async writePackageJson(packageJson: PackageJson): Promise<void>
  async getFscrConfig(): Promise<FscrConfig>
  async updateFscrConfig(config: Partial<FscrConfig>): Promise<void>

  // Profile CRUD
  async getProfiles(): Promise<ProfilesConfig>
  async getProfile(name: string): Promise<Profile | null>
  async setProfile(name: string, profile: Profile): Promise<void>
  async deleteProfile(name: string): Promise<void>

  // Active profile
  async getActiveProfile(): Promise<ActiveProfile | null>
  async setActiveProfile(name: string): Promise<void>

  // Default profile
  async getDefaultProfileName(): Promise<string | null>
  async setDefaultProfile(name: string): Promise<void>

  // Profile resolution
  async getCurrentProfileName(): Promise<string | null>
  async resolveProfile(name: string): Promise<ResolvedProfile | null>
  async listProfiles(): Promise<ResolvedProfile[]>

  // Utilities
  validateProfile(name: string, profile: Profile): ProfileValidationResult
  async getScriptsFilePath(): Promise<string>
  async getProfileEnvironment(): Promise<ProfileEnvironment>
}
```

### 2. Type Definitions (`src/types/config.ts`)

Complete TypeScript definitions for:

- `Profile` - Base profile structure
- `ProfilesConfig` - Collection of profiles
- `FscrConfig` - Complete fscripts configuration
- `PackageJson` - Package.json with fscripts
- `ActiveProfile` - Active profile metadata
- `ResolvedProfile` - Profile with inheritance resolved
- `ProfileValidationResult` - Validation results

### 3. Profile Commands (`src/commands/profile.ts`)

User-facing commands:

- `listProfiles()` - List all profiles
- `createProfile()` - Create new profile
- `switchProfile()` - Switch active profile
- `deleteProfile()` - Delete profile
- `showCurrentProfile()` - Show current profile details
- `setDefaultProfile()` - Set default profile

### 4. CLI Integration (`src/cli-profile.ts`, `src/index-profile.ts`)

Two integration options:

**Standalone CLI:**
```bash
node src/cli-profile.ts list
```

**Integration Helper:**
```typescript
import { addProfileCommand } from './src/index-profile.js';
addProfileCommand(yargsInstance);
```

## Data Storage

### Package.json Structure

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "fscripts": {
    "profiles": {
      "development": {
        "scriptsFile": "fscripts.md",
        "env": {
          "NODE_ENV": "development",
          "DEBUG": "true"
        },
        "options": {
          "timeout": 30000
        }
      },
      "production": {
        "scriptsFile": "fscripts.prod.md",
        "env": {
          "NODE_ENV": "production"
        },
        "inherits": "base"
      }
    },
    "defaultProfile": "development"
  }
}
```

### Active Profile File (`.fsr/active-profile`)

```json
{
  "name": "development",
  "activatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Profile Resolution

### Resolution Order

When determining the current profile:

1. **Active profile** (from `.fsr/active-profile`)
2. **Default profile** (from `package.json` → `fscripts.defaultProfile`)
3. **Fallback** (use `fscripts.md` if no profiles exist)

### Inheritance Resolution

Profiles can inherit from other profiles using the `inherits` field:

```json
{
  "profiles": {
    "base": {
      "scriptsFile": "fscripts.md",
      "env": {
        "LOG_LEVEL": "info",
        "TIMEOUT": "30000"
      },
      "options": {
        "color": "auto"
      }
    },
    "development": {
      "scriptsFile": "fscripts.md",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true",
        "LOG_LEVEL": "debug"
      },
      "inherits": "base"
    }
  }
}
```

**Resolution Algorithm:**

1. Start with the profile's own values
2. If `inherits` is set, recursively resolve parent profile
3. Merge parent values (child takes precedence)
4. Return `ResolvedProfile` with merged values

**Result for `development`:**

```typescript
{
  name: "development",
  scriptsFile: "fscripts.md",
  env: { /* original */ },
  options: { /* original */ },
  inherits: "base",
  resolvedEnv: {
    LOG_LEVEL: "debug",    // Overridden from child
    TIMEOUT: "30000",      // Inherited from base
    NODE_ENV: "development", // From child
    DEBUG: "true"          // From child
  },
  resolvedOptions: {
    color: "auto"          // Inherited from base
  },
  isActive: true
}
```

## Validation

The `validateProfile()` method checks:

1. **Profile name:**
   - Not empty
   - Only alphanumeric, hyphens, underscores

2. **Required fields:**
   - `scriptsFile` must be present and a string

3. **Environment variables:**
   - Must be an object
   - All values must be strings

4. **Options:**
   - Must be an object if present

5. **Inheritance:**
   - `inherits` must be a string if present
   - Cannot inherit from itself

**Example:**

```typescript
const result = config.validateProfile('dev@profile!', {
  scriptsFile: 'fscripts.md',
  inherits: 'dev@profile!'
});

// result.valid = false
// result.errors = [
//   'Profile name can only contain letters, numbers, hyphens, and underscores',
//   'Profile cannot inherit from itself'
// ]
```

## Integration with Existing FSCR

### 1. Update Main CLI

In your `index.js`:

```javascript
import { addProfileCommand } from './src/index-profile.js';

const yargsInstance = yargs(process.argv.slice(2))
  .usage("Usage: $0 <command> [options]")
  // ... existing commands ...

// Add profile command
addProfileCommand(yargsInstance);

yargsInstance.help().argv;
```

### 2. Update Task Runner

Modify task execution to use profile environment:

```javascript
import { getConfigManager } from './src/lib/config.js';

async function runTask(taskName) {
  const config = getConfigManager();

  // Get profile environment
  const profileEnv = await config.getProfileEnvironment();

  // Merge with process.env
  const env = { ...process.env, ...profileEnv };

  // Run task with merged environment
  spawn(command, args, {
    env,
    stdio: 'inherit'
  });
}
```

### 3. Update Script Parser

Modify script parser to use profile's scripts file:

```javascript
import { getConfigManager } from './src/lib/config.js';

async function parseScripts() {
  const config = getConfigManager();

  // Get scripts file for current profile
  const scriptsPath = await config.getScriptsFilePath();

  // Parse the file
  return await parseScriptFile(scriptsPath);
}
```

## Testing

### Unit Tests

**ConfigManager Tests (`tests/config.test.ts`):**

- Package.json operations
- Profile CRUD operations
- Active profile management
- Default profile management
- Profile resolution
- Inheritance resolution
- Validation

**Profile Commands Tests (`tests/profile-commands.test.ts`):**

- Create profile
- Switch profile
- Delete profile
- List profiles
- Set default
- Custom options

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test config.test.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Coverage Targets

- Lines: 80%+
- Functions: 80%+
- Branches: 75%+
- Statements: 80%+

## Performance Considerations

### Caching

Consider caching resolved profiles to avoid repeated file I/O:

```typescript
class ConfigManager {
  private profileCache = new Map<string, ResolvedProfile>();

  async resolveProfile(name: string): Promise<ResolvedProfile | null> {
    if (this.profileCache.has(name)) {
      return this.profileCache.get(name)!;
    }

    // Resolve profile
    const resolved = /* ... */;

    // Cache result
    this.profileCache.set(name, resolved);

    return resolved;
  }

  clearCache() {
    this.profileCache.clear();
  }
}
```

### File Watching

For long-running processes, consider watching for changes:

```typescript
import { watch } from 'fs';

class ConfigManager {
  watchPackageJson(callback: () => void) {
    watch(this.packageJsonPath, callback);
  }
}
```

## Error Handling

All methods throw descriptive errors:

```typescript
try {
  await config.setActiveProfile('nonexistent');
} catch (error) {
  // Error: Profile "nonexistent" does not exist
}

try {
  await config.deleteProfile('development');
} catch (error) {
  // Error: Cannot delete active profile "development"
}
```

## Future Enhancements

### 1. Remote Profiles

Support for loading profiles from remote URLs:

```json
{
  "profiles": {
    "ci": {
      "remote": "https://config.example.com/profiles/ci.json"
    }
  }
}
```

### 2. Profile Templates

Pre-built profile templates:

```bash
fsr profile create production --template production-node
```

### 3. Environment File Support

Load environment from `.env` files:

```json
{
  "profiles": {
    "development": {
      "scriptsFile": "fscripts.md",
      "envFile": ".env.development"
    }
  }
}
```

### 4. Profile Hooks

Execute commands when switching profiles:

```json
{
  "profiles": {
    "development": {
      "scriptsFile": "fscripts.md",
      "hooks": {
        "onActivate": "npm install",
        "onDeactivate": "npm run cleanup"
      }
    }
  }
}
```

## Migration Path

### From v6.x

v6.x had no profile support. Migration is automatic:

1. Existing `fscripts.md` continues to work
2. No breaking changes
3. Profiles are opt-in

### Creating Profiles from Existing Setup

```bash
# Create default profile from existing setup
fsr profile create development \
  --scripts-file fscripts.md \
  --set-default

# Everything works as before
```

## Contributing

When contributing to the profile system:

1. Add tests for new features
2. Update type definitions
3. Update documentation
4. Maintain backward compatibility
5. Follow existing code style

## See Also

- [User Documentation](./PROFILES.md)
- [Type Definitions](../src/types/config.ts)
- [ConfigManager Source](../src/lib/config.ts)
- [Test Suite](../tests/config.test.ts)

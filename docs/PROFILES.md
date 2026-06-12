# Profile Management

## Overview

FSCR v7.0.0 introduces **multi-environment profile support**, allowing you to manage different configurations for development, staging, production, and any custom environments you need.

## Quick Start

### Creating Your First Profile

```bash
# Create a development profile
fsr profile create development \
  --scripts-file fscripts.md \
  --env "NODE_ENV=development,DEBUG=true" \
  --set-default \
  --set-active

# Create a production profile
fsr profile create production \
  --scripts-file fscripts.prod.md \
  --env "NODE_ENV=production"
```

### Switching Profiles

```bash
# Switch to production
fsr profile switch production

# Run tasks with production profile
fsr run deploy

# Switch back to development
fsr profile switch development
```

## Profile Configuration

### In package.json

Profiles are stored in your `package.json` under the `fscripts` section:

```json
{
  "fscripts": {
    "profiles": {
      "development": {
        "scriptsFile": "fscripts.md",
        "env": {
          "NODE_ENV": "development",
          "DEBUG": "true",
          "API_URL": "http://localhost:3000"
        }
      },
      "staging": {
        "scriptsFile": "fscripts.staging.md",
        "env": {
          "NODE_ENV": "staging",
          "API_URL": "https://staging.example.com"
        }
      },
      "production": {
        "scriptsFile": "fscripts.prod.md",
        "env": {
          "NODE_ENV": "production",
          "API_URL": "https://api.example.com"
        }
      }
    },
    "defaultProfile": "development"
  }
}
```

## Commands

### `fsr profile list`

List all available profiles with their status.

```bash
fsr profile list
```

**Output:**
```
📋 Available Profiles:

  ● development (active, default)
    Scripts: fscripts.md
    Env: NODE_ENV=development, DEBUG=true

  ○ staging
    Scripts: fscripts.staging.md
    Env: NODE_ENV=staging

  ○ production
    Scripts: fscripts.prod.md
    Env: NODE_ENV=production
```

### `fsr profile create <name>`

Create a new profile.

```bash
fsr profile create <name> [options]
```

**Options:**
- `-s, --scripts-file <path>` - Path to scripts file (default: `fscripts.md`)
- `-e, --env <vars>` - Environment variables (format: `KEY=value,KEY2=value2`)
- `-i, --inherits <profile>` - Inherit from another profile
- `-d, --set-default` - Set as default profile
- `-a, --set-active` - Set as active profile

**Examples:**

```bash
# Basic profile
fsr profile create staging --scripts-file fscripts.staging.md

# With environment variables
fsr profile create production \
  --scripts-file fscripts.prod.md \
  --env "NODE_ENV=production,API_URL=https://api.example.com"

# With inheritance
fsr profile create ci \
  --inherits production \
  --env "CI=true"

# Set as default and active
fsr profile create development \
  --scripts-file fscripts.md \
  --env "NODE_ENV=development" \
  --set-default \
  --set-active
```

### `fsr profile switch <name>`

Switch to a different profile.

```bash
fsr profile switch <name>
```

**Example:**
```bash
fsr profile switch production
# ✅ Switched to profile "production"
#    Scripts: fscripts.prod.md
#    Environment:
#      NODE_ENV=production
#      API_URL=https://api.example.com
```

### `fsr profile delete <name>`

Delete a profile.

```bash
fsr profile delete <name> [--force]
```

**Options:**
- `-f, --force` - Skip confirmation prompt

**Example:**
```bash
fsr profile delete old-staging --force
```

**Restrictions:**
- Cannot delete the active profile (switch to another first)
- Cannot delete the default profile (set another as default first)

### `fsr profile current`

Show the current active profile.

```bash
fsr profile current
```

**Output:**
```
📋 Current Profile: development
   (Default profile)

   Scripts file: fscripts.md
   Environment variables:
     NODE_ENV=development
     DEBUG=true
```

### `fsr profile default <name>`

Set a profile as the default.

```bash
fsr profile default <name>
```

**Example:**
```bash
fsr profile default production
# ✅ Set "production" as default profile.
```

## Profile Features

### 1. Environment Variables

Each profile can define environment variables that are automatically set when running tasks.

```json
{
  "profiles": {
    "development": {
      "scriptsFile": "fscripts.md",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true",
        "LOG_LEVEL": "debug",
        "API_URL": "http://localhost:3000"
      }
    }
  }
}
```

When you run a task with this profile active, all environment variables are automatically available.

### 2. Custom Scripts File

Each profile can use a different scripts file, allowing you to maintain separate task definitions for different environments.

```
project/
├── fscripts.md           # Development scripts
├── fscripts.staging.md   # Staging scripts
└── fscripts.prod.md      # Production scripts
```

### 3. Profile Inheritance

Profiles can inherit from other profiles, reducing duplication.

```json
{
  "profiles": {
    "base": {
      "scriptsFile": "fscripts.md",
      "env": {
        "LOG_LEVEL": "info",
        "TIMEOUT": "30000"
      }
    },
    "development": {
      "scriptsFile": "fscripts.md",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      },
      "inherits": "base"
    },
    "production": {
      "scriptsFile": "fscripts.prod.md",
      "env": {
        "NODE_ENV": "production"
      },
      "inherits": "base"
    }
  }
}
```

**Resolved environments:**

- `development`: `{ LOG_LEVEL: "info", TIMEOUT: "30000", NODE_ENV: "development", DEBUG: "true" }`
- `production`: `{ LOG_LEVEL: "info", TIMEOUT: "30000", NODE_ENV: "production" }`

Child profiles override parent values.

### 4. Custom Options

Profiles support custom options for advanced configuration.

```json
{
  "profiles": {
    "ci": {
      "scriptsFile": "fscripts.md",
      "env": {
        "CI": "true"
      },
      "options": {
        "timeout": 60000,
        "silent": true,
        "color": "never"
      }
    }
  }
}
```

## Active Profile Storage

The active profile is stored in `.fsr/active-profile`:

```json
{
  "name": "development",
  "activatedAt": "2024-01-15T10:30:00.000Z"
}
```

This file is automatically managed by FSCR. Add `.fsr/` to your `.gitignore` to keep it local.

## Profile Priority

FSCR determines which profile to use in this order:

1. **Active profile** (set via `fsr profile switch`)
2. **Default profile** (set in `package.json` or via `fsr profile default`)
3. **Fallback** (use `fscripts.md` if no profiles configured)

## Best Practices

### 1. Use Descriptive Names

```bash
# Good
fsr profile create development
fsr profile create staging
fsr profile create production

# Avoid
fsr profile create p1
fsr profile create config2
```

### 2. Keep Environment Variables in Profiles

Instead of:
```bash
export NODE_ENV=production
export API_URL=https://api.example.com
fsr run deploy
```

Use:
```bash
fsr profile switch production
fsr run deploy
```

### 3. Use Inheritance for Common Settings

```json
{
  "profiles": {
    "base": {
      "scriptsFile": "fscripts.md",
      "env": {
        "TIMEOUT": "30000",
        "RETRY_COUNT": "3"
      }
    },
    "development": {
      "inherits": "base",
      "env": { "NODE_ENV": "development" }
    },
    "production": {
      "inherits": "base",
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

### 4. Add `.fsr/` to `.gitignore`

```gitignore
# FSCR local state
.fsr/
```

### 5. Document Your Profiles

Add comments in package.json:

```json
{
  "fscripts": {
    "profiles": {
      "development": {
        "// description": "Local development with debug enabled",
        "scriptsFile": "fscripts.md",
        "env": {
          "NODE_ENV": "development",
          "DEBUG": "true"
        }
      }
    }
  }
}
```

## Common Workflows

### Multi-Environment Deployment

```bash
# Setup
fsr profile create staging --env "ENV=staging,API_URL=https://staging.example.com"
fsr profile create production --env "ENV=production,API_URL=https://api.example.com"

# Deploy to staging
fsr profile switch staging
fsr run deploy

# Test staging
fsr run test:integration

# Deploy to production
fsr profile switch production
fsr run deploy
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install -g fsr
      - run: fsr profile switch production
      - run: fsr run build
      - run: fsr run deploy
```

### Feature Branches

```bash
# Create feature-specific profile
fsr profile create feature-auth \
  --scripts-file fscripts.md \
  --env "FEATURE_AUTH=true,NODE_ENV=development"

# Switch to it
fsr profile switch feature-auth

# Run tests
fsr run test
```

## Troubleshooting

### Profile Not Found

```bash
❌ Profile "staging" does not exist.
List available profiles with: fsr profile list
```

**Solution:** Check profile name spelling or create the profile:
```bash
fsr profile list
fsr profile create staging
```

### Cannot Delete Active Profile

```bash
❌ Cannot delete active profile "development". Switch to another profile first.
```

**Solution:** Switch to another profile first:
```bash
fsr profile switch production
fsr profile delete development
```

### Invalid Environment Variables

```bash
❌ Invalid profile configuration:
  • Environment variable "DEBUG" must be a string
```

**Solution:** Ensure all environment values are strings:
```json
{
  "env": {
    "DEBUG": "true",  // Not: true
    "PORT": "3000"    // Not: 3000
  }
}
```

## API Usage

For programmatic access:

```typescript
import { ConfigManager } from 'fsr';

const config = new ConfigManager();

// Get current profile
const profileName = await config.getCurrentProfileName();

// Get profile environment
const env = await config.getProfileEnvironment();

// Get scripts file path
const scriptsPath = await config.getScriptsFilePath();

// List all profiles
const profiles = await config.listProfiles();

// Create profile
await config.setProfile('custom', {
  scriptsFile: 'fscripts.custom.md',
  env: { NODE_ENV: 'custom' }
});
```

## Migration Guide

### From v6.x to v7.0.0

If you had a single `fscripts.md` file, no changes needed. To adopt profiles:

1. Create a default profile:
```bash
fsr profile create development --scripts-file fscripts.md --set-default
```

2. Create additional profiles as needed:
```bash
fsr profile create production --scripts-file fscripts.prod.md
```

3. Your existing workflows continue to work.

## See Also

- [Configuration Documentation](./CONFIGURATION.md)
- [Commands Reference](./COMMANDS.md)
- [Environment Variables](./ENVIRONMENT.md)

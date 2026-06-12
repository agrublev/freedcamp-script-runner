# FSCR Doctor Command

The `doctor` command provides comprehensive health checks and diagnostics for your FSCR installation.

## Usage

```bash
# Run all diagnostics
fsr doctor

# Run diagnostics and auto-fix issues
fsr doctor --fix

# Output results as JSON
fsr doctor --json

# Verbose output with error details
fsr doctor --verbose
```

## What It Checks

### 1. System Requirements ✅

#### Node.js Version
- **Checks**: Node.js version >= 18.0.0
- **Critical**: Yes
- **Auto-fix**: No (manual upgrade required)
- **Fix instructions**: Visit https://nodejs.org/

#### Package Manager
- **Checks**: npm, yarn, or pnpm installation
- **Critical**: Yes
- **Auto-fix**: No (manual installation required)
- **Detects**: Automatically detects which package manager you're using based on lock files

#### Git
- **Checks**: Git installation
- **Critical**: No
- **Auto-fix**: No (manual installation required)
- **Fix instructions**: Visit https://git-scm.com/downloads

### 2. Project Files ✅

#### fscripts.md
- **Checks**: Existence of fscripts.md file
- **Critical**: No
- **Auto-fix**: Yes (creates basic template)
- **Template created**:
  ```markdown
  # Scripts

  ## hello
  Say hello

  \`\`\`bash
  echo "Hello from FSCR!"
  \`\`\`
  ```

#### package.json
- **Checks**: Valid package.json exists
- **Critical**: Yes
- **Auto-fix**: No
- **Validates**: JSON structure and FSCR version

#### TypeScript
- **Checks**: TypeScript installation (optional)
- **Critical**: No (warning only)
- **Auto-fix**: Yes (installs as dev dependency)
- **Note**: Installation may fail if peer dependencies conflict

### 3. Permissions ✅

#### File Permissions
- **Checks**: Read/write access to project directory
- **Critical**: Yes
- **Auto-fix**: Limited (can fix some permission issues)
- **Tests**: Creates and removes a test file

### 4. Cache System ✅

#### Cache Directory
- **Checks**: `~/.fsr/cache` directory exists and is writable
- **Critical**: No
- **Auto-fix**: Yes (creates directory with correct permissions)
- **Reports**: Cache size in human-readable format

### 5. Performance ⚡

#### Startup Time
- **Checks**: FSCR startup time < 50ms
- **Critical**: No
- **Auto-fix**: No
- **Target**: < 50ms
- **Warning threshold**: 50-100ms
- **Suggestions**: Clear cache, reduce plugins/hooks

#### Memory Usage
- **Checks**: Memory usage < 50MB
- **Critical**: No
- **Auto-fix**: No
- **Target**: < 50MB
- **Warning threshold**: 50-75MB
- **Reports**: Heap + External memory

## Output Examples

### Standard Output

```bash
$ fsr doctor

🔍 Running FSCR diagnostics...

✅ Node.js version
   v20.0.0 (recommended: >=18.0.0)

✅ Package manager (npm)
   npm 10.0.0 installed

✅ Git
   git version 2.40.0

✅ fscripts.md file
   Found (4.52 KB)

✅ package.json
   Valid (fsr@7.0.0)

⚠️  TypeScript
   Not installed (optional)

✅ File permissions
   Read/write access OK

✅ Cache system
   Operational (128.45 KB)

✅ Startup time
   42.31ms (target: <50ms)

✅ Memory usage
   34.12MB (target: <50MB)

──────────────────────────────────────────────────
Summary:
  ✅ Passed: 9
  ⚠️  Warnings: 1
──────────────────────────────────────────────────

┌──────────────────────────────────────┐
│                                      │
│        ✓ All checks passed!          │
│                                      │
└──────────────────────────────────────┘
```

### With Issues

```bash
$ fsr doctor

🔍 Running FSCR diagnostics...

✅ Node.js version
   v20.0.0 (recommended: >=18.0.0)

❌ fscripts.md file
   Not found

✅ package.json
   Valid (fsr@7.0.0)

──────────────────────────────────────────────────
Summary:
  ✅ Passed: 8
  ❌ Errors: 2
──────────────────────────────────────────────────

┌──────────────────────────────────────┐
│                                      │
│  ✗ Issues found - please review      │
│                                      │
└──────────────────────────────────────┘

Tip: Run "fsr doctor --fix" to automatically fix some issues
```

### Auto-Fix

```bash
$ fsr doctor --fix

🔍 Running FSCR diagnostics...

❌ fscripts.md file
   Not found
   Attempting to fix...
   ✓ Fixed: Created basic fscripts.md template

❌ Cache system
   Cache directory does not exist
   Attempting to fix...
   ✓ Fixed: Created cache directory at /Users/username/.fsr/cache

──────────────────────────────────────────────────
Summary:
  ✅ Passed: 8
  🔧 Fixed: 2
──────────────────────────────────────────────────
```

### JSON Output

```bash
$ fsr doctor --json
```

```json
{
  "passed": true,
  "summary": {
    "passed": 9,
    "warnings": 1,
    "errors": 0,
    "fixed": 0,
    "total": 10
  },
  "results": [
    {
      "name": "Node.js version",
      "passed": true,
      "warning": false,
      "message": "v20.0.0 (recommended: >=18.0.0)",
      "details": {
        "current": "20.0.0",
        "required": ">=18.0.0"
      },
      "canFix": false,
      "critical": true
    },
    {
      "name": "TypeScript",
      "passed": false,
      "warning": true,
      "message": "Not installed (optional)",
      "details": {},
      "canFix": true,
      "critical": false
    }
  ]
}
```

## Exit Codes

- `0`: All checks passed or only warnings
- `1`: Critical failures detected

## Integration with CI/CD

Use JSON output for CI/CD pipelines:

```bash
# GitHub Actions
- name: Run FSCR Doctor
  run: |
    fsr doctor --json > doctor-report.json
    if ! fsr doctor; then
      echo "FSCR health check failed"
      exit 1
    fi
```

```yaml
# .gitlab-ci.yml
fsr-health:
  script:
    - npm install -g fsr
    - fsr doctor --json > doctor-report.json
  artifacts:
    reports:
      json: doctor-report.json
```

## Programmatic Usage

```javascript
import doctor from './lib/commands/doctor.js';

// Run diagnostics
const result = await doctor({ json: true });

if (result.passed) {
  console.log('All checks passed!');
} else {
  console.log(`Found ${result.summary.errors} errors`);
}

// Check specific diagnostics
import { checkNodeVersion } from './lib/diagnostics/nodeVersion.js';

const nodeCheck = await checkNodeVersion({ minVersion: '18.0.0' });
console.log(nodeCheck.passed ? 'Node OK' : 'Node version too low');
```

## Diagnostic Modules

Each diagnostic check is a separate module in `/lib/diagnostics/`:

- `nodeVersion.js` - Node.js version check
- `packageManager.js` - Package manager detection
- `gitCheck.js` - Git installation check
- `fileSystem.js` - File checks (fscripts.md, package.json, TypeScript, permissions)
- `cache.js` - Cache system health
- `performance.js` - Startup time and memory usage

All modules export async functions that return a standardized result object:

```javascript
{
  name: string,           // Check name
  passed: boolean,        // Whether check passed
  warning: boolean,       // Is this a warning (not critical)
  message: string,        // Human-readable message
  details: object,        // Detailed information
  canFix: boolean,        // Can be auto-fixed
  fix: function | null,   // Auto-fix function
  critical: boolean       // Is this check critical
}
```

## Adding Custom Checks

To add a custom diagnostic check:

1. Create a new module in `/lib/diagnostics/`
2. Export an async function that returns the standard result object
3. Add the check to `/lib/commands/doctor.js` in the `checks` array

Example:

```javascript
// lib/diagnostics/customCheck.js
export async function checkCustom(options = {}) {
    return {
        name: 'Custom Check',
        passed: true,
        warning: false,
        message: 'Custom check passed',
        details: {},
        canFix: false,
        fix: null
    };
}
```

## Troubleshooting

### "TypeScript fix failed"
This usually happens due to peer dependency conflicts. Install TypeScript manually:
```bash
npm install --save-dev typescript --legacy-peer-deps
```

### "Permission denied" on cache directory
The cache directory is at `~/.fsr/cache`. Check permissions:
```bash
ls -la ~/.fsr/cache
chmod 755 ~/.fsr/cache
```

### High startup time
- Clear cache: `rm -rf ~/.fsr/cache`
- Reduce number of plugins
- Disable unnecessary hooks
- Use a faster shell (zsh over bash)

### High memory usage
- Update to latest FSCR version
- Reduce concurrent tasks
- Check for memory leaks in custom plugins
- Clear Node.js cache: `npm cache clean --force`

## Best Practices

1. **Run before deployment**: Always run `fsr doctor` before deploying
2. **CI/CD integration**: Add `fsr doctor` to your CI pipeline
3. **Regular checks**: Run weekly to catch issues early
4. **Auto-fix carefully**: Review what `--fix` will do in a test environment first
5. **Monitor performance**: Track startup time and memory usage over time
6. **Keep updated**: Ensure Node.js and package managers are up to date

## Related Commands

- `fsr --version` - Check FSCR version
- `fsr --help` - List all commands
- `fsr generate` - Generate fscripts.md
- `fsr list` - List all available tasks

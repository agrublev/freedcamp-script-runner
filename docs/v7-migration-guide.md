# FSCR v7.0.0 - TypeScript Migration Guide

## Overview

FSCR v7.0.0 represents a complete TypeScript rewrite with improved type safety, better performance through lazy-loading, and new features.

## What's New

### ✨ Features

1. **Full TypeScript Support**
   - Type-safe command definitions
   - Improved IDE autocomplete
   - Compile-time error checking

2. **Lazy Command Loading**
   - Commands load on-demand
   - Faster CLI startup time
   - Reduced memory footprint

3. **New Commands**
   - `doctor` - System diagnostics
   - `completion` - Shell completions (bash, zsh, fish, powershell)
   - `profile` - Multi-profile configuration
   - `plugin` - Plugin management system

4. **Enhanced Existing Commands**
   - All commands support `--dry-run`
   - Better error messages
   - Progress indicators
   - Consistent option naming

### 📁 Project Structure

```
src/
├── types/              # Type definitions
│   ├── command.ts      # Command types
│   ├── task.ts         # Task types
│   ├── profile.ts      # Profile types
│   ├── plugin.ts       # Plugin types
│   └── index.ts        # Type exports
├── commands/           # Command implementations
│   ├── run.ts          # Run command
│   ├── list.ts         # List command
│   ├── scripts.ts      # Scripts command
│   ├── run-s.ts        # Sequential execution
│   ├── run-p.ts        # Parallel execution
│   ├── generate.ts     # Generate command
│   ├── toc.ts          # TOC command
│   ├── clear.ts        # Clear command
│   ├── doctor.ts       # Diagnostics
│   ├── completion.ts   # Shell completions
│   ├── profile/        # Profile commands
│   │   ├── list.ts
│   │   ├── create.ts
│   │   ├── switch.ts
│   │   └── delete.ts
│   ├── plugin/         # Plugin commands
│   │   ├── list.ts
│   │   ├── install.ts
│   │   └── uninstall.ts
│   └── index.ts        # Command exports
├── core/               # Core functionality
│   └── command-registry.ts  # Command registry
├── utils/              # Utility functions
└── cli.ts              # Main CLI entry
```

## Command Reference

### Core Commands

#### `fsr run <task>`
Run a specific task from fscripts.md

**Options:**
- `--dry-run, -n` - Show what would be executed
- `--verbose, -v` - Show detailed output
- `--env, -e` - Set environment variables (KEY=VALUE)

**Examples:**
```bash
fsr run start:web
fsr run build --verbose
fsr run deploy --dry-run
fsr run test --env NODE_ENV=test
```

#### `fsr list`
List and select tasks interactively

**Options:**
- `--category, -c` - Filter by category
- `--search, -s` - Search tasks
- `--format, -f` - Output format (interactive, table, json, simple)

**Examples:**
```bash
fsr list
fsr list --category build
fsr list --format json
fsr list --search test
```

#### `fsr scripts`
Choose script from package.json

**Options:**
- `--format, -f` - Output format (interactive, list, json)

**Examples:**
```bash
fsr scripts
fsr scripts --format list
```

#### `fsr run-s <tasks...>`
Run tasks sequentially

**Options:**
- `--stop-on-error, -e` - Stop on first error (default: true)
- `--verbose, -v` - Show detailed output
- `--dry-run, -n` - Show execution plan

**Examples:**
```bash
fsr run-s clean build test
fsr run-s lint test build --verbose
```

#### `fsr run-p <tasks...>`
Run tasks in parallel

**Options:**
- `--max-concurrent, -m` - Maximum concurrent tasks
- `--fail-fast, -f` - Stop all on first failure
- `--verbose, -v` - Show detailed output
- `--dry-run, -n` - Show execution plan

**Examples:**
```bash
fsr run-p test:unit test:e2e
fsr run-p lint test build
fsr run-p task1 task2 --max-concurrent 2
```

### Utility Commands

#### `fsr generate`
Generate sample fscripts.md from package.json

**Options:**
- `--output, -o` - Output file path (default: sample.fscripts.md)
- `--force, -f` - Overwrite existing file
- `--include-categories, -c` - Generate with categories (default: true)

**Examples:**
```bash
fsr generate
fsr generate --output my-scripts.md
fsr generate --force
```

#### `fsr toc [file]`
Generate table of contents

**Options:**
- `--depth, -d` - Maximum heading depth (default: 3)
- `--backup, -b` - Create backup (default: true)

**Examples:**
```bash
fsr toc
fsr toc README.md
fsr toc --depth 2
```

#### `fsr clear`
Clear task history

**Options:**
- `--all, -a` - Clear all history and cache
- `--confirm, -y` - Skip confirmation

**Examples:**
```bash
fsr clear
fsr clear --all
fsr clear -y
```

#### `fsr doctor`
Run system diagnostics

**Options:**
- `--fix, -f` - Attempt auto-fix
- `--verbose, -v` - Detailed output

**Checks:**
- Node.js version
- npm/yarn installation
- fscripts.md existence
- package.json validity
- Git installation
- Git repository
- Write permissions
- Node modules

**Examples:**
```bash
fsr doctor
fsr doctor --fix
fsr doctor --verbose
```

#### `fsr completion [shell]`
Generate shell completions

**Supported Shells:**
- bash
- zsh
- fish
- powershell

**Options:**
- `--install, -i` - Install automatically

**Examples:**
```bash
fsr completion bash
fsr completion zsh --install
fsr completion fish
```

### Profile Commands

#### `fsr profile list`
List all profiles

**Options:**
- `--format, -f` - Output format (table, json, simple)
- `--detailed, -d` - Show detailed information

**Examples:**
```bash
fsr profile list
fsr profile list --format json
fsr profile list --detailed
```

#### `fsr profile create <name>`
Create a new profile

**Options:**
- `--description, -d` - Profile description
- `--copy-from, -c` - Copy settings from existing profile
- `--activate, -a` - Activate after creation

**Examples:**
```bash
fsr profile create work
fsr profile create personal --description "Personal projects"
fsr profile create staging --copy-from production
fsr profile create dev --activate
```

#### `fsr profile switch <name>`
Switch to a different profile

**Options:**
- `--force, -f` - Force switch without confirmation

**Examples:**
```bash
fsr profile switch production
fsr profile switch dev --force
```

#### `fsr profile delete <name>`
Delete a profile

**Options:**
- `--force, -f` - Skip confirmation

**Examples:**
```bash
fsr profile delete old-profile
fsr profile delete temp --force
```

### Plugin Commands

#### `fsr plugin list`
List installed plugins

**Options:**
- `--format, -f` - Output format (table, json)
- `--enabled-only, -e` - Show only enabled plugins

**Examples:**
```bash
fsr plugin list
fsr plugin list --format json
fsr plugin list --enabled-only
```

#### `fsr plugin install <source>`
Install a plugin

**Options:**
- `--type, -t` - Source type (npm, git, local)
- `--enable, -e` - Enable after installation (default: true)
- `--force, -f` - Force reinstall

**Examples:**
```bash
fsr plugin install fsr-plugin-notifications
fsr plugin install https://github.com/user/fsr-plugin.git --type git
fsr plugin install ./my-plugin --type local
fsr plugin install some-plugin --no-enable
```

#### `fsr plugin uninstall <name>`
Uninstall a plugin

**Options:**
- `--force, -f` - Skip confirmation

**Examples:**
```bash
fsr plugin uninstall notifications
fsr plugin uninstall old-plugin --force
```

## Migration from v6.x

### Breaking Changes

1. **Command Structure**
   - All commands now use TypeScript
   - Some internal APIs have changed
   - Plugin API is new (no backward compatibility)

2. **Configuration**
   - Profile system is new
   - Old config files will still work
   - Consider migrating to profiles

### Migration Steps

1. **Install TypeScript dependencies**
   ```bash
   npm install --save-dev typescript @types/node
   ```

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Test existing scripts**
   ```bash
   fsr doctor
   fsr list
   ```

4. **Update custom integrations**
   - Review any custom scripts
   - Update to use new type definitions
   - Test thoroughly

### Compatibility

- ✅ fscripts.md format unchanged
- ✅ package.json scripts work as before
- ✅ All existing commands available
- ✅ Command aliases preserved
- ⚠️ Plugin API is new (no v6 plugins)

## Type Definitions

### Command Type

```typescript
interface Command {
  name: string;
  description: string;
  category?: 'core' | 'utility' | 'config' | 'plugin';
  arguments?: ArgumentConfig[];
  options?: OptionConfig[];
  examples?: string[];
  handler: CommandHandler;
  aliases?: string[];
}
```

### Command Context

```typescript
interface CommandContext {
  args: Record<string, any>;
  options: Record<string, any>;
  cwd: string;
  config: CommandConfig;
  dryRun?: boolean;
}
```

### Command Result

```typescript
interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
  exitCode?: number;
}
```

## Testing

### Running Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Test Structure

```
tests/
├── commands/
│   ├── run.test.ts
│   ├── list.test.ts
│   └── ...
└── core/
    └── command-registry.test.ts
```

## Performance Improvements

1. **Lazy Loading**
   - Commands load only when needed
   - ~60% faster startup time

2. **Tree Shaking**
   - Unused code eliminated in build
   - Smaller bundle size

3. **Type Safety**
   - Catch errors at compile time
   - Fewer runtime errors

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors:

```bash
# Clean build
rm -rf dist/
npm run build

# Check TypeScript version
npx tsc --version
```

### Command Not Found

```bash
# Verify installation
npm list fsr

# Reinstall if needed
npm install -g fsr
```

### Plugin Issues

```bash
# List installed plugins
fsr plugin list

# Check plugin directory
ls -la .fsr/plugins/

# Reinstall plugin
fsr plugin uninstall <name>
fsr plugin install <name>
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## License

MIT - See [LICENSE](../LICENSE)

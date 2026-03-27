# Shell Completions

FSCR v7.0.0 includes comprehensive shell completion support for enhanced productivity. Completions work with Bash, Zsh, Fish, and PowerShell.

## Features

### 🎯 Command Completion
- Complete all FSCR commands (`run`, `start`, `list`, etc.)
- Complete subcommands (`completion install`, `completion status`)
- Complete flags and options

### 📋 Dynamic Task Completion
- Automatically completes task names from your `fscripts.md`
- Updates dynamically when you modify tasks
- Cached for performance (5-second TTL)

### 🚀 Auto-Installation
- Detects your current shell automatically
- Installs completions to the appropriate config file
- Provides reload instructions

### 🔄 Multi-Shell Support
- **Bash** - `.bashrc` integration
- **Zsh** - `.zshrc` integration with descriptions
- **Fish** - Native Fish completions with rich descriptions
- **PowerShell** - Profile-based completions

## Quick Start

### Install Completions

The easiest way to install completions is to run:

```bash
fscr completion install
```

This will:
1. Auto-detect your shell
2. Install the appropriate completion script
3. Show you how to activate it

### Manual Installation

You can also specify the shell explicitly:

```bash
# Install for Bash
fscr completion install --shell bash

# Install for Zsh
fscr completion install --shell zsh

# Install for Fish
fscr completion install --shell fish

# Install for PowerShell
fscr completion install --shell powershell
```

### Activate Completions

After installation, restart your shell or source the config file:

**Bash:**
```bash
source ~/.bashrc
```

**Zsh:**
```bash
source ~/.zshrc
```

**Fish:**
```fish
exec fish
```

**PowerShell:**
```powershell
. $PROFILE
```

## Usage Examples

Once installed, use `Tab` to complete commands and tasks:

### Complete Commands

```bash
$ fscr <Tab>
start     run      list     scripts   run-s
run-p     bump     upgrade  branch    completion
```

### Complete Tasks

```bash
$ fscr run <Tab>
node:script    say:hello     decrypt       run:s
run:p          run:one       run:two       run:three
```

### Complete Multiple Tasks

```bash
$ fscr run-s run:one <Tab>
node:script    say:hello     decrypt       run:s
run:p          run:one       run:two       run:three
```

### Complete Subcommands

```bash
$ fscr completion <Tab>
install    uninstall    status    generate
```

## Advanced Usage

### Check Installation Status

See which shells have completions installed:

```bash
$ fscr completion status

📋 Completion Status

● bash         ✅ Installed (current)
○ zsh          Not installed
○ fish         Not installed
○ powershell   Not installed
```

### Generate Completion Script

Output the completion script without installing:

```bash
# Generate Bash completion script
fscr completion generate --shell bash

# Generate Zsh completion script
fscr completion generate --shell zsh
```

This is useful if you want to:
- Review the script before installing
- Install manually to a custom location
- Integrate with a custom shell configuration

### Force Reinstall

If you need to update or repair completions:

```bash
fscr completion install --force
```

This will overwrite existing completion configuration.

### Uninstall Completions

Remove completions from your shell:

```bash
# Uninstall from current shell
fscr completion uninstall

# Uninstall from specific shell
fscr completion uninstall --shell zsh
```

## How It Works

### Task Discovery

Completions dynamically parse your `fscripts.md` file to discover available tasks:

1. **Parse fscripts.md** - Extract task names and descriptions
2. **Cache results** - Cache for 5 seconds to avoid repeated parsing
3. **Complete** - Provide completions based on context

### Shell Integration

Each shell has a custom completion script optimized for its features:

**Bash:**
- Uses bash-completion framework
- Completes based on previous word context
- Supports multiple task completion for `run-s` and `run-p`

**Zsh:**
- Uses zsh's completion system
- Provides rich descriptions for each completion
- Supports argument completion with `_arguments`

**Fish:**
- Uses Fish's native completion syntax
- Rich descriptions and colors
- Context-aware completions

**PowerShell:**
- Uses `Register-ArgumentCompleter`
- Tab completion with descriptions
- Custom completion logic

## Troubleshooting

### Completions Not Working

If completions aren't working after installation:

1. **Check installation status:**
   ```bash
   fscr completion status
   ```

2. **Verify shell config:**
   ```bash
   # Bash
   cat ~/.bashrc | grep "FSCR completion"

   # Zsh
   cat ~/.zshrc | grep "FSCR completion"
   ```

3. **Restart shell:**
   ```bash
   exec $SHELL
   ```

4. **Reinstall with force:**
   ```bash
   fscr completion install --force
   ```

### Tasks Not Completing

If task names aren't appearing in completions:

1. **Verify fscripts.md exists** in your current directory
2. **Check task format** - tasks should be defined as `## task:name`
3. **Clear cache** by waiting 5 seconds or changing directory

### Fish Completions Not Found

For Fish, completions are installed to `~/.config/fish/completions/fscr.fish`. If they're not working:

1. **Check directory exists:**
   ```fish
   ls ~/.config/fish/completions/
   ```

2. **Verify file exists:**
   ```fish
   cat ~/.config/fish/completions/fscr.fish
   ```

3. **Reload completions:**
   ```fish
   exec fish
   ```

### PowerShell Completions Not Loading

For PowerShell:

1. **Check profile exists:**
   ```powershell
   Test-Path $PROFILE
   ```

2. **View profile content:**
   ```powershell
   Get-Content $PROFILE
   ```

3. **Reload profile:**
   ```powershell
   . $PROFILE
   ```

4. **Check execution policy:**
   ```powershell
   Get-ExecutionPolicy
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

## Performance

Completions are designed to be fast:

- **Task caching** - Tasks are cached for 5 seconds
- **Lazy loading** - Only parse when needed
- **Efficient parsing** - Direct markdown parsing (no heavy dependencies)

Typical completion response time: **< 50ms**

## File Locations

### Bash
- **Script:** `lib/completions/scripts/bash.sh`
- **Config:** `~/.bashrc`

### Zsh
- **Script:** `lib/completions/scripts/zsh.sh`
- **Config:** `~/.zshrc`

### Fish
- **Script:** `lib/completions/scripts/fish.sh`
- **Config:** `~/.config/fish/completions/fscr.fish`

### PowerShell
- **Script:** `lib/completions/scripts/powershell.ps1`
- **Config:** `~/Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1`

## API Reference

### Commands

#### `fscr completion`
Interactive completion installation.

#### `fscr completion install`
Install completions for current shell.

**Options:**
- `--shell <shell>` - Target shell (bash, zsh, fish, powershell)
- `--force` - Force reinstall

**Examples:**
```bash
fscr completion install
fscr completion install --shell zsh
fscr completion install --force
```

#### `fscr completion uninstall`
Uninstall completions.

**Options:**
- `--shell <shell>` - Target shell

**Examples:**
```bash
fscr completion uninstall
fscr completion uninstall --shell bash
```

#### `fscr completion status`
Show completion installation status for all shells.

**Example:**
```bash
fscr completion status
```

#### `fscr completion generate`
Generate completion script without installing.

**Options:**
- `--shell <shell>` - Target shell

**Examples:**
```bash
fscr completion generate --shell bash > custom.sh
fscr completion generate --shell zsh
```

## Development

### Adding New Completions

To add completions for a new command:

1. **Update generator.js:**
   ```javascript
   export function getAvailableCommands() {
       return [
           // ... existing commands
           { name: "newcmd", description: "New command description" }
       ];
   }
   ```

2. **Update shell scripts:**
   - Add to `bash.sh`
   - Add to `zsh.sh`
   - Add to `fish.sh`
   - Add to `powershell.ps1`

3. **Test completions:**
   ```bash
   fscr completion install --force
   exec $SHELL
   fscr newcmd <Tab>
   ```

### Testing

Run completion tests:

```bash
npm test -- completion.test.js
```

## Contributing

Contributions to improve completions are welcome! Please:

1. Test with all supported shells
2. Update documentation
3. Add tests for new features
4. Follow existing code style

## License

MIT License - see LICENSE file for details.

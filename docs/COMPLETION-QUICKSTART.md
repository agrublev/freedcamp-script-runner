# Shell Completions - Quick Start

Get tab completion for FSCR commands and tasks in 2 minutes.

## Install

```bash
fscr completion install
```

Then reload your shell:

```bash
# Bash/Zsh
source ~/.bashrc  # or ~/.zshrc

# Fish
exec fish

# PowerShell
. $PROFILE
```

## Examples

### Complete commands
```bash
$ fscr <Tab>
start  run  list  scripts  completion  ...
```

### Complete tasks
```bash
$ fscr run <Tab>
node:script  say:hello  decrypt  run:one  ...
```

### Complete multiple tasks
```bash
$ fscr run-s run:one <Tab>
run:two  run:three  node:script  ...
```

## Supported Shells

✅ **Bash** - `.bashrc`
✅ **Zsh** - `.zshrc` with descriptions
✅ **Fish** - Native Fish completions
✅ **PowerShell** - Profile integration

## Check Status

```bash
$ fscr completion status

📋 Completion Status

● bash         ✅ Installed (current)
○ zsh          Not installed
○ fish         Not installed
```

## Uninstall

```bash
fscr completion uninstall
```

## More Info

See full documentation: [COMPLETIONS.md](./COMPLETIONS.md)

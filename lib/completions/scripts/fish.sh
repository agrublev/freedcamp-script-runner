#!/usr/bin/env fish
# FSCR Fish completion script

# Function to get available tasks
function __fscr_get_tasks
    # Try to get tasks from fscripts.md using node
    if command -v node >/dev/null 2>&1
        set tasks_output (node -e "
            import('$FSCR_COMPLETION_HELPER').then(async (m) => {
                const tasks = await m.generateTaskNames();
                console.log(tasks.join('\\n'));
            }).catch(() => {});
        " 2>/dev/null)

        if test -n "$tasks_output"
            echo $tasks_output
            return
        end
    end

    # Fallback: parse fscripts.md directly
    if test -f "fscripts.md"
        grep -E "^## " fscripts.md | sed 's/^## //'
    end
end

# Function to check if a command has been given
function __fscr_using_command
    set -l cmd (commandline -opc)
    if test (count $cmd) -gt 1
        if test $argv[1] = $cmd[2]
            return 0
        end
    end
    return 1
end

# Disable file completion by default
complete -c fscr -f
complete -c fsr -f

# Main commands
complete -c fscr -n "not __fscr_using_command start" -a "start" -d "Choose category then task to run"
complete -c fscr -n "not __fscr_using_command run" -a "run" -d "Run a specific task"
complete -c fscr -n "not __fscr_using_command list" -a "list" -d "Select any task with text autocompletion"
complete -c fscr -n "not __fscr_using_command scripts" -a "scripts" -d "Choose a script from package.json"
complete -c fscr -n "not __fscr_using_command run-s" -a "run-s" -d "Run tasks in sequence"
complete -c fscr -n "not __fscr_using_command run-p" -a "run-p" -d "Run tasks in parallel"
complete -c fscr -n "not __fscr_using_command bump" -a "bump" -d "Bump package.json version"
complete -c fscr -n "not __fscr_using_command upgrade" -a "upgrade" -d "Upgrade packages"
complete -c fscr -n "not __fscr_using_command branch" -a "branch" -d "Create new branch"
complete -c fscr -n "not __fscr_using_command remote" -a "remote" -d "Get remote configuration"
complete -c fscr -n "not __fscr_using_command encryption" -a "encryption" -d "Encrypt/Decrypt files"
complete -c fscr -n "not __fscr_using_command clear" -a "clear" -d "Clear recent task history"
complete -c fscr -n "not __fscr_using_command generate" -a "generate" -d "Generate sample fscripts.md"
complete -c fscr -n "not __fscr_using_command toc" -a "toc" -d "Generate table of contents"
complete -c fscr -n "not __fscr_using_command completion" -a "completion" -d "Manage shell completions"

# Task completion for 'run' command
complete -c fscr -n "__fscr_using_command run" -a "(__fscr_get_tasks)" -d "Run task"

# Task completion for 'run-s' command
complete -c fscr -n "__fscr_using_command run-s" -a "(__fscr_get_tasks)" -d "Run task"

# Task completion for 'run-p' command
complete -c fscr -n "__fscr_using_command run-p" -a "(__fscr_get_tasks)" -d "Run task"

# Completion subcommands
complete -c fscr -n "__fscr_using_command completion" -a "install" -d "Install completions"
complete -c fscr -n "__fscr_using_command completion" -a "uninstall" -d "Uninstall completions"
complete -c fscr -n "__fscr_using_command completion" -a "status" -d "Show completion status"
complete -c fscr -n "__fscr_using_command completion" -a "generate" -d "Generate completion script"

# Shell options for completion commands
complete -c fscr -l shell -d "Target shell" -a "bash zsh fish powershell"
complete -c fscr -l force -d "Force reinstall"
complete -c fscr -l help -d "Show help"

# Copy all completions to fsr alias
complete -c fsr -f
complete -c fsr -n "not __fscr_using_command start" -a "start" -d "Choose category then task to run"
complete -c fsr -n "not __fscr_using_command run" -a "run" -d "Run a specific task"
complete -c fsr -n "not __fscr_using_command list" -a "list" -d "Select any task with text autocompletion"
complete -c fsr -n "not __fscr_using_command scripts" -a "scripts" -d "Choose a script from package.json"
complete -c fsr -n "not __fscr_using_command run-s" -a "run-s" -d "Run tasks in sequence"
complete -c fsr -n "not __fscr_using_command run-p" -a "run-p" -d "Run tasks in parallel"
complete -c fsr -n "not __fscr_using_command bump" -a "bump" -d "Bump package.json version"
complete -c fsr -n "not __fscr_using_command upgrade" -a "upgrade" -d "Upgrade packages"
complete -c fsr -n "not __fscr_using_command branch" -a "branch" -d "Create new branch"
complete -c fsr -n "not __fscr_using_command remote" -a "remote" -d "Get remote configuration"
complete -c fsr -n "not __fscr_using_command encryption" -a "encryption" -d "Encrypt/Decrypt files"
complete -c fsr -n "not __fscr_using_command clear" -a "clear" -d "Clear recent task history"
complete -c fsr -n "not __fscr_using_command generate" -a "generate" -d "Generate sample fscripts.md"
complete -c fsr -n "not __fscr_using_command toc" -a "toc" -d "Generate table of contents"
complete -c fsr -n "not __fscr_using_command completion" -a "completion" -d "Manage shell completions"
complete -c fsr -n "__fscr_using_command run" -a "(__fscr_get_tasks)" -d "Run task"
complete -c fsr -n "__fscr_using_command run-s" -a "(__fscr_get_tasks)" -d "Run task"
complete -c fsr -n "__fscr_using_command run-p" -a "(__fscr_get_tasks)" -d "Run task"
complete -c fsr -n "__fscr_using_command completion" -a "install" -d "Install completions"
complete -c fsr -n "__fscr_using_command completion" -a "uninstall" -d "Uninstall completions"
complete -c fsr -n "__fscr_using_command completion" -a "status" -d "Show completion status"
complete -c fsr -n "__fscr_using_command completion" -a "generate" -d "Generate completion script"
complete -c fsr -l shell -d "Target shell" -a "bash zsh fish powershell"
complete -c fsr -l force -d "Force reinstall"
complete -c fsr -l help -d "Show help"

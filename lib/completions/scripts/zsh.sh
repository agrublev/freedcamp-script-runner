#!/bin/zsh
# FSCR Zsh completion script

_fscr_get_tasks() {
    # Try to get tasks from fscripts.md using node
    if command -v node >/dev/null 2>&1; then
        local tasks_output
        tasks_output=$(node -e "
            import('$FSCR_COMPLETION_HELPER').then(async (m) => {
                const tasks = await m.generateTaskNames();
                console.log(tasks.join('\\n'));
            }).catch(() => {});
        " 2>/dev/null)

        if [ -n "$tasks_output" ]; then
            echo "$tasks_output"
            return
        fi
    fi

    # Fallback: parse fscripts.md directly
    if [ -f "fscripts.md" ]; then
        grep -E "^## " fscripts.md | sed 's/^## //'
    fi
}

_fscr() {
    local curcontext="$curcontext" state line
    typeset -A opt_args

    local -a commands
    commands=(
        'start:Choose category then task to run'
        'run:Run a specific task'
        'list:Select any task with text autocompletion'
        'scripts:Choose a script from package.json'
        'run-s:Run tasks in sequence'
        'run-p:Run tasks in parallel'
        'bump:Bump package.json version'
        'upgrade:Upgrade packages'
        'branch:Create new branch'
        'remote:Get remote configuration'
        'encryption:Encrypt/Decrypt files'
        'clear:Clear recent task history'
        'generate:Generate sample fscripts.md'
        'toc:Generate table of contents'
        'completion:Manage shell completions'
    )

    local -a completion_cmds
    completion_cmds=(
        'install:Install completions'
        'uninstall:Uninstall completions'
        'status:Show completion status'
        'generate:Generate completion script'
    )

    local -a shells
    shells=(
        'bash:Bash shell'
        'zsh:Zsh shell'
        'fish:Fish shell'
        'powershell:PowerShell'
    )

    _arguments -C \
        '1: :->command' \
        '*:: :->args' \
        && return 0

    case $state in
        command)
            _describe -t commands 'fsr commands' commands
            ;;
        args)
            case $words[1] in
                run)
                    local -a tasks
                    local task_list
                    task_list=($(_fscr_get_tasks))

                    # Format tasks with descriptions
                    for task in $task_list; do
                        tasks+=("$task:Run task $task")
                    done

                    _describe -t tasks 'available tasks' tasks
                    ;;
                run-s|run-p)
                    local -a tasks
                    local task_list
                    task_list=($(_fscr_get_tasks))

                    for task in $task_list; do
                        tasks+=("$task:Run task $task")
                    done

                    _describe -t tasks 'available tasks' tasks
                    ;;
                completion)
                    case $words[2] in
                        install|uninstall)
                            _describe -t shells 'available shells' shells
                            ;;
                        *)
                            _describe -t completion_cmds 'completion commands' completion_cmds
                            ;;
                    esac
                    ;;
                *)
                    _arguments \
                        '--help[Show help]' \
                        '--version[Show version]'
                    ;;
            esac
            ;;
    esac

    return 0
}

# Register completion for both fsr and fsr
compdef _fscr fsr
compdef _fscr fsr

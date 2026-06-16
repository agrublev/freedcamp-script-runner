#!/bin/bash
# FSCR Bash completion script

_fscr_get_tasks() {
    # Try to get tasks from fscripts.md
    if command -v node >/dev/null 2>&1; then
        local tasks_output
        tasks_output=$(node -e "
            import('$FSCR_COMPLETION_HELPER').then(async (m) => {
                const tasks = await m.generateTaskNames();
                console.log(tasks.join(' '));
            }).catch(() => {});
        " 2>/dev/null)

        if [ -n "$tasks_output" ]; then
            echo "$tasks_output"
            return
        fi
    fi

    # Fallback: parse fscripts.md directly
    if [ -f "fscripts.md" ]; then
        grep -E "^## " fscripts.md | sed 's/^## //' | tr '\n' ' '
    fi
}

_fscr_completion() {
    local cur prev words cword
    _init_completion || return

    # Main commands
    local commands="start run list scripts run-s run-p bump upgrade branch remote encryption clear generate toc completion"

    # Completion subcommands
    local completion_cmds="install uninstall status generate"

    # Get current word and previous word
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Get the main command (first argument after fsr)
    local cmd=""
    if [ ${COMP_CWORD} -gt 0 ]; then
        cmd="${COMP_WORDS[1]}"
    fi

    case "${prev}" in
        fsr|fsr)
            # Complete main commands
            COMPREPLY=($(compgen -W "${commands}" -- "${cur}"))
            return 0
            ;;
        run|run-s|run-p)
            # Complete task names
            local tasks=$(_fscr_get_tasks)
            COMPREPLY=($(compgen -W "${tasks}" -- "${cur}"))
            return 0
            ;;
        completion)
            # Complete completion subcommands
            COMPREPLY=($(compgen -W "${completion_cmds}" -- "${cur}"))
            return 0
            ;;
        install|uninstall)
            # Complete shell names
            if [ "${cmd}" = "completion" ]; then
                COMPREPLY=($(compgen -W "bash zsh fish powershell" -- "${cur}"))
                return 0
            fi
            ;;
        --shell)
            # Complete shell names for --shell flag
            COMPREPLY=($(compgen -W "bash zsh fish powershell" -- "${cur}"))
            return 0
            ;;
    esac

    # Handle flags
    case "${cur}" in
        -*)
            case "${cmd}" in
                completion)
                    COMPREPLY=($(compgen -W "--shell --force --help" -- "${cur}"))
                    ;;
                run)
                    COMPREPLY=($(compgen -W "--help" -- "${cur}"))
                    ;;
                *)
                    COMPREPLY=($(compgen -W "--help" -- "${cur}"))
                    ;;
            esac
            return 0
            ;;
    esac

    # Continue completing task names for run-s and run-p
    if [ "${cmd}" = "run-s" ] || [ "${cmd}" = "run-p" ]; then
        local tasks=$(_fscr_get_tasks)
        COMPREPLY=($(compgen -W "${tasks}" -- "${cur}"))
        return 0
    fi

    return 0
}

# Register completion for both fsr and fsr
complete -F _fscr_completion fsr
complete -F _fscr_completion fsr

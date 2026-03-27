/**
 * FSCR v7.0.0 - Completion Command
 * Generate shell completion scripts
 */

import type { Command, CommandContext, CommandResult } from '../types';
import chalk from 'chalk';

export const completionCommand: Command = {
  name: 'completion',
  description: 'Generate shell completion scripts',
  category: 'utility',

  arguments: [
    {
      name: 'shell',
      description: 'Shell type (bash, zsh, fish, powershell)',
      required: false,
      type: 'string'
    }
  ],

  options: [
    {
      name: 'install',
      alias: 'i',
      description: 'Install completion script automatically',
      type: 'boolean',
      default: false
    }
  ],

  examples: [
    'fsr completion bash',
    'fsr completion zsh --install',
    'fsr completion fish',
    'fsr completion powershell'
  ],

  async handler(context: CommandContext): Promise<CommandResult> {
    const { args, options } = context;
    const shell = args.shell as string | undefined;
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');

    // Detect shell if not specified
    let targetShell = shell;
    if (!targetShell) {
      const shellEnv = process.env.SHELL || '';
      if (shellEnv.includes('bash')) targetShell = 'bash';
      else if (shellEnv.includes('zsh')) targetShell = 'zsh';
      else if (shellEnv.includes('fish')) targetShell = 'fish';
      else {
        console.log(chalk.yellow('Could not detect shell. Please specify: bash, zsh, fish, or powershell'));
        return {
          success: false,
          message: 'Shell not detected',
          exitCode: 1
        };
      }
    }

    const completionScripts: Record<string, string> = {
      bash: `
# FSCR completion script for Bash
_fsr_completions() {
    local cur prev commands
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    commands="run list scripts run-s run-p generate toc clear doctor completion profile plugin"

    if [ $COMP_CWORD -eq 1 ]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    elif [ "$prev" = "run" ] || [ "$prev" = "run-s" ] || [ "$prev" = "run-p" ]; then
        # Complete task names from fscripts.md
        if [ -f "fscripts.md" ]; then
            local tasks=$(grep -E "^##+ " fscripts.md | sed 's/^##* //' | tr '\n' ' ')
            COMPREPLY=( $(compgen -W "$tasks" -- "$cur") )
        fi
    fi
    return 0
}

complete -F _fsr_completions fsr
complete -F _fsr_completions fscr
`,

      zsh: `
#compdef fsr fscr

# FSCR completion script for Zsh
_fsr() {
    local -a commands tasks
    commands=(
        'run:Run a specific task'
        'list:List all available tasks'
        'scripts:Choose script from package.json'
        'run-s:Run tasks sequentially'
        'run-p:Run tasks in parallel'
        'generate:Generate sample fscripts.md'
        'toc:Generate table of contents'
        'clear:Clear task history'
        'doctor:Run diagnostics'
        'completion:Generate completions'
        'profile:Manage profiles'
        'plugin:Manage plugins'
    )

    if (( CURRENT == 2 )); then
        _describe 'command' commands
    elif (( CURRENT == 3 )); then
        case "$words[2]" in
            run|run-s|run-p)
                if [[ -f "fscripts.md" ]]; then
                    tasks=(${(f)"$(grep -E '^##+ ' fscripts.md | sed 's/^##* //')"})
                    _describe 'task' tasks
                fi
                ;;
        esac
    fi
}

_fsr
`,

      fish: `
# FSCR completion script for Fish
complete -c fsr -f
complete -c fscr -f

# Commands
complete -c fsr -n "__fish_use_subcommand" -a "run" -d "Run a specific task"
complete -c fsr -n "__fish_use_subcommand" -a "list" -d "List all available tasks"
complete -c fsr -n "__fish_use_subcommand" -a "scripts" -d "Choose script from package.json"
complete -c fsr -n "__fish_use_subcommand" -a "run-s" -d "Run tasks sequentially"
complete -c fsr -n "__fish_use_subcommand" -a "run-p" -d "Run tasks in parallel"
complete -c fsr -n "__fish_use_subcommand" -a "generate" -d "Generate sample fscripts.md"
complete -c fsr -n "__fish_use_subcommand" -a "toc" -d "Generate table of contents"
complete -c fsr -n "__fish_use_subcommand" -a "clear" -d "Clear task history"
complete -c fsr -n "__fish_use_subcommand" -a "doctor" -d "Run diagnostics"
complete -c fsr -n "__fish_use_subcommand" -a "completion" -d "Generate completions"
complete -c fsr -n "__fish_use_subcommand" -a "profile" -d "Manage profiles"
complete -c fsr -n "__fish_use_subcommand" -a "plugin" -d "Manage plugins"

# Task name completion for run commands
complete -c fsr -n "__fish_seen_subcommand_from run run-s run-p" -a "(test -f fscripts.md; and grep -E '^##+ ' fscripts.md | sed 's/^##* //')"
`,

      powershell: `
# FSCR completion script for PowerShell
Register-ArgumentCompleter -Native -CommandName fsr,fscr -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @(
        'run', 'list', 'scripts', 'run-s', 'run-p',
        'generate', 'toc', 'clear', 'doctor',
        'completion', 'profile', 'plugin'
    )

    if ($commandAst.CommandElements.Count -eq 2) {
        $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    }
    elseif ($commandAst.CommandElements[1] -in @('run', 'run-s', 'run-p') -and (Test-Path 'fscripts.md')) {
        $tasks = (Get-Content 'fscripts.md' | Select-String -Pattern '^##+ ' | ForEach-Object {
            $_ -replace '^##+ ', ''
        })
        $tasks | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    }
}
`
    };

    const script = completionScripts[targetShell];
    if (!script) {
      return {
        success: false,
        message: `Unsupported shell: ${targetShell}`,
        exitCode: 1
      };
    }

    if (options.install) {
      // Install completion script
      let installPath: string;
      const homeDir = os.homedir();

      try {
        switch (targetShell) {
          case 'bash':
            installPath = path.join(homeDir, '.bash_completion');
            await fs.appendFile(installPath, '\n' + script);
            console.log(chalk.green(`✓ Installed to ${installPath}`));
            console.log(chalk.gray('  Run: source ~/.bash_completion'));
            break;

          case 'zsh':
            const zshDir = path.join(homeDir, '.zsh', 'completion');
            await fs.ensureDir(zshDir);
            installPath = path.join(zshDir, '_fsr');
            await fs.writeFile(installPath, script);
            console.log(chalk.green(`✓ Installed to ${installPath}`));
            console.log(chalk.gray('  Add to ~/.zshrc: fpath=(~/.zsh/completion $fpath)'));
            console.log(chalk.gray('  Then run: autoload -U compinit && compinit'));
            break;

          case 'fish':
            const fishDir = path.join(homeDir, '.config', 'fish', 'completions');
            await fs.ensureDir(fishDir);
            installPath = path.join(fishDir, 'fsr.fish');
            await fs.writeFile(installPath, script);
            console.log(chalk.green(`✓ Installed to ${installPath}`));
            console.log(chalk.gray('  Fish will load automatically'));
            break;

          case 'powershell':
            const psProfile = process.env.PROFILE || path.join(homeDir, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
            await fs.ensureDir(path.dirname(psProfile));
            await fs.appendFile(psProfile, '\n' + script);
            console.log(chalk.green(`✓ Installed to ${psProfile}`));
            console.log(chalk.gray('  Reload PowerShell to use'));
            break;
        }

        return {
          success: true,
          message: `Completion installed for ${targetShell}`,
          exitCode: 0
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to install completion: ${(error as Error).message}`,
          error: error as Error,
          exitCode: 1
        };
      }
    }

    // Just print the script
    console.log(script);

    return {
      success: true,
      message: `Generated completion script for ${targetShell}`,
      data: { shell: targetShell, script },
      exitCode: 0
    };
  }
};

export default completionCommand;

# FSCR PowerShell completion script

# Function to get available tasks
function Get-FscrTasks {
    try {
        # Try to get tasks from fscripts.md using node
        if (Get-Command node -ErrorAction SilentlyContinue) {
            $tasksOutput = node -e @"
                import('$env:FSCR_COMPLETION_HELPER').then(async (m) => {
                    const tasks = await m.generateTaskNames();
                    console.log(tasks.join('\n'));
                }).catch(() => {});
"@ 2>$null

            if ($tasksOutput) {
                return $tasksOutput -split '\n' | Where-Object { $_ }
            }
        }

        # Fallback: parse fscripts.md directly
        if (Test-Path "fscripts.md") {
            Get-Content "fscripts.md" | Where-Object { $_ -match '^## ' } | ForEach-Object {
                $_ -replace '^## ', ''
            }
        }
    }
    catch {
        return @()
    }
}

# Main completion function
$scriptBlock = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commands = @(
        [PSCustomObject]@{Name='start'; Description='Choose category then task to run'}
        [PSCustomObject]@{Name='run'; Description='Run a specific task'}
        [PSCustomObject]@{Name='list'; Description='Select any task with text autocompletion'}
        [PSCustomObject]@{Name='scripts'; Description='Choose a script from package.json'}
        [PSCustomObject]@{Name='run-s'; Description='Run tasks in sequence'}
        [PSCustomObject]@{Name='run-p'; Description='Run tasks in parallel'}
        [PSCustomObject]@{Name='bump'; Description='Bump package.json version'}
        [PSCustomObject]@{Name='upgrade'; Description='Upgrade packages'}
        [PSCustomObject]@{Name='branch'; Description='Create new branch'}
        [PSCustomObject]@{Name='remote'; Description='Get remote configuration'}
        [PSCustomObject]@{Name='encryption'; Description='Encrypt/Decrypt files'}
        [PSCustomObject]@{Name='clear'; Description='Clear recent task history'}
        [PSCustomObject]@{Name='generate'; Description='Generate sample fscripts.md'}
        [PSCustomObject]@{Name='toc'; Description='Generate table of contents'}
        [PSCustomObject]@{Name='completion'; Description='Manage shell completions'}
    )

    $completionSubcommands = @(
        [PSCustomObject]@{Name='install'; Description='Install completions'}
        [PSCustomObject]@{Name='uninstall'; Description='Uninstall completions'}
        [PSCustomObject]@{Name='status'; Description='Show completion status'}
        [PSCustomObject]@{Name='generate'; Description='Generate completion script'}
    )

    $shells = @(
        [PSCustomObject]@{Name='bash'; Description='Bash shell'}
        [PSCustomObject]@{Name='zsh'; Description='Zsh shell'}
        [PSCustomObject]@{Name='fish'; Description='Fish shell'}
        [PSCustomObject]@{Name='powershell'; Description='PowerShell'}
    )

    # Parse the command line
    $tokens = $commandAst.ToString() -split '\s+'
    $commandCount = $tokens.Count

    # If we're completing the first argument (command)
    if ($commandCount -eq 1 -or ($commandCount -eq 2 -and $wordToComplete)) {
        $commands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new(
                $_.Name,
                $_.Name,
                'ParameterValue',
                $_.Description
            )
        }
        return
    }

    # Get the main command
    $mainCommand = $tokens[1]

    # Handle completion based on the command
    switch ($mainCommand) {
        'run' {
            # Complete task names
            $tasks = Get-FscrTasks
            $tasks | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new(
                    $_,
                    $_,
                    'ParameterValue',
                    "Run task: $_"
                )
            }
        }
        'run-s' {
            # Complete task names
            $tasks = Get-FscrTasks
            $tasks | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new(
                    $_,
                    $_,
                    'ParameterValue',
                    "Run task: $_"
                )
            }
        }
        'run-p' {
            # Complete task names
            $tasks = Get-FscrTasks
            $tasks | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                [System.Management.Automation.CompletionResult]::new(
                    $_,
                    $_,
                    'ParameterValue',
                    "Run task: $_"
                )
            }
        }
        'completion' {
            # If we're completing after 'completion'
            if ($commandCount -eq 2 -or ($commandCount -eq 3 -and $wordToComplete)) {
                $completionSubcommands | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
                    [System.Management.Automation.CompletionResult]::new(
                        $_.Name,
                        $_.Name,
                        'ParameterValue',
                        $_.Description
                    )
                }
            }
            # If we're completing after 'completion install/uninstall'
            elseif ($tokens.Count -ge 3 -and ($tokens[2] -eq 'install' -or $tokens[2] -eq 'uninstall')) {
                $shells | Where-Object { $_.Name -like "$wordToComplete*" } | ForEach-Object {
                    [System.Management.Automation.CompletionResult]::new(
                        $_.Name,
                        $_.Name,
                        'ParameterValue',
                        $_.Description
                    )
                }
            }
        }
        default {
            # Complete flags
            if ($wordToComplete -like '-*') {
                @('--help', '--version', '--shell', '--force') | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
                    [System.Management.Automation.CompletionResult]::new(
                        $_,
                        $_,
                        'ParameterName',
                        "Option: $_"
                    )
                }
            }
        }
    }
}

# Register completion for fscr and fsr
Register-ArgumentCompleter -CommandName fscr -ScriptBlock $scriptBlock
Register-ArgumentCompleter -CommandName fsr -ScriptBlock $scriptBlock

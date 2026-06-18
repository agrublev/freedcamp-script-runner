import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { execSync } from "child_process";
import inquirer from "inquirer";
import fsrLog from "../utils/console.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detect the user's current shell
 */
export function detectShell() {
    // Check SHELL environment variable
    const shellEnv = process.env.SHELL;
    if (shellEnv) {
        const shellName = path.basename(shellEnv);
        if (["bash", "zsh", "fish"].includes(shellName)) {
            return shellName;
        }
    }

    // Check for PowerShell on Windows
    if (process.platform === "win32") {
        return "powershell";
    }

    // Default to bash if unable to detect
    return "bash";
}

/**
 * Get shell configuration file path
 */
export function getShellConfigPath(shell) {
    const homeDir = os.homedir();

    const configPaths = {
        bash: path.join(homeDir, ".bashrc"),
        zsh: path.join(homeDir, ".zshrc"),
        fish: path.join(homeDir, ".config", "fish", "config.fish"),
        powershell: path.join(
            homeDir,
            "Documents",
            "WindowsPowerShell",
            "Microsoft.PowerShell_profile.ps1"
        )
    };

    return configPaths[shell] || configPaths.bash;
}

/**
 * Get the completion script path for a shell
 */
export function getCompletionScriptPath(shell) {
    const scriptsDir = path.join(__dirname, "scripts");
    const scriptFiles = {
        bash: path.join(scriptsDir, "bash.sh"),
        zsh: path.join(scriptsDir, "zsh.sh"),
        fish: path.join(scriptsDir, "fish.sh"),
        powershell: path.join(scriptsDir, "powershell.ps1")
    };

    return scriptFiles[shell];
}

/**
 * Install completion script for a specific shell
 */
export async function installCompletion(shell, options = {}) {
    const { force = false, silent = false } = options;

    try {
        const configPath = getShellConfigPath(shell);
        const scriptPath = getCompletionScriptPath(shell);

        // Check if script exists
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Completion script not found for ${shell}`);
        }

        // Read the completion script
        const completionScript = fs.readFileSync(scriptPath, "utf8");

        // For fish, create completions directory
        if (shell === "fish") {
            const fishCompDir = path.join(os.homedir(), ".config", "fish", "completions");
            await fs.ensureDir(fishCompDir);

            const fishCompPath = path.join(fishCompDir, "fsr.fish");
            await fs.writeFile(fishCompPath, completionScript);

            if (!silent) {
                fsrLog.log(chalk.green("✅ Installed Fish completions to"), fishCompPath);
            }
            return fishCompPath;
        }

        // For other shells, append to config file
        await fs.ensureFile(configPath);
        const currentConfig = await fs.readFile(configPath, "utf8");

        // Check if already installed
        const marker = "# FSCR completion";
        if (currentConfig.includes(marker) && !force) {
            if (!silent) {
                fsrLog.log(chalk.yellow("⚠️  Completions already installed"));
                fsrLog.log(chalk.dim(`   Use --force to reinstall`));
            }
            return configPath;
        }

        // Prepare completion block
        const completionBlock = `
${marker}
${completionScript}
# End FSCR completion
`;

        // Append or replace completion block
        let newConfig;
        if (currentConfig.includes(marker)) {
            // Replace existing block
            newConfig = currentConfig.replace(
                /# FSCR completion[\s\S]*?# End FSCR completion\n?/,
                completionBlock
            );
        } else {
            // Append new block
            newConfig = currentConfig + "\n" + completionBlock;
        }

        await fs.writeFile(configPath, newConfig);

        if (!silent) {
            fsrLog.log(chalk.green("✅ Installed completions to"), configPath);
        }

        return configPath;
    } catch (error) {
        throw new Error(`Failed to install ${shell} completions: ${error.message}`);
    }
}

/**
 * Uninstall completion script
 */
export async function uninstallCompletion(shell, options = {}) {
    const { silent = false } = options;

    try {
        const configPath = getShellConfigPath(shell);

        if (shell === "fish") {
            const fishCompPath = path.join(
                os.homedir(),
                ".config",
                "fish",
                "completions",
                "fsr.fish"
            );

            if (fs.existsSync(fishCompPath)) {
                await fs.remove(fishCompPath);
                if (!silent) {
                    fsrLog.log(chalk.green("✅ Removed Fish completions"));
                }
            } else {
                if (!silent) {
                    fsrLog.log(chalk.yellow("⚠️  No Fish completions found"));
                }
            }
            return;
        }

        // For other shells, remove from config file
        if (!fs.existsSync(configPath)) {
            if (!silent) {
                fsrLog.log(chalk.yellow(`⚠️  Config file not found: ${configPath}`));
            }
            return;
        }

        const currentConfig = await fs.readFile(configPath, "utf8");
        const marker = "# FSCR completion";

        if (!currentConfig.includes(marker)) {
            if (!silent) {
                fsrLog.log(chalk.yellow("⚠️  No completions found to uninstall"));
            }
            return;
        }

        // Remove completion block
        const newConfig = currentConfig.replace(
            /# FSCR completion[\s\S]*?# End FSCR completion\n?/,
            ""
        );

        await fs.writeFile(configPath, newConfig);

        if (!silent) {
            fsrLog.log(chalk.green("✅ Removed completions from"), configPath);
        }
    } catch (error) {
        throw new Error(`Failed to uninstall ${shell} completions: ${error.message}`);
    }
}

/**
 * Show completion status for all shells
 */
export async function completionStatus() {
    const shells = ["bash", "zsh", "fish", "powershell"];
    const currentShell = detectShell();

    fsrLog.log(chalk.bold("\n📋 Completion Status\n"));

    for (const shell of shells) {
        const isCurrent = shell === currentShell;
        const marker = isCurrent ? chalk.green("●") : chalk.dim("○");

        try {
            const configPath = getShellConfigPath(shell);
            let installed = false;

            if (shell === "fish") {
                const fishCompPath = path.join(
                    os.homedir(),
                    ".config",
                    "fish",
                    "completions",
                    "fsr.fish"
                );
                installed = fs.existsSync(fishCompPath);
            } else {
                if (fs.existsSync(configPath)) {
                    const config = await fs.readFile(configPath, "utf8");
                    installed = config.includes("# FSCR completion");
                }
            }

            const status = installed ? chalk.green("✅ Installed") : chalk.dim("Not installed");
            const current = isCurrent ? chalk.yellow(" (current)") : "";

            fsrLog.log(`${marker} ${chalk.bold(shell.padEnd(12))} ${status}${current}`);
        } catch (error) {
            fsrLog.log(`${marker} ${chalk.bold(shell.padEnd(12))} ${chalk.red("Error")}`);
        }
    }

    fsrLog.log();
}

/**
 * Main completion command handler
 */
export default async function completion(argv) {
    // Get the action from positional argument or from argv._[1]
    const command = argv.action || argv._[1];
    const shell = argv.shell || detectShell();

    try {
        switch (command) {
            case "install":
                await installCompletion(shell, { force: argv.force });
                fsrLog.log();
                fsrLog.log(chalk.cyan("🎉 Completions installed successfully!"));
                fsrLog.log();
                fsrLog.log(chalk.dim("To activate completions, restart your shell or run:"));
                fsrLog.log(
                    chalk.yellow(
                        shell === "fish"
                            ? "  exec fish"
                            : shell === "powershell"
                              ? "  . $PROFILE"
                              : `  source ${getShellConfigPath(shell)}`
                    )
                );
                fsrLog.log();
                break;

            case "uninstall":
                await uninstallCompletion(shell);
                fsrLog.log();
                fsrLog.log(chalk.cyan("✅ Completions uninstalled successfully!"));
                fsrLog.log();
                break;

            case "status":
                await completionStatus();
                break;

            case "generate":
                // Generate completion script without installing
                const scriptPath = getCompletionScriptPath(shell);
                if (!fs.existsSync(scriptPath)) {
                    throw new Error(`Completion script not found for ${shell}`);
                }
                const script = fs.readFileSync(scriptPath, "utf8");
                fsrLog.log(script);
                break;

            default:
                // Interactive installation
                const { confirmInstall } = await inquirer.prompt([
                    {
                        type: "confirm",
                        name: "confirmInstall",
                        message: `Install completions for ${chalk.cyan(shell)}?`,
                        default: true
                    }
                ]);

                if (confirmInstall) {
                    await installCompletion(shell, { force: argv.force });
                    fsrLog.log();
                    fsrLog.log(chalk.cyan("🎉 Completions installed successfully!"));
                    fsrLog.log();
                    fsrLog.log(chalk.dim("To activate completions, restart your shell or run:"));
                    fsrLog.log(
                        chalk.yellow(
                            shell === "fish"
                                ? "  exec fish"
                                : shell === "powershell"
                                  ? "  . $PROFILE"
                                  : `  source ${getShellConfigPath(shell)}`
                        )
                    );
                    fsrLog.log();
                } else {
                    fsrLog.log(chalk.yellow("Installation cancelled"));
                }
        }
    } catch (error) {
        fsrLog.error(chalk.red("Error:"), error.message);
        process.exit(1);
    }
}

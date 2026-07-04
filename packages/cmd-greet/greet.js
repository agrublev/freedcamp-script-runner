import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { detectShell, getShellConfigPath } from "@fsr/cmd-completion/completion.js";
import fsrLog from "@fsr/core/utils/console.js";
import inquirer from "inquirer";

const MARKER_START = "# FSCR greet";
const MARKER_END = "# End FSCR greet";

/**
 * The zsh snippet injected into .zshrc.
 * On every directory change (chpwd) AND on shell startup, it checks if
 * fscripts.md exists in the current directory and prints a greeting.
 */
const ZSH_SNIPPET = `
_fscr_greet() {
  if [[ -f "fscripts.md" ]]; then
    echo ""
    echo "\\033[1;32m👋  fscripts.md found!\\033[0m  Run \\033[1;36myarn fsr\\033[0m to launch the script runner."
    echo ""
  fi
}
chpwd_functions+=(_fscr_greet)
_fscr_greet
`;

const BASH_SNIPPET = `
_fscr_greet() {
  if [[ -f "fscripts.md" ]]; then
    echo ""
    echo -e "\\033[1;32m👋  fscripts.md found!\\033[0m  Run \\033[1;36myarn fsr\\033[0m to launch the script runner."
    echo ""
  fi
}
export PROMPT_COMMAND="_fscr_greet\${PROMPT_COMMAND:+;\$PROMPT_COMMAND}"
_fscr_greet
`;

function getSnippet(shell) {
    if (shell === "zsh") return ZSH_SNIPPET;
    if (shell === "bash") return BASH_SNIPPET;
    return null;
}

export async function installGreet(shell, options = {}) {
    const { force = false, silent = false } = options;

    const snippet = getSnippet(shell);
    if (!snippet) {
        throw new Error(`Shell greeting not supported for: ${shell}`);
    }

    const configPath = getShellConfigPath(shell);
    await fs.ensureFile(configPath);
    const current = await fs.readFile(configPath, "utf8");

    if (current.includes(MARKER_START) && !force) {
        if (!silent) {
            fsrLog.log(chalk.yellow("⚠️  Greet already installed"));
            fsrLog.log(chalk.dim("   Use --force to reinstall"));
        }
        return configPath;
    }

    const block = `\n${MARKER_START}\n${snippet}\n${MARKER_END}\n`;

    let newConfig;
    if (current.includes(MARKER_START)) {
        newConfig = current.replace(
            new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}\n?`),
            block
        );
    } else {
        newConfig = current + block;
    }

    await fs.writeFile(configPath, newConfig);

    if (!silent) {
        fsrLog.log(chalk.green("✅ Greet installed to"), configPath);
    }
    return configPath;
}

export async function uninstallGreet(shell, options = {}) {
    const { silent = false } = options;

    const configPath = getShellConfigPath(shell);

    if (!fs.existsSync(configPath)) {
        if (!silent) fsrLog.log(chalk.yellow(`⚠️  Config file not found: ${configPath}`));
        return;
    }

    const current = await fs.readFile(configPath, "utf8");

    if (!current.includes(MARKER_START)) {
        if (!silent) fsrLog.log(chalk.yellow("⚠️  Greet not installed"));
        return;
    }

    const newConfig = current.replace(
        new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}\n?`),
        ""
    );
    await fs.writeFile(configPath, newConfig);

    if (!silent) fsrLog.log(chalk.green("✅ Greet removed from"), configPath);
}

export async function greetStatus(shell) {
    const configPath = getShellConfigPath(shell);
    let installed = false;

    if (fs.existsSync(configPath)) {
        const config = await fs.readFile(configPath, "utf8");
        installed = config.includes(MARKER_START);
    }

    return { shell, configPath, installed };
}

export default async function greet(argv) {
    const command = argv.action || argv._[1];
    const shell = argv.shell || detectShell();

    if (!["zsh", "bash"].includes(shell) && command !== "status") {
        fsrLog.error(chalk.red(`Shell greeting only supports bash and zsh (detected: ${shell})`));
        process.exit(1);
    }

    switch (command) {
        case "install": {
            await installGreet(shell, { force: argv.force });
            fsrLog.log();
            fsrLog.log(chalk.cyan("🎉 Greet installed!"));
            fsrLog.log(chalk.dim("Restart your terminal or run:"));
            fsrLog.log(chalk.yellow(`  source ${getShellConfigPath(shell)}`));
            fsrLog.log();
            break;
        }

        case "uninstall": {
            await uninstallGreet(shell);
            fsrLog.log();
            fsrLog.log(chalk.cyan("✅ Greet uninstalled."));
            fsrLog.log();
            break;
        }

        case "status": {
            const { installed, configPath } = await greetStatus(shell);
            fsrLog.log(chalk.bold("\n📋 Greet Status\n"));
            fsrLog.log(
                `  Shell:   ${chalk.cyan(shell)}\n` +
                `  Config:  ${chalk.dim(configPath)}\n` +
                `  Status:  ${installed ? chalk.green("✅ Installed") : chalk.dim("Not installed")}\n`
            );
            break;
        }

        default: {
            const { confirm } = await inquirer.prompt([
                {
                    type: "confirm",
                    name: "confirm",
                    message: `Install fscripts.md greeting for ${chalk.cyan(shell)}?`,
                    default: true
                }
            ]);

            if (confirm) {
                await installGreet(shell, { force: argv.force });
                fsrLog.log();
                fsrLog.log(chalk.cyan("🎉 Greet installed!"));
                fsrLog.log(chalk.dim("Restart your terminal or run:"));
                fsrLog.log(chalk.yellow(`  source ${getShellConfigPath(shell)}`));
                fsrLog.log();
            } else {
                fsrLog.log(chalk.yellow("Installation cancelled."));
            }
        }
    }
}

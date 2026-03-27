/**
 * Integration Example - How to Add Profile Commands to index.js
 *
 * This file shows how to integrate the profile system into your existing index.js.
 * Follow the steps below to add profile support.
 */

// ===========================
// STEP 1: Add imports at the top
// ===========================

import bump from "./lib/release/bump.js";
import chalk from "chalk";
import { generateFScripts, generateToc } from "./lib/generators/index.js";
import parseScriptFile from "./lib/parsers/parseScriptsMd.js";
import upgradePackages from "./lib/upgradePackages.js";
import { runSequence, runParallel, runCLICommand } from "./lib/running/index.js";
import { startPackageScripts, startScripts, clearRecent } from "./lib/startScripts.js";

// NEW: Import profile commands
import {
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  showCurrentProfile,
  setDefaultProfile
} from "./dist/src/commands/profile.js";

// NEW: Import config manager
import { getConfigManager } from "./dist/src/lib/config.js";

const taskName = chalk.rgb(39, 173, 96).bold.underline;
const textDescription = chalk.rgb(159, 161, 181);
import optionList from "./lib/optionList.js";
import validateNotInDev from "./lib/git/validateNotDev.js";
import encrypt from "./lib/encryption/encryption.js";
import { clear } from "./lib/utils/index.js";
import authConfig from "./lib/auth/auth-conf.js";
import { spawn } from "child_process";
import yargs from "yargs";

import "./lib/utils/console.js";

const runCmd = async (app, argsList = []) => {
    let shell;

    shell = spawn(app, argsList, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: { ...process.env, ...{ FORCE_COLOR: true } }
    });
    return new Promise((resolve) => {
        shell.on("close", (code) => {
            resolve();
        });
    });
};

(async () => {
    clear();
    const yargsInstance = yargs(process.argv.slice(2))
        .usage("Usage: $0 <command> [options]")

        /**
         *  fsr
         * branch --
         */
        .command(
            "branch",
            "Create new branch instead of Development",
            (yargs) => {},
            async function () {
                await validateNotInDev();
            }
        )
        .example(`${taskName("$0")}`, `${textDescription("Validates branch and creates new")}`)

        // ... (all your existing commands) ...

        // ===========================
        // STEP 2: Add profile commands
        // ===========================

        /**
         * fsr profile list
         */
        .command(
            "profile list",
            "List all profiles",
            () => {},
            async () => {
                await listProfiles();
            }
        )
        .example(`${taskName("$0 profile list")}`, `${textDescription("Show all available profiles")}`)

        /**
         * fsr profile create <name>
         */
        .command(
            "profile create <name>",
            "Create a new profile",
            (yargs) => {
                return yargs
                    .positional("name", {
                        describe: "Profile name",
                        type: "string"
                    })
                    .option("scripts-file", {
                        alias: "s",
                        describe: "Path to scripts file",
                        type: "string",
                        default: "fscripts.md"
                    })
                    .option("env", {
                        alias: "e",
                        describe: "Environment variables (KEY=value,KEY2=value2)",
                        type: "string"
                    })
                    .option("inherits", {
                        alias: "i",
                        describe: "Inherit from another profile",
                        type: "string"
                    })
                    .option("set-default", {
                        alias: "d",
                        describe: "Set as default profile",
                        type: "boolean",
                        default: false
                    })
                    .option("set-active", {
                        alias: "a",
                        describe: "Set as active profile",
                        type: "boolean",
                        default: false
                    });
            },
            async (argv) => {
                await createProfile(argv.name, {
                    scriptsFile: argv.scriptsFile,
                    env: argv.env,
                    inherits: argv.inherits,
                    setDefault: argv.setDefault,
                    setActive: argv.setActive
                });
            }
        )
        .example(
            `${taskName("$0 profile create production -s fscripts.prod.md")}`,
            `${textDescription("Create production profile")}`
        )

        /**
         * fsr profile switch <name>
         */
        .command(
            "profile switch <name>",
            "Switch to a different profile",
            (yargs) => {
                return yargs.positional("name", {
                    describe: "Profile name",
                    type: "string"
                });
            },
            async (argv) => {
                await switchProfile(argv.name);
            }
        )
        .example(
            `${taskName("$0 profile switch production")}`,
            `${textDescription("Switch to production profile")}`
        )

        /**
         * fsr profile delete <name>
         */
        .command(
            "profile delete <name>",
            "Delete a profile",
            (yargs) => {
                return yargs
                    .positional("name", {
                        describe: "Profile name",
                        type: "string"
                    })
                    .option("force", {
                        alias: "f",
                        describe: "Skip confirmation",
                        type: "boolean",
                        default: false
                    });
            },
            async (argv) => {
                await deleteProfile(argv.name, {
                    force: argv.force
                });
            }
        )
        .example(
            `${taskName("$0 profile delete staging --force")}`,
            `${textDescription("Delete staging profile")}`
        )

        /**
         * fsr profile current
         */
        .command(
            "profile current",
            "Show current active profile",
            () => {},
            async () => {
                await showCurrentProfile();
            }
        )
        .example(
            `${taskName("$0 profile current")}`,
            `${textDescription("Show active profile details")}`
        )

        /**
         * fsr profile default <name>
         */
        .command(
            "profile default <name>",
            "Set default profile",
            (yargs) => {
                return yargs.positional("name", {
                    describe: "Profile name",
                    type: "string"
                });
            },
            async (argv) => {
                await setDefaultProfile(argv.name);
            }
        )
        .example(
            `${taskName("$0 profile default production")}`,
            `${textDescription("Set production as default profile")}`
        )

        // ===========================
        // STEP 3: Keep your existing help
        // ===========================
        .help();

    const argv = yargsInstance.argv;

    if (argv && argv._ && argv._.length === 0) {
        const choice = await optionList();

        if (choice) {
            await runCmd("yarn", ["fsr", choice]);
        } else {
            console.log(chalk.green.bold("See you soon!"));
        }
    }
})();

// ===========================
// STEP 4: Update your task runner (in lib/running/runCLICommand.js or similar)
// ===========================

/**
 * Example modification for runCLICommand to use profile environment:
 *
 * import { getConfigManager } from "../src/lib/config.js";
 *
 * export async function runCLICommand({ task, script }) {
 *   const config = getConfigManager();
 *
 *   // Get profile environment variables
 *   const profileEnv = await config.getProfileEnvironment();
 *
 *   // Merge with script env
 *   const env = {
 *     ...process.env,
 *     ...profileEnv,
 *     ...script.env
 *   };
 *
 *   // Use merged env in spawn
 *   spawn(command, args, { env, stdio: "inherit" });
 * }
 */

// ===========================
// STEP 5: Update your script parser (in lib/parsers/parseScriptsMd.js or similar)
// ===========================

/**
 * Example modification for parseScriptFile to use profile's scripts file:
 *
 * import { getConfigManager } from "../src/lib/config.js";
 *
 * export default async function parseScriptFile() {
 *   const config = getConfigManager();
 *
 *   // Get scripts file path for current profile
 *   const scriptsPath = await config.getScriptsFilePath();
 *
 *   // Parse the file
 *   const content = await readFile(scriptsPath, "utf-8");
 *   // ... rest of parsing logic
 * }
 */

// ===========================
// DONE! Your profile system is integrated.
// ===========================

/**
 * Now you can use:
 *
 * # Create profiles
 * fsr profile create development --set-default --set-active
 * fsr profile create production -s fscripts.prod.md -e "NODE_ENV=production"
 *
 * # Switch between them
 * fsr profile switch production
 *
 * # List all profiles
 * fsr profile list
 *
 * # Show current profile
 * fsr profile current
 *
 * # Delete a profile
 * fsr profile delete staging
 *
 * # Set default
 * fsr profile default production
 */

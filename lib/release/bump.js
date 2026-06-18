import path from "path";
import chalk from "chalk";
import prompt from "../utils/prompt.js";
import fs from "fs";
import { execFileSync } from "child_process";
import fsrLog from "../utils/console.js";

const packagePath = path.resolve(process.cwd(), "package.json");

// Run a command with an explicit argument array (no shell) so user-supplied
// values like the commit description can never be interpreted as shell syntax.
const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });

const bump = async (typeParam = null, skipGit = false) => {
    if (!fs.existsSync(packagePath)) {
        fsrLog.error("Cannot find package.json file in the current directory");
        process.exit(1);
    }

    let type = typeParam;
    if (!type) {
        type = await prompt({
            type: "select",
            message: chalk.green.bold.underline("How big of a bump is this?"),
            choices: ["patch", "minor", "major"]
        });
    }

    let gitTag = false;
    if (!skipGit) {
        gitTag = await prompt({
            type: "confirm",
            message: chalk.green.bold.underline("Add git tag?"),
            default: false
        });
    }

    // fsr always owns git: bump package.json only and never let yarn create its
    // own commit/tag. Manual tagging happens below, and only when requested.
    run("yarn", ["version", `--${type}`, "--no-git-tag-version", "--no-commit-hooks"]);

    const { version } = JSON.parse(fs.readFileSync(packagePath, "utf8"));

    if (gitTag) {
        const description = await prompt({
            type: "input",
            message: chalk.green.bold.underline("Describe what was changed (optional):"),
            default: ""
        });

        let commitMessage = `VERSION ${version}`;
        if (description && description.trim()) {
            commitMessage += `\n\n${description.trim()}`;
        }

        run("git", ["add", "."]);
        run("git", ["commit", "-m", commitMessage]);
        run("git", ["tag", "-a", `v${version}`, "-m", `VERSION ${version}`]);
        run("git", ["push", "origin", "--tags"]);
    }

    fsrLog.log(chalk.green.underline(`\nNew version: ${version}\n`));
};

export default bump;

import path from "path";
import chalk from "chalk";
import prompt from "../utils/prompt.js";
import fs from "fs";
let packagePath = path.resolve(process.cwd(), "package.json");
import { execSync } from "child_process";

const runAsync = async command => {
    return execSync(command);
};

if (!fs.existsSync(packagePath)) {
    console.error("Cannot find package.json file in the current directory");
    process.exit(1);
}

const bump = async (typeParam = null) => {
    let type = "patch";
    if (!typeParam) {
        type = await prompt({
            type: "list",
            message: chalk.green.bold.underline("How big of a bump is this?"),
            choices: ["patch", "minor", "major"]
        });
    } else {
        type = typeParam;
    }
    let gitTag = await prompt({
        type: "confirm",
        message: chalk.green.bold.underline("Add git tag?"),
        default: false
    });
    await runAsync(
        `yarn version --${type} ${gitTag ? "--no-git-tag-version" : ""} --no-commit-hooks`
    );
    const packageJson = await fs.readFileSync(packagePath);
    const { version } = JSON.parse(packageJson);

    if (gitTag) {
        let description = await prompt({
            type: "input",
            message: chalk.green.bold.underline("Describe what was changed (optional):"),
            default: ""
        });

        let commitMessage = `VERSION ${version}`;
        if (description && description.trim()) {
            commitMessage += `\n\n${description.trim()}`;
        }

        await runAsync(`git add .`);
        await runAsync(`git commit -m "${commitMessage}"`);
        await runAsync(`git tag -a v${version} -m "VERSION ${version}"`);
        await runAsync(`git push origin --tags`);
    }
    console.log(chalk.green.underline(`\nNew version: ${version}\n`));
};

export default bump;

const path = require("path");
const chalk = require("chalk");
const prompt = require("../utils/prompt");
const fs = require("fs");
let packagePath = path.resolve(process.cwd(), "package.json");
const { execSync } = require("child_process");

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
    await runAsync(`yarn version --${type} --no-git-tag-version --no-commit-hooks`);
    const packageJson = await fs.readFileSync(packagePath);
    const { version } = JSON.parse(packageJson);
    console.log(chalk.green.underline(`\nNew version: ${version}\n`));
};

module.exports = bump;

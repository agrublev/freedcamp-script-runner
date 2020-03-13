const encrypt = require("./encryption");
(async () => {
    await encrypt.init();
})();
const inquirer = require("inquirer");
const path = require("path");
const spawn = require("cross-spawn");
const argv = require("yargs").argv;

const clipboardy = require("clipboardy");
const chalk = require("chalk");
const cgf = require("changed-git-files");
const projectDir = process.cwd();
const packagePath = path.join(projectDir, "./");


(async () => {
    if (argv.interactive) {
        inquirer
            .prompt({
                type: "list",
                name: "typeInc",
                message: "Type on increment",
                choices: ["patch", "minor", "major", "semver"],
                default: "patch"
            })
            .then(async ({ typeInc }) => {
                // spawn.sync("yarn", ["start", ...process.argv.slice(2)], {
                // 	stdio: "inherit",
                // 	env: Object.assign({}, process.env, {
                // 		PATH: `${path.resolve("node_modules/.bin")}:${process.env.PATH}`
                // 	})
                // });
                let commitMsg = await bump(typeInc);
                await clipboardy.write(commitMsg);
                console.log(
                    chalk.bold.green(`Commit message copied to clipboard:\n`) +
                        chalk.bgWhite.black(`${commitMsg}`)
                );
                const packageVersion = require(path.join(packagePath, "package.json")).version;
                await require("simple-git")()
                    .fetch()
                    .add("./packages/*")
                    .commit(commitMsg)
                    .addTag(packageVersion)
                    .pushTags()
                    .push(["-u", "--set-upstream"]);
            });
    }
    if (argv.package) {
        await runAsync(
            `yarn version --cwd=packages/${argv.package} --no-git-tag-version --patch --no-commit-hooks`
        );
    }
})();


async function message(title) {
    return new Promise(resolve => {
        inquirer
            .prompt({
                type: `text`,
                name: `commitMessage`,
                message: title
            })
            .then(({ commitMessage }) => {
                resolve(commitMessage);
            });
    });
}

async function bump(type = "patch") {
    let defaultCommitMsg = ``;
    return new Promise(resolve => {
        cgf(async function(err, results) {
            let updatedPackages = [];
            results.forEach(path => {
                let segments = path.filename.split("/");
                if (segments[0] === "packages") {
                    if (!updatedPackages.includes(segments[1])) {
                        updatedPackages.push(segments[1]);
                    }
                }
            });
            await runAsync(`yarn version --no-git-tag-version --${type} --no-commit-hooks`);

            for (let index = 0; index < updatedPackages.length; index++) {
                await runAsync(
                    `yarn version --${type} --no-git-tag-version --no-commit-hooks --cwd=packages/${updatedPackages[index]}`
                );
                let packVer = require(path.join(
                    packagePath,
                    "./packages/" + updatedPackages[index] + "/package.json"
                )).version;
                defaultCommitMsg += `  [${updatedPackages[index]}]:${packVer}\n`;
                let whatsNew = `${"Package: " +
                    chalk.cyan(updatedPackages[index])} -- ${chalk.green(
                    "New version: " + packVer
                )}\n${chalk.bold.underline.cyan("What's changed?")}`;
                defaultCommitMsg += `    - ${await message(whatsNew)}\n\n`;
            }
            const packageVersion = require(path.join(packagePath, "package.json")).version;
            defaultCommitMsg =
                `Version:${packageVersion}\n- ${await message("Overall change summary:")}\n\n` +
                defaultCommitMsg;
            resolve(defaultCommitMsg);
        });
    });
}

#!/usr/bin/env node
const program = require("commander");
const { spawn } = require("child-process-promise");
const prompt = require("console-prompt");
const projectVersion = require("project-version");

// This file is used to upload the current branch to the master of the jb test application for mms on resin.io
// It is needed because there is no cross-platform way to capture the output of
// a command a to use it in command b from package.json script

program
    .version(projectVersion, "-v, --version")
    .option(
        "-t --target <target>",
        "Git Target to push to, this can be a full git address or a registered git remote name"
    )
    .option(
        "-b --branch <branch>",
        "Target branch name to push to, defaults to the same name like input branch"
    )
    .option("-e --extra <extra>", "A string value with extra git options which should be used")
    .option("-m --master", "Sets the target branch to master per default")
    .option("-d --dry-run", "Emulates the upload - useful for checking input params")
    .option(
        "-p --production",
        "Sets the production flag which triggers additional checks when uploading"
    )
    .option("-f --force", "Forces git push");

program.on("--help", () => {
    console.log(
        `\n  General Information: 
        Version: ${projectVersion}
        Purpose: Pushes the current branch to an arbitrary branch 
                 in the same or in another repository for deployment.
       `
    );
});

program.parse(process.argv);

if (process.argv.slice(2).length === 0) {
    // Display the help text in red on the console
    program.outputHelp();
    process.exit(0);
}

// Git address like or git remote name
// Format: protocol://user@git-repo.address/path.git OR remote-name (like "origin")
const gitTarget = "origin";
let gitTargetBranch = program.branch;
const targetBranchDefault = program.master ? program.master : false;
const extraOptions = program.extra;
const force = program.force;
const dryRun = program.dryRun;
const isProduction = program.production;

// if (gitTarget === undefined) {
//     console.error("Git target address or remote name is missing");
//     process.exit(1);
// }

function runGitPush(gitParams) {
    if (dryRun) {
        console.log("Dry Run finished");
        process.exit(0);
    }

    const gitPromise = spawn("git", gitParams);
    const { childProcess } = gitPromise;

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);

    return gitPromise;
}

// Git command to get the current branch name: git rev-parse --abbrev-ref HEAD
spawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], { capture: ["stdout", "stderr"] })
    .then(result => {
        const currGitBranch = result.stdout.toString().trim();

        if (!currGitBranch) {
            console.error("Current git branch is undefined!");
            process.exit(2);
        }

        if (gitTargetBranch === undefined) {
            gitTargetBranch = targetBranchDefault ? "Development" : currGitBranch;
        }

        console.log(
            `Push current git branch [${currGitBranch}] to ${gitTargetBranch} of: \n` +
                `${gitTarget}`
        );

        const gitParams = ["push"];

        if (force) {
            gitParams.push("-f");
        }

        if (extraOptions !== undefined) {
            gitParams.push(extraOptions);
        }

        gitParams.push(`${gitTarget}`);
        gitParams.push(`${currGitBranch}:${gitTargetBranch}`);

        console.log(`The exact command is: 
        git ${gitParams.join(" ")}`);

        if (isProduction) {
            return prompt(
                `CAUTION: You are updating a production branch! Proceed? (yes | NO) `
            ).then(value => {
                if (value === "yes" || value === "y") {
                    return runGitPush(gitParams);
                }

                console.log("Update canceled by user");
            });
        }

        return runGitPush(gitParams);
    })
    .catch(error => {
        const err = error.stderr ? error.stderr : error;
        console.error("Execution Errors:", err);
    });

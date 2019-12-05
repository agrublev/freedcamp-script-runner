#!/usr/bin/env node
const { spawn } = require("child-process-promise");
const prompt = require("console-prompt");

// This file is used to upload the current branch to the master of the jb test application for mms on resin.io
// It is needed because there is no cross-platform way to capture the output of
// a command a to use it in command b from package.json script
// Git address like or git remote name
// Format: protocol://user@git-repo.address/path.git OR remote-name (like "origin")
const gitTarget = "origin";
let gitTargetBranch = "Development";
// const targetBranchDefault = program.master ? program.master : false;
// const extraOptions = program.extra;
// const force = program.force;
// const dryRun = program.dryRun;
// const isProduction = program.production;

// if (gitTarget === undefined) {
//     console.error("Git target address or remote name is missing");
//     process.exit(1);
// }

const runGitPush = gitParams => {
    // if (dryRun) {
    //     console.log("Dry Run finished");
    //     process.exit(0);
    // }

    const gitPromise = spawn("git", gitParams);
    const { childProcess } = gitPromise;

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);

    return gitPromise;
};

// Git command to get the current branch name: git rev-parse --abbrev-ref HEAD

const push = () => {
    spawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], { capture: ["stdout", "stderr"] })
        .then(result => {
            const currGitBranch = result.stdout.toString().trim();

            if (!currGitBranch) {
                console.error("Current git branch is undefined!");
                process.exit(2);
            }

            // if (gitTargetBranch === undefined) {
            gitTargetBranch = currGitBranch;
            // }

            console.log(
                `Push current git branch [${currGitBranch}] to ${gitTargetBranch} of: \n` +
                    `${gitTarget}`
            );

            const gitParams = ["push"];

            gitParams.push(`${gitTarget}`);
            gitParams.push(`${currGitBranch}:${gitTargetBranch}`);

            console.log(`The exact command is: 
        git ${gitParams.join(" ")}`);

            // if (isProduction) {
            //     return prompt(
            //         `CAUTION: You are updating a production branch! Proceed? (yes | NO) `
            //     ).then(value => {
            //         if (value === "yes" || value === "y") {
            //             return runGitPush(gitParams);
            //         }
            //
            //         console.log("Update canceled by user");
            //     });
            // }

            return runGitPush(gitParams);
        })
        .catch(error => {
            const err = error.stderr ? error.stderr : error;
            console.error("Execution Errors:", err);
        });
};
module.exports = push;

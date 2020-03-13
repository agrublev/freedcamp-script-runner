const { spawn } = require("child-process-promise");
const prompt = require("console-prompt");

const gitTarget = "origin";
let gitTargetBranch = "Development";

const runGitPush = gitParams => {
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
            return runGitPush(gitParams);
        })
        .catch(error => {
            const err = error.stderr ? error.stderr : error;
            console.error("Execution Errors:", err);
        });
};
module.exports = push;

const writeFile = () => {};

const semanticRelease = require("semantic-release");
const releaseNotes = require("git-release-notes");

const OPTIONS = {
    branch: "master"
};
const RANGE = "1cdcddb72095b68cb64876e7c0a44d22e1152c4f..0a523b48c7d239680fe86d2b268250d5b7efc4d8";
const TEMPLATE = "markdown";

releaseNotes(OPTIONS, RANGE, TEMPLATE)
    .then(async changelog => {
        console.log(`Changelog between ${RANGE}\n\n${changelog}`);
        await writeFile("./release.md", changelog);
    })
    .catch(ex => {
        console.error(ex);
        process.exit(1);
    });

// const { WritableStreamBuffer } = require("stream-buffers");
async function release() {
    try {
        const result = await semanticRelease(
            {
                // Core options
                branch: "master",
                // repositoryUrl: "https://github.com/agrublev/freedcamp-script-runner"
                // Shareable config
                // extends: "my-shareable-config",
                // Plugin options
                // githubUrl: "https://my-ghe.com",
                // githubApiPathPrefix: "/api-prefix"
            },
            {
                // Run semantic-release from `/path/to/git/repo/root` without having to change local process `cwd` with `process.chdir()`
                cwd: process.cwd()
                // Pass the variable `MY_ENV_VAR` to semantic-release without having to modify the local `process.env`
                // env: { ...process.env, MY_ENV_VAR: "MY_ENV_VAR_VALUE" },
                // Store stdout and stderr to use later instead of writing to `process.stdout` and `process.stderr`
                // stdout: stdoutBuffer,
                // stderr: stderrBuffer
            }
        );

        if (result) {
            const { lastRelease, commits, nextRelease, releases } = result;

            console.log(
                `Published ${nextRelease.type} release version ${nextRelease.version} containing ${
                    commits.length
                } commits.`
            );

            if (lastRelease.version) {
                console.log(`The last release was "${lastRelease.version}".`);
            }

            // for (const release of releases) {
            //     console.log(`The release was published with plugin "${pluginName}".`);
            // }
        } else {
            console.log("No release published.");
        }

        // Get stdout and stderr content
        // const logs = stdoutBuffer.getContentsAsString("utf8");
        // const errors = stderrBuffer.getContentsAsString("utf8");
    } catch (err) {
        console.error("The automated release failed with %O", err);
    }
}
release();

async function gitPush() {
    require("simple-git")()
        .add("./*")
        .commit("Version")
        .push(["-u"], () => console.log("done"));
}
gitPush()
const writeFile = () => {};

const semanticRelease = require("semantic-release");
const releaseNotes = require("git-release-notes");
const chalk = require("chalk");
const OPTIONS = {
    branch: "master"
};
const RANGE = "1cdcddb72095b68cb64876e7c0a44d22e1152c4f..0a523b48c7d239680fe86d2b268250d5b7efc4d8";
const TEMPLATE = "markdown";
const simple = require("simple-git");

// releaseNotes(OPTIONS, RANGE, TEMPLATE)
//     .then(async changelog => {
//         console.log(
//             `Changelog between ${RANGE}\n\n${changelog
//                 .split("\n")
//                 .filter(e => e.trim().length !== 0)
//                 .join("\n")}`
//         );
//         await writeFile("./release.md", changelog);
//     })
//     .catch(ex => {
//         console.error(ex);

//         process.exit(1);
//     });

// const { WritableStreamBuffer } = require("stream-buffers");
const release = async () => {
    try {
        require("simple-git")(process.cwd())
            .pull("origin", "Development")
            .tags(["origin", "Development"], (err, tags) =>
                console.log("Latest available tag: %s", JSON.stringify(tags), tags.latest)
            );
        let lat = "0";
        const git = require("simple-git/promise");

        let statusSummary = await git(__dirname).status();
        console.warn("-- Console st", statusSummary);
        require("simple-git")().log((err, log) => {
            lat = log.latest.hash;
            console.warn("-- Console log", log.latest);
        });
        require("simple-git")().log("3.3.5", lat, (err, log) => console.log("AA", log));

        // const result = await semanticRelease(
        //     {},
        //     {
        //         cwd: process.cwd()
        //     }
        // );
        // let msg = "";
        // if (result) {
        //     const { lastRelease, commits, nextRelease, releases } = result;
        //
        //     msg = `Published ${nextRelease.type} release version ${
        //         nextRelease.version
        //     } containing ${commits.length} commits.`;
        //
        //     if (lastRelease.version) {
        //         console.log(`The last release was "${lastRelease.version}".`);
        //     }
        //
        //     // for (const release of releases) {
        //     //     console.log(`The release was published with plugin "${pluginName}".`);
        //     // }
        // } else {
        //     msg = "No release published.";
        // }
        // console.warn(chalk.bold(msg));
        // Get stdout and stderr content
        // const logs = stdoutBuffer.getContentsAsString("utf8");
        // const errors = stderrBuffer.getContentsAsString("utf8");
    } catch (err) {
        console.error("The automated release failed with %O", err);
    }
};

release();
//
// async function gitPush() {
//     require("simple-git")()
//         .add("./*")
//         .commit("Version")
//         .push(["-u"], () => console.log("done"));
// }
// gitPush();

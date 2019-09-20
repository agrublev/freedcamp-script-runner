const { writeFile } = require("../index.js");

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

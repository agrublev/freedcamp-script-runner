import bump from "./bump.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "bump",
    desc: "Bump the version in package.json and beautify it",
    handler: async (argv) => bump(argv.type, argv.skipGit === "true"),
    menu: true
};

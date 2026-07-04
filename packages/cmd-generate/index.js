import generateFScripts from "./generateFScripts.js";
import generateToc from "./generateToc.js";

export { generateFScripts, generateToc };

/** @type {import("@fsr/cli").CommandDefinition[]} */
const commands = [
    {
        cmd: "generate",
        desc: "Generate a sample fscripts.md from package.json",
        handler: async () => generateFScripts(),
        menu: true
    },
    {
        cmd: "toc",
        desc: "Regenerate the Table of Contents in fscripts.md",
        handler: async (argv) => generateToc(argv._[1]),
        menu: true
    }
];
export default commands;

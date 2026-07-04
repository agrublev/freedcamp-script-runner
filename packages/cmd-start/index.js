import { startScripts, startPackageScripts } from "@fsr/core";

/** @type {import("@fsr/cli").CommandDefinition[]} */
const commands = [
    {
        cmd: "start",
        desc: "Choose a category then a task to run interactively",
        handler: async (argv) => startScripts(true, argv.env || null),
        menu: true
    },
    {
        cmd: "scripts",
        desc: "Choose a script from package.json",
        handler: async () => startPackageScripts(),
        menu: true
    },
    {
        cmd: "list",
        desc: "Select any task with text autocompletion",
        handler: async (argv) => startScripts(false, argv.env || null),
        menu: true
    }
];
export default commands;

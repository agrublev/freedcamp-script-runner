import greet from "./greet.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "greet [action]",
    desc: "Install a shell greeting that reminds you to use yarn fsr when fscripts.md is present",
    builder: (y) =>
        y
            .positional("action", {
                describe: "Action to perform",
                type: "string",
                choices: ["install", "uninstall", "status"]
            })
            .option("shell", {
                alias: "s",
                type: "string",
                description: "Target shell (bash or zsh)",
                choices: ["bash", "zsh"]
            })
            .option("force", {
                alias: "f",
                type: "boolean",
                description: "Force reinstall",
                default: false
            }),
    handler: async (argv) => greet(argv),
    examples: [
        ["$0 greet install", "Install the greeting hook for your shell"],
        ["$0 greet uninstall", "Remove the greeting hook"],
        ["$0 greet status", "Check if the greeting hook is installed"]
    ],
    menu: true
};

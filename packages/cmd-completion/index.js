import completion from "./completion.js";

export { default as completion } from "./completion.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "completion [action]",
    desc: "Manage shell tab completions",
    builder: (y) =>
        y
            .positional("action", {
                describe: "Action to perform",
                type: "string",
                choices: ["install", "uninstall", "status", "generate"]
            })
            .option("shell", {
                alias: "s",
                type: "string",
                description: "Target shell",
                choices: ["bash", "zsh", "fish", "powershell"]
            })
            .option("force", {
                alias: "f",
                type: "boolean",
                description: "Force reinstall",
                default: false
            }),
    handler: async (argv) => completion(argv),
    examples: [
        ["$0 completion install", "Install completions for your shell"],
        ["$0 completion status", "Check completion installation status"],
        ["$0 completion --shell zsh", "Install completions for zsh"]
    ],
    menu: true
};

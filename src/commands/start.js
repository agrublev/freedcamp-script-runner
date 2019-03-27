#!/usr/bin/env node
const startRunner = require("../utils/start-runner.js");

const { Command, flags } = require("@oclif/command");

class StartCommand extends Command {
    async run() {
        await startRunner();
    }
}

StartCommand.description = `Start the task picker
...
Picking a task to run!
`;

StartCommand.args = [
    {
        name: "isFirst",
        description: "This is if isFirst was passed or not returns boolean with default false",
        default: false
    },
    { name: "isSecond" }
];

StartCommand.flags = {
    name: flags.string({
        required: false, // make the arg required with `required: true`
        description: "The name", // help description
        // hidden: true, // hide this arg from help
        char: "n", //short --n
        // parse: input => "output", // instead of the user input, return a different value
        default: "flagDef" //, // default value if no arg input
        // options: ["a", "b"]
    }),
    should: flags.boolean({
        required: false, // make the arg required with `required: true`
        description: "Should do it?", // help description
        char: "s",
        default: true, // default value if no arg input
        options: ["", "true", "false"]
    })
};

// StartCommand.examples = ["$ fexa bye --name=test", "$ fexa bye isFirst"];

StartCommand.strict = false;
StartCommand.aliases = ["e"];
module.exports = StartCommand;

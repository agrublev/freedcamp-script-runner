const { Command, flags } = require("@oclif/command");
const notifier = require("node-notifier");
// const updateNotifier = require("update-notifier");
// const pkg = require("../../package.json");
// // Checks for available update and returns an instance
// const notifierz = updateNotifier({ pkg });
//
// // Notify using the built-in convenience method
// notifierz.notify();

class ExampleCommand extends Command {
    async run() {
        notifier.notify({
            title: "My notification",
            message: "Hello!"
        });

        const { args, flags } = this.parse(ExampleCommand);
        const name = flags.name;
        const isFirst = args.isFirst;
        this.log(`Flag name: ${name} Arg isFirst: ${isFirst}, should? ${flags.should}`);
    }
}

ExampleCommand.description = `Example command yall
...
Example extra
`;

ExampleCommand.args = [
    {
        name: "isFirst",
        description: "This is if isFirst was passed or not returns boolean with default false",
        default: false
    },
    { name: "isSecond" }
];

ExampleCommand.flags = {
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

// ExampleCommand.examples = ["$ fexa bye --name=test", "$ fexa bye isFirst"];

ExampleCommand.strict = false;
ExampleCommand.aliases = ["e"];
module.exports = ExampleCommand;

const { Command, flags } = require("@oclif/command");
const gen = require("../utils/generateScriptsFileFromPackage.js");
const configManager = require("../utils/config-manager.js");

class AutoCommand extends Command {
    async run() {
        // await configManager.init();
        // configManager.clear();
        const { flags } = this.parse(AutoCommand);
        const name = flags.name || "world";
        await gen.init();
    }
}

AutoCommand.description = `Describe the command here
...
Extra documentation goes here
`;

AutoCommand.flags = {
    name: flags.string({ char: "n", description: "name to print" })
};

module.exports = AutoCommand;

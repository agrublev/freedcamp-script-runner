const { Command, flags } = require("@oclif/command");
const fDeps = require("../utils/dependencyWeight.js");

class DepsCommand extends Command {
    async run() {
        const { flags } = this.parse(DepsCommand);
        const redo = flags.redo || false;
        await fDeps.init(redo, !redo);
    }
}

DepsCommand.description = `Describe the command here
...
Extra documentation goes here
`;

DepsCommand.flags = {
    redo: flags.boolean({ char: "r", description: "Recalculate all sizes again" })
};

module.exports = DepsCommand;

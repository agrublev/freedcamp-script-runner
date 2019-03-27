const { Command, flags } = require("@oclif/command");
const cr = require("../utils/encryption.js");
const { boxInform } = require("../utils/index.js");
class ConfigCommand extends Command {
    async run() {
        const { flags } = this.parse(ConfigCommand);
        const direction = flags.direction || false;
        // prettier-ignore
        let isEncrypting = direction && (direction === "encrypt");
        boxInform(isEncrypting ? "Encrypting files with key" : "Decrypting files", "-----");
        await cr.init(isEncrypting);
    }
}

ConfigCommand.description = `Encrypt or decrypt your secret files
...
You need to list the files in your package.json under fscripts.encryptedFiles
"fscripts": {
    "encryptedFiles": [
        "config.json"
    ]
},
`;


ConfigCommand.flags = {
    direction: flags.string({ char: "d", description: "direction {encrypt|decrypt}" })
};
ConfigCommand.examples = ["$ config --direction decrypt", "$ config -d encrypt"];

// ConfigCommand.strict = false;
// ConfigCommand.aliases = ["e"];

module.exports = ConfigCommand;

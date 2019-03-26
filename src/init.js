const configManager = require("./utils/config-manager.js");
const updateConfig = require("./config/configFromScriptsFile.js");

module.exports = async function(options) {
    process.stdout.write("\x1b[2J");
    process.stdout.write("\x1b[0f");

    await configManager.init();
    // console.log(`Example Init hook running before ${options.id}`);

    // configManager.clear();
    await updateConfig(configManager);
    // If .fsr folder does not exist
    // OR FcScripts.md has changed and uncommitted
    // THEN generate all scripts and update the config scripts list
};
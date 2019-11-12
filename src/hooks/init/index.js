const configManager = require("../../utils/config-manager.js");
const updateConfig = require("../../utils/configFromScriptsFile.js");
const superb = require("superb");
const chalk = require("chalk");

module.exports = async function(options) {
    process.stdout.write("\x1b[2J");
    process.stdout.write("\x1b[0f");
    console.log(`${chalk.bold.green("Hey mister " + superb.random())}!!\n`);
    await configManager.init();
    // console.log(`Example Init hook running before ${options.id}`);

    // configManager.clear();
    await updateConfig();
    // If .fsr folder does not exist
    // OR .fscripts.md has changed and uncommitted
    // THEN generate all scripts and update the config scripts list
};

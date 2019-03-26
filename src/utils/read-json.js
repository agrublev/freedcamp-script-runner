const fs = require("fs-extra");
const chalk = require("chalk");

/**
 * Read json file
 * @param f - file name with directory
 * @return {Promise<void>}
 * @example
const file = "/tmp/this/path/does/not/exist/file.json";
outputJson(file);
 */
async function readJson(f) {
    try {
        const packageObj = await fs.readJson(f);
        console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} read!`);
        return packageObj;
    } catch (err) {
        console.error(err);
        return false;
    }
}

module.exports = readJson;

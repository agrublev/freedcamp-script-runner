const fs = require("fs-extra");
const chalk = require("chalk");

/**
 * Output json file
 * @param f - file name with directory
 * @return {Promise<void>}
 * @example
const file = "/tmp/this/path/does/not/exist/file.json";
outputJson(file);
 */
async function writeJson(f, json = {}) {
    try {
        await fs.writeJson(f, json);
        console.log("success!");
        console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} written!`);
    } catch (err) {
        console.error(err);
    }
    // try {
    //     await fs.outputJson(f, json);
    //
    //     const data = await fs.readJson(f);
    //
    //     console.log("Data written to file: ", f);
    //     console.log("Data written: ", json, data);
    // } catch (err) {
    //     console.error(err);
    // }
}

module.exports = writeJson;

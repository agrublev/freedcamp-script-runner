const fs = require("fs-extra");
const chalk = require("chalk");

/**
 * Output json file
 * @param f - file name with directory
 * @return {boolean}
 * @example
const file = "/tmp/this/path/does/not/exist/file.json";
removeFile(file);
 */
async function removeFile(f) {
    try {
        console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} removed!`);
        return await fs.remove(f);
    } catch (err) {
        console.error(`File ${f} NOT REMOVED! ${err}`);
        return false;
    }
}

module.exports = removeFile;

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
async function emptyDir(f) {
    try {
        await fs.emptyDir(f);
        console.log(`${chalk.green.underline("Directory")} ${chalk.bold(f)} emptied!`);
    } catch (err) {
        console.error(err);
    }
}

module.exports = emptyDir;

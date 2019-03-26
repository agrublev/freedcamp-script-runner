const fs = require("fs-extra");
const chalk = require("chalk");

/**
 * Write file
 * @param f - file name with directory
 * @param contents - text inside the file
 * @return {Promise<void>}
 * @example
const file = "/tmp/this/path/does/not/exist/file.json";
writeFile(file);
 */
async function writeFile(f, contents = "") {
    try {
        await fs.outputFile(f, contents);
        console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} written!`);
    } catch (err) {
        console.error(err);
    }
}

module.exports = writeFile;

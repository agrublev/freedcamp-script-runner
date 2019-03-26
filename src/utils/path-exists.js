const fs = require("fs-extra");
const chalk = require("chalk");

/**
 * Ensure path exists with dirs
 * @param f the file path
 * @return {boolean}
 * @example
 const file = ".fsr/config.json";
 pathExists(file);
 */
async function pathExists(f) {
    const exists = await fs.pathExists(f);

    return exists;
}

module.exports = pathExists;

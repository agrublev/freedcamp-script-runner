const fs = require("fs-extra");
const chalk = require("chalk");

/**
 * Ensure File exists with dirs
 * @param f the file path
 * @return {Promise<void>}
 * @example
 const file = ".fsr/config.json";
 ensureFile(file);
 */
async function ensureFile(f) {
    try {
        await fs.ensureFile(f);
        console.log("success!");
    } catch (err) {
        console.error(err);
    }
}

module.exports = ensureFile;

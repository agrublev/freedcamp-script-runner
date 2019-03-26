const fs = require("fs-extra");

const desiredMode = 0o2775;
const defaultOptions = {
    mode: desiredMode
};

/**
 * Ensure Directory exists or create
 * @param directory - desired directory
 * @param options - options passed
 * @return {Promise<void>}
 * @example
 const dir = "/tmp/this/path/does/not/exist";
 ensureDir(dir);
 */
async function ensureDir(directory, options = defaultOptions) {
    try {
        await fs.ensureDir(directory, options);
        console.log("success!");
    } catch (err) {
        console.error(err);
    }
}

module.exports = ensureDir;

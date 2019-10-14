/**
 * Clears console
 * @param opts pass true to fully clear
 */
module.exports = function clear(opts) {
    if (typeof opts === "boolean") {
        opts = {
            fullClear: opts
        };
    }

    opts = opts || {};

    opts.fullClear = opts.hasOwnProperty("fullClear") ? opts.fullClear : true;

    if (opts.fullClear === true) {
        process.stdout.write("\x1b[2J");
    }

    process.stdout.write("\x1b[0f");
};

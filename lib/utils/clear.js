/**
 * Clears console
 * @param opts pass true to fully clear
 */
export default function clear(opts) {
    if (typeof opts === "boolean") {
        opts = {
            fullClear: opts
        };
    }

    opts = opts || {};

    opts.fullClear = opts.hasOwnProperty("fullClear") ? opts.fullClear : true;

    if (opts.fullClear === true) {
        // Home, erase the whole display (2J), AND erase the scrollback (3J).
        // Without 3J the old lines stay in the scrollback buffer, so macOS
        // terminals still scroll back to the previous output, i.e. it looks
        // like clear "didn't work". This matches the real `clear` binary.
        process.stdout.write("\x1b[H\x1b[2J\x1b[3J");
        return;
    }

    // Soft clear: just home the cursor so new output overdraws the old frame.
    process.stdout.write("\x1b[0f");
}

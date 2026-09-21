import path from "path";
import chalk from "chalk";
import fsrLog from "../utils/console.js";
import generateToc from "./generateToc.js";

const PICK_MD_QUESTION = "Choose a markdown (.md) file";
const RETRY_MD_QUESTION = "Not a .md file! Choose a markdown (.md) file";

const isMarkdownFile = (file) =>
    typeof file === "string" && file.toLowerCase().endsWith(".md");

/**
 * Pick a markdown file with the interactive file picker (fc-filepick).
 *
 * fc-filepick has no extension filter of its own, so only .md files are
 * accepted here: picking any other file re-opens the picker in the same
 * folder until an .md file is chosen or the picker is cancelled.
 *
 * @param {string} [startFolder="."] folder the picker opens in
 * @returns {Promise<string|null>} path to the chosen .md file, or null when cancelled
 */
const pickMarkdownFile = async (startFolder = ".") => {
    const { default: fcFilepickerMod } = await import("fc-filepick");
    // The bundled build can wrap the ESM default export — unwrap both shapes.
    const fcFilepicker = fcFilepickerMod.default ?? fcFilepickerMod;

    let folder = startFolder;
    let question = PICK_MD_QUESTION;

    // Loop until an .md file is picked — fc-filepick resolves `false` on cancel.
    while (true) {
        // Ink unrefs stdin when its menu unmounts. Keep the process alive while
        // fc-filepick creates its readline prompt; otherwise Node can terminate
        // before the picker has attached its input listeners.
        process.stdin.ref?.();
        let picked;
        try {
            picked = await fcFilepicker({
                type: "file",
                question,
                folder
            });
        } finally {
            process.stdin.unref?.();
        }

        if (isMarkdownFile(picked)) {
            return picked;
        }

        if (picked) {
            // Warn, then re-open the picker in the same folder. The picker
            // clears the console when it opens, so the retry question carries
            // the ".md only" reminder inside the prompt itself.
            fsrLog.warn(
                `${chalk.bold.red("Only .md files are supported!")} ${chalk.dim(
                    picked
                )} is not a markdown file.`
            );
            folder = path.dirname(picked);
            question = RETRY_MD_QUESTION;
            continue;
        }

        return null;
    }
};

/**
 * Choose a markdown file with the interactive file picker and generate its
 * Table of Contents. Only .md files are accepted.
 *
 * @param {string} [startFolder="."] folder the picker opens in
 * @returns {Promise|null} result of generateToc, or null when no file was picked
 */
const generateTocFile = async (startFolder = ".") => {
    const file = await pickMarkdownFile(startFolder);

    if (!file) {
        fsrLog.log(chalk.bold.yellow("Cancelled — no markdown file selected."));
        return null;
    }

    fsrLog.success(`Generating Table of Contents for ${chalk.bold.underline(file)}`);
    return await generateToc(file);
};

export default generateTocFile;
export { pickMarkdownFile };

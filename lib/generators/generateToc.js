const path = require("path");
const chalk = require("chalk");
const JoyCon = require("joycon");
const toc = require("markdown-toc");

const joyRead = new JoyCon({
    // Stop reading at parent dir
    // i.e. Only read file from process.cwd()
    stopDir: path.dirname(process.cwd())
});
const { writeFile } = require("../utils/helpers.js");
// const projectDir = process.cwd();

const generateToc = async (fileToLoad = "fscripts.md") => {
    const { path: filepath, data } = joyRead.loadSync([fileToLoad]);
    if (!filepath) {
        console.warn(
            `${chalk.bold.red("You're missing the fscripts.md file!")}
${chalk.green("Please run 'fsr generate' to get started!")}`
        );
        process.exit(0);
        return null;
    } else {
        console.warn(`${chalk.bold.green("Located fscripts.md file!")}`);
        let newFile = ``;
        let tocSplit = data.split("<!-- end toc -->");
        let mdContent = "";
        if (tocSplit.length === 2) {
            mdContent = tocSplit[1];
        } else {
            mdContent = data;
        }
        newFile = toc(mdContent).content + "\n<!-- end toc -->\n\n" + mdContent.trim();

        await writeFile(fileToLoad, newFile);
    }
};

module.exports = generateToc;

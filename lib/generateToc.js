const path = require("path");
const chalk = require("chalk");
require("markdown-toc");
const JoyCon = require("joycon");
const toc = require("markdown-toc");

const joyRead = new JoyCon({
    // Stop reading at parent dir
    // i.e. Only read file from process.cwd()
    stopDir: path.dirname(process.cwd())
});
const { writeFile } = require("./helpers.js");
// const projectDir = process.cwd();

const generateToc = async () => {
    const { path: filepath, data } = joyRead.loadSync(["fscripts.md"]);
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
        if (tocSplit.length === 2) {
            newFile = toc(tocSplit[1]).content + "\n<!-- end toc -->\n\n" + tocSplit[1].trim();
        } else {
            newFile = toc(data).content + "\n<!-- end toc -->\n\n" + data.trim();
        }
        await writeFile("./fscripts.md", newFile);
    }
};

module.exports = generateToc;

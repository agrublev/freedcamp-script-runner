import path from "path";
import chalk from "chalk";
import fs from "fs";
import tocPkg from "markdown-toc";
const toc = tocPkg.default || tocPkg;

import { writeFile } from "../utils/helpers.js";
import fsrLog from "../utils/console.js";
// const projectDir = process.cwd();

const generateToc = async (fileToLoad = "fscripts.md") => {
    const filepath = path.resolve(process.cwd(), fileToLoad);

    if (!fs.existsSync(filepath)) {
        fsrLog.warn(
            `${chalk.bold.red("You're missing the fscripts.md file!")}
${chalk.green("Please run 'fsr generate' to get started!")}`
        );
        process.exit(0);
        return null;
    }

    const data = fs.readFileSync(filepath, "utf-8");
    fsrLog.warn(`${chalk.bold.green("Located fscripts.md file!")}`);

    let newFile = ``;
    let tocSplit = data.split("<!-- end toc -->");
    let mdContent = "";
    if (tocSplit.length === 2) {
        mdContent = tocSplit[1];
    } else {
        mdContent = data;
    }

    // Generate TOC even for empty files
    const tocContent = data === "" ? "" : toc(mdContent).content;
    newFile = tocContent + "\n<!-- end toc -->\n\n" + mdContent.trim();

    await writeFile(fileToLoad, newFile);
};

export default generateToc;

import path from "path";
import chalk from "chalk";
import fs from "fs";
import tocPkg from "markdown-toc";
const toc = tocPkg.default || tocPkg;

import { writeFile } from "./utils/helpers.js";
// const projectDir = process.cwd();

const generateToc = async () => {
    const filepath = path.resolve(process.cwd(), "fscripts.md");

    if (!fs.existsSync(filepath)) {
        console.warn(
            `${chalk.bold.red("You're missing the fscripts.md file!")}
${chalk.green("Please run 'fsr generate' to get started!")}`
        );
        process.exit(0);
        return null;
    }

    const data = fs.readFileSync(filepath, "utf-8");
    if (data) {
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

export default generateToc;

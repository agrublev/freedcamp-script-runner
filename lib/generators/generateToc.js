import path from "path";
import chalk from "chalk";
import fs from "fs";
import tocPkg from "markdown-toc";
const toc = tocPkg.default || tocPkg;

// markdown-toc's default slugify relies on lazy-cache to require 'strip-color'
// at runtime, which esbuild can't bundle (throws "stripColor is not a function").
// Replicate its default slugify behavior here so anchors stay identical.
const stripColor = (str) => str.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "");
const getTitle = (str) => {
    if (/^\[[^\]]+\]\(/.test(str)) {
        const m = /^\[([^\]]+)\]/.exec(str);
        if (m) return m[1];
    }
    return str;
};
const slugify = (str, options = {}) => {
    str = getTitle(str);
    str = stripColor(str);
    str = str.toLowerCase();
    str = str.split(" ").join("-");
    str = str.split(/\t/).join("--");
    if (options.stripHeadingTags !== false) {
        str = str.split(/<\/?[^>]+>/).join("");
    }
    str = str.split(/[|$&`~=\\\/@+*!?({[\]})<>=.,;:'"^]/).join("");
    str = str
        .split(
            /[。？！，、；：“”【】（）〔〕［］﹃﹄“ ”‘’﹁﹂—…－～《》〈〉「」]/
        )
        .join("");
    if (options.num) {
        str += "-" + options.num;
    }
    return str;
};

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
    const tocContent = data === "" ? "" : toc(mdContent, { slugify }).content;
    newFile = tocContent + "\n<!-- end toc -->\n\n" + mdContent.trim();

    await writeFile(fileToLoad, newFile);
};

export default generateToc;

const fs = require("fs");
const JoyCon = require("joycon");
const path = require("path");
const chalk = require("chalk");
const md2json = require("./parseMarkdown.js");
const toc = require("markdown-toc");

const joyRead = new JoyCon({
    // Stop reading at parent dir
    // i.e. Only read file from process.cwd()
    stopDir: path.dirname(process.cwd())
});
const parseScriptFile = async () => {
    const { path: filepath, data } = joyRead.loadSync(["FcScripts.md"]);
    if (!filepath) {
        console.warn(`${chalk.bold.red("You're missing the FcScripts.md file!")}`);
        return null;
    } else {
        console.warn(`${chalk.bold.green("Located FcScripts.md file!")}`);
        let newContent = data.replace(/(<!-- toc -->(\s|\S)*?<!-- tocstop -->)/g, "").trim();
        let writeFileContent = `<!-- toc -->\n\n${
            toc(newContent, {}).content
        }\n\n<!-- tocstop -->\n\n${newContent}`;

        fs.writeFile("FcScripts.md", writeFileContent, err => {
            // throws an error, you could also catch it here
            if (err) throw err;
        });

        return md2json.parse(newContent);
    }
};

module.exports = parseScriptFile;

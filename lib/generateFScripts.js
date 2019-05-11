const chalk = require("chalk");
const inquirer = require("inquirer");

const { appendToFile, writeFile, boxInform, readJson, readFile } = require("./helpers.js");
const path = require("path");
const projectDir = process.cwd();
const packagePath = path.join(projectDir, "package.json");

const gen = { scripts: [] };
let mdfile = `# First category of scripts

Welcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.
`;

gen.init = async () => {
    try {
        gen.packageJson = await readJson(packagePath);
        Object.keys(gen.packageJson.scripts).forEach(scriptName => {
            mdfile += `\n## ${scriptName}\n\n${
                gen.packageJson.scripts[scriptName]
            }\n\n\`\`\`bash\n${gen.packageJson.scripts[scriptName]}\n\`\`\`\n\n`;
        });
        await writeFile("./sample.fscripts.md", mdfile);
    } catch (err) {
        console.error(err);
    }
};

module.exports = gen.init;

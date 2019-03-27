const chalk = require("chalk");
var inquirer = require("inquirer");

const { appendToFile, writeFile, boxInform, readJson, readFile } = require("./index.js");
const path = require("path");
const projectDir = process.cwd();
const packagePath = path.join(projectDir, "package.json");

const gen = { scripts: [] };
let mdfile =
    "# First category of scripts\n\n Welcome to your new amazing .fscripts.md file. It replaces the headaches of npm scripts! But so much more.\n\n";

// prettier-ignore
gen.decrypt = async (pass, encryptedFile, decryptedFile) => {
    let toDecrypt = await readFile(encryptedFile);
    const bytes = CryptoJS.AES.decrypt(toDecrypt, pass);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    // const json_pp = pd.json(decryptedData);
    await writeFile(path.join(projectDir, decryptedFile), decryptedData);
};

gen.init = async () => {
    try {
        gen.packageJson = await readJson(packagePath);
        Object.keys(gen.packageJson.scripts).forEach(scriptName => {
            mdfile += `\n## ${scriptName}\n\nTBD\n\n\`\`\`bash\n${
                gen.packageJson.scripts[scriptName]
            }\n\`\`\`\n\n`;
        });
        await writeFile("./.mdtest.md", mdfile);
    } catch (err) {
        console.error(err);
    }
};

gen.init();
// module.exports = cr;

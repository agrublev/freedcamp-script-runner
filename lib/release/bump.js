const versiony = require("versiony");
const inquirer = require("inquirer");
const prettier = require("prettier");
const path = require("path");
const fs = require("fs");
const sortPackageJson = require("./sort.js");
let packagePath = path.resolve(process.cwd(), "package.json");

if (!fs.existsSync(packagePath)) {
    logError("Cannot find package.json file in the current directory");
    process.exit(1);
}

const bump = async () => {
    const type = await new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "list",
                    choices: ["patch", "minor", "major"],
                    name: "retType"
                }
            ])
            .then(async ({ retType }) => {
                resolve(retType);
            });
    });

    const vv = versiony.from(packagePath);
    if (type === "patch") vv.patch();
    if (type === "minor") vv.minor().patch(0);
    if (type === "major") {
        vv.major()
            .patch(0)
            .minor(0);
    }
    vv.to(packagePath).end();
    let myFileContent = await fs.readFileSync(packagePath, "utf8");
    let soPretty = "";
    myFileContent = JSON.stringify(sortPackageJson(JSON.parse(myFileContent)));
    try {
        soPretty = prettier.format(myFileContent, {
            printWidth: 20,
            tabWidth: 4,
            singleQuote: false,
            trailingComma: "none",
            bracketSpacing: true,
            semi: true,
            useTabs: true,
            parser: "json",
            jsxBracketSameLine: false // parser: "json",
        });
    } catch (e) {
        console.info("-- Console ERR", e);
    }
    await fs.writeFileSync(packagePath, soPretty, "utf8");
};

module.exports = bump;

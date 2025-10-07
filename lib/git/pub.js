import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { readJson } from "../utils/helpers.js";
import simple from "simple-git";

import validateNotInDev from "./validateNotDev.js";

(async () => {
    await validateNotInDev();
    await new Promise(resolve => {
        let pack = readJson(path.resolve(__dirname + "package.json"));

        inquirer
        .prompt([
            {
                type: "input",
                message: chalk.bold.hex("#38be18")(`What's new this version ${pack.version}: `),
                name: "commitmsg"
            }
        ])
        .then(async ({ commitmsg }) => {
            simple()
            .add("./*")
            .commit(`VERSION ${pack.version}\n${commitmsg}`)
            .push(["-u"], () => console.log("done"))
            .addTag(`${pack.version}`, () => console.warn(""))
            .pushTags("origin", () => {
                console.warn("-- Console 3", 3);
                resolve();
            });
            // await require("simple-git")()
        });
    });
})();

import childProcess from "child_process";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { boxInform } from "../utils/helpers.js";
import chalk from "chalk";

async function pub() {
    let command = `sh ${path.resolve(__dirname, "publish.sh")}`;
    try {
        childProcess.execSync(command, {
            stdio: "inherit",
            env: Object.assign({}, process.env, {
                FORCE_COLOR: true,
                PATH: `${path.resolve("node_modules")}:${process.env.PATH}`
            })
        });
        boxInform(
            chalk.green.bold.underline("PUBLISHED"),
            "https://www.npmjs.com/package/fscripts",
            3
        );
    } catch (e) {
        console.error(`${command} - ${e}`);
    }
}
pub();

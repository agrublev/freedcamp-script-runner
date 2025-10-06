import path from "path";
import chalk from "chalk";
const projectPath = path.join(process.cwd(), "./package.json");
import { readJson } from "../utils/helpers.js";
const parseScriptFile = async () => {
    const packageFile = await readJson(projectPath);
    return packageFile.scripts;
};

export default parseScriptFile;

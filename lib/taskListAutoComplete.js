const scriptsDir = process.cwd();
import path from "path";
import fs from "fs";
const rootDir = path.join(scriptsDir, "../");
const separator = "   ~   ";
import Conf from "conf";

let packagePath = path.resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath));
const config = new Conf({ projectName: packageJson.name });


export default taskListAutoComplete;
// (async () => {
//     await startScripts();
// })();

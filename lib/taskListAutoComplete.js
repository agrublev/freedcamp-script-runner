const scriptsDir = process.cwd();
import path from "path";
const rootDir = path.join(scriptsDir, "../");
const separator = "   ~   ";
import Conf from "conf";
const config = new Conf();


export default taskListAutoComplete;
// (async () => {
//     await startScripts();
// })();

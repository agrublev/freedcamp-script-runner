const scriptsDir = process.cwd();
const path = require("path");
const rootDir = path.join(scriptsDir, "../");
const separator = "   ~   ";
const Conf = require("conf");
const config = new Conf();


module.exports = taskListAutoComplete;
// (async () => {
//     await startScripts();
// })();

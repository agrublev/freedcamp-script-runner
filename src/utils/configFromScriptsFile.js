const parseScriptsFile = require("./parseScriptFile.js");
const { writeFile, ensureDir } = require("./index.js");
const chalk = require("chalk");

const path = require("path");
const rootDir = path.join(process.cwd(), "./");
const fs = require("fs");
const util = require("util");
const scriptsMdFile = path.join(process.cwd(), ".fscripts.md");
const toc = require("markdown-toc");
const configManager = require("./config-manager.js");

async function updateConfig() {
    //conf
    await configManager.init();
    let conf = configManager;
    let getLastUpdateMd = fs.statSync(path.join(rootDir, "./.fscripts.md"));
    getLastUpdateMd = new Date(util.inspect(getLastUpdateMd.mtime)).getTime();
    let confLastUpdatedMd = conf.get("lastUpdateConfig");
    let timeDiffOfUpdates = getLastUpdateMd - confLastUpdatedMd;
    //!(conf.localConfig["lastUpdateConfig"] && conf.localConfig["lastUpdateMdFile"])
    if (timeDiffOfUpdates > 5000 || timeDiffOfUpdates < 0) {
        try {
            conf.set("lastUpdateMdFile", getLastUpdateMd);
            conf.set("lastUpdateConfig", new Date().getTime());
            const parsedFile = await parseScriptsFile();
            let tasks = parsedFile.allTasks;
            for (let task in tasks) {
                let zz = tasks[task];
                if ("js" === zz.type) {
                    await ensureDir(".fsr/scripts/js");
                    let flName = ".fsr/scripts/js/" + task.replace(/:/g, "-") + ".js";
                    await writeFile(flName, zz.script);
                    zz.file = flName;
                }
            }
            conf.set("tasks", tasks);
            conf.set("categories", parsedFile.categories);
            //await
            conf.updateConfigFile();
            let fileMd = fs.readFileSync(scriptsMdFile, "utf8");
            fileMd = fileMd.replace(/(<!-- toc -->(\s|\S)*?<!-- tocstop -->)/g, "").trim();

            let tocMd = `<!-- toc -->\n\n${
                toc(fileMd, {}).content
            }\n\n<!-- tocstop -->\n\n${fileMd}`;
            await fs.writeFileSync(scriptsMdFile, tocMd, "utf8");
        } catch (err) {
            console.error(err);
        }
    } else {
        // console.log(`${chalk.green("Not updating!!")}`);
    }
}

module.exports = updateConfig;

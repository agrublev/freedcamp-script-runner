const parseScriptsFile = require("./parseScriptFile.js");
const ensureDir = require("../utils/ensure-dir.js");
const writeFile = require("../utils/write-file.js");
const chalk = require("chalk");

const path = require("path");
const rootDir = path.join(process.cwd(), "./");
const fs = require("fs");
const util = require("util");
const scriptsMdFile = path.join(process.cwd(), "FcScripts.md");
const toc = require("markdown-toc");

async function updateConfig(conf) {
    let getLastUpdateMd = fs.statSync(path.join(rootDir, "./FcScripts.md"));
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

            await conf.updateConfigFile();
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
        console.log(`${chalk.green("Not updating!!")}`);
    }
}

module.exports = updateConfig;

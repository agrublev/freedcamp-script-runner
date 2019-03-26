const Conf = require("conf");
const cM = {};
const writeFile = require("../utils/write-file.js");
const pathExists = require("../utils/path-exists.js");
const path = require("path");
const projectDir = process.cwd();
const configPath = path.join(projectDir, ".fsr/config.json");
const pd = require("pretty-data").pd;

cM.init = async () => {
    try {
        const configFileExists = await pathExists(configPath);

        cM.config = new Conf({ configName: projectDir, projectName: "Freedcamp" });

        cM.localConfig = cM.config.get(projectDir);

        if (!configFileExists) {
            await cM.updateConfigFile();
        }
        return cM.config.get(projectDir);
    } catch (err) {
        console.error(err);
        return {};
    }
};

cM.set = (key, json) => {
    cM.config.set(projectDir + "." + key, json);
};

// prettier-ignore
cM.get = (key, def = "") => {
    let retConfVal = cM.config.get(projectDir + "." + key);
    return retConfVal !== undefined ? retConfVal : def;
};

cM.serialize = () => {
    cM.localConfig = cM.config.get(projectDir);
    return JSON.parse(JSON.stringify(cM.localConfig)); //
};

cM.updateConfigFile = async () => {
    const json_pp = pd.json(cM.serialize());

    // console.log(pretty);
    await writeFile(configPath, json_pp);
};

cM.clear = () => {
    cM.config.clear();
};

module.exports = cM;

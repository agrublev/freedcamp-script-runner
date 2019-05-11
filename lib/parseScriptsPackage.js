"use strict";
const path = require("path");
const chalk = require("chalk");
const projectPath = path.join(process.cwd(), "./package.json");
const { readJson } = require("./helpers");
const parseScriptFile = async () => {
    const packageFile = await readJson(projectPath);
    return packageFile.scripts;
};

module.exports = parseScriptFile;

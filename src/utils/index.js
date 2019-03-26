// https://www.npmjs.com/package/fs-extra
const ensureFile = require("./ensure-file.js");
const writeJson = require("./write-json.js");
const readJson = require("./read-json.js");
const pathExists = require("./path-exists.js");
const removeFile = require("./remove-file.js");
const emptyDir = require("./empty-dir.js");

// ensureFile(".fsr/config.json");
// pathExists(".fsr/config.json");

async function runExamples() {
    // writeJson(".fsr/config.json", { data: 52 });
    // emptyDir(".fsr");
    // await removeFile(".fsr/config.json");
}

runExamples();

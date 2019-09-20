const zip = require("./genZipRelease.js");

const versiony = require("versiony");

const { version } = versiony
    .from("package.json")
    .patch()
    .to("package.json")
    .end();

versiony
    .from("src/manifest.json")
    .version(version)
    .to("src/manifest.json")
    .end();

zip(version);

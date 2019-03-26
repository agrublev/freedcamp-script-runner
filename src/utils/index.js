// https://www.npmjs.com/package/fs-extra
const ensureFile = require("./ensure-file.js");
const writeJson = require("./write-json.js");
const readJson = require("./read-json.js");
const pathExists = require("./path-exists.js");
const removeFile = require("./remove-file.js");
const emptyDir = require("./empty-dir.js");
const vorpal = require("vorpal")();
// const system = require("vorpal-system");
// vorpal.use(system);
// ensureFile(".fsr/config.json");
// pathExists(".fsr/config.json");

async function runExamples() {
    // writeJson(".fsr/config.json", { data: 52 });
    // emptyDir(".fsr");
    // await removeFile(".fsr/config.json");
}

// runExamples();
// const results = vorpal.parse(process.argv); // vorpal.parse(process.argv, { use: "minimist" });
// console.warn("-- Console RES", results);
vorpal
    .command("destroy")
    .description("DESTROYS IT ALL")
    .alias("d")
    .option("-d, --debug", "Debugs")
    .action(function(args, cb) {
        const self = this;
        return this.prompt(
            {
                type: "confirm",
                name: "continue",
                default: false,
                message: "That sounds like a really bad idea. Continue?"
            },
            function(result) {
                if (!result.continue) {
                    self.log("Good move.");
                    cb();
                } else {
                    self.log("Time to dust off that resume.");
                }
            }
        );
    });

vorpal
    .delimiter("$ ")
    .show()
    .parse(process.argv);

const startRunner = require("./src/utils/start-runner.js");

if (process.argv.length === 2) {
    process.stdout.write("\x1b[2J");
    process.stdout.write("\x1b[0f");
    startRunner();
} else {
    require("@oclif/command")
    .run()
    .then(require("@oclif/command/flush"))
    .catch(require("@oclif/errors/handle"));
}

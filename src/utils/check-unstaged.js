const cgf = require("changed-git-files");
const fs = require("fs");
// const runCommand = require("./runCommand.js");
const path = require("path");
// const indexJs = path.join(process.cwd(), "./packages/utils/dist/index.js");
// const chalk = require("chalk");

module.exports = new Promise((resolve, reject) => {
    cgf(function(err, results) {
        let namedObj = {};
        results.forEach(e => {
            namedObj[e.filename] = e;
        });
        console.log(namedObj);

        resolve(results);

        // let fileDoesNotExist = true;
        // try {
        //     if (fs.existsSync(indexJs)) {
        //         fileDoesNotExist = false;
        //     }
        // } catch (err) {
        //     console.error(err);
        // }
        // console.warn("-- Console FILE DOES NOT EXIST", fileDoesNotExist);
        // if (
        //     results.findIndex(e => e.filename.indexOf("packages/utils") !== -1) !== -1 ||
        //     fileDoesNotExist
        // ) {
        //     console.log(
        //         `${chalk.bold.underline.green("\nChanges found in utils\nStarting build...\n")}`
        //     );
        //     runCommand("rimraf packages/utils/dist");
        //     runCommand("yarn build:utils:run");
        //     resolve();
        // } else {
        //     console.log(
        //         `${chalk.bold.underline.yellow("\nNo changes found in utils\nSkipping build...\n")}`
        //     );
        //     resolve();
        // }
        //WHAT EVER YOU SO PLEASE
    });
});

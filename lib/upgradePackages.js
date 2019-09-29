const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const chalk = require("chalk");
const logError = message => {
    console.log(chalk.red("[Error]: " + message));
};
const logInfo = message => {
    console.log(chalk.blue("[Start]: " + message));
};
const logSuccess = message => {
    console.log(chalk.green("[Done]: " + message));
};

let global = "";
let packagePath = path.resolve(process.cwd(), "package.json");

if (!fs.existsSync(packagePath)) {
    logError("Cannot find package.json file in the current directory");
    process.exit(1);
}

const packageJson = require(packagePath);
let ignorePkgs = [];
const upgradePackages = async () => {
    if (packageJson["fscripts"]) {
        if (packageJson["fscripts"]["ignore-upgrade"]) {
            ignorePkgs = packageJson["fscripts"]["ignore-upgrade"];
        }
    }
    let upgraded = { before: {}, after: {} };
    for (let element of ["dependencies", "devDependencies", "peerDependencies"]) {
        if (packageJson[element]) {
            const packages = Object.keys(packageJson[element]);
            let packagesList = packages
                .filter(pkk => !ignorePkgs.includes(pkk))
                .map(pkk => {
                    upgraded["before"][pkk] = packageJson[element][pkk];
                    return pkk + "@latest";
                })
                .join(" ");
            let command = `yarn add ${packagesList}`;
            try {
                // logInfo(command);
                childProcess.execSync(command, {
                    stdio: "inherit",
                    env: Object.assign({}, process.env, {
                        FORCE_COLOR: true,
                        PATH: `${path.resolve("node_modules")}:${process.env.PATH}`
                    })
                });
                const packageJsonAfter = JSON.parse(fs.readFileSync(packagePath));
                const packagesAfter = Object.keys(packageJsonAfter[element]);
                let packagesListAfter = packagesAfter
                    .filter(pkk => !ignorePkgs.includes(pkk))
                    .map(pkk => {
                        upgraded["after"][pkk] = packageJsonAfter[element][pkk];
                        return upgraded["before"][pkk] !== upgraded["after"][pkk]
                            ? `Updated: ${pkk} from: ${upgraded["before"][pkk]} | to: ${
                                  upgraded["after"][pkk]
                              }\n`
                            : ``;
                    })
                    .join("");
                logSuccess(packagesListAfter);
            } catch (e) {
                logError(`${command} - ${e}`);
            }
        }
    }
};
module.exports = upgradePackages;

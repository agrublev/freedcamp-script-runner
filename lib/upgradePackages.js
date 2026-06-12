import fs from "fs";
import path from "path";
import childProcess from "child_process";
import chalk from "chalk";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

const upgradePackages = async () => {
    // Read package.json lazily so importing this module never crashes in a dir without one.
    if (!fs.existsSync(packagePath)) {
        logError("Cannot find package.json file in the current directory");
        process.exit(1);
    }
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
    let ignorePkgs = [];
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
export default upgradePackages;

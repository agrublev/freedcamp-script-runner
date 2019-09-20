const CryptoJS = require("crypto-js");
const chalk = require("chalk");
var inquirer = require("inquirer");

const {
    appendToFile,
    ensureFile,
    writeFile,
    boxInform,
    readJson,
    readFile
} = require("../helpers.js");
const path = require("path");
const scriptsDir = process.cwd();
const rootDir = path.join(scriptsDir, "./");
const packagePath = path.join(rootDir, "package.json");
const igPath = path.join(rootDir, ".gitignore");
const prettier = require("prettier");
const encrypt = { encryptedFiles: [] };

// prettier-ignore
encrypt.encrypt = async (pass, encryptedFile, decryptedFile) => {
    let willEncrypt = true;
    let sureSure = await ensureFile(encryptedFile);
    if (sureSure) {
        console.log(`${chalk.bold.red("FILE ALREADY EXISTS ARE YOU SURE?")}`);
        willEncrypt = await new Promise(resolve => {
            inquirer
                .prompt([
                    {
                        type: "confirm",
                        message: chalk.bold.hex("#38be18")(`Sure? (y/n): `),
                        name: "sure"
                    }
                ])
                .then(({ sure }) => {
                    resolve(sure);
                });
        });
    }
    if (willEncrypt) {
        let toEncrypt = await readFile(decryptedFile);
        const ciphertext = CryptoJS.AES.encrypt(toEncrypt, pass);
        await writeFile(encryptedFile, ciphertext.toString());
    }

};
// prettier-ignore
encrypt.decrypt = async (pass, encryptedFileLocation, decryptedFileLocation) => {
    // let encryptedFileLocation = path.join(rootDir,"."+encryptedFile);
    // let decryptedFileLocation = path.join(rootDir,encryptedFile);
    let willEncrypt = true;
    let sureSure = await ensureFile(decryptedFileLocation);
    if (sureSure) {
        console.log(`${chalk.bold.red("FILE ALREADY EXISTS ARE YOU SURE?")}`);
        willEncrypt = await new Promise(resolve => {
            inquirer
                .prompt([
                    {
                        type: "confirm",
                        message: chalk.bold.hex("#38be18")(`Sure wanna override file ${decryptedFileLocation}? (y/n): `),
                        name: "sure"
                    }
                ])
                .then(({ sure }) => {
                    resolve(sure);
                });
        });
    }
    if (willEncrypt) {
        let toDecrypt = await readFile(encryptedFileLocation);
        const bytes = CryptoJS.AES.decrypt(toDecrypt, pass);
        let decryptedData;
        try {
            decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            console.error("-- Console Problem ", e);
        }
        await writeFile(decryptedFileLocation, decryptedData);
        console.warn(`${chalk.bold.green.underline("DECRYPTED FILE:")} ${chalk.bold.dim(path.join(scriptsDir, decryptedFileLocation))}`);
    }

};

encrypt.init = async () => {
    try {
        let pass = await encrypt.getPass();
        let toEncrypt = await encrypt.toEncrypt();
        encrypt.packageJson = await readJson(packagePath);
        encrypt.ignore = await readFile(igPath);
        encrypt.ignoredFiles = encrypt.ignore.split("\n");
        if (encrypt.packageJson.fscripts) {
            if (encrypt.packageJson.fscripts.encryptedFiles) {
                encrypt.encryptedFiles = encrypt.packageJson.fscripts.encryptedFiles;
                let filesToAdd = "\n";
                for (const e of encrypt.encryptedFiles) {
                    if (encrypt.ignoredFiles.indexOf(e) === -1) {
                        filesToAdd += e + "\n";
                    }
                    let file = e + "";
                    let fileSplit = file.split("/");
                    let name = fileSplit.pop();
                    let encryptedFile = fileSplit.slice();
                    let decryptedFile = fileSplit.slice();
                    encryptedFile.push("." + name);
                    encryptedFile = path.join(rootDir, encryptedFile.join("/"));
                    decryptedFile.push(name);
                    decryptedFile = path.join(rootDir, decryptedFile.join("/"));

                    if (toEncrypt) {
                        await encrypt.encrypt(pass, encryptedFile, decryptedFile);
                    } else {
                        await encrypt.decrypt(pass, encryptedFile, decryptedFile);
                    }
                }

                if (filesToAdd.trim().length > 0) {
                    await appendToFile(igPath, filesToAdd + "\n");
                    boxInform(" Added files to .gitignore: ", filesToAdd);
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
};

encrypt.getPass = async () => {
    return await new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "password",
                    mask: chalk.underline(" ●"),
                    message: chalk.bold.hex("#38be18")(`Enter a SECRET key (same as pass app) : `),
                    name: "pass"
                }
            ])
            .then(({ pass }) => {
                resolve(pass);
            });
    });
};
encrypt.toEncrypt = async () => {
    return await new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "list",
                    message: chalk.bold.hex("#38be18")("Which direction?"),
                    choices: ["encrypt", "decrypt"],
                    name: "encryptDecrypt"
                }
            ])
            .then(async ({ encryptDecrypt }) => {
                resolve(encryptDecrypt === "encrypt");
            });
    });
};

module.exports = { ...encrypt };

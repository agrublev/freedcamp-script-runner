const CryptoJS = require("crypto-js");
const chalk = require("chalk");
var inquirer = require("inquirer");

const { appendToFile, writeFile, boxInform, readJson, readFile } = require("./index.js");
const path = require("path");
const projectDir = process.cwd();
const packagePath = path.join(projectDir, "package.json");
const igPath = path.join(projectDir, ".gitignore");
const pd = require("pretty-data").pd;

const cr = { encryptedFiles: [] };

// prettier-ignore
cr.encrypt = async (pass, file) => {
    let toEncrypt = await readFile(file);
    // file = file.split("/");
    // let fn = file.length === 0 ? "." + file.join("") : file.pop();
    // if(fn.indexOf("/")!==-1){
    //   file = file.join("/") + "/." + fn;
    // }
    const ciphertext = CryptoJS.AES.encrypt(toEncrypt, pass);
    await writeFile("." + file, ciphertext.toString());
};

// prettier-ignore
cr.decrypt = async (pass, encryptedFile, decryptedFile) => {
    let toDecrypt = await readFile(encryptedFile);
    const bytes = CryptoJS.AES.decrypt(toDecrypt, pass);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    // const json_pp = pd.json(decryptedData);
    await writeFile(path.join(projectDir, decryptedFile), decryptedData);
};

cr.init = async toEncrypt => {
    try {
        let pass = await cr.getPass();
        cr.packageJson = await readJson(packagePath);
        cr.ignore = await readFile(igPath);
        cr.ignoredFiles = cr.ignore.split("\n");
        if (cr.packageJson.fscripts) {
            if (cr.packageJson.fscripts.encryptedFiles) {
                cr.encryptedFiles = cr.packageJson.fscripts.encryptedFiles;
                let filesToAdd = "\n";
                cr.encryptedFiles.forEach(async e => {
                    if (cr.ignoredFiles.indexOf(e) === -1) {
                        filesToAdd += e + "\n";
                    }
                    if (toEncrypt) {
                        await cr.encrypt(pass, e);
                    } else {
                        await cr.decrypt(pass, "." + e, e);
                    }
                });
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

cr.getPass = async () => {
    return await new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "password",
                    mask: chalk.underline(" ●"),
                    message: chalk.bold.hex("#38be18")("Enter a SECRET key: "),
                    name: "pass"
                }
            ])
            .then(({ pass }) => {
                resolve(pass);
            });
    });
};

module.exports = cr;

import chalk from "chalk";
import inquirer from "inquirer";
import { encrypt, decrypt } from "../utils/encryption.js";
import {
    appendToFile,
    ensureFile,
    writeFile,
    boxInform,
    readJson,
    readFile
} from "../utils/helpers.js";
import path from "path";
const scriptsDir = process.cwd();
const rootDir = path.join(scriptsDir, "./");
const packagePath = path.join(rootDir, "package.json");
const igPath = path.join(rootDir, ".gitignore");
const encrypted = { encryptedFiles: [] };

// prettier-ignore
encrypted.encrypt = async (pass, encryptedFile, decryptedFile) => {
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
    const ciphertext = encrypt(toEncrypt, pass);
    await writeFile(encryptedFile, ciphertext.toString());
  }

};
// prettier-ignore
encrypted.decrypt = async (pass, encryptedFileLocation, decryptedFileLocation) => {
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
    const decryptedData = decrypt(toDecrypt, pass);
    await writeFile(decryptedFileLocation, decryptedData);
    console.warn(`${chalk.bold.green.underline("DECRYPTED FILE:")} ${chalk.bold.dim(path.join(scriptsDir, decryptedFileLocation))}`);
  }

};

encrypted.init = async () => {
    try {
        let pass = await encrypted.getPass();
        let toEncrypt = await encrypted.toEncrypt();
        encrypted.packageJson = await readJson(packagePath);
        encrypted.ignore = await readFile(igPath);
        encrypted.ignoredFiles = encrypted.ignore.split("\n");
        if (encrypted.packageJson.fscripts) {
            if (encrypted.packageJson.fscripts.encryptedFiles) {
                encrypted.encryptedFiles = encrypted.packageJson.fscripts.encryptedFiles;
                let filesToAdd = "\n";
                for (const e of encrypted.encryptedFiles) {
                    if (encrypted.ignoredFiles.indexOf(e) === -1) {
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
                        await encrypted.encrypted(pass, encryptedFile, decryptedFile);
                    } else {
                        await encrypted.decrypt(pass, encryptedFile, decryptedFile);
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

encrypted.getPass = async () => {
    return await new Promise((resolve) => {
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
encrypted.toEncrypt = async () => {
    return await new Promise((resolve) => {
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

export default { ...encrypted };

// let modifiedGitFiles = await ggg({ diffFilter: "M", showStatus: false, showCommitted: false });
// modifiedGitFiles = modifiedGitFiles.unCommittedFiles;
// console.log("MODDED", modifiedGitFiles);
// const res = await sgf();
const { writeFile } = require("../utils/helpers.js");
const path = require("path");
const fs = require("fs");
const releaseNotes = require("git-release-notes");
const inquirer = require("inquirer");
const jclrz = require("json-colorz");
const git = require("git-state");
const chalk = require("chalk");
const ggg = require("git-changed-files");
const tree = require("./tree.js");
// const tree = require("terminal-tree");

// jclrz.level.show = true;
// jclrz.level.spaces = 2;
// jclrz.level.start = 1;
// jclrz.level.char = chalk.bold.grey("⌐");
// jclrz.level.color = "black";
// for (const ss in syms) {
//     jclrz.level.char = chalk.bold.grey(syms[ss]);
// }
// var toSymbol = String.fromCharCode(10132);
// const syms = ["⌯", "➢", "⃕", "⌁", "⌐", "━", "═", "⇝"];

const pathToCwd = process.cwd();
const grouped = (data, filesChanged) => {
    let output = {};
    let current;

    for (const pdata of data) {
        current = output;

        for (const segment of pdata.split("/")) {
            if (segment !== "") {
                if (!(segment in current)) {
                    current[segment] = {};
                }

                current = current[segment];
            }
        }
    }
    let level = "";
    const deepClone = obj => {
        let clone = Object.assign({}, obj);
        Object.keys(clone).forEach(key => {
            let findMac = filesChanged.find(z => z.filename === key || z.filename === level + key);
            if (typeof obj[key] === "object" && Object.keys(obj[key]).length) {
                level += key + "/";
                clone[key] = deepClone(obj[key]);
            } else if (findMac) {
                let stat = findMac.status === undefined ? "Deleted" : findMac.status;
                console.info("-- Console STATUS", findMac.status, stat, key);
                stat = stat.replace(/\x1B[[(?);]{0,2}(;?\d)*./g, "");
                clone[key] = stat;
            } else {
                clone[key] = "";
            }
            return clone[key];
        });
        return Array.isArray(obj) ? (clone.length = obj.length) && Array.from(clone) : clone;
    };
    output = deepClone(output);
    console.info(
        tree(output, {
            symbol: true,
            highlight: true,
            padding: 1,
            colors: {
                string: "black",
                number: "red",
                boolean: "red",
                infinity: "red",
                nan: "red",
                null: "cyan",
                undefined: "gray",
                regexp: "green",
                key: "black",
                object: "grey",
                array: "red"
            }
        })
    );

    // jclrz(output);
    //
    return output;
};

const sgf = require("staged-git-files");
(async () => {
    const howManyCommitsBack = await new Promise(resolve => {
        inquirer
            .prompt([
                {
                    type: "input",
                    message: "How many commits do you want to compare in the past?",
                    default: 5,
                    name: "howMany"
                }
            ])
            .then(async ({ howMany }) => {
                resolve(howMany);
            });
    });

    const results = await sgf();

    let updatedFiles = await ggg({
        diffFilter: "ACDMRTUXB",
        showStatus: true,
        showCommitted: false
    });
    updatedFiles = [...updatedFiles.unCommittedFiles, ...results];
    let z = ""; // grouped(updatedFiles.map(e => e.filename).sort(), updatedFiles);
    try {
        z = require("child_process")
            .execSync(`git log -${howManyCommitsBack} --oneline | nl -v0 | sed 's/^ \\+/&HEAD~/'`, {
                env: Object.assign({}, process.env)
            })
            .toString();
        // console.info("--- INFO z", z);
    } catch (e) {}
    z = z
        .split("\n")
        .slice(-2)[0]
        .split("\t")
        .slice(-2)[1]
        .split(" ")[0];
    const last = await new Promise(rzz => {
        git.isGit(pathToCwd, function(exists) {
            if (!exists) return;

            git.commit(pathToCwd, function(err, result) {
                if (err) throw err;
                rzz(result);
            });
        });
    });
    console.info("-- Console FROM", z, "TO", last);

    const OPTIONS = {
        branch: "Development"
    };
    const RANGE = `${z}..${last}`;
    const TEMPLATE = "markdown";
    const changelog = await releaseNotes(OPTIONS, RANGE, TEMPLATE);
    console.log(`Changelog between ${RANGE}\n\n${changelog}`);
    // await fs.writeFileSync(path.resolve(process.cwd(), "release.md"), changelog, "utf-8");
})();
//

// git.check(path, function(err, result) {
//     if (err) throw err;
//     console.log(result); // => { branch: 'master',
//     //      ahead: 0,
//     //      dirty: 9,
//     //      untracked: 1,
//     //      stashes: 0 }
// });

//     console.info(
//         '-- Console path.resolve(process.cwd(), "release.md")',
//         path.resolve(process.cwd(), "release.md")
//     );
//

//
//     // .catch(ex => {
//     // console.error(ex);
//     // process.exit(1);
//     // resolve();

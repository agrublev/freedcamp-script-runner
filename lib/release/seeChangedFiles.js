// let modifiedGitFiles = await ggg({ diffFilter: "M", showStatus: false, showCommitted: false });
// modifiedGitFiles = modifiedGitFiles.unCommittedFiles;
// console.log("MODDED", modifiedGitFiles);
// const res = await sgf();
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

    // jclrz(output);
    //
    return output;
};

const sgf = require("staged-git-files");
const seeChangedFiles = async () => {
    const results = await sgf();

    let updatedFiles = await ggg({
        diffFilter: "ACDMRTUXB",
        showStatus: true,
        showCommitted: false
    });
    updatedFiles = [...updatedFiles.unCommittedFiles, ...results];
    console.log(
        tree(grouped(updatedFiles.map(e => e.filename).sort(), updatedFiles), {
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
};

module.exports = seeChangedFiles;

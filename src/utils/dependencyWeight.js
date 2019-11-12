const chalk = require("chalk");
const fetch = require("node-fetch");
const filesize = require("filesize");
const { writeJson, readJson, rainbowGradient } = require("./index.js");
const path = require("path");
const fs = require("fs");
const projectDir = process.cwd();
const packagePath = path.join(projectDir, "package.json");
const configManager = require("./config-manager.js");
const getSize = require("get-folder-size");
const gen = { scripts: [] };
const prettyBytes = require("pretty-bytes");

gen.getSize = async (pathSize, raw = false) => {
    return new Promise(resolve => {
        getSize(pathSize, (err, size) => {
            if (err) {
                throw err;
            }
            let calcd = (size / 1024 / 1024).toFixed(2) + " MB";
            resolve(raw ? size : calcd);
        });
    });
};

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

async function getDirectories(path) {
    const pathsList = [];
    fs.readdirSync(path).forEach(async function(file) {
        if (fs.statSync(path + "/" + file).isDirectory()) {
            // console.warn("-- Console BEF", path + "/" + file);
            // let sz = await gen.getSize(path + "/" + file);
            pathsList.push(path + "/" + file); //{ path: path + "/" + file, size: sz })
        }
    });
    let scriptsZ = {};
    await asyncForEach(pathsList, async num => {
        await new Promise(resolve => {
            gen.getSize(num, true).then(e => {
                scriptsZ[num.replace(path + "/", "")] = e;
                resolve(e);
            });
        });
    });

    let sizedDe = Object.keys(scriptsZ)
        .sort((a, b) => {
            return parseInt(scriptsZ[a]) - parseInt(scriptsZ[b]);
        })
        .map(e => {
            let calcd = (scriptsZ[e] / 1024 / 1024).toFixed(2) + " MB";
            return { name: e, rawSize: scriptsZ[e], size: calcd };
        });

    await writeJson("sozed.json", sizedDe);
    configManager.set("dependenciesFolders", scriptsZ);
    return pathsList;
}

gen.start = async depsArr => {
    let depsFinal = [];

    await asyncForEach(depsArr, async num => {
        await new Promise(resolve => {
            fetch(num) //https://registry.npmjs.org/check
                .then(function(response) {
                    if (response.status >= 400) {
                        console.log("HAD TO SKI", response.url);
                        resolve();
                    }
                    return response.json();
                })
                .then(function(data) {
                    let start = parseInt(data.size);
                    if (data.dependencySizes) {
                        data.dependencySizes.forEach(sz => {
                            start += parseInt(sz.approximateSize);
                        });
                    }
                    if (start) {
                        console.warn("!!!!" + num, prettyBytes(start));
                        depsFinal.push({
                            name: num,
                            rawSize: start,
                            filesize: prettyBytes(start)
                        });
                    }
                    resolve(data);
                });
        });
    });
    let previous = configManager.get("dependenciesWeight");
    if (previous !== undefined) {
        depsFinal = depsFinal.concat(previous);
    }
    configManager.set("dependenciesWeight", depsFinal);
    console.log("Done");
};
var CLI = require("clui"),
    clear = CLI.Clear,
    clc = require("cli-color");

var Line = CLI.Line,
    Gauge = CLI.Gauge;
gen.init = async (recalc = false, draw = true) => {
    await configManager.init();
    await getDirectories(path.join(projectDir, "node_modules"));

    if (draw) {
        gen.drawLines();
    }
    if (recalc) {
        try {
            gen.packageJson = await readJson(packagePath);
            let depList = Object.keys(gen.packageJson.dependencies).map(dep => {
                return `https://bundlephobia.com/api/size?package=${dep}&record=true`;
            });
            let depDevList = Object.keys(gen.packageJson.devDependencies).map(dep => {
                return `https://bundlephobia.com/api/size?package=${dep}&record=true`;
            });
            let runOn = depList.concat(depDevList);
            await gen.start(runOn);
            gen.drawLines();
        } catch (err) {
            console.error(err);
        }
    }
};

gen.drawLines = async () => {
    let final = 0;
    let zzz = configManager.get("dependenciesFolders");
    console.warn("-- Console dd", zzz);
    zzz = Object.keys(zzz).map(e => {
        return { name: e, rawSize: zzz[e] };
    });
    let longest = 0;
    let highlightedDeps = zzz.sort((a, b) => {
        let nmken = a.name.trim().length;
        longest = longest < nmken ? nmken : longest;
        return parseInt(a.rawSize) - parseInt(b.rawSize);
    });
    highlightedDeps = highlightedDeps.slice(-15);
    // Creates an array with 10 colors, darkened and washed out:
    let colorsBg = rainbowGradient(highlightedDeps.length, 0.77, 0.2).slice();
    let colorsFr = rainbowGradient(highlightedDeps.length, 0.5, 1);

    let ddd = configManager.get("dependenciesWeight");
    ddd = ddd.filter(e => !isNaN(parseInt(e.rawSize)));
    longest = 0;
    let highlightedPacks = ddd.sort((a, b) => {
        let nmken = a.name
            .replace("https://bundlephobia.com/api/size?package=", "")
            .replace("&record=true", "")
            .trim().length;
        longest = longest < nmken ? nmken : longest;
        return parseInt(a.rawSize) - parseInt(b.rawSize);
    });
    highlightedPacks = highlightedPacks.slice(-15);
    // Creates an array with 10 colors, darkened and washed out:
    highlightedPacks.forEach((e, inzz) => {
        var Gauge = CLI.Gauge;
        var total = 200;
        var used = e.rawSize / 100000;
        new Line()
            .padding(2)
            .column(
                chalk.bold(
                    `☁ ` +
                        e.name
                            .replace("https://bundlephobia.com/api/size?package=", "")
                            .replace("&record=true", "")
                            .trim()
                            .padEnd(longest + 2, " ") +
                        "\t "
                ),
                20,
                [clc.bold.magenta]
            )
            .column(
                Gauge(
                    used,
                    total,
                    longest,
                    total * 0.8,
                    chalk
                        .bgRgb(colorsBg[inzz][0], colorsBg[inzz][1], colorsBg[inzz][2])
                        .rgb(colorsFr[inzz][0], colorsFr[inzz][1], colorsFr[inzz][2])
                        .bold.underline(" " + prettyBytes(e.rawSize) + " ")
                )
            )
            .fill()
            .output();
        let bb = highlightedDeps[inzz];
        new Line()
            .padding(2)
            .column(chalk.bold(`📁 ` + bb.name.trim().padEnd(longest + 2, " ") + "\t "), 20, [
                clc.bold.cyan
            ])
            .column(
                Gauge(
                    used,
                    total,
                    longest,
                    total * 0.8,
                    chalk
                        .bgRgb(colorsBg[inzz][0], colorsBg[inzz][1], colorsBg[inzz][2])
                        .rgb(colorsFr[inzz][0], colorsFr[inzz][1], colorsFr[inzz][2])
                        .bold.underline(" " + prettyBytes(bb.rawSize) + " ")
                )
            )
            .fill()
            .output();
        // new Line().fill().output();
        // });
        // zzz.forEach(e => {
        //     if (!isNaN(parseInt(e.rawSize))) {
        //         final += parseInt(e.rawSize);
        //     }
        // });
        new Line().fill().output();
    });
    ddd.forEach(e => {
        if (!isNaN(parseInt(e.rawSize))) {
            final += parseInt(e.rawSize);
        }
    });
    let nodeFold = await gen.getSize(path.join(projectDir, "node_modules"));
    console.warn(
        `${chalk.green("Total estimated node_module packages:")}\t${chalk.underline.bold.red(
            prettyBytes(final)
        )}\n${chalk.green("Total node_modules size:")}\t\t${chalk.underline.bold.red(nodeFold)}`
    );
};

module.exports = gen;

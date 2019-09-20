const fs = require("fs-extra");
const chalk = require("chalk");
const boxen = require("boxen");
const ONE_SIXTH = 1 / 6;
const ONE_THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;
const utils = {};

/**
 * Output json file
 * @param f - file name with directory
 * @return {boolean}
 * @example
 const file = "/tmp/this/path/does/not/exist/file.json";
 removeFile(file);
 */
utils.emptyDir = async f => {
    try {
        await fs.emptyDir(f);
        // console.log(`${chalk.green.underline("Directory")} ${chalk.bold(f)} emptied!`);
    } catch (err) {
        console.error(err);
    }
};

const desiredMode = 0o2775;
const defaultOptions = {
    mode: desiredMode
};
utils.ensureDir = async (directory, options = defaultOptions) => {
    try {
        await fs.ensureDir(directory, options);
    } catch (err) {
        console.error(err);
    }
};

utils.ensureFile = async f => {
    try {
        await fs.ensureFile(f);
    } catch (err) {
        console.error(err);
    }
};

/**
 * Ensure path exists with dirs
 * @param f the file path
 * @return {boolean}
 * @example
 const file = ".fsr/config.json";
 pathExists(file);
 */
utils.pathExists = async f => {
    const exists = await fs.pathExists(f);

    return exists;
};

/**
 * Read json file
 * @param f - file name with directory
 * @return {Promise<void>}
 * @example
 const file = "/tmp/this/path/does/not/exist/file.json";
 outputJson(file);
 */
utils.readJson = async f => {
    try {
        const packageObj = await fs.readJson(f);
        // console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} read!`);
        return packageObj;
    } catch (err) {
        console.error(err);
        return {};
    }
};

utils.readFile = async f => {
    try {
        let fl = await fs.readFileSync(f, "utf8");
        return fl;
    } catch (err) {
        console.error(err);
        return {};
    }
};

utils.removeFile = async f => {
    try {
        // console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} removed!`);
        return await fs.remove(f);
    } catch (err) {
        console.error(`File ${f} NOT REMOVED! ${err}`);
        return false;
    }
};

/**
 * Write file
 * @param f - file name with directory
 * @param contents - text inside the file
 * @return {Promise<void>}
 * @example
 const file = "/tmp/this/path/does/not/exist/file.json";
 writeFile(file);
 */
utils.writeFile = async (f, contents = "") => {
    try {
        return await fs.outputFile(f, contents);
        // console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} written!`);
    } catch (err) {
        console.error(err);
    }
};

utils.writeJson = async (f, json = {}) => {
    try {
        await fs.writeJson(f, json);
        // console.log(`${chalk.green.underline("File")} ${chalk.bold(f)} written!`);
    } catch (err) {
        console.error(err);
    }
};

utils.chainAsync = fns => {
    let curr = 0;
    const last = fns[fns.length - 1];
    const next = () => {
        const fn = fns[curr++];
        fn === last ? fn() : fn(next);
    };
    next();
};

utils.appendToFile = async (f, contents = "") => {
    try {
        await fs.appendFileSync(f, contents);
    } catch (err) {
        console.error(err);
    }
};

utils.boxInform = async (
    msg,
    secondary = "",
    padding = 0,
    margin = { left: 2, top: 0, bottom: 0, right: 0 }
) => {
    console.log(
        boxen(
            chalk.hex("#717877")(msg) +
                "\n" +
                chalk.bold.underline.hex("#438b34")(secondary) +
                chalk.hex("#717877")(" "),
            {
                padding,
                margin,
                borderStyle: {
                    topLeft: chalk.hex("#5a596d")("╔"),
                    topRight: chalk.hex("#5a596d")("╗"),
                    bottomLeft: chalk.hex("#5a596d")("╚"),
                    bottomRight: chalk.hex("#5a596d")("╝"),
                    horizontal: chalk.hex("#5a596d")("═"),
                    vertical: chalk.hex("#5a596d")("║")
                }, //"round",
                align: "center" //,
            }
        )
    );
};

const hue2rgb = (p, q, t) => {
    if (t < 0) {
        t += 1;
    }
    if (t > 1) {
        t -= 1;
    }
    if (t < ONE_SIXTH) {
        return p + (q - p) * 6 * t;
    }
    if (t < 0.5) {
        return q;
    }
    if (t < TWO_THIRDS) {
        return p + (q - p) * (TWO_THIRDS - t) * 6;
    }
    return p;
};

const hsl2rgb = (h, s, l) => {
    if (s === 0) {
        return new Array(3).fill(l);
    }
    const q = l < 0.5 ? l * s + l : l + s - l * s;
    const p = 2 * l - q;
    return [hue2rgb(p, q, h + ONE_THIRD), hue2rgb(p, q, h), hue2rgb(p, q, h - ONE_THIRD)];
};

utils.rainbowGradient = (len, saturation = 1, lightness = 0.5) => {
    const gradient = [];
    for (let x = 0; x < len; x++) {
        gradient.push(hsl2rgb(x / len, saturation, lightness).map(c => Math.round(c * 255)));
    }
    return gradient;
};

// utils.emptyDir = async () => {};
module.exports = utils;

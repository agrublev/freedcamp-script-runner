const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const requireFromString = require("require-from-string");

const runJs = async script => {
    return new Promise((resolve, reject) => {
        let res;
        try {
            res = requireFromString(script, path.join(process.cwd(), "./"));
        } catch (err) {
            console.log(`${chalk.bold.red(err)}`);
            // resolve();
        }
        res = res.default || res;
        return resolve(
            typeof res === "function"
                ? Promise.resolve(res()).catch(e => console.log(`${chalk.bold.red(e)}`))
                : res
        );
    });
};

/**
 * EXAMPLES
 runJs(`
 const fs = require("fs");
 module.exports = function(){
	console.log(5252);
	fs.writeFileSync("awesome.json", JSON.stringify({"soAwesome":"!!!!!!"}), "utf8");
}
 `);


 runJs(`
 const fs = require("fs");
 console.warn("RUNS JS");
 console.warn("RUNS JS");
 console.warn("RUNS JS");
 console.warn("RUNS JS",5252);
 `);
 */

module.exports = runJs;

const chalk = require("chalk");
const argv = require("yargs").argv;

(async function() {

    console.log(`${chalk.green("PRE --- TEST 52")} ${process.argv.slice(2)} ${JSON.stringify(argv)}`);

    await new Promise(resolve => {
        setTimeout(() => {
            console.log(`${chalk.green("ATTT --- TEST 52")}`);
            resolve();
        }, 3500);
    });
    console.log(`${chalk.green("POST --- TEST 52")}`);
})();

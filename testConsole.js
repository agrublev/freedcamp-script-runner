const chalk = require("chalk");

(async function() {
    console.log(`${chalk.green("PRE --- TEST 52")}`);

    await new Promise(resolve => {
        setTimeout(() => {
            console.log(`${chalk.green("ATTT --- TEST 52")}`);
            resolve();
        }, 3500);
    });
    console.log(`${chalk.green("POST --- TEST 52")}`);
})();

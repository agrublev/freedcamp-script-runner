const fkill = require("fkill");

const kill = async () => {
    try {
        await fkill(":1234");
    } catch (e) {
        console.log("ERROR", e);
        process.exit(0);
    }
};
// kill().then(() => {
//     console.log("DONE");
// });
module.exports = kill;
//
// fkill([1337, 'Safari', ':8080']);

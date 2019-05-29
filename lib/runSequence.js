const runCLICommand = require("./runCLICommand");
const chalk = require("chalk");

const runSequence = async (tasks, FcScripts) => {
    for (let t in tasks) {
        let taskName = tasks[t];
        let taskIndex = FcScripts.allTasks.findIndex(t => t.name === taskName);
        if (taskIndex === -1) {
            console.log(
                `${chalk.red.underline(
                    "Skipping task " + taskName + ", as it cannot be found in .md file"
                )}`
            );
        } else {
            let script = FcScripts.allTasks[taskIndex].script;
            let params = script.split(" ");
            let type = params.shift();
            await runCLICommand({
                task: { name: taskName },
                script: {
                    type: type,
                    rest: params
                }
            });
        }
    }
};

module.exports = runSequence;
// (async () => {
//     await startScripts();
// })();

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
            let pars = script.split(" ");
            let type = pars[0];
            let env = {};
            if (pars[0].includes("=")) {
                let envs = type.split("=");
                env[envs[0]] = envs[1];
                type = pars[1];
                pars.shift();
                pars.shift();
                script = pars.join(" ");
            } else {
                pars.shift();
                script = pars.join(" ");
            }
            await runCLICommand({
                task: { name: taskName },
                script: {
                    type: type,
                    rest: script.split(" "),
                    env: env
                }
            });
        }
    }
};

module.exports = runSequence;
// (async () => {
//     await startScripts();
// })();

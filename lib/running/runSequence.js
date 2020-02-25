const runCLICommand = require("./runCLICommand");
const chalk = require("chalk");

const runSequence = async (tasks, FcScripts) => {
    for (let t in tasks) {
        let taskName = tasks[t];
        const taskData = FcScripts.allTasks.find(z => z.name === taskName);
        if (!taskData) {
            console.error(`${chalk.bold.underline.red("Task not found")}`);
        } else {
            let { script, lang } = taskData;
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
                    lang: lang,
                    env: env,
                    type: type,
                    full: script,
                    rest: script.split(" ")
                }
            });
        }
    }
};

module.exports = runSequence;

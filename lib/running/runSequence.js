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
            let type = script.split(" ");

            await runCLICommand({
                task: { name: taskName },
                script: {
                    lang: lang,
                    type: type.shift(),
                    full: script,
                    rest: script.split(" ").slice(1)
                }
            });
        }
    }
};

module.exports = runSequence;

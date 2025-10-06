import runCLICommand from "./runCLICommand.js";
import chalk from "chalk";

const runParallel = async (tasks, FcScripts) => {
    const promises = tasks.map(async taskName => {
        return new Promise(async resolve => {
            const taskData = FcScripts.allTasks.find(z => z.name === taskName);
            if (!taskData) {
                console.error(`${chalk.bold.underline.red("Task not found")}`);
                resolve();
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
                resolve();
            }
        });
    });

    let results = await Promise.all(promises);
};

export default runParallel;

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

                if (lang === "javascript") {
                    // For JavaScript, use the script as-is without parsing
                    await runCLICommand({
                        task: { name: taskName },
                        script: {
                            lang: lang,
                            env: {},
                            type: "node",
                            full: script,
                            rest: []
                        }
                    });
                    resolve();
                } else {
                    // For bash scripts, parse command and environment variables
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
                    resolve();
                }
            }
        });
    });

    let results = await Promise.all(promises);
};

export default runParallel;

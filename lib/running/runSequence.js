import runCLICommand from "./runCLICommand.js";
import chalk from "chalk";

const runSequence = async (tasks, FcScripts) => {
    for (let t in tasks) {
        let taskName = tasks[t];
        const taskData = FcScripts.allTasks.find(z => z.name === taskName);
        if (!taskData) {
            console.error(`${chalk.bold.underline.red("Task not found")}`);
        } else {
            let { script, lang } = taskData;

            try {
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
                }
            } catch (error) {
                // Silently catch errors to allow sequential execution to continue
                // Error logging is handled by runCLICommand
            }
        }
    }
};

export default runSequence;

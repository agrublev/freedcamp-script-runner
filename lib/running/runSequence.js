import chalk from "chalk";
import runCLICommand from "./runCLICommand.js";
import requireFromString from "require-from-string";
import { fireHook } from "../plugins/hooks.js";

/**
 * Run tasks sequentially (one after another).
 *
 * Options:
 *   stopOnError: boolean   — stop the sequence when a task fails (default true)
 *   restartTries: number   — retry failed tasks N times before failing (default 0)
 *   restartDelay: number|'exponential' — delay between retries in ms (default 0)
 *   quiet: boolean         — suppress per-task header (default false)
 *   cwd: string            — working directory override
 */
const runSequence = async (tasks, FcScripts, options = {}) => {
    const {
        stopOnError = true,
        restartTries = 0,
        restartDelay = 0,
        quiet = false
    } = options;

    let anyFailed = false;

    for (const taskName of tasks) {
        const taskData = FcScripts.allTasks.find(z => z.name === taskName);
        if (!taskData) {
            console.error(`${chalk.bold.underline.red("Task not found:")} ${taskName}`);
            if (stopOnError) break;
            anyFailed = true;
            continue;
        }

        const { script, lang } = taskData;

        if (lang === "javascript") {
            const start = Date.now();
            try {
                requireFromString(script, "./fscripts.md");
                await fireHook("post-task", { taskName, duration: Date.now() - start, success: true });
            } catch (err) {
                await fireHook("task-error", { taskName, duration: Date.now() - start, error: err });
                console.error(chalk.red(`[run-s] "${taskName}" threw: ${err.message}`));
                anyFailed = true;
                if (stopOnError) break;
            }
            continue;
        }

        // Shell task — parse env prefix (e.g. "ENV=val cmd args")
        const pars = script.trim().split(/\s+/);
        const env = {};
        let startIdx = 0;

        while (startIdx < pars.length && pars[startIdx].includes("=") && !pars[startIdx].startsWith("-")) {
            const [key, ...vals] = pars[startIdx].split("=");
            env[key] = vals.join("=");
            startIdx++;
        }

        const type = pars[startIdx];
        const rest = pars.slice(startIdx + 1).join(" ");

        const result = await runCLICommand(
            {
                task: { name: taskName },
                script: {
                    lang,
                    env,
                    type,
                    full: rest,
                    rest: rest.split(" ")
                }
            },
            { quiet, restartTries, restartDelay }
        );

        if (result && result.exitCode !== 0) {
            anyFailed = true;
            if (stopOnError) {
                console.error(chalk.red(`[run-s] stopping sequence — "${taskName}" failed with exit code ${result.exitCode}`));
                break;
            }
        }
    }

    return { success: !anyFailed };
};

export default runSequence;

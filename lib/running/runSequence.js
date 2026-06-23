import chalk from "chalk";
import runCLICommand from "./runCLICommand.js";
import { ManagedProcess } from "./processManager.js";
import { fireHook } from "../plugins/hooks.js";
import prettyMs from "pretty-ms";

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
        quiet = false,
        cwd
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

        if (lang === "javascript" || lang === "js") {
            // Spawn as a child node process so async IIFEs complete before moving on
            const result = await runJsTask(taskName, script, { restartTries, restartDelay, cwd });
            if (result.exitCode !== 0) {
                await fireHook("task-error", { taskName, duration: result.duration, error: new Error(`exit code ${result.exitCode}`) });
                anyFailed = true;
                if (stopOnError) {
                    console.error(chalk.red(`[run-s] stopping sequence — "${taskName}" failed`));
                    break;
                }
            } else {
                await fireHook("post-task", { taskName, duration: result.duration, success: true });
            }
            continue;
        }

        // Shell task — parse leading ENV=val pairs
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
                script: { lang, env, type, full: rest, rest: rest.split(" ") }
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

// Spawn a JS script as a child node process and await its exit
function runJsTask(taskName, script, { restartTries = 0, restartDelay = 0, cwd } = {}) {
    const escaped = script.replace(/'/g, `'\\''`);
    const proc = new ManagedProcess({
        command: `node -e '${escaped}'`,
        name: taskName,
        index: 0,
        env: {},
        prefixColor: "cyan",
        restartTries,
        restartDelay,
        cwd
    });

    return new Promise(resolve => {
        proc.on("close", event => resolve({ exitCode: event.exitCode, duration: proc.duration }));
        proc.start();
    });
}

export default runSequence;

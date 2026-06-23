import chalk from "chalk";
import requireFromString from "require-from-string";
import { fireHook } from "../plugins/hooks.js";
import { ProcessManager, buildProcess } from "./processManager.js";

/**
 * Run tasks in parallel with concurrently-style process management.
 *
 * Options:
 *   killOthers: string[]    — ['failure'] | ['success'] | both; default: ['failure']
 *   restartTries: number    — how many times to restart a failed process (default 0)
 *   restartDelay: number|'exponential' — ms between restarts (default 0)
 *   maxProcesses: number    — concurrency cap / sliding window (default unlimited)
 *   timings: boolean        — print timing table on completion (default false)
 *   killSignal: string      — signal to send (default 'SIGTERM')
 *   successCondition: string — 'all' | 'first' | 'last' (default 'all')
 *   cwd: string             — working directory override
 */
const runParallel = async (tasks, FcScripts, options = {}) => {
    const {
        killOthers = ["failure"],
        restartTries = 0,
        restartDelay = 0,
        maxProcesses = Infinity,
        timings = false,
        killSignal = "SIGTERM",
        cwd
    } = options;

    // Separate JS tasks (run inline) from shell tasks
    const jsTasks = [];
    const shellTasks = [];

    tasks.forEach((taskName, index) => {
        const taskData = FcScripts.allTasks.find(z => z.name === taskName);
        if (!taskData) {
            console.error(`${chalk.bold.underline.red("Task not found:")} ${taskName}`);
            return;
        }
        if (taskData.lang === "javascript") {
            jsTasks.push({ taskName, taskData });
        } else {
            shellTasks.push({ taskName, taskData, index });
        }
    });

    // Run JS tasks sequentially (they run in-process, can't truly parallel)
    for (const { taskName, taskData } of jsTasks) {
        const start = Date.now();
        try {
            requireFromString(taskData.script, "./fscripts.md");
            await fireHook("post-task", { taskName, duration: Date.now() - start, success: true });
        } catch (err) {
            await fireHook("task-error", { taskName, duration: Date.now() - start, error: err });
        }
    }

    if (shellTasks.length === 0) return { success: true };

    // Build ManagedProcess for each shell task
    const processes = shellTasks.map(({ taskName, taskData, index }, i) =>
        buildProcess(taskName, taskData, i, { restartTries, restartDelay, cwd })
    );

    const manager = new ProcessManager(processes, {
        killOthers,
        killSignal,
        maxProcesses,
        timings
    });

    const { success, closeEvents } = await manager.run();

    if (!success) {
        const failed = closeEvents.filter(e => e.exitCode !== 0 && !e.killed);
        failed.forEach(e => {
            console.error(chalk.red(`[run-p] "${e.process.name}" failed with exit code ${e.exitCode}`));
        });
    }

    return { success, closeEvents };
};

export default runParallel;

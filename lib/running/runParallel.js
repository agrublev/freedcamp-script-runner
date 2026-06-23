import chalk from "chalk";
import { fireHook } from "../plugins/hooks.js";
import { ManagedProcess, ProcessManager, buildProcess, PREFIX_COLORS } from "./processManager.js";

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
        prefixColors,
        cwd
    } = options;

    const allProcesses = [];
    let procIndex = 0;

    tasks.forEach(taskName => {
        const taskData = FcScripts.allTasks.find(z => z.name === taskName);
        if (!taskData) {
            console.error(`${chalk.bold.underline.red("Task not found:")} ${taskName}`);
            return;
        }

        const i = procIndex++;
        const prefixColor =
            (prefixColors && prefixColors[i]) ||
            taskData.color ||
            PREFIX_COLORS[i % PREFIX_COLORS.length];

        if (taskData.lang === "javascript" || taskData.lang === "js") {
            // Spawn JS tasks as child node processes so they run truly in parallel
            // and async top-level IIFEs resolve correctly
            const escaped = taskData.script.replace(/'/g, `'\\''`);
            allProcesses.push(new ManagedProcess({
                command: `node -e '${escaped}'`,
                name: taskName,
                index: i,
                env: {},
                prefixColor,
                restartTries,
                restartDelay,
                cwd
            }));
        } else {
            allProcesses.push(buildProcess(taskName, taskData, i, { restartTries, restartDelay, cwd, prefixColors }));
        }
    });

    if (allProcesses.length === 0) return { success: true };

    const manager = new ProcessManager(allProcesses, {
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

    // Fire hooks for each process after completion
    for (const event of closeEvents) {
        if (!event.killed) {
            if (event.exitCode === 0) {
                await fireHook("post-task", { taskName: event.process.name, duration: event.process.duration, success: true });
            } else {
                await fireHook("task-error", { taskName: event.process.name, duration: event.process.duration, error: new Error(`exit code ${event.exitCode}`) });
            }
        }
    }

    return { success, closeEvents };
};

export default runParallel;

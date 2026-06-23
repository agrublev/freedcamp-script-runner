import chalk from "chalk";
import path from "path";
import moment from "moment-mini";
import spawn from "cross-spawn";
import treeKill from "tree-kill";
import requireFromString from "require-from-string";
import { fireHook } from "../plugins/hooks.js";
import prettyMs from "pretty-ms";

/**
 * Run a single CLI command with:
 * - colored timestamp prefix
 * - exit-code tracking
 * - optional retry (restartTries / restartDelay)
 * - tree-kill for clean process-tree teardown
 * - hook firing on success and error
 */
export default async function runCLICommand({ script, task, type = script.type }, options = {}) {
    const {
        quiet = false,
        restartTries = 0,
        restartDelay = 0   // ms or "exponential"
    } = options;

    if (!quiet) {
        process.stdout.write(
            `${chalk.green.bgHex("#181c24").bold("[" + moment().format("HH:mm:ss") + "]")}` +
            `${chalk.bgHex("#181c24").bold.hex("#8c91a7")(" " + task.name + ": ")}\n`
        );
    }

    if (script.lang === "javascript") {
        const start = Date.now();
        try {
            requireFromString(script.full, "./fscripts.md");
            await fireHook("post-task", { taskName: task.name, duration: Date.now() - start, success: true });
        } catch (err) {
            await fireHook("task-error", { taskName: task.name, duration: Date.now() - start, error: err });
            throw err;
        }
        return { exitCode: 0 };
    }

    const command = [type, script.full].filter(Boolean).join(" ").trim();

    const spawnEnv = Object.assign({}, process.env, {
        FORCE_COLOR: "1",
        PATH: `${path.resolve("node_modules/.bin")}:${process.env.PATH}`,
        ...script.env
    });

    let attempt = 0;

    const runOnce = () =>
        new Promise((resolve) => {
            const start = Date.now();
            const proc = spawn(command, [], {
                stdio: "inherit",
                shell: true,
                env: spawnEnv
            });

            // Allow callers to kill via SIGINT propagation
            const onSignal = () => {
                if (proc.pid) treeKill(proc.pid, "SIGTERM");
            };
            process.once("SIGINT", onSignal);

            proc.on("error", async (err) => {
                process.removeListener("SIGINT", onSignal);
                const duration = Date.now() - start;
                await fireHook("task-error", { taskName: task.name, duration, error: err });
                resolve({ exitCode: 1, error: err });
            });

            proc.on("close", async (code) => {
                process.removeListener("SIGINT", onSignal);
                const duration = Date.now() - start;
                if (code !== 0) {
                    console.error(chalk.red(`ERROR exit ${code} [${task.name}] (${prettyMs(duration)})`));
                    await fireHook("task-error", { taskName: task.name, duration, error: new Error(`exit code ${code}`) });
                } else {
                    await fireHook("post-task", { taskName: task.name, duration, success: true });
                }
                resolve({ exitCode: code, duration });
            });
        });

    let lastResult;
    do {
        lastResult = await runOnce();

        if (lastResult.exitCode !== 0 && attempt < restartTries) {
            attempt++;
            const delay = restartDelay === "exponential"
                ? Math.pow(2, attempt - 1) * 1000
                : restartDelay;

            if (delay > 0) {
                console.log(chalk.yellow(`[${task.name}] restarting (attempt ${attempt}/${restartTries}) in ${prettyMs(delay)}`));
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.log(chalk.yellow(`[${task.name}] restarting (attempt ${attempt}/${restartTries})`));
            }
        } else {
            break;
        }
    } while (attempt <= restartTries);

    return lastResult;
}

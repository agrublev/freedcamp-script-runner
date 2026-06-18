import chalk from "chalk";
import path from "path";
import moment from "moment-mini";
import { randomBytes } from "crypto";
import { writeFile, rm } from "fs/promises";
import { pathToFileURL } from "url";
import spawn from "cross-spawn";
import { fireHook } from "../plugins/hooks.js";
import fsrLog from "../utils/console.js";

/**
 * Execute a JavaScript task block as an ES module.
 *
 * The block is written to a temporary `.mjs` file in the project root and
 * imported, which (unlike `require`) supports top-level `await`, ESM `import`,
 * and relative imports resolved from the current working directory.
 */
const runJavascript = async (script, task, start) => {
    const tmp = path.join(process.cwd(), `.fsr-task-${randomBytes(6).toString("hex")}.mjs`);
    try {
        await writeFile(tmp, script.full, "utf8");
        await import(pathToFileURL(tmp).href);
        await fireHook("post-task", {
            taskName: task.name,
            duration: Date.now() - start,
            success: true
        });
    } catch (err) {
        fsrLog.error(`${chalk.red("ERROR")} ${err.message}`);
        await fireHook("task-error", {
            taskName: task.name,
            duration: Date.now() - start,
            error: err
        });
    } finally {
        await rm(tmp, { force: true });
    }
};

export default async ({ script, task, type = script.type }, quiet = false) => {
    if (!quiet) {
        fsrLog.log(
            `${chalk.green
                .bgHex("#181c24")
                .bold("[" + moment().format("HH:mm:ss") + "]")}${chalk
                .bgHex("#181c24")
                .bold.hex("#8c91a7")(" " + task.name + ": ")}`
        );
    }
    const start = Date.now();

    if (script.lang === "javascript") {
        await runJavascript(script, task, start);
        return;
    }

    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
        };

        const command = [type, script.full].filter(Boolean).join(" ").trim();
        const cmd = spawn(command, [], {
            stdio: "inherit",
            shell: true,
            env: Object.assign({}, process.env, {
                FORCE_COLOR: "1",
                PATH: `${path.resolve("node_modules/.bin")}${path.delimiter}${process.env.PATH}`,
                ...script.env
            })
        });

        cmd.on("error", async (err) => {
            fsrLog.error(`${chalk.red("ERROR")} ${err.message}`);
            await fireHook("task-error", {
                taskName: task.name,
                duration: Date.now() - start,
                error: err
            });
            finish();
        });

        cmd.on("close", async (code) => {
            const duration = Date.now() - start;
            if (code !== 0) {
                fsrLog.error(`${chalk.red("ERROR")} exit code ${code}`);
                await fireHook("task-error", {
                    taskName: task.name,
                    duration,
                    error: new Error(`exit code ${code}`)
                });
            } else {
                await fireHook("post-task", { taskName: task.name, duration, success: true });
            }
            finish();
        });
    });
};

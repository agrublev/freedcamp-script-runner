import chalk from "chalk";
import path from "path";
import moment from "moment-mini";
import spawn from "cross-spawn";
import requireFromString from "require-from-string";
import { fireHook } from "../plugins/hooks.js";

export default async ({ script, task, type = script.type }, quiet = false) => {
    if (!quiet) {
        console.log(
            `${chalk.green
                .bgHex("#181c24")
                .bold("[" + moment().format("HH:MM:SS") + "]")}${chalk
                .bgHex("#181c24")
                .bold.hex("#8c91a7")(" " + task.name + ": ")}`
        );
    }
    const start = Date.now();
    return new Promise(resolve => {
        if (script.lang === "javascript") {
            requireFromString(script.full, "./fscripts.md");
            fireHook("post-task", { taskName: task.name, duration: Date.now() - start, success: true });
            resolve();
        } else {
            const command = [type, script.full].filter(Boolean).join(" ").trim();
            const cmd = spawn(command, [], {
                stdio: "inherit",
                shell: true,
                env: Object.assign({}, process.env, {
                    FORCE_COLOR: true,
                    PATH: `${path.resolve("node_modules/.bin")}:${process.env.PATH}`,
                    ...script.env
                })
            });

            cmd.on("close", async code => {
                const duration = Date.now() - start;
                if (code !== 0) {
                    console.error(`${chalk.red("ERROR")} ${code} runCli`);
                    await fireHook("task-error", { taskName: task.name, duration, error: new Error(`exit code ${code}`) });
                } else {
                    await fireHook("post-task", { taskName: task.name, duration, success: true });
                }
                resolve();
            });
        }
    });
};

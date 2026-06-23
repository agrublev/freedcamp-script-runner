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
 *
 * Any key/value pairs in `script.env` are temporarily overlaid onto
 * `process.env` before the import so that the JS block sees the same
 * environment-variable values (e.g. `NODE_ENV`, `FSR_ENV`) that bash tasks
 * receive via the `spawn` env option.  The original values are restored in
 * the `finally` block so that subsequent tasks are not affected.
 */
const runJavascript = async (script, task, start) => {
    const tmp = path.join(process.cwd(), `.fsr-task-${randomBytes(6).toString("hex")}.mjs`);

    // Overlay script.env onto process.env (e.g. NODE_ENV / FSR_ENV from --env).
    const envOverrides = script.env || {};
    const savedEnv = {};
    for (const key of Object.keys(envOverrides)) {
        savedEnv[key] = process.env[key];
        process.env[key] = envOverrides[key];
    }

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
        // Restore env vars so later tasks are not affected.
        for (const key of Object.keys(savedEnv)) {
            if (savedEnv[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = savedEnv[key];
            }
        }
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
    await fireHook("pre-task", { taskName: task.name });

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

        // Resolve the path to *this* running fsr executable (works for both
        // global `npm i -g fscr` and local installs). We use it to guarantee
        // that "fsr" (and "yarn fsr"/"npm fsr") tasks can find the CLI even
        // when it is not present in the current project's node_modules/.bin.
        const invokedScript = process.argv[1] || "";
        const isFsrBin =
            /[/\\]fsr(?:\.[cm]?js)?$/.test(invokedScript) ||
            /[/\\]bin[/\\]fsr$/.test(invokedScript) ||
            /[/\\]fscr[/\\]bin$/.test(invokedScript) ||
            (/fscr/.test(invokedScript) && /[/\\]fsr$/.test(invokedScript));
        let selfFsr = isFsrBin ? invokedScript : null;

        // Also support the common dev invocation: `node dist/index.js` or similar.
        // In that case we can re-spawn using the same node + script for "fsr sub" tasks.
        if (!selfFsr && /[/\\]index\.(?:js|mjs|cjs)$/.test(invokedScript)) {
            selfFsr = invokedScript; // we'll prefix with node when using it
        }

        let command = [type, script.full].filter(Boolean).join(" ").trim();

        if (selfFsr) {
            const isDirectIndex = /[/\\]index\.(?:js|mjs|cjs)$/.test(selfFsr);
            const selfCmd = isDirectIndex ? `${process.execPath} ${selfFsr}` : selfFsr;

            if (type === "fsr") {
                // Bare "fsr subcmd ..." → invoke the exact same entry we are running.
                const rest = script.full || "";
                command = [selfCmd, rest].filter(Boolean).join(" ").trim();
            } else if (/^(yarn|npm|pnpm|npx|bun)$/.test(type) && /^fsr(\s|$)/.test(script.full || "")) {
                // "yarn fsr sub ...", "npm fsr ...", "pnpm fsr ...", etc.
                // Bypass the runner's local bin lookup (which emits "Command 'fsr' not found."
                // when fsr is only installed globally) and run the current fsr directly.
                const rest = (script.full || "").replace(/^fsr\s*/, "");
                command = [selfCmd, rest].filter(Boolean).join(" ").trim();
            }
        }

        const localBin = path.resolve("node_modules/.bin");
        const pathParts = [localBin];
        if (selfFsr) {
            const selfDir = path.dirname(selfFsr);
            if (!pathParts.includes(selfDir)) pathParts.push(selfDir);
        }
        const childPATH = [...pathParts, process.env.PATH || ""]
            .filter(Boolean)
            .join(path.delimiter);

        const cmd = spawn(command, [], {
            stdio: "inherit",
            shell: true,
            env: Object.assign({}, process.env, {
                FORCE_COLOR: "1",
                PATH: childPATH,
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

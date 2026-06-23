import { EventEmitter } from "events";
import chalk from "chalk";
import path from "path";
import spawn from "cross-spawn";
import treeKill from "tree-kill";
import prettyMs from "pretty-ms";

// Color cycle matching concurrently defaults
const PREFIX_COLORS = ["cyan", "magenta", "green", "yellow", "blue", "red", "white"];

const STATES = {
    STOPPED: "stopped",
    STARTED: "started",
    EXITED: "exited",
    ERRORED: "errored",
    RESTARTING: "restarting"
};

class ManagedProcess extends EventEmitter {
    constructor({ command, name, index, env = {}, cwd, prefixColor, restartTries = 0, restartDelay = 0 }) {
        super();
        this.command = command;
        this.name = name;
        this.index = index;
        this.env = env;
        this.cwd = cwd || process.cwd();
        this.prefixColor = prefixColor || PREFIX_COLORS[index % PREFIX_COLORS.length];
        this.restartTries = restartTries;
        this.restartDelay = restartDelay;

        this.state = STATES.STOPPED;
        this.pid = null;
        this.exitCode = null;
        this.killed = false;
        this.startTime = null;
        this.endTime = null;
        this._attempt = 0;
        this._proc = null;
    }

    get prefix() {
        const color = chalk[this.prefixColor] || chalk.white;
        return color(`[${this.name || this.index}]`);
    }

    get duration() {
        if (!this.startTime) return 0;
        return (this.endTime || Date.now()) - this.startTime;
    }

    _log(line) {
        process.stdout.write(`${this.prefix} ${line}\n`);
    }

    _logEvent(text) {
        const color = chalk[this.prefixColor] || chalk.white;
        process.stdout.write(`${this.prefix} ${color(text)}\n`);
    }

    start() {
        if (this.killed) return;

        this.state = STATES.STARTED;
        this.startTime = Date.now();

        const proc = spawn(this.command, [], {
            stdio: ["ignore", "pipe", "pipe"],
            shell: true,
            cwd: this.cwd,
            env: Object.assign({}, process.env, {
                FORCE_COLOR: "1",
                PATH: `${path.resolve("node_modules/.bin")}:${process.env.PATH}`
            }, this.env)
        });

        this._proc = proc;
        this.pid = proc.pid;

        proc.stdout.on("data", data => {
            const lines = data.toString().split("\n");
            lines.forEach(line => {
                if (line.trim()) this._log(line);
            });
        });

        proc.stderr.on("data", data => {
            const lines = data.toString().split("\n");
            lines.forEach(line => {
                if (line.trim()) this._log(chalk.red(line));
            });
        });

        proc.on("error", err => {
            this.state = STATES.ERRORED;
            this._logEvent(`spawn error: ${err.message}`);
            this.emit("error", err);
        });

        proc.on("close", code => {
            this.endTime = Date.now();
            this.exitCode = code;

            if (this.killed) {
                this.state = STATES.EXITED;
                this._logEvent(`killed after ${prettyMs(this.duration)}`);
                this.emit("close", { exitCode: code, killed: true });
                return;
            }

            const success = code === 0;
            const durationStr = prettyMs(this.duration);

            if (success) {
                this._logEvent(`exited with code 0 in ${durationStr}`);
                this.state = STATES.EXITED;
                this.emit("close", { exitCode: 0, killed: false });
            } else {
                if (this._attempt < this.restartTries) {
                    this._attempt++;
                    const delay = this.restartDelay === "exponential"
                        ? Math.pow(2, this._attempt - 1) * 1000
                        : this.restartDelay;

                    this.state = STATES.RESTARTING;
                    this._logEvent(`exited with code ${code} — restarting (attempt ${this._attempt}/${this.restartTries}) in ${prettyMs(delay)}`);

                    setTimeout(() => {
                        if (!this.killed) this.start();
                    }, delay);
                } else {
                    this.state = STATES.EXITED;
                    this._logEvent(`exited with code ${code} in ${durationStr}`);
                    this.emit("close", { exitCode: code, killed: false });
                }
            }
        });

        this.emit("start", { pid: proc.pid });
        return this;
    }

    kill(signal = "SIGTERM") {
        if (this.killed || !this._proc) return;
        this.killed = true;
        treeKill(this._proc.pid, signal);
    }
}

/**
 * ProcessManager — runs multiple ManagedProcess instances and coordinates their lifecycle.
 *
 * Options:
 *   killOthers: string[]   — ['failure'] | ['success'] | ['failure', 'success']
 *   killSignal: string     — default 'SIGTERM'
 *   maxProcesses: number   — concurrency cap (sliding window), default unlimited
 *   timings: boolean       — print timing table on finish
 *   successCondition: string — 'all' | 'first' | 'last'
 */
class ProcessManager extends EventEmitter {
    constructor(processes, options = {}) {
        super();
        this.processes = processes;
        this.killOthers = options.killOthers || [];
        this.killSignal = options.killSignal || "SIGTERM";
        this.maxProcesses = options.maxProcesses || Infinity;
        this.timings = options.timings || false;
        this.successCondition = options.successCondition || "all";

        this._closeEvents = [];
        this._resolved = false;
    }

    _killAll(signal) {
        this.processes.forEach(p => {
            if (p.state !== STATES.EXITED) p.kill(signal || this.killSignal);
        });
    }

    _checkDone() {
        const total = this.processes.length;
        const done = this.processes.filter(p => p.state === STATES.EXITED).length;

        if (done < total) return;

        if (this.timings) this._printTimings();
        if (this._resolved) return;
        this._resolved = true;

        const failed = this._closeEvents.filter(e => e.exitCode !== 0 && !e.killed);
        const allSuccess = failed.length === 0;

        this.emit("done", { success: allSuccess, closeEvents: this._closeEvents });
    }

    _printTimings() {
        console.log("\n" + chalk.bold("Process timings:"));
        this.processes.forEach(p => {
            const status = p.exitCode === 0 ? chalk.green("✓") : chalk.red("✗");
            const dur = prettyMs(p.duration);
            console.log(`  ${status} ${p.prefix} ${dur} (exit ${p.exitCode})`);
        });
        console.log();
    }

    _handleClose(proc, event) {
        this._closeEvents.push({ process: proc, ...event });

        const shouldKillOnFailure = this.killOthers.includes("failure") && event.exitCode !== 0 && !event.killed;
        const shouldKillOnSuccess = this.killOthers.includes("success") && event.exitCode === 0;

        if (shouldKillOnFailure || shouldKillOnSuccess) {
            const reason = shouldKillOnFailure ? "failure" : "success";
            console.log(chalk.yellow(`\n[ProcessManager] killing all processes due to ${reason} of "${proc.name}"\n`));
            this._killAll();
        }

        this._checkDone();
    }

    run() {
        return new Promise((resolve, reject) => {
            if (this.processes.length === 0) {
                resolve({ success: true, closeEvents: [] });
                return;
            }

            // Set up SIGINT/SIGTERM pass-through
            const signalHandler = (signal) => {
                this._killAll(signal);
            };
            process.once("SIGINT", () => signalHandler("SIGTERM"));
            process.once("SIGTERM", () => signalHandler("SIGTERM"));

            this.on("done", ({ success, closeEvents }) => {
                process.removeListener("SIGINT", signalHandler);
                process.removeListener("SIGTERM", signalHandler);
                resolve({ success, closeEvents });
            });

            // Wire up close handlers before starting
            this.processes.forEach(proc => {
                proc.on("close", event => this._handleClose(proc, event));
            });

            // Sliding window: start up to maxProcesses, then start next on each close
            if (isFinite(this.maxProcesses)) {
                let nextIndex = 0;

                const startNext = () => {
                    if (nextIndex < this.processes.length) {
                        const proc = this.processes[nextIndex++];
                        proc.once("close", startNext);
                        proc.start();
                    }
                };

                for (let i = 0; i < Math.min(this.maxProcesses, this.processes.length); i++) {
                    startNext();
                }
            } else {
                this.processes.forEach(p => p.start());
            }
        });
    }
}

/**
 * Parse a task script string into { type, command, env } shape.
 * Handles: "ENV=val cmd rest", "cmd rest"
 */
function parseTaskScript(script, lang) {
    if (lang === "javascript") {
        return { type: "node", command: script, env: {} };
    }

    const pars = script.trim().split(/\s+/);
    const env = {};
    let startIdx = 0;

    // Consume leading ENV=val pairs
    while (startIdx < pars.length && pars[startIdx].includes("=") && !pars[startIdx].startsWith("-")) {
        const [key, ...vals] = pars[startIdx].split("=");
        env[key] = vals.join("=");
        startIdx++;
    }

    const fullCommand = pars.slice(startIdx).join(" ");
    return { command: fullCommand, env };
}

/**
 * Build a ManagedProcess from a task entry in FcScripts.
 */
function buildProcess(taskName, taskData, index, options = {}) {
    const { lang, script } = taskData;
    const { command, env } = parseTaskScript(script, lang);

    return new ManagedProcess({
        command,
        name: taskName,
        index,
        env,
        prefixColor: PREFIX_COLORS[index % PREFIX_COLORS.length],
        restartTries: options.restartTries || 0,
        restartDelay: options.restartDelay || 0,
        cwd: options.cwd
    });
}

export { ManagedProcess, ProcessManager, buildProcess, parseTaskScript, STATES, PREFIX_COLORS };

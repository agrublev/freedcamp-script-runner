#!/usr/bin/env node
"use strict";

/**
 * yarn-wrapper.cjs — hooked via `yarn-path` in .yarnrc (Yarn Classic 1.x).
 *
 * When a user runs `yarn <something>` that isn't a real yarn command or a
 * package.json script, this wrapper checks fscripts.md and suggests
 * `fsr <task>` instead of letting yarn print a cryptic "Command not found".
 *
 * Loop prevention: set YARN_IGNORE_PATH=1 when delegating back to real yarn so
 * Yarn Classic skips the yarn-path override and runs normally.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Every built-in yarn subcommand. These always pass through without inspection.
const YARN_BUILTINS = new Set([
    "add",
    "audit",
    "autoclean",
    "bin",
    "cache",
    "check",
    "config",
    "create",
    "exec",
    "global",
    "help",
    "import",
    "info",
    "init",
    "install",
    "licenses",
    "link",
    "list",
    "login",
    "logout",
    "node",
    "outdated",
    "owner",
    "pack",
    "policies",
    "publish",
    "remove",
    "run",
    "self-update",
    "tag",
    "team",
    "unlink",
    "upgrade",
    "upgrade-interactive",
    "version",
    "versions",
    "why",
    "workspace",
    "workspaces",
    "set"
]);

/** Delegate to the real yarn binary, bypassing yarn-path. */
function passthrough() {
    const r = spawnSync("yarn", process.argv.slice(2), {
        stdio: "inherit",
        env: { ...process.env, YARN_IGNORE_PATH: "1" }
    });
    process.exit(r.status ?? 1);
}

const args = process.argv.slice(2);
const cmd = args[0];

// No command, a flag (e.g. --version), or a known yarn built-in → pass through.
if (!cmd || cmd.startsWith("-") || YARN_BUILTINS.has(cmd)) {
    passthrough();
}

// Known package.json script → pass through (yarn handles pre/post hooks etc.)
try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"));
    if (pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts, cmd)) {
        passthrough();
    }
} catch {
    // Can't read package.json — let yarn produce its own error.
    passthrough();
}

// Unknown script. Check fscripts.md for a matching task name and run it via fsr.
try {
    const mdPath = path.resolve(process.cwd(), "fscripts.md");
    const content = fs.readFileSync(mdPath, "utf8");
    const parts = content.split("<!-- end toc -->");
    const body = parts.length === 2 ? parts[1] : parts[0];
    const tasks = [...body.matchAll(/^## ([^\n]+)/gm)].map((m) => m[1].trim());
    console.log(JSON.stringify(tasks));
    if (tasks.includes(cmd)) {
        const r = spawnSync("yarn", ["fsr", cmd, ...args.slice(1)], { stdio: "inherit" });
        process.exit(r.status ?? 1);
    }
} catch {
    /* no fscripts.md */
}

const y = (s) => `\x1b[33m${s}\x1b[0m`;
const c = (s) => `\x1b[36m${s}\x1b[0m`;
const b = (s) => `\x1b[1m${s}\x1b[0m`;

process.stderr.write("\n");
process.stderr.write(y(`  No yarn script "${cmd}".\n`));
process.stderr.write("\n");
process.stderr.write(`  This project uses ${b("fsr")} for task execution.\n`);
process.stderr.write(`  See all tasks:    ${b(c("fsr start"))}\n`);
process.stderr.write("\n");
process.exit(1);

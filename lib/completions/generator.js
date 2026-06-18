import fs from "fs-extra";
import path from "path";
import parseScriptFile from "../parsers/parseScriptsMd.js";

/**
 * Cache for parsed tasks to avoid re-parsing on every completion
 */
let taskCache = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Get all available tasks from fscripts.md with caching
 */
export async function getAvailableTasks(forceRefresh = false) {
    const now = Date.now();

    // Return cached tasks if still valid
    if (!forceRefresh && taskCache && now - cacheTime < CACHE_TTL) {
        return taskCache;
    }

    try {
        const { allTasks } = await parseScriptFile();
        taskCache = allTasks.map((task) => ({
            name: task.name,
            description: task.description || "",
            lang: task.lang || "bash"
        }));
        cacheTime = now;
        return taskCache;
    } catch (error) {
        // If parsing fails, return empty array
        return [];
    }
}

/**
 * Get all available commands
 */
export function getAvailableCommands() {
    return [
        { name: "branch",     description: "Create a new branch — prevents commits directly on master or development" },
        { name: "commit",     description: "Stage and commit changes with AI-generated conventional commit messages" },
        { name: "start",      description: "Choose a category then a task to run interactively" },
        { name: "scripts",    description: "Choose a script from package.json" },
        { name: "list",       description: "Select any task with text autocompletion" },
        { name: "run",        description: "Run a specific task by name" },
        { name: "upgrade",    description: "Upgrade all packages except those listed in ignore-upgrade" },
        { name: "bump",       description: "Bump the version in package.json and beautify it" },
        { name: "run-s",      description: "Run a set of tasks sequentially" },
        { name: "run-p",      description: "Run tasks in parallel" },
        { name: "encryption", description: "Encrypt or decrypt secret files interactively" },
        { name: "encrypt",    description: "Encrypt secret files" },
        { name: "decrypt",    description: "Decrypt secret files" },
        { name: "clear",      description: "Clear recent task history" },
        { name: "generate",   description: "Generate a sample fscripts.md from package.json" },
        { name: "toc",        description: "Regenerate the Table of Contents in fscripts.md" },
        { name: "doctor",     description: "Run diagnostics and check system health" },
        { name: "completion", description: "Manage shell tab completions" },
    ];
}

/**
 * Get completion subcommands
 */
export function getCompletionSubcommands() {
    return [
        { name: "install", description: "Install completions" },
        { name: "uninstall", description: "Uninstall completions" },
        { name: "status", description: "Show completion status" },
        { name: "generate", description: "Generate completion script" }
    ];
}

/**
 * Generate task names for shell completion
 */
export async function generateTaskNames() {
    const tasks = await getAvailableTasks();
    return tasks.map((t) => t.name);
}

/**
 * Generate bash completion data
 */
export async function generateBashCompletionData() {
    const tasks = await getAvailableTasks();
    const commands = getAvailableCommands();
    const completionCmds = getCompletionSubcommands();

    return {
        commands: commands.map((c) => c.name),
        tasks: tasks.map((t) => t.name),
        completionSubcommands: completionCmds.map((c) => c.name)
    };
}

/**
 * Generate zsh completion data
 */
export async function generateZshCompletionData() {
    const tasks = await getAvailableTasks();
    const commands = getAvailableCommands();
    const completionCmds = getCompletionSubcommands();

    return {
        commands: commands.map((c) => `${c.name}:${c.description}`),
        tasks: tasks.map((t) => {
            const desc = t.description.replace(/[:\n]/g, " ").trim();
            return `${t.name}:${desc || "Run task"}`;
        }),
        completionSubcommands: completionCmds.map((c) => `${c.name}:${c.description}`)
    };
}

/**
 * Generate fish completion data
 */
export async function generateFishCompletionData() {
    const tasks = await getAvailableTasks();
    const commands = getAvailableCommands();
    const completionCmds = getCompletionSubcommands();

    return {
        commands: commands.map((c) => ({
            name: c.name,
            description: c.description
        })),
        tasks: tasks.map((t) => ({
            name: t.name,
            description: t.description || "Run task"
        })),
        completionSubcommands: completionCmds.map((c) => ({
            name: c.name,
            description: c.description
        }))
    };
}

/**
 * Export tasks for completion (used by shell scripts)
 */
export async function exportTasksForCompletion() {
    const tasks = await getAvailableTasks();
    return tasks.map((t) => t.name).join("\n");
}

/**
 * Clear the task cache (useful when fscripts.md is updated)
 */
export function clearTaskCache() {
    taskCache = null;
    cacheTime = 0;
}

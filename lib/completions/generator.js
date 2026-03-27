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
        { name: "start", description: "Choose category then task to run" },
        { name: "run", description: "Run a specific task" },
        { name: "list", description: "Select any task with text autocompletion" },
        { name: "scripts", description: "Choose a script from package.json" },
        { name: "run-s", description: "Run tasks in sequence" },
        { name: "run-p", description: "Run tasks in parallel" },
        { name: "bump", description: "Bump package.json version" },
        { name: "upgrade", description: "Upgrade packages" },
        { name: "branch", description: "Create new branch" },
        { name: "remote", description: "Get remote configuration" },
        { name: "encryption", description: "Encrypt/Decrypt files" },
        { name: "clear", description: "Clear recent task history" },
        { name: "generate", description: "Generate sample fscripts.md" },
        { name: "toc", description: "Generate table of contents" },
        { name: "completion", description: "Manage shell completions" }
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

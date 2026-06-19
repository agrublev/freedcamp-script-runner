import fsrLog from "../../utils/console.js";
import { readCacheEntry, writeCacheEntry } from "../../cache/cache.js";
import chalk from "chalk";
/**
 * Task Notifier Plugin
 * Send notifications when tasks complete
 */

// Cache key used to persist whether notifications are enabled across runs
const NOTIFICATIONS_CACHE_KEY = "task-notifier.enabled";

export default {
    name: "task-notifier",
    version: "1.0.0",
    description: "Send desktop notifications for task completion",
    author: "FSCR Team",
    tags: ["notifications", "productivity"],

    async init(context) {
        // Restore persisted state from the fsr cache; default to enabled
        const cached = await readCacheEntry(NOTIFICATIONS_CACHE_KEY);
        let notificationsEnabled = cached?.value !== false;

        // Hook into task completion
        context.registerHook("pre-task", async (data) => {
            if (!notificationsEnabled) return;
            console.log(
                chalk
                    .bgHex("#7f159f")
                    .hex("#75d3b2")
                    .underline.bold(`\`✓ Task Started: ${data.taskName}
`)
            );
        });
        context.registerHook("post-task", async (data) => {
            if (!notificationsEnabled) return;

            console.log(
                chalk.bgHex("#7f159f").hex("#75d3b2").underline.bold(`
Task End: ${data.taskName}`)
            );
        });

        // Hook into errors
        context.registerHook("task-error", async (data) => {
            if (!notificationsEnabled) return;

            console.log(
                chalk
                    .hex("#F00F00")
                    .bold(`[Notification] ✗ Task Error: ${data.taskName}\n${data.error.message}`)
            );
        });

        // Register notification control commands
        context.registerCommand({
            name: "notify",
            description: "Control task notifications",
            options: [
                { flags: "-e, --enable", description: "Enable notifications", type: "boolean" },
                { flags: "-d, --disable", description: "Disable notifications", type: "boolean" },
                { flags: "-s, --status", description: "Show notification status", type: "boolean" }
            ],
            handler: async (options, ctx) => {
                if (options.enable) {
                    notificationsEnabled = true;
                    await writeCacheEntry(NOTIFICATIONS_CACHE_KEY, true, true);
                    ctx.logger.success("Notifications enabled");
                } else if (options.disable) {
                    notificationsEnabled = false;
                    await writeCacheEntry(NOTIFICATIONS_CACHE_KEY, false, true);
                    ctx.logger.info("Notifications disabled");
                } else if (options.status) {
                    const status = notificationsEnabled ? "enabled" : "disabled";
                    ctx.logger.info(`Notifications are ${status}`);
                } else {
                    ctx.logger.info("Usage: fsr notify [--enable|--disable|--status]");
                }
            },
            examples: ["fsr notify --enable", "fsr notify --disable", "fsr notify --status"]
        });
    }
};

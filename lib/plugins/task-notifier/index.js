import fsrLog from "../../utils/console.js";
/**
 * Task Notifier Plugin
 * Send notifications when tasks complete
 */

export default {
    name: "task-notifier",
    version: "1.0.0",
    description: "Send desktop notifications for task completion",
    author: "FSCR Team",
    tags: ["notifications", "productivity"],

    async init(context) {
        let notificationsEnabled = true;

        // Hook into task completion
        context.registerHook("post-task", async (data) => {
            if (!notificationsEnabled) return;

            const title = data.success
                ? `✓ Task Completed: ${data.taskName}`
                : `✗ Task Failed: ${data.taskName}`;

            const message = `Duration: ${(data.duration / 1000).toFixed(2)}s`;

            // In real implementation, use a notification library
            context.logger.info(`[Notification] ${title} - ${message}`);
            fsrLog.log("TASK", title);
        });

        // Hook into errors
        context.registerHook("task-error", async (data) => {
            if (!notificationsEnabled) return;

            context.logger.error(
                `[Notification] ✗ Task Error: ${data.taskName}\n${data.error.message}`
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
                    ctx.logger.success("Notifications enabled");
                } else if (options.disable) {
                    notificationsEnabled = false;
                    ctx.logger.info("Notifications disabled");
                } else if (options.status) {
                    const status = notificationsEnabled ? "enabled" : "disabled";
                    ctx.logger.info(`Notifications are ${status}`);
                } else {
                    ctx.logger.info("Usage: fsr notify [--enable|--disable|--status]");
                }
            },
            examples: [
                "fsr notify --enable",
                "fsr notify --disable",
                "fsr notify --status"
            ]
        });

        context.logger.success("Task Notifier plugin initialized");
    }
};

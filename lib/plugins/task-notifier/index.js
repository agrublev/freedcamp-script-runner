/**
 * Task Notifier Plugin
 * Send notifications when tasks complete
 */

import Conf from "conf";

const conf = new Conf({ projectName: "fscr-plugins" });
const PREF_KEY = "task-notifier.enabled";

export default {
    name: "task-notifier",
    version: "1.0.0",
    description: "Send desktop notifications for task completion",
    author: "FSCR Team",
    tags: ["notifications", "productivity"],

    async init(context) {
        const isEnabled = () => conf.get(PREF_KEY, true);

        context.registerHook("post-task", async (data) => {
            if (!isEnabled()) return;

            const title = data.success
                ? `✓ Task Completed: ${data.taskName}`
                : `✗ Task Failed: ${data.taskName}`;

            const message = `Duration: ${(data.duration / 1000).toFixed(2)}s`;

            context.logger.info(`[Notification] ${title} - ${message}`);
            console.log("TASK", title);
        });

        context.registerHook("task-error", async (data) => {
            if (!isEnabled()) return;

            context.logger.error(
                `[Notification] ✗ Task Error: ${data.taskName}\n${data.error.message}`
            );
        });

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
                    conf.set(PREF_KEY, true);
                    ctx.logger.success("Notifications enabled");
                } else if (options.disable) {
                    conf.set(PREF_KEY, false);
                    ctx.logger.info("Notifications disabled");
                } else if (options.status) {
                    ctx.logger.info(`Notifications are ${isEnabled() ? "enabled" : "disabled"}`);
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

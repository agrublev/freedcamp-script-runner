import promptQuestion from "../../utils/prompt.js";
import { spawn } from "child_process";

/**
 * Deploy
 * @param files
 * @param subdomain
 * @param ctx
 * @returns {Promise<unknown>}
 */
const deployExec = async (files, subdomain, ctx) => {
    const domain = `${subdomain}.surge.sh`;
    ctx.logger.info(`Deploying ${files} → ${domain}`);
    return await new Promise((resolve, reject) => {
        const cmd = spawn("npx", ["surge", files, domain], { stdio: "inherit", shell: false });
        cmd.on("close", (code) => {
            if (code !== 0) reject(new Error(`surge exited with code ${code}`));
            else resolve();
        });
    });
};
export default {
    name: "deployment",
    version: "1.0.0",
    description: "Deploy your application to various environments",
    author: "FSCR Team",
    minFscrVersion: "7.0.0",
    tags: ["deployment", "devops"],

    async init(context) {
        const deploymentHistory = [];

        // Post-deployment tracking
        context.registerHook("post-command", async (data) => {
            if (data.command === "deploy") {
                deploymentHistory.push({
                    timestamp: data.timestamp,
                    success: data.success,
                    duration: data.duration
                });

                context.setStorage({ deploymentHistory });
            }
        });

        // Register deploy command
        context.registerCommand({
            name: "deploy",
            description: "Deploy to a specific surge domain",
            aliases: ["ship", "publish"],
            options: [
                {
                    flags: "--files",
                    description: "Location of files to publish"
                },
                {
                    flags: "--subdomain",
                    description: "What is the surge.sh subdomain"
                }
            ],
            handler: async (options, ctx) => {
                const files = options.files;
                const subdomain = options.subdomain;

                if (!files || !subdomain) {
                    ctx.logger.error("Usage: fsr deploy --files <path> --subdomain <name>");
                    return;
                }

                await deployExec(files, subdomain, ctx);
            },
            examples: [
                "fsr deploy --files ./dist",
                "fsr deploy --files ./dist --subdomain angel-test-5252"
            ]
        });

        // Register deployment history command
        context.registerCommand({
            name: "deploy-history",
            description: "View deployment history",
            handler: async (options, ctx) => {
                if (deploymentHistory.length === 0) {
                    ctx.logger.info("No deployment history");
                    return;
                }

                ctx.logger.info("Recent Deployments:");
                ctx.logger.info("─".repeat(60));

                const recent = deploymentHistory.slice(-10);
                for (const record of recent) {
                    const status = record.success ? "✓" : "✗";
                    const date = new Date(record.timestamp).toLocaleString();
                    ctx.logger.info(`${status} ${date} (${record.duration}ms)`);
                }

                ctx.logger.info("─".repeat(60));
            },
            examples: ["fsr deploy-history"]
        });

        context.logger.success("Deployment plugin initialized");
    },
    async run(ctx) {
        const { default: fcFilepickerMod } = await import("fc-filepick");
        const fcFilepicker = fcFilepickerMod.default ?? fcFilepickerMod;
        const r = await promptQuestion({}, "Subdomain?");
        const folder = await fcFilepicker({ type: "folder" });
        await deployExec(folder, r, ctx);
    }
};

/**
 * Hello World Plugin
 * Simple example plugin that demonstrates basic plugin features
 */
import chalk from "chalk";

export default {
    name: "pretty",
    version: "1.0.0",
    description: "MAKES PRETTY TEXT",
    author: "FSCR Team",

    async init(context) {
        const log = console.log;

        // Register a custom command
        context.registerCommand({
            name: "pretty",
            description: "Make pretty text",
            options: [
                {
                    flags: "-t, --title <title>",
                    description: "Title to use",
                    defaultValue: "World"
                }
            ],
            handler: async (options, ctx) => {
                const title = options.title || "Great world";
                log(chalk.rgb(147, 28, 184).underline(`title: ${title}`));
                log(chalk.hex("#931cb8").bold(`title: ${title}`));
                log(chalk.bgHex("#931cb8").hex("#FFFFFF").bold("Custom COLOR 931cb8 purple"));

                // ── Named colors ──────────────────────────────────────────────
                log(chalk.black.bgWhite("black"));
                log(chalk.red("red"));
                log(chalk.green("green"));
                log(chalk.yellow("yellow"));
                log(chalk.blue("blue"));
                log(chalk.magenta("magenta"));
                log(chalk.cyan("cyan"));
                log(chalk.white("white"));

                // ── Bright variants ───────────────────────────────────────────
                log(chalk.blackBright("blackBright (gray / grey)"));
                log(chalk.redBright("redBright"));
                log(chalk.greenBright("greenBright"));
                log(chalk.yellowBright("yellowBright"));
                log(chalk.blueBright("blueBright"));
                log(chalk.magentaBright("magentaBright"));
                log(chalk.cyanBright("cyanBright"));
                log(chalk.whiteBright("whiteBright"));
                // ── Background colors ─────────────────────────────────────────
                log(chalk.bgBlack.white("bgBlack"));
                log(chalk.bgRed("bgRed"));
                log(chalk.bgGreen("bgGreen"));
                log(chalk.bgYellow("bgYellow"));
                log(chalk.bgBlue("bgBlue"));
                log(chalk.bgMagenta("bgMagenta"));
                log(chalk.bgCyan("bgCyan"));
                log(chalk.bgWhite.black("bgWhite"));

                // ── Bright background variants ────────────────────────────────
                log(chalk.bgBlackBright.white("bgBlackBright (bgGray / bgGrey)"));
                log(chalk.bgRedBright("bgRedBright"));
                log(chalk.bgGreenBright("bgGreenBright"));
                log(chalk.bgYellowBright("bgYellowBright"));
                log(chalk.bgBlueBright("bgBlueBright"));
                log(chalk.bgMagentaBright("bgMagentaBright"));
                log(chalk.bgCyanBright("bgCyanBright"));
                log(chalk.bgWhiteBright.black("bgWhiteBright"));
            },
            examples: ["fsr pretty", "fsr pretty --titke 'AWESOME STUFF'", "fsr pretty -t Bob"]
        });
    },

    async destroy() {
        console.log("Hello World plugin shutting down");
    }
};

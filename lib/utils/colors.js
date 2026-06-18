import { clear } from "./index.js";
import { Box, Text, useInput, useApp, render } from "ink";

clear({ fullClear: true });

export default function Colors({ items, onSelect, onCancel }) {
    const { exit } = useApp();

    useInput((input, key) => {
        if (key.return || key.escape) {
            exit();
        }
    });

    return (
        <Box flexDirection="column" borderColor="cyan" padding={1}>
            <Text color={"#931cb8"}>Test colr purple</Text>
            <Box backgroundColor={"#000"} borderColor={"#0064c4"} borderStyle={"bold"}>
                <Text backgroundColor={"#000"} color={"black"}>
                    Test colr purple
                </Text>
            </Box>

            {/* Use RGB colors in terminal emulators that support it. */}
            <Text color="rgb(147, 28, 184)" underline>
                Underlined reddish color
            </Text>
            <Text color="#931cb8" bold>
                Custom COLOR 931cb8 purple
            </Text>
            <Text backgroundColor="#931cb8" color="#FFFFFF" bold>
                Custom COLOR 931cb8 purple
            </Text>

            {/* ── Named colors ────────────────────────────────────────── */}
            <Text color="black" backgroundColor="white">
                black
            </Text>
            <Text color="red">red</Text>
            <Text color="green">green</Text>
            <Text color="yellow">yellow</Text>
            <Text color="blue">blue</Text>
            <Text color="magenta">magenta</Text>
            <Text color="cyan">cyan</Text>
            <Text color="white">white</Text>

            {/* ── Bright variants ─────────────────────────────────────── */}
            <Text color="blackBright">blackBright (gray / grey)</Text>
            <Text color="redBright">redBright</Text>
            <Text color="greenBright">greenBright</Text>
            <Text color="yellowBright">yellowBright</Text>
            <Text color="blueBright">blueBright</Text>
            <Text color="magentaBright">magentaBright</Text>
            <Text color="cyanBright">cyanBright</Text>
            <Text color="whiteBright">whiteBright</Text>

            {/* ── Background colors ────────────────────────────────────── */}
            <Text backgroundColor="black" color="white">
                bgBlack
            </Text>
            <Text backgroundColor="red">bgRed</Text>
            <Text backgroundColor="green">bgGreen</Text>
            <Text backgroundColor="yellow">bgYellow</Text>
            <Text backgroundColor="blue">bgBlue</Text>
            <Text backgroundColor="magenta">bgMagenta</Text>
            <Text backgroundColor="cyan">bgCyan</Text>
            <Text backgroundColor="white" color="black">
                bgWhite
            </Text>

            {/* ── Bright background variants ───────────────────────────── */}
            <Text backgroundColor="blackBright" color="white">
                bgBlackBright (bgGray / bgGrey)
            </Text>
            <Text backgroundColor="redBright">bgRedBright</Text>
            <Text backgroundColor="greenBright">bgGreenBright</Text>
            <Text backgroundColor="yellowBright">bgYellowBright</Text>
            <Text backgroundColor="blueBright">bgBlueBright</Text>
            <Text backgroundColor="magentaBright">bgMagentaBright</Text>
            <Text backgroundColor="cyanBright">bgCyanBright</Text>
            <Text backgroundColor="whiteBright" color="black">
                bgWhiteBright
            </Text>
        </Box>
    );
}
render(<Colors />);
//
// const renderColors = () => {
//     const log = console.log;
//
//     clear({ fullClear: true });
//     // Use RGB colors in terminal emulators that support it.
//     log(chalk.rgb(147, 28, 184).underline("Underlined reddish color"));
//     log(chalk.hex("#931cb8").bold("Custom COLOR 931cb8 purple"));
//     log(chalk.bgHex("#931cb8").hex("#FFFFFF").bold("Custom COLOR 931cb8 purple"));
//
//     // ── Named colors ──────────────────────────────────────────────
//     log(chalk.black.bgWhite("black"));
//     log(chalk.red("red"));
//     log(chalk.green("green"));
//     log(chalk.yellow("yellow"));
//     log(chalk.blue("blue"));
//     log(chalk.magenta("magenta"));
//     log(chalk.cyan("cyan"));
//     log(chalk.white("white"));
//
//     // ── Bright variants ───────────────────────────────────────────
//     log(chalk.blackBright("blackBright (gray / grey)"));
//     log(chalk.redBright("redBright"));
//     log(chalk.greenBright("greenBright"));
//     log(chalk.yellowBright("yellowBright"));
//     log(chalk.blueBright("blueBright"));
//     log(chalk.magentaBright("magentaBright"));
//     log(chalk.cyanBright("cyanBright"));
//     log(chalk.whiteBright("whiteBright"));
//     // ── Background colors ─────────────────────────────────────────
//     log(chalk.bgBlack.white("bgBlack"));
//     log(chalk.bgRed("bgRed"));
//     log(chalk.bgGreen("bgGreen"));
//     log(chalk.bgYellow("bgYellow"));
//     log(chalk.bgBlue("bgBlue"));
//     log(chalk.bgMagenta("bgMagenta"));
//     log(chalk.bgCyan("bgCyan"));
//     log(chalk.bgWhite.black("bgWhite"));
//
//     // ── Bright background variants ────────────────────────────────
//     log(chalk.bgBlackBright.white("bgBlackBright (bgGray / bgGrey)"));
//     log(chalk.bgRedBright("bgRedBright"));
//     log(chalk.bgGreenBright("bgGreenBright"));
//     log(chalk.bgYellowBright("bgYellowBright"));
//     log(chalk.bgBlueBright("bgBlueBright"));
//     log(chalk.bgMagentaBright("bgMagentaBright"));
//     log(chalk.bgCyanBright("bgCyanBright"));
//     log(chalk.bgWhiteBright.black("bgWhiteBright"));
// };

/**
 *
 * // Combine styled and normal strings
 * log(chalk.blue("Hello") + " World" + chalk.red("!"));
 *
 * // Compose multiple styles using the chainable API
 * log(chalk.blue.bgRed.bold("Hello world!"));
 *
 * // Pass in multiple arguments
 * log(chalk.blue("Hello", "World!", "Foo", "bar", "biz", "baz"));
 *
 * // Nest styles
 * log(chalk.red("Hello", chalk.underline.bgBlue("world") + "!"));
 *
 * // Nest styles of the same type even (color, underline, background)
 * log(
 *     chalk.green(
 *         "I am a green line " +
 *             chalk.blue.underline.bold("with a blue substring") +
 *             " that becomes green again!"
 *     )
 * );
 */

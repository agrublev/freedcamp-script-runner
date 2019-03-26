const blessed = require("blessed");
let screen = blessed.screen({ smartCSR: true }); // title: "Some cool fucking task"
const chalk = require("chalk");
const runCommand = require("./runCommand.js");
const taskName = "TEst Task 1";
const program = blessed.program();
let STOP_APPENDING = false;
let addBackArray = [];
// Create a box perfectly centered horizontally and vertically.
screen.title = "Freedcamp Script Runner";

let title = blessed.box({
    top: "0",
    left: "center",
    width: "98%",
    height: 5,
    align: "center",
    content: `{bold}Running task:{/bold}  {white-fg}{black-bg}{underline}  ${taskName}  {/underline}{/}`,
    tags: true,
    padding: { bottom: 0, top: 1, left: 0, right: 0 },
    border: {
        type: "line"
    },
    style: {
        fg: "white",
        bg: "#064b66",
        border: {
            fg: "red"
        },
        hover: {
            bg: "green"
        }
    }
});
// title.setContent("leftright");

let box = blessed.log({
    bottom: "0",
    left: "center",
    scrollable: true,
    input: true,
    alwaysScroll: true,
    scrollbar: {
        ch: " ",
        inverse: true
    },
    keys: true,
    mouse: true,
    width: "98%",
    padding: 0,
    height: "100%-5",
    content: "",
    tags: true,
    border: {
        type: "line"
    },
    style: {
        fg: "white",
        bg: "black",
        scrollbar: {
            bg: "red",
            fg: "blue"
        },
        border: {
            fg: "#1e8e00"
        }
    }
});
const runSomeScript = box => {
    const shell = runCommand("node src/console.js");

    shell.stdout.on("data", code => {
        code = code + "";
        if (!STOP_APPENDING) {
            box.log(code);
        } else {
            addBackArray.push(code);
        }
    });
    shell.stderr.on("data", code => {
        console.log(`${chalk.bold.red(code)}`);
        // process.exit();
    });
    return new Promise(resolve => {
        shell.on("close", code => {
            console.log(`${chalk.bold.green("Finished")}`);
            resolve();
            // process.exit();
        });
    });
};

screen.append(title);

// Append our box to the screen.
screen.append(box);
runSomeScript(box);
let mapNavigationKeysToScrollLog = function() {
    // screen.key(["pageup"], () => {
    //     box.setScrollPerc(0);
    //     screen.render();
    // });
    // screen.key(["pagedown"], () => {
    //     // eslint-disable-next-line no-magic-numbers
    //     box.setScrollPerc(100);
    //     screen.render();
    // });
    screen.key(["up"], () => {
        box.scroll(-1);
        STOP_APPENDING = true;
        screen.render();
    });
    screen.key(["down"], () => {
        if (box.getScrollPerc() === 100) {
            STOP_APPENDING = false;
            addBackArray.forEach(line => {
                box.log(line);
            });
            addBackArray = [];
        } else {
            box.scroll(1);
        }
        screen.render();
    });
};
mapNavigationKeysToScrollLog();
program.on("mouse", function(data) {
    if (data.action === "mouseup") return;
    program.move(1, program.rows);
    program.eraseInLine("right");
    if (data.action === "wheelup") {
        STOP_APPENDING = true;
        screen.render();
    } else if (data.action === "wheeldown") {
        if (box.getScrollPerc() === 100) {
            STOP_APPENDING = false;
            addBackArray.forEach(line => {
                box.log(line);
            });
            addBackArray = [];
        }
        screen.render();
    }
});

// Quit on Escape, q, or Control-C.
screen.key(["escape", "q", "C-c"], function(ch, key) {
    return process.exit(0);
});

// Focus our element.
box.focus();

// Render the screen.
screen.render();

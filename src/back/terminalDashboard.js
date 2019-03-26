const blessed = require("blessed");
const path = require("path");
const theLog = path.join(process.cwd(), ".log.log");
let screen = blessed.screen({
    terminal: "xterm-256color",
    smartCSR: true,
    useBCE: true,
    cursor: {
        artificial: true,
        blink: true,
        shape: "underline"
    },
    log: theLog,
    debug: true,
    dockBorders: true
}); // title: "Some cool fucking task"
const program = blessed.program();

const startTerminal = {};

const terminalHandler = taskName => {
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

    screen.append(title);

    screen.append(box);

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
            startTerminal.STOP_APPENDING = true;
            screen.render();
        });
        screen.key(["down"], () => {
            if (box.getScrollPerc() === 100) {
                startTerminal.STOP_APPENDING = false;
                startTerminal.addBackArray.forEach(line => {
                    box.log(line);
                });
                startTerminal.addBackArray = [];
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
            startTerminal.STOP_APPENDING = true;
            screen.render();
        } else if (data.action === "wheeldown") {
            if (box.getScrollPerc() === 100) {
                startTerminal.STOP_APPENDING = false;
                startTerminal.addBackArray.forEach(line => {
                    box.log(line);
                });
                startTerminal.addBackArray = [];
            }
            screen.render();
        }
    });

    screen.key(["escape", "q", "C-c"], function(ch, key) {
        return process.exit(0);
    });

    box.focus();

    screen.render();
    return { box, screen };
};

startTerminal.STOP_APPENDING = false;
startTerminal.addBackArray = [];

startTerminal.openTerminal = taskName => {
    const { box, screen } = terminalHandler(taskName);
    startTerminal.box = box;
    startTerminal.screen = screen;
};

startTerminal.outputToTerminal = line => {
    screen.debug(line);
    if (!startTerminal.STOP_APPENDING) {
        startTerminal.box.log(line);
    } else {
        startTerminal.addBackArray.push(line);
    }
};

startTerminal.clearContent = () => {
    startTerminal.box.setContent("");
};

startTerminal.outputError = line => {
    startTerminal.box.log(line);
};

startTerminal.outputFinished = line => {
    startTerminal.box.log(line);
};

module.exports = startTerminal;

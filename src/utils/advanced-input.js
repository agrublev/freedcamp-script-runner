const termkit = require("terminal-kit");
const term = require("terminal-kit").terminal;
let index = 0;
let keyName = "";
term.on("key", function(name, matches, data) {
    if (name === "CTRL_C") {
        terminate();
    }
});
function terminate() {
    term.grabInput(false);
    // Add a 100ms delay, so the terminal will be ready when the process effectively exit, preventing bad escape sequences drop
    setTimeout(function() {
        process.exit();
    }, 100);
}

function advancedInput(msg, items) {
    return new Promise(resolve => {
        termkit.getDetectedTerminal(function(error, term) {
            term.grabInput({ mouse: "motion" });

            function finish(ez) {
                term.grabInput(false);
                term.clear();

                resolve(ez);
            }

            term.on("key", function(name, matches, data) {
                keyName = name;
                if (name === "CTRL_C") {
                    terminate();
                }
            });

            function menu() {
                var options = {
                    // selectedLeftPadding: "▸ ",
                    keyBindings: {
                        ENTER: "submit",
                        TAB: "submit",
                        RIGHT: "submit",
                        LEFT: "submit",
                        UP: "previous",
                        p: "previous",
                        DOWN: "next",
                        n: "next"
                    },
                    selectedLeftPadding: "✓",
                    exitOnUnexpectedKey: true,
                    continueOnSubmit: true,
                    displayText: e => e.displayText //,
                    //itemMaxWidth: 20 ,
                    // style: term.bgBlack.white, //white.bgBlack //.bgBlack.white
                    // selectedStyle: term.bgWhite//term.dim.blue.bgGreen
                };

                term.singleColumnMenu(items, options, function(error, response) {
                    finish({
                        type: "action",
                        ind: index.highlightedIndex,
                        txt: index.highlightedText
                    });
                })
                    .on("submit", function(e) {
                        finish({
                            type: keyName !== "ENTER" ? "action" : "enter",
                            ind: index.highlightedIndex,
                            txt: index.highlightedText
                        });
                    })
                    .on("highlight", function(e) {
                        index = e;
                    });
            }
            // term.clear();
            term.underline.bold.cyan(`${msg}\n`);

            menu();
            // asyncMenu();
        });
    });
}

module.exports = advancedInput;

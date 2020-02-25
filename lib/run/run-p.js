#!/usr/bin/env node
"use strict";

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------
/*eslint-disable no-process-exit */

function bootstrap(name) {
    const argv = process.argv.slice(2);

    switch (argv[0]) {
        case undefined:

        default:
            // https://github.com/mysticatea/npm-run-all/issues/105
            // Avoid MaxListenersExceededWarnings.
            process.stdout.setMaxListeners(0);
            process.stderr.setMaxListeners(0);
            process.stdin.setMaxListeners(0);

            // Main
            return require("./main-p.js")(argv, process.stdout, process.stderr).then(
                () => {
                    // I'm not sure why, but maybe the process never exits
                    // on Git Bash (MINGW64)
                    process.exit(0);
                },
                () => {
                    process.exit(1);
                }
            );
    }
}

/*eslint-enable */

bootstrap("run-p");

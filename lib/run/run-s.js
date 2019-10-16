/**
 * @author Toru Nagashima
 * @copyright 2015 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
"use strict";

//------------------------------------------------------------------------------
// Main
//------------------------------------------------------------------------------
/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
"use strict";
function printVersion(output) {
    const version = require("../../package.json").version;

    output.write(`v${version}\n`);

    return Promise.resolve(null);
}

//------------------------------------------------------------------------------
// Public Interface
//------------------------------------------------------------------------------
/*eslint-disable no-process-exit */
function bootstrap(name) {
    const argv = process.argv.slice(2);

    switch (argv[0]) {
        case undefined:
        case "-v":
        case "--version":
            return printVersion(process.stdout);

        default:
            // https://github.com/mysticatea/npm-run-all/issues/105
            // Avoid MaxListenersExceededWarnings.
            process.stdout.setMaxListeners(0);
            process.stderr.setMaxListeners(0);
            process.stdin.setMaxListeners(0);

            // Main
            return require(`./main-s.js`)(argv, process.stdout, process.stderr).then(
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
bootstrap("run-s");

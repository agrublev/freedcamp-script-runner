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
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printVersion(output) {
    const version = JSON.parse(readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")).version;

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
            return import(`./main-s.js`).then(mod => mod.default(argv, process.stdout, process.stderr)).then(
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

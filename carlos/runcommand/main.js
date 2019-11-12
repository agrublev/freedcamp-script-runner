const carlo = require("carlo");
const { rpc } = require("carlo/rpc");
let url = "./www/index.html"; //http://localhost:1234";

carlo.launch().then(async app => {
    app.serveFolder(__dirname);
    app.on("exit", () => process.exit());
    await app.load("./www/index.html", rpc.handle(new Backend()));
});

class Backend {
    hello(name) {
        console.log(`Hello ${name}`);
        return "Backend is happy";
    }

    setFrontend(frontend) {
        // Node world can now use frontend RPC handle.
        this.frontend_ = frontend;
    }
}
// "use strict";
// const chalk = require("chalk");

// const fs = require("fs");
// const path = require("path");
// const os = require("os");
// const mjpeg = require("mp4-mjpeg");
// let recorderA;
//
// const moment = require("moment");
// let app;
// let wind;
// (async () => {
//     try {
//         app = await carlo.launch({
//             bgcolor: "#ccc",
//             width: 960,
//             height: 800,
//             icon: path.join(__dirname, "/app_icon.png"),
//             channel: ["canary"],
//             localDataDir: path.join(os.homedir(), ".carlophotobooth")
//         });
//     } catch (e) {
//         // New window is opened in the running instance.
//         console.log("Reusing the running instance");
//         return;
//     }
//     app.on("exit", () => process.exit());
//     // New windows are opened when this app is started again from command line.
//     app.on("window", window => {
//         wind = window;
//         window.load(url);
//         console.warn("-- Console win", window);
//     });
//     console.log("This example requires Chrome 72 (Chrome Canary) to function.");
//     app.serveFolder(path.join(__dirname, "/www"));
//     await app.exposeFunction("saveImage", saveImage);
//     await app.exposeFunction("runCommand", runCommand);
//     await app.load(url, rpc.handle(new Backend()));
// })();
//
// class Backend {
//     hello(name) {
//         console.log(`Hello ${name}`);
//         return "Backend is happy";
//     }
//
//     setFrontend(frontend) {
//         // Node world can now use frontend RPC handle.
//         this.frontend_ = frontend;
//     }
// }
// const tryPath = process.cwd();
// let cbBack;
// const spawn = require("cross-spawn");
// async function runCommand(cbAcl) {
//     console.warn("-- Console RUN RUN", 25, cbAcl, typeof cbAcl);
//     let output = spawn("yarn", "install", {
//         //pars.slice(1, pars.length)
//         cwd: tryPath,
//         env: { ...process.env, ...{ FORCE_COLOR: true } },
//         stdio: "pipe"
//     });
//     if (!cbBack) {
//         cbBack = cbAcl;
//     }
//     output.stdout.on("data", code => {
//         code = code + "";
//         if (cbAcl) {
//             cbAcl(code);
//         } else {
//             cbBack(code);
//         }
//         console.log(
//             `${chalk.bgHex("#181c24").hex("#8c91a7")(
//                 moment().format("HH:MM:SS") + ":"
//             )} ${code}`.trim()
//         );
//     });
//     output.stderr.on("data", code => {
//         code = code + "";
//         if (cbAcl) {
//             cbAcl(code);
//         } else {
//             cbBack(code);
//         }
//         console.log(
//             `${chalk.bgHex("#181c24").hex("#a72e32")(
//                 moment().format("HH:MM:SS") + "ERR :"
//             )} ${code}`.trim()
//         );
//     });
// }
//
// function saveImage(wtf) {
//     console.warn("-- Console isajdioasi", wtf);
//     console.log(app, wind);
// }

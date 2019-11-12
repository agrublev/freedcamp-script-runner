"use strict";

const carlo = require("carlo");
const fs = require("fs");
const path = require("path");
const os = require("os");
const mjpeg = require("mp4-mjpeg");
let recorderA;

(async () => {
    let app;
    try {
        app = await carlo.launch({
            bgcolor: "#e6e8ec",
            width: 800,
            height: 648 + 24,
            icon: path.join(__dirname, "/app_icon.png"),
            channel: ["canary"],
            localDataDir: path.join(os.homedir(), ".carlophotobooth")
        });
    } catch (e) {
        // New window is opened in the running instance.
        console.log("Reusing the running instance");
        return;
    }
    app.on("exit", () => process.exit());
    // New windows are opened when this app is started again from command line.
    app.on("window", window => window.load("http://localhost:1234"));
    const fileName = path.join("pictures", new Date().toISOString().replace(/:/g, "-") + ".mp4");
    mjpeg({ fileName: fileName })
        .then(async recorder => {
            recorderA = recorder;
            await app.exposeFunction("recorderA", recorderA);
        })
        .catch(error => {
            // could not create the file
            console.warn("-- Console err", error);
        });
    console.log("This example requires Chrome 72 (Chrome Canary) to function.");
    app.serveFolder(path.join(__dirname, "/www"));
    await app.exposeFunction("saveImage", saveImage);
    await app.exposeFunction("done", done);
    await app.exposeFunction("saveVideo", saveVideo);
    await app.load("http://localhost:1234");
})();

async function saveImage(base64) {
    recorderA
        .appendImageDataUrl(base64)
        .then(() => {
            // image added
        })
        .catch(error => {
            console.warn("-- Console er", error);
        });
}
function done() {
    recorderA
        .finalize()
        .then(() => {
            console.warn("-- Console done", recorderA);
            recorderA = null;
            const fileName = path.join(
                "pictures",
                new Date().toISOString().replace(/:/g, "-") + ".mp4"
            );
            mjpeg({ fileName: fileName })
                .then(async recorder => {
                    recorderA = recorder;
                })
                .catch(error => {
                    // could not create the file
                    console.warn("-- Console err", error);
                });
            // MP4 video file is ready
        })
        .catch(error => {
            console.warn("-- Console done", error);
        });
}

function saveVideo(base64) {
    // var buffer = Buffer.from(base64, "base64");
    // var buffer = Buffer.from(base64, "base64");
    // console.warn("-- Console v", base64);
    // fs.createWriteStream(path.join("pictures", "vide1.webm")).write(base64);
    // fs.createWriteStream(path.join("pictures", "vide22.webm")).write(buffer);
    // console.warn("-- Console b", base64.buffer);
    // var reader = new FileReader();
    // reader.addEventListener("loadend", function() {
    //     // reader.result contains the contents of blob as a typed array
    //     console.warn(reader.result);
    // });
    // console.warn("-- Console b", base64);
    // reader.readAsArrayBuffer(base64);
    // // if (!fs.existsSync("pictures")) fs.mkdirSync("pictures");
    // console.warn("-- Console b", base64);
    // const fileName = path.join("pictures", base64.name);
    // fs.writeFileSync(path.join("pictures", "vide1.webm"), base64);
}

// const imagemin = require("imagemin");
// const imageminJpegtran = require("imagemin-jpegtran");

//- Console  BlobEvent {isTrusted: true, data: Blob, timecode: 1554257860714.692, type: "dataavailable", target: MediaRecorder, …}
// handleDataAvailable @ run.js:75
// VM482:2 Uncaught (in promise) TypeError: Cannot read property 'appendImageDataUrl' of undefined
//     at saveImage (:1234/DEVELOPMENT/freedcamp-script-runner/carlos/photobooth/main.js:63)
//     at Page._onBindingCalled (:1234/DEVELOPMENT/freedcamp-script-runner/carlos/photobooth/node_modules/puppeteer-core/lib/Page.js:548)
//     at CDPSession.Page.client.on.event (:1234/DEVELOPMENT/freedcamp-script-runner/carlos/photobooth/node_modules/puppeteer-core/lib/Page.js:136)
//     at CDPSession.emit (:1234/events.js:182)
//     at CDPSession._onMessage (:1234/DEVELOPMENT/freedcamp-script-runner/carlos/photobooth/node_modules/puppeteer-core/lib/Connection.js:200)
//     at Connection._onMessage (:1234/DEVELOPMENT/freedcamp-script-runner/carlos/photobooth/node_modules/puppeteer-core/lib/Connection.js:112)
//     at PipeTransport._dispatch (:1234/DEVELOPMENT/freedcamp-script-runner/carlos/photobooth/node_modules/puppeteer-core/lib/PipeTransport.js:59)
//     at Socket.PipeTransport._eventListeners.helper.addEventListener.buffer (:1234/DEVELOPMENT/freedcamp-script-runner/carlos/photobooth/node_modules/puppeteer-core/lib/PipeTransport.js:30)
//     at Socket.emit (:1234/events.js:182)
//     at addChunk (:1234/_stream_readable.js:283)

// or if we have the image as a buffer
// recorder.appendImageBuffer( imageBuffer )
// ...
// var buffer = Buffer.from(base64, "base64");
// if (!fs.existsSync("pictures")) fs.mkdirSync("pictures");
// const fileName = path.join("pictures", new Date().toISOString().replace(/:/g, "-") + ".jpeg");
// fs.writeFileSync(fileName, buffer);

// append a JPEG image as a data URL to the video
// var buffer = Buffer.from(base64, "base64");
// console.warn("-- Console ", base64);
// const ff = await imagemin(base64, "build/images", {
//     plugins: [imageminJpegtran()]
// });
// console.warn("-- Consoleffffff ", ff);
// //

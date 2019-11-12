/* eslint-disable */
var options = {
    controls: true,
    width: 800,
    height: 450,
    fluid: false,
    controlBar: {
        volumePanel: false,
        fullscreenToggle: false
    },
    plugins: {
        record: {
            screen: true
        }
    }
};
let shouldStop = false;
const $ = require("jquery");
let stopped = false;
const mediaSource = new MediaSource();
mediaSource.addEventListener("sourceopen", handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;
var Frame = require("canvas-to-buffer");

const errorMsgElement = document.querySelector("span#errorMsg");
const recordedVideo = document.querySelector("video#recorded");
const recordButton = document.querySelector("button#record");
recordButton.addEventListener("click", () => {
    if (recordButton.textContent === "Start Recording") {
        startRecording();
    } else {
        stopRecording();
        recordButton.textContent = "Start Recording";
        playButton.disabled = false;
        downloadButton.disabled = false;
    }
});

const playButton = document.querySelector("button#play");
playButton.addEventListener("click", () => {
    const superBuffer = new Blob(recordedBlobs, { type: "video/webm" });
    recordedVideo.src = null;
    recordedVideo.srcObject = null;
    recordedVideo.src = window.URL.createObjectURL(superBuffer);
    recordedVideo.controls = true;
    recordedVideo.play();
});

const downloadButton = document.querySelector("button#download");
downloadButton.addEventListener("click", () => {
    const blob = new Blob(recordedBlobs, { type: "video/webm" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "test.webm";
    // downloadLink.href = URL.createObjectURL(new Blob(recordedChunks));
    // downloadLink.download = "acetest.webm";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
});

function handleSourceOpen(event) {
    console.log("MediaSource opened");
    sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
    console.log("Source buffer: ", sourceBuffer);
}
let number = 0;
const factor = 1.1;
function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
        const video = document.getElementById("gum");
        const canvas = document.getElementById("canvas");
        canvas.width = video.videoWidth / factor;
        canvas.height = video.videoHeight / factor;
        const context = canvas.getContext("2d");
        context.drawImage(video, 0, 0, video.videoWidth / factor, video.videoHeight / factor);
        number++;

        saveImage(canvas.toDataURL("image/jpeg")); //.substr("data:image/png;base64,".length)
        // video.classList.add("flashit");
        // setTimeout(() => video.classList.remove("flashit"), 1000);
        // saveImage(event.data);
        recordedBlobs.push(event.data);
    }
}

function startRecording() {
    recordedBlobs = [];
    let options = { mimeType: "video/webm;codecs=vp9" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not Supported`);
        errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
        options = { mimeType: "video/webm;codecs=vp8" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error(`${options.mimeType} is not Supported`);
            errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
            options = { mimeType: "video/webm" };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.error(`${options.mimeType} is not Supported`);
                errorMsgElement.innerHTML = `${options.mimeType} is not Supported`;
                options = { mimeType: "" };
            }
        }
    }

    try {
        mediaRecorder = new MediaRecorder(window.stream, options);
    } catch (e) {
        console.error("Exception while creating MediaRecorder:", e);
        errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
        return;
    }

    console.log("Created MediaRecorder", mediaRecorder, "with options", options);
    recordButton.textContent = "Stop Recording";
    playButton.disabled = true;
    downloadButton.disabled = true;
    mediaRecorder.onstop = event => {
        console.log("Recorder stopped: ", event);
    };
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(10); // collect 10ms of data
    console.log("MediaRecorder started", mediaRecorder);
}

function stopRecording() {
    mediaRecorder.stop();
    console.log("Recorded Blobs: ", recordedBlobs);

    done();
}

function handleSuccess(stream) {
    recordButton.disabled = false;
    console.log("getUserMedia() got stream:", stream);
    window.stream = stream;

    const gumVideo = document.querySelector("video#gum");
    gumVideo.srcObject = stream;
}

// async function init(constraints) {
//     try {
//         const stream = await navigator.mediaDevices.getUserMedia(constraints);
//     } catch (e) {
//         console.error("navigator.getUserMedia error:", e);
//         errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
//     }
// }
//
// document.querySelector("button#start").addEventListener("click", () => {
//     const hasEchoCancellation = document.querySelector("#echoCancellation").checked;
//     const constraints = {
//         audio: {
//             echoCancellation: { exact: hasEchoCancellation }
//         },
//         video: {
//             width: 1280,
//             height: 720
//         }
//     };
//     console.log("Using media constraints:", constraints);
//     // await init(constraints);
// });
$(() => {
    const video = document.getElementById("video");
    const downloadLink = document.getElementById("download");

    $("#recorder").on("change", function(e) {
        var file = e.target.files[0];
        // Do something with the video file.
        // video.src = URL.createObjectURL(file);
        saveVideo(file);
    });

    navigator.mediaDevices
        .getDisplayMedia({
            video: {
            },
            audio: false
        })
        .then(stream => {
            handleSuccess(stream);
        });
    $("#change").on("click", function() {
        navigator.mediaDevices
            .getDisplayMedia({
                video: {
                    cursor: "never"
                },
                audio: false
            })
            .then(stream => {
                handleSuccess(stream);
            });
    });
    $("#button").on("click", function() {
        // startCapture();
        alert("ASD");
        // stopButton.addEventListener('click', function() {
        shouldStop = true;
        // })
        // stopCapture();
    });
});

function captureScreenshot() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    saveImage(canvas.toDataURL("image/jpeg").substr("data:image/jpeg;base64,".length));
    video.classList.add("flashit");
    setTimeout(() => video.classList.remove("flashit"), 1000);
}

// // console.warn("-- Console th", th);
// // // setInterval(() => {
// // //     captureScreenshot();
// // // }, 300);
// // // apply some workarounds for certain browsers
// // applyVideoWorkaround();
// // applyScreenWorkaround();
// // var player = videojs("video", options, function() {
// //     // print version information at startup
// //     var msg =
// //         "Using video.js " +
// //         videojs.VERSION +
// //         " with videojs-record " +
// //         videojs.getPluginVersion("record") +
// //         " and recordrtc " +
// //         RecordRTC.version;
// //     videojs.log(msg);
// // });
// // // error handling
// // player.on("deviceError", function() {
// //     console.warn("device error:", player.deviceErrorCode);
// // });
// // player.on("error", function(element, error) {
// //     console.error(error);
// // });
// // // snapshot is available
// // player.on("finishRecord", function() {
// //     // the blob object contains the image data that
// //     // can be downloaded by the user, stored on server etc.
// //     console.log("screen capture ready: ", player.recordedData);
// //     player.record().saveAs({'video': 'my-video-file-name.webm'});
// //
// //     saveVideo(player.recordedData);
// // });
// video.srcObject = stream;
//
// const options = { mimeType: "video/webm" };
// const recordedChunks = [];
// const mediaRecorder = new MediaRecorder(stream, options);
//
// mediaRecorder.addEventListener("dataavailable", function(e) {
//     console.warn("-- Console ", e);
//     video.srcObject = stream;
//
//     if (e.data.size > 0) {
//         recordedChunks.push(e.data);
//     }
//
//     if (shouldStop === true && stopped === false) {
//         mediaRecorder.stop();
//         stopped = true;
//     }
// });
//
// mediaRecorder.addEventListener("stop", function() {
//     downloadLink.href = URL.createObjectURL(new Blob(recordedChunks));
//     downloadLink.download = "acetest.webm";
// });
//
// mediaRecorder.start();

// navigator.mediaDevices.getUserMedia({ video: true }).then(th => {
//     console.warn("-- Console th", th);
//     video.srcObject = th;
// });
// Set event listeners for the start and stop buttons

// $("#nameofVid").val("Vid-" + Date.now() + "love");
// var frame = new Frame(canvas);
// canvas.toDataURL("image/jpeg");
// Automatically detects image type and does the conversion
// var buffer = frame.toBuffer();
//
// saveImage(canvas.toDataURL("image/jpeg", 1).substr("data:image/jpeg;base64,".length));

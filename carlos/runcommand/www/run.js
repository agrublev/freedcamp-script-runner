/* eslint-disable */
const $ = require("jquery");
function callMe(e) {
    console.warn("show", e);
}
$(function() {
    // setTimeout(() => {
    // }, 2000);
});
// runCommand(callMe);
window.callMe = function(e) {
    console.warn("-- Console ee", e);
};
class Frontend {}

async function load(backend) {
    // Web world can now use backend RPC handle.
    console.log(await backend.hello('from frontend'));
    await backend.setFrontend(rpc.handle(new Frontend));
}
// saveImage("callMe");

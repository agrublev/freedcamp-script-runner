// const exec = require("child_process").exec;
const bump = require("npm-version-bump");

const dir = "./";
const version = "patch";

function precommit(callback) {
    console.log("TODO PRECOMMIT");
    //     exec("./build.sh", callback);
}
bump(dir, version, precommit, function(err) {
    if (err) throw err;
});

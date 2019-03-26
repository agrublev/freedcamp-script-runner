#!/usr/bin/env node
const firstRun = require("first-run");

const h = {};

h.clearFirstRun = () => {
    firstRun.clear();
};

h.isFirstRun = () => {
    return firstRun();
};

h.versionUpdater = () => {
    const updateNotifier = require("update-notifier");
    const pkg = require("../../package.json");
    // Checks for available update and returns an instance
    const notifier = updateNotifier({ pkg });

    // Notify using the built-in convenience method
    notifier.notify();
    // updateNotifier({ pkg }).notify();
};

h.setTitle = title => {
    process.stdout.write(String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7));
};

h.clear = (hard = false) => {
    process.stdout.write("\x1b[2J");
    process.stdout.write("\x1b[0f");
    if (hard) {
        process.stdout.write("\033c");
    }
};

module.exports = h;

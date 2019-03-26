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
    console.log(notifier.update);
    // updateNotifier({ pkg }).notify();
};

module.exports = h;

#!/usr/bin/env node

"use strict";

const carlo = require("carlo");
const path = require("path");
const { rpc, rpc_process } = require("carlo/rpc");

class TerminalApp {
    constructor() {
        this.lastTop_ = 50;
        this.lastLeft_ = 50;
        this.launch_();
        this.handle_ = rpc.handle(this);
    }

    async launch_() {
        try {
            this.app_ = await carlo.launch({
                bgcolor: "#2b2e3b",
                title: "Script Runner",
                width: 960,
                height: 800,
                channel: ["canary", "stable"],
                icon: path.join(__dirname, "/app_icon.png"),
                top: this.lastTop_,
                left: this.lastLeft_
            });
        } catch (e) {
            console.log("Reusing the running instance");
            return;
        }
        this.app_.on("exit", () => process.exit());
        this.app_.serveFolder(path.join(__dirname, "www"));
        this.app_.serveFolder(path.join(__dirname, "node_modules"), "node_modules");
        this.app_.on("window", win => this.initUI_(win));
        this.initUI_(this.app_.mainWindow());
    }

    async newWindow() {
        this.lastTop_ = (this.lastTop_ + 50) % 200;
        this.lastLeft_ += 50;
        const options = { top: this.lastTop_, left: this.lastLeft_ };
        this.app_.createWindow(options);
    }

    async initUI_(win) {
        const term = await rpc_process.spawn("worker.js");
        win.load("index.html", this.handle_, term);
    }
}

new TerminalApp();

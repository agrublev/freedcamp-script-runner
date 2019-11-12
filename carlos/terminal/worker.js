#!/usr/bin/env node
"use strict";

const EventEmitter = require("events");
const os = require("os");
const pty = require("ndb-node-pty-prebuilt");
const { rpc, rpc_process } = require("carlo/rpc");

class Terminal extends EventEmitter {
    constructor() {
        super();
        const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
        this.term_ = pty.spawn(shell, [], {
            name: "xterm-color",
            cwd: process.env.PWD,
            env: process.env
        });
        this.term_.on("data", data => this.emit("data", data));
    }

    on(event, func) {
        // EventEmitter returns heavy object that we don't want to
        // send over the wire.
        super.on(event, func);
    }

    resize(cols, rows) {
        this.term_.resize(cols, rows);
    }

    write(data) {
        this.term_.write(data);
    }

    dispose() {
        process.kill(this._term.pid);
    }
}

rpc_process.init(() => rpc.handle(new Terminal()));

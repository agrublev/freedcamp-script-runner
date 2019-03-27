var CLI = require("clui"),
    clear = CLI.Clear,
    clc = require("cli-color");

var Line = CLI.Line,
    Gauge = CLI.Gauge;
clear();

var blankLine = new Line().fill().output();

var total = 100;
var used = 50;
var human = Math.ceil(used / 1000000) + " MB";

var memoryLine = new Line()
    .padding(2)
    .column("Memory In Use", 20, [clc.cyan])
    .column(Gauge(used, total, 20, total * 0.8, human), 40)
    .fill()
    .output();

blankLine.output();


// drawTimeout = setTimeout(draw, 1000);

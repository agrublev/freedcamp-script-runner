const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");

const MappedChoices = {
    "Run project locally": "yarn start",
    "Choose a Firebase project": () => {
        execute("firebase list | sed 's/\x1b\\[[0-9;]*m//g'", function(table) {
            // console.log(table);
            let lines = table.split("\n");
            // lines.unshift();
            let projects = lines.filter(e => e.indexOf("────") === -1);
            console.warn(projects);
            projects = projects.map(e =>
                e
                    .split("│")
                    .map(e => e.trim())
                    .filter(z => z.length > 1)
            );
            let res = [];
            projects.forEach(line => {
                if (line.length) {
                    if (line[0] !== "Name") {
                        res.push(line[1]);
                    }
                }
                // if(line[0].)
            });
            console.log("LIUST", res);
            inquirer
                .prompt([
                    {
                        type: "list",
                        choices: res,
                        name: "projectChoice",
                        message: "Which project"
                    }
                ])
                .then(({ projectChoice }) => {
                    console.warn("CHOSEN", projectChoice);

                    runCommand("firebase use " + projectChoice);
                });
        });
    },
    "SUGRGE.SH: Set your sub domain": () => {
        inquirer
            .prompt([
                {
                    type: "input",
                    name: "name",
                    message: "Choose domain name {DOMAIN}.surge.sh: (do not type surge.sh)"
                }
            ])
            .then(({ name }) => {
                fs.writeFile("CNAME", name + ".surge.sh", err => {
                    // throws an error, you could also catch it here
                    if (err) throw err;

                    // success case, the file was saved
                    console.log("Domain saved!");
                });
            });
        //
    },
    "SURGE.SH: Deploy to internet": "surge dist " + fs.readFileSync("CNAME"),
    "Login to Firebase": "firebase login",
    "Create Firebase project": "firebase init",
    "Deploy Firebase project to web": "yarn deploy"
};

inquirer
    .prompt([
        {
            type: "list",
            choices: Object.keys(MappedChoices),
            name: "choice",
            message: "Whatcha wanna do:"
        }
    ])
    .then(({ choice }) => {
        if (typeof MappedChoices[choice] === "string") {
            runCommand(MappedChoices[choice]);
        } else {
            MappedChoices[choice]();
        }

        // return exec();
    });

var exec = require("child_process").exec;
function execute(command, callback) {
    exec(command, function(error, stdout, stderr) {
        callback(stdout);
    });
}

function runCommand(cmdChoice) {
    const { spawn } = require("child_process");
    let pars = cmdChoice.split(" ");
    const shell = spawn(pars[0], pars.slice(1, pars.length), { stdio: "inherit" });

    shell.on("close", code => {
        console.log(`${chalk.bold.green("Finished")}`);
    });
}

function execCommand(cmdChoice) {
    const { spawn } = require("child_process");
    let pars = cmdChoice.split(" ");
    const shell = spawn(pars[0], pars.slice(1, pars.length), { stdio: "inherit" });
    return new Promise(resolve => {
        shell.on("close", code => {
            console.log(`${chalk.bold.green("Finished")}`);
            resolve();
        });
    });
}

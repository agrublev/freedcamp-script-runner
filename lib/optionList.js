const separator = "   ~   ";
const chalk = require("chalk");

const { prompt } = require("enquirer");
const optionList = async () => {
    let choiceCategories = [
        {
            name: "start",
            message: "Choose category then task to run"
        },
        {
            name: "list",
            message: "Select any task with text autocompletion"
        },
        {
            name: "scripts",
            message: "Choose a script from package.json"
        },
        {
            name: "encryption",
            message: "Encrypt/Decrypt secret files"
        },
        {
            name: "clear",
            message: "Clear recent task history"
        },
        {
            name: "generate",
            message: "Generate a sample fscripts.md file from the package.json"
        },
        {
            name: "toc",
            message: "Generate updated Table of Contents on top of the fscripts.md file"
        },
        {
            name: "--help",
            message: "See full help documentation"
        }
    ];
    try {
        let { answer } = await prompt({
            type: "select",
            name: `answer`,
            choiceMessage: e => {
                // return JSON.stringify(e)
                // return e.message;
                return chalk.bgBlack.bold.hex("#ac80fd")(
                    e.name + ":" + chalk.gray(" " + e.message)
                );
            },
            message: `${chalk.green.bold.underline("Whatz category do you want to run?")}`,
            choices: choiceCategories
        });
        return answer;
    } catch (e) {
        return false;
    }
};

module.exports = optionList;

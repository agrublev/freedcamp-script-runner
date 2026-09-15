import inquirer from "inquirer";
import chalk from "chalk";

const promptQuestion = async (extended = {}, message = `name it:`) => {
    // Ink releases its stdin reference when an interactive picker exits. Keep
    // the process alive while Inquirer takes over the same terminal; without
    // this, Node can emit a normal exit (0, null) before the prompt receives
    // input, which Inquirer reports as ExitPromptError.
    process.stdin.ref?.();

    if (extended.type === "list") {
        extended.type = "select";
    }
    if (extended.message) {
        message = extended.message;
    }
    if (extended.choices && extended.choices[0].message && !extended.choices[0].name) {
        extended.choices = extended.choices.map((e) => {
            return { name: e.message, value: e.value };
        });
    }
    if (extended.limit) {
        extended.pageSize = extended.limit;
        delete extended.limit;
    }
    const { answer } = await inquirer.prompt([
        {
            type: "input",
            message: chalk.green.bold.underline(message),
            name: "answer",
            ...extended
        }
    ]);
    return answer;
};

export default promptQuestion;

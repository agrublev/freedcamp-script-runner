import runCLICommand from "./runCLICommand.js";
import parseTask from "./parseTask.js";
import chalk from "chalk";
import fsrLog from "../utils/console.js";

const runSequence = async (tasks, FcScripts) => {
    for (const taskName of tasks) {
        const taskData = FcScripts.allTasks.find((z) => z.name === taskName);
        if (!taskData) {
            fsrLog.error(`${chalk.bold.underline.red("Task not found")} ${taskName}`);
            continue;
        }

        try {
            await runCLICommand(parseTask(taskData));
        } catch (error) {
            // runCLICommand reports task errors itself; keep the sequence going.
        }
    }
};

export default runSequence;

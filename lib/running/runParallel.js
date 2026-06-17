import runCLICommand from "./runCLICommand.js";
import parseTask from "./parseTask.js";
import chalk from "chalk";

const runParallel = async (tasks, FcScripts) => {
    await Promise.all(
        tasks.map(async (taskName) => {
            const taskData = FcScripts.allTasks.find((z) => z.name === taskName);
            if (!taskData) {
                console.error(`${chalk.bold.underline.red("Task not found")} ${taskName}`);
                return;
            }

            try {
                await runCLICommand(parseTask(taskData));
            } catch (error) {
                // runCLICommand reports task errors itself; let siblings finish.
            }
        })
    );
};

export default runParallel;

import chalk from "chalk";
import { runCLICommand, runParallel, runSequence, parseTask, parseScriptFile } from "@fsr/core";
import fsrLog from "@fsr/core/utils/console.js";

/** @type {import("@fsr/cli").CommandDefinition[]} */
const commands = [
    {
        cmd: "run [task]",
        desc: "Run a specific task by name",
        builder: (y) => y.positional("task", { describe: "task name", default: "" }),
        handler: async (argv) => {
            const { task } = argv;
            const parsed = await parseScriptFile(argv.env ? { env: argv.env } : {});
            if (!parsed) {
                fsrLog.error(chalk.bold.underline.red("No fscripts.md file found"));
                return;
            }
            const taskData = parsed.allTasks.find((t) => t.name === task);
            if (!taskData) {
                fsrLog.error(`${chalk.bold.underline.red("Task not found")} ${task}`);
                return;
            }
            await runCLICommand(parseTask(taskData));
        },
        examples: [["$0 run start:web", "Run task 'start:web'"]],
        menu: true
    },
    {
        cmd: "run-s [tasks..]",
        desc: "Run a set of tasks sequentially",
        handler: async (argv) =>
            runSequence(argv.tasks || [], await parseScriptFile(argv.env ? { env: argv.env } : {})),
        examples: [["$0 run-s start:web start:desktop", "Run start:web then start:desktop"]],
        menu: true
    },
    {
        cmd: "run-p [tasks..]",
        desc: "Run tasks in parallel",
        handler: async (argv) =>
            runParallel(argv.tasks || [], await parseScriptFile(argv.env ? { env: argv.env } : {})),
        examples: [
            ["$0 run-p start:web start:desktop", "Run start:web and start:desktop simultaneously"]
        ],
        menu: true
    }
];
export default commands;

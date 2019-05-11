const runCLICommand = require("./runCLICommand");

const runParallel = async (tasks, FcScripts) => {
    for (let t in tasks) {
        let taskName = tasks[t];
        let taskIndex = FcScripts.allTasks.findIndex(t => t.name === taskName);
        let script = FcScripts.allTasks[taskIndex].script;
        let params = script.split(" ");
        let type = params.shift();

        runCLICommand({
            task: { name: taskName },
            script: {
                type: type,
                rest: params
            }
        });
    }
};

module.exports = runParallel;

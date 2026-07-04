import validateNotInDev from "./validateNotDev.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "branch",
    desc: "Create a new branch — prevents commits directly on master or development",
    handler: async () => validateNotInDev()
};

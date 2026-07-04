import commit from "./commit.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "commit",
    desc: "Stage and commit changes with AI-generated conventional commit messages",
    handler: async () => commit()
};

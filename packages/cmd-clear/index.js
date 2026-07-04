import { clearRecent } from "@fsr/core";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "clear",
    desc: "Clear recent task history",
    handler: async () => clearRecent()
};

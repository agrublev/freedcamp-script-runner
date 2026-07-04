import doctor from "./doctor.js";

/** @type {import("@fsr/cli").CommandDefinition} */
export default {
    cmd: "doctor",
    desc: "Run diagnostics and check system health",
    builder: (y) =>
        y
            .option("fix", {
                alias: "f",
                type: "boolean",
                description: "Auto-fix issues when possible",
                default: false
            })
            .option("json", {
                type: "boolean",
                description: "Output results as JSON",
                default: false
            })
            .option("verbose", {
                alias: "v",
                type: "boolean",
                description: "Show verbose output",
                default: false
            }),
    handler: async (argv) => doctor(argv),
    examples: [
        ["$0 doctor --fix", "Run diagnostics and auto-fix issues"],
        ["$0 doctor --json", "Output results as JSON"]
    ],
    menu: true
};

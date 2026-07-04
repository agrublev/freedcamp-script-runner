export * from "./helpers.js";
export { default as clear } from "./clear.js";
const normalizeEnv = (v) => {
    if (v === "prod") return "production";
    if (v === "dev") return "development";
    return v;
};

export function getEnvArg(args) {
    let env = null;
    const cleaned = [];
    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        if (arg === "--prod") {
            env = "production";
        } else if (arg === "--dev") {
            env = "development";
        } else if (arg.startsWith("--env=")) {
            env = normalizeEnv(arg.slice("--env=".length)) || null;
        } else if (arg === "--env") {
            const next = args[i + 1];
            if (next && !next.startsWith("-")) {
                env = normalizeEnv(next);
                i++;
            }
        } else if (arg === "-e") {
            const next = args[i + 1];
            if (next && !next.startsWith("-")) {
                env = normalizeEnv(next);
                i++;
            }
        } else {
            cleaned.push(arg);
        }
        i++;
    }
    return { env, args: cleaned };
}

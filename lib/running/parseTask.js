/**
 * Build the `runCLICommand` payload from a parsed task definition.
 *
 * For bash tasks, a leading run of `KEY=value` assignments is split off into
 * `env`, the next token becomes the executable (`type`), and the remainder is
 * the argument string (`full`). JavaScript tasks are passed through verbatim so
 * the whole block is executed as a module.
 *
 * When `taskData.env` is set (populated from `## [env:name]` headings and the
 * `--env` CLI flag), `NODE_ENV` and `FSR_ENV` are merged into `script.env` so
 * every spawned child process inherits the active environment profile, even when
 * the task script does not set them explicitly.
 *
 * @param {{name: string, script: string, lang: string, env?: string}} taskData
 * @returns {{task: {name: string}, script: {lang: string, env: Object, type: string, full: string, rest: string[]}}}
 */
const parseTask = (taskData) => {
    const { name, script, lang, env: envProfile } = taskData;

    // Build the base env vars from the environment profile name (if any).
    // process.env is already patched by the top-level --env injection in
    // index.js; this ensures the explicit script.env overlay in runCLICommand
    // also carries the correct values for clarity and correctness.
    const profileEnv = envProfile
        ? { NODE_ENV: envProfile, FSR_ENV: envProfile }
        : {};

    if (lang === "javascript") {
        return {
            task: { name },
            script: { lang, env: { ...profileEnv }, type: "node", full: script, rest: [] }
        };
    }

    const tokens = script.split(" ");
    const env = { ...profileEnv };
    while (tokens.length && tokens[0].includes("=")) {
        const token = tokens.shift();
        const eq = token.indexOf("=");
        env[token.slice(0, eq)] = token.slice(eq + 1);
    }

    const type = tokens.shift() ?? "";
    const rest = tokens.join(" ");

    return {
        task: { name },
        script: { lang, env, type, full: rest, rest: rest.split(" ") }
    };
};

export default parseTask;

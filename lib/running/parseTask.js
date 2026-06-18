/**
 * Build the `runCLICommand` payload from a parsed task definition.
 *
 * For bash tasks, a leading run of `KEY=value` assignments is split off into
 * `env`, the next token becomes the executable (`type`), and the remainder is
 * the argument string (`full`). JavaScript tasks are passed through verbatim so
 * the whole block is executed as a module.
 *
 * @param {{name: string, script: string, lang: string}} taskData
 * @returns {{task: {name: string}, script: {lang: string, env: Object, type: string, full: string, rest: string[]}}}
 */
const parseTask = (taskData) => {
    const { name, script, lang } = taskData;

    if (lang === "javascript") {
        return {
            task: { name },
            script: { lang, env: {}, type: "node", full: script, rest: [] }
        };
    }

    const tokens = script.split(" ");
    const env = {};
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

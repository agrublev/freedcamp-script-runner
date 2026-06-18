import { describe, it, expect } from "vitest";
import parseTask from "../../lib/running/parseTask.js";

describe("parseTask", () => {
    it("passes javascript tasks through verbatim", () => {
        const out = parseTask({ name: "build", script: "await run();", lang: "javascript" });
        expect(out).toEqual({
            task: { name: "build" },
            script: { lang: "javascript", env: {}, type: "node", full: "await run();", rest: [] }
        });
    });

    it("splits leading KEY=value assignments into env and uses the next token as the executable", () => {
        const out = parseTask({
            name: "serve",
            script: "NODE_ENV=prod PORT=3000 node server.js --watch",
            lang: "bash"
        });
        expect(out.task).toEqual({ name: "serve" });
        expect(out.script.lang).toBe("bash");
        expect(out.script.env).toEqual({ NODE_ENV: "prod", PORT: "3000" });
        expect(out.script.type).toBe("node");
        expect(out.script.full).toBe("server.js --watch");
        expect(out.script.rest).toEqual(["server.js", "--watch"]);
    });

    it("defaults type to an empty string when only env assignments are present", () => {
        const out = parseTask({ name: "envonly", script: "FOO=bar", lang: "bash" });
        expect(out.script.env).toEqual({ FOO: "bar" });
        expect(out.script.type).toBe("");
        expect(out.script.full).toBe("");
        expect(out.script.rest).toEqual([""]);
    });
});

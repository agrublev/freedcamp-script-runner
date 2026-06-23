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

describe("parseTask — env profile injection (taskData.env)", () => {
    it("injects NODE_ENV and FSR_ENV when taskData.env is set (bash task)", () => {
        const out = parseTask({ name: "serve", script: "node server.js", lang: "bash", env: "staging" });
        expect(out.script.env).toMatchObject({ NODE_ENV: "staging", FSR_ENV: "staging" });
    });

    it("injects NODE_ENV and FSR_ENV when taskData.env is set (javascript task)", () => {
        const out = parseTask({ name: "build", script: "await run();", lang: "javascript", env: "production" });
        expect(out.script.env).toEqual({ NODE_ENV: "production", FSR_ENV: "production" });
    });

    it("does not inject profile env vars when taskData.env is absent (bash task)", () => {
        const out = parseTask({ name: "serve", script: "node server.js", lang: "bash" });
        expect(out.script.env).toEqual({});
    });

    it("does not inject profile env vars when taskData.env is absent (javascript task)", () => {
        const out = parseTask({ name: "build", script: "await run();", lang: "javascript" });
        expect(out.script.env).toEqual({});
    });

    it("inline KEY=value assignments in the script override the profile NODE_ENV", () => {
        // The developer explicitly set NODE_ENV=test in the script; that wins over the profile.
        const out = parseTask({
            name: "test",
            script: "NODE_ENV=test jest",
            lang: "bash",
            env: "staging"
        });
        expect(out.script.env.NODE_ENV).toBe("test");
        // FSR_ENV still comes from the profile since the script did not override it
        expect(out.script.env.FSR_ENV).toBe("staging");
    });
});

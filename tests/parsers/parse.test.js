import { describe, it, expect } from "vitest";
import parse from "../../lib/parsers/parse.js";

describe("parse – existing behaviour (no env profiles)", () => {
    it("reads a category description and a task with description + code block", () => {
        const md = [
            "# Group",
            "",
            "The group description.",
            "",
            "## task-a",
            "",
            "Does A.",
            "",
            "```bash",
            "echo a",
            "```",
            ""
        ].join("\n");

        const { categories, allTasks } = parse(md);
        expect(categories[0].name).toBe("Group");
        expect(categories[0].description).toBe("The group description.");

        const a = allTasks.find((t) => t.name === "task-a");
        expect(a.description).toBe("Does A.");
        expect(a.lang).toBe("bash");
        expect(a.script).toBe("echo a");
        expect(a.order).toBe(0);
    });

    it("treats a code block directly under a task heading as the script (no description)", () => {
        const md = [
            "# Group",
            "",
            "## task-b",
            "",
            "```javascript",
            'console.log("b")',
            "```",
            ""
        ].join("\n");

        const { allTasks } = parse(md);
        const b = allTasks.find((t) => t.name === "task-b");
        expect(b).toBeTruthy();
        expect(b.description).toBe("");
        expect(b.lang).toBe("javascript");
        expect(b.script).toBe('console.log("b")');
    });

    it("leaves the script empty when a task heading has no following code block", () => {
        const md = ["# Group", "", "## lonely", ""].join("\n");

        const { allTasks } = parse(md);
        const t = allTasks.find((x) => x.name === "lonely");
        expect(t).toBeTruthy();
        expect(t.script).toBe("");
        expect(t.lang).toBeUndefined();
    });

    it("attaches env: null to tasks when no env section is present", () => {
        const md = ["# Group", "", "## my-task", "", "```bash", "echo hi", "```", ""].join("\n");

        const { allTasks } = parse(md);
        expect(allTasks[0].env).toBeNull();
    });
});

describe("parse – environment profile sections", () => {
    const ENV_MD = [
        "# Deployment",
        "",
        "## [env:staging]",
        "",
        "## deploy:api",
        "",
        "Deploy to staging.",
        "",
        "```bash",
        "node deploy.js staging",
        "```",
        "",
        "## deploy:web",
        "",
        "```bash",
        "node web.js staging",
        "```",
        "",
        "## [env:production]",
        "",
        "## deploy:api",
        "",
        "Deploy to production.",
        "",
        "```bash",
        "node deploy.js production",
        "```",
        ""
    ].join("\n");

    it("does not create a task entry for an env section header", () => {
        const { allTasks } = parse(ENV_MD);
        const envHeaders = allTasks.filter(
            (t) => t.name.startsWith("[env:") && t.name.endsWith("]")
        );
        expect(envHeaders).toHaveLength(0);
    });

    it("attaches the correct env tag to tasks following a section header", () => {
        const { allTasks } = parse(ENV_MD);
        const stagingTasks = allTasks.filter((t) => t.env === "staging");
        expect(stagingTasks).toHaveLength(2);
        expect(stagingTasks.map((t) => t.name)).toContain("deploy:api");
        expect(stagingTasks.map((t) => t.name)).toContain("deploy:web");
    });

    it("switches env tag when a new env section header is encountered", () => {
        const { allTasks } = parse(ENV_MD);
        const prodTasks = allTasks.filter((t) => t.env === "production");
        expect(prodTasks).toHaveLength(1);
        expect(prodTasks[0].name).toBe("deploy:api");
    });

    it("tasks with the same name in different env sections coexist in allTasks", () => {
        const { allTasks } = parse(ENV_MD);
        const deployApiTasks = allTasks.filter((t) => t.name === "deploy:api");
        expect(deployApiTasks).toHaveLength(2);
        const envs = deployApiTasks.map((t) => t.env).sort();
        expect(envs).toEqual(["production", "staging"]);
    });

    it("resets the env tag when a new # category is encountered", () => {
        const md = [
            "# Section A",
            "",
            "## [env:dev]",
            "",
            "## task-a",
            "",
            "```bash",
            "echo a",
            "```",
            "",
            "# Section B",
            "",
            "## task-b",
            "",
            "```bash",
            "echo b",
            "```",
            ""
        ].join("\n");

        const { allTasks } = parse(md);
        const a = allTasks.find((t) => t.name === "task-a");
        const b = allTasks.find((t) => t.name === "task-b");
        expect(a.env).toBe("dev");
        expect(b.env).toBeNull(); // reset when # heading encountered
    });

    it("tasks before any env section header get env: null", () => {
        const md = [
            "# Group",
            "",
            "## early-task",
            "",
            "```bash",
            "echo early",
            "```",
            "",
            "## [env:prod]",
            "",
            "## late-task",
            "",
            "```bash",
            "echo late",
            "```",
            ""
        ].join("\n");

        const { allTasks } = parse(md);
        const early = allTasks.find((t) => t.name === "early-task");
        const late = allTasks.find((t) => t.name === "late-task");
        expect(early.env).toBeNull();
        expect(late.env).toBe("prod");
    });

    it("preserves task description, lang and script in env-tagged tasks", () => {
        const md = [
            "# Group",
            "",
            "## [env:qa]",
            "",
            "## run:smoke",
            "",
            "Run smoke tests.",
            "",
            "```bash",
            "vitest run smoke",
            "```",
            ""
        ].join("\n");

        const { allTasks } = parse(md);
        const t = allTasks.find((t) => t.name === "run:smoke");
        expect(t.env).toBe("qa");
        expect(t.description).toBe("Run smoke tests.");
        expect(t.lang).toBe("bash");
        expect(t.script).toBe("vitest run smoke");
    });

    it("handles env section names with hyphens and dots", () => {
        const md = [
            "# Group",
            "",
            "## [env:my-env.v2]",
            "",
            "## some-task",
            "",
            "```bash",
            "echo hi",
            "```",
            ""
        ].join("\n");

        const { allTasks } = parse(md);
        const t = allTasks.find((t) => t.name === "some-task");
        expect(t.env).toBe("my-env.v2");
    });
});

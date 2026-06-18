import { describe, it, expect } from "vitest";
import parse from "../../lib/parsers/parse.js";

describe("parse", () => {
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
});

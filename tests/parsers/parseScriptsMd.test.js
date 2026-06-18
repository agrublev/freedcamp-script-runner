import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// We create actual temp fscripts.md files so the parser reads real files
// instead of relying on brittle fs mocks that break after vi.resetModules().

const SAMPLE_MD = `# Dev Scripts

Scripts for development.

## build

Build the project.

\`\`\`bash
rimraf dist && mkdir -p dist
\`\`\`

## test:unit

Run unit tests.

\`\`\`bash
vitest run
\`\`\`

## deploy

Deploy to production.

\`\`\`bash
node scripts/deploy.js
\`\`\`

# Server Scripts

Server management.

## start:server

Start the dev server.

\`\`\`bash
node server.js
\`\`\`

## start:api

Start the API.

\`\`\`bash
node api.js
\`\`\`
`;

const SAMPLE_WITH_TOC = `- [Scripts](#scripts)
  - [build](#build)

<!-- end toc -->

# Scripts

## build

\`\`\`bash
rimraf dist
\`\`\`
`;

const JS_TASK_MD = `# Scripts

## hello

\`\`\`javascript
console.log('hello')
\`\`\`
`;

const NO_DESCRIPTION_MD = `# Scripts

## mytask

\`\`\`bash
echo hello
\`\`\`
`;

// Mock the cached module since tests use { useCache: false }
vi.mock("../../lib/parsers/parseScriptsMd.cached.js", () => ({
    default: vi.fn()
}));

function withTempFscripts(content, fn) {
    const dir = mkdtempSync(join(tmpdir(), "fscr-test-"));
    const file = join(dir, "fscripts.md");
    writeFileSync(file, content, "utf-8");
    const origCwd = process.cwd;
    process.cwd = () => dir;
    try {
        return fn(dir);
    } finally {
        process.cwd = origCwd;
        try { unlinkSync(file); } catch {}
    }
}

describe("parseScriptsMd – parse()", () => {
    it("returns categories and allTasks from a valid markdown file", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            expect(result).toBeTruthy();
            expect(result.categories).toBeInstanceOf(Array);
            expect(result.allTasks).toBeInstanceOf(Array);
        });
    });

    it("parses correct number of categories", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            expect(result.categories.length).toBe(2);
            expect(result.categories[0].name).toBe("Dev Scripts");
            expect(result.categories[1].name).toBe("Server Scripts");
        });
    });

    it("parses all tasks correctly", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            const taskNames = result.allTasks.map((t) => t.name);
            expect(taskNames).toContain("build");
            expect(taskNames).toContain("test:unit");
            expect(taskNames).toContain("deploy");
            expect(taskNames).toContain("start:server");
            expect(taskNames).toContain("start:api");
        });
    });

    it("sets correct lang on bash tasks", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            const buildTask = result.allTasks.find((t) => t.name === "build");
            expect(buildTask.lang).toBe("bash");
        });
    });

    it("sets correct script content", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            const buildTask = result.allTasks.find((t) => t.name === "build");
            expect(buildTask.script).toContain("rimraf dist");
        });
    });

    it("assigns task order within each category", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            const devTasks = result.categories[0].tasks;
            const taskOrders = Object.values(devTasks).map((t) => t.order);
            expect(taskOrders).toContain(0);
            expect(taskOrders).toContain(1);
        });
    });

    it("strips TOC section before parsing", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_WITH_TOC, async () => {
            const result = await parseScriptFile({ useCache: false });
            expect(result.categories[0].name).toBe("Scripts");
            expect(result.allTasks[0].name).toBe("build");
        });
    });
});

describe("parseScriptsMd – javascript lang", () => {
    it("parses javascript lang tasks correctly", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(JS_TASK_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            const helloTask = result.allTasks.find((t) => t.name === "hello");
            expect(helloTask).toBeTruthy();
            expect(helloTask.lang).toBe("javascript");
            expect(helloTask.script).toContain("console.log");
        });
    });
});

describe("parseScriptsMd – tasks without descriptions", () => {
    it("handles tasks with no description paragraph", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(NO_DESCRIPTION_MD, async () => {
            const result = await parseScriptFile({ useCache: false });
            const task = result.allTasks.find((t) => t.name === "mytask");
            expect(task).toBeTruthy();
            expect(task.script).toBe("echo hello");
        });
    });
});

describe("parseScriptsMd – empty file", () => {
    it("returns empty structure for empty file", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts("", async () => {
            const result = await parseScriptFile({ useCache: false });
            expect(result).toEqual({ categories: [], allTasks: [] });
        });
    });
});

describe("parseScriptsMd – missing file", () => {
    it("returns false when fscripts.md does not exist in the cwd", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        const dir = mkdtempSync(join(tmpdir(), "fscr-missing-"));
        const origCwd = process.cwd;
        process.cwd = () => dir;
        try {
            const result = await parseScriptFile({ useCache: false });
            expect(result).toBe(false);
        } finally {
            process.cwd = origCwd;
        }
    });
});

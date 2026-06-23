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

/**
 * fscripts.md with both plain tasks and env-profiled tasks.
 * Intentionally mixes un-profiled and profiled tasks in the same file
 * so we can verify backward-compat and filtering in the same fixture.
 */
const ENV_PROFILES_MD = `# Build

## build

\`\`\`bash
rimraf dist
\`\`\`

## [env:staging]

## deploy:api

Deploy to staging.

\`\`\`bash
node deploy.js staging
\`\`\`

## deploy:web

\`\`\`bash
node web.js staging
\`\`\`

## [env:production]

## deploy:api

Deploy to production.

\`\`\`bash
node deploy.js production
\`\`\`

# Misc

## util:check

\`\`\`bash
echo check
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

// ---------------------------------------------------------------------------
// Environment profiles — backward compatibility
// ---------------------------------------------------------------------------

describe("parseScriptsMd – env profiles: backward compatibility", () => {
    it("returns all tasks when no options.env is specified (file has no env sections)", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({});
            expect(result.allTasks.length).toBe(5);
        });
    });

    it("all tasks get env: null when the file has no env sections", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(SAMPLE_MD, async () => {
            const result = await parseScriptFile({});
            result.allTasks.forEach((t) => expect(t.env).toBeNull());
        });
    });

    it("returns all tasks (profiled + un-profiled) when no options.env is set", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            const result = await parseScriptFile({});
            // build (null) + deploy:api (staging) + deploy:web (staging) +
            // deploy:api (production) + util:check (null) = 5
            expect(result.allTasks.length).toBe(5);
        });
    });
});

// ---------------------------------------------------------------------------
// Environment profiles — filtering by env
// ---------------------------------------------------------------------------

describe("parseScriptsMd – env profiles: filtering with options.env", () => {
    it("returns only tasks matching the specified env profile", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            const result = await parseScriptFile({ env: "staging" });
            expect(result.allTasks.length).toBe(2);
            const names = result.allTasks.map((t) => t.name);
            expect(names).toContain("deploy:api");
            expect(names).toContain("deploy:web");
        });
    });

    it("filters production env correctly", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            const result = await parseScriptFile({ env: "production" });
            expect(result.allTasks.length).toBe(1);
            expect(result.allTasks[0].name).toBe("deploy:api");
            expect(result.allTasks[0].script).toContain("production");
        });
    });

    it("excludes tasks with env: null when a specific env is requested", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            const result = await parseScriptFile({ env: "staging" });
            const nullEnvTasks = result.allTasks.filter((t) => t.env === null);
            expect(nullEnvTasks).toHaveLength(0);
        });
    });

    it("returns empty arrays for an unknown env profile", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            const result = await parseScriptFile({ env: "nonexistent" });
            expect(result.allTasks).toHaveLength(0);
            expect(result.categories).toHaveLength(0);
        });
    });

    it("drops categories that have no tasks in the requested env", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            // Only 'Build' category has staging tasks; 'Misc' has none.
            const result = await parseScriptFile({ env: "staging" });
            expect(result.categories).toHaveLength(1);
            expect(result.categories[0].name).toBe("Build");
        });
    });

    it("keeps categories that have at least one task in the requested env", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            const result = await parseScriptFile({ env: "staging" });
            const catNames = result.categories.map((c) => c.name);
            expect(catNames).not.toContain("Misc");
        });
    });

    it("filtered category tasks object only contains matching tasks", async () => {
        const { default: parseScriptFile } = await import("../../lib/parsers/parseScriptsMd.js");
        await withTempFscripts(ENV_PROFILES_MD, async () => {
            const result = await parseScriptFile({ env: "staging" });
            const cat = result.categories[0];
            const taskKeys = Object.keys(cat.tasks);
            // 'build' has env: null — should be excluded
            expect(taskKeys).not.toContain("build");
            expect(taskKeys).toContain("deploy:api");
            expect(taskKeys).toContain("deploy:web");
        });
    });
});

// ---------------------------------------------------------------------------
// filterByEnv named export
// ---------------------------------------------------------------------------

describe("parseScriptsMd – filterByEnv named export", () => {
    it("is exported as a named function", async () => {
        const mod = await import("../../lib/parsers/parseScriptsMd.js");
        expect(typeof mod.filterByEnv).toBe("function");
    });

    it("filters allTasks and categories correctly when called directly", async () => {
        const { filterByEnv } = await import("../../lib/parsers/parseScriptsMd.js");
        const parsed = {
            categories: [
                {
                    name: "Cat",
                    description: "",
                    tasks: {
                        "task-a": { name: "task-a", env: "dev", script: "", description: "", order: 0 },
                        "task-b": { name: "task-b", env: "prod", script: "", description: "", order: 1 }
                    }
                }
            ],
            allTasks: [
                { name: "task-a", env: "dev", script: "", description: "", order: 0 },
                { name: "task-b", env: "prod", script: "", description: "", order: 1 }
            ]
        };

        const result = filterByEnv(parsed, "dev");
        expect(result.allTasks).toHaveLength(1);
        expect(result.allTasks[0].name).toBe("task-a");
        expect(result.categories[0].tasks).toHaveProperty("task-a");
        expect(result.categories[0].tasks).not.toHaveProperty("task-b");
    });

    it("returns empty arrays when no tasks match the env", async () => {
        const { filterByEnv } = await import("../../lib/parsers/parseScriptsMd.js");
        const parsed = {
            categories: [{ name: "Cat", description: "", tasks: {
                "t": { name: "t", env: "dev", script: "", description: "", order: 0 }
            }}],
            allTasks: [{ name: "t", env: "dev", script: "", description: "", order: 0 }]
        };

        const result = filterByEnv(parsed, "staging");
        expect(result.allTasks).toHaveLength(0);
        expect(result.categories).toHaveLength(0);
    });
});

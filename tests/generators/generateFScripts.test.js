import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPackageJson = {
    name: "my-project",
    scripts: {
        build: "rimraf dist && node build.js",
        test: "vitest run",
        start: "node index.js"
    }
};

vi.mock("../../lib/utils/helpers.js", () => ({
    readJson: vi.fn().mockResolvedValue(mockPackageJson),
    writeFile: vi.fn().mockResolvedValue(undefined),
    appendToFile: vi.fn(),
    boxInform: vi.fn(),
    readFile: vi.fn(),
    pathExists: vi.fn().mockResolvedValue(false),
    timestamp: vi.fn().mockReturnValue("00:00:00")
}));

// Mock the prompt so tests never block on real stdin. Defaults to declining
// the overwrite confirmation (returns false).
vi.mock("../../lib/utils/prompt.js", () => ({
    default: vi.fn().mockResolvedValue(false)
}));

describe("generateFScripts", () => {
    let generateFScripts;
    let readJson;
    let writeFile;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();
        const mod = await import("../../lib/generators/generateFScripts.js");
        generateFScripts = mod.default;
        const helpers = await import("../../lib/utils/helpers.js");
        readJson = helpers.readJson;
        writeFile = helpers.writeFile;
        // Reset implementations that individual tests override, since
        // clearAllMocks() only clears call history, not implementations.
        helpers.pathExists.mockResolvedValue(false);
        readJson.mockResolvedValue(mockPackageJson);
        const { default: promptQuestion } = await import("../../lib/utils/prompt.js");
        promptQuestion.mockResolvedValue(false);
    });

    it("generates fscripts.md in the current directory", async () => {
        await generateFScripts();
        expect(writeFile).toHaveBeenCalledWith(expect.stringContaining("fscripts.md"), expect.any(String));
    });

    it("includes script names as h2 headings", async () => {
        await generateFScripts();
        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("## build");
        expect(content).toContain("## test");
        expect(content).toContain("## start");
    });

    it("includes script commands in code blocks", async () => {
        await generateFScripts();
        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("rimraf dist && node build.js");
        expect(content).toContain("vitest run");
    });

    it("includes the standard header paragraph", async () => {
        await generateFScripts();
        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("# First category of scripts");
    });

    it("prompts to overwrite when fscripts.md already exists and cancels on decline", async () => {
        const helpers = await import("../../lib/utils/helpers.js");
        const { default: promptQuestion } = await import("../../lib/utils/prompt.js");
        helpers.pathExists.mockResolvedValue(true);
        helpers.writeFile.mockClear();
        promptQuestion.mockClear();
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

        await generateFScripts();

        expect(promptQuestion).toHaveBeenCalledWith(expect.objectContaining({ type: "confirm" }));
        expect(helpers.writeFile).not.toHaveBeenCalled();
        infoSpy.mockRestore();
    });

    it("writes a helpful note when package.json has no scripts", async () => {
        readJson.mockResolvedValueOnce({ name: "my-lib", version: "1.0.0" });

        await generateFScripts();

        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("# First category of scripts");
        expect(content).toContain("No npm scripts found in package.json.");
        expect(content).not.toContain("## undefined");
    });
});

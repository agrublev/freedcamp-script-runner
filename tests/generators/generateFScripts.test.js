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

    it("writes a helpful note when package.json has no scripts", async () => {
        readJson.mockResolvedValueOnce({ name: "my-lib", version: "1.0.0" });

        await generateFScripts();

        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("# First category of scripts");
        expect(content).toContain("No npm scripts found in package.json.");
        expect(content).not.toContain("## undefined");
    });
});

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

vi.mock("../../lib/utils/prompt.js", () => ({ default: vi.fn() }));

describe("generateFScripts", () => {
    let generateFScripts;
    let writeFile;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import("../../lib/generators/generateFScripts.js");
        generateFScripts = mod.default;
        const helpers = await import("../../lib/utils/helpers.js");
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

    it("prompts to overwrite when fscripts.md already exists and cancels on decline", async () => {
        const helpers = await import("../../lib/utils/helpers.js");
        const { default: promptQuestion } = await import("../../lib/utils/prompt.js");
        helpers.pathExists.mockResolvedValue(true);
        promptQuestion.mockResolvedValue(false);
        helpers.writeFile.mockClear();
        promptQuestion.mockClear();
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

        await generateFScripts();

        expect(promptQuestion).toHaveBeenCalledWith(expect.objectContaining({ type: "confirm" }));
        expect(helpers.writeFile).not.toHaveBeenCalled();
        infoSpy.mockRestore();
    });

    it("overwrites the existing fscripts.md when the user confirms", async () => {
        const helpers = await import("../../lib/utils/helpers.js");
        const { default: promptQuestion } = await import("../../lib/utils/prompt.js");
        helpers.pathExists.mockResolvedValue(true);
        promptQuestion.mockResolvedValue(true);
        helpers.writeFile.mockClear();
        promptQuestion.mockClear();
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        await generateFScripts();

        expect(promptQuestion).toHaveBeenCalledWith(expect.objectContaining({ type: "confirm" }));
        expect(helpers.writeFile).toHaveBeenCalledWith(
            expect.stringContaining("fscripts.md"),
            expect.any(String)
        );
        logSpy.mockRestore();
        errSpy.mockRestore();
    });
});

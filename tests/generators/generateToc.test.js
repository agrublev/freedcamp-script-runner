import { describe, it, expect, vi, beforeEach } from "vitest";

const SAMPLE_MD = `# Scripts

## build

\`\`\`bash
rimraf dist
\`\`\`

## test

\`\`\`bash
vitest run
\`\`\`
`;

const SAMPLE_WITH_TOC = `- [Scripts](#scripts)

<!-- end toc -->

# Scripts

## build

\`\`\`bash
rimraf dist
\`\`\`
`;

// Mutable state objects — factory functions read these at call time
const fsState = { exists: true, content: SAMPLE_MD };

vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        existsSync: vi.fn(() => fsState.exists),
        readFileSync: vi.fn((p, enc) => {
            if (String(p).endsWith(".md")) return fsState.content;
            return actual.readFileSync(p, enc);
        })
    };
});

vi.mock("../../lib/utils/helpers.js", () => ({
    writeFile: vi.fn().mockResolvedValue(undefined),
    appendToFile: vi.fn(),
    boxInform: vi.fn(),
    readJson: vi.fn(),
    readFile: vi.fn(),
    timestamp: vi.fn(() => "00:00:00")
}));

describe("generateToc", () => {
    let generateToc;
    let writeFile;
    let fsMock;

    beforeEach(async () => {
        fsState.exists = true;
        fsState.content = SAMPLE_MD;

        // Get the mocked fs and helpers without resetting modules
        fsMock = await import("fs");
        fsMock.existsSync.mockClear();
        fsMock.readFileSync.mockClear();

        const helpers = await import("../../lib/utils/helpers.js");
        writeFile = helpers.writeFile;
        writeFile.mockClear();
        writeFile.mockResolvedValue(undefined);

        const mod = await import("../../lib/generators/generateToc.js");
        generateToc = mod.default;
    });

    it("generates a TOC and writes the file", async () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await generateToc("fscripts.md");
        expect(writeFile).toHaveBeenCalled();
        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("<!-- end toc -->");
        consoleSpy.mockRestore();
    });

    it("TOC output contains task heading references", async () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await generateToc();
        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("build");
        consoleSpy.mockRestore();
    });

    it("replaces existing TOC section when present", async () => {
        fsState.content = SAMPLE_WITH_TOC;
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await generateToc();
        expect(writeFile).toHaveBeenCalled();
        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("<!-- end toc -->");
        consoleSpy.mockRestore();
    });

    it("generates TOC content with correct structure", async () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await generateToc("fscripts.md");
        const [, content] = writeFile.mock.calls[0];
        // TOC marker should be present
        const tocMarkerIdx = content.indexOf("<!-- end toc -->");
        expect(tocMarkerIdx).toBeGreaterThan(-1);
        // The main content (h1 heading) should come after the TOC marker
        const h1Idx = content.indexOf("\n# ");
        expect(h1Idx).toBeGreaterThan(tocMarkerIdx);
        consoleSpy.mockRestore();
    });

    it("uses default filename fscripts.md when no arg given", async () => {
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await generateToc();
        const [filename] = writeFile.mock.calls[0];
        expect(filename).toBe("fscripts.md");
        consoleSpy.mockRestore();
    });
});

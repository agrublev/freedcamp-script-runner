import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

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

    it("warns and exits without writing when fscripts.md is missing", async () => {
        // generateToc uses the real `import fs from "fs"` default, so control
        // cwd to an empty temp dir instead of toggling the namespace mock.
        const dir = mkdtempSync(join(tmpdir(), "fscr-toc-"));
        const origCwd = process.cwd;
        process.cwd = () => dir;
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});
        try {
            const result = await generateToc("fscripts.md");
            expect(exitSpy).toHaveBeenCalledWith(0);
            expect(result).toBeNull();
            expect(writeFile).not.toHaveBeenCalled();
        } finally {
            process.cwd = origCwd;
            rmSync(dir, { recursive: true, force: true });
            warnSpy.mockRestore();
            exitSpy.mockRestore();
        }
    });

    it("writes only the TOC marker for an empty file (no toc content)", async () => {
        const dir = mkdtempSync(join(tmpdir(), "fscr-toc-"));
        writeFileSync(join(dir, "fscripts.md"), "", "utf-8");
        const origCwd = process.cwd;
        process.cwd = () => dir;
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        try {
            await generateToc("fscripts.md");
            expect(writeFile).toHaveBeenCalled();
            const [, content] = writeFile.mock.calls[0];
            expect(content).toContain("<!-- end toc -->");
        } finally {
            process.cwd = origCwd;
            rmSync(dir, { recursive: true, force: true });
            warnSpy.mockRestore();
        }
    });

    it("handles link-style headings ([Text](url)) in markdown via custom slugify/getTitle", async () => {
        // The custom getTitle function handles headings that are markdown links
        // (e.g. "## [My Link](#url)"). This exercises the regex branch in
        // getTitle and the options.num branch in slugify when headings repeat.
        fsState.content = `# Scripts

## [Build](#build)

\`\`\`bash
npm run build
\`\`\`

## [Build](#build)

\`\`\`bash
npm run build:watch
\`\`\`
`;
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await generateToc();
        expect(writeFile).toHaveBeenCalled();
        const [, content] = writeFile.mock.calls[0];
        expect(content).toContain("<!-- end toc -->");
        consoleSpy.mockRestore();
    });
});

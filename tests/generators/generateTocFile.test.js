import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const SAMPLE_MD = `# Docs

## install

\`\`\`bash
npm install
\`\`\`

## build

\`\`\`bash
npm run build
\`\`\`
`;

vi.mock("../../lib/utils/helpers.js", () => ({
    writeFile: vi.fn().mockResolvedValue(undefined),
    appendToFile: vi.fn(),
    boxInform: vi.fn(),
    readJson: vi.fn(),
    readFile: vi.fn(),
    timestamp: vi.fn(() => "00:00:00")
}));

// fc-filepick default export is the picker fn (no nested default) —
// exercises the `fcFilepickerMod.default ?? fcFilepickerMod` fallback side.
vi.mock("fc-filepick", () => ({ default: vi.fn() }));
import fcFilepick from "fc-filepick";

describe("generateTocFile", () => {
    let tmpDir;
    let writeFile;
    let logSpy;
    let warnSpy;

    beforeEach(async () => {
        tmpDir = mkdtempSync(join(tmpdir(), "fscr-tocfile-"));
        fcFilepick.mockReset();

        const helpers = await import("../../lib/utils/helpers.js");
        writeFile = helpers.writeFile;
        writeFile.mockClear();
        writeFile.mockResolvedValue(undefined);

        logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
        warnSpy.mockRestore();
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("picks an .md file and generates its TOC", async () => {
        const mdFile = join(tmpDir, "Readme.md");
        writeFileSync(mdFile, SAMPLE_MD, "utf-8");
        fcFilepick.mockResolvedValue(mdFile);
        const { default: generateTocFile } = await import("../../lib/generators/generateTocFile.js");

        await generateTocFile();

        expect(fcFilepick).toHaveBeenCalledWith({
            type: "file",
            question: "Choose a markdown (.md) file",
            folder: "."
        });
        expect(logSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining("Generating Table of Contents")
        );
        expect(writeFile).toHaveBeenCalledTimes(1);
        const [filename, content] = writeFile.mock.calls[0];
        expect(filename).toBe(mdFile);
        expect(content).toContain("<!-- end toc -->");
        expect(content).toContain("[install](#install)");
    });

    it("re-opens the picker in the same folder when a non-.md file is picked", async () => {
        const txtFile = join(tmpDir, "notes.txt");
        const mdFile = join(tmpDir, "Readme.md");
        writeFileSync(txtFile, "not markdown", "utf-8");
        writeFileSync(mdFile, SAMPLE_MD, "utf-8");
        fcFilepick.mockResolvedValueOnce(txtFile).mockResolvedValueOnce(mdFile);
        const { default: generateTocFile } = await import("../../lib/generators/generateTocFile.js");

        await generateTocFile();

        expect(fcFilepick).toHaveBeenCalledTimes(2);
        expect(fcFilepick).toHaveBeenNthCalledWith(2, {
            type: "file",
            question: "Not a .md file! Choose a markdown (.md) file",
            folder: tmpDir
        });
        expect(warnSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining("Only .md files are supported!")
        );
        expect(writeFile).toHaveBeenCalledTimes(1);
        const [filename] = writeFile.mock.calls[0];
        expect(filename).toBe(mdFile);
    });

    it("returns null and writes nothing when the picker is cancelled", async () => {
        fcFilepick.mockResolvedValue(false);
        const { default: generateTocFile } = await import("../../lib/generators/generateTocFile.js");

        const result = await generateTocFile();

        expect(result).toBeNull();
        expect(fcFilepick).toHaveBeenCalledTimes(1);
        expect(writeFile).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining("Cancelled")
        );
    });

    it("keeps re-prompting on repeated non-.md picks until cancelled", async () => {
        const txtFile = join(tmpDir, "notes.txt");
        const htmlFile = join(tmpDir, "index.html");
        writeFileSync(txtFile, "not markdown", "utf-8");
        writeFileSync(htmlFile, "<h1>hi</h1>", "utf-8");
        fcFilepick.mockResolvedValueOnce(txtFile).mockResolvedValueOnce(htmlFile).mockResolvedValueOnce(false);
        const { default: generateTocFile } = await import("../../lib/generators/generateTocFile.js");

        const result = await generateTocFile();

        expect(result).toBeNull();
        expect(fcFilepick).toHaveBeenCalledTimes(3);
        expect(writeFile).not.toHaveBeenCalled();
    });

    it("unwraps a nested default export from fc-filepick", async () => {
        // Isolated module graph so fc-filepick can expose { default: { default: fn } },
        // exercising the truthy side of `fcFilepickerMod.default ?? fcFilepickerMod`.
        const mdFile = join(tmpDir, "Guide.md");
        writeFileSync(mdFile, SAMPLE_MD, "utf-8");

        vi.resetModules();
        const nestedPicker = vi.fn().mockResolvedValue(mdFile);
        vi.doMock("fc-filepick", () => ({ default: { default: nestedPicker } }));

        const { default: freshGenerateTocFile } = await import(
            "../../lib/generators/generateTocFile.js"
        );
        const freshHelpers = await import("../../lib/utils/helpers.js");
        await freshGenerateTocFile();

        expect(nestedPicker).toHaveBeenCalledWith({
            type: "file",
            question: "Choose a markdown (.md) file",
            folder: "."
        });
        expect(freshHelpers.writeFile).toHaveBeenCalledTimes(1);
        const [filename, content] = freshHelpers.writeFile.mock.calls[0];
        expect(filename).toBe(mdFile);
        expect(content).toContain("<!-- end toc -->");

        vi.resetModules();
        vi.doUnmock("fc-filepick");
    });
});

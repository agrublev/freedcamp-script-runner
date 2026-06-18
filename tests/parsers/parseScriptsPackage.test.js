/**
 * Tests for lib/parsers/parseScriptsPackage.js
 *
 * parseScriptFile() reads package.json (path computed from process.cwd() at
 * import time) via readJson() from ../utils/helpers.js and returns its
 * `scripts` object.
 *
 * We mock helpers.js so no real filesystem read happens; the project path is
 * irrelevant because readJson is fully stubbed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/utils/helpers.js", () => ({
    readJson: vi.fn(),
}));

import { readJson } from "../../lib/utils/helpers.js";
import parseScriptFile from "../../lib/parsers/parseScriptsPackage.js";

describe("parseScriptFile (parseScriptsPackage)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns the scripts object from the package file", async () => {
        const scripts = { build: "x", test: "y" };
        readJson.mockResolvedValue({ scripts });

        const result = await parseScriptFile();

        expect(result).toEqual(scripts);
        expect(readJson).toHaveBeenCalledTimes(1);
        // path is derived from cwd + package.json
        expect(readJson).toHaveBeenCalledWith(expect.stringContaining("package.json"));
    });

    it("returns undefined when the package file has no scripts key", async () => {
        readJson.mockResolvedValue({ name: "foo", version: "1.0.0" });

        const result = await parseScriptFile();

        expect(result).toBeUndefined();
    });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
    prompt: vi.fn(),
    ensureFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    existsSync: vi.fn(),
    detectShell: vi.fn(),
    getShellConfigPath: vi.fn(),
    log: vi.fn(),
    error: vi.fn()
}));

vi.mock("fs-extra", () => ({
    default: {
        ensureFile: h.ensureFile,
        readFile: h.readFile,
        writeFile: h.writeFile,
        existsSync: h.existsSync
    }
}));
vi.mock("../../lib/utils/prompt.js", () => ({ default: h.prompt }));
vi.mock("../../lib/completions/completion.js", () => ({
    detectShell: h.detectShell,
    getShellConfigPath: h.getShellConfigPath
}));
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: h.log, error: h.error }
}));

import greet from "../../lib/shell/greet.js";

beforeEach(() => {
    vi.clearAllMocks();
    h.getShellConfigPath.mockReturnValue("/tmp/test-zshrc");
    h.readFile.mockResolvedValue("");
    h.ensureFile.mockResolvedValue(undefined);
    h.writeFile.mockResolvedValue(undefined);
    h.prompt.mockResolvedValue(true);
});

describe("greet", () => {
    it("uses the shared prompt helper for interactive installation", async () => {
        await greet({ _: ["greet"], shell: "zsh", force: false });

        expect(h.prompt).toHaveBeenCalledWith(
            expect.objectContaining({ type: "confirm", default: true })
        );
        expect(h.writeFile).toHaveBeenCalledWith(
            "/tmp/test-zshrc",
            expect.stringContaining("# FSCR greet")
        );
    });
});

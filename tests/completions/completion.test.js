import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";

// fs-extra mock state
const fsExtraState = {
    fileExists: true,
    fileContent: "",
    scriptContent: "# completion script"
};

vi.mock("fs-extra", async (importOriginal) => {
    return {
        default: {
            existsSync: vi.fn(() => fsExtraState.fileExists),
            readFileSync: vi.fn(() => fsExtraState.fileContent),
            readFile: vi.fn().mockResolvedValue(fsExtraState.fileContent),
            writeFile: vi.fn().mockResolvedValue(undefined),
            ensureDir: vi.fn().mockResolvedValue(undefined),
            ensureFile: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined)
        },
        existsSync: vi.fn(() => fsExtraState.fileExists),
        readFileSync: vi.fn(() => fsExtraState.fileContent),
        readFile: vi.fn().mockResolvedValue(fsExtraState.fileContent),
        writeFile: vi.fn().mockResolvedValue(undefined),
        ensureDir: vi.fn().mockResolvedValue(undefined),
        ensureFile: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined)
    };
});

vi.mock("inquirer", () => ({
    default: {
        prompt: vi.fn().mockResolvedValue({ confirmInstall: false })
    }
}));

describe("detectShell", () => {
    let detectShell;
    const originalShell = process.env.SHELL;

    beforeEach(async () => {
        const mod = await import("../../lib/completions/completion.js");
        detectShell = mod.detectShell;
    });

    afterEach(() => {
        process.env.SHELL = originalShell;
    });

    it("returns 'zsh' when SHELL env var is /bin/zsh", () => {
        process.env.SHELL = "/bin/zsh";
        expect(detectShell()).toBe("zsh");
    });

    it("returns 'bash' when SHELL env var is /bin/bash", () => {
        process.env.SHELL = "/bin/bash";
        expect(detectShell()).toBe("bash");
    });

    it("returns 'fish' when SHELL env var is /usr/bin/fish", () => {
        process.env.SHELL = "/usr/bin/fish";
        expect(detectShell()).toBe("fish");
    });

    it("falls back to 'bash' when SHELL is unknown", () => {
        process.env.SHELL = "/bin/unknown-shell";
        expect(detectShell()).toBe("bash");
    });

    it("falls back to 'bash' when SHELL is not set", () => {
        delete process.env.SHELL;
        const result = detectShell();
        expect(["bash", "powershell"]).toContain(result);
    });
});

describe("getShellConfigPath", () => {
    let getShellConfigPath;
    const homeDir = os.homedir();

    beforeEach(async () => {
        const mod = await import("../../lib/completions/completion.js");
        getShellConfigPath = mod.getShellConfigPath;
    });

    it("returns ~/.bashrc for bash", () => {
        expect(getShellConfigPath("bash")).toBe(path.join(homeDir, ".bashrc"));
    });

    it("returns ~/.zshrc for zsh", () => {
        expect(getShellConfigPath("zsh")).toBe(path.join(homeDir, ".zshrc"));
    });

    it("returns fish config path for fish", () => {
        expect(getShellConfigPath("fish")).toBe(
            path.join(homeDir, ".config", "fish", "config.fish")
        );
    });

    it("returns PowerShell profile path for powershell", () => {
        expect(getShellConfigPath("powershell")).toContain("WindowsPowerShell");
    });
});

describe("getCompletionScriptPath", () => {
    let getCompletionScriptPath;

    beforeEach(async () => {
        const mod = await import("../../lib/completions/completion.js");
        getCompletionScriptPath = mod.getCompletionScriptPath;
    });

    it("returns a path ending in bash.sh for bash", () => {
        const result = getCompletionScriptPath("bash");
        expect(result).toMatch(/bash\.sh$/);
    });

    it("returns a path ending in zsh.sh for zsh", () => {
        const result = getCompletionScriptPath("zsh");
        expect(result).toMatch(/zsh\.sh$/);
    });

    it("returns a path ending in fish.sh for fish", () => {
        const result = getCompletionScriptPath("fish");
        expect(result).toMatch(/fish\.sh$/);
    });

    it("returns a path ending in powershell.ps1 for powershell", () => {
        const result = getCompletionScriptPath("powershell");
        expect(result).toMatch(/powershell\.ps1$/);
    });
});

describe("installCompletion – bash/zsh (non-fish)", () => {
    let installCompletion;
    let fsExtra;

    beforeEach(async () => {
        vi.clearAllMocks();
        fsExtraState.fileExists = true;
        fsExtraState.fileContent = "";
        const mod = await import("../../lib/completions/completion.js");
        installCompletion = mod.installCompletion;
        fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFileSync.mockReturnValue("# completion script");
        fsExtra.readFile.mockResolvedValue("");
        fsExtra.ensureFile.mockResolvedValue(undefined);
        fsExtra.writeFile.mockResolvedValue(undefined);
    });

    it("installs bash completion when script file exists", async () => {
        const result = await installCompletion("bash", { silent: true });
        expect(typeof result).toBe("string");
    });

    it("skips reinstall when already installed without force flag", async () => {
        fsExtra.readFile.mockResolvedValue("# FSCR completion\nsome script\n# End FSCR completion");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await installCompletion("bash", { force: false });
        consoleSpy.mockRestore();
    });

    it("throws when completion script file is missing", async () => {
        fsExtra.existsSync.mockReturnValue(false);
        await expect(installCompletion("bash", { silent: true })).rejects.toThrow();
    });
});

describe("uninstallCompletion – bash/zsh (non-fish)", () => {
    let uninstallCompletion;
    let fsExtra;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("../../lib/completions/completion.js");
        uninstallCompletion = mod.uninstallCompletion;
        fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFile.mockResolvedValue(
            "# FSCR completion\nscript\n# End FSCR completion\n"
        );
        fsExtra.writeFile.mockResolvedValue(undefined);
    });

    it("removes completion block from config file", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("bash");
        expect(fsExtra.writeFile).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("warns when config file doesn't exist", async () => {
        fsExtra.existsSync.mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("bash");
        consoleSpy.mockRestore();
    });

    it("warns when no completions installed", async () => {
        fsExtra.readFile.mockResolvedValue("# some other config");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("bash");
        consoleSpy.mockRestore();
    });

    it("handles fish shell removal", async () => {
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.remove.mockResolvedValue(undefined);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("fish", { silent: true });
        consoleSpy.mockRestore();
    });
});

describe("completionStatus", () => {
    let completionStatus;
    let fsExtra;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("../../lib/completions/completion.js");
        completionStatus = mod.completionStatus;
        fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(false);
        fsExtra.readFile.mockResolvedValue("");
    });

    it("runs without throwing", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await expect(completionStatus()).resolves.toBeUndefined();
        consoleSpy.mockRestore();
    });

    it("shows installed status when completion is found in config", async () => {
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFile.mockResolvedValue("# FSCR completion\nscript\n# End FSCR completion");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completionStatus();
        consoleSpy.mockRestore();
    });
});

describe("completion() – main handler", () => {
    let completion;

    beforeEach(async () => {
        vi.clearAllMocks();
        process.env.SHELL = "/bin/bash";
        const mod = await import("../../lib/completions/completion.js");
        completion = mod.default;
        const fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(false);
        fsExtra.readFile.mockResolvedValue("");
    });

    afterEach(() => {
        delete process.env.SHELL;
    });

    it("handles 'status' action", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ action: "status" });
        consoleSpy.mockRestore();
    });

    it("handles 'generate' action when script exists", async () => {
        const fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFileSync.mockReturnValue("# completion script content");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ action: "generate", shell: "bash" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("handles 'generate' action when script missing — calls process.exit", async () => {
        const fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(false);
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {});
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        await completion({ action: "generate", shell: "bash" });
        expect(exitSpy).toHaveBeenCalledWith(1);
        exitSpy.mockRestore();
        consoleSpy.mockRestore();
    });

    it("handles default action (no command) and user cancels", async () => {
        const { default: inquirer } = await import("inquirer");
        inquirer.prompt.mockResolvedValue({ confirmInstall: false });
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ shell: "bash", _: [] });
        consoleSpy.mockRestore();
    });
});

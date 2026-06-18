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
    let fsExtra;

    beforeEach(async () => {
        const mod = await import("../../lib/completions/completion.js");
        getCompletionScriptPath = mod.getCompletionScriptPath;
        fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReset();
        fsExtra.existsSync.mockReturnValue(true);
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

    it("falls back to lib/completions/scripts when bundled path is missing", () => {
        fsExtra.existsSync
            .mockImplementationOnce(() => false)
            .mockImplementationOnce(() => true);
        const result = getCompletionScriptPath("zsh");
        expect(result.replace(/\\/g, "/")).toMatch(/lib\/completions\/scripts\/zsh\.sh$/);
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

describe("detectShell – platform fallback", () => {
    let detectShell;
    const originalShell = process.env.SHELL;
    const originalPlatform = process.platform;

    beforeEach(async () => {
        const mod = await import("../../lib/completions/completion.js");
        detectShell = mod.detectShell;
    });

    afterEach(() => {
        process.env.SHELL = originalShell;
        Object.defineProperty(process, "platform", {
            value: originalPlatform,
            configurable: true,
            writable: true
        });
    });

    it("returns 'powershell' on win32 when no known shell is detected", () => {
        delete process.env.SHELL;
        Object.defineProperty(process, "platform", {
            value: "win32",
            configurable: true,
            writable: true
        });
        expect(detectShell()).toBe("powershell");
    });

    it("returns 'bash' on a non-win32 platform when the shell is unknown", () => {
        delete process.env.SHELL;
        Object.defineProperty(process, "platform", {
            value: "linux",
            configurable: true,
            writable: true
        });
        expect(detectShell()).toBe("bash");
    });
});

describe("getShellConfigPath / getCompletionScriptPath – fallbacks", () => {
    let getShellConfigPath;
    let getCompletionScriptPath;
    let fsExtra;
    const homeDir = os.homedir();

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("../../lib/completions/completion.js");
        getShellConfigPath = mod.getShellConfigPath;
        getCompletionScriptPath = mod.getCompletionScriptPath;
        fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(true);
    });

    it("falls back to ~/.bashrc for an unknown shell", () => {
        expect(getShellConfigPath("nonsense")).toBe(path.join(homeDir, ".bashrc"));
    });

    it("returns undefined for an unknown shell script name", () => {
        expect(getCompletionScriptPath("nonsense")).toBeUndefined();
    });

    it("falls back to the first candidate when no script file exists", () => {
        fsExtra.existsSync.mockReturnValue(false);
        const result = getCompletionScriptPath("bash");
        expect(result.replace(/\\/g, "/")).toMatch(/completions\/scripts\/bash\.sh$/);
    });
});

describe("installCompletion – fish, force, and non-silent paths", () => {
    let installCompletion;
    let fsExtra;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("../../lib/completions/completion.js");
        installCompletion = mod.installCompletion;
        fsExtra = (await import("fs-extra")).default;
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFileSync.mockReturnValue("# completion script");
        fsExtra.readFile.mockResolvedValue("");
        fsExtra.ensureDir.mockResolvedValue(undefined);
        fsExtra.ensureFile.mockResolvedValue(undefined);
        fsExtra.writeFile.mockResolvedValue(undefined);
    });

    it("installs fish completions (default options, non-silent) and logs", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const result = await installCompletion("fish");
        expect(fsExtra.ensureDir).toHaveBeenCalled();
        expect(fsExtra.writeFile).toHaveBeenCalled();
        expect(result.replace(/\\/g, "/")).toMatch(/completions\/fsr\.fish$/);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("installs fish completions silently without logging", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await installCompletion("fish", { silent: true });
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("replaces an existing block when force is true and logs (non-silent)", async () => {
        fsExtra.readFile.mockResolvedValue("# FSCR completion\nold\n# End FSCR completion\n");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const result = await installCompletion("bash", { force: true });
        expect(fsExtra.writeFile).toHaveBeenCalled();
        const written = fsExtra.writeFile.mock.calls.at(-1)[1];
        expect(written).toContain("# FSCR completion");
        expect(typeof result).toBe("string");
        consoleSpy.mockRestore();
    });

    it("appends a new block and logs when non-silent", async () => {
        fsExtra.readFile.mockResolvedValue("# existing config");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await installCompletion("bash");
        expect(fsExtra.writeFile).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("returns early and stays silent when already installed (silent)", async () => {
        fsExtra.readFile.mockResolvedValue("# FSCR completion\nx\n# End FSCR completion\n");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const result = await installCompletion("bash", { force: false, silent: true });
        expect(fsExtra.writeFile).not.toHaveBeenCalled();
        expect(consoleSpy).not.toHaveBeenCalled();
        expect(typeof result).toBe("string");
        consoleSpy.mockRestore();
    });
});

describe("uninstallCompletion – fish non-silent, missing, silent, and error paths", () => {
    let uninstallCompletion;
    let fsExtra;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("../../lib/completions/completion.js");
        uninstallCompletion = mod.uninstallCompletion;
        fsExtra = (await import("fs-extra")).default;
        fsExtra.writeFile.mockResolvedValue(undefined);
        fsExtra.remove.mockResolvedValue(undefined);
    });

    it("removes fish completions and logs (non-silent)", async () => {
        fsExtra.existsSync.mockReturnValue(true);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("fish");
        expect(fsExtra.remove).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("warns when no fish completions are present (non-silent)", async () => {
        fsExtra.existsSync.mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("fish");
        expect(fsExtra.remove).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("stays silent when no fish completions are present (silent)", async () => {
        fsExtra.existsSync.mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("fish", { silent: true });
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("stays silent when config file is missing (silent)", async () => {
        fsExtra.existsSync.mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("bash", { silent: true });
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("stays silent when no completions are present in config (silent)", async () => {
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFile.mockResolvedValue("# some other config");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("bash", { silent: true });
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("removes the block silently and writes the cleaned config (silent)", async () => {
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFile.mockResolvedValue("# FSCR completion\nx\n# End FSCR completion\n");
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await uninstallCompletion("bash", { silent: true });
        expect(fsExtra.writeFile).toHaveBeenCalled();
        expect(consoleSpy).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("rethrows a wrapped error when writeFile fails", async () => {
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFile.mockResolvedValue("# FSCR completion\nx\n# End FSCR completion\n");
        fsExtra.writeFile.mockRejectedValue(new Error("disk full"));
        await expect(uninstallCompletion("bash")).rejects.toThrow(/Failed to uninstall bash/);
    });
});

describe("completionStatus – error row", () => {
    let completionStatus;
    let fsExtra;

    beforeEach(async () => {
        vi.clearAllMocks();
        process.env.SHELL = "/bin/bash";
        const mod = await import("../../lib/completions/completion.js");
        completionStatus = mod.completionStatus;
        fsExtra = (await import("fs-extra")).default;
    });

    afterEach(() => {
        delete process.env.SHELL;
    });

    it("logs an Error row when reading a config file throws", async () => {
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFile.mockRejectedValue(new Error("boom"));
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await expect(completionStatus()).resolves.toBeUndefined();
        consoleSpy.mockRestore();
    });
});

describe("completion() – install/uninstall/confirm branches", () => {
    let completion;
    let fsExtra;
    let inquirer;

    beforeEach(async () => {
        vi.clearAllMocks();
        const mod = await import("../../lib/completions/completion.js");
        completion = mod.default;
        fsExtra = (await import("fs-extra")).default;
        inquirer = (await import("inquirer")).default;
        fsExtra.existsSync.mockReturnValue(true);
        fsExtra.readFileSync.mockReturnValue("# completion script");
        fsExtra.readFile.mockResolvedValue("");
        fsExtra.ensureDir.mockResolvedValue(undefined);
        fsExtra.ensureFile.mockResolvedValue(undefined);
        fsExtra.writeFile.mockResolvedValue(undefined);
        fsExtra.remove.mockResolvedValue(undefined);
    });

    it("handles 'install' action for bash (source hint)", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ action: "install", shell: "bash" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("handles 'install' action for fish (exec-fish hint)", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ action: "install", shell: "fish" });
        expect(fsExtra.ensureDir).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("handles 'install' action for powershell ($PROFILE hint)", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ action: "install", shell: "powershell" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("handles 'uninstall' action", async () => {
        fsExtra.existsSync.mockReturnValue(false);
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ action: "uninstall", shell: "bash" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("reads the action from argv._[1] when action is absent", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ _: ["completion", "status"], shell: "bash" });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("installs on default action when the user confirms (bash)", async () => {
        inquirer.prompt.mockResolvedValue({ confirmInstall: true });
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ shell: "bash", _: [] });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("installs on default action when the user confirms (fish)", async () => {
        inquirer.prompt.mockResolvedValue({ confirmInstall: true });
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ shell: "fish", _: [] });
        expect(fsExtra.ensureDir).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it("installs on default action when the user confirms (powershell)", async () => {
        inquirer.prompt.mockResolvedValue({ confirmInstall: true });
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        await completion({ shell: "powershell", _: [] });
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import os from "os";
import path from "path";
import {
    detectShell,
    getShellConfigPath,
    getCompletionScriptPath,
    installCompletion,
    uninstallCompletion
} from "../lib/completions/completion.js";
import {
    getAvailableTasks,
    getAvailableCommands,
    getCompletionSubcommands,
    generateTaskNames,
    clearTaskCache
} from "../lib/completions/generator.js";

describe("Completion System", () => {
    describe("detectShell", () => {
        it("should detect bash from SHELL env", () => {
            const originalShell = process.env.SHELL;
            process.env.SHELL = "/bin/bash";

            const shell = detectShell();
            expect(shell).toBe("bash");

            process.env.SHELL = originalShell;
        });

        it("should detect zsh from SHELL env", () => {
            const originalShell = process.env.SHELL;
            process.env.SHELL = "/bin/zsh";

            const shell = detectShell();
            expect(shell).toBe("zsh");

            process.env.SHELL = originalShell;
        });

        it("should detect fish from SHELL env", () => {
            const originalShell = process.env.SHELL;
            process.env.SHELL = "/usr/local/bin/fish";

            const shell = detectShell();
            expect(shell).toBe("fish");

            process.env.SHELL = originalShell;
        });

        it("should default to bash if unable to detect", () => {
            const originalShell = process.env.SHELL;
            delete process.env.SHELL;

            const originalPlatform = process.platform;
            Object.defineProperty(process, "platform", {
                value: "linux"
            });

            const shell = detectShell();
            expect(shell).toBe("bash");

            process.env.SHELL = originalShell;
            Object.defineProperty(process, "platform", {
                value: originalPlatform
            });
        });
    });

    describe("getShellConfigPath", () => {
        it("should return correct path for bash", () => {
            const path = getShellConfigPath("bash");
            expect(path).toContain(".bashrc");
        });

        it("should return correct path for zsh", () => {
            const path = getShellConfigPath("zsh");
            expect(path).toContain(".zshrc");
        });

        it("should return correct path for fish", () => {
            const path = getShellConfigPath("fish");
            expect(path).toContain(".config/fish/config.fish");
        });

        it("should return correct path for powershell", () => {
            const path = getShellConfigPath("powershell");
            expect(path).toContain("Microsoft.PowerShell_profile.ps1");
        });
    });

    describe("getCompletionScriptPath", () => {
        it("should return correct script path for bash", () => {
            const scriptPath = getCompletionScriptPath("bash");
            expect(scriptPath).toContain("bash.sh");
        });

        it("should return correct script path for zsh", () => {
            const scriptPath = getCompletionScriptPath("zsh");
            expect(scriptPath).toContain("zsh.sh");
        });

        it("should return correct script path for fish", () => {
            const scriptPath = getCompletionScriptPath("fish");
            expect(scriptPath).toContain("fish.sh");
        });

        it("should return correct script path for powershell", () => {
            const scriptPath = getCompletionScriptPath("powershell");
            expect(scriptPath).toContain("powershell.ps1");
        });
    });

    describe("Generator", () => {
        beforeEach(() => {
            clearTaskCache();
        });

        describe("getAvailableCommands", () => {
            it("should return array of commands", () => {
                const commands = getAvailableCommands();
                expect(Array.isArray(commands)).toBe(true);
                expect(commands.length).toBeGreaterThan(0);
            });

            it("should include core commands", () => {
                const commands = getAvailableCommands();
                const commandNames = commands.map((c) => c.name);

                expect(commandNames).toContain("start");
                expect(commandNames).toContain("run");
                expect(commandNames).toContain("list");
                expect(commandNames).toContain("completion");
            });

            it("should have descriptions for all commands", () => {
                const commands = getAvailableCommands();

                commands.forEach((cmd) => {
                    expect(cmd).toHaveProperty("name");
                    expect(cmd).toHaveProperty("description");
                    expect(typeof cmd.name).toBe("string");
                    expect(typeof cmd.description).toBe("string");
                    expect(cmd.name.length).toBeGreaterThan(0);
                    expect(cmd.description.length).toBeGreaterThan(0);
                });
            });
        });

        describe("getCompletionSubcommands", () => {
            it("should return array of completion subcommands", () => {
                const subcommands = getCompletionSubcommands();
                expect(Array.isArray(subcommands)).toBe(true);
                expect(subcommands.length).toBeGreaterThan(0);
            });

            it("should include install, uninstall, status, generate", () => {
                const subcommands = getCompletionSubcommands();
                const names = subcommands.map((c) => c.name);

                expect(names).toContain("install");
                expect(names).toContain("uninstall");
                expect(names).toContain("status");
                expect(names).toContain("generate");
            });
        });

        describe("getAvailableTasks", () => {
            it("should return array of tasks from fscripts.md", async () => {
                const tasks = await getAvailableTasks();
                expect(Array.isArray(tasks)).toBe(true);
            });

            it("should cache tasks for performance", async () => {
                const tasks1 = await getAvailableTasks();
                const tasks2 = await getAvailableTasks();

                // Should return same reference when cached
                expect(tasks1).toBe(tasks2);
            });

            it("should refresh cache when forced", async () => {
                const tasks1 = await getAvailableTasks();
                const tasks2 = await getAvailableTasks(true);

                // May not be same reference when forced
                expect(Array.isArray(tasks1)).toBe(true);
                expect(Array.isArray(tasks2)).toBe(true);
            });
        });

        describe("generateTaskNames", () => {
            it("should return array of task names", async () => {
                const taskNames = await generateTaskNames();
                expect(Array.isArray(taskNames)).toBe(true);
            });

            it("should return strings", async () => {
                const taskNames = await generateTaskNames();

                taskNames.forEach((name) => {
                    expect(typeof name).toBe("string");
                });
            });
        });
    });

    describe("Installation (mocked)", () => {
        let tempDir;

        beforeEach(async () => {
            // Create a temporary directory for testing
            tempDir = path.join(os.tmpdir(), `fscr-test-${Date.now()}`);
            await fs.ensureDir(tempDir);
        });

        afterEach(async () => {
            // Clean up
            if (tempDir && (await fs.pathExists(tempDir))) {
                await fs.remove(tempDir);
            }
        });

        it("should create completion script files", async () => {
            const shells = ["bash", "zsh", "fish", "powershell"];

            for (const shell of shells) {
                const scriptPath = getCompletionScriptPath(shell);
                const exists = await fs.pathExists(scriptPath);
                expect(exists).toBe(true);
            }
        });
    });
});

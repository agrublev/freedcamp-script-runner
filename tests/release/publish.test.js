/**
 * Tests for lib/release/publish.js
 *
 * publish() checks npm login (`npm whoami`), prompts for a dist-tag and a
 * confirmation, then runs `npm publish --tag <tag> --access public`.
 *
 * IMPORTANT: publish.js calls publish() at the top level on import, so simply
 * importing the module auto-runs the flow once. The mocks here make that
 * auto-run harmless — the prompt factory default resolves to `false`, so the
 * confirm step cancels and nothing is published — and `vi.resetAllMocks()` in
 * beforeEach wipes the auto-run's recorded calls before each test. Tests then
 * drive the exported default publish() directly with controlled mock sequences.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import prompt from "../../lib/utils/prompt.js";
import { sync as spawnSync } from "cross-spawn";
import fsrLog from "../../lib/utils/console.js";
import publish from "../../lib/release/publish.js";

vi.mock("cross-spawn", () => ({ sync: vi.fn(() => ({ status: 0, stdout: "user" })) }));
// Default resolves false so the top-level auto-run's confirm step cancels.
vi.mock("../../lib/utils/prompt.js", () => ({ default: vi.fn().mockResolvedValue(false) }));
vi.mock("../../lib/utils/console.js", () => ({
    default: { log: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("fs", async () => {
    const actual = await vi.importActual("fs");
    const base = actual.default ?? actual;
    const def = {
        ...base,
        existsSync: vi.fn(() => true),
        readFileSync: vi.fn(() => JSON.stringify({ name: "fscr", version: "1.2.3" })),
    };
    return { ...actual, existsSync: def.existsSync, readFileSync: def.readFileSync, default: def };
});

const npmArgs = () => spawnSync.mock.calls.filter((c) => c[0] === "npm").map((c) => c[1]);
const ranNpm = (sub) => npmArgs().some((a) => a[0] === sub);

beforeEach(() => {
    vi.resetAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ name: "fscr", version: "1.2.3" }));
    spawnSync.mockReturnValue({ status: 0, stdout: "user" });
});

describe("publish", () => {
    it("logged in + confirmed: publishes with the selected dist-tag and no npm login", async () => {
        prompt
            .mockResolvedValueOnce("next") // dist-tag select
            .mockResolvedValueOnce(true); // confirm

        await publish();

        const publishCall = spawnSync.mock.calls.find(
            (c) => c[0] === "npm" && c[1][0] === "publish"
        );
        expect(publishCall[1]).toEqual(["publish", "--tag", "next", "--access", "public"]);

        expect(ranNpm("whoami")).toBe(true);
        expect(ranNpm("login")).toBe(false);

        // whoami status 0 -> "logged in" branch logs the username.
        const logged = fsrLog.log.mock.calls.some((c) => String(c[0]).includes("Logged in as"));
        expect(logged).toBe(true);
    });

    it("runs `npm login` first when `npm whoami` exits non-zero", async () => {
        spawnSync.mockReturnValue({ status: 0, stdout: "user" });
        spawnSync.mockReturnValueOnce({ status: 1, stdout: "" }); // whoami fails
        prompt
            .mockResolvedValueOnce("latest")
            .mockResolvedValueOnce(true);

        await publish();

        expect(ranNpm("login")).toBe(true);
        expect(ranNpm("publish")).toBe(true);
    });

    it("cancels with no `npm publish` when the confirm prompt is declined", async () => {
        prompt
            .mockResolvedValueOnce("beta")
            .mockResolvedValueOnce(false); // declined

        await publish();

        expect(ranNpm("whoami")).toBe(true);
        expect(ranNpm("publish")).toBe(false);
    });

    it("exits with code 1 when package.json is missing", async () => {
        fs.existsSync.mockReturnValue(false);
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
            throw new Error("exit");
        });

        await expect(publish()).rejects.toThrow("exit");
        expect(exitSpy).toHaveBeenCalledWith(1);

        exitSpy.mockRestore();
    });

    it("throws when a run() command (npm publish) exits non-zero", async () => {
        spawnSync
            .mockReturnValueOnce({ status: 0, stdout: "user" }) // whoami: logged in
            .mockReturnValueOnce({ status: 1 }); // npm publish: fails
        prompt
            .mockResolvedValueOnce("latest") // dist-tag
            .mockResolvedValueOnce(true); // confirm publish

        await expect(publish()).rejects.toThrow("npm exited with code 1");
        expect(ranNpm("publish")).toBe(true);
    });
});

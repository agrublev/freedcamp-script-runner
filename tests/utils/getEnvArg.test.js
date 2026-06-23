/**
 * Tests for getEnvArg (lib/utils/index.js)
 *
 * getEnvArg scans a raw argv array for environment flags
 * (--env, -e, --env=<val>, --prod, --dev) and returns
 * { env, args } where `env` is the resolved profile and
 * `args` is the cleaned argv (env flags removed).
 */
import { describe, it, expect } from "vitest";
import { getEnvArg } from "../../lib/utils/index.js";

describe("getEnvArg", () => {
    it("returns null env and the original args when no env flag is present", () => {
        const result = getEnvArg(["run", "build"]);
        expect(result.env).toBeNull();
        expect(result.args).toEqual(["run", "build"]);
    });

    it("--env <value> extracts the env and removes it from args", () => {
        const result = getEnvArg(["run-p", "--env", "staging", "a", "b"]);
        expect(result.env).toBe("staging");
        expect(result.args).toEqual(["run-p", "a", "b"]);
    });

    it("--env=<value> (equals form) extracts the env", () => {
        const result = getEnvArg(["--env=production", "run", "build"]);
        expect(result.env).toBe("production");
        expect(result.args).toEqual(["run", "build"]);
    });

    it("-e <value> (short alias) extracts the env and removes it from args", () => {
        const result = getEnvArg(["-e", "staging", "run", "build"]);
        expect(result.env).toBe("staging");
        expect(result.args).toEqual(["run", "build"]);
    });

    it("--prod sets env to 'production' and removes the flag from args", () => {
        const result = getEnvArg(["--prod", "run", "build"]);
        expect(result.env).toBe("production");
        expect(result.args).toEqual(["run", "build"]);
    });

    it("--dev sets env to 'development' and removes the flag from args", () => {
        const result = getEnvArg(["--dev", "run", "build"]);
        expect(result.env).toBe("development");
        expect(result.args).toEqual(["run", "build"]);
    });

    it("--env=prod normalizes to 'production'", () => {
        const result = getEnvArg(["--env=prod"]);
        expect(result.env).toBe("production");
    });

    it("--env=dev normalizes to 'development'", () => {
        const result = getEnvArg(["--env=dev"]);
        expect(result.env).toBe("development");
    });

    it("--env with no following value (end of args) leaves env null", () => {
        const result = getEnvArg(["run", "--env"]);
        expect(result.env).toBeNull();
        // --env with no value is kept in args because it isn't consumed
        expect(result.args).toContain("run");
    });

    it("--env followed by a flag-like value (starts with -) does not consume the next arg", () => {
        const result = getEnvArg(["--env", "--other", "build"]);
        expect(result.env).toBeNull();
        expect(result.args).toContain("--other");
        expect(result.args).toContain("build");
    });

    it("-e followed by a flag-like value (starts with -) does not consume the next arg", () => {
        const result = getEnvArg(["-e", "--other", "build"]);
        expect(result.env).toBeNull();
        expect(result.args).toContain("--other");
        expect(result.args).toContain("build");
    });

    it("handles empty args array gracefully", () => {
        const result = getEnvArg([]);
        expect(result.env).toBeNull();
        expect(result.args).toEqual([]);
    });
});

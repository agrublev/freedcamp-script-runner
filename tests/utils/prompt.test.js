/**
 * Tests for lib/utils/prompt.js
 *
 * promptQuestion(extended = {}, message = "name it:")
 *   – normalises an inquirer question object and returns the resolved `answer`.
 *
 * We mock `inquirer` so no interactive prompt is shown, and inspect the question
 * array that promptQuestion passes to inquirer.prompt to assert the
 * transformation logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("inquirer", () => ({
    default: { prompt: vi.fn().mockResolvedValue({ answer: "RESULT" }) },
}));

import inquirer from "inquirer";
import promptQuestion from "../../lib/utils/prompt.js";

/** Pull the single question object out of the most recent inquirer.prompt call. */
function lastQuestion() {
    const args = inquirer.prompt.mock.calls.at(-1);
    // promptQuestion always calls inquirer.prompt([ { ...question } ])
    return args[0][0];
}

describe("promptQuestion", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rewrites extended.type "list" to "select"', async () => {
        await promptQuestion({ type: "list" });
        expect(lastQuestion().type).toBe("select");
    });

    it("leaves a non-list type untouched", async () => {
        await promptQuestion({ type: "checkbox" });
        expect(lastQuestion().type).toBe("checkbox");
    });

    it("uses the default input type when none is supplied", async () => {
        await promptQuestion();
        expect(lastQuestion().type).toBe("input");
    });

    it("lets extended.message override the default message", async () => {
        // NOTE: extended is spread AFTER the chalk-wrapped default, so the raw
        // extended.message wins and is NOT chalk-wrapped.
        await promptQuestion({ message: "Custom prompt" });
        expect(lastQuestion().message).toBe("Custom prompt");
    });

    it("falls back to the default message text when none is given", async () => {
        // Default message is chalk-wrapped; assert on the contained text only,
        // never the exact colour escape codes.
        await promptQuestion();
        expect(lastQuestion().message).toContain("name it:");
    });

    it("maps {message, value} choices with no name to {name, value}", async () => {
        await promptQuestion({
            choices: [
                { message: "Label A", value: "a" },
                { message: "Label B", value: "b" },
            ],
        });
        expect(lastQuestion().choices).toEqual([
            { name: "Label A", value: "a" },
            { name: "Label B", value: "b" },
        ]);
    });

    it("leaves choices that already carry a name unchanged", async () => {
        const choices = [{ name: "Already", message: "Label", value: "x" }];
        await promptQuestion({ choices });
        expect(lastQuestion().choices).toEqual(choices);
    });

    it("moves extended.limit to pageSize and deletes limit", async () => {
        await promptQuestion({ limit: 5 });
        const q = lastQuestion();
        expect(q.pageSize).toBe(5);
        expect("limit" in q).toBe(false);
    });

    it("returns the resolved answer value", async () => {
        const result = await promptQuestion();
        expect(result).toBe("RESULT");
    });
});

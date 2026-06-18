import { simpleGit } from "simple-git";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import fsrLog from "../utils/console.js";
import prompt from "../utils/prompt.js";

const CHANGELOG_PATH = path.resolve(process.cwd(), "CHANGELOG.md");

const TYPE_TO_SECTION = {
    feat: "Added",
    fix: "Fixed",
    perf: "Changed",
    refactor: "Changed"
};

/**
 * Ask Claude to group changed files into logical Conventional Commits.
 * Uses tool_use to guarantee structured JSON output.
 *
 * @param {string} statusShort  Output of `git status --short`
 * @param {string} diff         Combined staged + unstaged diff text
 * @returns {{ commits: Array<{ message: string, files: string[], changelog: string|null }> }}
 */
async function analyzeWithClaude(statusShort, diff) {
    const client = new Anthropic();

    const response = await client.messages.create({
        model: "claude-opus-4-5",
        max_tokens: 4096,
        tools: [
            {
                name: "propose_commits",
                description: "Propose a set of logical git commits for the given changes.",
                input_schema: {
                    type: "object",
                    properties: {
                        commits: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                        description:
                                            "Conventional Commit message: type(scope): short imperative description"
                                    },
                                    files: {
                                        type: "array",
                                        items: { type: "string" },
                                        description:
                                            "Relative file paths that belong to this commit."
                                    },
                                    changelog: {
                                        type: ["string", "null"],
                                        description:
                                            "Past-tense user-facing CHANGELOG entry, or null for internal/chore changes."
                                    }
                                },
                                required: ["message", "files", "changelog"]
                            }
                        }
                    },
                    required: ["commits"]
                }
            }
        ],
        tool_choice: { type: "tool", name: "propose_commits" },
        messages: [
            {
                role: "user",
                content: `You are a git commit assistant. Analyze the following git status and diff, then split all changed files into logical, focused commits.

Rules:
- Follow Conventional Commits strictly: feat, fix, refactor, chore, docs, style, test, perf.
- Every file in the status MUST appear in exactly one commit.
- Group files by feature or concern, not by directory.
- Set changelog to a past-tense user-facing sentence for feat/fix/perf; null for chore/refactor/internal.

Git status:
${statusShort}

Git diff:
${diff}`
            }
        ]
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse) throw new Error("Claude did not call propose_commits.");
    return toolUse.input;
}

/**
 * Insert changelog entries under ## [Unreleased], or prepend a dated section.
 * Entries are grouped into Keep-a-Changelog subsections by commit type.
 *
 * @param {string} content
 * @param {Array<{ type: string, text: string }>} entries
 * @returns {string}
 */
function insertChangelog(content, entries) {
    const bySection = {};
    for (const { type, text } of entries) {
        const section = TYPE_TO_SECTION[type] || "Changed";
        (bySection[section] ??= []).push(`- ${text}`);
    }

    let block = "";
    for (const sec of ["Added", "Fixed", "Changed"]) {
        if (bySection[sec]) {
            block += `\n### ${sec}\n\n${bySection[sec].join("\n")}\n`;
        }
    }

    const unreleasedIdx = content.indexOf("## [Unreleased]");
    if (unreleasedIdx !== -1) {
        const lineEnd = content.indexOf("\n", unreleasedIdx) + 1;
        return content.slice(0, lineEnd) + block + content.slice(lineEnd);
    }

    const date = new Date().toISOString().slice(0, 10);
    const firstSection = content.search(/^## /m);
    const insertAt = firstSection !== -1 ? firstSection : content.length;
    return content.slice(0, insertAt) + `## [${date}]\n${block}\n` + content.slice(insertAt);
}

function commitType(message) {
    return (message.match(/^([a-z]+)[\((!:]/) || [])[1] || "chore";
}

const smartCommit = async () => {
    const git = simpleGit();

    const status = await git.status();

    // Let the user pick which untracked files to stage before analysis.
    let selectedUntracked = [];
    if (status.not_added.length > 0) {
        fsrLog.log(chalk.cyan(`\n${status.not_added.length} untracked file(s) found:`));
        selectedUntracked = await prompt({
            type: "checkbox",
            message: chalk.yellow.bold("Select untracked files to include in this commit:"),
            choices: status.not_added.map((f) => ({ name: f, value: f }))
        });
        if (selectedUntracked.length > 0) {
            await git.add(selectedUntracked);
        }
    }

    const files = [
        ...new Set([
            ...status.staged,
            ...status.modified,
            ...selectedUntracked,
            ...status.created,
            ...status.deleted,
            ...status.renamed.map((r) => r.to)
        ])
    ];

    if (files.length === 0) {
        fsrLog.log(chalk.yellow("Nothing to commit."));
        return;
    }

    fsrLog.log(chalk.cyan(`Analyzing ${files.length} changed file(s) with Claude...`));

    const [stagedDiff, unstagedDiff, statusShort] = await Promise.all([
        git.diff(["--cached"]),
        git.diff([]),
        git.raw(["status", "--short"])
    ]);

    const diff =
        [stagedDiff, unstagedDiff].filter(Boolean).join("\n---\n") ||
        "(no textual diff: binary or untracked files only)";

    // Cap at 60 KB — well within Claude's context but avoids runaway costs on huge repos.
    const MAX_DIFF = 60_000;
    const diffTrunc =
        diff.length > MAX_DIFF
            ? diff.slice(0, MAX_DIFF) + `\n\n[diff truncated at ${MAX_DIFF} chars]`
            : diff;

    let result;
    try {
        result = await analyzeWithClaude(statusShort, diffTrunc);
    } catch (err) {
        fsrLog.error("Claude analysis failed:", err.message);
        return;
    }

    const { commits } = result;
    if (!Array.isArray(commits) || commits.length === 0) {
        fsrLog.error("Claude returned no commit groups.");
        return;
    }

    fsrLog.log(chalk.bold.green(`\nProposed ${commits.length} commit(s):\n`));
    commits.forEach((c, i) => {
        fsrLog.log(chalk.bold(`  ${i + 1}. ${c.message}`));
        (c.files || []).forEach((f) => fsrLog.log(chalk.gray(`       ${f}`)));
        if (c.changelog) {
            fsrLog.log(chalk.blue(`       changelog: ${c.changelog}`));
        }
    });

    const confirmed = await prompt({
        type: "confirm",
        message: chalk.yellow.bold("Proceed with these commits?"),
        default: true
    });

    if (!confirmed) {
        fsrLog.log(chalk.yellow("Aborted."));
        return;
    }

    const changelogEntries = [];

    for (const commit of commits) {
        if (!Array.isArray(commit.files) || commit.files.length === 0) continue;

        try {
            await git.add(commit.files);
            await git.commit(commit.message);
            fsrLog.log(chalk.green(`  ✓ ${commit.message}`));
            if (commit.changelog) {
                changelogEntries.push({
                    type: commitType(commit.message),
                    text: commit.changelog
                });
            }
        } catch (err) {
            fsrLog.error(`  ✗ Failed "${commit.message}":`, err.message);
        }
    }

    if (changelogEntries.length > 0 && fs.existsSync(CHANGELOG_PATH)) {
        const original = fs.readFileSync(CHANGELOG_PATH, "utf8");
        const updated = insertChangelog(original, changelogEntries);
        fs.writeFileSync(CHANGELOG_PATH, updated, "utf8");

        try {
            await git.add(CHANGELOG_PATH);
            await git.commit("chore: update CHANGELOG.md");
            fsrLog.log(
                chalk.green(
                    `  ✓ CHANGELOG.md updated (${changelogEntries.length} entr${
                        changelogEntries.length === 1 ? "y" : "ies"
                    })`
                )
            );
        } catch (err) {
            fsrLog.error("  ✗ Failed to commit CHANGELOG.md:", err.message);
        }
    }

    fsrLog.log(chalk.bold.green("\nDone."));
};

(async () => {
    await smartCommit();
})();
export default smartCommit;

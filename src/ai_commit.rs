//! Port of `lib/git/commit.js`: ask Claude (Anthropic Messages API, forced
//! `propose_commits` tool call) to split the working-tree changes into
//! Conventional Commits, commit each group, then add a separate
//! `chore: update CHANGELOG.md` commit. Uses the same env vars as the
//! `@anthropic-ai/sdk` client: `ANTHROPIC_API_KEY` and `ANTHROPIC_BASE_URL`.
//! Without a key it falls back to a manual one-message commit.

use anyhow::{Context, Result, bail};
use serde_json::{Value, json};
use std::path::Path;
use std::process::Command;

pub const MODEL: &str = "claude-opus-4-5";
pub const MAX_DIFF: usize = 60_000;
const API_VERSION: &str = "2023-06-01";

#[derive(Debug, Clone, PartialEq)]
pub struct Proposal {
    pub message: String,
    pub files: Vec<String>,
    pub changelog: Option<String>,
}

#[derive(Debug, Default, PartialEq)]
pub struct Status {
    pub untracked: Vec<String>,
    /// staged, modified, created, deleted, renamed (→ new path), in order seen
    pub changed: Vec<String>,
}

/// Parse `git status --porcelain=v1 -z`.
pub fn parse_status(z: &str) -> Status {
    let mut st = Status::default();
    let mut it = z.split('\0').filter(|s| !s.is_empty());
    while let Some(e) = it.next() {
        if e.len() < 4 {
            continue;
        }
        let (xy, path) = (&e[..2], e[3..].to_string());
        if xy == "??" {
            st.untracked.push(path);
            continue;
        }
        if xy.contains('R') || xy.contains('C') {
            it.next(); // original path follows for renames/copies
        }
        if !st.changed.contains(&path) {
            st.changed.push(path);
        }
    }
    st
}

pub fn commit_type(message: &str) -> String {
    let t: String = message
        .chars()
        .take_while(|c| c.is_ascii_lowercase())
        .collect();
    match message[t.len()..].chars().next() {
        Some('(' | '!' | ':') if !t.is_empty() => t,
        _ => "chore".into(),
    }
}

fn section(ty: &str) -> &'static str {
    match ty {
        "feat" => "Added",
        "fix" => "Fixed",
        _ => "Changed",
    }
}

/// insertChangelog: Keep-a-Changelog subsections under `## [Unreleased]`, or a
/// new dated section before the first `## ` heading.
pub fn insert_changelog(content: &str, entries: &[(String, String)], date: &str) -> String {
    let mut block = String::new();
    for sec in ["Added", "Fixed", "Changed"] {
        let lines: Vec<String> = entries
            .iter()
            .filter(|(t, _)| section(t) == sec)
            .map(|(_, x)| format!("- {x}"))
            .collect();
        if !lines.is_empty() {
            block += &format!("\n### {sec}\n\n{}\n", lines.join("\n"));
        }
    }
    if let Some(i) = content.find("## [Unreleased]") {
        let end = content[i..].find('\n').map(|n| i + n + 1).unwrap_or(0);
        return format!("{}{block}{}", &content[..end], &content[end..]);
    }
    let first = if content.starts_with("## ") {
        Some(0)
    } else {
        content.find("\n## ").map(|i| i + 1)
    };
    let at = first.unwrap_or(content.len());
    format!("{}## [{date}]\n{block}\n{}", &content[..at], &content[at..])
}

pub fn api_key() -> Option<String> {
    std::env::var("ANTHROPIC_API_KEY")
        .ok()
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty())
}

fn request_body(status_short: &str, diff: &str) -> Value {
    json!({
        "model": MODEL,
        "max_tokens": 4096,
        "tools": [{
            "name": "propose_commits",
            "description": "Propose a set of logical git commits for the given changes.",
            "input_schema": {
                "type": "object",
                "properties": {"commits": {"type": "array", "items": {"type": "object", "properties": {
                    "message": {"type": "string", "description": "Conventional Commit message: type(scope): short imperative description"},
                    "files": {"type": "array", "items": {"type": "string"}, "description": "Relative file paths that belong to this commit."},
                    "changelog": {"type": ["string", "null"], "description": "Past-tense user-facing CHANGELOG entry, or null for internal/chore changes."}
                }, "required": ["message", "files", "changelog"]}}},
                "required": ["commits"]
            }
        }],
        "tool_choice": {"type": "tool", "name": "propose_commits"},
        "messages": [{"role": "user", "content": format!("You are a git commit assistant. Analyze the following git status and diff, then split all changed files into logical, focused commits.

Rules:
- Follow Conventional Commits strictly: feat, fix, refactor, chore, docs, style, test, perf.
- Every file in the status MUST appear in exactly one commit.
- Group files by feature or concern, not by directory.
- Set changelog to a past-tense user-facing sentence for feat/fix/perf; null for chore/refactor/internal.

Git status:
{status_short}

Git diff:
{diff}")}]
    })
}

/// analyzeWithClaude.
pub fn analyze(key: &str, status_short: &str, diff: &str) -> Result<Vec<Proposal>> {
    let base = std::env::var("ANTHROPIC_BASE_URL")
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "https://api.anthropic.com".into());
    let url = format!("{}/v1/messages", base.trim_end_matches('/'));
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .build()?;
    let resp = client
        .post(&url)
        .header("x-api-key", key)
        .header("anthropic-version", API_VERSION)
        .json(&request_body(status_short, diff))
        .send()
        .with_context(|| format!("POST {url}"))?;
    let code = resp.status();
    let body: Value = resp.json().context("decoding Anthropic response")?;
    if !code.is_success() {
        bail!(
            "{} {}",
            code.as_u16(),
            body["error"]["message"]
                .as_str()
                .unwrap_or(&body.to_string())
        );
    }
    let tool = body["content"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|b| b["type"] == "tool_use")
        .context("Claude did not call propose_commits.")?;
    Ok(tool["input"]["commits"]
        .as_array()
        .into_iter()
        .flatten()
        .map(|c| Proposal {
            message: c["message"].as_str().unwrap_or("").to_string(),
            files: c["files"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(|f| f.as_str().map(String::from))
                .collect(),
            changelog: c["changelog"].as_str().map(String::from),
        })
        .collect())
}

fn git(cwd: &Path, args: &[&str]) -> Result<String> {
    let o = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .context("spawning git")?;
    if !o.status.success() {
        bail!(
            "git {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&o.stderr).trim()
        );
    }
    Ok(String::from_utf8_lossy(&o.stdout).to_string())
}

fn log(m: &str) {
    crate::ui::log(m);
}
fn err(m: &str) {
    eprintln!(
        "\x1b[90m{}\x1b[39m \x1b[31;1m× [ERROR]\x1b[0m {m}",
        chrono::Local::now().format("%H:%M:%S")
    );
}

/// `fsr commit`. `yes` (Rust-only, for scripts/tests) includes all untracked
/// files and accepts the proposal without prompting.
pub fn cmd_commit(cwd: &Path, yes: bool) -> Result<()> {
    let st = parse_status(&git(cwd, &["status", "--porcelain=v1", "-z"])?);
    let mut selected = Vec::new();
    if !st.untracked.is_empty() {
        log(&format!(
            "\x1b[36m\n{} untracked file(s) found:\x1b[39m",
            st.untracked.len()
        ));
        selected = if yes {
            st.untracked.clone()
        } else {
            dialoguer::MultiSelect::new()
                .with_prompt("Select untracked files to include in this commit")
                .items(&st.untracked)
                .interact()?
                .into_iter()
                .map(|i| st.untracked[i].clone())
                .collect()
        };
        if !selected.is_empty() {
            let mut a = vec!["add", "--"];
            a.extend(selected.iter().map(String::as_str));
            git(cwd, &a)?;
        }
    }
    let mut files = st.changed.clone();
    for f in &selected {
        if !files.contains(f) {
            files.push(f.clone());
        }
    }
    if files.is_empty() {
        log("\x1b[33mNothing to commit.\x1b[39m");
        return Ok(());
    }
    let Some(key) = api_key() else {
        log("\x1b[33mANTHROPIC_API_KEY is not set — falling back to a manual commit.\x1b[39m");
        return manual(cwd, &files, yes);
    };
    log(&format!(
        "\x1b[36mAnalyzing {} changed file(s) with Claude...\x1b[39m",
        files.len()
    ));
    let staged = git(cwd, &["diff", "--cached"])?;
    let unstaged = git(cwd, &["diff"])?;
    let short = git(cwd, &["status", "--short"])?;
    let mut diff = [staged, unstaged]
        .into_iter()
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("\n---\n");
    if diff.is_empty() {
        diff = "(no textual diff: binary or untracked files only)".into();
    }
    if diff.chars().count() > MAX_DIFF {
        diff = diff.chars().take(MAX_DIFF).collect::<String>()
            + &format!("\n\n[diff truncated at {MAX_DIFF} chars]");
    }
    let proposals = match analyze(&key, &short, &diff) {
        Ok(p) => p,
        Err(e) => {
            err(&format!("Claude analysis failed: {e:#}"));
            return Ok(());
        }
    };
    let commits: Vec<Proposal> = proposals
        .into_iter()
        .map(|mut c| {
            c.files.retain(|f| files.contains(f));
            c
        })
        .filter(|c| !c.files.is_empty())
        .collect();
    if commits.is_empty() {
        err("No commits remain after filtering to selected files.");
        return Ok(());
    }
    log(&format!(
        "\x1b[1;32m\nProposed {} commit(s):\n\x1b[22;39m",
        commits.len()
    ));
    for (i, c) in commits.iter().enumerate() {
        log(&format!("\x1b[1m  {}. {}\x1b[22m", i + 1, c.message));
        for f in &c.files {
            log(&format!("\x1b[90m       {f}\x1b[39m"));
        }
        if let Some(cl) = &c.changelog {
            log(&format!("\x1b[34m       changelog: {cl}\x1b[39m"));
        }
    }
    if !yes
        && !dialoguer::Confirm::new()
            .with_prompt("Proceed with these commits?")
            .default(true)
            .interact()?
    {
        log("\x1b[33mAborted.\x1b[39m");
        return Ok(());
    }
    let mut entries = Vec::new();
    for c in &commits {
        // JS: git.add(files) + git.commit(message), which commits *everything*
        // staged — so pre-staged files (e.g. the selected untracked ones) all
        // leaked into the first commit. Committing with a pathspec keeps each
        // group to its own files (deliberate fix).
        let mut a = vec!["add", "-A", "--"];
        a.extend(c.files.iter().map(String::as_str));
        let mut cm = vec!["commit", "-m", c.message.as_str(), "--"];
        cm.extend(c.files.iter().map(String::as_str));
        match git(cwd, &a).and_then(|_| git(cwd, &cm)) {
            Ok(_) => {
                log(&format!("\x1b[32m  ✓ {}\x1b[39m", c.message));
                if let Some(cl) = &c.changelog {
                    entries.push((commit_type(&c.message), cl.clone()));
                }
            }
            Err(e) => err(&format!("  ✗ Failed \"{}\": {e:#}", c.message)),
        }
    }
    let cl = cwd.join("CHANGELOG.md");
    if !entries.is_empty() && cl.exists() {
        let original = std::fs::read_to_string(&cl)?;
        let date = chrono::Utc::now().format("%Y-%m-%d").to_string();
        std::fs::write(&cl, insert_changelog(&original, &entries, &date))?;
        match git(cwd, &["add", "CHANGELOG.md"])
            .and_then(|_| git(cwd, &["commit", "-m", "chore: update CHANGELOG.md"]))
        {
            Ok(_) => log(&format!(
                "\x1b[32m  ✓ CHANGELOG.md updated ({} entr{})\x1b[39m",
                entries.len(),
                if entries.len() == 1 { "y" } else { "ies" }
            )),
            Err(e) => err(&format!("  ✗ Failed to commit CHANGELOG.md: {e:#}")),
        }
    }
    log("\x1b[1;32m\nDone.\x1b[22;39m");
    Ok(())
}

fn manual(cwd: &Path, files: &[String], yes: bool) -> Result<()> {
    let msg = match std::env::var("FSR_COMMIT_MESSAGE")
        .ok()
        .filter(|m| !m.trim().is_empty())
    {
        Some(m) => m,
        None if yes => {
            bail!("no ANTHROPIC_API_KEY and no FSR_COMMIT_MESSAGE for a non-interactive commit")
        }
        None => dialoguer::Input::<String>::new()
            .with_prompt("Commit message")
            .interact_text()?,
    };
    if msg.trim().is_empty() {
        bail!("empty commit message");
    }
    let mut a = vec!["add", "-A", "--"];
    a.extend(files.iter().map(String::as_str));
    git(cwd, &a)?;
    git(cwd, &["commit", "-m", msg.trim()])?;
    log(&format!("\x1b[32m  ✓ {}\x1b[39m", msg.trim()));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn types_and_status() {
        assert_eq!(commit_type("feat(ui): x"), "feat");
        assert_eq!(commit_type("fix!: x"), "fix");
        assert_eq!(commit_type("Update stuff"), "chore");
        let s = parse_status(" M a.rs\0?? new.txt\0R  b.rs\0old.rs\0D  gone\0");
        assert_eq!(s.untracked, vec!["new.txt"]);
        assert_eq!(s.changed, vec!["a.rs", "b.rs", "gone"]);
    }
    #[test]
    fn changelog_like_js() {
        let e = vec![
            ("feat".to_string(), "Added X".to_string()),
            ("fix".into(), "Fixed Y".into()),
            ("perf".into(), "Faster".into()),
        ];
        assert_eq!(
            insert_changelog(
                "# Changelog\n\n## [Unreleased]\n\n## [1.0]\n",
                &e,
                "2026-10-25"
            ),
            "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Added X\n\n### Fixed\n\n- Fixed Y\n\n### Changed\n\n- Faster\n\n## [1.0]\n"
        );
        assert_eq!(
            insert_changelog("# C\n\n## [1.0]\n", &e[..1], "2026-10-25"),
            "# C\n\n## [2026-10-25]\n\n### Added\n\n- Added X\n\n## [1.0]\n"
        );
        assert_eq!(
            insert_changelog("# C\n", &e[..1], "D"),
            "# C\n## [D]\n\n### Added\n\n- Added X\n\n"
        );
    }
}

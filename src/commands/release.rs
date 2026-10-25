use super::helpers::{git_output, read_json, run_command, write_json};
use dialoguer::{Confirm, MultiSelect, Select};
use semver::Version;
use serde_json::{Value, json};
use std::collections::{BTreeMap, HashSet};
use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;

pub fn bump_version(kind: Option<&str>, add_tag: bool) -> Result<(), String> {
    let path = Path::new("package.json");
    let mut package = read_json(path)?;
    let current = package
        .get("version")
        .and_then(Value::as_str)
        .ok_or("package.json is missing a version")?;
    let mut version =
        Version::parse(current).map_err(|e| format!("invalid package version: {e}"))?;
    let kind = match kind {
        Some(kind) if ["patch", "minor", "major"].contains(&kind) => kind.to_owned(),
        Some(_) => return Err("version bump must be patch, minor, or major".into()),
        None => Select::new()
            .with_prompt("Version bump type")
            .items(&["patch", "minor", "major"])
            .default(0)
            .interact()
            .map(|i| ["patch", "minor", "major"][i].to_owned())
            .map_err(|e| e.to_string())?,
    };
    match kind.as_str() {
        "major" => version.major += 1,
        "minor" => {
            version.minor += 1;
            version.patch = 0;
        }
        _ => version.patch += 1,
    }
    version.pre = semver::Prerelease::EMPTY;
    version.build = semver::BuildMetadata::EMPTY;
    package["version"] = Value::String(version.to_string());
    write_json(path, &package)?;
    if add_tag {
        run_command("git", &["add", "package.json"])?;
        run_command(
            "git",
            &["commit", "-m", &format!("chore: bump version to {version}")],
        )?;
        run_command(
            "git",
            &[
                "tag",
                "-a",
                &format!("v{version}"),
                "-m",
                &format!("VERSION {version}"),
            ],
        )?;
        run_command("git", &["push", "origin", "--tags"])?;
    }
    println!("New version: {version}");
    Ok(())
}

pub fn publish_package() -> Result<(), String> {
    let package = read_json(Path::new("package.json"))?;
    let name = package
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("package");
    let version = package
        .get("version")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let login = Command::new("npm").arg("whoami").output();
    if !login.as_ref().is_ok_and(|output| output.status.success()) {
        println!("Not logged in to npm; starting npm login.");
        run_command("npm", &["login"])?;
    } else if let Ok(login) = login {
        println!(
            "Logged in as {}",
            String::from_utf8_lossy(&login.stdout).trim()
        );
    }
    let tags = ["latest", "next", "beta", "alpha"];
    let tag = tags[Select::new()
        .with_prompt(format!("Publish {name}@{version} with which tag?"))
        .items(&tags)
        .default(0)
        .interact()
        .map_err(|e| e.to_string())?];
    if !Confirm::new()
        .with_prompt(format!("Publish {name}@{version} as {tag}?"))
        .default(false)
        .interact()
        .map_err(|e| e.to_string())?
    {
        println!("Publish cancelled.");
        return Ok(());
    }
    run_command("npm", &["publish", "--tag", tag, "--access", "public"])
}

pub fn upgrade_packages() -> Result<(), String> {
    let package = read_json(Path::new("package.json"))?;
    let ignore: Vec<String> = package
        .get("fscripts")
        .and_then(|f| f.get("ignore-upgrade"))
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::to_owned)
        .collect();
    let manager = if Path::new("yarn.lock").exists() {
        "yarn"
    } else if Path::new("pnpm-lock.yaml").exists() {
        "pnpm"
    } else if Path::new("bun.lock").exists() || Path::new("bun.lockb").exists() {
        "bun"
    } else {
        "npm"
    };
    let mut specs = Vec::new();
    for section in ["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(deps) = package.get(section).and_then(Value::as_object) {
            for name in deps.keys() {
                if !ignore.contains(name) {
                    specs.push(format!("{name}@latest"));
                }
            }
        }
    }
    if specs.is_empty() {
        println!("No packages to upgrade.");
        return Ok(());
    }
    let confirmed = Confirm::new()
        .with_prompt(format!(
            "Upgrade {} dependencies using {manager}?",
            specs.len()
        ))
        .default(false)
        .interact()
        .map_err(|e| e.to_string())?;
    if !confirmed {
        return Ok(());
    }
    let mut args = match manager {
        "yarn" => vec!["add".to_owned()],
        "pnpm" => vec!["add".to_owned()],
        "bun" => vec!["add".to_owned()],
        _ => vec!["install".to_owned()],
    };
    args.extend(specs);
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    run_command(manager, &refs)?;
    Ok(())
}

pub fn commit_changes() -> Result<(), String> {
    let api_key = env::var("ANTHROPIC_API_KEY").map_err(|_| {
        "Set ANTHROPIC_API_KEY in your shell to use AI commit proposals.".to_owned()
    })?;
    let status = git_output(&["status", "--short", "--untracked-files=all"])?;
    if status.trim().is_empty() {
        println!("Nothing to commit.");
        return Ok(());
    }
    let entries: Vec<(&str, String)> = status
        .lines()
        .filter_map(|line| {
            if line.len() < 4 {
                return None;
            }
            let path = line[3..].trim().to_owned();
            if path.is_empty() {
                None
            } else {
                Some((&line[..2], path))
            }
        })
        .collect();
    let untracked: Vec<String> = entries
        .iter()
        .filter(|(state, _)| *state == "??")
        .map(|(_, path)| path.clone())
        .collect();
    let selected_untracked: HashSet<String> = if untracked.is_empty() {
        HashSet::new()
    } else {
        let indices = MultiSelect::new()
            .with_prompt("Select untracked files to include")
            .items(&untracked)
            .interact()
            .map_err(|e| e.to_string())?;
        indices
            .into_iter()
            .filter_map(|i| untracked.get(i).cloned())
            .collect()
    };
    for path in &selected_untracked {
        run_command("git", &["add", "--", path])?;
    }
    let allowed: HashSet<String> = entries
        .iter()
        .filter(|(state, path)| *state != "??" || selected_untracked.contains(path))
        .map(|(_, path)| path.clone())
        .collect();
    if allowed.is_empty() {
        println!("No files selected.");
        return Ok(());
    }
    let mut diff = [git_output(&["diff", "--cached"]), git_output(&["diff"])]
        .into_iter()
        .filter_map(Result::ok)
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("\n---\n");
    for path in &selected_untracked {
        if let Ok(contents) = fs::read_to_string(path) {
            diff.push_str(&format!("\n--- untracked: {path} ---\n{}", contents));
        }
    }
    if diff.is_empty() {
        diff = "(no textual diff: binary files only)".into();
    }
    diff.truncate(60_000);
    let proposal = request_commit_proposal(&api_key, &status, &diff)?;
    let commits = proposal
        .get("commits")
        .and_then(Value::as_array)
        .ok_or("AI returned no commit proposals")?;
    let commits: Vec<(String, Vec<String>, Option<String>)> = commits
        .iter()
        .filter_map(|commit| {
            let message = commit.get("message")?.as_str()?.to_owned();
            let files: Vec<_> = commit
                .get("files")?
                .as_array()?
                .iter()
                .filter_map(Value::as_str)
                .filter(|path| allowed.contains(*path))
                .map(str::to_owned)
                .collect();
            if files.is_empty() {
                return None;
            }
            let changelog = commit
                .get("changelog")
                .and_then(Value::as_str)
                .map(str::to_owned);
            Some((message, files, changelog))
        })
        .collect();
    if commits.is_empty() {
        return Err("AI did not propose commits for the selected files".into());
    }
    println!("Proposed commits:");
    for (message, files, changelog) in &commits {
        println!(
            "\n  {message}\n{}",
            files
                .iter()
                .map(|f| format!("    {f}"))
                .collect::<Vec<_>>()
                .join("\n")
        );
        if let Some(entry) = changelog {
            println!("    changelog: {entry}");
        }
    }
    if !Confirm::new()
        .with_prompt("Proceed with these commits?")
        .default(true)
        .interact()
        .map_err(|e| e.to_string())?
    {
        println!("Aborted.");
        return Ok(());
    }
    let mut changelog_entries = Vec::new();
    for (message, files, changelog) in commits {
        let mut args = vec!["add".to_owned(), "--".to_owned()];
        args.extend(files);
        let refs: Vec<_> = args.iter().map(String::as_str).collect();
        run_command("git", &refs)?;
        run_command("git", &["commit", "-m", &message])?;
        if let Some(text) = changelog {
            changelog_entries.push((message, text));
        }
    }
    if !changelog_entries.is_empty() && Path::new("CHANGELOG.md").exists() {
        let content = fs::read_to_string("CHANGELOG.md").map_err(|e| e.to_string())?;
        fs::write(
            "CHANGELOG.md",
            insert_changelog(&content, &changelog_entries),
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn request_commit_proposal(api_key: &str, status: &str, diff: &str) -> Result<Value, String> {
    let schema = json!({"type":"object","properties":{"commits":{"type":"array","items":{"type":"object","properties":{"message":{"type":"string"},"files":{"type":"array","items":{"type":"string"}},"changelog":{"type":["string","null"]}},"required":["message","files","changelog"]}}},"required":["commits"]});
    let payload = json!({
        "model":"claude-opus-4-5", "max_tokens":4096,
        "tools":[{"name":"propose_commits","description":"Split the changes into focused conventional commits. Include every changed file exactly once.","input_schema":schema}],
        "tool_choice":{"type":"tool","name":"propose_commits"},
        "messages":[{"role":"user","content":format!("Propose Conventional Commits for these changes. Use feat/fix/perf/refactor/chore/docs/style/test. Changelog is a past-tense user-facing sentence for feat/fix/perf, otherwise null.\n\nGit status:\n{status}\n\nDiff:\n{diff}")}]
    });
    let response = reqwest::blocking::Client::new()
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&payload)
        .send()
        .map_err(|e| format!("Claude request failed: {e}"))?
        .error_for_status()
        .map_err(|e| format!("Claude API returned an error: {e}"))?
        .json::<Value>()
        .map_err(|e| format!("invalid Claude response: {e}"))?;
    response
        .get("content")
        .and_then(Value::as_array)
        .and_then(|blocks| blocks.iter().find(|b| b["type"] == "tool_use"))
        .and_then(|block| block.get("input"))
        .cloned()
        .ok_or_else(|| "Claude did not return a commit proposal".into())
}

fn insert_changelog(content: &str, entries: &[(String, String)]) -> String {
    let mut grouped: BTreeMap<&str, Vec<String>> = BTreeMap::new();
    for (message, text) in entries {
        let section = if message.starts_with("feat") {
            "Added"
        } else if message.starts_with("fix") {
            "Fixed"
        } else {
            "Changed"
        };
        grouped
            .entry(section)
            .or_default()
            .push(format!("- {text}"));
    }
    let mut block = String::new();
    for section in ["Added", "Fixed", "Changed"] {
        if let Some(lines) = grouped.get(section) {
            block.push_str(&format!("\n### {section}\n\n{}\n", lines.join("\n")));
        }
    }
    if let Some(index) = content.find("## [Unreleased]") {
        let end = content[index..]
            .find('\n')
            .map(|offset| index + offset + 1)
            .unwrap_or(content.len());
        format!("{}{}{}", &content[..end], block, &content[end..])
    } else {
        format!("## [{}]\n{}\n{}", chrono_date(), block, content)
    }
}

fn chrono_date() -> String {
    let output = Command::new("date").args(["+%Y-%m-%d"]).output();
    output
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_owned())
        .unwrap_or_else(|| "Unreleased".into())
}

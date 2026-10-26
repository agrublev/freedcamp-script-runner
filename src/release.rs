//! Ports of `lib/release/bump.js`, `lib/upgradePackages.js`, `lib/git/validateNotDev.js`
//! and a reduced `lib/git/commit.js`. All external commands run without a shell
//! (argument arrays) and any failure is a non-zero exit.

use crate::fsutil;
use anyhow::{Context, Result, bail};
use dialoguer::{Confirm, Input, Select};
use std::path::Path;
use std::process::Command;

pub fn run(cmd: &str, args: &[&str], cwd: &Path) -> Result<()> {
    let st = Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .status()
        .with_context(|| format!("spawning {cmd}"))?;
    if !st.success() {
        bail!(
            "{cmd} {} exited with code {}",
            args.join(" "),
            crate::runner::exit_code(st)
        );
    }
    Ok(())
}

fn capture(cmd: &str, args: &[&str], cwd: &Path) -> Result<String> {
    let o = Command::new(cmd)
        .args(args)
        .current_dir(cwd)
        .output()
        .with_context(|| format!("spawning {cmd}"))?;
    if !o.status.success() {
        bail!(
            "{cmd} {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&o.stderr).trim()
        );
    }
    Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
}

pub fn current_branch(cwd: &Path) -> Result<String> {
    capture("git", &["rev-parse", "--abbrev-ref", "HEAD"], cwd)
}

/// `fsr branch`: refuse to work on Development; offer to create a feature branch.
pub fn cmd_branch(cwd: &Path) -> Result<()> {
    if current_branch(cwd)? != "Development" {
        return Ok(());
    }
    eprintln!("\x1b[1;4;31mDO NO MAKE CHANGES IN DEV!\x1b[0m");
    let name: String = Input::new()
        .with_prompt("Name new feature branch (or type cancel)")
        .interact_text()?;
    if name != "Development" && name != "cancel" && !name.trim().is_empty() {
        run("git", &["checkout", "-b", name.trim()], cwd)?;
        eprintln!("New branch {} created", name.trim());
    }
    Ok(())
}

/// Set `[package] version` in Cargo.toml (and the package's Cargo.lock entry)
/// to match package.json. Returns false when there is no Cargo.toml.
pub fn sync_cargo_version(cwd: &Path, version: &str) -> Result<bool> {
    let toml_path = cwd.join("Cargo.toml");
    let Ok(toml) = std::fs::read_to_string(&toml_path) else {
        return Ok(false);
    };
    let (mut in_pkg, mut name, mut done) = (false, None::<String>, false);
    let mut out = String::with_capacity(toml.len());
    for line in toml.split_inclusive('\n') {
        let t = line.trim();
        if t.starts_with('[') {
            in_pkg = t == "[package]";
        } else if in_pkg {
            if let Some(v) = t
                .strip_prefix("name")
                .map(str::trim_start)
                .and_then(|r| r.strip_prefix('='))
            {
                name = Some(v.trim().trim_matches('"').to_string());
            } else if !done && t.starts_with("version") && t[7..].trim_start().starts_with('=') {
                let nl = if line.ends_with('\n') { "\n" } else { "" };
                out.push_str(&format!("version = \"{version}\"{nl}"));
                done = true;
                continue;
            }
        }
        out.push_str(line);
    }
    if !done {
        return Ok(false);
    }
    fsutil::write_atomic(&toml_path, out.as_bytes())?;
    let lock_path = cwd.join("Cargo.lock");
    if let (Some(name), Ok(lock)) = (name, std::fs::read_to_string(&lock_path)) {
        let needle = format!("name = \"{name}\"\nversion = \"");
        if let Some(i) = lock.find(&needle) {
            let start = i + needle.len();
            if let Some(end) = lock[start..].find('"') {
                let new = format!("{}{version}{}", &lock[..start], &lock[start + end..]);
                fsutil::write_atomic(&lock_path, new.as_bytes())?;
            }
        }
    }
    Ok(true)
}

/// `fsr bump [type] [--skip-git]` (bump.js).
pub fn cmd_bump(cwd: &Path, kind: Option<String>, skip_git: bool) -> Result<()> {
    let pkg = cwd.join("package.json");
    if !pkg.exists() {
        bail!("Cannot find package.json file in the current directory");
    }
    let kinds = ["patch", "minor", "major"];
    let kind = match kind {
        Some(k) if kinds.contains(&k.as_str()) => k,
        Some(k) => bail!("unknown bump type {k}"),
        None => kinds[Select::new()
            .with_prompt("How big of a bump is this?")
            .items(kinds)
            .default(0)
            .interact()?]
        .to_string(),
    };
    let tag = !skip_git
        && Confirm::new()
            .with_prompt("Add git tag?")
            .default(false)
            .interact()?;
    run(
        "yarn",
        &[
            "version",
            &format!("--{kind}"),
            "--no-git-tag-version",
            "--no-commit-hooks",
        ],
        cwd,
    )?;
    let version = fsutil::read_json(&pkg)?["version"]
        .as_str()
        .unwrap_or("")
        .to_string();
    if sync_cargo_version(cwd, &version)? {
        println!("Cargo.toml version -> {version}");
    }
    if tag {
        let desc: String = Input::new()
            .with_prompt("Describe what was changed (optional)")
            .allow_empty(true)
            .interact_text()?;
        let mut msg = format!("VERSION {version}");
        if !desc.trim().is_empty() {
            msg.push_str(&format!("\n\n{}", desc.trim()));
        }
        run("git", &["add", "."], cwd)?;
        run("git", &["commit", "-m", &msg], cwd)?;
        run(
            "git",
            &[
                "tag",
                "-a",
                &format!("v{version}"),
                "-m",
                &format!("VERSION {version}"),
            ],
            cwd,
        )?;
        run("git", &["push", "origin", "--tags"], cwd)?;
    }
    println!("\nNew version: {version}\n");
    Ok(())
}

/// Packages to upgrade per section, honouring `fscripts["ignore-upgrade"]`.
pub fn upgrade_plan(pkg: &serde_json::Value) -> Vec<(&'static str, Vec<String>)> {
    let ignore: Vec<&str> = pkg["fscripts"]["ignore-upgrade"]
        .as_array()
        .map(|a| a.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    ["dependencies", "devDependencies", "peerDependencies"]
        .into_iter()
        .filter_map(|s| {
            pkg[s].as_object().map(|m| {
                (
                    s,
                    m.keys()
                        .filter(|k| !ignore.contains(&k.as_str()))
                        .cloned()
                        .collect::<Vec<_>>(),
                )
            })
        })
        .filter(|(_, v)| !v.is_empty())
        .collect()
}

/// `fsr upgrade` (upgradePackages.js): `yarn add <pkg>@latest …` per section.
/// Unlike JS, a failing yarn call makes fsr exit non-zero (after trying all sections).
pub fn cmd_upgrade(cwd: &Path) -> Result<()> {
    let path = cwd.join("package.json");
    if !path.exists() {
        bail!("Cannot find package.json file in the current directory");
    }
    let before = fsutil::read_json(&path)?;
    let mut failed = false;
    for (section, pkgs) in upgrade_plan(&before) {
        let mut args = vec!["add".to_string()];
        if section == "devDependencies" {
            args.push("--dev".into()); // JS omitted this and moved devDeps into dependencies
        } else if section == "peerDependencies" {
            args.push("--peer".into());
        }
        args.extend(pkgs.iter().map(|p| format!("{p}@latest")));
        let refs: Vec<&str> = args.iter().map(String::as_str).collect();
        if let Err(e) = run("yarn", &refs, cwd) {
            eprintln!("\x1b[31m[Error]:\x1b[0m {e:#}");
            failed = true;
            continue;
        }
        let after = fsutil::read_json(&path)?;
        for p in &pkgs {
            if before[section][p] != after[section][p] {
                println!(
                    "\x1b[32m[Done]:\x1b[0m Updated: {p} from: {} | to: {}",
                    before[section][p], after[section][p]
                );
            }
        }
    }
    if failed {
        bail!("some upgrades failed");
    }
    Ok(())
}

/// `fsr commit` — see [`crate::ai_commit`] (port of `lib/git/commit.js`).
pub fn cmd_commit(cwd: &Path, yes: bool) -> Result<()> {
    crate::ai_commit::cmd_commit(cwd, yes)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sync_cargo_version_updates_toml_and_lock() {
        let d = tempfile::tempdir().unwrap();
        std::fs::write(
            d.path().join("Cargo.toml"),
            "[package]\nname = \"fsr\"\nversion = \"1.0.0\"\n\n[dependencies]\nfoo = { version = \"2\" }\n",
        )
        .unwrap();
        std::fs::write(
            d.path().join("Cargo.lock"),
            "[[package]]\nname = \"foo\"\nversion = \"2.0.0\"\n\n[[package]]\nname = \"fsr\"\nversion = \"1.0.0\"\n",
        )
        .unwrap();
        assert!(sync_cargo_version(d.path(), "1.2.3").unwrap());
        let t = std::fs::read_to_string(d.path().join("Cargo.toml")).unwrap();
        assert!(t.contains("version = \"1.2.3\"") && t.contains("foo = { version = \"2\" }"));
        let l = std::fs::read_to_string(d.path().join("Cargo.lock")).unwrap();
        assert!(l.contains("name = \"fsr\"\nversion = \"1.2.3\"") && l.contains("2.0.0"));
        assert!(!sync_cargo_version(tempfile::tempdir().unwrap().path(), "1.0.0").unwrap());
    }

    #[test]
    fn upgrade_plan_respects_ignore() {
        let pkg = serde_json::json!({"dependencies": {"a": "1", "b": "1"}, "devDependencies": {"c": "1"}, "fscripts": {"ignore-upgrade": ["b", "c"]}});
        assert_eq!(
            upgrade_plan(&pkg),
            vec![("dependencies", vec!["a".to_string()])]
        );
    }
    #[test]
    fn branch_detection_and_run_errors() {
        let d = tempfile::tempdir().unwrap();
        if Command::new("git").arg("--version").output().is_err() {
            return;
        }
        run("git", &["init", "-q", "-b", "feature/x"], d.path()).unwrap();
        run(
            "git",
            &[
                "-c",
                "user.email=a@b",
                "-c",
                "user.name=a",
                "commit",
                "-q",
                "--allow-empty",
                "-m",
                "x",
            ],
            d.path(),
        )
        .unwrap();
        assert_eq!(current_branch(d.path()).unwrap(), "feature/x");
        cmd_branch(d.path()).unwrap(); // not Development → no prompt
        assert!(run("git", &["nope-subcommand"], d.path()).is_err());
    }
}

//! Port of `lib/doctor/*` (subset). Checks: node version (>=22, package.json
//! engines), package manager, git, fscripts.md, package.json, write
//! permissions, cache. Not ported: startupTime, memoryUsage checks.

use crate::cache::{Cache, dir_size};
use anyhow::Result;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, PartialEq)]
pub struct Check {
    pub name: &'static str,
    pub passed: bool,
    pub critical: bool,
    pub message: String,
}

fn version_of(cmd: &str) -> Option<String> {
    let o = Command::new(cmd).arg("--version").output().ok()?;
    o.status
        .success()
        .then(|| String::from_utf8_lossy(&o.stdout).trim().to_string())
}

pub fn node_major(v: &str) -> Option<u32> {
    v.trim()
        .trim_start_matches('v')
        .split('.')
        .next()?
        .parse()
        .ok()
}

pub fn package_manager(cwd: &Path) -> &'static str {
    if cwd.join("yarn.lock").exists() {
        "yarn"
    } else if cwd.join("pnpm-lock.yaml").exists() {
        "pnpm"
    } else if cwd.join("bun.lock").exists() || cwd.join("bun.lockb").exists() {
        "bun"
    } else {
        "npm"
    }
}

pub fn run_checks(cwd: &Path, cache: &Cache, fix: bool) -> Vec<Check> {
    let mut out = Vec::new();
    let mut push = |name, passed, critical, message: String| {
        out.push(Check {
            name,
            passed,
            critical,
            message,
        })
    };
    match version_of("node") {
        Some(v) => {
            let ok = node_major(&v).is_some_and(|m| m >= 22);
            push(
                "nodeVersion",
                ok,
                false,
                if ok {
                    v
                } else {
                    format!("{v} (recommended: >=22; only needed for JS tasks/plugins)")
                },
            );
        }
        None => push(
            "nodeVersion",
            false,
            false,
            "node not found (only needed for javascript tasks / plugins)".into(),
        ),
    }
    let pm = package_manager(cwd);
    match version_of(pm) {
        Some(v) => push("packageManager", true, true, format!("{pm} {v}")),
        None => push(
            "packageManager",
            false,
            true,
            format!("{pm} not found on PATH"),
        ),
    }
    match version_of("git") {
        Some(v) => push("git", true, false, v),
        None => push("git", false, false, "git not found".into()),
    }
    match crate::parse::parse_script_file(cwd, None) {
        Ok(Some(p)) => push(
            "fscriptsFile",
            true,
            false,
            format!(
                "{} tasks in {} categories",
                p.all_tasks.len(),
                p.categories.len()
            ),
        ),
        Ok(None) => push(
            "fscriptsFile",
            false,
            false,
            "fscripts.md not found (run 'fsr generate')".into(),
        ),
        Err(e) => push("fscriptsFile", false, false, e.to_string()),
    }
    match crate::fsutil::read_json(&cwd.join("package.json")) {
        Ok(_) => push("packageJson", true, true, "valid".into()),
        Err(e) => push("packageJson", false, true, format!("{e:#}")),
    }
    let writable = tempfile::NamedTempFile::new_in(cwd).is_ok();
    push(
        "filePermissions",
        writable,
        true,
        if writable {
            "current directory writable".into()
        } else {
            "current directory not writable".into()
        },
    );
    if fix && !cache.file().exists() {
        let _ = cache.read();
    }
    match cache.read() {
        Ok(c) => push(
            "cache",
            true,
            false,
            format!(
                "Operational ({} bytes, {} entries)",
                dir_size(&cache.dir),
                c["entries"].as_object().map_or(0, |m| m.len())
            ),
        ),
        Err(e) => push(
            "cache",
            false,
            false,
            format!("{e:#}{}", if fix { "" } else { " (try --fix)" }),
        ),
    }
    out
}

/// Returns exit code: 1 if any critical check failed.
pub fn cmd_doctor(cwd: &Path, cache: &Cache, fix: bool, json: bool) -> Result<i32> {
    let checks = run_checks(cwd, cache, fix);
    if json {
        let v: Vec<_> = checks.iter().map(|c| serde_json::json!({"name": c.name, "passed": c.passed, "critical": c.critical, "message": c.message})).collect();
        println!("{}", serde_json::to_string_pretty(&v)?);
    } else {
        for c in &checks {
            let icon = if c.passed {
                "\x1b[32m✓\x1b[0m"
            } else if c.critical {
                "\x1b[31m✗\x1b[0m"
            } else {
                "\x1b[33m!\x1b[0m"
            };
            println!("{icon} {:<16} {}", c.name, c.message);
        }
    }
    Ok(i32::from(checks.iter().any(|c| c.critical && !c.passed)))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn helpers() {
        assert_eq!(node_major("v22.3.1"), Some(22));
        assert_eq!(node_major("garbage"), None);
        let d = tempfile::tempdir().unwrap();
        assert_eq!(package_manager(d.path()), "npm");
        std::fs::write(d.path().join("yarn.lock"), "").unwrap();
        assert_eq!(package_manager(d.path()), "yarn");
    }
    #[test]
    fn checks_report_missing_files() {
        let d = tempfile::tempdir().unwrap();
        let c = Cache::new(d.path().join(".fsr"));
        let r = run_checks(d.path(), &c, true);
        assert!(!r.iter().find(|c| c.name == "packageJson").unwrap().passed);
        assert!(!r.iter().find(|c| c.name == "fscriptsFile").unwrap().passed);
        assert!(r.iter().find(|c| c.name == "cache").unwrap().passed);
    }
}

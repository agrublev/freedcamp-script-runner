//! Port of `lib/doctor/*` (subset). Checks: node version (>=22, package.json
//! engines), package manager, git, fscripts.md, package.json, write
//! permissions, cache, startupTime, memoryUsage (`lib/doctor/performance.js`).

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
    /// passed but above target (JS `warning`)
    pub warning: bool,
}

static START: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();

/// Call first thing in `main` (JS uses `performance.now()`, i.e. time since
/// the process started). Before this is called, startup is measured from the
/// first doctor call.
pub fn mark_start() {
    START.get_or_init(std::time::Instant::now);
}

fn startup_ms() -> f64 {
    START
        .get_or_init(std::time::Instant::now)
        .elapsed()
        .as_secs_f64()
        * 1000.0
}

/// Peak resident set size in MB (getrusage). Node reports heapUsed+external;
/// a native binary has no JS heap, so RSS is the closest equivalent.
pub fn peak_rss_mb() -> Option<f64> {
    #[cfg(unix)]
    {
        let mut u = std::mem::MaybeUninit::<nix::libc::rusage>::zeroed();
        // SAFETY: getrusage fills the struct; RUSAGE_SELF is always valid.
        if unsafe { nix::libc::getrusage(nix::libc::RUSAGE_SELF, u.as_mut_ptr()) } != 0 {
            return None;
        }
        let kb = unsafe { u.assume_init() }.ru_maxrss as f64;
        let bytes = if cfg!(target_os = "macos") {
            kb
        } else {
            kb * 1024.0
        };
        Some((bytes / 1024.0 / 1024.0 * 100.0).round() / 100.0)
    }
    #[cfg(not(unix))]
    None
}

/// JS thresholds: pass ≤ target, warn ≤ target×`warn`, else fail.
pub fn grade(v: f64, target: f64, warn: f64) -> (bool, bool) {
    if v <= target {
        (true, false)
    } else if v <= target * warn {
        (true, true)
    } else {
        (false, false)
    }
}

/// `t` = ms from process start until diagnostics began (JS measured at the
/// time the check ran, which also counted the earlier checks' subprocesses).
fn perf_checks(out: &mut Vec<Check>, t: f64) {
    let (passed, warning) = grade(t, 500.0, 2.0);
    let message = match (passed, warning) {
        (true, true) => format!("{t:.2}ms (slightly above target of 500ms)"),
        _ => format!("{t:.2}ms (target: <500ms)"),
    };
    out.push(Check {
        name: "startupTime",
        passed,
        critical: false,
        message,
        warning,
    });
    match peak_rss_mb() {
        Some(mb) => {
            let (passed, warning) = grade(mb, 50.0, 1.5);
            let message = match (passed, warning) {
                (true, true) => format!("{mb}MB (slightly above target of 50MB)"),
                _ => format!("{mb}MB (target: <50MB)"),
            };
            out.push(Check {
                name: "memoryUsage",
                passed,
                critical: false,
                message,
                warning,
            });
        }
        None => out.push(Check {
            name: "memoryUsage",
            passed: false,
            critical: false,
            message: "Failed to check memory usage: unsupported platform".into(),
            warning: false,
        }),
    }
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
    let startup = startup_ms();
    let mut out = Vec::new();
    let mut push = |name, passed, critical, message: String| {
        out.push(Check {
            name,
            passed,
            critical,
            message,
            warning: false,
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
    perf_checks(&mut out, startup);
    out
}

/// Returns exit code: 1 if any critical check failed.
pub fn cmd_doctor(cwd: &Path, cache: &Cache, fix: bool, json: bool) -> Result<i32> {
    let checks = run_checks(cwd, cache, fix);
    if json {
        let v: Vec<_> = checks.iter().map(|c| serde_json::json!({"name": c.name, "passed": c.passed, "critical": c.critical, "warning": c.warning, "message": c.message})).collect();
        println!("{}", serde_json::to_string_pretty(&v)?);
    } else {
        for c in &checks {
            let icon = if c.passed && c.warning {
                "\x1b[33m!\x1b[0m"
            } else if c.passed {
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
        let st = r.iter().find(|c| c.name == "startupTime").unwrap();
        assert!(
            st.message.ends_with("ms (target: <500ms)") || st.message.contains("slightly above"),
            "{}",
            st.message
        );
        let mem = r.iter().find(|c| c.name == "memoryUsage").unwrap();
        assert!(mem.message.contains("MB"), "{}", mem.message);
        assert!(peak_rss_mb().unwrap() > 0.0);
    }
    #[test]
    fn grading_matches_js_thresholds() {
        assert_eq!(grade(500.0, 500.0, 2.0), (true, false));
        assert_eq!(grade(999.0, 500.0, 2.0), (true, true));
        assert_eq!(grade(1001.0, 500.0, 2.0), (false, false));
        assert_eq!(grade(75.0, 50.0, 1.5), (true, true));
        assert_eq!(grade(76.0, 50.0, 1.5), (false, false));
    }
}

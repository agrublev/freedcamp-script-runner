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
    /// Extra path or version shown with `--verbose` and in JSON.
    pub detail: String,
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
        detail: String::new(),
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
                detail: String::new(),
            });
        }
        None => out.push(Check {
            name: "memoryUsage",
            passed: false,
            critical: false,
            message: "Failed to check memory usage: unsupported platform".into(),
            warning: false,
            detail: String::new(),
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

/// Human names from `lib/doctor/*`. JSON keeps the stable id in `name`.
pub fn label(name: &str) -> &str {
    match name {
        "nodeVersion" => "Node.js version",
        "packageManager" => "Package manager",
        "git" => "Git",
        "fscriptsFile" => "fscripts.md file",
        "packageJson" => "package.json",
        "filePermissions" => "File permissions",
        "cache" => "Cache system",
        "startupTime" => "Startup time",
        "memoryUsage" => "Memory usage",
        other => other,
    }
}

/// Starter written by `fsr doctor --fix` when fscripts.md is missing
/// (`lib/doctor/fileSystem.js`). The check stays failed; the file appears after.
pub const STARTER_FSCRIPTS: &str =
    "# Scripts\n\n## hello\nSay hello\n\n```bash\necho \"Hello from FSCR!\"\n```\n";

fn node_message(raw: &str, ok: bool) -> String {
    let ver = raw.trim().trim_start_matches('v');
    if ok {
        format!("v{ver} (recommended: >=22.0.0)")
    } else {
        format!("v{ver} is below recommended version >=22.0.0")
    }
}

pub fn run_checks(cwd: &Path, cache: &Cache, fix: bool) -> Vec<Check> {
    let startup = startup_ms();
    let mut out = Vec::new();
    let mut push = |name, passed, critical, message: String, detail: String| {
        out.push(Check {
            name,
            passed,
            critical,
            message,
            warning: false,
            detail,
        })
    };
    // Node marks a missing Node as critical. This binary runs bash tasks
    // without Node (Readme: "No Node needed — unless you use plugins"), so a
    // missing Node stays a non-critical warning and does not fail the command.
    match version_of("node") {
        Some(v) => {
            let ok = node_major(&v).is_some_and(|m| m >= 22);
            push(
                "nodeVersion",
                ok,
                false,
                node_message(&v, ok),
                v,
            );
        }
        None => push(
            "nodeVersion",
            false,
            false,
            "Failed to check Node.js version: node not found (only needed for JavaScript tasks and plugins)".into(),
            "not installed".into(),
        ),
    }
    let pm = package_manager(cwd);
    match version_of(pm) {
        Some(v) => push("packageManager", true, true, format!("{pm} {v}"), pm.into()),
        None => push(
            "packageManager",
            false,
            true,
            format!("{pm} not found on PATH"),
            pm.into(),
        ),
    }
    match version_of("git") {
        Some(v) => push("git", true, false, v.clone(), v),
        None => push("git", false, false, "git not found".into(), String::new()),
    }
    let fscripts = cwd.join("fscripts.md");
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
            fscripts.display().to_string(),
        ),
        Ok(None) => push(
            "fscriptsFile",
            false,
            false,
            "fscripts.md not found (run 'fsr generate')".into(),
            fscripts.display().to_string(),
        ),
        Err(e) => push(
            "fscriptsFile",
            false,
            false,
            e.to_string(),
            fscripts.display().to_string(),
        ),
    }
    let pkg = cwd.join("package.json");
    match crate::fsutil::read_json(&pkg) {
        Ok(_) => push(
            "packageJson",
            true,
            true,
            "valid".into(),
            pkg.display().to_string(),
        ),
        Err(e) => push(
            "packageJson",
            false,
            true,
            format!("{e:#}"),
            pkg.display().to_string(),
        ),
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
        cwd.display().to_string(),
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
            cache.file().display().to_string(),
        ),
        Err(e) => push(
            "cache",
            false,
            false,
            format!("{e:#}{}", if fix { "" } else { " (try --fix)" }),
            cache.file().display().to_string(),
        ),
    }
    perf_checks(&mut out, startup);
    out
}

fn tally(checks: &[Check]) -> (usize, usize, usize) {
    let mut passed = 0;
    let mut warnings = 0;
    let mut errors = 0;
    for c in checks {
        if c.passed && !c.warning {
            passed += 1;
        } else if c.warning {
            warnings += 1;
        } else {
            errors += 1;
        }
    }
    (passed, warnings, errors)
}

/// Write the Node starter fscripts.md after the check has already been recorded
/// as failed (`lib/doctor/doctor.js` runs `fix()` after `displayCheckResult`).
fn fix_fscripts(cwd: &Path, checks: &[Check]) -> Result<Option<String>> {
    if !checks.iter().any(|c| c.name == "fscriptsFile" && !c.passed) {
        return Ok(None);
    }
    let path = cwd.join("fscripts.md");
    if path.exists() {
        return Ok(None);
    }
    std::fs::write(&path, STARTER_FSCRIPTS)?;
    Ok(Some("Created basic fscripts.md template".into()))
}

/// Returns exit code: 1 if any critical check failed.
/// `--json` prints Node's wrapper (`passed`, `summary`, `results`) and keeps
/// the check id in `name` so existing consumers can find `fscriptsFile`.
pub fn cmd_doctor(cwd: &Path, cache: &Cache, fix: bool, json: bool, verbose: bool) -> Result<i32> {
    let checks = run_checks(cwd, cache, fix);
    let mut fixed = 0usize;
    let mut fix_message = None;
    if fix {
        match fix_fscripts(cwd, &checks) {
            Ok(Some(m)) => {
                fixed += 1;
                fix_message = Some(m);
            }
            Ok(None) => {}
            Err(e) => fix_message = Some(format!("Fix failed: {e:#}")),
        }
    }
    let (passed, warnings, errors) = tally(&checks);
    if json {
        let results: Vec<_> = checks
            .iter()
            .map(|c| {
                serde_json::json!({
                    "name": c.name,
                    "label": label(c.name),
                    "passed": c.passed,
                    "critical": c.critical,
                    "warning": c.warning,
                    "message": c.message,
                    "details": c.detail,
                })
            })
            .collect();
        let body = serde_json::json!({
            "passed": errors == 0,
            "summary": {
                "passed": passed,
                "warnings": warnings,
                "errors": errors,
                "fixed": fixed,
                "total": checks.len(),
            },
            "results": results,
        });
        println!("{}", serde_json::to_string_pretty(&body)?);
    } else {
        println!("\x1b[36;1m\nRunning fsr diagnostics...\n\x1b[0m");
        for c in &checks {
            let (icon, color) = if !c.passed {
                ("❌", "\x1b[31m")
            } else if c.warning {
                ("⚠️ ", "\x1b[33m")
            } else {
                ("✅", "\x1b[32m")
            };
            println!("{color}{icon} {}\x1b[0m", label(c.name));
            println!("\x1b[90m   {}\x1b[0m", c.message);
            if verbose {
                println!(
                    "\x1b[90m   id={} critical={} warning={}\x1b[0m",
                    c.name, c.critical, c.warning
                );
                if !c.detail.is_empty() {
                    println!("\x1b[90m   {}\x1b[0m", c.detail);
                }
            }
            if c.name == "fscriptsFile" && !c.passed {
                if let Some(m) = &fix_message {
                    if m.starts_with("Fix failed") {
                        println!("\x1b[33m   Attempting to fix...\x1b[0m");
                        println!("\x1b[31m   ✗ {m}\x1b[0m");
                    } else {
                        println!("\x1b[33m   Attempting to fix...\x1b[0m");
                        println!("\x1b[32m   ✓ Fixed: {m}\x1b[0m");
                    }
                }
            }
            println!();
        }
        println!("\x1b[90m{}\x1b[0m", "─".repeat(50));
        println!("\x1b[1mSummary:\x1b[0m");
        if passed > 0 {
            println!("\x1b[32m  ✅ Passed: {passed}\x1b[0m");
        }
        if warnings > 0 {
            println!("\x1b[33m  ⚠️  Warnings: {warnings}\x1b[0m");
        }
        if errors > 0 {
            println!("\x1b[31m  ❌ Errors: {errors}\x1b[0m");
        }
        if fixed > 0 {
            println!("\x1b[36m  🔧 Fixed: {fixed}\x1b[0m");
        }
        println!("\x1b[90m{}\x1b[0m", "─".repeat(50));
        if errors > 0 {
            println!(
                "\n\x1b[90mTip: Run \"fsr doctor --fix\" to automatically fix some issues\x1b[0m\n"
            );
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
    fn fix_writes_starter_after_the_check_is_recorded() {
        let d = tempfile::tempdir().unwrap();
        let c = Cache::new(d.path().join(".fsr"));
        let r = run_checks(d.path(), &c, true);
        assert!(!r.iter().find(|c| c.name == "fscriptsFile").unwrap().passed);
        assert!(!d.path().join("fscripts.md").exists());
        let code = cmd_doctor(d.path(), &c, true, true, true).unwrap();
        assert_eq!(code, 1, "missing package.json is still critical");
        let body = std::fs::read_to_string(d.path().join("fscripts.md")).unwrap();
        assert_eq!(body, STARTER_FSCRIPTS);
        assert!(
            run_checks(d.path(), &c, false)
                .iter()
                .find(|c| c.name == "fscriptsFile")
                .unwrap()
                .passed
        );
    }
    #[test]
    fn labels_match_node_check_names() {
        assert_eq!(label("fscriptsFile"), "fscripts.md file");
        assert_eq!(label("nodeVersion"), "Node.js version");
        assert_eq!(
            node_message("v22.3.1", true),
            "v22.3.1 (recommended: >=22.0.0)"
        );
        assert!(node_message("v20.0.0", false).contains("below recommended"));
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

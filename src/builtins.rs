//! Native ports of the built-in JS plugins and shell/release helpers:
//! `lib/plugins/task-notifier` (`notify` + hooks), `lib/plugins/deployment`
//! (`deploy`/`ship`, `deploy-history`, interactive run), `lib/shell/greet.js`
//! and `lib/release/publish.js`.

use crate::cache::Cache;
use crate::runner::Hooks;
use anyhow::{Context, Result, bail};
use serde_json::{Value, json};
use std::path::{Path, PathBuf};
use std::process::Command;

/// chalk-style styling: like chalk, styles are closed/reopened around `\n`.
pub fn chalk(open: &str, close: &str, text: &str) -> String {
    format!(
        "{open}{}{close}",
        text.replace('\n', &format!("{close}\n{open}"))
    )
}

fn ts() -> String {
    chrono::Local::now().format("%H:%M:%S").to_string()
}
pub fn log_info(m: &str) {
    println!(
        "\x1b[90m{}\x1b[39m \x1b[90;1m[LOG]\x1b[0m \x1b[36m{m}\x1b[39m",
        ts()
    );
}
pub fn log_success(m: &str) {
    println!(
        "\x1b[90m{}\x1b[39m \x1b[90;1m[LOG]\x1b[0m \x1b[32m{m}\x1b[39m",
        ts()
    );
}
pub fn log_error(m: &str) {
    eprintln!(
        "\x1b[90m{}\x1b[39m \x1b[31;1m× [ERROR]\x1b[0m \x1b[31m{m}\x1b[39m",
        ts()
    );
}

// ---------------- task-notifier ----------------

pub const NOTIFY_KEY: &str = "task-notifier.enabled";
const BANNER_OPEN: &str = "\x1b[48;2;127;21;159m\x1b[38;2;117;211;178m\x1b[4m\x1b[1m";
const BANNER_CLOSE: &str = "\x1b[22m\x1b[24m\x1b[39m\x1b[49m";

pub fn notifications_enabled(cache: &Cache) -> bool {
    cache
        .get(NOTIFY_KEY)
        .ok()
        .flatten()
        .is_none_or(|e| e["value"] != Value::Bool(false))
}

/// The task-notifier hooks; enabled state is read once (like plugin init).
pub struct Notifier {
    pub enabled: bool,
}

impl Notifier {
    pub fn new(cache: &Cache) -> Self {
        Notifier {
            enabled: notifications_enabled(cache),
        }
    }
    pub fn render(name: &str, data: &Value) -> Option<String> {
        let task = data["taskName"].as_str().unwrap_or("");
        match name {
            "pre-task" => Some(chalk(
                BANNER_OPEN,
                BANNER_CLOSE,
                &format!("`✓ Task Started: {task}\n"),
            )),
            "post-task" => Some(chalk(
                BANNER_OPEN,
                BANNER_CLOSE,
                &format!("\nTask End: {task}"),
            )),
            "task-error" => Some(chalk(
                "\x1b[38;2;240;15;0m\x1b[1m",
                "\x1b[22m\x1b[39m",
                &format!(
                    "[Notification] ✗ Task Error: {task}\n{}",
                    data["error"].as_str().unwrap_or("")
                ),
            )),
            _ => None,
        }
    }
}

impl Hooks for Notifier {
    fn fire(&self, name: &str, data: Value) {
        if self.enabled
            && let Some(s) = Self::render(name, &data)
        {
            println!("{s}");
        }
    }
}

pub fn cmd_notify(cache: &Cache, enable: bool, disable: bool, status: bool) -> Result<()> {
    if enable {
        cache.set(NOTIFY_KEY, Value::Bool(true), true)?;
        log_success("Notifications enabled");
    } else if disable {
        cache.set(NOTIFY_KEY, Value::Bool(false), true)?;
        log_info("Notifications disabled");
    } else if status {
        let s = if notifications_enabled(cache) {
            "enabled"
        } else {
            "disabled"
        };
        log_info(&format!("Notifications are {s}"));
    } else {
        log_info("Usage: fsr notify [--enable|--disable|--status]");
    }
    Ok(())
}

// ---------------- deployment ----------------

fn deploy_storage(cwd: &Path) -> PathBuf {
    cwd.join(".fscr").join("deployment").join("storage.json")
}

pub fn deploy_exec(cwd: &Path, files: &str, subdomain: &str) -> Result<()> {
    let domain = format!("{subdomain}.surge.sh");
    log_info(&format!("Deploying {files} → {domain}"));
    let st = Command::new("npx")
        .args(["surge", files, &domain])
        .current_dir(cwd)
        .status()
        .context("spawning npx")?;
    if !st.success() {
        bail!("surge exited with code {}", crate::runner::exit_code(st));
    }
    Ok(())
}

/// Like the JS post-command hook, but the history is read back from storage,
/// so `deploy-history` works across processes (JS kept it in memory only).
pub fn record_deploy(cwd: &Path, duration_ms: u64) -> Result<()> {
    let p = deploy_storage(cwd);
    let mut s = crate::fsutil::read_json(&p).unwrap_or_else(|_| json!({}));
    if !s["deploymentHistory"].is_array() {
        s["deploymentHistory"] = json!([]);
    }
    let now = chrono::Utc::now().timestamp_millis();
    s["deploymentHistory"]
        .as_array_mut()
        .unwrap()
        .push(json!({"timestamp": now, "success": true, "duration": duration_ms}));
    std::fs::create_dir_all(p.parent().unwrap())?;
    std::fs::write(&p, serde_json::to_string_pretty(&s)?)?;
    Ok(())
}

pub fn cmd_deploy(cwd: &Path, files: Option<&str>, subdomain: Option<&str>) -> Result<i32> {
    let (Some(files), Some(sub)) = (
        files.filter(|s| !s.is_empty()),
        subdomain.filter(|s| !s.is_empty()),
    ) else {
        log_error("Usage: fsr deploy --files <path> --subdomain <name>");
        return Ok(0);
    };
    let t = std::time::Instant::now();
    deploy_exec(cwd, files, sub)?;
    record_deploy(cwd, t.elapsed().as_millis() as u64)?;
    Ok(0)
}

pub fn cmd_deploy_history(cwd: &Path) -> Result<i32> {
    let s = crate::fsutil::read_json(&deploy_storage(cwd)).unwrap_or_else(|_| json!({}));
    let h = s["deploymentHistory"]
        .as_array()
        .cloned()
        .unwrap_or_default();
    if h.is_empty() {
        log_info("No deployment history");
        return Ok(0);
    }
    log_info("Recent Deployments:");
    log_info(&"─".repeat(60));
    for r in &h[h.len().saturating_sub(10)..] {
        let status = if r["success"].as_bool().unwrap_or(false) {
            "✓"
        } else {
            "✗"
        };
        let date = r["timestamp"]
            .as_i64()
            .and_then(chrono::DateTime::from_timestamp_millis)
            .map(|d| {
                d.with_timezone(&chrono::Local)
                    .format("%-m/%-d/%Y, %-I:%M:%S %p")
                    .to_string()
            })
            .unwrap_or_else(|| "Invalid Date".into());
        log_info(&format!("{status} {date} ({}ms)", r["duration"]));
    }
    log_info(&"─".repeat(60));
    Ok(0)
}

/// Interactive `plugin:deployment` (JS run()): subdomain prompt, then folder.
/// The fc-filepick folder browser is replaced by a path prompt.
pub fn run_deployment(cwd: &Path) -> Result<i32> {
    let sub: String = dialoguer::Input::new()
        .with_prompt("Subdomain?")
        .interact_text()?;
    let folder: String = dialoguer::Input::new()
        .with_prompt("Folder to deploy")
        .default("./dist".into())
        .interact_text()?;
    deploy_exec(cwd, &folder, &sub)?;
    Ok(0)
}

// ---------------- greet ----------------

pub const GREET_START: &str = "# FSCR greet";
pub const GREET_END: &str = "# End FSCR greet";

const ZSH_SNIPPET: &str = r#"
_fscr_greet() {
  if [[ -f "fscripts.md" ]]; then
    echo ""
    echo "\033[1;32m👋  fscripts.md found!\033[0m  Run \033[1;36mfsr\033[0m to launch the script runner."
    echo ""
  fi
}
chpwd_functions+=(_fscr_greet)
_fscr_greet
"#;

const BASH_SNIPPET: &str = r#"
_fscr_greet() {
  if [[ -f "fscripts.md" ]]; then
    echo ""
    echo -e "\033[1;32m👋  fscripts.md found!\033[0m  Run \033[1;36mfsr\033[0m to launch the script runner."
    echo ""
  fi
}
export PROMPT_COMMAND="_fscr_greet${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
_fscr_greet
"#;

/// completion.js detectShell (non-Windows): $SHELL basename if bash/zsh/fish, else bash.
pub fn detect_shell() -> String {
    std::env::var("SHELL")
        .ok()
        .and_then(|s| {
            Path::new(&s)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
        })
        .filter(|n| ["bash", "zsh", "fish"].contains(&n.as_str()))
        .unwrap_or_else(|| "bash".into())
}

fn home() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| ".".into())
}

pub fn shell_config_path(shell: &str) -> PathBuf {
    let h = home();
    match shell {
        "zsh" => h.join(".zshrc"),
        "fish" => h.join(".config/fish/config.fish"),
        "powershell" => h.join("Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1"),
        _ => h.join(".bashrc"),
    }
}

/// Remove the first `MARKER_START…MARKER_END\n?` block (the JS regex).
fn strip_block(s: &str) -> Option<String> {
    let a = s.find(GREET_START)?;
    let rel = s[a..].find(GREET_END)?;
    let mut b = a + rel + GREET_END.len();
    if s[b..].starts_with('\n') {
        b += 1;
    }
    Some(format!("{}{}", &s[..a], &s[b..]))
}

pub fn install_greet(shell: &str, force: bool) -> Result<PathBuf> {
    let snippet = match shell {
        "zsh" => ZSH_SNIPPET,
        "bash" => BASH_SNIPPET,
        _ => bail!("Shell greeting not supported for: {shell}"),
    };
    let path = shell_config_path(shell);
    if let Some(d) = path.parent() {
        std::fs::create_dir_all(d)?;
    }
    let current = std::fs::read_to_string(&path).unwrap_or_default();
    if current.contains(GREET_START) && !force {
        crate::ui::log("\x1b[33m⚠️  Greet already installed\x1b[39m");
        crate::ui::log("\x1b[2m   Use --force to reinstall\x1b[22m");
        return Ok(path);
    }
    let block = format!("\n{GREET_START}\n{snippet}\n{GREET_END}\n");
    let next = if current.contains(GREET_START) {
        // JS: current.replace(regex, block) — replaces the block in place.
        let a = current.find(GREET_START).unwrap();
        let rest = strip_block(&current).unwrap_or_else(|| current.clone());
        format!("{}{block}{}", &rest[..a], &rest[a..])
    } else {
        current + &block
    };
    crate::fsutil::write_atomic(&path, next.as_bytes())?;
    crate::ui::log(&format!(
        "\x1b[32m✅ Greet installed to\x1b[39m {}",
        path.display()
    ));
    Ok(path)
}

pub fn uninstall_greet(shell: &str) -> Result<()> {
    let path = shell_config_path(shell);
    let Ok(current) = std::fs::read_to_string(&path) else {
        crate::ui::log(&format!(
            "\x1b[33m⚠️  Config file not found: {}\x1b[39m",
            path.display()
        ));
        return Ok(());
    };
    let Some(next) = current
        .contains(GREET_START)
        .then(|| strip_block(&current))
        .flatten()
    else {
        crate::ui::log("\x1b[33m⚠️  Greet not installed\x1b[39m");
        return Ok(());
    };
    crate::fsutil::write_atomic(&path, next.as_bytes())?;
    crate::ui::log(&format!(
        "\x1b[32m✅ Greet removed from\x1b[39m {}",
        path.display()
    ));
    Ok(())
}

fn installed_banner(shell: &str) {
    println!();
    crate::ui::log("\x1b[36m🎉 Greet installed!\x1b[39m");
    crate::ui::log("\x1b[2mRestart your terminal or run:\x1b[22m");
    crate::ui::log(&format!(
        "\x1b[33m  source {}\x1b[39m",
        shell_config_path(shell).display()
    ));
    println!();
}

pub fn cmd_greet(
    action: Option<&str>,
    shell: Option<String>,
    force: bool,
    yes: bool,
) -> Result<i32> {
    let shell = shell.unwrap_or_else(detect_shell);
    if !["zsh", "bash"].contains(&shell.as_str()) && action != Some("status") {
        log_error(&format!(
            "Shell greeting only supports bash and zsh (detected: {shell})"
        ));
        return Ok(1);
    }
    match action {
        Some("install") => {
            install_greet(&shell, force)?;
            installed_banner(&shell);
        }
        Some("uninstall") => {
            uninstall_greet(&shell)?;
            println!();
            crate::ui::log("\x1b[36m✅ Greet uninstalled.\x1b[39m");
            println!();
        }
        Some("status") => {
            let path = shell_config_path(&shell);
            let installed = std::fs::read_to_string(&path).is_ok_and(|c| c.contains(GREET_START));
            crate::ui::log("\x1b[1m\n📋 Greet Status\n\x1b[22m");
            crate::ui::log(&format!(
                "  Shell:   \x1b[36m{shell}\x1b[39m\n  Config:  \x1b[2m{}\x1b[22m\n  Status:  {}\n",
                path.display(),
                if installed {
                    "\x1b[32m✅ Installed\x1b[39m"
                } else {
                    "\x1b[2mNot installed\x1b[22m"
                }
            ));
        }
        Some(other) => bail!("Invalid action '{other}' (choices: install, uninstall, status)"),
        None => {
            let ok = yes
                || dialoguer::Confirm::new()
                    .with_prompt(format!(
                        "Install fscripts.md greeting for \x1b[36m{shell}\x1b[39m?"
                    ))
                    .default(true)
                    .interact()?;
            if ok {
                install_greet(&shell, force)?;
                installed_banner(&shell);
            } else {
                crate::ui::log("\x1b[33mInstallation cancelled.\x1b[39m");
            }
        }
    }
    Ok(0)
}

// ---------------- publish ----------------

pub const DIST_TAGS: &[&str] = &["latest", "next", "beta", "alpha"];

/// lib/release/publish.js. `tag`/`yes` allow non-interactive use (Rust-only).
pub fn cmd_publish(cwd: &Path, tag: Option<String>, yes: bool) -> Result<i32> {
    let pkg_path = cwd.join("package.json");
    if !pkg_path.exists() {
        log_error("Cannot find package.json in the current directory");
        return Ok(1);
    }
    let pkg = crate::fsutil::read_json(&pkg_path)?;
    let (name, version) = (
        pkg["name"].as_str().unwrap_or(""),
        pkg["version"].as_str().unwrap_or(""),
    );
    crate::ui::log(&format!(
        "\x1b[1m\nPublishing \x1b[36m{name}\x1b[39m @ \x1b[33m{version}\x1b[39m\n\x1b[22m"
    ));
    let who = Command::new("npm")
        .arg("whoami")
        .current_dir(cwd)
        .output()
        .context("spawning npm")?;
    if !who.status.success() {
        crate::ui::log("\x1b[33mNot logged in to npm. Running `npm login`...\n\x1b[39m");
        crate::release::run("npm", &["login"], cwd)?;
    } else {
        crate::ui::log(&format!(
            "\x1b[32mLogged in as: {}\n\x1b[39m",
            String::from_utf8_lossy(&who.stdout).trim()
        ));
    }
    let tag = match tag {
        Some(t) => t,
        None => {
            let i = dialoguer::Select::new()
                .with_prompt("Which dist-tag?")
                .items(DIST_TAGS)
                .default(0)
                .interact()?;
            DIST_TAGS[i].to_string()
        }
    };
    let ok = yes
        || dialoguer::Confirm::new()
            .with_prompt(format!("Publish {name}@{version} with tag {tag}?"))
            .default(false)
            .interact()?;
    if !ok {
        crate::ui::log("\x1b[33mPublish cancelled.\x1b[39m");
        return Ok(0);
    }
    crate::release::run(
        "npm",
        &["publish", "--tag", &tag, "--access", "public"],
        cwd,
    )?;
    crate::ui::log(&format!(
        "\x1b[32;1m\nPublished {name}@{version} → {tag}\n\x1b[22;39m"
    ));
    Ok(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn chalk_reopens_around_newlines() {
        assert_eq!(chalk("<", ">", "a\nb"), "<a>\n<b>");
        assert_eq!(
            Notifier::render("post-task", &json!({"taskName":"x"})).unwrap(),
            format!("{BANNER_OPEN}{BANNER_CLOSE}\n{BANNER_OPEN}Task End: x{BANNER_CLOSE}")
        );
        assert!(
            Notifier::render("task-error", &json!({"taskName":"x","error":"exit code 3"}))
                .unwrap()
                .contains("exit code 3")
        );
    }
    #[test]
    fn strip_block_matches_js_regex() {
        let s = format!("a\n\n{GREET_START}\nX\n{GREET_END}\nb\n");
        assert_eq!(strip_block(&s).unwrap(), "a\n\nb\n");
        assert!(strip_block("nothing").is_none());
    }
    #[test]
    fn notify_toggle_uses_js_cache_key() {
        let d = tempfile::tempdir().unwrap();
        let c = Cache::new(d.path());
        assert!(notifications_enabled(&c));
        cmd_notify(&c, false, true, false).unwrap();
        assert!(!notifications_enabled(&c));
        assert_eq!(c.get(NOTIFY_KEY).unwrap().unwrap()["value"], false);
        cmd_notify(&c, true, false, false).unwrap();
        assert!(notifications_enabled(&c));
    }
}

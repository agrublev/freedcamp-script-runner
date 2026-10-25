//! Port of `lib/running/{runCLICommand,runSequence,runParallel}.js`, with the
//! reliability fixes the JS lacks:
//! * the child's exit code is propagated (JS only logged it and exited 0),
//! * `run-s` stops at the first failing task (fail-fast),
//! * `run-p` terminates the remaining siblings when one fails,
//! * SIGINT/SIGTERM/SIGHUP are forwarded to children and reflected in the
//!   exit code (128 + signal) instead of orphaning them.
//!
//! TODO(plugins): JS fires `pre-task` / `post-task` / `task-error` hooks
//! (`lib/plugins/hooks.js`). Plugins stay in JS; hooks are not fired yet.

use crate::parse::Task;
use crate::task::{Script, parse_task};
use anyhow::{Context, Result, bail};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct RunOpts {
    pub cwd: PathBuf,
    /// Path of the running fsr binary (used for `fsr …` / `yarn fsr …` tasks).
    pub self_exe: PathBuf,
    /// Active profile; children get NODE_ENV/FSR_ENV = profile or "development".
    pub profile: Option<String>,
    pub quiet: bool,
}

const POLL: Duration = Duration::from_millis(20);
const GRACE: Duration = Duration::from_secs(5);

/// Build the shell command line for a non-JS task (same rules as runCLICommand.js).
pub fn command_line(script: &Script, self_exe: &Path) -> String {
    let me = shell_quote(&self_exe.to_string_lossy());
    let join = |a: &str, b: &str| {
        [a, b]
            .iter()
            .filter(|s| !s.is_empty())
            .cloned()
            .collect::<Vec<_>>()
            .join(" ")
    };
    let full = script.full.as_str();
    if script.kind == "fsr" {
        return join(&me, full).trim().to_string();
    }
    let is_pm = matches!(
        script.kind.as_str(),
        "yarn" | "npm" | "pnpm" | "npx" | "bun"
    );
    if is_pm
        && (full == "fsr"
            || full.starts_with("fsr ")
            || full.starts_with("fsr\t")
            || full.starts_with("fsr\n"))
    {
        let rest = full.trim_start_matches("fsr").trim_start();
        return join(&me, rest).trim().to_string();
    }
    join(&script.kind, full).trim().to_string()
}

fn shell_quote(s: &str) -> String {
    if s.chars()
        .all(|c| c.is_ascii_alphanumeric() || "/._-+:".contains(c))
    {
        s.to_string()
    } else {
        format!("'{}'", s.replace('\'', "'\\''"))
    }
}

fn child_path(opts: &RunOpts) -> std::ffi::OsString {
    let mut parts = vec![opts.cwd.join("node_modules").join(".bin")];
    if let Some(d) = opts.self_exe.parent() {
        parts.push(d.to_path_buf());
    }
    if let Some(p) = std::env::var_os("PATH") {
        parts.extend(std::env::split_paths(&p));
    }
    std::env::join_paths(parts).unwrap_or_default()
}

/// A spawned task, plus a temp file to clean up for JS tasks.
pub struct Running {
    pub name: String,
    pub child: Child,
    tmp: Option<PathBuf>,
}

impl Drop for Running {
    fn drop(&mut self) {
        if let Some(t) = self.tmp.take() {
            let _ = std::fs::remove_file(t);
        }
    }
}

/// Spawn a task. `own_group` puts it in its own process group (used by run-p so
/// a whole sibling tree can be killed); foreground tasks keep the terminal group
/// so interactive programs and Ctrl-C behave normally.
pub fn spawn(task: &Task, opts: &RunOpts, own_group: bool) -> Result<Running> {
    let script = parse_task(task);
    let mut tmp = None;
    let mut cmd = if script.lang.as_deref() == Some("javascript") {
        let name = format!(".fsr-task-{:012x}.mjs", rand_u64() & 0xffff_ffff_ffff);
        let path = opts.cwd.join(name);
        std::fs::write(&path, &script.full)
            .with_context(|| format!("writing {}", path.display()))?;
        let mut c = Command::new("node");
        c.arg(&path);
        tmp = Some(path);
        c
    } else {
        let line = command_line(&script, &opts.self_exe);
        if line.is_empty() {
            bail!("task '{}' has no script", task.name);
        }
        shell(&line)
    };
    let profile = opts.profile.clone().unwrap_or_else(|| "development".into());
    cmd.current_dir(&opts.cwd)
        .env("NODE_ENV", &profile)
        .env("FSR_ENV", &profile)
        .env("FORCE_COLOR", "1")
        .env("PATH", child_path(opts));
    for (k, v) in &script.env {
        cmd.env(k, v);
    }
    #[cfg(unix)]
    if own_group {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    #[cfg(not(unix))]
    let _ = own_group;
    if !opts.quiet {
        // fsrLog.log(chalk.green.bgHex("#181c24").bold("[HH:mm:ss]") + chalk.bgHex("#181c24").bold.hex("#8c91a7")(" name: "))
        let t = chrono::Local::now().format("%H:%M:%S");
        println!(
            "\x1b[90m{t}\x1b[39m \x1b[90;1m[LOG]\x1b[0m \x1b[48;2;24;28;36;32;1m[{t}]\x1b[0m\x1b[48;2;24;28;36;1;38;2;140;145;167m {}: \x1b[0m",
            task.name
        );
    }
    let child = cmd
        .spawn()
        .with_context(|| format!("spawning task '{}'", task.name))?;
    Ok(Running {
        name: task.name.clone(),
        child,
        tmp,
    })
}

fn shell(line: &str) -> Command {
    if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(line);
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-c").arg(line);
        c
    }
}

fn rand_u64() -> u64 {
    use std::hash::{BuildHasher, Hasher};
    let mut h = std::collections::hash_map::RandomState::new().build_hasher();
    h.write_u128(Instant::now().elapsed().as_nanos() ^ u128::from(std::process::id()));
    h.finish()
}

/// Map an exit status to a shell-style code (128 + signal when killed).
pub fn exit_code(st: ExitStatus) -> i32 {
    if let Some(c) = st.code() {
        return c;
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::ExitStatusExt;
        if let Some(s) = st.signal() {
            return 128 + s;
        }
    }
    1
}

/// Signals received by fsr itself (0 = none). Registering replaces the default
/// "die immediately" action so fsr can forward and wait for children.
pub fn install_signal_flag() -> Arc<AtomicUsize> {
    let flag = Arc::new(AtomicUsize::new(0));
    #[cfg(unix)]
    for sig in [
        signal_hook::consts::SIGINT,
        signal_hook::consts::SIGTERM,
        signal_hook::consts::SIGHUP,
    ] {
        let _ = signal_hook::flag::register_usize(sig, Arc::clone(&flag), sig as usize);
    }
    flag
}

#[cfg(unix)]
fn send(pid: u32, sig: i32, group: bool) {
    use nix::sys::signal::{Signal, kill, killpg};
    use nix::unistd::Pid;
    if let Ok(s) = Signal::try_from(sig) {
        let p = Pid::from_raw(pid as i32);
        let _ = if group { killpg(p, s) } else { kill(p, s) };
    }
}

/// Wait for a set of children. `fail_fast_group`: on first failure, terminate
/// the rest (run-p). Returns the first non-zero code (or 0).
pub fn wait_all(mut running: Vec<Running>, group: bool, signals: &AtomicUsize) -> i32 {
    let mut first_fail: Option<i32> = None;
    let mut forwarded = 0usize;
    let mut kill_deadline: Option<Instant> = None;
    while !running.is_empty() {
        let sig = signals.load(Ordering::SeqCst);
        if sig != 0 && sig != forwarded {
            forwarded = sig;
            // Terminal Ctrl-C already reaches same-group children; forward to
            // own-group children, and forward TERM/HUP to everyone.
            #[cfg(unix)]
            for r in &running {
                if group || sig != signal_hook::consts::SIGINT as usize {
                    send(r.child.id(), sig as i32, group);
                }
            }
            first_fail.get_or_insert(128 + sig as i32);
            kill_deadline.get_or_insert(Instant::now() + GRACE);
        }
        let mut i = 0;
        while i < running.len() {
            match running[i].child.try_wait() {
                Ok(Some(st)) => {
                    let code = exit_code(st);
                    let r = running.remove(i);
                    if code != 0 {
                        eprintln!(
                            "\x1b[90m{}\x1b[39m \x1b[31;1m× [ERROR]\x1b[0m \x1b[31mERROR\x1b[39m exit code {code} ({})",
                            chrono::Local::now().format("%H:%M:%S"),
                            r.name
                        );
                        if first_fail.is_none() {
                            first_fail = Some(code);
                            if group && !running.is_empty() {
                                #[cfg(unix)]
                                for o in &running {
                                    eprintln!("[fsr] stopping '{}'", o.name);
                                    send(o.child.id(), nix::libc::SIGTERM, true);
                                }
                                kill_deadline = Some(Instant::now() + GRACE);
                            }
                        }
                    }
                }
                Ok(None) => i += 1,
                Err(e) => {
                    eprintln!("[fsr] wait failed for '{}': {e}", running[i].name);
                    running.remove(i);
                    first_fail.get_or_insert(1);
                }
            }
        }
        if kill_deadline.is_some_and(|d| Instant::now() > d) {
            for r in &mut running {
                #[cfg(unix)]
                send(r.child.id(), nix::libc::SIGKILL, group);
                #[cfg(not(unix))]
                let _ = r.child.kill();
            }
            kill_deadline = None;
        }
        if !running.is_empty() {
            std::thread::sleep(POLL);
        }
    }
    first_fail.unwrap_or(0)
}

fn find<'a>(tasks: &'a [Task], name: &str) -> Result<&'a Task> {
    tasks
        .iter()
        .find(|t| t.name == name)
        .with_context(|| format!("Task not found: {name}"))
}

pub fn run_one(tasks: &[Task], name: &str, opts: &RunOpts, sig: &AtomicUsize) -> Result<i32> {
    let r = spawn(find(tasks, name)?, opts, false)?;
    Ok(wait_all(vec![r], false, sig))
}

/// Sequential, fail-fast.
pub fn run_sequence(
    tasks: &[Task],
    names: &[String],
    opts: &RunOpts,
    sig: &AtomicUsize,
) -> Result<i32> {
    // Validate all names up-front so a typo doesn't run half a sequence.
    for n in names {
        find(tasks, n)?;
    }
    for n in names {
        let code = run_one(tasks, n, opts, sig)?;
        if code != 0 {
            return Ok(code);
        }
        if sig.load(Ordering::SeqCst) != 0 {
            return Ok(130);
        }
    }
    Ok(0)
}

/// Parallel; first failure terminates the siblings.
pub fn run_parallel(
    tasks: &[Task],
    names: &[String],
    opts: &RunOpts,
    sig: &AtomicUsize,
) -> Result<i32> {
    let found: Vec<&Task> = names
        .iter()
        .map(|n| find(tasks, n))
        .collect::<Result<_>>()?;
    let mut running = Vec::new();
    for t in found {
        match spawn(t, opts, true) {
            Ok(r) => running.push(r),
            Err(e) => {
                eprintln!("[fsr] {e:#}");
                #[cfg(unix)]
                for r in &running {
                    send(r.child.id(), nix::libc::SIGTERM, true);
                }
                wait_all(running, true, sig);
                return Ok(1);
            }
        }
    }
    Ok(wait_all(running, true, sig))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn command_line_rules() {
        let me = Path::new("/usr/bin/fsr");
        let s = |kind: &str, full: &str| Script {
            lang: None,
            env: vec![],
            kind: kind.into(),
            full: full.into(),
        };
        assert_eq!(command_line(&s("fsr", "run x"), me), "/usr/bin/fsr run x");
        assert_eq!(
            command_line(&s("yarn", "fsr run x"), me),
            "/usr/bin/fsr run x"
        );
        assert_eq!(
            command_line(&s("yarn", "fsrx build"), me),
            "yarn fsrx build"
        );
        assert_eq!(command_line(&s("echo", "hi"), me), "echo hi");
        assert_eq!(
            command_line(&s("fsr", ""), Path::new("/a b/fsr")),
            "'/a b/fsr'"
        );
    }
}

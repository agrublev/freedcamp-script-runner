//! JS plugin support for the Rust binary. User plugins stay JavaScript and run
//! inside `src/plugins/host.mjs` (embedded here), which mirrors the original
//! `lib/plugins/loader.js`: `.fsr/plugins/<name>/index.js`,
//! `node_modules/fscr-plugin-*/index.js` and extra roots in `FSR_PLUGIN_DIRS`.
//! Storage is the same `<cwd>/.fscr/<plugin>/storage.json`.
//! Node is only started when at least one plugin directory exists.

use crate::runner::Hooks;
use anyhow::{Context, Result, bail};
use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use std::sync::mpsc::{Receiver, RecvTimeoutError, channel};
use std::time::Duration;

pub const HOST_SRC: &str = include_str!("plugins/host.mjs");
const MARK: &str = "\u{1e}FSR ";

#[derive(Debug, Clone, Default, PartialEq)]
pub struct PluginInfo {
    pub name: String,
    pub description: String,
    pub source: String,
    pub runnable: bool,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct CommandInfo {
    pub name: String,
    pub description: String,
    pub aliases: Vec<String>,
    pub plugin: String,
    /// (long, short, type)
    pub options: Vec<(String, Option<char>, String)>,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Listing {
    pub plugins: Vec<PluginInfo>,
    pub commands: Vec<CommandInfo>,
}

fn roots(cwd: &Path) -> Vec<(PathBuf, Option<&'static str>)> {
    let mut v: Vec<(PathBuf, Option<&'static str>)> = std::env::var_os("FSR_PLUGIN_DIRS")
        .map(|s| std::env::split_paths(&s).map(|p| (p, None)).collect())
        .unwrap_or_default();
    v.push((cwd.join(".fsr").join("plugins"), None));
    v.push((cwd.join("node_modules"), Some("fscr-plugin-")));
    v
}

/// True if any plugin entry (`<root>/<dir>/index.js`) exists — no Node needed.
pub fn has_plugins(cwd: &Path) -> bool {
    roots(cwd).iter().any(|(root, prefix)| {
        std::fs::read_dir(root)
            .map(|rd| {
                rd.filter_map(|e| e.ok()).any(|e| {
                    let n = e.file_name().to_string_lossy().to_string();
                    prefix.is_none_or(|p| n.starts_with(p)) && e.path().join("index.js").is_file()
                })
            })
            .unwrap_or(false)
    })
}

/// Write the embedded host once per content hash under ~/.fsr/.
pub fn host_path() -> Result<PathBuf> {
    let dir = crate::cache::default_dir();
    let p = dir.join(format!("plugin-host-{}.mjs", crate::hash::hash16(HOST_SRC)));
    if !p.exists() {
        crate::fsutil::write_atomic(&p, HOST_SRC.as_bytes())?;
    }
    Ok(p)
}

fn node(cwd: &Path, args: &[&str]) -> Result<Command> {
    let mut c = Command::new("node");
    c.arg(host_path()?)
        .args(args)
        .current_dir(cwd)
        .env("FSR_VERSION", env!("CARGO_PKG_VERSION"));
    Ok(c)
}

fn parse_listing(v: &Value) -> Listing {
    let s = |x: &Value| x.as_str().unwrap_or("").to_string();
    Listing {
        plugins: v["plugins"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|p| PluginInfo {
                name: s(&p["name"]),
                description: s(&p["description"]),
                source: s(&p["source"]),
                runnable: p["runnable"].as_bool().unwrap_or(false),
            })
            .collect(),
        commands: v["commands"]
            .as_array()
            .into_iter()
            .flatten()
            .map(|c| CommandInfo {
                name: s(&c["name"]),
                description: s(&c["description"]),
                plugin: s(&c["plugin"]),
                aliases: c["aliases"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .map(s)
                    .collect(),
                options: c["options"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(|o| parse_flags(&s(&o["flags"]), &s(&o["type"])))
                    .collect(),
            })
            .collect(),
    }
}

/// `"-n, --name <name>"` → ("name", Some('n'), type) like loader.js registerPluginCommands.
pub fn parse_flags(flags: &str, ty: &str) -> Option<(String, Option<char>, String)> {
    let long = flags
        .split(|c: char| c == ',' || c.is_whitespace())
        .find_map(|t| t.strip_prefix("--"))?
        .to_string();
    let short = flags
        .split(|c: char| c == ',' || c.is_whitespace())
        .find_map(|t| t.strip_prefix('-').filter(|r| r.len() == 1))
        .and_then(|r| r.chars().next());
    Some((
        long,
        short,
        if ty.is_empty() {
            "string".into()
        } else {
            ty.into()
        },
    ))
}

/// Run `host.mjs list`. Plugin init output passes through to stdout (as JS).
pub fn list(cwd: &Path) -> Result<Listing> {
    if !has_plugins(cwd) {
        return Ok(Listing::default());
    }
    let out = node(cwd, &["list"])?
        .stderr(Stdio::inherit())
        .output()
        .context("starting node for plugins")?;
    let text = String::from_utf8_lossy(&out.stdout);
    let mut listing = None;
    for line in text.lines() {
        match line.strip_prefix(MARK) {
            Some(j) => {
                listing = serde_json::from_str::<Value>(j)
                    .ok()
                    .map(|v| parse_listing(&v))
            }
            None => println!("{line}"),
        }
    }
    listing.context("plugin host returned no listing")
}

/// argv json for a plugin command from CLI args, typed by its options.
pub fn argv_json(cmd: &CommandInfo, args: &[String]) -> Value {
    let mut m = serde_json::Map::new();
    let mut pos = Vec::new();
    let mut i = 0;
    while i < args.len() {
        let a = &args[i];
        let (key, inline) = if let Some(l) = a.strip_prefix("--") {
            match l.split_once('=') {
                Some((k, v)) => (Some(k.to_string()), Some(v.to_string())),
                None => (Some(l.to_string()), None),
            }
        } else if let Some(sh) = a.strip_prefix('-').filter(|s| s.chars().count() == 1) {
            let c = sh.chars().next().unwrap();
            (
                cmd.options
                    .iter()
                    .find(|o| o.1 == Some(c))
                    .map(|o| o.0.clone())
                    .or(Some(sh.to_string())),
                None,
            )
        } else {
            pos.push(Value::String(a.clone()));
            i += 1;
            continue;
        };
        let key = key.unwrap();
        let boolean = cmd
            .options
            .iter()
            .find(|o| o.0 == key)
            .is_some_and(|o| o.2 == "boolean");
        let val = if let Some(v) = inline {
            Value::String(v)
        } else if boolean {
            Value::Bool(true)
        } else if let Some(next) = args.get(i + 1).filter(|n| !n.starts_with('-')) {
            i += 1;
            Value::String(next.clone())
        } else {
            Value::Bool(true)
        };
        if let Some((_, Some(sh), _)) = cmd.options.iter().find(|o| o.0 == key) {
            m.insert(sh.to_string(), val.clone());
        }
        m.insert(key, val);
        i += 1;
    }
    m.insert("_".into(), Value::Array(pos));
    Value::Object(m)
}

/// Run a plugin command (stdin/stdout inherited). Returns the exit code.
pub fn run_command(cwd: &Path, name: &str, argv: &Value) -> Result<i32> {
    let st = node(cwd, &["command", name, &argv.to_string()])?
        .status()
        .context("starting node for plugin command")?;
    Ok(crate::runner::exit_code(st))
}

/// Run a runnable plugin's `run()` (`fsr plugin <name>` / menu `plugin:<name>`).
pub fn run_plugin(cwd: &Path, name: &str) -> Result<i32> {
    let st = node(cwd, &["run", name])?
        .status()
        .context("starting node for plugin")?;
    Ok(crate::runner::exit_code(st))
}

/// A long-lived `host.mjs serve` process for firing hooks during task runs.
pub struct Host {
    inner: Mutex<HostInner>,
    pub listing: Listing,
}

struct HostInner {
    child: Child,
    stdin: ChildStdin,
    rx: Receiver<Value>,
    next: u64,
}

impl Host {
    /// Start the host if plugins exist; `None` means no Node process at all.
    pub fn start(cwd: &Path) -> Result<Option<Host>> {
        if !has_plugins(cwd) {
            return Ok(None);
        }
        let mut child = node(cwd, &["serve"])?
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .context("starting plugin host")?;
        let stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();
        let (tx, rx) = channel();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                match line.strip_prefix(MARK) {
                    Some(j) => {
                        if let Ok(v) = serde_json::from_str::<Value>(j) {
                            let _ = tx.send(v);
                        }
                    }
                    None => {
                        println!("{line}");
                    }
                }
            }
        });
        let ready = rx
            .recv_timeout(Duration::from_secs(30))
            .context("plugin host did not start")?;
        if ready["type"] != "ready" {
            bail!("unexpected plugin host message: {ready}");
        }
        Ok(Some(Host {
            listing: parse_listing(&ready),
            inner: Mutex::new(HostInner {
                child,
                stdin,
                rx,
                next: 0,
            }),
        }))
    }

    pub fn request(&self, op: &str, name: &str, data: Value) -> Result<()> {
        let mut g = self.inner.lock().unwrap();
        g.next += 1;
        let id = g.next;
        writeln!(
            g.stdin,
            "{}",
            json!({"id": id, "op": op, "name": name, "data": data})
        )?;
        g.stdin.flush()?;
        loop {
            match g.rx.recv_timeout(Duration::from_secs(60)) {
                Ok(v) if v["id"] == id => return Ok(()),
                Ok(_) => continue,
                Err(RecvTimeoutError::Timeout) => bail!("plugin hook '{name}' timed out"),
                Err(RecvTimeoutError::Disconnected) => bail!("plugin host exited"),
            }
        }
    }
}

impl Hooks for Host {
    fn fire(&self, name: &str, data: Value) {
        if let Err(e) = self.request("hook", name, data) {
            eprintln!("[hook:{name}] {e:#}");
        }
    }
}

impl Drop for Host {
    fn drop(&mut self) {
        if let Ok(mut g) = self.inner.lock() {
            let _ = writeln!(g.stdin, "{}", json!({"id": 0, "op": "exit"}));
            let _ = g.stdin.flush();
            for _ in 0..50 {
                if matches!(g.child.try_wait(), Ok(Some(_))) {
                    return;
                }
                std::thread::sleep(Duration::from_millis(20));
            }
            let _ = g.child.kill();
            let _ = g.child.wait();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn flags_and_argv() {
        assert_eq!(
            parse_flags("-n, --name <name>", ""),
            Some(("name".into(), Some('n'), "string".into()))
        );
        assert_eq!(
            parse_flags("--files", "string"),
            Some(("files".into(), None, "string".into()))
        );
        assert_eq!(parse_flags("-e, --enable", "boolean").unwrap().1, Some('e'));
        let cmd = CommandInfo {
            options: vec![
                ("name".into(), Some('n'), "string".into()),
                ("enable".into(), Some('e'), "boolean".into()),
            ],
            ..Default::default()
        };
        let a = |v: &[&str]| argv_json(&cmd, &v.iter().map(|s| s.to_string()).collect::<Vec<_>>());
        assert_eq!(a(&["-n", "Bob"])["name"], "Bob");
        assert_eq!(a(&["--name=Al", "x"])["_"], json!(["x"]));
        assert_eq!(a(&["-e", "pos"])["enable"], true);
        assert_eq!(a(&["-e", "pos"])["_"], json!(["pos"]));
    }
    #[test]
    fn no_plugins_means_no_node() {
        let d = tempfile::tempdir().unwrap();
        assert!(!has_plugins(d.path()));
        assert!(Host::start(d.path()).unwrap().is_none());
        assert_eq!(list(d.path()).unwrap(), Listing::default());
        std::fs::create_dir_all(d.path().join("node_modules/other")).unwrap();
        std::fs::write(d.path().join("node_modules/other/index.js"), "").unwrap();
        assert!(!has_plugins(d.path()), "only fscr-plugin-* packages count");
    }
}

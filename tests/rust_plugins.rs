//! Plugin host integration: examples/plugins + a hook-recording plugin.
use std::path::Path;
use std::process::Command;

const RECORDER: &str = r#"
export default {
  name: "recorder",
  description: "records hooks",
  init(ctx) {
    for (const h of ["pre-task", "post-task", "task-error"]) {
      ctx.registerHook(h, (d) => {
        const s = ctx.getStorage();
        (s.events ||= []).push({ hook: h, task: d.taskName, success: d.success ?? null, error: d.error ? String(d.error.message) : null });
        ctx.setStorage(s);
      });
    }
  },
  async run(ctx) { ctx.logger.success("recorder ran"); },
};
"#;

fn setup() -> tempfile::TempDir {
    let d = tempfile::tempdir().unwrap();
    let p = d.path().join(".fsr/plugins");
    std::fs::create_dir_all(p.join("recorder")).unwrap();
    std::fs::write(p.join("recorder/index.js"), RECORDER).unwrap();
    let src = Path::new(env!("CARGO_MANIFEST_DIR")).join("examples/plugins/hello-world");
    std::fs::create_dir_all(p.join("hello-world")).unwrap();
    std::fs::copy(src.join("index.js"), p.join("hello-world/index.js")).unwrap();
    std::fs::write(
        d.path().join("fscripts.md"),
        "# Cat\n\n## ok\n\n```bash\necho hi\n```\n\n## bad\n\n```bash\nexit 3\n```\n",
    )
    .unwrap();
    d
}

fn fsr(dir: &Path, args: &[&str]) -> (i32, String) {
    let o = Command::new(env!("CARGO_BIN_EXE_fsr"))
        .args(args)
        .current_dir(dir)
        .env("HOME", dir)
        .output()
        .unwrap();
    (
        o.status.code().unwrap_or(-1),
        String::from_utf8_lossy(&o.stdout).to_string() + &String::from_utf8_lossy(&o.stderr),
    )
}

fn has(ev: &serde_json::Value, hook: &str, task: &str) -> bool {
    ev.as_array()
        .unwrap()
        .iter()
        .any(|e| e["hook"] == hook && e["task"] == task)
}

fn events(dir: &Path) -> serde_json::Value {
    let s = std::fs::read_to_string(dir.join(".fscr/recorder/storage.json")).unwrap();
    serde_json::from_str::<serde_json::Value>(&s).unwrap()["events"].clone()
}

#[test]
fn runner_fires_hooks_and_storage_matches_loader_layout() {
    let d = setup();
    assert_eq!(fsr(d.path(), &["run", "ok"]).0, 0);
    let (code, out) = fsr(d.path(), &["bad"]); // bare task shorthand
    assert_eq!(code, 3, "{out}");
    assert!(
        out.contains("Task starting: ok") || out.contains("Task starting: bad"),
        "hello-world hook output passes through: {out}"
    );
    let ev = events(d.path());
    assert_eq!(
        ev,
        serde_json::json!([
            {"hook":"pre-task","task":"ok","success":null,"error":null},
            {"hook":"post-task","task":"ok","success":true,"error":null},
            {"hook":"pre-task","task":"bad","success":null,"error":null},
            {"hook":"task-error","task":"bad","success":null,"error":"exit code 3"},
        ])
    );
}

#[test]
fn run_p_fires_hooks_for_each_task() {
    let d = setup();
    assert_eq!(fsr(d.path(), &["run-p", "ok", "bad"]).0, 3);
    let ev = events(d.path());
    assert!(
        has(&ev, "pre-task", "ok") && has(&ev, "post-task", "ok") && has(&ev, "task-error", "bad"),
        "{ev}"
    );
}

#[test]
fn plugin_commands_plugins_listing_and_run() {
    let d = setup();
    let (code, out) = fsr(d.path(), &["hello", "-n", "Zed"]);
    assert_eq!(code, 0, "{out}");
    assert!(out.contains("Hello, Zed!"), "{out}");
    let ev = events(d.path());
    assert!(
        has(&ev, "pre-task", "hello") && has(&ev, "post-task", "hello"),
        "command fires hooks like loader.js: {ev}"
    );
    let (_, out) = fsr(d.path(), &["plugins"]);
    assert!(
        out.contains("Installed plugins (6)")
            && out.contains("[builtin]")
            && out.contains("recorder")
            && out.contains("hello")
            && out.contains("[local]"),
        "{out}"
    );
    let (code, out) = fsr(d.path(), &["plugin", "recorder"]);
    assert_eq!(code, 0, "{out}");
    assert!(out.contains("recorder ran"), "{out}");
    assert_eq!(fsr(d.path(), &["plugin", "nope"]).0, 2);
}

#[test]
fn no_plugins_no_node_needed() {
    let d = tempfile::tempdir().unwrap();
    std::fs::write(
        d.path().join("fscripts.md"),
        "# Cat\n\n## ok\n\n```bash\necho hi\n```\n",
    )
    .unwrap();
    let o = Command::new(env!("CARGO_BIN_EXE_fsr"))
        .args(["run", "ok"])
        .current_dir(d.path())
        .env("HOME", d.path())
        .env("PATH", "/usr/bin:/bin")
        .output()
        .unwrap();
    assert!(o.status.success());
    // The embedded host is only written to ~/.fsr when Node is started.
    let host_written = std::fs::read_dir(d.path().join(".fsr"))
        .map(|rd| {
            rd.flatten()
                .any(|e| e.file_name().to_string_lossy().starts_with("plugin-host-"))
        })
        .unwrap_or(false);
    assert!(!host_written);
    let (_, out) = fsr(d.path(), &["plugins"]);
    assert!(
        out.contains("Installed plugins (4)") && !out.contains("[local]"),
        "{out}"
    );
}

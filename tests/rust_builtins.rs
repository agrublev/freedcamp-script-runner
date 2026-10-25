//! deploy / notify / greet / publish (native ports of the JS built-ins).
use std::path::Path;
use std::process::Command;

fn fsr_env(dir: &Path, args: &[&str], env: &[(&str, String)]) -> (i32, String) {
    let mut c = Command::new(env!("CARGO_BIN_EXE_fsr"));
    c.args(args)
        .current_dir(dir)
        .env("HOME", dir)
        .env_remove("SHELL");
    for (k, v) in env {
        c.env(k, v);
    }
    let o = c.output().unwrap();
    (
        o.status.code().unwrap_or(-1),
        String::from_utf8_lossy(&o.stdout).to_string() + &String::from_utf8_lossy(&o.stderr),
    )
}
fn fsr(dir: &Path, args: &[&str]) -> (i32, String) {
    fsr_env(dir, args, &[])
}

fn fake_bin(dir: &Path, name: &str, body: &str) -> String {
    let bin = dir.join("bin");
    std::fs::create_dir_all(&bin).unwrap();
    let p = bin.join(name);
    std::fs::write(&p, format!("#!/bin/sh\n{body}\n")).unwrap();
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&p, std::fs::Permissions::from_mode(0o755)).unwrap();
    format!("{}:{}", bin.display(), std::env::var("PATH").unwrap())
}

#[test]
fn notify_toggles_task_banners() {
    let d = tempfile::tempdir().unwrap();
    std::fs::write(
        d.path().join("fscripts.md"),
        "# Cat\n\n## ok\n\n```bash\necho hi\n```\n",
    )
    .unwrap();
    let (_, out) = fsr(d.path(), &["run", "ok"]);
    assert!(
        out.contains("`✓ Task Started: ok") && out.contains("Task End: ok"),
        "{out}"
    );
    let (_, out) = fsr(d.path(), &["notify", "--disable"]);
    assert!(out.contains("Notifications disabled"), "{out}");
    let (_, out) = fsr(d.path(), &["run", "ok"]);
    assert!(!out.contains("Task Started"), "{out}");
    assert!(
        fsr(d.path(), &["notify", "-s"])
            .1
            .contains("Notifications are disabled")
    );
    assert!(
        fsr(d.path(), &["notify"])
            .1
            .contains("Usage: fsr notify [--enable|--disable|--status]")
    );
    let cache = std::fs::read_to_string(d.path().join(".fsr/cache.json")).unwrap();
    assert!(cache.contains("task-notifier.enabled"), "{cache}");
}

#[test]
fn deploy_runs_surge_and_records_history() {
    let d = tempfile::tempdir().unwrap();
    let (code, out) = fsr(d.path(), &["deploy"]);
    assert_eq!(code, 0);
    assert!(
        out.contains("Usage: fsr deploy --files <path> --subdomain <name>"),
        "{out}"
    );
    let path = fake_bin(d.path(), "npx", "echo \"npx $*\" > \"$HOME/npx.log\"");
    let (code, out) = fsr_env(
        d.path(),
        &["ship", "--files", "./dist", "--subdomain", "demo"],
        &[("PATH", path.clone())],
    );
    assert_eq!(code, 0, "{out}");
    assert!(out.contains("Deploying ./dist → demo.surge.sh"), "{out}");
    assert_eq!(
        std::fs::read_to_string(d.path().join("npx.log"))
            .unwrap()
            .trim(),
        "npx surge ./dist demo.surge.sh"
    );
    let (_, out) = fsr(d.path(), &["deploy-history"]);
    assert!(
        out.contains("Recent Deployments:") && out.contains("✓"),
        "{out}"
    );
    let path = fake_bin(d.path(), "npx", "exit 4");
    let (code, out) = fsr_env(
        d.path(),
        &["deploy", "--files", "x", "--subdomain", "y"],
        &[("PATH", path)],
    );
    assert_eq!(code, 1);
    assert!(
        out.contains("surge exited with code 4") && out.contains("Task Error: deploy"),
        "{out}"
    );
}

#[test]
fn greet_install_status_uninstall() {
    let d = tempfile::tempdir().unwrap();
    std::fs::write(d.path().join(".bashrc"), "export A=1\n").unwrap();
    let (code, out) = fsr(d.path(), &["greet", "install"]);
    assert_eq!(code, 0, "{out}");
    let rc = std::fs::read_to_string(d.path().join(".bashrc")).unwrap();
    assert!(
        rc.starts_with("export A=1\n\n# FSCR greet\n")
            && rc.ends_with("_fscr_greet\n\n# End FSCR greet\n"),
        "{rc}"
    );
    assert!(rc.contains("PROMPT_COMMAND=\"_fscr_greet${PROMPT_COMMAND:+;$PROMPT_COMMAND}\""));
    assert!(
        fsr(d.path(), &["greet", "install"])
            .1
            .contains("Greet already installed")
    );
    fsr(d.path(), &["greet", "install", "--force"]);
    assert_eq!(
        std::fs::read_to_string(d.path().join(".bashrc")).unwrap(),
        // JS regex replace: the new block starts with "\n", so each --force
        // adds one blank line before it (kept for parity).
        rc.replacen("export A=1\n", "export A=1\n\n", 1),
        "--force replaces in place"
    );
    assert!(
        fsr(d.path(), &["greet", "status"])
            .1
            .contains("✅ Installed")
    );
    fsr(d.path(), &["greet", "uninstall"]);
    assert_eq!(
        std::fs::read_to_string(d.path().join(".bashrc")).unwrap(),
        "export A=1\n\n\n"
    );
    let (code, _) = fsr_env(
        d.path(),
        &["greet", "install"],
        &[("SHELL", "/usr/bin/fish".into())],
    );
    assert_eq!(code, 1);
    fsr(d.path(), &["greet", "install", "-s", "zsh"]);
    assert!(
        std::fs::read_to_string(d.path().join(".zshrc"))
            .unwrap()
            .contains("chpwd_functions+=(_fscr_greet)")
    );
}

#[test]
fn publish_shells_out_to_npm() {
    let d = tempfile::tempdir().unwrap();
    assert_eq!(fsr(d.path(), &["publish", "--tag", "next", "-y"]).0, 1);
    std::fs::write(
        d.path().join("package.json"),
        r#"{"name":"pkg","version":"1.2.3"}"#,
    )
    .unwrap();
    let path = fake_bin(
        d.path(),
        "npm",
        "echo \"npm $*\" >> \"$HOME/npm.log\"; [ \"$1\" = whoami ] && echo angel; exit 0",
    );
    let (code, out) = fsr_env(
        d.path(),
        &["publish", "--tag", "next", "-y"],
        &[("PATH", path)],
    );
    assert_eq!(code, 0, "{out}");
    assert!(
        out.contains("Logged in as: angel") && out.contains("Published pkg@1.2.3 → next"),
        "{out}"
    );
    assert_eq!(
        std::fs::read_to_string(d.path().join("npm.log")).unwrap(),
        "npm whoami\nnpm publish --tag next --access public\n"
    );
}

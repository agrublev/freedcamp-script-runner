//! Integration tests for the Rust runner (exit codes, fail-fast, siblings, env, PATH).
use std::process::Command;
use std::time::{Duration, Instant};

const MD: &str = r#"# Group

## ok

```bash
echo ok
```

## fail

```bash
exit 3
```

## slow

```bash
sleep 30
```

## touch

```bash
touch touched
```

## envcheck

```bash
sh -c 'test "$NODE_ENV" = production && test "$FSR_ENV" = production && test "$X" = 1' X=1
```

## inline

```bash
X=1 sh -c 'test "$X" = 1'
```

## localbin

```bash
mytool
```

## [env:staging]

## deploy

```bash
exit 7
```
"#;

fn setup() -> tempfile::TempDir {
    let d = tempfile::tempdir().unwrap();
    std::fs::write(d.path().join("fscripts.md"), MD).unwrap();
    let bin = d.path().join("node_modules/.bin");
    std::fs::create_dir_all(&bin).unwrap();
    let tool = bin.join("mytool");
    std::fs::write(&tool, "#!/bin/sh\nexit 0\n").unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&tool, std::fs::Permissions::from_mode(0o755)).unwrap();
    }
    d
}

fn fsr(d: &tempfile::TempDir, args: &[&str]) -> i32 {
    Command::new(env!("CARGO_BIN_EXE_fsr"))
        .args(args)
        .current_dir(d.path())
        .output()
        .unwrap()
        .status
        .code()
        .unwrap_or(-1)
}

#[test]
fn run_propagates_exit_code() {
    let d = setup();
    assert_eq!(fsr(&d, &["run", "ok"]), 0);
    assert_eq!(fsr(&d, &["run", "fail"]), 3);
    assert_eq!(fsr(&d, &["run", "nope"]), 1);
}

#[test]
fn sequence_is_fail_fast() {
    let d = setup();
    assert_eq!(fsr(&d, &["run-s", "ok", "fail", "touch"]), 3);
    assert!(
        !d.path().join("touched").exists(),
        "task after failure must not run"
    );
    assert_eq!(fsr(&d, &["run-s", "ok", "touch"]), 0);
    assert!(d.path().join("touched").exists());
}

#[test]
fn parallel_kills_siblings_on_failure() {
    let d = setup();
    let t = Instant::now();
    assert_eq!(fsr(&d, &["run-p", "slow", "fail"]), 3);
    assert!(
        t.elapsed() < Duration::from_secs(10),
        "sibling was not stopped: {:?}",
        t.elapsed()
    );
}

#[test]
fn env_profile_and_inline_env_and_local_bin() {
    let d = setup();
    assert_eq!(fsr(&d, &["run", "inline"]), 0);
    assert_eq!(fsr(&d, &["run", "localbin"]), 0);
    // --env filters to that profile's tasks, so 'ok' is not visible under staging
    assert_eq!(fsr(&d, &["--env", "staging", "run", "deploy"]), 7);
    assert_eq!(fsr(&d, &["run", "ok", "--env=staging"]), 1);
}

#[cfg(unix)]
#[test]
fn sigterm_is_forwarded_and_reported() {
    let d = setup();
    let mut c = Command::new(env!("CARGO_BIN_EXE_fsr"))
        .args(["run-p", "slow", "slow"])
        .current_dir(d.path())
        .spawn()
        .unwrap();
    std::thread::sleep(Duration::from_millis(500));
    nix::sys::signal::kill(
        nix::unistd::Pid::from_raw(c.id() as i32),
        nix::sys::signal::Signal::SIGTERM,
    )
    .unwrap();
    let t = Instant::now();
    let st = c.wait().unwrap();
    assert!(t.elapsed() < Duration::from_secs(4));
    assert_eq!(st.code(), Some(128 + 15));
}

#[test]
fn non_interactive_commands() {
    let d = setup();
    let out = |args: &[&str]| {
        let o = Command::new(env!("CARGO_BIN_EXE_fsr"))
            .args(args)
            .current_dir(d.path())
            .env("HOME", d.path())
            .output()
            .unwrap();
        (
            o.status.code().unwrap(),
            String::from_utf8_lossy(&o.stdout).to_string(),
        )
    };
    let (c, s) = out(&["list"]);
    assert_eq!(c, 0);
    assert!(s.contains("# Group") && s.contains("deploy [env:staging]"));
    let (c, s) = out(&["completion", "bash"]);
    assert_eq!(c, 0);
    assert!(s.contains("run-p"));
    assert_eq!(out(&["toc"]).0, 0);
    assert!(
        std::fs::read_to_string(d.path().join("fscripts.md"))
            .unwrap()
            .starts_with("- [Group](#group)")
    );
    assert_eq!(out(&["run", "ok"]).0, 0, "toc'd file still runs");
    let (c, s) = out(&["doctor", "--json"]);
    assert_eq!(c, 1, "no package.json is a critical failure");
    assert!(s.contains("\"fscriptsFile\""));
    std::fs::write(d.path().join("package.json"), r#"{"scripts":{"b":"tsc"}}"#).unwrap();
    assert_eq!(out(&["scripts"]).1.trim(), "b  tsc");
    assert_eq!(out(&["clear"]).0, 0);
}

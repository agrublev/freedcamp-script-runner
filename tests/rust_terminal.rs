//! Signals, panics and the shipped encrypted fixture.
use std::io::Read;
use std::os::fd::AsRawFd;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

fn alive(pid: i32) -> bool {
    // zombie-free check: kill(pid, 0) succeeds while the process exists
    nix::sys::signal::kill(nix::unistd::Pid::from_raw(pid), None).is_ok()
        && !std::fs::read_to_string(format!("/proc/{pid}/stat")).is_ok_and(|s| s.contains(") Z "))
}

#[test]
fn ctrl_c_in_run_p_stops_all_children() {
    let d = tempfile::tempdir().unwrap();
    std::fs::write(
        d.path().join("fscripts.md"),
        "# G\n\n## a\n\n```bash\necho $$ > a.pid; exec sleep 30\n```\n\n## b\n\n```bash\necho $$ > b.pid; exec sleep 30\n```\n",
    )
    .unwrap();
    use std::os::unix::process::CommandExt;
    let mut child = Command::new(env!("CARGO_BIN_EXE_fsr"))
        .args(["run-p", "a", "b"])
        .current_dir(d.path())
        .env("HOME", d.path())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .process_group(0) // like a terminal's foreground job
        .spawn()
        .unwrap();
    let pid_of = |n: &str| {
        std::fs::read_to_string(d.path().join(n))
            .ok()
            .and_then(|s| s.trim().parse::<i32>().ok())
    };
    let t = Instant::now();
    while (pid_of("a.pid").is_none() || pid_of("b.pid").is_none())
        && t.elapsed() < Duration::from_secs(10)
    {
        std::thread::sleep(Duration::from_millis(20));
    }
    let (a, b) = (pid_of("a.pid").unwrap(), pid_of("b.pid").unwrap());
    assert!(alive(a) && alive(b));
    // Ctrl-C: SIGINT to the foreground process group (fsr; run-p children
    // sit in their own groups, so fsr must forward it).
    nix::sys::signal::killpg(
        nix::unistd::Pid::from_raw(child.id() as i32),
        nix::sys::signal::Signal::SIGINT,
    )
    .unwrap();
    let t = Instant::now();
    let status = loop {
        if let Some(s) = child.try_wait().unwrap() {
            break s;
        }
        assert!(
            t.elapsed() < Duration::from_secs(4),
            "fsr did not exit after SIGINT"
        );
        std::thread::sleep(Duration::from_millis(20));
    };
    assert_eq!(status.code(), Some(130));
    let t = Instant::now();
    while (alive(a) || alive(b)) && t.elapsed() < Duration::from_secs(2) {
        std::thread::sleep(Duration::from_millis(20));
    }
    assert!(!alive(a) && !alive(b), "children survived Ctrl-C");
}

#[test]
fn panic_in_ui_restores_terminal() {
    use nix::sys::termios::{LocalFlags, tcgetattr};
    let exe = Path::new(env!("CARGO_MANIFEST_DIR")).join("target/debug/examples/ui_panic");
    assert!(
        exe.exists(),
        "{} missing: run the full `cargo test` (it builds examples)",
        exe.display()
    );
    let ws = nix::pty::Winsize {
        ws_row: 24,
        ws_col: 80,
        ws_xpixel: 0,
        ws_ypixel: 0,
    };
    let pty = nix::pty::openpty(Some(&ws), None).unwrap();
    let before = tcgetattr(&pty.slave).unwrap().local_flags;
    assert!(before.contains(LocalFlags::ICANON | LocalFlags::ECHO));
    let mut child = Command::new(&exe)
        .stdin(Stdio::from(pty.slave.try_clone().unwrap()))
        .stdout(Stdio::from(pty.slave.try_clone().unwrap()))
        .stderr(Stdio::from(pty.slave.try_clone().unwrap()))
        .spawn()
        .unwrap();
    let master = pty.master;
    let mfd = master.as_raw_fd();
    let mut writer = std::fs::File::from(master.try_clone().unwrap());
    let reader = std::thread::spawn(move || {
        let mut f = std::fs::File::from(master);
        let mut out = Vec::new();
        let mut buf = [0u8; 4096];
        while let Ok(n) = f.read(&mut buf) {
            if n == 0 {
                break;
            }
            out.extend_from_slice(&buf[..n]);
        }
        out
    });
    // Let the first frame draw, then press a key to trigger the panicking frame.
    std::thread::sleep(Duration::from_millis(400));
    std::io::Write::write_all(&mut writer, b"x").unwrap();
    drop(writer);
    let t = Instant::now();
    let status = loop {
        if let Some(s) = child.try_wait().unwrap() {
            break s;
        }
        assert!(t.elapsed() < Duration::from_secs(10), "ui_panic hung");
        std::thread::sleep(Duration::from_millis(20));
    };
    assert!(!status.success(), "panic should exit non-zero");
    let after = tcgetattr(&pty.slave).unwrap().local_flags;
    drop(pty.slave); // master read hits EOF/EIO once the last slave fd closes
    let _ = mfd;
    let out = String::from_utf8_lossy(&reader.join().unwrap()).to_string();
    assert!(
        after.contains(LocalFlags::ICANON | LocalFlags::ECHO),
        "raw mode left on: {after:?}"
    );
    assert!(
        out.contains("boom in render"),
        "panic message shown: {out:?}"
    );
    assert!(
        out.contains("\x1b[?1000l"),
        "mouse capture disabled: {out:?}"
    );
    assert!(
        out.contains("frame") && out.contains("one") && out.contains("\x1b[?25l"),
        "first frame drawn with hidden cursor: {out:?}"
    );
    let tail = &out[out.find("boom in render").unwrap()..];
    assert!(
        tail.contains("\x1b[?25h"),
        "cursor shown again after the panic: {out:?}"
    );
}

#[test]
fn decrypts_shipped_encrypt_json_fixture() {
    // Password found by trying the obvious candidates (README/test strings);
    // "test" decrypts it. Nothing documents it in the repo.
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(root.join("encrypt.json.encrypted")).unwrap();
    let plain = fsr::crypto::decrypt(text.trim(), "test").unwrap();
    assert_eq!(
        std::str::from_utf8(&plain).unwrap(),
        "{\n  \"test\": 52\n}\n"
    );
    assert!(
        fsr::crypto::decrypt(text.trim(), "fscripts")
            .map_or(true, |p| p.as_slice() != plain.as_slice())
    );
    // CLI path with FSR_SECRET (non-interactive).
    let d = tempfile::tempdir().unwrap();
    std::fs::copy(
        root.join("encrypt.json.encrypted"),
        d.path().join("encrypt.json.encrypted"),
    )
    .unwrap();
    let o = Command::new(env!("CARGO_BIN_EXE_fsr"))
        .args(["decrypt", "encrypt.json.encrypted", "-y"])
        .current_dir(d.path())
        .env("HOME", d.path())
        .env("FSR_SECRET", "test")
        .output()
        .unwrap();
    assert!(o.status.success(), "{}", String::from_utf8_lossy(&o.stderr));
    assert_eq!(
        std::fs::read_to_string(d.path().join("encrypt.json")).unwrap(),
        "{\n  \"test\": 52\n}\n"
    );
}

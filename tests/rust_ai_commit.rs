//! `fsr commit` against a mocked Anthropic Messages API.
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::path::Path;
use std::process::Command;

fn git(dir: &Path, args: &[&str]) -> String {
    let o = Command::new("git")
        .args(["-c", "user.email=t@t", "-c", "user.name=t"])
        .args(args)
        .current_dir(dir)
        .output()
        .unwrap();
    assert!(
        o.status.success(),
        "git {args:?}: {}",
        String::from_utf8_lossy(&o.stderr)
    );
    String::from_utf8_lossy(&o.stdout).to_string()
}

fn repo() -> tempfile::TempDir {
    let d = tempfile::tempdir().unwrap();
    git(d.path(), &["init", "-q", "-b", "feature/x"]);
    std::fs::write(d.path().join("a.rs"), "fn a() {}\n").unwrap();
    std::fs::write(
        d.path().join("CHANGELOG.md"),
        "# Changelog\n\n## [Unreleased]\n\n## [1.0.0]\n",
    )
    .unwrap();
    git(d.path(), &["add", "-A"]);
    git(d.path(), &["commit", "-q", "-m", "init"]);
    std::fs::write(d.path().join("a.rs"), "fn a() { println!(\"x\"); }\n").unwrap();
    std::fs::write(d.path().join("b.txt"), "notes\n").unwrap();
    d
}

/// One-shot HTTP server; returns (base_url, handle yielding (head, body)).
fn mock(
    response: serde_json::Value,
    status: u16,
) -> (String, std::thread::JoinHandle<(String, String)>) {
    let l = TcpListener::bind("127.0.0.1:0").unwrap();
    let url = format!("http://{}", l.local_addr().unwrap());
    let h = std::thread::spawn(move || {
        let (mut s, _) = l.accept().unwrap();
        let mut r = BufReader::new(s.try_clone().unwrap());
        let mut head = String::new();
        let mut len = 0;
        loop {
            let mut line = String::new();
            r.read_line(&mut line).unwrap();
            if let Some(v) = line.to_ascii_lowercase().strip_prefix("content-length:") {
                len = v.trim().parse().unwrap();
            }
            if line == "\r\n" {
                break;
            }
            head += &line;
        }
        let mut body = vec![0; len];
        r.read_exact(&mut body).unwrap();
        let out = response.to_string();
        write!(s, "HTTP/1.1 {status} X\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{out}", out.len()).unwrap();
        (head, String::from_utf8(body).unwrap())
    });
    (url, h)
}

fn fsr(dir: &Path, env: &[(&str, &str)]) -> (i32, String) {
    let mut c = Command::new(env!("CARGO_BIN_EXE_fsr"));
    c.args(["commit", "--yes"])
        .current_dir(dir)
        .env("HOME", dir)
        .env_remove("ANTHROPIC_API_KEY")
        .env_remove("ANTHROPIC_BASE_URL");
    c.env("GIT_AUTHOR_NAME", "t")
        .env("GIT_AUTHOR_EMAIL", "t@t")
        .env("GIT_COMMITTER_NAME", "t")
        .env("GIT_COMMITTER_EMAIL", "t@t");
    for (k, v) in env {
        c.env(k, v);
    }
    let o = c.output().unwrap();
    (
        o.status.code().unwrap_or(-1),
        String::from_utf8_lossy(&o.stdout).to_string() + &String::from_utf8_lossy(&o.stderr),
    )
}

#[test]
fn groups_commits_and_updates_changelog() {
    let d = repo();
    let (url, h) = mock(
        serde_json::json!({"content": [{"type": "text", "text": "ok"}, {"type": "tool_use", "name": "propose_commits", "input": {"commits": [
            {"message": "feat(a): print x", "files": ["a.rs"], "changelog": "Printed x."},
            {"message": "docs: add notes", "files": ["b.txt", "hallucinated.txt"], "changelog": null},
            {"message": "chore: ghost", "files": ["ghost.txt"], "changelog": "never"}
        ]}}]}),
        200,
    );
    let (code, out) = fsr(
        d.path(),
        &[
            ("ANTHROPIC_API_KEY", " sk-test "),
            ("ANTHROPIC_BASE_URL", &url),
        ],
    );
    assert_eq!(code, 0, "{out}");
    let (head, body) = h.join().unwrap();
    assert!(head.starts_with("POST /v1/messages "), "{head}");
    let lh = head.to_ascii_lowercase();
    assert!(
        lh.contains("x-api-key: sk-test\r\n") && lh.contains("anthropic-version: 2023-06-01"),
        "{head}"
    );
    let req: serde_json::Value = serde_json::from_str(&body).unwrap();
    assert_eq!(req["model"], "claude-opus-4-5");
    assert_eq!(
        req["tool_choice"],
        serde_json::json!({"type": "tool", "name": "propose_commits"})
    );
    let prompt = req["messages"][0]["content"].as_str().unwrap();
    assert!(
        prompt.contains("A  b.txt") && prompt.contains("println!"),
        "{prompt}"
    );
    assert!(
        out.contains("Proposed 2 commit(s)") && out.contains("CHANGELOG.md updated (1 entry)"),
        "{out}"
    );
    let log = git(d.path(), &["log", "--format=%s"]);
    assert_eq!(
        log,
        "chore: update CHANGELOG.md\ndocs: add notes\nfeat(a): print x\ninit\n"
    );
    assert_eq!(
        git(d.path(), &["show", "--name-only", "--format=", "HEAD~2"]).trim(),
        "a.rs"
    );
    let cl = std::fs::read_to_string(d.path().join("CHANGELOG.md")).unwrap();
    assert_eq!(
        cl,
        "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Printed x.\n\n## [1.0.0]\n"
    );
    assert!(git(d.path(), &["status", "--porcelain"]).is_empty());
}

#[test]
fn api_error_is_reported_and_nothing_committed() {
    let d = repo();
    let (url, h) = mock(
        serde_json::json!({"type": "error", "error": {"type": "authentication_error", "message": "invalid x-api-key"}}),
        401,
    );
    let (code, out) = fsr(
        d.path(),
        &[("ANTHROPIC_API_KEY", "bad"), ("ANTHROPIC_BASE_URL", &url)],
    );
    h.join().unwrap();
    assert_eq!(code, 0);
    assert!(
        out.contains("Claude analysis failed: 401 invalid x-api-key"),
        "{out}"
    );
    assert_eq!(git(d.path(), &["log", "--format=%s"]), "init\n");
}

#[test]
fn no_key_falls_back_to_manual_message() {
    let d = repo();
    let (code, out) = fsr(d.path(), &[("FSR_COMMIT_MESSAGE", "chore: manual")]);
    assert_eq!(code, 0, "{out}");
    assert!(out.contains("falling back to a manual commit"), "{out}");
    assert_eq!(
        git(d.path(), &["log", "--format=%s"]),
        "chore: manual\ninit\n"
    );
    assert!(git(d.path(), &["status", "--porcelain"]).is_empty());
}

//! `fsr self-update`: download the latest GitHub release binary for this
//! platform, verify its SHA-256, and replace the running executable in place.

use crate::builtins::log_success;
use crate::ui::log;
use anyhow::{Context, Result, bail};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::io::Write;
use std::path::Path;

const API_URL: &str = "https://api.github.com/repos/agrublev/freedcamp-script-runner/releases/latest";
const USER_AGENT: &str = "fsr-selfupdate";

/// Semver-ish triple parsed from a tag like "v7.7.3" (the `v` is optional).
fn parse_version(s: &str) -> Option<(u64, u64, u64)> {
    let mut it = s.trim().trim_start_matches('v').split('.');
    let a = it.next()?.parse().ok()?;
    let b = it.next()?.parse().ok()?;
    let c = it.next()?.parse().ok()?;
    Some((a, b, c))
}

fn os_arch() -> Option<(&'static str, &'static str)> {
    let os = match std::env::consts::OS {
        "linux" => "linux",
        "macos" => "macos",
        "windows" => "windows",
        _ => return None,
    };
    let arch = match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        _ => return None,
    };
    Some((os, arch))
}

fn asset_name(os: &str, arch: &str) -> (&'static str, String) {
    let (ext, file) = if os == "windows" {
        ("zip", format!("fsr-{os}-{arch}.zip"))
    } else {
        ("tar.gz", format!("fsr-{os}-{arch}.tar.gz"))
    };
    (ext, file)
}

/// Hex SHA-256 of a file, streamed so multi-MB binaries don't balloon memory.
fn sha256_file(path: &Path) -> Result<String> {
    let mut file = std::fs::File::open(path).with_context(|| format!("open {}", path.display()))?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher).context("hashing download")?;
    Ok(hex::encode(hasher.finalize()))
}

/// Blocking HTTP GET with a User-Agent (GitHub API rejects requests without one).
fn http(url: &str, timeout: u64) -> Result<reqwest::blocking::Response> {
    reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout))
        .build()?
        .get(url)
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/vnd.github+json")
        .send()
        .with_context(|| format!("GET {url}"))
}

/// Replace the currently running executable. On Unix a rename over the running
/// exe is atomic; on Windows the running exe must be renamed aside first.
fn replace_binary(new_bin: &Path, exe: &Path) -> Result<()> {
    if std::env::consts::OS == "windows" {
        let old = exe.with_extension("exe.old");
        let _ = std::fs::remove_file(&old);
        std::fs::rename(exe, &old)
            .with_context(|| format!("moving {} aside", exe.display()))?;
    }
    std::fs::rename(new_bin, exe)
        .with_context(|| format!("replacing {}", exe.display()))
}

/// Remove a leftover `.old` backup from a previous Windows update (best effort).
fn cleanup_old_backup(exe: &Path) {
    if std::env::consts::OS == "windows" {
        let _ = std::fs::remove_file(exe.with_extension("exe.old"));
    }
}

/// `fsr self-update` — returns a process exit code.
pub fn cmd_selfupdate(yes: bool) -> Result<i32> {
    let current = env!("CARGO_PKG_VERSION");

    // Clean up a previous Windows update backup (best effort).
    if let Ok(exe) = std::env::current_exe() {
        cleanup_old_backup(&exe);
    }

    let (os, arch) = match os_arch() {
        Some(v) => v,
        None => bail!(
            "unsupported platform {} / {} — install manually from GitHub Releases",
            std::env::consts::OS,
            std::env::consts::ARCH
        ),
    };

    log(&format!(
        "\x1b[36mChecking for updates (current v{current})...\x1b[39m"
    ));

    let resp = http(API_URL, 30)?;
    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        bail!("no GitHub release found yet — the first release has not been published");
    }
    let release: Value = resp.json().context("decoding GitHub release response")?;
    let latest = release["tag_name"]
        .as_str()
        .unwrap_or_default()
        .trim()
        .to_string();
    if latest.is_empty() {
        bail!("GitHub release response has no tag_name");
    }
    let (cur_v, latest_v) = match (parse_version(current), parse_version(&latest)) {
        (Some(a), Some(b)) => (a, b),
        _ => bail!("cannot compare versions: v{current} vs {latest}"),
    };
    if latest_v <= cur_v {
        log_success(&format!(
            "Already up to date (v{current}) — latest release is {latest}"
        ));
        return Ok(0);
    }
    log(&format!(
        "\x1b[33mNew version available: \x1b[1;33m{latest}\x1b[39m\x1b[33m (current v{current})\x1b[39m"
    ));

    let (ext, asset) = asset_name(os, arch);
    let checksum = format!("{asset}.sha256");
    let assets = release["assets"].as_array().cloned().unwrap_or_default();
    let find = |name: &str| -> Option<String> {
        assets
            .iter()
            .find(|a| a["name"].as_str() == Some(name))
            .and_then(|a| a["browser_download_url"].as_str().map(String::from))
    };
    let Some(bin_url) = find(&asset) else {
        bail!("release {latest} has no asset for this platform ({asset})");
    };
    let Some(sum_url) = find(&checksum) else {
        bail!("release {latest} has no checksum asset ({checksum})");
    };

    let tmp = tempfile::tempdir().context("creating temp dir")?;
    let archive = tmp.path().join(&asset);
    let out_dir = tmp.path().join("out");

    log(&format!("\x1b[36mDownloading {asset}...\x1b[39m"));
    {
        let mut resp = http(&bin_url, 600)?;
        if !resp.status().is_success() {
            bail!("download failed: {} {}", resp.status(), bin_url);
        }
        let mut file = std::fs::File::create(&archive).with_context(|| format!("create {}", archive.display()))?;
        resp.copy_to(&mut file)
            .with_context(|| format!("downloading {bin_url}"))?;
        file.flush().ok();
    }

    log(&format!("\x1b[36mVerifying SHA-256...\x1b[39m"));
    {
        let resp = http(&sum_url, 60)?;
        if !resp.status().is_success() {
            bail!("checksum download failed: {} {}", resp.status(), sum_url);
        }
        let want = resp
            .text()?
            .split_whitespace()
            .next()
            .unwrap_or_default()
            .to_lowercase();
        if want.is_empty() {
            bail!("checksum file is empty");
        }
        let got = sha256_file(&archive)?;
        if want != got {
            bail!("checksum mismatch (expected {want}, got {got})");
        }
    }

    std::fs::create_dir_all(&out_dir).context("creating extract dir")?;
    let status = std::process::Command::new("tar")
        .arg("-xf")
        .arg(&archive)
        .arg("-C")
        .arg(&out_dir)
        .status()
        .context("spawning tar")?;
    if !status.success() {
        bail!("extraction failed with code {}", crate::runner::exit_code(status));
    }
    let inner = if ext == "zip" { "fsr.exe" } else { "fsr" };
    // The archive nests the binary under an asset-named folder (e.g.
    // fsr-linux-x64/fsr); find it wherever it sits.
    let new_bin = walkdir::WalkDir::new(&out_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .find(|e| e.file_type().is_file() && e.file_name().to_string_lossy() == inner)
        .map(|e| e.into_path());
    let Some(new_bin) = new_bin else {
        bail!("archive did not contain the expected binary ({inner})");
    };

    let exe = std::env::current_exe().context("locating the running fsr binary")?;
    if !yes {
        let ok = dialoguer::Confirm::new()
            .with_prompt(format!("Replace {} with {latest}?", exe.display()))
            .default(true)
            .interact()?;
        if !ok {
            log("Update cancelled.");
            return Ok(0);
        }
    }

    replace_binary(&new_bin, &exe)?;
    log_success(&format!(
        "Updated fsr: v{current} → {latest} — restart fsr to use the new version"
    ));
    Ok(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_parsing() {
        assert_eq!(parse_version("7.7.3"), Some((7, 7, 3)));
        assert_eq!(parse_version("v7.7.3"), Some((7, 7, 3)));
        assert_eq!(parse_version("v0.0.1"), Some((0, 0, 1)));
        assert_eq!(parse_version("7.7"), None);
        assert_eq!(parse_version("abc"), None);
    }

    #[test]
    fn version_comparison() {
        assert!((7, 7, 3) > (7, 7, 2));
        assert!((7, 8, 0) > (7, 7, 99));
        assert!((7, 7, 2) == (7, 7, 2));
    }

    #[test]
    fn asset_naming() {
        let (ext, file) = asset_name("linux", "x64");
        assert_eq!(ext, "tar.gz");
        assert_eq!(file, "fsr-linux-x64.tar.gz");
        let (ext, file) = asset_name("macos", "arm64");
        assert_eq!(ext, "tar.gz");
        assert_eq!(file, "fsr-macos-arm64.tar.gz");
        let (ext, file) = asset_name("windows", "x64");
        assert_eq!(ext, "zip");
        assert_eq!(file, "fsr-windows-x64.zip");
        let (ext, file) = asset_name("windows", "arm64");
        assert_eq!(ext, "zip");
        assert_eq!(file, "fsr-windows-arm64.zip");
    }

    #[test]
    fn os_arch_mapping() {
        // This test binary runs on the host triple, so the mapping must resolve.
        assert!(os_arch().is_some());
    }
}

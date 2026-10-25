//! File helpers (port of the parts of `lib/utils/helpers.js` fsr relies on),
//! but crash-safe: writes go to a temp file in the same directory, are fsynced,
//! then atomically renamed over the target.

use anyhow::{Context, Result};
use std::io::Write;
use std::path::Path;

/// Atomically replace `path` with `contents` (creating parent dirs).
pub fn write_atomic(path: &Path, contents: &[u8]) -> Result<()> {
    let dir = match path.parent() {
        Some(p) if !p.as_os_str().is_empty() => p,
        _ => Path::new("."),
    };
    std::fs::create_dir_all(dir).with_context(|| format!("creating {}", dir.display()))?;
    let mut tmp = tempfile::NamedTempFile::new_in(dir)
        .with_context(|| format!("temp file in {}", dir.display()))?;
    // Preserve permissions of an existing target (e.g. 0600 secrets).
    if let Ok(meta) = std::fs::metadata(path) {
        let _ = std::fs::set_permissions(tmp.path(), meta.permissions());
    }
    tmp.write_all(contents)?;
    tmp.as_file().sync_all()?;
    tmp.persist(path)
        .map_err(|e| e.error)
        .with_context(|| format!("writing {}", path.display()))?;
    Ok(())
}

/// Append to a file, creating it if needed (port of `appendToFile`).
pub fn append(path: &Path, contents: &str) -> Result<()> {
    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .with_context(|| format!("opening {}", path.display()))?;
    f.write_all(contents.as_bytes())?;
    Ok(())
}

/// Read JSON (port of `readJson`).
pub fn read_json(path: &Path) -> Result<serde_json::Value> {
    let s = std::fs::read_to_string(path).with_context(|| format!("reading {}", path.display()))?;
    serde_json::from_str(&s).with_context(|| format!("parsing {}", path.display()))
}

/// Write pretty JSON atomically (2-space indent, trailing newline).
pub fn write_json(path: &Path, v: &serde_json::Value) -> Result<()> {
    let mut s = serde_json::to_string_pretty(v)?;
    s.push('\n');
    write_atomic(path, s.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_write_replaces_and_creates_dirs() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("a/b/c.txt");
        write_atomic(&p, b"one").unwrap();
        write_atomic(&p, b"two").unwrap();
        assert_eq!(std::fs::read(&p).unwrap(), b"two");
        assert_eq!(
            std::fs::read_dir(p.parent().unwrap()).unwrap().count(),
            1,
            "no temp files left"
        );
    }
    #[test]
    fn json_roundtrip_and_append() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("x.json");
        write_json(&p, &serde_json::json!({"a": 1})).unwrap();
        assert_eq!(read_json(&p).unwrap()["a"], 1);
        let g = d.path().join(".gitignore");
        append(&g, "a\n").unwrap();
        append(&g, "b\n").unwrap();
        assert_eq!(std::fs::read_to_string(g).unwrap(), "a\nb\n");
    }
}

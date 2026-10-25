//! Port of `lib/cache/cache.js` (`~/.fsr/cache.json`), with atomic writes so a
//! killed process can't leave a truncated cache (JS used fs.writeJson in place).
//! A corrupt cache file is reported as an error instead of crashing later.

use crate::fsutil;
use anyhow::{Result, bail};
use chrono::{DateTime, Datelike, Local, Timelike};
use serde_json::{Map, Value, json};
use std::path::{Path, PathBuf};

pub fn default_dir() -> PathBuf {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| ".".into())
        .join(".fsr")
}

fn ordinal(day: u32) -> &'static str {
    if (11..=13).contains(&(day % 100)) {
        return "th";
    }
    match day % 10 {
        1 => "st",
        2 => "nd",
        3 => "rd",
        _ => "th",
    }
}

/// `Oct 25th 2026-9:51PM` — same as JS `formatTimestamp`.
pub fn format_timestamp(d: DateTime<Local>) -> String {
    const M: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let (pm, h) = d.hour12();
    format!(
        "{} {}{} {}-{}:{:02}{}",
        M[d.month0() as usize],
        d.day(),
        ordinal(d.day()),
        d.year(),
        h,
        d.minute(),
        if pm { "PM" } else { "AM" }
    )
}

fn now() -> String {
    format_timestamp(Local::now())
}

fn normalize_entry(e: Option<&Value>) -> Map<String, Value> {
    let mut m = Map::new();
    match e {
        Some(Value::Object(o)) => {
            m.insert(
                "value".into(),
                o.get("value").cloned().unwrap_or(Value::Null),
            );
            m.insert(
                "updatedAt".into(),
                o.get("updatedAt")
                    .filter(|v| v.is_string())
                    .cloned()
                    .unwrap_or(Value::Null),
            );
            let log: Vec<Value> = o
                .get("changesLog")
                .and_then(|v| v.as_array())
                .map(|a| a.iter().filter(|v| v.is_string()).cloned().collect())
                .unwrap_or_default();
            m.insert("changesLog".into(), Value::Array(log));
        }
        other => {
            m.insert("value".into(), other.cloned().unwrap_or(Value::Null));
            m.insert("updatedAt".into(), Value::Null);
            m.insert("changesLog".into(), json!([]));
        }
    }
    m
}

fn normalize(raw: &Value) -> Value {
    let Value::Object(o) = raw else {
        return json!({"updatedAt": now(), "entries": {}});
    };
    let entries: Map<String, Value> = o
        .get("entries")
        .and_then(|e| e.as_object())
        .map(|e| {
            e.iter()
                .map(|(k, v)| (k.clone(), Value::Object(normalize_entry(Some(v)))))
                .collect()
        })
        .unwrap_or_default();
    json!({"updatedAt": o.get("updatedAt").filter(|v| v.is_string()).cloned().unwrap_or_else(|| now().into()), "entries": entries})
}

pub struct Cache {
    pub dir: PathBuf,
}

impl Cache {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self { dir: dir.into() }
    }
    pub fn file(&self) -> PathBuf {
        self.dir.join("cache.json")
    }
    fn ensure(&self) -> Result<PathBuf> {
        let f = self.file();
        if !f.exists() {
            fsutil::write_json(&f, &json!({"updatedAt": now(), "entries": {}}))?;
        }
        Ok(f)
    }
    pub fn read(&self) -> Result<Value> {
        Ok(normalize(&fsutil::read_json(&self.ensure()?)?))
    }
    fn write(&self, mut c: Value) -> Result<Value> {
        c = normalize(&c);
        c["updatedAt"] = now().into();
        fsutil::write_json(&self.file(), &c)?;
        Ok(c)
    }
    fn key(k: &str) -> Result<()> {
        if k.trim().is_empty() {
            bail!("Cache key must be a non-empty string.");
        }
        Ok(())
    }
    pub fn get(&self, k: &str) -> Result<Option<Value>> {
        Self::key(k)?;
        Ok(self.read()?["entries"].get(k).cloned())
    }
    /// writeCacheEntry: shallow-merges objects unless `replace`.
    pub fn set(&self, k: &str, value: Value, replace: bool) -> Result<Value> {
        Self::key(k)?;
        let mut c = self.read()?;
        let ts = now();
        let existing = normalize_entry(c["entries"].get(k));
        let next = match (&existing["value"], &value) {
            (Value::Object(a), Value::Object(b)) if !replace => {
                let mut m = a.clone();
                m.extend(b.clone());
                Value::Object(m)
            }
            _ => value,
        };
        let mut log = existing["changesLog"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        log.push(ts.clone().into());
        c["entries"][k] = json!({"value": next, "updatedAt": ts, "changesLog": log});
        Ok(self.write(c)?["entries"][k].clone())
    }
    pub fn delete(&self, k: &str) -> Result<bool> {
        Self::key(k)?;
        let mut c = self.read()?;
        let removed = c["entries"]
            .as_object_mut()
            .and_then(|m| m.remove(k))
            .is_some();
        if removed {
            self.write(c)?;
        }
        Ok(removed)
    }
    pub fn keys(&self) -> Result<Vec<String>> {
        Ok(self.read()?["entries"]
            .as_object()
            .map(|m| m.keys().cloned().collect())
            .unwrap_or_default())
    }
}

/// Total size of files directly in `dir` (doctor uses this).
pub fn dir_size(dir: &Path) -> u64 {
    std::fs::read_dir(dir)
        .map(|r| {
            r.filter_map(|e| e.ok()?.metadata().ok())
                .filter(|m| m.is_file())
                .map(|m| m.len())
                .sum()
        })
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    #[test]
    fn timestamp_format() {
        let d = Local.with_ymd_and_hms(2026, 10, 1, 0, 5, 0).unwrap();
        assert_eq!(format_timestamp(d), "Oct 1st 2026-12:05AM");
        let d = Local.with_ymd_and_hms(2026, 3, 12, 13, 0, 0).unwrap();
        assert_eq!(format_timestamp(d), "Mar 12th 2026-1:00PM");
        assert_eq!(ordinal(22), "nd");
        assert_eq!(ordinal(111), "th");
    }
    #[test]
    fn crud_merge_and_changelog() {
        let d = tempfile::tempdir().unwrap();
        let c = Cache::new(d.path().join(".fsr"));
        assert_eq!(c.get("k").unwrap(), None);
        c.set("k", json!({"a": 1}), false).unwrap();
        let e = c.set("k", json!({"b": 2}), false).unwrap();
        assert_eq!(e["value"], json!({"a": 1, "b": 2}));
        assert_eq!(e["changesLog"].as_array().unwrap().len(), 2);
        assert_eq!(
            c.set("k", json!({"c": 3}), true).unwrap()["value"],
            json!({"c": 3})
        );
        assert_eq!(c.keys().unwrap(), ["k"]);
        assert!(c.delete("k").unwrap());
        assert!(!c.delete("k").unwrap());
        assert!(c.set(" ", json!(1), false).is_err());
    }
    #[test]
    fn normalizes_legacy_and_rejects_corrupt() {
        let d = tempfile::tempdir().unwrap();
        let c = Cache::new(d.path());
        std::fs::write(c.file(), r#"{"entries":{"x":5}}"#).unwrap();
        assert_eq!(
            c.get("x").unwrap().unwrap(),
            json!({"value": 5, "updatedAt": null, "changesLog": []})
        );
        std::fs::write(c.file(), "{not json").unwrap();
        assert!(c.read().is_err());
    }
}

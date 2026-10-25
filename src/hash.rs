//! Port of `lib/utils/hash.js` (SHA-256 hex prefixes for cache keys).
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::Path;
use std::time::UNIX_EPOCH;

pub fn hash(input: &str, len: usize) -> String {
    let h = hex::encode(Sha256::digest(input.as_bytes()));
    h[..len.min(h.len())].to_string()
}

pub fn hash16(input: &str) -> String {
    hash(input, 16)
}

pub fn hash_multiple(inputs: &[&str]) -> String {
    hash16(&inputs.join(":"))
}

/// `JSON.stringify(obj, Object.keys(obj).sort())`: the sorted top-level keys act
/// as an allow-list (and order) at every nesting level, exactly like JS.
pub fn hash_object(obj: &serde_json::Map<String, Value>) -> String {
    let mut keys: Vec<&String> = obj.keys().collect();
    keys.sort();
    fn ser(v: &Value, keys: &[&String], out: &mut String) {
        match v {
            Value::Object(m) => {
                out.push('{');
                let mut first = true;
                for k in keys {
                    if let Some(x) = m.get(k.as_str()) {
                        if !first {
                            out.push(',');
                        }
                        first = false;
                        out.push_str(&serde_json::to_string(k).unwrap());
                        out.push(':');
                        ser(x, keys, out);
                    }
                }
                out.push('}');
            }
            Value::Array(a) => {
                out.push('[');
                for (i, x) in a.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    ser(x, keys, out);
                }
                out.push(']');
            }
            other => out.push_str(&other.to_string()),
        }
    }
    let mut s = String::new();
    ser(&Value::Object(obj.clone()), &keys, &mut s);
    hash16(&s)
}

pub fn generate_content_key(path: &str, content: &str) -> String {
    hash16(&format!("{path}:{}", hash16(content)))
}

/// mtime in ms as JS `stats.mtimeMs` (fractional), or None if missing.
pub fn mtime_ms(path: &Path) -> Option<f64> {
    let m = std::fs::metadata(path).ok()?.modified().ok()?;
    Some(m.duration_since(UNIX_EPOCH).ok()?.as_secs_f64() * 1000.0)
}

pub fn has_file_changed(path: &Path, cached_mtime: f64) -> bool {
    mtime_ms(path).is_none_or(|m| m != cached_mtime)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sha256_prefixes() {
        assert_eq!(hash16("abc"), "ba7816bf8f01cfea");
        assert_eq!(hash("abc", 64).len(), 64);
        assert_eq!(hash_multiple(&["a", "b"]), hash16("a:b"));
        assert_eq!(
            generate_content_key("f", "c"),
            hash16(&format!("f:{}", hash16("c")))
        );
    }
    #[test]
    fn hash_object_is_key_order_independent() {
        let a: serde_json::Map<_, _> =
            serde_json::from_str(r#"{"b":1,"a":{"a":2,"z":3}}"#).unwrap();
        let b: serde_json::Map<_, _> =
            serde_json::from_str(r#"{"a":{"z":3,"a":2},"b":1}"#).unwrap();
        assert_eq!(hash_object(&a), hash_object(&b));
        // nested "z" is dropped by the JS allow-list replacer
        assert_eq!(hash_object(&a), hash16(r#"{"a":{"a":2},"b":1}"#));
    }
    #[test]
    fn file_changed() {
        let d = tempfile::tempdir().unwrap();
        let p = d.path().join("f");
        assert!(has_file_changed(&p, 0.0));
        std::fs::write(&p, "x").unwrap();
        let m = mtime_ms(&p).unwrap();
        assert!(!has_file_changed(&p, m));
    }
}

//! Golden tests: `tests/rust_fixtures/*.parsed.json` and `*.toc.md` were
//! produced by the JS implementation (lib/parsers/parse.js with marked 18,
//! lib/generators/generateToc.js with markdown-toc 1.2.0) from the copied
//! `.md` inputs (lib/test-files/*, fscripts.md, examples/, Readme.md).
use serde_json::{Value, json};
use std::path::Path;

const KNOWN_TOC_DIVERGENCE: &[&str] = &[
    // markdown-toc's Remarkable parser mis-detects headings inside nested
    // ```markdown fences in Readme.md; pulldown-cmark follows CommonMark.
    "Readme.md",
];

fn inputs() -> Vec<std::path::PathBuf> {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/rust_fixtures");
    let mut v: Vec<_> = std::fs::read_dir(dir)
        .unwrap()
        .map(|e| e.unwrap().path())
        .filter(|p| {
            let n = p.file_name().unwrap().to_string_lossy();
            n.ends_with(".md") && !n.ends_with(".toc.md") && !n.ends_with(".parsed.md")
        })
        .collect();
    v.sort();
    assert!(v.len() >= 5);
    v
}

fn to_json(p: &fsr::parse::Parsed) -> Value {
    json!({
        "categories": p.categories.iter().map(|c| json!({"name": c.name, "description": c.description, "tasks": c.tasks.iter().map(|t| t.name.clone()).collect::<Vec<_>>()})).collect::<Vec<_>>(),
        "allTasks": p.all_tasks.iter().map(|t| json!({"name": t.name, "description": t.description, "script": t.script, "lang": t.lang, "order": t.order, "env": t.env, "category": t.category})).collect::<Vec<_>>(),
    })
}

#[test]
fn parser_matches_js_on_all_fixtures() {
    for f in inputs() {
        let data = std::fs::read_to_string(&f).unwrap();
        let expected: Value = serde_json::from_str(
            &std::fs::read_to_string(f.with_extension("parsed.json")).unwrap(),
        )
        .unwrap();
        let got = to_json(&fsr::parse::parse(fsr::parse::strip_toc(&data)));
        assert_eq!(got, expected, "parser mismatch for {}", f.display());
    }
}

#[test]
fn toc_matches_js_on_fixtures() {
    for f in inputs() {
        let name = f
            .file_name()
            .unwrap()
            .to_string_lossy()
            .trim_end_matches(".md")
            .to_string();
        let data = std::fs::read_to_string(&f).unwrap();
        let expected = std::fs::read_to_string(f.with_extension("toc.md")).unwrap();
        let got = fsr::toc::with_toc(&data);
        if KNOWN_TOC_DIVERGENCE.contains(&name.as_str()) {
            continue;
        }
        assert_eq!(got, expected, "toc mismatch for {}", f.display());
    }
}

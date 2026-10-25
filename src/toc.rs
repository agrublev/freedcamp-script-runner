//! Port of `lib/generators/generateToc.js` (markdown-toc with fsr's slugify)
//! and `lib/generators/generateFScripts.js`.

use crate::fsutil;
use anyhow::{Context, Result};
use pulldown_cmark::{Event, Parser, Tag};
use std::path::Path;

fn get_title(s: &str) -> &str {
    // /^\[[^\]]+\]\(/ → link text
    if let Some(rest) = s.strip_prefix('[')
        && let Some(end) = rest.find(']')
        && end > 0
        && rest[end + 1..].starts_with('(')
    {
        return &rest[..end];
    }
    s
}

fn strip_tags(s: &str) -> String {
    let mut out = String::new();
    let mut rest = s;
    while let Some(i) = rest.find('<') {
        let after = &rest[i + 1..];
        let body = after.strip_prefix('/').unwrap_or(after);
        match body.find('>') {
            Some(j) if j > 0 && !body[..j].contains('>') => {
                out.push_str(&rest[..i]);
                rest = &body[j + 1..];
            }
            _ => {
                out.push_str(&rest[..=i]);
                rest = after;
            }
        }
    }
    out.push_str(rest);
    out
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::new();
    let mut it = s.chars().peekable();
    while let Some(c) = it.next() {
        if c == '\x1b' {
            while matches!(it.peek(), Some('[' | '(' | '?' | ')' | ';')) {
                it.next();
            }
            while matches!(it.peek(), Some(';' | '0'..='9')) {
                it.next();
            }
            it.next();
        } else {
            out.push(c);
        }
    }
    out
}

/// Exactly the `slugify` in `lib/generators/generateToc.js`.
pub fn slugify(s: &str, num: usize) -> String {
    let s = strip_ansi(get_title(s))
        .to_lowercase()
        .replace(' ', "-")
        .replace('\t', "--");
    let s = strip_tags(&s);
    let mut s: String = s
        .chars()
        .filter(|c| !"|$&`~=\\/@+*!?({[]})<>.,;:'\"^".contains(*c))
        .filter(|c| !"。？！，、；：“”【】（）〔〕［］﹃﹄‘’﹁﹂—…－～《》〈〉「」".contains(*c))
        .collect();
    if num > 0 {
        s.push_str(&format!("-{num}"));
    }
    s
}

/// Node's `querystring.escape` (== encodeURIComponent).
fn qs_escape(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

fn titleize(s: &str) -> String {
    strip_tags(get_title(s))
        .split([' ', '\t'])
        .filter(|x| !x.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

/// Headings (level, raw inline text) outside code blocks.
fn headings(md: &str) -> Vec<(usize, String)> {
    let mut out = Vec::new();
    for (ev, r) in Parser::new(md).into_offset_iter() {
        if let Event::Start(Tag::Heading { level, .. }) = ev {
            let raw = md[r].lines().next().unwrap_or("").trim();
            let text = if raw.starts_with('#') {
                let t = raw.trim_start_matches('#').trim();
                let u = t.trim_end_matches('#');
                if u.len() != t.len() && (u.is_empty() || u.ends_with(' ')) {
                    u.trim()
                } else {
                    t
                }
            } else {
                raw
            };
            out.push((level as usize, text.to_string()));
        }
    }
    out
}

/// The TOC list markdown-toc would produce (`toc(md, {slugify}).content`).
pub fn toc(md: &str) -> String {
    let hs = headings(md);
    let highest = hs.iter().map(|h| h.0).min().unwrap_or(0);
    let mut seen: std::collections::HashMap<String, usize> = Default::default();
    let chars = ['-', '*', '+'];
    hs.iter()
        .map(|(lvl, text)| {
            let key = get_title(text).to_string();
            let n = seen.entry(key).and_modify(|n| *n += 1).or_insert(0);
            let l = lvl - highest;
            format!(
                "{}{} [{}](#{})",
                "  ".repeat(l),
                chars[l % 3],
                titleize(text),
                qs_escape(&slugify(text, *n))
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// New file content with a regenerated TOC (generateToc.js semantics).
pub fn with_toc(data: &str) -> String {
    let md = crate::parse::strip_toc(data);
    let t = if data.is_empty() {
        String::new()
    } else {
        toc(md)
    };
    format!("{t}\n<!-- end toc -->\n\n{}", md.trim())
}

/// `fsr toc [file]`. Returns false when the file is missing (JS exits 0 too).
pub fn cmd_toc(file: &Path) -> Result<bool> {
    if !file.exists() {
        eprintln!(
            "\x1b[1;31mFile not found!\x1b[0m {} (run 'fsr generate' to create fscripts.md)",
            file.display()
        );
        return Ok(false);
    }
    let data =
        std::fs::read_to_string(file).with_context(|| format!("reading {}", file.display()))?;
    fsutil::write_atomic(file, with_toc(&data).as_bytes())?;
    eprintln!("Updated table of contents in {}", file.display());
    Ok(true)
}

/// package.json scripts, in file order (port of `parseScriptsPackage.js`).
pub fn package_scripts(root: &Path) -> Result<Vec<(String, String)>> {
    let pkg = fsutil::read_json(&root.join("package.json"))?;
    Ok(pkg["scripts"]
        .as_object()
        .map(|m| {
            m.iter()
                .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
                .collect()
        })
        .unwrap_or_default())
}

/// fscripts.md content generated from package.json scripts (generateFScripts.js).
pub fn generate_fscripts(scripts: &[(String, String)]) -> String {
    let mut md = String::from(
        "# First category of scripts\n\nWelcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.\n",
    );
    for (name, cmd) in scripts {
        md.push_str(&format!("\n## {name}\n\n{cmd}\n\n```bash\n{cmd}\n```\n\n"));
    }
    md
}

pub fn cmd_generate(root: &Path, yes: bool) -> Result<()> {
    let target = root.join("fscripts.md");
    if target.exists()
        && !yes
        && !dialoguer::Confirm::new()
            .with_prompt("fscripts.md already exists. Do you want to overwrite it?")
            .default(false)
            .interact()?
    {
        eprintln!("Generation cancelled.");
        return Ok(());
    }
    fsutil::write_atomic(
        &target,
        generate_fscripts(&package_scripts(root)?).as_bytes(),
    )?;
    eprintln!("fscripts.md generated successfully!");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn slug_rules() {
        assert_eq!(slugify("fun:console", 0), "funconsole");
        assert_eq!(slugify("using `--env`", 0), "using---env");
        assert_eq!(slugify("push", 1), "push-1");
        assert_eq!(qs_escape(&slugify("⚡ fsr", 0)), "%E2%9A%A1-fsr");
    }
    #[test]
    fn generate_matches_js_template() {
        let md = generate_fscripts(&[("build".into(), "tsc".into())]);
        assert!(md.ends_with("\n## build\n\ntsc\n\n```bash\ntsc\n```\n\n"));
        let p = crate::parse::parse(&md);
        assert_eq!(p.all_tasks[0].script, "tsc");
        assert_eq!(p.all_tasks[0].description, "tsc");
    }
}

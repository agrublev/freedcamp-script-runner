//! Port of `lib/parsers/parse.js` and `lib/parsers/parseScriptsMd.js`.
//!
//! `#` headings are categories, `##` headings are tasks. The paragraph and the
//! code block following a task heading become its description and script.
//! `## [env:name]` starts an environment profile section within a category.

use pulldown_cmark::{CodeBlockKind, Event, HeadingLevel, Parser, Tag, TagEnd};
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Task {
    pub name: String,
    pub description: String,
    pub script: String,
    pub lang: Option<String>,
    pub order: usize,
    pub env: Option<String>,
    pub category: String,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Category {
    pub name: String,
    pub description: String,
    /// Insertion-ordered (name, task); same name → last definition wins (as in JS).
    pub tasks: Vec<Task>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct Parsed {
    pub categories: Vec<Category>,
    pub all_tasks: Vec<Task>,
}

#[derive(Debug, Clone, PartialEq)]
enum Block {
    Heading(u8, String),
    Paragraph(String),
    Code(Option<String>, String),
    Other,
}

fn level(l: HeadingLevel) -> u8 {
    l as u8
}

/// Top-level blocks, mirroring `marked.lexer(...).filter(t => t.type !== "space")`.
fn blocks(md: &str) -> Vec<Block> {
    let mut out = Vec::new();
    let mut depth = 0usize;
    let mut code: Option<(Option<String>, String)> = None;
    for (ev, range) in Parser::new(md).into_offset_iter() {
        match ev {
            Event::Start(tag) => {
                if depth == 0 {
                    match &tag {
                        Tag::Heading { level: l, .. } => {
                            let raw = &md[range.clone()];
                            out.push(Block::Heading(level(*l), heading_text(raw)));
                        }
                        Tag::Paragraph => {
                            out.push(Block::Paragraph(md[range.clone()].trim().to_string()))
                        }
                        Tag::CodeBlock(kind) => {
                            let lang = match kind {
                                CodeBlockKind::Fenced(info) => {
                                    let t = info.trim();
                                    (!t.is_empty()).then(|| t.to_string())
                                }
                                CodeBlockKind::Indented => None,
                            };
                            code = Some((lang, String::new()));
                        }
                        _ => out.push(Block::Other),
                    }
                }
                depth += 1;
            }
            Event::End(end) => {
                depth -= 1;
                if depth == 0
                    && matches!(end, TagEnd::CodeBlock)
                    && let Some((lang, mut text)) = code.take()
                {
                    if text.ends_with('\n') {
                        text.pop();
                    }
                    out.push(Block::Code(lang, text));
                }
            }
            Event::Text(t) if depth == 1 => {
                if let Some((_, buf)) = code.as_mut() {
                    buf.push_str(&t);
                }
            }
            Event::Html(_) | Event::Rule if depth == 0 => out.push(Block::Other),
            _ => {}
        }
    }
    out
}

fn heading_text(raw: &str) -> String {
    let line = raw.lines().next().unwrap_or("").trim();
    let line = line.trim_start_matches('#').trim();
    // strip optional closing #'s (ATX)
    let stripped = line.trim_end_matches('#');
    if stripped.len() != line.len() && (stripped.is_empty() || stripped.ends_with(' ')) {
        stripped.trim().to_string()
    } else {
        line.to_string()
    }
}

fn env_section(text: &str) -> Option<&str> {
    text.strip_prefix("[env:")?
        .strip_suffix(']')
        .filter(|n| !n.is_empty() && !n.contains(']'))
}

/// Parse fscripts.md content (TOC already stripped).
pub fn parse(md: &str) -> Parsed {
    let toks = blocks(md);
    let mut cats: Vec<Category> = Vec::new();
    let mut all = Vec::new();
    let mut current = String::new();
    let mut order = 0;
    let mut env: Option<String> = None;

    fn ensure<'a>(cats: &'a mut Vec<Category>, name: &str) -> &'a mut Category {
        if let Some(i) = cats.iter().position(|c| c.name == name) {
            return &mut cats[i];
        }
        cats.push(Category {
            name: name.into(),
            ..Default::default()
        });
        cats.last_mut().unwrap()
    }

    for (i, b) in toks.iter().enumerate() {
        match b {
            Block::Heading(1, text) => {
                order = 0;
                env = None;
                current = text.clone();
                let c = ensure(&mut cats, &current);
                if let Some(Block::Paragraph(p)) = toks.get(i + 1) {
                    c.description = p.clone();
                }
            }
            Block::Heading(2, text) => {
                if let Some(e) = env_section(text) {
                    env = Some(e.to_string());
                    continue;
                }
                let mut t = Task {
                    name: text.clone(),
                    order,
                    env: env.clone(),
                    category: current.clone(),
                    ..Default::default()
                };
                order += 1;
                match (toks.get(i + 1), toks.get(i + 2)) {
                    (Some(Block::Paragraph(p)), Some(Block::Code(lang, code))) => {
                        t.description = p.clone();
                        t.lang = lang.clone();
                        t.script = code.clone();
                    }
                    (Some(Block::Code(lang, code)), _) => {
                        t.lang = lang.clone();
                        t.script = code.clone();
                    }
                    _ => {}
                }
                all.push(t.clone());
                let c = ensure(&mut cats, &current);
                if let Some(existing) = c.tasks.iter_mut().find(|x| x.name == t.name) {
                    *existing = t;
                } else {
                    c.tasks.push(t);
                }
            }
            _ => {}
        }
    }
    Parsed {
        categories: cats,
        all_tasks: all,
    }
}

/// Port of `filterByEnv`: keep only tasks of the given profile; drop empty categories.
pub fn filter_by_env(parsed: &Parsed, env: &str) -> Parsed {
    let all: Vec<Task> = parsed
        .all_tasks
        .iter()
        .filter(|t| t.env.as_deref() == Some(env))
        .cloned()
        .collect();
    let categories = parsed
        .categories
        .iter()
        .filter_map(|c| {
            let mut tasks: Vec<Task> = Vec::new();
            for t in all.iter().filter(|t| t.category == c.name) {
                if let Some(e) = tasks.iter_mut().find(|x| x.name == t.name) {
                    *e = t.clone();
                } else {
                    tasks.push(t.clone());
                }
            }
            (!tasks.is_empty()).then(|| Category { tasks, ..c.clone() })
        })
        .collect();
    Parsed {
        categories,
        all_tasks: all,
    }
}

/// Strip a generated TOC (everything up to `<!-- end toc -->`), as JS does.
pub fn strip_toc(data: &str) -> &str {
    let parts: Vec<&str> = data.split("<!-- end toc -->").collect();
    if parts.len() == 2 { parts[1] } else { parts[0] }
}

/// Port of `parseScriptFile`: read `<dir>/fscripts.md`. `Ok(None)` when missing.
pub fn parse_script_file(dir: &Path, env: Option<&str>) -> std::io::Result<Option<Parsed>> {
    let p = dir.join("fscripts.md");
    if !p.exists() {
        return Ok(None);
    }
    let data = std::fs::read_to_string(p)?;
    if data.is_empty() {
        return Ok(Some(Parsed::default()));
    }
    let parsed = parse(strip_toc(&data));
    Ok(Some(match env {
        Some(e) => filter_by_env(&parsed, e),
        None => parsed,
    }))
}

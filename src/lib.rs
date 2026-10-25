use pulldown_cmark::{CodeBlockKind, Event, HeadingLevel, Options, Parser, Tag, TagEnd};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::process::{Command, ExitStatus};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Task {
    pub name: String,
    pub description: String,
    pub script: String,
    pub lang: Option<String>,
    pub order: usize,
    pub env: Option<String>,
    pub category: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Category {
    pub name: String,
    pub description: String,
    pub tasks: Vec<Task>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ScriptFile {
    pub categories: Vec<Category>,
    pub all_tasks: Vec<Task>,
}

#[derive(Clone, Debug)]
enum Block {
    Heading(u32, String),
    Paragraph(String),
    Code(String, String),
}

/// Parse fscripts.md's level-one categories, level-two tasks, and fenced commands.
pub fn parse_markdown(markdown: &str) -> ScriptFile {
    let sections = markdown.split("<!-- end toc -->").collect::<Vec<_>>();
    let content = if sections.len() == 2 {
        sections[1]
    } else {
        sections[0]
    };
    let mut blocks = Vec::new();
    let mut current: Option<Block> = None;

    for event in Parser::new_ext(content, Options::all()) {
        match event {
            Event::Start(Tag::Heading { level, .. }) => {
                current = Some(Block::Heading(heading_num(level), String::new()));
            }
            Event::End(TagEnd::Heading(_)) => push_block(&mut blocks, current.take()),
            Event::Start(Tag::Paragraph) => current = Some(Block::Paragraph(String::new())),
            Event::End(TagEnd::Paragraph) => push_block(&mut blocks, current.take()),
            Event::Start(Tag::CodeBlock(kind)) => {
                let language = match kind {
                    CodeBlockKind::Fenced(info) => {
                        info.split_whitespace().next().unwrap_or("").to_string()
                    }
                    CodeBlockKind::Indented => String::new(),
                };
                current = Some(Block::Code(language, String::new()));
            }
            Event::End(TagEnd::CodeBlock) => push_block(&mut blocks, current.take()),
            Event::Text(text) | Event::Code(text) => append_text(&mut current, &text),
            Event::SoftBreak | Event::HardBreak => append_text(&mut current, "\n"),
            _ => {}
        }
    }
    push_block(&mut blocks, current.take());

    let mut result = ScriptFile::default();
    let mut category_name = String::new();
    let mut category_description = String::new();
    let mut current_env: Option<String> = None;
    let mut order = 0usize;

    for (index, block) in blocks.iter().enumerate() {
        match block {
            Block::Heading(1, name) => {
                category_name = name.trim().to_owned();
                category_description = match blocks.get(index + 1) {
                    Some(Block::Paragraph(text)) => text.trim().to_owned(),
                    _ => String::new(),
                };
                current_env = None;
                order = 0;
                result.categories.push(Category {
                    name: category_name.clone(),
                    description: category_description.clone(),
                    tasks: Vec::new(),
                });
            }
            Block::Heading(2, name) => {
                let heading = name.trim();
                if let Some(env) = heading
                    .strip_prefix("[env:")
                    .and_then(|s| s.strip_suffix(']'))
                {
                    current_env = Some(env.to_owned());
                    continue;
                }
                if result.categories.is_empty() {
                    result.categories.push(Category {
                        name: category_name.clone(),
                        description: category_description.clone(),
                        tasks: Vec::new(),
                    });
                }
                let (description, lang, script) =
                    match (blocks.get(index + 1), blocks.get(index + 2)) {
                        (Some(Block::Paragraph(desc)), Some(Block::Code(lang, script))) => {
                            (desc.trim().to_owned(), Some(lang.clone()), script.clone())
                        }
                        (Some(Block::Code(lang, script)), _) => {
                            (String::new(), Some(lang.clone()), script.clone())
                        }
                        _ => (String::new(), None, String::new()),
                    };
                let task = Task {
                    name: heading.to_owned(),
                    description,
                    script,
                    lang,
                    order,
                    env: current_env.clone(),
                    category: category_name.clone(),
                };
                order += 1;
                let category = result.categories.last_mut().unwrap();
                if let Some(existing) = category
                    .tasks
                    .iter_mut()
                    .find(|existing| existing.name == task.name)
                {
                    *existing = task.clone();
                } else {
                    category.tasks.push(task.clone());
                }
                result.all_tasks.push(task);
            }
            _ => {}
        }
    }
    result
}

fn heading_num(level: HeadingLevel) -> u32 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

fn push_block(blocks: &mut Vec<Block>, block: Option<Block>) {
    if let Some(block) = block {
        blocks.push(block);
    }
}

fn append_text(block: &mut Option<Block>, text: &str) {
    match block {
        Some(Block::Heading(_, value))
        | Some(Block::Paragraph(value))
        | Some(Block::Code(_, value)) => value.push_str(text),
        None => {}
    }
}

impl ScriptFile {
    pub fn read(path: &Path) -> Result<Self, String> {
        let contents = fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
        Ok(parse_markdown(&contents))
    }

    pub fn for_env(&self, env: &str) -> Self {
        let all_tasks: Vec<_> = self
            .all_tasks
            .iter()
            .filter(|task| task.env.as_deref() == Some(env))
            .cloned()
            .collect();
        let mut grouped: BTreeMap<&str, Vec<Task>> = BTreeMap::new();
        for task in &all_tasks {
            let category_tasks = grouped.entry(&task.category).or_default();
            if let Some(existing) = category_tasks
                .iter_mut()
                .find(|existing| existing.name == task.name)
            {
                *existing = task.clone();
            } else {
                category_tasks.push(task.clone());
            }
        }
        let categories = self
            .categories
            .iter()
            .filter_map(|category| {
                grouped
                    .remove(category.name.as_str())
                    .map(|tasks| Category {
                        name: category.name.clone(),
                        description: category.description.clone(),
                        tasks,
                    })
            })
            .collect();
        Self {
            categories,
            all_tasks,
        }
    }

    pub fn find_task(&self, name: &str) -> Option<&Task> {
        self.all_tasks.iter().rev().find(|task| task.name == name)
    }
}

/// Execute a task and return its process status. JavaScript blocks run with Node.
pub fn run_task(task: &Task, profile: Option<&str>, quiet: bool) -> Result<ExitStatus, String> {
    let mut env = BTreeMap::new();
    if let Some(profile) = profile.or(task.env.as_deref()) {
        env.insert("NODE_ENV".to_owned(), profile.to_owned());
        env.insert("FSR_ENV".to_owned(), profile.to_owned());
    }

    if task.lang.as_deref() == Some("javascript") || task.lang.as_deref() == Some("js") {
        let mut command = Command::new("node");
        command.args(["--input-type=module", "-e", &task.script]);
        for (key, value) in env {
            command.env(key, value);
        }
        return command
            .status()
            .map_err(|e| format!("could not start node: {e}"));
    }

    let mut words = task.script.split_whitespace().peekable();
    let mut command_env = env;
    while let Some(word) = words.peek().copied() {
        let Some((key, value)) = word.split_once('=') else {
            break;
        };
        if key.is_empty() {
            break;
        }
        command_env.insert(key.to_owned(), value.to_owned());
        words.next();
    }
    let command = words.collect::<Vec<_>>().join(" ");
    if command.is_empty() {
        return Err(format!("task '{}' has no command", task.name));
    }

    if !quiet {
        println!("{}: {}", task.name, command);
    }
    let mut child = Command::new("sh");
    child.args(["-c", &command]);
    for (key, value) in command_env {
        child.env(key, value);
    }
    child
        .status()
        .map_err(|e| format!("could not start task '{}': {e}", task.name))
}

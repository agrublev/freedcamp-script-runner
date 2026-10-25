use super::helpers::{git_output, read_json, run_command};
use crate::{ScriptFile, Task, run_task};
use dialoguer::{Confirm, Input, Select};
use serde_json::Value;
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};
use walkdir::WalkDir;

pub fn interactive(script: &ScriptFile, profile: Option<&str>) -> ExitCode {
    if script.all_tasks.is_empty() {
        eprintln!("No tasks found in fscripts.md");
        return ExitCode::FAILURE;
    }
    let labels: Vec<String> = script.categories.iter().map(|c| c.name.clone()).collect();
    let category_index = match Select::new()
        .with_prompt("Choose a category")
        .items(&labels)
        .default(0)
        .interact_opt()
    {
        Ok(Some(index)) => index,
        Ok(None) => return ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            return ExitCode::FAILURE;
        }
    };
    let category = &script.categories[category_index];
    let task_labels: Vec<String> = category.tasks.iter().map(|t| task_label(t)).collect();
    match Select::new()
        .with_prompt(&category.name)
        .items(&task_labels)
        .default(0)
        .interact_opt()
    {
        Ok(Some(index)) => run_one(script, &category.tasks[index].name, profile),
        Ok(None) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

pub fn list_package_scripts() -> Result<(), String> {
    let package = read_json(Path::new("package.json"))?;
    let scripts = package
        .get("scripts")
        .and_then(Value::as_object)
        .ok_or("package.json has no scripts object")?;
    if scripts.is_empty() {
        println!("No package scripts found.");
        return Ok(());
    }
    let items: Vec<_> = scripts
        .iter()
        .map(|(name, command)| (name.clone(), command.as_str().unwrap_or("").to_owned()))
        .collect();
    let labels: Vec<_> = items
        .iter()
        .map(|(name, command)| format!("{name}  —  {command}"))
        .collect();
    if let Some(index) = Select::new()
        .with_prompt("Choose a package script")
        .items(&labels)
        .interact_opt()
        .map_err(|e| e.to_string())?
    {
        println!("Running {}", items[index].0);
        let status = Command::new("npm")
            .args(["run", &items[index].0])
            .status()
            .map_err(|e| e.to_string())?;
        if !status.success() {
            return Err(format!("package script exited with {status}"));
        }
    }
    Ok(())
}

pub fn generate_scripts(force: bool) -> Result<(), String> {
    let target = Path::new("fscripts.md");
    if target.exists()
        && !force
        && !Confirm::new()
            .with_prompt("fscripts.md exists. Overwrite it?")
            .default(false)
            .interact()
            .map_err(|e| e.to_string())?
    {
        println!("Generation cancelled.");
        return Ok(());
    }
    let package = read_json(Path::new("package.json"))?;
    let scripts = package
        .get("scripts")
        .and_then(Value::as_object)
        .ok_or("package.json has no scripts object")?;
    let mut output = String::from(
        "# First category of scripts\n\nWelcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.\n",
    );
    for (name, command) in scripts {
        let command = command.as_str().unwrap_or("");
        output.push_str(&format!(
            "\n## {name}\n\n{command}\n\n```bash\n{command}\n```\n"
        ));
    }
    fs::write(target, output).map_err(|e| e.to_string())?;
    println!("fscripts.md generated successfully!");
    Ok(())
}

pub fn generate_toc(path: &Path) -> Result<(), String> {
    let data = fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    let sections: Vec<_> = data.split("<!-- end toc -->").collect();
    let body = if sections.len() == 2 {
        sections[1]
    } else {
        sections[0]
    };
    let toc = make_toc(body);
    let output = format!("{toc}\n<!-- end toc -->\n\n{}", body.trim());
    fs::write(path, output).map_err(|e| e.to_string())?;
    println!("Updated table of contents in {}", path.display());
    Ok(())
}

pub fn choose_markdown_file() -> Result<(), String> {
    let files: Vec<PathBuf> = WalkDir::new(".")
        .max_depth(5)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.file_type().is_file() && entry.path().extension().is_some_and(|ext| ext == "md")
        })
        .map(|entry| entry.into_path())
        .collect();
    let labels: Vec<String> = files
        .iter()
        .map(|path| path.display().to_string())
        .collect();
    let Some(index) = Select::new()
        .with_prompt("Choose a Markdown file")
        .items(&labels)
        .interact_opt()
        .map_err(|e| e.to_string())?
    else {
        return Ok(());
    };
    generate_toc(&files[index])
}

fn make_toc(markdown: &str) -> String {
    let mut lines = Vec::new();
    let mut slug_counts: HashMap<String, usize> = HashMap::new();
    for line in markdown.lines() {
        let trimmed = line.trim_start();
        let level = trimmed.chars().take_while(|c| *c == '#').count();
        if !(1..=6).contains(&level) || !trimmed[level..].starts_with(' ') {
            continue;
        }
        let title = trimmed[level..].trim().trim_end_matches('#').trim();
        if title.is_empty() {
            continue;
        }
        let base = slugify(title);
        let count = slug_counts.entry(base.clone()).or_default();
        let slug = if *count == 0 {
            base
        } else {
            format!("{base}-{}", *count)
        };
        *count += 1;
        lines.push(format!("{}- [{title}](#{slug})", "  ".repeat(level - 1)));
    }
    lines.join("\n")
}

fn slugify(title: &str) -> String {
    let mut out = String::new();
    let mut dash = false;
    for ch in title.to_lowercase().chars() {
        if ch.is_alphanumeric() || ch == '_' || ch == '-' {
            if dash && !out.is_empty() {
                out.push('-');
            }
            dash = false;
            out.push(ch);
        } else if ch.is_whitespace() {
            dash = true;
        }
    }
    out
}

pub fn clear_recent() -> Result<(), String> {
    let path = recent_path();
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    println!("Recent task history cleared.");
    Ok(())
}

pub fn choose_task(script: &ScriptFile, profile: Option<&str>) -> ExitCode {
    let tasks: Vec<_> = script.all_tasks.iter().collect();
    let labels: Vec<_> = tasks.iter().map(|task| task_label(task)).collect();
    match Select::new()
        .with_prompt("Choose a task to run")
        .items(&labels)
        .interact_opt()
    {
        Ok(Some(index)) => {
            let task = tasks[index];
            remember_task(&task.name);
            run_task(task, profile, false)
                .map(status_code)
                .unwrap_or_else(|error| {
                    eprintln!("{error}");
                    ExitCode::FAILURE
                })
        }
        Ok(None) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

pub fn run_one(script: &ScriptFile, name: &str, profile: Option<&str>) -> ExitCode {
    match script.find_task(name) {
        Some(task) => {
            remember_task(name);
            run_task(task, profile, false)
                .map(status_code)
                .unwrap_or_else(|error| {
                    eprintln!("{error}");
                    ExitCode::FAILURE
                })
        }
        None => {
            eprintln!("Task not found: {name}");
            ExitCode::FAILURE
        }
    }
}

fn status_code(status: std::process::ExitStatus) -> ExitCode {
    if status.success() {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(status.code().unwrap_or(1).clamp(1, 255) as u8)
    }
}

fn task_label(task: &Task) -> String {
    if task.description.is_empty() {
        task.name.clone()
    } else {
        format!("{}  —  {}", task.name, task.description)
    }
}

fn recent_path() -> PathBuf {
    Path::new(".fsr").join("recent-tasks.json")
}

fn remember_task(name: &str) {
    let path = recent_path();
    let mut recent: BTreeMap<String, u64> = fs::read_to_string(&path)
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_default();
    recent.insert(
        name.to_owned(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    );
    let _ = fs::create_dir_all(".fsr");
    let _ = fs::write(path, serde_json::to_vec_pretty(&recent).unwrap_or_default());
}

pub fn run_git_branch() -> Result<(), String> {
    let branch = git_output(&["branch", "--show-current"])?;
    if branch != "Development" && branch != "development" && branch != "master" && branch != "main"
    {
        println!("Already on feature branch '{branch}'.");
        return Ok(());
    }
    let name: String = Input::new()
        .with_prompt("Name the new feature branch (or 'cancel')")
        .interact_text()
        .map_err(|e| e.to_string())?;
    if name.trim().eq_ignore_ascii_case("cancel") {
        return Ok(());
    }
    run_command("git", &["switch", "-c", name.trim()])
}

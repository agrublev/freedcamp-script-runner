//! Interactive pickers: port of `lib/startScripts.js` + `lib/taskList.js`
//! (ink/react UI replaced with dialoguer fuzzy-select). Recent tasks are kept
//! in the cache exactly like JS (`recentTasks`, reset when fscripts.md size changes).
//! Not ported: ink TaskPicker visuals, touch/mouse support, autocomplete sublabels layout.

use crate::cache::Cache;
use crate::parse::{Parsed, Task};
use anyhow::Result;
use dialoguer::{FuzzySelect, theme::ColorfulTheme};
use serde_json::{Value, json};
use std::path::{Path, PathBuf};

fn now_ms() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0)
}

fn fuzzy(prompt: &str, items: &[String]) -> Result<Option<usize>> {
    if items.is_empty() {
        return Ok(None);
    }
    Ok(FuzzySelect::with_theme(&ColorfulTheme::default())
        .with_prompt(prompt)
        .items(items)
        .default(0)
        .interact_opt()?)
}

/// Up to 3 most recently run task names (newest first).
pub fn recent(cache: &Cache, fscripts: &Path) -> Result<Vec<String>> {
    let size = std::fs::metadata(fscripts).map(|m| m.len()).unwrap_or(0);
    if cache.get("fscriptsSize")?.map(|e| e["value"].clone()) != Some(json!(size)) {
        cache.set("recentTasks", json!({}), true)?;
        cache.set("fscriptsSize", json!(size), true)?;
    }
    let rt = cache
        .get("recentTasks")?
        .map(|e| e["value"].clone())
        .unwrap_or(json!({}));
    let mut v: Vec<(String, f64)> = rt
        .as_object()
        .map(|m| {
            m.iter()
                .map(|(k, x)| (k.clone(), x["lastExecuted"].as_f64().unwrap_or(0.0)))
                .collect()
        })
        .unwrap_or_default();
    v.sort_by(|a, b| b.1.total_cmp(&a.1));
    Ok(v.into_iter().take(3).map(|x| x.0).collect())
}

pub fn remember(cache: &Cache, name: &str) -> Result<()> {
    let mut rt = cache
        .get("recentTasks")?
        .map(|e| e["value"].clone())
        .filter(Value::is_object)
        .unwrap_or(json!({}));
    rt[name] = json!({"lastExecuted": now_ms()});
    cache.set("recentTasks", rt, true)?;
    Ok(())
}

pub fn clear_recent(cache: &Cache) -> Result<()> {
    cache.set("recentTasks", json!({}), true)?;
    Ok(())
}

fn label(t: &Task) -> String {
    if t.description.is_empty() {
        t.name.clone()
    } else {
        format!(
            "{}   ~   {}",
            t.name,
            t.description.lines().next().unwrap_or("")
        )
    }
}

/// `fsr start`: recent tasks + categories, then a task. `fsr list`: all tasks fuzzy.
pub fn pick_task(parsed: &Parsed, recent: &[String], by_category: bool) -> Result<Option<String>> {
    if !by_category {
        let items: Vec<String> = parsed.all_tasks.iter().map(label).collect();
        return Ok(fuzzy("Choose task to run", &items)?.map(|i| parsed.all_tasks[i].name.clone()));
    }
    let mut items: Vec<String> = recent.iter().map(|r| format!("↺ {r}")).collect();
    items.extend(parsed.categories.iter().map(|c| format!("# {}", c.name)));
    let Some(i) = fuzzy("Choose a category", &items)? else {
        return Ok(None);
    };
    if i < recent.len() {
        return Ok(Some(recent[i].clone()));
    }
    let cat = &parsed.categories[i - recent.len()];
    let items: Vec<String> = cat.tasks.iter().map(label).collect();
    Ok(fuzzy(&format!("{} — choose task", cat.name), &items)?.map(|j| cat.tasks[j].name.clone()))
}

pub fn pick_package_script(scripts: &[(String, String)]) -> Result<Option<String>> {
    let items: Vec<String> = scripts
        .iter()
        .map(|(k, v)| format!("{k}   ~   {v}"))
        .collect();
    Ok(fuzzy("Choose package script", &items)?.map(|i| scripts[i].0.clone()))
}

/// Markdown files under `root` (skips node_modules, .git, target, dist).
pub fn markdown_files(root: &Path) -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = walkdir::WalkDir::new(root)
        .max_depth(6)
        .into_iter()
        .filter_entry(|e| {
            !matches!(
                e.file_name().to_str(),
                Some("node_modules" | ".git" | "target" | "dist")
            )
        })
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.path()
                    .extension()
                    .is_some_and(|x| x.eq_ignore_ascii_case("md"))
        })
        .map(|e| {
            e.path()
                .strip_prefix(root)
                .unwrap_or(e.path())
                .to_path_buf()
        })
        .collect();
    v.sort();
    v
}

pub fn pick_markdown(root: &Path) -> Result<Option<PathBuf>> {
    let files = markdown_files(root);
    let items: Vec<String> = files.iter().map(|p| p.display().to_string()).collect();
    Ok(fuzzy("Choose a markdown (.md) file", &items)?.map(|i| root.join(&files[i])))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn recent_tasks_order_and_reset() {
        let d = tempfile::tempdir().unwrap();
        let c = Cache::new(d.path().join("c"));
        let f = d.path().join("fscripts.md");
        std::fs::write(&f, "# a").unwrap();
        assert!(recent(&c, &f).unwrap().is_empty());
        for n in ["a", "b", "c", "d"] {
            remember(&c, n).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(3));
        }
        assert_eq!(recent(&c, &f).unwrap(), ["d", "c", "b"]);
        std::fs::write(&f, "# changed size").unwrap();
        assert!(recent(&c, &f).unwrap().is_empty());
    }
    #[test]
    fn finds_markdown_skipping_node_modules() {
        let d = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(d.path().join("node_modules/x")).unwrap();
        std::fs::write(d.path().join("node_modules/x/R.md"), "").unwrap();
        std::fs::write(d.path().join("A.MD"), "").unwrap();
        std::fs::write(d.path().join("b.txt"), "").unwrap();
        assert_eq!(markdown_files(d.path()), [PathBuf::from("A.MD")]);
    }
}

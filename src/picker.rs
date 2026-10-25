//! Interactive pickers: port of `lib/startScripts.js` + `lib/taskList.js`
//! (ink/react UI ported to ratatui in `crate::ui`). Recent tasks are kept
//! in the cache exactly like JS (`recentTasks`, reset when fscripts.md size changes).

use crate::cache::Cache;
use crate::parse::Parsed;
use crate::ui::{
    self,
    autocomplete::{AcItem, AutoComplete},
    menu::Menu,
    task_picker::TaskPicker,
};
use anyhow::Result;
use serde_json::{Value, json};
use std::path::{Path, PathBuf};

fn now_ms() -> f64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0)
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

fn term_cols() -> u16 {
    ratatui::crossterm::terminal::size()
        .map(|s| s.0)
        .unwrap_or(80)
}

/// Recent task options in TaskPicker format: `name   ~   <moment calendar>`.
pub fn recent_options(cache: &Cache, names: &[String]) -> Vec<String> {
    let rt = cache
        .get("recentTasks")
        .ok()
        .flatten()
        .map(|e| e["value"].clone())
        .unwrap_or(json!({}));
    let now = chrono::Local::now();
    names
        .iter()
        .map(|n| {
            format!(
                "{n}   ~   {}",
                ui::calendar(rt[n]["lastExecuted"].as_f64().unwrap_or(0.0), now)
            )
        })
        .collect()
}

/// `fsr start` (TaskPicker) or `fsr list` (AutoComplete over all tasks).
pub fn pick_task(
    parsed: &Parsed,
    recent_opts: &[String],
    by_category: bool,
) -> Result<Option<String>> {
    if by_category {
        return ui::run(TaskPicker::new(
            parsed.clone(),
            recent_opts.to_vec(),
            term_cols(),
        ));
    }
    let items = parsed
        .all_tasks
        .iter()
        .map(|t| AcItem::from_opt(&format!("{}   ~   {}", t.name, t.description)))
        .collect();
    Ok(ui::run(AutoComplete::new(items, "Choose task to run"))?.map(|i| i.value))
}

pub fn pick_package_script(scripts: &[(String, String)]) -> Result<Option<String>> {
    let items = scripts
        .iter()
        .map(|(k, v)| AcItem::from_opt(&format!("{k}   ~   {v}")))
        .collect();
    Ok(ui::run(AutoComplete::new(items, "Choose package script"))?.map(|i| i.value))
}

/// Bare `fsr`: the PluginPicker command menu.
/// Bare `fsr` menu: built-in commands, then `plugin:<name>` items (index.js).
pub fn pick_command(extra: Vec<ui::menu::MenuItem>) -> Result<Option<String>> {
    let mut items = ui::menu::default_items();
    items.extend(extra);
    ui::run(Menu::new(items))
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
    let items = markdown_files(root)
        .iter()
        .map(|p| AcItem::from_opt(&p.display().to_string()))
        .collect();
    Ok(
        ui::run(AutoComplete::new(items, "Choose a markdown (.md) file"))?
            .map(|i| root.join(i.value)),
    )
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

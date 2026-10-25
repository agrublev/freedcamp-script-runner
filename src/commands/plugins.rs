use super::helpers::run_command;
use dialoguer::Input;
use serde_json::{Value, json};
use std::fs;
use std::path::Path;
use std::process::Command;

pub fn list_plugins() -> Result<(), String> {
    println!("Built-in plugins:");
    println!("  deployment  Deploy a directory with Surge");
    println!("  task-notifier  Enable or disable task notifications");
    let local = Path::new(".fsr/plugins");
    if local.is_dir() {
        println!("\nProject plugins:");
        for entry in fs::read_dir(local)
            .map_err(|e| e.to_string())?
            .flatten()
            .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        {
            let name = entry.file_name().to_string_lossy().to_string();
            let manifest = entry.path().join("plugin.json");
            let description = fs::read_to_string(manifest)
                .ok()
                .and_then(|s| serde_json::from_str::<Value>(&s).ok())
                .and_then(|v| v["description"].as_str().map(str::to_owned))
                .unwrap_or_default();
            println!("  {name}  {description}");
        }
    }
    let node_modules = Path::new("node_modules");
    if node_modules.is_dir() {
        for entry in fs::read_dir(node_modules)
            .map_err(|e| e.to_string())?
            .flatten()
        {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("fscr-plugin-") {
                println!("  {name}  (npm plugin)");
            }
        }
    }
    Ok(())
}

pub fn run_plugin(name: &str, args: &[String]) -> Result<(), String> {
    if name == "task-notifier" {
        return task_notifications(args.first().map(String::as_str).unwrap_or("status"));
    }
    if name == "deployment" {
        let files = Input::<String>::new()
            .with_prompt("Directory to deploy")
            .interact_text()
            .map_err(|e| e.to_string())?;
        let subdomain = Input::<String>::new()
            .with_prompt("Surge subdomain")
            .interact_text()
            .map_err(|e| e.to_string())?;
        return deploy(&files, &subdomain);
    }
    let local = Path::new(".fsr/plugins").join(name);
    let manifest_path = local.join("plugin.json");
    if let Ok(text) = fs::read_to_string(&manifest_path) {
        if let Ok(manifest) = serde_json::from_str::<Value>(&text) {
            if let Some(script) = manifest.get("run").and_then(Value::as_str) {
                let mut command = Command::new("sh");
                command.arg("-c").arg(script).arg("fsr-plugin").args(args);
                let status = command.status().map_err(|e| e.to_string())?;
                return if status.success() {
                    Ok(())
                } else {
                    Err(format!("plugin exited with {status}"))
                };
            }
        }
    }
    for executable in [local.join("run"), local.join("run.sh")] {
        if executable.is_file() {
            let mut command = Command::new("sh");
            command.arg(&executable).args(args);
            let status = command.status().map_err(|e| e.to_string())?;
            return if status.success() {
                Ok(())
            } else {
                Err(format!("plugin exited with {status}"))
            };
        }
    }
    let js_entry = local.join("index.js");
    if js_entry.is_file() {
        let script = "const m=await import(process.argv[1]);const p=m.default||m;if(typeof p.run!==\"function\")throw new Error(\"plugin does not export run()\");await p.run({logger:{info:console.log,success:console.log,warn:console.warn,error:console.error}});";
        let status = Command::new("node")
            .args([
                "--input-type=module",
                "-e",
                script,
                js_entry.to_str().ok_or("plugin path is not valid UTF-8")?,
            ])
            .args(args)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
        return Err(format!("plugin exited with {status}"));
    }
    let package_entry = Path::new("node_modules").join(name).join("index.js");
    if package_entry.is_file() {
        let script = "const m=await import(process.argv[1]);const p=m.default||m;if(typeof p.run!==\"function\")throw new Error(\"plugin does not export run()\");await p.run({logger:{info:console.log,success:console.log,warn:console.warn,error:console.error}});";
        let status = Command::new("node")
            .args([
                "--input-type=module",
                "-e",
                script,
                package_entry
                    .to_str()
                    .ok_or("plugin path is not valid UTF-8")?,
            ])
            .args(args)
            .status()
            .map_err(|e| e.to_string())?;
        if status.success() {
            return Ok(());
        }
        return Err(format!("plugin exited with {status}"));
    }
    Err(format!(
        "plugin '{name}' is not runnable; provide .fsr/plugins/{name}/run or index.js with run()"
    ))
}

pub fn fire_plugin_hook(event: &str, task_name: &str) {
    let plugins = Path::new(".fsr/plugins");
    let Ok(entries) = fs::read_dir(plugins) else {
        return;
    };
    for entry in entries
        .flatten()
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
    {
        let manifest = entry.path().join("plugin.json");
        let Ok(data) = fs::read_to_string(manifest) else {
            continue;
        };
        let Ok(plugin) = serde_json::from_str::<Value>(&data) else {
            continue;
        };
        let Some(hook) = plugin.get("hooks").and_then(|hooks| hooks.get(event)) else {
            continue;
        };
        let commands: Vec<&str> = match hook {
            Value::String(command) => vec![command],
            Value::Array(items) => items.iter().filter_map(Value::as_str).collect(),
            _ => Vec::new(),
        };
        for command in commands {
            let result = Command::new("sh")
                .arg("-c")
                .arg(command)
                .env("FSR_HOOK", event)
                .env("FSR_TASK_NAME", task_name)
                .status();
            match result {
                Err(error) => eprintln!("[hook:{event}] {error}"),
                Ok(status) if !status.success() => {
                    eprintln!("[hook:{event}] command exited with {status}")
                }
                _ => {}
            }
        }
    }
}

pub fn task_notifications(action: &str) -> Result<(), String> {
    let path = Path::new(".fsr/task-notifier.json");
    let enabled = fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v["enabled"].as_bool())
        .unwrap_or(true);
    match action {
        "enable" | "--enable" => {
            fs::create_dir_all(".fsr").map_err(|e| e.to_string())?;
            fs::write(path, "{\"enabled\":true}\n").map_err(|e| e.to_string())?;
            println!("Notifications enabled.");
        }
        "disable" | "--disable" => {
            fs::create_dir_all(".fsr").map_err(|e| e.to_string())?;
            fs::write(path, "{\"enabled\":false}\n").map_err(|e| e.to_string())?;
            println!("Notifications disabled.");
        }
        _ => println!(
            "Notifications are {}.",
            if enabled { "enabled" } else { "disabled" }
        ),
    }
    Ok(())
}

pub fn notify_task_start(task: &str) {
    if notifier_enabled() {
        println!("✓ Task started: {task}");
    }
}
pub fn notify_task_end(task: &str, ok: bool) {
    if notifier_enabled() {
        println!(
            "{} Task {}: {task}",
            if ok { "✓" } else { "✗" },
            if ok { "ended" } else { "failed" }
        );
    }
}
fn notifier_enabled() -> bool {
    fs::read_to_string(".fsr/task-notifier.json")
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v["enabled"].as_bool())
        .unwrap_or(true)
}

pub fn deploy(files: &str, subdomain: &str) -> Result<(), String> {
    let domain = format!("{subdomain}.surge.sh");
    println!("Deploying {files} → {domain}");
    let started = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let result = run_command("npx", &["surge", files, &domain]);
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .saturating_sub(started);
    let _ = record_deployment(started, duration, result.is_ok());
    result
}

pub fn deployment_history() -> Result<(), String> {
    let records: Vec<Value> = fs::read_to_string(".fsr/deployment-history.json")
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_default();
    if records.is_empty() {
        println!("No deployment history.");
        return Ok(());
    }
    for record in records.iter().rev().take(10) {
        println!(
            "{} {} ({}s)",
            if record["success"] == true {
                "✓"
            } else {
                "✗"
            },
            record["timestamp"].as_u64().unwrap_or_default(),
            record["duration"].as_u64().unwrap_or_default()
        );
    }
    Ok(())
}

fn record_deployment(timestamp: u64, duration: u64, success: bool) -> Result<(), String> {
    fs::create_dir_all(".fsr").map_err(|e| e.to_string())?;
    let path = Path::new(".fsr/deployment-history.json");
    let mut records: Vec<Value> = fs::read_to_string(path)
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok())
        .unwrap_or_default();
    records.push(json!({"timestamp":timestamp,"duration":duration,"success":success}));
    fs::write(
        path,
        serde_json::to_vec_pretty(&records).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

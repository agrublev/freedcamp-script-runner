use super::scripts::generate_scripts;
use serde_json::{Value, json};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn run_doctor(fix: bool, json_output: bool, verbose: bool) -> Result<(), String> {
    if fix && !Path::new("fscripts.md").exists() && Path::new("package.json").exists() {
        generate_scripts(true)?;
    }
    let mut checks = Vec::new();
    let rust = Command::new("rustc").arg("--version").output();
    checks.push(check(
        "Rust toolchain",
        true,
        rust.as_ref().is_ok_and(|out| out.status.success()),
        rust.map(|out| String::from_utf8_lossy(&out.stdout).trim().to_owned())
            .unwrap_or_else(|_| "rustc not found".into()),
    ));
    let cargo = Command::new("cargo").arg("--version").output();
    checks.push(check(
        "Cargo",
        true,
        cargo.as_ref().is_ok_and(|out| out.status.success()),
        cargo
            .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_owned())
            .unwrap_or_else(|_| "cargo not found".into()),
    ));
    let node = Command::new("node").arg("--version").output();
    let node_version = node
        .as_ref()
        .ok()
        .filter(|out| out.status.success())
        .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_owned());
    let node_ok = node_version
        .as_ref()
        .and_then(|v| v.trim_start_matches('v').split('.').next())
        .and_then(|major| major.parse::<u32>().ok())
        .is_some_and(|major| major >= 22);
    checks.push(check(
        "Node.js",
        false,
        node_ok,
        node_version.unwrap_or_else(|| "Node.js is not installed".into()),
    ));
    let git = Command::new("git").arg("--version").output();
    checks.push(check(
        "Git",
        false,
        git.as_ref().is_ok_and(|out| out.status.success()),
        git.map(|out| String::from_utf8_lossy(&out.stdout).trim().to_owned())
            .unwrap_or_else(|_| "git not found".into()),
    ));
    let package_manager = Command::new("npm").arg("--version").output();
    checks.push(check(
        "npm",
        false,
        package_manager
            .as_ref()
            .is_ok_and(|out| out.status.success()),
        package_manager
            .map(|out| String::from_utf8_lossy(&out.stdout).trim().to_owned())
            .unwrap_or_else(|_| "npm not found".into()),
    ));
    checks.push(check(
        "fscripts.md",
        false,
        Path::new("fscripts.md").is_file(),
        if Path::new("fscripts.md").is_file() {
            "found"
        } else {
            "missing"
        }
        .to_owned(),
    ));
    checks.push(check(
        "package.json",
        false,
        Path::new("package.json").is_file(),
        if Path::new("package.json").is_file() {
            "found"
        } else {
            "missing"
        }
        .to_owned(),
    ));
    let permission_ok = fs::metadata(".")
        .map(|metadata| !metadata.permissions().readonly())
        .unwrap_or(false);
    checks.push(check(
        "Workspace permissions",
        true,
        permission_ok,
        if permission_ok {
            "workspace is writable".into()
        } else {
            "workspace is read-only".into()
        },
    ));
    let critical_passed = checks
        .iter()
        .filter(|c| c["critical"] == true)
        .all(|c| c["passed"].as_bool().unwrap_or(false));
    let passed_count = checks.iter().filter(|c| c["passed"] == true).count();
    let warning_count = checks
        .iter()
        .filter(|c| c["critical"] != true && c["passed"] != true)
        .count();
    let result = json!({ "passed": critical_passed, "summary": { "passed": passed_count, "warnings": warning_count, "errors": checks.len() - passed_count - warning_count, "total": checks.len() }, "results": checks });
    if json_output {
        println!(
            "{}",
            serde_json::to_string_pretty(&result).map_err(|e| e.to_string())?
        );
    } else {
        println!("\nFSCR diagnostics\n");
        for item in result["results"].as_array().unwrap() {
            println!(
                "{} {} — {}",
                if item["passed"] == true { "✓" } else { "✗" },
                item["name"].as_str().unwrap_or("check"),
                item["message"].as_str().unwrap_or("")
            );
            if verbose && item["passed"] != true {
                println!(
                    "   This check may affect legacy commands or tasks that depend on this tool."
                );
            }
        }
        println!(
            "\n{}",
            if result["passed"] == true {
                "System operational."
            } else {
                "Issues found."
            }
        );
    }
    if result["passed"] == true {
        Ok(())
    } else {
        Err("one or more critical checks failed".into())
    }
}

fn check(name: &str, critical: bool, passed: bool, message: String) -> Value {
    json!({ "name": name, "passed": passed, "warning": !critical && !passed, "message": message, "critical": critical })
}

pub fn run_completion(action: &str, shell: Option<&str>, force: bool) -> Result<(), String> {
    let shell = shell.map(str::to_owned).unwrap_or_else(detect_shell);
    let home = home_dir().ok_or("could not determine home directory")?;
    let (config, script) = shell_paths(&home, &shell)?;
    match action {
        "status" => {
            for name in ["bash", "zsh", "fish", "powershell"] {
                let (path, _) = shell_paths(&home, name)?;
                let text = fs::read_to_string(&path).unwrap_or_default();
                println!(
                    "{name:12} {}",
                    if text.contains("# FSCR completion") || path.exists() && name == "fish" {
                        "installed"
                    } else {
                        "not installed"
                    }
                );
            }
        }
        "generate" => print!("{}", script),
        "install" => {
            if shell == "fish" {
                let dir = config.parent().unwrap();
                fs::create_dir_all(dir).map_err(|e| e.to_string())?;
                fs::write(&config, script).map_err(|e| e.to_string())?;
            } else {
                let mut current = fs::read_to_string(&config).unwrap_or_default();
                if current.contains("# FSCR completion") && !force {
                    println!("Completions already installed; pass --force to replace them.");
                    return Ok(());
                }
                let block = format!("\n# FSCR completion\n{script}\n# End FSCR completion\n");
                if let Some(start) = current.find("# FSCR completion") {
                    if let Some(end) = current[start..].find("# End FSCR completion") {
                        current.replace_range(
                            start..start + end + "# End FSCR completion".len(),
                            block.trim(),
                        );
                    }
                } else {
                    current.push_str(&block);
                }
                fs::write(&config, current).map_err(|e| e.to_string())?;
            }
            println!("Installed {shell} completions in {}", config.display());
        }
        "uninstall" => {
            if shell == "fish" {
                if config.exists() {
                    fs::remove_file(&config).map_err(|e| e.to_string())?;
                }
            } else if config.exists() {
                let mut current = fs::read_to_string(&config).map_err(|e| e.to_string())?;
                if let Some(start) = current.find("# FSCR completion") {
                    if let Some(end) = current[start..].find("# End FSCR completion") {
                        current
                            .replace_range(start..start + end + "# End FSCR completion".len(), "");
                        fs::write(&config, current).map_err(|e| e.to_string())?;
                    }
                }
            }
            println!("Removed {shell} completions.");
        }
        _ => {
            return Err("completion action must be install, uninstall, status, or generate".into());
        }
    }
    Ok(())
}

pub fn run_greet(action: &str, shell: Option<&str>, force: bool) -> Result<(), String> {
    let shell = shell.map(str::to_owned).unwrap_or_else(detect_shell);
    if !["bash", "zsh"].contains(&shell.as_str()) {
        return Err("greet supports bash and zsh".into());
    }
    let home = home_dir().ok_or("could not determine home directory")?;
    let config = home.join(if shell == "zsh" { ".zshrc" } else { ".bashrc" });
    let current = fs::read_to_string(&config).unwrap_or_default();
    let installed = current.contains("# FSCR greet");
    match action {
        "status" => println!(
            "{}: {} ({})",
            shell,
            if installed {
                "installed"
            } else {
                "not installed"
            },
            config.display()
        ),
        "uninstall" => {
            let clean = remove_marked_block(&current, "# FSCR greet", "# End FSCR greet");
            fs::write(&config, clean).map_err(|e| e.to_string())?;
            println!("Greeting removed.");
        }
        "install" => {
            if installed && !force {
                println!("Greeting already installed; pass --force to replace it.");
                return Ok(());
            }
            let snippet = if shell == "zsh" {
                "_fscr_greet() { [[ -f fscripts.md ]] && echo '👋 fscripts.md found! Run fsr to open the script runner.'; }\nchpwd_functions+=(_fscr_greet)\n_fscr_greet"
            } else {
                "_fscr_greet() { [[ -f fscripts.md ]] && echo '👋 fscripts.md found! Run fsr to open the script runner.'; }\nexport PROMPT_COMMAND=\"_fscr_greet${PROMPT_COMMAND:+;$PROMPT_COMMAND}\"\n_fscr_greet"
            };
            let block = format!("\n# FSCR greet\n{snippet}\n# End FSCR greet\n");
            let clean = remove_marked_block(&current, "# FSCR greet", "# End FSCR greet");
            if let Some(parent) = config.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::write(&config, format!("{clean}{block}")).map_err(|e| e.to_string())?;
            println!("Greeting installed in {}", config.display());
        }
        _ => return Err("greet action must be install, uninstall, or status".into()),
    }
    Ok(())
}

fn remove_marked_block(text: &str, start: &str, end: &str) -> String {
    let Some(begin) = text.find(start) else {
        return text.to_owned();
    };
    let Some(finish) = text[begin..].find(end) else {
        return text.to_owned();
    };
    let finish = begin + finish + end.len();
    format!(
        "{}{}",
        &text[..begin],
        &text[finish..].trim_start_matches('\n')
    )
}

fn detect_shell() -> String {
    env::var("SHELL")
        .ok()
        .and_then(|path| {
            Path::new(&path)
                .file_name()
                .and_then(|n| n.to_str())
                .map(str::to_owned)
        })
        .filter(|name| ["bash", "zsh", "fish", "powershell"].contains(&name.as_str()))
        .unwrap_or_else(|| "bash".into())
}

fn home_dir() -> Option<PathBuf> {
    env::var_os("HOME")
        .or_else(|| env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

fn shell_paths(home: &Path, shell: &str) -> Result<(PathBuf, String), String> {
    let (config, filename) = match shell {
        "bash" => (home.join(".bashrc"), "bash.sh"),
        "zsh" => (home.join(".zshrc"), "zsh.sh"),
        "fish" => (home.join(".config/fish/completions/fsr.fish"), "fish.sh"),
        "powershell" => (
            home.join("Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1"),
            "powershell.ps1",
        ),
        _ => return Err(format!("unsupported shell: {shell}")),
    };
    let source = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("lib/completions/scripts")
        .join(filename);
    let script =
        fs::read_to_string(source).map_err(|e| format!("completion script unavailable: {e}"))?;
    Ok((config, script))
}

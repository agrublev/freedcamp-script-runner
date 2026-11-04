//! Shell completion install/status, matching `lib/completions/completion.js`.
//! The script body comes from clap (passed in) so it tracks the current
//! commands. Node installed a static script under a `# FSCR completion` marker.

use anyhow::{Context, Result, bail};
use std::io::Write;
use std::path::{Path, PathBuf};

const MARKER: &str = "# FSCR completion";
const END: &str = "# End FSCR completion";

pub fn detect_shell() -> String {
    if let Ok(shell) = std::env::var("SHELL") {
        let name = Path::new(&shell)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("");
        if matches!(name, "bash" | "zsh" | "fish" | "elvish") {
            return name.to_string();
        }
    }
    if cfg!(windows) {
        return "powershell".into();
    }
    "bash".into()
}

fn home() -> Result<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .context("HOME is not set")
}

/// Rc file Node appends to. Fish completions live in [`fish_comp_path`].
pub fn shell_config_path(shell: &str) -> Result<PathBuf> {
    let home = home()?;
    Ok(match shell {
        "zsh" => home.join(".zshrc"),
        "fish" => home.join(".config/fish/config.fish"),
        "powershell" | "pwsh" => {
            home.join("Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1")
        }
        "elvish" => home.join(".elvish/rc.elv"),
        _ => home.join(".bashrc"),
    })
}

fn fish_comp_path() -> Result<PathBuf> {
    Ok(home()?.join(".config/fish/completions/fsr.fish"))
}

pub fn is_shell_name(s: &str) -> bool {
    matches!(
        s,
        "bash" | "zsh" | "fish" | "powershell" | "pwsh" | "elvish"
    )
}

fn normalize(shell: &str) -> String {
    match shell {
        "pwsh" => "powershell".into(),
        other => other.to_string(),
    }
}

fn chosen_shell(shell_flag: Option<&str>) -> String {
    normalize(shell_flag.unwrap_or(&detect_shell()))
}

fn block(script: &str) -> String {
    let body = if script.ends_with('\n') {
        script.to_string()
    } else {
        format!("{script}\n")
    };
    format!("{MARKER}\n{body}{END}\n")
}

fn strip_block(config: &str) -> String {
    let Some(start) = config.find(MARKER) else {
        return config.to_string();
    };
    let after = start + MARKER.len();
    let mut end = config[after..]
        .find(END)
        .map(|i| after + i + END.len())
        .unwrap_or(config.len());
    if config[end..].starts_with('\n') {
        end += 1;
    }
    let mut out = String::new();
    out.push_str(&config[..start]);
    out.push_str(&config[end..]);
    out
}

fn replace_block(config: &str, script: &str) -> String {
    let replacement = block(script);
    let Some(start) = config.find(MARKER) else {
        let mut out = config.to_string();
        if !out.is_empty() && !out.ends_with('\n') {
            out.push('\n');
        }
        if !out.is_empty() {
            out.push('\n');
        }
        out.push_str(&replacement);
        return out;
    };
    let after = start + MARKER.len();
    let mut end = config[after..]
        .find(END)
        .map(|i| after + i + END.len())
        .unwrap_or(config.len());
    if config[end..].starts_with('\n') {
        end += 1;
    }
    let mut out = String::new();
    out.push_str(&config[..start]);
    out.push_str(&replacement);
    out.push_str(&config[end..]);
    out
}

fn installed(shell: &str) -> Result<bool> {
    if shell == "fish" {
        return Ok(fish_comp_path()?.is_file());
    }
    let path = shell_config_path(shell)?;
    Ok(std::fs::read_to_string(path).is_ok_and(|c| c.contains(MARKER)))
}

/// `true` when a script was written. An existing block without `--force` returns `false`.
fn install(shell: &str, script: &str, force: bool) -> Result<bool> {
    if shell == "fish" {
        let path = fish_comp_path()?;
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let mut f = std::fs::File::create(&path)?;
        f.write_all(script.as_bytes())?;
        if !script.ends_with('\n') {
            f.write_all(b"\n")?;
        }
        crate::ui::log(&format!(
            "\x1b[32m✅ Installed Fish completions to\x1b[39m {}",
            path.display()
        ));
        return Ok(true);
    }
    if !matches!(shell, "bash" | "zsh" | "powershell" | "elvish") {
        bail!("completion install supports bash, zsh, fish, powershell (got {shell})");
    }
    let path = shell_config_path(shell)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let current = if path.exists() {
        std::fs::read_to_string(&path)?
    } else {
        String::new()
    };
    if current.contains(MARKER) && !force {
        crate::ui::log("\x1b[33m⚠️  Completions already installed\x1b[39m");
        crate::ui::log("\x1b[2m   Use --force to reinstall\x1b[22m");
        return Ok(false);
    }
    std::fs::write(&path, replace_block(&current, script))?;
    crate::ui::log(&format!(
        "\x1b[32m✅ Installed completions to\x1b[39m {}",
        path.display()
    ));
    Ok(true)
}

fn uninstall(shell: &str) -> Result<()> {
    if shell == "fish" {
        let path = fish_comp_path()?;
        if path.is_file() {
            std::fs::remove_file(&path)?;
            crate::ui::log("\x1b[32m✅ Removed Fish completions\x1b[39m");
        } else {
            crate::ui::log("\x1b[33m⚠️  No Fish completions found\x1b[39m");
        }
        return Ok(());
    }
    let path = shell_config_path(shell)?;
    if !path.exists() {
        crate::ui::log(&format!(
            "\x1b[33m⚠️  Config file not found: {}\x1b[39m",
            path.display()
        ));
        return Ok(());
    }
    let current = std::fs::read_to_string(&path)?;
    if !current.contains(MARKER) {
        crate::ui::log("\x1b[33m⚠️  No completions found to uninstall\x1b[39m");
        return Ok(());
    }
    std::fs::write(&path, strip_block(&current))?;
    crate::ui::log(&format!(
        "\x1b[32m✅ Removed completions from\x1b[39m {}",
        path.display()
    ));
    Ok(())
}

fn status() -> Result<()> {
    let current = detect_shell();
    crate::ui::log("\x1b[1m\n📋 Completion Status\n\x1b[22m");
    for shell in ["bash", "zsh", "fish", "powershell"] {
        let mark = if shell == current {
            "\x1b[32m●\x1b[39m"
        } else {
            "\x1b[2m○\x1b[22m"
        };
        let (label, here) = match installed(shell) {
            Ok(true) => ("\x1b[32m✅ Installed\x1b[39m", shell == current),
            Ok(false) => ("\x1b[2mNot installed\x1b[22m", shell == current),
            Err(_) => ("\x1b[31mError\x1b[39m", false),
        };
        let cur = if here {
            "\x1b[33m (current)\x1b[39m"
        } else {
            ""
        };
        crate::ui::log(&format!("{mark} \x1b[1m{shell:<12}\x1b[22m {label}{cur}"));
    }
    println!();
    Ok(())
}

fn activate_hint(shell: &str) -> Result<()> {
    println!();
    crate::ui::log("\x1b[36m🎉 Completions installed successfully!\x1b[39m");
    println!();
    crate::ui::log("\x1b[2mTo activate completions, restart your shell or run:\x1b[22m");
    let hint = match shell {
        "fish" => "  exec fish".to_string(),
        "powershell" => "  . $PROFILE".to_string(),
        _ => format!("  source {}", shell_config_path(shell)?.display()),
    };
    crate::ui::log(&format!("\x1b[33m{hint}\x1b[39m"));
    println!();
    Ok(())
}

fn print_script(script: &str) {
    print!("{script}");
    if !script.ends_with('\n') {
        println!();
    }
}

fn do_install(
    shell: &str,
    force: bool,
    script_for: &impl Fn(&str) -> Result<String>,
) -> Result<()> {
    let script = script_for(shell)?;
    if install(shell, &script, force)? {
        activate_hint(shell)?;
    }
    Ok(())
}

/// `fsr completion`. A shell name (`completion bash`) prints that script, which
/// is what `fsr completion bash` did before install/status existed.
pub fn cmd_completion(
    action: Option<&str>,
    shell_flag: Option<&str>,
    force: bool,
    yes: bool,
    tty: bool,
    script_for: impl Fn(&str) -> Result<String>,
) -> Result<i32> {
    match action {
        Some(a) if is_shell_name(a) => print_script(&script_for(&normalize(a))?),
        Some("generate") => print_script(&script_for(&chosen_shell(shell_flag))?),
        Some("install") => do_install(&chosen_shell(shell_flag), force, &script_for)?,
        Some("uninstall") => {
            uninstall(&chosen_shell(shell_flag))?;
            println!();
            crate::ui::log("\x1b[36m✅ Completions uninstalled successfully!\x1b[39m");
            println!();
        }
        Some("status") => status()?,
        Some(other) => bail!(
            "unknown completion action '{other}' (install, uninstall, status, generate, or a shell name)"
        ),
        None if tty => {
            let shell = chosen_shell(shell_flag);
            let ok = yes
                || dialoguer::Confirm::new()
                    .with_prompt(format!("Install completions for \x1b[36m{shell}\x1b[39m?"))
                    .default(true)
                    .interact()?;
            if !ok {
                crate::ui::log("\x1b[33mInstallation cancelled\x1b[39m");
                return Ok(0);
            }
            do_install(&shell, force, &script_for)?;
        }
        None => print_script(&script_for(&chosen_shell(shell_flag))?),
    }
    Ok(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_removes_one_block() {
        let s = "keep\n# FSCR completion\nfoo\n# End FSCR completion\nkeep2\n";
        assert_eq!(strip_block(s), "keep\nkeep2\n");
        assert_eq!(strip_block("untouched\n"), "untouched\n");
    }

    #[test]
    fn replace_appends_then_overwrites() {
        let once = replace_block("echo hi\n", "complete fsr\n");
        assert!(once.contains("echo hi"));
        assert_eq!(once.matches(MARKER).count(), 1);
        assert!(once.contains("complete fsr"));
        let twice = replace_block(&once, "complete other\n");
        assert_eq!(twice.matches(MARKER).count(), 1);
        assert!(twice.contains("complete other"));
        assert!(!twice.contains("complete fsr"));
        assert!(twice.contains("echo hi"));
    }
}

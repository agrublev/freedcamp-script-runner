use anyhow::{Context, Result};
use clap::{CommandFactory, Parser, Subcommand};
use fsr::{cache::Cache, encryption, env::get_env_arg, parse, picker, release, runner, toc};
use std::io::IsTerminal;
use std::path::PathBuf;
use std::process::ExitCode;

#[derive(Parser)]
#[command(
    name = "fsr",
    version,
    about = "Runs the fscripts.md file",
    after_help = "Global: --env <name> | -e <name> | --prod | --dev"
)]
struct Cli {
    #[command(subcommand)]
    cmd: Option<Cmd>,
}

#[derive(Subcommand)]
enum Cmd {
    /// Choose a category then a task to run interactively
    Start,
    /// Select any task with fuzzy search (prints the list when not a TTY or with --plain)
    List {
        #[arg(long)]
        plain: bool,
    },
    /// Choose a script from package.json and run it with yarn
    Scripts {
        #[arg(long)]
        plain: bool,
    },
    /// Run a specific task by name
    Run { task: String },
    /// Run a set of tasks sequentially (stops at the first failure)
    #[command(name = "run-s")]
    RunS { tasks: Vec<String> },
    /// Run tasks in parallel (a failure stops the others)
    #[command(name = "run-p")]
    RunP { tasks: Vec<String> },
    /// Create a new branch — prevents working directly on Development
    Branch,
    /// Stage and commit (reduced: manual message; AI grouping not ported)
    Commit,
    /// Upgrade all packages except those listed in 'ignore-upgrade'
    Upgrade,
    /// Bump the version in package.json
    Bump {
        #[arg(long = "type")]
        kind: Option<String>,
        #[arg(long)]
        skip_git: bool,
    },
    /// Encrypt a file to <file>.encrypted
    Encrypt {
        file: PathBuf,
        #[arg(short, long)]
        yes: bool,
    },
    /// Decrypt a <file>.encrypted file
    Decrypt {
        file: PathBuf,
        #[arg(short, long)]
        yes: bool,
    },
    /// Encrypt or decrypt package.json fscripts.encryptedFiles
    Encryption {
        /// encrypt | decrypt (prompted when omitted)
        direction: Option<String>,
        #[arg(short, long)]
        yes: bool,
    },
    /// Clear recent task history
    Clear,
    /// Generate a sample fscripts.md from package.json
    Generate {
        #[arg(short, long)]
        yes: bool,
    },
    /// Regenerate the Table of Contents in fscripts.md (or the given file)
    Toc { file: Option<PathBuf> },
    /// Pick a markdown file and generate its Table of Contents
    #[command(name = "toc-file")]
    TocFile,
    /// Run diagnostics and check system health
    Doctor {
        #[arg(long)]
        fix: bool,
        #[arg(long)]
        json: bool,
    },
    /// Print a shell completion script (bash, zsh, fish, powershell, elvish)
    Completion { shell: clap_complete::Shell },
}

fn main() -> ExitCode {
    match real_main() {
        Ok(code) => ExitCode::from(code.clamp(0, 255) as u8),
        Err(e) => {
            eprintln!("\x1b[1;31merror:\x1b[0m {e:#}");
            ExitCode::from(1)
        }
    }
}

fn tty() -> bool {
    std::io::stdin().is_terminal() && std::io::stdout().is_terminal()
}

fn real_main() -> Result<i32> {
    let argv: Vec<String> = std::env::args().collect();
    // Like index.js: --env/-e/--prod/--dev may appear anywhere.
    let (profile, rest) = get_env_arg(&argv[1..]);
    let cli = Cli::parse_from(std::iter::once(argv[0].clone()).chain(rest));
    let cwd = std::env::current_dir()?;
    let cache = Cache::new(fsr::cache::default_dir());
    let opts = runner::RunOpts {
        cwd: cwd.clone(),
        self_exe: std::env::current_exe().unwrap_or_else(|_| "fsr".into()),
        profile: profile.clone(),
        quiet: false,
    };
    let load = || -> Result<parse::Parsed> {
        parse::parse_script_file(&cwd, profile.as_deref())?.context("No fscripts.md file found")
    };
    let sig = runner::install_signal_flag();
    let pick_and_run = |by_category: bool| -> Result<i32> {
        let p = load()?;
        let recent = picker::recent(&cache, &cwd.join("fscripts.md")).unwrap_or_default();
        let opts_recent = picker::recent_options(&cache, &recent);
        let Some(name) = picker::pick_task(&p, &opts_recent, by_category)? else {
            fsr::ui::log("See you soon!");
            return Ok(0);
        };
        let _ = picker::remember(&cache, &name);
        runner::run_one(&p.all_tasks, &name, &opts, &sig)
    };
    let cmd = match cli.cmd {
        Some(c) => c,
        None if !tty() => Cmd::List { plain: true },
        None => match picker::pick_command()?.as_deref() {
            None => {
                fsr::ui::log("See you soon!");
                return Ok(0);
            }
            Some("start") => Cmd::Start,
            Some("scripts") => Cmd::Scripts { plain: false },
            Some("list" | "run") => Cmd::List { plain: false },
            Some("upgrade") => Cmd::Upgrade,
            Some("bump") => Cmd::Bump {
                kind: None,
                skip_git: false,
            },
            Some("encryption") => Cmd::Encryption {
                direction: None,
                yes: false,
            },
            Some("generate") => Cmd::Generate { yes: false },
            Some("toc") => Cmd::Toc { file: None },
            Some("toc-file") => Cmd::TocFile,
            Some("doctor") => Cmd::Doctor {
                fix: false,
                json: false,
            },
            Some(other) => {
                eprintln!(
                    "'{other}' needs arguments or is not available in the Rust build yet (see `fsr --help`)."
                );
                return Ok(1);
            }
        },
    };
    match cmd {
        Cmd::Start if !tty() => {
            for c in &load()?.categories {
                println!("# {}", c.name);
                for t in &c.tasks {
                    println!(
                        "  {}  {}",
                        t.name,
                        t.description.lines().next().unwrap_or("")
                    );
                }
            }
            Ok(0)
        }
        Cmd::Start => pick_and_run(true),
        Cmd::List { plain } if !plain && tty() => pick_and_run(false),
        Cmd::List { .. } => {
            for c in &load()?.categories {
                println!("# {}", c.name);
                for t in &c.tasks {
                    let env = t
                        .env
                        .as_deref()
                        .map(|e| format!(" [env:{e}]"))
                        .unwrap_or_default();
                    println!(
                        "  {}{}  {}",
                        t.name,
                        env,
                        t.description.lines().next().unwrap_or("")
                    );
                }
            }
            Ok(0)
        }
        Cmd::Scripts { plain } => {
            let scripts = toc::package_scripts(&cwd)?;
            if plain || !tty() {
                for (k, v) in scripts {
                    println!("  {k}  {v}");
                }
                return Ok(0);
            }
            let Some(name) = picker::pick_package_script(&scripts)? else {
                return Ok(0);
            };
            let t = parse::Task {
                name: name.clone(),
                script: format!("yarn {name}"),
                lang: Some("bash".into()),
                ..Default::default()
            };
            runner::run_one(&[t], &name, &opts, &sig)
        }
        Cmd::Run { task } => runner::run_one(&load()?.all_tasks, &task, &opts, &sig),
        Cmd::RunS { tasks } => runner::run_sequence(&load()?.all_tasks, &tasks, &opts, &sig),
        Cmd::RunP { tasks } => runner::run_parallel(&load()?.all_tasks, &tasks, &opts, &sig),
        Cmd::Branch => release::cmd_branch(&cwd).map(|_| 0),
        Cmd::Commit => release::cmd_commit(&cwd).map(|_| 0),
        Cmd::Upgrade => release::cmd_upgrade(&cwd).map(|_| 0),
        Cmd::Bump { kind, skip_git } => release::cmd_bump(&cwd, kind, skip_git).map(|_| 0),
        Cmd::Encrypt { file, yes } => encryption::cmd_encrypt(&file, yes).map(|_| 0),
        Cmd::Decrypt { file, yes } => encryption::cmd_decrypt(&file, yes).map(|_| 0),
        Cmd::Encryption { direction, yes } => {
            encryption::cmd_encryption(&cwd, direction.as_deref(), yes).map(|_| 0)
        }
        Cmd::Clear => picker::clear_recent(&cache).map(|_| 0),
        Cmd::Generate { yes } => toc::cmd_generate(&cwd, yes).map(|_| 0),
        Cmd::Toc { file } => {
            toc::cmd_toc(&file.unwrap_or_else(|| cwd.join("fscripts.md"))).map(|ok| i32::from(!ok))
        }
        Cmd::TocFile => match picker::pick_markdown(&cwd)? {
            Some(f) => toc::cmd_toc(&f).map(|ok| i32::from(!ok)),
            None => {
                println!("Cancelled — no markdown file selected.");
                Ok(0)
            }
        },
        Cmd::Doctor { fix, json } => fsr::doctor::cmd_doctor(&cwd, &cache, fix, json),
        Cmd::Completion { shell } => {
            clap_complete::generate(shell, &mut Cli::command(), "fsr", &mut std::io::stdout());
            Ok(0)
        }
    }
}

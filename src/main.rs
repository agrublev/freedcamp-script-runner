use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use fsr::{env::get_env_arg, parse, runner};
use std::process::ExitCode;

#[derive(Parser)]
#[command(name = "fsr", version, about = "Runs the fscripts.md file")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// List all tasks in fscripts.md
    List,
    /// Run a specific task by name
    Run { task: String },
    /// Run a set of tasks sequentially (stops at the first failure)
    #[command(name = "run-s")]
    RunS { tasks: Vec<String> },
    /// Run tasks in parallel (a failure stops the others)
    #[command(name = "run-p")]
    RunP { tasks: Vec<String> },
    /// Encrypt a file to <file>.encrypted
    Encrypt {
        file: std::path::PathBuf,
        /// Overwrite without asking
        #[arg(short, long)]
        yes: bool,
    },
    /// Decrypt a <file>.encrypted file
    Decrypt {
        file: std::path::PathBuf,
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

fn real_main() -> Result<i32> {
    let argv: Vec<String> = std::env::args().collect();
    // Like index.js: --env/-e/--prod/--dev may appear anywhere.
    let (profile, rest) = get_env_arg(&argv[1..]);
    let cli = Cli::parse_from(std::iter::once(argv[0].clone()).chain(rest));
    let cwd = std::env::current_dir()?;
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
    match cli.cmd {
        Cmd::List => {
            let p = load()?;
            for c in &p.categories {
                println!("\x1b[1m# {}\x1b[0m", c.name);
                for t in &c.tasks {
                    let env = t
                        .env
                        .as_deref()
                        .map(|e| format!(" [env:{e}]"))
                        .unwrap_or_default();
                    println!("  {}{}  {}", t.name, env, t.description);
                }
            }
            Ok(0)
        }
        Cmd::Run { task } => runner::run_one(&load()?.all_tasks, &task, &opts, &sig),
        Cmd::RunS { tasks } => runner::run_sequence(&load()?.all_tasks, &tasks, &opts, &sig),
        Cmd::RunP { tasks } => runner::run_parallel(&load()?.all_tasks, &tasks, &opts, &sig),
        Cmd::Encrypt { file, yes } => fsr::encryption::cmd_encrypt(&file, yes).map(|_| 0),
        Cmd::Decrypt { file, yes } => fsr::encryption::cmd_decrypt(&file, yes).map(|_| 0),
        Cmd::Encryption { direction, yes } => {
            fsr::encryption::cmd_encryption(&cwd, direction.as_deref(), yes).map(|_| 0)
        }
    }
}

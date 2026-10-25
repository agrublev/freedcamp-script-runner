use clap::{Parser, Subcommand};
use fscr::{ScriptFile, run_task};
use std::path::Path;
use std::process::ExitCode;
use std::thread;

#[derive(Parser)]
#[command(name = "fsr", version, about = "Run scripts documented in fscripts.md")]
struct Cli {
    #[arg(short, long, global = true)]
    env: Option<String>,
    #[command(subcommand)]
    command: Option<Commands>,
    /// Run a task by its name, as shorthand for `run <task>`.
    task: Option<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// List available tasks.
    List,
    /// Run one named task.
    Run { task: String },
    /// Run named tasks in order.
    RunS { tasks: Vec<String> },
    /// Run named tasks concurrently.
    RunP { tasks: Vec<String> },
}

fn main() -> ExitCode {
    let mut cli = Cli::parse();
    if let Some(env) = cli.env.as_mut() {
        *env = match env.as_str() {
            "prod" => "production".into(),
            "dev" => "development".into(),
            _ => env.clone(),
        };
    }
    let parsed = match ScriptFile::read(Path::new("fscripts.md")) {
        Ok(parsed) => parsed,
        Err(error) => {
            eprintln!("{error}");
            return ExitCode::FAILURE;
        }
    };
    let parsed = cli
        .env
        .as_deref()
        .map(|env| parsed.for_env(env))
        .unwrap_or(parsed);

    match cli.command {
        Some(Commands::List) | None if cli.task.is_none() => {
            for category in &parsed.categories {
                if !category.name.is_empty() {
                    println!("\n{}", category.name);
                }
                for task in &category.tasks {
                    println!(
                        "  {}{}",
                        task.name,
                        task.description
                            .chars()
                            .next()
                            .map(|_| format!(" — {}", task.description))
                            .unwrap_or_default()
                    );
                }
            }
            ExitCode::SUCCESS
        }
        Some(Commands::Run { task }) => run_one(&parsed, &task, cli.env.as_deref()),
        Some(Commands::RunS { tasks }) => {
            let mut failed = false;
            for name in tasks {
                failed |= run_one(&parsed, &name, cli.env.as_deref()) != ExitCode::SUCCESS;
            }
            if failed {
                ExitCode::FAILURE
            } else {
                ExitCode::SUCCESS
            }
        }
        Some(Commands::RunP { tasks }) => {
            let handles: Vec<_> = tasks
                .into_iter()
                .map(|name| {
                    let task = parsed.find_task(&name).cloned();
                    let profile = cli.env.clone();
                    thread::spawn(move || match task {
                        Some(task) => run_task(&task, profile.as_deref(), false)
                            .map(|status| status.success())
                            .unwrap_or_else(|error| {
                                eprintln!("{error}");
                                false
                            }),
                        None => {
                            eprintln!("Task not found: {name}");
                            false
                        }
                    })
                })
                .collect();
            let outcomes: Vec<bool> = handles
                .into_iter()
                .map(|handle| handle.join().unwrap_or(false))
                .collect();
            if outcomes.into_iter().all(|success| success) {
                ExitCode::SUCCESS
            } else {
                ExitCode::FAILURE
            }
        }
        _ => match cli.task {
            Some(task) => run_one(&parsed, &task, cli.env.as_deref()),
            None => ExitCode::SUCCESS,
        },
    }
}

fn run_one(parsed: &ScriptFile, name: &str, profile: Option<&str>) -> ExitCode {
    match parsed.find_task(name) {
        Some(task) => match run_task(task, profile, false) {
            Ok(status) if status.success() => ExitCode::SUCCESS,
            Ok(_) => ExitCode::FAILURE,
            Err(error) => {
                eprintln!("{error}");
                ExitCode::FAILURE
            }
        },
        None => {
            eprintln!("Task not found: {name}");
            ExitCode::FAILURE
        }
    }
}

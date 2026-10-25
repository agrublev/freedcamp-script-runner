use clap::{Args, Parser, Subcommand};
use fscr::{ScriptFile, commands};
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::thread;

#[derive(Parser)]
#[command(name = "fsr", version, about = "Run scripts documented in fscripts.md")]
struct Cli {
    #[arg(
        short,
        long,
        global = true,
        help = "Filter tasks to an environment profile"
    )]
    env: Option<String>,
    #[arg(long, global = true, conflicts_with = "dev")]
    prod: bool,
    #[arg(long, global = true, conflicts_with = "prod")]
    dev: bool,
    #[command(subcommand)]
    command: Option<Commands>,
    /// Run a task by its name, as shorthand for `run <task>`.
    task: Option<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// Choose and run a task interactively.
    Start,
    /// List available fscripts.md tasks.
    List,
    /// Choose and run a package.json script.
    Scripts,
    /// Run one named task.
    Run { task: String },
    /// Run named tasks in order.
    RunS { tasks: Vec<String> },
    /// Run named tasks concurrently.
    RunP { tasks: Vec<String> },
    /// Create a feature branch when on a protected branch.
    Branch,
    /// Ask Claude to propose commits for selected changes.
    Commit,
    /// Upgrade dependencies, respecting fscripts.ignore-upgrade.
    Upgrade,
    /// Bump the package version.
    Bump {
        #[arg(value_parser = ["patch", "minor", "major"])]
        kind: Option<String>,
        #[arg(long, help = "Create and push the version git tag after bumping")]
        tag: bool,
    },
    /// Publish the package to npm.
    Publish,
    /// Show recent deployments.
    DeployHistory,
    /// Encrypt one file with an OpenSSL/CryptoJS-compatible format.
    Encrypt {
        file: Option<PathBuf>,
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
    /// Decrypt one file produced by `encrypt`.
    Decrypt {
        file: Option<PathBuf>,
        #[arg(short, long)]
        output: Option<PathBuf>,
    },
    /// Choose a file and encrypt or decrypt it.
    Encryption,
    /// Clear recent task history.
    Clear,
    /// Generate fscripts.md from package.json scripts.
    Generate {
        #[arg(long, help = "Overwrite fscripts.md without prompting")]
        force: bool,
    },
    /// Generate a table of contents in a Markdown file.
    Toc { file: Option<PathBuf> },
    /// Choose a Markdown file and generate its table of contents.
    TocFile,
    /// Run Rust environment diagnostics.
    Doctor {
        #[arg(long)]
        fix: bool,
        #[arg(long)]
        json: bool,
        #[arg(long)]
        verbose: bool,
    },
    /// List built-in, project-local, and npm plugins.
    Plugins,
    /// Run a project-local plugin (an executable `run` file or `index.js` exporting run()).
    Plugin {
        name: String,
        #[arg(trailing_var_arg = true)]
        args: Vec<String>,
    },
    /// Deploy files to a Surge subdomain.
    Deploy {
        #[arg(long)]
        files: String,
        #[arg(long)]
        subdomain: String,
    },
    /// Control task completion notifications.
    Notify(NotifyArgs),
    /// Manage shell completion scripts.
    Completion {
        #[arg(value_parser = ["install", "uninstall", "status", "generate"])]
        action: Option<String>,
        #[arg(short, long)]
        shell: Option<String>,
        #[arg(short, long)]
        force: bool,
    },
    /// Manage the shell greeting for repositories with fscripts.md.
    Greet {
        #[arg(value_parser = ["install", "uninstall", "status"])]
        action: Option<String>,
        #[arg(short, long)]
        shell: Option<String>,
        #[arg(short, long)]
        force: bool,
    },
}

#[derive(Args)]
#[group(required = false, multiple = false)]
struct NotifyArgs {
    #[arg(long)]
    enable: bool,
    #[arg(short, long)]
    disable: bool,
    #[arg(short, long)]
    status: bool,
}

fn main() -> ExitCode {
    let mut cli = match Cli::try_parse() {
        Ok(cli) => cli,
        Err(error) => {
            let args: Vec<String> = std::env::args().skip(1).collect();
            let mut index = 0;
            while index < args.len() {
                if args[index] == "--env" || args[index] == "-e" {
                    index += 2;
                } else if args[index] == "--prod" || args[index] == "--dev" {
                    index += 1;
                } else {
                    break;
                }
            }
            if let Some(name) = args.get(index).filter(|arg| !arg.starts_with('-')) {
                return command_result(commands::run_legacy_plugin_command(
                    name,
                    &args[index + 1..],
                ));
            }
            let _ = error.print();
            return ExitCode::FAILURE;
        }
    };
    let profile = if cli.prod {
        Some("production".to_owned())
    } else if cli.dev {
        Some("development".to_owned())
    } else {
        cli.env.take().map(|env| match env.as_str() {
            "prod" => "production".to_owned(),
            "dev" => "development".to_owned(),
            _ => env,
        })
    };

    match cli.command {
        Some(Commands::Start) => with_scripts(profile.as_deref(), |scripts| {
            commands::choose_task(scripts, profile.as_deref())
        }),
        Some(Commands::List) => with_scripts(profile.as_deref(), |scripts| {
            commands::choose_task(scripts, profile.as_deref())
        }),
        Some(Commands::Scripts) => command_result(commands::list_package_scripts()),
        Some(Commands::Run { task }) => with_scripts(profile.as_deref(), |scripts| {
            commands::run_one(scripts, &task, profile.as_deref())
        }),
        Some(Commands::RunS { tasks }) => with_scripts(profile.as_deref(), |scripts| {
            let mut failed = false;
            for task in tasks {
                failed |=
                    commands::run_one(scripts, &task, profile.as_deref()) != ExitCode::SUCCESS;
            }
            if failed {
                ExitCode::FAILURE
            } else {
                ExitCode::SUCCESS
            }
        }),
        Some(Commands::RunP { tasks }) => with_scripts(profile.as_deref(), |scripts| {
            let handles: Vec<_> = tasks
                .into_iter()
                .map(|name| {
                    let script = scripts.clone();
                    let env = profile.clone();
                    thread::spawn(move || {
                        commands::run_one(&script, &name, env.as_deref()) == ExitCode::SUCCESS
                    })
                })
                .collect();
            let results: Vec<_> = handles
                .into_iter()
                .map(|handle| handle.join().unwrap_or(false))
                .collect();
            if results.into_iter().all(|ok| ok) {
                ExitCode::SUCCESS
            } else {
                ExitCode::FAILURE
            }
        }),
        Some(Commands::Branch) => command_result(commands::run_git_branch()),
        Some(Commands::Commit) => command_result(commands::commit_changes()),
        Some(Commands::Upgrade) => command_result(commands::upgrade_packages()),
        Some(Commands::Bump { kind, tag }) => {
            command_result(commands::bump_version(kind.as_deref(), tag))
        }
        Some(Commands::Publish) => command_result(commands::publish_package()),
        Some(Commands::DeployHistory) => command_result(commands::deployment_history()),
        Some(Commands::Encrypt { file, output }) => encrypt_command(file, output, false),
        Some(Commands::Decrypt { file, output }) => encrypt_command(file, output, true),
        Some(Commands::Encryption) => command_result(commands::configured_encryption()),
        Some(Commands::Clear) => command_result(commands::clear_recent()),
        Some(Commands::Generate { force }) => command_result(commands::generate_scripts(force)),
        Some(Commands::Toc { file }) => command_result(commands::generate_toc(
            file.as_deref().unwrap_or(Path::new("fscripts.md")),
        )),
        Some(Commands::TocFile) => command_result(commands::choose_markdown_file()),
        Some(Commands::Doctor { fix, json, verbose }) => {
            command_result(commands::run_doctor(fix, json, verbose))
        }
        Some(Commands::Plugins) => command_result(commands::list_plugins()),
        Some(Commands::Plugin { name, args }) => command_result(commands::run_plugin(&name, &args)),
        Some(Commands::Deploy { files, subdomain }) => {
            command_result(commands::deploy(&files, &subdomain))
        }
        Some(Commands::Notify(args)) => {
            let action = if args.enable {
                "enable"
            } else if args.disable {
                "disable"
            } else {
                "status"
            };
            command_result(commands::task_notifications(action))
        }
        Some(Commands::Completion {
            action,
            shell,
            force,
        }) => command_result(commands::run_completion(
            action.as_deref().unwrap_or("status"),
            shell.as_deref(),
            force,
        )),
        Some(Commands::Greet {
            action,
            shell,
            force,
        }) => {
            if let Some(action) = action {
                command_result(commands::run_greet(&action, shell.as_deref(), force))
            } else if dialoguer::Confirm::new()
                .with_prompt("Install fscripts.md shell greeting?")
                .default(true)
                .interact()
                .unwrap_or(false)
            {
                command_result(commands::run_greet("install", shell.as_deref(), force))
            } else {
                ExitCode::SUCCESS
            }
        }
        None => match cli.task {
            Some(task) => with_scripts(profile.as_deref(), |scripts| {
                commands::run_one(scripts, &task, profile.as_deref())
            }),
            None => with_scripts(profile.as_deref(), |scripts| {
                commands::interactive(scripts, profile.as_deref())
            }),
        },
    }
}

fn with_scripts(profile: Option<&str>, run: impl FnOnce(&ScriptFile) -> ExitCode) -> ExitCode {
    match ScriptFile::read(Path::new("fscripts.md")) {
        Ok(script) => {
            let script = profile.map(|env| script.for_env(env)).unwrap_or(script);
            run(&script)
        }
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

fn command_result(result: Result<(), String>) -> ExitCode {
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

fn encrypt_command(file: Option<PathBuf>, output: Option<PathBuf>, decrypt: bool) -> ExitCode {
    match file.or_else(choose_file) {
        Some(file) => command_result(commands::encrypt_file(&file, output.as_deref(), decrypt)),
        None => ExitCode::SUCCESS,
    }
}

fn choose_file() -> Option<PathBuf> {
    let files: Vec<PathBuf> = walkdir::WalkDir::new(".")
        .max_depth(4)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| {
            entry.file_type().is_file()
                && !entry.path().components().any(|part| {
                    [".git", "node_modules", "target", ".fsr"]
                        .contains(&part.as_os_str().to_str().unwrap_or(""))
                })
        })
        .map(|entry| entry.into_path())
        .collect();
    let labels: Vec<String> = files
        .iter()
        .map(|path| path.display().to_string())
        .collect();
    match dialoguer::Select::new()
        .with_prompt("Choose a file")
        .items(&labels)
        .interact_opt()
    {
        Ok(Some(index)) => files.get(index).cloned(),
        _ => None,
    }
}

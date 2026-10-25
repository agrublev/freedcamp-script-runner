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
    /// Deploy to a specific surge domain (built-in deployment plugin)
    #[command(visible_alias = "ship")]
    Deploy {
        /// Location of files to publish
        #[arg(long)]
        files: Option<String>,
        /// What is the surge.sh subdomain
        #[arg(long)]
        subdomain: Option<String>,
    },
    /// View deployment history
    #[command(name = "deploy-history")]
    DeployHistory,
    /// Control task notifications (built-in task-notifier plugin)
    Notify {
        #[arg(short, long)]
        enable: bool,
        #[arg(short, long)]
        disable: bool,
        #[arg(short, long)]
        status: bool,
    },
    /// Install a shell greeting that reminds you to use yarn fsr when fscripts.md is present
    Greet {
        /// install | uninstall | status
        action: Option<String>,
        /// Target shell (bash or zsh)
        #[arg(short, long)]
        shell: Option<String>,
        #[arg(long)]
        force: bool,
        #[arg(short, long)]
        yes: bool,
    },
    /// Publish the package to npm (lib/release/publish.js)
    Publish {
        /// dist-tag (prompted when omitted)
        #[arg(long)]
        tag: Option<String>,
        #[arg(short, long)]
        yes: bool,
    },
    /// List all installed plugins (local .fsr/plugins and npm fscr-plugin-*)
    Plugins,
    /// Run a runnable plugin by name
    Plugin { name: String },
    /// Plugin command, or bare task shorthand (`fsr build` = `fsr run build`)
    #[command(external_subcommand)]
    External(Vec<String>),
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
    let cmd = match cli.cmd {
        Some(c) => c,
        None if !tty() => Cmd::List { plain: true },
        None => match {
            let listing = fsr::plugins::list(&cwd).unwrap_or_else(|e| {
                eprintln!("[fsr] plugins disabled: {e:#}");
                Default::default()
            });
            let builtin = fsr::ui::menu::MenuItem {
                name: "plugin:deployment".into(),
                message: "Deploy your application to various environments".into(),
            };
            let extra = std::iter::once(builtin)
                .chain(listing.plugins.iter().filter(|p| p.runnable).map(|p| {
                    fsr::ui::menu::MenuItem {
                        name: format!("plugin:{}", p.name),
                        message: p.description.clone(),
                    }
                }))
                .collect();
            picker::pick_command(extra)?
        }
        .as_deref()
        {
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
            Some("plugins") => Cmd::Plugins,
            Some("greet") => Cmd::Greet {
                action: None,
                shell: None,
                force: false,
                yes: false,
            },
            Some(p) if p.starts_with("plugin:") => Cmd::Plugin {
                name: p["plugin:".len()..].to_string(),
            },
            Some(other) => {
                eprintln!(
                    "'{other}' needs arguments or is not available in the Rust build yet (see `fsr --help`)."
                );
                return Ok(1);
            }
        },
    };
    let mut _host_keep = None;
    let notifier: std::sync::Arc<dyn runner::Hooks> =
        std::sync::Arc::new(fsr::builtins::Notifier::new(&cache));
    let mut hooks: runner::HookList = vec![notifier.clone()];
    let host_hooks: runner::HookList = if matches!(
        cmd,
        Cmd::Start
            | Cmd::List { .. }
            | Cmd::Scripts { .. }
            | Cmd::Run { .. }
            | Cmd::RunS { .. }
            | Cmd::RunP { .. }
            | Cmd::External(_)
    ) {
        match fsr::plugins::Host::start(&cwd) {
            Ok(Some(h)) => {
                let h = std::sync::Arc::new(h);
                _host_keep = Some(h.listing.clone());
                vec![h as std::sync::Arc<dyn runner::Hooks>]
            }
            Ok(None) => Vec::new(),
            Err(e) => {
                eprintln!("[fsr] plugins disabled: {e:#}");
                Vec::new()
            }
        }
    } else {
        Vec::new()
    };
    hooks.extend(host_hooks);
    // Built-in plugin commands fire hooks like loader.js registerPluginCommands.
    let with_hooks = |name: &str, f: &dyn Fn() -> Result<i32>| -> Result<i32> {
        let t = std::time::Instant::now();
        notifier.fire(
            "pre-task",
            serde_json::json!({"taskName": name, "command": name}),
        );
        match f() {
            Ok(code) => {
                let d = serde_json::json!({"taskName": name, "command": name, "duration": t.elapsed().as_millis() as u64, "success": true});
                notifier.fire("post-task", d.clone());
                notifier.fire("post-command", d);
                Ok(code)
            }
            Err(e) => {
                notifier.fire("task-error", serde_json::json!({"taskName": name, "command": name, "duration": t.elapsed().as_millis() as u64, "error": format!("{e:#}")}));
                Err(e)
            }
        }
    };
    let opts = runner::RunOpts {
        cwd: cwd.clone(),
        self_exe: std::env::current_exe().unwrap_or_else(|_| "fsr".into()),
        profile: profile.clone(),
        quiet: false,
        hooks,
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
        Cmd::Plugins => cmd_plugins(&cwd),
        Cmd::Plugin { name } if name == "deployment" => {
            with_hooks("deployment", &|| fsr::builtins::run_deployment(&cwd))
        }
        Cmd::Plugin { name } => fsr::plugins::run_plugin(&cwd, &name),
        Cmd::Deploy { files, subdomain } => with_hooks("deploy", &|| {
            fsr::builtins::cmd_deploy(&cwd, files.as_deref(), subdomain.as_deref())
        }),
        Cmd::DeployHistory => with_hooks("deploy-history", &|| {
            fsr::builtins::cmd_deploy_history(&cwd)
        }),
        Cmd::Notify {
            enable,
            disable,
            status,
        } => with_hooks("notify", &|| {
            fsr::builtins::cmd_notify(&cache, enable, disable, status).map(|_| 0)
        }),
        Cmd::Greet {
            action,
            shell,
            force,
            yes,
        } => fsr::builtins::cmd_greet(action.as_deref(), shell, force, yes),
        Cmd::Publish { tag, yes } => fsr::builtins::cmd_publish(&cwd, tag, yes),
        Cmd::External(args) => {
            let name = &args[0];
            let listing = _host_keep.clone().unwrap_or_default();
            if let Some(c) = listing
                .commands
                .iter()
                .find(|c| &c.name == name || c.aliases.contains(name))
            {
                drop(opts); // stop the hook host; the command host fires its own hooks
                return fsr::plugins::run_command(
                    &cwd,
                    &c.name,
                    &fsr::plugins::argv_json(c, &args[1..]),
                );
            }
            runner::run_one(&load()?.all_tasks, name, &opts, &sig)
        }
        Cmd::Completion { shell } => {
            clap_complete::generate(shell, &mut Cli::command(), "fsr", &mut std::io::stdout());
            Ok(0)
        }
    }
}

fn cmd_plugins(cwd: &std::path::Path) -> Result<i32> {
    let l = fsr::plugins::list(cwd)?;
    // Built-ins first (loader.js loads lib/plugins/* before local/npm).
    let b = |n: &str, d: &str| (n.to_string(), d.to_string(), "builtin".to_string());
    let mut all: Vec<(String, String, String)> = vec![
        b(
            "deployment",
            "Deploy your application to various environments",
        ),
        b("deploy", "Deploy to a specific surge domain"),
        b("deploy-history", "View deployment history"),
        b("notify", "Control task notifications"),
    ];
    all.extend(
        l.plugins
            .iter()
            .filter(|p| p.runnable)
            .map(|p| (p.name.clone(), p.description.clone(), p.source.clone())),
    );
    for c in &l.commands {
        if !all.iter().any(|a| a.0 == c.name) {
            let src = l
                .plugins
                .iter()
                .find(|p| p.name == c.plugin)
                .map(|p| p.source.clone())
                .unwrap_or_default();
            all.push((c.name.clone(), c.description.clone(), src));
        }
    }
    let log = |m: &str| {
        println!(
            "\x1b[90m{}\x1b[39m \x1b[90;1m[LOG]\x1b[0m {m}",
            chrono::Local::now().format("%H:%M:%S")
        )
    };
    if all.is_empty() {
        log("\x1b[33mNo plugins found.\x1b[39m");
        return Ok(0);
    }
    log(&format!(
        "\x1b[1m\nInstalled plugins ({}):\x1b[22m",
        all.len()
    ));
    log(&format!("\x1b[2m{}\x1b[22m", "─".repeat(60)));
    for (name, desc, src) in &all {
        let badge = match src.as_str() {
            "npm" => "\x1b[34m[npm]\x1b[39m",
            "local" => "\x1b[32m[local]\x1b[39m",
            _ => "\x1b[2m[builtin]\x1b[22m",
        };
        log(&format!(
            "  {badge} \x1b[1m{name}\x1b[22m  \x1b[2m{desc}\x1b[22m"
        ));
    }
    let npm = l.plugins.iter().filter(|p| p.source == "npm").count();
    if npm > 0 {
        log(&format!(
            "\x1b[2m\n{npm} npm plugin(s) discovered in node_modules.\x1b[22m"
        ));
    }
    log("");
    Ok(0)
}

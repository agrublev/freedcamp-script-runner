//! fsr — Rust port of freedcamp-script-runner (see `lib/` for the JS original).
pub mod cache;
pub mod crypto;
pub mod doctor;
pub mod encryption;
pub mod env;
pub mod fsutil;
pub mod hash;
pub mod parse;
pub mod picker;
pub mod release;
pub mod runner;
pub mod task;
pub mod toc;
pub mod ui;

// TODO(plugins): user plugins stay JavaScript (`lib/plugins/loader.js`). Plan: a
// small Node host (`lib/plugins/host.mjs`) spoken to over JSON lines on
// stdin/stdout for hooks (pre-task/post-task/task-error) and plugin commands,
// spawned only when plugins exist. Not implemented yet; `plugins`, `plugin`,
// `deploy`, `notify`, `greet`, `publish` remain JS-only commands.

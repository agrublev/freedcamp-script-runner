//! fsr — Rust port of freedcamp-script-runner (the JS implementation was
//! removed; `tests/support/encryption.mjs` is the only remaining JS original).
pub mod ai_commit;
pub mod builtins;
pub mod cache;
pub mod crypto;
pub mod doctor;
pub mod encryption;
pub mod env;
pub mod fsutil;
pub mod hash;
pub mod parse;
pub mod picker;
pub mod plugins;
pub mod release;
pub mod runner;
pub mod task;
pub mod toc;
pub mod ui;

// User plugins stay JavaScript and run in `src/plugins/host.mjs` (see `plugins`).

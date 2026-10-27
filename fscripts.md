- [Fun](#fun)
  * [awesome](#awesome)
  * [env:test](#envtest)
- [Build](#build)
  * [build](#build-1)
  * [watch](#watch-1)
- [Development](#development)
  * [fsr](#fsr-1)
  * [start](#start-1)
- [Release](#release)
  * [release](#release-1)
  * [release:tag](#releasetag)
- [Testing](#testing)
  * [test](#test-1)
  * [test:watch](#testwatch-1)
<!-- end toc -->

# Fun

## awesome

```bash
echo "Start Awesome:"
sleep 2
echo "End Awesome"
```

## env:test

```javascript
console.log(`The process.env.NODE_ENV is ${process.env.NODE_ENV}`);
```

# Build

Everything needed to compile the Rust binary — from a full clean rebuild to incremental compilation and file watching.

## build

Compiles the release binary to `target/release/fsr`. Run this after pulling changes or before shipping a binary locally.

```bash
cargo build --release
```

## watch

Starts `cargo watch` so every change to `src/` is recompiled and the debug binary is rebuilt automatically. Requires `cargo install cargo-watch`.

```bash
cargo watch -c -x "build --quiet"
```

# Development

Run and explore the CLI during day-to-day development.

## fsr

Launches the debug binary directly. Use after a `cargo build` to smoke-test the CLI or to open the interactive task picker.

```bash
./target/debug/fsr
```

## start

Compiles the debug binary and immediately launches the interactive CLI. The safe all-in-one command for starting a fresh development session.

```bash
cargo run
```

# Release

Scripts for cutting and publishing new versions of the binary.

## release

Bumps the version in `Cargo.toml` + `Cargo.lock` (and the metadata version in `package.json`), runs `cargo test`, then commits, tags `vX.Y.Z` and pushes. The tag triggers `.github/workflows/release-rust.yml`, which builds every platform and publishes the GitHub Release the installers download from.

```bash
sh scripts/release.sh patch
```

## release:tag

Alias for `release` — same as above, spelled for muscle memory.

```bash
sh scripts/release.sh minor
```

# Testing

All Cargo-based test commands, from a single CI pass to targeted test modules.

## test

Runs the full test suite once (unit + integration + UI snapshots). Exits with a non-zero code on failure, making it safe for CI pipelines.

```bash
cargo test
```

## test:watch

Starts the test runner in watch mode — re-runs only the affected tests on every file save. Requires `cargo install cargo-watch`.

```bash
cargo watch -c -x test
```

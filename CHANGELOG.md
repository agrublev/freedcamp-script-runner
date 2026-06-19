# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed an issue where the first keypress was intermittently swallowed when selecting commands from the interactive menu.
- Fixed malformed task notification log messages.
- Added wrap-around navigation when scrolling past the first or last item in pickers.

### Fixed

- Fixed table of contents generation failing when bundled with esbuild due to lazy-cache dependency.

### Added

- Added a hello-world example plugin demonstrating basic plugin features.
- Added plugin lifecycle hooks and improved plugin loader functionality.
- Added --plugin flag support for running CLI commands with specific plugins.

### Fixed

- Fixed shell completions to handle missing fscripts.md file gracefully

### Added

- Added cache system with CRUD operations for reading, writing, editing, and deleting cache entries.
- Added `test:coverage:open` script that generates the V8 coverage report and opens the HTML dashboard (`coverage/index.html`) cross-platform.
- Expanded the test suite to ~99.8% statement / 100% function / 99.7% branch coverage across every module (utils, parsers, generators, running, cache, completions, doctor, plugins, release, git, encryption, startScripts, and the index.js CLI), and raised coverage thresholds to 99/100/99/99.

### Fixed

- Fixed plugin loader to search multiple candidate directories and validate plugin structure before selecting the plugins directory.

- Fixed cache writes to merge object values by default instead of dropping existing keys, and added an explicit replace-value mode to overwrite stored values when needed.
- Fixed landing page SEO markup so metadata and schema are rendered in `<head>` instead of `<body>`, and added AI-crawler allow rules via `website/public/robots.txt`.
- Added freshness markers (`Last updated`) to machine-readable `llms.txt` and `pricing.md` files used by AI systems.
- Enabled `reportOnFailure` for coverage so the HTML report is written even when tests fail or thresholds are not met.
- Removed dead code surfaced by full coverage: an unused `logInfo` helper in `upgradePackages.js` and an unreachable `fs.writeFile` after `return` in the doctor cache check.
### Fixed

- Fixed completion scripts not being found when running from bundled distribution.
- Added clear error message when ANTHROPIC_API_KEY environment variable is missing.

### Fixed

- Fixed completions generator to work with updated module structure

### Fixed

- Improved diagnostics in the doctor command for better performance insights.

### Added

- Added confirmation prompt when fscripts.md already exists and improved generation to write directly to fscripts.md.

### Fixed

- Fixed cross-platform compatibility issues by using cross-spawn instead of child_process spawn/execFileSync.
- Fixed PATH environment variable construction to work correctly on Windows.

### Added

- Added AI-powered smart commit command that analyzes changes and proposes logical commit groupings.

### Added

- LICENSE, CHANGELOG, editorconfig, and GitHub issue/PR templates.

### Fixed

- JavaScript task blocks now support top-level `await` and ESM `import` (previously crashed via `require`).
- `fsr scripts` no longer crashes when selecting a package.json script.
- Timestamps in task output now show minutes correctly (were showing the month).
- `fsr bump` no longer creates an unwanted git commit/tag when you decline tagging.
- Shell completions now resolve task names correctly.
- Removed a large amount of dead/orphaned code and a destructive `doctor --fix` path that ran `npm install` without consent.

## [7.3.4]

- Baseline release.

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added cache system with CRUD operations for reading, writing, editing, and deleting cache entries.

### Fixed

- Fixed plugin loader to search multiple candidate directories and validate plugin structure before selecting the plugins directory.

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

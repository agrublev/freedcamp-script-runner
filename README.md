Freedcamp Script Runner
=======================

The best script runner of ALL time!

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@oclif/example-multi-js.svg)](https://npmjs.org/package/@oclif/example-multi-js)
[![CircleCI](https://circleci.com/gh/oclif/example-multi-js/tree/master.svg?style=shield)](https://circleci.com/gh/oclif/example-multi-js/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/oclif/example-multi-js?branch=master&svg=true)](https://ci.appveyor.com/project/oclif/example-multi-js/branch/master)
[![Codecov](https://codecov.io/gh/oclif/example-multi-js/branch/master/graph/badge.svg)](https://codecov.io/gh/oclif/example-multi-js)
[![Downloads/week](https://img.shields.io/npm/dw/@oclif/example-multi-js.svg)](https://npmjs.org/package/@oclif/example-multi-js)
[![License](https://img.shields.io/npm/l/@oclif/example-multi-js.svg)](https://github.com/oclif/example-multi-js/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g freedcamp-script-runner
$ fsr COMMAND
running command...
$ fsr (-v|--version|version)
freedcamp-script-runner/1.1.14 darwin-x64 node-v10.13.0
$ fsr --help [COMMAND]
USAGE
  $ fsr COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`fsr autocomplete [SHELL]`](#fsr-autocomplete-shell)
* [`fsr help [COMMAND]`](#fsr-help-command)
* [`fsr start [ISFIRST] [ISSECOND]`](#fsr-start-isfirst-issecond)

## `fsr autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ fsr autocomplete [SHELL]

ARGUMENTS
  SHELL  shell type

OPTIONS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

EXAMPLES
  $ fsr autocomplete
  $ fsr autocomplete bash
  $ fsr autocomplete zsh
  $ fsr autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v0.1.0/src/commands/autocomplete/index.ts)_

## `fsr help [COMMAND]`

display help for fsr

```
USAGE
  $ fsr help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.1.6/src/commands/help.ts)_

## `fsr start [ISFIRST] [ISSECOND]`

Start the task picker

```
USAGE
  $ fsr start [ISFIRST] [ISSECOND]

ARGUMENTS
  ISFIRST   This is if isFirst was passed or not returns boolean with default false
  ISSECOND

OPTIONS
  -n, --name=name  [default: flagDef] The name
  -s, --should     Should do it?

DESCRIPTION
  ...
  Picking a task to run!

ALIASES
  $ fsr e
```

_See code: [src/commands/start.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.1.14/src/commands/start.js)_
<!-- commandsstop -->

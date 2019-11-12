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
$ npm install -g fscripts
$ fsr COMMAND
running command...
$ fsr (-v|--version|version)
fscripts/1.5.5254 darwin-x64 node-v10.13.0
$ fsr --help [COMMAND]
USAGE
  $ fsr COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`fsr auto`](#fsr-auto)
* [`fsr autocomplete [SHELL]`](#fsr-autocomplete-shell)
* [`fsr config`](#fsr-config)
* [`fsr deps`](#fsr-deps)
* [`fsr help [COMMAND]`](#fsr-help-command)
* [`fsr start [ISFIRST] [ISSECOND]`](#fsr-start-isfirst-issecond)

## `fsr auto`

Describe the command here

```
USAGE
  $ fsr auto

OPTIONS
  -n, --name=name  name to print

DESCRIPTION
  ...
  Extra documentation goes here
```

_See code: [src/commands/auto.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.5.5254/src/commands/auto.js)_

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

## `fsr config`

Encrypt or decrypt your secret files

```
USAGE
  $ fsr config

OPTIONS
  -d, --direction=direction  direction {encrypt|decrypt}

DESCRIPTION
  ...
  You need to list the files in your package.json under fscripts.encryptedFiles
  "fscripts": {
       "encryptedFiles": [
           "config.json"
       ]
  },

EXAMPLES
  $ config --direction decrypt
  $ config -d encrypt
```

_See code: [src/commands/config.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.5.5254/src/commands/config.js)_

## `fsr deps`

Describe the command here

```
USAGE
  $ fsr deps

OPTIONS
  -r, --redo  Recalculate all sizes again

DESCRIPTION
  ...
  Extra documentation goes here
```

_See code: [src/commands/deps.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.5.5254/src/commands/deps.js)_

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

_See code: [src/commands/start.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.5.5254/src/commands/start.js)_
<!-- commandsstop -->

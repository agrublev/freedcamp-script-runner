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
freedcamp-script-runner/1.0.9 darwin-x64 node-v10.13.0
$ fsr --help [COMMAND]
USAGE
  $ fsr COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`fsr example [ISFIRST] [ISSECOND]`](#fsr-example-isfirst-issecond)
* [`fsr goodbye`](#fsr-goodbye)
* [`fsr hello`](#fsr-hello)
* [`fsr help [COMMAND]`](#fsr-help-command)

## `fsr example [ISFIRST] [ISSECOND]`

Example command yall

```
USAGE
  $ fsr example [ISFIRST] [ISSECOND]

ARGUMENTS
  ISFIRST   This is if isFirst was passed or not returns boolean with default false
  ISSECOND

OPTIONS
  -n, --name=name  [default: flagDef] The name
  -s, --should     Should do it?

DESCRIPTION
  ...
  Example extra
```

_See code: [src/commands/example.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.0.9/src/commands/example.js)_

## `fsr goodbye`

Describe the command here

```
USAGE
  $ fsr goodbye

OPTIONS
  -n, --name=name  name to print

DESCRIPTION
  ...
  Extra documentation goes here
```

_See code: [src/commands/goodbye.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.0.9/src/commands/goodbye.js)_

## `fsr hello`

Describe the command here

```
USAGE
  $ fsr hello

OPTIONS
  -n, --name=name  name to print

DESCRIPTION
  ...
  Extra documentation goes here
```

_See code: [src/commands/hello.js](https://github.com/agrublev/freedcamp-script-runner/blob/v1.0.9/src/commands/hello.js)_

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
<!-- commandsstop -->

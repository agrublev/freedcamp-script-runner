# Freedcamp Script Runner

The best script runner of ALL time!

# Installation

```bash
yarn add -D fscripts
```

We recommend to add the following line to your `package.json`

```json5
{
    scripts: {
        fsr: "fsr",
        start: "fsr start",
        list: "fsr list"
    }
}
```

# Usage

```bash
fsr <command> [options]
```

# Commands

```bash
fsr           Choose a script runner command
fsr start     Choose category then task to run
fsr scripts   Choose a script from package.json
fsr list      Select any task with text autocompletion
fsr run       Run a specific task
fsr run-s     Run a set of tasks one after another
fsr run-p     Run tasks in parallel
fsr clear     Clear recent task history
fsr generate  Generate a sample fscripts.md file from the package.json
fsr toc       Generate updated Table of Contents on top of the fscripts.md file


Options:
--help     Show help
--version  Show version number
```

# Examples

```bash
fsr                                 Choose a script runner command
fsr start                           Open a task selection selector
fsr scripts                         Choose a script from package.json
fsr upgrade                         Upgrade all dependencies from package.json, except ones inside the fscripts.ignore-upgrade
fsr list                            Show you all tasks you can run
fsr run start:web                   Run task 'start:web'
fsr run-s start:web start:desktop   Run task 'start:web' and afterwards 'start:desktop'
fsr run-p start:web start:desktop   Run task 'start:web' and at the same time 'start:desktop'
fsr clear                           Clear your recently run tasks
fsr generate                        Generates a sample.fscripts.md you can use as template for your fscripts file
fsr toc                             Generate updated Table of Contents on top of the fscripts.md file
```

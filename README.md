- [Freedcamp Script Runner](#freedcamp-script-runner)
- [Installation](#installation)
- [Usage](#usage)
- [Commands](#commands)
- [Examples](#examples)
<!-- end toc -->

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
fsr             Choose a script runner command
fsr branch      Create new branch instead of Development
fsr start       Choose category then task to run
fsr scripts     Choose a script from package.json
fsr list        Select any task with text autocompletion
fsr run [task]  Run a specific task
fsr upgrade     Upgrade all your packages except ones specified by
                  'ignore-upgrade':[]
fsr bump        Bump package.json and beautify it!
fsr run-s       Run a set of tasks one after another
fsr run-p       Run tasks in parallel
fsr encryption  Encrypt/Decrypt secret files
fsr clear       Clear recent task history
fsr generate    Generate a sample fscripts.md file from the package.json
fsr toc         Generate updated Table of Contents on top of the fscripts.md
                  file
```


# Examples

```bash
fsr                                Choose a script runner command
fsr                                Validates branch and creates new
fsr start                          Open a task selection selector
fsr scripts                        Choose a script from package.json
fsr list                           Show you all tasks you can run
fsr run start:web                  Run task 'start:web'
fsr upgrade                        Upgraded!
fsr bump                           BUMPED AND PRETTY!
fsr run-s start:web start:desktop  Run task 'start:web' and afterwards
                                     'start:desktop'
fsr run-p start:web start:desktop  Run task 'start:web' and at the same time
                                     'start:desktop'
fsr encryption                     Encrypt/Decrypt secret files
fsr clear                          Clear your recently run tasks
fsr generate                       Generates a sample.fscripts.md you can use
                                     as template for your fscripts file
fsr toc                            Generate updated Table of Contents on top
                                     of the fscripts.md file
```
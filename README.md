# The simplest way to run your npm type tasks

You write a beautiful & documented Markdown file, we run it for you. And you have a lot of flexibility!

Example **FcScripts.md** file:

````markdown
# Start Scripts Title

## start:web

This will start the web code below

```bash
parcel index.html
```

## start:desktop

This will start the node script

```js
console.log('RUNNING DESKTOP!')
```

# Build Scripts

## build:web

Build our main app

```bash
# note that you can directly call binaries inside node_modules/.bin
# just like how `npm scripts` works
babel src -d lib
```
````

Each section is an `h1` and task is defined using `h2` header and its child contents, the value of `h2` header will be used as task name, its following paragraphs (optional) will be used as task description, and following code block (optional) will be used as task script.

````markdown
# Start Scripts

Start running in development mode

## start:w:u

Run tasks `start:web` and `start:utils` in parallel.

## start:web

Start web with parcel

```bash
console.log("Starting web");
```

## start:utils

```bash
console.log("Starting utils");
```
````

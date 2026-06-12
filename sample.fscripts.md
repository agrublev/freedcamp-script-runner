# First category of scripts

Welcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.

## build

rimraf dist && mkdir -p dist/lib && cp -r lib/. dist/lib && cp index.js dist/index.js

```bash
rimraf dist && mkdir -p dist/lib && cp -r lib/. dist/lib && cp index.js dist/index.js
```


## fsr

node dist/index.js

```bash
node dist/index.js
```


## release

vitest run && yarn fsr bump && yarn build

```bash
vitest run && yarn fsr bump && yarn build
```


## release:publish

node lib/release/publish.js

```bash
node lib/release/publish.js
```


## start

run-s build start:run

```bash
run-s build start:run
```


## start:run

node dist/index.js

```bash
node dist/index.js
```


## watch

nodemon --watch lib --watch index.js --ext js --exec "mkdir -p dist/lib && cp -r lib/. dist/lib && cp index.js dist/index.js" --ignore 'node_modules' -I

```bash
nodemon --watch lib --watch index.js --ext js --exec "mkdir -p dist/lib && cp -r lib/. dist/lib && cp index.js dist/index.js" --ignore 'node_modules' -I
```


## test

vitest run

```bash
vitest run
```


## test:watch

vitest

```bash
vitest
```


## test:ui

vitest --ui

```bash
vitest --ui
```


## test:coverage

vitest run --coverage

```bash
vitest run --coverage
```


## test:unit

vitest run tests/unit

```bash
vitest run tests/unit
```


## test:integration

vitest run tests/integration

```bash
vitest run tests/integration
```


## test:e2e

vitest run tests/e2e

```bash
vitest run tests/e2e
```


## test:performance

vitest run tests/performance

```bash
vitest run tests/performance
```


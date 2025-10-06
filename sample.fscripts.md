# First category of scripts

Welcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.

## prebuild

rimraf dist/*

```bash
rimraf dist/*
```


## build

run-p build:index build:lib

```bash
run-p build:index build:lib
```


## build:index

babel index.js --ignore 'node_modules' --out-file dist/index.js

```bash
babel index.js --ignore 'node_modules' --out-file dist/index.js
```


## build:lib

babel lib --ignore 'node_modules' --out-dir dist/lib --copy-files

```bash
babel lib --ignore 'node_modules' --out-dir dist/lib --copy-files
```


## fsr

node dist/index.js

```bash
node dist/index.js
```


## release

run-s release:bump release:clean release:build release:publish

```bash
run-s release:bump release:clean release:build release:publish
```


## old:release:build

parcel build index.js --target node --no-cache --no-source-maps

```bash
parcel build index.js --target node --no-cache --no-source-maps
```


## release:build

run-p build:index build:lib

```bash
run-p build:index build:lib
```


## release:bump

yarn fsr bump

```bash
yarn fsr bump
```


## release:clean

rimraf dist

```bash
rimraf dist
```


## release:combined

np --any-branch

```bash
np --any-branch
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


## start:basic

babel-node index.js

```bash
babel-node index.js
```


## start:build

babel-node index.js --ignore 'node_modules'

```bash
babel-node index.js --ignore 'node_modules'
```


## start:run

node dist/index.js

```bash
node dist/index.js
```


## start:watch

nodemon --watch lib --watch index.js --ext js --exec babel-node index.js --ignore 'node_modules' -I

```bash
nodemon --watch lib --watch index.js --ext js --exec babel-node index.js --ignore 'node_modules' -I
```


## docs

npx cli-docs-generator --cli=./bin

```bash
npx cli-docs-generator --cli=./bin
```


## test1

echo 'yolo' && sleep 2 && echo 1

```bash
echo 'yolo' && sleep 2 && echo 1
```


## test2

echo '2yolo' && sleep 2 && echo 22

```bash
echo '2yolo' && sleep 2 && echo 22
```


## zb:run-s

parcel build runall/run-s/index.js --target node  --bundle-node-modules --no-cache --no-source-maps -o runs.js

```bash
parcel build runall/run-s/index.js --target node  --bundle-node-modules --no-cache --no-source-maps -o runs.js
```


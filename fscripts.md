- [Run](#run)
  * [node:script](#nodescript)
  * [say:hello](#sayhello)
  * [decrypt](#decrypt)
  * [run:s](#runs)
  * [run:p](#runp)
  * [run:one](#runone)
  * [run:one:d](#runoned)
  * [run:two](#runtwo)
  * [run:three](#runthree)
- [Samples](#samples)
  * [console:sample](#consolesample)
  * [input:sample](#inputsample)
- [Three](#three)
  * [threez](#threez)
<!-- end toc -->

# Run

Run description here **test** sasa

## node:script

Javascript ran with import

```javascript
const chalk = require("chalk");
console.log("NODEENV", process.env.NODE_ENV);
(async () => {
    console.log(` -- ${chalk.bold.red("RED")} -- `);
    await new Promise((resolve) =>
        setTimeout(() => {
            console.log("DONE");
        }, 2000)
    );
})();
```

## say:hello

JavaScript with template literals

```javascript
console.log(`HELLO!! : ${Date.now()}`);
```

## decrypt

Run encryption/decrytion with password "fscripts" to get file .config.json to become config.json

```bash
SPECIAL=test node lib/encryption/decryptConfig.js
```

## run:s

Explain sequence with **bold** stuifff and more **boldss** s

```bash
NODE_ENV=RUNSEQ yarn fsr run-s run:one run:one:d node:script run:three  run:one:d run:one run:one:d run:one
```

## run:p

Run parallel

```bash
yarn fsr run-p run:one run:one:d node:script run:one  run:one:d run:one run:one:d run:one
```

## run:one

```bash
NODE_ENV=test echo "ONE"
```

## run:one:d

```bash
sleep 1
```

## run:two

```bash
node lib/test-files/testConsole.js
```

## run:three

```bash
INPUT=THREE node lib/test-files/testInput.js
```

# Samples

Here we execute some node scripts

## console:sample

Showing some console messages with delays

```bash
node lib/test-files/consoleSample.js
```

## input:sample

Showcase asking user for input from script

```bash
node lib/test-files/inputSample.js
```

# Three

## threez

```bash
echo "Damn girl!"
```

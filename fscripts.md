- [Run](#run)
  * [node:script](#nodescript)
  * [decrypt](#decrypt)
  * [run:s](#runs)
  * [run:p](#runp)
  * [run:one](#runone)
  * [run:one:d](#runoned)
  * [run:two](#runtwo)
  * [run:three](#runthree)
- [Second](#second)
  * [runzz](#runzz)
- [Three](#three)
  * [threez](#threez)
- [four](#four)
  * [fourz](#fourz)
- [Five](#five)
  * [fivez](#fivez)
- [Five2](#five2)
  * [fivez3](#fivez3)
- [Five4](#five4)
  * [fivez5](#fivez5)
- [Five](#five-1)
  * [fivez](#fivez-1)
- [Six](#six)
  * [See](#see)
<!-- end toc -->

# Run

Run description here **test** sasa

## node:script

Javascript ran with import

```javascript
const chalk = require("chalk");
(async () => {
    console.log(` -- ${chalk.bold.red("RED")} -- `);
    await new Promise(resolve =>
        setTimeout(() => {
            console.log("DONE");
        }, 2000)
    );
})();
```

## decrypt

Run encryption/decrytion with password "fscripts" to get file .config.json to become config.json

```bash
node lib/encryption/decryptConfig.js
```

## run:s

Explain sequence with **bold** stuifff and more **boldss** s

```bash
yarn fsr run-s run:one run:one:d node:script run:one  run:one:d run:one run:one:d run:one
```

## run:p

```bash
yarn fsr run-p run:one run:one:d node:script run:one  run:one:d run:one run:one:d run:one
```

## run:one

```bash
echo "sa90a9ds"
```

## run:one:d

```bash
sleep 1
```

## run:two

```bash
node testConsole.js
```

## run:three

```bash
node testInput.js
```

# Second

second

## runzz

```bash
node testInput.js
```

# Three

## threez

```bash
echo "FUCK"
```

# four

## fourz

```bash

```

# Five

## fivez

```bash

```

# Five2

## fivez3

```bash

```

# Five4

## fivez5

```bash

```

# Five

## fivez

```bash

```

# Six

## See


```bash

```
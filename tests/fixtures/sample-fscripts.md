# Test Category One

This is a test category with bash scripts

## run:one

Simple echo command

```bash
echo "ONE"
```

## run:one:d

Command with sleep

```bash
sleep 1 && echo "DONE_SLEEP"
```

## run:three

Command with environment variable

```bash
INPUT=THREE node lib/test-files/testInput.js
```

# Test Category Two

JavaScript test scripts

## node:script

JavaScript console output

```javascript
console.log('RED');
console.log('DONE');
```

## say:hello

JavaScript with template literals

```javascript
console.log(`HELLO!! : ${Date.now()}`);
```

# Test Category Three

File-based tests

## run:two

Run test console file

```bash
node lib/test-files/testConsole.js
```

## run:four

Multiple environment variables

```bash
VAR1=value1 VAR2=value2 echo "$VAR1 $VAR2"
```

# Parallel Test Scripts

Scripts for parallel execution testing

## parallel:one

First parallel task

```bash
echo "P1" && sleep 0.5
```

## parallel:two

Second parallel task

```bash
echo "P2" && sleep 0.5
```

## parallel:three

Third parallel task

```bash
echo "P3" && sleep 0.5
```

# Error Test Scripts

Scripts that intentionally fail or have edge cases

## error:notfound

Command that doesn't exist

```bash
nonexistent_command
```

## error:exitcode

Command with non-zero exit code

```bash
exit 1
```

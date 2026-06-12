# Build Scripts

Build the project

## build:index

Build the main index file

```bash
babel index.js --out-file dist/index.js
```

## build:lib

Build library files

```bash
babel lib --out-dir dist/lib --copy-files
```

# Test Scripts

Run tests

## test:unit

Run unit tests

```bash
vitest run
```

## test:watch

Watch mode for tests

```bash
vitest
```

# Development Scripts

Development tasks

## dev:start

Start development server

```javascript
console.log('Development server started');
console.log(`Time: ${Date.now()}`);
```

## dev:clean

Clean build artifacts

```bash
rm -rf dist
```

# Utility Scripts

Utility tasks

## echo:test

Echo a test message

```bash
echo "TEST_OUTPUT"
```

## sleep:short

Sleep for 1 second

```bash
sleep 1 && echo "DONE"
```

## env:test

Test environment variables

```bash
TEST_VAR=hello echo $TEST_VAR
```

## The simplest way to run your npm type tasks

You write a beautiful & documented Markdown file, we run it for you. And you have a lot of flexibility!

Example **.fscripts.md** file :

````markdown
# Group 1
           
## run

```bash
echo 'start'; sleep 4; echo 'done'
```


## run:s

```bash
yarn fsr run-s run:one run:two
```

## run:one

```js
console.log("ONEEE");
```

## run:two

```js
console.log("TWOOOO");
```
````

Each section is an `h1` and task is defined using `h2` header and its child contents, the value of `h2` header will be used as task name, its following paragraphs (optional) will be used as task description, and following code block (optional) will be used as task script.

````markdown
# Start Scripts

Start running in development mode

## start:w:u

Run tasks `start:web` and `start:utils` in parallel.

```bash
fsr run-s start:web start:utils
```

````

## Password for encrypted file is test52 

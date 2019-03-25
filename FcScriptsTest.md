

<!-- toc -->

- [Deploy](#deploy)
  * [deploy](#deploy)
  * [deploy:one](#deployone)
  * [deploy:two](#deploytwo)
- [Group 1](#group-1)
  * [run](#run)
  * [run:s](#runs)
  * [run:one](#runone)
  * [run:two](#runtwo)

<!-- tocstop -->

# Deploy

## deploy

```bash
yarn fsr run-s deploy:one deploy:two
```

## deploy:one

```bash
surge test somedomain52.surge.sh
```

## deploy:two

```bash
surge test gray-pan.surge.sh
```

# Group 1
           
## run

```bash
echo 'start'; sleep 2; echo 'done'
```


## run:s

```bash
yarn fsr run-s run run:two
```

## run:one

```js
console.log("ONEEE");
```

## run:two

```js
console.log("TWOOOO");
```

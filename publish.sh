#!/usr/bin/env bash

npm version patch -f
yarn pack
npm publish
npm i -g freedcamp-script-runner@latest

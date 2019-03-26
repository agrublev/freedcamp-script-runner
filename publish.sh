#!/usr/bin/env bash

#npm version --patch
yarn pack
npm publish
npm i -g freedcamp-script-runner@latest

const fs = require('fs')
const md2json = require('md-2-json')
const test = require('./bin/index.js')
var toc = require('markdown-toc')
const path = require('path')
const flp = path.resolve(process.cwd(), '/FcScripts.md')

// console.log(toc.insert('./FcScripts.md'))
// const runner = test({
//   version: false,
//   v: false,
//   help: false,
//   h: false,
//   quiet: false,
//   path: 'FcScripts.md',
//   p: 'FcScripts.md',
//   '--': []
// })
// runner.runList([])
fs.readFile('FcScripts.md', 'utf8', function(err, contents) {
  // console.log(toc(contents),toc(contents).content)
  fs.writeFile('mddd.md', toc.insert(contents))
})
//
// console.log('after calling readFile')

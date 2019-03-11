const parseMarkdown = require('./parseMarkdown')
const loadFile = require('./loadFile')
const execa = require('execa')
const prependFile = require('prepend-file')

const exec = command => {
  execa.shell(command)
  //const output =
  // output.stdout.pipe(process.stdout)
  // output.stderr.pipe(process.stderr)
}

module.exports = async section => {
  const { path: filepath, data } = loadFile.loadSync([
    'FcScripts.md',
    'contributing.md',
    'CONTRIBUTING.md',
    'README.md',
    'readme.md'
  ])
  if (!filepath) return null
  // toc.insert(filepath)
  if (data.indexOf('<!-- toc -->') === -1) {
    prependFile.sync(filepath, '<!-- toc -->')
  }
  exec('npx markdown-toc FcScripts.md -i')
  let newContent = data.replace(/(<!-- toc -->(\s|\S)*?<!-- tocstop -->)/g, '')
  return parseMarkdown(newContent, { section, filepath })
}
//const parseMarkdown = require('./parseMarkdown')
// const fs = require('fs')
// const path = require('path')
// const flp = path.resolve(process.cwd(), '/FcScripts.md')
// const loadFile = require('./loadFile')
//
// module.exports = section => {
//   const { path: filepath, data } = loadFile.loadSync([
//     'FcScripts.md',
//     'contributing.md',
//     'CONTRIBUTING.md',
//     'README.md',
//     'readme.md'
//   ])
//   if (!filepath) return null
//   console.warn('-- Console fil', filepath, data)
//   let contents = fs.readFileSync(filepath, 'utf8')
//
//   // fs.readFile(, 'utf8', function(
//   //   err,
//   //   contents
//   // ) {
//   // console.log(contents)
//   return parseMarkdown(data, { section, filepath })
//   // })
//   // console.warn(data);
// }

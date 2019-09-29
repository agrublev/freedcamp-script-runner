parcelRequire=function(e,r,t,n){var i,o="function"==typeof parcelRequire&&parcelRequire,u="function"==typeof require&&require;function f(t,n){if(!r[t]){if(!e[t]){var i="function"==typeof parcelRequire&&parcelRequire;if(!n&&i)return i(t,!0);if(o)return o(t,!0);if(u&&"string"==typeof t)return u(t);var c=new Error("Cannot find module '"+t+"'");throw c.code="MODULE_NOT_FOUND",c}p.resolve=function(r){return e[t][1][r]||r},p.cache={};var l=r[t]=new f.Module(t);e[t][0].call(l.exports,p,l,l.exports,this)}return r[t].exports;function p(e){return f(p.resolve(e))}}f.isParcelRequire=!0,f.Module=function(e){this.id=e,this.bundle=f,this.exports={}},f.modules=e,f.cache=r,f.parent=o,f.register=function(r,t){e[r]=[function(e,r){r.exports=t},{}]};for(var c=0;c<t.length;c++)try{f(t[c])}catch(e){i||(i=e)}if(t.length){var l=f(t[t.length-1]);"object"==typeof exports&&"undefined"!=typeof module?module.exports=l:"function"==typeof define&&define.amd?define(function(){return l}):n&&(this[n]=l)}if(parcelRequire=f,i)throw i;return f}({"xQie":[function(require,module,exports) {

const e=require("sort-object-keys"),n=require("detect-indent"),s=["name","version","description","keywords","sideEffects","main","umd:main","unpkg","module","workspaces","scripts","betterScripts","fscripts","source","jsnext:main","browser","homepage","bugs","repository","private","license","author","contributors","files","types","typings","style","example","examplestyle","assets","bin","man","directories","husky","pre-commit","commitlint","lint-staged","config","nodemonConfig","browserify","babel","browserslist","xo","prettier","eslintConfig","eslintIgnore","stylelint","jest","dependencies","devDependencies","peerDependencies","bundledDependencies","bundleDependencies","optionalDependencies","flat","resolutions","engines","engineStrict","os","cpu","preferGlobal","publishConfig"],r=["install","pack","prepare","publish","restart","shrinkwrap","start","stop","test","uninstall","version"];function t(t,i={}){const o=i.sortOrder||s;let c=!1,p=!1,l="",a=2;if("string"==typeof t){c=!0,a=n(t).indent,"\n"===t.substr(-1)&&(l="\n");const e=t.match(/(\r?\n)/);p="\r\n"===(e&&e[0]),t=JSON.parse(t)}const u=/^(pre|post)(.)/,d=r.slice();function f(n,s,r){if(Array.isArray(t[n]))return t[n]=t[n].sort(),void(r&&(t[n]=t[n].filter((e,n,s)=>n==s.indexOf(e))));"object"==typeof t[n]&&(t[n]=e(t[n],s))}function b(e){const n=e.replace(u,"$2");return d.includes(n)?n:e}function m(e,n){if(e===n)return 0;const s=b(e),r=b(n);return s===r?e===`pre${s}`||n===`post${r}`?-1:1:s<r?-1:1}if("object"==typeof t.scripts&&Object.keys(t.scripts).forEach(e=>{const n=e.replace(u,"$2");t.scripts[n]&&!d.includes(n)&&d.push(n)}),f("keywords",null,!0),f("homepage"),f("bugs",["url","email"]),f("license",["type","url"]),f("author",["name","email","url"]),f("bin"),f("man"),f("directories",["lib","bin","man","doc","example"]),f("repository",["type","url"]),f("scripts",m),f("betterScripts",m),f("commitlint"),f("lint-staged"),f("config"),f("nodemonConfig"),f("browserify"),f("babel"),f("eslintConfig"),f("jest"),f("xo"),f("prettier"),f("dependencies"),f("devDependencies"),f("peerDependencies"),f("bundledDependencies"),f("bundleDependencies"),f("optionalDependencies"),f("resolutions"),f("engines"),f("engineStrict"),f("os"),f("cpu"),f("preferGlobal"),f("private"),f("publishConfig"),t=e(t,o),c){let e=JSON.stringify(t,null,a)+l;return p&&(e=e.replace(/\n/g,"\r\n")),e}return t}if(module.exports=t,module.exports.sortPackageJson=t,module.exports.sortOrder=s,require.main===module){const e=require("fs");(process.argv[2]?process.argv.slice(2):[`${process.cwd()}/package.json`]).forEach(n=>{const s=e.readFileSync(n,"utf8"),r=t(s);r!==s&&(e.writeFileSync(n,r,"utf8"),console.log(`${n} is sorted!`))})}
},{}],"tplV":[function(require,module,exports) {

const e=require("versiony"),r=require("inquirer"),t=require("prettier"),i=require("path"),o=require("chalk"),n=require("fs"),a=require("./sort.js");let s=i.resolve(process.cwd(),"package.json");n.existsSync(s)||(logError("Cannot find package.json file in the current directory"),process.exit(1));const c=async()=>{const i=await new Promise(e=>{r.prompt([{type:"list",message:o.green.bold.underline("How big of a bump is this?"),choices:["patch","minor","major"],name:"retType"}]).then(async({retType:r})=>{e(r)})}),c=e.from(s);"patch"===i&&c.patch(),"minor"===i&&c.minor().patch(0),"major"===i&&c.major().patch(0).minor(0),c.to(s).end();let p=await n.readFileSync(s,"utf8"),m="";p=JSON.stringify(a(JSON.parse(p)));try{m=t.format(p,{printWidth:20,tabWidth:4,singleQuote:!1,trailingComma:"none",bracketSpacing:!0,semi:!0,useTabs:!0,parser:"json",jsxBracketSameLine:!1})}catch(l){console.info("-- Console ERR",l)}await n.writeFileSync(s,m,"utf8")};module.exports=c;
},{"./sort.js":"xQie"}],"J6HI":[function(require,module,exports) {
const e=require("fs-extra"),r=require("chalk"),t=require("boxen"),n=1/6,a=1/3,o=2/3,c={emptyDir:async r=>{try{await e.emptyDir(r)}catch(t){console.error(t)}}},i=1533,s={mode:1533};c.ensureDir=(async(r,t=s)=>{try{await e.ensureDir(r,t)}catch(n){console.error(n)}}),c.ensureFile=(async r=>{try{await e.ensureFile(r)}catch(t){console.error(t)}}),c.pathExists=(async r=>{return await e.pathExists(r)}),c.readJson=(async r=>{try{return await e.readJson(r)}catch(t){return console.error(t),{}}}),c.readFile=(async r=>{try{return await e.readFileSync(r,"utf8")}catch(t){return console.error(t),{}}}),c.removeFile=(async r=>{try{return await e.remove(r)}catch(t){return console.error(`File ${r} NOT REMOVED! ${t}`),!1}}),c.writeFile=(async(r,t="")=>{try{return e.writeFileSync(r,t,"utf-8")}catch(n){console.error(n)}}),c.writeJson=(async(r,t={})=>{try{await e.writeJson(r,t)}catch(n){console.error(n)}}),c.chainAsync=(e=>{let r=0;const t=e[e.length-1],n=()=>{const a=e[r++];a===t?a():a(n)};n()}),c.appendToFile=(async(r,t="")=>{try{await e.appendFileSync(r,t)}catch(n){console.error(n)}}),c.boxInform=(async(e,n="",a=0,o={left:2,top:0,bottom:0,right:0})=>{console.log(t(r.hex("#717877")(e)+"\n"+r.bold.underline.hex("#438b34")(n)+r.hex("#717877")(" "),{padding:a,margin:o,borderStyle:{topLeft:r.hex("#5a596d")("╔"),topRight:r.hex("#5a596d")("╗"),bottomLeft:r.hex("#5a596d")("╚"),bottomRight:r.hex("#5a596d")("╝"),horizontal:r.hex("#5a596d")("═"),vertical:r.hex("#5a596d")("║")},align:"center"}))});const l=(e,r,t)=>(t<0&&(t+=1),t>1&&(t-=1),t<1/6?e+6*(r-e)*t:t<.5?r:t<2/3?e+(r-e)*(2/3-t)*6:e),h=(e,r,t)=>{if(0===r)return new Array(3).fill(t);const n=t<.5?t*r+t:t+r-t*r,a=2*t-n;return[l(a,n,e+1/3),l(a,n,e),l(a,n,e-1/3)]};c.rainbowGradient=((e,r=1,t=.5)=>{const n=[];for(let a=0;a<e;a++)n.push(h(a/e,r,t).map(e=>Math.round(255*e)));return n}),module.exports=c;
},{}],"gevp":[function(require,module,exports) {
const e=require("chalk"),s=require("inquirer"),{appendToFile:r,writeFile:a,boxInform:n,readJson:c,readFile:i}=require("./helpers.js"),o=require("path"),t=process.cwd(),p=o.join(t,"package.json"),l={scripts:[]};let h="# First category of scripts\n\nWelcome to your new amazing fscripts.md file. It replaces the headaches of npm scripts! But so much more.\n";l.init=(async()=>{try{l.packageJson=await c(p),Object.keys(l.packageJson.scripts).forEach(e=>{h+=`\n## ${e}\n\n${l.packageJson.scripts[e]}\n\n\`\`\`bash\n${l.packageJson.scripts[e]}\n\`\`\`\n\n`}),await a("./sample.fscripts.md",h)}catch(e){console.error(e)}}),module.exports=l.init;
},{"./helpers.js":"J6HI"}],"E6PL":[function(require,module,exports) {
"use strict";function e(e){for(var r=1;r<arguments.length;r++){var n=null!=arguments[r]?arguments[r]:{},c=Object.keys(n);"function"==typeof Object.getOwnPropertySymbols&&(c=c.concat(Object.getOwnPropertySymbols(n).filter(function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),c.forEach(function(r){t(e,r,n[r])})}return e}function t(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}const r=require("joycon"),n=require("path"),c=require("chalk"),s=new r({stopDir:n.dirname(process.cwd())}),a=(e,t="")=>Object.keys(e).reduce((r,n)=>{const c=t.length?t+".":"";return"object"==typeof e[n]?Object.assign(r,a(e[n],c+n)):r[c+n]=e[n],r},{}),i=require("marked");let o=function(t){let r=i.lexer(t),n=(r=r.filter(e=>"space"!==e.type)).slice(),c={},s="",a="",o=0;n.forEach((e,t)=>{if("heading"===e.type&&1===e.depth){o=0,s=e.text,c[s]={name:e.text,tasks:{},description:""};let n=r[t+1];"paragraph"===n.type&&(c[s].description=n.text)}else if("heading"===e.type&&2===e.depth){a=e.text,c[s].tasks[a]={script:"",name:a,description:"",order:o},o++;let n=r[t+1],i=r[t+2];"paragraph"===n.type&&"code"===i.type?(c[s].tasks[a].description=n.text,c[s].tasks[a].script=i.text):"code"===n.type&&(c[s].tasks[a].script=n.text)}});let p=[];return{categories:Object.keys(c).map(t=>{let r=c[t].tasks,n=Object.keys(r).map(e=>r[e]);return p=[...p,...n],e({name:t},c[t])}),allTasks:p}};const p=async()=>{const{path:e,data:t}=s.loadSync(["fscripts.md"]);if(e){let e=t.split("\x3c!-- end toc --\x3e");return e=e[2===e.length?1:0],o(e)}return!1};module.exports=p;
},{}],"7tUf":[function(require,module,exports) {
const e=require("path"),r=require("chalk");require("markdown-toc");const t=require("joycon"),n=require("markdown-toc"),o=new t({stopDir:e.dirname(process.cwd())}),{writeFile:s}=require("./helpers.js"),c=async()=>{const{path:e,data:t}=o.loadSync(["fscripts.md"]);if(!e)return console.warn(`${r.bold.red("You're missing the fscripts.md file!")}\n${r.green("Please run 'fsr generate' to get started!")}`),process.exit(0),null;{console.warn(`${r.bold.green("Located fscripts.md file!")}`);let e="",o=t.split("\x3c!-- end toc --\x3e");e=2===o.length?n(o[1]).content+"\n\x3c!-- end toc --\x3e\n\n"+o[1].trim():n(t).content+"\n\x3c!-- end toc --\x3e\n\n"+t.trim(),await s("./fscripts.md",e)}};module.exports=c;
},{"./helpers.js":"J6HI"}],"ySTt":[function(require,module,exports) {
const e=require("fs"),r=require("path"),s=require("child_process"),o=require("chalk"),n=e=>{console.log(o.red("[Error]: "+e))},t=e=>{console.log(o.blue("[Start]: "+e))},c=e=>{console.log(o.green("[Done]: "+e))};let i="",l=r.resolve(process.cwd(),"package.json");e.existsSync(l)||(n("Cannot find package.json file in the current directory"),process.exit(1));const a=require(l);let d=[];const p=async()=>{a.fscripts&&a.fscripts["ignore-upgrade"]&&(d=a.fscripts["ignore-upgrade"]);let o={before:{},after:{}};for(let i of["dependencies","devDependencies","peerDependencies"])if(a[i]){let p=`yarn add ${Object.keys(a[i]).filter(e=>!d.includes(e)).map(e=>(o.before[e]=a[i][e],e+"@latest")).join(" ")}`;try{s.execSync(p,{stdio:"inherit",env:Object.assign({},process.env,{FORCE_COLOR:!0,PATH:`${r.resolve("node_modules")}:${process.env.PATH}`})});const a=JSON.parse(e.readFileSync(l));let f=Object.keys(a[i]).filter(e=>!d.includes(e)).map(e=>(o.after[e]=a[i][e],o.before[e]!==o.after[e]?`Updated: ${e} from: ${o.before[e]} | to: ${o.after[e]}\n`:"")).join("");c(f)}catch(t){n(`${p} - ${t}`)}}};module.exports=p;
},{}],"e+FD":[function(require,module,exports) {
const e=require("chalk"),o=require("path"),r=require("moment"),s=require("cross-spawn");module.exports=(async({script:n,task:c,type:t=n.type},i=!1)=>(i||console.log(`${e.green.bgHex("#181c24").bold("["+r().format("HH:MM:SS")+"]")}${e.bgHex("#181c24").bold.hex("#8c91a7")(" "+c.name+": ")}`),new Promise(r=>{s(t,[...n.rest],{stdio:"inherit",env:Object.assign({},process.env,{FORCE_COLOR:!0,PATH:`${o.resolve("node_modules/.bin")}:${process.env.PATH}`})}).on("close",o=>{0===o?r():console.error(`${e.red("ERROR")} ${o}`)})})));
},{}],"ZR+/":[function(require,module,exports) {
const e=require("./runCLICommand"),n=require("chalk"),s=async(s,i)=>{for(let t in s){let a=s[t],l=i.allTasks.findIndex(e=>e.name===a);if(-1===l)console.log(`${n.red.underline("Skipping task "+a+", as it cannot be found in .md file")}`);else{let n=i.allTasks[l].script.split(" "),s=n.shift();await e({task:{name:a},script:{type:s,rest:n}})}}};module.exports=s;
},{"./runCLICommand":"e+FD"}],"FQHP":[function(require,module,exports) {
const s=require("./runCLICommand"),e=async(e,t)=>{for(let a in e){let n=e[a],l=t.allTasks.findIndex(s=>s.name===n),r=t.allTasks[l].script.split(" "),i=r.shift();s({task:{name:n},script:{type:i,rest:r}})}};module.exports=e;
},{"./runCLICommand":"e+FD"}],"7oAW":[function(require,module,exports) {
const e=require("inquirer"),t="   ~   ",r=require("chalk"),n=e=>{let t=e.match(/(\*\*|^\*\*)(?=\S)([\s\S]*?\S)\*\*(?![\*\*\S])/g);null!==t&&t.forEach(t=>{e=e.replace(t,r.bold.redBright(t.replace(/\*\*/g,"")))});let n=e.match(/(_|^_)(?=\S)([\s\S]*?\S)_(?![_\S])/g);return null!==n&&n.forEach(t=>{e=e.replace(t,r.underline.greenBright(t.replace(/\_\_/g,"")))}),e},a=async(t,a)=>new Promise(l=>{let i=[...a,{name:"-------------",value:null},...t.categories.map(e=>({name:`${r.bold.underline.green(e.name)}    ~    ${n(e.description)}`,value:e.name}))];e.prompt([{type:"list",name:"category",message:"What category do you want to run?",choices:i}]).then(({category:r})=>{let a=i.indexOf("-------------"),s=i.indexOf(r);if(null===r)console.log("Can't select divider");else if(s<a){let e=r.split("   ~   ")[0].trim();l(e)}else{let a=r.split("   ~   ")[0],i=t.categories.findIndex(e=>e.name===a);i=t.categories[i];let s=Object.keys(i.tasks).map(e=>{let t=i.tasks[e];return`${e} ${t.description?"   ~   "+t.description.replace(/\n/g," ").trim():""}`});s=n(s),e.prompt([{type:"list",name:"taskToRun",message:"Which task do you want to run",choices:s}]).then(({taskToRun:e})=>{e=e.split("   ~   ")[0].trim(),l(e)})}})});module.exports=a;
},{}],"UCFQ":[function(require,module,exports) {
"use strict";const e=require("path"),r=require("chalk"),s=e.join(process.cwd(),"./package.json"),{readJson:a}=require("./helpers"),c=async()=>{return(await a(s)).scripts};module.exports=c;
},{"./helpers":"J6HI"}],"JJn1":[function(require,module,exports) {
const e=require("./taskList"),t="   ~   ",a=require("conf"),s=new a,r=require("moment"),c=require("chalk"),n=require("./parseScriptsMd.js"),i=require("./parseScriptsPackage.js"),l=require("./runCLICommand"),{prompt:o}=require("enquirer"),u=async e=>{try{let{answer:a}=await o({type:"autocomplete",message:`${c.green.bold.underline("Choose task to run")}`,choices:e,name:"answer"});return a.split("   ~   ")[0].trim()}catch(t){return!1}},p=async(t=!0)=>{console.clear();const a=await n();if(!1===a)return!1;let c,i=s.get("recentTasks",{}),o=Object.keys(i).map(e=>{return{name:e,lastExecuted:i[e].lastExecuted}}).sort((e,t)=>e.lastExecuted>t.lastExecuted?1:t.lastExecuted>e.lastExecuted?-1:0).reverse().slice(0,3).map(e=>e.name+"   ~   "+r(e.lastExecuted).calendar());if(t)c=await e(a,o);else{let e=a.allTasks;c=await u(e.map(e=>`${e.name}   ~   ${e.description}`))}void 0===i[c]?i[c]={lastExecuted:Date.now()}:i[c].lastExecuted=Date.now(),s.set("recentTasks",i);let p=a.allTasks.findIndex(e=>e.name===c),m=a.allTasks[p].script.split(" "),d=m.shift();await l({task:{name:c},script:{type:d,rest:m}})},m=async()=>{console.clear();const e=await i();let t=Object.keys(e).map(t=>({name:t,script:e[t]})),a=await u(t.map(e=>`${e.name}   ~   ${e.script}`));if(!1===a)return console.log(c.green.bold("See you soon!")),!1;await l({task:{name:a},script:{type:"yarn",rest:[a]}})},d=async()=>{s.set("recentTasks",{})};module.exports={startScripts:p,taskListAutoComplete:u,clearRecent:d,startPackageScripts:m};
},{"./taskList":"7oAW","./parseScriptsMd.js":"E6PL","./parseScriptsPackage.js":"UCFQ","./runCLICommand":"e+FD"}],"DPDa":[function(require,module,exports) {
const e="   ~   ",a=require("chalk"),{prompt:s}=require("enquirer"),t=async()=>{let e=[{name:"start",message:"Choose category then task to run"},{name:"list",message:"Select any task with text autocompletion"},{name:"scripts",message:"Choose a script from package.json"},{name:"upgrade",message:"Upgrade all your packages except ones specified by 'ignore-upgrade':[]"},{name:"bump",message:"Bump package.json and beautify it!"},{name:"encryption",message:"Encrypt/Decrypt secret files"},{name:"clear",message:"Clear recent task history"},{name:"generate",message:"Generate a sample fscripts.md file from the package.json"},{name:"toc",message:"Generate updated Table of Contents on top of the fscripts.md file"},{name:"--help",message:"See full help documentation"}];try{let{answer:n}=await s({type:"select",name:"answer",choiceMessage:e=>a.bold.underline.black(e.name+":"+a.gray(" "+e.message)),message:`${a.cyan.bold.underline("Whatz category do you want to run?")}`,choices:e});return n}catch(t){return!1}};module.exports=t;
},{}],"UQAN":[function(require,module,exports) {
const e=require("inquirer"),r=require("chalk"),n=require("boxen"),{boxInform:s}=require("../helpers.js"),t=require("git-state"),a=require("simple-git"),o=process.cwd(),c=async e=>{try{childProcess.execSync(`git -c core.quotepath=false -c log.showSignature=false checkout -b ${e}`,{stdio:"inherit",env:Object.assign({},process.env,{FORCE_COLOR:!0,PATH:`${path.resolve("node_modules")}:${process.env.PATH}`})})}catch(n){}s(r.green(`New branch ${e} created`,"",5))};async function i(){return new Promise(n=>{e.prompt([{type:"input",message:r.bold.hex("#38be18")("Name new feature branch (or type cancel):"),name:"branchname"}]).then(async({branchname:e})=>{"Development"!==e&&await c(e),n()})})}const l=async()=>{await new Promise(async e=>{const s=require("simple-git/promise");"Development"===(await s(__dirname).status()).current?(console.clear(),console.log(n(r.bold.underline.red("DO NO MAKE CHANGES IN DEV!"),{padding:2})),await new Promise(e=>setTimeout(()=>{e()},1e3)),await i(),e()):e()})};module.exports=l;
},{"../helpers.js":"J6HI"}],"n6tx":[function(require,module,exports) {
function e(e){for(var r=1;r<arguments.length;r++){var n=null!=arguments[r]?arguments[r]:{},i=Object.keys(n);"function"==typeof Object.getOwnPropertySymbols&&(i=i.concat(Object.getOwnPropertySymbols(n).filter(function(e){return Object.getOwnPropertyDescriptor(n,e).enumerable}))),i.forEach(function(r){t(e,r,n[r])})}return e}function t(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}const r=require("crypto-js"),n=require("chalk");var i=require("inquirer");const{appendToFile:o,ensureFile:a,writeFile:s,boxInform:c,readJson:p,readFile:l}=require("../helpers.js"),y=require("path"),d=process.cwd(),u=y.join(d,"./"),g=y.join(u,"package.json"),w=y.join(u,".gitignore"),m=require("prettier"),f={encryptedFiles:[],encrypt:async(e,t,o)=>{let c=!0;if(await a(t)&&(console.log(`${n.bold.red("FILE ALREADY EXISTS ARE YOU SURE?")}`),c=await new Promise(e=>{i.prompt([{type:"confirm",message:n.bold.hex("#38be18")("Sure? (y/n): "),name:"sure"}]).then(({sure:t})=>{e(t)})})),c){let n=await l(o);const i=r.AES.encrypt(n,e);await s(t,i.toString())}},decrypt:async(e,t,o)=>{let c=!0;if(await a(o)&&(console.log(`${n.bold.red("FILE ALREADY EXISTS ARE YOU SURE?")}`),c=await new Promise(e=>{i.prompt([{type:"confirm",message:n.bold.hex("#38be18")(`Sure wanna override file ${o}? (y/n): `),name:"sure"}]).then(({sure:t})=>{e(t)})})),c){let i=await l(t);const a=r.AES.decrypt(i,e);let c;try{c=a.toString(r.enc.Utf8)}catch(p){console.error("-- Console Problem ",p)}await s(o,c),console.warn(`${n.bold.green.underline("DECRYPTED FILE:")} ${n.bold.dim(y.join(d,o))}`)}},init:async()=>{try{let t=await f.getPass(),r=await f.toEncrypt();if(f.packageJson=await p(g),f.ignore=await l(w),f.ignoredFiles=f.ignore.split("\n"),f.packageJson.fscripts&&f.packageJson.fscripts.encryptedFiles){f.encryptedFiles=f.packageJson.fscripts.encryptedFiles;let e="\n";for(const n of f.encryptedFiles){-1===f.ignoredFiles.indexOf(n)&&(e+=n+"\n");let i=(n+"").split("/"),o=i.pop(),a=i.slice(),s=i.slice();a.push("."+o),a=y.join(u,a.join("/")),s.push(o),s=y.join(u,s.join("/")),r?await f.encrypt(t,a,s):await f.decrypt(t,a,s)}e.trim().length>0&&(await o(w,e+"\n"),c(" Added files to .gitignore: ",e))}}catch(e){console.error(e)}},getPass:async()=>await new Promise(e=>{i.prompt([{type:"password",mask:n.underline(" ●"),message:n.bold.hex("#38be18")("Enter a SECRET key (same as pass app) : "),name:"pass"}]).then(({pass:t})=>{e(t)})}),toEncrypt:async()=>await new Promise(e=>{i.prompt([{type:"list",message:n.bold.hex("#38be18")("Which direction?"),choices:["encrypt","decrypt"],name:"encryptDecrypt"}]).then(async({encryptDecrypt:t})=>{e("encrypt"===t)})})};module.exports=e({},f);
},{"../helpers.js":"J6HI"}],"Focm":[function(require,module,exports) {

const e=require("./lib/release/bump.js"),a=require("chalk"),t=require("./lib/generateFScripts.js"),n=require("./lib/parseScriptsMd.js"),s=require("./lib/generateToc"),r=require("./lib/upgradePackages"),i=require("./lib/runSequence"),c=require("./lib/runParallel"),o=require("./lib/runCLICommand"),{startPackageScripts:p,startScripts:l,clearRecent:m}=require("./lib/startScripts.js"),u=a.rgb(39,173,96).bold.underline,d=a.rgb(159,161,181),f=require("./lib/optionList"),$=require("./lib/git/validateNotDev.js"),y=require("./lib/encryption/encryption");(async()=>{0===require("yargs").usage("Usage: $0 <command> [options]").command("","Choose a script runner command",e=>{},async function(){}).example(`${u("$0")}`,`${d("Choose a script runner command")}`).command("branch","Create new branch instead of Development",e=>{},async function(){await $()}).example(`${u("$0")}`,`${d("Validates branch and creates new")}`).command("start","Choose category then task to run",e=>{},async function(){!1===await l()&&await p()}).example(`${u("$0 start")}`,`${d("Open a task selection selector")}`).command("scripts","Choose a script from package.json",e=>{},async function(){await p()}).example(`${u("$0 scripts")}`,`${d("Choose a script from package.json")}`).command("list","Select any task with text autocompletion",()=>{},async function(e){await l(!1)}).example(`${u("$0 list")}`,`${d("Show you all tasks you can run")}`).command("run","Run a specific task",()=>{},async function(e){let a=e._[1];const t=await n();let s=t.allTasks.findIndex(e=>e.name===a),r=t.allTasks[s].script.split(" "),i=r.shift(),c=r.join(" ");c+=" "+Object.keys(e).filter(e=>"_"!==e&&"$0"!==e).map(a=>` --${a}=${e[a]}`).join(" "),await o({task:{name:a},script:{type:i,rest:c.split(" ")}})}).example(`${u("$0 run start:web")}`,`${d("Run task 'start:web'")}`).command("upgrade","Upgrade all your packages except ones specified by 'ignore-upgrade':[]",()=>{},async function(e){e._[1];await r()}).example(`${u("$0 upgrade")}`,`${d("Upgraded!")}`).command("bump","Bump package.json and beautify it!",()=>{},async function(a){a._[1];await e()}).example(`${u("$0 bump")}`,`${d("BUMPED AND PRETTY!")}`).command("run-s","Run a set of tasks one after another",()=>{},async function(e){let a=e._.slice();a.shift();const t=await n();await i(a,t)}).example(`${u("$0 run-s start:web start:desktop")}`,`${d("Run task 'start:web' and afterwards 'start:desktop'")}`).command("run-p","Run tasks in parallel",()=>{},async function(e){let a=e._.slice();a.shift();const t=await n();await c(a,t)}).example(`${u("$0 run-p start:web start:desktop")}`,`${d("Run task 'start:web' and at the same time 'start:desktop'")}`).command("encryption","Encrypt/Decrypt secret files",()=>{},async function(e){await y.init()}).example(`${u("$0 encryption")}`,`${d("Encrypt/Decrypt secret files")}`).command("clear","Clear recent task history",()=>{},async function(e){await m()}).example(`${u("$0 clear")}`,`${d("Clear your recently run tasks")}`).command("generate","Generate a sample fscripts.md file from the package.json",()=>{},async function(e){await t()}).example(`${u("$0 generate")}`,`${d("Generates a sample.fscripts.md you can use as template for your fscripts file")}`).command("toc","Generate updated Table of Contents on top of the fscripts.md file",()=>{},async function(e){await s()}).example(`${u("$0 toc")}`,`${d("Generate updated Table of Contents on top of the fscripts.md file")}`).argv._.length&&async function(){const e=await f();e?await o({task:{name:e},script:{type:"fsr",rest:[e]}},!0):console.log(a.green.bold("See you soon!"))}()})();
},{"./lib/release/bump.js":"tplV","./lib/generateFScripts.js":"gevp","./lib/parseScriptsMd.js":"E6PL","./lib/generateToc":"7tUf","./lib/upgradePackages":"ySTt","./lib/runSequence":"ZR+/","./lib/runParallel":"FQHP","./lib/runCLICommand":"e+FD","./lib/startScripts.js":"JJn1","./lib/optionList":"DPDa","./lib/git/validateNotDev.js":"UQAN","./lib/encryption/encryption":"n6tx"}]},{},["Focm"], null)
//# sourceMappingURL=/index.js.map

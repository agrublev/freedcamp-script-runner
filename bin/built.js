!function(t){var e={};function r(n){if(e[n])return e[n].exports;var o=e[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,r),o.l=!0,o.exports}r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)r.d(n,o,function(e){return t[e]}.bind(null,o));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=12)}([function(t,e,r){t.exports=r(13)},function(t,e){function r(t,e,r,n,o,i,a){try{var c=t[i](a),u=c.value}catch(t){return void r(t)}c.done?e(u):Promise.resolve(u).then(n,o)}t.exports=function(t){return function(){var e=this,n=arguments;return new Promise(function(o,i){var a=t.apply(e,n);function c(t){r(a,o,i,c,u,"next",t)}function u(t){r(a,o,i,c,u,"throw",t)}c(void 0)})}}},function(t,e,r){var n=r(21),o=r(22),i=r(23);t.exports=function(t,e){return n(t)||o(t,e)||i()}},function(t,e){t.exports=function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}},function(t,e){function r(e,n){return t.exports=r=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t},r(e,n)}t.exports=r},function(t,e){function r(t){return(r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function n(e){return"function"==typeof Symbol&&"symbol"===r(Symbol.iterator)?t.exports=n=function(t){return r(t)}:t.exports=n=function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":r(t)},n(e)}t.exports=n},function(t,e){function r(e){return t.exports=r=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)},r(e)}t.exports=r},function(t,e,r){var n=r(18),o=r(19),i=r(20);t.exports=function(t){return n(t)||o(t)||i()}},function(t,e){function r(t,e){for(var r=0;r<e.length;r++){var n=e[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(t,n.key,n)}}t.exports=function(t,e,n){return e&&r(t.prototype,e),n&&r(t,n),t}},function(t,e,r){var n=r(5),o=r(24);t.exports=function(t,e){return!e||"object"!==n(e)&&"function"!=typeof e?o(t):e}},function(t,e,r){var n=r(4);t.exports=function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function");t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,writable:!0,configurable:!0}}),e&&n(t,e)}},function(t,e,r){var n=r(6),o=r(4),i=r(25),a=r(26);function c(e){var r="function"==typeof Map?new Map:void 0;return t.exports=c=function(t){if(null===t||!i(t))return t;if("function"!=typeof t)throw new TypeError("Super expression must either be null or a function");if(void 0!==r){if(r.has(t))return r.get(t);r.set(t,e)}function e(){return a(t,arguments,n(this).constructor)}return e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),o(e,t)},c(e)}t.exports=c},function(t,e,r){"use strict";r.r(e);var n=r(0),o=r.n(n),i=r(1),a=r.n(i),c=r(15);function u(){return(u=a()(o.a.mark(function t(){return o.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,c({version:!1,v:!1,help:!1,h:!1,quiet:!1,path:"FcScripts.md",p:"FcScripts.md","--":[]});case 2:t.sent.runList([]);case 4:case"end":return t.stop()}},t)}))).apply(this,arguments)}!function(){u.apply(this,arguments)}()},function(t,e,r){var n=function(){return this||"object"==typeof self&&self}()||Function("return this")(),o=n.regeneratorRuntime&&Object.getOwnPropertyNames(n).indexOf("regeneratorRuntime")>=0,i=o&&n.regeneratorRuntime;if(n.regeneratorRuntime=void 0,t.exports=r(14),o)n.regeneratorRuntime=i;else try{delete n.regeneratorRuntime}catch(t){n.regeneratorRuntime=void 0}},function(t,e){!function(e){"use strict";var r,n=Object.prototype,o=n.hasOwnProperty,i="function"==typeof Symbol?Symbol:{},a=i.iterator||"@@iterator",c=i.asyncIterator||"@@asyncIterator",u=i.toStringTag||"@@toStringTag",s="object"==typeof t,f=e.regeneratorRuntime;if(f)s&&(t.exports=f);else{(f=e.regeneratorRuntime=s?t.exports:{}).wrap=w;var l="suspendedStart",p="suspendedYield",h="executing",y="completed",d={},v={};v[a]=function(){return this};var m=Object.getPrototypeOf,g=m&&m(m(R([])));g&&g!==n&&o.call(g,a)&&(v=g);var x=j.prototype=k.prototype=Object.create(v);T.prototype=x.constructor=j,j.constructor=T,j[u]=T.displayName="GeneratorFunction",f.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return!!e&&(e===T||"GeneratorFunction"===(e.displayName||e.name))},f.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,j):(t.__proto__=j,u in t||(t[u]="GeneratorFunction")),t.prototype=Object.create(x),t},f.awrap=function(t){return{__await:t}},S(E.prototype),E.prototype[c]=function(){return this},f.AsyncIterator=E,f.async=function(t,e,r,n){var o=new E(w(t,e,r,n));return f.isGeneratorFunction(e)?o:o.next().then(function(t){return t.done?t.value:o.next()})},S(x),x[u]="Generator",x[a]=function(){return this},x.toString=function(){return"[object Generator]"},f.keys=function(t){var e=[];for(var r in t)e.push(r);return e.reverse(),function r(){for(;e.length;){var n=e.pop();if(n in t)return r.value=n,r.done=!1,r}return r.done=!0,r}},f.values=R,P.prototype={constructor:P,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=r,this.done=!1,this.delegate=null,this.method="next",this.arg=r,this.tryEntries.forEach(_),!t)for(var e in this)"t"===e.charAt(0)&&o.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=r)},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var e=this;function n(n,o){return c.type="throw",c.arg=t,e.next=n,o&&(e.method="next",e.arg=r),!!o}for(var i=this.tryEntries.length-1;i>=0;--i){var a=this.tryEntries[i],c=a.completion;if("root"===a.tryLoc)return n("end");if(a.tryLoc<=this.prev){var u=o.call(a,"catchLoc"),s=o.call(a,"finallyLoc");if(u&&s){if(this.prev<a.catchLoc)return n(a.catchLoc,!0);if(this.prev<a.finallyLoc)return n(a.finallyLoc)}else if(u){if(this.prev<a.catchLoc)return n(a.catchLoc,!0)}else{if(!s)throw new Error("try statement without catch or finally");if(this.prev<a.finallyLoc)return n(a.finallyLoc)}}}},abrupt:function(t,e){for(var r=this.tryEntries.length-1;r>=0;--r){var n=this.tryEntries[r];if(n.tryLoc<=this.prev&&o.call(n,"finallyLoc")&&this.prev<n.finallyLoc){var i=n;break}}i&&("break"===t||"continue"===t)&&i.tryLoc<=e&&e<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=t,a.arg=e,i?(this.method="next",this.next=i.finallyLoc,d):this.complete(a)},complete:function(t,e){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),d},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.finallyLoc===t)return this.complete(r.completion,r.afterLoc),_(r),d}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.tryLoc===t){var n=r.completion;if("throw"===n.type){var o=n.arg;_(r)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,n){return this.delegate={iterator:R(t),resultName:e,nextLoc:n},"next"===this.method&&(this.arg=r),d}}}function w(t,e,r,n){var o=e&&e.prototype instanceof k?e:k,i=Object.create(o.prototype),a=new P(n||[]);return i._invoke=function(t,e,r){var n=l;return function(o,i){if(n===h)throw new Error("Generator is already running");if(n===y){if("throw"===o)throw i;return A()}for(r.method=o,r.arg=i;;){var a=r.delegate;if(a){var c=O(a,r);if(c){if(c===d)continue;return c}}if("next"===r.method)r.sent=r._sent=r.arg;else if("throw"===r.method){if(n===l)throw n=y,r.arg;r.dispatchException(r.arg)}else"return"===r.method&&r.abrupt("return",r.arg);n=h;var u=b(t,e,r);if("normal"===u.type){if(n=r.done?y:p,u.arg===d)continue;return{value:u.arg,done:r.done}}"throw"===u.type&&(n=y,r.method="throw",r.arg=u.arg)}}}(t,r,a),i}function b(t,e,r){try{return{type:"normal",arg:t.call(e,r)}}catch(t){return{type:"throw",arg:t}}}function k(){}function T(){}function j(){}function S(t){["next","throw","return"].forEach(function(e){t[e]=function(t){return this._invoke(e,t)}})}function E(t){var e;this._invoke=function(r,n){function i(){return new Promise(function(e,i){!function e(r,n,i,a){var c=b(t[r],t,n);if("throw"!==c.type){var u=c.arg,s=u.value;return s&&"object"==typeof s&&o.call(s,"__await")?Promise.resolve(s.__await).then(function(t){e("next",t,i,a)},function(t){e("throw",t,i,a)}):Promise.resolve(s).then(function(t){u.value=t,i(u)},function(t){return e("throw",t,i,a)})}a(c.arg)}(r,n,e,i)})}return e=e?e.then(i,i):i()}}function O(t,e){var n=t.iterator[e.method];if(n===r){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=r,O(t,e),"throw"===e.method))return d;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method")}return d}var o=b(n,t.iterator,e.arg);if("throw"===o.type)return e.method="throw",e.arg=o.arg,e.delegate=null,d;var i=o.arg;return i?i.done?(e[t.resultName]=i.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=r),e.delegate=null,d):i:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,d)}function L(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e)}function _(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e}function P(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(L,this),this.reset(!0)}function R(t){if(t){var e=t[a];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var n=-1,i=function e(){for(;++n<t.length;)if(o.call(t,n))return e.value=t[n],e.done=!1,e;return e.value=r,e.done=!0,e};return i.next=i}}return{next:A}}function A(){return{value:r,done:!0}}}(function(){return this||"object"==typeof self&&self}()||Function("return this")())},function(t,e,r){"use strict";r.r(e),function(t,e){var n=r(0),o=r.n(n),i=r(1),a=r.n(i),c=r(7),u=r.n(c),s=r(2),f=r.n(s),l=r(9),p=r.n(l),h=r(6),y=r.n(h),d=r(10),v=r.n(d),m=r(11),g=r.n(m),x=r(3),w=r.n(x),b=r(8),k=r.n(b),T=r(5),j=r.n(T);parcelRequire=function(t,n,o,i){var a="function"==typeof parcelRequire&&parcelRequire;function c(e,o){if(!n[e]){if(!t[e]){var i="function"==typeof parcelRequire&&parcelRequire;if(!o&&i)return i(e,!0);if(a)return a(e,!0);if("string"==typeof e)return r(27)(e);var u=new Error("Cannot find module '"+e+"'");throw u.code="MODULE_NOT_FOUND",u}f.resolve=function(r){return t[e][1][r]||r},f.cache={};var s=n[e]=new c.Module(e);t[e][0].call(s.exports,f,s,s.exports,this)}return n[e].exports;function f(t){return c(f.resolve(t))}}c.isParcelRequire=!0,c.Module=function(t){this.id=t,this.bundle=c,this.exports={}},c.modules=t,c.cache=n,c.parent=a,c.register=function(e,r){t[e]=[function(t,e){e.exports=r},{}]};for(var u=0;u<o.length;u++)c(o[u]);if(o.length){var s=c(o[o.length-1]);"object"==("undefined"==typeof exports?"undefined":j()(exports))&&void 0!==e?e.exports=s:"function"==typeof define&&r(28)&&define(function(){return s})}return c}({fygA:[function(t,e,r){var n=t("fancy-log"),o=function(){function t(){w()(this,t),this.opts={}}return k()(t,[{key:"setOptions",value:function(t){var e=t.quiet;void 0!==e&&(this.opts.quiet="boolean"==typeof e&&e)}},{key:"log",value:function(){this.opts.quiet||n.apply(void 0,arguments)}},{key:"error",value:function(){n.error.apply(n,arguments)}}]),t}();e.exports=new o},{}],t3i2:[function(t,e,r){e.exports=function(t){function e(t){var r;return w()(this,e),(r=p()(this,y()(e).call(this,t))).name="MaidError",r}return v()(e,t),e}(g()(Error))},{}],qvgs:[function(t,e,r){var n=t("path"),o=t("markdown-it"),i=t("./MaidError"),a=t("md-2-json"),c=new o({html:!0}),s=t("rexrex"),l=s.regex,p=s.whole,h=s.wildcard,y=s.extra,d=s.and,v=s.matchers,m=v.WHITE_SPACE,g=v.START,x=v.LAZY,w=s.flags,b=y(m),k=d(g,h(m),["Runs"+x,"tasks"+x].join(b)),T=p(["\x3c!--","maid-tasks","--\x3e"].join(b)),j=new RegExp(k,w.INSENSITIVE),S=new RegExp(/`([^`]+)`/g),E=function(t){return Boolean(t.match(j))&&Boolean(t.match(S))},O=function(t){var e=Boolean(t.match(/in\s+parallel/i)),r=(t.match(/before|after/i)||["before"])[0];return{taskNames:t.match(S).map(function(t){return/`(.+)`/.exec(t)[1]}),when:r,inParallel:Boolean(e)}},L=function(t){var e=[],r=!0,n=!1,o=void 0;try{for(var i,a=t.entries()[Symbol.iterator]();!(r=(i=a.next()).done);r=!0){var c=f()(i.value,2),u=c[0];"paragraph_open"===c[1].type&&e.push(t[u+1].content)}}catch(t){n=!0,o=t}finally{try{r||null==a.return||a.return()}finally{if(n)throw o}}return e},_=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"h2";return"heading_open"===t.type&&t.tag===e},P=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"h2";return"heading_close"===t.type&&t.tag===e},R=function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"h2",n=t.slice(e+1),o=n.findIndex(function(t){return"heading_open"===t.type&&t.tag===r});return n.slice(0,-1===o?void 0:o)},A=function(t){return t&&"html_block"===t.type&&l(T).test(t.content.trim())};e.exports=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=e.section,o=e.filepath,s=c.parse(t),l=t.replace(/(<!-- toc -->(\s|\S)*?<!-- tocstop -->)/g,""),p=a.parse(l),h=Object.keys(p),y={},d=h.map(function(t){var e=p[t];delete e.raw,y[t]=Object.keys(e).map(function(t){return{name:t,desc:e[t].raw}})});d=d.filter(function(t){return"raw"!==t});var v=!o||"FcScripts.md"===n.basename(o);if(!r&&!v&&!(r=function(t){var e,r=!0,n=!1,o=void 0;try{for(var i,a=t.entries()[Symbol.iterator]();!(r=(i=a.next()).done);r=!0){var c=f()(i.value,2),u=c[0],s=c[1];if(P(s)&&A(t[u+1])){e=t[u-1].content;break}}}catch(t){n=!0,o=t}finally{try{r||null==a.return||a.return()}finally{if(n)throw o}}return e}(s)))return null;var m=r?"h3":"h2",g=[];if(r){var x=s.findIndex(function(t,e,n){return _(t,"h2")&&n[e+1].content===r});if(x<0)throw new i("Unable to find `h2` header titled: '".concat(r,"'"));s=R(s,x,"h2")}var w=!0,b=!1,k=void 0;try{for(var T,j=s.entries()[Symbol.iterator]();!(w=(T=j.next()).done);w=!0){var S=f()(T.value,2),N=S[0],F=S[1];_(F,m)&&function(){var t={name:s[N+1].content,before:[],after:[],scripts:[]},e=R(s,N,m),r=L(e);t.description=r.filter(function(e){var r=E(e);if(r){var n=O(e),o=n.taskNames,i=n.when,a=n.inParallel;t[i].push({taskNames:o,inParallel:a})}return!r}).join("\n\n");var n=!0,o=!1,i=void 0;try{for(var a,c=e[Symbol.iterator]();!(n=(a=c.next()).done);n=!0){var f=a.value;"fence"===f.type&&(t.scripts=[].concat(u()(t.scripts),[{src:f.content,type:f.info}]))}}catch(t){o=!0,i=t}finally{try{n||null==c.return||c.return()}finally{if(o)throw i}}g.push(t)}()}}catch(t){b=!0,k=t}finally{try{w||null==j.return||j.return()}finally{if(b)throw k}}return{filepath:o,tasks:g,catScripts:y}},e.exports.isCommand=E,e.exports.parseCommand=O},{"./MaidError":"t3i2"}],wTmB:[function(e,r,n){var o=e("path"),i=e("joycon");r.exports=new i({stopDir:o.dirname(t.cwd())})},{}],"0ANE":[function(t,e,r){var n=t("./parseMarkdown"),i=t("./loadFile"),c=t("execa"),u=t("prepend-file"),s=function(t){c.shell(t)};e.exports=function(){var t=a()(o.a.mark(function t(e){var r,a,c,f;return o.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:if(r=i.loadSync(["FcScripts.md","contributing.md","CONTRIBUTING.md","README.md","readme.md"]),a=r.path,c=r.data,a){t.next=3;break}return t.abrupt("return",null);case 3:return-1===c.indexOf("\x3c!-- toc --\x3e")&&u.sync(a,"\x3c!-- toc --\x3e"),s("npx markdown-toc FcScripts.md -i"),f=c.replace(/(<!-- toc -->(\s|\S)*?<!-- tocstop -->)/g,""),t.abrupt("return",n(f,{section:e,filepath:a}));case 6:case"end":return t.stop()}},t)}));return function(e){return t.apply(this,arguments)}}()},{"./parseMarkdown":"qvgs","./loadFile":"wTmB"}],iA0j:[function(e,r,n){var o=e("path"),i=e("cross-spawn"),a=e("./MaidError");r.exports=function(e){var r=e.script,n=e.task,c=e.type,s=void 0===c?r.type:c,f=e.resolve,l=e.reject,p=i(s,["-c",r.src].concat(u()(t.argv.slice(2))),{stdio:"inherit",env:Object.assign({},t.env,{PATH:"".concat(o.resolve("node_modules/.bin"),":").concat(t.env.PATH)})});return p.on("close",function(t){0===t?f():l(new a('task "'.concat(n.name,'" exited with code ').concat(t)))}),p}},{"./MaidError":"t3i2"}],Focm:[function(e,r,n){var i=e("path"),c=e("chalk"),u=e("micromatch"),s=e("require-from-string"),f=e("./logger"),l=e("./readMaidFile"),p=e("./MaidError"),h=e("./runCLICommand"),y=e("inquirer"),d=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return w()(this,e),f.setOptions({quiet:t.quiet}),this.loadAsync(t)}return k()(e,[{key:"loadAsync",value:function(){var t=a()(o.a.mark(function t(e){return o.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,l(e.section);case 2:if(this.maidfile=t.sent,this.maidfile){t.next=5;break}throw new p("No maidfile was found. Stop.");case 5:return t.abrupt("return",this);case 6:case"end":return t.stop()}},t,this)}));return function(e){return t.apply(this,arguments)}}()},{key:"runTasks",value:function(){var t=a()(o.a.mark(function t(e,r){var n,i,a,c,u,s,f=this;return o.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:if(!e||0===e.length){t.next=32;break}if(!r){t.next=6;break}return t.next=4,Promise.all(e.map(function(t){return f.runTask(t)}));case 4:t.next=32;break;case 6:n=!0,i=!1,a=void 0,t.prev=9,c=e[Symbol.iterator]();case 11:if(n=(u=c.next()).done){t.next=18;break}return s=u.value,t.next=15,this.runTask(s);case 15:n=!0,t.next=11;break;case 18:t.next=24;break;case 20:t.prev=20,t.t0=t.catch(9),i=!0,a=t.t0;case 24:t.prev=24,t.prev=25,n||null==c.return||c.return();case 27:if(t.prev=27,!i){t.next=30;break}throw a;case 30:return t.finish(27);case 31:return t.finish(24);case 32:case"end":return t.stop()}},t,this,[[9,20,24,32],[25,,27,31]])}));return function(e,r){return t.apply(this,arguments)}}()},{key:"runFile",value:function(){var t=a()(o.a.mark(function t(e){return o.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,this.runTask("beforeAll",!1);case 2:return t.next=4,this.runTask(e);case 4:return t.next=6,this.runTask("afterAll",!1);case 6:case"end":return t.stop()}},t,this)}));return function(e){return t.apply(this,arguments)}}()},{key:"runTask",value:function(){var t=a()(o.a.mark(function t(e){var r,n,i,a,u,s,l,h,y,d=arguments;return o.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:if(r=!(d.length>1&&void 0!==d[1])||d[1],n=e&&this.maidfile&&this.maidfile.tasks.find(function(t){return t.name===e})){t.next=6;break}if(!r){t.next=5;break}throw new p('No task called "'.concat(e,'" was found. Stop.'));case 5:return t.abrupt("return");case 6:return t.next=8,this.runTaskHooks(n,"before");case 8:i=Date.now(),f.log("Starting '".concat(c.cyan(n.name),"'...")),a=!0,u=!1,s=void 0,t.prev=13,l=n.scripts[Symbol.iterator]();case 15:if(a=(h=l.next()).done){t.next=22;break}return y=h.value,t.next=19,this.runScript(y,n);case 19:a=!0,t.next=15;break;case 22:t.next=28;break;case 24:t.prev=24,t.t0=t.catch(13),u=!0,s=t.t0;case 28:t.prev=28,t.prev=29,a||null==l.return||l.return();case 31:if(t.prev=31,!u){t.next=34;break}throw s;case 34:return t.finish(31);case 35:return t.finish(28);case 36:return f.log("Finished '".concat(c.cyan(n.name),"' ").concat(c.magenta("after ".concat(Date.now()-i," ms")),"...")),t.next=39,this.runTaskHooks(n,"after");case 39:case"end":return t.stop()}},t,this,[[13,24,28,36],[29,,31,35]])}));return function(e){return t.apply(this,arguments)}}()},{key:"runScript",value:function(t,e){var r=this;return new Promise(function(n,o){var i=function(t){throw new p("Task '".concat(e.name,"' failed.\n").concat(t.stack))};if(v(t,["sh","bash"]))return h({script:t,task:e,resolve:n,reject:o});if(v(t,["py","python"]))return h({type:"python",script:t,task:e,resolve:n,reject:o});if(v(t,["js","javascript"])){var a;try{a=s(t.src,r.maidfile.filepath)}catch(t){return i(t)}return n("function"==typeof(a=a.default||a)?Promise.resolve(a()).catch(i):a)}return n()})}},{key:"runTaskHooks",value:function(){var t=a()(o.a.mark(function t(e,r){var n,i,a,c,u,s,f,l,p,h;return o.a.wrap(function(t){for(;;)switch(t.prev=t.next){case 0:return n="before"===r?"pre":"post",i=this.maidfile.tasks.filter(function(t){return t.name==="".concat(n).concat(e.name)}),t.next=3,this.runTasks(i.map(function(t){return t.name}));case 3:a=!0,c=!1,u=void 0,t.prev=6,s=e[r][Symbol.iterator]();case 8:if(a=(f=s.next()).done){t.next=16;break}return l=f.value,p=l.taskNames,h=l.inParallel,t.next=13,this.runTasks(p,h);case 13:a=!0,t.next=8;break;case 16:t.next=22;break;case 18:t.prev=18,t.t0=t.catch(6),c=!0,u=t.t0;case 22:t.prev=22,t.prev=23,a||null==s.return||s.return();case 25:if(t.prev=25,!c){t.next=28;break}throw u;case 28:return t.finish(25);case 29:return t.finish(22);case 30:case"end":return t.stop()}},t,this,[[6,18,22,30],[23,,25,29]])}));return function(e,r){return t.apply(this,arguments)}}()},{key:"getHelp",value:function(e){var r=(e=[].concat(e)).length>0?this.maidfile.tasks.filter(function(t){return u.some(t.name,e)}):this.maidfile.tasks;if(0===r.length)throw new p('No tasks for pattern "'.concat(e.join(" "),'" was found. Stop.'));console.log("\n  ".concat(c.magenta.bold("Task".concat(r.length>1?"s":""," in ").concat(i.relative(t.cwd(),this.maidfile.filepath),":")),"\n\n")+r.map(function(t){return"  ".concat(c.bold(t.name),"\n").concat(c.dim(t.description?t.description.split("\n").map(function(t){return"      ".concat(t.trim())}).join("\n"):"      No description"))}).join("\n\n")+"\n")}},{key:"runList",value:function(t){var e=this;y.prompt([{type:"list",name:"category",message:"What category do you want to run?",choices:Object.keys(this.maidfile.catScripts)}]).then(function(t){var r=t.category,n=e.maidfile.catScripts[r].map(function(t){return"".concat(t.name," ").concat(t.desc?"\t~\t"+t.desc.replace(/\n/g," ").trim():"")});y.prompt([{type:"list",name:"taskToRun",message:"Which task do you want to run",choices:n}]).then(function(t){var r=t.taskToRun;e.runTask(r.split("\t~\t")[0].trim())})})}},{key:"getList",value:function(){this.maidfile.tasks}}]),e}();function v(t,e){return e.some(function(e){return e===t.type})}r.exports=function(t){return new d(t)}},{"./logger":"fygA","./readMaidFile":"0ANE","./MaidError":"t3i2","./runCLICommand":"iA0j"}]},{},["Focm"])}.call(this,r(16),r(17)(t))},function(t,e){var r,n,o=t.exports={};function i(){throw new Error("setTimeout has not been defined")}function a(){throw new Error("clearTimeout has not been defined")}function c(t){if(r===setTimeout)return setTimeout(t,0);if((r===i||!r)&&setTimeout)return r=setTimeout,setTimeout(t,0);try{return r(t,0)}catch(e){try{return r.call(null,t,0)}catch(e){return r.call(this,t,0)}}}!function(){try{r="function"==typeof setTimeout?setTimeout:i}catch(t){r=i}try{n="function"==typeof clearTimeout?clearTimeout:a}catch(t){n=a}}();var u,s=[],f=!1,l=-1;function p(){f&&u&&(f=!1,u.length?s=u.concat(s):l=-1,s.length&&h())}function h(){if(!f){var t=c(p);f=!0;for(var e=s.length;e;){for(u=s,s=[];++l<e;)u&&u[l].run();l=-1,e=s.length}u=null,f=!1,function(t){if(n===clearTimeout)return clearTimeout(t);if((n===a||!n)&&clearTimeout)return n=clearTimeout,clearTimeout(t);try{n(t)}catch(e){try{return n.call(null,t)}catch(e){return n.call(this,t)}}}(t)}}function y(t,e){this.fun=t,this.array=e}function d(){}o.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)e[r-1]=arguments[r];s.push(new y(t,e)),1!==s.length||f||c(h)},y.prototype.run=function(){this.fun.apply(null,this.array)},o.title="browser",o.browser=!0,o.env={},o.argv=[],o.version="",o.versions={},o.on=d,o.addListener=d,o.once=d,o.off=d,o.removeListener=d,o.removeAllListeners=d,o.emit=d,o.prependListener=d,o.prependOnceListener=d,o.listeners=function(t){return[]},o.binding=function(t){throw new Error("process.binding is not supported")},o.cwd=function(){return"/"},o.chdir=function(t){throw new Error("process.chdir is not supported")},o.umask=function(){return 0}},function(t,e){t.exports=function(t){if(!t.webpackPolyfill){var e=Object.create(t);e.children||(e.children=[]),Object.defineProperty(e,"loaded",{enumerable:!0,get:function(){return e.l}}),Object.defineProperty(e,"id",{enumerable:!0,get:function(){return e.i}}),Object.defineProperty(e,"exports",{enumerable:!0}),e.webpackPolyfill=1}return e}},function(t,e){t.exports=function(t){if(Array.isArray(t)){for(var e=0,r=new Array(t.length);e<t.length;e++)r[e]=t[e];return r}}},function(t,e){t.exports=function(t){if(Symbol.iterator in Object(t)||"[object Arguments]"===Object.prototype.toString.call(t))return Array.from(t)}},function(t,e){t.exports=function(){throw new TypeError("Invalid attempt to spread non-iterable instance")}},function(t,e){t.exports=function(t){if(Array.isArray(t))return t}},function(t,e){t.exports=function(t,e){var r=[],n=!0,o=!1,i=void 0;try{for(var a,c=t[Symbol.iterator]();!(n=(a=c.next()).done)&&(r.push(a.value),!e||r.length!==e);n=!0);}catch(t){o=!0,i=t}finally{try{n||null==c.return||c.return()}finally{if(o)throw i}}return r}},function(t,e){t.exports=function(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}},function(t,e){t.exports=function(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}},function(t,e){t.exports=function(t){return-1!==Function.toString.call(t).indexOf("[native code]")}},function(t,e,r){var n=r(4);function o(e,r,i){return!function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(t){return!1}}()?t.exports=o=function(t,e,r){var o=[null];o.push.apply(o,e);var i=new(Function.bind.apply(t,o));return r&&n(i,r.prototype),i}:t.exports=o=Reflect.construct,o.apply(null,arguments)}t.exports=o},function(t,e){function r(t){var e=new Error("Cannot find module '"+t+"'");throw e.code="MODULE_NOT_FOUND",e}r.keys=function(){return[]},r.resolve=r,t.exports=r,r.id=27},function(t,e){(function(e){t.exports=e}).call(this,{})}]);
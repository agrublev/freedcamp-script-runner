function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

// const getPackagesStats = require("./utils/deps/getPackagesStats.js"); // const Conf = require("conf");
// // const store = new Conf("deps");
// // const filesize = require("filesize");
// // const { writeJson } = require("./utils/index.js");
// // // Loop over all stored values
// // let deps = store.get("deps");
// // writeJson("files.json", deps);
// // Object.keys(deps).forEach(e => {
// //     // console.log(JSON.stringify(deps[e]).length);
// //     let dep = deps[e];
// //     let total = 0;
// //     Object.keys(dep).forEach(z => {
// //         total += parseInt(dep[z].size);
// //     });
// //     console.warn(e, filesize(total, { bits: true }));
// // });
//
// const Conf = require("conf");
// const store = new Conf("deps");
// let deps = store.get("deps");
// // const filesize = require("filesize");
// const { writeJson } = require("./utils/index.js");
// // Loop over all stored values
// writeJson("filesz.json", deps);
// // for (let dep in deps) {
// //     console.warn("-- Console DWE", dep);
// //     console.warn(dep, filesize(getPackagesStats(deps[dep]).size));
// // }
// // console.log(JSON.stringify(deps[e]).length);
// // let dep = deps["parcel"];
// // Object.keys(deps).forEach(z => {
// //     total += parseInt(deps[z].size);
// // });
// // console.warn("parcel", filesize(total, { bits: true }));
// // });
var fetch = require("node-fetch"); // fetch("https://bundlephobia.com/api/size?package=fkit&record=true") //https://registry.npmjs.org/check
//     .then(function(response) {
//         if (response.status >= 400) {
//             throw new Error("Bad response from server");
//         }
//         return response.json();
//     })
//     .then(function(stories) {
//         console.log(stories);
//     });
// fetch("https://bundlephobia.com/api/size?package=parcel&record=true") //https://registry.npmjs.org/check
//     .then(function(response) {
//         if (response.status >= 400) {
//             throw new Error("Bad response from server");
//         }
//         return response.json();
//     })
//     .then(function(stories) {
//         console.log(stories);
//     });


import filesize from "filesize";

function asyncForEach(_x, _x2) {
  return _asyncForEach.apply(this, arguments);
}

function _asyncForEach() {
  _asyncForEach = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3(array, callback) {
    var index;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            index = 0;

          case 1:
            if (!(index < array.length)) {
              _context3.next = 7;
              break;
            }

            _context3.next = 4;
            return callback(array[index], index, array);

          case 4:
            index++;
            _context3.next = 1;
            break;

          case 7:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _asyncForEach.apply(this, arguments);
}

var start =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2() {
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return asyncForEach(["https://bundlephobia.com/api/size?package=burrito&record=true", "https://bundlephobia.com/api/size?package=source-map&record=true", "https://bundlephobia.com/api/size?package=commander&record=true", "https://bundlephobia.com/api/size?package=tap&record=true", "https://bundlephobia.com/api/size?package=uglify-js&record=true", "https://bundlephobia.com/api/size?package=traverse&record=true", "https://bundlephobia.com/api/size?package=antd&record=true"],
            /*#__PURE__*/
            function () {
              var _ref2 = _asyncToGenerator(
              /*#__PURE__*/
              regeneratorRuntime.mark(function _callee(num) {
                var ssss;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.next = 2;
                        return new Promise(function (resolve) {
                          fetch(num) //https://registry.npmjs.org/check
                          .then(function (response) {
                            if (response.status >= 400) {
                              console.warn(response);
                              throw new Error("Bad response from server");
                            }

                            return response.json();
                          }).then(function (data) {
                            var start = parseInt(data.size);

                            if (data.dependencySizes) {
                              data.dependencySizes.forEach(function (sz) {
                                start += parseInt(sz.approximateSize);
                              });
                            }

                            console.warn("!!!!" + num, filesize(start, {
                              bits: true,
                              base: 10
                            }));
                            resolve(data);
                          });
                        });

                      case 2:
                        ssss = _context.sent;
                        console.log(num, filesize(ssss.size));

                      case 4:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x3) {
                return _ref2.apply(this, arguments);
              };
            }());

          case 2:
            console.log("Done");

          case 3:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function start() {
    return _ref.apply(this, arguments);
  };
}();

start();

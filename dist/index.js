"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _startScripts = require("./lib/startScripts");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var bump = require("./lib/release/bump.js");

var chalk = require("chalk");

var _require = require("./lib/generators"),
    generateFScripts = _require.generateFScripts,
    generateToc = _require.generateToc;

var parseScriptFile = require("./lib/parsers/parseScriptsMd.js");

var upgradePackages = require("./lib/upgradePackages");

var _require2 = require("./lib/running"),
    runSequence = _require2.runSequence,
    runParallel = _require2.runParallel,
    runCLICommand = _require2.runCLICommand;

var _require3 = require("./lib/startScripts.js"),
    startPackageScripts = _require3.startPackageScripts,
    startScripts = _require3.startScripts,
    clearRecent = _require3.clearRecent;

var taskName = chalk.rgb(39, 173, 96).bold.underline;
var textDescription = chalk.rgb(159, 161, 181);

var optionList = require("./lib/optionList");

var validateNotInDev = require("./lib/git/validateNotDev.js");

var encrypt = require("./lib/encryption/encryption");

var _require4 = require("./lib/utils/index"),
    clear = _require4.clear;

var authConfig = require("./lib/auth/auth-conf");

require("./lib/utils/console");

var runCmd = /*#__PURE__*/function () {
  var _ref = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(app) {
    var argsList,
        _require5,
        spawn,
        shell,
        _args = arguments;

    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            argsList = _args.length > 1 && _args[1] !== undefined ? _args[1] : [];
            _require5 = require("child_process"), spawn = _require5.spawn;
            shell = spawn(app, argsList, {
              stdio: "inherit",
              cwd: process.cwd(),
              env: _objectSpread({}, process.env, {}, {
                FORCE_COLOR: true
              })
            });
            return _context.abrupt("return", new Promise(function (resolve) {
              shell.on("close", function (code) {
                resolve();
              });
            }));

          case 4:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));

  return function runCmd(_x) {
    return _ref.apply(this, arguments);
  };
}();

(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee19() {
  var argv;
  return _regenerator["default"].wrap(function _callee19$(_context19) {
    while (1) {
      switch (_context19.prev = _context19.next) {
        case 0:
          clear();
          argv = require("yargs").usage("Usage: $0 <command> [options]")
          /**
           *  fsr
           */
          .command("", "Choose a script runner command", function (yargs) {}, /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2() {
            return _regenerator["default"].wrap(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                  case "end":
                    return _context2.stop();
                }
              }
            }, _callee2);
          }))).example("".concat(taskName("$0")), "".concat(textDescription("Choose a script runner command")))
          /**
           *  fsr
           */
          .command("branch", "Create new branch instead of Development", function (yargs) {}, /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3() {
            return _regenerator["default"].wrap(function _callee3$(_context3) {
              while (1) {
                switch (_context3.prev = _context3.next) {
                  case 0:
                    _context3.next = 2;
                    return validateNotInDev();

                  case 2:
                  case "end":
                    return _context3.stop();
                }
              }
            }, _callee3);
          }))).example("".concat(taskName("$0")), "".concat(textDescription("Validates branch and creates new")))
          /**
           * fsr
           * start --
           */
          .usage("$0 <task> name:of:task").command("start", "Choose category then task to run", function (yargs) {}, /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4() {
            return _regenerator["default"].wrap(function _callee4$(_context4) {
              while (1) {
                switch (_context4.prev = _context4.next) {
                  case 0:
                    _context4.next = 2;
                    return startScripts();

                  case 2:
                  case "end":
                    return _context4.stop();
                }
              }
            }, _callee4);
          }))).example("".concat(taskName("$0 start")), "".concat(textDescription("Open a task selection selector")))
          /**
           * fsr
           * scripts --
           */
          .command("scripts", "Choose a script from package.json", function (yargs) {}, /*#__PURE__*/(0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee5() {
            return _regenerator["default"].wrap(function _callee5$(_context5) {
              while (1) {
                switch (_context5.prev = _context5.next) {
                  case 0:
                    _context5.next = 2;
                    return startPackageScripts();

                  case 2:
                  case "end":
                    return _context5.stop();
                }
              }
            }, _callee5);
          }))).example("".concat(taskName("$0 scripts")), "".concat(textDescription("Choose a script from package.json")))
          /**
           * fsr
           * list --
           */
          .command("list", "Select any task with text autocompletion", function () {}, /*#__PURE__*/function () {
            var _ref7 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee6(argv) {
              return _regenerator["default"].wrap(function _callee6$(_context6) {
                while (1) {
                  switch (_context6.prev = _context6.next) {
                    case 0:
                      _context6.next = 2;
                      return startScripts(false);

                    case 2:
                    case "end":
                      return _context6.stop();
                  }
                }
              }, _callee6);
            }));

            return function (_x2) {
              return _ref7.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 list")), "".concat(textDescription("Show you all tasks you can run")))
          /**
           * fsr
           * run --
           */
          .command("run [task]", "Run a specific task", function (yargs) {
            yargs.positional("task", {
              describe: "name of task to start",
              "default": ""
            });
          }, /*#__PURE__*/function () {
            var _ref8 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee7(argv) {
              var task, _yield$parseScriptFil, allTasks, taskData, script, lang, pars, type, env, envs;

              return _regenerator["default"].wrap(function _callee7$(_context7) {
                while (1) {
                  switch (_context7.prev = _context7.next) {
                    case 0:
                      task = argv.task;
                      _context7.next = 3;
                      return parseScriptFile();

                    case 3:
                      _yield$parseScriptFil = _context7.sent;
                      allTasks = _yield$parseScriptFil.allTasks;
                      taskData = allTasks.find(function (t) {
                        return t.name === task;
                      });

                      if (taskData) {
                        _context7.next = 9;
                        break;
                      }

                      console.error("".concat(chalk.bold.underline.red("Task not found")));
                      return _context7.abrupt("return");

                    case 9:
                      script = taskData.script, lang = taskData.lang;
                      pars = script.split(" ");
                      type = pars[0];
                      env = {};

                      if (pars[0].includes("=")) {
                        envs = type.split("=");
                        env[envs[0]] = envs[1];
                        type = pars[1];
                        pars.shift();
                        pars.shift();
                        script = pars.join(" ");
                      } else {
                        pars.shift();
                        script = pars.join(" ");
                      }

                      _context7.next = 16;
                      return runCLICommand({
                        task: {
                          name: task
                        },
                        script: {
                          lang: lang,
                          env: env,
                          type: type,
                          full: script,
                          rest: script.split(" ")
                        }
                      });

                    case 16:
                    case "end":
                      return _context7.stop();
                  }
                }
              }, _callee7);
            }));

            return function (_x3) {
              return _ref8.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 run start:web")), "".concat(textDescription("Run task 'start:web'")))
          /**
           * fsr
           * upgrade --
           */
          .command("upgrade", "Upgrade all your packages except ones specified by 'ignore-upgrade':[]", function () {}, /*#__PURE__*/function () {
            var _ref9 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee8(argv) {
              var task;
              return _regenerator["default"].wrap(function _callee8$(_context8) {
                while (1) {
                  switch (_context8.prev = _context8.next) {
                    case 0:
                      task = argv._[1];
                      _context8.next = 3;
                      return upgradePackages();

                    case 3:
                    case "end":
                      return _context8.stop();
                  }
                }
              }, _callee8);
            }));

            return function (_x4) {
              return _ref9.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 upgrade")), "".concat(textDescription("Upgraded!")))
          /**
           * fsr
           * bump --
           */
          .command("bump", "Bump package.json and beautify it!", function () {}, /*#__PURE__*/function () {
            var _ref10 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee9(argv) {
              var type;
              return _regenerator["default"].wrap(function _callee9$(_context9) {
                while (1) {
                  switch (_context9.prev = _context9.next) {
                    case 0:
                      type = argv.type;
                      _context9.next = 3;
                      return bump(type);

                    case 3:
                    case "end":
                      return _context9.stop();
                  }
                }
              }, _callee9);
            }));

            return function (_x5) {
              return _ref10.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 bump")), "".concat(textDescription("BUMPED AND PRETTY!")))
          /**
           * fsr
           * run-s --
           */
          .command("run-s", "Run a set of tasks one after another", function () {}, /*#__PURE__*/function () {
            var _ref11 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee10(argv) {
              var tasks, FcScripts;
              return _regenerator["default"].wrap(function _callee10$(_context10) {
                while (1) {
                  switch (_context10.prev = _context10.next) {
                    case 0:
                      tasks = argv._.slice();
                      tasks.shift();
                      _context10.next = 4;
                      return parseScriptFile();

                    case 4:
                      FcScripts = _context10.sent;
                      _context10.next = 7;
                      return runSequence(tasks, FcScripts);

                    case 7:
                    case "end":
                      return _context10.stop();
                  }
                }
              }, _callee10);
            }));

            return function (_x6) {
              return _ref11.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 run-s start:web start:desktop")), "".concat(textDescription("Run task 'start:web' and afterwards 'start:desktop'")))
          /**
           * fsr
           * run-p --
           */
          .command("run-p", "Run tasks in parallel", function () {}, /*#__PURE__*/function () {
            var _ref12 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee11(argv) {
              var tasks, FcScripts;
              return _regenerator["default"].wrap(function _callee11$(_context11) {
                while (1) {
                  switch (_context11.prev = _context11.next) {
                    case 0:
                      tasks = argv._.slice();
                      tasks.shift();
                      _context11.next = 4;
                      return parseScriptFile();

                    case 4:
                      FcScripts = _context11.sent;
                      _context11.next = 7;
                      return runParallel(tasks, FcScripts);

                    case 7:
                    case "end":
                      return _context11.stop();
                  }
                }
              }, _callee11);
            }));

            return function (_x7) {
              return _ref12.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 run-p start:web start:desktop")), "".concat(textDescription("Run task 'start:web' and at the same time 'start:desktop'")))
          /**
           * fsr
           * remote config --
           */
          .command("remote", "Get remote configuration", function () {}, /*#__PURE__*/function () {
            var _ref13 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee12(argv) {
              return _regenerator["default"].wrap(function _callee12$(_context12) {
                while (1) {
                  switch (_context12.prev = _context12.next) {
                    case 0:
                      _context12.next = 2;
                      return authConfig()["catch"](console.error);

                    case 2:
                    case "end":
                      return _context12.stop();
                  }
                }
              }, _callee12);
            }));

            return function (_x8) {
              return _ref13.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 remote")), "".concat(textDescription("Get remote config")))
          /**
           * fsr
           * encryption --
           */
          .command("encryption", "Encrypt/Decrypt secret files", function () {}, /*#__PURE__*/function () {
            var _ref14 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee13(argv) {
              return _regenerator["default"].wrap(function _callee13$(_context13) {
                while (1) {
                  switch (_context13.prev = _context13.next) {
                    case 0:
                      _context13.next = 2;
                      return encrypt.init();

                    case 2:
                    case "end":
                      return _context13.stop();
                  }
                }
              }, _callee13);
            }));

            return function (_x9) {
              return _ref14.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 encryption")), "".concat(textDescription("Encrypt/Decrypt secret files")))
          /**
           * fsr
           * clear --
           */
          .command("clear", "Clear recent task history", function () {}, /*#__PURE__*/function () {
            var _ref15 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee14(argv) {
              return _regenerator["default"].wrap(function _callee14$(_context14) {
                while (1) {
                  switch (_context14.prev = _context14.next) {
                    case 0:
                      _context14.next = 2;
                      return clearRecent();

                    case 2:
                    case "end":
                      return _context14.stop();
                  }
                }
              }, _callee14);
            }));

            return function (_x10) {
              return _ref15.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 clear")), "".concat(textDescription("Clear your recently run tasks")))
          /**
           * fsr
           * config --
           */
          .command("config", "Update a config value", function () {}, /*#__PURE__*/function () {
            var _ref16 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee15(argv) {
              var key;
              return _regenerator["default"].wrap(function _callee15$(_context15) {
                while (1) {
                  switch (_context15.prev = _context15.next) {
                    case 0:
                      key = argv._.slice();
                      console.log("--- INFO ", key[0], key[1]);
                      key = !key[0] ? false : key[0] === "config" && key[1] ? key[1] : key[0];
                      console.log("--- INFO2 ", key);
                      _context15.next = 6;
                      return (0, _startScripts.updateConfig)(key);

                    case 6:
                    case "end":
                      return _context15.stop();
                  }
                }
              }, _callee15);
            }));

            return function (_x11) {
              return _ref16.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 config")), "".concat(textDescription("Update a config value"))).command("generate", "Generate a sample fscripts.md file from the package.json", function () {}, /*#__PURE__*/function () {
            var _ref17 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee16(argv) {
              return _regenerator["default"].wrap(function _callee16$(_context16) {
                while (1) {
                  switch (_context16.prev = _context16.next) {
                    case 0:
                      _context16.next = 2;
                      return generateFScripts();

                    case 2:
                    case "end":
                      return _context16.stop();
                  }
                }
              }, _callee16);
            }));

            return function (_x12) {
              return _ref17.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 generate")), "".concat(textDescription("Generates a sample.fscripts.md you can use as template for your fscripts file"))).command("toc", "Generate updated Table of Contents on top of the fscripts.md file", function () {}, /*#__PURE__*/function () {
            var _ref18 = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee17(argv) {
              var mdFile;
              return _regenerator["default"].wrap(function _callee17$(_context17) {
                while (1) {
                  switch (_context17.prev = _context17.next) {
                    case 0:
                      mdFile = argv._[1];
                      _context17.next = 3;
                      return generateToc(mdFile);

                    case 3:
                    case "end":
                      return _context17.stop();
                  }
                }
              }, _callee17);
            }));

            return function (_x13) {
              return _ref18.apply(this, arguments);
            };
          }()).example("".concat(taskName("$0 toc")), "".concat(textDescription("Generate updated Table of Contents on top of the fscripts.md file"))).argv;

          if (argv._.length === 0) {
            (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee18() {
              var choice;
              return _regenerator["default"].wrap(function _callee18$(_context18) {
                while (1) {
                  switch (_context18.prev = _context18.next) {
                    case 0:
                      _context18.next = 2;
                      return optionList();

                    case 2:
                      choice = _context18.sent;

                      if (!choice) {
                        _context18.next = 8;
                        break;
                      }

                      _context18.next = 6;
                      return runCmd("yarn", ["fsr", choice]);

                    case 6:
                      _context18.next = 9;
                      break;

                    case 8:
                      console.log(chalk.green.bold("See you soon!"));

                    case 9:
                    case "end":
                      return _context18.stop();
                  }
                }
              }, _callee18);
            }))();
          }

        case 3:
        case "end":
          return _context19.stop();
      }
    }
  }, _callee19);
}))();

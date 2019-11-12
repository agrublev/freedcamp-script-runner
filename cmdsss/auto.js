function _assertThisInitialized(self) {
    if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
}
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _asyncToGenerator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'next', value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, 'throw', err);
            }
            _next(undefined);
        });
    };
}
function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError('Cannot call a class as a function');
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
}
function _inherits(subClass, superClass) {
    if (typeof superClass !== 'function' && superClass !== null) {
        throw new TypeError('Super expression must either be null or a function');
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
            value: subClass,
            writable: true,
            configurable: true
        }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
}
function _possibleConstructorReturn(self, call) {
    if (call && (_typeof(call) === 'object' || typeof call === 'function')) {
        return call;
    }
    return _assertThisInitialized(self);
}
function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
    };
    return _setPrototypeOf(o, p);
}
function _throw(e) {
    throw e;
}
var _typeof = function(obj) {
    return obj && obj.constructor === Symbol ? 'symbol' : typeof obj;
};
var ref = require('@oclif/command'), ref1 = ref ? ref : _throw(new TypeError("Cannot destructure 'undefined' or 'null'")), Command = ref1.Command, flags = ref1.flags;
var gen = require('../utils/generateScriptsFileFromPackage.js');
var configManager = require('../utils/config-manager.js');
var AutoCommand = function(_Command) {
    _inherits(AutoCommand, _Command);
    function AutoCommand() {
        _classCallCheck(this, AutoCommand);
        return _possibleConstructorReturn(this, _getPrototypeOf(AutoCommand).apply(this, arguments));
    }
    _createClass(AutoCommand, [{
            key: 'run',
            value: function run() {
                return _asyncToGenerator((function*() {
                    // await configManager.init();
// configManager.clear();
var ref2 = this.parse(AutoCommand), ref3 = ref2 ? ref2 : _throw(new TypeError("Cannot destructure 'undefined' or 'null'")), flags1 = ref3.flags1;
                    var name = flags1.name || 'world';
                    yield gen.init();
                }).bind(this))();
            }
        }]);
    return AutoCommand;
}(Command);
AutoCommand.description = 'Describe the command here\n...\nExtra documentation goes here\n';
AutoCommand.flags = {
    name: flags.string({
        'char': 'n',
        description: 'name to print'
    })
};
module.exports = AutoCommand;

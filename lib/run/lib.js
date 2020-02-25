parcelRequire = (function(e, r, t, n) {
    var i,
        o = "function" == typeof parcelRequire && parcelRequire,
        u = "function" == typeof require && require;
    function f(t, n) {
        if (!r[t]) {
            if (!e[t]) {
                var i = "function" == typeof parcelRequire && parcelRequire;
                if (!n && i) return i(t, !0);
                if (o) return o(t, !0);
                if (u && "string" == typeof t) return u(t);
                var c = new Error("Cannot find module '" + t + "'");
                throw ((c.code = "MODULE_NOT_FOUND"), c);
            }
            (p.resolve = function(r) {
                return e[t][1][r] || r;
            }),
                (p.cache = {});
            var l = (r[t] = new f.Module(t));
            e[t][0].call(l.exports, p, l, l.exports, this);
        }
        return r[t].exports;
        function p(e) {
            return f(p.resolve(e));
        }
    }
    (f.isParcelRequire = !0),
        (f.Module = function(e) {
            (this.id = e), (this.bundle = f), (this.exports = {});
        }),
        (f.modules = e),
        (f.cache = r),
        (f.parent = o),
        (f.register = function(r, t) {
            e[r] = [
                function(e, r) {
                    r.exports = t;
                },
                {}
            ];
        });
    for (var c = 0; c < t.length; c++)
        try {
            f(t[c]);
        } catch (e) {
            i || (i = e);
        }
    if (t.length) {
        var l = f(t[t.length - 1]);
        "object" == typeof exports && "undefined" != typeof module
            ? (module.exports = l)
            : "function" == typeof define && define.amd
            ? define(function() {
                  return l;
              })
            : n && (this[n] = l);
    }
    if (((parcelRequire = f), i)) throw i;
    return f;
})(
    {
        "xX+4": [
            function(require, module, exports) {
                "use strict";
                const t = require("minimatch").Minimatch,
                    s = /[:\/]/g,
                    e = { ":": "/", "/": ":" };
                function n(t) {
                    return t.replace(s, t => e[t]);
                }
                function r(s) {
                    const e = s.trim(),
                        r = e.indexOf(" "),
                        a = r < 0 ? e : e.slice(0, r),
                        c = r < 0 ? "" : e.slice(r),
                        o = new t(n(a), { nonegate: !0 });
                    return { match: o.match.bind(o), task: a, args: c };
                }
                class a {
                    constructor() {
                        (this.result = []), (this.sourceMap = Object.create(null));
                    }
                    add(t, s) {
                        const e = this.sourceMap[t] || (this.sourceMap[t] = []);
                        (0 !== e.length && -1 === e.indexOf(s)) || this.result.push(t), e.push(s);
                    }
                }
                module.exports = function(t, s) {
                    const e = s.map(r),
                        c = t.map(n),
                        o = new a(),
                        i = Object.create(null);
                    for (const r of e) {
                        let t = !1;
                        for (const s of c) r.match(s) && ((t = !0), o.add(n(s) + r.args, r.task));
                        t ||
                            ("restart" !== r.task && "env" !== r.task) ||
                            (o.add(r.task + r.args, r.task), (t = !0)),
                            t || (i[r.task] = !0);
                    }
                    const u = Object.keys(i);
                    if (u.length > 0) throw new Error(`Task not found: "${u.join('", ')}"`);
                    return o.result;
                };
            },
            {}
        ],
        "7fyY": [
            function(require, module, exports) {
                "use strict";
                const e = require("path").join,
                    t = require("read-pkg");
                module.exports = function() {
                    const s = e(process.cwd(), "package.json");
                    return t(s).then(e => ({
                        taskList: Object.keys(e.scripts || {}),
                        packageInfo: { path: s, body: e }
                    }));
                };
            },
            {}
        ],
        "m/QK": [
            function(require, module, exports) {
                "use strict";
                module.exports = class extends Error {
                    constructor(e, s) {
                        super(`"${e.task}" exited with ${e.code}.`),
                            (this.name = e.name),
                            (this.code = e.code),
                            (this.results = s);
                    }
                };
            },
            {}
        ],
        "5T3V": [
            function(require, module, exports) {
                "use strict";
                const n = require("ansi-styles");
                module.exports = function(e, s, o) {
                    if (!s) return `\n> ${e}\n\n`;
                    const r = e.indexOf(" "),
                        t = -1 === r ? e : e.slice(0, r),
                        $ = -1 === r ? "" : e.slice(r + 1),
                        c = s.body.name,
                        i = s.body.version,
                        l = s.body.scripts[t],
                        p = s.path,
                        u = o ? n.gray : { open: "", close: "" };
                    return `\n${u.open}> ${c}@${i} ${t} ${p}${u.close}\n${u.open}> ${l} ${$}${u.close}\n\n`;
                };
            },
            {}
        ],
        HZWK: [
            function(require, module, exports) {
                "use strict";
                const e = require("stream"),
                    t = /\n/g;
                class s extends e.Transform {
                    constructor(e, t) {
                        super(), (this.prefix = e), (this.state = t);
                    }
                    _transform(e, s, r) {
                        const n = this.prefix,
                            a = `\n${n}`,
                            i = this.state,
                            l = `${
                                i.lastIsLinebreak ? n : i.lastPrefix !== n ? "\n" : ""
                            }${e}`.replace(t, a),
                            c = l.indexOf(n, Math.max(0, l.length - n.length));
                        (i.lastPrefix = n),
                            (i.lastIsLinebreak = -1 !== c),
                            r(null, -1 !== c ? l.slice(0, c) : l);
                    }
                }
                module.exports = function(e, t) {
                    return new s(e, t);
                };
            },
            {}
        ],
        "/Q4c": [
            function(require, module, exports) {
                "use strict";
                const r = require("cross-spawn"),
                    t = require("pidtree");
                function o() {
                    t(this.pid, { root: !0 }, (r, t) => {
                        if (!r)
                            for (const s of t)
                                try {
                                    process.kill(s);
                                } catch (o) {}
                    });
                }
                module.exports = function(t, s, e) {
                    const i = r(t, s, e);
                    return (i.kill = o), i;
                };
            },
            {}
        ],
        DaxP: [
            function(require, module, exports) {
                "use strict";
                module.exports = require("./spawn-posix");
            },
            { "./spawn-posix": "/Q4c" }
        ],
        vpwb: [
            function(require, module, exports) {
                "use strict";
                const e = require("path"),
                    t = require("chalk"),
                    r = require("shell-quote").parse,
                    n = require("string.prototype.padend"),
                    s = require("./create-header"),
                    p = require("./create-prefix-transform-stream"),
                    i = require("./spawn"),
                    o = [t.cyan, t.green, t.magenta, t.yellow, t.red];
                let a = 0;
                const l = new Map();
                function u(e) {
                    let t = l.get(e);
                    return t || ((t = o[a]), (a = (a + 1) % o.length), l.set(e, t)), t;
                }
                function c(e, t, r) {
                    if (null == t || !r.enabled) return t;
                    const s = n(e, r.width),
                        i = (t.isTTY ? u(e) : e => e)(`[${s}] `),
                        o = p(i, r);
                    return o.pipe(t), o;
                }
                function d(e, t) {
                    return null == e ? "ignore" : e === t && t.isTTY ? e : "pipe";
                }
                function f(e) {
                    return e.pattern || e.op || e;
                }
                module.exports = function(t, n) {
                    let p = null;
                    const o = new Promise((o, a) => {
                        const l = n.stdin,
                            u = c(t, n.stdout, n.labelState),
                            h = c(t, n.stderr, n.labelState),
                            m = d(l, process.stdin),
                            y = d(u, process.stdout),
                            g = d(h, process.stderr),
                            q = { stdio: [m, y, g] };
                        n.printName && null != u && u.write(s(t, n.packageInfo, n.stdout.isTTY));
                        const x = n.npmPath || process.env.npm_execpath,
                            w = "string" == typeof x && /\.m?js/.test(e.extname(x)),
                            T = w ? process.execPath : x || "npm",
                            b = e.basename(x || "npm").startsWith("yarn"),
                            k = ["run"];
                        w && k.unshift(x),
                            b
                                ? -1 !== n.prefixOptions.indexOf("--silent") && k.push("--silent")
                                : Array.prototype.push.apply(k, n.prefixOptions),
                            Array.prototype.push.apply(k, r(t).map(f)),
                            (p = i(T, k, q)),
                            "pipe" === m && l.pipe(p.stdin),
                            "pipe" === y &&
                                p.stdout.pipe(
                                    u,
                                    { end: !1 }
                                ),
                            "pipe" === g &&
                                p.stderr.pipe(
                                    h,
                                    { end: !1 }
                                ),
                            p.on("error", e => {
                                (p = null), a(e);
                            }),
                            p.on("close", (e, r) => {
                                (p = null), o({ task: t, code: e, signal: r });
                            });
                    });
                    return (
                        (o.abort = function() {
                            null != p && (p.kill(), (p = null));
                        }),
                        o
                    );
                };
            },
            {
                "./create-header": "5T3V",
                "./create-prefix-transform-stream": "HZWK",
                "./spawn": "DaxP"
            }
        ],
        U8F2: [
            function(require, module, exports) {
                "use strict";
                const e = require("memorystream"),
                    n = require("./npm-run-all-error"),
                    t = require("./run-task");
                function r(e, n) {
                    const t = e.indexOf(n);
                    -1 !== t && e.splice(t, 1);
                }
                const o = {
                    SIGABRT: 6,
                    SIGALRM: 14,
                    SIGBUS: 10,
                    SIGCHLD: 20,
                    SIGCONT: 19,
                    SIGFPE: 8,
                    SIGHUP: 1,
                    SIGILL: 4,
                    SIGINT: 2,
                    SIGKILL: 9,
                    SIGPIPE: 13,
                    SIGQUIT: 3,
                    SIGSEGV: 11,
                    SIGSTOP: 17,
                    SIGTERM: 15,
                    SIGTRAP: 5,
                    SIGTSTP: 18,
                    SIGTTIN: 21,
                    SIGTTOU: 22,
                    SIGUSR1: 30,
                    SIGUSR2: 31
                };
                function i(e) {
                    return o[e] || 0;
                }
                module.exports = function(o, u) {
                    return new Promise((l, c) => {
                        if (0 === o.length) return void l([]);
                        const S = o.map(e => ({ name: e, code: void 0 })),
                            I = o.map((e, n) => ({ name: e, index: n })),
                            a = [];
                        let s = null,
                            G = !1;
                        function d() {
                            null == s ? l(S) : c(s);
                        }
                        function f() {
                            if (!G)
                                if (((G = !0), 0 === a.length)) d();
                                else {
                                    for (const e of a) e.abort();
                                    Promise.all(a).then(d, c);
                                }
                        }
                        function g() {
                            if (G) return;
                            if (0 === I.length) return void (0 === a.length && d());
                            const o = u.stdout,
                                l = Object.assign({}, u),
                                c = new e(null, { readable: !1 });
                            u.aggregateOutput && (l.stdout = c);
                            const m = I.shift(),
                                T = t(m.name, l);
                            a.push(T),
                                T.then(
                                    e => {
                                        r(a, T),
                                            G ||
                                                (u.aggregateOutput && o.write(c.toString()),
                                                null === e.code &&
                                                    null !== e.signal &&
                                                    (e.code = 128 + i(e.signal)),
                                                (S[m.index].code = e.code),
                                                (!e.code ||
                                                    ((s = new n(e, S)), u.continueOnError)) &&
                                                (!u.race || e.code)
                                                    ? g()
                                                    : f());
                                    },
                                    e => {
                                        if ((r(a, T), !u.continueOnError || u.race))
                                            return (s = e), void f();
                                        g();
                                    }
                                );
                        }
                        const m = u.maxParallel,
                            T = "number" == typeof m && m > 0 ? Math.min(o.length, m) : o.length;
                        for (let e = 0; e < T; ++e) g();
                    });
                };
            },
            { "./npm-run-all-error": "m/QK", "./run-task": "vpwb" }
        ],
        Focm: [
            function(require, module, exports) {
                const e = require("shell-quote"),
                    r = require("./match-tasks"),
                    t = require("./read-package-json"),
                    n = require("./run-tasks"),
                    o = /\{(!)?([*@]|\d+)([^}]+)?}/g;
                function l(e) {
                    return null == e ? [] : Array.isArray(e) ? e : [e];
                }
                function a(r, t) {
                    const n = Object.create(null);
                    return r.map(r =>
                        r.replace(o, (r, o, l, a) => {
                            if (null != o) throw Error(`Invalid Placeholder: ${r}`);
                            if ("@" === l) return e.quote(t);
                            if ("*" === l) return e.quote([t.join(" ")]);
                            const s = parseInt(l, 10);
                            if (s >= 1 && s <= t.length) return e.quote([t[s - 1]]);
                            if (null != a) {
                                const t = a.slice(0, 2);
                                if (":=" === t) return (n[l] = e.quote([a.slice(2)])), n[l];
                                if (":-" === t) return e.quote([a.slice(2)]);
                                throw Error(`Invalid Placeholder: ${r}`);
                            }
                            return null != n[l] ? n[l] : "";
                        })
                    );
                }
                function s(e, r) {
                    const t = l(e);
                    return t.some(e => o.test(e)) ? a(t, r) : t;
                }
                function u(e) {
                    const r = [];
                    for (const t of Object.keys(e)) {
                        const n = e[t];
                        for (const e of Object.keys(n)) {
                            const o = n[e];
                            r.push(`--${t}:${e}=${o}`);
                        }
                    }
                    return r;
                }
                function i(e) {
                    return Object.keys(e).map(r => `--${r}=${e[r]}`);
                }
                function c(e, r) {
                    return Math.max(r.length, e);
                }
                module.exports = function(e, o) {
                    const l = (o && o.stdin) || null,
                        a = (o && o.stdout) || null,
                        f = (o && o.stderr) || null,
                        p = (o && o.taskList) || null,
                        g = (o && o.config) || null,
                        h = (o && o.packageConfig) || null,
                        d = (o && o.arguments) || [],
                        m = Boolean(o && o.parallel),
                        k = Boolean(o && o.silent),
                        I = Boolean(o && o.continueOnError),
                        q = Boolean(o && o.printLabel),
                        w = Boolean(o && o.printName),
                        P = Boolean(o && o.race),
                        O = m ? (o && o.maxParallel) || 0 : 1,
                        b = Boolean(o && o.aggregateOutput),
                        y = o && o.npmPath;
                    try {
                        const o = s(e, d);
                        if (0 === o.length) return Promise.resolve(null);
                        if (null != p && !1 === Array.isArray(p))
                            throw new Error("Invalid options.taskList");
                        if ("number" != typeof O || !(O >= 0))
                            throw new Error("Invalid options.maxParallel");
                        if (!m && b)
                            throw new Error(
                                "Invalid options.aggregateOutput; It requires options.parallel"
                            );
                        if (!m && P)
                            throw new Error("Invalid options.race; It requires options.parallel");
                        const v = [].concat(k ? ["--silent"] : [], h ? u(h) : [], g ? i(g) : []);
                        return Promise.resolve()
                            .then(() => (null != p ? { taskList: p, packageInfo: null } : t()))
                            .then(e => {
                                const t = r(e.taskList, o),
                                    s = t.reduce(c, 0);
                                return n(t, {
                                    stdin: l,
                                    stdout: a,
                                    stderr: f,
                                    prefixOptions: v,
                                    continueOnError: I,
                                    labelState: {
                                        enabled: q,
                                        width: s,
                                        lastPrefix: null,
                                        lastIsLinebreak: !0
                                    },
                                    printName: w,
                                    packageInfo: e.packageInfo,
                                    race: P,
                                    maxParallel: O,
                                    npmPath: y,
                                    aggregateOutput: b
                                });
                            });
                    } catch (E) {
                        return Promise.reject(new Error(E.message));
                    }
                };
            },
            { "./match-tasks": "xX+4", "./read-package-json": "7fyY", "./run-tasks": "U8F2" }
        ]
    },
    {},
    ["Focm"],
    null
);

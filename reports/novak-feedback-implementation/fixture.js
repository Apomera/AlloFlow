(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // desktop/web-app/node_modules/react/cjs/react.production.min.js
  var require_react_production_min = __commonJS({
    "desktop/web-app/node_modules/react/cjs/react.production.min.js"(exports) {
      "use strict";
      var l = /* @__PURE__ */ Symbol.for("react.element");
      var n = /* @__PURE__ */ Symbol.for("react.portal");
      var p = /* @__PURE__ */ Symbol.for("react.fragment");
      var q = /* @__PURE__ */ Symbol.for("react.strict_mode");
      var r = /* @__PURE__ */ Symbol.for("react.profiler");
      var t = /* @__PURE__ */ Symbol.for("react.provider");
      var u = /* @__PURE__ */ Symbol.for("react.context");
      var v = /* @__PURE__ */ Symbol.for("react.forward_ref");
      var w = /* @__PURE__ */ Symbol.for("react.suspense");
      var x = /* @__PURE__ */ Symbol.for("react.memo");
      var y = /* @__PURE__ */ Symbol.for("react.lazy");
      var z = Symbol.iterator;
      function A(a) {
        if (null === a || "object" !== typeof a) return null;
        a = z && a[z] || a["@@iterator"];
        return "function" === typeof a ? a : null;
      }
      var B = { isMounted: function() {
        return false;
      }, enqueueForceUpdate: function() {
      }, enqueueReplaceState: function() {
      }, enqueueSetState: function() {
      } };
      var C = Object.assign;
      var D = {};
      function E(a, b, e) {
        this.props = a;
        this.context = b;
        this.refs = D;
        this.updater = e || B;
      }
      E.prototype.isReactComponent = {};
      E.prototype.setState = function(a, b) {
        if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
        this.updater.enqueueSetState(this, a, b, "setState");
      };
      E.prototype.forceUpdate = function(a) {
        this.updater.enqueueForceUpdate(this, a, "forceUpdate");
      };
      function F() {
      }
      F.prototype = E.prototype;
      function G(a, b, e) {
        this.props = a;
        this.context = b;
        this.refs = D;
        this.updater = e || B;
      }
      var H = G.prototype = new F();
      H.constructor = G;
      C(H, E.prototype);
      H.isPureReactComponent = true;
      var I = Array.isArray;
      var J = Object.prototype.hasOwnProperty;
      var K = { current: null };
      var L = { key: true, ref: true, __self: true, __source: true };
      function M(a, b, e) {
        var d, c = {}, k = null, h = null;
        if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
        var g = arguments.length - 2;
        if (1 === g) c.children = e;
        else if (1 < g) {
          for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
          c.children = f;
        }
        if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
        return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
      }
      function N(a, b) {
        return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
      }
      function O(a) {
        return "object" === typeof a && null !== a && a.$$typeof === l;
      }
      function escape(a) {
        var b = { "=": "=0", ":": "=2" };
        return "$" + a.replace(/[=:]/g, function(a2) {
          return b[a2];
        });
      }
      var P = /\/+/g;
      function Q(a, b) {
        return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
      }
      function R(a, b, e, d, c) {
        var k = typeof a;
        if ("undefined" === k || "boolean" === k) a = null;
        var h = false;
        if (null === a) h = true;
        else switch (k) {
          case "string":
          case "number":
            h = true;
            break;
          case "object":
            switch (a.$$typeof) {
              case l:
              case n:
                h = true;
            }
        }
        if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
          return a2;
        })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
        h = 0;
        d = "" === d ? "." : d + ":";
        if (I(a)) for (var g = 0; g < a.length; g++) {
          k = a[g];
          var f = d + Q(k, g);
          h += R(k, b, e, f, c);
        }
        else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
        else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
        return h;
      }
      function S(a, b, e) {
        if (null == a) return a;
        var d = [], c = 0;
        R(a, d, "", "", function(a2) {
          return b.call(e, a2, c++);
        });
        return d;
      }
      function T(a) {
        if (-1 === a._status) {
          var b = a._result;
          b = b();
          b.then(function(b2) {
            if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
          }, function(b2) {
            if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
          });
          -1 === a._status && (a._status = 0, a._result = b);
        }
        if (1 === a._status) return a._result.default;
        throw a._result;
      }
      var U = { current: null };
      var V = { transition: null };
      var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
      function X() {
        throw Error("act(...) is not supported in production builds of React.");
      }
      exports.Children = { map: S, forEach: function(a, b, e) {
        S(a, function() {
          b.apply(this, arguments);
        }, e);
      }, count: function(a) {
        var b = 0;
        S(a, function() {
          b++;
        });
        return b;
      }, toArray: function(a) {
        return S(a, function(a2) {
          return a2;
        }) || [];
      }, only: function(a) {
        if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
        return a;
      } };
      exports.Component = E;
      exports.Fragment = p;
      exports.Profiler = r;
      exports.PureComponent = G;
      exports.StrictMode = q;
      exports.Suspense = w;
      exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
      exports.act = X;
      exports.cloneElement = function(a, b, e) {
        if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
        var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
        if (null != b) {
          void 0 !== b.ref && (k = b.ref, h = K.current);
          void 0 !== b.key && (c = "" + b.key);
          if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
          for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
        }
        var f = arguments.length - 2;
        if (1 === f) d.children = e;
        else if (1 < f) {
          g = Array(f);
          for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
          d.children = g;
        }
        return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
      };
      exports.createContext = function(a) {
        a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
        a.Provider = { $$typeof: t, _context: a };
        return a.Consumer = a;
      };
      exports.createElement = M;
      exports.createFactory = function(a) {
        var b = M.bind(null, a);
        b.type = a;
        return b;
      };
      exports.createRef = function() {
        return { current: null };
      };
      exports.forwardRef = function(a) {
        return { $$typeof: v, render: a };
      };
      exports.isValidElement = O;
      exports.lazy = function(a) {
        return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
      };
      exports.memo = function(a, b) {
        return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
      };
      exports.startTransition = function(a) {
        var b = V.transition;
        V.transition = {};
        try {
          a();
        } finally {
          V.transition = b;
        }
      };
      exports.unstable_act = X;
      exports.useCallback = function(a, b) {
        return U.current.useCallback(a, b);
      };
      exports.useContext = function(a) {
        return U.current.useContext(a);
      };
      exports.useDebugValue = function() {
      };
      exports.useDeferredValue = function(a) {
        return U.current.useDeferredValue(a);
      };
      exports.useEffect = function(a, b) {
        return U.current.useEffect(a, b);
      };
      exports.useId = function() {
        return U.current.useId();
      };
      exports.useImperativeHandle = function(a, b, e) {
        return U.current.useImperativeHandle(a, b, e);
      };
      exports.useInsertionEffect = function(a, b) {
        return U.current.useInsertionEffect(a, b);
      };
      exports.useLayoutEffect = function(a, b) {
        return U.current.useLayoutEffect(a, b);
      };
      exports.useMemo = function(a, b) {
        return U.current.useMemo(a, b);
      };
      exports.useReducer = function(a, b, e) {
        return U.current.useReducer(a, b, e);
      };
      exports.useRef = function(a) {
        return U.current.useRef(a);
      };
      exports.useState = function(a) {
        return U.current.useState(a);
      };
      exports.useSyncExternalStore = function(a, b, e) {
        return U.current.useSyncExternalStore(a, b, e);
      };
      exports.useTransition = function() {
        return U.current.useTransition();
      };
      exports.version = "18.3.1";
    }
  });

  // desktop/web-app/node_modules/react/index.js
  var require_react = __commonJS({
    "desktop/web-app/node_modules/react/index.js"(exports, module) {
      "use strict";
      if (true) {
        module.exports = require_react_production_min();
      } else {
        module.exports = null;
      }
    }
  });

  // desktop/web-app/node_modules/scheduler/cjs/scheduler.production.min.js
  var require_scheduler_production_min = __commonJS({
    "desktop/web-app/node_modules/scheduler/cjs/scheduler.production.min.js"(exports) {
      "use strict";
      function f(a, b) {
        var c = a.length;
        a.push(b);
        a: for (; 0 < c; ) {
          var d = c - 1 >>> 1, e = a[d];
          if (0 < g(e, b)) a[d] = b, a[c] = e, c = d;
          else break a;
        }
      }
      function h(a) {
        return 0 === a.length ? null : a[0];
      }
      function k(a) {
        if (0 === a.length) return null;
        var b = a[0], c = a.pop();
        if (c !== b) {
          a[0] = c;
          a: for (var d = 0, e = a.length, w = e >>> 1; d < w; ) {
            var m = 2 * (d + 1) - 1, C = a[m], n = m + 1, x = a[n];
            if (0 > g(C, c)) n < e && 0 > g(x, C) ? (a[d] = x, a[n] = c, d = n) : (a[d] = C, a[m] = c, d = m);
            else if (n < e && 0 > g(x, c)) a[d] = x, a[n] = c, d = n;
            else break a;
          }
        }
        return b;
      }
      function g(a, b) {
        var c = a.sortIndex - b.sortIndex;
        return 0 !== c ? c : a.id - b.id;
      }
      if ("object" === typeof performance && "function" === typeof performance.now) {
        l = performance;
        exports.unstable_now = function() {
          return l.now();
        };
      } else {
        p = Date, q = p.now();
        exports.unstable_now = function() {
          return p.now() - q;
        };
      }
      var l;
      var p;
      var q;
      var r = [];
      var t = [];
      var u = 1;
      var v = null;
      var y = 3;
      var z = false;
      var A = false;
      var B = false;
      var D = "function" === typeof setTimeout ? setTimeout : null;
      var E = "function" === typeof clearTimeout ? clearTimeout : null;
      var F = "undefined" !== typeof setImmediate ? setImmediate : null;
      "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
      function G(a) {
        for (var b = h(t); null !== b; ) {
          if (null === b.callback) k(t);
          else if (b.startTime <= a) k(t), b.sortIndex = b.expirationTime, f(r, b);
          else break;
          b = h(t);
        }
      }
      function H(a) {
        B = false;
        G(a);
        if (!A) if (null !== h(r)) A = true, I(J);
        else {
          var b = h(t);
          null !== b && K(H, b.startTime - a);
        }
      }
      function J(a, b) {
        A = false;
        B && (B = false, E(L), L = -1);
        z = true;
        var c = y;
        try {
          G(b);
          for (v = h(r); null !== v && (!(v.expirationTime > b) || a && !M()); ) {
            var d = v.callback;
            if ("function" === typeof d) {
              v.callback = null;
              y = v.priorityLevel;
              var e = d(v.expirationTime <= b);
              b = exports.unstable_now();
              "function" === typeof e ? v.callback = e : v === h(r) && k(r);
              G(b);
            } else k(r);
            v = h(r);
          }
          if (null !== v) var w = true;
          else {
            var m = h(t);
            null !== m && K(H, m.startTime - b);
            w = false;
          }
          return w;
        } finally {
          v = null, y = c, z = false;
        }
      }
      var N = false;
      var O = null;
      var L = -1;
      var P = 5;
      var Q = -1;
      function M() {
        return exports.unstable_now() - Q < P ? false : true;
      }
      function R() {
        if (null !== O) {
          var a = exports.unstable_now();
          Q = a;
          var b = true;
          try {
            b = O(true, a);
          } finally {
            b ? S() : (N = false, O = null);
          }
        } else N = false;
      }
      var S;
      if ("function" === typeof F) S = function() {
        F(R);
      };
      else if ("undefined" !== typeof MessageChannel) {
        T = new MessageChannel(), U = T.port2;
        T.port1.onmessage = R;
        S = function() {
          U.postMessage(null);
        };
      } else S = function() {
        D(R, 0);
      };
      var T;
      var U;
      function I(a) {
        O = a;
        N || (N = true, S());
      }
      function K(a, b) {
        L = D(function() {
          a(exports.unstable_now());
        }, b);
      }
      exports.unstable_IdlePriority = 5;
      exports.unstable_ImmediatePriority = 1;
      exports.unstable_LowPriority = 4;
      exports.unstable_NormalPriority = 3;
      exports.unstable_Profiling = null;
      exports.unstable_UserBlockingPriority = 2;
      exports.unstable_cancelCallback = function(a) {
        a.callback = null;
      };
      exports.unstable_continueExecution = function() {
        A || z || (A = true, I(J));
      };
      exports.unstable_forceFrameRate = function(a) {
        0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P = 0 < a ? Math.floor(1e3 / a) : 5;
      };
      exports.unstable_getCurrentPriorityLevel = function() {
        return y;
      };
      exports.unstable_getFirstCallbackNode = function() {
        return h(r);
      };
      exports.unstable_next = function(a) {
        switch (y) {
          case 1:
          case 2:
          case 3:
            var b = 3;
            break;
          default:
            b = y;
        }
        var c = y;
        y = b;
        try {
          return a();
        } finally {
          y = c;
        }
      };
      exports.unstable_pauseExecution = function() {
      };
      exports.unstable_requestPaint = function() {
      };
      exports.unstable_runWithPriority = function(a, b) {
        switch (a) {
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
            break;
          default:
            a = 3;
        }
        var c = y;
        y = a;
        try {
          return b();
        } finally {
          y = c;
        }
      };
      exports.unstable_scheduleCallback = function(a, b, c) {
        var d = exports.unstable_now();
        "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
        switch (a) {
          case 1:
            var e = -1;
            break;
          case 2:
            e = 250;
            break;
          case 5:
            e = 1073741823;
            break;
          case 4:
            e = 1e4;
            break;
          default:
            e = 5e3;
        }
        e = c + e;
        a = { id: u++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
        c > d ? (a.sortIndex = c, f(t, a), null === h(r) && a === h(t) && (B ? (E(L), L = -1) : B = true, K(H, c - d))) : (a.sortIndex = e, f(r, a), A || z || (A = true, I(J)));
        return a;
      };
      exports.unstable_shouldYield = M;
      exports.unstable_wrapCallback = function(a) {
        var b = y;
        return function() {
          var c = y;
          y = b;
          try {
            return a.apply(this, arguments);
          } finally {
            y = c;
          }
        };
      };
    }
  });

  // desktop/web-app/node_modules/scheduler/index.js
  var require_scheduler = __commonJS({
    "desktop/web-app/node_modules/scheduler/index.js"(exports, module) {
      "use strict";
      if (true) {
        module.exports = require_scheduler_production_min();
      } else {
        module.exports = null;
      }
    }
  });

  // desktop/web-app/node_modules/react-dom/cjs/react-dom.production.min.js
  var require_react_dom_production_min = __commonJS({
    "desktop/web-app/node_modules/react-dom/cjs/react-dom.production.min.js"(exports) {
      "use strict";
      var aa = require_react();
      var ca = require_scheduler();
      function p(a) {
        for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);
        return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
      }
      var da = /* @__PURE__ */ new Set();
      var ea = {};
      function fa(a, b) {
        ha(a, b);
        ha(a + "Capture", b);
      }
      function ha(a, b) {
        ea[a] = b;
        for (a = 0; a < b.length; a++) da.add(b[a]);
      }
      var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement);
      var ja = Object.prototype.hasOwnProperty;
      var ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/;
      var la = {};
      var ma = {};
      function oa(a) {
        if (ja.call(ma, a)) return true;
        if (ja.call(la, a)) return false;
        if (ka.test(a)) return ma[a] = true;
        la[a] = true;
        return false;
      }
      function pa(a, b, c, d) {
        if (null !== c && 0 === c.type) return false;
        switch (typeof b) {
          case "function":
          case "symbol":
            return true;
          case "boolean":
            if (d) return false;
            if (null !== c) return !c.acceptsBooleans;
            a = a.toLowerCase().slice(0, 5);
            return "data-" !== a && "aria-" !== a;
          default:
            return false;
        }
      }
      function qa(a, b, c, d) {
        if (null === b || "undefined" === typeof b || pa(a, b, c, d)) return true;
        if (d) return false;
        if (null !== c) switch (c.type) {
          case 3:
            return !b;
          case 4:
            return false === b;
          case 5:
            return isNaN(b);
          case 6:
            return isNaN(b) || 1 > b;
        }
        return false;
      }
      function v(a, b, c, d, e, f, g) {
        this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
        this.attributeName = d;
        this.attributeNamespace = e;
        this.mustUseProperty = c;
        this.propertyName = a;
        this.type = b;
        this.sanitizeURL = f;
        this.removeEmptyString = g;
      }
      var z = {};
      "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
        z[a] = new v(a, 0, false, a, null, false, false);
      });
      [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
        var b = a[0];
        z[b] = new v(b, 1, false, a[1], null, false, false);
      });
      ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
        z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
      });
      ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
        z[a] = new v(a, 2, false, a, null, false, false);
      });
      "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
        z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
      });
      ["checked", "multiple", "muted", "selected"].forEach(function(a) {
        z[a] = new v(a, 3, true, a, null, false, false);
      });
      ["capture", "download"].forEach(function(a) {
        z[a] = new v(a, 4, false, a, null, false, false);
      });
      ["cols", "rows", "size", "span"].forEach(function(a) {
        z[a] = new v(a, 6, false, a, null, false, false);
      });
      ["rowSpan", "start"].forEach(function(a) {
        z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
      });
      var ra = /[\-:]([a-z])/g;
      function sa(a) {
        return a[1].toUpperCase();
      }
      "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
        var b = a.replace(
          ra,
          sa
        );
        z[b] = new v(b, 1, false, a, null, false, false);
      });
      "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
        var b = a.replace(ra, sa);
        z[b] = new v(b, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
      });
      ["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
        var b = a.replace(ra, sa);
        z[b] = new v(b, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
      });
      ["tabIndex", "crossOrigin"].forEach(function(a) {
        z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
      });
      z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
      ["src", "href", "action", "formAction"].forEach(function(a) {
        z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
      });
      function ta(a, b, c, d) {
        var e = z.hasOwnProperty(b) ? z[b] : null;
        if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
      }
      var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      var va = /* @__PURE__ */ Symbol.for("react.element");
      var wa = /* @__PURE__ */ Symbol.for("react.portal");
      var ya = /* @__PURE__ */ Symbol.for("react.fragment");
      var za = /* @__PURE__ */ Symbol.for("react.strict_mode");
      var Aa = /* @__PURE__ */ Symbol.for("react.profiler");
      var Ba = /* @__PURE__ */ Symbol.for("react.provider");
      var Ca = /* @__PURE__ */ Symbol.for("react.context");
      var Da = /* @__PURE__ */ Symbol.for("react.forward_ref");
      var Ea = /* @__PURE__ */ Symbol.for("react.suspense");
      var Fa = /* @__PURE__ */ Symbol.for("react.suspense_list");
      var Ga = /* @__PURE__ */ Symbol.for("react.memo");
      var Ha = /* @__PURE__ */ Symbol.for("react.lazy");
      var Ia = /* @__PURE__ */ Symbol.for("react.offscreen");
      var Ja = Symbol.iterator;
      function Ka(a) {
        if (null === a || "object" !== typeof a) return null;
        a = Ja && a[Ja] || a["@@iterator"];
        return "function" === typeof a ? a : null;
      }
      var A = Object.assign;
      var La;
      function Ma(a) {
        if (void 0 === La) try {
          throw Error();
        } catch (c) {
          var b = c.stack.trim().match(/\n( *(at )?)/);
          La = b && b[1] || "";
        }
        return "\n" + La + a;
      }
      var Na = false;
      function Oa(a, b) {
        if (!a || Na) return "";
        Na = true;
        var c = Error.prepareStackTrace;
        Error.prepareStackTrace = void 0;
        try {
          if (b) if (b = function() {
            throw Error();
          }, Object.defineProperty(b.prototype, "props", { set: function() {
            throw Error();
          } }), "object" === typeof Reflect && Reflect.construct) {
            try {
              Reflect.construct(b, []);
            } catch (l) {
              var d = l;
            }
            Reflect.construct(a, [], b);
          } else {
            try {
              b.call();
            } catch (l) {
              d = l;
            }
            a.call(b.prototype);
          }
          else {
            try {
              throw Error();
            } catch (l) {
              d = l;
            }
            a();
          }
        } catch (l) {
          if (l && d && "string" === typeof l.stack) {
            for (var e = l.stack.split("\n"), f = d.stack.split("\n"), g = e.length - 1, h = f.length - 1; 1 <= g && 0 <= h && e[g] !== f[h]; ) h--;
            for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f[h]) {
              if (1 !== g || 1 !== h) {
                do
                  if (g--, h--, 0 > h || e[g] !== f[h]) {
                    var k = "\n" + e[g].replace(" at new ", " at ");
                    a.displayName && k.includes("<anonymous>") && (k = k.replace("<anonymous>", a.displayName));
                    return k;
                  }
                while (1 <= g && 0 <= h);
              }
              break;
            }
          }
        } finally {
          Na = false, Error.prepareStackTrace = c;
        }
        return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
      }
      function Pa(a) {
        switch (a.tag) {
          case 5:
            return Ma(a.type);
          case 16:
            return Ma("Lazy");
          case 13:
            return Ma("Suspense");
          case 19:
            return Ma("SuspenseList");
          case 0:
          case 2:
          case 15:
            return a = Oa(a.type, false), a;
          case 11:
            return a = Oa(a.type.render, false), a;
          case 1:
            return a = Oa(a.type, true), a;
          default:
            return "";
        }
      }
      function Qa(a) {
        if (null == a) return null;
        if ("function" === typeof a) return a.displayName || a.name || null;
        if ("string" === typeof a) return a;
        switch (a) {
          case ya:
            return "Fragment";
          case wa:
            return "Portal";
          case Aa:
            return "Profiler";
          case za:
            return "StrictMode";
          case Ea:
            return "Suspense";
          case Fa:
            return "SuspenseList";
        }
        if ("object" === typeof a) switch (a.$$typeof) {
          case Ca:
            return (a.displayName || "Context") + ".Consumer";
          case Ba:
            return (a._context.displayName || "Context") + ".Provider";
          case Da:
            var b = a.render;
            a = a.displayName;
            a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
            return a;
          case Ga:
            return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
          case Ha:
            b = a._payload;
            a = a._init;
            try {
              return Qa(a(b));
            } catch (c) {
            }
        }
        return null;
      }
      function Ra(a) {
        var b = a.type;
        switch (a.tag) {
          case 24:
            return "Cache";
          case 9:
            return (b.displayName || "Context") + ".Consumer";
          case 10:
            return (b._context.displayName || "Context") + ".Provider";
          case 18:
            return "DehydratedFragment";
          case 11:
            return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
          case 7:
            return "Fragment";
          case 5:
            return b;
          case 4:
            return "Portal";
          case 3:
            return "Root";
          case 6:
            return "Text";
          case 16:
            return Qa(b);
          case 8:
            return b === za ? "StrictMode" : "Mode";
          case 22:
            return "Offscreen";
          case 12:
            return "Profiler";
          case 21:
            return "Scope";
          case 13:
            return "Suspense";
          case 19:
            return "SuspenseList";
          case 25:
            return "TracingMarker";
          case 1:
          case 0:
          case 17:
          case 2:
          case 14:
          case 15:
            if ("function" === typeof b) return b.displayName || b.name || null;
            if ("string" === typeof b) return b;
        }
        return null;
      }
      function Sa(a) {
        switch (typeof a) {
          case "boolean":
          case "number":
          case "string":
          case "undefined":
            return a;
          case "object":
            return a;
          default:
            return "";
        }
      }
      function Ta(a) {
        var b = a.type;
        return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
      }
      function Ua(a) {
        var b = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b), d = "" + a[b];
        if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
          var e = c.get, f = c.set;
          Object.defineProperty(a, b, { configurable: true, get: function() {
            return e.call(this);
          }, set: function(a2) {
            d = "" + a2;
            f.call(this, a2);
          } });
          Object.defineProperty(a, b, { enumerable: c.enumerable });
          return { getValue: function() {
            return d;
          }, setValue: function(a2) {
            d = "" + a2;
          }, stopTracking: function() {
            a._valueTracker = null;
            delete a[b];
          } };
        }
      }
      function Va(a) {
        a._valueTracker || (a._valueTracker = Ua(a));
      }
      function Wa(a) {
        if (!a) return false;
        var b = a._valueTracker;
        if (!b) return true;
        var c = b.getValue();
        var d = "";
        a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
        a = d;
        return a !== c ? (b.setValue(a), true) : false;
      }
      function Xa(a) {
        a = a || ("undefined" !== typeof document ? document : void 0);
        if ("undefined" === typeof a) return null;
        try {
          return a.activeElement || a.body;
        } catch (b) {
          return a.body;
        }
      }
      function Ya(a, b) {
        var c = b.checked;
        return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
      }
      function Za(a, b) {
        var c = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
        c = Sa(null != b.value ? b.value : c);
        a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
      }
      function ab(a, b) {
        b = b.checked;
        null != b && ta(a, "checked", b, false);
      }
      function bb(a, b) {
        ab(a, b);
        var c = Sa(b.value), d = b.type;
        if (null != c) if ("number" === d) {
          if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
        } else a.value !== "" + c && (a.value = "" + c);
        else if ("submit" === d || "reset" === d) {
          a.removeAttribute("value");
          return;
        }
        b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
        null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
      }
      function db(a, b, c) {
        if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
          var d = b.type;
          if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
          b = "" + a._wrapperState.initialValue;
          c || b === a.value || (a.value = b);
          a.defaultValue = b;
        }
        c = a.name;
        "" !== c && (a.name = "");
        a.defaultChecked = !!a._wrapperState.initialChecked;
        "" !== c && (a.name = c);
      }
      function cb(a, b, c) {
        if ("number" !== b || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
      }
      var eb = Array.isArray;
      function fb(a, b, c, d) {
        a = a.options;
        if (b) {
          b = {};
          for (var e = 0; e < c.length; e++) b["$" + c[e]] = true;
          for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
        } else {
          c = "" + Sa(c);
          b = null;
          for (e = 0; e < a.length; e++) {
            if (a[e].value === c) {
              a[e].selected = true;
              d && (a[e].defaultSelected = true);
              return;
            }
            null !== b || a[e].disabled || (b = a[e]);
          }
          null !== b && (b.selected = true);
        }
      }
      function gb(a, b) {
        if (null != b.dangerouslySetInnerHTML) throw Error(p(91));
        return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
      }
      function hb(a, b) {
        var c = b.value;
        if (null == c) {
          c = b.children;
          b = b.defaultValue;
          if (null != c) {
            if (null != b) throw Error(p(92));
            if (eb(c)) {
              if (1 < c.length) throw Error(p(93));
              c = c[0];
            }
            b = c;
          }
          null == b && (b = "");
          c = b;
        }
        a._wrapperState = { initialValue: Sa(c) };
      }
      function ib(a, b) {
        var c = Sa(b.value), d = Sa(b.defaultValue);
        null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
        null != d && (a.defaultValue = "" + d);
      }
      function jb(a) {
        var b = a.textContent;
        b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
      }
      function kb(a) {
        switch (a) {
          case "svg":
            return "http://www.w3.org/2000/svg";
          case "math":
            return "http://www.w3.org/1998/Math/MathML";
          default:
            return "http://www.w3.org/1999/xhtml";
        }
      }
      function lb(a, b) {
        return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
      }
      var mb;
      var nb = (function(a) {
        return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
          MSApp.execUnsafeLocalFunction(function() {
            return a(b, c, d, e);
          });
        } : a;
      })(function(a, b) {
        if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b;
        else {
          mb = mb || document.createElement("div");
          mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
          for (b = mb.firstChild; a.firstChild; ) a.removeChild(a.firstChild);
          for (; b.firstChild; ) a.appendChild(b.firstChild);
        }
      });
      function ob(a, b) {
        if (b) {
          var c = a.firstChild;
          if (c && c === a.lastChild && 3 === c.nodeType) {
            c.nodeValue = b;
            return;
          }
        }
        a.textContent = b;
      }
      var pb = {
        animationIterationCount: true,
        aspectRatio: true,
        borderImageOutset: true,
        borderImageSlice: true,
        borderImageWidth: true,
        boxFlex: true,
        boxFlexGroup: true,
        boxOrdinalGroup: true,
        columnCount: true,
        columns: true,
        flex: true,
        flexGrow: true,
        flexPositive: true,
        flexShrink: true,
        flexNegative: true,
        flexOrder: true,
        gridArea: true,
        gridRow: true,
        gridRowEnd: true,
        gridRowSpan: true,
        gridRowStart: true,
        gridColumn: true,
        gridColumnEnd: true,
        gridColumnSpan: true,
        gridColumnStart: true,
        fontWeight: true,
        lineClamp: true,
        lineHeight: true,
        opacity: true,
        order: true,
        orphans: true,
        tabSize: true,
        widows: true,
        zIndex: true,
        zoom: true,
        fillOpacity: true,
        floodOpacity: true,
        stopOpacity: true,
        strokeDasharray: true,
        strokeDashoffset: true,
        strokeMiterlimit: true,
        strokeOpacity: true,
        strokeWidth: true
      };
      var qb = ["Webkit", "ms", "Moz", "O"];
      Object.keys(pb).forEach(function(a) {
        qb.forEach(function(b) {
          b = b + a.charAt(0).toUpperCase() + a.substring(1);
          pb[b] = pb[a];
        });
      });
      function rb(a, b, c) {
        return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
      }
      function sb(a, b) {
        a = a.style;
        for (var c in b) if (b.hasOwnProperty(c)) {
          var d = 0 === c.indexOf("--"), e = rb(c, b[c], d);
          "float" === c && (c = "cssFloat");
          d ? a.setProperty(c, e) : a[c] = e;
        }
      }
      var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
      function ub(a, b) {
        if (b) {
          if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p(137, a));
          if (null != b.dangerouslySetInnerHTML) {
            if (null != b.children) throw Error(p(60));
            if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p(61));
          }
          if (null != b.style && "object" !== typeof b.style) throw Error(p(62));
        }
      }
      function vb(a, b) {
        if (-1 === a.indexOf("-")) return "string" === typeof b.is;
        switch (a) {
          case "annotation-xml":
          case "color-profile":
          case "font-face":
          case "font-face-src":
          case "font-face-uri":
          case "font-face-format":
          case "font-face-name":
          case "missing-glyph":
            return false;
          default:
            return true;
        }
      }
      var wb = null;
      function xb(a) {
        a = a.target || a.srcElement || window;
        a.correspondingUseElement && (a = a.correspondingUseElement);
        return 3 === a.nodeType ? a.parentNode : a;
      }
      var yb = null;
      var zb = null;
      var Ab = null;
      function Bb(a) {
        if (a = Cb(a)) {
          if ("function" !== typeof yb) throw Error(p(280));
          var b = a.stateNode;
          b && (b = Db(b), yb(a.stateNode, a.type, b));
        }
      }
      function Eb(a) {
        zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
      }
      function Fb() {
        if (zb) {
          var a = zb, b = Ab;
          Ab = zb = null;
          Bb(a);
          if (b) for (a = 0; a < b.length; a++) Bb(b[a]);
        }
      }
      function Gb(a, b) {
        return a(b);
      }
      function Hb() {
      }
      var Ib = false;
      function Jb(a, b, c) {
        if (Ib) return a(b, c);
        Ib = true;
        try {
          return Gb(a, b, c);
        } finally {
          if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
        }
      }
      function Kb(a, b) {
        var c = a.stateNode;
        if (null === c) return null;
        var d = Db(c);
        if (null === d) return null;
        c = d[b];
        a: switch (b) {
          case "onClick":
          case "onClickCapture":
          case "onDoubleClick":
          case "onDoubleClickCapture":
          case "onMouseDown":
          case "onMouseDownCapture":
          case "onMouseMove":
          case "onMouseMoveCapture":
          case "onMouseUp":
          case "onMouseUpCapture":
          case "onMouseEnter":
            (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
            a = !d;
            break a;
          default:
            a = false;
        }
        if (a) return null;
        if (c && "function" !== typeof c) throw Error(p(231, b, typeof c));
        return c;
      }
      var Lb = false;
      if (ia) try {
        Mb = {};
        Object.defineProperty(Mb, "passive", { get: function() {
          Lb = true;
        } });
        window.addEventListener("test", Mb, Mb);
        window.removeEventListener("test", Mb, Mb);
      } catch (a) {
        Lb = false;
      }
      var Mb;
      function Nb(a, b, c, d, e, f, g, h, k) {
        var l = Array.prototype.slice.call(arguments, 3);
        try {
          b.apply(c, l);
        } catch (m) {
          this.onError(m);
        }
      }
      var Ob = false;
      var Pb = null;
      var Qb = false;
      var Rb = null;
      var Sb = { onError: function(a) {
        Ob = true;
        Pb = a;
      } };
      function Tb(a, b, c, d, e, f, g, h, k) {
        Ob = false;
        Pb = null;
        Nb.apply(Sb, arguments);
      }
      function Ub(a, b, c, d, e, f, g, h, k) {
        Tb.apply(this, arguments);
        if (Ob) {
          if (Ob) {
            var l = Pb;
            Ob = false;
            Pb = null;
          } else throw Error(p(198));
          Qb || (Qb = true, Rb = l);
        }
      }
      function Vb(a) {
        var b = a, c = a;
        if (a.alternate) for (; b.return; ) b = b.return;
        else {
          a = b;
          do
            b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return;
          while (a);
        }
        return 3 === b.tag ? c : null;
      }
      function Wb(a) {
        if (13 === a.tag) {
          var b = a.memoizedState;
          null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
          if (null !== b) return b.dehydrated;
        }
        return null;
      }
      function Xb(a) {
        if (Vb(a) !== a) throw Error(p(188));
      }
      function Yb(a) {
        var b = a.alternate;
        if (!b) {
          b = Vb(a);
          if (null === b) throw Error(p(188));
          return b !== a ? null : a;
        }
        for (var c = a, d = b; ; ) {
          var e = c.return;
          if (null === e) break;
          var f = e.alternate;
          if (null === f) {
            d = e.return;
            if (null !== d) {
              c = d;
              continue;
            }
            break;
          }
          if (e.child === f.child) {
            for (f = e.child; f; ) {
              if (f === c) return Xb(e), a;
              if (f === d) return Xb(e), b;
              f = f.sibling;
            }
            throw Error(p(188));
          }
          if (c.return !== d.return) c = e, d = f;
          else {
            for (var g = false, h = e.child; h; ) {
              if (h === c) {
                g = true;
                c = e;
                d = f;
                break;
              }
              if (h === d) {
                g = true;
                d = e;
                c = f;
                break;
              }
              h = h.sibling;
            }
            if (!g) {
              for (h = f.child; h; ) {
                if (h === c) {
                  g = true;
                  c = f;
                  d = e;
                  break;
                }
                if (h === d) {
                  g = true;
                  d = f;
                  c = e;
                  break;
                }
                h = h.sibling;
              }
              if (!g) throw Error(p(189));
            }
          }
          if (c.alternate !== d) throw Error(p(190));
        }
        if (3 !== c.tag) throw Error(p(188));
        return c.stateNode.current === c ? a : b;
      }
      function Zb(a) {
        a = Yb(a);
        return null !== a ? $b(a) : null;
      }
      function $b(a) {
        if (5 === a.tag || 6 === a.tag) return a;
        for (a = a.child; null !== a; ) {
          var b = $b(a);
          if (null !== b) return b;
          a = a.sibling;
        }
        return null;
      }
      var ac = ca.unstable_scheduleCallback;
      var bc = ca.unstable_cancelCallback;
      var cc = ca.unstable_shouldYield;
      var dc = ca.unstable_requestPaint;
      var B = ca.unstable_now;
      var ec = ca.unstable_getCurrentPriorityLevel;
      var fc = ca.unstable_ImmediatePriority;
      var gc = ca.unstable_UserBlockingPriority;
      var hc = ca.unstable_NormalPriority;
      var ic = ca.unstable_LowPriority;
      var jc = ca.unstable_IdlePriority;
      var kc = null;
      var lc = null;
      function mc(a) {
        if (lc && "function" === typeof lc.onCommitFiberRoot) try {
          lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
        } catch (b) {
        }
      }
      var oc = Math.clz32 ? Math.clz32 : nc;
      var pc = Math.log;
      var qc = Math.LN2;
      function nc(a) {
        a >>>= 0;
        return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
      }
      var rc = 64;
      var sc = 4194304;
      function tc(a) {
        switch (a & -a) {
          case 1:
            return 1;
          case 2:
            return 2;
          case 4:
            return 4;
          case 8:
            return 8;
          case 16:
            return 16;
          case 32:
            return 32;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
            return a & 4194240;
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            return a & 130023424;
          case 134217728:
            return 134217728;
          case 268435456:
            return 268435456;
          case 536870912:
            return 536870912;
          case 1073741824:
            return 1073741824;
          default:
            return a;
        }
      }
      function uc(a, b) {
        var c = a.pendingLanes;
        if (0 === c) return 0;
        var d = 0, e = a.suspendedLanes, f = a.pingedLanes, g = c & 268435455;
        if (0 !== g) {
          var h = g & ~e;
          0 !== h ? d = tc(h) : (f &= g, 0 !== f && (d = tc(f)));
        } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f && (d = tc(f));
        if (0 === d) return 0;
        if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f = b & -b, e >= f || 16 === e && 0 !== (f & 4194240))) return b;
        0 !== (d & 4) && (d |= c & 16);
        b = a.entangledLanes;
        if (0 !== b) for (a = a.entanglements, b &= d; 0 < b; ) c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
        return d;
      }
      function vc(a, b) {
        switch (a) {
          case 1:
          case 2:
          case 4:
            return b + 250;
          case 8:
          case 16:
          case 32:
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
            return b + 5e3;
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            return -1;
          case 134217728:
          case 268435456:
          case 536870912:
          case 1073741824:
            return -1;
          default:
            return -1;
        }
      }
      function wc(a, b) {
        for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f = a.pendingLanes; 0 < f; ) {
          var g = 31 - oc(f), h = 1 << g, k = e[g];
          if (-1 === k) {
            if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
          } else k <= b && (a.expiredLanes |= h);
          f &= ~h;
        }
      }
      function xc(a) {
        a = a.pendingLanes & -1073741825;
        return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
      }
      function yc() {
        var a = rc;
        rc <<= 1;
        0 === (rc & 4194240) && (rc = 64);
        return a;
      }
      function zc(a) {
        for (var b = [], c = 0; 31 > c; c++) b.push(a);
        return b;
      }
      function Ac(a, b, c) {
        a.pendingLanes |= b;
        536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
        a = a.eventTimes;
        b = 31 - oc(b);
        a[b] = c;
      }
      function Bc(a, b) {
        var c = a.pendingLanes & ~b;
        a.pendingLanes = b;
        a.suspendedLanes = 0;
        a.pingedLanes = 0;
        a.expiredLanes &= b;
        a.mutableReadLanes &= b;
        a.entangledLanes &= b;
        b = a.entanglements;
        var d = a.eventTimes;
        for (a = a.expirationTimes; 0 < c; ) {
          var e = 31 - oc(c), f = 1 << e;
          b[e] = 0;
          d[e] = -1;
          a[e] = -1;
          c &= ~f;
        }
      }
      function Cc(a, b) {
        var c = a.entangledLanes |= b;
        for (a = a.entanglements; c; ) {
          var d = 31 - oc(c), e = 1 << d;
          e & b | a[d] & b && (a[d] |= b);
          c &= ~e;
        }
      }
      var C = 0;
      function Dc(a) {
        a &= -a;
        return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
      }
      var Ec;
      var Fc;
      var Gc;
      var Hc;
      var Ic;
      var Jc = false;
      var Kc = [];
      var Lc = null;
      var Mc = null;
      var Nc = null;
      var Oc = /* @__PURE__ */ new Map();
      var Pc = /* @__PURE__ */ new Map();
      var Qc = [];
      var Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
      function Sc(a, b) {
        switch (a) {
          case "focusin":
          case "focusout":
            Lc = null;
            break;
          case "dragenter":
          case "dragleave":
            Mc = null;
            break;
          case "mouseover":
          case "mouseout":
            Nc = null;
            break;
          case "pointerover":
          case "pointerout":
            Oc.delete(b.pointerId);
            break;
          case "gotpointercapture":
          case "lostpointercapture":
            Pc.delete(b.pointerId);
        }
      }
      function Tc(a, b, c, d, e, f) {
        if (null === a || a.nativeEvent !== f) return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
        a.eventSystemFlags |= d;
        b = a.targetContainers;
        null !== e && -1 === b.indexOf(e) && b.push(e);
        return a;
      }
      function Uc(a, b, c, d, e) {
        switch (b) {
          case "focusin":
            return Lc = Tc(Lc, a, b, c, d, e), true;
          case "dragenter":
            return Mc = Tc(Mc, a, b, c, d, e), true;
          case "mouseover":
            return Nc = Tc(Nc, a, b, c, d, e), true;
          case "pointerover":
            var f = e.pointerId;
            Oc.set(f, Tc(Oc.get(f) || null, a, b, c, d, e));
            return true;
          case "gotpointercapture":
            return f = e.pointerId, Pc.set(f, Tc(Pc.get(f) || null, a, b, c, d, e)), true;
        }
        return false;
      }
      function Vc(a) {
        var b = Wc(a.target);
        if (null !== b) {
          var c = Vb(b);
          if (null !== c) {
            if (b = c.tag, 13 === b) {
              if (b = Wb(c), null !== b) {
                a.blockedOn = b;
                Ic(a.priority, function() {
                  Gc(c);
                });
                return;
              }
            } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
              a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
              return;
            }
          }
        }
        a.blockedOn = null;
      }
      function Xc(a) {
        if (null !== a.blockedOn) return false;
        for (var b = a.targetContainers; 0 < b.length; ) {
          var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
          if (null === c) {
            c = a.nativeEvent;
            var d = new c.constructor(c.type, c);
            wb = d;
            c.target.dispatchEvent(d);
            wb = null;
          } else return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, false;
          b.shift();
        }
        return true;
      }
      function Zc(a, b, c) {
        Xc(a) && c.delete(b);
      }
      function $c() {
        Jc = false;
        null !== Lc && Xc(Lc) && (Lc = null);
        null !== Mc && Xc(Mc) && (Mc = null);
        null !== Nc && Xc(Nc) && (Nc = null);
        Oc.forEach(Zc);
        Pc.forEach(Zc);
      }
      function ad(a, b) {
        a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
      }
      function bd(a) {
        function b(b2) {
          return ad(b2, a);
        }
        if (0 < Kc.length) {
          ad(Kc[0], a);
          for (var c = 1; c < Kc.length; c++) {
            var d = Kc[c];
            d.blockedOn === a && (d.blockedOn = null);
          }
        }
        null !== Lc && ad(Lc, a);
        null !== Mc && ad(Mc, a);
        null !== Nc && ad(Nc, a);
        Oc.forEach(b);
        Pc.forEach(b);
        for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
        for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); ) Vc(c), null === c.blockedOn && Qc.shift();
      }
      var cd = ua.ReactCurrentBatchConfig;
      var dd = true;
      function ed(a, b, c, d) {
        var e = C, f = cd.transition;
        cd.transition = null;
        try {
          C = 1, fd(a, b, c, d);
        } finally {
          C = e, cd.transition = f;
        }
      }
      function gd(a, b, c, d) {
        var e = C, f = cd.transition;
        cd.transition = null;
        try {
          C = 4, fd(a, b, c, d);
        } finally {
          C = e, cd.transition = f;
        }
      }
      function fd(a, b, c, d) {
        if (dd) {
          var e = Yc(a, b, c, d);
          if (null === e) hd(a, b, d, id, c), Sc(a, d);
          else if (Uc(e, a, b, c, d)) d.stopPropagation();
          else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
            for (; null !== e; ) {
              var f = Cb(e);
              null !== f && Ec(f);
              f = Yc(a, b, c, d);
              null === f && hd(a, b, d, id, c);
              if (f === e) break;
              e = f;
            }
            null !== e && d.stopPropagation();
          } else hd(a, b, d, null, c);
        }
      }
      var id = null;
      function Yc(a, b, c, d) {
        id = null;
        a = xb(d);
        a = Wc(a);
        if (null !== a) if (b = Vb(a), null === b) a = null;
        else if (c = b.tag, 13 === c) {
          a = Wb(b);
          if (null !== a) return a;
          a = null;
        } else if (3 === c) {
          if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
          a = null;
        } else b !== a && (a = null);
        id = a;
        return null;
      }
      function jd(a) {
        switch (a) {
          case "cancel":
          case "click":
          case "close":
          case "contextmenu":
          case "copy":
          case "cut":
          case "auxclick":
          case "dblclick":
          case "dragend":
          case "dragstart":
          case "drop":
          case "focusin":
          case "focusout":
          case "input":
          case "invalid":
          case "keydown":
          case "keypress":
          case "keyup":
          case "mousedown":
          case "mouseup":
          case "paste":
          case "pause":
          case "play":
          case "pointercancel":
          case "pointerdown":
          case "pointerup":
          case "ratechange":
          case "reset":
          case "resize":
          case "seeked":
          case "submit":
          case "touchcancel":
          case "touchend":
          case "touchstart":
          case "volumechange":
          case "change":
          case "selectionchange":
          case "textInput":
          case "compositionstart":
          case "compositionend":
          case "compositionupdate":
          case "beforeblur":
          case "afterblur":
          case "beforeinput":
          case "blur":
          case "fullscreenchange":
          case "focus":
          case "hashchange":
          case "popstate":
          case "select":
          case "selectstart":
            return 1;
          case "drag":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "mousemove":
          case "mouseout":
          case "mouseover":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "scroll":
          case "toggle":
          case "touchmove":
          case "wheel":
          case "mouseenter":
          case "mouseleave":
          case "pointerenter":
          case "pointerleave":
            return 4;
          case "message":
            switch (ec()) {
              case fc:
                return 1;
              case gc:
                return 4;
              case hc:
              case ic:
                return 16;
              case jc:
                return 536870912;
              default:
                return 16;
            }
          default:
            return 16;
        }
      }
      var kd = null;
      var ld = null;
      var md = null;
      function nd() {
        if (md) return md;
        var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f = e.length;
        for (a = 0; a < c && b[a] === e[a]; a++) ;
        var g = c - a;
        for (d = 1; d <= g && b[c - d] === e[f - d]; d++) ;
        return md = e.slice(a, 1 < d ? 1 - d : void 0);
      }
      function od(a) {
        var b = a.keyCode;
        "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
        10 === a && (a = 13);
        return 32 <= a || 13 === a ? a : 0;
      }
      function pd() {
        return true;
      }
      function qd() {
        return false;
      }
      function rd(a) {
        function b(b2, d, e, f, g) {
          this._reactName = b2;
          this._targetInst = e;
          this.type = d;
          this.nativeEvent = f;
          this.target = g;
          this.currentTarget = null;
          for (var c in a) a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f) : f[c]);
          this.isDefaultPrevented = (null != f.defaultPrevented ? f.defaultPrevented : false === f.returnValue) ? pd : qd;
          this.isPropagationStopped = qd;
          return this;
        }
        A(b.prototype, { preventDefault: function() {
          this.defaultPrevented = true;
          var a2 = this.nativeEvent;
          a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
        }, stopPropagation: function() {
          var a2 = this.nativeEvent;
          a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
        }, persist: function() {
        }, isPersistent: pd });
        return b;
      }
      var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
        return a.timeStamp || Date.now();
      }, defaultPrevented: 0, isTrusted: 0 };
      var td = rd(sd);
      var ud = A({}, sd, { view: 0, detail: 0 });
      var vd = rd(ud);
      var wd;
      var xd;
      var yd;
      var Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
        return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
      }, movementX: function(a) {
        if ("movementX" in a) return a.movementX;
        a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
        return wd;
      }, movementY: function(a) {
        return "movementY" in a ? a.movementY : xd;
      } });
      var Bd = rd(Ad);
      var Cd = A({}, Ad, { dataTransfer: 0 });
      var Dd = rd(Cd);
      var Ed = A({}, ud, { relatedTarget: 0 });
      var Fd = rd(Ed);
      var Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 });
      var Hd = rd(Gd);
      var Id = A({}, sd, { clipboardData: function(a) {
        return "clipboardData" in a ? a.clipboardData : window.clipboardData;
      } });
      var Jd = rd(Id);
      var Kd = A({}, sd, { data: 0 });
      var Ld = rd(Kd);
      var Md = {
        Esc: "Escape",
        Spacebar: " ",
        Left: "ArrowLeft",
        Up: "ArrowUp",
        Right: "ArrowRight",
        Down: "ArrowDown",
        Del: "Delete",
        Win: "OS",
        Menu: "ContextMenu",
        Apps: "ContextMenu",
        Scroll: "ScrollLock",
        MozPrintableKey: "Unidentified"
      };
      var Nd = {
        8: "Backspace",
        9: "Tab",
        12: "Clear",
        13: "Enter",
        16: "Shift",
        17: "Control",
        18: "Alt",
        19: "Pause",
        20: "CapsLock",
        27: "Escape",
        32: " ",
        33: "PageUp",
        34: "PageDown",
        35: "End",
        36: "Home",
        37: "ArrowLeft",
        38: "ArrowUp",
        39: "ArrowRight",
        40: "ArrowDown",
        45: "Insert",
        46: "Delete",
        112: "F1",
        113: "F2",
        114: "F3",
        115: "F4",
        116: "F5",
        117: "F6",
        118: "F7",
        119: "F8",
        120: "F9",
        121: "F10",
        122: "F11",
        123: "F12",
        144: "NumLock",
        145: "ScrollLock",
        224: "Meta"
      };
      var Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
      function Pd(a) {
        var b = this.nativeEvent;
        return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : false;
      }
      function zd() {
        return Pd;
      }
      var Qd = A({}, ud, { key: function(a) {
        if (a.key) {
          var b = Md[a.key] || a.key;
          if ("Unidentified" !== b) return b;
        }
        return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
      }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
        return "keypress" === a.type ? od(a) : 0;
      }, keyCode: function(a) {
        return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
      }, which: function(a) {
        return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
      } });
      var Rd = rd(Qd);
      var Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 });
      var Td = rd(Sd);
      var Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd });
      var Vd = rd(Ud);
      var Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 });
      var Xd = rd(Wd);
      var Yd = A({}, Ad, {
        deltaX: function(a) {
          return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
        },
        deltaY: function(a) {
          return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
        },
        deltaZ: 0,
        deltaMode: 0
      });
      var Zd = rd(Yd);
      var $d = [9, 13, 27, 32];
      var ae = ia && "CompositionEvent" in window;
      var be = null;
      ia && "documentMode" in document && (be = document.documentMode);
      var ce = ia && "TextEvent" in window && !be;
      var de = ia && (!ae || be && 8 < be && 11 >= be);
      var ee = String.fromCharCode(32);
      var fe = false;
      function ge(a, b) {
        switch (a) {
          case "keyup":
            return -1 !== $d.indexOf(b.keyCode);
          case "keydown":
            return 229 !== b.keyCode;
          case "keypress":
          case "mousedown":
          case "focusout":
            return true;
          default:
            return false;
        }
      }
      function he(a) {
        a = a.detail;
        return "object" === typeof a && "data" in a ? a.data : null;
      }
      var ie = false;
      function je(a, b) {
        switch (a) {
          case "compositionend":
            return he(b);
          case "keypress":
            if (32 !== b.which) return null;
            fe = true;
            return ee;
          case "textInput":
            return a = b.data, a === ee && fe ? null : a;
          default:
            return null;
        }
      }
      function ke(a, b) {
        if (ie) return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
        switch (a) {
          case "paste":
            return null;
          case "keypress":
            if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
              if (b.char && 1 < b.char.length) return b.char;
              if (b.which) return String.fromCharCode(b.which);
            }
            return null;
          case "compositionend":
            return de && "ko" !== b.locale ? null : b.data;
          default:
            return null;
        }
      }
      var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
      function me(a) {
        var b = a && a.nodeName && a.nodeName.toLowerCase();
        return "input" === b ? !!le[a.type] : "textarea" === b ? true : false;
      }
      function ne(a, b, c, d) {
        Eb(d);
        b = oe(b, "onChange");
        0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b }));
      }
      var pe = null;
      var qe = null;
      function re(a) {
        se(a, 0);
      }
      function te(a) {
        var b = ue(a);
        if (Wa(b)) return a;
      }
      function ve(a, b) {
        if ("change" === a) return b;
      }
      var we = false;
      if (ia) {
        if (ia) {
          ye = "oninput" in document;
          if (!ye) {
            ze = document.createElement("div");
            ze.setAttribute("oninput", "return;");
            ye = "function" === typeof ze.oninput;
          }
          xe = ye;
        } else xe = false;
        we = xe && (!document.documentMode || 9 < document.documentMode);
      }
      var xe;
      var ye;
      var ze;
      function Ae() {
        pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
      }
      function Be(a) {
        if ("value" === a.propertyName && te(qe)) {
          var b = [];
          ne(b, qe, a, xb(a));
          Jb(re, b);
        }
      }
      function Ce(a, b, c) {
        "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
      }
      function De(a) {
        if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
      }
      function Ee(a, b) {
        if ("click" === a) return te(b);
      }
      function Fe(a, b) {
        if ("input" === a || "change" === a) return te(b);
      }
      function Ge(a, b) {
        return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
      }
      var He = "function" === typeof Object.is ? Object.is : Ge;
      function Ie(a, b) {
        if (He(a, b)) return true;
        if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return false;
        var c = Object.keys(a), d = Object.keys(b);
        if (c.length !== d.length) return false;
        for (d = 0; d < c.length; d++) {
          var e = c[d];
          if (!ja.call(b, e) || !He(a[e], b[e])) return false;
        }
        return true;
      }
      function Je(a) {
        for (; a && a.firstChild; ) a = a.firstChild;
        return a;
      }
      function Ke(a, b) {
        var c = Je(a);
        a = 0;
        for (var d; c; ) {
          if (3 === c.nodeType) {
            d = a + c.textContent.length;
            if (a <= b && d >= b) return { node: c, offset: b - a };
            a = d;
          }
          a: {
            for (; c; ) {
              if (c.nextSibling) {
                c = c.nextSibling;
                break a;
              }
              c = c.parentNode;
            }
            c = void 0;
          }
          c = Je(c);
        }
      }
      function Le(a, b) {
        return a && b ? a === b ? true : a && 3 === a.nodeType ? false : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : false : false;
      }
      function Me() {
        for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement; ) {
          try {
            var c = "string" === typeof b.contentWindow.location.href;
          } catch (d) {
            c = false;
          }
          if (c) a = b.contentWindow;
          else break;
          b = Xa(a.document);
        }
        return b;
      }
      function Ne(a) {
        var b = a && a.nodeName && a.nodeName.toLowerCase();
        return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
      }
      function Oe(a) {
        var b = Me(), c = a.focusedElem, d = a.selectionRange;
        if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
          if (null !== d && Ne(c)) {
            if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c) c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);
            else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
              a = a.getSelection();
              var e = c.textContent.length, f = Math.min(d.start, e);
              d = void 0 === d.end ? f : Math.min(d.end, e);
              !a.extend && f > d && (e = d, d = f, f = e);
              e = Ke(c, f);
              var g = Ke(
                c,
                d
              );
              e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
            }
          }
          b = [];
          for (a = c; a = a.parentNode; ) 1 === a.nodeType && b.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
          "function" === typeof c.focus && c.focus();
          for (c = 0; c < b.length; c++) a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
        }
      }
      var Pe = ia && "documentMode" in document && 11 >= document.documentMode;
      var Qe = null;
      var Re = null;
      var Se = null;
      var Te = false;
      function Ue(a, b, c) {
        var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
        Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({ event: b, listeners: d }), b.target = Qe)));
      }
      function Ve(a, b) {
        var c = {};
        c[a.toLowerCase()] = b.toLowerCase();
        c["Webkit" + a] = "webkit" + b;
        c["Moz" + a] = "moz" + b;
        return c;
      }
      var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") };
      var Xe = {};
      var Ye = {};
      ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
      function Ze(a) {
        if (Xe[a]) return Xe[a];
        if (!We[a]) return a;
        var b = We[a], c;
        for (c in b) if (b.hasOwnProperty(c) && c in Ye) return Xe[a] = b[c];
        return a;
      }
      var $e = Ze("animationend");
      var af = Ze("animationiteration");
      var bf = Ze("animationstart");
      var cf = Ze("transitionend");
      var df = /* @__PURE__ */ new Map();
      var ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
      function ff(a, b) {
        df.set(a, b);
        fa(b, [a]);
      }
      for (gf = 0; gf < ef.length; gf++) {
        hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
        ff(jf, "on" + kf);
      }
      var hf;
      var jf;
      var kf;
      var gf;
      ff($e, "onAnimationEnd");
      ff(af, "onAnimationIteration");
      ff(bf, "onAnimationStart");
      ff("dblclick", "onDoubleClick");
      ff("focusin", "onFocus");
      ff("focusout", "onBlur");
      ff(cf, "onTransitionEnd");
      ha("onMouseEnter", ["mouseout", "mouseover"]);
      ha("onMouseLeave", ["mouseout", "mouseover"]);
      ha("onPointerEnter", ["pointerout", "pointerover"]);
      ha("onPointerLeave", ["pointerout", "pointerover"]);
      fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
      fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
      fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
      fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
      fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
      fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
      var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" ");
      var mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
      function nf(a, b, c) {
        var d = a.type || "unknown-event";
        a.currentTarget = c;
        Ub(d, b, void 0, a);
        a.currentTarget = null;
      }
      function se(a, b) {
        b = 0 !== (b & 4);
        for (var c = 0; c < a.length; c++) {
          var d = a[c], e = d.event;
          d = d.listeners;
          a: {
            var f = void 0;
            if (b) for (var g = d.length - 1; 0 <= g; g--) {
              var h = d[g], k = h.instance, l = h.currentTarget;
              h = h.listener;
              if (k !== f && e.isPropagationStopped()) break a;
              nf(e, h, l);
              f = k;
            }
            else for (g = 0; g < d.length; g++) {
              h = d[g];
              k = h.instance;
              l = h.currentTarget;
              h = h.listener;
              if (k !== f && e.isPropagationStopped()) break a;
              nf(e, h, l);
              f = k;
            }
          }
        }
        if (Qb) throw a = Rb, Qb = false, Rb = null, a;
      }
      function D(a, b) {
        var c = b[of];
        void 0 === c && (c = b[of] = /* @__PURE__ */ new Set());
        var d = a + "__bubble";
        c.has(d) || (pf(b, a, 2, false), c.add(d));
      }
      function qf(a, b, c) {
        var d = 0;
        b && (d |= 4);
        pf(c, a, d, b);
      }
      var rf = "_reactListening" + Math.random().toString(36).slice(2);
      function sf(a) {
        if (!a[rf]) {
          a[rf] = true;
          da.forEach(function(b2) {
            "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a), qf(b2, true, a));
          });
          var b = 9 === a.nodeType ? a : a.ownerDocument;
          null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
        }
      }
      function pf(a, b, c, d) {
        switch (jd(b)) {
          case 1:
            var e = ed;
            break;
          case 4:
            e = gd;
            break;
          default:
            e = fd;
        }
        c = e.bind(null, b, c, a);
        e = void 0;
        !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = true);
        d ? void 0 !== e ? a.addEventListener(b, c, { capture: true, passive: e }) : a.addEventListener(b, c, true) : void 0 !== e ? a.addEventListener(b, c, { passive: e }) : a.addEventListener(b, c, false);
      }
      function hd(a, b, c, d, e) {
        var f = d;
        if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
          if (null === d) return;
          var g = d.tag;
          if (3 === g || 4 === g) {
            var h = d.stateNode.containerInfo;
            if (h === e || 8 === h.nodeType && h.parentNode === e) break;
            if (4 === g) for (g = d.return; null !== g; ) {
              var k = g.tag;
              if (3 === k || 4 === k) {
                if (k = g.stateNode.containerInfo, k === e || 8 === k.nodeType && k.parentNode === e) return;
              }
              g = g.return;
            }
            for (; null !== h; ) {
              g = Wc(h);
              if (null === g) return;
              k = g.tag;
              if (5 === k || 6 === k) {
                d = f = g;
                continue a;
              }
              h = h.parentNode;
            }
          }
          d = d.return;
        }
        Jb(function() {
          var d2 = f, e2 = xb(c), g2 = [];
          a: {
            var h2 = df.get(a);
            if (void 0 !== h2) {
              var k2 = td, n = a;
              switch (a) {
                case "keypress":
                  if (0 === od(c)) break a;
                case "keydown":
                case "keyup":
                  k2 = Rd;
                  break;
                case "focusin":
                  n = "focus";
                  k2 = Fd;
                  break;
                case "focusout":
                  n = "blur";
                  k2 = Fd;
                  break;
                case "beforeblur":
                case "afterblur":
                  k2 = Fd;
                  break;
                case "click":
                  if (2 === c.button) break a;
                case "auxclick":
                case "dblclick":
                case "mousedown":
                case "mousemove":
                case "mouseup":
                case "mouseout":
                case "mouseover":
                case "contextmenu":
                  k2 = Bd;
                  break;
                case "drag":
                case "dragend":
                case "dragenter":
                case "dragexit":
                case "dragleave":
                case "dragover":
                case "dragstart":
                case "drop":
                  k2 = Dd;
                  break;
                case "touchcancel":
                case "touchend":
                case "touchmove":
                case "touchstart":
                  k2 = Vd;
                  break;
                case $e:
                case af:
                case bf:
                  k2 = Hd;
                  break;
                case cf:
                  k2 = Xd;
                  break;
                case "scroll":
                  k2 = vd;
                  break;
                case "wheel":
                  k2 = Zd;
                  break;
                case "copy":
                case "cut":
                case "paste":
                  k2 = Jd;
                  break;
                case "gotpointercapture":
                case "lostpointercapture":
                case "pointercancel":
                case "pointerdown":
                case "pointermove":
                case "pointerout":
                case "pointerover":
                case "pointerup":
                  k2 = Td;
              }
              var t = 0 !== (b & 4), J = !t && "scroll" === a, x = t ? null !== h2 ? h2 + "Capture" : null : h2;
              t = [];
              for (var w = d2, u; null !== w; ) {
                u = w;
                var F = u.stateNode;
                5 === u.tag && null !== F && (u = F, null !== x && (F = Kb(w, x), null != F && t.push(tf(w, F, u))));
                if (J) break;
                w = w.return;
              }
              0 < t.length && (h2 = new k2(h2, n, null, c, e2), g2.push({ event: h2, listeners: t }));
            }
          }
          if (0 === (b & 7)) {
            a: {
              h2 = "mouseover" === a || "pointerover" === a;
              k2 = "mouseout" === a || "pointerout" === a;
              if (h2 && c !== wb && (n = c.relatedTarget || c.fromElement) && (Wc(n) || n[uf])) break a;
              if (k2 || h2) {
                h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
                if (k2) {
                  if (n = c.relatedTarget || c.toElement, k2 = d2, n = n ? Wc(n) : null, null !== n && (J = Vb(n), n !== J || 5 !== n.tag && 6 !== n.tag)) n = null;
                } else k2 = null, n = d2;
                if (k2 !== n) {
                  t = Bd;
                  F = "onMouseLeave";
                  x = "onMouseEnter";
                  w = "mouse";
                  if ("pointerout" === a || "pointerover" === a) t = Td, F = "onPointerLeave", x = "onPointerEnter", w = "pointer";
                  J = null == k2 ? h2 : ue(k2);
                  u = null == n ? h2 : ue(n);
                  h2 = new t(F, w + "leave", k2, c, e2);
                  h2.target = J;
                  h2.relatedTarget = u;
                  F = null;
                  Wc(e2) === d2 && (t = new t(x, w + "enter", n, c, e2), t.target = u, t.relatedTarget = J, F = t);
                  J = F;
                  if (k2 && n) b: {
                    t = k2;
                    x = n;
                    w = 0;
                    for (u = t; u; u = vf(u)) w++;
                    u = 0;
                    for (F = x; F; F = vf(F)) u++;
                    for (; 0 < w - u; ) t = vf(t), w--;
                    for (; 0 < u - w; ) x = vf(x), u--;
                    for (; w--; ) {
                      if (t === x || null !== x && t === x.alternate) break b;
                      t = vf(t);
                      x = vf(x);
                    }
                    t = null;
                  }
                  else t = null;
                  null !== k2 && wf(g2, h2, k2, t, false);
                  null !== n && null !== J && wf(g2, J, n, t, true);
                }
              }
            }
            a: {
              h2 = d2 ? ue(d2) : window;
              k2 = h2.nodeName && h2.nodeName.toLowerCase();
              if ("select" === k2 || "input" === k2 && "file" === h2.type) var na = ve;
              else if (me(h2)) if (we) na = Fe;
              else {
                na = De;
                var xa = Ce;
              }
              else (k2 = h2.nodeName) && "input" === k2.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
              if (na && (na = na(a, d2))) {
                ne(g2, na, c, e2);
                break a;
              }
              xa && xa(a, h2, d2);
              "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
            }
            xa = d2 ? ue(d2) : window;
            switch (a) {
              case "focusin":
                if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
                break;
              case "focusout":
                Se = Re = Qe = null;
                break;
              case "mousedown":
                Te = true;
                break;
              case "contextmenu":
              case "mouseup":
              case "dragend":
                Te = false;
                Ue(g2, c, e2);
                break;
              case "selectionchange":
                if (Pe) break;
              case "keydown":
              case "keyup":
                Ue(g2, c, e2);
            }
            var $a;
            if (ae) b: {
              switch (a) {
                case "compositionstart":
                  var ba = "onCompositionStart";
                  break b;
                case "compositionend":
                  ba = "onCompositionEnd";
                  break b;
                case "compositionupdate":
                  ba = "onCompositionUpdate";
                  break b;
              }
              ba = void 0;
            }
            else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
            ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
            if ($a = ce ? je(a, c) : ke(a, c)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
          }
          se(g2, b);
        });
      }
      function tf(a, b, c) {
        return { instance: a, listener: b, currentTarget: c };
      }
      function oe(a, b) {
        for (var c = b + "Capture", d = []; null !== a; ) {
          var e = a, f = e.stateNode;
          5 === e.tag && null !== f && (e = f, f = Kb(a, c), null != f && d.unshift(tf(a, f, e)), f = Kb(a, b), null != f && d.push(tf(a, f, e)));
          a = a.return;
        }
        return d;
      }
      function vf(a) {
        if (null === a) return null;
        do
          a = a.return;
        while (a && 5 !== a.tag);
        return a ? a : null;
      }
      function wf(a, b, c, d, e) {
        for (var f = b._reactName, g = []; null !== c && c !== d; ) {
          var h = c, k = h.alternate, l = h.stateNode;
          if (null !== k && k === d) break;
          5 === h.tag && null !== l && (h = l, e ? (k = Kb(c, f), null != k && g.unshift(tf(c, k, h))) : e || (k = Kb(c, f), null != k && g.push(tf(c, k, h))));
          c = c.return;
        }
        0 !== g.length && a.push({ event: b, listeners: g });
      }
      var xf = /\r\n?/g;
      var yf = /\u0000|\uFFFD/g;
      function zf(a) {
        return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
      }
      function Af(a, b, c) {
        b = zf(b);
        if (zf(a) !== b && c) throw Error(p(425));
      }
      function Bf() {
      }
      var Cf = null;
      var Df = null;
      function Ef(a, b) {
        return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
      }
      var Ff = "function" === typeof setTimeout ? setTimeout : void 0;
      var Gf = "function" === typeof clearTimeout ? clearTimeout : void 0;
      var Hf = "function" === typeof Promise ? Promise : void 0;
      var Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
        return Hf.resolve(null).then(a).catch(If);
      } : Ff;
      function If(a) {
        setTimeout(function() {
          throw a;
        });
      }
      function Kf(a, b) {
        var c = b, d = 0;
        do {
          var e = c.nextSibling;
          a.removeChild(c);
          if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
            if (0 === d) {
              a.removeChild(e);
              bd(b);
              return;
            }
            d--;
          } else "$" !== c && "$?" !== c && "$!" !== c || d++;
          c = e;
        } while (c);
        bd(b);
      }
      function Lf(a) {
        for (; null != a; a = a.nextSibling) {
          var b = a.nodeType;
          if (1 === b || 3 === b) break;
          if (8 === b) {
            b = a.data;
            if ("$" === b || "$!" === b || "$?" === b) break;
            if ("/$" === b) return null;
          }
        }
        return a;
      }
      function Mf(a) {
        a = a.previousSibling;
        for (var b = 0; a; ) {
          if (8 === a.nodeType) {
            var c = a.data;
            if ("$" === c || "$!" === c || "$?" === c) {
              if (0 === b) return a;
              b--;
            } else "/$" === c && b++;
          }
          a = a.previousSibling;
        }
        return null;
      }
      var Nf = Math.random().toString(36).slice(2);
      var Of = "__reactFiber$" + Nf;
      var Pf = "__reactProps$" + Nf;
      var uf = "__reactContainer$" + Nf;
      var of = "__reactEvents$" + Nf;
      var Qf = "__reactListeners$" + Nf;
      var Rf = "__reactHandles$" + Nf;
      function Wc(a) {
        var b = a[Of];
        if (b) return b;
        for (var c = a.parentNode; c; ) {
          if (b = c[uf] || c[Of]) {
            c = b.alternate;
            if (null !== b.child || null !== c && null !== c.child) for (a = Mf(a); null !== a; ) {
              if (c = a[Of]) return c;
              a = Mf(a);
            }
            return b;
          }
          a = c;
          c = a.parentNode;
        }
        return null;
      }
      function Cb(a) {
        a = a[Of] || a[uf];
        return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
      }
      function ue(a) {
        if (5 === a.tag || 6 === a.tag) return a.stateNode;
        throw Error(p(33));
      }
      function Db(a) {
        return a[Pf] || null;
      }
      var Sf = [];
      var Tf = -1;
      function Uf(a) {
        return { current: a };
      }
      function E(a) {
        0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
      }
      function G(a, b) {
        Tf++;
        Sf[Tf] = a.current;
        a.current = b;
      }
      var Vf = {};
      var H = Uf(Vf);
      var Wf = Uf(false);
      var Xf = Vf;
      function Yf(a, b) {
        var c = a.type.contextTypes;
        if (!c) return Vf;
        var d = a.stateNode;
        if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
        var e = {}, f;
        for (f in c) e[f] = b[f];
        d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
        return e;
      }
      function Zf(a) {
        a = a.childContextTypes;
        return null !== a && void 0 !== a;
      }
      function $f() {
        E(Wf);
        E(H);
      }
      function ag(a, b, c) {
        if (H.current !== Vf) throw Error(p(168));
        G(H, b);
        G(Wf, c);
      }
      function bg(a, b, c) {
        var d = a.stateNode;
        b = b.childContextTypes;
        if ("function" !== typeof d.getChildContext) return c;
        d = d.getChildContext();
        for (var e in d) if (!(e in b)) throw Error(p(108, Ra(a) || "Unknown", e));
        return A({}, c, d);
      }
      function cg(a) {
        a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
        Xf = H.current;
        G(H, a);
        G(Wf, Wf.current);
        return true;
      }
      function dg(a, b, c) {
        var d = a.stateNode;
        if (!d) throw Error(p(169));
        c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
        G(Wf, c);
      }
      var eg = null;
      var fg = false;
      var gg = false;
      function hg(a) {
        null === eg ? eg = [a] : eg.push(a);
      }
      function ig(a) {
        fg = true;
        hg(a);
      }
      function jg() {
        if (!gg && null !== eg) {
          gg = true;
          var a = 0, b = C;
          try {
            var c = eg;
            for (C = 1; a < c.length; a++) {
              var d = c[a];
              do
                d = d(true);
              while (null !== d);
            }
            eg = null;
            fg = false;
          } catch (e) {
            throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
          } finally {
            C = b, gg = false;
          }
        }
        return null;
      }
      var kg = [];
      var lg = 0;
      var mg = null;
      var ng = 0;
      var og = [];
      var pg = 0;
      var qg = null;
      var rg = 1;
      var sg = "";
      function tg(a, b) {
        kg[lg++] = ng;
        kg[lg++] = mg;
        mg = a;
        ng = b;
      }
      function ug(a, b, c) {
        og[pg++] = rg;
        og[pg++] = sg;
        og[pg++] = qg;
        qg = a;
        var d = rg;
        a = sg;
        var e = 32 - oc(d) - 1;
        d &= ~(1 << e);
        c += 1;
        var f = 32 - oc(b) + e;
        if (30 < f) {
          var g = e - e % 5;
          f = (d & (1 << g) - 1).toString(32);
          d >>= g;
          e -= g;
          rg = 1 << 32 - oc(b) + e | c << e | d;
          sg = f + a;
        } else rg = 1 << f | c << e | d, sg = a;
      }
      function vg(a) {
        null !== a.return && (tg(a, 1), ug(a, 1, 0));
      }
      function wg(a) {
        for (; a === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
        for (; a === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
      }
      var xg = null;
      var yg = null;
      var I = false;
      var zg = null;
      function Ag(a, b) {
        var c = Bg(5, null, null, 0);
        c.elementType = "DELETED";
        c.stateNode = b;
        c.return = a;
        b = a.deletions;
        null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
      }
      function Cg(a, b) {
        switch (a.tag) {
          case 5:
            var c = a.type;
            b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
            return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), true) : false;
          case 6:
            return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, true) : false;
          case 13:
            return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, true) : false;
          default:
            return false;
        }
      }
      function Dg(a) {
        return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
      }
      function Eg(a) {
        if (I) {
          var b = yg;
          if (b) {
            var c = b;
            if (!Cg(a, b)) {
              if (Dg(a)) throw Error(p(418));
              b = Lf(c.nextSibling);
              var d = xg;
              b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
            }
          } else {
            if (Dg(a)) throw Error(p(418));
            a.flags = a.flags & -4097 | 2;
            I = false;
            xg = a;
          }
        }
      }
      function Fg(a) {
        for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; ) a = a.return;
        xg = a;
      }
      function Gg(a) {
        if (a !== xg) return false;
        if (!I) return Fg(a), I = true, false;
        var b;
        (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
        if (b && (b = yg)) {
          if (Dg(a)) throw Hg(), Error(p(418));
          for (; b; ) Ag(a, b), b = Lf(b.nextSibling);
        }
        Fg(a);
        if (13 === a.tag) {
          a = a.memoizedState;
          a = null !== a ? a.dehydrated : null;
          if (!a) throw Error(p(317));
          a: {
            a = a.nextSibling;
            for (b = 0; a; ) {
              if (8 === a.nodeType) {
                var c = a.data;
                if ("/$" === c) {
                  if (0 === b) {
                    yg = Lf(a.nextSibling);
                    break a;
                  }
                  b--;
                } else "$" !== c && "$!" !== c && "$?" !== c || b++;
              }
              a = a.nextSibling;
            }
            yg = null;
          }
        } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
        return true;
      }
      function Hg() {
        for (var a = yg; a; ) a = Lf(a.nextSibling);
      }
      function Ig() {
        yg = xg = null;
        I = false;
      }
      function Jg(a) {
        null === zg ? zg = [a] : zg.push(a);
      }
      var Kg = ua.ReactCurrentBatchConfig;
      function Lg(a, b, c) {
        a = c.ref;
        if (null !== a && "function" !== typeof a && "object" !== typeof a) {
          if (c._owner) {
            c = c._owner;
            if (c) {
              if (1 !== c.tag) throw Error(p(309));
              var d = c.stateNode;
            }
            if (!d) throw Error(p(147, a));
            var e = d, f = "" + a;
            if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f) return b.ref;
            b = function(a2) {
              var b2 = e.refs;
              null === a2 ? delete b2[f] : b2[f] = a2;
            };
            b._stringRef = f;
            return b;
          }
          if ("string" !== typeof a) throw Error(p(284));
          if (!c._owner) throw Error(p(290, a));
        }
        return a;
      }
      function Mg(a, b) {
        a = Object.prototype.toString.call(b);
        throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
      }
      function Ng(a) {
        var b = a._init;
        return b(a._payload);
      }
      function Og(a) {
        function b(b2, c2) {
          if (a) {
            var d2 = b2.deletions;
            null === d2 ? (b2.deletions = [c2], b2.flags |= 16) : d2.push(c2);
          }
        }
        function c(c2, d2) {
          if (!a) return null;
          for (; null !== d2; ) b(c2, d2), d2 = d2.sibling;
          return null;
        }
        function d(a2, b2) {
          for (a2 = /* @__PURE__ */ new Map(); null !== b2; ) null !== b2.key ? a2.set(b2.key, b2) : a2.set(b2.index, b2), b2 = b2.sibling;
          return a2;
        }
        function e(a2, b2) {
          a2 = Pg(a2, b2);
          a2.index = 0;
          a2.sibling = null;
          return a2;
        }
        function f(b2, c2, d2) {
          b2.index = d2;
          if (!a) return b2.flags |= 1048576, c2;
          d2 = b2.alternate;
          if (null !== d2) return d2 = d2.index, d2 < c2 ? (b2.flags |= 2, c2) : d2;
          b2.flags |= 2;
          return c2;
        }
        function g(b2) {
          a && null === b2.alternate && (b2.flags |= 2);
          return b2;
        }
        function h(a2, b2, c2, d2) {
          if (null === b2 || 6 !== b2.tag) return b2 = Qg(c2, a2.mode, d2), b2.return = a2, b2;
          b2 = e(b2, c2);
          b2.return = a2;
          return b2;
        }
        function k(a2, b2, c2, d2) {
          var f2 = c2.type;
          if (f2 === ya) return m(a2, b2, c2.props.children, d2, c2.key);
          if (null !== b2 && (b2.elementType === f2 || "object" === typeof f2 && null !== f2 && f2.$$typeof === Ha && Ng(f2) === b2.type)) return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
          d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
          d2.ref = Lg(a2, b2, c2);
          d2.return = a2;
          return d2;
        }
        function l(a2, b2, c2, d2) {
          if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation) return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
          b2 = e(b2, c2.children || []);
          b2.return = a2;
          return b2;
        }
        function m(a2, b2, c2, d2, f2) {
          if (null === b2 || 7 !== b2.tag) return b2 = Tg(c2, a2.mode, d2, f2), b2.return = a2, b2;
          b2 = e(b2, c2);
          b2.return = a2;
          return b2;
        }
        function q(a2, b2, c2) {
          if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
          if ("object" === typeof b2 && null !== b2) {
            switch (b2.$$typeof) {
              case va:
                return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
              case wa:
                return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
              case Ha:
                var d2 = b2._init;
                return q(a2, d2(b2._payload), c2);
            }
            if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
            Mg(a2, b2);
          }
          return null;
        }
        function r(a2, b2, c2, d2) {
          var e2 = null !== b2 ? b2.key : null;
          if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b2, "" + c2, d2);
          if ("object" === typeof c2 && null !== c2) {
            switch (c2.$$typeof) {
              case va:
                return c2.key === e2 ? k(a2, b2, c2, d2) : null;
              case wa:
                return c2.key === e2 ? l(a2, b2, c2, d2) : null;
              case Ha:
                return e2 = c2._init, r(
                  a2,
                  b2,
                  e2(c2._payload),
                  d2
                );
            }
            if (eb(c2) || Ka(c2)) return null !== e2 ? null : m(a2, b2, c2, d2, null);
            Mg(a2, c2);
          }
          return null;
        }
        function y(a2, b2, c2, d2, e2) {
          if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
          if ("object" === typeof d2 && null !== d2) {
            switch (d2.$$typeof) {
              case va:
                return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k(b2, a2, d2, e2);
              case wa:
                return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l(b2, a2, d2, e2);
              case Ha:
                var f2 = d2._init;
                return y(a2, b2, c2, f2(d2._payload), e2);
            }
            if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m(b2, a2, d2, e2, null);
            Mg(b2, d2);
          }
          return null;
        }
        function n(e2, g2, h2, k2) {
          for (var l2 = null, m2 = null, u = g2, w = g2 = 0, x = null; null !== u && w < h2.length; w++) {
            u.index > w ? (x = u, u = null) : x = u.sibling;
            var n2 = r(e2, u, h2[w], k2);
            if (null === n2) {
              null === u && (u = x);
              break;
            }
            a && u && null === n2.alternate && b(e2, u);
            g2 = f(n2, g2, w);
            null === m2 ? l2 = n2 : m2.sibling = n2;
            m2 = n2;
            u = x;
          }
          if (w === h2.length) return c(e2, u), I && tg(e2, w), l2;
          if (null === u) {
            for (; w < h2.length; w++) u = q(e2, h2[w], k2), null !== u && (g2 = f(u, g2, w), null === m2 ? l2 = u : m2.sibling = u, m2 = u);
            I && tg(e2, w);
            return l2;
          }
          for (u = d(e2, u); w < h2.length; w++) x = y(u, e2, w, h2[w], k2), null !== x && (a && null !== x.alternate && u.delete(null === x.key ? w : x.key), g2 = f(x, g2, w), null === m2 ? l2 = x : m2.sibling = x, m2 = x);
          a && u.forEach(function(a2) {
            return b(e2, a2);
          });
          I && tg(e2, w);
          return l2;
        }
        function t(e2, g2, h2, k2) {
          var l2 = Ka(h2);
          if ("function" !== typeof l2) throw Error(p(150));
          h2 = l2.call(h2);
          if (null == h2) throw Error(p(151));
          for (var u = l2 = null, m2 = g2, w = g2 = 0, x = null, n2 = h2.next(); null !== m2 && !n2.done; w++, n2 = h2.next()) {
            m2.index > w ? (x = m2, m2 = null) : x = m2.sibling;
            var t2 = r(e2, m2, n2.value, k2);
            if (null === t2) {
              null === m2 && (m2 = x);
              break;
            }
            a && m2 && null === t2.alternate && b(e2, m2);
            g2 = f(t2, g2, w);
            null === u ? l2 = t2 : u.sibling = t2;
            u = t2;
            m2 = x;
          }
          if (n2.done) return c(
            e2,
            m2
          ), I && tg(e2, w), l2;
          if (null === m2) {
            for (; !n2.done; w++, n2 = h2.next()) n2 = q(e2, n2.value, k2), null !== n2 && (g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
            I && tg(e2, w);
            return l2;
          }
          for (m2 = d(e2, m2); !n2.done; w++, n2 = h2.next()) n2 = y(m2, e2, w, n2.value, k2), null !== n2 && (a && null !== n2.alternate && m2.delete(null === n2.key ? w : n2.key), g2 = f(n2, g2, w), null === u ? l2 = n2 : u.sibling = n2, u = n2);
          a && m2.forEach(function(a2) {
            return b(e2, a2);
          });
          I && tg(e2, w);
          return l2;
        }
        function J(a2, d2, f2, h2) {
          "object" === typeof f2 && null !== f2 && f2.type === ya && null === f2.key && (f2 = f2.props.children);
          if ("object" === typeof f2 && null !== f2) {
            switch (f2.$$typeof) {
              case va:
                a: {
                  for (var k2 = f2.key, l2 = d2; null !== l2; ) {
                    if (l2.key === k2) {
                      k2 = f2.type;
                      if (k2 === ya) {
                        if (7 === l2.tag) {
                          c(a2, l2.sibling);
                          d2 = e(l2, f2.props.children);
                          d2.return = a2;
                          a2 = d2;
                          break a;
                        }
                      } else if (l2.elementType === k2 || "object" === typeof k2 && null !== k2 && k2.$$typeof === Ha && Ng(k2) === l2.type) {
                        c(a2, l2.sibling);
                        d2 = e(l2, f2.props);
                        d2.ref = Lg(a2, l2, f2);
                        d2.return = a2;
                        a2 = d2;
                        break a;
                      }
                      c(a2, l2);
                      break;
                    } else b(a2, l2);
                    l2 = l2.sibling;
                  }
                  f2.type === ya ? (d2 = Tg(f2.props.children, a2.mode, h2, f2.key), d2.return = a2, a2 = d2) : (h2 = Rg(f2.type, f2.key, f2.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f2), h2.return = a2, a2 = h2);
                }
                return g(a2);
              case wa:
                a: {
                  for (l2 = f2.key; null !== d2; ) {
                    if (d2.key === l2) if (4 === d2.tag && d2.stateNode.containerInfo === f2.containerInfo && d2.stateNode.implementation === f2.implementation) {
                      c(a2, d2.sibling);
                      d2 = e(d2, f2.children || []);
                      d2.return = a2;
                      a2 = d2;
                      break a;
                    } else {
                      c(a2, d2);
                      break;
                    }
                    else b(a2, d2);
                    d2 = d2.sibling;
                  }
                  d2 = Sg(f2, a2.mode, h2);
                  d2.return = a2;
                  a2 = d2;
                }
                return g(a2);
              case Ha:
                return l2 = f2._init, J(a2, d2, l2(f2._payload), h2);
            }
            if (eb(f2)) return n(a2, d2, f2, h2);
            if (Ka(f2)) return t(a2, d2, f2, h2);
            Mg(a2, f2);
          }
          return "string" === typeof f2 && "" !== f2 || "number" === typeof f2 ? (f2 = "" + f2, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f2), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f2, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
        }
        return J;
      }
      var Ug = Og(true);
      var Vg = Og(false);
      var Wg = Uf(null);
      var Xg = null;
      var Yg = null;
      var Zg = null;
      function $g() {
        Zg = Yg = Xg = null;
      }
      function ah(a) {
        var b = Wg.current;
        E(Wg);
        a._currentValue = b;
      }
      function bh(a, b, c) {
        for (; null !== a; ) {
          var d = a.alternate;
          (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
          if (a === c) break;
          a = a.return;
        }
      }
      function ch(a, b) {
        Xg = a;
        Zg = Yg = null;
        a = a.dependencies;
        null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = true), a.firstContext = null);
      }
      function eh(a) {
        var b = a._currentValue;
        if (Zg !== a) if (a = { context: a, memoizedValue: b, next: null }, null === Yg) {
          if (null === Xg) throw Error(p(308));
          Yg = a;
          Xg.dependencies = { lanes: 0, firstContext: a };
        } else Yg = Yg.next = a;
        return b;
      }
      var fh = null;
      function gh(a) {
        null === fh ? fh = [a] : fh.push(a);
      }
      function hh(a, b, c, d) {
        var e = b.interleaved;
        null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
        b.interleaved = c;
        return ih(a, d);
      }
      function ih(a, b) {
        a.lanes |= b;
        var c = a.alternate;
        null !== c && (c.lanes |= b);
        c = a;
        for (a = a.return; null !== a; ) a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
        return 3 === c.tag ? c.stateNode : null;
      }
      var jh = false;
      function kh(a) {
        a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
      }
      function lh(a, b) {
        a = a.updateQueue;
        b.updateQueue === a && (b.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
      }
      function mh(a, b) {
        return { eventTime: a, lane: b, tag: 0, payload: null, callback: null, next: null };
      }
      function nh(a, b, c) {
        var d = a.updateQueue;
        if (null === d) return null;
        d = d.shared;
        if (0 !== (K & 2)) {
          var e = d.pending;
          null === e ? b.next = b : (b.next = e.next, e.next = b);
          d.pending = b;
          return ih(a, c);
        }
        e = d.interleaved;
        null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
        d.interleaved = b;
        return ih(a, c);
      }
      function oh(a, b, c) {
        b = b.updateQueue;
        if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
          var d = b.lanes;
          d &= a.pendingLanes;
          c |= d;
          b.lanes = c;
          Cc(a, c);
        }
      }
      function ph(a, b) {
        var c = a.updateQueue, d = a.alternate;
        if (null !== d && (d = d.updateQueue, c === d)) {
          var e = null, f = null;
          c = c.firstBaseUpdate;
          if (null !== c) {
            do {
              var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
              null === f ? e = f = g : f = f.next = g;
              c = c.next;
            } while (null !== c);
            null === f ? e = f = b : f = f.next = b;
          } else e = f = b;
          c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f, shared: d.shared, effects: d.effects };
          a.updateQueue = c;
          return;
        }
        a = c.lastBaseUpdate;
        null === a ? c.firstBaseUpdate = b : a.next = b;
        c.lastBaseUpdate = b;
      }
      function qh(a, b, c, d) {
        var e = a.updateQueue;
        jh = false;
        var f = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
        if (null !== h) {
          e.shared.pending = null;
          var k = h, l = k.next;
          k.next = null;
          null === g ? f = l : g.next = l;
          g = k;
          var m = a.alternate;
          null !== m && (m = m.updateQueue, h = m.lastBaseUpdate, h !== g && (null === h ? m.firstBaseUpdate = l : h.next = l, m.lastBaseUpdate = k));
        }
        if (null !== f) {
          var q = e.baseState;
          g = 0;
          m = l = k = null;
          h = f;
          do {
            var r = h.lane, y = h.eventTime;
            if ((d & r) === r) {
              null !== m && (m = m.next = {
                eventTime: y,
                lane: 0,
                tag: h.tag,
                payload: h.payload,
                callback: h.callback,
                next: null
              });
              a: {
                var n = a, t = h;
                r = b;
                y = c;
                switch (t.tag) {
                  case 1:
                    n = t.payload;
                    if ("function" === typeof n) {
                      q = n.call(y, q, r);
                      break a;
                    }
                    q = n;
                    break a;
                  case 3:
                    n.flags = n.flags & -65537 | 128;
                  case 0:
                    n = t.payload;
                    r = "function" === typeof n ? n.call(y, q, r) : n;
                    if (null === r || void 0 === r) break a;
                    q = A({}, q, r);
                    break a;
                  case 2:
                    jh = true;
                }
              }
              null !== h.callback && 0 !== h.lane && (a.flags |= 64, r = e.effects, null === r ? e.effects = [h] : r.push(h));
            } else y = { eventTime: y, lane: r, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m ? (l = m = y, k = q) : m = m.next = y, g |= r;
            h = h.next;
            if (null === h) if (h = e.shared.pending, null === h) break;
            else r = h, h = r.next, r.next = null, e.lastBaseUpdate = r, e.shared.pending = null;
          } while (1);
          null === m && (k = q);
          e.baseState = k;
          e.firstBaseUpdate = l;
          e.lastBaseUpdate = m;
          b = e.shared.interleaved;
          if (null !== b) {
            e = b;
            do
              g |= e.lane, e = e.next;
            while (e !== b);
          } else null === f && (e.shared.lanes = 0);
          rh |= g;
          a.lanes = g;
          a.memoizedState = q;
        }
      }
      function sh(a, b, c) {
        a = b.effects;
        b.effects = null;
        if (null !== a) for (b = 0; b < a.length; b++) {
          var d = a[b], e = d.callback;
          if (null !== e) {
            d.callback = null;
            d = c;
            if ("function" !== typeof e) throw Error(p(191, e));
            e.call(d);
          }
        }
      }
      var th = {};
      var uh = Uf(th);
      var vh = Uf(th);
      var wh = Uf(th);
      function xh(a) {
        if (a === th) throw Error(p(174));
        return a;
      }
      function yh(a, b) {
        G(wh, b);
        G(vh, a);
        G(uh, th);
        a = b.nodeType;
        switch (a) {
          case 9:
          case 11:
            b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
            break;
          default:
            a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
        }
        E(uh);
        G(uh, b);
      }
      function zh() {
        E(uh);
        E(vh);
        E(wh);
      }
      function Ah(a) {
        xh(wh.current);
        var b = xh(uh.current);
        var c = lb(b, a.type);
        b !== c && (G(vh, a), G(uh, c));
      }
      function Bh(a) {
        vh.current === a && (E(uh), E(vh));
      }
      var L = Uf(0);
      function Ch(a) {
        for (var b = a; null !== b; ) {
          if (13 === b.tag) {
            var c = b.memoizedState;
            if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b;
          } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
            if (0 !== (b.flags & 128)) return b;
          } else if (null !== b.child) {
            b.child.return = b;
            b = b.child;
            continue;
          }
          if (b === a) break;
          for (; null === b.sibling; ) {
            if (null === b.return || b.return === a) return null;
            b = b.return;
          }
          b.sibling.return = b.return;
          b = b.sibling;
        }
        return null;
      }
      var Dh = [];
      function Eh() {
        for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
        Dh.length = 0;
      }
      var Fh = ua.ReactCurrentDispatcher;
      var Gh = ua.ReactCurrentBatchConfig;
      var Hh = 0;
      var M = null;
      var N = null;
      var O = null;
      var Ih = false;
      var Jh = false;
      var Kh = 0;
      var Lh = 0;
      function P() {
        throw Error(p(321));
      }
      function Mh(a, b) {
        if (null === b) return false;
        for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return false;
        return true;
      }
      function Nh(a, b, c, d, e, f) {
        Hh = f;
        M = b;
        b.memoizedState = null;
        b.updateQueue = null;
        b.lanes = 0;
        Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
        a = c(d, e);
        if (Jh) {
          f = 0;
          do {
            Jh = false;
            Kh = 0;
            if (25 <= f) throw Error(p(301));
            f += 1;
            O = N = null;
            b.updateQueue = null;
            Fh.current = Qh;
            a = c(d, e);
          } while (Jh);
        }
        Fh.current = Rh;
        b = null !== N && null !== N.next;
        Hh = 0;
        O = N = M = null;
        Ih = false;
        if (b) throw Error(p(300));
        return a;
      }
      function Sh() {
        var a = 0 !== Kh;
        Kh = 0;
        return a;
      }
      function Th() {
        var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
        null === O ? M.memoizedState = O = a : O = O.next = a;
        return O;
      }
      function Uh() {
        if (null === N) {
          var a = M.alternate;
          a = null !== a ? a.memoizedState : null;
        } else a = N.next;
        var b = null === O ? M.memoizedState : O.next;
        if (null !== b) O = b, N = a;
        else {
          if (null === a) throw Error(p(310));
          N = a;
          a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
          null === O ? M.memoizedState = O = a : O = O.next = a;
        }
        return O;
      }
      function Vh(a, b) {
        return "function" === typeof b ? b(a) : b;
      }
      function Wh(a) {
        var b = Uh(), c = b.queue;
        if (null === c) throw Error(p(311));
        c.lastRenderedReducer = a;
        var d = N, e = d.baseQueue, f = c.pending;
        if (null !== f) {
          if (null !== e) {
            var g = e.next;
            e.next = f.next;
            f.next = g;
          }
          d.baseQueue = e = f;
          c.pending = null;
        }
        if (null !== e) {
          f = e.next;
          d = d.baseState;
          var h = g = null, k = null, l = f;
          do {
            var m = l.lane;
            if ((Hh & m) === m) null !== k && (k = k.next = { lane: 0, action: l.action, hasEagerState: l.hasEagerState, eagerState: l.eagerState, next: null }), d = l.hasEagerState ? l.eagerState : a(d, l.action);
            else {
              var q = {
                lane: m,
                action: l.action,
                hasEagerState: l.hasEagerState,
                eagerState: l.eagerState,
                next: null
              };
              null === k ? (h = k = q, g = d) : k = k.next = q;
              M.lanes |= m;
              rh |= m;
            }
            l = l.next;
          } while (null !== l && l !== f);
          null === k ? g = d : k.next = h;
          He(d, b.memoizedState) || (dh = true);
          b.memoizedState = d;
          b.baseState = g;
          b.baseQueue = k;
          c.lastRenderedState = d;
        }
        a = c.interleaved;
        if (null !== a) {
          e = a;
          do
            f = e.lane, M.lanes |= f, rh |= f, e = e.next;
          while (e !== a);
        } else null === e && (c.lanes = 0);
        return [b.memoizedState, c.dispatch];
      }
      function Xh(a) {
        var b = Uh(), c = b.queue;
        if (null === c) throw Error(p(311));
        c.lastRenderedReducer = a;
        var d = c.dispatch, e = c.pending, f = b.memoizedState;
        if (null !== e) {
          c.pending = null;
          var g = e = e.next;
          do
            f = a(f, g.action), g = g.next;
          while (g !== e);
          He(f, b.memoizedState) || (dh = true);
          b.memoizedState = f;
          null === b.baseQueue && (b.baseState = f);
          c.lastRenderedState = f;
        }
        return [f, d];
      }
      function Yh() {
      }
      function Zh(a, b) {
        var c = M, d = Uh(), e = b(), f = !He(d.memoizedState, e);
        f && (d.memoizedState = e, dh = true);
        d = d.queue;
        $h(ai.bind(null, c, d, a), [a]);
        if (d.getSnapshot !== b || f || null !== O && O.memoizedState.tag & 1) {
          c.flags |= 2048;
          bi(9, ci.bind(null, c, d, e, b), void 0, null);
          if (null === Q) throw Error(p(349));
          0 !== (Hh & 30) || di(c, b, e);
        }
        return e;
      }
      function di(a, b, c) {
        a.flags |= 16384;
        a = { getSnapshot: b, value: c };
        b = M.updateQueue;
        null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
      }
      function ci(a, b, c, d) {
        b.value = c;
        b.getSnapshot = d;
        ei(b) && fi(a);
      }
      function ai(a, b, c) {
        return c(function() {
          ei(b) && fi(a);
        });
      }
      function ei(a) {
        var b = a.getSnapshot;
        a = a.value;
        try {
          var c = b();
          return !He(a, c);
        } catch (d) {
          return true;
        }
      }
      function fi(a) {
        var b = ih(a, 1);
        null !== b && gi(b, a, 1, -1);
      }
      function hi(a) {
        var b = Th();
        "function" === typeof a && (a = a());
        b.memoizedState = b.baseState = a;
        a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
        b.queue = a;
        a = a.dispatch = ii.bind(null, M, a);
        return [b.memoizedState, a];
      }
      function bi(a, b, c, d) {
        a = { tag: a, create: b, destroy: c, deps: d, next: null };
        b = M.updateQueue;
        null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
        return a;
      }
      function ji() {
        return Uh().memoizedState;
      }
      function ki(a, b, c, d) {
        var e = Th();
        M.flags |= a;
        e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
      }
      function li(a, b, c, d) {
        var e = Uh();
        d = void 0 === d ? null : d;
        var f = void 0;
        if (null !== N) {
          var g = N.memoizedState;
          f = g.destroy;
          if (null !== d && Mh(d, g.deps)) {
            e.memoizedState = bi(b, c, f, d);
            return;
          }
        }
        M.flags |= a;
        e.memoizedState = bi(1 | b, c, f, d);
      }
      function mi(a, b) {
        return ki(8390656, 8, a, b);
      }
      function $h(a, b) {
        return li(2048, 8, a, b);
      }
      function ni(a, b) {
        return li(4, 2, a, b);
      }
      function oi(a, b) {
        return li(4, 4, a, b);
      }
      function pi(a, b) {
        if ("function" === typeof b) return a = a(), b(a), function() {
          b(null);
        };
        if (null !== b && void 0 !== b) return a = a(), b.current = a, function() {
          b.current = null;
        };
      }
      function qi(a, b, c) {
        c = null !== c && void 0 !== c ? c.concat([a]) : null;
        return li(4, 4, pi.bind(null, b, a), c);
      }
      function ri() {
      }
      function si(a, b) {
        var c = Uh();
        b = void 0 === b ? null : b;
        var d = c.memoizedState;
        if (null !== d && null !== b && Mh(b, d[1])) return d[0];
        c.memoizedState = [a, b];
        return a;
      }
      function ti(a, b) {
        var c = Uh();
        b = void 0 === b ? null : b;
        var d = c.memoizedState;
        if (null !== d && null !== b && Mh(b, d[1])) return d[0];
        a = a();
        c.memoizedState = [a, b];
        return a;
      }
      function ui(a, b, c) {
        if (0 === (Hh & 21)) return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
        He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
        return b;
      }
      function vi(a, b) {
        var c = C;
        C = 0 !== c && 4 > c ? c : 4;
        a(true);
        var d = Gh.transition;
        Gh.transition = {};
        try {
          a(false), b();
        } finally {
          C = c, Gh.transition = d;
        }
      }
      function wi() {
        return Uh().memoizedState;
      }
      function xi(a, b, c) {
        var d = yi(a);
        c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
        if (zi(a)) Ai(b, c);
        else if (c = hh(a, b, c, d), null !== c) {
          var e = R();
          gi(c, a, d, e);
          Bi(c, b, d);
        }
      }
      function ii(a, b, c) {
        var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
        if (zi(a)) Ai(b, e);
        else {
          var f = a.alternate;
          if (0 === a.lanes && (null === f || 0 === f.lanes) && (f = b.lastRenderedReducer, null !== f)) try {
            var g = b.lastRenderedState, h = f(g, c);
            e.hasEagerState = true;
            e.eagerState = h;
            if (He(h, g)) {
              var k = b.interleaved;
              null === k ? (e.next = e, gh(b)) : (e.next = k.next, k.next = e);
              b.interleaved = e;
              return;
            }
          } catch (l) {
          } finally {
          }
          c = hh(a, b, e, d);
          null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
        }
      }
      function zi(a) {
        var b = a.alternate;
        return a === M || null !== b && b === M;
      }
      function Ai(a, b) {
        Jh = Ih = true;
        var c = a.pending;
        null === c ? b.next = b : (b.next = c.next, c.next = b);
        a.pending = b;
      }
      function Bi(a, b, c) {
        if (0 !== (c & 4194240)) {
          var d = b.lanes;
          d &= a.pendingLanes;
          c |= d;
          b.lanes = c;
          Cc(a, c);
        }
      }
      var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false };
      var Oh = { readContext: eh, useCallback: function(a, b) {
        Th().memoizedState = [a, void 0 === b ? null : b];
        return a;
      }, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b, c) {
        c = null !== c && void 0 !== c ? c.concat([a]) : null;
        return ki(
          4194308,
          4,
          pi.bind(null, b, a),
          c
        );
      }, useLayoutEffect: function(a, b) {
        return ki(4194308, 4, a, b);
      }, useInsertionEffect: function(a, b) {
        return ki(4, 2, a, b);
      }, useMemo: function(a, b) {
        var c = Th();
        b = void 0 === b ? null : b;
        a = a();
        c.memoizedState = [a, b];
        return a;
      }, useReducer: function(a, b, c) {
        var d = Th();
        b = void 0 !== c ? c(b) : b;
        d.memoizedState = d.baseState = b;
        a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b };
        d.queue = a;
        a = a.dispatch = xi.bind(null, M, a);
        return [d.memoizedState, a];
      }, useRef: function(a) {
        var b = Th();
        a = { current: a };
        return b.memoizedState = a;
      }, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
        return Th().memoizedState = a;
      }, useTransition: function() {
        var a = hi(false), b = a[0];
        a = vi.bind(null, a[1]);
        Th().memoizedState = a;
        return [b, a];
      }, useMutableSource: function() {
      }, useSyncExternalStore: function(a, b, c) {
        var d = M, e = Th();
        if (I) {
          if (void 0 === c) throw Error(p(407));
          c = c();
        } else {
          c = b();
          if (null === Q) throw Error(p(349));
          0 !== (Hh & 30) || di(d, b, c);
        }
        e.memoizedState = c;
        var f = { value: c, getSnapshot: b };
        e.queue = f;
        mi(ai.bind(
          null,
          d,
          f,
          a
        ), [a]);
        d.flags |= 2048;
        bi(9, ci.bind(null, d, f, c, b), void 0, null);
        return c;
      }, useId: function() {
        var a = Th(), b = Q.identifierPrefix;
        if (I) {
          var c = sg;
          var d = rg;
          c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
          b = ":" + b + "R" + c;
          c = Kh++;
          0 < c && (b += "H" + c.toString(32));
          b += ":";
        } else c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
        return a.memoizedState = b;
      }, unstable_isNewReconciler: false };
      var Ph = {
        readContext: eh,
        useCallback: si,
        useContext: eh,
        useEffect: $h,
        useImperativeHandle: qi,
        useInsertionEffect: ni,
        useLayoutEffect: oi,
        useMemo: ti,
        useReducer: Wh,
        useRef: ji,
        useState: function() {
          return Wh(Vh);
        },
        useDebugValue: ri,
        useDeferredValue: function(a) {
          var b = Uh();
          return ui(b, N.memoizedState, a);
        },
        useTransition: function() {
          var a = Wh(Vh)[0], b = Uh().memoizedState;
          return [a, b];
        },
        useMutableSource: Yh,
        useSyncExternalStore: Zh,
        useId: wi,
        unstable_isNewReconciler: false
      };
      var Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
        return Xh(Vh);
      }, useDebugValue: ri, useDeferredValue: function(a) {
        var b = Uh();
        return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
      }, useTransition: function() {
        var a = Xh(Vh)[0], b = Uh().memoizedState;
        return [a, b];
      }, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
      function Ci(a, b) {
        if (a && a.defaultProps) {
          b = A({}, b);
          a = a.defaultProps;
          for (var c in a) void 0 === b[c] && (b[c] = a[c]);
          return b;
        }
        return b;
      }
      function Di(a, b, c, d) {
        b = a.memoizedState;
        c = c(d, b);
        c = null === c || void 0 === c ? b : A({}, b, c);
        a.memoizedState = c;
        0 === a.lanes && (a.updateQueue.baseState = c);
      }
      var Ei = { isMounted: function(a) {
        return (a = a._reactInternals) ? Vb(a) === a : false;
      }, enqueueSetState: function(a, b, c) {
        a = a._reactInternals;
        var d = R(), e = yi(a), f = mh(d, e);
        f.payload = b;
        void 0 !== c && null !== c && (f.callback = c);
        b = nh(a, f, e);
        null !== b && (gi(b, a, e, d), oh(b, a, e));
      }, enqueueReplaceState: function(a, b, c) {
        a = a._reactInternals;
        var d = R(), e = yi(a), f = mh(d, e);
        f.tag = 1;
        f.payload = b;
        void 0 !== c && null !== c && (f.callback = c);
        b = nh(a, f, e);
        null !== b && (gi(b, a, e, d), oh(b, a, e));
      }, enqueueForceUpdate: function(a, b) {
        a = a._reactInternals;
        var c = R(), d = yi(a), e = mh(c, d);
        e.tag = 2;
        void 0 !== b && null !== b && (e.callback = b);
        b = nh(a, e, d);
        null !== b && (gi(b, a, d, c), oh(b, a, d));
      } };
      function Fi(a, b, c, d, e, f, g) {
        a = a.stateNode;
        return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f) : true;
      }
      function Gi(a, b, c) {
        var d = false, e = Vf;
        var f = b.contextType;
        "object" === typeof f && null !== f ? f = eh(f) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
        b = new b(c, f);
        a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
        b.updater = Ei;
        a.stateNode = b;
        b._reactInternals = a;
        d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f);
        return b;
      }
      function Hi(a, b, c, d) {
        a = b.state;
        "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
        "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
        b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
      }
      function Ii(a, b, c, d) {
        var e = a.stateNode;
        e.props = c;
        e.state = a.memoizedState;
        e.refs = {};
        kh(a);
        var f = b.contextType;
        "object" === typeof f && null !== f ? e.context = eh(f) : (f = Zf(b) ? Xf : H.current, e.context = Yf(a, f));
        e.state = a.memoizedState;
        f = b.getDerivedStateFromProps;
        "function" === typeof f && (Di(a, b, f, c), e.state = a.memoizedState);
        "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
        "function" === typeof e.componentDidMount && (a.flags |= 4194308);
      }
      function Ji(a, b) {
        try {
          var c = "", d = b;
          do
            c += Pa(d), d = d.return;
          while (d);
          var e = c;
        } catch (f) {
          e = "\nError generating stack: " + f.message + "\n" + f.stack;
        }
        return { value: a, source: b, stack: e, digest: null };
      }
      function Ki(a, b, c) {
        return { value: a, source: null, stack: null != c ? c : null, digest: null != b ? b : null };
      }
      function Li(a, b) {
        try {
          console.error(b.value);
        } catch (c) {
          setTimeout(function() {
            throw c;
          });
        }
      }
      var Mi = "function" === typeof WeakMap ? WeakMap : Map;
      function Ni(a, b, c) {
        c = mh(-1, c);
        c.tag = 3;
        c.payload = { element: null };
        var d = b.value;
        c.callback = function() {
          Oi || (Oi = true, Pi = d);
          Li(a, b);
        };
        return c;
      }
      function Qi(a, b, c) {
        c = mh(-1, c);
        c.tag = 3;
        var d = a.type.getDerivedStateFromError;
        if ("function" === typeof d) {
          var e = b.value;
          c.payload = function() {
            return d(e);
          };
          c.callback = function() {
            Li(a, b);
          };
        }
        var f = a.stateNode;
        null !== f && "function" === typeof f.componentDidCatch && (c.callback = function() {
          Li(a, b);
          "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
          var c2 = b.stack;
          this.componentDidCatch(b.value, { componentStack: null !== c2 ? c2 : "" });
        });
        return c;
      }
      function Si(a, b, c) {
        var d = a.pingCache;
        if (null === d) {
          d = a.pingCache = new Mi();
          var e = /* @__PURE__ */ new Set();
          d.set(b, e);
        } else e = d.get(b), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b, e));
        e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
      }
      function Ui(a) {
        do {
          var b;
          if (b = 13 === a.tag) b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
          if (b) return a;
          a = a.return;
        } while (null !== a);
        return null;
      }
      function Vi(a, b, c, d, e) {
        if (0 === (a.mode & 1)) return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
        a.flags |= 65536;
        a.lanes = e;
        return a;
      }
      var Wi = ua.ReactCurrentOwner;
      var dh = false;
      function Xi(a, b, c, d) {
        b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
      }
      function Yi(a, b, c, d, e) {
        c = c.render;
        var f = b.ref;
        ch(b, e);
        d = Nh(a, b, c, d, f, e);
        c = Sh();
        if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
        I && c && vg(b);
        b.flags |= 1;
        Xi(a, b, d, e);
        return b.child;
      }
      function $i(a, b, c, d, e) {
        if (null === a) {
          var f = c.type;
          if ("function" === typeof f && !aj(f) && void 0 === f.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f, bj(a, b, f, d, e);
          a = Rg(c.type, null, d, b, b.mode, e);
          a.ref = b.ref;
          a.return = b;
          return b.child = a;
        }
        f = a.child;
        if (0 === (a.lanes & e)) {
          var g = f.memoizedProps;
          c = c.compare;
          c = null !== c ? c : Ie;
          if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
        }
        b.flags |= 1;
        a = Pg(f, d);
        a.ref = b.ref;
        a.return = b;
        return b.child = a;
      }
      function bj(a, b, c, d, e) {
        if (null !== a) {
          var f = a.memoizedProps;
          if (Ie(f, d) && a.ref === b.ref) if (dh = false, b.pendingProps = d = f, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
          else return b.lanes = a.lanes, Zi(a, b, e);
        }
        return cj(a, b, c, d, e);
      }
      function dj(a, b, c) {
        var d = b.pendingProps, e = d.children, f = null !== a ? a.memoizedState : null;
        if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
        else {
          if (0 === (c & 1073741824)) return a = null !== f ? f.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
          b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
          d = null !== f ? f.baseLanes : c;
          G(ej, fj);
          fj |= d;
        }
        else null !== f ? (d = f.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
        Xi(a, b, e, c);
        return b.child;
      }
      function gj(a, b) {
        var c = b.ref;
        if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
      }
      function cj(a, b, c, d, e) {
        var f = Zf(c) ? Xf : H.current;
        f = Yf(b, f);
        ch(b, e);
        c = Nh(a, b, c, d, f, e);
        d = Sh();
        if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
        I && d && vg(b);
        b.flags |= 1;
        Xi(a, b, c, e);
        return b.child;
      }
      function hj(a, b, c, d, e) {
        if (Zf(c)) {
          var f = true;
          cg(b);
        } else f = false;
        ch(b, e);
        if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
        else if (null === a) {
          var g = b.stateNode, h = b.memoizedProps;
          g.props = h;
          var k = g.context, l = c.contextType;
          "object" === typeof l && null !== l ? l = eh(l) : (l = Zf(c) ? Xf : H.current, l = Yf(b, l));
          var m = c.getDerivedStateFromProps, q = "function" === typeof m || "function" === typeof g.getSnapshotBeforeUpdate;
          q || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k !== l) && Hi(b, g, d, l);
          jh = false;
          var r = b.memoizedState;
          g.state = r;
          qh(b, d, g, e);
          k = b.memoizedState;
          h !== d || r !== k || Wf.current || jh ? ("function" === typeof m && (Di(b, c, m, d), k = b.memoizedState), (h = jh || Fi(b, c, h, d, r, k, l)) ? (q || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k), g.props = d, g.state = k, g.context = l, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
        } else {
          g = b.stateNode;
          lh(a, b);
          h = b.memoizedProps;
          l = b.type === b.elementType ? h : Ci(b.type, h);
          g.props = l;
          q = b.pendingProps;
          r = g.context;
          k = c.contextType;
          "object" === typeof k && null !== k ? k = eh(k) : (k = Zf(c) ? Xf : H.current, k = Yf(b, k));
          var y = c.getDerivedStateFromProps;
          (m = "function" === typeof y || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q || r !== k) && Hi(b, g, d, k);
          jh = false;
          r = b.memoizedState;
          g.state = r;
          qh(b, d, g, e);
          var n = b.memoizedState;
          h !== q || r !== n || Wf.current || jh ? ("function" === typeof y && (Di(b, c, y, d), n = b.memoizedState), (l = jh || Fi(b, c, l, d, r, n, k) || false) ? (m || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n, k), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n, k)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n), g.props = d, g.state = n, g.context = k, d = l) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r === a.memoizedState || (b.flags |= 1024), d = false);
        }
        return jj(a, b, c, d, f, e);
      }
      function jj(a, b, c, d, e, f) {
        gj(a, b);
        var g = 0 !== (b.flags & 128);
        if (!d && !g) return e && dg(b, c, false), Zi(a, b, f);
        d = b.stateNode;
        Wi.current = b;
        var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
        b.flags |= 1;
        null !== a && g ? (b.child = Ug(b, a.child, null, f), b.child = Ug(b, null, h, f)) : Xi(a, b, h, f);
        b.memoizedState = d.state;
        e && dg(b, c, true);
        return b.child;
      }
      function kj(a) {
        var b = a.stateNode;
        b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, false);
        yh(a, b.containerInfo);
      }
      function lj(a, b, c, d, e) {
        Ig();
        Jg(e);
        b.flags |= 256;
        Xi(a, b, c, d);
        return b.child;
      }
      var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
      function nj(a) {
        return { baseLanes: a, cachePool: null, transitions: null };
      }
      function oj(a, b, c) {
        var d = b.pendingProps, e = L.current, f = false, g = 0 !== (b.flags & 128), h;
        (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
        if (h) f = true, b.flags &= -129;
        else if (null === a || null !== a.memoizedState) e |= 1;
        G(L, e & 1);
        if (null === a) {
          Eg(b);
          a = b.memoizedState;
          if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
          g = d.children;
          a = d.fallback;
          return f ? (d = b.mode, f = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f ? (f.childLanes = 0, f.pendingProps = g) : f = pj(g, d, 0, null), a = Tg(a, d, c, null), f.return = b, a.return = b, f.sibling = a, b.child = f, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
        }
        e = a.memoizedState;
        if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
        if (f) {
          f = d.fallback;
          g = b.mode;
          e = a.child;
          h = e.sibling;
          var k = { mode: "hidden", children: d.children };
          0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k, b.deletions = null) : (d = Pg(e, k), d.subtreeFlags = e.subtreeFlags & 14680064);
          null !== h ? f = Pg(h, f) : (f = Tg(f, g, c, null), f.flags |= 2);
          f.return = b;
          d.return = b;
          d.sibling = f;
          b.child = d;
          d = f;
          f = b.child;
          g = a.child.memoizedState;
          g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
          f.memoizedState = g;
          f.childLanes = a.childLanes & ~c;
          b.memoizedState = mj;
          return d;
        }
        f = a.child;
        a = f.sibling;
        d = Pg(f, { mode: "visible", children: d.children });
        0 === (b.mode & 1) && (d.lanes = c);
        d.return = b;
        d.sibling = null;
        null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
        b.child = d;
        b.memoizedState = null;
        return d;
      }
      function qj(a, b) {
        b = pj({ mode: "visible", children: b }, a.mode, 0, null);
        b.return = a;
        return a.child = b;
      }
      function sj(a, b, c, d) {
        null !== d && Jg(d);
        Ug(b, a.child, null, c);
        a = qj(b, b.pendingProps.children);
        a.flags |= 2;
        b.memoizedState = null;
        return a;
      }
      function rj(a, b, c, d, e, f, g) {
        if (c) {
          if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
          if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
          f = d.fallback;
          e = b.mode;
          d = pj({ mode: "visible", children: d.children }, e, 0, null);
          f = Tg(f, e, g, null);
          f.flags |= 2;
          d.return = b;
          f.return = b;
          d.sibling = f;
          b.child = d;
          0 !== (b.mode & 1) && Ug(b, a.child, null, g);
          b.child.memoizedState = nj(g);
          b.memoizedState = mj;
          return f;
        }
        if (0 === (b.mode & 1)) return sj(a, b, g, null);
        if ("$!" === e.data) {
          d = e.nextSibling && e.nextSibling.dataset;
          if (d) var h = d.dgst;
          d = h;
          f = Error(p(419));
          d = Ki(f, d, void 0);
          return sj(a, b, g, d);
        }
        h = 0 !== (g & a.childLanes);
        if (dh || h) {
          d = Q;
          if (null !== d) {
            switch (g & -g) {
              case 4:
                e = 2;
                break;
              case 16:
                e = 8;
                break;
              case 64:
              case 128:
              case 256:
              case 512:
              case 1024:
              case 2048:
              case 4096:
              case 8192:
              case 16384:
              case 32768:
              case 65536:
              case 131072:
              case 262144:
              case 524288:
              case 1048576:
              case 2097152:
              case 4194304:
              case 8388608:
              case 16777216:
              case 33554432:
              case 67108864:
                e = 32;
                break;
              case 536870912:
                e = 268435456;
                break;
              default:
                e = 0;
            }
            e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
            0 !== e && e !== f.retryLane && (f.retryLane = e, ih(a, e), gi(d, a, e, -1));
          }
          tj();
          d = Ki(Error(p(421)));
          return sj(a, b, g, d);
        }
        if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
        a = f.treeContext;
        yg = Lf(e.nextSibling);
        xg = b;
        I = true;
        zg = null;
        null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
        b = qj(b, d.children);
        b.flags |= 4096;
        return b;
      }
      function vj(a, b, c) {
        a.lanes |= b;
        var d = a.alternate;
        null !== d && (d.lanes |= b);
        bh(a.return, b, c);
      }
      function wj(a, b, c, d, e) {
        var f = a.memoizedState;
        null === f ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f.isBackwards = b, f.rendering = null, f.renderingStartTime = 0, f.last = d, f.tail = c, f.tailMode = e);
      }
      function xj(a, b, c) {
        var d = b.pendingProps, e = d.revealOrder, f = d.tail;
        Xi(a, b, d.children, c);
        d = L.current;
        if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;
        else {
          if (null !== a && 0 !== (a.flags & 128)) a: for (a = b.child; null !== a; ) {
            if (13 === a.tag) null !== a.memoizedState && vj(a, c, b);
            else if (19 === a.tag) vj(a, c, b);
            else if (null !== a.child) {
              a.child.return = a;
              a = a.child;
              continue;
            }
            if (a === b) break a;
            for (; null === a.sibling; ) {
              if (null === a.return || a.return === b) break a;
              a = a.return;
            }
            a.sibling.return = a.return;
            a = a.sibling;
          }
          d &= 1;
        }
        G(L, d);
        if (0 === (b.mode & 1)) b.memoizedState = null;
        else switch (e) {
          case "forwards":
            c = b.child;
            for (e = null; null !== c; ) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
            c = e;
            null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
            wj(b, false, e, c, f);
            break;
          case "backwards":
            c = null;
            e = b.child;
            for (b.child = null; null !== e; ) {
              a = e.alternate;
              if (null !== a && null === Ch(a)) {
                b.child = e;
                break;
              }
              a = e.sibling;
              e.sibling = c;
              c = e;
              e = a;
            }
            wj(b, true, c, null, f);
            break;
          case "together":
            wj(b, false, null, null, void 0);
            break;
          default:
            b.memoizedState = null;
        }
        return b.child;
      }
      function ij(a, b) {
        0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
      }
      function Zi(a, b, c) {
        null !== a && (b.dependencies = a.dependencies);
        rh |= b.lanes;
        if (0 === (c & b.childLanes)) return null;
        if (null !== a && b.child !== a.child) throw Error(p(153));
        if (null !== b.child) {
          a = b.child;
          c = Pg(a, a.pendingProps);
          b.child = c;
          for (c.return = b; null !== a.sibling; ) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
          c.sibling = null;
        }
        return b.child;
      }
      function yj(a, b, c) {
        switch (b.tag) {
          case 3:
            kj(b);
            Ig();
            break;
          case 5:
            Ah(b);
            break;
          case 1:
            Zf(b.type) && cg(b);
            break;
          case 4:
            yh(b, b.stateNode.containerInfo);
            break;
          case 10:
            var d = b.type._context, e = b.memoizedProps.value;
            G(Wg, d._currentValue);
            d._currentValue = e;
            break;
          case 13:
            d = b.memoizedState;
            if (null !== d) {
              if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
              if (0 !== (c & b.child.childLanes)) return oj(a, b, c);
              G(L, L.current & 1);
              a = Zi(a, b, c);
              return null !== a ? a.sibling : null;
            }
            G(L, L.current & 1);
            break;
          case 19:
            d = 0 !== (c & b.childLanes);
            if (0 !== (a.flags & 128)) {
              if (d) return xj(a, b, c);
              b.flags |= 128;
            }
            e = b.memoizedState;
            null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
            G(L, L.current);
            if (d) break;
            else return null;
          case 22:
          case 23:
            return b.lanes = 0, dj(a, b, c);
        }
        return Zi(a, b, c);
      }
      var zj;
      var Aj;
      var Bj;
      var Cj;
      zj = function(a, b) {
        for (var c = b.child; null !== c; ) {
          if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);
          else if (4 !== c.tag && null !== c.child) {
            c.child.return = c;
            c = c.child;
            continue;
          }
          if (c === b) break;
          for (; null === c.sibling; ) {
            if (null === c.return || c.return === b) return;
            c = c.return;
          }
          c.sibling.return = c.return;
          c = c.sibling;
        }
      };
      Aj = function() {
      };
      Bj = function(a, b, c, d) {
        var e = a.memoizedProps;
        if (e !== d) {
          a = b.stateNode;
          xh(uh.current);
          var f = null;
          switch (c) {
            case "input":
              e = Ya(a, e);
              d = Ya(a, d);
              f = [];
              break;
            case "select":
              e = A({}, e, { value: void 0 });
              d = A({}, d, { value: void 0 });
              f = [];
              break;
            case "textarea":
              e = gb(a, e);
              d = gb(a, d);
              f = [];
              break;
            default:
              "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
          }
          ub(c, d);
          var g;
          c = null;
          for (l in e) if (!d.hasOwnProperty(l) && e.hasOwnProperty(l) && null != e[l]) if ("style" === l) {
            var h = e[l];
            for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
          } else "dangerouslySetInnerHTML" !== l && "children" !== l && "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && "autoFocus" !== l && (ea.hasOwnProperty(l) ? f || (f = []) : (f = f || []).push(l, null));
          for (l in d) {
            var k = d[l];
            h = null != e ? e[l] : void 0;
            if (d.hasOwnProperty(l) && k !== h && (null != k || null != h)) if ("style" === l) if (h) {
              for (g in h) !h.hasOwnProperty(g) || k && k.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
              for (g in k) k.hasOwnProperty(g) && h[g] !== k[g] && (c || (c = {}), c[g] = k[g]);
            } else c || (f || (f = []), f.push(
              l,
              c
            )), c = k;
            else "dangerouslySetInnerHTML" === l ? (k = k ? k.__html : void 0, h = h ? h.__html : void 0, null != k && h !== k && (f = f || []).push(l, k)) : "children" === l ? "string" !== typeof k && "number" !== typeof k || (f = f || []).push(l, "" + k) : "suppressContentEditableWarning" !== l && "suppressHydrationWarning" !== l && (ea.hasOwnProperty(l) ? (null != k && "onScroll" === l && D("scroll", a), f || h === k || (f = [])) : (f = f || []).push(l, k));
          }
          c && (f = f || []).push("style", c);
          var l = f;
          if (b.updateQueue = l) b.flags |= 4;
        }
      };
      Cj = function(a, b, c, d) {
        c !== d && (b.flags |= 4);
      };
      function Dj(a, b) {
        if (!I) switch (a.tailMode) {
          case "hidden":
            b = a.tail;
            for (var c = null; null !== b; ) null !== b.alternate && (c = b), b = b.sibling;
            null === c ? a.tail = null : c.sibling = null;
            break;
          case "collapsed":
            c = a.tail;
            for (var d = null; null !== c; ) null !== c.alternate && (d = c), c = c.sibling;
            null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
        }
      }
      function S(a) {
        var b = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
        if (b) for (var e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
        else for (e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
        a.subtreeFlags |= d;
        a.childLanes = c;
        return b;
      }
      function Ej(a, b, c) {
        var d = b.pendingProps;
        wg(b);
        switch (b.tag) {
          case 2:
          case 16:
          case 15:
          case 0:
          case 11:
          case 7:
          case 8:
          case 12:
          case 9:
          case 14:
            return S(b), null;
          case 1:
            return Zf(b.type) && $f(), S(b), null;
          case 3:
            d = b.stateNode;
            zh();
            E(Wf);
            E(H);
            Eh();
            d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
            if (null === a || null === a.child) Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
            Aj(a, b);
            S(b);
            return null;
          case 5:
            Bh(b);
            var e = xh(wh.current);
            c = b.type;
            if (null !== a && null != b.stateNode) Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
            else {
              if (!d) {
                if (null === b.stateNode) throw Error(p(166));
                S(b);
                return null;
              }
              a = xh(uh.current);
              if (Gg(b)) {
                d = b.stateNode;
                c = b.type;
                var f = b.memoizedProps;
                d[Of] = b;
                d[Pf] = f;
                a = 0 !== (b.mode & 1);
                switch (c) {
                  case "dialog":
                    D("cancel", d);
                    D("close", d);
                    break;
                  case "iframe":
                  case "object":
                  case "embed":
                    D("load", d);
                    break;
                  case "video":
                  case "audio":
                    for (e = 0; e < lf.length; e++) D(lf[e], d);
                    break;
                  case "source":
                    D("error", d);
                    break;
                  case "img":
                  case "image":
                  case "link":
                    D(
                      "error",
                      d
                    );
                    D("load", d);
                    break;
                  case "details":
                    D("toggle", d);
                    break;
                  case "input":
                    Za(d, f);
                    D("invalid", d);
                    break;
                  case "select":
                    d._wrapperState = { wasMultiple: !!f.multiple };
                    D("invalid", d);
                    break;
                  case "textarea":
                    hb(d, f), D("invalid", d);
                }
                ub(c, f);
                e = null;
                for (var g in f) if (f.hasOwnProperty(g)) {
                  var h = f[g];
                  "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f.suppressHydrationWarning && Af(
                    d.textContent,
                    h,
                    a
                  ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
                }
                switch (c) {
                  case "input":
                    Va(d);
                    db(d, f, true);
                    break;
                  case "textarea":
                    Va(d);
                    jb(d);
                    break;
                  case "select":
                  case "option":
                    break;
                  default:
                    "function" === typeof f.onClick && (d.onclick = Bf);
                }
                d = e;
                b.updateQueue = d;
                null !== d && (b.flags |= 4);
              } else {
                g = 9 === e.nodeType ? e : e.ownerDocument;
                "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
                "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
                a[Of] = b;
                a[Pf] = d;
                zj(a, b, false, false);
                b.stateNode = a;
                a: {
                  g = vb(c, d);
                  switch (c) {
                    case "dialog":
                      D("cancel", a);
                      D("close", a);
                      e = d;
                      break;
                    case "iframe":
                    case "object":
                    case "embed":
                      D("load", a);
                      e = d;
                      break;
                    case "video":
                    case "audio":
                      for (e = 0; e < lf.length; e++) D(lf[e], a);
                      e = d;
                      break;
                    case "source":
                      D("error", a);
                      e = d;
                      break;
                    case "img":
                    case "image":
                    case "link":
                      D(
                        "error",
                        a
                      );
                      D("load", a);
                      e = d;
                      break;
                    case "details":
                      D("toggle", a);
                      e = d;
                      break;
                    case "input":
                      Za(a, d);
                      e = Ya(a, d);
                      D("invalid", a);
                      break;
                    case "option":
                      e = d;
                      break;
                    case "select":
                      a._wrapperState = { wasMultiple: !!d.multiple };
                      e = A({}, d, { value: void 0 });
                      D("invalid", a);
                      break;
                    case "textarea":
                      hb(a, d);
                      e = gb(a, d);
                      D("invalid", a);
                      break;
                    default:
                      e = d;
                  }
                  ub(c, e);
                  h = e;
                  for (f in h) if (h.hasOwnProperty(f)) {
                    var k = h[f];
                    "style" === f ? sb(a, k) : "dangerouslySetInnerHTML" === f ? (k = k ? k.__html : void 0, null != k && nb(a, k)) : "children" === f ? "string" === typeof k ? ("textarea" !== c || "" !== k) && ob(a, k) : "number" === typeof k && ob(a, "" + k) : "suppressContentEditableWarning" !== f && "suppressHydrationWarning" !== f && "autoFocus" !== f && (ea.hasOwnProperty(f) ? null != k && "onScroll" === f && D("scroll", a) : null != k && ta(a, f, k, g));
                  }
                  switch (c) {
                    case "input":
                      Va(a);
                      db(a, d, false);
                      break;
                    case "textarea":
                      Va(a);
                      jb(a);
                      break;
                    case "option":
                      null != d.value && a.setAttribute("value", "" + Sa(d.value));
                      break;
                    case "select":
                      a.multiple = !!d.multiple;
                      f = d.value;
                      null != f ? fb(a, !!d.multiple, f, false) : null != d.defaultValue && fb(
                        a,
                        !!d.multiple,
                        d.defaultValue,
                        true
                      );
                      break;
                    default:
                      "function" === typeof e.onClick && (a.onclick = Bf);
                  }
                  switch (c) {
                    case "button":
                    case "input":
                    case "select":
                    case "textarea":
                      d = !!d.autoFocus;
                      break a;
                    case "img":
                      d = true;
                      break a;
                    default:
                      d = false;
                  }
                }
                d && (b.flags |= 4);
              }
              null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
            }
            S(b);
            return null;
          case 6:
            if (a && null != b.stateNode) Cj(a, b, a.memoizedProps, d);
            else {
              if ("string" !== typeof d && null === b.stateNode) throw Error(p(166));
              c = xh(wh.current);
              xh(uh.current);
              if (Gg(b)) {
                d = b.stateNode;
                c = b.memoizedProps;
                d[Of] = b;
                if (f = d.nodeValue !== c) {
                  if (a = xg, null !== a) switch (a.tag) {
                    case 3:
                      Af(d.nodeValue, c, 0 !== (a.mode & 1));
                      break;
                    case 5:
                      true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
                  }
                }
                f && (b.flags |= 4);
              } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
            }
            S(b);
            return null;
          case 13:
            E(L);
            d = b.memoizedState;
            if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
              if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f = false;
              else if (f = Gg(b), null !== d && null !== d.dehydrated) {
                if (null === a) {
                  if (!f) throw Error(p(318));
                  f = b.memoizedState;
                  f = null !== f ? f.dehydrated : null;
                  if (!f) throw Error(p(317));
                  f[Of] = b;
                } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
                S(b);
                f = false;
              } else null !== zg && (Fj(zg), zg = null), f = true;
              if (!f) return b.flags & 65536 ? b : null;
            }
            if (0 !== (b.flags & 128)) return b.lanes = c, b;
            d = null !== d;
            d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
            null !== b.updateQueue && (b.flags |= 4);
            S(b);
            return null;
          case 4:
            return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
          case 10:
            return ah(b.type._context), S(b), null;
          case 17:
            return Zf(b.type) && $f(), S(b), null;
          case 19:
            E(L);
            f = b.memoizedState;
            if (null === f) return S(b), null;
            d = 0 !== (b.flags & 128);
            g = f.rendering;
            if (null === g) if (d) Dj(f, false);
            else {
              if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a; ) {
                g = Ch(a);
                if (null !== g) {
                  b.flags |= 128;
                  Dj(f, false);
                  d = g.updateQueue;
                  null !== d && (b.updateQueue = d, b.flags |= 4);
                  b.subtreeFlags = 0;
                  d = c;
                  for (c = b.child; null !== c; ) f = c, a = d, f.flags &= 14680066, g = f.alternate, null === g ? (f.childLanes = 0, f.lanes = a, f.child = null, f.subtreeFlags = 0, f.memoizedProps = null, f.memoizedState = null, f.updateQueue = null, f.dependencies = null, f.stateNode = null) : (f.childLanes = g.childLanes, f.lanes = g.lanes, f.child = g.child, f.subtreeFlags = 0, f.deletions = null, f.memoizedProps = g.memoizedProps, f.memoizedState = g.memoizedState, f.updateQueue = g.updateQueue, f.type = g.type, a = g.dependencies, f.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
                  G(L, L.current & 1 | 2);
                  return b.child;
                }
                a = a.sibling;
              }
              null !== f.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f, false), b.lanes = 4194304);
            }
            else {
              if (!d) if (a = Ch(g), null !== a) {
                if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f, true), null === f.tail && "hidden" === f.tailMode && !g.alternate && !I) return S(b), null;
              } else 2 * B() - f.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f, false), b.lanes = 4194304);
              f.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f.last, null !== c ? c.sibling = g : b.child = g, f.last = g);
            }
            if (null !== f.tail) return b = f.tail, f.rendering = b, f.tail = b.sibling, f.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
            S(b);
            return null;
          case 22:
          case 23:
            return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
          case 24:
            return null;
          case 25:
            return null;
        }
        throw Error(p(156, b.tag));
      }
      function Ij(a, b) {
        wg(b);
        switch (b.tag) {
          case 1:
            return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
          case 3:
            return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
          case 5:
            return Bh(b), null;
          case 13:
            E(L);
            a = b.memoizedState;
            if (null !== a && null !== a.dehydrated) {
              if (null === b.alternate) throw Error(p(340));
              Ig();
            }
            a = b.flags;
            return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
          case 19:
            return E(L), null;
          case 4:
            return zh(), null;
          case 10:
            return ah(b.type._context), null;
          case 22:
          case 23:
            return Hj(), null;
          case 24:
            return null;
          default:
            return null;
        }
      }
      var Jj = false;
      var U = false;
      var Kj = "function" === typeof WeakSet ? WeakSet : Set;
      var V = null;
      function Lj(a, b) {
        var c = a.ref;
        if (null !== c) if ("function" === typeof c) try {
          c(null);
        } catch (d) {
          W(a, b, d);
        }
        else c.current = null;
      }
      function Mj(a, b, c) {
        try {
          c();
        } catch (d) {
          W(a, b, d);
        }
      }
      var Nj = false;
      function Oj(a, b) {
        Cf = dd;
        a = Me();
        if (Ne(a)) {
          if ("selectionStart" in a) var c = { start: a.selectionStart, end: a.selectionEnd };
          else a: {
            c = (c = a.ownerDocument) && c.defaultView || window;
            var d = c.getSelection && c.getSelection();
            if (d && 0 !== d.rangeCount) {
              c = d.anchorNode;
              var e = d.anchorOffset, f = d.focusNode;
              d = d.focusOffset;
              try {
                c.nodeType, f.nodeType;
              } catch (F) {
                c = null;
                break a;
              }
              var g = 0, h = -1, k = -1, l = 0, m = 0, q = a, r = null;
              b: for (; ; ) {
                for (var y; ; ) {
                  q !== c || 0 !== e && 3 !== q.nodeType || (h = g + e);
                  q !== f || 0 !== d && 3 !== q.nodeType || (k = g + d);
                  3 === q.nodeType && (g += q.nodeValue.length);
                  if (null === (y = q.firstChild)) break;
                  r = q;
                  q = y;
                }
                for (; ; ) {
                  if (q === a) break b;
                  r === c && ++l === e && (h = g);
                  r === f && ++m === d && (k = g);
                  if (null !== (y = q.nextSibling)) break;
                  q = r;
                  r = q.parentNode;
                }
                q = y;
              }
              c = -1 === h || -1 === k ? null : { start: h, end: k };
            } else c = null;
          }
          c = c || { start: 0, end: 0 };
        } else c = null;
        Df = { focusedElem: a, selectionRange: c };
        dd = false;
        for (V = b; null !== V; ) if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a) a.return = b, V = a;
        else for (; null !== V; ) {
          b = V;
          try {
            var n = b.alternate;
            if (0 !== (b.flags & 1024)) switch (b.tag) {
              case 0:
              case 11:
              case 15:
                break;
              case 1:
                if (null !== n) {
                  var t = n.memoizedProps, J = n.memoizedState, x = b.stateNode, w = x.getSnapshotBeforeUpdate(b.elementType === b.type ? t : Ci(b.type, t), J);
                  x.__reactInternalSnapshotBeforeUpdate = w;
                }
                break;
              case 3:
                var u = b.stateNode.containerInfo;
                1 === u.nodeType ? u.textContent = "" : 9 === u.nodeType && u.documentElement && u.removeChild(u.documentElement);
                break;
              case 5:
              case 6:
              case 4:
              case 17:
                break;
              default:
                throw Error(p(163));
            }
          } catch (F) {
            W(b, b.return, F);
          }
          a = b.sibling;
          if (null !== a) {
            a.return = b.return;
            V = a;
            break;
          }
          V = b.return;
        }
        n = Nj;
        Nj = false;
        return n;
      }
      function Pj(a, b, c) {
        var d = b.updateQueue;
        d = null !== d ? d.lastEffect : null;
        if (null !== d) {
          var e = d = d.next;
          do {
            if ((e.tag & a) === a) {
              var f = e.destroy;
              e.destroy = void 0;
              void 0 !== f && Mj(b, c, f);
            }
            e = e.next;
          } while (e !== d);
        }
      }
      function Qj(a, b) {
        b = b.updateQueue;
        b = null !== b ? b.lastEffect : null;
        if (null !== b) {
          var c = b = b.next;
          do {
            if ((c.tag & a) === a) {
              var d = c.create;
              c.destroy = d();
            }
            c = c.next;
          } while (c !== b);
        }
      }
      function Rj(a) {
        var b = a.ref;
        if (null !== b) {
          var c = a.stateNode;
          switch (a.tag) {
            case 5:
              a = c;
              break;
            default:
              a = c;
          }
          "function" === typeof b ? b(a) : b.current = a;
        }
      }
      function Sj(a) {
        var b = a.alternate;
        null !== b && (a.alternate = null, Sj(b));
        a.child = null;
        a.deletions = null;
        a.sibling = null;
        5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
        a.stateNode = null;
        a.return = null;
        a.dependencies = null;
        a.memoizedProps = null;
        a.memoizedState = null;
        a.pendingProps = null;
        a.stateNode = null;
        a.updateQueue = null;
      }
      function Tj(a) {
        return 5 === a.tag || 3 === a.tag || 4 === a.tag;
      }
      function Uj(a) {
        a: for (; ; ) {
          for (; null === a.sibling; ) {
            if (null === a.return || Tj(a.return)) return null;
            a = a.return;
          }
          a.sibling.return = a.return;
          for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
            if (a.flags & 2) continue a;
            if (null === a.child || 4 === a.tag) continue a;
            else a.child.return = a, a = a.child;
          }
          if (!(a.flags & 2)) return a.stateNode;
        }
      }
      function Vj(a, b, c) {
        var d = a.tag;
        if (5 === d || 6 === d) a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));
        else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b, c), a = a.sibling; null !== a; ) Vj(a, b, c), a = a.sibling;
      }
      function Wj(a, b, c) {
        var d = a.tag;
        if (5 === d || 6 === d) a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);
        else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b, c), a = a.sibling; null !== a; ) Wj(a, b, c), a = a.sibling;
      }
      var X = null;
      var Xj = false;
      function Yj(a, b, c) {
        for (c = c.child; null !== c; ) Zj(a, b, c), c = c.sibling;
      }
      function Zj(a, b, c) {
        if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
          lc.onCommitFiberUnmount(kc, c);
        } catch (h) {
        }
        switch (c.tag) {
          case 5:
            U || Lj(c, b);
          case 6:
            var d = X, e = Xj;
            X = null;
            Yj(a, b, c);
            X = d;
            Xj = e;
            null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X.removeChild(c.stateNode));
            break;
          case 18:
            null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X, c.stateNode));
            break;
          case 4:
            d = X;
            e = Xj;
            X = c.stateNode.containerInfo;
            Xj = true;
            Yj(a, b, c);
            X = d;
            Xj = e;
            break;
          case 0:
          case 11:
          case 14:
          case 15:
            if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
              e = d = d.next;
              do {
                var f = e, g = f.destroy;
                f = f.tag;
                void 0 !== g && (0 !== (f & 2) ? Mj(c, b, g) : 0 !== (f & 4) && Mj(c, b, g));
                e = e.next;
              } while (e !== d);
            }
            Yj(a, b, c);
            break;
          case 1:
            if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
              d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
            } catch (h) {
              W(c, b, h);
            }
            Yj(a, b, c);
            break;
          case 21:
            Yj(a, b, c);
            break;
          case 22:
            c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
            break;
          default:
            Yj(a, b, c);
        }
      }
      function ak(a) {
        var b = a.updateQueue;
        if (null !== b) {
          a.updateQueue = null;
          var c = a.stateNode;
          null === c && (c = a.stateNode = new Kj());
          b.forEach(function(b2) {
            var d = bk.bind(null, a, b2);
            c.has(b2) || (c.add(b2), b2.then(d, d));
          });
        }
      }
      function ck(a, b) {
        var c = b.deletions;
        if (null !== c) for (var d = 0; d < c.length; d++) {
          var e = c[d];
          try {
            var f = a, g = b, h = g;
            a: for (; null !== h; ) {
              switch (h.tag) {
                case 5:
                  X = h.stateNode;
                  Xj = false;
                  break a;
                case 3:
                  X = h.stateNode.containerInfo;
                  Xj = true;
                  break a;
                case 4:
                  X = h.stateNode.containerInfo;
                  Xj = true;
                  break a;
              }
              h = h.return;
            }
            if (null === X) throw Error(p(160));
            Zj(f, g, e);
            X = null;
            Xj = false;
            var k = e.alternate;
            null !== k && (k.return = null);
            e.return = null;
          } catch (l) {
            W(e, b, l);
          }
        }
        if (b.subtreeFlags & 12854) for (b = b.child; null !== b; ) dk(b, a), b = b.sibling;
      }
      function dk(a, b) {
        var c = a.alternate, d = a.flags;
        switch (a.tag) {
          case 0:
          case 11:
          case 14:
          case 15:
            ck(b, a);
            ek(a);
            if (d & 4) {
              try {
                Pj(3, a, a.return), Qj(3, a);
              } catch (t) {
                W(a, a.return, t);
              }
              try {
                Pj(5, a, a.return);
              } catch (t) {
                W(a, a.return, t);
              }
            }
            break;
          case 1:
            ck(b, a);
            ek(a);
            d & 512 && null !== c && Lj(c, c.return);
            break;
          case 5:
            ck(b, a);
            ek(a);
            d & 512 && null !== c && Lj(c, c.return);
            if (a.flags & 32) {
              var e = a.stateNode;
              try {
                ob(e, "");
              } catch (t) {
                W(a, a.return, t);
              }
            }
            if (d & 4 && (e = a.stateNode, null != e)) {
              var f = a.memoizedProps, g = null !== c ? c.memoizedProps : f, h = a.type, k = a.updateQueue;
              a.updateQueue = null;
              if (null !== k) try {
                "input" === h && "radio" === f.type && null != f.name && ab(e, f);
                vb(h, g);
                var l = vb(h, f);
                for (g = 0; g < k.length; g += 2) {
                  var m = k[g], q = k[g + 1];
                  "style" === m ? sb(e, q) : "dangerouslySetInnerHTML" === m ? nb(e, q) : "children" === m ? ob(e, q) : ta(e, m, q, l);
                }
                switch (h) {
                  case "input":
                    bb(e, f);
                    break;
                  case "textarea":
                    ib(e, f);
                    break;
                  case "select":
                    var r = e._wrapperState.wasMultiple;
                    e._wrapperState.wasMultiple = !!f.multiple;
                    var y = f.value;
                    null != y ? fb(e, !!f.multiple, y, false) : r !== !!f.multiple && (null != f.defaultValue ? fb(
                      e,
                      !!f.multiple,
                      f.defaultValue,
                      true
                    ) : fb(e, !!f.multiple, f.multiple ? [] : "", false));
                }
                e[Pf] = f;
              } catch (t) {
                W(a, a.return, t);
              }
            }
            break;
          case 6:
            ck(b, a);
            ek(a);
            if (d & 4) {
              if (null === a.stateNode) throw Error(p(162));
              e = a.stateNode;
              f = a.memoizedProps;
              try {
                e.nodeValue = f;
              } catch (t) {
                W(a, a.return, t);
              }
            }
            break;
          case 3:
            ck(b, a);
            ek(a);
            if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
              bd(b.containerInfo);
            } catch (t) {
              W(a, a.return, t);
            }
            break;
          case 4:
            ck(b, a);
            ek(a);
            break;
          case 13:
            ck(b, a);
            ek(a);
            e = a.child;
            e.flags & 8192 && (f = null !== e.memoizedState, e.stateNode.isHidden = f, !f || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
            d & 4 && ak(a);
            break;
          case 22:
            m = null !== c && null !== c.memoizedState;
            a.mode & 1 ? (U = (l = U) || m, ck(b, a), U = l) : ck(b, a);
            ek(a);
            if (d & 8192) {
              l = null !== a.memoizedState;
              if ((a.stateNode.isHidden = l) && !m && 0 !== (a.mode & 1)) for (V = a, m = a.child; null !== m; ) {
                for (q = V = m; null !== V; ) {
                  r = V;
                  y = r.child;
                  switch (r.tag) {
                    case 0:
                    case 11:
                    case 14:
                    case 15:
                      Pj(4, r, r.return);
                      break;
                    case 1:
                      Lj(r, r.return);
                      var n = r.stateNode;
                      if ("function" === typeof n.componentWillUnmount) {
                        d = r;
                        c = r.return;
                        try {
                          b = d, n.props = b.memoizedProps, n.state = b.memoizedState, n.componentWillUnmount();
                        } catch (t) {
                          W(d, c, t);
                        }
                      }
                      break;
                    case 5:
                      Lj(r, r.return);
                      break;
                    case 22:
                      if (null !== r.memoizedState) {
                        gk(q);
                        continue;
                      }
                  }
                  null !== y ? (y.return = r, V = y) : gk(q);
                }
                m = m.sibling;
              }
              a: for (m = null, q = a; ; ) {
                if (5 === q.tag) {
                  if (null === m) {
                    m = q;
                    try {
                      e = q.stateNode, l ? (f = e.style, "function" === typeof f.setProperty ? f.setProperty("display", "none", "important") : f.display = "none") : (h = q.stateNode, k = q.memoizedProps.style, g = void 0 !== k && null !== k && k.hasOwnProperty("display") ? k.display : null, h.style.display = rb("display", g));
                    } catch (t) {
                      W(a, a.return, t);
                    }
                  }
                } else if (6 === q.tag) {
                  if (null === m) try {
                    q.stateNode.nodeValue = l ? "" : q.memoizedProps;
                  } catch (t) {
                    W(a, a.return, t);
                  }
                } else if ((22 !== q.tag && 23 !== q.tag || null === q.memoizedState || q === a) && null !== q.child) {
                  q.child.return = q;
                  q = q.child;
                  continue;
                }
                if (q === a) break a;
                for (; null === q.sibling; ) {
                  if (null === q.return || q.return === a) break a;
                  m === q && (m = null);
                  q = q.return;
                }
                m === q && (m = null);
                q.sibling.return = q.return;
                q = q.sibling;
              }
            }
            break;
          case 19:
            ck(b, a);
            ek(a);
            d & 4 && ak(a);
            break;
          case 21:
            break;
          default:
            ck(
              b,
              a
            ), ek(a);
        }
      }
      function ek(a) {
        var b = a.flags;
        if (b & 2) {
          try {
            a: {
              for (var c = a.return; null !== c; ) {
                if (Tj(c)) {
                  var d = c;
                  break a;
                }
                c = c.return;
              }
              throw Error(p(160));
            }
            switch (d.tag) {
              case 5:
                var e = d.stateNode;
                d.flags & 32 && (ob(e, ""), d.flags &= -33);
                var f = Uj(a);
                Wj(a, f, e);
                break;
              case 3:
              case 4:
                var g = d.stateNode.containerInfo, h = Uj(a);
                Vj(a, h, g);
                break;
              default:
                throw Error(p(161));
            }
          } catch (k) {
            W(a, a.return, k);
          }
          a.flags &= -3;
        }
        b & 4096 && (a.flags &= -4097);
      }
      function hk(a, b, c) {
        V = a;
        ik(a, b, c);
      }
      function ik(a, b, c) {
        for (var d = 0 !== (a.mode & 1); null !== V; ) {
          var e = V, f = e.child;
          if (22 === e.tag && d) {
            var g = null !== e.memoizedState || Jj;
            if (!g) {
              var h = e.alternate, k = null !== h && null !== h.memoizedState || U;
              h = Jj;
              var l = U;
              Jj = g;
              if ((U = k) && !l) for (V = e; null !== V; ) g = V, k = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k ? (k.return = g, V = k) : jk(e);
              for (; null !== f; ) V = f, ik(f, b, c), f = f.sibling;
              V = e;
              Jj = h;
              U = l;
            }
            kk(a, b, c);
          } else 0 !== (e.subtreeFlags & 8772) && null !== f ? (f.return = e, V = f) : kk(a, b, c);
        }
      }
      function kk(a) {
        for (; null !== V; ) {
          var b = V;
          if (0 !== (b.flags & 8772)) {
            var c = b.alternate;
            try {
              if (0 !== (b.flags & 8772)) switch (b.tag) {
                case 0:
                case 11:
                case 15:
                  U || Qj(5, b);
                  break;
                case 1:
                  var d = b.stateNode;
                  if (b.flags & 4 && !U) if (null === c) d.componentDidMount();
                  else {
                    var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
                    d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
                  }
                  var f = b.updateQueue;
                  null !== f && sh(b, f, d);
                  break;
                case 3:
                  var g = b.updateQueue;
                  if (null !== g) {
                    c = null;
                    if (null !== b.child) switch (b.child.tag) {
                      case 5:
                        c = b.child.stateNode;
                        break;
                      case 1:
                        c = b.child.stateNode;
                    }
                    sh(b, g, c);
                  }
                  break;
                case 5:
                  var h = b.stateNode;
                  if (null === c && b.flags & 4) {
                    c = h;
                    var k = b.memoizedProps;
                    switch (b.type) {
                      case "button":
                      case "input":
                      case "select":
                      case "textarea":
                        k.autoFocus && c.focus();
                        break;
                      case "img":
                        k.src && (c.src = k.src);
                    }
                  }
                  break;
                case 6:
                  break;
                case 4:
                  break;
                case 12:
                  break;
                case 13:
                  if (null === b.memoizedState) {
                    var l = b.alternate;
                    if (null !== l) {
                      var m = l.memoizedState;
                      if (null !== m) {
                        var q = m.dehydrated;
                        null !== q && bd(q);
                      }
                    }
                  }
                  break;
                case 19:
                case 17:
                case 21:
                case 22:
                case 23:
                case 25:
                  break;
                default:
                  throw Error(p(163));
              }
              U || b.flags & 512 && Rj(b);
            } catch (r) {
              W(b, b.return, r);
            }
          }
          if (b === a) {
            V = null;
            break;
          }
          c = b.sibling;
          if (null !== c) {
            c.return = b.return;
            V = c;
            break;
          }
          V = b.return;
        }
      }
      function gk(a) {
        for (; null !== V; ) {
          var b = V;
          if (b === a) {
            V = null;
            break;
          }
          var c = b.sibling;
          if (null !== c) {
            c.return = b.return;
            V = c;
            break;
          }
          V = b.return;
        }
      }
      function jk(a) {
        for (; null !== V; ) {
          var b = V;
          try {
            switch (b.tag) {
              case 0:
              case 11:
              case 15:
                var c = b.return;
                try {
                  Qj(4, b);
                } catch (k) {
                  W(b, c, k);
                }
                break;
              case 1:
                var d = b.stateNode;
                if ("function" === typeof d.componentDidMount) {
                  var e = b.return;
                  try {
                    d.componentDidMount();
                  } catch (k) {
                    W(b, e, k);
                  }
                }
                var f = b.return;
                try {
                  Rj(b);
                } catch (k) {
                  W(b, f, k);
                }
                break;
              case 5:
                var g = b.return;
                try {
                  Rj(b);
                } catch (k) {
                  W(b, g, k);
                }
            }
          } catch (k) {
            W(b, b.return, k);
          }
          if (b === a) {
            V = null;
            break;
          }
          var h = b.sibling;
          if (null !== h) {
            h.return = b.return;
            V = h;
            break;
          }
          V = b.return;
        }
      }
      var lk = Math.ceil;
      var mk = ua.ReactCurrentDispatcher;
      var nk = ua.ReactCurrentOwner;
      var ok = ua.ReactCurrentBatchConfig;
      var K = 0;
      var Q = null;
      var Y = null;
      var Z = 0;
      var fj = 0;
      var ej = Uf(0);
      var T = 0;
      var pk = null;
      var rh = 0;
      var qk = 0;
      var rk = 0;
      var sk = null;
      var tk = null;
      var fk = 0;
      var Gj = Infinity;
      var uk = null;
      var Oi = false;
      var Pi = null;
      var Ri = null;
      var vk = false;
      var wk = null;
      var xk = 0;
      var yk = 0;
      var zk = null;
      var Ak = -1;
      var Bk = 0;
      function R() {
        return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
      }
      function yi(a) {
        if (0 === (a.mode & 1)) return 1;
        if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
        if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
        a = C;
        if (0 !== a) return a;
        a = window.event;
        a = void 0 === a ? 16 : jd(a.type);
        return a;
      }
      function gi(a, b, c, d) {
        if (50 < yk) throw yk = 0, zk = null, Error(p(185));
        Ac(a, c, d);
        if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
      }
      function Dk(a, b) {
        var c = a.callbackNode;
        wc(a, b);
        var d = uc(a, a === Q ? Z : 0);
        if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
        else if (b = d & -d, a.callbackPriority !== b) {
          null != c && bc(c);
          if (1 === b) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
            0 === (K & 6) && jg();
          }), c = null;
          else {
            switch (Dc(d)) {
              case 1:
                c = fc;
                break;
              case 4:
                c = gc;
                break;
              case 16:
                c = hc;
                break;
              case 536870912:
                c = jc;
                break;
              default:
                c = hc;
            }
            c = Fk(c, Gk.bind(null, a));
          }
          a.callbackPriority = b;
          a.callbackNode = c;
        }
      }
      function Gk(a, b) {
        Ak = -1;
        Bk = 0;
        if (0 !== (K & 6)) throw Error(p(327));
        var c = a.callbackNode;
        if (Hk() && a.callbackNode !== c) return null;
        var d = uc(a, a === Q ? Z : 0);
        if (0 === d) return null;
        if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);
        else {
          b = d;
          var e = K;
          K |= 2;
          var f = Jk();
          if (Q !== a || Z !== b) uk = null, Gj = B() + 500, Kk(a, b);
          do
            try {
              Lk();
              break;
            } catch (h) {
              Mk(a, h);
            }
          while (1);
          $g();
          mk.current = f;
          K = e;
          null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
        }
        if (0 !== b) {
          2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
          if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
          if (6 === b) Ck(a, d);
          else {
            e = a.current.alternate;
            if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f = xc(a), 0 !== f && (d = f, b = Nk(a, f))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
            a.finishedWork = e;
            a.finishedLanes = d;
            switch (b) {
              case 0:
              case 1:
                throw Error(p(345));
              case 2:
                Pk(a, tk, uk);
                break;
              case 3:
                Ck(a, d);
                if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
                  if (0 !== uc(a, 0)) break;
                  e = a.suspendedLanes;
                  if ((e & d) !== d) {
                    R();
                    a.pingedLanes |= a.suspendedLanes & e;
                    break;
                  }
                  a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
                  break;
                }
                Pk(a, tk, uk);
                break;
              case 4:
                Ck(a, d);
                if ((d & 4194240) === d) break;
                b = a.eventTimes;
                for (e = -1; 0 < d; ) {
                  var g = 31 - oc(d);
                  f = 1 << g;
                  g = b[g];
                  g > e && (e = g);
                  d &= ~f;
                }
                d = e;
                d = B() - d;
                d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
                if (10 < d) {
                  a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
                  break;
                }
                Pk(a, tk, uk);
                break;
              case 5:
                Pk(a, tk, uk);
                break;
              default:
                throw Error(p(329));
            }
          }
        }
        Dk(a, B());
        return a.callbackNode === c ? Gk.bind(null, a) : null;
      }
      function Nk(a, b) {
        var c = sk;
        a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
        a = Ik(a, b);
        2 !== a && (b = tk, tk = c, null !== b && Fj(b));
        return a;
      }
      function Fj(a) {
        null === tk ? tk = a : tk.push.apply(tk, a);
      }
      function Ok(a) {
        for (var b = a; ; ) {
          if (b.flags & 16384) {
            var c = b.updateQueue;
            if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
              var e = c[d], f = e.getSnapshot;
              e = e.value;
              try {
                if (!He(f(), e)) return false;
              } catch (g) {
                return false;
              }
            }
          }
          c = b.child;
          if (b.subtreeFlags & 16384 && null !== c) c.return = b, b = c;
          else {
            if (b === a) break;
            for (; null === b.sibling; ) {
              if (null === b.return || b.return === a) return true;
              b = b.return;
            }
            b.sibling.return = b.return;
            b = b.sibling;
          }
        }
        return true;
      }
      function Ck(a, b) {
        b &= ~rk;
        b &= ~qk;
        a.suspendedLanes |= b;
        a.pingedLanes &= ~b;
        for (a = a.expirationTimes; 0 < b; ) {
          var c = 31 - oc(b), d = 1 << c;
          a[c] = -1;
          b &= ~d;
        }
      }
      function Ek(a) {
        if (0 !== (K & 6)) throw Error(p(327));
        Hk();
        var b = uc(a, 0);
        if (0 === (b & 1)) return Dk(a, B()), null;
        var c = Ik(a, b);
        if (0 !== a.tag && 2 === c) {
          var d = xc(a);
          0 !== d && (b = d, c = Nk(a, d));
        }
        if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
        if (6 === c) throw Error(p(345));
        a.finishedWork = a.current.alternate;
        a.finishedLanes = b;
        Pk(a, tk, uk);
        Dk(a, B());
        return null;
      }
      function Qk(a, b) {
        var c = K;
        K |= 1;
        try {
          return a(b);
        } finally {
          K = c, 0 === K && (Gj = B() + 500, fg && jg());
        }
      }
      function Rk(a) {
        null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
        var b = K;
        K |= 1;
        var c = ok.transition, d = C;
        try {
          if (ok.transition = null, C = 1, a) return a();
        } finally {
          C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
        }
      }
      function Hj() {
        fj = ej.current;
        E(ej);
      }
      function Kk(a, b) {
        a.finishedWork = null;
        a.finishedLanes = 0;
        var c = a.timeoutHandle;
        -1 !== c && (a.timeoutHandle = -1, Gf(c));
        if (null !== Y) for (c = Y.return; null !== c; ) {
          var d = c;
          wg(d);
          switch (d.tag) {
            case 1:
              d = d.type.childContextTypes;
              null !== d && void 0 !== d && $f();
              break;
            case 3:
              zh();
              E(Wf);
              E(H);
              Eh();
              break;
            case 5:
              Bh(d);
              break;
            case 4:
              zh();
              break;
            case 13:
              E(L);
              break;
            case 19:
              E(L);
              break;
            case 10:
              ah(d.type._context);
              break;
            case 22:
            case 23:
              Hj();
          }
          c = c.return;
        }
        Q = a;
        Y = a = Pg(a.current, null);
        Z = fj = b;
        T = 0;
        pk = null;
        rk = qk = rh = 0;
        tk = sk = null;
        if (null !== fh) {
          for (b = 0; b < fh.length; b++) if (c = fh[b], d = c.interleaved, null !== d) {
            c.interleaved = null;
            var e = d.next, f = c.pending;
            if (null !== f) {
              var g = f.next;
              f.next = e;
              d.next = g;
            }
            c.pending = d;
          }
          fh = null;
        }
        return a;
      }
      function Mk(a, b) {
        do {
          var c = Y;
          try {
            $g();
            Fh.current = Rh;
            if (Ih) {
              for (var d = M.memoizedState; null !== d; ) {
                var e = d.queue;
                null !== e && (e.pending = null);
                d = d.next;
              }
              Ih = false;
            }
            Hh = 0;
            O = N = M = null;
            Jh = false;
            Kh = 0;
            nk.current = null;
            if (null === c || null === c.return) {
              T = 1;
              pk = b;
              Y = null;
              break;
            }
            a: {
              var f = a, g = c.return, h = c, k = b;
              b = Z;
              h.flags |= 32768;
              if (null !== k && "object" === typeof k && "function" === typeof k.then) {
                var l = k, m = h, q = m.tag;
                if (0 === (m.mode & 1) && (0 === q || 11 === q || 15 === q)) {
                  var r = m.alternate;
                  r ? (m.updateQueue = r.updateQueue, m.memoizedState = r.memoizedState, m.lanes = r.lanes) : (m.updateQueue = null, m.memoizedState = null);
                }
                var y = Ui(g);
                if (null !== y) {
                  y.flags &= -257;
                  Vi(y, g, h, f, b);
                  y.mode & 1 && Si(f, l, b);
                  b = y;
                  k = l;
                  var n = b.updateQueue;
                  if (null === n) {
                    var t = /* @__PURE__ */ new Set();
                    t.add(k);
                    b.updateQueue = t;
                  } else n.add(k);
                  break a;
                } else {
                  if (0 === (b & 1)) {
                    Si(f, l, b);
                    tj();
                    break a;
                  }
                  k = Error(p(426));
                }
              } else if (I && h.mode & 1) {
                var J = Ui(g);
                if (null !== J) {
                  0 === (J.flags & 65536) && (J.flags |= 256);
                  Vi(J, g, h, f, b);
                  Jg(Ji(k, h));
                  break a;
                }
              }
              f = k = Ji(k, h);
              4 !== T && (T = 2);
              null === sk ? sk = [f] : sk.push(f);
              f = g;
              do {
                switch (f.tag) {
                  case 3:
                    f.flags |= 65536;
                    b &= -b;
                    f.lanes |= b;
                    var x = Ni(f, k, b);
                    ph(f, x);
                    break a;
                  case 1:
                    h = k;
                    var w = f.type, u = f.stateNode;
                    if (0 === (f.flags & 128) && ("function" === typeof w.getDerivedStateFromError || null !== u && "function" === typeof u.componentDidCatch && (null === Ri || !Ri.has(u)))) {
                      f.flags |= 65536;
                      b &= -b;
                      f.lanes |= b;
                      var F = Qi(f, h, b);
                      ph(f, F);
                      break a;
                    }
                }
                f = f.return;
              } while (null !== f);
            }
            Sk(c);
          } catch (na) {
            b = na;
            Y === c && null !== c && (Y = c = c.return);
            continue;
          }
          break;
        } while (1);
      }
      function Jk() {
        var a = mk.current;
        mk.current = Rh;
        return null === a ? Rh : a;
      }
      function tj() {
        if (0 === T || 3 === T || 2 === T) T = 4;
        null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
      }
      function Ik(a, b) {
        var c = K;
        K |= 2;
        var d = Jk();
        if (Q !== a || Z !== b) uk = null, Kk(a, b);
        do
          try {
            Tk();
            break;
          } catch (e) {
            Mk(a, e);
          }
        while (1);
        $g();
        K = c;
        mk.current = d;
        if (null !== Y) throw Error(p(261));
        Q = null;
        Z = 0;
        return T;
      }
      function Tk() {
        for (; null !== Y; ) Uk(Y);
      }
      function Lk() {
        for (; null !== Y && !cc(); ) Uk(Y);
      }
      function Uk(a) {
        var b = Vk(a.alternate, a, fj);
        a.memoizedProps = a.pendingProps;
        null === b ? Sk(a) : Y = b;
        nk.current = null;
      }
      function Sk(a) {
        var b = a;
        do {
          var c = b.alternate;
          a = b.return;
          if (0 === (b.flags & 32768)) {
            if (c = Ej(c, b, fj), null !== c) {
              Y = c;
              return;
            }
          } else {
            c = Ij(c, b);
            if (null !== c) {
              c.flags &= 32767;
              Y = c;
              return;
            }
            if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
            else {
              T = 6;
              Y = null;
              return;
            }
          }
          b = b.sibling;
          if (null !== b) {
            Y = b;
            return;
          }
          Y = b = a;
        } while (null !== b);
        0 === T && (T = 5);
      }
      function Pk(a, b, c) {
        var d = C, e = ok.transition;
        try {
          ok.transition = null, C = 1, Wk(a, b, c, d);
        } finally {
          ok.transition = e, C = d;
        }
        return null;
      }
      function Wk(a, b, c, d) {
        do
          Hk();
        while (null !== wk);
        if (0 !== (K & 6)) throw Error(p(327));
        c = a.finishedWork;
        var e = a.finishedLanes;
        if (null === c) return null;
        a.finishedWork = null;
        a.finishedLanes = 0;
        if (c === a.current) throw Error(p(177));
        a.callbackNode = null;
        a.callbackPriority = 0;
        var f = c.lanes | c.childLanes;
        Bc(a, f);
        a === Q && (Y = Q = null, Z = 0);
        0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
          Hk();
          return null;
        }));
        f = 0 !== (c.flags & 15990);
        if (0 !== (c.subtreeFlags & 15990) || f) {
          f = ok.transition;
          ok.transition = null;
          var g = C;
          C = 1;
          var h = K;
          K |= 4;
          nk.current = null;
          Oj(a, c);
          dk(c, a);
          Oe(Df);
          dd = !!Cf;
          Df = Cf = null;
          a.current = c;
          hk(c, a, e);
          dc();
          K = h;
          C = g;
          ok.transition = f;
        } else a.current = c;
        vk && (vk = false, wk = a, xk = e);
        f = a.pendingLanes;
        0 === f && (Ri = null);
        mc(c.stateNode, d);
        Dk(a, B());
        if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
        if (Oi) throw Oi = false, a = Pi, Pi = null, a;
        0 !== (xk & 1) && 0 !== a.tag && Hk();
        f = a.pendingLanes;
        0 !== (f & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
        jg();
        return null;
      }
      function Hk() {
        if (null !== wk) {
          var a = Dc(xk), b = ok.transition, c = C;
          try {
            ok.transition = null;
            C = 16 > a ? 16 : a;
            if (null === wk) var d = false;
            else {
              a = wk;
              wk = null;
              xk = 0;
              if (0 !== (K & 6)) throw Error(p(331));
              var e = K;
              K |= 4;
              for (V = a.current; null !== V; ) {
                var f = V, g = f.child;
                if (0 !== (V.flags & 16)) {
                  var h = f.deletions;
                  if (null !== h) {
                    for (var k = 0; k < h.length; k++) {
                      var l = h[k];
                      for (V = l; null !== V; ) {
                        var m = V;
                        switch (m.tag) {
                          case 0:
                          case 11:
                          case 15:
                            Pj(8, m, f);
                        }
                        var q = m.child;
                        if (null !== q) q.return = m, V = q;
                        else for (; null !== V; ) {
                          m = V;
                          var r = m.sibling, y = m.return;
                          Sj(m);
                          if (m === l) {
                            V = null;
                            break;
                          }
                          if (null !== r) {
                            r.return = y;
                            V = r;
                            break;
                          }
                          V = y;
                        }
                      }
                    }
                    var n = f.alternate;
                    if (null !== n) {
                      var t = n.child;
                      if (null !== t) {
                        n.child = null;
                        do {
                          var J = t.sibling;
                          t.sibling = null;
                          t = J;
                        } while (null !== t);
                      }
                    }
                    V = f;
                  }
                }
                if (0 !== (f.subtreeFlags & 2064) && null !== g) g.return = f, V = g;
                else b: for (; null !== V; ) {
                  f = V;
                  if (0 !== (f.flags & 2048)) switch (f.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(9, f, f.return);
                  }
                  var x = f.sibling;
                  if (null !== x) {
                    x.return = f.return;
                    V = x;
                    break b;
                  }
                  V = f.return;
                }
              }
              var w = a.current;
              for (V = w; null !== V; ) {
                g = V;
                var u = g.child;
                if (0 !== (g.subtreeFlags & 2064) && null !== u) u.return = g, V = u;
                else b: for (g = w; null !== V; ) {
                  h = V;
                  if (0 !== (h.flags & 2048)) try {
                    switch (h.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Qj(9, h);
                    }
                  } catch (na) {
                    W(h, h.return, na);
                  }
                  if (h === g) {
                    V = null;
                    break b;
                  }
                  var F = h.sibling;
                  if (null !== F) {
                    F.return = h.return;
                    V = F;
                    break b;
                  }
                  V = h.return;
                }
              }
              K = e;
              jg();
              if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
                lc.onPostCommitFiberRoot(kc, a);
              } catch (na) {
              }
              d = true;
            }
            return d;
          } finally {
            C = c, ok.transition = b;
          }
        }
        return false;
      }
      function Xk(a, b, c) {
        b = Ji(c, b);
        b = Ni(a, b, 1);
        a = nh(a, b, 1);
        b = R();
        null !== a && (Ac(a, 1, b), Dk(a, b));
      }
      function W(a, b, c) {
        if (3 === a.tag) Xk(a, a, c);
        else for (; null !== b; ) {
          if (3 === b.tag) {
            Xk(b, a, c);
            break;
          } else if (1 === b.tag) {
            var d = b.stateNode;
            if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
              a = Ji(c, a);
              a = Qi(b, a, 1);
              b = nh(b, a, 1);
              a = R();
              null !== b && (Ac(b, 1, a), Dk(b, a));
              break;
            }
          }
          b = b.return;
        }
      }
      function Ti(a, b, c) {
        var d = a.pingCache;
        null !== d && d.delete(b);
        b = R();
        a.pingedLanes |= a.suspendedLanes & c;
        Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
        Dk(a, b);
      }
      function Yk(a, b) {
        0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
        var c = R();
        a = ih(a, b);
        null !== a && (Ac(a, b, c), Dk(a, c));
      }
      function uj(a) {
        var b = a.memoizedState, c = 0;
        null !== b && (c = b.retryLane);
        Yk(a, c);
      }
      function bk(a, b) {
        var c = 0;
        switch (a.tag) {
          case 13:
            var d = a.stateNode;
            var e = a.memoizedState;
            null !== e && (c = e.retryLane);
            break;
          case 19:
            d = a.stateNode;
            break;
          default:
            throw Error(p(314));
        }
        null !== d && d.delete(b);
        Yk(a, c);
      }
      var Vk;
      Vk = function(a, b, c) {
        if (null !== a) if (a.memoizedProps !== b.pendingProps || Wf.current) dh = true;
        else {
          if (0 === (a.lanes & c) && 0 === (b.flags & 128)) return dh = false, yj(a, b, c);
          dh = 0 !== (a.flags & 131072) ? true : false;
        }
        else dh = false, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
        b.lanes = 0;
        switch (b.tag) {
          case 2:
            var d = b.type;
            ij(a, b);
            a = b.pendingProps;
            var e = Yf(b, H.current);
            ch(b, c);
            e = Nh(null, b, d, a, e, c);
            var f = Sh();
            b.flags |= 1;
            "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f = true, cg(b)) : f = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f, c)) : (b.tag = 0, I && f && vg(b), Xi(null, b, e, c), b = b.child);
            return b;
          case 16:
            d = b.elementType;
            a: {
              ij(a, b);
              a = b.pendingProps;
              e = d._init;
              d = e(d._payload);
              b.type = d;
              e = b.tag = Zk(d);
              a = Ci(d, a);
              switch (e) {
                case 0:
                  b = cj(null, b, d, a, c);
                  break a;
                case 1:
                  b = hj(null, b, d, a, c);
                  break a;
                case 11:
                  b = Yi(null, b, d, a, c);
                  break a;
                case 14:
                  b = $i(null, b, d, Ci(d.type, a), c);
                  break a;
              }
              throw Error(p(
                306,
                d,
                ""
              ));
            }
            return b;
          case 0:
            return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
          case 1:
            return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
          case 3:
            a: {
              kj(b);
              if (null === a) throw Error(p(387));
              d = b.pendingProps;
              f = b.memoizedState;
              e = f.element;
              lh(a, b);
              qh(b, d, null, c);
              var g = b.memoizedState;
              d = g.element;
              if (f.isDehydrated) if (f = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f, b.memoizedState = f, b.flags & 256) {
                e = Ji(Error(p(423)), b);
                b = lj(a, b, d, c, e);
                break a;
              } else if (d !== e) {
                e = Ji(Error(p(424)), b);
                b = lj(a, b, d, c, e);
                break a;
              } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = true, zg = null, c = Vg(b, null, d, c), b.child = c; c; ) c.flags = c.flags & -3 | 4096, c = c.sibling;
              else {
                Ig();
                if (d === e) {
                  b = Zi(a, b, c);
                  break a;
                }
                Xi(a, b, d, c);
              }
              b = b.child;
            }
            return b;
          case 5:
            return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f && Ef(d, f) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
          case 6:
            return null === a && Eg(b), null;
          case 13:
            return oj(a, b, c);
          case 4:
            return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
          case 11:
            return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
          case 7:
            return Xi(a, b, b.pendingProps, c), b.child;
          case 8:
            return Xi(a, b, b.pendingProps.children, c), b.child;
          case 12:
            return Xi(a, b, b.pendingProps.children, c), b.child;
          case 10:
            a: {
              d = b.type._context;
              e = b.pendingProps;
              f = b.memoizedProps;
              g = e.value;
              G(Wg, d._currentValue);
              d._currentValue = g;
              if (null !== f) if (He(f.value, g)) {
                if (f.children === e.children && !Wf.current) {
                  b = Zi(a, b, c);
                  break a;
                }
              } else for (f = b.child, null !== f && (f.return = b); null !== f; ) {
                var h = f.dependencies;
                if (null !== h) {
                  g = f.child;
                  for (var k = h.firstContext; null !== k; ) {
                    if (k.context === d) {
                      if (1 === f.tag) {
                        k = mh(-1, c & -c);
                        k.tag = 2;
                        var l = f.updateQueue;
                        if (null !== l) {
                          l = l.shared;
                          var m = l.pending;
                          null === m ? k.next = k : (k.next = m.next, m.next = k);
                          l.pending = k;
                        }
                      }
                      f.lanes |= c;
                      k = f.alternate;
                      null !== k && (k.lanes |= c);
                      bh(
                        f.return,
                        c,
                        b
                      );
                      h.lanes |= c;
                      break;
                    }
                    k = k.next;
                  }
                } else if (10 === f.tag) g = f.type === b.type ? null : f.child;
                else if (18 === f.tag) {
                  g = f.return;
                  if (null === g) throw Error(p(341));
                  g.lanes |= c;
                  h = g.alternate;
                  null !== h && (h.lanes |= c);
                  bh(g, c, b);
                  g = f.sibling;
                } else g = f.child;
                if (null !== g) g.return = f;
                else for (g = f; null !== g; ) {
                  if (g === b) {
                    g = null;
                    break;
                  }
                  f = g.sibling;
                  if (null !== f) {
                    f.return = g.return;
                    g = f;
                    break;
                  }
                  g = g.return;
                }
                f = g;
              }
              Xi(a, b, e.children, c);
              b = b.child;
            }
            return b;
          case 9:
            return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
          case 14:
            return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
          case 15:
            return bj(a, b, b.type, b.pendingProps, c);
          case 17:
            return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = true, cg(b)) : a = false, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, true, a, c);
          case 19:
            return xj(a, b, c);
          case 22:
            return dj(a, b, c);
        }
        throw Error(p(156, b.tag));
      };
      function Fk(a, b) {
        return ac(a, b);
      }
      function $k(a, b, c, d) {
        this.tag = a;
        this.key = c;
        this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
        this.index = 0;
        this.ref = null;
        this.pendingProps = b;
        this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
        this.mode = d;
        this.subtreeFlags = this.flags = 0;
        this.deletions = null;
        this.childLanes = this.lanes = 0;
        this.alternate = null;
      }
      function Bg(a, b, c, d) {
        return new $k(a, b, c, d);
      }
      function aj(a) {
        a = a.prototype;
        return !(!a || !a.isReactComponent);
      }
      function Zk(a) {
        if ("function" === typeof a) return aj(a) ? 1 : 0;
        if (void 0 !== a && null !== a) {
          a = a.$$typeof;
          if (a === Da) return 11;
          if (a === Ga) return 14;
        }
        return 2;
      }
      function Pg(a, b) {
        var c = a.alternate;
        null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
        c.flags = a.flags & 14680064;
        c.childLanes = a.childLanes;
        c.lanes = a.lanes;
        c.child = a.child;
        c.memoizedProps = a.memoizedProps;
        c.memoizedState = a.memoizedState;
        c.updateQueue = a.updateQueue;
        b = a.dependencies;
        c.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
        c.sibling = a.sibling;
        c.index = a.index;
        c.ref = a.ref;
        return c;
      }
      function Rg(a, b, c, d, e, f) {
        var g = 2;
        d = a;
        if ("function" === typeof a) aj(a) && (g = 1);
        else if ("string" === typeof a) g = 5;
        else a: switch (a) {
          case ya:
            return Tg(c.children, e, f, b);
          case za:
            g = 8;
            e |= 8;
            break;
          case Aa:
            return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f, a;
          case Ea:
            return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f, a;
          case Fa:
            return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f, a;
          case Ia:
            return pj(c, e, f, b);
          default:
            if ("object" === typeof a && null !== a) switch (a.$$typeof) {
              case Ba:
                g = 10;
                break a;
              case Ca:
                g = 9;
                break a;
              case Da:
                g = 11;
                break a;
              case Ga:
                g = 14;
                break a;
              case Ha:
                g = 16;
                d = null;
                break a;
            }
            throw Error(p(130, null == a ? a : typeof a, ""));
        }
        b = Bg(g, c, b, e);
        b.elementType = a;
        b.type = d;
        b.lanes = f;
        return b;
      }
      function Tg(a, b, c, d) {
        a = Bg(7, a, d, b);
        a.lanes = c;
        return a;
      }
      function pj(a, b, c, d) {
        a = Bg(22, a, d, b);
        a.elementType = Ia;
        a.lanes = c;
        a.stateNode = { isHidden: false };
        return a;
      }
      function Qg(a, b, c) {
        a = Bg(6, a, null, b);
        a.lanes = c;
        return a;
      }
      function Sg(a, b, c) {
        b = Bg(4, null !== a.children ? a.children : [], a.key, b);
        b.lanes = c;
        b.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
        return b;
      }
      function al(a, b, c, d, e) {
        this.tag = b;
        this.containerInfo = a;
        this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
        this.timeoutHandle = -1;
        this.callbackNode = this.pendingContext = this.context = null;
        this.callbackPriority = 0;
        this.eventTimes = zc(0);
        this.expirationTimes = zc(-1);
        this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
        this.entanglements = zc(0);
        this.identifierPrefix = d;
        this.onRecoverableError = e;
        this.mutableSourceEagerHydrationData = null;
      }
      function bl(a, b, c, d, e, f, g, h, k) {
        a = new al(a, b, c, h, k);
        1 === b ? (b = 1, true === f && (b |= 8)) : b = 0;
        f = Bg(3, null, null, b);
        a.current = f;
        f.stateNode = a;
        f.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
        kh(f);
        return a;
      }
      function cl(a, b, c) {
        var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
        return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b, implementation: c };
      }
      function dl(a) {
        if (!a) return Vf;
        a = a._reactInternals;
        a: {
          if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
          var b = a;
          do {
            switch (b.tag) {
              case 3:
                b = b.stateNode.context;
                break a;
              case 1:
                if (Zf(b.type)) {
                  b = b.stateNode.__reactInternalMemoizedMergedChildContext;
                  break a;
                }
            }
            b = b.return;
          } while (null !== b);
          throw Error(p(171));
        }
        if (1 === a.tag) {
          var c = a.type;
          if (Zf(c)) return bg(a, c, b);
        }
        return b;
      }
      function el(a, b, c, d, e, f, g, h, k) {
        a = bl(c, d, true, a, e, f, g, h, k);
        a.context = dl(null);
        c = a.current;
        d = R();
        e = yi(c);
        f = mh(d, e);
        f.callback = void 0 !== b && null !== b ? b : null;
        nh(c, f, e);
        a.current.lanes = e;
        Ac(a, e, d);
        Dk(a, d);
        return a;
      }
      function fl(a, b, c, d) {
        var e = b.current, f = R(), g = yi(e);
        c = dl(c);
        null === b.context ? b.context = c : b.pendingContext = c;
        b = mh(f, g);
        b.payload = { element: a };
        d = void 0 === d ? null : d;
        null !== d && (b.callback = d);
        a = nh(e, b, g);
        null !== a && (gi(a, e, g, f), oh(a, e, g));
        return g;
      }
      function gl(a) {
        a = a.current;
        if (!a.child) return null;
        switch (a.child.tag) {
          case 5:
            return a.child.stateNode;
          default:
            return a.child.stateNode;
        }
      }
      function hl(a, b) {
        a = a.memoizedState;
        if (null !== a && null !== a.dehydrated) {
          var c = a.retryLane;
          a.retryLane = 0 !== c && c < b ? c : b;
        }
      }
      function il(a, b) {
        hl(a, b);
        (a = a.alternate) && hl(a, b);
      }
      function jl() {
        return null;
      }
      var kl = "function" === typeof reportError ? reportError : function(a) {
        console.error(a);
      };
      function ll(a) {
        this._internalRoot = a;
      }
      ml.prototype.render = ll.prototype.render = function(a) {
        var b = this._internalRoot;
        if (null === b) throw Error(p(409));
        fl(a, b, null, null);
      };
      ml.prototype.unmount = ll.prototype.unmount = function() {
        var a = this._internalRoot;
        if (null !== a) {
          this._internalRoot = null;
          var b = a.containerInfo;
          Rk(function() {
            fl(null, a, null, null);
          });
          b[uf] = null;
        }
      };
      function ml(a) {
        this._internalRoot = a;
      }
      ml.prototype.unstable_scheduleHydration = function(a) {
        if (a) {
          var b = Hc();
          a = { blockedOn: null, target: a, priority: b };
          for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++) ;
          Qc.splice(c, 0, a);
          0 === c && Vc(a);
        }
      };
      function nl(a) {
        return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
      }
      function ol(a) {
        return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
      }
      function pl() {
      }
      function ql(a, b, c, d, e) {
        if (e) {
          if ("function" === typeof d) {
            var f = d;
            d = function() {
              var a2 = gl(g);
              f.call(a2);
            };
          }
          var g = el(b, d, a, 0, null, false, false, "", pl);
          a._reactRootContainer = g;
          a[uf] = g.current;
          sf(8 === a.nodeType ? a.parentNode : a);
          Rk();
          return g;
        }
        for (; e = a.lastChild; ) a.removeChild(e);
        if ("function" === typeof d) {
          var h = d;
          d = function() {
            var a2 = gl(k);
            h.call(a2);
          };
        }
        var k = bl(a, 0, false, null, null, false, false, "", pl);
        a._reactRootContainer = k;
        a[uf] = k.current;
        sf(8 === a.nodeType ? a.parentNode : a);
        Rk(function() {
          fl(b, k, c, d);
        });
        return k;
      }
      function rl(a, b, c, d, e) {
        var f = c._reactRootContainer;
        if (f) {
          var g = f;
          if ("function" === typeof e) {
            var h = e;
            e = function() {
              var a2 = gl(g);
              h.call(a2);
            };
          }
          fl(b, g, a, e);
        } else g = ql(c, b, a, e, d);
        return gl(g);
      }
      Ec = function(a) {
        switch (a.tag) {
          case 3:
            var b = a.stateNode;
            if (b.current.memoizedState.isDehydrated) {
              var c = tc(b.pendingLanes);
              0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
            }
            break;
          case 13:
            Rk(function() {
              var b2 = ih(a, 1);
              if (null !== b2) {
                var c2 = R();
                gi(b2, a, 1, c2);
              }
            }), il(a, 1);
        }
      };
      Fc = function(a) {
        if (13 === a.tag) {
          var b = ih(a, 134217728);
          if (null !== b) {
            var c = R();
            gi(b, a, 134217728, c);
          }
          il(a, 134217728);
        }
      };
      Gc = function(a) {
        if (13 === a.tag) {
          var b = yi(a), c = ih(a, b);
          if (null !== c) {
            var d = R();
            gi(c, a, b, d);
          }
          il(a, b);
        }
      };
      Hc = function() {
        return C;
      };
      Ic = function(a, b) {
        var c = C;
        try {
          return C = a, b();
        } finally {
          C = c;
        }
      };
      yb = function(a, b, c) {
        switch (b) {
          case "input":
            bb(a, c);
            b = c.name;
            if ("radio" === c.type && null != b) {
              for (c = a; c.parentNode; ) c = c.parentNode;
              c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
              for (b = 0; b < c.length; b++) {
                var d = c[b];
                if (d !== a && d.form === a.form) {
                  var e = Db(d);
                  if (!e) throw Error(p(90));
                  Wa(d);
                  bb(d, e);
                }
              }
            }
            break;
          case "textarea":
            ib(a, c);
            break;
          case "select":
            b = c.value, null != b && fb(a, !!c.multiple, b, false);
        }
      };
      Gb = Qk;
      Hb = Rk;
      var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] };
      var tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
      var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
        a = Zb(a);
        return null === a ? null : a.stateNode;
      }, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
      if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
        vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!vl.isDisabled && vl.supportsFiber) try {
          kc = vl.inject(ul), lc = vl;
        } catch (a) {
        }
      }
      var vl;
      exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
      exports.createPortal = function(a, b) {
        var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
        if (!nl(b)) throw Error(p(200));
        return cl(a, b, null, c);
      };
      exports.createRoot = function(a, b) {
        if (!nl(a)) throw Error(p(299));
        var c = false, d = "", e = kl;
        null !== b && void 0 !== b && (true === b.unstable_strictMode && (c = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
        b = bl(a, 1, false, null, null, c, false, d, e);
        a[uf] = b.current;
        sf(8 === a.nodeType ? a.parentNode : a);
        return new ll(b);
      };
      exports.findDOMNode = function(a) {
        if (null == a) return null;
        if (1 === a.nodeType) return a;
        var b = a._reactInternals;
        if (void 0 === b) {
          if ("function" === typeof a.render) throw Error(p(188));
          a = Object.keys(a).join(",");
          throw Error(p(268, a));
        }
        a = Zb(b);
        a = null === a ? null : a.stateNode;
        return a;
      };
      exports.flushSync = function(a) {
        return Rk(a);
      };
      exports.hydrate = function(a, b, c) {
        if (!ol(b)) throw Error(p(200));
        return rl(null, a, b, true, c);
      };
      exports.hydrateRoot = function(a, b, c) {
        if (!nl(a)) throw Error(p(405));
        var d = null != c && c.hydratedSources || null, e = false, f = "", g = kl;
        null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
        b = el(b, null, a, 1, null != c ? c : null, e, false, f, g);
        a[uf] = b.current;
        sf(a);
        if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
          c,
          e
        );
        return new ml(b);
      };
      exports.render = function(a, b, c) {
        if (!ol(b)) throw Error(p(200));
        return rl(null, a, b, false, c);
      };
      exports.unmountComponentAtNode = function(a) {
        if (!ol(a)) throw Error(p(40));
        return a._reactRootContainer ? (Rk(function() {
          rl(null, null, a, false, function() {
            a._reactRootContainer = null;
            a[uf] = null;
          });
        }), true) : false;
      };
      exports.unstable_batchedUpdates = Qk;
      exports.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
        if (!ol(c)) throw Error(p(200));
        if (null == a || void 0 === a._reactInternals) throw Error(p(38));
        return rl(a, b, c, false, d);
      };
      exports.version = "18.3.1-next-f1338f8080-20240426";
    }
  });

  // desktop/web-app/node_modules/react-dom/index.js
  var require_react_dom = __commonJS({
    "desktop/web-app/node_modules/react-dom/index.js"(exports, module) {
      "use strict";
      function checkDCE() {
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
          return;
        }
        if (false) {
          throw new Error("^_^");
        }
        try {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
        } catch (err) {
          console.error(err);
        }
      }
      if (true) {
        checkDCE();
        module.exports = require_react_dom_production_min();
      } else {
        module.exports = null;
      }
    }
  });

  // desktop/web-app/node_modules/react-dom/client.js
  var require_client = __commonJS({
    "desktop/web-app/node_modules/react-dom/client.js"(exports) {
      "use strict";
      var m = require_react_dom();
      if (true) {
        exports.createRoot = m.createRoot;
        exports.hydrateRoot = m.hydrateRoot;
      } else {
        i = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        exports.createRoot = function(c, o) {
          i.usingClientEntryPoint = true;
          try {
            return m.createRoot(c, o);
          } finally {
            i.usingClientEntryPoint = false;
          }
        };
        exports.hydrateRoot = function(c, h, o) {
          i.usingClientEntryPoint = true;
          try {
            return m.hydrateRoot(c, h, o);
          } finally {
            i.usingClientEntryPoint = false;
          }
        };
      }
      var i;
    }
  });

  // instructional_context_module.js
  var require_instructional_context_module = __commonJS({
    "instructional_context_module.js"(exports, module) {
      (function() {
        "use strict";
        var VERSION = "instructional-context/v1";
        var TEXT_SCHEMA_VERSION = 1;
        var CONTEXT_SCHEMA_VERSION = 1;
        var SOURCE_BODY_EXTRACTION_VERSION = "measurable-source-body/v1";
        var SOURCE_COMPLEXITY_MEASUREMENT_VERSION = "source-body-fk/v1";
        var ROLES = ["primary", "supplemental", "unspecified"];
        var FORMS = ["original", "same-text-supported", "adapted"];
        var DESIGNATION_SOURCES = ["educator", "workflow-default", "legacy-inferred"];
        var PRIMARY_POLICIES = ["preserve-primary", "educator-directed"];
        var ADAPTED_TEXT_POLICIES = ["include", "omit", "prohibited"];
        var PRIMARY_TEXT_ACCESS = ["required", "available"];
        var TEXT_ACCESS_DECISION_SOURCES = ["educator", "standard", "workflow-default"];
        var GRADE_CALIBRATION = {
          "Kindergarten": { asl: 6, asw: 1.15, min: 0, max: 1 },
          "1st Grade": { asl: 8, asw: 1.2, min: 1, max: 2 },
          "2nd Grade": { asl: 10, asw: 1.25, min: 2, max: 3 },
          "3rd Grade": { asl: 12, asw: 1.3, min: 3, max: 4 },
          "4th Grade": { asl: 14, asw: 1.35, min: 4, max: 5 },
          "5th Grade": { asl: 15, asw: 1.4, min: 5, max: 6 },
          "6th Grade": { asl: 16, asw: 1.45, min: 6, max: 7 },
          "7th Grade": { asl: 17, asw: 1.5, min: 7, max: 8 },
          "8th Grade": { asl: 18, asw: 1.55, min: 8, max: 9 },
          "9th Grade": { asl: 19, asw: 1.6, min: 9, max: 10 },
          "10th Grade": { asl: 20, asw: 1.62, min: 10, max: 11 },
          "11th Grade": { asl: 21, asw: 1.65, min: 11, max: 12 },
          "12th Grade": { asl: 22, asw: 1.68, min: 11, max: 13 }
        };
        function isObject(value) {
          return !!value && typeof value === "object" && !Array.isArray(value);
        }
        function cleanText(value, limit) {
          if (value === void 0 || value === null) return "";
          return String(value).replace(/\s+/g, " ").trim().slice(0, limit || 2400);
        }
        function clonePlain(value) {
          if (!isObject(value) && !Array.isArray(value)) return value;
          try {
            return JSON.parse(JSON.stringify(value));
          } catch (_) {
            return isObject(value) ? {} : [];
          }
        }
        function ordinal(number) {
          var n = Number(number);
          var mod100 = n % 100;
          if (mod100 >= 11 && mod100 <= 13) return n + "th";
          if (n % 10 === 1) return n + "st";
          if (n % 10 === 2) return n + "nd";
          if (n % 10 === 3) return n + "rd";
          return n + "th";
        }
        function _normalizeGrade(value) {
          var candidate = value;
          if (isObject(candidate)) {
            candidate = candidate.label || candidate.gradeLabel || candidate.gradeLevel || candidate.grade || candidate.id || candidate.numericGrade;
          }
          var raw = cleanText(candidate, 80);
          var lower = raw.toLowerCase().replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
          if (!lower) return null;
          if (/^(pre\s*-?\s*k|prek|pre kindergarten|pre-kindergarten)$/.test(lower)) {
            return { id: "pre-k", label: "Pre-K", numericGrade: -1, recognized: true };
          }
          if (/^(k|kg|grade k|kindergarten)$/.test(lower)) {
            return { id: "k", label: "Kindergarten", numericGrade: 0, recognized: true };
          }
          if (/^(college|undergraduate|college level)$/.test(lower)) {
            return { id: "college", label: "College", numericGrade: 13, recognized: true };
          }
          if (/^(graduate|graduate level|postgraduate)$/.test(lower)) {
            return { id: "graduate", label: "Graduate Level", numericGrade: 14, recognized: true };
          }
          var match = lower.match(/^(?:grade\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?$/);
          if (!match) match = lower.match(/\bgrade\s*(\d{1,2})\b/);
          var numeric = match ? Number(match[1]) : NaN;
          if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 12) {
            return { id: "g" + numeric, label: ordinal(numeric) + " Grade", numericGrade: numeric, recognized: true };
          }
          return { id: "custom", label: raw, numericGrade: null, recognized: false };
        }
        function normalizeGrade(value, fallback) {
          var parsed = _normalizeGrade(value);
          if (parsed && (parsed.recognized || fallback === void 0)) return parsed;
          var fallbackParsed = _normalizeGrade(fallback);
          return fallbackParsed || parsed || { id: "unknown", label: "", numericGrade: null, recognized: false };
        }
        function normalizeGradeLabel(value, fallback) {
          return normalizeGrade(value, fallback).label;
        }
        function getComplexityTarget(value) {
          var grade = normalizeGrade(value);
          var target = GRADE_CALIBRATION[grade.label];
          if (!target) return null;
          return {
            gradeId: grade.id,
            label: grade.label,
            numericGrade: grade.numericGrade,
            averageSentenceLengthMax: target.asl,
            averageSyllablesPerWordMax: target.asw,
            fkRange: { min: target.min, max: target.max },
            fkLabel: target.min + " to " + target.max,
            policyVersion: "complexity-targets/v1"
          };
        }
        function getSourceCalibrationTarget(value) {
          var grade = normalizeGrade(value);
          var n = grade.numericGrade;
          var label = grade.label;
          if (n === -1) label = "Pre-K";
          else if (n === 0 || n === 1) label = "Pre-K";
          else if (n === 2 || n === 3) label = "1st Grade";
          else if (n === 4 || n === 5) label = "3rd Grade";
          else if (n >= 6 && n <= 8) label = "5th Grade";
          else if (n >= 9 && n <= 12) label = "8th Grade";
          else if (n === 13) label = "12th Grade";
          else if (n >= 14) label = "College";
          return {
            requestedGrade: grade.label,
            promptGrade: label,
            policyVersion: "empirical-undershoot/v1",
            rationale: "model-overshoot-compensation"
          };
        }
        function getSourceCalibrationStyle(value) {
          var calibration = isObject(value) && value.promptGrade ? value : getSourceCalibrationTarget(value);
          var promptGrade = normalizeGradeLabel(calibration.promptGrade || calibration.calibrationTarget || "", "");
          if (promptGrade === "Pre-K") return "Use extremely short sentences, generally 3-5 words, and no compound sentences.";
          if (promptGrade === "1st Grade") return "Use short declarative sentences and high-frequency vocabulary.";
          if (promptGrade === "3rd Grade") return "Use mostly simple sentences with only limited compound sentences.";
          if (promptGrade === "5th Grade") return "Use straightforward syntax and avoid dense academic language.";
          if (promptGrade === "8th Grade") return "Use clear standard language without unnecessary jargon or nested clauses.";
          return "Use direct language and sentence structures appropriate to the calibrated target.";
        }
        function buildSourceCalibrationGuidance(value) {
          var calibration = getSourceCalibrationTarget(value);
          return [
            "REQUESTED INSTRUCTIONAL TARGET: " + calibration.requestedGrade,
            "INTERNAL GENERATION CALIBRATION: " + calibration.promptGrade,
            "The internal target compensates for observed model overshoot; it is not the educator-facing grade label.",
            getSourceCalibrationStyle(calibration),
            "If a sentence is borderline, split it and prefer the shorter accurate word."
          ].join("\n");
        }
        function fingerprintText(value) {
          var input = String(value === void 0 || value === null ? "" : value).replace(/\r\n?/g, "\n");
          var hash = 2166136261;
          for (var i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
          }
          return "txt-" + (hash >>> 0).toString(16).padStart(8, "0") + "-" + input.length;
        }
        function fingerprintValue(value) {
          var serialized = "";
          try {
            serialized = JSON.stringify(value === void 0 ? null : value);
          } catch (_) {
            serialized = String(value || "");
          }
          return fingerprintText(serialized);
        }
        function fingerprintSourceText(text) {
          if (typeof text !== "string") return "";
          var hash = 2166136261;
          for (var i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
          }
          return "source-utf16-v1-" + (hash >>> 0).toString(16).padStart(8, "0") + "-" + text.length;
        }
        function createSourceSnapshot(text, options) {
          if (typeof text !== "string") return null;
          var opts = isObject(options) ? options : {};
          var provenance = isObject(opts.provenance) ? opts.provenance : {};
          return {
            schemaVersion: 1,
            text,
            language: cleanText(opts.language, 80) || "English",
            format: cleanText(opts.format, 80) || "plain-text",
            sourceArtifactId: opts.sourceArtifactId == null ? null : cleanText(opts.sourceArtifactId, 160) || null,
            capturedAt: cleanText(opts.capturedAt, 80) || (/* @__PURE__ */ new Date()).toISOString(),
            fingerprint: fingerprintSourceText(text),
            provenance: {
              selection: cleanText(provenance.selection || opts.selection, 100) || "selected-text",
              origin: cleanText(provenance.origin, 100) || "selected-source",
              note: cleanText(provenance.note, 600)
            }
          };
        }
        function getSourceSnapshot(item) {
          if (!isObject(item)) return null;
          var candidate = item.sourceSnapshot || (!item.type && item.schemaVersion === 1 && typeof item.text === "string" ? item : null);
          if (!isObject(candidate) || candidate.schemaVersion !== 1 || typeof candidate.text !== "string" || candidate.fingerprint !== fingerprintSourceText(candidate.text)) return null;
          return createSourceSnapshot(candidate.text, candidate);
        }
        function isSupportedOriginal(item) {
          if (!isObject(item) || item.type !== "simplified" || typeof item.data !== "string") return false;
          var snapshot2 = getSourceSnapshot(item);
          return !!snapshot2 && getInstructionalText(item).form === "same-text-supported" && item.data === snapshot2.text;
        }
        function createSupportedReading(textOrSnapshot, options) {
          var opts = isObject(options) ? options : {};
          var snapshot2 = typeof textOrSnapshot === "string" ? createSourceSnapshot(textOrSnapshot, opts) : getSourceSnapshot(textOrSnapshot);
          if (!snapshot2) return null;
          var profile = normalizeInstructionalText({
            role: "primary",
            form: "same-text-supported",
            sourceArtifactId: snapshot2.sourceArtifactId,
            primaryArtifactId: snapshot2.sourceArtifactId,
            designationSource: opts.designationSource === "educator" ? "educator" : "workflow-default",
            replacementAuthorization: { authorized: false, source: "none" },
            complexity: { language: snapshot2.language }
          });
          var config = isObject(opts.config) ? clonePlain(opts.config) : {};
          config.language = snapshot2.language;
          config.instructionalText = clonePlain(profile);
          delete config.sourceSnapshot;
          delete config.textProfile;
          var reading = {
            id: opts.id == null ? "original-" + snapshot2.fingerprint : String(opts.id),
            type: "simplified",
            title: cleanText(opts.title, 300) || "Original with supports",
            data: snapshot2.text,
            dataEncoding: "text/v1",
            sourceSnapshot: snapshot2,
            instructionalText: profile,
            config
          };
          if (opts.instructionalContext) reading.instructionalContext = clonePlain(opts.instructionalContext);
          if (opts.standardsContext) reading.standardsContext = clonePlain(opts.standardsContext);
          if (opts.readingSupports) reading.readingSupports = validateReadingSupports(snapshot2, opts.readingSupports);
          return reading;
        }
        function getReadingArtifactLabel(item) {
          if (isSupportedOriginal(item)) return "Original with supports";
          if (item && item.readingPreservation && item.readingPreservation.status === "unavailable") return "Original unavailable";
          var profile = getInstructionalText(item);
          if (profile.form === "same-text-supported") return "Reading text (original unavailable)";
          if (profile.form === "adapted") return profile.role === "primary" ? profile.designationSource === "educator" ? "Educator-designated adapted primary" : "Adapted primary reading" : "Adapted companion";
          return item && item.type === "analysis" ? "Source analysis" : "Original text";
        }
        function ensureReadingSourcePairs(items) {
          var source2 = Array.isArray(items) ? items.filter(isObject) : [];
          var originals = source2.filter(isSupportedOriginal);
          var output = [];
          source2.forEach(function(item) {
            var snapshot2 = item.type === "simplified" && getInstructionalText(item).form === "adapted" ? getSourceSnapshot(item) : null;
            if (snapshot2 && !originals.some(function(original2) {
              return original2.sourceSnapshot.fingerprint === snapshot2.fingerprint && original2.data === snapshot2.text;
            })) {
              var reading = createSupportedReading(snapshot2, {
                title: (cleanText(item.title, 260) || "Reading") + " \u2014 original",
                config: { language: snapshot2.language },
                instructionalContext: item.instructionalContext,
                standardsContext: item.standardsContext
              });
              var baseId = reading.id;
              var suffix = 1;
              while (source2.concat(output).some(function(existing) {
                return existing.id === reading.id;
              })) {
                reading.id = baseId + "-" + suffix++;
              }
              originals.push(reading);
              output.push(reading);
            }
            output.push(item);
          });
          return output;
        }
        function isSourceTextBoundary(text, offset) {
          if (offset <= 0 || offset >= text.length) return true;
          var before = text.charCodeAt(offset - 1);
          var after = text.charCodeAt(offset);
          return !(before >= 55296 && before <= 56319 && after >= 56320 && after <= 57343);
        }
        function validateReadingSupports(snapshotValue, candidates) {
          var snapshot2 = getSourceSnapshot(snapshotValue);
          var envelope = isObject(candidates) ? candidates : {};
          var entries = Array.isArray(candidates) ? candidates : Array.isArray(envelope.annotations) ? envelope.annotations : [];
          var previousRejected = Number.isInteger(envelope.rejectedCount) && envelope.rejectedCount > 0 ? envelope.rejectedCount : 0;
          var annotations = [];
          var rejectedCount = previousRejected;
          var invalidSource = !snapshot2 || envelope.schemaVersion !== void 0 && envelope.schemaVersion !== 1 || envelope.sourceFingerprint && envelope.sourceFingerprint !== snapshot2.fingerprint;
          var ids = /* @__PURE__ */ Object.create(null);
          entries.forEach(function(entry) {
            var valid = !invalidSource && isObject(entry) && Number.isInteger(entry.start) && Number.isInteger(entry.end) && entry.start >= 0 && entry.end > entry.start && entry.end <= snapshot2.text.length && isSourceTextBoundary(snapshot2.text, entry.start) && isSourceTextBoundary(snapshot2.text, entry.end) && typeof entry.quote === "string" && snapshot2.text.slice(entry.start, entry.end) === entry.quote && typeof entry.text === "string" && !!entry.text.trim() && entry.text.length <= 2400 && ["gloss", "definition", "explanation"].indexOf(entry.kind || "gloss") !== -1;
            var id = valid ? cleanText(entry.id, 160) || "support-" + entry.start + "-" + entry.end : "";
            if (valid && (ids[id] || annotations.some(function(annotation) {
              return entry.start < annotation.end && entry.end > annotation.start;
            }))) valid = false;
            if (!valid) {
              rejectedCount++;
              return;
            }
            ids[id] = true;
            annotations.push({
              id,
              kind: entry.kind || "gloss",
              start: entry.start,
              end: entry.end,
              quote: entry.quote,
              text: entry.text,
              language: cleanText(entry.language, 80) || snapshot2.language
            });
          });
          annotations.sort(function(left, right) {
            return left.start - right.start;
          });
          var coverageInvalid = false;
          var seenCoverage = [];
          function validatedRanges(value) {
            if (!Array.isArray(value)) return [];
            var ranges = [];
            value.forEach(function(entry) {
              var valid = !invalidSource && isObject(entry) && Number.isInteger(entry.start) && Number.isInteger(entry.end) && entry.start >= 0 && entry.end > entry.start && entry.end <= snapshot2.text.length && isSourceTextBoundary(snapshot2.text, entry.start) && isSourceTextBoundary(snapshot2.text, entry.end);
              if (valid && seenCoverage.some(function(range2) {
                return entry.start < range2.end && entry.end > range2.start;
              })) valid = false;
              if (!valid) {
                coverageInvalid = true;
                return;
              }
              var range = { start: entry.start, end: entry.end };
              if (entry.reason) range.reason = cleanText(entry.reason, 100);
              ranges.push(range);
              seenCoverage.push(range);
            });
            return ranges.sort(function(left, right) {
              return left.start - right.start;
            });
          }
          var coveredRanges = validatedRanges(envelope.coveredRanges);
          var skippedRanges = validatedRanges(envelope.skippedRanges);
          return {
            schemaVersion: 1,
            sourceFingerprint: snapshot2 ? snapshot2.fingerprint : "",
            annotations,
            rejectedCount,
            coveredRanges,
            skippedRanges,
            status: invalidSource || envelope.status === "unavailable" ? "unavailable" : rejectedCount || skippedRanges.length || coverageInvalid || envelope.status === "partial" ? "partial" : "complete"
          };
        }
        function _sourceFooterLabel(value) {
          return String(value || "").trim().replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "").replace(/^[*_]+|[*_]+$/g, "").replace(/:\s*$/, "").replace(/\s+/g, " ").trim().toLowerCase();
        }
        function _isSourceFooterBoundary(value) {
          var raw = String(value || "").trim();
          if (!raw) return false;
          var label = _sourceFooterLabel(raw);
          if (/^(?:source text references|accuracy check references|referenced sources|verified sources|sources|references|works? cited|bibliography|citations)$/.test(label)) return true;
          if (/^(?:source[- ]support|source[- ]support check|citation support|grounding support)$/.test(label)) return true;
          if (/^(?:about this document|ai (?:use |assistance )?disclosure|ai-generated content disclosure|artificial intelligence disclosure)$/.test(label)) return true;
          var proseLabel = raw.replace(/^\s*(?:>|[-*+]\s+)?/, "").replace(/^[*_]+/, "").replace(/[*_]+\s*$/, "").trim();
          return /^(?:Source-support check\s*\(automated|Partial-grounding notice\s*:|Source-attribution notice\s*:|About this document\s*:\s*drafted with AI assistance|(?:AI(?: use| assistance|-generated content)?|Artificial intelligence) disclosure\s*:)/i.test(proseLabel);
        }
        function extractMeasurableSourceBody(value) {
          var artifact = String(value === void 0 || value === null ? "" : value).replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "").replace(/[ \t]+$/gm, "").trim();
          if (!artifact) return "";
          var lines = artifact.split("\n");
          var first = lines.length ? lines[0].trim() : "";
          if (/^Title\s*:\s*\S/i.test(first) || /^#(?!#)\s+\S/.test(first)) lines.shift();
          var cutoff = lines.length;
          for (var i = 0; i < lines.length; i++) {
            if (_isSourceFooterBoundary(lines[i])) {
              cutoff = i;
              break;
            }
          }
          lines = lines.slice(0, cutoff);
          while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
          if (lines.length && /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(lines[lines.length - 1])) lines.pop();
          while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
          lines = lines.filter(function(line) {
            return !/^\s{0,3}#{1,6}[ \t]+.+?[ \t]*#*[ \t]*$/.test(String(line));
          });
          return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
        }
        function _finiteNumber(value) {
          if (value === null || value === void 0 || typeof value === "string" && !value.trim()) return null;
          var numeric = Number(value);
          return Number.isFinite(numeric) ? numeric : null;
        }
        function _readabilitySnapshot(value) {
          if (!isObject(value)) return null;
          var score = _finiteNumber(value.score);
          var words = _finiteNumber(value.words);
          var sentences = _finiteNumber(value.sentences);
          var syllables = _finiteNumber(value.syllables);
          return {
            score: score === null ? null : score.toFixed(1),
            words,
            sentences,
            syllables
          };
        }
        function measureSourceComplexity(artifactText, calculateReadability) {
          if (typeof calculateReadability !== "function") return null;
          var artifact = String(artifactText === void 0 || artifactText === null ? "" : artifactText).replace(/\r\n?/g, "\n").trim();
          var body = extractMeasurableSourceBody(artifact);
          if (!body) return null;
          var artifactStats = null;
          var bodyStats = null;
          try {
            artifactStats = calculateReadability(artifact);
            bodyStats = body === artifact ? artifactStats : calculateReadability(body);
          } catch (_) {
            return null;
          }
          var snapshot2 = _readabilitySnapshot(bodyStats);
          if (!snapshot2) return null;
          var hasCounts = snapshot2.words !== null && snapshot2.words > 0 && snapshot2.sentences !== null && snapshot2.sentences > 0 && snapshot2.syllables !== null && snapshot2.syllables >= 0;
          var averageSentenceLength = hasCounts ? snapshot2.words / snapshot2.sentences : null;
          var averageSyllablesPerWord = hasCounts ? snapshot2.syllables / snapshot2.words : null;
          var rawGrade = hasCounts ? 0.39 * averageSentenceLength + 11.8 * averageSyllablesPerWord - 15.59 : _finiteNumber(snapshot2.score);
          var clampedGrade = rawGrade === null ? _finiteNumber(snapshot2.score) : Math.max(0, Math.min(18, rawGrade));
          var displayScore = clampedGrade === null ? null : clampedGrade.toFixed(1);
          var displayGrade = displayScore === null ? null : Number(displayScore);
          return {
            measurementVersion: SOURCE_COMPLEXITY_MEASUREMENT_VERSION,
            extractionVersion: SOURCE_BODY_EXTRACTION_VERSION,
            measurementScope: "source-body",
            method: "flesch-kincaid-en",
            score: displayScore,
            rawFleschKincaidGrade: rawGrade,
            displayFleschKincaidGrade: displayGrade,
            averageSentenceLength,
            averageSyllablesPerWord,
            words: snapshot2.words,
            sentences: snapshot2.sentences,
            syllables: snapshot2.syllables,
            bodyCounts: {
              characters: body.length,
              words: snapshot2.words,
              sentences: snapshot2.sentences,
              syllables: snapshot2.syllables
            },
            artifactCharacterCount: artifact.length,
            bodyCharacterCount: body.length,
            artifactFingerprint: fingerprintText(artifact),
            bodyFingerprint: fingerprintText(body),
            legacyArtifactMetrics: _readabilitySnapshot(artifactStats)
          };
        }
        function isEnglishLanguage(value) {
          var language = cleanText(value || "English", 80).toLowerCase();
          if (!language) return true;
          if (/bilingual|multilingual|dual\s*language|\+|\/|,/.test(language)) return false;
          return language === "english" || language === "en" || language.indexOf("english (") === 0;
        }
        function complexityStatus(score, requestedGrade) {
          var numeric = Number(score);
          var target = getComplexityTarget(requestedGrade);
          if (!Number.isFinite(numeric) || !target) return "unavailable";
          if (numeric < target.fkRange.min) return "below-target";
          if (numeric > target.fkRange.max) return "above-target";
          return "within-target";
        }
        function normalizeComplexity(raw, options) {
          var source2 = isObject(raw) ? raw : {};
          var opts = isObject(options) ? options : {};
          var requestedGrade = normalizeGradeLabel(source2.requestedGrade || source2.targetGrade || opts.requestedGrade || "", "");
          var calibrationTarget = normalizeGradeLabel(source2.calibrationTarget || opts.calibrationTarget || "", "");
          var rawMeasured = source2.measuredGrade !== void 0 ? source2.measuredGrade : source2.score;
          var measured = Number(rawMeasured);
          var hasMeasured = rawMeasured !== null && rawMeasured !== "" && rawMeasured !== void 0 && Number.isFinite(measured);
          var language = cleanText(source2.language || opts.language || "English", 80);
          var fingerprint = cleanText(source2.contentFingerprint || opts.contentFingerprint, 120);
          var status = cleanText(source2.status, 40);
          var sourceCarriesMeasurement = source2.measuredGrade !== void 0 || source2.score !== void 0 || source2.measurementVersion !== void 0 || source2.rawFleschKincaidGrade !== void 0;
          var metricSource = sourceCarriesMeasurement ? source2 : opts;
          var rawFk = _finiteNumber(metricSource.rawFleschKincaidGrade);
          var displayFk = _finiteNumber(metricSource.displayFleschKincaidGrade);
          if (displayFk === null && hasMeasured) displayFk = measured;
          var averageSentenceLength = _finiteNumber(metricSource.averageSentenceLength);
          var averageSyllablesPerWord = _finiteNumber(metricSource.averageSyllablesPerWord);
          var rawBodyCounts = isObject(metricSource.bodyCounts) ? metricSource.bodyCounts : {};
          var hasBodyCounts = Object.keys(rawBodyCounts).length > 0;
          var bodyCounts = hasBodyCounts ? {
            characters: _finiteNumber(rawBodyCounts.characters),
            words: _finiteNumber(rawBodyCounts.words),
            sentences: _finiteNumber(rawBodyCounts.sentences),
            syllables: _finiteNumber(rawBodyCounts.syllables)
          } : null;
          var legacyArtifactMetrics = _readabilitySnapshot(metricSource.legacyArtifactMetrics);
          if (!status) status = hasMeasured && isEnglishLanguage(language) ? complexityStatus(measured, requestedGrade) : "unavailable";
          return {
            requestedGrade,
            calibrationTarget,
            measuredGrade: hasMeasured ? measured : null,
            method: cleanText(source2.method || (hasMeasured ? "flesch-kincaid-en" : ""), 80),
            status,
            contentFingerprint: fingerprint,
            measuredAt: cleanText(source2.measuredAt, 80),
            language,
            measurementScope: cleanText(metricSource.measurementScope, 40),
            measurementVersion: cleanText(metricSource.measurementVersion, 80),
            extractionVersion: cleanText(metricSource.extractionVersion, 80),
            rawFleschKincaidGrade: rawFk,
            displayFleschKincaidGrade: displayFk,
            averageSentenceLength,
            averageSyllablesPerWord,
            bodyCounts,
            artifactCharacterCount: _finiteNumber(metricSource.artifactCharacterCount),
            bodyCharacterCount: _finiteNumber(metricSource.bodyCharacterCount),
            artifactFingerprint: cleanText(metricSource.artifactFingerprint, 120),
            bodyFingerprint: cleanText(metricSource.bodyFingerprint, 120),
            legacyArtifactMetrics
          };
        }
        function normalizeInstructionalText(raw, options) {
          var source2 = isObject(raw) ? raw : {};
          var opts = isObject(options) ? options : {};
          var role = cleanText(source2.role || opts.role, 40);
          var form = cleanText(source2.form || opts.form, 40);
          var designationSource = cleanText(source2.designationSource || opts.designationSource, 40);
          if (ROLES.indexOf(role) === -1) role = "unspecified";
          if (FORMS.indexOf(form) === -1) form = opts.defaultForm && FORMS.indexOf(opts.defaultForm) !== -1 ? opts.defaultForm : "original";
          if (DESIGNATION_SOURCES.indexOf(designationSource) === -1) designationSource = "legacy-inferred";
          var rawAuthorization = isObject(source2.replacementAuthorization) ? source2.replacementAuthorization : {};
          var authorizationSource = cleanText(rawAuthorization.source, 40);
          var authorized = form === "adapted" && rawAuthorization.authorized === true && authorizationSource === "educator";
          return {
            schemaVersion: TEXT_SCHEMA_VERSION,
            role,
            form,
            sourceArtifactId: cleanText(source2.sourceArtifactId || source2.sourceResourceId || opts.sourceArtifactId, 160) || null,
            primaryArtifactId: cleanText(source2.primaryArtifactId || source2.primaryResourceId || opts.primaryArtifactId, 160) || null,
            designationSource,
            replacementAuthorization: {
              authorized,
              source: authorized ? "educator" : "none"
            },
            complexity: normalizeComplexity(source2.complexity, opts.complexity)
          };
        }
        function getInstructionalText(item, options) {
          var source2 = isObject(item) ? item : {};
          var config = isObject(source2.config) ? source2.config : {};
          var candidate = source2.instructionalText || source2.textProfile || config.instructionalText || config.textProfile;
          if (candidate) return normalizeInstructionalText(candidate, options);
          return inferInstructionalText(source2, options);
        }
        function inferInstructionalText(item, options) {
          var source2 = isObject(item) ? item : {};
          var opts = isObject(options) ? options : {};
          var type = cleanText(source2.type, 80).toLowerCase();
          var inferred = {
            role: "unspecified",
            form: type === "simplified" ? "adapted" : "original",
            designationSource: "legacy-inferred",
            sourceArtifactId: null,
            primaryArtifactId: null,
            complexity: {
              requestedGrade: source2.targetGradeLevel || (isObject(source2.config) ? source2.config.grade : ""),
              measuredGrade: source2.localStats && (source2.localStats.score !== void 0 ? source2.localStats.score : source2.localStats.gradeLevel),
              method: source2.localStats && (source2.localStats.score !== void 0 || source2.localStats.gradeLevel !== void 0) ? "flesch-kincaid-en" : "",
              contentFingerprint: typeof source2.data === "string" ? fingerprintText(source2.data) : "",
              language: isObject(source2.config) ? source2.config.language : "English"
            }
          };
          if (type === "analysis" && source2.data && (source2.data.originalText || source2.data.rawEnglishText)) {
            inferred.role = "primary";
            inferred.form = "original";
            inferred.designationSource = "workflow-default";
          }
          if (opts.role) inferred.role = opts.role;
          return normalizeInstructionalText(inferred, opts);
        }
        function withComplexityEvidence(instructionalText, evidence, content) {
          var normalized = normalizeInstructionalText(instructionalText);
          var next = clonePlain(normalized);
          var options = isObject(evidence) ? clonePlain(evidence) : {};
          if (content !== void 0) options.contentFingerprint = fingerprintText(content);
          if (!options.measuredAt && Number.isFinite(Number(options.measuredGrade !== void 0 ? options.measuredGrade : options.score))) {
            options.measuredAt = (/* @__PURE__ */ new Date()).toISOString();
          }
          next.complexity = normalizeComplexity(options, normalized.complexity);
          return next;
        }
        function invalidateComplexityEvidence(instructionalText, content, reason) {
          var normalized = normalizeInstructionalText(instructionalText);
          var next = clonePlain(normalized);
          next.complexity.measuredGrade = null;
          next.complexity.method = "";
          next.complexity.status = cleanText(reason, 40) || "stale";
          next.complexity.contentFingerprint = content === void 0 ? "" : fingerprintText(content);
          next.complexity.measuredAt = "";
          next.complexity.measurementScope = "";
          next.complexity.measurementVersion = "";
          next.complexity.extractionVersion = "";
          next.complexity.rawFleschKincaidGrade = null;
          next.complexity.displayFleschKincaidGrade = null;
          next.complexity.averageSentenceLength = null;
          next.complexity.averageSyllablesPerWord = null;
          next.complexity.bodyCounts = null;
          next.complexity.artifactCharacterCount = null;
          next.complexity.bodyCharacterCount = null;
          next.complexity.artifactFingerprint = "";
          next.complexity.bodyFingerprint = "";
          next.complexity.legacyArtifactMetrics = null;
          return next;
        }
        function _instructionalConstraintsFromStandards(standardsContext) {
          var context = isObject(standardsContext) ? standardsContext : {};
          if (isObject(context.instructionalConstraints) && cleanText(context.instructionalConstraints.textAccessExpectation, 80) !== "unspecified") {
            return context.instructionalConstraints;
          }
          var entries = Array.isArray(context.standards) ? context.standards : [];
          for (var i = 0; i < entries.length; i++) {
            var constraints = entries[i] && entries[i].instructionalConstraints;
            if (isObject(constraints) && cleanText(constraints.textAccessExpectation, 80) !== "unspecified") {
              return constraints;
            }
          }
          return isObject(context.instructionalConstraints) ? context.instructionalConstraints : {};
        }
        function _standardsText(standardsContext, standardsInput) {
          var context = isObject(standardsContext) ? standardsContext : {};
          var entries = Array.isArray(context.standards) ? context.standards : [];
          var values = [standardsInput, context.inputText, context.promptText];
          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (isObject(entry)) {
              values.push(entry.code, entry.label, entry.text, entry.statement, entry.description);
            } else {
              values.push(entry);
            }
          }
          return values.map(function(value) {
            return cleanText(value, 3600);
          }).filter(Boolean).join(" ");
        }
        function deriveTextAccessPlan(raw, options) {
          var source2 = isObject(raw) ? raw : {};
          var opts = isObject(options) ? options : {};
          var standardsContext = source2.standardsContext || opts.standardsContext || null;
          var constraints = _instructionalConstraintsFromStandards(standardsContext);
          var expectation = cleanText(constraints.textAccessExpectation, 80) || "unspecified";
          var sourced = constraints.sourced === true || !!cleanText(constraints.basis || constraints.authority || constraints.sourceUrl || constraints.url, 600);
          var searchable = _standardsText(standardsContext, opts.standardsInput || opts.standards || "");
          var textComplexityRequirement = /\b(?:text complexity|appropriately complex text|grade[- ]level complex text|complex (?:literary|informational|source) texts?|independently and proficiently|high end of (?:the )?text complexity band)\b/i.test(searchable) || /\b(?:CCSS\.)?(?:ELA-LITERACY\.)?(?:RL|RI|RST|RH)\.[A-Z0-9-]+\.10\b/i.test(searchable);
          var standardRequiresPrimary = expectation === "preserve-primary" || expectation === "adaptation-prohibited" || textComplexityRequirement;
          var sourcedProhibition = sourced && expectation === "adaptation-prohibited";
          var explicitAdaptedPolicy = cleanText(source2.adaptedTextPolicy || opts.adaptedTextPolicy, 40);
          var adaptedTextPolicy = ADAPTED_TEXT_POLICIES.indexOf(explicitAdaptedPolicy) !== -1 ? explicitAdaptedPolicy : "include";
          if (adaptedTextPolicy === "prohibited" && !sourcedProhibition) adaptedTextPolicy = "omit";
          if (sourcedProhibition) adaptedTextPolicy = "prohibited";
          var decisionSource = cleanText(source2.adaptedTextPolicySource || opts.adaptedTextPolicySource, 40);
          if (sourcedProhibition) decisionSource = "standard";
          else if (explicitAdaptedPolicy === "prohibited") decisionSource = "educator";
          else if (TEXT_ACCESS_DECISION_SOURCES.indexOf(decisionSource) === -1) {
            decisionSource = explicitAdaptedPolicy ? "educator" : "workflow-default";
          }
          var explicitPrimaryAccess = cleanText(source2.primaryTextAccess || opts.primaryTextAccess, 40);
          var primaryTextAccess = PRIMARY_TEXT_ACCESS.indexOf(explicitPrimaryAccess) !== -1 ? explicitPrimaryAccess : standardRequiresPrimary ? "required" : "available";
          if (standardRequiresPrimary) primaryTextAccess = "required";
          var reason = sourcedProhibition ? "sourced-adaptation-prohibition" : expectation === "preserve-primary" && sourced ? "sourced-primary-text-requirement" : textComplexityRequirement ? "standard-text-complexity-requirement" : explicitAdaptedPolicy ? "educator-choice" : "default-access-companion";
          return {
            primaryTextAccess,
            adaptedTextPolicy,
            adaptedTextPolicySource: decisionSource,
            textAccessReason: reason,
            standardRequiresPrimary,
            sourcedAdaptationProhibition: sourcedProhibition
          };
        }
        function normalizeInstructionalContext(raw, options) {
          var source2 = isObject(raw) ? raw : {};
          var opts = isObject(options) ? options : {};
          var standardsContext = clonePlain(source2.standardsContext || opts.standardsContext || null);
          var policy = cleanText(source2.primaryTextPolicy || opts.primaryTextPolicy, 60);
          if (PRIMARY_POLICIES.indexOf(policy) === -1) policy = "preserve-primary";
          var instructionalGrade = normalizeGradeLabel(
            source2.instructionalGrade || source2.grade && (source2.grade.instructionalGrade || source2.grade.label) || opts.instructionalGrade,
            opts.fallbackGrade || ""
          );
          var textAccess = deriveTextAccessPlan(source2, Object.assign({}, opts, { standardsContext }));
          return {
            schemaVersion: CONTEXT_SCHEMA_VERSION,
            instructionalGrade,
            primaryTextPolicy: policy,
            primaryTextAccess: textAccess.primaryTextAccess,
            adaptedTextPolicy: textAccess.adaptedTextPolicy,
            adaptedTextPolicySource: textAccess.adaptedTextPolicySource,
            textAccessReason: textAccess.textAccessReason,
            standardsContext,
            standardsFingerprint: cleanText(source2.standardsFingerprint, 120) || fingerprintValue(standardsContext || null)
          };
        }
        function resolveArtifactContext(item, ambient) {
          var source2 = isObject(item) ? item : {};
          var config = isObject(source2.config) ? source2.config : {};
          var fallback = isObject(ambient) ? ambient : {};
          var instructionalText = getInstructionalText(source2);
          return {
            grade: normalizeGradeLabel(
              instructionalText.complexity.requestedGrade || source2.targetGradeLevel || config.grade || fallback.grade,
              fallback.grade || ""
            ),
            language: cleanText(instructionalText.complexity.language || config.language || fallback.language || "English", 80),
            standards: clonePlain(config.standardsContext || config.standards || fallback.standardsContext || fallback.standards || null),
            instructionalText
          };
        }
        var API = {
          VERSION,
          TEXT_SCHEMA_VERSION,
          CONTEXT_SCHEMA_VERSION,
          SOURCE_BODY_EXTRACTION_VERSION,
          SOURCE_COMPLEXITY_MEASUREMENT_VERSION,
          ROLES: ROLES.slice(),
          FORMS: FORMS.slice(),
          ADAPTED_TEXT_POLICIES: ADAPTED_TEXT_POLICIES.slice(),
          PRIMARY_TEXT_ACCESS: PRIMARY_TEXT_ACCESS.slice(),
          normalizeGrade,
          normalizeGradeLabel,
          getComplexityTarget,
          getSourceCalibrationTarget,
          getSourceCalibrationStyle,
          buildSourceCalibrationGuidance,
          fingerprintText,
          fingerprintSourceText,
          createSourceSnapshot,
          getSourceSnapshot,
          createSupportedReading,
          isSupportedOriginal,
          getReadingArtifactLabel,
          ensureReadingSourcePairs,
          validateReadingSupports,
          fingerprintValue,
          extractMeasurableSourceBody,
          measureSourceComplexity,
          isEnglishLanguage,
          complexityStatus,
          normalizeComplexity,
          normalizeInstructionalText,
          getInstructionalText,
          inferInstructionalText,
          withComplexityEvidence,
          invalidateComplexityEvidence,
          deriveTextAccessPlan,
          normalizeInstructionalContext,
          resolveArtifactContext
        };
        if (typeof module !== "undefined" && module.exports) module.exports = API;
        if (typeof window !== "undefined") {
          window.AlloModules = window.AlloModules || {};
          window.AlloModules.InstructionalContext = API;
        }
      })();
    }
  });

  // pure_helpers_module.js
  var require_pure_helpers_module = __commonJS({
    "pure_helpers_module.js"() {
      (function() {
        "use strict";
        if (window.AlloModules && window.AlloModules.PureHelpersModule) {
          console.log("[CDN] PureHelpersModule already loaded, skipping");
          return;
        }
        const repairSourceMarkdown = (rawText, deps) => {
          try {
            if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] repairSourceMarkdown fired");
          } catch (_) {
          }
          if (!rawText) return rawText;
          const bibMatch = rawText.match(/(\n---\n|\n#{2,3} Source Text References)/s);
          let body = bibMatch ? rawText.substring(0, bibMatch.index) : rawText;
          const bib = bibMatch ? rawText.substring(bibMatch.index) : "";
          const trimmedBody = body.trimEnd();
          if (trimmedBody.length > 50) {
            const lastSentenceEnd = Math.max(
              trimmedBody.lastIndexOf("."),
              trimmedBody.lastIndexOf("!"),
              trimmedBody.lastIndexOf("?")
            );
            if (lastSentenceEnd > 0 && trimmedBody.length - lastSentenceEnd < 120) {
              const afterPunctuation = trimmedBody.substring(lastSentenceEnd + 1).trim();
              if (afterPunctuation.length > 5 && !/[.!?]/.test(afterPunctuation)) {
                body = trimmedBody.substring(0, lastSentenceEnd + 1);
              }
            }
          }
          rawText = body + bib;
          rawText = rawText.replace(/([.!?])\s*(#{1,6}\s+)/g, "$1\n\n$2");
          let lines = rawText.split("\n");
          let titleProcessed = false;
          const repairedLines = lines.map((line, index) => {
            let trimmed = line.trim();
            if (!titleProcessed && trimmed.length > 0) {
              if (/^Title:\s*/i.test(trimmed)) {
                titleProcessed = true;
                return trimmed.replace(/^Title:\s*/i, "# ");
              }
              if (!/^[#\-*]/.test(trimmed) && !/^\*\*/.test(trimmed) && !/^\[/.test(trimmed) && !/^\d+\.\s/.test(trimmed) && trimmed.length < 80 && index < 3) {
                titleProcessed = true;
                return "# " + trimmed;
              }
            }
            if (titleProcessed === false && trimmed.length >= 80) {
              titleProcessed = true;
            }
            if (/^#{1,6}\s+/.test(trimmed) && trimmed.length > 150) {
              return line.replace(/^#{1,6}\s+/, "");
            }
            return line;
          });
          const finalLines = [];
          for (let i = 0; i < repairedLines.length; i++) {
            const line = repairedLines[i];
            if (/^#{1,6}\s+/.test(line.trim()) && i > 0) {
              const prevLine = finalLines[finalLines.length - 1];
              if (prevLine && prevLine.trim().length > 0) {
                finalLines.push("");
              }
            }
            finalLines.push(line);
          }
          return finalLines.join("\n");
        };
        const _protectSentenceSplitLinks = (text, linkMap) => {
          let output = "";
          let cursor = 0;
          const input = String(text || "");
          while (cursor < input.length) {
            const open = input.indexOf("[", cursor);
            if (open < 0) {
              output += input.slice(cursor);
              break;
            }
            output += input.slice(cursor, open);
            const labelEnd = input.indexOf("](", open + 1);
            if (labelEnd < 0) {
              output += input.slice(open);
              break;
            }
            let pos = labelEnd + 2;
            let depth = 1;
            while (pos < input.length && depth > 0) {
              if (input[pos] === "\\") {
                pos += 2;
                continue;
              }
              if (input[pos] === "(") depth += 1;
              else if (input[pos] === ")") depth -= 1;
              pos += 1;
            }
            if (depth !== 0) {
              output += input.slice(open, pos);
              cursor = pos;
              continue;
            }
            linkMap.push(input.slice(open, pos));
            output += `{{LINK_${linkMap.length - 1}}}`;
            cursor = pos;
          }
          return output;
        };
        const _isSentenceCitationLink = (link) => {
          const label = String(link || "").match(/^\[([^\]]+)\]\(/);
          if (!label) return false;
          const normalized = label[1].replace(/\s+/g, " ").trim();
          return /^(?:Source\s+)?\d+$/i.test(normalized) || /^\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?$/.test(normalized);
        };
        const _attachLeadingSentenceCitations = (units, linkMap) => {
          const result = [];
          (Array.isArray(units) ? units : []).forEach((unit) => {
            let remaining = String(unit || "").trim();
            const citations = [];
            while (remaining) {
              const linkToken = remaining.match(/^\{\{LINK_(\d+)\}\}/);
              if (linkToken && _isSentenceCitationLink(linkMap[Number(linkToken[1])])) {
                citations.push(linkToken[0]);
                remaining = remaining.slice(linkToken[0].length).trimStart().replace(/^[,;]\s*/, "");
                continue;
              }
              const bare = remaining.match(/^\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/);
              if (bare) {
                citations.push(bare[0]);
                remaining = remaining.slice(bare[0].length).trimStart().replace(/^[,;]\s*/, "");
                continue;
              }
              break;
            }
            if (!citations.length) {
              if (remaining) result.push(remaining);
              return;
            }
            const cluster = citations.join(" ");
            if (!result.length) {
              result.push((cluster + (remaining ? " " + remaining : "")).trim());
              return;
            }
            result[result.length - 1] = `${result[result.length - 1].trimEnd()} ${cluster}`;
            remaining = remaining.replace(/^[,;]\s*/, "").trim();
            if (remaining && !/^[.!?]+$/.test(remaining)) result.push(remaining);
          });
          return result;
        };
        const splitTextToSentences = (text, deps) => {
          try {
            if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] splitTextToSentences fired");
          } catch (_) {
          }
          if (!text) return [];
          const linkMap = [];
          let protectedText = _protectSentenceSplitLinks(String(text).replace(/\r\n?/g, "\n"), linkMap);
          const latexMap = [];
          protectedText = protectedText.replace(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g, (match) => {
            latexMap.push(match);
            return `{{LATEX_${latexMap.length - 1}}}`;
          });
          [
            /\b(?:e\.g|i\.e|etc|vs|Ph\.D|M\.D|B\.A|M\.A)\./gi,
            /\b(?:[A-Za-z]\.){2,}/g
          ].forEach((pattern) => {
            protectedText = protectedText.replace(pattern, (match) => match.replace(/\./g, "{{DOT}}"));
          });
          protectedText = protectedText.replace(/(^|\s)([A-Z])\.(\s)/g, "$1$2{{DOT}}$3");
          const honorifics = ["Mr", "Mrs", "Ms", "Dr", "Prof", "St", "Gen", "Rep", "Sen"];
          honorifics.forEach((h) => {
            protectedText = protectedText.replace(new RegExp(`(\\b${h})\\.(\\s)`, "g"), `$1{{DOT}}$2`);
          });
          protectedText = protectedText.split("\n").map((line, index, lines) => {
            const structural = /^[ \t]*(?:#{1,6}[ \t]+|>[ \t]?|[-+*][ \t]+|\d+[.)][ \t]+)/.test(line);
            const previous = index ? lines[index - 1] : "";
            const afterStandalone = /^[ \t]*(?:#{1,6}[ \t]+|>[ \t]?)/.test(previous);
            const afterList = /^[ \t]*(?:[-+*]|\d+[.)])[ \t]+/.test(previous) && /^\S/.test(line);
            const protectedNumber = line.replace(/^([ \t]*\d+)\.([ \t]+)/, "$1{{DOT}}$2");
            return (structural || afterStandalone || afterList ? "|" : "") + protectedNumber;
          }).join("\n");
          protectedText = protectedText.replace(/(^|\n)([ \t]*#{1,6}[ \t][^\n]*[^\s|])[ \t]*(?=\n|$)/g, "$1$2|").replace(/\n[ \t]*\n\s*/g, "|");
          protectedText = protectedText.replace(/([。！？؟۔।॥]+["'”’」』）)]*)[ \t]*/g, "$1|");
          const sentenceUnits = protectedText.replace(/([.!?]+["']?)(\s+|$)/g, "$1|").split("|").map((s) => s.trim()).filter((s) => s.length > 0);
          const attachedUnits = _attachLeadingSentenceCitations(sentenceUnits, linkMap);
          return attachedUnits.map((s) => {
            let restored = s.replace(/{{DOT}}/g, ".").trim();
            restored = restored.replace(/{{LATEX_(\d+)}}/g, (_, index) => latexMap[parseInt(index, 10)] || "");
            restored = restored.replace(/{{LINK_(\d+)}}/g, (_, index) => linkMap[parseInt(index, 10)] || "");
            return restored;
          }).filter((s) => s.length > 0);
        };
        const diffWords = (oldText, newText, deps) => {
          try {
            if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] diffWords fired");
          } catch (_) {
          }
          if (!oldText || !newText) return [];
          const oldWords = oldText.trim().split(/\s+/);
          const newWords = newText.trim().split(/\s+/);
          const m = oldWords.length;
          const n = newWords.length;
          const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
          for (let i2 = 1; i2 <= m; i2++) {
            for (let j2 = 1; j2 <= n; j2++) {
              if (oldWords[i2 - 1] === newWords[j2 - 1]) {
                dp[i2][j2] = dp[i2 - 1][j2 - 1] + 1;
              } else {
                dp[i2][j2] = Math.max(dp[i2 - 1][j2], dp[i2][j2 - 1]);
              }
            }
          }
          let i = m, j = n;
          const diff = [];
          while (i > 0 && j > 0) {
            if (oldWords[i - 1] === newWords[j - 1]) {
              diff.push({ type: "same", value: oldWords[i - 1] });
              i--;
              j--;
            } else if (dp[i - 1][j] >= dp[i][j - 1]) {
              diff.push({ type: "del", value: oldWords[i - 1] });
              i--;
            } else {
              diff.push({ type: "add", value: newWords[j - 1] });
              j--;
            }
          }
          while (i > 0) {
            diff.push({ type: "del", value: oldWords[i - 1] });
            i--;
          }
          while (j > 0) {
            diff.push({ type: "add", value: newWords[j - 1] });
            j--;
          }
          return diff.reverse();
        };
        const generateBingoCards = (glossaryData, count, size, deps) => {
          const { addToast, t, fisherYatesShuffle } = deps;
          try {
            if (window._DEBUG_PURE_HELPERS) console.log("[PureHelpers] generateBingoCards fired");
          } catch (_) {
          }
          const totalCells = size * size;
          const centerIndex = size % 2 !== 0 ? Math.floor(totalCells / 2) : -1;
          const termsNeeded = centerIndex !== -1 ? totalCells - 1 : totalCells;
          const validTerms = (Array.isArray(glossaryData) ? glossaryData : []).filter((item) => item && typeof item.term === "string" && item.term.trim());
          let pool = [...validTerms];
          if (!pool || pool.length === 0) {
            addToast(t("toasts.no_glossary_terms"), "error");
            return null;
          }
          if (pool.length < termsNeeded) {
            addToast(`Repeating terms to fill ${size}x${size} grid.`, "info");
            while (pool.length < termsNeeded) {
              pool = [...pool, ...validTerms];
            }
          }
          const newCards = [];
          for (let i = 0; i < count; i++) {
            const shuffled = fisherYatesShuffle(pool);
            const cardContent = shuffled.slice(0, termsNeeded).map((item) => ({ ...item, type: "term" }));
            if (centerIndex !== -1) {
              cardContent.splice(centerIndex, 0, {
                type: "free",
                term: "FREE SPACE",
                def: t("bingo.free_space"),
                image: null
              });
            }
            newCards.push(cardContent);
          }
          return newCards;
        };
        const _applyTextSurgery = (prevHtml, effectiveText) => {
          if (!window.Diff || typeof window.Diff.diffWordsWithSpace !== "function") {
            throw new Error("jsdiff library not loaded");
          }
          const parser = new DOMParser();
          const doc = parser.parseFromString(prevHtml, "text/html");
          if (!doc || !doc.body) throw new Error("HTML failed to parse");
          const rejectParents = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
          const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => {
              let p = n.parentElement;
              while (p) {
                if (rejectParents.has(p.tagName)) return NodeFilter.FILTER_REJECT;
                p = p.parentElement;
              }
              return NodeFilter.FILTER_ACCEPT;
            }
          });
          const nodes = [];
          const map = [];
          let domText = "";
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const nodeIdx = nodes.length;
            nodes.push(node);
            const content = node.textContent || "";
            for (let i = 0; i < content.length; i++) {
              map.push({ nodeIdx, offsetInNode: i });
            }
            domText += content;
          }
          if (nodes.length === 0) {
            return { html: prevHtml, coverage: 0, reason: "no-text-nodes" };
          }
          const surgicalHunks = window.Diff.diffWordsWithSpace(domText, effectiveText);
          const edits = [];
          let cursor = 0;
          for (const h of surgicalHunks) {
            if (!h.added && !h.removed) {
              cursor += h.value.length;
            } else if (h.removed) {
              edits.push({ type: "delete", offset: cursor, length: h.value.length });
              cursor += h.value.length;
            } else if (h.added) {
              edits.push({ type: "insert", offset: cursor, text: h.value });
            }
          }
          edits.sort((a, b) => b.offset - a.offset);
          const applyDelete = (offset, length) => {
            const groups = [];
            for (let i = offset; i < offset + length && i < map.length; i++) {
              const m = map[i];
              const last = groups[groups.length - 1];
              if (last && last.nodeIdx === m.nodeIdx && last.end === m.offsetInNode) {
                last.end = m.offsetInNode + 1;
              } else {
                groups.push({ nodeIdx: m.nodeIdx, start: m.offsetInNode, end: m.offsetInNode + 1 });
              }
            }
            groups.sort((a, b) => a.nodeIdx === b.nodeIdx ? b.start - a.start : 0);
            for (const g of groups) {
              const node = nodes[g.nodeIdx];
              const c = node.textContent || "";
              node.textContent = c.substring(0, g.start) + c.substring(g.end);
            }
          };
          const applyInsert = (offset, text) => {
            if (offset === 0) {
              const first = nodes[0];
              first.textContent = text + (first.textContent || "");
              return;
            }
            if (offset >= map.length) {
              const last = nodes[nodes.length - 1];
              last.textContent = (last.textContent || "") + text;
              return;
            }
            const m = map[offset];
            const node = nodes[m.nodeIdx];
            const c = node.textContent || "";
            node.textContent = c.substring(0, m.offsetInNode) + text + c.substring(m.offsetInNode);
          };
          for (const e of edits) {
            if (e.type === "delete") applyDelete(e.offset, e.length);
            else applyInsert(e.offset, e.text);
          }
          const serialized = doc.documentElement ? doc.documentElement.outerHTML : "";
          const html = (doc.doctype ? "<!DOCTYPE " + doc.doctype.name + ">\n" : "") + serialized;
          const _stripTags = (h) => String(h || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
          const resultText = _stripTags(html);
          const approvedTokens = effectiveText.split(/\s+/).filter((t) => t.length > 2);
          let found = 0;
          const resultLower = resultText.toLowerCase();
          for (const tok of approvedTokens) {
            if (resultLower.includes(tok.toLowerCase())) found++;
          }
          const coverage = approvedTokens.length > 0 ? found / approvedTokens.length : 1;
          return { html, coverage, reason: null };
        };
        const _compactBlueprintRunForStorage = (run, diagnosticsOnly = false, deps = {}) => {
          const { _alloDiagnosticReason, _alloDiagnosticResourceType, _alloDiagnosticBoundedInt, _alloDiagnosticTimestamp, _alloDiagnosticRunId, ALLO_GENERATION_MAX_RESOURCES } = deps;
          const _missing = ["_alloDiagnosticReason", "_alloDiagnosticResourceType", "_alloDiagnosticBoundedInt", "_alloDiagnosticTimestamp", "_alloDiagnosticRunId", "ALLO_GENERATION_MAX_RESOURCES"].filter((key) => deps[key] === void 0);
          if (_missing.length) throw new Error("[_compactBlueprintRunForStorage] missing deps: " + _missing.join(", "));
          if (!run || typeof run !== "object") return run;
          const statuses = /* @__PURE__ */ new Set(["planned", "queued", "running", "retrying", "landed", "completed", "partial", "failed", "interrupted", "stopped", "skipped", "ready"]);
          const failureCodes = /* @__PURE__ */ new Set(["safety", "authentication", "quota", "rate-limit", "timeout", "network", "capacity", "empty-output", "configuration", "malformed-output", "stopped", "generation-failure"]);
          const sensitiveFields = /* @__PURE__ */ new Set(["error", "errormessage", "stack", "rawresponse", "responsebody", "requestbody", "generatedcontent", "prompt", "prompttext", "sourcetext", "apikey", "accesstoken", "authorization", "credential", "secret", "password"]);
          const isSensitiveField = (field) => sensitiveFields.has(String(field || "").replace(/[_-]/g, "").toLowerCase());
          const safeStatus = (status) => statuses.has(status) ? status : "unknown";
          const assignFailure = (target, field, value, existingCode) => {
            if (value) {
              const safeReason = _alloDiagnosticReason(value);
              target[field] = safeReason.summary;
              target.failureCode = safeReason.code;
            } else if (failureCodes.has(existingCode)) {
              target.failureCode = existingCode;
            }
          };
          const rowEntries = Object.entries(run.rows || {});
          const rows = Object.fromEntries(rowEntries.slice(0, ALLO_GENERATION_MAX_RESOURCES).map(([key, row], index) => {
            const storageKey = diagnosticsOnly ? "row-" + (index + 1) : key;
            if (!row || typeof row !== "object") return [storageKey, { status: "unknown" }];
            if (diagnosticsOnly) {
              const compact3 = {
                tool: _alloDiagnosticResourceType(row.tool),
                index: _alloDiagnosticBoundedInt(row.index, 1e5),
                status: safeStatus(row.status),
                elapsedMs: _alloDiagnosticBoundedInt(row.elapsedMs, 24 * 60 * 60 * 1e3),
                attempts: _alloDiagnosticBoundedInt(row.attempts, 100),
                startedAt: _alloDiagnosticTimestamp(row.startedAt),
                finishedAt: _alloDiagnosticTimestamp(row.finishedAt)
              };
              assignFailure(compact3, "failReason", row.failReason, row.failureCode);
              return [storageKey, compact3];
            }
            const allowed = Object.keys(row).filter((field) => field !== "failureCode" && !isSensitiveField(field));
            const compact2 = {};
            allowed.forEach((field) => {
              if (row[field] === void 0) return;
              if (field === "failReason" || field === "reason") {
                assignFailure(compact2, field, row[field], row.failureCode);
              } else {
                compact2[field] = row[field];
              }
            });
            if (!compact2.failureCode) assignFailure(compact2, "failReason", null, row.failureCode);
            return [storageKey, compact2];
          }));
          if (diagnosticsOnly) {
            const compact2 = {
              runId: _alloDiagnosticRunId(run.runId, "blueprint"),
              status: safeStatus(run.status),
              startedAt: _alloDiagnosticTimestamp(run.startedAt),
              finishedAt: _alloDiagnosticTimestamp(run.finishedAt),
              elapsedMs: _alloDiagnosticBoundedInt(run.elapsedMs, 24 * 60 * 60 * 1e3),
              failureCount: _alloDiagnosticBoundedInt(run.failureCount, 1e5),
              done: run.done === true,
              stopped: run.stopped === true,
              restored: run.restored === true,
              persistenceWarning: run.persistenceWarning ? "Compact persistence fallback was used." : null,
              rows
            };
            if (run.failReason) assignFailure(compact2, "failReason", run.failReason, run.failureCode);
            else assignFailure(compact2, "reason", run.reason, run.failureCode);
            return compact2;
          }
          const compact = {};
          Object.keys(run).forEach((field) => {
            if (field === "rows" || field === "failureCode" || isSensitiveField(field) || run[field] === void 0) return;
            if (field === "failReason" || field === "reason") assignFailure(compact, field, run[field], run.failureCode);
            else compact[field] = run[field];
          });
          if (!compact.failureCode) assignFailure(compact, "reason", null, run.failureCode);
          compact.rows = rows;
          return compact;
        };
        const _compactFullPackRunForStorage = (run, diagnosticsOnly = false, deps = {}) => {
          const { _alloDiagnosticReason, _alloDiagnosticResourceType, _alloDiagnosticBoundedInt, _alloDiagnosticTimestamp, _alloDiagnosticRunId, ALLO_GENERATION_MAX_RESOURCES, _alloSanitizeFullPackPreflight, ALLO_GENERATION_MAX_GROUPS } = deps;
          const _missing = ["_alloDiagnosticReason", "_alloDiagnosticResourceType", "_alloDiagnosticBoundedInt", "_alloDiagnosticTimestamp", "_alloDiagnosticRunId", "ALLO_GENERATION_MAX_RESOURCES", "_alloSanitizeFullPackPreflight", "ALLO_GENERATION_MAX_GROUPS"].filter((key) => deps[key] === void 0);
          if (_missing.length) throw new Error("[_compactFullPackRunForStorage] missing deps: " + _missing.join(", "));
          if (!run || typeof run !== "object") return run;
          const statuses = /* @__PURE__ */ new Set(["planned", "queued", "planning", "ready", "running", "retrying", "landed", "completed", "partial", "failed", "interrupted", "stopped", "skipped"]);
          const failureCodes = /* @__PURE__ */ new Set(["safety", "authentication", "quota", "rate-limit", "timeout", "network", "capacity", "empty-output", "configuration", "malformed-output", "stopped", "generation-failure"]);
          const sensitiveFields = /* @__PURE__ */ new Set(["error", "errormessage", "stack", "rawresponse", "responsebody", "requestbody", "generatedcontent", "prompt", "prompttext", "sourcetext", "apikey", "accesstoken", "authorization", "credential", "secret", "password"]);
          const isSensitiveField = (field) => sensitiveFields.has(String(field || "").replace(/[_-]/g, "").toLowerCase());
          const safeStatus = (status) => statuses.has(status) ? status : "unknown";
          const stripFields = (value, omitted = []) => {
            if (!value || typeof value !== "object") return {};
            const omit = new Set(omitted);
            const out = {};
            Object.keys(value).forEach((field) => {
              if (field === "failureCode" || omit.has(field) || isSensitiveField(field) || value[field] === void 0) return;
              out[field] = value[field];
            });
            return out;
          };
          const compactFailureFields = (reason, existingCode) => {
            if (!reason) return failureCodes.has(existingCode) ? { failureCode: existingCode } : {};
            const safeReason = _alloDiagnosticReason(reason);
            return { reason: safeReason.summary, failureCode: safeReason.code };
          };
          const compactPreflight = (preflight) => {
            if (!preflight || typeof preflight !== "object") return diagnosticsOnly ? null : preflight;
            if (diagnosticsOnly) return _alloSanitizeFullPackPreflight(preflight);
            const out = stripFields(preflight, ["reason", "selected", "skipped"]);
            Object.assign(out, compactFailureFields(preflight.reason, preflight.failureCode));
            out.selected = Array.isArray(preflight.selected) ? preflight.selected.map((item) => item && typeof item === "object" ? stripFields(item) : null).filter(Boolean) : [];
            out.skipped = Array.isArray(preflight.skipped) ? preflight.skipped.map((item) => {
              if (!item || typeof item !== "object") return null;
              return Object.assign(stripFields(item, ["reason"]), compactFailureFields(item.reason, item.failureCode));
            }).filter(Boolean) : [];
            return out;
          };
          const compactResource = (resource) => {
            if (!resource || typeof resource !== "object") return diagnosticsOnly ? { type: "unknown", status: "unknown" } : null;
            if (diagnosticsOnly) {
              return Object.assign({
                type: _alloDiagnosticResourceType(resource.type),
                index: _alloDiagnosticBoundedInt(resource.index, 1e5),
                status: safeStatus(resource.status),
                elapsedMs: _alloDiagnosticBoundedInt(resource.elapsedMs, 24 * 60 * 60 * 1e3),
                attempts: _alloDiagnosticBoundedInt(resource.attempts, 100),
                startedAt: _alloDiagnosticTimestamp(resource.startedAt),
                finishedAt: _alloDiagnosticTimestamp(resource.finishedAt),
                retryable: resource.retryable === true
              }, compactFailureFields(resource.reason, resource.failureCode));
            }
            return Object.assign(
              stripFields(resource, ["reason"]),
              compactFailureFields(resource.reason, resource.failureCode)
            );
          };
          const compactResources = (resources) => {
            const allEntries = Object.entries(resources || {});
            const entries = allEntries.slice(0, ALLO_GENERATION_MAX_RESOURCES);
            return Object.fromEntries(entries.map(([key, resource], index) => [diagnosticsOnly ? "resource-" + (index + 1) : key, compactResource(resource)]));
          };
          const compactGroup = (group) => {
            if (!group || typeof group !== "object") return diagnosticsOnly ? { status: "unknown", resources: {} } : null;
            if (diagnosticsOnly) {
              return Object.assign({
                status: safeStatus(group.status),
                startedAt: _alloDiagnosticTimestamp(group.startedAt),
                finishedAt: _alloDiagnosticTimestamp(group.finishedAt),
                elapsedMs: _alloDiagnosticBoundedInt(group.elapsedMs, 24 * 60 * 60 * 1e3),
                failureCount: _alloDiagnosticBoundedInt(group.failureCount, 1e5),
                persistenceWarning: group.persistenceWarning ? "Compact persistence fallback was used." : null,
                preflight: compactPreflight(group.preflight),
                planPayload: null,
                resources: compactResources(group.resources)
              }, compactFailureFields(group.reason, group.failureCode));
            }
            return Object.assign(
              stripFields(group, ["reason", "resources", "groups", "preflight", "planPayload"]),
              compactFailureFields(group.reason, group.failureCode),
              { preflight: compactPreflight(group.preflight), planPayload: group.planPayload, resources: compactResources(group.resources) }
            );
          };
          if (diagnosticsOnly) {
            return Object.assign({
              runId: _alloDiagnosticRunId(run.runId, "full-pack"),
              targetMode: ["all-groups", "current-settings"].includes(run.targetMode) ? run.targetMode : null,
              status: safeStatus(run.status),
              startedAt: _alloDiagnosticTimestamp(run.startedAt),
              finishedAt: _alloDiagnosticTimestamp(run.finishedAt),
              elapsedMs: _alloDiagnosticBoundedInt(run.elapsedMs, 24 * 60 * 60 * 1e3),
              failureCount: _alloDiagnosticBoundedInt(run.failureCount, 1e5),
              restored: run.restored === true,
              persistenceWarning: run.persistenceWarning ? "Compact persistence fallback was used." : null,
              preflight: compactPreflight(run.preflight),
              planPayload: null,
              resources: compactResources(run.resources),
              groups: Object.fromEntries(Object.values(run.groups || {}).slice(0, ALLO_GENERATION_MAX_GROUPS).map((group, index) => ["group-" + (index + 1), compactGroup(group)]))
            }, compactFailureFields(run.reason, run.failureCode));
          }
          return Object.assign(
            stripFields(run, ["reason", "resources", "groups", "preflight", "planPayload"]),
            compactFailureFields(run.reason, run.failureCode),
            {
              preflight: compactPreflight(run.preflight),
              planPayload: run.planPayload,
              resources: compactResources(run.resources),
              groups: Object.fromEntries(Object.entries(run.groups || {}).slice(0, ALLO_GENERATION_MAX_GROUPS).map(([key, group]) => [key, compactGroup(group)]))
            }
          );
        };
        window.AlloModules = window.AlloModules || {};
        window.AlloModules.PureHelpers = {
          repairSourceMarkdown,
          splitTextToSentences,
          diffWords,
          generateBingoCards,
          _applyTextSurgery,
          _compactBlueprintRunForStorage,
          _compactFullPackRunForStorage
        };
        window.AlloModules.PureHelpersModule = true;
        console.log("[PureHelpers] 7 helpers registered");
      })();
    }
  });

  // phase_n_misc_helpers_module.js
  var require_phase_n_misc_helpers_module = __commonJS({
    "phase_n_misc_helpers_module.js"() {
      (function() {
        "use strict";
        if (window.AlloModules && window.AlloModules.PhaseNHelpersModule) {
          console.log("[CDN] PhaseNHelpersModule already loaded, skipping");
          return;
        }
        var useState = React.useState;
        var useEffect = React.useEffect;
        var useRef = React.useRef;
        var useMemo = React.useMemo;
        var useCallback = React.useCallback;
        var Fragment = React.Fragment;
        const addGlossaryTerm = async (rawWord, deps, quick = false) => {
          const {
            generatedContent,
            history,
            gradeLevel,
            selectedLanguages,
            useEmojis,
            callGemini,
            cleanJson,
            callImagen,
            callGeminiImageEdit,
            autoRemoveWords,
            glossaryImageStyle,
            universalImageStyle,
            setHistory,
            setIsAddingTerm,
            setNewGlossaryTerm,
            addToast,
            t,
            warnLog
          } = deps;
          const word = String(rawWord || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
          if (!word || !quick && generatedContent?.type !== "glossary") return false;
          const origin = generatedContent?.type === "glossary" ? generatedContent : [...history || []].reverse().find((resource) => resource?.type === "glossary");
          const begin = window.AlloModules?.GlossaryHelpers?.beginGlossaryTask;
          if (origin && !begin) throw new Error("Glossary helpers are not loaded. Reload and retry.");
          const task = origin ? begin(deps, null, [], "add:" + word.toLocaleLowerCase(), origin) : null;
          const invocationId = generatedContent?.id;
          const visible = () => typeof deps.getGlossaryLive !== "function" || deps.getGlossaryLive().resource?.id === invocationId;
          const current = () => !task || task.isCurrent();
          setIsAddingTerm(true);
          try {
            const languages = Array.isArray(selectedLanguages) ? selectedLanguages : [];
            const prompt = [
              "Analyze the input term " + JSON.stringify(word) + ".",
              '1. Detect the language. If it is NOT English, translate it to English. Use this English version as the main "term".',
              "2. Provide a simple English definition for a " + gradeLevel + " student.",
              '3. Categorize as "Academic" (General Tier 2) or "Domain-Specific" (Topic Tier 3).',
              languages.length ? "4. Provide translations into: " + languages.join(", ") + '. Include both the translated TERM and DEFINITION as "Translated Term: Translated Definition".' : "",
              useEmojis ? "Include a relevant emoji in a separate emoji field, never in the term." : "Do not use emojis.",
              'Return ONLY a JSON object: { "term": "English Term", "def": "English Definition", "tier": "Academic" | "Domain-Specific"' + (languages.length ? ', "translations": { "Lang": "TranslatedTerm: TranslatedDefinition" }' : "") + " }"
            ].join("\n");
            const result = await callGemini(prompt, true, false, null, null, task?.signal);
            if (!current()) return false;
            const newTermItem = JSON.parse(cleanJson(result));
            if (!newTermItem || typeof newTermItem.term !== "string" || !newTermItem.term.trim() || typeof newTermItem.def !== "string" || !newTermItem.def.trim()) throw new Error("The glossary term or definition was empty.");
            if (window.AlloModules.createGlossaryEntryId) newTermItem.entryId = window.AlloModules.createGlossaryEntryId();
            try {
              if (visible()) addToast(t("glossary.actions.generating_icon_new"), "info");
              const style = String(glossaryImageStyle || "").trim() || String(universalImageStyle || "").trim();
              const prompt2 = "Icon style illustration of " + JSON.stringify(newTermItem.term) + " (Context: " + newTermItem.def + "). " + (style ? "Style: " + style + "." : "Simple, clear, flat vector art style.") + " White background. STRICTLY NO TEXT, NO LABELS, NO LETTERS. Visual only. Educational icon.";
              let image = await callImagen(prompt2, void 0, void 0, { signal: task?.signal });
              if (!current()) return false;
              if (autoRemoveWords && image) {
                try {
                  image = await callGeminiImageEdit("Remove all text, labels, letters, and words from the image. Keep the illustration clean.", image.split(",")[1], void 0, void 0, null, { signal: task?.signal });
                } catch (error) {
                  if (!current()) return false;
                  warnLog("Auto-remove text failed for new term:", error);
                }
              }
              if (image) newTermItem.image = image;
            } catch (error) {
              if (!current()) return false;
              warnLog("Auto-image generation failed for new term:", error);
            }
            if (!current()) return false;
            if (task) {
              if (!task.commit((resource) => ({ ...resource, data: [...resource.data, newTermItem] }))) return false;
            } else {
              setHistory((previous) => [...previous, {
                id: "glossary-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
                type: "glossary",
                data: [newTermItem],
                meta: "1 Term (Quick Add)",
                title: "Glossary",
                timestamp: /* @__PURE__ */ new Date()
              }]);
            }
            if (visible()) {
              if (!quick) setNewGlossaryTerm((previous) => previous === rawWord ? "" : previous);
              addToast(t("glossary.actions.added_term", { term: newTermItem.term }), "success");
            }
            return true;
          } catch (error) {
            if (current() && visible()) {
              warnLog("Glossary add failed:", error);
              addToast(t("glossary.actions.add_failed"), "error");
            }
            return false;
          } finally {
            task?.finish();
            const pendingAdd = deps.glossaryTaskRegistry && [...deps.glossaryTaskRegistry.values()].some((token) => !token.finished && !token.controller.signal.aborted && token.invocationId === invocationId && token.channel.startsWith("add:"));
            if (visible() && (!task || task.isOwner()) && !pendingAdd) setIsAddingTerm(false);
          }
        };
        const handleQuickAddGlossary = async (rawWord, skipTip = false, deps) => addGlossaryTerm(rawWord, deps, true);
        const handleAddGlossaryTerm = async (deps) => addGlossaryTerm(deps.newGlossaryTerm, deps);
        const handleGeneratePOSData = async (deps) => {
          const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
          try {
            if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleGeneratePOSData fired");
          } catch (_) {
          }
          if (!generatedContent || generatedContent.type !== "simplified") return;
          if (generatedContent.posEnriched) return;
          if (isAnalyzingPos) return;
          setIsAnalyzingPos(true);
          try {
            const textToAnalyze = _stripForImmersive(generatedContent?.data);
            if (!textToAnalyze.trim()) {
              setIsAnalyzingPos(false);
              return;
            }
            const chunks = chunkText(textToAnalyze, 1500).filter((c) => c && c.trim().length > 0);
            if (chunks.length === 0) {
              setIsAnalyzingPos(false);
              return;
            }
            const taggedChunks = [];
            let failedChunks = 0;
            for (const chunk of chunks) {
              const prompt = `
                Analyze the grammatical parts of speech in the following text.
                Task: Reconstruct the text exactly as is, but:
                1. Wrap words with POS tags:
                   - Nouns: <n>word</n>
                   - Verbs: <v>word</v>
                   - Adjectives: <a>word</a>
                   - Adverbs: <d>word</d>
                2. Add syllable markers (\xB7) to ALL multi-syllable words:
                   - Example: "beautiful" \u2192 "beau\xB7ti\xB7ful"
                   - Example: "running" \u2192 "run\xB7ning"
                   - Single-syllable words stay unchanged: "cat" \u2192 "cat"
                   - Apply to tagged words too: <n>beau\xB7ti\xB7ful</n>
                Rules:
                - Keep all punctuation, spacing, and newlines EXACTLY the same.
                - Do not change any words except to add syllable markers.
                - Only tag the main nouns, verbs, adjectives, and adverbs (content words).
                - Add syllable markers to ALL words with more than one syllable.
                Text:
                "${chunk}"
            `;
              try {
                const tagged = await callGemini(prompt);
                if (tagged && typeof tagged === "string" && tagged.trim().length > 0) {
                  taggedChunks.push(tagged);
                } else {
                  warnLog("handleGeneratePOSData: Gemini returned empty for chunk; using raw fallback.");
                  taggedChunks.push(chunk);
                  failedChunks++;
                }
              } catch (chunkErr) {
                warnLog("handleGeneratePOSData: chunk failed \u2014 using raw fallback. ", chunkErr && chunkErr.message);
                taggedChunks.push(chunk);
                failedChunks++;
              }
            }
            if (failedChunks === chunks.length) {
              warnLog("handleGeneratePOSData: every chunk failed \u2014 POS toggles will have no visible effect.");
              addToast(t("process.grammar_failed") || "Could not classify parts of speech right now. Reader still works for reading and audio.", "info");
              return;
            }
            const fullTaggedText = taggedChunks.join("");
            const parsedData = parseTaggedContent(fullTaggedText);
            const updatedContent = { ...generatedContent, immersiveData: parsedData, posEnriched: true };
            setGeneratedContent(updatedContent);
            setHistory((prev) => prev.map((item) => item.id === generatedContent.id ? updatedContent : item));
            if (failedChunks > 0) {
              addToast("Parts of speech tagged \u2014 " + failedChunks + " of " + chunks.length + " sections had to use raw text.", "info");
            } else {
              addToast(t("process.grammar_complete") || "Parts of speech ready.", "success");
            }
          } catch (e) {
            warnLog("handleGeneratePOSData unhandled:", e);
            addToast(t("process.grammar_failed") || "Could not classify parts of speech.", "info");
          } finally {
            setIsAnalyzingPos(false);
          }
        };
        const handleMasteryGrading = async (text, rubric, topic, draftCount = 1, deps) => {
          const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
          try {
            if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleMasteryGrading fired");
          } catch (_) {
          }
          const qualityCheck = validateDraftQuality(text);
          if (!qualityCheck.isValid) {
            throw new Error(qualityCheck.error);
          }
          const gatePrompt = `
        ${RELEVANCE_GATE_PROMPT}
        ASSIGNMENT TOPIC: "${topic}"
        STUDENT SUBMISSION:
        "${text.substring(0, 2e3)}"
      `;
          const gateResultRaw = await callGemini(gatePrompt, true);
          let gateResult;
          try {
            gateResult = JSON.parse(cleanJson(gateResultRaw));
          } catch (e) {
            warnLog("Gate parsing failed, proceeding to grading.", e);
            gateResult = { isRelevant: true };
          }
          if (gateResult.isRelevant === false) {
            throw new Error(gateResult.reason || t("process.gate_failure"));
          }
          const gradingPrompt = `
        You are an expert teacher grading a student submission (Attempt #${draftCount}).
        Topic: "${topic}",
        Rubric / Criteria:
        """
        ${rubric}
        """,
        Student Submission:
        """
        ${text}
        """,
        Task:
        1. Evaluate the submission strictly against the Rubric criteria.
        2. Assign a Raw Score (0-100) based on the overall quality.
        3. Provide a breakdown for each criterion.
        4. Provide specific feedback explaining the score.
        Return ONLY JSON:
        {
          "rawScore": number,
          "breakdown": [
            { "criterion": "string", "score": number, "max": number, "reason": "string" }
          ],
          "feedback": {
            "strength": "What they did well",
            "improvement": "Specific advice to reach mastery"
          }
        }
      `;
          const gradingRaw = await callGemini(gradingPrompt, true);
          let gradingData;
          try {
            gradingData = JSON.parse(cleanJson(gradingRaw));
          } catch (e) {
            throw new Error(t("process.grading_error"));
          }
          const aiScore = gradingData.rawScore || 0;
          let finalScore = aiScore;
          let status = "revision";
          if (aiScore > 85) {
            status = "mastery";
            finalScore = 100;
          } else {
            status = "revision";
            finalScore = Math.max(40, aiScore);
          }
          return {
            status,
            score: finalScore,
            rawScore: aiScore,
            gradingDetails: gradingData,
            draftCount
          };
        };
        const formatInteractiveText = (text, isCloze = false, isDarkBg = false, deps) => {
          const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
          try {
            if (window._DEBUG_PHASE_N) console.log("[PhaseN] formatInteractiveText fired");
          } catch (_) {
          }
          if (!text) return null;
          const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
          return parts.filter((p) => p != null).map((part, i) => {
            if (part.startsWith("$") && part.endsWith("$") || part.startsWith("$$") && part.endsWith("$$")) {
              return /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, /* @__PURE__ */ React.createElement(MathSymbol, { text: part }));
            }
            if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
              const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
              if (match) {
                return /* @__PURE__ */ React.createElement(
                  "a",
                  {
                    key: i,
                    href: match[2],
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: `${isDarkBg ? "text-sky-300 hover:text-sky-200 focus-visible:ring-sky-300 focus-visible:ring-offset-slate-900" : "text-blue-700 hover:text-blue-900 focus-visible:ring-blue-700 focus-visible:ring-offset-white"} z-20 relative font-medium underline decoration-2 underline-offset-2 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`,
                    onClick: (e) => e.stopPropagation(),
                    title: match[2]
                  },
                  match[1]
                );
              }
            }
            const isBold = part.startsWith("**") && part.endsWith("**");
            const isItalic = part.startsWith("*") && part.endsWith("*");
            let content = part;
            if (isBold) content = part.slice(2, -2);
            else if (isItalic) content = part.slice(1, -1);
            const subParts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\[.*?\]\(.*?\))/g);
            const renderedSubParts = subParts.filter((sp) => sp != null).map((subPart, sIdx) => {
              if (subPart.startsWith("$") && subPart.endsWith("$") || subPart.startsWith("$$") && subPart.endsWith("$$")) {
                return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, /* @__PURE__ */ React.createElement(MathSymbol, { text: subPart }));
              }
              if (subPart.startsWith("[") && subPart.includes("](") && subPart.endsWith(")")) {
                const match = subPart.match(/^\[(.*?)\]\((.*?)\)$/);
                if (match) {
                  return /* @__PURE__ */ React.createElement(
                    "a",
                    {
                      key: sIdx,
                      href: match[2],
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: `${isDarkBg ? "text-sky-300 hover:text-sky-200 focus-visible:ring-sky-300 focus-visible:ring-offset-slate-900" : "text-blue-700 hover:text-blue-900 focus-visible:ring-blue-700 focus-visible:ring-offset-white"} z-20 relative font-medium underline decoration-2 underline-offset-2 cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`,
                      onClick: (e) => e.stopPropagation(),
                      title: match[2]
                    },
                    match[1]
                  );
                }
              }
              const glossed = highlightGlossaryTerms(subPart, latestGlossary, isCloze, isDarkBg);
              let finalContent = glossed;
              if (focusMode && !isCloze) {
                if (Array.isArray(glossed)) {
                  finalContent = glossed.map((g, gIdx) => {
                    if (typeof g === "string") return /* @__PURE__ */ React.createElement(React.Fragment, { key: gIdx }, toFocusText(g));
                    return /* @__PURE__ */ React.createElement(React.Fragment, { key: gIdx }, g);
                  });
                } else if (typeof glossed === "string") {
                  finalContent = toFocusText(glossed);
                }
              }
              return /* @__PURE__ */ React.createElement(React.Fragment, { key: sIdx }, finalContent);
            });
            if (isBold) {
              return /* @__PURE__ */ React.createElement("strong", { key: i, className: `font-bold ${isDarkBg ? "text-white" : "text-indigo-900"}` }, renderedSubParts);
            }
            if (isItalic) {
              return /* @__PURE__ */ React.createElement("em", { key: i, className: `italic ${isDarkBg ? "text-indigo-200" : "text-indigo-800"}` }, renderedSubParts);
            }
            return /* @__PURE__ */ React.createElement(React.Fragment, { key: i }, renderedSubParts);
          });
        };
        const handleCheckLevel = async (deps) => {
          const { gradeLevel, leveledTextLanguage, currentUiLanguage, selectedLanguages, studentInterests, sourceTopic, inputText, history, generatedContent, apiKey, standardsInput, targetStandards, dokLevel, isLineFocusMode, clozeInstanceSet, glossaryDefinitionLevel, glossaryImageStyle, newGlossaryTerm, isAutoFillMode, isShowMeMode, autoRemoveWords, creativeMode, enableEmojiInline, useEmojis, isAnalyzingPos, focusMode, latestGlossary, toFocusText, alloBotRef, setGeneratedContent, setHistory, setError, setIsProcessing, setGenerationStep, setNewGlossaryTerm, setClozeInstanceSet, setGlossaryHealthIssues, setIsCheckingGlossaryHealth, setMasteryResult, setIsGradingMastery, setIsCheckingLevel, setLevelCheckResult, setIsGeneratingPOS, setIsAnalyzingPos, setIsAddingTerm, addToast, t, warnLog, debugLog, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, cleanJson, safeJsonParse, sanitizeTruncatedCitations, normalizeResourceLinks, highlightGlossaryTerms, repairGeneratedText, getReadableContent, extractSourceTextForProcessing, calculateReadability, countWords, playSound, handleScoreUpdate, getDefaultTitle, parseTaggedContent, chunkText, _stripForImmersive, validateDraftQuality, RELEVANCE_GATE_PROMPT, ClozeInput, MathSymbol } = deps;
          try {
            if (window._DEBUG_PHASE_N) console.log("[PhaseN] handleCheckLevel fired");
          } catch (_) {
          }
          if (!generatedContent || generatedContent.type !== "simplified") return;
          setIsCheckingLevel(true);
          try {
            const textToCheck = typeof generatedContent?.data === "string" ? generatedContent?.data : "";
            if (!textToCheck) return;
            const contextModule = typeof window !== "undefined" && window.AlloModules ? window.AlloModules.InstructionalContext : null;
            const ambientStandards = standardsInput || targetStandards || null;
            const artifactContext = contextModule && typeof contextModule.resolveArtifactContext === "function" ? contextModule.resolveArtifactContext(generatedContent, {
              grade: gradeLevel,
              language: leveledTextLanguage,
              standards: ambientStandards
            }) : {
              grade: generatedContent?.instructionalText?.complexity?.requestedGrade || generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
              language: generatedContent?.instructionalText?.complexity?.language || generatedContent?.config?.language || leveledTextLanguage || "English",
              standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || ambientStandards,
              instructionalText: generatedContent?.instructionalText || null
            };
            const targetGrade = artifactContext.grade || gradeLevel;
            const artifactLanguage = artifactContext.language || leveledTextLanguage || "English";
            const standardsValue = artifactContext.standards;
            const standardsForPrompt = (() => {
              if (!standardsValue) return "";
              if (typeof standardsValue === "string") return standardsValue.trim();
              if (typeof standardsValue.promptText === "string" && standardsValue.promptText.trim()) {
                return standardsValue.promptText.trim();
              }
              if (Array.isArray(standardsValue.standards)) {
                return standardsValue.standards.map((entry) => {
                  if (typeof entry === "string") return entry;
                  return [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(": ");
                }).filter(Boolean).join("; ");
              }
              if (Array.isArray(standardsValue)) {
                return standardsValue.map(
                  (entry) => typeof entry === "string" ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(": ")
                ).filter(Boolean).join("; ");
              }
              return "";
            })().slice(0, 2400);
            const standardsContextLine = standardsForPrompt ? `Instructional Standards Context: ${standardsForPrompt}
Use this only when considering qualitative knowledge and language demands; do not treat standards alignment as a readability formula.` : "";
            const prompt1 = `
            You are a literacy expert. Analyze the text below to determine its text complexity.
            Target Level: ${targetGrade}
            Text Language: ${artifactLanguage}
            ${standardsContextLine}
            Task:
            1. Estimate the actual Grade Level equivalent (e.g., "3rd Grade", "5th-6th Grade").
            2. Assess alignment with the target level.
            3. Provide specific feedback on sentence structure and vocabulary load.
            Return ONLY JSON:
            {
                "estimatedLevel": "e.g. 4th Grade",
                "alignment": "Aligned" or "Too Complex" or "Too Simple",
                "feedback": "Brief explanation...",
            }
            Text: "${textToCheck.substring(0, 3e3)}"
        `;
            const result1 = await callGemini(prompt1, true);
            const analysis1 = JSON.parse(cleanJson(result1));
            const prompt2 = `
            You are a senior curriculum verifier. Review the following text and the initial complexity analysis.
            Text: "${textToCheck.substring(0, 3e3)}"
            Initial Estimate: ${analysis1.estimatedLevel}
            Target Level: ${targetGrade}
            Text Language: ${artifactLanguage}
            ${standardsContextLine}
            Task:
            1. VERIFY the Grade Level estimate. Is it accurate?
            2. Generate a COMPLEXITY RUBRIC to show nuances.
            Rubric Scales (-5 to +5):
            -5 = Much too simple for target
            0  = Perfect alignment
            +5 = Much too complex for target
            Return ONLY JSON:
            {
                "confirmedLevel": "Verified Grade Level",
                "rubric": {
                    "vocabulary": { "score": number, "reason": "string" },
                    "sentenceStructure": { "score": number, "reason": "string" },
                    "conceptDensity": { "score": number, "reason": "string" }
                },
                "nuanceSummary": "A sentence explaining the degree of complexity."
            }
        `;
            const result2 = await callGemini(prompt2, true);
            const analysis2 = JSON.parse(cleanJson(result2));
            const bilingualText = /---\s*ENGLISH TRANSLATION\s*---/i.test(textToCheck) || /---\s*TRANSLATION\s*---/i.test(textToCheck);
            const supportsEnglishMeasurement = !bilingualText && (contextModule && typeof contextModule.isEnglishLanguage === "function" ? contextModule.isEnglishLanguage(artifactLanguage) : /^(?:english|en)$/i.test(String(artifactLanguage || "").trim()));
            const localStats = supportsEnglishMeasurement ? calculateReadability(textToCheck) : null;
            const fallbackFingerprint = (value) => {
              const input = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
              let hash = 2166136261;
              for (let index = 0; index < input.length; index++) {
                hash ^= input.charCodeAt(index);
                hash = Math.imul(hash, 16777619);
              }
              return `txt-${(hash >>> 0).toString(16).padStart(8, "0")}-${input.length}`;
            };
            const contentFingerprint = contextModule && typeof contextModule.fingerprintText === "function" ? contextModule.fingerprintText(textToCheck) : fallbackFingerprint(textToCheck);
            const baseInstructionalText = contextModule && typeof contextModule.getInstructionalText === "function" ? contextModule.getInstructionalText(generatedContent, {
              complexity: { requestedGrade: targetGrade, language: artifactLanguage }
            }) : artifactContext.instructionalText || generatedContent.instructionalText || {
              role: "unspecified",
              form: "adapted",
              designationSource: "legacy-inferred",
              complexity: { requestedGrade: targetGrade, language: artifactLanguage }
            };
            let nextInstructionalText;
            if (localStats && contextModule && typeof contextModule.withComplexityEvidence === "function") {
              nextInstructionalText = contextModule.withComplexityEvidence(baseInstructionalText, {
                requestedGrade: targetGrade,
                measuredGrade: Number(localStats.score),
                method: "flesch-kincaid-en",
                language: artifactLanguage
              }, textToCheck);
            } else if (!localStats && contextModule && typeof contextModule.invalidateComplexityEvidence === "function") {
              nextInstructionalText = contextModule.invalidateComplexityEvidence(
                baseInstructionalText,
                textToCheck,
                supportsEnglishMeasurement ? "unavailable" : "not-applicable"
              );
            } else {
              nextInstructionalText = {
                ...baseInstructionalText,
                complexity: {
                  ...baseInstructionalText?.complexity || {},
                  requestedGrade: targetGrade,
                  measuredGrade: localStats ? Number(localStats.score) : null,
                  method: localStats ? "flesch-kincaid-en" : "",
                  status: localStats ? "measured" : supportsEnglishMeasurement ? "unavailable" : "not-applicable",
                  contentFingerprint,
                  measuredAt: localStats ? (/* @__PURE__ */ new Date()).toISOString() : "",
                  language: artifactLanguage
                }
              };
            }
            const finalAnalysis = {
              ...analysis1,
              ...analysis2,
              targetGradeLevel: targetGrade,
              language: artifactLanguage,
              standards: standardsForPrompt,
              contentFingerprint,
              measurementStatus: localStats ? "measured" : "not-evaluated",
              ...localStats ? { localStats } : {}
            };
            const updatedContent = {
              ...generatedContent,
              targetGradeLevel: targetGrade,
              instructionalText: nextInstructionalText,
              levelCheck: finalAnalysis,
              ...localStats ? { localStats } : {}
            };
            if (!localStats && updatedContent.localStats) delete updatedContent.localStats;
            setGeneratedContent(updatedContent);
            setHistory((prev) => prev.map((item) => item.id === generatedContent.id ? updatedContent : item));
            addToast(t("toasts.level_analysis_complete"), "success");
            if (alloBotRef.current) {
              alloBotRef.current.speak("I've verified the text complexity using a dual-check process. Review the rubric to see exactly how it aligns!", "happy");
            }
          } catch (e) {
            warnLog("Unhandled error:", e);
            setError(t("errors.reading_level_check_failed"));
            addToast(t("toasts.level_check_failed"), "error");
          } finally {
            setIsCheckingLevel(false);
          }
        };
        window.AlloModules = window.AlloModules || {};
        window.AlloModules.PhaseNHelpers = {
          handleQuickAddGlossary,
          handleAddGlossaryTerm,
          handleGeneratePOSData,
          handleMasteryGrading,
          formatInteractiveText,
          handleCheckLevel
        };
        window.AlloModules.PhaseNHelpersModule = true;
        console.log("[PhaseNHelpers] 6 helpers registered");
      })();
    }
  });

  // view_simplified_module.js
  var require_view_simplified_module = __commonJS({
    "view_simplified_module.js"() {
      (function() {
        "use strict";
        if (window.AlloModules && window.AlloModules.SimplifiedView) {
          console.log("[CDN] ViewSimplifiedModule already loaded, skipping");
          return;
        }
        var React3 = window.React;
        if (!React3) {
          console.error("[ViewSimplifiedModule] React not found on window");
          return;
        }
        var Fragment = React3.Fragment;
        function _extends() {
          return _extends = Object.assign ? Object.assign.bind() : function(n) {
            for (var e = 1; e < arguments.length; e++) {
              var t = arguments[e];
              for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
            }
            return n;
          }, _extends.apply(null, arguments);
        }
        function simplifiedAiText(value) {
          if (typeof value === "string") return value;
          if (typeof value === "number" || typeof value === "boolean") return String(value);
          if (!value || typeof value !== "object" || Array.isArray(value)) return "";
          var keys = ["reason", "text", "value", "label", "explanation"];
          for (var i = 0; i < keys.length; i++) {
            if (typeof value[keys[i]] === "string" && value[keys[i]].trim()) return value[keys[i]];
          }
          return "";
        }
        (function() {
          if (typeof document === "undefined") return;
          if (document.getElementById("allo-chunk-mood-css")) return;
          var st = document.createElement("style");
          st.id = "allo-chunk-mood-css";
          st.textContent = "@keyframes allo-chunk-popin { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }@keyframes allo-chunk-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }@media (prefers-reduced-motion: reduce) {  [data-sentence-idx] { animation: none !important; }}";
          if (document.head) document.head.appendChild(st);
        })();
        function renderDictionaryPanel(dict, t, renderRecording) {
          if (!dict) return null;
          var kids = [];
          var sourceUrl = dict.sourceUrl || (dict.word ? "https://en.wiktionary.org/wiki/" + encodeURIComponent(dict.word) : "");
          kids.push(React3.createElement("div", {
            key: "hd",
            className: "flex items-center gap-2 mb-1 flex-wrap"
          }, React3.createElement("span", {
            className: "text-[10px] font-bold uppercase tracking-wide text-emerald-700"
          }, t("glossary.popups.dictionary") || "Dictionary"), dict.phonetic ? React3.createElement("span", {
            className: "text-[11px] text-slate-500"
          }, dict.phonetic) : null, dict.audio ? renderRecording ? renderRecording("definition-recording", dict.audio) : null : null));
          (dict.meanings || []).slice(0, 2).forEach(function(m, mi) {
            var d0 = m.definitions && m.definitions[0] ? m.definitions[0].definition : "";
            if (!d0) return;
            var d0ex = m.definitions[0].example || "";
            kids.push(React3.createElement("div", {
              key: "m" + mi,
              className: "text-xs text-slate-700 leading-snug mb-1"
            }, m.partOfSpeech ? React3.createElement("span", {
              className: "italic text-slate-500 mr-1"
            }, m.partOfSpeech) : null, d0, d0ex ? React3.createElement("span", {
              className: "block text-[11px] text-slate-500 italic mt-0.5"
            }, '"' + d0ex + '"') : null));
          });
          if (dict.synonyms && dict.synonyms.length) {
            kids.push(React3.createElement("div", {
              key: "syn",
              className: "text-[11px] text-slate-500 mt-0.5"
            }, (t("glossary.popups.similar") || "Similar") + ": " + dict.synonyms.slice(0, 5).join(", ")));
          }
          kids.push(React3.createElement("div", {
            key: "src",
            className: "text-[10px] text-slate-400 mt-1"
          }, sourceUrl ? React3.createElement("a", {
            href: sourceUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 underline-offset-2",
            "aria-label": t("common.more_information") + ": " + (dict.word || "")
          }, t("common.resource") + ": " + (dict.source || "")) : t("common.resource") + ": " + (dict.source || "")));
          return React3.createElement("div", {
            className: "mt-3 pt-3 border-t border-emerald-100"
          }, kids);
        }
        function renderReadingLevelExplanation(definitionData, t, renderFormattedText) {
          if (!definitionData || !definitionData.text) return null;
          return React3.createElement("div", {
            className: "rounded-lg bg-indigo-50/60 border border-indigo-100 px-3 py-2.5",
            "aria-label": t("glossary.popups.reading_level_explanation") || "Reading-level explanation"
          }, React3.createElement("div", {
            className: "flex items-center gap-2 mb-1.5 flex-wrap"
          }, React3.createElement("span", {
            className: "text-[10px] font-bold uppercase tracking-wide text-indigo-700"
          }, t("glossary.popups.reading_level_explanation") || "Reading-level explanation"), React3.createElement("span", {
            className: "text-[10px] font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-full px-1.5 py-0.5"
          }, t("glossary.popups.ai_generated") || "AI-generated")), React3.createElement("div", {
            className: "text-sm text-slate-700 leading-relaxed"
          }, renderFormattedText(definitionData.text, false)));
        }
        function renderPhonicsDictRow(phonicsData, t, renderRecording) {
          var d = phonicsData && phonicsData.dictionary;
          if (!d || !d.phonetic && !d.audio) return null;
          var row = [React3.createElement("span", {
            key: "lbl",
            className: "text-[10px] font-bold text-emerald-700 uppercase tracking-wide"
          }, t("glossary.popups.dictionary") || "Dictionary")];
          if (d.phonetic) row.push(React3.createElement("span", {
            key: "ipa",
            className: "font-mono text-xs text-slate-600"
          }, d.phonetic));
          if (d.audio) row.push(renderRecording ? renderRecording("phonics-recording", d.audio) : null);
          return React3.createElement("div", {
            className: "flex items-center gap-2 flex-wrap px-1"
          }, row);
        }
        var _lazyIcon = function(name) {
          return function(props) {
            var I = window.AlloIcons && window.AlloIcons[name];
            return I ? /* @__PURE__ */ React3.createElement(I, props) : null;
          };
        };
        var Heart = _lazyIcon("Heart");
        var CheckCircle = _lazyIcon("CheckCircle");
        var Volume2 = _lazyIcon("Volume2");
        var Mic = _lazyIcon("Mic");
        var Search = _lazyIcon("Search");
        var Ear = _lazyIcon("Ear");
        var Plus = _lazyIcon("Plus");
        var HelpCircle = _lazyIcon("HelpCircle");
        var PenTool = _lazyIcon("PenTool");
        var Gamepad2 = _lazyIcon("Gamepad2");
        var Pencil = _lazyIcon("Pencil");
        var GitCompare = _lazyIcon("GitCompare");
        var BookOpen = _lazyIcon("BookOpen");
        var Settings = _lazyIcon("Settings");
        var ChevronLeft = _lazyIcon("ChevronLeft");
        var ChevronRight = _lazyIcon("ChevronRight");
        var Copy = _lazyIcon("Copy");
        var RefreshCw = _lazyIcon("RefreshCw");
        var ShieldCheck = _lazyIcon("ShieldCheck");
        var Download = _lazyIcon("Download");
        var CheckCircle2 = _lazyIcon("CheckCircle2");
        var X = _lazyIcon("X");
        var Bold = _lazyIcon("Bold");
        var Italic = _lazyIcon("Italic");
        var Highlighter = _lazyIcon("Highlighter");
        var List = _lazyIcon("List");
        var ListOrdered = _lazyIcon("ListOrdered");
        var Trophy = _lazyIcon("Trophy");
        var ImageIcon = _lazyIcon("ImageIcon");
        var Sparkles = _lazyIcon("Sparkles");
        var AlertCircle = _lazyIcon("AlertCircle");
        var ArrowRight = _lazyIcon("ArrowRight");
        var Play = _lazyIcon("Play");
        var Pause = _lazyIcon("Pause");
        var StopCircle = _lazyIcon("StopCircle");
        var Trash2 = _lazyIcon("Trash2");
        var ChevronDown = _lazyIcon("ChevronDown");
        var ChevronUp = _lazyIcon("ChevronUp");
        function simplifiedBodyHasCitationMarkers(body) {
          var inFence = false;
          return String(body || "").split(/\r?\n/).some(function(line) {
            if (/^[ \t]*(?:\x60{3}|~~~)/.test(line)) {
              inFence = !inFence;
              return false;
            }
            if (inFence) return false;
            var prose = line.replace(/\x60[^\x60\n]*\x60/g, "");
            return /\[\s*\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e\s*\]\s*\(|\u207d[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]+\u207e|\[Source[ \t]+\d+\]/i.test(prose);
          });
        }
        function resolveSimplifiedReferences(adaptedBody, adaptedReferences, inputReferences, citationAudit) {
          var ownedReferences = String(adaptedReferences || "");
          if (ownedReferences) return ownedReferences;
          var auditAllowsFallback = !citationAudit || citationAudit.enabled === true && Number(citationAudit.sourceCitationCount || 0) > 0;
          if (!auditAllowsFallback || !simplifiedBodyHasCitationMarkers(adaptedBody)) return "";
          return String(inputReferences || "");
        }
        function getInstructionalContextApi() {
          try {
            return window.AlloModules && window.AlloModules.InstructionalContext ? window.AlloModules.InstructionalContext : null;
          } catch (_) {
            return null;
          }
        }
        function fallbackInstructionalText(item) {
          var resource = item && typeof item === "object" ? item : {};
          var config = resource.config && typeof resource.config === "object" ? resource.config : {};
          var raw = resource.instructionalText || config.instructionalText || {};
          var rawComplexity = raw.complexity && typeof raw.complexity === "object" ? raw.complexity : {};
          var rawAuthorization = raw.replacementAuthorization && typeof raw.replacementAuthorization === "object" ? raw.replacementAuthorization : {};
          var role = ["primary", "supplemental", "unspecified"].indexOf(raw.role) >= 0 ? raw.role : "unspecified";
          var form = ["original", "same-text-supported", "adapted"].indexOf(raw.form) >= 0 ? raw.form : resource.type === "simplified" ? "adapted" : "original";
          var educatorAuthorized = rawAuthorization.authorized === true && rawAuthorization.source === "educator";
          return {
            schemaVersion: 1,
            role,
            form,
            sourceArtifactId: raw.sourceArtifactId || null,
            primaryArtifactId: raw.primaryArtifactId || null,
            designationSource: ["educator", "workflow-default", "legacy-inferred"].indexOf(raw.designationSource) >= 0 ? raw.designationSource : "legacy-inferred",
            replacementAuthorization: {
              authorized: educatorAuthorized,
              source: educatorAuthorized ? "educator" : "none"
            },
            complexity: {
              requestedGrade: rawComplexity.requestedGrade || resource.targetGradeLevel || config.grade || "",
              calibrationTarget: rawComplexity.calibrationTarget || "",
              measuredGrade: rawComplexity.measuredGrade !== void 0 ? rawComplexity.measuredGrade : resource.localStats && resource.localStats.score !== void 0 ? resource.localStats.score : null,
              method: rawComplexity.method || "",
              status: rawComplexity.status || "unavailable",
              contentFingerprint: rawComplexity.contentFingerprint || "",
              measuredAt: rawComplexity.measuredAt || "",
              language: rawComplexity.language || config.language || "English"
            }
          };
        }
        function getSimplifiedInstructionalText(item) {
          var api2 = getInstructionalContextApi();
          if (api2 && typeof api2.getInstructionalText === "function") {
            try {
              return api2.getInstructionalText(item);
            } catch (_) {
            }
          }
          return fallbackInstructionalText(item);
        }
        function updateSimplifiedInstructionalRole(item, requestedRole) {
          var resource = item && typeof item === "object" ? item : {};
          var role = ["primary", "supplemental", "unspecified"].indexOf(requestedRole) >= 0 ? requestedRole : "unspecified";
          var current = getSimplifiedInstructionalText(resource);
          var nextProfile = Object.assign({}, current, {
            role,
            form: current.form,
            designationSource: "educator",
            replacementAuthorization: role === "primary" && current.form === "adapted" ? {
              authorized: true,
              source: "educator"
            } : {
              authorized: false,
              source: "none"
            }
          });
          var api2 = getInstructionalContextApi();
          if (api2 && typeof api2.normalizeInstructionalText === "function") {
            try {
              nextProfile = api2.normalizeInstructionalText(nextProfile);
            } catch (_) {
            }
          }
          return Object.assign({}, resource, {
            instructionalText: nextProfile
          });
        }
        function artifactIdentityValues(item) {
          if (!item || typeof item !== "object") return [];
          return [item.id, item.uiId, item.artifactId, item.resourceId].filter(function(value) {
            return value !== void 0 && value !== null && String(value).trim();
          }).map(function(value) {
            return String(value);
          });
        }
        function artifactsMatch(left, right) {
          if (!left || !right) return false;
          var leftIds = artifactIdentityValues(left);
          var rightIds = artifactIdentityValues(right);
          if (leftIds.some(function(value) {
            return rightIds.indexOf(value) >= 0;
          })) return true;
          return left === right || !leftIds.length && !rightIds.length && left.type === right.type && left.data === right.data;
        }
        function findFullHistoryArtifact(history, item) {
          var safeHistory = Array.isArray(history) ? history : [];
          for (var index = safeHistory.length - 1; index >= 0; index -= 1) {
            if (artifactsMatch(safeHistory[index], item)) return safeHistory[index];
          }
          return item || {};
        }
        function upsertFullHistoryArtifact(history, previousItem, updatedItem) {
          var nextHistory = Array.isArray(history) ? history.slice() : [];
          for (var index = nextHistory.length - 1; index >= 0; index -= 1) {
            if (!artifactsMatch(nextHistory[index], previousItem)) continue;
            nextHistory[index] = Object.assign({}, nextHistory[index], updatedItem);
            return nextHistory;
          }
          nextHistory.push(updatedItem);
          return nextHistory;
        }
        function getArtifactReadingText(item) {
          if (!item || typeof item !== "object") return "";
          var data = item.data;
          if (typeof data === "string") return data;
          if (data && typeof data === "object") {
            var dataText = data.originalText || data.rawEnglishText || data.sourceText || data.text || data.simplifiedText;
            if (dataText) return String(dataText);
          }
          return String(item.originalText || item.rawEnglishText || item.sourceText || "");
        }
        function resolveSimplifiedCompareSource(history, adaptedItem, fallbackText) {
          var safeHistory = Array.isArray(history) ? history : [];
          var api2 = getInstructionalContextApi();
          var snapshot2 = api2 && api2.getSourceSnapshot && api2.getSourceSnapshot(adaptedItem);
          if (snapshot2) return {
            text: snapshot2.text,
            artifact: {
              id: snapshot2.sourceArtifactId,
              config: {
                language: snapshot2.language
              },
              data: snapshot2.text
            },
            selection: "captured-source"
          };
          var profile = getSimplifiedInstructionalText(adaptedItem);
          var linkedIds = [profile.sourceArtifactId, profile.primaryArtifactId].filter(function(value, index, values) {
            return value !== void 0 && value !== null && String(value).trim() && values.indexOf(value) === index;
          }).map(function(value) {
            return String(value);
          });
          for (var linkIndex = 0; linkIndex < linkedIds.length; linkIndex += 1) {
            for (var historyIndex = safeHistory.length - 1; historyIndex >= 0; historyIndex -= 1) {
              var candidate = safeHistory[historyIndex];
              if (artifactIdentityValues(candidate).indexOf(linkedIds[linkIndex]) < 0) continue;
              var linkedText = getArtifactReadingText(candidate);
              if (linkedText) return {
                text: linkedText,
                artifact: candidate,
                selection: "linked-artifact"
              };
            }
          }
          return {
            text: "",
            artifact: null,
            selection: "original-not-captured"
          };
        }
        function getSimplifiedComplexityDisplay(item, ambientGrade) {
          var resource = item && typeof item === "object" ? item : {};
          var resourceConfig = resource.config && typeof resource.config === "object" ? resource.config : {};
          var hasCanonicalProfile = !!(resource.instructionalText || resource.textProfile || resourceConfig.instructionalText || resourceConfig.textProfile);
          var profile = getSimplifiedInstructionalText(resource);
          var complexity = profile.complexity && typeof profile.complexity === "object" ? profile.complexity : {};
          var rawMeasured = complexity.measuredGrade;
          var hasMeasured = rawMeasured !== null && rawMeasured !== "" && rawMeasured !== void 0;
          var measured = hasMeasured ? Number(rawMeasured) : NaN;
          if (!hasCanonicalProfile && !Number.isFinite(measured) && resource.localStats && resource.localStats.score !== void 0) {
            rawMeasured = resource.localStats.score;
            measured = Number(rawMeasured);
          }
          var targetGrade = complexity.requestedGrade || resource.targetGradeLevel || resourceConfig.grade || ambientGrade || "";
          var api2 = getInstructionalContextApi();
          var currentFingerprint = "";
          if (api2 && typeof api2.fingerprintText === "function" && typeof resource.data === "string") {
            try {
              currentFingerprint = api2.fingerprintText(resource.data);
            } catch (_) {
            }
          }
          if (complexity.contentFingerprint && currentFingerprint && complexity.contentFingerprint !== currentFingerprint) {
            return {
              measuredGrade: null,
              targetGrade,
              status: "stale",
              target: null
            };
          }
          if (!Number.isFinite(measured)) {
            return {
              measuredGrade: null,
              targetGrade,
              status: complexity.status || "unavailable",
              target: null
            };
          }
          var languageIsEnglish = true;
          if (api2 && typeof api2.isEnglishLanguage === "function") {
            try {
              languageIsEnglish = api2.isEnglishLanguage(complexity.language || "English");
            } catch (_) {
            }
          }
          var status = !languageIsEnglish ? "unavailable" : api2 && typeof api2.complexityStatus === "function" ? api2.complexityStatus(measured, targetGrade) : ["below-target", "within-target", "above-target"].indexOf(complexity.status) >= 0 ? complexity.status : "unavailable";
          var target = null;
          if (api2 && typeof api2.getComplexityTarget === "function") {
            try {
              target = api2.getComplexityTarget(targetGrade);
            } catch (_) {
            }
          }
          return {
            measuredGrade: measured,
            targetGrade,
            status,
            target
          };
        }
        async function checkSimplifiedAlignment(deps) {
          var options = deps || {};
          var generatedContent = options.generatedContent;
          var gradeLevel = options.gradeLevel;
          var leveledTextLanguage = options.leveledTextLanguage;
          var activeResolvedStandardsContext = options.activeResolvedStandardsContext;
          var standardsInput = options.standardsInput;
          var targetStandards = options.targetStandards;
          var alloBotRef = options.alloBotRef;
          var t = options.t;
          var addToast = options.addToast;
          var setIsCheckingAlignment = options.setIsCheckingAlignment;
          var callGemini = options.callGemini;
          var cleanJson = options.cleanJson;
          var setGeneratedContent = options.setGeneratedContent;
          var setHistory = options.setHistory;
          var speak = options.speak;
          var warnLog = options.warnLog;
          var setError = options.setError;
          if (!generatedContent || generatedContent.type !== "simplified") return;
          var contextModule = window.AlloModules && window.AlloModules.InstructionalContext;
          var alignmentContext = contextModule && typeof contextModule.resolveArtifactContext === "function" ? contextModule.resolveArtifactContext(generatedContent, {
            grade: gradeLevel,
            language: leveledTextLanguage,
            standardsContext: activeResolvedStandardsContext,
            standards: standardsInput || targetStandards || null
          }) : {
            grade: generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
            standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || activeResolvedStandardsContext || standardsInput || targetStandards || null
          };
          var alignmentGrade = alignmentContext.grade || gradeLevel;
          var alignmentStandardsValue = alignmentContext.standards;
          var alignmentStandardsText = (function() {
            if (!alignmentStandardsValue) return "";
            if (typeof alignmentStandardsValue === "string") return alignmentStandardsValue.trim();
            if (typeof alignmentStandardsValue.promptText === "string" && alignmentStandardsValue.promptText.trim()) {
              return alignmentStandardsValue.promptText.trim();
            }
            var entries = Array.isArray(alignmentStandardsValue.standards) ? alignmentStandardsValue.standards : Array.isArray(alignmentStandardsValue) ? alignmentStandardsValue : [];
            return entries.map(function(entry) {
              return typeof entry === "string" ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(": ");
            }).filter(Boolean).join("; ");
          })().slice(0, 4e3);
          if (alloBotRef && alloBotRef.current) {
            var contextMessage = t("bot_events.feedback_audit_start").replace("{standard}", alignmentStandardsText || "Standard");
            alloBotRef.current.speak(contextMessage);
          }
          if (!alignmentStandardsText) {
            addToast(t("alignment.notifications.no_standard_error"), "error");
            return;
          }
          setIsCheckingAlignment(true);
          try {
            var textToCheck = typeof generatedContent?.data === "string" ? generatedContent.data : "";
            var prompt = `
            You are a curriculum specialist. Evaluate the rigor of the following text against ALL provided standards.
            Target Standards: "${alignmentStandardsText}"
            Target Grade Level: ${alignmentGrade}
            Text to Evaluate:
            "${textToCheck.substring(0, 3e3)}",
            Task:
            1. Think step-by-step. Analyze the cognitive demand (verbs) and content (nouns) of the standards.
            2. Identify specific evidence in the text that matches these requirements.
            3. Determine if the text supports the full rigor required by the standards, or if simplification has removed necessary depth.
            Return ONLY JSON:
            {
                "evidence": "List specific phrases or sections from the text that serve as evidence of alignment...",
                "status": "Aligned" or "Partially Aligned" or "Not Aligned",
                "rigorReport": "Explanation of how the text meets or fails the cognitive demand based on the evidence...",
                "missingElements": "Specific concepts or structures from the standard that are absent (or 'None')...",
                "improvement": "One specific edit to increase rigor without breaking accessibility."
            }
        `;
            var result = await callGemini(prompt, true);
            var parsedAnalysis = JSON.parse(cleanJson(result));
            var fingerprintText = contextModule && typeof contextModule.fingerprintText === "function" ? contextModule.fingerprintText(textToCheck) : String(textToCheck.length) + "|" + textToCheck.slice(0, 64) + "|" + textToCheck.slice(-64);
            var fingerprintStandards = contextModule && typeof contextModule.fingerprintValue === "function" ? contextModule.fingerprintValue(alignmentStandardsValue) : "";
            var analysis = {
              ...parsedAnalysis,
              contentFingerprint: fingerprintText,
              checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
              contextSnapshot: {
                grade: alignmentGrade,
                standardsFingerprint: fingerprintStandards,
                standardsText: alignmentStandardsText
              }
            };
            var updatedContent = {
              ...generatedContent,
              alignmentCheck: analysis
            };
            setGeneratedContent(updatedContent);
            setHistory(function(previous) {
              return previous.map(function(item) {
                return item.id === generatedContent.id ? updatedContent : item;
              });
            });
            addToast(t("alignment.notifications.check_complete"), "success");
            var feedbackKey = "bot.rigor_feedback_misaligned";
            if (analysis.status === "Aligned") feedbackKey = "bot.rigor_feedback_aligned";
            else if (analysis.status === "Partially Aligned") feedbackKey = "bot.rigor_feedback_partial";
            speak(t(feedbackKey));
          } catch (error) {
            warnLog("Unhandled error:", error);
            setError(t("alignment.notifications.error_check"));
            addToast(t("alignment.notifications.check_failed"), "error");
          } finally {
            setIsCheckingAlignment(false);
          }
        }
        async function regenerateSimplifiedWithRigor(deps) {
          var options = deps || {};
          var generatedContent = options.generatedContent;
          var setIsProcessing = options.setIsProcessing;
          var splitReferencesFromBody = options.splitReferencesFromBody;
          var extractSourceTextForProcessing = options.extractSourceTextForProcessing;
          var activeResolvedStandardsContext = options.activeResolvedStandardsContext;
          var standardsInput = options.standardsInput;
          var targetStandards = options.targetStandards;
          var gradeLevel = options.gradeLevel;
          var leveledTextLanguage = options.leveledTextLanguage;
          var translationTargetChoices = options.translationTargetChoices;
          var currentUiLanguage = options.currentUiLanguage;
          var selectedLanguages = options.selectedLanguages;
          var resolveTranslationPolicy = options.resolveTranslationPolicy;
          var translationMode = options.translationMode;
          var generateBilingualText = options.generateBilingualText;
          var callGemini = options.callGemini;
          var applySimplifiedTextMutation = options.applySimplifiedTextMutation;
          var setGeneratedContent = options.setGeneratedContent;
          var setHistory = options.setHistory;
          var addToast = options.addToast;
          var t = options.t;
          var warnLog = options.warnLog;
          var setError = options.setError;
          if (!generatedContent || !generatedContent.alignmentCheck || !generatedContent?.data || getSimplifiedInstructionalText(generatedContent).form === "same-text-supported") return;
          setIsProcessing(true);
          try {
            var rawText = typeof generatedContent?.data === "string" ? generatedContent.data : "";
            var isLeveledText = generatedContent.type === "simplified";
            var originalParts = isLeveledText ? splitReferencesFromBody(rawText) : {
              body: rawText,
              references: ""
            };
            var sourceExtraction = extractSourceTextForProcessing(originalParts.body, false);
            var currentText = sourceExtraction.text;
            var countCitationMarkers = function(value) {
              return (String(value || "").match(/\[\u207d[\u2070\u00b9\u00b2\u00b3\u2074-\u2079]+\u207e\]\(/g) || []).length;
            };
            var validateRigorCitations = function(original2, candidate) {
              var modules = typeof window !== "undefined" && window.AlloModules;
              var beforeCountFallback = countCitationMarkers(original2);
              var afterCountFallback = countCitationMarkers(candidate);
              var citationShaped = beforeCountFallback > 0 || afterCountFallback > 0;
              var unavailable = function(reason, error) {
                return {
                  valid: !citationShaped,
                  ok: !citationShaped,
                  reason,
                  error: error ? String(error?.message || error) : void 0,
                  beforeCount: beforeCountFallback,
                  afterCount: afterCountFallback,
                  orderChanged: false
                };
              };
              var normalizeDecision = function(result) {
                if (typeof result === "boolean") return {
                  known: true,
                  valid: result
                };
                if (!result || typeof result !== "object") return {
                  known: false,
                  valid: false
                };
                if (Object.prototype.hasOwnProperty.call(result, "valid")) return {
                  known: true,
                  valid: result.valid === true
                };
                if (Object.prototype.hasOwnProperty.call(result, "ok")) return {
                  known: true,
                  valid: result.ok === true
                };
                if (Object.prototype.hasOwnProperty.call(result, "conserved")) return {
                  known: true,
                  valid: result.conserved === true
                };
                return {
                  known: false,
                  valid: false
                };
              };
              var dispatcherValidate = modules?.GenDispatcher?.validateAdaptationCitationConservation;
              if (typeof dispatcherValidate === "function") {
                try {
                  var dispatcherResult = dispatcherValidate(original2, candidate);
                  var dispatcherDecision = normalizeDecision(dispatcherResult);
                  if (!dispatcherDecision.known) return unavailable("citation-validator-invalid-result");
                  var dispatcherDetails = dispatcherResult && typeof dispatcherResult === "object" ? dispatcherResult : {};
                  return {
                    ...dispatcherDetails,
                    valid: dispatcherDecision.valid && !dispatcherDetails.orderChanged,
                    ok: dispatcherDecision.valid && !dispatcherDetails.orderChanged,
                    beforeCount: Number(dispatcherDetails.beforeCount ?? dispatcherDetails.originalLedger?.occurrences?.length ?? beforeCountFallback),
                    afterCount: Number(dispatcherDetails.afterCount ?? dispatcherDetails.candidateLedger?.occurrences?.length ?? afterCountFallback),
                    orderChanged: !!dispatcherDetails.orderChanged
                  };
                } catch (error) {
                  return unavailable("citation-validator-error", error);
                }
              }
              var pipeline = modules?.TextPipelineHelpers;
              var pipelineValidate = pipeline?.validateCitationConservation;
              var extractLedger = pipeline?.extractCitationLedger;
              if (typeof pipelineValidate !== "function" || typeof extractLedger !== "function") {
                return unavailable("citation-validator-unavailable");
              }
              try {
                var pipelineResult = pipelineValidate(original2, candidate);
                var pipelineDecision = normalizeDecision(pipelineResult);
                if (!pipelineDecision.known) return unavailable("citation-validator-invalid-result");
                var originalOccurrences = extractLedger(original2)?.occurrences || [];
                var candidateOccurrences = extractLedger(candidate)?.occurrences || [];
                var orderChanged = originalOccurrences.length !== candidateOccurrences.length || originalOccurrences.some(function(entry, index) {
                  return entry?.key !== candidateOccurrences[index]?.key;
                });
                var pipelineDetails = pipelineResult && typeof pipelineResult === "object" ? pipelineResult : {};
                return {
                  ...pipelineDetails,
                  valid: pipelineDecision.valid && !orderChanged,
                  ok: pipelineDecision.valid && !orderChanged,
                  beforeCount: originalOccurrences.length,
                  afterCount: candidateOccurrences.length,
                  orderChanged
                };
              } catch (error) {
                return unavailable("citation-validator-error", error);
              }
            };
            var contextModule = typeof window !== "undefined" && window.AlloModules ? window.AlloModules.InstructionalContext : null;
            var ambientStandardsContext = typeof activeResolvedStandardsContext !== "undefined" ? activeResolvedStandardsContext : null;
            var ambientStandards = typeof standardsInput !== "undefined" ? standardsInput : typeof targetStandards !== "undefined" ? targetStandards : null;
            var rigorContext = contextModule && typeof contextModule.resolveArtifactContext === "function" ? contextModule.resolveArtifactContext(generatedContent, {
              grade: gradeLevel,
              language: leveledTextLanguage,
              standardsContext: ambientStandardsContext,
              standards: ambientStandards
            }) : {
              grade: generatedContent?.instructionalText?.complexity?.requestedGrade || generatedContent?.targetGradeLevel || generatedContent?.config?.grade || gradeLevel,
              language: generatedContent?.instructionalText?.complexity?.language || generatedContent?.config?.language || leveledTextLanguage || "English",
              standards: generatedContent?.config?.standardsContext || generatedContent?.config?.standards || ambientStandardsContext || ambientStandards || null
            };
            var rigorGrade = rigorContext.grade || gradeLevel;
            var rigorLanguage = rigorContext.language || leveledTextLanguage || "English";
            var rigorStandardsValue = rigorContext.standards;
            var rigorStandards = (function() {
              if (!rigorStandardsValue) return "";
              if (typeof rigorStandardsValue === "string") return rigorStandardsValue.trim();
              if (typeof rigorStandardsValue.promptText === "string" && rigorStandardsValue.promptText.trim()) {
                return rigorStandardsValue.promptText.trim();
              }
              var entries = Array.isArray(rigorStandardsValue.standards) ? rigorStandardsValue.standards : Array.isArray(rigorStandardsValue) ? rigorStandardsValue : [];
              return entries.map(function(entry) {
                return typeof entry === "string" ? entry : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(": ");
              }).filter(Boolean).join("; ");
            })().slice(0, 2400);
            var suggestion = generatedContent.alignmentCheck.improvement;
            var prompt = `
            Rewrite the following educational text to address specific feedback regarding standard alignment.
            Current Text:
            "${currentText}",
            Feedback/Suggestion to Implement:
            "${suggestion}",
            Target Audience: ${rigorGrade} students.
            ${rigorStandards ? `Standards Context: ${rigorStandards}` : ""}
            Instructions:
            - Incorporate the suggestion to increase rigor or alignment.
            - Maintain the appropriate reading level for ${rigorGrade}.
            - Preserve the disciplinary concepts and cognitive demand in the recorded standards context.
            - Write the rewritten text in ${rigorLanguage}.
            ${isLeveledText ? `- Preserve every inline Markdown citation exactly as written, including its superscript number, URL, occurrence count, and order.
            - Keep each citation attached to the same supported claim; never add, remove, duplicate, rename, reorder, or alter a citation.
            - Do not produce a Sources, References, Bibliography, or Works Cited section. AlloFlow appends the preserved reference trailer after validation.` : ""}
        `;
            var rigorTranslationChoices = typeof translationTargetChoices === "function" ? translationTargetChoices(rigorLanguage, currentUiLanguage, typeof selectedLanguages !== "undefined" ? selectedLanguages : []) : [];
            var rigorTranslationPolicy = typeof resolveTranslationPolicy === "function" ? resolveTranslationPolicy(translationMode, rigorLanguage, currentUiLanguage, rigorTranslationChoices) : {
              enabled: false,
              target: "English",
              mode: "off"
            };
            var newText = await generateBilingualText(prompt, rigorLanguage, callGemini, rigorTranslationPolicy);
            var rigorCitationAudit = null;
            if (isLeveledText) {
              var candidateParts = splitReferencesFromBody(newText);
              var candidateBody = String(candidateParts.body || "").trim();
              var candidateExtraction = extractSourceTextForProcessing(candidateBody, false);
              var candidateTarget = candidateExtraction.targetLangBlock || candidateExtraction.text;
              var originalForValidation = sourceExtraction.isBilingual ? originalParts.body : currentText;
              var candidateForValidation = sourceExtraction.isBilingual ? candidateBody : candidateTarget;
              var conservation = validateRigorCitations(originalForValidation, candidateForValidation);
              var shouldValidateGeneratedEnglish = !sourceExtraction.isBilingual && (candidateExtraction.isBilingual || String(rigorLanguage || "").trim().toLowerCase() !== "english");
              if (shouldValidateGeneratedEnglish) {
                var englishConservation = validateRigorCitations(candidateTarget, candidateExtraction.isBilingual ? candidateExtraction.englishBlock : "");
                conservation = {
                  ...conservation,
                  valid: !!conservation.valid && !!englishConservation.valid,
                  ok: !!conservation.valid && !!englishConservation.valid,
                  beforeCount: Number(conservation.beforeCount || 0) + Number(englishConservation.beforeCount || 0),
                  afterCount: Number(conservation.afterCount || 0) + Number(englishConservation.afterCount || 0),
                  orderChanged: !!conservation.orderChanged || !!englishConservation.orderChanged,
                  english: englishConservation
                };
              }
              rigorCitationAudit = {
                stage: "rigor-regeneration",
                valid: !!conservation.valid,
                beforeCount: Number(conservation.beforeCount ?? conservation.originalLedger?.occurrences?.length ?? countCitationMarkers(originalForValidation)),
                afterCount: Number(conservation.afterCount ?? conservation.candidateLedger?.occurrences?.length ?? countCitationMarkers(candidateForValidation)),
                orderChanged: !!conservation.orderChanged,
                ...conservation.reason ? {
                  reason: conservation.reason
                } : {}
              };
              if (!conservation.valid) {
                var citationError = new Error("Rigor regeneration changed or could not verify source citations.");
                citationError.code = "citation-conservation-failed";
                citationError.details = conservation;
                throw citationError;
              }
              newText = [candidateBody, originalParts.references].filter(Boolean).join("\n\n");
            }
            var priorConfig = generatedContent.config && typeof generatedContent.config === "object" ? generatedContent.config : {};
            var priorAudit = priorConfig.citationAudit && typeof priorConfig.citationAudit === "object" ? priorConfig.citationAudit : null;
            var updatedConfig = rigorCitationAudit ? {
              ...priorConfig,
              citationAudit: {
                ...priorAudit || {
                  version: 1,
                  policy: "exact-marker-order",
                  enabled: rigorCitationAudit.beforeCount > 0,
                  status: "valid",
                  fallbackCount: 0
                },
                stages: [...Array.isArray(priorAudit?.stages) ? priorAudit.stages : [], rigorCitationAudit]
              }
            } : generatedContent.config;
            var updatedContent = {
              ...generatedContent,
              data: newText,
              ...rigorCitationAudit ? {
                config: updatedConfig
              } : {}
            };
            if (isLeveledText && typeof applySimplifiedTextMutation === "function") {
              updatedContent = applySimplifiedTextMutation(updatedContent, newText);
            } else {
              delete updatedContent.localStats;
              var fallbackContextModule = typeof window !== "undefined" && window.AlloModules ? window.AlloModules.InstructionalContext : null;
              if (fallbackContextModule && typeof fallbackContextModule.getInstructionalText === "function" && typeof fallbackContextModule.invalidateComplexityEvidence === "function") {
                var baseInstructionalText = fallbackContextModule.getInstructionalText(updatedContent, {
                  complexity: {
                    requestedGrade: rigorGrade,
                    language: rigorLanguage
                  }
                });
                updatedContent.instructionalText = fallbackContextModule.invalidateComplexityEvidence(baseInstructionalText, newText, "stale");
                updatedContent.targetGradeLevel = rigorGrade;
              }
              delete updatedContent.alignmentCheck;
              if (updatedContent.levelCheck) delete updatedContent.levelCheck;
            }
            setGeneratedContent(updatedContent);
            setHistory(function(previous) {
              return previous.map(function(item) {
                return item.id === generatedContent.id ? updatedContent : item;
              });
            });
            addToast(t("alignment.notifications.regenerated_success"), "success");
          } catch (error) {
            if (error?.code === "citation-conservation-failed") {
              warnLog("[CitationConservation] Rigor regeneration rejected; original resource retained.", error.details || error);
              addToast("The rigor rewrite could not preserve and verify every source citation, so the original citation-safe version was retained.", "warning");
              return;
            }
            warnLog("Unhandled error:", error);
            setError(t("errors.text_regeneration_failed"));
            addToast(t("alignment.notifications.regen_failed"), "error");
          } finally {
            setIsProcessing(false);
          }
        }
        function simplifiedLanguageTag(language) {
          var value = String(language || "").trim();
          var names = {
            english: "en",
            spanish: "es",
            french: "fr",
            german: "de",
            italian: "it",
            portuguese: "pt",
            arabic: "ar",
            hebrew: "he",
            persian: "fa",
            urdu: "ur",
            hindi: "hi",
            bengali: "bn",
            punjabi: "pa",
            tamil: "ta",
            telugu: "te",
            marathi: "mr",
            gujarati: "gu",
            russian: "ru",
            ukrainian: "uk",
            polish: "pl",
            turkish: "tr",
            vietnamese: "vi",
            korean: "ko",
            chinese: "zh",
            "mandarin chinese": "zh",
            "simplified chinese": "zh-Hans",
            "traditional chinese": "zh-Hant",
            japanese: "ja",
            thai: "th",
            lao: "lo",
            khmer: "km",
            burmese: "my",
            indonesian: "id",
            malay: "ms",
            swahili: "sw",
            somali: "so",
            haitian: "ht",
            "haitian creole": "ht"
          };
          if (names[value.toLowerCase()]) return names[value.toLowerCase()];
          if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value)) return void 0;
          try {
            return Intl.getCanonicalLocales(value)[0];
          } catch (_) {
            return void 0;
          }
        }
        function simplifiedWordSegments(text, language) {
          var value = String(text || "");
          try {
            if (typeof Intl.Segmenter === "function") {
              return Array.from(new Intl.Segmenter(simplifiedLanguageTag(language), {
                granularity: "word"
              }).segment(value), function(part) {
                return {
                  text: part.segment,
                  word: !!part.isWordLike
                };
              });
            }
          } catch (_) {
          }
          return (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]\p{M}*|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu) || []).map(function(part) {
            return {
              text: part,
              word: /[\p{L}\p{N}]/u.test(part)
            };
          });
        }
        function simplifiedPlainInline(text) {
          return String(text || "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/\*\*|__|~~|`/g, "").replace(/\*([^*]+)\*/g, "$1");
        }
        function simplifiedInline(text, leaf) {
          return String(text || "").split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g).map(function(part, index) {
            if (/^(\*\*|__)/.test(part)) return /* @__PURE__ */ React3.createElement("strong", {
              key: index
            }, simplifiedInline(part.slice(2, -2), leaf));
            if (/^\*[^*]/.test(part)) return /* @__PURE__ */ React3.createElement("em", {
              key: index
            }, simplifiedInline(part.slice(1, -1), leaf));
            if (/^`/.test(part)) return /* @__PURE__ */ React3.createElement("code", {
              key: index
            }, part.slice(1, -1));
            var link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
            if (link) return /^(https?:\/\/|mailto:|#|\/)/i.test(link[2]) ? /* @__PURE__ */ React3.createElement("a", {
              key: index,
              href: link[2],
              target: "_blank",
              rel: "noopener noreferrer",
              className: "underline decoration-2 underline-offset-2 rounded focus-visible:ring-2 focus-visible:ring-indigo-600",
              onClick: (e) => e.stopPropagation()
            }, link[1]) : /* @__PURE__ */ React3.createElement(React3.Fragment, {
              key: index
            }, link[1]);
            return /* @__PURE__ */ React3.createElement(React3.Fragment, {
              key: index
            }, leaf(part));
          });
        }
        function simplifiedParagraphBlocks(text) {
          var lines = String(text || "").split("\n");
          var output = [], paragraph = [];
          var flush = function() {
            if (paragraph.length) output.push({
              type: "p",
              raw: paragraph.join("\n")
            });
            paragraph = [];
          };
          for (var i = 0; i < lines.length; i += 1) {
            var line = lines[i];
            var heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/) || line.match(/^\s*<h([1-6])[^>]*>(.*?)<\/h[1-6]>\s*$/i);
            var item = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
            if (heading) {
              flush();
              output.push({
                type: "heading",
                level: /^#/.test(heading[1]) ? heading[1].length : Number(heading[1]),
                raw: line,
                text: heading[2]
              });
            } else if (item) {
              flush();
              output.push({
                type: "li",
                indent: item[1].replace(/\t/g, "    ").length,
                ordered: /^\d/.test(item[2]),
                value: parseInt(item[2], 10) || 1,
                raw: line,
                text: item[3]
              });
            } else if (/^\s*>\s?/.test(line)) {
              flush();
              output.push({
                type: "quote",
                raw: line,
                text: line.replace(/^\s*>\s?/, "")
              });
            } else if (output.length && output[output.length - 1].type === "li" && /^\s+\S/.test(line)) {
              var previous = output[output.length - 1];
              previous.raw += "\n" + line;
              previous.text += "\n" + line.trimStart();
            } else {
              paragraph.push(line);
            }
          }
          flush();
          return output;
        }
        function simplifiedNestLists(blocks, renderBlock) {
          var roots = [], stack = [];
          blocks.forEach(function(block, index) {
            if (block.type !== "li") {
              stack = [];
              roots.push({
                blockRoot: block,
                index
              });
              return;
            }
            while (stack.length && (stack[stack.length - 1].indent > block.indent || stack[stack.length - 1].indent === block.indent && stack[stack.length - 1].ordered !== block.ordered)) stack.pop();
            var current = stack[stack.length - 1];
            if (!current || current.indent < block.indent) {
              var list = {
                indent: block.indent,
                ordered: block.ordered,
                start: block.value,
                items: [],
                key: index
              };
              if (current && current.items.length) current.items[current.items.length - 1].children.push(list);
              else roots.push(list);
              stack.push(list);
              current = list;
            }
            current.items.push({
              block,
              index,
              children: []
            });
          });
          var materialize = function(entry) {
            if (entry.blockRoot) return renderBlock(entry.blockRoot, entry.index);
            var Tag = entry.ordered ? "ol" : "ul";
            return /* @__PURE__ */ React3.createElement(Tag, {
              key: "list-" + entry.key,
              start: entry.ordered ? entry.start : void 0,
              className: "my-3 space-y-2",
              style: {
                paddingInlineStart: "1.6em",
                listStyleType: entry.ordered ? "decimal" : "disc"
              }
            }, entry.items.map(function(item) {
              return /* @__PURE__ */ React3.createElement("li", {
                key: item.index,
                value: entry.ordered ? item.block.value : void 0
              }, renderBlock(item.block, item.index), item.children.map(materialize));
            }));
          };
          return roots.map(materialize);
        }
        function simplifiedPopupStyle(point, widthRem) {
          var fontSize = 16;
          try {
            fontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
          } catch (_) {
          }
          var width = Math.min(widthRem * fontSize, Math.max(0, window.innerWidth - 16));
          return {
            width: width + "px",
            maxWidth: "calc(100vw - 16px)",
            left: Math.max(8, Math.min(window.innerWidth - width - 8, (Number(point.x) || 0) - 20)) + "px",
            top: Math.max(8, Math.min((window.innerHeight - 16) / 2, (Number(point.y) || 0) + 10)) + "px",
            maxHeight: "calc(50dvh - 8px)",
            overflowY: "auto",
            overflowWrap: "anywhere"
          };
        }
        function SimplifiedView(props) {
          var t = props.t;
          var simplifiedAudioEditLabel = t("common.edit") || "";
          var simplifiedAudioSaveLabel = t("common.save") || "";
          var simplifiedAudioStopLabel = t("common.stop") || "";
          var simplifiedAudioPlayLabel = t("common.play") || "";
          var simplifiedAudioPauseLabel = t("common.pause") || "";
          var simplifiedAudioLoadingLabel = t("common.loading") || "";
          var simplifiedAudioGenerateLabel = t("common.generate") || "";
          var simplifiedAudioRegenerateLabel = t("common.regenerate") || "";
          var simplifiedAudioRemoveLabel = t("common.remove") || "";
          var simplifiedAudioRecordLabel = t("word_sounds.voice_pack_tab_record") || t("common.microphone") || "";
          var simplifiedAudioSavedLabel = t("common.success") || "";
          var simplifiedAudioMissingLabel = t("simplified.missing_label") || "";
          var simplifiedAudioErrorLabel = t("common.error") || "";
          var simplifiedAudioStorageLimitLabel = t("errors.storage_full") || simplifiedAudioErrorLabel;
          var simplifiedAudioSettingsChangedLabel = t("ui_common.unsaved_changes") || simplifiedAudioErrorLabel;
          var simplifiedAudioCopiedLabel = t("common.copy") || "";
          var simplifiedAudioDiagnosticsLabel = t("common.error_analysis") || simplifiedAudioErrorLabel;
          var simplifiedActivityCompleteLabel = t("word_sounds.session_complete") || simplifiedAudioSavedLabel;
          var simplifiedReadingSelectionLabel = t("common.selection") || t("common.resource") || "";
          var simplifiedReadingThemeLabel = t("header.reading_theme_aria") || "";
          var simplifiedTeacherRecordingLabel = t("word_sounds.voice_pack_kind_teacher") || simplifiedAudioRecordLabel;
          var simplifiedStudentRecordingLabel = t("word_sounds.voice_pack_kind_student") || simplifiedAudioRecordLabel;
          var simplifiedHumanRecordingLabel = t("word_sounds.real_recording") || simplifiedAudioRecordLabel;
          var simplifiedHearPhonicsLabel = t("common.click_hear_phonics") || "";
          var simplifiedDefineLabel = t("text_tools.define") || "";
          var simplifiedReadSentenceLabel = t("common.read") || "";
          var simplifiedGeneratingMoreLabel = t("word_sounds.generating_more") || "";
          var simplifiedEnglishTranslationLabel = t("common.english_translation") || "";
          var simplifiedStopAudioDownloadLabel = t("common.audio_stop") || simplifiedAudioStopLabel;
          var generatedContent = props.generatedContent;
          var readingContract = getInstructionalContextApi();
          var protectedOriginal = getSimplifiedInstructionalText(generatedContent).form === "same-text-supported";
          var capturedSource = readingContract?.getSourceSnapshot?.(generatedContent) || null;
          var verifiedOriginal = !!readingContract?.isSupportedOriginal?.(generatedContent);
          var inputText = props.inputText;
          var gradeLevel = props.gradeLevel;
          var leveledTextLanguage = generatedContent?.config?.language || generatedContent?.instructionalText?.complexity?.language || props.leveledTextLanguage;
          var studentInterests = props.studentInterests;
          var standardsInput = props.standardsInput;
          var sourceTopic = props.sourceTopic;
          var isTeacherMode = props.isTeacherMode;
          var studentAiFeaturesHidden = !isTeacherMode && !!props.studentAiFeaturesHidden;
          var isProcessing = props.isProcessing;
          var isPlaying = props.isPlaying;
          var interactionMode = !isTeacherMode && (["revise", "add-glossary"].includes(props.interactionMode) || studentAiFeaturesHidden && props.interactionMode === "explain") ? "read" : props.interactionMode;
          var isCompareMode = !!props.isCompareMode;
          if ((protectedOriginal || isCompareMode) && interactionMode === "cloze") interactionMode = "read";
          var isFluencyMode = props.isFluencyMode;
          var isEditingLeveledText = isTeacherMode && !protectedOriginal && props.isEditingLeveledText;
          var isImmersiveReaderActive = props.isImmersiveReaderActive;
          var immersiveSettings = props.immersiveSettings;
          var immersiveRulerY = props.immersiveRulerY;
          var isFocusReaderActive = props.isFocusReaderActive;
          var isChunkReaderActive = props.isChunkReaderActive;
          var chunkReaderIdx = props.chunkReaderIdx;
          var chunkReaderAutoPlay = props.chunkReaderAutoPlay;
          var chunkReaderSpeed = props.chunkReaderSpeed;
          var chunkReaderReadAlong = props.chunkReaderReadAlong;
          var chunkReaderSweepPct = props.chunkReaderSweepPct;
          var chunkReaderMood = props.chunkReaderMood || "highlight";
          var setChunkReaderMood = props.setChunkReaderMood;
          var chunkTypewriterCharIdx = props.chunkTypewriterCharIdx || 0;
          var isCrawlReaderActive = props.isCrawlReaderActive;
          var isKaraokeOverlayActive = props.isKaraokeOverlayActive;
          var isAnalyzingPos = props.isAnalyzingPos;
          var isCheckingLevel = props.isCheckingLevel;
          var _autoLevelPref = React3.useState(function() {
            try {
              return localStorage.getItem("alloflow_auto_level_check") !== "off";
            } catch (_) {
              return true;
            }
          });
          var autoLevelCheckOn = _autoLevelPref[0];
          var setAutoLevelCheckOn = function(next) {
            _autoLevelPref[1](!!next);
            try {
              localStorage.setItem("alloflow_auto_level_check", next ? "on" : "off");
            } catch (_) {
            }
          };
          var isCheckingAlignment = props.isCheckingAlignment;
          var isLineFocusMode = props.isLineFocusMode;
          var focusedParagraphIndex = props.focusedParagraphIndex;
          var isZenMode = props.isZenMode;
          var definitionData = props.definitionData;
          var phonicsData = props.phonicsData;
          var revisionData = isTeacherMode || props.revisionData?.type === "explain" ? props.revisionData : null;
          var selectionMenu = interactionMode === props.interactionMode ? props.selectionMenu : null;
          var isCustomReviseOpen = isTeacherMode && props.isCustomReviseOpen;
          var customReviseInstruction = props.customReviseInstruction;
          var latestGlossary = props.latestGlossary;
          var history = props.history;
          var complexityLevel = props.complexityLevel;
          var saveOriginalOnAdjust = props.saveOriginalOnAdjust;
          var playbackState = props.playbackState;
          var playbackRate = props.playbackRate;
          var selectedVoice = props.selectedVoice;
          var voiceSpeed = props.voiceSpeed;
          var lineHeight = props.lineHeight;
          var letterSpacing = props.letterSpacing;
          var readingTheme = props.readingTheme;
          var theme = props.theme;
          var isTeacherToolbarExpanded = props.isTeacherToolbarExpanded;
          var downloadingContentId = props.downloadingContentId;
          var playingContentId = props.playingContentId;
          var isSimplifiedAudioDownloading = downloadingContentId === "dl-simplified-main";
          var isClozeComplete = props.isClozeComplete;
          var isSideBySide = props.isSideBySide;
          var cursorStyles = props.cursorStyles;
          var setInteractionMode = props.setInteractionMode;
          var setIsCompareMode = props.setIsCompareMode;
          var setIsFluencyMode = props.setIsFluencyMode;
          var setSelectionMenu = props.setSelectionMenu;
          var setRevisionData = props.setRevisionData;
          var setPhonicsData = props.setPhonicsData;
          var setIsImmersiveReaderActive = props.setIsImmersiveReaderActive;
          var setImmersiveSettings = props.setImmersiveSettings;
          var setImmersiveRulerY = props.setImmersiveRulerY;
          var setIsFocusReaderActive = props.setIsFocusReaderActive;
          var setIsChunkReaderActive = props.setIsChunkReaderActive;
          var setChunkReaderIdx = props.setChunkReaderIdx;
          var setChunkReaderAutoPlay = props.setChunkReaderAutoPlay;
          var setChunkReaderSpeed = props.setChunkReaderSpeed;
          var setChunkReaderReadAlong = props.setChunkReaderReadAlong;
          var setChunkReaderSweepPct = props.setChunkReaderSweepPct;
          var setIsCrawlReaderActive = props.setIsCrawlReaderActive;
          var setIsKaraokeOverlayActive = props.setIsKaraokeOverlayActive;
          var setPlaybackRate = props.setPlaybackRate;
          var setLineHeight = props.setLineHeight;
          var setLetterSpacing = props.setLetterSpacing;
          var setFocusedParagraphIndex = props.setFocusedParagraphIndex;
          var lineFocusParagraphProps = function(paragraphId) {
            var clearFocus = function() {
              setFocusedParagraphIndex((current) => current === paragraphId ? null : current);
            };
            return {
              "data-line-focus-paragraph": String(paragraphId),
              tabIndex: isLineFocusMode ? 0 : void 0,
              onFocus: function() {
                setFocusedParagraphIndex(paragraphId);
              },
              onBlur: function(event) {
                if (!event.currentTarget.contains(event.relatedTarget)) clearFocus();
              },
              onMouseEnter: function() {
                setFocusedParagraphIndex(paragraphId);
              },
              onMouseLeave: function(event) {
                if (!event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement)) clearFocus();
              }
            };
          };
          var setIsCustomReviseOpen = props.setIsCustomReviseOpen;
          var setCustomReviseInstruction = props.setCustomReviseInstruction;
          var setComplexityLevel = props.setComplexityLevel;
          var setSaveOriginalOnAdjust = props.setSaveOriginalOnAdjust;
          var setReadingTheme = props.setReadingTheme;
          var setGeneratedContent = props.setGeneratedContent;
          var setHistory = props.setHistory;
          var chunkReaderSweepAudioRef = props.chunkReaderSweepAudioRef;
          var chunkReaderSweepRafRef = props.chunkReaderSweepRafRef;
          var textEditorRef = props.textEditorRef;
          var handleCloseImmersiveReader = props.handleCloseImmersiveReader;
          var handleGeneratePOSData = props.handleGeneratePOSData;
          var handleCloseSpeedReader = props.handleCloseSpeedReader;
          var handleSpeak = props.handleSpeak;
          var handleWordClick = props.handleWordClick;
          var handlePhonicsClick = props.handlePhonicsClick;
          var handleFormatText = props.handleFormatText;
          var handleSimplifiedTextChange = props.handleSimplifiedTextChange;
          var handleReviseSelection = props.handleReviseSelection;
          var handleQuickAddGlossary = props.handleQuickAddGlossary;
          var handleDefineSelection = props.handleDefineSelection;
          var handleTextMouseUp = props.handleTextMouseUp;
          var handleSetIsSyntaxGameToTrue = props.handleSetIsSyntaxGameToTrue;
          var handleAnalyzePOS = props.handleAnalyzePOS;
          var handleCheckLevel = props.handleCheckLevel;
          var handleCheckAlignment = props.handleCheckAlignment;
          var handleDuplicateResource = props.handleDuplicateResource;
          var handleDownloadAudio = props.handleDownloadAudio;
          var handleToggleIsTeacherToolbarExpanded = props.handleToggleIsTeacherToolbarExpanded;
          var handleToggleIsEditingLeveledText = props.handleToggleIsEditingLeveledText;
          var handleSetIsCustomReviseOpenToFalse = props.handleSetIsCustomReviseOpenToFalse;
          var closeDefinition = props.closeDefinition;
          var closePhonics = props.closePhonics;
          var closeRevision = props.closeRevision;
          var handleFetchWordImage = props.handleFetchWordImage;
          var applyTextRevision = props.applyTextRevision;
          var stopPlayback = props.stopPlayback;
          var handleComplexityAdjustment = props.handleComplexityAdjustment;
          var handleRegenerateWithRigor = props.handleRegenerateWithRigor;
          var splitTextToSentences = props.splitTextToSentences;
          var getSideBySideContent = props.getSideBySideContent;
          var formatInteractiveText = props.formatInteractiveText;
          var renderFormattedText = props.renderFormattedText;
          var splitReferencesFromBody = props.splitReferencesFromBody;
          var parseReferenceItems = props.parseReferenceItems;
          var highlightGlossaryTerms = props.highlightGlossaryTerms;
          var diffWords = props.diffWords;
          var callTTS = props.callTTS;
          var copyToClipboard = props.copyToClipboard;
          var isRtlLang = props.isRtlLang;
          var getContentDirection = props.getContentDirection;
          var ImmersiveToolbar = props.ImmersiveToolbar;
          var ImmersiveWord = props.ImmersiveWord;
          var ErrorBoundary = props.ErrorBoundary;
          var FocusReaderOverlay = props.FocusReaderOverlay;
          var PerspectiveCrawlOverlay = props.PerspectiveCrawlOverlay;
          var KaraokeReaderOverlay = props.KaraokeReaderOverlay;
          var ConfettiExplosion = props.ConfettiExplosion;
          var ComplexityGauge = props.ComplexityGauge;
          var SourceReferencesPanel = props.SourceReferencesPanel;
          const _popupZ = isImmersiveReaderActive ? "z-[220]" : "z-[100]";
          const _popupBackdropZ = isImmersiveReaderActive ? "z-[210]" : "z-[90]";
          var buildSimplifiedContentParts = function(rawText) {
            var fullText = typeof rawText === "string" ? rawText : String(rawText || "");
            var split = {
              body: fullText,
              references: ""
            };
            try {
              if (typeof splitReferencesFromBody === "function") split = splitReferencesFromBody(fullText) || split;
            } catch (_) {
            }
            var normalizedBody = String(split.body || "").replace(/\r\n?/g, "\n").replace(/^[ \t]*<h([1-6])[^>]*>(.*?)<\/h[1-6]>[ \t]*$/gmi, (_match, level, text) => "#".repeat(Number(level)) + " " + text).replace(/^[ \t]*(\*{1,2})([^*\n]+?)\1[ \t]*$/gm, function(_match, _stars, inner) {
              if (/[.!?。！？؟:：]$/.test(inner.trim())) return _match;
              return "## " + inner.trim();
            });
            return {
              body: normalizedBody,
              references: String(split.references || "")
            };
          };
          var simplifiedContentParts = protectedOriginal ? {
            body: typeof generatedContent?.data === "string" ? generatedContent.data : "",
            references: ""
          } : buildSimplifiedContentParts(generatedContent && generatedContent.data);
          var simplifiedDisplayBody = simplifiedContentParts.body;
          function openReadingReflection() {
            if (!props.onReadReflect) return;
            props.onReadReflect({
              text: simplifiedDisplayBody,
              title: sourceTopic || "Adapted reading",
              language: leveledTextLanguage || "",
              anchor: {
                kind: "adapted",
                resourceId: String(generatedContent.id || sourceTopic || "adapted"),
                section: "body"
              }
            });
          }
          var simplifiedInputReferences = "";
          try {
            if (inputText && typeof splitReferencesFromBody === "function") simplifiedInputReferences = String((splitReferencesFromBody(inputText) || {}).references || "");
          } catch (_) {
          }
          var adaptedCitationAudit = generatedContent && generatedContent.config && generatedContent.config.citationAudit;
          var simplifiedReferences = resolveSimplifiedReferences(simplifiedDisplayBody, simplifiedContentParts.references, simplifiedInputReferences, adaptedCitationAudit);
          simplifiedContentParts.references = simplifiedReferences;
          var simplifiedReadAloudText = protectedOriginal ? simplifiedDisplayBody : simplifiedDisplayBody.trim();
          var ttsPrepState_state = React3.useState({
            busy: false,
            done: 0,
            total: 0
          });
          var ttsPrepState = ttsPrepState_state[0];
          var setTtsPrepState = ttsPrepState_state[1];
          var ttsPrepNoticeState = React3.useState("");
          var ttsPrepNotice = ttsPrepNoticeState[0], setTtsPrepNotice = ttsPrepNoticeState[1];
          var ttsPrepRequestRef = React3.useRef(null);
          var ttsPrepContext = JSON.stringify([generatedContent && generatedContent.id, simplifiedReadAloudText, selectedVoice, leveledTextLanguage]);
          var ttsPrepContextRef = React3.useRef(ttsPrepContext);
          ttsPrepContextRef.current = ttsPrepContext;
          React3.useEffect(function() {
            setTtsPrepNotice("");
            setTtsPrepState({
              busy: false,
              done: 0,
              total: 0
            });
            return function() {
              var request = ttsPrepRequestRef.current;
              ttsPrepRequestRef.current = null;
              if (request && request.controller) request.controller.abort();
            };
          }, [ttsPrepContext]);
          var ownsTtsPreparation = function(request) {
            return ttsPrepRequestRef.current === request && ttsPrepContextRef.current === request.context;
          };
          var saveTtsAsPlayed_state = React3.useState(function() {
            try {
              return localStorage.getItem("allo_save_karaoke_audio") !== "0";
            } catch (_) {
              return true;
            }
          });
          var saveTtsAsPlayed = saveTtsAsPlayed_state[0];
          var setSaveTtsAsPlayed = saveTtsAsPlayed_state[1];
          var ttsDiagCopied_state = React3.useState(false);
          var ttsDiagCopied = ttsDiagCopied_state[0];
          var setTtsDiagCopied = ttsDiagCopied_state[1];
          var _fallbackCopyTtsDiag = function(text) {
            try {
              var scratch = document.createElement("textarea");
              scratch.setAttribute("aria-label", "Temporary field for copying read-aloud diagnostics");
              scratch.value = text;
              scratch.setAttribute("readonly", "");
              scratch.style.position = "fixed";
              scratch.style.opacity = "0";
              document.body.appendChild(scratch);
              scratch.select();
              var ok = document.execCommand("copy");
              scratch.remove();
              return ok;
            } catch (e) {
              return false;
            }
          };
          var copyTtsDiagnostics = function() {
            var payload;
            try {
              payload = JSON.stringify({
                at: (/* @__PURE__ */ new Date()).toISOString(),
                surface: "leveled-text",
                userAgent: typeof navigator !== "undefined" ? String(navigator.userAgent || "").substring(0, 120) : "",
                flags: {
                  geminiQuotaFailed: !!window.__ttsGeminiQuotaFailed,
                  geminiAuthFailed: !!window.__ttsGeminiAuthFailed,
                  kokoroPresent: !!window._kokoroTTS,
                  kokoroReady: !!(window._kokoroTTS && window._kokoroTTS.ready),
                  sharedResolver: typeof window.__alloResolveReadAloudAudio === "function"
                },
                lastRoute: window.__ttsLastRoute || null,
                trace: (window.__alloTtsTrace || []).slice(-120)
              }, null, 2);
            } catch (e) {
              payload = "diagnostics-serialize-failed: " + String(e && e.message || e);
            }
            var done = function(ok) {
              if (!ok) return;
              setTtsDiagCopied(true);
              setTimeout(function() {
                setTtsDiagCopied(false);
              }, 2e3);
            };
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(payload).then(function() {
                  done(true);
                }, function() {
                  done(_fallbackCopyTtsDiag(payload));
                });
                return;
              }
            } catch (e) {
            }
            done(_fallbackCopyTtsDiag(payload));
          };
          var savingAudioKeys_state = React3.useState({});
          var savingAudioKeys = savingAudioKeys_state[0];
          var setSavingAudioKeys = savingAudioKeys_state[1];
          var captureAudioErrors_state = React3.useState({});
          var captureAudioErrors = captureAudioErrors_state[0];
          var setCaptureAudioErrors = captureAudioErrors_state[1];
          var regenAudioKey_state = React3.useState(null);
          var editAudioPlaybackErrors_state = React3.useState({});
          var editAudioPlaybackErrors = editAudioPlaybackErrors_state[0];
          var setEditAudioPlaybackErrors = editAudioPlaybackErrors_state[1];
          var regenAudioKey = regenAudioKey_state[0];
          var setRegenAudioKey = regenAudioKey_state[1];
          var setAudioStatusTick = React3.useState(0)[1];
          var editAudioOpen_state = React3.useState(false);
          var editAudioOpen = editAudioOpen_state[0];
          var setEditAudioOpen = editAudioOpen_state[1];
          var editAudioPlayingKey_state = React3.useState(null);
          var editAudioPlayingKey = editAudioPlayingKey_state[0];
          var setEditAudioPlayingKey = editAudioPlayingKey_state[1];
          var editAudioLoadingKey_state = React3.useState(null);
          var editAudioLoadingKey = editAudioLoadingKey_state[0];
          var setEditAudioLoadingKey = editAudioLoadingKey_state[1];
          var editAudioMicRequestKey_state = React3.useState(null);
          var editAudioMicRequestKey = editAudioMicRequestKey_state[0];
          var setEditAudioMicRequestKey = editAudioMicRequestKey_state[1];
          var editAudioRecordingKey_state = React3.useState(null);
          var editAudioRecordingKey = editAudioRecordingKey_state[0];
          var setEditAudioRecordingKey = editAudioRecordingKey_state[1];
          var editAudioRecordingSaveKey_state = React3.useState(null);
          var editAudioRecordingSaveKey = editAudioRecordingSaveKey_state[0];
          var setEditAudioRecordingSaveKey = editAudioRecordingSaveKey_state[1];
          var removeAudioKey_state = React3.useState(null);
          var removeAudioKey = removeAudioKey_state[0];
          var setRemoveAudioKey = removeAudioKey_state[1];
          var editAudioNotice_state = React3.useState("");
          var editAudioNotice = editAudioNotice_state[0];
          var setEditAudioNotice = editAudioNotice_state[1];
          var editAudioPlayerRef = React3.useRef(null);
          var editAudioPlayTokenRef = React3.useRef(0);
          var editAudioRecordTokenRef = React3.useRef(0);
          var editAudioMediaRecorderRef = React3.useRef(null);
          var editAudioMediaStreamRef = React3.useRef(null);
          var editAudioChunksRef = React3.useRef([]);
          var editAudioRecordingTimerRef = React3.useRef(null);
          var editAudioRecordingStartedAtRef = React3.useRef(0);
          var EDIT_AUDIO_MAX_RECORDING_MS = 12e4;
          var immersiveDialogRef = React3.useRef(null);
          var [immersiveToolbarBottom, setImmersiveToolbarBottom] = React3.useState(0);
          React3.useEffect(function() {
            if (!isImmersiveReaderActive || !immersiveSettings?.lineFocus) return;
            var toolbar = immersiveDialogRef.current?.querySelector("[data-immersive-toolbar]");
            var update = function() {
              var bottom = toolbar?.getBoundingClientRect().bottom || 0;
              setImmersiveToolbarBottom(bottom);
              setImmersiveRulerY((previous) => Math.max(previous, bottom + immersiveSettings.textSize * 2.5));
            };
            update();
            var observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
            if (toolbar) observer?.observe(toolbar);
            window.addEventListener("resize", update);
            return function() {
              observer?.disconnect();
              window.removeEventListener("resize", update);
            };
          }, [isImmersiveReaderActive, immersiveSettings?.lineFocus, immersiveSettings?.textSize, setImmersiveRulerY]);
          var phonicsDialogRef = React3.useRef(null);
          var phonicsCloseRef = React3.useRef(null);
          var definitionDialogRef = React3.useRef(null);
          var definitionCloseRef = React3.useRef(null);
          var revisionDialogRef = React3.useRef(null);
          var revisionCloseRef = React3.useRef(null);
          var stopEditAudioPlayback = function() {
            editAudioPlayTokenRef.current += 1;
            try {
              if (editAudioPlayerRef.current) {
                editAudioPlayerRef.current.onended = null;
                editAudioPlayerRef.current.onerror = null;
                editAudioPlayerRef.current.pause();
              }
            } catch (_) {
            }
            editAudioPlayerRef.current = null;
            setEditAudioPlayingKey(null);
            setEditAudioLoadingKey(null);
          };
          var getReadAloudAudioKey = function(sentence, identityOptions) {
            var baseKey = "";
            try {
              var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
              if (KS && typeof KS.keyFor === "function") baseKey = KS.keyFor(sentence);
            } catch (_) {
            }
            if (!baseKey) baseKey = String(sentence || "").toLowerCase().replace(/\s+/g, " ").trim();
            var occurrence = identityOptions && Number.isInteger(Number(identityOptions.occurrence)) ? Number(identityOptions.occurrence) : 0;
            return baseKey ? baseKey + "\u241F" + occurrence : "";
          };
          var updateEditAudioPlaybackIssue = function(sentence, issue, identityOptions) {
            var audioKey = getReadAloudAudioKey(sentence, identityOptions);
            if (!audioKey) return;
            setEditAudioPlaybackErrors(function(prev) {
              var next = Object.assign({}, prev);
              if (issue) next[audioKey] = issue;
              else delete next[audioKey];
              return next;
            });
          };
          var reportEditAudioPlaybackFailure = function(sentence, sentenceNumber, error, identityOptions) {
            if (error && error.name === "NotAllowedError") {
              setEditAudioNotice("Audio playback was blocked. Press Play again.");
              return;
            }
            updateEditAudioPlaybackIssue(sentence, {
              code: error && error.name ? error.name : "playback-failed",
              reason: "The saved audio could not be decoded or loaded."
            }, identityOptions);
            setEditAudioNotice("Saved audio for sentence " + sentenceNumber + " could not be played. Rebuild or replace it.");
          };
          var setSaveTtsAsPlayedEnabled = function(value) {
            var next = !!value;
            setSaveTtsAsPlayed(next);
            try {
              localStorage.setItem("allo_save_karaoke_audio", next ? "1" : "0");
            } catch (_) {
            }
          };
          React3.useEffect(function() {
            if (typeof window === "undefined") return;
            var onAudioUpdate = function() {
              setAudioStatusTick(function(n) {
                return n + 1;
              });
            };
            var onAudioCapture = function(event) {
              var detail = event && event.detail ? event.detail : {};
              if (generatedContent && generatedContent.id && detail.resourceId && detail.resourceId !== generatedContent.id) return;
              var key = getReadAloudAudioKey(detail.sentence, detail);
              if (!key) return;
              if (detail.status === "saving") {
                setSavingAudioKeys(function(prev) {
                  return Object.assign({}, prev, {
                    [key]: true
                  });
                });
                setCaptureAudioErrors(function(prev) {
                  var next = Object.assign({}, prev);
                  delete next[key];
                  return next;
                });
              } else {
                setSavingAudioKeys(function(prev) {
                  var next = Object.assign({}, prev);
                  delete next[key];
                  return next;
                });
                setCaptureAudioErrors(function(prev) {
                  var next = Object.assign({}, prev);
                  if (detail.status === "error" || detail.status === "limit") {
                    next[key] = {
                      status: detail.status,
                      code: detail.code || "capture-failed",
                      reason: detail.reason || "Played TTS could not be saved."
                    };
                  } else {
                    delete next[key];
                  }
                  return next;
                });
                if (detail.status === "error" || detail.status === "limit") {
                  setEditAudioNotice(detail.reason || "Played TTS could not be saved. Generate that sentence again to retry.");
                } else {
                  updateEditAudioPlaybackIssue(detail.sentence, null, detail);
                }
                setAudioStatusTick(function(n) {
                  return n + 1;
                });
              }
            };
            window.addEventListener("alloflow:karaoke-audio-updated", onAudioUpdate);
            window.addEventListener("alloflow:karaoke-audio-capture", onAudioCapture);
            return function() {
              window.removeEventListener("alloflow:karaoke-audio-updated", onAudioUpdate);
              window.removeEventListener("alloflow:karaoke-audio-capture", onAudioCapture);
            };
          }, [generatedContent && generatedContent.id]);
          React3.useEffect(function() {
            setSavingAudioKeys({});
            setCaptureAudioErrors({});
            setEditAudioPlaybackErrors({});
          }, [generatedContent && generatedContent.id]);
          React3.useEffect(function() {
            if (isEditingLeveledText) return;
            setEditAudioOpen(false);
            stopEditAudioPlayback();
            editAudioRecordTokenRef.current += 1;
            var recorder = editAudioMediaRecorderRef.current;
            try {
              if (recorder && recorder.state !== "inactive") recorder.stop();
            } catch (_) {
            }
          }, [isEditingLeveledText]);
          React3.useEffect(function() {
            setEditAudioOpen(false);
            stopEditAudioPlayback();
            setEditAudioMicRequestKey(null);
            setEditAudioRecordingKey(null);
            setEditAudioRecordingSaveKey(null);
            setRemoveAudioKey(null);
            setEditAudioNotice("");
            return function() {
              editAudioPlayTokenRef.current += 1;
              editAudioRecordTokenRef.current += 1;
              try {
                if (editAudioPlayerRef.current) {
                  editAudioPlayerRef.current.onended = null;
                  editAudioPlayerRef.current.onerror = null;
                  editAudioPlayerRef.current.pause();
                }
              } catch (_) {
              }
              editAudioPlayerRef.current = null;
              if (editAudioRecordingTimerRef.current) clearTimeout(editAudioRecordingTimerRef.current);
              editAudioRecordingTimerRef.current = null;
              var recorder = editAudioMediaRecorderRef.current;
              try {
                if (recorder && recorder.state !== "inactive") {
                  recorder.onstop = null;
                  recorder.stop();
                }
              } catch (_) {
              }
              editAudioMediaRecorderRef.current = null;
              var stream = editAudioMediaStreamRef.current;
              try {
                if (stream) stream.getTracks().forEach(function(track) {
                  track.stop();
                });
              } catch (_) {
              }
              editAudioMediaStreamRef.current = null;
              editAudioChunksRef.current = [];
            };
          }, [generatedContent && generatedContent.id]);
          var cleanSentenceForAudio = function(sentence) {
            try {
              var _pk = window.AlloModules && window.AlloModules.PhaseKHelpers;
              if (_pk && typeof _pk.toSpokenText === "function") return _pk.toSpokenText(sentence);
            } catch (_) {
            }
            return String(sentence || "").replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1").replace(/\[?⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]?/g, "").replace(/\[Source\s+\d+\]/gi, "").replace(/\[\d+\]/g, "").replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/__|_/g, "").replace(/~~/g, "").replace(/`/g, "").replace(/^>\s?/gm, "").replace(/^[-*+]\s/gm, "").replace(/^\d+\.\s/gm, "").replace(/\s+/g, " ").trim();
          };
          var getReadAloudStore = function() {
            try {
              return window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
            } catch (_) {
              return null;
            }
          };
          var getStoredReadAloudAudioUrl = function(sentence, identityOptions) {
            try {
              var sharedInspect = typeof window !== "undefined" && window.__alloInspectReadAloudAudio;
              if (typeof sharedInspect === "function") {
                var inspection = sharedInspect(sentence, "reference", identityOptions);
                if (inspection && inspection.storedUrl) return inspection.storedUrl;
                if (inspection && inspection.status === "ready" && inspection.url) return inspection.url;
              }
            } catch (_) {
            }
            var st = getReadAloudStore();
            try {
              return st && typeof st.get === "function" ? st.get(sentence, identityOptions || {}) : null;
            } catch (_) {
              return null;
            }
          };
          var karaokeCallTTSRef = React3.useRef(callTTS);
          karaokeCallTTSRef.current = callTTS;
          var getKaraokeAudioUrl = React3.useCallback(function(sentenceText, requestOptions) {
            var voice = selectedVoice || typeof window !== "undefined" && window.__alloSelectedVoice || "Kore";
            var speed = typeof voiceSpeed === "number" && voiceSpeed > 0 ? voiceSpeed : 1;
            var language = leveledTextLanguage || "English";
            var options = Object.assign({
              language,
              maxRetries: 1,
              priority: "interactive"
            }, requestOptions || {});
            options.language = language;
            options.profile = Object.assign({}, options.profile || {}, {
              voice,
              speed,
              synthesisRate: speed,
              language,
              voiceResolverVersion: 2
            });
            try {
              var sharedResolver = typeof window !== "undefined" && window.__alloResolveReadAloudAudio;
              if (typeof sharedResolver === "function") {
                return Promise.resolve(sharedResolver(sentenceText, options)).catch(function() {
                  return null;
                });
              }
            } catch (_) {
            }
            try {
              var st = window.AlloModules && window.AlloModules.KaraokeAudioStore && window.AlloModules.KaraokeAudioStore.current;
              if (st) {
                if (typeof st.getCompatible === "function") {
                  var compatibleUrl = st.getCompatible(sentenceText, {
                    voice,
                    speed,
                    language
                  });
                  if (compatibleUrl) return Promise.resolve(compatibleUrl);
                } else {
                  var storedUrl = st.get(sentenceText);
                  if (storedUrl) return Promise.resolve(storedUrl);
                }
              }
            } catch (_) {
            }
            var resolver = karaokeCallTTSRef.current;
            if (typeof resolver !== "function") return Promise.resolve(null);
            return Promise.resolve(resolver(sentenceText, voice, speed, options, language)).catch(function() {
              return null;
            });
          }, [selectedVoice, voiceSpeed, leveledTextLanguage]);
          var getReadAloudAudioProvenance = function(sentence, identityOptions) {
            var inspection = null;
            try {
              var sharedInspect = typeof window !== "undefined" && window.__alloInspectReadAloudAudio;
              if (typeof sharedInspect === "function") inspection = sharedInspect(sentence, "reference", identityOptions);
            } catch (_) {
            }
            var st = getReadAloudStore();
            var source2 = inspection && inspection.source != null ? inspection.source : null;
            var metadata = inspection && inspection.metadata ? inspection.metadata : null;
            if (!inspection) {
              try {
                if (st && typeof st.sourceOf === "function") source2 = st.sourceOf(sentence, identityOptions || {});
                if (st && typeof st.metadataOf === "function") metadata = st.metadataOf(sentence, identityOptions || {});
              } catch (_) {
              }
            }
            if (source2 === "human-teacher") return {
              source: source2,
              label: simplifiedTeacherRecordingLabel,
              metadata,
              stale: false
            };
            if (source2 === "human-student") return {
              source: source2,
              label: simplifiedStudentRecordingLabel,
              metadata,
              stale: false
            };
            if (source2 && String(source2).indexOf("human") === 0) return {
              source: source2,
              label: simplifiedHumanRecordingLabel,
              metadata,
              stale: false
            };
            var currentVoice = selectedVoice || typeof window !== "undefined" && window.__alloSelectedVoice || "Kore";
            var currentSpeed = typeof voiceSpeed === "number" && voiceSpeed > 0 ? voiceSpeed : 1;
            var currentLanguage = identityOptions && identityOptions.language ? identityOptions.language : leveledTextLanguage || "English";
            var stale = inspection ? inspection.status === "stale" : !metadata || Number(metadata.voiceResolverVersion) !== 2 || !!(metadata.voice && String(metadata.voice).toLowerCase() !== String(currentVoice).toLowerCase() || metadata.speed && Math.abs(Number(metadata.speed) - currentSpeed) > 1e-3 || metadata.language && String(metadata.language).toLowerCase() !== String(currentLanguage).toLowerCase());
            var details = ["AI voice"];
            if (metadata && metadata.voice) details.push(metadata.voice);
            if (metadata && metadata.speed) details.push(Number(metadata.speed) + "\xD7");
            if (metadata && metadata.language) details.push(metadata.language);
            return {
              source: source2 || "ai",
              label: details.join(" \xB7 "),
              metadata,
              stale
            };
          };
          var hasStoredReadAloudAudio = function(sentence, identityOptions) {
            try {
              var sharedInspect = typeof window !== "undefined" && window.__alloInspectReadAloudAudio;
              if (typeof sharedInspect === "function") {
                var inspection = sharedInspect(sentence, "reference", identityOptions);
                if (inspection && inspection.status) return inspection.status === "ready" || inspection.status === "stale";
              }
            } catch (_) {
            }
            var st = getReadAloudStore();
            try {
              return !!(st && st.has(sentence, identityOptions || {}));
            } catch (_) {
              return false;
            }
          };
          var getReadAloudIdentityOptions = function(entry) {
            var language = entry && entry.language ? entry.language : leveledTextLanguage || "English";
            var speed = typeof voiceSpeed === "number" && voiceSpeed > 0 ? voiceSpeed : 1;
            var voice = selectedVoice || typeof window !== "undefined" && window.__alloSelectedVoice || "Kore";
            return {
              occurrence: entry && Number.isInteger(Number(entry.occurrence)) ? Number(entry.occurrence) : 0,
              identity: entry && entry.identity ? entry.identity : null,
              language,
              profile: {
                voice,
                speed,
                synthesisRate: speed,
                language,
                voiceResolverVersion: 2
              }
            };
          };
          var getReadAloudAudioSummary = function(sentences) {
            var list = Array.isArray(sentences) ? sentences : [];
            var entries = list.map(function(item, index) {
              return item && typeof item === "object" ? item : {
                text: String(item || ""),
                occurrence: 0,
                identity: "legacy:" + index
              };
            });
            var sharedSummary = null;
            try {
              var summaryResolver = typeof window !== "undefined" && window.__alloGetReadAloudAudioSummary;
              if (typeof summaryResolver === "function") {
                sharedSummary = summaryResolver(entries.map(function(entry) {
                  return entry.text;
                }), "reference", {
                  entries
                });
              }
            } catch (_) {
            }
            var saved = sharedSummary ? Number(sharedSummary.ready || 0) + Number(sharedSummary.stale || 0) : entries.reduce(function(n, entry) {
              return n + (hasStoredReadAloudAudio(entry.text, getReadAloudIdentityOptions(entry)) ? 1 : 0);
            }, 0);
            var bytes = sharedSummary ? Number(sharedSummary.estimatedBytes || 0) : 0;
            var maxBytes = 0;
            try {
              var st = getReadAloudStore();
              if (!sharedSummary && st && typeof st.estimateBytes === "function") bytes = st.estimateBytes();
              if (st && typeof st.limits === "function") maxBytes = st.limits().maxBytes || 0;
            } catch (_) {
            }
            return {
              saved,
              total: entries.length,
              bytes,
              maxBytes
            };
          };
          var getReadAloudSentenceEntriesForText = function(rawText) {
            var text = typeof rawText === "string" ? rawText : String(rawText || "");
            var isTableText = function(p) {
              return p.trim().startsWith("|") || p.indexOf("\n|") !== -1;
            };
            var splitForReadAloud = function(part) {
              try {
                var KS = window.AlloModules && window.AlloModules.KaraokeAudioStore;
                if (KS && typeof KS.splitSentences === "function") return KS.splitSentences(part);
              } catch (_) {
              }
              return splitTextToSentences(part);
            };
            var splitBlock = function(block) {
              return String(block || "").split(/\n{2,}/).flatMap(function(p) {
                return isTableText(p) ? [] : splitForReadAloud(p);
              });
            };
            var parts = getSideBySideContent(text);
            var sourceList = [];
            var targetList = [];
            if (parts) {
              sourceList = parts.source.flatMap(function(p) {
                return isTableText(p) ? [] : splitForReadAloud(p);
              });
              targetList = parts.target.flatMap(function(p) {
                return isTableText(p) ? [] : splitForReadAloud(p);
              });
            } else {
              var marker = "--- ENGLISH TRANSLATION ---";
              var markerIndex = text.indexOf(marker);
              if (markerIndex >= 0) {
                sourceList = splitBlock(text.slice(0, markerIndex));
                targetList = splitBlock(text.slice(markerIndex + marker.length));
              } else {
                sourceList = splitBlock(text);
              }
            }
            var counts = /* @__PURE__ */ new Map();
            var makeEntries = function(list, language, scope) {
              return list.map(function(sentence, index) {
                var cleaned = cleanSentenceForAudio(sentence);
                if (!cleaned || !cleaned.trim()) return null;
                var countKey = cleaned;
                var occurrence = counts.get(countKey) || 0;
                counts.set(countKey, occurrence + 1);
                return {
                  text: cleaned,
                  language: language || "English",
                  occurrence,
                  identity: scope + ":" + index + ":" + occurrence
                };
              }).filter(Boolean);
            };
            return makeEntries(sourceList, leveledTextLanguage || "English", "source").concat(makeEntries(targetList, "English", "target"));
          };
          var getReadAloudSentencesForText = function(rawText) {
            return getReadAloudSentenceEntriesForText(rawText).map(function(entry) {
              return entry.text;
            });
          };
          var karaokeReaderSentences = React3.useMemo(function() {
            return getReadAloudSentencesForText(simplifiedReadAloudText);
          }, [generatedContent && generatedContent.data]);
          var activeReadAloudStatus = React3.useMemo(function() {
            if (!isPlaying || playingContentId && playingContentId !== "simplified-main") return "";
            var currentIndex = playbackState && Number(playbackState.currentIdx);
            if (!Number.isInteger(currentIndex) || currentIndex < 0) return "";
            var stateSentences = playbackState && Array.isArray(playbackState.sentences) ? playbackState.sentences : karaokeReaderSentences;
            var currentSentence = stateSentences[currentIndex];
            if (!currentSentence) return "";
            return "Reading sentence " + (currentIndex + 1) + ": " + String(currentSentence);
          }, [isPlaying, playingContentId, playbackState && playbackState.currentIdx, playbackState && playbackState.sentences, karaokeReaderSentences]);
          var handlePrepareReadAloudAudio = async function() {
            if (ttsPrepRequestRef.current) return;
            if (typeof window.__alloPrepareReadAloud !== "function") {
              setTtsPrepNotice("Audio tools are still loading. Please try again.");
              return;
            }
            var entries = getReadAloudSentenceEntriesForText(simplifiedReadAloudText);
            var sentences = entries.map(function(entry) {
              return entry.text;
            });
            if (!sentences.length) return;
            var request = {
              context: ttsPrepContext,
              controller: typeof AbortController === "function" ? new AbortController() : null
            };
            ttsPrepRequestRef.current = request;
            setTtsPrepNotice("");
            setTtsPrepState({
              busy: true,
              done: 0,
              total: sentences.length
            });
            try {
              var result = await window.__alloPrepareReadAloud(sentences, function(done, total) {
                if (ownsTtsPreparation(request)) setTtsPrepState({
                  busy: true,
                  done,
                  total: total || sentences.length
                });
              }, {
                entries,
                signal: request.controller && request.controller.signal
              });
              if (!ownsTtsPreparation(request)) return;
              if (result && result.remaining) {
                setTtsPrepNotice(result.failure && result.failure.reason || result.remaining + " sentence audio clips remain. Run Save TTS again to retry only missing clips.");
              } else if (result && result.ok) {
                setTtsPrepNotice("Read-aloud audio is saved for all sentences.");
              }
            } catch (_) {
              if (ownsTtsPreparation(request)) setTtsPrepNotice(request.controller && request.controller.signal.aborted ? "Audio saving stopped. Save TTS again to finish any missing clips." : "Audio could not be saved. Please try again.");
            } finally {
              if (ownsTtsPreparation(request)) {
                ttsPrepRequestRef.current = null;
                setTtsPrepState({
                  busy: false,
                  done: 0,
                  total: 0
                });
              }
            }
          };
          var handleRegenerateReadAloudSentence = async function(sentence, key, sentenceNumber, identityOptions) {
            if (!sentence || regenAudioKey) return;
            if (typeof window.__alloRegenerateSentenceAudio !== "function") {
              setEditAudioNotice("Sentence audio tools are still loading. Please try again.");
              return;
            }
            var wasSaved = hasStoredReadAloudAudio(sentence, identityOptions);
            if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
            setRegenAudioKey(key);
            setEditAudioNotice((wasSaved ? "Regenerating" : "Generating") + " sentence " + sentenceNumber + " audio...");
            try {
              var url = await window.__alloRegenerateSentenceAudio(sentence, identityOptions || {});
              if (!url) throw new Error("No audio was returned");
              updateEditAudioPlaybackIssue(sentence, null, identityOptions);
              setAudioStatusTick(function(n) {
                return n + 1;
              });
              setEditAudioNotice((wasSaved ? "Regenerated" : "Generated") + " audio for sentence " + sentenceNumber + ".");
            } catch (_) {
              setEditAudioNotice("Could not generate audio for sentence " + sentenceNumber + ". Please try again.");
            } finally {
              setRegenAudioKey(null);
            }
          };
          var handlePlayEditAudioSentence = async function(sentence, key, sentenceNumber, identityOptions) {
            if (!sentence || editAudioLoadingKey) return;
            var current = editAudioPlayerRef.current;
            if (current && current._alloSentenceKey === key) {
              if (!current.paused) {
                try {
                  current.pause();
                } catch (_) {
                }
                setEditAudioPlayingKey(null);
                setEditAudioNotice("Paused sentence " + sentenceNumber + ".");
                return;
              }
              try {
                if (isFinite(current.duration) && current.currentTime >= current.duration) current.currentTime = 0;
                await current.play();
                updateEditAudioPlaybackIssue(sentence, null, identityOptions);
                setEditAudioPlayingKey(key);
                setEditAudioNotice("Playing sentence " + sentenceNumber + ".");
              } catch (error) {
                reportEditAudioPlaybackFailure(sentence, sentenceNumber, error, identityOptions);
              }
              return;
            }
            if (!hasStoredReadAloudAudio(sentence, identityOptions)) {
              setEditAudioNotice("Generate or record audio for sentence " + sentenceNumber + " before playing it.");
              return;
            }
            stopEditAudioPlayback();
            var token = ++editAudioPlayTokenRef.current;
            setEditAudioLoadingKey(key);
            setEditAudioNotice("Loading sentence " + sentenceNumber + " audio...");
            try {
              var url = getStoredReadAloudAudioUrl(sentence, identityOptions);
              if (token !== editAudioPlayTokenRef.current) return;
              if (!url) throw new Error("No saved audio URL");
              var audio = new Audio(url);
              audio._alloSentenceKey = key;
              audio.preload = "auto";
              audio.playbackRate = 1;
              audio.onended = function() {
                if (editAudioPlayerRef.current === audio) {
                  setEditAudioPlayingKey(null);
                  setEditAudioNotice("Finished sentence " + sentenceNumber + ".");
                }
              };
              audio.onerror = function() {
                if (editAudioPlayerRef.current === audio) {
                  editAudioPlayerRef.current = null;
                  setEditAudioPlayingKey(null);
                  reportEditAudioPlaybackFailure(sentence, sentenceNumber, audio.error, identityOptions);
                }
              };
              editAudioPlayerRef.current = audio;
              await audio.play();
              if (token !== editAudioPlayTokenRef.current) {
                try {
                  audio.pause();
                } catch (_) {
                }
                return;
              }
              updateEditAudioPlaybackIssue(sentence, null, identityOptions);
              setEditAudioPlayingKey(key);
              setEditAudioNotice("Playing sentence " + sentenceNumber + ".");
            } catch (error) {
              if (token === editAudioPlayTokenRef.current) {
                editAudioPlayerRef.current = null;
                setEditAudioPlayingKey(null);
                reportEditAudioPlaybackFailure(sentence, sentenceNumber, error, identityOptions);
              }
            } finally {
              if (token === editAudioPlayTokenRef.current) setEditAudioLoadingKey(null);
            }
          };
          var releaseEditAudioStream = function() {
            if (editAudioRecordingTimerRef.current) clearTimeout(editAudioRecordingTimerRef.current);
            editAudioRecordingTimerRef.current = null;
            var stream = editAudioMediaStreamRef.current;
            try {
              if (stream) stream.getTracks().forEach(function(track) {
                track.stop();
              });
            } catch (_) {
            }
            editAudioMediaStreamRef.current = null;
          };
          var handleRecordEditAudioSentence = async function(sentence, key, sentenceNumber, identityOptions) {
            var activeRecorder = editAudioMediaRecorderRef.current;
            if (activeRecorder && activeRecorder._alloSentenceKey === key && activeRecorder.state !== "inactive") {
              try {
                activeRecorder.stop();
                setEditAudioNotice("Finishing the recording for sentence " + sentenceNumber + "...");
              } catch (_) {
              }
              return;
            }
            if (!sentence || editAudioRecordingKey || editAudioMicRequestKey || editAudioRecordingSaveKey) return;
            if (typeof window.__alloStoreRecordedSentenceAudio !== "function") {
              setEditAudioNotice("Recorded-audio storage is still loading. Please try again.");
              return;
            }
            if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function" || typeof window.MediaRecorder === "undefined") {
              setEditAudioNotice("Microphone recording is not supported in this browser.");
              return;
            }
            stopEditAudioPlayback();
            var requestToken = ++editAudioRecordTokenRef.current;
            setEditAudioMicRequestKey(key);
            setEditAudioNotice("Opening the microphone for sentence " + sentenceNumber + "...");
            var stream = null;
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: true
              });
              if (requestToken !== editAudioRecordTokenRef.current) {
                try {
                  stream.getTracks().forEach(function(track) {
                    track.stop();
                  });
                } catch (_) {
                }
                return;
              }
              editAudioMediaStreamRef.current = stream;
              var MediaRecorderCtor = window.MediaRecorder;
              var preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
              var mimeType = "";
              if (typeof MediaRecorderCtor.isTypeSupported === "function") {
                for (var typeIdx = 0; typeIdx < preferredTypes.length; typeIdx++) {
                  if (MediaRecorderCtor.isTypeSupported(preferredTypes[typeIdx])) {
                    mimeType = preferredTypes[typeIdx];
                    break;
                  }
                }
              }
              var recorder = mimeType ? new MediaRecorderCtor(stream, {
                mimeType
              }) : new MediaRecorderCtor(stream);
              recorder._alloSentenceKey = key;
              editAudioChunksRef.current = [];
              recorder.ondataavailable = function(event) {
                if (event && event.data && event.data.size > 0) editAudioChunksRef.current.push(event.data);
              };
              recorder.onerror = function() {
                recorder._alloFailed = true;
                editAudioChunksRef.current = [];
                if (editAudioMediaRecorderRef.current === recorder) editAudioMediaRecorderRef.current = null;
                releaseEditAudioStream();
                setEditAudioMicRequestKey(null);
                setEditAudioRecordingKey(null);
                setEditAudioRecordingSaveKey(null);
                setEditAudioNotice("The microphone stopped unexpectedly. Please record sentence " + sentenceNumber + " again.");
              };
              recorder.onstop = async function() {
                var chunks = editAudioChunksRef.current.slice();
                editAudioChunksRef.current = [];
                if (editAudioMediaRecorderRef.current === recorder) editAudioMediaRecorderRef.current = null;
                releaseEditAudioStream();
                setEditAudioRecordingKey(null);
                var durationMs = Math.max(0, Date.now() - (recorder._alloStartedAt || editAudioRecordingStartedAtRef.current || Date.now()));
                if (recorder._alloFailed) return;
                if (!chunks.length) {
                  setEditAudioNotice("No audio was captured for sentence " + sentenceNumber + ".");
                  return;
                }
                var recordedBlob = new Blob(chunks, {
                  type: recorder.mimeType || mimeType || "audio/webm"
                });
                setEditAudioRecordingSaveKey(key);
                setEditAudioNotice("Saving the teacher recording for sentence " + sentenceNumber + " as MP3...");
                try {
                  var saved = await window.__alloStoreRecordedSentenceAudio(sentence, recordedBlob, "human-teacher", Object.assign({}, identityOptions || {}, {
                    durationMs
                  }));
                  if (saved === false) throw new Error("Recording was not saved");
                  setAudioStatusTick(function(n) {
                    return n + 1;
                  });
                  updateEditAudioPlaybackIssue(sentence, null, identityOptions);
                  setEditAudioNotice("Teacher recording saved for sentence " + sentenceNumber + ".");
                } catch (_) {
                  setEditAudioNotice("Could not save the recording for sentence " + sentenceNumber + ". Please try again.");
                } finally {
                  setEditAudioRecordingSaveKey(null);
                }
              };
              editAudioMediaRecorderRef.current = recorder;
              recorder._alloFailed = false;
              recorder._alloStartedAt = Date.now();
              editAudioRecordingStartedAtRef.current = recorder._alloStartedAt;
              recorder.start(250);
              editAudioRecordingTimerRef.current = setTimeout(function() {
                if (editAudioMediaRecorderRef.current === recorder && recorder.state !== "inactive") {
                  setEditAudioNotice("The two-minute recording limit was reached. Finishing sentence " + sentenceNumber + "...");
                  try {
                    recorder.stop();
                  } catch (_) {
                    recorder.onerror();
                  }
                }
              }, EDIT_AUDIO_MAX_RECORDING_MS);
              setEditAudioMicRequestKey(null);
              setEditAudioRecordingKey(key);
              setEditAudioNotice("Recording sentence " + sentenceNumber + ". Press Stop when finished.");
            } catch (_) {
              editAudioMediaRecorderRef.current = null;
              editAudioChunksRef.current = [];
              releaseEditAudioStream();
              if (stream) {
                try {
                  stream.getTracks().forEach(function(track) {
                    track.stop();
                  });
                } catch (_err) {
                }
              }
              if (requestToken === editAudioRecordTokenRef.current) {
                setEditAudioMicRequestKey(null);
                setEditAudioRecordingKey(null);
                setEditAudioNotice("Microphone access was not available. Check permission and try again.");
              }
            }
          };
          var handleRemoveReadAloudSentence = async function(sentence, key, sentenceNumber, identityOptions) {
            if (!sentence || removeAudioKey) return;
            if (typeof window.__alloRemoveSentenceAudio !== "function") {
              setEditAudioNotice("Sentence audio removal is still loading. Please try again.");
              return;
            }
            if (editAudioPlayerRef.current && editAudioPlayerRef.current._alloSentenceKey === key) stopEditAudioPlayback();
            setRemoveAudioKey(key);
            setEditAudioNotice("Removing saved audio for sentence " + sentenceNumber + "...");
            try {
              var removed = await window.__alloRemoveSentenceAudio(sentence, identityOptions || {});
              if (removed === false) throw new Error("Audio was not removed");
              setAudioStatusTick(function(n) {
                return n + 1;
              });
              updateEditAudioPlaybackIssue(sentence, null, identityOptions);
              setEditAudioNotice("Saved audio removed from sentence " + sentenceNumber + ".");
            } catch (_) {
              setEditAudioNotice("Could not remove the audio for sentence " + sentenceNumber + ".");
            } finally {
              setRemoveAudioKey(null);
            }
          };
          var handleToggleEditAudioPanel = function() {
            var next = !editAudioOpen;
            if (!next) {
              stopEditAudioPlayback();
              editAudioRecordTokenRef.current += 1;
              setEditAudioMicRequestKey(null);
              var recorder = editAudioMediaRecorderRef.current;
              try {
                if (recorder && recorder.state !== "inactive") recorder.stop();
              } catch (_) {
              }
            }
            setEditAudioOpen(next);
          };
          var helpAudioRef = React3.useRef(null);
          var helpAudioTokenRef = React3.useRef(0);
          var [helpAudioState, setHelpAudioState] = React3.useState({
            key: null,
            status: "idle"
          });
          var releaseHelpUrl = function(url) {
            if (typeof url === "string" && url.startsWith("blob:") && !(typeof window.__alloTtsCacheOwnsUrl === "function" && window.__alloTtsCacheOwnsUrl(url))) {
              try {
                URL.revokeObjectURL(url);
              } catch (_) {
              }
            }
          };
          var stopHelpAudio = function(reset) {
            helpAudioTokenRef.current += 1;
            var current = helpAudioRef.current;
            helpAudioRef.current = null;
            if (current?.audio) {
              current.audio.onended = null;
              current.audio.onerror = null;
              current.audio.pause();
            }
            if (current?.ownedUrl) releaseHelpUrl(current.ownedUrl);
            if (reset !== false) setHelpAudioState({
              key: null,
              status: "idle"
            });
          };
          var playHelpAudio = async function(key, recordingUrl, word, language) {
            if (helpAudioRef.current?.key === key) {
              stopHelpAudio();
              return;
            }
            stopHelpAudio();
            if (typeof stopPlayback === "function") stopPlayback();
            var token = helpAudioTokenRef.current;
            var current = {
              key,
              audio: null,
              ownedUrl: null
            };
            helpAudioRef.current = current;
            setHelpAudioState({
              key,
              status: "loading"
            });
            try {
              var url = recordingUrl || await callTTS(word, selectedVoice, voiceSpeed || 1, 2, language || generatedContent?.config?.language || leveledTextLanguage || "English");
              if (token !== helpAudioTokenRef.current) {
                if (!recordingUrl) releaseHelpUrl(url);
                return;
              }
              if (!url) throw new Error("No pronunciation audio");
              if (!recordingUrl) current.ownedUrl = url;
              var audio = new Audio(url);
              current.audio = audio;
              audio.playbackRate = voiceSpeed || 1;
              var fail = function() {
                if (token !== helpAudioTokenRef.current) return;
                stopHelpAudio(false);
                setHelpAudioState({
                  key,
                  status: "error"
                });
              };
              audio.onended = function() {
                if (token === helpAudioTokenRef.current) stopHelpAudio();
              };
              audio.onerror = fail;
              await audio.play();
              if (token === helpAudioTokenRef.current) setHelpAudioState({
                key,
                status: "playing"
              });
            } catch (_) {
              if (token === helpAudioTokenRef.current) {
                stopHelpAudio(false);
                setHelpAudioState({
                  key,
                  status: "error"
                });
              }
            }
          };
          React3.useEffect(function() {
            setHelpAudioState({
              key: null,
              status: "idle"
            });
            return function() {
              stopHelpAudio(false);
            };
          }, [phonicsData?.word, definitionData?.word, generatedContent?.id, generatedContent?.data, interactionMode]);
          React3.useEffect(function() {
            if (isPlaying && helpAudioRef.current) stopHelpAudio();
          }, [isPlaying, playingContentId]);
          var helpText = function(key, fallback) {
            var value = t(key);
            return value && value !== key ? value : fallback;
          };
          var renderHelpAudioButton = function(key, recordingUrl, word, language) {
            var current = helpAudioState.key === key;
            var active = current && (helpAudioState.status === "loading" || helpAudioState.status === "playing");
            var label = active ? helpText("simplified.word_audio_stop", "Stop audio") : current && helpAudioState.status === "error" ? helpText("simplified.word_audio_retry", "Try audio again") : recordingUrl ? helpText("simplified.word_recording", "Hear recording") : helpText("simplified.word_audio_listen", "Hear word");
            return /* @__PURE__ */ React3.createElement("button", {
              key,
              type: "button",
              "data-word-help-audio": key,
              "aria-label": label,
              onClick: () => playHelpAudio(key, recordingUrl, word, language),
              className: "min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            }, active ? /* @__PURE__ */ React3.createElement(StopCircle, {
              size: 16,
              "aria-hidden": "true"
            }) : /* @__PURE__ */ React3.createElement(Volume2, {
              size: 16,
              "aria-hidden": "true"
            }), /* @__PURE__ */ React3.createElement("span", null, label));
          };
          var renderHelpAudioNotice = function(prefix) {
            if (!helpAudioState.key?.startsWith(prefix) || !["loading", "error"].includes(helpAudioState.status)) return null;
            return /* @__PURE__ */ React3.createElement("p", {
              role: "status",
              className: "mb-3 text-sm text-slate-700"
            }, helpAudioState.status === "loading" ? helpText("simplified.word_audio_loading", "Preparing audio\u2026") : helpText("simplified.word_audio_error", "Audio could not play. Try again when you are ready."));
          };
          var SIMPLIFIED_DEFINE_AUDIO_ID = "simplified-define-popup";
          var SIMPLIFIED_REVISION_AUDIO_ID = "simplified-revision-popup";
          var simplifiedPopupReadAloudLabel = t("common.read_aloud") || "Read this aloud";
          var simplifiedPopupStopReadingLabel = t("common.stop_reading") || "Stop reading aloud";
          var simplifiedPopupListenLabel = t("common.listen") || "Listen";
          var simplifiedPopupStopLabel = t("common.stop") || "Stop";
          var simplifiedPopupSpokenText = function(parts) {
            return (Array.isArray(parts) ? parts : [parts]).map(function(part) {
              return String(part == null ? "" : part).replace(/\s+/g, " ").trim();
            }).filter(Boolean).join(". ");
          };
          var renderSimplifiedPopupSpeaker = function(contentId, spokenText) {
            if (typeof handleSpeak !== "function") return null;
            var text = simplifiedPopupSpokenText(spokenText);
            if (!text) return null;
            var active = !!isPlaying && playingContentId === contentId;
            return /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              "data-simplified-popup-speaker": contentId,
              onClick: function() {
                stopHelpAudio();
                handleSpeak(text, contentId, 0);
              },
              "aria-label": active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel,
              title: active ? simplifiedPopupStopReadingLabel : simplifiedPopupReadAloudLabel,
              className: `min-h-11 flex items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 ${active ? "bg-indigo-700 text-white hover:bg-indigo-800" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`
            }, active ? /* @__PURE__ */ React3.createElement(StopCircle, {
              size: 14,
              "aria-hidden": "true"
            }) : /* @__PURE__ */ React3.createElement(Volume2, {
              size: 14,
              "aria-hidden": "true"
            }), /* @__PURE__ */ React3.createElement("span", null, active ? simplifiedPopupStopLabel : simplifiedPopupListenLabel));
          };
          var simplifiedPlayingContentIdRef = React3.useRef(null);
          simplifiedPlayingContentIdRef.current = playingContentId;
          var stopSimplifiedPopupAudio = function(contentId) {
            if (simplifiedPlayingContentIdRef.current === contentId && typeof stopPlayback === "function") stopPlayback();
          };
          function containSimplifiedModalFocus(e, container, onEscape) {
            if (!e || !container) return;
            var nearestDialog = e.target && typeof e.target.closest === "function" ? e.target.closest('[role="dialog"]') : null;
            if (nearestDialog && nearestDialog !== container) return;
            if (e.key === "Escape") {
              e.preventDefault();
              if (typeof onEscape === "function") onEscape(e);
              return;
            }
            if (e.key !== "Tab" || typeof container.querySelectorAll !== "function") return;
            var focusable = Array.prototype.slice.call(container.querySelectorAll('button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')).filter(function(el) {
              return el && !el.hidden && el.getAttribute("aria-hidden") !== "true";
            });
            if (!focusable.length) {
              e.preventDefault();
              container.focus();
              return;
            }
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
          React3.useEffect(function() {
            if (!isImmersiveReaderActive || !generatedContent?.immersiveData) return void 0;
            var previouslyFocused = document.activeElement;
            var timer = setTimeout(function() {
              var closeButton = immersiveDialogRef.current && immersiveDialogRef.current.querySelector("button[aria-label]");
              if (closeButton) closeButton.focus();
              else if (immersiveDialogRef.current) immersiveDialogRef.current.focus();
            }, 0);
            return function() {
              clearTimeout(timer);
              if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
            };
          }, [isImmersiveReaderActive]);
          React3.useEffect(function() {
            if (!phonicsData) return void 0;
            var previouslyFocused = document.activeElement;
            var timer = setTimeout(function() {
              if (phonicsCloseRef.current) phonicsCloseRef.current.focus();
            }, 0);
            return function() {
              clearTimeout(timer);
              if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus();
            };
          }, [!!phonicsData]);
          React3.useEffect(function() {
            if (!definitionData) return void 0;
            var previouslyFocused = document.activeElement;
            var timer = setTimeout(function() {
              if (definitionCloseRef.current) definitionCloseRef.current.focus();
            }, 0);
            return function() {
              clearTimeout(timer);
              stopSimplifiedPopupAudio(SIMPLIFIED_DEFINE_AUDIO_ID);
              if (previouslyFocused && typeof previouslyFocused.focus === "function" && document.contains(previouslyFocused)) previouslyFocused.focus();
            };
          }, [!!definitionData]);
          React3.useEffect(function() {
            if (!revisionData) return void 0;
            var previouslyFocused = document.activeElement;
            var timer = setTimeout(function() {
              if (revisionCloseRef.current) revisionCloseRef.current.focus();
            }, 0);
            return function() {
              clearTimeout(timer);
              stopSimplifiedPopupAudio(SIMPLIFIED_REVISION_AUDIO_ID);
              if (previouslyFocused && typeof previouslyFocused.focus === "function" && document.contains(previouslyFocused)) previouslyFocused.focus();
            };
          }, [!!revisionData]);
          var renderEditAudioSentenceTools = function() {
            if (!isTeacherMode || !isEditingLeveledText) return null;
            var sentences = getReadAloudSentenceEntriesForText(simplifiedReadAloudText);
            if (!sentences.length) return null;
            var summary = getReadAloudAudioSummary(sentences);
            var savingCount = Object.keys(savingAudioKeys || {}).length;
            var captureErrorCount = Object.keys(captureAudioErrors || {}).length;
            var panelId = "allo-edit-audio-" + String(generatedContent && generatedContent.id || "current").replace(/[^a-z0-9_-]/gi, "-");
            var anyRecordingWork = !!editAudioMicRequestKey || !!editAudioRecordingKey || !!editAudioRecordingSaveKey;
            return /* @__PURE__ */ React3.createElement("div", {
              className: "border-t border-orange-100 bg-orange-50/80"
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5"
            }, /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              onClick: handleToggleEditAudioPanel,
              "aria-expanded": editAudioOpen,
              "aria-controls": panelId,
              "aria-label": `${simplifiedAudioEditLabel}. ${summary.saved}/${summary.total} ${simplifiedAudioSavedLabel.toLowerCase()}.`,
              className: "inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-white text-orange-800 border border-orange-200 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition-colors"
            }, /* @__PURE__ */ React3.createElement(Volume2, {
              size: 14
            }), /* @__PURE__ */ React3.createElement("span", null, simplifiedAudioEditLabel), /* @__PURE__ */ React3.createElement("span", {
              className: "rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 normal-case"
            }, summary.saved, "/", summary.total, " ", simplifiedAudioSavedLabel.toLowerCase(), summary.maxBytes ? ` \xB7 ${Math.round(summary.bytes / 104857.6) / 10}/${Math.round(summary.maxBytes / 104857.6) / 10} MB` : ""), editAudioOpen ? /* @__PURE__ */ React3.createElement(ChevronUp, {
              size: 14
            }) : /* @__PURE__ */ React3.createElement(ChevronDown, {
              size: 14
            })), /* @__PURE__ */ React3.createElement("div", {
              className: "flex items-center justify-center sm:justify-end gap-2 flex-wrap"
            }, savingCount > 0 && /* @__PURE__ */ React3.createElement("span", {
              className: "inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-1"
            }, /* @__PURE__ */ React3.createElement(RefreshCw, {
              size: 10,
              className: "animate-spin motion-reduce:animate-none"
            }), " ", simplifiedAudioSaveLabel, " ", savingCount), captureErrorCount > 0 && /* @__PURE__ */ React3.createElement("span", {
              role: "alert",
              className: "inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-1"
            }, /* @__PURE__ */ React3.createElement(AlertCircle, {
              size: 10
            }), " ", captureErrorCount, " ", simplifiedAudioErrorLabel), /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              onClick: copyTtsDiagnostics,
              "aria-label": simplifiedAudioCopiedLabel,
              title: "Copies a technical trace of recent read-aloud attempts \u2014 paste it into a bug report if audio gets stuck.",
              className: "inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-2 py-1 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            }, ttsDiagCopied ? "\u2713 " + simplifiedAudioCopiedLabel : "\u{1FA7A} " + simplifiedAudioDiagnosticsLabel), /* @__PURE__ */ React3.createElement("label", {
              className: "inline-flex items-center gap-1.5 text-[11px] text-slate-700 font-semibold cursor-pointer"
            }, /* @__PURE__ */ React3.createElement("input", {
              type: "checkbox",
              checked: saveTtsAsPlayed,
              onChange: function(event) {
                setSaveTtsAsPlayedEnabled(event.target.checked);
              },
              className: "accent-orange-600",
              "aria-label": simplifiedAudioSaveLabel
            }), /* @__PURE__ */ React3.createElement("span", null, simplifiedAudioSaveLabel)))), editAudioOpen && /* @__PURE__ */ React3.createElement("div", {
              id: panelId,
              role: "region",
              "aria-label": simplifiedAudioEditLabel,
              className: "border-t border-orange-100 bg-white p-3"
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "flex items-start gap-2 mb-3 text-xs text-slate-600"
            }, /* @__PURE__ */ React3.createElement(Mic, {
              size: 14,
              className: "mt-0.5 shrink-0 text-orange-700"
            }), /* @__PURE__ */ React3.createElement("p", null, "Preview saved audio, generate a new AI voice, or record your own teacher narration for each sentence. Recordings replace that sentence only.")), editAudioNotice && /* @__PURE__ */ React3.createElement("div", {
              role: "status",
              "aria-live": "polite",
              className: "mb-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800"
            }, editAudioNotice), /* @__PURE__ */ React3.createElement("div", {
              className: "space-y-2 max-h-[34rem] overflow-y-auto pr-1 custom-scrollbar"
            }, sentences.map(function(entry, i) {
              var sentence = entry.text;
              var identityOptions = getReadAloudIdentityOptions(entry);
              var key = "simplified-" + i;
              var sentenceNumber = i + 1;
              var audioKey = getReadAloudAudioKey(sentence, identityOptions);
              var isSaving = !!savingAudioKeys[audioKey];
              var isSaved = hasStoredReadAloudAudio(sentence, identityOptions);
              var provenance = isSaved ? getReadAloudAudioProvenance(sentence, identityOptions) : {
                source: null,
                label: simplifiedAudioMissingLabel,
                stale: false
              };
              var captureIssue = captureAudioErrors[audioKey];
              var playbackIssue = editAudioPlaybackErrors[audioKey];
              var needsRebuild = !!(isSaved && (provenance.stale || playbackIssue));
              var isGenerating = regenAudioKey === key;
              var isLoading = editAudioLoadingKey === key;
              var isPlayingSentence = editAudioPlayingKey === key;
              var isMicRequest = editAudioMicRequestKey === key;
              var isRecording = editAudioRecordingKey === key;
              var isRecordingSave = editAudioRecordingSaveKey === key;
              var isRemoving = removeAudioKey === key;
              var statusLabel = isMicRequest ? simplifiedAudioEditLabel + ": " + simplifiedAudioRecordLabel : isRecording ? simplifiedAudioRecordLabel : isRecordingSave ? simplifiedAudioSaveLabel : isGenerating ? isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel : isRemoving ? simplifiedAudioRemoveLabel : isSaving ? simplifiedAudioSaveLabel : captureIssue ? captureIssue.status === "limit" ? simplifiedAudioStorageLimitLabel : simplifiedAudioErrorLabel : playbackIssue ? simplifiedAudioSavedLabel + " \xB7 " + simplifiedAudioErrorLabel : provenance.stale ? simplifiedAudioSavedLabel + " \xB7 " + simplifiedAudioSettingsChangedLabel : isSaved ? simplifiedAudioSavedLabel : simplifiedAudioMissingLabel;
              var statusClass = isRecording ? "bg-red-50 text-red-700 border-red-200" : isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? "bg-indigo-50 text-indigo-700 border-indigo-200" : captureIssue ? captureIssue.status === "limit" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-red-50 text-red-700 border-red-200" : playbackIssue ? "bg-red-50 text-red-700 border-red-200" : provenance.stale ? "bg-amber-50 text-amber-800 border-amber-200" : isSaved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200";
              var controlsBlocked = isSaving || isGenerating || isRemoving || ttsPrepState.busy;
              var recordDisabled = !isRecording && (anyRecordingWork || !!regenAudioKey || !!removeAudioKey || isSaving || ttsPrepState.busy);
              var actionClass = "inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed";
              return /* @__PURE__ */ React3.createElement("div", {
                key,
                className: "rounded-xl border border-slate-200 bg-slate-50/70 p-3"
              }, /* @__PURE__ */ React3.createElement("div", {
                className: "flex items-start gap-2"
              }, /* @__PURE__ */ React3.createElement("span", {
                className: "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-800",
                "aria-hidden": "true"
              }, sentenceNumber), /* @__PURE__ */ React3.createElement("div", {
                className: "min-w-0 flex-1"
              }, /* @__PURE__ */ React3.createElement("p", {
                dir: "auto",
                className: "text-sm font-medium leading-relaxed text-slate-800"
              }, sentence), /* @__PURE__ */ React3.createElement("div", {
                className: "mt-1.5 flex items-center gap-1.5 flex-wrap",
                "aria-label": `${simplifiedAudioEditLabel} ${sentenceNumber}: ${statusLabel}. ${provenance.label}.`
              }, /* @__PURE__ */ React3.createElement("span", {
                className: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`
              }, isMicRequest || isRecordingSave || isGenerating || isRemoving || isSaving || isLoading ? /* @__PURE__ */ React3.createElement(RefreshCw, {
                size: 9,
                className: "animate-spin motion-reduce:animate-none"
              }) : isRecording ? /* @__PURE__ */ React3.createElement("span", {
                className: "h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse motion-reduce:animate-none"
              }) : captureIssue || needsRebuild ? /* @__PURE__ */ React3.createElement(AlertCircle, {
                size: 9
              }) : isSaved ? /* @__PURE__ */ React3.createElement(CheckCircle2, {
                size: 9
              }) : /* @__PURE__ */ React3.createElement(AlertCircle, {
                size: 9
              }), statusLabel), /* @__PURE__ */ React3.createElement("span", {
                className: "text-[10px] font-semibold text-slate-500"
              }, provenance.label)))), /* @__PURE__ */ React3.createElement("div", {
                role: "group",
                "aria-label": `${simplifiedAudioEditLabel} ${sentenceNumber}`,
                className: "mt-2.5 flex items-center gap-1.5 flex-wrap"
              }, /* @__PURE__ */ React3.createElement("button", {
                type: "button",
                onClick: function() {
                  handlePlayEditAudioSentence(sentence, key, sentenceNumber, identityOptions);
                },
                disabled: !isSaved || isLoading || controlsBlocked || anyRecordingWork || !!editAudioLoadingKey && !isLoading,
                "aria-pressed": isPlayingSentence,
                "aria-label": `${isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel} ${sentenceNumber}`,
                title: !isSaved ? simplifiedAudioGenerateLabel : isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel,
                className: `${actionClass} bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50`
              }, isLoading ? /* @__PURE__ */ React3.createElement(RefreshCw, {
                size: 12,
                className: "animate-spin motion-reduce:animate-none"
              }) : isPlayingSentence ? /* @__PURE__ */ React3.createElement(Pause, {
                size: 12
              }) : /* @__PURE__ */ React3.createElement(Play, {
                size: 12
              }), /* @__PURE__ */ React3.createElement("span", null, isLoading ? simplifiedAudioLoadingLabel : isPlayingSentence ? simplifiedAudioPauseLabel : simplifiedAudioPlayLabel)), /* @__PURE__ */ React3.createElement("button", {
                type: "button",
                onClick: function() {
                  handleRegenerateReadAloudSentence(sentence, key, sentenceNumber, identityOptions);
                },
                disabled: !!regenAudioKey || isSaving || isRemoving || anyRecordingWork || ttsPrepState.busy,
                "aria-label": `${needsRebuild ? simplifiedAudioRegenerateLabel : isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel} ${sentenceNumber}`,
                title: isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel,
                className: `${actionClass} bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50`
              }, isGenerating ? /* @__PURE__ */ React3.createElement(RefreshCw, {
                size: 12,
                className: "animate-spin motion-reduce:animate-none"
              }) : /* @__PURE__ */ React3.createElement(Volume2, {
                size: 12
              }), /* @__PURE__ */ React3.createElement("span", null, isGenerating ? isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel : needsRebuild ? simplifiedAudioRegenerateLabel : isSaved ? simplifiedAudioRegenerateLabel : simplifiedAudioGenerateLabel)), /* @__PURE__ */ React3.createElement("button", {
                type: "button",
                onClick: function() {
                  handleRecordEditAudioSentence(sentence, key, sentenceNumber, identityOptions);
                },
                disabled: recordDisabled,
                "aria-pressed": isRecording,
                "aria-label": `${isRecording ? simplifiedAudioStopLabel : simplifiedAudioRecordLabel} ${sentenceNumber}`,
                title: isRecording ? simplifiedAudioStopLabel : simplifiedAudioRecordLabel,
                className: `${actionClass} ${isRecording ? "bg-red-600 text-white border-red-700 hover:bg-red-700" : "bg-white text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-50"}`
              }, isMicRequest || isRecordingSave ? /* @__PURE__ */ React3.createElement(RefreshCw, {
                size: 12,
                className: "animate-spin motion-reduce:animate-none"
              }) : isRecording ? /* @__PURE__ */ React3.createElement(StopCircle, {
                size: 12
              }) : /* @__PURE__ */ React3.createElement(Mic, {
                size: 12
              }), /* @__PURE__ */ React3.createElement("span", null, isMicRequest ? simplifiedAudioRecordLabel : isRecording ? simplifiedAudioStopLabel : isRecordingSave ? simplifiedAudioSaveLabel : simplifiedAudioRecordLabel)), isSaved && /* @__PURE__ */ React3.createElement("button", {
                type: "button",
                onClick: function() {
                  handleRemoveReadAloudSentence(sentence, key, sentenceNumber, identityOptions);
                },
                disabled: !!removeAudioKey || isSaving || !!regenAudioKey || anyRecordingWork || ttsPrepState.busy,
                "aria-label": `${simplifiedAudioRemoveLabel} ${sentenceNumber}`,
                className: `${actionClass} bg-white text-rose-700 border-rose-200 hover:bg-rose-50`
              }, isRemoving ? /* @__PURE__ */ React3.createElement(RefreshCw, {
                size: 12,
                className: "animate-spin motion-reduce:animate-none"
              }) : /* @__PURE__ */ React3.createElement(Trash2, {
                size: 12
              }), /* @__PURE__ */ React3.createElement("span", null, isRemoving ? simplifiedAudioRemoveLabel : simplifiedAudioRemoveLabel))));
            }))));
          };
          var instructionalTextProfile = getSimplifiedInstructionalText(generatedContent);
          var instructionalRole = instructionalTextProfile.role || "unspecified";
          var replacementIsEducatorAuthorized = !!(instructionalTextProfile.replacementAuthorization && instructionalTextProfile.replacementAuthorization.authorized === true && instructionalTextProfile.replacementAuthorization.source === "educator");
          var instructionalRoleLabel = protectedOriginal ? verifiedOriginal ? "Original with supports" : "Saved source \u2014 preservation unverified" : instructionalRole === "supplemental" ? "Supplemental access version" : instructionalRole === "primary" && replacementIsEducatorAuthorized ? "Primary replacement \u2014 educator designated" : instructionalRole === "primary" ? "Primary replacement \u2014 authorization missing" : "Instructional role not designated";
          var instructionalRoleTone = instructionalRole === "supplemental" ? "bg-blue-50 text-blue-900 border-blue-200" : instructionalRole === "primary" && replacementIsEducatorAuthorized ? "bg-violet-50 text-violet-900 border-violet-200" : instructionalRole === "primary" ? "bg-red-50 text-red-900 border-red-200" : "bg-amber-50 text-amber-900 border-amber-200";
          var isSupplementalSourceUnlinked = instructionalRole === "supplemental" && !instructionalTextProfile.sourceArtifactId && !instructionalTextProfile.primaryArtifactId;
          var handleInstructionalRoleChange = function(event) {
            var nextRole = event && event.target ? event.target.value : "unspecified";
            if (instructionalTextProfile.form === "adapted" && nextRole === "primary" && !(instructionalRole === "primary" && replacementIsEducatorAuthorized)) {
              var confirmed = false;
              try {
                confirmed = window.confirm("Designate this adapted text as the primary replacement? This records an educator-authorized replacement decision. Continue only when replacement is permitted by the student\u2019s documented plan, the instructional target, assessment conditions, and local policy.");
              } catch (_) {
              }
              if (!confirmed) return;
            }
            var fullBase = findFullHistoryArtifact(history, generatedContent);
            fullBase = Object.assign({}, fullBase || {}, generatedContent || {});
            var updated = updateSimplifiedInstructionalRole(fullBase, nextRole);
            if (typeof setGeneratedContent === "function") setGeneratedContent(updated);
            if (typeof setHistory === "function") {
              setHistory(function(previousHistory) {
                return upsertFullHistoryArtifact(previousHistory, generatedContent, updated);
              });
            }
          };
          var instructionalRoleControl = generatedContent ? /* @__PURE__ */ React3.createElement("div", {
            "data-instructional-role": instructionalRole,
            className: "my-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"
          }, /* @__PURE__ */ React3.createElement("strong", null, instructionalRoleLabel), isTeacherMode && /* @__PURE__ */ React3.createElement("label", {
            className: "ml-3 inline-flex flex-wrap items-center gap-2"
          }, "Instructional use", /* @__PURE__ */ React3.createElement("select", {
            "aria-label": "Set instructional text role",
            value: instructionalRole,
            onChange: handleInstructionalRoleChange,
            className: "min-h-11 rounded border border-slate-300 bg-white px-2"
          }, /* @__PURE__ */ React3.createElement("option", {
            value: "primary"
          }, protectedOriginal ? "Primary text" : "Primary replacement (educator authorization)"), /* @__PURE__ */ React3.createElement("option", {
            value: "supplemental"
          }, "Supplemental access version"), /* @__PURE__ */ React3.createElement("option", {
            value: "unspecified"
          }, "Not designated"))), !protectedOriginal && /* @__PURE__ */ React3.createElement("p", {
            className: "mt-2"
          }, "Adapted companions help preview ideas and build context for reading the original."), !protectedOriginal && !capturedSource && /* @__PURE__ */ React3.createElement("p", {
            role: "status",
            className: "mt-2 text-amber-900"
          }, "Original not captured. Check the matching source before sharing.")) : null;
          var simplifiedComplexityDisplay = getSimplifiedComplexityDisplay(generatedContent, gradeLevel);
          var readingColumnState = React3.useState(72);
          var readingColumn = readingColumnState[0], setReadingColumn = readingColumnState[1];
          var readingStartRef = React3.useRef(null);
          var focusViewButtonRef = React3.useRef(null);
          var wasFocusViewRef = React3.useRef(!!isZenMode);
          React3.useEffect(function() {
            if (wasFocusViewRef.current && !isZenMode && document.activeElement === document.body) {
              focusViewButtonRef.current?.focus({
                preventScroll: true
              });
            }
            wasFocusViewRef.current = !!isZenMode;
          }, [isZenMode]);
          var [practiceOpen, setPracticeOpen] = React3.useState(false);
          var priorReadingRef = React3.useRef({
            id: generatedContent?.id,
            text: generatedContent?.data
          });
          React3.useEffect(function() {
            var previous = priorReadingRef.current;
            priorReadingRef.current = {
              id: generatedContent?.id,
              text: generatedContent?.data
            };
            if (previous.id === generatedContent?.id && previous.text === generatedContent?.data) return;
            if (typeof stopPlayback === "function") stopPlayback();
            if (typeof props.closeDefinition === "function") props.closeDefinition();
            if (typeof props.closePhonics === "function") props.closePhonics();
            if (typeof props.closeRevision === "function") props.closeRevision();
            if (typeof setSelectionMenu === "function") setSelectionMenu(null);
            if (typeof setFocusedParagraphIndex === "function") setFocusedParagraphIndex(null);
          }, [generatedContent?.id, generatedContent?.data]);
          var selectionActionRef = React3.useRef(null);
          var selectionDialogRef = React3.useRef(null);
          React3.useEffect(function() {
            if (!selectionMenu) return;
            var opener = document.activeElement;
            selectionDialogRef.current?.querySelector("button, input")?.focus();
            return function() {
              if (opener && document.contains(opener)) opener.focus();
            };
          }, [!!selectionMenu]);
          var comparisonLanguageState = React3.useState("auto");
          var comparisonLanguage = comparisonLanguageState[0], setComparisonLanguage = comparisonLanguageState[1];
          React3.useEffect(function() {
            setComparisonLanguage("auto");
          }, [generatedContent && generatedContent.id]);
          var readerText = function(key, fallback) {
            var value = t(key);
            return value && value !== key ? value : fallback;
          };
          function chooseReadingMode(mode) {
            if (typeof stopPlayback === "function") stopPlayback();
            if (typeof props.closeDefinition === "function") props.closeDefinition();
            if (typeof props.closePhonics === "function") props.closePhonics();
            if (typeof props.closeRevision === "function") props.closeRevision();
            if (typeof setSelectionMenu === "function") setSelectionMenu(null);
            if (typeof setRevisionData === "function") setRevisionData(null);
            if (typeof setPhonicsData === "function") setPhonicsData(null);
            if (typeof setIsCustomReviseOpen === "function") setIsCustomReviseOpen(false);
            if (typeof setIsCompareMode === "function") setIsCompareMode(false);
            if (isEditingLeveledText && typeof props.handleToggleIsEditingLeveledText === "function") props.handleToggleIsEditingLeveledText();
            if (typeof setIsFluencyMode === "function") setIsFluencyMode(mode === "fluency");
            if (typeof setInteractionMode === "function") setInteractionMode(mode === "fluency" ? "read" : mode);
          }
          React3.useEffect(function() {
            if (isTeacherMode) return;
            if (props.isEditingLeveledText && typeof props.handleToggleIsEditingLeveledText === "function") props.handleToggleIsEditingLeveledText();
            if (["revise", "add-glossary"].includes(props.interactionMode)) chooseReadingMode("read");
            if (props.revisionData && props.revisionData.type !== "explain" && typeof props.closeRevision === "function") props.closeRevision();
            if (props.isCustomReviseOpen && typeof setIsCustomReviseOpen === "function") setIsCustomReviseOpen(false);
          }, [isTeacherMode, props.isCompareMode, props.isEditingLeveledText, props.interactionMode, props.revisionData?.type, props.isCustomReviseOpen]);
          var readingLanguage = generatedContent?.config?.language || generatedContent?.instructionalText?.complexity?.language || leveledTextLanguage || "English";
          var wordHelpHint = readerText("simplified.word_navigation_hint", "Choose a word for help. Use Left and Right arrows to move between words.");
          var [showComparisonChanges, setShowComparisonChanges] = React3.useState(function() {
            try {
              return localStorage.getItem("alloflow_reading_show_changes") === "on";
            } catch (_) {
              return false;
            }
          });
          var [showReadingGlosses, setShowReadingGlosses] = React3.useState(true);
          var [glossDensity, setGlossDensity] = React3.useState("all");
          var [glossBusy, setGlossBusy] = React3.useState(false);
          var [glossNotice, setGlossNotice] = React3.useState("");
          var currentGlossSourceRef = React3.useRef("");
          currentGlossSourceRef.current = generatedContent?.id + ":" + (capturedSource?.fingerprint || "");
          var supportOwner = protectedOriginal ? generatedContent : capturedSource && (history || []).slice().reverse().find((item) => readingContract?.isSupportedOriginal?.(item) && item.data === capturedSource.text && readingContract.getSourceSnapshot(item)?.fingerprint === capturedSource.fingerprint);
          var checkedSupports = capturedSource && readingContract?.validateReadingSupports ? readingContract.validateReadingSupports(capturedSource, supportOwner?.readingSupports) : null;
          var audioGlosses = (checkedSupports?.annotations || []).filter((entry, index) => glossDensity !== "light" || index % 2 === 0);
          var activeGlosses = showReadingGlosses ? audioGlosses : [];
          var comparisonSourceState = React3.useState("linked");
          var comparisonSourceId = comparisonSourceState[0], setComparisonSourceId = comparisonSourceState[1];
          React3.useEffect(function() {
            setComparisonSourceId("linked");
          }, [generatedContent && generatedContent.id]);
          function renderSimplifiedComparison() {
            var resolved = resolveSimplifiedCompareSource(history, generatedContent, inputText);
            var candidates = (history || []).filter((item) => item.id !== generatedContent.id && ["analysis", "simplified"].includes(item.type) && getArtifactReadingText(item));
            var selected = isTeacherMode ? candidates.find((item) => String(item.id) === comparisonSourceId) : null;
            var original2 = selected ? {
              text: getArtifactReadingText(selected),
              artifact: selected,
              selection: "educator-selected"
            } : resolved;
            var originalLanguage = original2.artifact?.config?.language || original2.artifact?.instructionalText?.complexity?.language || "";
            var adaptedParts = getSideBySideContent(simplifiedDisplayBody);
            var sourceParts = original2.selection === "captured-source" ? null : getSideBySideContent(original2.text);
            var effectiveLanguage = comparisonLanguage === "auto" ? adaptedParts && simplifiedLanguageTag(originalLanguage)?.startsWith("en") ? "english" : "adapted" : comparisonLanguage;
            var targetText = adaptedParts ? effectiveLanguage === "english" ? adaptedParts.targetFull : adaptedParts.sourceFull : simplifiedDisplayBody;
            var sourceText = sourceParts ? effectiveLanguage === "english" ? sourceParts.targetFull : sourceParts.sourceFull : original2.text;
            var targetLanguage = effectiveLanguage === "english" && adaptedParts ? "English" : readingLanguage;
            if (sourceParts && effectiveLanguage === "english") originalLanguage = "English";
            var stripReferences = (value) => {
              try {
                return splitReferencesFromBody ? splitReferencesFromBody(String(value || "")).body : String(value || "");
              } catch (_) {
                return String(value || "");
              }
            };
            if (original2.selection !== "captured-source") sourceText = stripReferences(sourceText);
            targetText = stripReferences(targetText);
            var comparisonSupportOwner = supportOwner?.data === sourceText ? supportOwner : (history || []).slice().reverse().find((item) => readingContract?.isSupportedOriginal?.(item) && item.data === sourceText);
            var comparisonSupports = comparisonSupportOwner ? readingContract.validateReadingSupports(readingContract.getSourceSnapshot(comparisonSupportOwner), comparisonSupportOwner.readingSupports) : null;
            var comparisonGlosses = showReadingGlosses ? (comparisonSupports?.annotations || []).filter((entry, index) => glossDensity !== "light" || index % 2 === 0) : [];
            var oldTokens = sourceText.match(/\s+|\S+/g) || [], newTokens = targetText.match(/\s+|\S+/g) || [];
            var tooLarge = oldTokens.length * newTokens.length > 1e6;
            var mismatch = simplifiedLanguageTag(originalLanguage) && simplifiedLanguageTag(targetLanguage) && simplifiedLanguageTag(originalLanguage).split("-")[0] !== simplifiedLanguageTag(targetLanguage).split("-")[0];
            var showDiff = showComparisonChanges && !tooLarge && !mismatch && sourceText && targetText;
            var diff = [];
            if (showDiff) {
              var matrix = Array.from({
                length: oldTokens.length + 1
              }, () => new Uint32Array(newTokens.length + 1));
              for (var a = 1; a <= oldTokens.length; a++) for (var b = 1; b <= newTokens.length; b++) matrix[a][b] = oldTokens[a - 1] === newTokens[b - 1] ? matrix[a - 1][b - 1] + 1 : Math.max(matrix[a - 1][b], matrix[a][b - 1]);
              var x = oldTokens.length, y = newTokens.length;
              while (x || y) {
                if (x && y && oldTokens[x - 1] === newTokens[y - 1]) {
                  diff.push({
                    type: "same",
                    value: oldTokens[--x]
                  });
                  --y;
                } else if (x && (!y || matrix[x - 1][y] >= matrix[x][y - 1])) diff.push({
                  type: "del",
                  value: oldTokens[--x]
                });
                else diff.push({
                  type: "add",
                  value: newTokens[--y]
                });
              }
              diff.reverse();
            }
            var count = (text) => simplifiedWordSegments(simplifiedPlainInline(text), targetLanguage).filter((part) => part.word).length;
            var renderVersion = (kind, raw) => showDiff ? diff.filter((part) => part.type !== (kind === "source" ? "add" : "del")).map((part, i) => part.type === "same" ? /* @__PURE__ */ React3.createElement(React3.Fragment, {
              key: i
            }, part.value) : part.type === "del" ? /* @__PURE__ */ React3.createElement("del", {
              key: i,
              className: "bg-red-100 text-red-900"
            }, part.value) : /* @__PURE__ */ React3.createElement("ins", {
              key: i,
              className: "bg-green-100 text-green-900"
            }, part.value)) : renderExactPassage(raw, kind, kind === "source" ? originalLanguage : targetLanguage, kind === "source" ? comparisonGlosses : []);
            return /* @__PURE__ */ React3.createElement("div", {
              "data-reading-comparison": "true",
              className: "space-y-4"
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "flex flex-wrap gap-3 rounded-xl bg-white p-4 border border-slate-200"
            }, /* @__PURE__ */ React3.createElement("label", {
              className: "inline-flex min-h-11 items-center gap-2"
            }, /* @__PURE__ */ React3.createElement("input", {
              type: "checkbox",
              "aria-label": "Show changes",
              checked: showComparisonChanges,
              disabled: !!tooLarge || !!mismatch || !sourceText,
              onChange: (event) => {
                const next = event.target.checked;
                setShowComparisonChanges(next);
                try {
                  localStorage.setItem("alloflow_reading_show_changes", next ? "on" : "off");
                } catch (_) {
                }
              }
            }), "Show changes"), comparisonSupports?.annotations?.length > 0 && /* @__PURE__ */ React3.createElement(React3.Fragment, null, /* @__PURE__ */ React3.createElement("label", {
              className: "inline-flex min-h-11 items-center gap-2"
            }, /* @__PURE__ */ React3.createElement("input", {
              type: "checkbox",
              "aria-label": "Show glosses",
              checked: showReadingGlosses,
              disabled: !!showDiff,
              onChange: (event) => setShowReadingGlosses(event.target.checked)
            }), "Show glosses"), /* @__PURE__ */ React3.createElement("label", null, "Gloss density ", /* @__PURE__ */ React3.createElement("select", {
              "aria-label": "Gloss density",
              value: glossDensity,
              disabled: !!showDiff,
              onChange: (event) => setGlossDensity(event.target.value),
              className: "min-h-11 rounded border p-2"
            }, /* @__PURE__ */ React3.createElement("option", {
              value: "all"
            }, "All supports"), /* @__PURE__ */ React3.createElement("option", {
              value: "light"
            }, "Lighter"))), showDiff && /* @__PURE__ */ React3.createElement("span", {
              className: "self-center text-sm text-slate-600"
            }, "Turn off Show changes to read inline glosses.")), isTeacherMode && /* @__PURE__ */ React3.createElement("label", {
              className: "min-w-0 flex-1 text-sm font-semibold"
            }, readerText("simplified.compare_source", "Source version"), /* @__PURE__ */ React3.createElement("select", {
              value: comparisonSourceId,
              onChange: (e) => setComparisonSourceId(e.target.value),
              className: "mt-1 block w-full min-w-0 rounded border border-slate-300 p-2"
            }, /* @__PURE__ */ React3.createElement("option", {
              value: "linked"
            }, readerText("simplified.linked_source", "Linked source / original")), candidates.map((item) => /* @__PURE__ */ React3.createElement("option", {
              key: item.id,
              value: String(item.id)
            }, item.title || item.topic || item.id)))), adaptedParts && /* @__PURE__ */ React3.createElement("label", {
              className: "min-w-0 flex-1 text-sm font-semibold"
            }, readerText("simplified.compare_language", "Adapted version"), /* @__PURE__ */ React3.createElement("select", {
              value: comparisonLanguage,
              onChange: (e) => setComparisonLanguage(e.target.value),
              className: "mt-1 block w-full rounded border border-slate-300 p-2"
            }, /* @__PURE__ */ React3.createElement("option", {
              value: "auto"
            }, readerText("simplified.compare_auto", "Match source language when known")), /* @__PURE__ */ React3.createElement("option", {
              value: "adapted"
            }, readingLanguage), /* @__PURE__ */ React3.createElement("option", {
              value: "english"
            }, simplifiedEnglishTranslationLabel)))), original2.selection === "original-not-captured" && /* @__PURE__ */ React3.createElement("p", {
              role: "status",
              className: "rounded bg-amber-50 p-3 text-sm text-amber-900"
            }, readerText("simplified.compare_fallback", "Original not captured. Open or attach the matching source; another lesson will not be substituted.")), (tooLarge || mismatch) && /* @__PURE__ */ React3.createElement("p", {
              role: "status",
              className: "rounded bg-indigo-50 p-3 text-sm text-indigo-900"
            }, mismatch ? readerText("simplified.compare_different_languages", "These versions use different languages. Read them side by side; word change highlighting is unavailable.") : readerText("simplified.compare_long_text", "For this long reading, complete versions are shown without word change highlighting.")), /* @__PURE__ */ React3.createElement("p", {
              className: "text-sm text-slate-600"
            }, readerText("simplified.compare_word_count", "Word counts"), ": ", count(sourceText), " \u2192 ", count(targetText), ". ", readerText("simplified.compare_review_hint", "Check key ideas, terminology, examples, and citations before sharing. Word changes alone do not establish accuracy.")), /* @__PURE__ */ React3.createElement("div", {
              className: "grid grid-cols-1 md:grid-cols-2 gap-4"
            }, [{
              key: "source",
              title: t("simplified.diff_original"),
              text: sourceText,
              language: originalLanguage
            }, {
              key: "adapted",
              title: t("simplified.diff_adapted"),
              text: targetText,
              language: targetLanguage
            }].map((version) => /* @__PURE__ */ React3.createElement("section", {
              key: version.key,
              className: "min-w-0 rounded-xl border border-slate-300 bg-white p-4"
            }, /* @__PURE__ */ React3.createElement("h3", {
              className: "mb-3 font-bold"
            }, version.title, version.language ? " \xB7 " + version.language : ""), /* @__PURE__ */ React3.createElement("div", {
              className: "mb-3 flex flex-wrap gap-2"
            }, /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              className: "min-h-11 rounded border border-indigo-300 px-3 text-indigo-900",
              "aria-label": (isExactPassagePlaying(version.key) ? "Stop " : "Listen to ") + (version.key === "source" ? "original" : "adapted"),
              onClick: () => speakExactPassage(version.text, version.key, version.language)
            }, isExactPassagePlaying(version.key) ? "Stop" : "Listen"), version.key === "source" && props.onReadOriginal && original2.text && /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              className: "min-h-11 rounded border border-indigo-300 px-3 text-indigo-900",
              onClick: () => props.onReadOriginal(capturedSource ? generatedContent : original2.artifact)
            }, "Open original reader")), /* @__PURE__ */ React3.createElement("div", {
              "data-compare-version": version.key,
              lang: simplifiedLanguageTag(version.language),
              dir: getContentDirection(version.language),
              style: {
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                maxHeight: "70vh",
                overflowY: "auto"
              },
              tabIndex: 0,
              role: "region",
              "aria-label": version.title
            }, renderVersion(version.key, version.text))))));
          }
          function isExactPassagePlaying(pane) {
            return !!isPlaying && playingContentId === "reading-" + generatedContent.id + "-" + pane;
          }
          function speakExactPassage(text, pane, language) {
            var wasPlaying = isExactPassagePlaying(pane);
            if (typeof stopPlayback === "function") stopPlayback();
            if (wasPlaying) return;
            if (typeof handleSpeak === "function") handleSpeak(text, "reading-" + generatedContent.id + "-" + pane, 0, true, language || readingLanguage);
          }
          function renderExactPassage(raw, pane, language, annotations) {
            var cursor = 0;
            return String(raw).split(/(\r\n|\r|\n)/).map(function(line, lineIndex) {
              var lineStart = cursor;
              cursor += line.length;
              if (/^[\r\n]+$/.test(line) || !line) return /* @__PURE__ */ React3.createElement(React3.Fragment, {
                key: lineIndex
              }, line);
              var hasLineGloss = (annotations || []).some((entry) => entry.end > lineStart && entry.end <= lineStart + line.length);
              var parts = ["define", "phonics"].includes(interactionMode) || hasLineGloss ? simplifiedWordSegments(line, language) : [{
                text: line,
                word: false
              }], wordOffset = 0;
              var content = parts.map(function(part, index) {
                var start = lineStart + wordOffset;
                wordOffset += part.text.length;
                var glosses = (annotations || []).filter((entry) => entry.end > start && entry.end <= lineStart + wordOffset);
                var node = part.text;
                if (part.word && ["define", "phonics"].includes(interactionMode)) {
                  var activate = (event) => {
                    event.stopPropagation();
                    if (interactionMode === "phonics") handlePhonicsClick(part.text, event, {
                      audioPlayback: "reader",
                      language
                    });
                    else handleWordClick(part.text, event, {
                      text: raw,
                      language
                    });
                  };
                  node = /* @__PURE__ */ React3.createElement("span", {
                    role: "button",
                    tabIndex: index === parts.findIndex((p) => p.word) ? 0 : -1,
                    "data-exact-word": "true",
                    "aria-label": (interactionMode === "phonics" ? "Word sounds: " : "Define: ") + part.text,
                    onClick: activate,
                    onKeyDown: (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        activate(event);
                      } else if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                        const nodes = Array.from(event.currentTarget.parentElement.querySelectorAll("[data-exact-word]"));
                        const delta = (event.key === "ArrowRight" ? 1 : -1) * (getContentDirection(language) === "rtl" ? -1 : 1);
                        const next = event.key === "Home" ? 0 : event.key === "End" ? nodes.length - 1 : Math.max(0, Math.min(nodes.length - 1, nodes.indexOf(event.currentTarget) + delta));
                        event.preventDefault();
                        nodes[next]?.focus();
                      }
                    },
                    onFocus: (event) => {
                      event.currentTarget.parentElement.querySelectorAll("[data-exact-word]").forEach((n) => n.tabIndex = n === event.currentTarget ? 0 : -1);
                    },
                    className: "cursor-help rounded hover:bg-yellow-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
                  }, part.text);
                }
                return /* @__PURE__ */ React3.createElement(React3.Fragment, {
                  key: index
                }, node, glosses.map((entry) => /* @__PURE__ */ React3.createElement("span", {
                  key: entry.id,
                  "data-reading-gloss": true,
                  className: "mx-1 rounded bg-indigo-50 px-1 text-base text-indigo-900",
                  "aria-label": "Gloss for " + entry.quote
                }, " (", entry.definition || entry.explanation || entry.text, ")")));
              });
              const explain = (event) => {
                if (interactionMode !== "explain") return;
                const selected = window.getSelection?.().toString().trim();
                const rect = event.currentTarget.getBoundingClientRect();
                setSelectionMenu({
                  text: selected || line,
                  language,
                  x: rect.left,
                  y: rect.bottom
                });
              };
              return /* @__PURE__ */ React3.createElement("span", {
                key: lineIndex,
                "data-reading-language": language,
                "data-reading-paragraph": pane + "-" + lineIndex,
                lang: simplifiedLanguageTag(language),
                dir: getContentDirection(language),
                role: interactionMode === "explain" ? "button" : void 0,
                tabIndex: interactionMode === "explain" || isLineFocusMode ? 0 : void 0,
                onClick: explain,
                onKeyDown: (event) => {
                  if (interactionMode === "explain" && ["Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    explain(event);
                  }
                },
                onFocus: () => {
                  if (isLineFocusMode && typeof setFocusedParagraphIndex === "function") setFocusedParagraphIndex(pane + "-" + lineIndex);
                },
                className: isLineFocusMode ? focusedParagraphIndex === pane + "-" + lineIndex || focusedParagraphIndex == null && lineIndex === 0 ? "bg-yellow-100 text-slate-950" : "opacity-50" : ""
              }, content);
            });
          }
          var companion = !protectedOriginal ? generatedContent : capturedSource && (history || []).slice().reverse().find((item) => item?.type === "simplified" && getSimplifiedInstructionalText(item).form === "adapted" && readingContract?.getSourceSnapshot?.(item)?.fingerprint === capturedSource.fingerprint && readingContract.getSourceSnapshot(item).text === capturedSource.text);
          function switchReadingVersion(item, compare) {
            if (typeof stopPlayback === "function") stopPlayback();
            if (props.onOpenReadingArtifact) props.onOpenReadingArtifact(item, compare);
            else {
              setGeneratedContent?.(item);
              setIsCompareMode?.(!!compare);
            }
          }
          var versionControls = /* @__PURE__ */ React3.createElement("div", {
            "data-reading-versions": true,
            className: "my-3 flex flex-wrap items-center gap-2",
            role: "group",
            "aria-label": "Reading versions"
          }, props.onReadOriginal && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            disabled: !capturedSource && !protectedOriginal,
            "aria-pressed": protectedOriginal && !isCompareMode,
            className: `min-h-11 rounded-lg border px-3 disabled:opacity-50 ${protectedOriginal && !isCompareMode ? "bg-indigo-700 text-white border-indigo-700" : "border-indigo-300"}`,
            onClick: () => props.onReadOriginal(generatedContent)
          }, "Original"), (companion || !protectedOriginal) && /* @__PURE__ */ React3.createElement(React3.Fragment, null, /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-pressed": !protectedOriginal && !isCompareMode,
            className: `min-h-11 rounded-lg border px-3 ${!protectedOriginal && !isCompareMode ? "bg-indigo-700 text-white border-indigo-700" : "border-indigo-300"}`,
            onClick: () => switchReadingVersion(companion || generatedContent, false)
          }, "Adapted"), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-pressed": isCompareMode,
            disabled: !capturedSource,
            className: `min-h-11 rounded-lg border px-3 disabled:opacity-50 ${isCompareMode ? "bg-indigo-700 text-white border-indigo-700" : "border-indigo-300"}`,
            onClick: () => switchReadingVersion(companion || generatedContent, true)
          }, "Both")), protectedOriginal && isTeacherMode && props.onCreateAdaptedCompanion && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            disabled: isProcessing,
            onClick: () => props.onCreateAdaptedCompanion(generatedContent),
            className: "min-h-11 rounded-lg bg-indigo-700 px-3 text-white disabled:opacity-50"
          }, "Create adapted companion"));
          function renderOriginalReading() {
            return /* @__PURE__ */ React3.createElement("div", {
              "data-simplified-reading-body": "true",
              style: {
                maxWidth: readingColumn + "ch",
                marginInline: "auto"
              }
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "mb-3 flex flex-wrap items-center gap-3"
            }, /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              "data-reader-listen": true,
              onClick: () => speakExactPassage(simplifiedReadAloudText, "original", readingLanguage),
              className: "min-h-11 rounded-lg bg-indigo-700 px-3 text-white"
            }, isExactPassagePlaying("original") ? "Stop original" : "Listen to original"), checkedSupports?.annotations?.length > 0 && /* @__PURE__ */ React3.createElement(React3.Fragment, null, /* @__PURE__ */ React3.createElement("label", {
              className: "inline-flex min-h-11 items-center gap-2"
            }, /* @__PURE__ */ React3.createElement("input", {
              type: "checkbox",
              checked: showReadingGlosses,
              onChange: (e) => setShowReadingGlosses(e.target.checked)
            }), "Show glosses"), /* @__PURE__ */ React3.createElement("label", null, "Gloss density ", /* @__PURE__ */ React3.createElement("select", {
              value: glossDensity,
              onChange: (e) => setGlossDensity(e.target.value),
              className: "min-h-11 rounded border p-2"
            }, /* @__PURE__ */ React3.createElement("option", {
              value: "all"
            }, "All supports"), /* @__PURE__ */ React3.createElement("option", {
              value: "light"
            }, "Lighter"))), /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              className: "min-h-11 rounded border px-3",
              onClick: () => {
                let audio = "", from = 0;
                audioGlosses.forEach((entry) => {
                  audio += simplifiedReadAloudText.slice(from, entry.end) + ". " + (entry.definition || entry.explanation || entry.text) + ". ";
                  from = entry.end;
                });
                audio += simplifiedReadAloudText.slice(from);
                speakExactPassage(audio, "glosses-" + audioGlosses.length, readingLanguage);
              }
            }, isExactPassagePlaying("glosses-" + audioGlosses.length) ? "Stop gloss reading" : "Listen with glosses")), isTeacherMode && props.onGenerateReadingSupports && /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              disabled: glossBusy || !verifiedOriginal,
              className: "min-h-11 rounded border border-indigo-300 px-3 disabled:opacity-50",
              onClick: async () => {
                const request = currentGlossSourceRef.current;
                setGlossBusy(true);
                setGlossNotice("");
                try {
                  const result = await props.onGenerateReadingSupports(generatedContent);
                  if (request === currentGlossSourceRef.current) setGlossNotice(result?.status === "unavailable" ? "Word supports could not be generated. The original is unchanged." : result?.status === "partial" ? "Some words could not be supported. The original is unchanged." : "Word supports are ready.");
                } catch (error) {
                  if (request === currentGlossSourceRef.current) setGlossNotice(error?.message || "Word supports could not be generated. The original is unchanged.");
                } finally {
                  setGlossBusy(false);
                }
              }
            }, glossBusy ? "Adding word supports\u2026" : "Add word supports")), glossNotice && /* @__PURE__ */ React3.createElement("p", {
              role: "status",
              className: "my-3 rounded bg-indigo-50 p-3 text-indigo-900"
            }, glossNotice), /* @__PURE__ */ React3.createElement("div", {
              "data-reading-passage": "true",
              "data-original-source": "true",
              tabIndex: -1,
              ref: readingStartRef,
              style: {
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere"
              },
              className: "text-lg leading-relaxed"
            }, renderExactPassage(simplifiedReadAloudText, "original", readingLanguage, activeGlosses)));
          }
          function renderSimplifiedReading() {
            var parts = getSideBySideContent(simplifiedReadAloudText);
            var languages = parts ? [{
              key: "src",
              label: readingLanguage,
              paragraphs: parts.source
            }, {
              key: "tgt",
              label: "English",
              paragraphs: parts.target
            }] : [{
              key: "mono",
              label: readingLanguage,
              paragraphs: simplifiedReadAloudText.split(/\n{2,}/)
            }];
            var isWordMode = ["define", "phonics", "add-glossary"].includes(interactionMode);
            var isSelectionMode = ["explain", "revise"].includes(interactionMode);
            var sentenceCursor = 0;
            var rendered = languages.map(function(section) {
              return section.paragraphs.map(function(paragraph, paragraphIndex) {
                var paragraphId = section.key === "mono" ? paragraphIndex : section.key + "-" + paragraphIndex;
                if (paragraph.trim().startsWith("|") || paragraph.includes("\n|")) return /* @__PURE__ */ React3.createElement("div", {
                  key: paragraphId,
                  "data-reading-table": "true",
                  lang: simplifiedLanguageTag(section.label),
                  dir: section.key === "tgt" ? "ltr" : getContentDirection(section.label),
                  className: "my-4 max-w-full overflow-x-auto",
                  tabIndex: 0,
                  role: "region",
                  "aria-label": readerText("simplified.table_label", "Reading table")
                }, renderFormattedText(paragraph, false));
                var startIdx = sentenceCursor;
                var blocks = simplifiedParagraphBlocks(paragraph).map(function(block) {
                  block.start = sentenceCursor;
                  block.sentences = splitTextToSentences(block.raw);
                  sentenceCursor += block.sentences.length;
                  return block;
                });
                var endIdx = sentenceCursor;
                var shouldFocus = isPlaying && playingContentId === "simplified-main" ? playbackState.currentIdx >= startIdx && playbackState.currentIdx < endIdx : focusedParagraphIndex === paragraphId || focusedParagraphIndex == null && paragraphIndex === 0;
                var wordIndex = 0;
                var renderWords = function(text) {
                  return simplifiedWordSegments(text, section.label).map(function(part, index) {
                    if (!part.word) return /* @__PURE__ */ React3.createElement(React3.Fragment, {
                      key: index
                    }, part.text);
                    var order = wordIndex++;
                    var label = interactionMode === "phonics" ? simplifiedHearPhonicsLabel : interactionMode === "add-glossary" ? readerText("common.click_add_glossary", "Add to glossary") : simplifiedDefineLabel;
                    var activate = function(event) {
                      event.stopPropagation();
                      if (interactionMode === "phonics") handlePhonicsClick(part.text, event, {
                        audioPlayback: "reader"
                      });
                      else if (interactionMode === "add-glossary") handleQuickAddGlossary(part.text, true);
                      else handleWordClick(part.text, event);
                    };
                    return /* @__PURE__ */ React3.createElement("span", {
                      key: index,
                      "data-reading-word": order,
                      role: "button",
                      tabIndex: order === 0 ? 0 : -1,
                      "aria-label": label + ": " + part.text,
                      title: label,
                      onClick: activate,
                      onFocus: function(event) {
                        var group = event.currentTarget.closest("[data-reading-paragraph]");
                        if (group) group.querySelectorAll("[data-reading-word]").forEach(function(node) {
                          node.tabIndex = node === event.currentTarget ? 0 : -1;
                        });
                      },
                      onKeyDown: function(event) {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          activate(event);
                          return;
                        }
                        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                        var group = event.currentTarget.closest("[data-reading-paragraph]");
                        if (!group) return;
                        var words = Array.from(group.querySelectorAll("[data-reading-word]"));
                        var rtl = group.dir === "rtl";
                        var delta = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
                        var next = event.key === "Home" ? 0 : event.key === "End" ? words.length - 1 : Math.max(0, Math.min(words.length - 1, words.indexOf(event.currentTarget) + delta));
                        event.preventDefault();
                        words[next]?.focus();
                      },
                      className: "cursor-help rounded px-0.5 hover:bg-yellow-100 focus:bg-yellow-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                    }, part.text);
                  });
                };
                var renderBlock = function(block, key) {
                  var Tag = block.type === "heading" ? "h" + Math.min(6, block.level) : block.type === "quote" ? "blockquote" : block.type === "li" ? "span" : "p";
                  var text = block.text === void 0 ? block.raw : block.text;
                  var content;
                  if (isWordMode || interactionMode === "revise") content = simplifiedInline(text, isWordMode ? renderWords : (value) => value);
                  else content = block.sentences.map(function(sentence, index) {
                    var currentGlobalIdx = block.start + index;
                    var cleanText = sentence.replace(/^\s*#{1,6}\s+/, "").replace(/^\s*<\/?h[1-6][^>]*>/gi, "").replace(/<\/h[1-6]>\s*$/i, "").replace(/^\s*(?:[-+*]|\d+[.)])\s+/, "").replace(/^\s*>\s?/, "");
                    var active = playingContentId === "simplified-main" && playbackState.currentIdx === currentGlobalIdx;
                    if (interactionMode === "cloze") return /* @__PURE__ */ React3.createElement("span", {
                      key: index
                    }, formatInteractiveText(cleanText, true, !!isLineFocusMode), " ");
                    var speakSentence = function(event) {
                      if (event.target.closest("a,button,input,select,textarea")) return;
                      if (window.getSelection && window.getSelection().toString().trim()) return;
                      event.stopPropagation();
                      if (interactionMode === "explain") {
                        event.currentTarget.focus();
                        var rect = event.currentTarget.getBoundingClientRect();
                        setSelectionMenu({
                          text: simplifiedPlainInline(cleanText),
                          language: section.label,
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        });
                      } else handleSpeak(simplifiedReadAloudText, "simplified-main", currentGlobalIdx);
                    };
                    return /* @__PURE__ */ React3.createElement("span", {
                      key: index,
                      id: "sentence-" + currentGlobalIdx,
                      "data-reading-sentence": currentGlobalIdx,
                      role: "button",
                      tabIndex: 0,
                      "aria-current": active ? "true" : void 0,
                      "aria-label": (interactionMode === "explain" ? readerText("simplified.explain_mode", "Explain") : simplifiedReadSentenceLabel) + ": " + simplifiedPlainInline(cleanText),
                      onClick: speakSentence,
                      onKeyDown: function(event) {
                        if (event.target !== event.currentTarget || event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        speakSentence(event);
                      },
                      className: `rounded px-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${active ? "bg-yellow-300 text-slate-950" : "hover:bg-indigo-100/30"}`,
                      title: interactionMode === "explain" ? readerText("simplified.explain_mode", "Explain") : t("common.click_read_from_here")
                    }, formatInteractiveText(cleanText, false, !!isLineFocusMode), " ");
                  });
                  var style = {
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    lineHeight: "inherit"
                  };
                  if (block.type === "heading") {
                    style.fontWeight = 750;
                    style.fontSize = block.level === 1 ? "1.5em" : block.level === 2 ? "1.3em" : "1.15em";
                    style.marginBlock = "0.9em 0.45em";
                  }
                  return /* @__PURE__ */ React3.createElement(Tag, {
                    key,
                    style,
                    className: block.type === "quote" ? "border-l-4 border-indigo-200 pl-4 my-3 italic" : block.type === "p" ? "my-3" : void 0
                  }, content);
                };
                return /* @__PURE__ */ React3.createElement("div", _extends({
                  key: paragraphId,
                  "data-reading-paragraph": paragraphId,
                  "data-reading-focused": !!shouldFocus,
                  "data-reading-language": section.label,
                  lang: simplifiedLanguageTag(section.label),
                  dir: section.key === "tgt" ? "ltr" : getContentDirection(section.label)
                }, lineFocusParagraphProps(paragraphId), {
                  onMouseUp: isSelectionMode ? handleTextMouseUp : void 0,
                  className: `mb-4 rounded-xl transition-opacity motion-reduce:transition-none ${isLineFocusMode ? shouldFocus ? "opacity-100 bg-slate-800 p-4 text-white" : "opacity-20 blur-[1px]" : section.key === "tgt" ? "text-slate-700" : "text-slate-800"}`
                }), simplifiedNestLists(blocks, renderBlock));
              });
            });
            var sourceDirection = getContentDirection(readingLanguage);
            return /* @__PURE__ */ React3.createElement("div", {
              "data-simplified-reading-body": "true",
              className: "w-full min-w-0 text-lg font-medium leading-relaxed font-sans",
              style: {
                maxWidth: parts && isSideBySide ? "100%" : "min(" + readingColumn + "ch, 100%)",
                marginInline: "auto"
              }
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "mb-4 flex flex-wrap items-center gap-3 text-sm"
            }, typeof handleSpeak === "function" && /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              "data-reader-listen": true,
              disabled: !simplifiedReadAloudText,
              onClick: () => {
                if (isPlaying && playingContentId === "simplified-main" && typeof stopPlayback === "function") stopPlayback();
                else handleSpeak(simplifiedReadAloudText, "simplified-main", 0);
              },
              className: "min-h-11 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 font-bold text-white focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50"
            }, isPlaying && playingContentId === "simplified-main" ? /* @__PURE__ */ React3.createElement(StopCircle, {
              size: 16,
              "aria-hidden": "true"
            }) : /* @__PURE__ */ React3.createElement(Volume2, {
              size: 16,
              "aria-hidden": "true"
            }), isPlaying && playingContentId === "simplified-main" ? readerText("common.stop_reading", "Stop reading aloud") : readerText("simplified.listen_start", "Listen from the beginning")), /* @__PURE__ */ React3.createElement("label", {
              className: "flex items-center gap-2"
            }, readerText("simplified.reading_width", "Reading width"), /* @__PURE__ */ React3.createElement("select", {
              "aria-label": readerText("simplified.reading_width", "Reading width"),
              value: readingColumn,
              onChange: (e) => setReadingColumn(Number(e.target.value)),
              className: "rounded-lg border border-slate-300 bg-white px-2 py-2 text-slate-800"
            }, /* @__PURE__ */ React3.createElement("option", {
              value: 40
            }, readerText("simplified.width_narrow", "Narrow")), /* @__PURE__ */ React3.createElement("option", {
              value: 56
            }, readerText("simplified.width_medium", "Medium")), /* @__PURE__ */ React3.createElement("option", {
              value: 72
            }, readerText("simplified.width_wide", "Wide")))), /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              className: "underline underline-offset-2 rounded px-2 py-2 focus-visible:ring-2 focus-visible:ring-indigo-600",
              onClick: () => readingStartRef.current?.focus()
            }, readerText("simplified.skip_passage", "Skip reading controls")), props.onReadReflect && /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              onClick: openReadingReflection,
              className: "rounded-lg border border-indigo-200 bg-white px-3 py-2 text-indigo-800"
            }, readerText("simplified.read_reflect", "Read & reflect"))), /* @__PURE__ */ React3.createElement("div", {
              ref: readingStartRef,
              "data-reading-passage": "true",
              "data-paragraph-focus": !!isLineFocusMode,
              tabIndex: -1,
              role: "region",
              "aria-label": readerText("simplified.passage", "Reading passage"),
              className: (isLineFocusMode ? "bg-slate-950 rounded-xl p-4 " : "") + "rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            }, parts && isSideBySide ? /* @__PURE__ */ React3.createElement(React3.Fragment, null, parts.source.length !== parts.target.length && /* @__PURE__ */ React3.createElement("p", {
              role: "status",
              className: "mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
            }, readerText("simplified.unmatched_paragraphs", "The versions have different paragraph counts. They are shown in order; a row may not be an exact translation match.")), /* @__PURE__ */ React3.createElement("div", {
              className: "grid grid-cols-1 md:grid-cols-2 gap-4"
            }, Array.from({
              length: Math.max(rendered[0].length, rendered[1].length)
            }, (_, i) => /* @__PURE__ */ React3.createElement(React3.Fragment, {
              key: i
            }, languages.map((section, j) => /* @__PURE__ */ React3.createElement("section", {
              key: section.key,
              lang: simplifiedLanguageTag(section.label),
              dir: j === 1 ? "ltr" : sourceDirection,
              className: "min-w-0 rounded-xl border border-slate-200 bg-white/60 p-4",
              style: {
                backgroundColor: isLineFocusMode ? "transparent" : void 0
              }
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "mb-3 text-sm font-bold",
              style: {
                color: isLineFocusMode ? "#e2e8f0" : "#334155"
              }
            }, section.label), /* @__PURE__ */ React3.createElement("div", {
              style: {
                maxWidth: readingColumn + "ch",
                marginInline: "auto"
              }
            }, rendered[j][i] || /* @__PURE__ */ React3.createElement("p", {
              className: "text-sm italic text-slate-600"
            }, readerText("simplified.no_paired_paragraph", "No corresponding paragraph in this version."))))))))) : languages.map((section, i) => /* @__PURE__ */ React3.createElement("section", {
              key: section.key,
              lang: simplifiedLanguageTag(section.label),
              dir: i === 1 ? "ltr" : sourceDirection
            }, i === 1 && /* @__PURE__ */ React3.createElement("h2", {
              className: "my-6 border-t border-indigo-200 pt-4 text-lg font-bold"
            }, simplifiedEnglishTranslationLabel), rendered[i]))), /* @__PURE__ */ React3.createElement(SourceReferencesPanel, {
              referencesText: simplifiedReferences
            }), isProcessing && /* @__PURE__ */ React3.createElement("p", {
              role: "status",
              className: "mt-4 text-sm text-indigo-700"
            }, simplifiedGeneratingMoreLabel));
          }
          return /* @__PURE__ */ React3.createElement("div", {
            "data-adapted-reader": isTeacherMode ? "teacher" : "student",
            className: "space-y-6"
          }, activeReadAloudStatus && /* @__PURE__ */ React3.createElement("span", {
            className: "sr-only",
            role: "status",
            "aria-live": "polite",
            "aria-atomic": "true"
          }, activeReadAloudStatus), isImmersiveReaderActive && generatedContent?.immersiveData && /* @__PURE__ */ React3.createElement("div", {
            ref: immersiveDialogRef,
            role: "dialog",
            "aria-modal": "true",
            "aria-label": t("immersive.title") || "Immersive Reader",
            tabIndex: -1,
            onKeyDown: (e) => containSimplifiedModalFocus(e, immersiveDialogRef.current, handleCloseImmersiveReader),
            className: "fixed inset-0 z-[200] overflow-y-auto animate-in motion-reduce:animate-none fade-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none flex flex-col font-sans",
            style: {
              backgroundColor: immersiveSettings.bgColor || "#fdfbf7"
            },
            onPointerMove: (e) => {
              if (immersiveSettings.lineFocus && e.clientY > immersiveToolbarBottom) setImmersiveRulerY(e.clientY);
            },
            onFocusCapture: (e) => {
              if (immersiveSettings.lineFocus && !e.target.closest("[data-immersive-toolbar]") && e.target.closest("[role=dialog]") === immersiveDialogRef.current) {
                const rect = e.target.getBoundingClientRect();
                setImmersiveRulerY(Math.max(immersiveToolbarBottom + immersiveSettings.textSize * 2.5, rect.top + Math.min(rect.height / 2, immersiveSettings.textSize * 2.5)));
              }
            }
          }, /* @__PURE__ */ React3.createElement(ImmersiveToolbar, {
            settings: immersiveSettings,
            setSettings: setImmersiveSettings,
            onClose: handleCloseImmersiveReader,
            onGeneratePOS: handleGeneratePOSData,
            isGeneratingPOS: isAnalyzingPos,
            posReady: !!generatedContent?.posEnriched,
            onGenerateSyllables: handleGeneratePOSData,
            isGeneratingSyllables: isAnalyzingPos,
            syllablesReady: !!generatedContent?.posEnriched,
            playbackRate,
            setPlaybackRate,
            lineHeight,
            setLineHeight,
            letterSpacing,
            setLetterSpacing,
            isFocusReaderActive,
            onToggleFocusReader: () => setIsFocusReaderActive(!isFocusReaderActive),
            isChunkReaderActive,
            onToggleChunkReader: () => {
              setIsChunkReaderActive(!isChunkReaderActive);
              setChunkReaderIdx(0);
              setChunkReaderAutoPlay(false);
            },
            chunkReaderIdx,
            setChunkReaderIdx,
            chunkReaderAutoPlay,
            setChunkReaderAutoPlay,
            chunkReaderSpeed,
            setChunkReaderSpeed,
            chunkReaderMood,
            setChunkReaderMood,
            interactionMode,
            setInteractionMode,
            isCrawlReaderActive,
            onToggleCrawlReader: () => setIsCrawlReaderActive(!isCrawlReaderActive),
            isKaraokeOverlayActive,
            onToggleKaraokeOverlay: () => setIsKaraokeOverlayActive(!isKaraokeOverlayActive),
            chunkReaderReadAlong,
            onToggleChunkReaderReadAlong: () => {
              const next = !chunkReaderReadAlong;
              setChunkReaderReadAlong(next);
              setChunkReaderSweepPct(0);
              if (!next) {
                try {
                  if (chunkReaderSweepAudioRef.current) {
                    chunkReaderSweepAudioRef.current.pause();
                    chunkReaderSweepAudioRef.current = null;
                  }
                } catch (e) {
                }
                if (chunkReaderSweepRafRef.current) {
                  cancelAnimationFrame(chunkReaderSweepRafRef.current);
                  chunkReaderSweepRafRef.current = null;
                }
                try {
                  window.speechSynthesis && window.speechSynthesis.cancel();
                } catch (e) {
                }
              }
            },
            totalSentences: (() => {
              const sbs = getSideBySideContent(simplifiedReadAloudText);
              const ps = sbs ? [...sbs.source || [], ...sbs.target || []] : simplifiedReadAloudText.split(new RegExp("\\n{2,}"));
              return ps.flatMap((p) => p.trim().startsWith("|") ? [] : splitTextToSentences(p)).length || 1;
            })()
          }), /* @__PURE__ */ React3.createElement(ErrorBoundary, {
            fallbackMessage: "Focus reader encountered an error. Please close and reopen."
          }, /* @__PURE__ */ React3.createElement(FocusReaderOverlay, {
            language: leveledTextLanguage,
            isOpen: isFocusReaderActive,
            onClose: handleCloseSpeedReader,
            text: simplifiedDisplayBody.replace(/<[^>]*>/g, "")
          }), /* @__PURE__ */ React3.createElement(PerspectiveCrawlOverlay, {
            isOpen: isCrawlReaderActive,
            onClose: () => setIsCrawlReaderActive(false),
            text: (generatedContent?.immersiveData?.filter((w) => w.pos !== "newline")?.map((w) => w.text)?.join(" ") || "").replace(/<[^>]*>/g, "")
          }), /* @__PURE__ */ React3.createElement(KaraokeReaderOverlay, {
            isOpen: isKaraokeOverlayActive,
            isTeacher: isTeacherMode,
            onClose: () => setIsKaraokeOverlayActive(false),
            getAudioUrl: getKaraokeAudioUrl,
            sentenceList: karaokeReaderSentences,
            captureOn: saveTtsAsPlayed,
            onCaptureChange: setSaveTtsAsPlayedEnabled,
            text: (generatedContent?.immersiveData?.filter((w) => w.pos !== "newline")?.map((w) => w.text)?.join(" ") || "").replace(/<[^>]*>/g, "")
          })), immersiveSettings.lineFocus && /* @__PURE__ */ React3.createElement(React3.Fragment, null, /* @__PURE__ */ React3.createElement("div", {
            className: "fixed top-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[height] duration-75 ease-out motion-reduce:transition-none",
            style: {
              top: immersiveToolbarBottom + "px",
              height: Math.max(0, immersiveRulerY - immersiveSettings.textSize * 2.5 - immersiveToolbarBottom) + "px"
            }
          }), /* @__PURE__ */ React3.createElement("div", {
            className: "fixed bottom-0 left-0 right-0 bg-black/80 pointer-events-none z-[210] transition-[top] duration-75 ease-out motion-reduce:transition-none",
            style: {
              top: immersiveRulerY + immersiveSettings.textSize * 2.5 + "px"
            }
          }), /* @__PURE__ */ React3.createElement("div", {
            className: "fixed left-0 right-0 border-b border-indigo-400/30 z-[210] pointer-events-none transition-[top] duration-75 ease-out motion-reduce:transition-none",
            style: {
              top: immersiveRulerY + "px"
            }
          })), /* @__PURE__ */ React3.createElement("div", {
            "data-immersive-passage": true,
            tabIndex: 0,
            role: "region",
            "aria-label": "Reading passage. When Line Focus is on, use Up and Down arrows to move the reading window.",
            onKeyDown: (e) => {
              if (e.target === e.currentTarget && immersiveSettings.lineFocus && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                e.preventDefault();
                const step = immersiveSettings.textSize * lineHeight;
                setImmersiveRulerY((y) => Math.max(immersiveToolbarBottom + immersiveSettings.textSize * 2.5, Math.min(window.innerHeight - immersiveSettings.textSize, y + (e.key === "ArrowDown" ? step : -step))));
              }
            },
            className: "flex-grow overflow-y-auto p-5 md:p-16 custom-scrollbar relative z-10 focus-visible:outline focus-visible:outline-2"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: `max-w-4xl mx-auto transition-all duration-300`,
            style: {
              color: immersiveSettings.fontColor || "#1e293b",
              lineHeight,
              letterSpacing: `${immersiveSettings.wideText ? letterSpacing + 0.15 : letterSpacing}em`,
              wordSpacing: immersiveSettings.wideText ? "0.25em" : "normal",
              fontFamily: immersiveSettings.fontFamily || void 0
            }
          }, (() => {
            const isTable = (p) => p.trim().startsWith("|") || p.includes("\n|");
            let sentences = [];
            const sideBySideData = getSideBySideContent(simplifiedReadAloudText);
            if (sideBySideData) {
              const sourceSentences = sideBySideData.source.flatMap((p) => isTable(p) ? [] : splitTextToSentences(p));
              const targetSentences = sideBySideData.target.flatMap((p) => isTable(p) ? [] : splitTextToSentences(p));
              sentences = [...sourceSentences, ...targetSentences];
            } else {
              const paragraphs = simplifiedReadAloudText.split(/\n{2,}/);
              sentences = paragraphs.flatMap((p) => isTable(p) ? [] : splitTextToSentences(p));
            }
            let currentSentenceIdx = 0;
            let currentSentenceText = sentences[0] || "";
            let normalizedSentence = cleanSentenceForAudio(currentSentenceText).replace(/\s+/g, "").toLowerCase();
            let currentTokenBuffer = "";
            let activeChunkCharOffset = 0;
            let activeSweepCharOffset = 0;
            let lastWasActiveSentence = false;
            const reduceMotion = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            return generatedContent.immersiveData.map((wordData, i) => {
              if (wordData.pos === "newline") {
                return /* @__PURE__ */ React3.createElement("div", {
                  key: wordData.id || i,
                  className: "w-full h-4"
                });
              }
              while (!normalizedSentence && currentSentenceIdx < sentences.length - 1) {
                currentSentenceIdx++;
                currentSentenceText = sentences[currentSentenceIdx];
                normalizedSentence = cleanSentenceForAudio(currentSentenceText).replace(/\s+/g, "").toLowerCase();
                currentTokenBuffer = "";
              }
              const tokenStr = wordData.text.replace(/\s+/g, "").toLowerCase();
              const assignedIdx = currentSentenceIdx;
              currentTokenBuffer += tokenStr;
              if (currentTokenBuffer.length >= normalizedSentence.length) {
                if (currentSentenceIdx < sentences.length - 1) {
                  currentSentenceIdx++;
                  currentSentenceText = sentences[currentSentenceIdx];
                  normalizedSentence = cleanSentenceForAudio(currentSentenceText).replace(/\s+/g, "").toLowerCase();
                  currentTokenBuffer = "";
                }
              }
              const isChunkHighlight = isChunkReaderActive && assignedIdx === chunkReaderIdx;
              const isChunkDimmed = isChunkReaderActive && assignedIdx !== chunkReaderIdx;
              let wordStartChar = -1;
              let wordSweepStart = -1;
              let wordSweepWeight = 0;
              let sentenceSweepWeight = 1;
              if (isChunkHighlight) {
                if (!lastWasActiveSentence) {
                  activeChunkCharOffset = 0;
                  activeSweepCharOffset = 0;
                }
                wordStartChar = activeChunkCharOffset;
                activeChunkCharOffset += (wordData.text || "").length;
                wordSweepStart = activeSweepCharOffset;
                wordSweepWeight = Math.max(1, tokenStr.length);
                activeSweepCharOffset += wordSweepWeight;
                sentenceSweepWeight = Math.max(1, cleanSentenceForAudio(sentences[assignedIdx] || "").replace(/\s+/g, "").length);
                lastWasActiveSentence = true;
              } else {
                lastWasActiveSentence = false;
              }
              let moodOpacity = isChunkDimmed ? 0.45 : 1;
              let moodAnimation = "";
              let showHighlight = isChunkHighlight;
              let readAlongWordProgress = null;
              let readAlongWordState = null;
              if (isChunkHighlight && chunkReaderReadAlong) {
                const sweep = Math.max(0, Math.min(100, Number(chunkReaderSweepPct) || 0));
                const wordStartPct = wordSweepStart / sentenceSweepWeight * 100;
                const wordEndPct = (wordSweepStart + wordSweepWeight) / sentenceSweepWeight * 100;
                readAlongWordProgress = Math.max(0, Math.min(100, (sweep - wordStartPct) / Math.max(1e-4, wordEndPct - wordStartPct) * 100));
                readAlongWordState = readAlongWordProgress >= 100 ? "complete" : readAlongWordProgress > 0 ? "current" : "pending";
                showHighlight = readAlongWordProgress > 0;
                moodOpacity = 1;
              } else if (isChunkReaderActive && chunkReaderMood === "typewriter") {
                if (isChunkDimmed) moodOpacity = 0.2;
                if (isChunkHighlight) {
                  moodOpacity = wordStartChar < chunkTypewriterCharIdx ? 1 : 0;
                  if (wordStartChar >= chunkTypewriterCharIdx) showHighlight = false;
                }
              } else if (isChunkReaderActive && chunkReaderMood === "popin" && isChunkHighlight && !reduceMotion) {
                moodAnimation = "allo-chunk-popin 0.25s ease-out";
              } else if (isChunkReaderActive && chunkReaderMood === "pulse" && isChunkHighlight && !reduceMotion) {
                moodAnimation = "allo-chunk-pulse 2s ease-in-out infinite";
              }
              return /* @__PURE__ */ React3.createElement("span", {
                key: wordData.id || i,
                "data-sentence-idx": assignedIdx,
                "data-read-along-state": readAlongWordState || void 0,
                "data-read-along-progress": readAlongWordProgress == null ? void 0 : Math.round(readAlongWordProgress),
                style: {
                  opacity: moodOpacity,
                  transition: chunkReaderMood === "typewriter" ? "opacity 0.05s linear" : "all 0.3s ease",
                  // In chunk-read mode every word is click-to-jump (onClick below);
                  // pointer cursor surfaces the affordance without needing instructions.
                  ...isChunkReaderActive ? {
                    cursor: "pointer"
                  } : {},
                  ...moodAnimation ? {
                    animation: moodAnimation
                  } : {},
                  ...readAlongWordProgress != null ? {
                    backgroundImage: `linear-gradient(to right, rgba(250, 204, 21, 0.58) 0%, rgba(250, 204, 21, 0.58) ${readAlongWordProgress}%, transparent ${readAlongWordProgress}%, transparent 100%)`,
                    borderRadius: "4px",
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone"
                  } : showHighlight || isPlaying && playbackState.currentIdx === assignedIdx ? {
                    backgroundColor: "rgba(250, 204, 21, 0.35)",
                    borderRadius: "4px",
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone"
                  } : {}
                }
              }, /* @__PURE__ */ React3.createElement(ImmersiveWord, {
                wordData,
                settings: immersiveSettings,
                isActive: isPlaying && playbackState.currentIdx === assignedIdx || isChunkHighlight && (!chunkReaderReadAlong || readAlongWordProgress > 0),
                onClick: (e) => {
                  e.stopPropagation();
                  if (interactionMode === "define") {
                    handleWordClick(wordData.text, e);
                    return;
                  }
                  if (interactionMode === "phonics") {
                    handlePhonicsClick(wordData.text, e, {
                      audioPlayback: "reader"
                    });
                    return;
                  }
                  if (isChunkReaderActive) {
                    setChunkReaderIdx(assignedIdx);
                  } else {
                    const spokenWord = String(wordData.text || "").replace(/\s+/g, " ").trim();
                    if (spokenWord && typeof handleSpeak === "function") {
                      handleSpeak(spokenWord, `immersive-word-${wordData.id || i}`, 0, true);
                    }
                  }
                }
              }));
            });
          })()))), interactionMode === "cloze" && isClozeComplete && /* @__PURE__ */ React3.createElement("div", {
            className: "fixed inset-0 pointer-events-none z-[100] flex items-center justify-center",
            "data-a11y-overlay": "nonmodal-status",
            role: "status",
            "aria-live": "polite",
            "aria-atomic": "true"
          }, /* @__PURE__ */ React3.createElement(ConfettiExplosion, null), /* @__PURE__ */ React3.createElement("div", {
            className: "mt-40 bg-green-100 text-green-800 px-6 py-3 rounded-full font-bold border-4 border-white shadow-xl animate-in motion-reduce:animate-none zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none flex items-center gap-2"
          }, /* @__PURE__ */ React3.createElement(Trophy, {
            size: 24,
            className: "text-yellow-500 fill-current",
            "aria-hidden": "true"
          }), " ", simplifiedActivityCompleteLabel)), isTeacherMode && !isZenMode && /* @__PURE__ */ React3.createElement("div", {
            className: "bg-green-50 p-4 rounded-lg border border-green-100 mb-6"
          }, /* @__PURE__ */ React3.createElement("p", {
            className: "text-sm text-green-800"
          }, /* @__PURE__ */ React3.createElement("strong", null, t("simplified.udl_goal").split(":")[0], ":"), " ", t("simplified.udl_goal").split(":")[1])), /* @__PURE__ */ React3.createElement("div", {
            "data-reading-card": true,
            className: `bg-orange-50 border-l-4 border-orange-400 shadow-sm rounded-r-lg relative ${isZenMode ? "p-3 sm:p-4" : "p-3 sm:p-6 lg:p-8"}`
          }, !isZenMode && /* @__PURE__ */ React3.createElement("div", {
            className: "flex justify-center items-center mb-2 flex-wrap gap-2"
          }, (() => {
            const displayGrade = generatedContent?.config?.grade || gradeLevel;
            const displayLang = generatedContent?.config?.language || leveledTextLanguage;
            const displayInterests = generatedContent?.config?.interests || studentInterests || [];
            const displayStandards = generatedContent?.config?.standards || standardsInput;
            return /* @__PURE__ */ React3.createElement("div", {
              className: "flex min-w-0 flex-wrap items-center justify-center gap-2"
            }, /* @__PURE__ */ React3.createElement("h4", {
              className: "break-words font-comic font-bold text-xl text-orange-800"
            }, isTeacherMode ? `${t("simplified.target_level_label")}: ${displayGrade}` : generatedContent?.title || generatedContent?.topic || sourceTopic || readerText("simplified.your_reading", "Your reading")), displayLang !== "English" && /* @__PURE__ */ React3.createElement("span", {
              className: "bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold border border-blue-200"
            }, displayLang), isTeacherMode && displayInterests.length > 0 && /* @__PURE__ */ React3.createElement("span", {
              className: "bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold border border-red-200 flex items-center gap-1"
            }, /* @__PURE__ */ React3.createElement(Heart, {
              size: 10
            }), " ", t("simplified.engagement_optimized")), isTeacherMode && typeof displayStandards === "string" && displayStandards && /* @__PURE__ */ React3.createElement("span", {
              className: "bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200 flex items-center gap-1 cursor-help",
              title: `${t("simplified.label_standard")}: ${displayStandards}`
            }, /* @__PURE__ */ React3.createElement(CheckCircle, {
              size: 10
            }), displayStandards.length > 20 ? displayStandards.substring(0, 20) + "..." : displayStandards));
          })()), /* @__PURE__ */ React3.createElement("div", {
            className: `flex items-center gap-2 ${isZenMode ? "justify-center mb-4" : "justify-center"}`
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex flex-col gap-1 items-center min-w-0 w-full"
          }, /* @__PURE__ */ React3.createElement("div", {
            role: "group",
            "aria-label": readerText("simplified.reading_actions", "Reading tools"),
            className: "flex flex-wrap justify-center w-full min-w-0 bg-white rounded-2xl p-2 border border-indigo-200 shadow-sm gap-2"
          }, [["read", "simplified.read_mode", "Read", Volume2], ["define", "simplified.word_meaning", "Word meaning", Search], ["phonics", "simplified.word_sounds", "Word sounds", Ear], ...studentAiFeaturesHidden ? [] : [["explain", "simplified.explain_mode", "Explain", HelpCircle]], ...isTeacherMode ? [["add-glossary", "simplified.add_term", "Add term", Plus], ["revise", "simplified.revise_mode", "Revise", Pencil]] : []].map(([mode, key, fallback, Icon]) => /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            key: mode,
            "data-reading-mode": mode,
            "data-help-key": mode === "add-glossary" ? "simplified_add_term" : "simplified_" + mode + "_mode",
            onClick: () => chooseReadingMode(mode),
            "aria-pressed": interactionMode === mode && !isCompareMode && !isFluencyMode && !isEditingLeveledText,
            className: "min-h-11 rounded-xl px-3 py-2 text-sm font-bold inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-600 " + (interactionMode === mode && !isCompareMode && !isFluencyMode && !isEditingLeveledText ? "bg-indigo-100 text-indigo-900" : "text-slate-700 hover:bg-slate-100")
          }, /* @__PURE__ */ React3.createElement(Icon, {
            size: 16,
            "aria-hidden": "true"
          }), readerText(key, fallback))), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-expanded": practiceOpen,
            "aria-controls": "simplified-practice-tools",
            onClick: () => setPracticeOpen(!practiceOpen),
            className: "min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-600"
          }, readerText("simplified.practice_tools", "Practice"), practiceOpen ? /* @__PURE__ */ React3.createElement(ChevronUp, {
            size: 14,
            className: "inline ml-1"
          }) : /* @__PURE__ */ React3.createElement(ChevronDown, {
            size: 14,
            className: "inline ml-1"
          })), isTeacherMode && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "data-help-key": "simplified_compare_mode",
            "aria-pressed": !!isCompareMode,
            onClick: () => {
              const next = !isCompareMode;
              chooseReadingMode("read");
              setIsCompareMode(next);
            },
            className: "min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-600"
          }, /* @__PURE__ */ React3.createElement(GitCompare, {
            size: 16,
            className: "inline mr-1"
          }), readerText("simplified.compare_mode", "Compare"))), /* @__PURE__ */ React3.createElement("div", {
            id: "simplified-practice-tools",
            hidden: !practiceOpen,
            style: {
              display: practiceOpen ? void 0 : "none"
            },
            className: "flex flex-wrap justify-center gap-2 py-2"
          }, /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "data-help-key": "simplified_read_along",
            "aria-pressed": !!isFluencyMode,
            onClick: () => chooseReadingMode("fluency"),
            className: "min-h-11 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-900"
          }, readerText("simplified.read_along", "Read along")), !protectedOriginal && !isCompareMode && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "data-help-key": "simplified_cloze_mode",
            "aria-pressed": interactionMode === "cloze",
            onClick: () => chooseReadingMode("cloze"),
            className: "min-h-11 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-900"
          }, readerText("simplified.practice_blanks", "Fill in the blanks")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "data-help-key": "simplified_scramble_game",
            onClick: handleSetIsSyntaxGameToTrue,
            className: "min-h-11 rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-900"
          }, readerText("simplified.practice_sentences", "Sentence scramble"))), /* @__PURE__ */ React3.createElement("p", {
            role: "status",
            className: "my-2 text-center text-sm text-slate-700"
          }, isCompareMode ? readerText("simplified.compare_hint", "Review the source and adapted versions below.") : isEditingLeveledText ? readerText("simplified.edit_hint", "Edit the passage below. Choose Read to return to reading.") : isFluencyMode ? readerText("simplified.fluency_hint", "Use the read-along panel to practice at your own pace.") : interactionMode === "define" || interactionMode === "phonics" || interactionMode === "add-glossary" ? wordHelpHint : interactionMode === "explain" ? readerText("simplified.explain_hint", "Choose a sentence for an explanation, or select a longer passage.") : interactionMode === "revise" ? readerText("simplified.revise_hint", "Select the words you want to revise.") : interactionMode === "cloze" ? readerText("simplified.cloze_hint", "Fill in the missing words. Choose Read to see the complete passage.") : protectedOriginal ? readerText("simplified.original_read_hint", "Read at your own pace. Use Listen to hear the original.") : readerText("simplified.read_hint", "Read at your own pace. Choose any sentence to listen from there.")), /* @__PURE__ */ React3.createElement("div", {
            className: "flex flex-wrap items-center justify-center gap-2"
          }, typeof props.onFocusViewChange === "function" && /* @__PURE__ */ React3.createElement("button", {
            ref: focusViewButtonRef,
            type: "button",
            "data-reader-focus-view": true,
            "aria-pressed": !!isZenMode,
            "aria-describedby": "simplified-focus-view-hint",
            onClick: () => props.onFocusViewChange(!isZenMode),
            className: "min-h-11 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          }, isZenMode ? readerText("simplified.exit_focus_view", "Exit focus view") : readerText("simplified.focus_view", "Focus view")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": readerText("simplified.immersive_reader", "Immersive Reader"),
            "data-help-key": "simplified_immersive_reader",
            onClick: () => {
              if (generatedContent.immersiveData) {
                setIsImmersiveReaderActive(true);
              } else {
                handleAnalyzePOS();
              }
            },
            disabled: isAnalyzingPos || isEditingLeveledText,
            className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
            title: t("simplified.tip_immersive_btn")
          }, isAnalyzingPos ? /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 14,
            className: "animate-spin motion-reduce:animate-none"
          }) : /* @__PURE__ */ React3.createElement(BookOpen, {
            size: 14
          }), isAnalyzingPos ? t("simplified.loading_reader") : t("simplified.immersive_reader")), /* @__PURE__ */ React3.createElement("label", {
            className: "inline-flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm"
          }, /* @__PURE__ */ React3.createElement("span", null, readerText("header.reading_theme_aria", "Reading theme")), /* @__PURE__ */ React3.createElement("select", {
            "data-adapted-theme-picker": true,
            value: readingTheme || "default",
            title: readerText("simplified.theme_scope", "Changes the reading area. Your app theme stays the same."),
            onChange: (e) => setReadingTheme(e.target.value),
            "aria-label": simplifiedReadingThemeLabel,
            className: `min-h-11 min-w-0 max-w-full px-3 py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer ${readingTheme === "default" ? "border-slate-200 bg-white text-slate-600" : "border-indigo-300 bg-indigo-50 text-indigo-700"}`
          }, /* @__PURE__ */ React3.createElement("option", {
            value: "default"
          }, readerText("simplified.theme_follow_app", "Use app theme")), /* @__PURE__ */ React3.createElement("option", {
            value: "warm"
          }, t("header.reading_theme_warm")), /* @__PURE__ */ React3.createElement("option", {
            value: "sepia"
          }, t("header.reading_theme_sepia")), /* @__PURE__ */ React3.createElement("option", {
            value: "dark"
          }, t("header.reading_theme_dark")), /* @__PURE__ */ React3.createElement("option", {
            value: "dim"
          }, readerText("header.reading_theme_dim", "Dim")), /* @__PURE__ */ React3.createElement("option", {
            value: "highContrast"
          }, t("header.reading_theme_contrast")), /* @__PURE__ */ React3.createElement("option", {
            value: "blue"
          }, t("header.reading_theme_blue")), /* @__PURE__ */ React3.createElement("option", {
            value: "green"
          }, t("header.reading_theme_green")), /* @__PURE__ */ React3.createElement("option", {
            value: "rose"
          }, t("header.reading_theme_rose")), /* @__PURE__ */ React3.createElement("option", {
            value: "dyslexia"
          }, t("header.reading_theme_easy_read")))), isTeacherMode && !isZenMode && /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center mr-2"
          }, /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.settings"),
            "data-help-key": "simplified_teacher_tools",
            "aria-expanded": !!isTeacherToolbarExpanded,
            "aria-controls": "simplified-teacher-tools-panel",
            onClick: handleToggleIsTeacherToolbarExpanded,
            className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${isTeacherToolbarExpanded ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-600 border-slate-200 hover:text-indigo-600 hover:border-indigo-200"}`,
            title: t("simplified.teacher_tools_tooltip")
          }, /* @__PURE__ */ React3.createElement(Settings, {
            size: 14
          }), /* @__PURE__ */ React3.createElement("span", null, readerText("simplified.teacher_actions", "Teacher tools")), isTeacherToolbarExpanded ? /* @__PURE__ */ React3.createElement(ChevronLeft, {
            size: 14
          }) : /* @__PURE__ */ React3.createElement(ChevronRight, {
            size: 14
          })), /* @__PURE__ */ React3.createElement("div", {
            id: "simplified-teacher-tools-panel",
            hidden: !isTeacherToolbarExpanded,
            style: {
              display: isTeacherToolbarExpanded ? void 0 : "none"
            },
            className: `flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out ${isTeacherToolbarExpanded ? "flex-wrap max-w-[920px] opacity-100 ml-2" : "flex-nowrap max-w-0 opacity-0"}`
          }, /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: handleDuplicateResource,
            className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
            title: t("simplified.tip_duplicate_btn"),
            "aria-label": t("simplified.tip_duplicate_btn"),
            "data-help-key": "simplified_duplicate"
          }, /* @__PURE__ */ React3.createElement(Copy, {
            size: 14
          }), " ", t("common.duplicate")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: handleCheckLevel,
            disabled: isCheckingLevel,
            className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
            title: t("simplified.tip_check_level_btn"),
            "aria-label": t("simplified.tip_check_level_btn"),
            "data-help-key": "simplified_check_level"
          }, isCheckingLevel ? /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 14,
            className: "animate-spin motion-reduce:animate-none"
          }) : /* @__PURE__ */ React3.createElement(Search, {
            size: 14
          }), isCheckingLevel ? t("simplified.checking") : t("simplified.check_level")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: handleCheckAlignment,
            disabled: isCheckingAlignment || !standardsInput,
            className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${!standardsInput ? "opacity-50 cursor-not-allowed bg-slate-100 text-slate-600 border-slate-300" : "bg-white text-indigo-600 hover:bg-indigo-50 border-slate-300"}`,
            title: !standardsInput ? t("simplified.tip_rigor_disabled") : t("simplified.tip_rigor_btn"),
            "aria-label": !standardsInput ? t("simplified.tip_rigor_disabled") : t("simplified.tip_rigor_btn"),
            "data-help-key": "simplified_rigor_report"
          }, isCheckingAlignment ? /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 14,
            className: "animate-spin motion-reduce:animate-none"
          }) : /* @__PURE__ */ React3.createElement(ShieldCheck, {
            size: 14
          }), isCheckingAlignment ? t("simplified.checking") : t("simplified.rigor_report")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => copyToClipboard(generatedContent?.data),
            className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
            title: t("simplified.tip_copy_btn"),
            "aria-label": t("simplified.tip_copy_btn"),
            "data-help-key": "simplified_copy_text"
          }, /* @__PURE__ */ React3.createElement(Copy, {
            size: 14
          }), " ", t("common.copy_text")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => {
              if (isSimplifiedAudioDownloading) {
                try {
                  window.__alloCancelAudioDownload?.();
                } catch (_) {
                }
                return;
              }
              handleDownloadAudio(generatedContent?.data, `leveled-text-${gradeLevel}`, "dl-simplified-main");
            },
            title: isSimplifiedAudioDownloading ? simplifiedStopAudioDownloadLabel : t("simplified.tip_download_audio") || t("common.download_audio"),
            "aria-label": isSimplifiedAudioDownloading ? simplifiedStopAudioDownloadLabel : t("common.download_audio"),
            className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
            "data-help-key": "simplified_download_audio"
          }, isSimplifiedAudioDownloading ? /* @__PURE__ */ React3.createElement(StopCircle, {
            size: 14
          }) : /* @__PURE__ */ React3.createElement(Download, {
            size: 14
          }), isSimplifiedAudioDownloading ? t("common.stop") || simplifiedAudioStopLabel : t("common.download_audio")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: function() {
              if (ttsPrepState.busy) {
                var request = ttsPrepRequestRef.current;
                if (request && request.controller) request.controller.abort();
                window.__alloPrepareReadAloudCancel = true;
                return;
              }
              handlePrepareReadAloudAudio();
            },
            className: "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-slate-400 transition-all shadow-md whitespace-nowrap",
            title: ttsPrepState.busy ? t("common.stop") || simplifiedAudioStopLabel : t("immersive.prepare_all") || simplifiedAudioSaveLabel,
            "aria-label": ttsPrepState.busy ? t("common.stop") || simplifiedAudioStopLabel : t("immersive.prepare_all") || simplifiedAudioSaveLabel,
            "data-help-key": "simplified_save_tts"
          }, ttsPrepState.busy ? /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 14,
            className: "animate-spin motion-reduce:animate-none"
          }) : /* @__PURE__ */ React3.createElement(Volume2, {
            size: 14
          }), ttsPrepState.busy ? `${ttsPrepState.done}/${ttsPrepState.total || "..."} \u2713` : simplifiedAudioSaveLabel))), isTeacherMode && !protectedOriginal && !isZenMode && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.toggle_edit_text"),
            onClick: handleToggleIsEditingLeveledText,
            className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingLeveledText ? "bg-orange-700 text-white hover:bg-orange-700" : "bg-white text-orange-700 border border-orange-200 hover:bg-orange-50"}`,
            "data-help-key": "simplified_edit"
          }, isEditingLeveledText ? /* @__PURE__ */ React3.createElement(CheckCircle2, {
            size: 14
          }) : /* @__PURE__ */ React3.createElement(Pencil, {
            size: 14
          }), isEditingLeveledText ? t("common.done_editing") : t("common.edit"))), typeof props.onFocusViewChange === "function" && /* @__PURE__ */ React3.createElement("p", {
            id: "simplified-focus-view-hint",
            className: "mt-2 text-center text-xs text-slate-600"
          }, isZenMode ? readerText("simplified.focus_view_active", "Focus view is on. Exit any time to bring back the header and sidebar.") : readerText("simplified.focus_view_hint", "Focus view hides the header and sidebar so you can concentrate on reading.")))), ttsPrepNotice && /* @__PURE__ */ React3.createElement("p", {
            role: "status",
            "aria-live": "polite",
            "aria-atomic": "true",
            className: "rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
          }, ttsPrepNotice), definitionData && /* @__PURE__ */ React3.createElement("div", {
            ref: definitionDialogRef,
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "simplified-definition-title",
            tabIndex: -1,
            onKeyDown: (e) => containSimplifiedModalFocus(e, definitionDialogRef.current, closeDefinition),
            className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-64 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none fade-in zoom-in-75 duration-300 ease-out motion-reduce:animate-none motion-reduce:transition-none`,
            style: simplifiedPopupStyle(definitionData, 16)
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex justify-between items-start mb-2"
          }, /* @__PURE__ */ React3.createElement("h5", {
            id: "simplified-definition-title",
            className: "font-bold text-indigo-900 text-lg capitalize"
          }, definitionData.word), /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center gap-1"
          }, definitionData.text ? renderSimplifiedPopupSpeaker(SIMPLIFIED_DEFINE_AUDIO_ID, [definitionData.word, definitionData.text]) : null, /* @__PURE__ */ React3.createElement("button", {
            ref: definitionCloseRef,
            type: "button",
            onClick: closeDefinition,
            className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
            "aria-label": t("common.close")
          }, /* @__PURE__ */ React3.createElement(X, {
            size: 14
          })))), renderHelpAudioNotice("definition-"), definitionData.text ? renderReadingLevelExplanation(definitionData, t, renderFormattedText) : /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center gap-2 text-xs text-indigo-500"
          }, /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 12,
            className: "animate-spin motion-reduce:animate-none"
          }), " ", t("glossary.popups.finding")), definitionData.dictionary && renderDictionaryPanel(definitionData.dictionary, t, renderHelpAudioButton), definitionData.text && /* @__PURE__ */ React3.createElement("div", {
            className: "mt-3 pt-3 border-t border-slate-100"
          }, definitionData.imageUrl ? /* @__PURE__ */ React3.createElement("img", {
            src: definitionData.imageUrl,
            alt: definitionData.word,
            className: "w-full h-32 object-contain rounded-lg bg-slate-50 border border-slate-400"
          }) : definitionData.imageLoading ? /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center justify-center gap-2 text-xs text-indigo-600 h-20 bg-slate-50 rounded-lg border border-slate-400 border-dashed"
          }, /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 12,
            className: "animate-spin motion-reduce:animate-none"
          }), " ", t("common.loading") || "Loading picture...") : definitionData.imageError ? /* @__PURE__ */ React3.createElement("div", {
            className: "text-xs text-slate-500 italic text-center py-2"
          }, t("glossary.popups.image_error") || "Could not load picture.") : /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFetchWordImage(definitionData.word),
            className: "w-full flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg px-3 py-2 transition-colors",
            "aria-label": t("glossary.popups.show_picture") || "Show picture for this word"
          }, /* @__PURE__ */ React3.createElement(ImageIcon, {
            size: 12
          }), " ", t("glossary.popups.show_picture") || "Show picture")), /* @__PURE__ */ React3.createElement("div", {
            className: "absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-indigo-200 transform rotate-45"
          })), definitionData && /* @__PURE__ */ React3.createElement("div", {
            "aria-hidden": "true",
            className: `fixed inset-0 ${_popupBackdropZ}`,
            onClick: closeDefinition
          }), phonicsData && /* @__PURE__ */ React3.createElement("div", {
            ref: phonicsDialogRef,
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "phonics-popup-title",
            tabIndex: -1,
            onKeyDown: (e) => containSimplifiedModalFocus(e, phonicsDialogRef.current, closePhonics),
            className: `fixed ${_popupZ} bg-white allo-popover-solid p-5 rounded-xl shadow-2xl border-2 border-emerald-200 w-72 animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
            style: simplifiedPopupStyle(phonicsData, 18)
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex justify-between items-start mb-3"
          }, /* @__PURE__ */ React3.createElement("h5", {
            id: "phonics-popup-title",
            className: "min-w-0 break-words font-black text-emerald-900 text-2xl capitalize tracking-tight"
          }, phonicsData.word), /* @__PURE__ */ React3.createElement("button", {
            ref: phonicsCloseRef,
            type: "button",
            onClick: closePhonics,
            className: "min-h-11 min-w-11 shrink-0 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
            "aria-label": t("common.close")
          }, /* @__PURE__ */ React3.createElement(X, {
            size: 14
          }))), renderHelpAudioNotice("phonics-"), phonicsData.isLoading ? /* @__PURE__ */ React3.createElement("div", {
            className: "flex flex-col items-center justify-center py-6 gap-2 text-emerald-700"
          }, /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 24,
            className: "animate-spin motion-reduce:animate-none",
            "aria-hidden": "true"
          }), /* @__PURE__ */ React3.createElement("span", {
            className: "text-xs font-bold uppercase tracking-wider"
          }, t("glossary.popups.analyzing"))) : phonicsData.data ? /* @__PURE__ */ React3.createElement("div", {
            className: "space-y-4"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex flex-wrap items-center justify-between gap-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100"
          }, /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("div", {
            className: "text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1"
          }, t("glossary.phonetic_spelling")), /* @__PURE__ */ React3.createElement("div", {
            className: "text-lg font-serif italic text-slate-700"
          }, "/", phonicsData.data.phoneticSpelling, "/")), renderHelpAudioButton("phonics-word", null, phonicsData.word, phonicsData.language)), renderPhonicsDictRow(phonicsData, t, renderHelpAudioButton), /* @__PURE__ */ React3.createElement("div", {
            className: "space-y-3"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "bg-slate-50 p-3 rounded border border-slate-100"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "text-xs font-bold text-slate-600 mb-2"
          }, t("glossary.popups.syllables")), /* @__PURE__ */ React3.createElement("div", {
            className: "flex flex-wrap items-center gap-1"
          }, Array.isArray(phonicsData.data.syllables) && phonicsData.data.syllables.some((syl) => typeof syl === "string" && syl.trim()) ? phonicsData.data.syllables.filter((syl) => typeof syl === "string" && syl.trim()).map((syl, i) => /* @__PURE__ */ React3.createElement(React3.Fragment, {
            key: i
          }, i > 0 && /* @__PURE__ */ React3.createElement("span", {
            className: "text-emerald-700 font-bold px-0.5",
            "aria-hidden": "true"
          }, "\u2022"), /* @__PURE__ */ React3.createElement("span", {
            className: "bg-white px-1.5 rounded border border-slate-400 text-sm font-bold text-slate-700 shadow-sm"
          }, syl))) : /* @__PURE__ */ React3.createElement("span", {
            className: "text-sm text-slate-700"
          }, helpText("simplified.word_parts_unavailable", "Word parts are unavailable. You can still listen to the word.")))), phonicsData.data.ipa && /* @__PURE__ */ React3.createElement("details", {
            className: "bg-slate-50 p-3 rounded border border-slate-100"
          }, /* @__PURE__ */ React3.createElement("summary", {
            className: "min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          }, helpText("simplified.word_ipa_details", "Pronunciation symbols (IPA)")), /* @__PURE__ */ React3.createElement("p", {
            className: "mt-2 font-mono text-sm text-slate-700"
          }, phonicsData.data.ipa)))) : /* @__PURE__ */ React3.createElement("div", {
            className: "text-center text-red-600 text-xs font-bold py-4"
          }, t("glossary.popups.failed")), /* @__PURE__ */ React3.createElement("div", {
            className: "allo-popover-solid absolute -top-2 left-6 w-4 h-4 bg-white border-t-2 border-l-2 border-emerald-200 transform rotate-45"
          })), phonicsData && /* @__PURE__ */ React3.createElement("div", {
            "aria-hidden": "true",
            className: `fixed inset-0 ${_popupBackdropZ}`,
            onClick: closePhonics
          }), selectionMenu && /* @__PURE__ */ React3.createElement("div", {
            ref: selectionDialogRef,
            role: "dialog",
            "aria-modal": "true",
            "aria-label": readerText("simplified.selected_passage", "Selected passage"),
            tabIndex: -1,
            onKeyDown: (e) => containSimplifiedModalFocus(e, selectionDialogRef.current, () => {
              setSelectionMenu(null);
              setIsCustomReviseOpen(false);
            }),
            className: `fixed ${_popupZ} flex flex-col gap-1 items-center animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2 duration-200`,
            style: simplifiedPopupStyle(selectionMenu, 20)
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "bg-slate-900/90 text-white text-[11px] px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-sm max-w-[150px] truncate border border-slate-700"
          }, '"', selectionMenu.text.length > 20 ? selectionMenu.text.substring(0, 20) + "..." : selectionMenu.text, '"'), /* @__PURE__ */ React3.createElement("div", {
            className: "bg-slate-800 text-white rounded-full shadow-xl p-1 flex items-center gap-1"
          }, isCustomReviseOpen ? /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center gap-1 px-1 animate-in motion-reduce:animate-none slide-in-from-right-2 duration-200"
          }, /* @__PURE__ */ React3.createElement("input", {
            "aria-label": t("common.enter_custom_revise_instruction"),
            autoFocus: true,
            type: "text",
            value: customReviseInstruction,
            onChange: (e) => setCustomReviseInstruction(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") handleReviseSelection("custom", customReviseInstruction);
              if (e.key === "Escape") setIsCustomReviseOpen(false);
            },
            placeholder: t("text_tools.menu_placeholder"),
            className: "text-xs bg-slate-700 border-none rounded-full px-3 py-1.5 focus:ring-1 focus:ring-indigo-400 outline-none text-white w-48 placeholder:text-slate-600"
          }), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.continue"),
            onClick: () => handleReviseSelection("custom", customReviseInstruction),
            className: "p-1.5 bg-indigo-600 hover:bg-indigo-600 rounded-full text-white transition-colors",
            disabled: !customReviseInstruction.trim()
          }, /* @__PURE__ */ React3.createElement(ArrowRight, {
            size: 12
          })), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.close_revision_panel"),
            onClick: handleSetIsCustomReviseOpenToFalse,
            className: "p-1.5 text-slate-600 hover:text-white rounded-full transition-colors"
          }, /* @__PURE__ */ React3.createElement(X, {
            size: 12
          }))) : /* @__PURE__ */ React3.createElement(React3.Fragment, null, interactionMode === "explain" && /* @__PURE__ */ React3.createElement("button", {
            ref: selectionActionRef,
            type: "button",
            "aria-label": readerText("simplified.explain_mode", "Explain"),
            onClick: () => handleReviseSelection("explain"),
            className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
          }, /* @__PURE__ */ React3.createElement(HelpCircle, {
            size: 12,
            className: "text-teal-700"
          }), " ", t("text_tools.explain")), interactionMode === "revise" && /* @__PURE__ */ React3.createElement(React3.Fragment, null, /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.generate"),
            onClick: () => handleReviseSelection("simplify"),
            className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
          }, /* @__PURE__ */ React3.createElement(Sparkles, {
            size: 12,
            className: "text-yellow-700"
          }), " ", t("text_tools.simplify")), /* @__PURE__ */ React3.createElement("div", {
            className: "w-px h-3 bg-slate-600"
          }), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleReviseSelection("custom-input"),
            className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
          }, /* @__PURE__ */ React3.createElement(PenTool, {
            size: 12,
            className: "text-indigo-600"
          }), " ", t("text_tools.custom"))), interactionMode === "define" && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.search"),
            onClick: handleDefineSelection,
            className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
          }, /* @__PURE__ */ React3.createElement(Search, {
            size: 12,
            className: "text-yellow-700"
          }), " ", t("text_tools.define")), interactionMode === "add-glossary" && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.add"),
            onClick: () => {
              handleQuickAddGlossary(selectionMenu.text, true);
              setSelectionMenu(null);
            },
            className: "px-3 py-1.5 hover:bg-white/20 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
          }, /* @__PURE__ */ React3.createElement(Plus, {
            size: 12,
            className: "text-green-700"
          }), " ", t("text_tools.add_term")))), /* @__PURE__ */ React3.createElement("div", {
            className: "w-2 h-2 bg-slate-800 rotate-45"
          })), selectionMenu && /* @__PURE__ */ React3.createElement("div", {
            className: `fixed inset-0 ${_popupBackdropZ} bg-transparent`,
            onMouseDown: (e) => {
              setSelectionMenu(null);
              setIsCustomReviseOpen(false);
            }
          }), revisionData && /* @__PURE__ */ React3.createElement("div", {
            ref: revisionDialogRef,
            role: "dialog",
            "aria-modal": "true",
            "aria-labelledby": "simplified-revision-title",
            tabIndex: -1,
            onKeyDown: (e) => containSimplifiedModalFocus(e, revisionDialogRef.current, closeRevision),
            className: `fixed ${_popupZ} bg-white p-4 rounded-xl shadow-2xl border border-indigo-200 w-72 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in motion-reduce:animate-none zoom-in-95 duration-200 motion-reduce:animate-none motion-reduce:transition-none`,
            style: simplifiedPopupStyle(revisionData, 18)
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex justify-between items-center mb-3 pb-2 border-b border-slate-100"
          }, /* @__PURE__ */ React3.createElement("h5", {
            id: "simplified-revision-title",
            className: "font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2"
          }, revisionData.type === "simplify" ? /* @__PURE__ */ React3.createElement(Sparkles, {
            size: 14,
            className: "text-yellow-500"
          }) : revisionData.type === "custom" ? /* @__PURE__ */ React3.createElement(PenTool, {
            size: 14,
            className: "text-indigo-500"
          }) : /* @__PURE__ */ React3.createElement(HelpCircle, {
            size: 14,
            className: "text-teal-500"
          }), revisionData.type === "simplify" ? t("simplified.revision.header_simplify") : revisionData.type === "custom" ? t("simplified.revision.header_custom") : t("simplified.revision.header_explain")), /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center gap-1"
          }, revisionData.result ? renderSimplifiedPopupSpeaker(SIMPLIFIED_REVISION_AUDIO_ID, revisionData.result) : null, /* @__PURE__ */ React3.createElement("button", {
            ref: revisionCloseRef,
            type: "button",
            onClick: closeRevision,
            className: "min-h-11 min-w-11 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2",
            "aria-label": t("common.close")
          }, /* @__PURE__ */ React3.createElement(X, {
            size: 14
          })))), revisionData.result ? /* @__PURE__ */ React3.createElement(React3.Fragment, null, /* @__PURE__ */ React3.createElement("div", {
            className: "text-sm text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-100 mb-3"
          }, renderFormattedText(revisionData.result, false)), isTeacherMode && !protectedOriginal && (revisionData.type === "simplify" || revisionData.type === "custom") && /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.apply_text_revision"),
            onClick: applyTextRevision,
            className: "min-h-11 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
          }, /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 12
          }), " ", t("simplified.revision.replace_btn"))) : /* @__PURE__ */ React3.createElement("div", {
            className: "flex flex-col items-center justify-center py-4 gap-2 text-slate-600"
          }, /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 20,
            className: "animate-spin motion-reduce:animate-none text-indigo-500"
          }), /* @__PURE__ */ React3.createElement("span", {
            className: "text-xs"
          }, t("simplified.revision.working")))), revisionData && /* @__PURE__ */ React3.createElement("div", {
            "aria-hidden": "true",
            className: `fixed inset-0 ${_popupBackdropZ} bg-black/5`,
            onClick: closeRevision
          }), isTeacherMode && !isZenMode && /* @__PURE__ */ React3.createElement("details", {
            "data-teacher-reading-review": true,
            className: "my-4 rounded-xl border border-indigo-200 bg-white p-3"
          }, /* @__PURE__ */ React3.createElement("summary", {
            className: "min-h-11 cursor-pointer py-2 text-sm font-bold text-indigo-900 focus-visible:ring-2 focus-visible:ring-indigo-600"
          }, readerText("simplified.review_adjust", "Review & adjust text")), isTeacherMode && !protectedOriginal && !isCompareMode && !isZenMode && generatedContent && ["simplified", "quiz", "sentence-frames", "glossary"].includes(generatedContent.type) && /* @__PURE__ */ React3.createElement("div", {
            className: "bg-white p-4 rounded-lg border border-indigo-100 shadow-sm mb-6 mx-1",
            "data-help-key": "simplified_complexity_slider"
          }, /* @__PURE__ */ React3.createElement("label", {
            className: "block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 text-center"
          }, generatedContent.type === "quiz" ? t("simplified.complexity_controls.adjust_difficulty") : generatedContent.type === "sentence-frames" ? t("simplified.complexity_controls.adjust_scaffolding") : generatedContent.type === "glossary" ? t("simplified.complexity_controls.adjust_definition") : t("simplified.complexity_controls.adjust_relative")), /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center gap-3"
          }, /* @__PURE__ */ React3.createElement("span", {
            className: "text-xs font-bold text-slate-600 uppercase w-20 text-right"
          }, generatedContent.type === "quiz" ? t("simplified.complexity_controls.easier") : generatedContent.type === "sentence-frames" ? t("simplified.complexity_controls.more_support") : t("simplified.complexity_controls.simpler")), /* @__PURE__ */ React3.createElement("div", {
            className: "relative flex-grow h-6 flex items-center"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 transform -translate-x-1/2"
          }), /* @__PURE__ */ React3.createElement("input", {
            "aria-label": readerText("simplified.adjust_complexity", "Adjust text complexity"),
            type: "range",
            min: "1",
            max: "9",
            step: "1",
            value: complexityLevel,
            onChange: (e) => setComplexityLevel(parseInt(e.target.value)),
            "aria-valuetext": complexityLevel < 5 ? readerText("simplified.simpler_setting", "Simpler") + " " + complexityLevel : complexityLevel > 5 ? readerText("simplified.complex_setting", "More complex") + " " + complexityLevel : readerText("simplified.unchanged_setting", "Current version"),
            disabled: isProcessing,
            "aria-busy": isProcessing,
            className: "w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 z-10 relative"
          })), /* @__PURE__ */ React3.createElement("span", {
            className: "text-xs font-bold text-slate-600 uppercase w-20"
          }, generatedContent.type === "quiz" ? t("simplified.complexity_controls.harder") : generatedContent.type === "sentence-frames" ? t("simplified.complexity_controls.less_support") : t("simplified.complexity_controls.complex"))), /* @__PURE__ */ React3.createElement("div", {
            className: "px-2 sm:px-16"
          }, /* @__PURE__ */ React3.createElement(ComplexityGauge, {
            level: complexityLevel
          })), /* @__PURE__ */ React3.createElement("div", {
            className: "mt-3 text-center"
          }, /* @__PURE__ */ React3.createElement("p", {
            className: "text-xs text-slate-600 mb-2"
          }, readerText("simplified.adjust_hint", "Choose a change, then apply it. Review the new version before sharing.")), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "data-apply-complexity": true,
            onClick: handleComplexityAdjustment,
            disabled: isProcessing || Number(complexityLevel) === 5,
            className: "min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          }, isProcessing ? readerText("simplified.applying_change", "Updating text\u2026") : readerText("simplified.apply_complexity", "Apply text change"))), /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center justify-center mt-4 pt-3 border-t border-slate-100"
          }, /* @__PURE__ */ React3.createElement("label", {
            className: `flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full cursor-pointer select-none transition-all border ${saveOriginalOnAdjust ? "bg-indigo-100 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500 ring-offset-1 shadow-sm" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-700"}`,
            title: t("common.choose_overwrite_version"),
            "data-help-key": "simplified_overwrite_toggle"
          }, /* @__PURE__ */ React3.createElement("input", {
            "aria-label": t("common.toggle_save_original_on_adjust"),
            type: "checkbox",
            checked: saveOriginalOnAdjust,
            onChange: (e) => setSaveOriginalOnAdjust(e.target.checked),
            className: "h-4 w-4 accent-indigo-600"
          }), saveOriginalOnAdjust ? /* @__PURE__ */ React3.createElement(CheckCircle2, {
            size: 16
          }) : /* @__PURE__ */ React3.createElement(Copy, {
            size: 16
          }), /* @__PURE__ */ React3.createElement("span", null, saveOriginalOnAdjust ? t("common.keep_original") : t("common.overwrite_version"))))), isTeacherMode && generatedContent.relevel && (() => {
            const info = generatedContent.relevel || {};
            const fmt = (v) => Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "?";
            const undoRelevel = () => {
              const restored = {
                ...generatedContent,
                data: info.fromText
              };
              delete restored.relevel;
              delete restored.levelCheck;
              if (info.fromLocalStats) restored.localStats = info.fromLocalStats;
              else delete restored.localStats;
              if (info.fromInstructionalText) restored.instructionalText = info.fromInstructionalText;
              if (info.fromLevelCheck) restored.levelCheck = info.fromLevelCheck;
              setGeneratedContent(restored);
              if (typeof setHistory === "function") setHistory((prev) => prev.map((item) => item.id === restored.id ? restored : item));
            };
            return /* @__PURE__ */ React3.createElement("div", {
              role: "status",
              "data-relevel": "auto",
              className: "mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900"
            }, /* @__PURE__ */ React3.createElement("span", {
              className: "font-bold uppercase tracking-wider"
            }, t("simplified.relevel_label") || "Re-leveled automatically"), /* @__PURE__ */ React3.createElement("span", null, `Measured grade ${fmt(info.measuredBefore)} \u2192 ${fmt(info.measuredAfter)} (target ${info.targetGrade || ""}). The measurement and the review agreed the first draft was ${info.direction === "simpler" ? "too complex" : "too simple"}.`), /* @__PURE__ */ React3.createElement("button", {
              type: "button",
              onClick: undoRelevel,
              className: "ml-auto rounded-full border border-indigo-300 bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
            }, t("simplified.relevel_undo") || "Undo re-level"));
          })(), isTeacherMode && generatedContent.levelCheck && generatedContent.levelCheck.triangulation && generatedContent.levelCheck.triangulation.note && !generatedContent.levelCheck.triangulation.agree && /* @__PURE__ */ React3.createElement("div", {
            role: "status",
            "data-relevel": "disagreement",
            className: "mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          }, /* @__PURE__ */ React3.createElement("span", {
            className: "font-bold uppercase tracking-wider mr-2"
          }, t("simplified.level_signals_disagree") || "Two reads, one text"), /* @__PURE__ */ React3.createElement("span", null, generatedContent.levelCheck.triangulation.note)), isTeacherMode && !generatedContent.levelCheck && simplifiedComplexityDisplay.measuredGrade !== null && (() => {
            const measured = simplifiedComplexityDisplay.measuredGrade;
            const targetGrade = simplifiedComplexityDisplay.targetGrade;
            const status = simplifiedComplexityDisplay.status;
            const tone = status === "above-target" ? "bg-amber-50 border-amber-200 text-amber-900" : status === "below-target" ? "bg-blue-50 border-blue-200 text-blue-900" : status === "within-target" ? "bg-green-50 border-green-200 text-green-900" : "bg-slate-50 border-slate-200 text-slate-700";
            const verdict = status === "above-target" ? `Above the target range for ${targetGrade}` : status === "below-target" ? `Below the target range for ${targetGrade}` : status === "within-target" ? `Within the target range for ${targetGrade}` : "";
            const rangeNote = simplifiedComplexityDisplay.target && simplifiedComplexityDisplay.target.fkLabel ? ` Shared target range: ${simplifiedComplexityDisplay.target.fkLabel}.` : "";
            const stats = generatedContent.localStats || {};
            return /* @__PURE__ */ React3.createElement("div", {
              className: `mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs ${tone}`,
              "data-complexity-status": status
            }, /* @__PURE__ */ React3.createElement("span", {
              className: "font-bold uppercase tracking-wider"
            }, t("simplified.measured_level_label") || "Measured reading level"), /* @__PURE__ */ React3.createElement("span", {
              className: "font-mono font-bold text-sm",
              title: `${t("analysis.readability.formula") || "Flesch-Kincaid"}: (0.39 \xD7 ASL) + (11.8 \xD7 ASW) - 15.59
${t("analysis.readability.words") || "Words"}: ${stats.words || "\u2014"}
${t("analysis.readability.sentences") || "Sentences"}: ${stats.sentences || "\u2014"}
${t("analysis.readability.syllables") || "Syllables"}: ${stats.syllables || "\u2014"}`
            }, measured), verdict && /* @__PURE__ */ React3.createElement("span", {
              className: "font-semibold"
            }, verdict), /* @__PURE__ */ React3.createElement("span", {
              className: "text-[11px] opacity-80"
            }, "Flesch-Kincaid, measured on this passage.", rangeNote, " Use Check Level for a fuller review."), /* @__PURE__ */ React3.createElement("label", {
              className: "ml-auto flex items-center gap-1 text-[11px] font-semibold cursor-pointer",
              title: "After each adapted text, run one model review alongside this measurement and re-level automatically only when both agree the target was missed."
            }, /* @__PURE__ */ React3.createElement("input", {
              type: "checkbox",
              checked: !!autoLevelCheckOn,
              onChange: (e) => setAutoLevelCheckOn(e.target.checked),
              className: "h-3 w-3"
            }), t("simplified.auto_level_check") || "Auto-check on generate"));
          })(), isTeacherMode && !generatedContent.levelCheck && simplifiedComplexityDisplay.status === "stale" && /* @__PURE__ */ React3.createElement("div", {
            role: "status",
            className: "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          }, /* @__PURE__ */ React3.createElement("strong", null, "Reading-level measurement needs refresh."), " The text changed after it was measured; use Check Level before relying on a complexity verdict."), isTeacherMode && generatedContent.levelCheck && /* @__PURE__ */ React3.createElement("div", {
            className: "mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-start gap-3"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "bg-indigo-100 p-2 rounded-full text-indigo-600 mt-1"
          }, /* @__PURE__ */ React3.createElement(Search, {
            size: 16
          })), /* @__PURE__ */ React3.createElement("div", {
            className: "flex-grow"
          }, /* @__PURE__ */ React3.createElement("h4", {
            className: "font-bold text-indigo-900 text-sm flex items-center justify-between"
          }, t("simplified.level_analysis_title"), /* @__PURE__ */ React3.createElement("span", {
            className: "text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full"
          }, generatedContent.levelCheck.confirmedLevel || generatedContent.levelCheck.estimatedLevel)), generatedContent.levelCheck.rubric ? /* @__PURE__ */ React3.createElement("div", {
            className: "mt-3 space-y-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm"
          }, /* @__PURE__ */ React3.createElement("p", {
            className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
          }, t("simplified.complexity_rubric_title")), Object.entries(generatedContent.levelCheck.rubric).map(([key, data]) => {
            const percent = (data.score + 5) / 10 * 100;
            const isAligned = Math.abs(data.score) <= 1;
            const colorClass = isAligned ? "bg-green-500" : data.score < 0 ? "bg-blue-400" : "bg-red-400";
            return /* @__PURE__ */ React3.createElement("div", {
              key,
              className: "space-y-1"
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "flex justify-between text-xs"
            }, /* @__PURE__ */ React3.createElement("span", {
              className: "font-bold text-slate-700 capitalize"
            }, key.replace(/([A-Z])/g, " $1").trim()), /* @__PURE__ */ React3.createElement("span", {
              className: `font-mono font-bold ${isAligned ? "text-green-600" : "text-slate-600"}`
            }, data.score > 0 ? "+" : "", data.score)), /* @__PURE__ */ React3.createElement("div", {
              className: "relative h-2 bg-slate-100 rounded-full overflow-hidden"
            }, /* @__PURE__ */ React3.createElement("div", {
              className: "absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 z-10"
            }), /* @__PURE__ */ React3.createElement("div", {
              className: `absolute top-0 bottom-0 rounded-full transition-all duration-500 ${colorClass}`,
              style: {
                left: data.score < 0 ? `${percent}%` : "50%",
                width: `${Math.abs(data.score) * 10}%`
              }
            })), /* @__PURE__ */ React3.createElement("p", {
              className: "text-[11px] text-slate-600 italic"
            }, simplifiedAiText(data.reason)));
          }), /* @__PURE__ */ React3.createElement("div", {
            className: "flex justify-between text-[11px] text-slate-600 font-bold uppercase tracking-widest mt-1"
          }, /* @__PURE__ */ React3.createElement("span", null, t("simplified.gauge_simple")), /* @__PURE__ */ React3.createElement("span", null, t("simplified.gauge_aligned")), /* @__PURE__ */ React3.createElement("span", null, t("simplified.gauge_complex")))) : /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
          }, /* @__PURE__ */ React3.createElement("span", {
            className: "text-xs font-bold uppercase tracking-wider text-slate-600"
          }, t("simplified.level_estimate_label"), ":"), /* @__PURE__ */ React3.createElement("span", {
            className: "font-bold text-indigo-700 bg-white px-2 py-0.5 rounded text-sm border border-indigo-100 shadow-sm"
          }, generatedContent.levelCheck.estimatedLevel), /* @__PURE__ */ React3.createElement("span", {
            className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.levelCheck.alignment === "Aligned" ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`
          }, generatedContent.levelCheck.alignment)), /* @__PURE__ */ React3.createElement("p", {
            className: "text-sm text-slate-700 leading-relaxed mt-2 p-2 bg-indigo-50/50 rounded italic border border-indigo-100/50"
          }, '"', generatedContent.levelCheck.nuanceSummary || generatedContent.levelCheck.feedback, '"')), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.close_fluency_session"),
            onClick: () => {
              const updated = {
                ...generatedContent
              };
              delete updated.levelCheck;
              setGeneratedContent(updated);
            },
            className: "text-slate-600 hover:text-slate-600 p-1"
          }, /* @__PURE__ */ React3.createElement(X, {
            size: 14
          })))), isTeacherMode && generatedContent.alignmentCheck && /* @__PURE__ */ React3.createElement("div", {
            className: "mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-lg animate-in motion-reduce:animate-none slide-in-from-top-2"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-start gap-3"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "bg-emerald-100 p-2 rounded-full text-emerald-800 mt-1"
          }, /* @__PURE__ */ React3.createElement(ShieldCheck, {
            size: 16
          })), /* @__PURE__ */ React3.createElement("div", {
            className: "flex-grow"
          }, /* @__PURE__ */ React3.createElement("h4", {
            className: "font-bold text-emerald-900 text-sm"
          }, t("simplified.rigor_check_title")), /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center flex-wrap gap-2 mt-1 mb-2"
          }, /* @__PURE__ */ React3.createElement("span", {
            className: "text-xs font-bold uppercase tracking-wider text-slate-600"
          }, t("simplified.rigor_status_label"), ":"), /* @__PURE__ */ React3.createElement("span", {
            className: `text-xs font-bold px-2 py-0.5 rounded border ${generatedContent.alignmentCheck.status === "Aligned" ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"}`
          }, generatedContent.alignmentCheck.status)), /* @__PURE__ */ React3.createElement("div", {
            className: "space-y-2 mb-3"
          }, /* @__PURE__ */ React3.createElement("p", {
            className: "text-sm text-slate-700 leading-relaxed"
          }, /* @__PURE__ */ React3.createElement("span", {
            className: "font-bold text-emerald-800"
          }, t("simplified.rigor_evidence_label"), ":"), ' "', generatedContent.alignmentCheck.evidence, '"'), /* @__PURE__ */ React3.createElement("p", {
            className: "text-sm text-slate-700 leading-relaxed"
          }, /* @__PURE__ */ React3.createElement("span", {
            className: "font-bold text-emerald-800"
          }, t("simplified.rigor_analysis_label"), ":"), " ", generatedContent.alignmentCheck.rigorReport), generatedContent.alignmentCheck.missingElements && generatedContent.alignmentCheck.missingElements !== "None" && /* @__PURE__ */ React3.createElement("p", {
            className: "text-sm text-red-700 leading-relaxed bg-red-50 p-2 rounded border border-red-100"
          }, /* @__PURE__ */ React3.createElement("span", {
            className: "font-bold flex items-center gap-1"
          }, /* @__PURE__ */ React3.createElement(AlertCircle, {
            size: 12
          }), " ", t("simplified.missing_label"), ":"), " ", generatedContent.alignmentCheck.missingElements)), generatedContent.alignmentCheck.improvement && /* @__PURE__ */ React3.createElement("div", {
            className: "bg-white p-3 rounded border border-emerald-200 mt-2 shadow-sm"
          }, /* @__PURE__ */ React3.createElement("p", {
            className: "text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1"
          }, /* @__PURE__ */ React3.createElement(Sparkles, {
            size: 12
          }), " ", t("simplified.suggestion_label")), /* @__PURE__ */ React3.createElement("p", {
            className: "text-sm text-slate-600 italic mb-2"
          }, '"', generatedContent.alignmentCheck.improvement, '"'), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.regenerate_with_rigor"),
            onClick: handleRegenerateWithRigor,
            disabled: isProcessing,
            "aria-busy": isProcessing,
            className: "text-xs font-bold bg-emerald-700 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          }, /* @__PURE__ */ React3.createElement(RefreshCw, {
            size: 12,
            className: isProcessing ? "animate-spin motion-reduce:animate-none" : ""
          }), " ", t("simplified.apply_regenerate")))), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            "aria-label": t("common.close_fluency_results"),
            onClick: () => {
              const updated = {
                ...generatedContent
              };
              delete updated.alignmentCheck;
              setGeneratedContent(updated);
            },
            className: "text-slate-600 hover:text-slate-600 p-1"
          }, /* @__PURE__ */ React3.createElement(X, {
            size: 14
          }))))), instructionalRoleControl, versionControls, isCompareMode ? renderSimplifiedComparison() : isEditingLeveledText ? /* @__PURE__ */ React3.createElement("div", {
            className: "w-full bg-white border border-orange-200 rounded-lg overflow-hidden shadow-sm"
          }, /* @__PURE__ */ React3.createElement("div", {
            className: "flex items-center gap-1 p-2 bg-orange-50 border-b border-orange-100"
          }, /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("bold"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
            title: t("formatting.bold")
          }, /* @__PURE__ */ React3.createElement(Bold, {
            size: 16,
            strokeWidth: 3
          })), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("italic"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
            title: t("formatting.italic")
          }, /* @__PURE__ */ React3.createElement(Italic, {
            size: 16
          })), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("highlight"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
            title: t("formatting.highlight")
          }, /* @__PURE__ */ React3.createElement(Highlighter, {
            size: 16
          })), /* @__PURE__ */ React3.createElement("div", {
            className: "w-px h-4 bg-orange-200 mx-1"
          }), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("h1"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
            title: t("formatting.h1")
          }, "H1"), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("h2"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
            title: t("formatting.h2")
          }, "H2"), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("h3"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors font-bold text-xs",
            title: t("formatting.h3") || "Heading 3"
          }, "H3"), /* @__PURE__ */ React3.createElement("div", {
            className: "w-px h-4 bg-orange-200 mx-1"
          }), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("list"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
            title: t("formatting.list")
          }, /* @__PURE__ */ React3.createElement(List, {
            size: 16
          })), /* @__PURE__ */ React3.createElement("button", {
            type: "button",
            onClick: () => handleFormatText("numlist"),
            className: "p-1.5 rounded hover:bg-orange-200 text-orange-800 transition-colors",
            title: t("formatting.numlist") || "Numbered List"
          }, /* @__PURE__ */ React3.createElement(ListOrdered, {
            size: 16
          }))), /* @__PURE__ */ React3.createElement("textarea", {
            "aria-label": t("simplified.revision.placeholder_edit_text") || "Edit simplified text",
            "data-allo-textundo": "simplified",
            ref: textEditorRef,
            value: generatedContent?.data,
            onChange: (e) => handleSimplifiedTextChange(e.target.value),
            className: "w-full min-h-[500px] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 text-lg text-slate-800 font-medium leading-relaxed resize-none font-sans",
            spellCheck: "false",
            placeholder: t("simplified.revision.placeholder_edit_text")
          }), renderEditAudioSentenceTools()) : protectedOriginal ? renderOriginalReading() : renderSimplifiedReading()));
        }
        SimplifiedView.languageTag = simplifiedLanguageTag;
        SimplifiedView.wordSegments = simplifiedWordSegments;
        SimplifiedView.paragraphBlocks = simplifiedParagraphBlocks;
        SimplifiedView.resolveReferences = resolveSimplifiedReferences;
        SimplifiedView.hasCitationMarkers = simplifiedBodyHasCitationMarkers;
        SimplifiedView.getInstructionalText = getSimplifiedInstructionalText;
        SimplifiedView.updateInstructionalRole = updateSimplifiedInstructionalRole;
        SimplifiedView.upsertFullHistoryArtifact = upsertFullHistoryArtifact;
        SimplifiedView.resolveCompareSource = resolveSimplifiedCompareSource;
        SimplifiedView.getComplexityDisplay = getSimplifiedComplexityDisplay;
        SimplifiedView.checkAlignment = checkSimplifiedAlignment;
        SimplifiedView.regenerateWithRigor = regenerateSimplifiedWithRigor;
        window.AlloModules = window.AlloModules || {};
        window.AlloModules.SimplifiedView = SimplifiedView;
        window.AlloModules.ViewSimplifiedModule = true;
      })();
    }
  });

  // reports/novak-feedback-implementation/fixture.jsx
  var import_react = __toESM(require_react());
  var import_client = __toESM(require_client());
  window.React = import_react.default;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  require_instructional_context_module();
  require_pure_helpers_module();
  require_phase_n_misc_helpers_module();
  require_view_simplified_module();
  var pure = window.AlloModules.PureHelpers;
  var phase = window.AlloModules.PhaseNHelpers;
  var View = window.AlloModules.SimplifiedView;
  var api = window.AlloModules.InstructionalContext;
  var source = "THE RIVER\r\n\r\nBeneath the bridge, the restless river whispered.\r\nMaya paused, listening to its persistent voice.\r\n\r\n\u201CWhere are you going?\u201D she asked.\r\nThe water hurried toward the sea.";
  var snapshot = api.createSourceSnapshot(source, { language: "English", sourceArtifactId: "analysis-one", selection: "input" });
  var original = api.createSupportedReading(snapshot, { id: "original-one", title: "The River \u2014 Original with supports" });
  var glossStart = source.indexOf("persistent");
  original.readingSupports = api.validateReadingSupports(snapshot, [{ id: "persistent", kind: "gloss", start: glossStart, end: glossStart + 10, quote: "persistent", text: "continuing for a long time" }]);
  var adapted = { id: "adapted-one", type: "simplified", data: "THE RIVER\r\n\r\nUnder the bridge, the moving river whispered.\r\nMaya stopped and listened to its steady voice.\r\n\r\n\u201CWhere are you going?\u201D she asked.\r\nThe water rushed toward the sea.", sourceSnapshot: snapshot, instructionalText: { role: "supplemental", form: "adapted" }, config: { language: "English", grade: "5" } };
  window.fixture = { source, adapted: adapted.data, events: [] };
  var noop = () => {
  };
  function App() {
    const [item, setItem] = import_react.default.useState(adapted), [compare, setCompare] = import_react.default.useState(true), [mode, setMode] = import_react.default.useState("read"), [playing, setPlaying] = import_react.default.useState(false), [playingId, setPlayingId] = import_react.default.useState(null), [theme, setTheme] = import_react.default.useState("light"), [focus, setFocus] = import_react.default.useState(false), [focused, setFocused] = import_react.default.useState(null);
    const stop = () => {
      setPlaying(false);
      setPlayingId(null);
    };
    const open = (next, both = false) => {
      stop();
      setItem(next);
      setCompare(both);
    };
    const t = (k) => k.split(".").reduce((v, p) => v?.[p], window.fixtureStrings) || k;
    const props = { ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: setTheme, readingTheme: theme, setSelectionMenu: noop, setIsCustomReviseOpen: noop, setInteractionMode: setMode, setIsCompareMode: setCompare, setIsFluencyMode: noop, stopPlayback: stop, closeDefinition: noop, closePhonics: noop, closeRevision: noop, handleToggleIsEditingLeveledText: noop, t, generatedContent: item, inputText: "Unrelated source must never be shown", gradeLevel: "5", leveledTextLanguage: "English", studentInterests: [], selectedVoice: "Kore", voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: compare, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: playing, playingContentId: playingId, interactionMode: mode, history: [original, adapted], textEditorRef: import_react.default.useRef(null), splitTextToSentences: (s) => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: (text, id, idx, restart, language) => {
      window.fixture.events.push({ type: "speak", text, id, language });
      setPlayingId(id);
      setPlaying(true);
    }, handleWordClick: (word, event, context) => window.fixture.events.push({ type: "define", word, context }), handleQuickAddGlossary: noop, handlePhonicsClick: (word, event, context) => window.fixture.events.push({ type: "phonics", word, context }), isLineFocusMode: focus, setIsLineFocusMode: setFocus, focusedParagraphIndex: focused, setFocusedParagraphIndex: setFocused, cursorStyles: { read: "", define: "", "add-glossary": "", revise: "" }, getContentDirection: () => "ltr", isRtlLang: () => false, renderFormattedText: (text) => import_react.default.createElement("div", null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: (x) => x, latestGlossary: [], MathSymbol: ({ text: text2 }) => text2 }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: (x) => x, latestGlossary: [], onReadOriginal: () => open(original), onOpenReadingArtifact: open };
    return import_react.default.createElement("main", { className: "max-w-6xl mx-auto p-4" }, import_react.default.createElement("h1", { className: "text-2xl font-bold mb-3" }, "The River"), import_react.default.createElement(View, props));
  }
  (0, import_client.createRoot)(document.getElementById("root")).render(import_react.default.createElement(App));
})();
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

scheduler/cjs/scheduler.production.min.js:
  (**
   * @license React
   * scheduler.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react-dom/cjs/react-dom.production.min.js:
  (**
   * @license React
   * react-dom.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/

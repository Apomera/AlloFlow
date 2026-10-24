// STEM_GRADING_CORE_BEGIN v1 (copied verbatim into each tool that grades; tests/stem_grading_core.test.js keeps the copies identical)
(function () {
  var MINUS = String.fromCharCode(0x2212);
  // A typed answer as a number: "-3", "2.5", "1,000", "3/4", "1 1/2" and the typographic minus.
  // Anything else (units, words, "1/0") is NaN, so a caller can tell "not a number" from "wrong".
  function toNumber(value) {
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    var s = value.split(MINUS).join('-').replace(/\s+/g, ' ').trim();
    if (!s) return NaN;
    if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    var m = s.match(/^([+-]?)(\d+) (\d+)\/(\d+)$/);
    if (m) {
      var den = +m[4];
      if (!den) return NaN;
      var mixed = +m[2] + (+m[3]) / den;
      return m[1] === '-' ? -mixed : mixed;
    }
    m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)) ?\/ ?([+-]?(?:\d+\.?\d*|\.\d+))$/);
    if (m) {
      var d = parseFloat(m[2]);
      return d ? parseFloat(m[1]) / d : NaN;
    }
    return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s) ? parseFloat(s) : NaN;
  }
  // Equal within an absolute tolerance, a relative one, or float noise, whichever is largest.
  function sameNumber(a, b, opts) {
    var x = toNumber(a), y = toNumber(b);
    if (!isFinite(x) || !isFinite(y)) return false;
    var o = opts || {};
    var tol = Math.max(+o.tolerance || 0, (+o.relative || 0) * Math.abs(y), 1e-9 * Math.max(1, Math.abs(y)));
    return Math.abs(x - y) <= tol;
  }
  // Credit an item once: returns whether `key` is new and the next seen-map to store.
  // The map is never mutated, so it can live in tool state.
  function creditOnce(seen, key) {
    var map = seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {};
    var k = String(key);
    if (Object.prototype.hasOwnProperty.call(map, k)) return { isNew: false, seen: map };
    var next = {};
    for (var p in map) if (Object.prototype.hasOwnProperty.call(map, p)) next[p] = map[p];
    next[k] = true;
    return { isNew: true, seen: next };
  }
  var api = { version: 1, toNumber: toNumber, sameNumber: sameNumber, creditOnce: creditOnce };
  var current = window.StemLab.grading;
  if (!current || !(current.version >= api.version)) window.StemLab.grading = api;
})();
// STEM_GRADING_CORE_END

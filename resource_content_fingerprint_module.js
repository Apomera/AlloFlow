/* Deterministic versions for resource dependencies. No UI or network dependencies. */
(function(root) {
'use strict';
  var MAX_DEPTH = 32;
  var MAX_NODES = 10000;
  var MAX_SNAPSHOT_ITEMS = 5000;
  var IGNORED_KEYS = { timestamp: 1, updatedAt: 1, createdAt: 1, lastAccessed: 1, __proto__: 1, constructor: 1, prototype: 1 };
  var hasOwn = Object.prototype.hasOwnProperty;

  // A deterministic content version, independent of object property order and save timestamps.
  function fingerprint(resource) {
    const seen = new WeakSet();
    let nodes = 0;
    function stable(value, depth) {
      if (value === null || typeof value !== 'object') {
        try { return JSON.stringify(value) ?? 'null'; }
        catch (_) { return JSON.stringify(String(value)); }
      }
      if (depth > MAX_DEPTH) return '"[max-depth]"';
      if (seen.has(value)) return '"[circular]"';
      if (++nodes > MAX_NODES) return '"[truncated]"';
      seen.add(value);
      const result = Array.isArray(value)
        ? '[' + value.map(function (v) { return stable(v, depth + 1); }).join(',') + ']'
        : '{' + Object.keys(value)
            .filter(function (key) { return !hasOwn.call(IGNORED_KEYS, key); })
            .sort()
            .map(function (key) { return JSON.stringify(key) + ':' + stable(value[key], depth + 1); })
            .join(',') + '}';
      seen.delete(value);
      return result;
    }
    const text = stable(resource || {}, 0); let a = 2166136261, b = 5381;
    for (let i=0;i<text.length;i++) { a = Math.imul(a ^ text.charCodeAt(i),16777619); b = Math.imul(b,33) ^ text.charCodeAt(i); }
    return 'af1:' + (a>>>0).toString(16).padStart(8,'0') + (b>>>0).toString(16).padStart(8,'0');
  }
  function snapshot(resources) {
    var out = Object.create(null);
    var list = Array.isArray(resources) ? resources.slice(0, MAX_SNAPSHOT_ITEMS) : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || typeof item !== 'object' || !item.id) continue;
      var id = String(item.id).slice(0, 200);
      if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
      out[id] = fingerprint(item);
    }
    return Object.assign({}, out);
  }

const api = Object.freeze({ fingerprint, snapshot });
if (typeof module === 'object' && module.exports) module.exports = api;
if (typeof window !== 'undefined') { window.AlloModules = window.AlloModules || {}; window.AlloModules.ResourceContentFingerprint = api; window.AlloModules.ResourceContentFingerprintModule = true; }
else if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.ResourceContentFingerprint = api; }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null);

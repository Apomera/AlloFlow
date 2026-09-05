/* Deterministic versions for resource dependencies. No UI or network dependencies. */
(function(root) {
'use strict';
  // A deterministic content version, independent of object property order and save timestamps.
  function fingerprint(resource) {
    const seen = new WeakSet();
    function stable(value) {
      if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
      if (seen.has(value)) return '"[circular]"';
      seen.add(value);
      const result = Array.isArray(value) ? '[' + value.map(stable).join(',') + ']' : '{' + Object.keys(value).filter(key => !['timestamp','updatedAt','createdAt','lastAccessed'].includes(key)).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',') + '}';
      seen.delete(value); return result;
    }
    const text = stable(resource || {}); let a = 2166136261, b = 5381;
    for (let i=0;i<text.length;i++) { a = Math.imul(a ^ text.charCodeAt(i),16777619); b = Math.imul(b,33) ^ text.charCodeAt(i); }
    return 'af1:' + (a>>>0).toString(16).padStart(8,'0') + (b>>>0).toString(16).padStart(8,'0');
  }
  function snapshot(resources) {
    return Object.fromEntries((Array.isArray(resources)?resources:[]).filter(item=>item?.id).map(item=>[String(item.id),fingerprint(item)]));
  }

const api = { fingerprint, snapshot };
if (typeof module === 'object' && module.exports) module.exports = api;
if (typeof window !== 'undefined') { window.AlloModules = window.AlloModules || {}; window.AlloModules.ResourceContentFingerprint = api; window.AlloModules.ResourceContentFingerprintModule = true; }
else if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.ResourceContentFingerprint = api; }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null);

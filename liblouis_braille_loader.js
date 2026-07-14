/**
 * liblouis_braille_loader.js — AlloFlow UEB Grade 2 braille (liblouis)
 *
 * Upgrades AlloFlow's Electronic Braille (.brf) export from the hand-rolled
 * Grade-1 (uncontracted, English-only) converter to UEB Grade 2 (contracted)
 * using liblouis — the open-source braille translator behind NVDA, JAWS and
 * BrailleBlaster. liblouis-js (Reiner Dolp), GPL-3.0; tables LGPL-2.1+.
 *
 * Exposes a single fallback-safe entry point:
 *     window.AlloBraille.toUEB(text) -> Promise<string|null>
 * Resolves to a BRF-ready ASCII-braille string (UEB Grade 2), or NULL on ANY
 * problem (offline, load failure, unexpected API). The caller MUST fall back
 * to its existing Grade-1 converter when this returns null/throws, so the
 * worst case is exactly today's behaviour — never a regression.
 *
 * Lazy: the ~2 MB liblouis build + tables are fetched only on the first call
 * (i.e. only when a teacher actually exports braille), never at page load.
 *
 * NOTE (2026-07-05): written against the verified liblouis@0.4.0 easy-api
 * (globals window.liblouis / window.LiblouisEasyApi; translateString;
 * enableOnDemandTableLoading) and the liblouis-build tables on jsDelivr, but
 * NOT yet browser-smoke-tested. If liblouis fails to initialise the export
 * silently keeps working via the Grade-1 fallback.
 */
(function () {
  'use strict';
  if (window.AlloBraille && typeof window.AlloBraille.toUEB === 'function') return;

  var BUILD_URL = 'https://cdn.jsdelivr.net/npm/liblouis-build/build-no-tables-utf16.js';
  var EASY_URL = 'https://cdn.jsdelivr.net/npm/liblouis@0.4.0/easy-api.js';
  var TABLES_URL = 'https://cdn.jsdelivr.net/npm/liblouis-build/tables/';
  // UEB Grade 2 (contracted), with the Unicode display table so translateString
  // returns Unicode braille cells that we map to Braille-ASCII below.
  var TABLE_LIST = 'unicode.dis,en-ueb-g2.ctb';
  var CELLS_PER_LINE = 40;

  // Unicode braille (U+2800 + 6-bit dot value) → North-American Braille ASCII
  // (0x20–0x5F). Index = dot value (dot1=1,dot2=2,dot3=4,dot4=8,dot5=16,dot6=32).
  var ASCII_BRAILLE = " A1B'K2L@CIF/MSP\"E3H9O6R^DJG>NTQ,*5<-U8V.%[$+X!&;:4\\0Z7(_?W]#Y)=";

  var _readyPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function getInstance() {
    // easy-api auto-creates window.liblouis when the build is ready; otherwise
    // construct one from the build global (Module / liblouisBuild).
    if (window.liblouis && typeof window.liblouis.translateString === 'function') return window.liblouis;
    if (typeof window.LiblouisEasyApi === 'function') {
      try {
        var build = (typeof window.liblouisBuild !== 'undefined') ? window.liblouisBuild
          : (typeof window.Module !== 'undefined' ? window.Module : undefined);
        var inst = new window.LiblouisEasyApi(build);
        if (inst && typeof inst.translateString === 'function') { window.liblouis = inst; return inst; }
      } catch (_) {}
    }
    return null;
  }

  function waitForReady(timeoutMs) {
    var deadline = Date.now() + (timeoutMs || 12000);
    return new Promise(function (resolve, reject) {
      (function poll() {
        var inst = getInstance();
        if (inst) {
          try { inst.version(); resolve(inst); return; } catch (_) { /* runtime not up yet */ }
        }
        if (Date.now() > deadline) { reject(new Error('liblouis did not initialise in time')); return; }
        setTimeout(poll, 150);
      })();
    });
  }

  function ensureReady() {
    if (_readyPromise) return _readyPromise;
    _readyPromise = loadScript(BUILD_URL)
      .then(function () { return loadScript(EASY_URL); })
      .then(function () { return waitForReady(12000); })
      .then(function (inst) {
        try { inst.enableOnDemandTableLoading(TABLES_URL); } catch (e) { /* still usable if tables cached */ }
        return inst;
      })
      .catch(function (e) { _readyPromise = null; throw e; }); // allow a later retry
    return _readyPromise;
  }

  function unicodeBrailleToAscii(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code >= 0x2800 && code <= 0x28ff) {
        out += ASCII_BRAILLE[code & 0x3f] || ' '; // mask to 6 dots (drop dots 7/8 for BRF)
      } else if (code === 0x20 || code === 0x09) {
        out += ' ';
      } else {
        // Any stray literal char liblouis passed through — keep printable ASCII.
        out += (code >= 0x20 && code <= 0x7e) ? s[i] : '';
      }
    }
    return out;
  }

  // Greedy word-wrap at CELLS_PER_LINE, breaking on spaces; hard-split words
  // longer than a line. Preserves the embosser's 40-cell default.
  function wrap(asciiLine, into) {
    if (asciiLine.length <= CELLS_PER_LINE) { into.push(asciiLine); return; }
    var words = asciiLine.split(' ');
    var cur = '';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      while (w.length > CELLS_PER_LINE) { // a single long token
        if (cur) { into.push(cur); cur = ''; }
        into.push(w.slice(0, CELLS_PER_LINE));
        w = w.slice(CELLS_PER_LINE);
      }
      if (!cur) cur = w;
      else if (cur.length + 1 + w.length <= CELLS_PER_LINE) cur += ' ' + w;
      else { into.push(cur); cur = w; }
    }
    if (cur) into.push(cur);
  }

  window.AlloBraille = {
    /**
     * Translate plain text to UEB Grade 2 Braille-ASCII (BRF-ready). Resolves
     * to a string, or NULL if liblouis is unavailable / anything goes wrong.
     */
    toUEB: function (text) {
      var src = String(text == null ? '' : text);
      if (!src.trim()) return Promise.resolve(null);
      return ensureReady().then(function (inst) {
        var lines = src.replace(/\r\n?/g, '\n').split('\n');
        var out = [];
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (!line.trim()) { out.push(''); continue; }
          var braille = inst.translateString(TABLE_LIST, line);
          if (braille == null) return null; // treat as failure → caller falls back
          wrap(unicodeBrailleToAscii(braille), out);
        }
        var result = out.join('\r\n');
        // Sanity gate: if we somehow produced nothing usable, signal fallback.
        return result && result.replace(/[\s]/g, '').length ? result : null;
      }).catch(function () { return null; });
    },
    _tableList: TABLE_LIST
  };

  console.log('[AlloBraille] liblouis_braille_loader.js ready — window.AlloBraille.toUEB(text) (lazy UEB Grade 2)');
})();

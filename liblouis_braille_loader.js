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

// ── Grade-1 (uncontracted) Braille-ASCII — the offline, no-WASM converter ────
// shared by BOTH .brf export lanes (the PDF remediation view + the Document
// Builder export menu) so they can't drift. Fixes over the old inline copies:
//   - a letter sign (dots 5-6 = ';') after a number so "1a" reads as "1" then
//     "a", not "11" (the digits 1-0 share the a-j cells);
//   - smart-punctuation normalization + NFD accent folding (curly quotes, em/en
//     dashes, e-acute -> e) so accented / typographic text transliterates
//     instead of being silently dropped;
//   - word-aware 40-cell wrapping (no mid-word breaks); and
//   - a dropped-character count (opts.withMeta) so a caller can warn honestly
//     when a script has no Grade-1 English braille equivalent (CJK, Arabic...).
var _G1_DIGIT = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'J' };
// Supported UEB symbols expressed as North-American Braille ASCII. Anything
// outside this explicit set is counted and omitted instead of passing raw ASCII
// through as an unrelated braille cell.
var _G1_PUNCT = {
  ',': '1', ';': '2', ':': '3', '.': '4', '!': '6', '?': '8',
  '(': '"<', ')': '">', "'": "'", '-': '-', '/': '_/',
  '*': '"9', '&': '@&', '+': '"6', '=': '"7', '<': '@<', '>': '@>'
};
var _G1_SMART = { '\u2018': "'", '\u2019': "'", '\u2013': '-', '\u2014': '-', '\u2026': '...', '\u00a0': ' ', '\u2022': '*' };
var _G1_OPEN_QUOTE = '\ue000';
var _G1_CLOSE_QUOTE = '\ue001';
var _G1_PREFIX = /[#,;@_^".]$/;
function _g1HardSplit(word, into, cells) {
  // Numeric continuation indicator (dot 5 = ") keeps a divided numeric item
  // in numeric mode on the next braille line.
  if (/^#[A-J14]+$/.test(word)) {
    while (word.length > cells) { into.push(word.slice(0, cells - 1) + '"'); word = word.slice(cells - 1); }
    if (word) into.push(word);
    return;
  }
  while (word.length > cells) {
    var cut = cells;
    while (cut > 1 && _G1_PREFIX.test(word.slice(0, cut))) cut--;
    into.push(word.slice(0, cut));
    word = word.slice(cut);
  }
  if (word) into.push(word);
}
function _g1Wrap(line, into, cells) {
  if (line.length <= cells) { into.push(line); return; }
  var words = line.split(' '), cur = '';
  for (var i = 0; i < words.length; i++) {
    var w = words[i];
    if (w.length > cells) { if (cur) { into.push(cur); cur = ''; } _g1HardSplit(w, into, cells); continue; }
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= cells) cur += ' ' + w;
    else { into.push(cur); cur = w; }
  }
  if (cur) into.push(cur);
}
function toGrade1BRF(text, opts) {
  var src = String(text == null ? '' : text);
  var cells = (opts && opts.cellsPerLine) || 40;
  src = src.replace(/[\u201c\u00ab]/g, _G1_OPEN_QUOTE).replace(/[\u201d\u00bb]/g, _G1_CLOSE_QUOTE);
  src = src.replace(/[\u2018\u2019\u2013\u2014\u2026\u00a0\u2022]/g, function (c) { return _G1_SMART[c] || ''; });
  try { src = src.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
  var lines = src.replace(/\r\n?/g, '\n').split('\n');
  var out = [], dropped = 0;
  for (var li = 0; li < lines.length; li++) {
    var chars = Array.from(lines[li]), bl = '', numMode = false;
    for (var i = 0; i < chars.length; i++) {
      var ch = chars[i];
      if (ch >= '0' && ch <= '9') { if (!numMode) { bl += '#'; numMode = true; } bl += _G1_DIGIT[ch]; continue; }
      if (numMode && (ch === ',' || ch === '.')) { bl += _G1_PUNCT[ch]; continue; }
      if (numMode && ch >= 'a' && ch <= 'j') bl += ';';
      numMode = false;
      if (ch >= 'a' && ch <= 'z') { bl += ch.toUpperCase(); continue; }
      if (ch >= 'A' && ch <= 'Z') {
        var end = i;
        while (end < chars.length && chars[end] >= 'A' && chars[end] <= 'Z') end++;
        var prevIsLetter = i > 0 && /[A-Za-z]/.test(chars[i - 1]);
        var nextIsLetter = end < chars.length && /[A-Za-z]/.test(chars[end]);
        if (!prevIsLetter && !nextIsLetter && end - i >= 2) { bl += ',,' + chars.slice(i, end).join(''); i = end - 1; }
        else bl += ',' + ch;
        continue;
      }
      if (ch === ' ' || ch === '\t') { bl += ' '; continue; }
      if (ch === _G1_OPEN_QUOTE) { bl += '8'; continue; }
      if (ch === _G1_CLOSE_QUOTE) { bl += '0'; continue; }
      if (ch === '"') {
        var prev = i > 0 ? chars[i - 1] : '';
        bl += (!prev || /\s|[([{]/.test(prev)) ? '8' : '0';
        continue;
      }
      if (_G1_PUNCT[ch] !== undefined) { bl += _G1_PUNCT[ch]; continue; }
      dropped++;
    }
    _g1Wrap(bl, out, cells);
  }
  var brf = out.join('\r\n');
  return (opts && opts.withMeta) ? { brf: brf, dropped: dropped } : brf;
}
if (typeof window !== 'undefined') {
  window.AlloBraille = window.AlloBraille || {};
  if (typeof window.AlloBraille.toGrade1BRF !== 'function') window.AlloBraille.toGrade1BRF = toGrade1BRF;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { toGrade1BRF: toGrade1BRF };

// ── UEB Grade 2 (contracted) via liblouis — browser only, lazy ──────────────
if (typeof window !== 'undefined') (function () {
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

  window.AlloBraille = Object.assign(window.AlloBraille || {}, {
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
  });

  console.log('[AlloBraille] liblouis_braille_loader.js ready — window.AlloBraille.toUEB(text) (lazy UEB Grade 2) + toGrade1BRF(text) (Grade 1)');
})();

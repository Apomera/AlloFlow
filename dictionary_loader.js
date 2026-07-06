/**
 * dictionary_loader.js — AlloFlow offline/authoritative dictionary (secondary source)
 *
 * Every "Define a word" and glossary meaning in AlloFlow is AI-generated (Gemini)
 * — there is no non-AI knowledge source in that path. This adds an AUTHORITATIVE
 * dictionary as a SECONDARY source that sits BESIDE the AI's grade-leveled
 * explanation (triangulation: the real definition vs. the leveled one), and that
 * a class builds up OFFLINE as it goes.
 *
 * Exposes a fallback-safe entry point:
 *     window.AlloDictionary.lookup(word) -> Promise<{ word, phonetic, audio, meanings, synonyms, source } | null>
 * Resolves to a normalized dictionary entry, or NULL when the word isn't found /
 * offline with no cache / any failure — so callers keep their AI-only behaviour,
 * never a regression.
 *
 * Sources, in order:
 *   1. localStorage cache (allo_dict_<word>) — words looked up once work OFFLINE
 *      thereafter (progressive offline; the School Box bundle is a follow-up).
 *   2. dictionaryapi.dev (Free Dictionary API, CORS-open, no key) — real
 *      Wiktionary-sourced definitions + synonyms + phonetics. English only.
 *
 * NOTE (2026-07-06): dictionaryapi.dev CORS `*` + response shape verified; the
 * in-popup render is browser-smoke-pending. Null-on-failure means the Define
 * popup falls back to exactly today's AI-only behaviour.
 */
(function () {
  'use strict';
  if (window.AlloDictionary && typeof window.AlloDictionary.lookup === 'function') return;

  var API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
  var CACHE_PREFIX = 'allo_dict_';
  var CACHE_MAX = 1200; // cap the cached-word count so localStorage can't grow unbounded

  function normalizeWord(w) {
    return String(w == null ? '' : w).toLowerCase().trim().replace(/^[^\p{L}]+|[^\p{L}'-]+$/gu, '');
  }

  function readCache(word) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + word);
      if (!raw) return undefined; // undefined = not cached; null = cached "not found"
      return JSON.parse(raw);
    } catch (_) { return undefined; }
  }
  function writeCache(word, value) {
    try {
      localStorage.setItem(CACHE_PREFIX + word, JSON.stringify(value));
      // Best-effort cap: if we're over the limit, drop the oldest-ish dict keys.
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(CACHE_PREFIX) === 0) keys.push(k); }
      if (keys.length > CACHE_MAX) { for (var j = 0; j < keys.length - CACHE_MAX; j++) { try { localStorage.removeItem(keys[j]); } catch (_) {} } }
    } catch (_) { /* storage full / disabled — cache is best-effort */ }
  }

  // dictionaryapi.dev entry[] → the popup-friendly shape.
  function normalizeEntry(rows, word) {
    if (!Array.isArray(rows) || !rows.length) return null;
    var phonetic = '', audio = '';
    var meanings = [];
    var synSet = {};
    rows.forEach(function (row) {
      if (!phonetic && row.phonetic) phonetic = row.phonetic;
      (row.phonetics || []).forEach(function (p) {
        if (!phonetic && p && p.text) phonetic = p.text;
        if (!audio && p && p.audio) audio = p.audio;
      });
      (row.meanings || []).forEach(function (m) {
        var defs = (m.definitions || []).slice(0, 3).map(function (d) {
          return { definition: String(d.definition || '').trim(), example: (d.example ? String(d.example).trim() : '') };
        }).filter(function (d) { return d.definition; });
        (m.synonyms || []).forEach(function (s) { if (s) synSet[String(s).toLowerCase()] = 1; });
        (m.definitions || []).forEach(function (d) { (d.synonyms || []).forEach(function (s) { if (s) synSet[String(s).toLowerCase()] = 1; }); });
        if (defs.length) meanings.push({ partOfSpeech: String(m.partOfSpeech || '').trim(), definitions: defs });
      });
    });
    if (!meanings.length) return null;
    return {
      word: word, phonetic: phonetic, audio: audio, meanings: meanings.slice(0, 4),
      synonyms: Object.keys(synSet).slice(0, 8),
      source: 'Wiktionary (dictionaryapi.dev)'
    };
  }

  window.AlloDictionary = {
    /** True if we have a cached (offline) entry for this word. */
    hasOffline: function (word) { return readCache(normalizeWord(word)) !== undefined; },
    /**
     * Look up an authoritative dictionary entry. Resolves to the normalized
     * entry, or NULL when not found / offline-uncached / any failure.
     */
    lookup: function (word) {
      var w = normalizeWord(word);
      if (!w || /\s/.test(w)) return Promise.resolve(null); // single words only
      var cached = readCache(w);
      if (cached !== undefined) return Promise.resolve(cached); // hit (entry or cached-null)
      if (typeof fetch !== 'function') return Promise.resolve(null);
      return fetch(API + encodeURIComponent(w)).then(function (r) {
        if (r.status === 404) { writeCache(w, null); return null; } // cache "not found" so we don't refetch
        if (!r.ok) return null;
        return r.json();
      }).then(function (rows) {
        if (rows == null) return null;
        var entry = normalizeEntry(rows, w);
        if (entry) writeCache(w, entry);
        else writeCache(w, null);
        return entry;
      }).catch(function () { return null; });
    },
    _normalizeWord: normalizeWord,
    _normalizeEntry: normalizeEntry
  };

  console.log('[AlloDictionary] dictionary_loader.js ready — window.AlloDictionary.lookup(word) (authoritative + offline-cached)');
})();

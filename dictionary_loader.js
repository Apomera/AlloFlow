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
 *     window.AlloDictionary.lookup(word) -> Promise<{ word, phonetic, audio, meanings, synonyms, source, sourceUrl } | null>
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
    var phonetic = '', audio = '', sourceUrl = '';
    var meanings = [];
    var synSet = {};
    rows.forEach(function (row) {
      if (!sourceUrl && Array.isArray(row.sourceUrls)) {
        row.sourceUrls.some(function (u) {
          if (typeof u === 'string' && /^https?:\/\//i.test(u)) { sourceUrl = u; return true; }
          return false;
        });
      }
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
      source: 'Wiktionary (via dictionaryapi.dev)',
      sourceUrl: sourceUrl || ('https://en.wiktionary.org/wiki/' + encodeURIComponent(word))
    };
  }

  // Content-word tokens (drops stopwords + short words) for lightweight sense matching.
  var STOPWORDS = { the:1, a:1, an:1, of:1, to:1, in:1, and:1, or:1, is:1, are:1, for:1, that:1, with:1, as:1, by:1, on:1, at:1, from:1, it:1, its:1, this:1, which:1, be:1, been:1, being:1, was:1, were:1, has:1, have:1, had:1, not:1, but:1, can:1, may:1, one:1, used:1, using:1, into:1, when:1, such:1, more:1, most:1, some:1, any:1, etc:1 };
  function _tokens(s) {
    var out = [], seen = {};
    String(s == null ? '' : s).toLowerCase().split(/[^a-z]+/).forEach(function (w) {
      if (w.length >= 4 && !STOPWORDS[w] && !seen[w]) { seen[w] = 1; out.push(w); }
    });
    return out;
  }
  // Pick the single definition (a specific sense, with its part of speech + example)
  // that best overlaps a context definition — e.g. the lesson's grade-leveled def — so
  // we never surface a contradictory sense. The dictionary flattens many senses into one
  // entry; the AI def is sense-specific. Scores per-DEFINITION (not per-POS-group) so a
  // verbose part of speech can't win on volume, and returns the matching def itself.
  // Returns { partOfSpeech, definition, example }, or null when nothing meaningfully
  // overlaps (hide rather than mislead). With no context, returns the first sense.
  function pickSense(entry, contextText) {
    if (!entry || !Array.isArray(entry.meanings) || !entry.meanings.length) return null;
    var ctx = _tokens(contextText);
    var first = null, best = null, bestScore = 0;
    entry.meanings.forEach(function (m) {
      (m.definitions || []).forEach(function (d) {
        var cand = { partOfSpeech: m.partOfSpeech || '', definition: d.definition || '', example: d.example || '' };
        if (!first) first = cand;
        if (ctx.length) {
          // Score on the definition text only — examples add noise, not sense signal.
          var toks = _tokens(cand.definition), hits = 0;
          toks.forEach(function (tk) { if (ctx.indexOf(tk) >= 0) hits++; });
          // Raw overlap count dominates; the sub-1 ratio term only breaks ties, favoring
          // a concise precise sense over a verbose one that merely shares a common word.
          var score = hits + (toks.length ? hits / toks.length : 0);
          if (score > bestScore) { bestScore = score; best = cand; }
        }
      });
    });
    if (!ctx.length) return first;
    return bestScore > 0 ? best : null;
  }

  window.AlloDictionary = {
    /** True if we have a cached (offline) entry for this word. */
    hasOffline: function (word) { return readCache(normalizeWord(word)) !== undefined; },
    /**
     * Synchronous cache read for render contexts (no Promise): returns the cached
     * entry, null (cached "not found"), or undefined (never looked up). Pairs with
     * the glossary pre-warm so cards can read authoritative data with zero latency.
     */
    getCached: function (word) { return readCache(normalizeWord(word)); },
    /** Sense-align an entry to a context definition (see pickSense above). */
    pickSense: pickSense,
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

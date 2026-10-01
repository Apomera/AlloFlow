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

  function dictionaryText(value) { return typeof value === 'string' ? value.trim() : ''; }
  function dictionaryRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function dictionaryList(value) { return Array.isArray(value) ? value : []; }
  function dictionarySourceUrl(value) {
    var url = dictionaryText(value), lower = url.toLowerCase();
    return lower.startsWith('https://') || lower.startsWith('http://') ? url : '';
  }
  function dictionaryPronunciations(value) {
    var variants = [];
    dictionaryList(value).filter(dictionaryRecord).forEach(function (record) {
      var pair = { phonetic: dictionaryText(record.phonetic), audio: dictionaryText(record.audio) };
      if ((pair.phonetic || pair.audio) && !variants.some(p => p.phonetic === pair.phonetic && p.audio === pair.audio)) variants.push(pair);
    });
    return variants.slice(0, 12);
  }
  // Cache data crosses a persistence boundary. Recover useful fields without
  // trusting a stale/corrupt shape, mutating storage, or inventing pronunciation pairs.
  function normalizeCachedEntry(value, word) {
    if (value === null) return null; // Preserve the legacy real-404 cache sentinel.
    if (!dictionaryRecord(value)) return undefined;
    if (value.word != null && (typeof value.word !== 'string' || normalizeWord(value.word) !== word)) return undefined;
    var meanings = dictionaryList(value.meanings).filter(dictionaryRecord).map(function (meaning) {
      var definitions = dictionaryList(meaning.definitions).filter(dictionaryRecord).map(function (definition) {
        return { definition: dictionaryText(definition.definition), example: dictionaryText(definition.example) };
      }).filter(d => d.definition).slice(0, 3);
      return { partOfSpeech: dictionaryText(meaning.partOfSpeech), definitions: definitions, pronunciations: dictionaryPronunciations(meaning.pronunciations) };
    }).filter(m => m.definitions.length).slice(0, 4);
    if (!meanings.length) return undefined;
    var pronunciations = dictionaryPronunciations(value.pronunciations);
    var primary = pronunciations.find(p => p.phonetic && p.audio) || pronunciations[0];
    return {
      word: word,
      // Legacy independent fields stay separate when no per-record variants exist.
      phonetic: primary ? primary.phonetic : dictionaryText(value.phonetic),
      audio: primary ? primary.audio : dictionaryText(value.audio),
      pronunciations: pronunciations, meanings: meanings,
      synonyms: Array.from(new Set(dictionaryList(value.synonyms).map(dictionaryText).filter(Boolean).map(s => s.toLowerCase()))).slice(0, 8),
      source: dictionaryText(value.source) || 'Wiktionary (via dictionaryapi.dev)',
      sourceUrl: dictionarySourceUrl(value.sourceUrl) || 'https://en.wiktionary.org/wiki/' + encodeURIComponent(word)
    };
  }

  function readCache(word) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + word);
      if (!raw) return undefined; // undefined = not cached; null = cached "not found"
      return normalizeCachedEntry(JSON.parse(raw), word);
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
    var meanings = [], pronunciations = [], synonyms = [], sourceUrl = '';
    rows.filter(dictionaryRecord).forEach(function (row) {
      if (!sourceUrl) sourceUrl = dictionaryList(row.sourceUrls).map(dictionarySourceUrl).find(Boolean) || '';
      var rowPronunciations = dictionaryPronunciations(dictionaryList(row.phonetics).filter(dictionaryRecord).map(function (p) {
        return { phonetic: p.text, audio: p.audio };
      }));
      var phonetic = dictionaryText(row.phonetic);
      if (phonetic && !rowPronunciations.some(p => p.phonetic === phonetic)) rowPronunciations.push({ phonetic: phonetic, audio: '' });
      pronunciations.push(...rowPronunciations);
      dictionaryList(row.meanings).filter(dictionaryRecord).forEach(function (meaning) {
        var definitions = dictionaryList(meaning.definitions).filter(dictionaryRecord);
        meanings.push({ partOfSpeech: meaning.partOfSpeech, definitions: definitions, pronunciations: rowPronunciations });
        synonyms.push(...dictionaryList(meaning.synonyms));
        definitions.forEach(d => synonyms.push(...dictionaryList(d.synonyms)));
      });
    });
    return normalizeCachedEntry({ word: word, meanings: meanings, pronunciations: pronunciations, synonyms: synonyms,
      source: 'Wiktionary (via dictionaryapi.dev)', sourceUrl: sourceUrl }, word) || null;
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

  // A conservative suggestion, not a claim of semantic certainty. Ignore the
  // queried word itself and decline ties instead of silently choosing by order.
  function matchPassageSense(entry, contextText) {
    var excluded = _tokens(entry?.word || '');
    var context = _tokens(contextText).filter(token => !excluded.includes(token));
    var senses = [];
    (entry?.meanings || []).forEach(function (meaning, mi) {
      (meaning.definitions || []).forEach(function (definition, di) {
        if (typeof definition.definition !== 'string' || !definition.definition.trim()) return;
        var tokens = _tokens(definition.definition).filter(token => !excluded.includes(token));
        senses.push({ partOfSpeech: meaning.partOfSpeech || '', definition: definition.definition, example: definition.example || '', meaningIndex: mi, definitionIndex: di,
          score: tokens.filter(token => context.includes(token)).length });
      });
    });
    if (senses.length === 1) return senses[0];
    senses.sort((a, b) => b.score - a.score);
    return senses[0]?.score > 0 && senses[0].score > (senses[1]?.score || 0) ? senses[0] : null;
  }

  // Detailed outcomes are optional; lookup() retains its entry-or-null API.
  async function lookupDetailed(word, options = {}) {
    options = options || {};
    const result = (entry, reason = null) => ({ entry, reason });
    if (options.signal?.aborted) return result(null, 'cancelled');
    const w = normalizeWord(word);
    if (!w || /\s/.test(w)) return result(null, 'unsupported_word');
    const cached = readCache(w);
    if (cached !== undefined && !(cached === null && options.bypassMissingCache)) return result(cached, cached ? null : 'not_found');
    if (typeof fetch !== 'function') return result(null, 'not_available');
    try {
      const response = await fetch(API + encodeURIComponent(w), { signal: options.signal });
      if (options.signal?.aborted) return result(null, 'cancelled');
      if (response.status === 404) { writeCache(w, null); return result(null, 'not_found'); }
      if (!response.ok) return result(null, 'request_failed');
      let rows;
      try { rows = await response.json(); }
      catch (_) { return result(null, options.signal?.aborted ? 'cancelled' : 'invalid_response'); }
      if (options.signal?.aborted) return result(null, 'cancelled');
      let entry;
      try { entry = normalizeEntry(rows, w); } catch (_) { return result(null, 'invalid_response'); }
      if (!entry) return result(null, 'invalid_response');
      writeCache(w, entry);
      return result(entry);
    } catch (_) { return result(null, options.signal?.aborted ? 'cancelled' : 'request_failed'); }
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
    matchPassageSense: matchPassageSense,
    /**
     * Look up an authoritative dictionary entry. Resolves to the normalized
     * entry, or NULL when not found / offline-uncached / any failure.
     */
    lookupDetailed: lookupDetailed,
    lookup: function (word, options) { return lookupDetailed(word, options || {}).then(result => result.entry); },
    _normalizeWord: normalizeWord,
    _normalizeEntry: normalizeEntry
  };

  console.log('[AlloDictionary] dictionary_loader.js ready — window.AlloDictionary.lookup(word) (authoritative + offline-cached)');
})();

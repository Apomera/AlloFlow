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
 *   3. window.AlloVocabBank (school-curated offline EN bank + lemmatization,
 *      when loaded via packets_vocab_bank_en.js) — serves desktop, offline, and
 *      inflected/404 fallback words with 0 external calls when loaded.
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
    return String(w == null ? '' : w)
      .toLowerCase()
      .trim()
      .replace(/[\u2018\u2019\u02BC]/g, "'")
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/^[^\p{L}]+|[^\p{L}'-]+$/gu, '')
      .replace(/^['-]+|['-]+$/g, '');
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
  var STOPWORDS = Object.assign(Object.create(null), { the:1, a:1, an:1, of:1, to:1, in:1, and:1, or:1, is:1, are:1, for:1, that:1, with:1, as:1, by:1, on:1, at:1, from:1, it:1, its:1, this:1, which:1, be:1, been:1, being:1, was:1, were:1, has:1, have:1, had:1, not:1, but:1, can:1, may:1, one:1, used:1, using:1, into:1, when:1, such:1, more:1, most:1, some:1, any:1, etc:1 });
  function _tokens(s) {
    var out = [], seen = Object.create(null);
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
  var pendingBankLoad = null;
  var pendingBankSignal = null;
  var internalVocabBank = null;
  var VOCAB_SHARDS = ['en-1.json', 'en-2.json'];
  var VOCAB_POS = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' };
  function ownKey(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }
  function isValidVocabShard(data) {
    return !!data && typeof data === 'object' && !Array.isArray(data) && data.version === 1 && Array.isArray(data.words);
  }
  function buildInternalVocabBank(parts) {
    var heads = Object.create(null);
    var forms = Object.create(null);
    parts.forEach(function (d) {
      d.words.forEach(function (row) {
        if (!Array.isArray(row) || typeof row[0] !== 'string' || !Array.isArray(row[1])) return;
        var w = row[0], list = [];
        row[1].forEach(function (r) {
          if (!Array.isArray(r) || typeof r[0] !== 'string' || typeof r[1] !== 'string') return;
          var p = r[0].charAt(0);
          list.push({ pos: VOCAB_POS[p] || '', def: r[1], example: typeof r[2] === 'string' ? r[2] : '' });
        });
        heads[w] = list;
      });
      if (typeof d.forms === 'string' && d.forms) {
        d.forms.split(',').forEach(function (x) {
          var q = x.split(' ');
          if (q[0] && q[1]) forms[q[0]] = q[1];
        });
      }
    });
    function head(word) {
      var k = String(word == null ? '' : word).trim().toLowerCase();
      if (!k) return null;
      if (ownKey(heads, k)) return k;
      if (ownKey(forms, k) && ownKey(heads, forms[k])) return forms[k];
      var c = [];
      if (/ies$/.test(k)) c.push(k.slice(0, -3) + 'y');
      if (/(s|x|z|ch|sh|o)es$/.test(k)) c.push(k.slice(0, -2));
      if (/[^s]s$/.test(k)) c.push(k.slice(0, -1));
      if (/ied$/.test(k)) c.push(k.slice(0, -3) + 'y');
      if (/ed$/.test(k)) { c.push(k.slice(0, -2), k.slice(0, -1)); if (/([bdgklmnprt])\1ed$/.test(k)) c.push(k.slice(0, -3)); }
      if (/ing$/.test(k)) { c.push(k.slice(0, -3), k.slice(0, -3) + 'e'); if (/([bdgklmnprt])\1ing$/.test(k)) c.push(k.slice(0, -4)); }
      for (var i = 0; i < c.length; i++) if (c[i].length >= 2 && ownKey(heads, c[i])) return c[i];
      return null;
    }
    return {
      version: 1,
      ready: function () { return true; },
      has: function (word) { return head(word) != null; },
      head: head,
      senses: function (word) { var h = head(word); return h ? heads[h].slice() : []; }
    };
  }
  function getActiveVocabBank() {
    if (typeof window !== 'undefined' && window.AlloVocabBank &&
        typeof window.AlloVocabBank.ready === 'function' && window.AlloVocabBank.ready()) {
      return window.AlloVocabBank;
    }
    return internalVocabBank;
  }
  function isVocabBankReady() {
    return !!getActiveVocabBank();
  }
  function withEntryAudio(entry, clip) {
    if (!entry || !clip || typeof clip !== 'string' || entry.audio) return entry;
    var existing = Array.isArray(entry.pronunciations) ? entry.pronunciations.slice() : [];
    var updated = existing.length
      ? existing.map(function (p, i) { return (i === 0 && p && !p.audio) ? { phonetic: p.phonetic || '', audio: clip } : p; })
      : [{ phonetic: entry.phonetic || '', audio: clip }];
    return Object.assign({}, entry, { audio: clip, pronunciations: updated });
  }
  async function attachWordShardAudio(entry, word, headword, options) {
    if (!entry || entry.audio || (options && options.useWordShardAudio === false)) return entry;
    var shardClips = typeof window !== 'undefined' && window._CACHE_WORD_SHARD_CLIPS;
    var clip = (ownKey(shardClips, word) && typeof shardClips[word] === 'string' && shardClips[word]) ||
      (headword && ownKey(shardClips, headword) && typeof shardClips[headword] === 'string' && shardClips[headword]) || '';
    var allowAsyncShard = !(typeof window !== 'undefined' && window._isDesktopBundledApp === true && (!options || options.autoLoadOfflineBank !== true));
    if (!clip && allowAsyncShard && typeof window !== 'undefined' && typeof window.getWordShardAudio === 'function') {
      var target = headword || word;
      if (target) {
        try {
          clip = await window.getWordShardAudio(target, options && options.signal ? { signal: options.signal } : undefined);
          if (!clip && headword && headword !== word && !(options && options.signal && options.signal.aborted)) {
            clip = await window.getWordShardAudio(word, options && options.signal ? { signal: options.signal } : undefined);
          }
        } catch (err) {
          if (err && err.name === 'AbortError') throw err;
          clip = '';
        }
      }
    }
    return clip && typeof clip === 'string' ? withEntryAudio(entry, clip) : entry;
  }
  function lookupFromVocabBankWithHead(word) {
    var bank = getActiveVocabBank();
    if (!bank || !word) return null;
    var headword = typeof bank.head === 'function' ? bank.head(word) : null;
    var senses = typeof bank.senses === 'function' ? bank.senses(word) : [];
    if ((!Array.isArray(senses) || !senses.length) && /^[a-z]+'[s]$/i.test(word) && word.length >= 4) {
      var stem = word.slice(0, -2);
      headword = typeof bank.head === 'function' ? bank.head(stem) : stem;
      senses = typeof bank.senses === 'function' ? bank.senses(stem) : [];
      if (!headword && Array.isArray(senses) && senses.length) headword = stem;
    }
    if (!Array.isArray(senses) || !senses.length) return null;
    var groups = [], byPos = Object.create(null);
    senses.forEach(function (s) {
      if (!s || typeof s.def !== 'string' || !s.def.trim()) return;
      var pos = typeof s.pos === 'string' ? s.pos : '';
      if (!byPos[pos]) { byPos[pos] = []; groups.push({ partOfSpeech: pos, definitions: byPos[pos], pronunciations: [] }); }
      byPos[pos].push({ definition: s.def, example: typeof s.example === 'string' ? s.example : '' });
    });
    if (!groups.length) return null;
    var shardClips = typeof window !== 'undefined' && window._CACHE_WORD_SHARD_CLIPS;
    var clip = (ownKey(shardClips, word) && typeof shardClips[word] === 'string' && shardClips[word]) ||
      (headword && ownKey(shardClips, headword) && typeof shardClips[headword] === 'string' && shardClips[headword]) || '';
    var prons = clip ? [{ phonetic: '', audio: clip }] : [];
    var normalized = normalizeCachedEntry({
      word: word,
      audio: clip,
      pronunciations: prons,
      meanings: groups,
      synonyms: [],
      source: 'AlloFlow School Vocabulary (Wiktionary / WordNet, CC BY-SA 4.0)',
      sourceUrl: 'https://en.wiktionary.org/wiki/' + encodeURIComponent(headword || word)
    }, word);
    return normalized ? { entry: normalized, headword: headword || word } : null;
  }
  function lookupFromVocabBank(word) {
    var hit = lookupFromVocabBankWithHead(word);
    return hit ? hit.entry : null;
  }
  function loadOfflineBank(options) {
    if (isVocabBankReady()) return Promise.resolve(true);
    var opts = options || {};
    var sig = opts.signal;
    if (sig && sig.aborted) return Promise.resolve(false);
    var raceWithAbort = function (promise) {
      if (!sig) return promise;
      if (sig.aborted) return Promise.resolve(false);
      return new Promise(function (resolve) {
        var done = false;
        var onAbort = function () {
          if (done) return;
          done = true;
          resolve(false);
        };
        try { sig.addEventListener('abort', onAbort, { once: true }); } catch (_) {}
        promise.then(function (val) {
          if (done) return;
          done = true;
          try { sig.removeEventListener('abort', onAbort); } catch (_) {}
          resolve(!!val);
        }, function () {
          if (done) return;
          done = true;
          try { sig.removeEventListener('abort', onAbort); } catch (_) {}
          resolve(false);
        });
      });
    };
    if (pendingBankLoad && !(pendingBankSignal && pendingBankSignal.aborted) && !opts.fetch && opts.base == null) {
      return raceWithAbort(pendingBankLoad);
    }
    var thisLoad;
    if (typeof window !== 'undefined' && window.AlloVocabBank && typeof window.AlloVocabBank.load === 'function') {
      thisLoad = Promise.resolve(window.AlloVocabBank.load(opts)).catch(function (err) {
        if (opts.base == null && !(sig && sig.aborted)) {
          return window.AlloVocabBank.load(Object.assign({}, opts, { base: '../' }));
        }
        throw err;
      }).then(function () { return isVocabBankReady(); }).catch(function () { return false; });
    } else {
      var f = opts.fetch || (typeof window !== 'undefined' && typeof window.fetch === 'function' ? window.fetch.bind(window) : (typeof fetch === 'function' ? fetch : null));
      if (typeof f !== 'function') return Promise.resolve(false);
      var normalizeBase = function (b) {
        var s = String(b == null ? '' : b);
        return s && s.charAt(s.length - 1) !== '/' ? s + '/' : s;
      };
      var bases = opts.base != null ? [normalizeBase(opts.base)] : ['./packets_vocab/', '../packets_vocab/'];
      var tryBase = function (idx) {
        if (sig && sig.aborted) return Promise.resolve(false);
        if (idx >= bases.length) return Promise.resolve(false);
        var base = bases[idx];
        var fetchOpts = sig ? { credentials: 'omit', signal: sig } : { credentials: 'omit' };
        return Promise.all(VOCAB_SHARDS.map(function (file) {
          return Promise.resolve(f(base + file, fetchOpts)).then(function (r) {
            if (!r || !r.ok) throw new Error('AlloVocabBank: ' + file + ' ' + (r ? r.status : 'error'));
            return r.json();
          }).then(function (data) {
            if (!isValidVocabShard(data)) throw new Error('AlloVocabBank: invalid shard ' + file);
            return data;
          });
        })).then(function (parts) {
          if (sig && sig.aborted) return false;
          internalVocabBank = buildInternalVocabBank(parts);
          return isVocabBankReady();
        }).catch(function (err) {
          if ((sig && sig.aborted) || (err && err.name === 'AbortError')) return false;
          return tryBase(idx + 1);
        });
      };
      thisLoad = tryBase(0).catch(function () { return false; });
    }
    pendingBankLoad = thisLoad;
    pendingBankSignal = sig || null;
    if (sig && typeof sig.addEventListener === 'function') {
      try {
        sig.addEventListener('abort', function () {
          if (pendingBankLoad === thisLoad) {
            pendingBankLoad = null;
            pendingBankSignal = null;
          }
        }, { once: true });
      } catch (_) {}
    }
    thisLoad.then(function () {
      if (pendingBankLoad === thisLoad) {
        pendingBankLoad = null;
        pendingBankSignal = null;
      }
    });
    return raceWithAbort(thisLoad);
  }

  async function lookupDetailed(word, options = {}) {
    options = options || {};
    const result = (entry, reason = null) => ({ entry, reason });
    if (options.signal?.aborted) return result(null, 'cancelled');
    const w = normalizeWord(word);
    if (!w || /\s/.test(w)) return result(null, 'unsupported_word');
    const cached = readCache(w);
    if (cached !== undefined && !(cached === null && options.bypassMissingCache)) {
      if (!cached) return result(null, 'not_found');
      try {
        const enriched = await attachWordShardAudio(cached, w, null, options);
        if (options.signal?.aborted) return result(null, 'cancelled');
        return result(enriched, null);
      } catch (err) {
        if ((err && err.name === 'AbortError') || options.signal?.aborted) return result(null, 'cancelled');
        return result(cached, null);
      }
    }
    const bankFallback = () => (options.useOfflineBank === false ? null : lookupFromVocabBankWithHead(w));
    const ensureAndLookupBank = async () => {
      let hit = bankFallback();
      if (!hit && options.autoLoadOfflineBank === true && options.useOfflineBank !== false && !isVocabBankReady()) {
        await loadOfflineBank({ signal: options.signal });
        if (options.signal?.aborted) return 'cancelled';
        hit = bankFallback();
      }
      return hit;
    };
    const finishBankHit = async (hit) => {
      try {
        const enriched = await attachWordShardAudio(hit.entry, w, hit.headword, options);
        if (options.signal?.aborted) return result(null, 'cancelled');
        return result(enriched);
      } catch (err) {
        if ((err && err.name === 'AbortError') || options.signal?.aborted) return result(null, 'cancelled');
        return result(hit.entry);
      }
    };
    if (typeof window !== 'undefined' && window._isDesktopBundledApp === true) {
      const localHit = await ensureAndLookupBank();
      if (localHit === 'cancelled') return result(null, 'cancelled');
      if (localHit) return finishBankHit(localHit);
      return result(null, 'not_available');
    }
    if (typeof fetch !== 'function') {
      const localHit = bankFallback();
      if (localHit) return finishBankHit(localHit);
      return result(null, 'not_available');
    }
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const isLocalBox = typeof window !== 'undefined' && window.__ALLO_LOCAL_BOX === true;
    if (isOffline || isLocalBox) {
      const localHit = await ensureAndLookupBank();
      if (localHit === 'cancelled') return result(null, 'cancelled');
      if (localHit) return finishBankHit(localHit);
      if (isLocalBox && isOffline) return result(null, 'not_available');
    }
    // Another request can save useful help while this one is awaiting the provider.
    // Revalidate that same-word entry on failure; cancellation must still win.
    const recoverFailure = async (reason) => {
      if (options.signal?.aborted) return result(null, 'cancelled');
      const recoveredCache = readCache(w);
      if (recoveredCache) {
        try {
          const enriched = await attachWordShardAudio(recoveredCache, w, null, options);
          if (options.signal?.aborted) return result(null, 'cancelled');
          return result(enriched, null);
        } catch (err) {
          if ((err && err.name === 'AbortError') || options.signal?.aborted) return result(null, 'cancelled');
          return result(recoveredCache, null);
        }
      }
      const bankHit = reason === 'request_failed' ? await ensureAndLookupBank() : bankFallback();
      if (bankHit === 'cancelled') return result(null, 'cancelled');
      if (bankHit) return finishBankHit(bankHit);
      return result(null, reason);
    };
    let controller = null;
    let timeoutId = null;
    try {
      const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 6000;
      if (!options.signal && typeof AbortController !== 'undefined') {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }
      const response = await fetch(API + encodeURIComponent(w), { signal: options.signal || (controller ? controller.signal : undefined), credentials: 'omit' });
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (options.signal?.aborted) return result(null, 'cancelled');
      // A concurrent caller may have cached a usable entry while this request waited.
      // readCache validates it; a late miss must not erase successful offline help.
      if (response.status === 404) {
        const recoveredCache = readCache(w);
        if (recoveredCache) {
          try {
            const enriched = await attachWordShardAudio(recoveredCache, w, null, options);
            if (options.signal?.aborted) return result(null, 'cancelled');
            return result(enriched);
          } catch (err) {
            if ((err && err.name === 'AbortError') || options.signal?.aborted) return result(null, 'cancelled');
            return result(recoveredCache);
          }
        }
        const bankHit = await ensureAndLookupBank();
        if (bankHit === 'cancelled') return result(null, 'cancelled');
        if (bankHit) return finishBankHit(bankHit);
        writeCache(w, null); return result(null, 'not_found');
      }
      if (!response.ok) return recoverFailure('request_failed');
      let rows;
      try { rows = await response.json(); }
      catch (_) { return recoverFailure('invalid_response'); }
      if (options.signal?.aborted) return result(null, 'cancelled');
      let entry;
      try { entry = normalizeEntry(rows, w); } catch (_) { return recoverFailure('invalid_response'); }
      if (!entry) return recoverFailure('invalid_response');
      writeCache(w, entry);
      try {
        entry = await attachWordShardAudio(entry, w, null, options);
        if (options.signal?.aborted) return result(null, 'cancelled');
      } catch (err) {
        if ((err && err.name === 'AbortError') || options.signal?.aborted) return result(null, 'cancelled');
      }
      return result(entry);
    } catch (_) {
      if (options.signal?.aborted) return result(null, 'cancelled');
      return recoverFailure('request_failed');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  window.AlloDictionary = {
    /** True if we have a cached or loaded offline bank entry for this word. */
    hasOffline: function (word) { var nw = normalizeWord(word); return readCache(nw) !== undefined || !!lookupFromVocabBank(nw); },
    /** Synchronous read from the loaded AlloVocabBank (if ready), or null. */
    lookupOfflineBank: function (word) { var nw = normalizeWord(word); return nw && !/\s/.test(nw) ? lookupFromVocabBank(nw) : null; },
    /** Lazy-load the curated offline English bank on demand; resolves to boolean. */
    loadOfflineBank: loadOfflineBank,
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

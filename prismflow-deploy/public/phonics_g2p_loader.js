/**
 * phonics_g2p_loader.js — AlloFlow offline grapheme→phoneme (eSpeak NG)
 *
 * Word Sounds breaks a word into its sounds. The cloud path (Gemini) is prompted
 * to a phonics phoneme model but is non-deterministic and can vary/hallucinate;
 * a bench of eSpeak NG G2P vs. the phonics model scored 32/32 on the core
 * single-syllable set (digraphs, r-controlled, silent letters, long vowels) —
 * because eSpeak is dictionary-backed and DETERMINISTIC. So eSpeak is the
 * primary phoneme-SEQUENCE engine (offline, free, instant); Gemini supplies
 * grapheme alignment + the rich extras (rhymes/distractors) and cross-checks it.
 * The same espeak-ng phonemizer already ships inside the Piper TTS wasm.
 *
 * Exposes a fallback-safe entry point:
 *     window.AlloPhonics.toPhonemes(word, opts) -> Promise<{ ipa:[...], rawIpa:[...], count, ipaString } | null>
 * `ipa` is normalized to AlloFlow's phonics inventory (flap ɾ→t, r-colored ɚ→ɜr,
 * ɡ→g, ɹ→r, stress/length stripped); `rawIpa` keeps eSpeak's exact phonetics.
 * NULL on ANY problem (offline, load failure, empty output) — callers keep their
 * behaviour, so the worst case is exactly today's, never a regression.
 * opts: { lang }.
 *
 * Lazy: the ~18.5 MB eSpeak NG wasm loads on the first call, cached thereafter.
 * School Box (desktop) would use the tiny native espeak-ng binary instead.
 *
 * NOTE (2026-07-06): the eSpeak G2P + this normalization were validated in Node
 * against real espeak-ng@1.0.2 output (see the benchmark). The BROWSER path
 * (dynamic import of the ESM build + wasm fetch + FS read) is not yet
 * browser-smoke-tested; on any failure toPhonemes returns null and the caller
 * falls back to Gemini / the crude splitter.
 */
(function () {
  'use strict';
  if (window.AlloPhonics && typeof window.AlloPhonics.toPhonemes === 'function') return;

  var ESPEAK_URLS = [
    'https://cdn.jsdelivr.net/npm/espeak-ng@1.0.2/dist/espeak-ng.js',
    'https://unpkg.com/espeak-ng@1.0.2/dist/espeak-ng.js'
  ];
  var LANG_TO_VOICE = { english: 'en-us', spanish: 'es', french: 'fr-fr', german: 'de', italian: 'it', portuguese: 'pt', dutch: 'nl' };

  var _factoryPromise = null;

  function resolveVoice(lang) {
    if (!lang) return 'en-us';
    var s = String(lang).toLowerCase().trim();
    if (LANG_TO_VOICE[s]) return LANG_TO_VOICE[s];
    if (/^[a-z]{2}(-[a-z]{2,})?$/.test(s)) return s;
    return 'en-us';
  }

  // Map one eSpeak IPA token → AlloFlow's phonics inventory. eSpeak emits
  // phonetically-accurate detail that isn't in the phonics teaching model:
  //   ɾ (American "tt" flap)      → t     (phonics teaches tt = /t/)
  //   ɚ (r-colored schwa, "-er")  → ɜr    (the er/ir/ur sound)
  //   ɜ (from ɜː: bird/turn)      → ɜr
  //   ɐ (near-open, banana)       → ʌ
  //   ɡ→g, ɹ→r (glyph unification)
  // Stress (ˈ ˌ) + length (ː) are dropped. Schwa ə is kept (it's the honest
  // symbol; it's outside the taught set, which is a known limit on reduced
  // multisyllabic words). Validated against real espeak output in Node.
  function normalizeToken(tok) {
    var t = String(tok || '').replace(/[ˈˌ]/g, '').replace(/ː/g, '').replace(/[͡‿|]/g, '').trim();
    if (!t) return '';
    t = t.replace(/ɡ/g, 'g').replace(/ɹ/g, 'r').replace(/ɾ/g, 't').replace(/ɐ/g, 'ʌ');
    // r-colored schwa → er sound (do before generic swaps)
    t = t.replace(/ɚ/g, 'ɜr');
    // NURSE vowel written bare after length strip → r-controlled er
    if (t === 'ɜ') t = 'ɜr';
    // Vowel+r sequences eSpeak keeps as one token (ɑr, ɔr) already match the
    // phonics ar/or symbols after the ɹ→r swap above; nothing more to do.
    return t;
  }

  // eSpeak's --sep=_ output → ordered phoneme tokens. Kept pure + defensive so
  // an unexpected format degrades to [] (→ caller falls back) rather than junk.
  function parseIpaOutput(raw) {
    var text = String(raw == null ? '' : raw).replace(/[\r\n]+/g, ' ').trim();
    if (!text) return { raw: [], norm: [] };
    text = text.replace(/[()[\]]/g, ' ');
    var rawTokens = [];
    text.split(/\s+/).forEach(function (chunk) {
      chunk.split('_').forEach(function (tok) {
        var cleaned = String(tok).replace(/[,.;:!?]/g, '').trim();
        if (cleaned && cleaned !== 'ˈ' && cleaned !== 'ˌ') rawTokens.push(cleaned);
      });
    });
    var raw2 = rawTokens.map(function (t) { return t.replace(/[ˈˌ]/g, '').replace(/ː/g, ''); }).filter(Boolean);
    var norm = rawTokens.map(normalizeToken).filter(Boolean);
    return { raw: raw2, norm: norm };
  }

  function loadFactory() {
    if (_factoryPromise) return _factoryPromise;
    _factoryPromise = (function tryAt(i) {
      if (i >= ESPEAK_URLS.length) return Promise.reject(new Error('espeak-ng sources failed'));
      return import(/* webpackIgnore: true */ ESPEAK_URLS[i]).then(function (m) {
        var factory = m && (m.default || m.ESpeakNg || m);
        if (typeof factory !== 'function') throw new Error('espeak-ng: no factory export');
        return factory;
      }).catch(function () { return tryAt(i + 1); });
    })(0).catch(function (e) { _factoryPromise = null; throw e; });
    return _factoryPromise;
  }

  // Split a word into exactly `count` letter-chunks (graphemes), digraph/
  // trigraph-aware, so eSpeak's accurate phoneme sequence can be paired with the
  // letters that spell each sound (Elkonin boxes need the letters). Greedy with
  // a light backtrack: if the greedy pass overshoots/undershoots the target
  // count, relax multi-letter grouping to hit `count` exactly. Best-effort —
  // returns null if it can't produce exactly `count` non-empty chunks.
  var _TRIGRAPHS = ['igh', 'tch', 'dge'];
  var _DIGRAPHS = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'gh', 'mb', 'ai', 'ay', 'ea', 'ee', 'oa', 'ow', 'oo', 'ou', 'oi', 'oy', 'ar', 'er', 'ir', 'or', 'ur', 'aw', 'au', 'ew'];
  function alignGraphemes(word, count) {
    var w = String(word || '').toLowerCase().replace(/[^a-z']/g, '');
    if (!w || !count || count < 1) return null;
    // greedy multi-letter pass
    var greedy = [];
    for (var i = 0; i < w.length;) {
      if (i <= w.length - 3 && _TRIGRAPHS.indexOf(w.slice(i, i + 3)) >= 0) { greedy.push(w.slice(i, i + 3)); i += 3; }
      else if (i <= w.length - 2 && _DIGRAPHS.indexOf(w.slice(i, i + 2)) >= 0) { greedy.push(w.slice(i, i + 2)); i += 2; }
      else { greedy.push(w[i]); i += 1; }
    }
    if (greedy.length === count) return greedy;
    // too many chunks → merge adjacent from the right until count matches
    if (greedy.length > count) {
      var merged = greedy.slice();
      while (merged.length > count) { var last = merged.pop(); merged[merged.length - 1] += last; }
      return merged.length === count ? merged : null;
    }
    // too few chunks → split the longest multi-letter chunk until count matches
    var chunks = greedy.slice();
    while (chunks.length < count) {
      var idx = -1, len = 1;
      for (var j = 0; j < chunks.length; j++) { if (chunks[j].length > len) { len = chunks[j].length; idx = j; } }
      if (idx < 0) break; // nothing left to split (fewer letters than phonemes)
      var c = chunks[idx];
      chunks.splice(idx, 1, c.slice(0, 1), c.slice(1));
    }
    return chunks.length === count ? chunks : null;
  }

  window.AlloPhonics = {
    ready: function () { return !!_factoryPromise; },
    // Exposed for unit tests + reuse (pure).
    _parse: parseIpaOutput,
    _normalizeToken: normalizeToken,
    alignGraphemes: alignGraphemes,
    /**
     * Merge eSpeak's phoneme sequence (authoritative — deterministic, dict-
     * backed) with Gemini's grapheme alignment (Gemini is prompted to segment
     * spelling well) into the app's [{ipa, grapheme}] shape + triangulation
     * metadata. Rules:
     *  - phoneme COUNT + IPA come from eSpeak.
     *  - graphemes: when Gemini's phoneme count == eSpeak's, use Gemini's
     *    graphemes (best spelling alignment) zipped with eSpeak IPA; otherwise
     *    fall back to the local digraph-aware aligner; otherwise the raw letters.
     *  - agreement = do eSpeak and Gemini agree on the count? (triangulation)
     * `geminiPhonemes` is Gemini's phonemes array ([{ipa,grapheme}] or strings);
     * pass null/[] when Gemini was unavailable. Pure + fully offline.
     */
    buildPhonemes: function (word, espeak, geminiPhonemes) {
      if (!espeak || !Array.isArray(espeak.ipa) || !espeak.ipa.length) return null;
      var ipa = espeak.ipa;
      var gp = Array.isArray(geminiPhonemes) ? geminiPhonemes : [];
      var geminiCount = gp.length;
      var agree = geminiCount === ipa.length;
      var graphemes = null;
      if (agree && geminiCount) {
        graphemes = gp.map(function (p) { return (typeof p === 'string') ? p : ((p && (p.grapheme || p.g)) || ''); });
        if (graphemes.some(function (g) { return !g; })) graphemes = null; // gaps → use aligner
      }
      if (!graphemes) graphemes = alignGraphemes(word, ipa.length);
      if (!graphemes) { // last resort: spread the raw letters as evenly as we can
        var letters = String(word || '').toLowerCase().replace(/[^a-z']/g, '').split('');
        graphemes = ipa.map(function (_, i) { return letters[i] || ''; });
      }
      var phonemes = ipa.map(function (sym, i) { return { ipa: sym, grapheme: graphemes[i] || '' }; });
      var mid = ipa.length ? ipa[Math.floor((ipa.length - 1) / 2)] : '';
      return {
        phonemes: phonemes,
        phonemeCount: ipa.length,
        firstSound: ipa[0] || '',
        lastSound: ipa[ipa.length - 1] || '',
        middleSound: mid,
        _phonemeSource: 'espeak',
        _espeakCount: ipa.length,
        _geminiCount: geminiCount || null,
        _phonemeAgreement: geminiCount ? agree : null
      };
    },
    /**
     * Grapheme → ordered phonics IPA. Resolves { ipa, rawIpa, count, ipaString }
     * or NULL on any failure. Never throws.
     */
    toPhonemes: function (word, opts) {
      var w = String(word == null ? '' : word).trim();
      if (!w) return Promise.resolve(null);
      // Single tokens only (this seam never needs phrases/digits/symbols).
      if (/[^\p{L}\p{M}'’‑-]/u.test(w) || /\s/.test(w)) return Promise.resolve(null);
      var voice = resolveVoice(opts && (opts.lang || opts.language));
      return loadFactory().then(function (ESpeakNg) {
        return ESpeakNg({
          arguments: ['--ipa', '--sep=_', '-q', '--phonout=/allo_ph.txt', '-v', voice, w]
        }).then(function (inst) {
          var out = '';
          try { out = inst.FS.readFile('/allo_ph.txt', { encoding: 'utf8' }); } catch (_) { out = ''; }
          var parsed = parseIpaOutput(out);
          if (!parsed.norm.length) return null;
          return { ipa: parsed.norm, rawIpa: parsed.raw, count: parsed.norm.length, ipaString: parsed.norm.join(' ') };
        });
      }).catch(function () { return null; });
    }
  };

  console.log('[AlloPhonics] phonics_g2p_loader.js ready — window.AlloPhonics.toPhonemes(word) (lazy eSpeak NG G2P, phonics-normalized)');
})();

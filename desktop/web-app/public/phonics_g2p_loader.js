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
 *     window.AlloPhonics.toPhonemes(word, opts) -> Promise<{ ipa:[...], rawIpa:[...], count, ipaString, voice } | null>
 * ENGLISH (`opts.lang` empty or en-*): `ipa` is normalized to AlloFlow's phonics
 * inventory (flap ɾ→t, r-colored ɚ→ɜr, ɡ→g, ɹ→r, stress/length stripped) —
 * byte-identical to the original English-only behavior.
 * OTHER LANGUAGES (2026-07-12): `opts.lang` (a friendly name like "Spanish" or a
 * BCP-47 code like "es-ES"/"zh-HK") resolves against the VERIFIED espeak-ng
 * voice inventory; `ipa` is the raw stress/length-stripped IPA (the English
 * normalizations would corrupt real phonemes elsewhere — Spanish "perro" has a
 * genuine tap /ɾ/). Languages with NO espeak voice resolve to null — the caller
 * keeps its Gemini phonemes; we never run English G2P on another language.
 * NULL on ANY problem (offline, load failure, empty output, unsupported
 * language) — callers keep their behaviour, so the worst case is exactly
 * today's, never a regression. `voiceFor(lang)` exposes the capability probe.
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

  // Voice ids VERIFIED against the actual espeak-ng@1.0.2 wasm build
  // (enumerated via `--voices` + per-voice G2P probes, 2026-07-12). Routing to
  // an id not in this set would make the wasm error out; routing an unmapped
  // language to English G2P would be silently WRONG phonemes — both are
  // handled by resolveVoice returning null (→ caller falls back to Gemini).
  var ESPEAK_VOICES = {
    af: 1, am: 1, an: 1, ar: 1, as: 1, az: 1, ba: 1, be: 1, bg: 1, bn: 1, bs: 1,
    ca: 1, cmn: 1, cs: 1, cv: 1, cy: 1, da: 1, de: 1, el: 1,
    'en-029': 1, 'en-gb': 1, 'en-us': 1, eo: 1, es: 1, 'es-419': 1, et: 1, eu: 1,
    fa: 1, fi: 1, 'fr-be': 1, 'fr-ch': 1, 'fr-fr': 1, ga: 1, gd: 1, gn: 1, grc: 1,
    gu: 1, hak: 1, haw: 1, he: 1, hi: 1, hr: 1, ht: 1, hu: 1, hy: 1, hyw: 1,
    id: 1, is: 1, it: 1, ja: 1, ka: 1, kk: 1, kl: 1, kn: 1, ko: 1, kok: 1, ku: 1,
    ky: 1, la: 1, lb: 1, lt: 1, lv: 1, mi: 1, mk: 1, ml: 1, mr: 1, ms: 1, mt: 1,
    my: 1, nb: 1, ne: 1, nl: 1, nog: 1, om: 1, or: 1, pa: 1, pap: 1, pl: 1,
    pt: 1, 'pt-br': 1, ro: 1, ru: 1, sd: 1, shn: 1, si: 1, sk: 1, sl: 1, smj: 1,
    sq: 1, sr: 1, sv: 1, sw: 1, ta: 1, te: 1, th: 1, tk: 1, tn: 1, tr: 1, tt: 1,
    ug: 1, uk: 1, ur: 1, uz: 1, vi: 1, yue: 1
  };

  // Friendly language names (AlloFlow's translation-language names arrive here
  // via the Word Sounds selector) → verified voice, or null = eSpeak has no
  // voice → Gemini-only path. Explicit nulls are deliberate: NEVER silently
  // fall back to English G2P for another language.
  var LANG_TO_VOICE = {
    english: 'en-us', spanish: 'es', french: 'fr-fr', german: 'de', italian: 'it',
    portuguese: 'pt-br', dutch: 'nl', arabic: 'ar', mandarin: 'cmn', chinese: 'cmn',
    cantonese: 'yue', vietnamese: 'vi', russian: 'ru', japanese: 'ja', korean: 'ko',
    hindi: 'hi', polish: 'pl', indonesian: 'id', turkish: 'tr', hebrew: 'he',
    swedish: 'sv', danish: 'da', norwegian: 'nb', finnish: 'fi', greek: 'el',
    thai: 'th', czech: 'cs', hungarian: 'hu', romanian: 'ro', ukrainian: 'uk',
    bengali: 'bn', urdu: 'ur', malay: 'ms', swahili: 'sw', bulgarian: 'bg',
    croatian: 'hr', serbian: 'sr', slovak: 'sk', persian: 'fa', farsi: 'fa',
    dari: 'fa', tamil: 'ta', amharic: 'am', afrikaans: 'af', kurdish: 'ku',
    'haitian creole': 'ht', haitian: 'ht', burmese: 'my', myanmar: 'my',
    nepali: 'ne', marathi: 'mr', gujarati: 'gu', punjabi: 'pa', telugu: 'te',
    kannada: 'kn', malayalam: 'ml', sinhala: 'si', oromo: 'om', esperanto: 'eo',
    georgian: 'ka', armenian: 'hy', albanian: 'sq', macedonian: 'mk',
    // No espeak-ng voice exists for these — Gemini-only (null, not en-us!):
    tagalog: null, filipino: null, somali: null, khmer: null, cambodian: null,
    lao: null, yoruba: null, igbo: null, hausa: null, kinyarwanda: null,
    kirundi: null, lingala: null, tigrinya: null, mongolian: null, hmong: null,
    pashto: null, pushto: null, acholi: null, karen: null, 'chin (hakha)': null,
    'chin (falam)': null, 'maay maay': null, marshallese: null
  };

  // BCP-47 code aliases where the espeak voice id differs from the code
  // (getSpeechLangCode emits codes like "zh-HK"; espeak's Cantonese is "yue").
  var CODE_ALIASES = {
    zh: 'cmn', 'zh-cn': 'cmn', 'zh-tw': 'cmn', 'zh-sg': 'cmn', 'zh-hk': 'yue',
    no: 'nb', nn: 'nb', 'pt-pt': 'pt', prs: 'fa', iw: 'he',
    fil: null, tl: null, ps: null, so: null, km: null, lo: null, yo: null,
    ig: null, ha: null, rw: null, rn: null, ln: null, ti: null, mn: null,
    hmn: null, ach: null, kar: null, cnh: null, cfm: null, ymm: null, mh: null
  };

  var _factoryPromise = null;

  // → verified espeak voice id, or NULL when the language has no voice.
  // English callers (and legacy callers passing nothing) keep 'en-us' exactly
  // as before; every en-* dialect routes to an English voice.
  function resolveVoice(lang) {
    if (!lang) return 'en-us';
    var s = String(lang).toLowerCase().trim();
    if (Object.prototype.hasOwnProperty.call(LANG_TO_VOICE, s)) return LANG_TO_VOICE[s];
    if (Object.prototype.hasOwnProperty.call(CODE_ALIASES, s)) return CODE_ALIASES[s];
    if (ESPEAK_VOICES[s]) return s;
    var primary = s.split(/[-_]/)[0];
    if (primary === 'en') return 'en-us';
    if (Object.prototype.hasOwnProperty.call(CODE_ALIASES, primary)) return CODE_ALIASES[primary];
    if (ESPEAK_VOICES[primary]) return primary;
    return null;
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
    // Unicode letters kept (Spanish ñ, French é, Cyrillic, Devanagari…) — the
    // old [^a-z'] filter silently DELETED accented letters ("niño" → "nio").
    // English words contain only a-z' so the English output is unchanged; the
    // digraph tables below only ever match a-z pairs.
    var w = String(word || '').toLowerCase().replace(/[^\p{L}\p{M}']/gu, '');
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

  // Which phoneme sequence to hand back for a given voice. English voices get
  // the phonics-normalized inventory (flap ɾ→t, ɚ→ɜr — the TAUGHT model,
  // byte-identical to the pre-multilingual behavior). Every other language
  // gets the raw stress/length-stripped IPA: the English normalizations are
  // WRONG elsewhere (Spanish "perro" has a real tap /ɾ/ — mapping it to /t/
  // would corrupt a genuine phoneme of the language).
  function ipaFromParsed(parsed, voice) {
    if (!parsed) return null;
    var isEnglish = String(voice || '').indexOf('en') === 0;
    var seq = isEnglish ? parsed.norm : parsed.raw;
    return (seq && seq.length) ? seq : null;
  }

  window.AlloPhonics = {
    ready: function () { return !!_factoryPromise; },
    // Exposed for unit tests + reuse (pure).
    _parse: parseIpaOutput,
    _normalizeToken: normalizeToken,
    _resolveVoice: resolveVoice,
    _ipaFromParsed: ipaFromParsed,
    // Language support probe for UI/capability gating: 'en-us' | 'es' | … |
    // null (no espeak voice → Gemini-only phonemes for that language).
    voiceFor: resolveVoice,
    alignGraphemes: alignGraphemes,
    /**
     * Merge eSpeak's phoneme sequence (authoritative — deterministic, dict-
     * backed) with Gemini's grapheme alignment (Gemini is prompted to segment
     * spelling well) into the app's [{ipa, grapheme}] shape + triangulation
     * metadata. Rules:
     *  - phoneme COUNT + IPA come from eSpeak.
     *  - graphemes: when Gemini's phoneme count == eSpeak's, use Gemini's
     *    graphemes (best spelling alignment) zipped with eSpeak IPA; otherwise
     *    fall back to the local digraph-aware aligner. An unalignable spelling
     *    leaves graphemes empty; it never changes the valid sound sequence.
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
        if (graphemes.some(function (g) { return typeof g !== 'string' || !g.trim(); }) ||
          graphemes.join('').normalize('NFC').toLowerCase() !== String(word || '').normalize('NFC').toLowerCase()) graphemes = null;
      }
      if (!graphemes) graphemes = alignGraphemes(word, ipa.length);
      // A letter can represent more than one sound (box: /b/ /ɑ/ /k/ /s/).
      // Inventing a partial one-letter-per-sound mapping hides that distinction.
      var phonemes = ipa.map(function (sym, i) { return { ipa: sym, grapheme: graphemes && graphemes[i] || '' }; });
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
      // No espeak voice for this language → null so the caller keeps its
      // Gemini phonemes. Running the ENGLISH voice here instead would return
      // confidently wrong sounds — worse than no answer.
      if (!voice) return Promise.resolve(null);
      return loadFactory().then(function (ESpeakNg) {
        return ESpeakNg({
          arguments: ['--ipa', '--sep=_', '-q', '--phonout=/allo_ph.txt', '-v', voice, w]
        }).then(function (inst) {
          var out = '';
          try { out = inst.FS.readFile('/allo_ph.txt', { encoding: 'utf8' }); } catch (_) { out = ''; }
          var parsed = parseIpaOutput(out);
          var seq = ipaFromParsed(parsed, voice);
          if (!seq) return null;
          return { ipa: seq, rawIpa: parsed.raw, count: seq.length, ipaString: seq.join(' '), voice: voice };
        });
      }).catch(function () { return null; });
    }
  };

  console.log('[AlloPhonics] phonics_g2p_loader.js ready — window.AlloPhonics.toPhonemes(word) (lazy eSpeak NG G2P, phonics-normalized)');
})();

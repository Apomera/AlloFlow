/**
 * sre_loader.js — AlloFlow spoken math (Speech Rule Engine)
 *
 * Upgrades AlloFlow's spoken-math surfaces from the hand-rolled ~75-line
 * LaTeX→English converter (_alloLatexToSpeakable in doc_pipeline) to Speech
 * Rule Engine — the Apache-2.0 math-to-speech engine behind MathJax's
 * accessibility extensions (ClearSpeak/MathSpeak rules, multiple locales).
 *
 * Exposes a single fallback-safe entry point:
 *     window.AlloMathSpeech.toSpeech(input, opts) -> Promise<string|null>
 * `input` is LaTeX (with or without $ / \( \) / \[ \] delimiters) OR a MathML
 * string (detected by a <math …> tag). Resolves to a spoken-English (or
 * localized) rendering, or NULL on ANY problem (offline, load failure, parse
 * error, timeout). Callers MUST keep their existing behaviour when this
 * returns null — worst case is exactly today's output, never a regression.
 * opts: { lang: 'Spanish'|'es'|…, timeoutMs: number }.
 *
 * Lazy: the ~360 KB SRE bundle + per-locale mathmaps JSON are fetched only on
 * the first call, never at page load. LaTeX input additionally lazy-loads
 * temml (MIT) for LaTeX→MathML — the same pinned build doc_pipeline already
 * uses — because SRE consumes MathML natively.
 *
 * NOTE (2026-07-05): written against verified CDN artifacts
 * (speech-rule-engine@4.1.4/lib/sre.js UMD global `SRE`; setupEngine /
 * engineReady / toSpeech confirmed present in the bundle; mathmaps en/es/fr/
 * de/it + nemeth confirmed 200) but NOT yet browser-smoke-tested. If SRE
 * fails to initialise every caller silently keeps its current behaviour.
 */
(function () {
  'use strict';
  if (window.AlloMathSpeech && typeof window.AlloMathSpeech.toSpeech === 'function') return;

  var SRE_URLS = [
    'https://cdn.jsdelivr.net/npm/speech-rule-engine@4.1.4/lib/sre.js',
    'https://unpkg.com/speech-rule-engine@4.1.4/lib/sre.js'
  ];
  var MATHMAPS_URL = 'https://cdn.jsdelivr.net/npm/speech-rule-engine@4.1.4/lib/mathmaps';
  var TEMML_URLS = [
    'https://cdn.jsdelivr.net/npm/temml@0.10.34/dist/temml.min.js',
    'https://unpkg.com/temml@0.10.34/dist/temml.min.js'
  ];
  // Locales verified to exist in speech-rule-engine@4.1.4/lib/mathmaps/.
  // Anything unmapped falls back to English rules — still far better than
  // reading raw LaTeX punctuation aloud.
  var SUPPORTED_LOCALES = { en: 1, es: 1, fr: 1, de: 1, it: 1 };
  var LANG_NAME_TO_LOCALE = { english: 'en', spanish: 'es', french: 'fr', german: 'de', italian: 'it' };

  var _scriptPromise = null;
  var _temmlPromise = null;
  var _enginePromise = null;
  var _engineLocale = null;

  function loadScriptChain(urls, isReady) {
    return new Promise(function (resolve, reject) {
      (function tryAt(i) {
        if (isReady()) { resolve(); return; }
        if (i >= urls.length) { reject(new Error('all sources failed')); return; }
        var s = document.createElement('script');
        s.src = urls[i];
        s.async = true;
        s.onload = function () { isReady() ? resolve() : tryAt(i + 1); };
        s.onerror = function () { try { s.remove(); } catch (_) {} tryAt(i + 1); };
        document.head.appendChild(s);
      })(0);
    });
  }

  function ensureSreScript() {
    if (window.SRE && typeof window.SRE.toSpeech === 'function') return Promise.resolve();
    if (_scriptPromise) return _scriptPromise;
    _scriptPromise = loadScriptChain(SRE_URLS, function () {
      return !!(window.SRE && typeof window.SRE.toSpeech === 'function' && typeof window.SRE.setupEngine === 'function');
    }).catch(function (e) { _scriptPromise = null; throw e; }); // allow a later retry
    return _scriptPromise;
  }

  function ensureTemml() {
    if (window.temml && typeof window.temml.renderToString === 'function') return Promise.resolve();
    if (_temmlPromise) return _temmlPromise;
    _temmlPromise = loadScriptChain(TEMML_URLS, function () {
      return !!(window.temml && typeof window.temml.renderToString === 'function');
    }).catch(function (e) { _temmlPromise = null; throw e; });
    return _temmlPromise;
  }

  function resolveLocale(lang) {
    if (!lang) return 'en';
    var s = String(lang).toLowerCase().trim();
    if (LANG_NAME_TO_LOCALE[s]) return LANG_NAME_TO_LOCALE[s];
    var code = s.slice(0, 2);
    return SUPPORTED_LOCALES[code] ? code : 'en';
  }

  // (Re)configure the engine for a locale. setupEngine may or may not return
  // a promise depending on the SRE build path; engineReady() is the reliable
  // settle signal. If the ClearSpeak domain is rejected for a locale, retry
  // with SRE's defaults rather than failing the whole call.
  function ensureEngine(locale) {
    if (_enginePromise && _engineLocale === locale) return _enginePromise;
    _engineLocale = locale;
    _enginePromise = ensureSreScript().then(function () {
      var setup = function (features) {
        return Promise.resolve()
          .then(function () { return window.SRE.setupEngine(features); })
          .then(function () { return window.SRE.engineReady(); });
      };
      return setup({ json: MATHMAPS_URL, locale: locale, domain: 'clearspeak', modality: 'speech' })
        .catch(function () { return setup({ json: MATHMAPS_URL, locale: locale }); });
    }).catch(function (e) { _enginePromise = null; _engineLocale = null; throw e; });
    return _enginePromise;
  }

  function stripLatexDelims(src) {
    var s = String(src).trim();
    s = s.replace(/^\$\$([\s\S]*)\$\$$/, '$1');
    s = s.replace(/^\$([\s\S]*)\$$/, '$1');
    s = s.replace(/^\\\[([\s\S]*)\\\]$/, '$1');
    s = s.replace(/^\\\(([\s\S]*)\\\)$/, '$1');
    return s.trim();
  }

  function extractMathElement(src) {
    var m = String(src).match(/<math[\s>][\s\S]*?<\/math>/i);
    return m ? m[0] : null;
  }

  function latexToMathML(latex) {
    return ensureTemml().then(function () {
      var html = window.temml.renderToString(latex, { displayMode: true });
      if (!html || html.indexOf('<math') === -1) return null;
      // temml renders parse problems inline rather than throwing — a spoken
      // form derived from an error node would be nonsense, so treat as failure.
      if (/temml-error|<merror/i.test(html)) return null;
      return extractMathElement(html);
    });
  }

  window.AlloMathSpeech = {
    /**
     * LaTeX or MathML → spoken text. Resolves to a string, or NULL if SRE is
     * unavailable / input unparseable / timeout — callers keep their fallback.
     */
    toSpeech: function (input, opts) {
      var o = opts || {};
      var src = String(input == null ? '' : input).trim();
      if (!src) return Promise.resolve(null);
      var locale = resolveLocale(o.lang || o.locale);
      var timeoutMs = (typeof o.timeoutMs === 'number' && o.timeoutMs > 0) ? o.timeoutMs : 10000;
      var work = Promise.resolve().then(function () {
        var mmlPromise = /<math[\s>]/i.test(src)
          ? Promise.resolve(extractMathElement(src))
          : latexToMathML(stripLatexDelims(src));
        return mmlPromise.then(function (mml) {
          if (!mml) return null;
          return ensureEngine(locale).then(function () {
            var out = window.SRE.toSpeech(mml);
            out = String(out == null ? '' : out).trim();
            return out.length ? out : null;
          });
        });
      }).catch(function () { return null; });
      // Hard timeout so a slow CDN can never wedge a caller (the TTS pre-pass
      // sits directly in front of speech synthesis).
      var timer = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, timeoutMs); });
      return Promise.race([work, timer]);
    },
    ready: function () {
      return !!(window.SRE && typeof window.SRE.toSpeech === 'function');
    }
  };

  console.log('[AlloMathSpeech] sre_loader.js ready — window.AlloMathSpeech.toSpeech(latex|mathml) (lazy ClearSpeak)');
})();

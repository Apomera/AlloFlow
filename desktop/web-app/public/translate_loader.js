/**
 * translate_loader.js — AlloFlow on-device translation (Bridge, offline/private)
 *
 * The Bridge family-communication feature translates every turn via Gemini —
 * so the text leaves the device (the F2F note even had to be corrected to say
 * so). This runs neural machine translation ON DEVICE via transformers.js +
 * Helsinki-NLP opus-mt models (Apache-2.0), so a teacher↔family conversation
 * can be translated with NOTHING leaving the machine — a real FERPA win, and it
 * works offline in the School Box. transformers.js already underpins the app's
 * on-device speech; this reuses that ecosystem.
 *
 * Exposes a fallback-safe entry point:
 *     window.AlloTranslate.translate(text, fromLang, toLang, opts) -> Promise<string|null>
 * Resolves to the translation, or NULL when no on-device model covers the pair
 * (or on any failure) so the caller falls back to the cloud path — never a
 * regression. Also: supports(from,to) and preload(from,to,onProgress).
 *
 * Coverage (v1): English ↔ {Spanish, French, German, Chinese, Arabic, Russian,
 * Hindi, Vietnamese, Italian} — the opus-mt pairs verified to ship a quantized
 * model. Non-English↔non-English and unlisted languages return null (→ cloud).
 *
 * Lazy: transformers.js + a ~40-60 MB quantized model per language pair load on
 * the first translate for that pair, cached by the browser thereafter. Opt-in
 * (the Bridge "on-device translation" toggle), never at page load.
 *
 * NOTE (2026-07-06): written against verified CDN artifacts (@xenova/transformers
 * @2.17.2 ESM; Xenova/opus-mt-en-* quantized ONNX present) but the in-browser
 * model load + inference are NOT yet browser-smoke-tested. On any failure
 * translate() returns null and Bridge uses its existing cloud translation.
 */
(function () {
  'use strict';
  if (window.AlloTranslate && typeof window.AlloTranslate.translate === 'function') return;

  var TRANSFORMERS_URLS = [
    'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2',
    'https://unpkg.com/@xenova/transformers@2.17.2'
  ];
  // Language name / code → opus-mt 2-letter code.
  var LANG_TO_CODE = {
    english: 'en', spanish: 'es', french: 'fr', german: 'de', chinese: 'zh',
    'chinese (simplified)': 'zh', mandarin: 'zh', arabic: 'ar', russian: 'ru',
    hindi: 'hi', vietnamese: 'vi', italian: 'it',
    en: 'en', es: 'es', fr: 'fr', de: 'de', zh: 'zh', ar: 'ar', ru: 'ru', hi: 'hi', vi: 'vi', it: 'it'
  };
  // Non-English codes with a verified quantized opus-mt pair to/from English.
  var SUPPORTED = { es: 1, fr: 1, de: 1, zh: 1, ar: 1, ru: 1, hi: 1, vi: 1, it: 1 };

  var _libPromise = null;   // memoized transformers.js module
  var _pipes = {};          // pair key → memoized pipeline promise

  function codeOf(lang) {
    if (!lang) return '';
    var s = String(lang).toLowerCase().trim();
    if (LANG_TO_CODE[s]) return LANG_TO_CODE[s];
    var two = s.slice(0, 2);
    return LANG_TO_CODE[two] || '';
  }
  // A pair is on-device-translatable when both map to a code, they differ, and
  // exactly one side is English with the other in the verified opus-mt set.
  function pairModel(fromCode, toCode) {
    if (!fromCode || !toCode || fromCode === toCode) return null;
    if (fromCode === 'en' && SUPPORTED[toCode]) return 'Xenova/opus-mt-en-' + toCode;
    if (toCode === 'en' && SUPPORTED[fromCode]) return 'Xenova/opus-mt-' + fromCode + '-en';
    return null;
  }

  function ensureLib() {
    if (_libPromise) return _libPromise;
    _libPromise = (function tryAt(i) {
      if (i >= TRANSFORMERS_URLS.length) return Promise.reject(new Error('transformers.js sources failed'));
      return import(/* webpackIgnore: true */ TRANSFORMERS_URLS[i]).then(function (m) {
        var lib = m && (m.pipeline ? m : (m.default && m.default.pipeline ? m.default : null));
        if (!lib || typeof lib.pipeline !== 'function') throw new Error('transformers.js: no pipeline export');
        try { if (lib.env) { lib.env.allowLocalModels = false; lib.env.useBrowserCache = true; } } catch (_) {}
        return lib;
      }).catch(function () { return tryAt(i + 1); });
    })(0).catch(function (e) { _libPromise = null; throw e; });
    return _libPromise;
  }

  function getPipe(model, onProgress) {
    if (_pipes[model]) return _pipes[model];
    _pipes[model] = ensureLib().then(function (lib) {
      return lib.pipeline('translation', model, { quantized: true, progress_callback: onProgress || undefined });
    }).catch(function (e) { delete _pipes[model]; throw e; });
    return _pipes[model];
  }

  window.AlloTranslate = {
    ready: function () { return !!_libPromise; },
    /** Is there an on-device model for this language pair? */
    supports: function (fromLang, toLang) {
      return !!pairModel(codeOf(fromLang), codeOf(toLang));
    },
    /** Warm the model for a pair (downloads it) — returns true when ready. */
    preload: function (fromLang, toLang, onProgress) {
      var model = pairModel(codeOf(fromLang), codeOf(toLang));
      if (!model) return Promise.resolve(false);
      return getPipe(model, onProgress).then(function () { return true; }).catch(function () { return false; });
    },
    /**
     * Translate on-device. Resolves to the translation string, or NULL if no
     * model covers the pair / anything fails (caller uses the cloud path).
     */
    translate: function (text, fromLang, toLang, opts) {
      var src = String(text == null ? '' : text).trim();
      if (!src) return Promise.resolve(null);
      var model = pairModel(codeOf(fromLang), codeOf(toLang));
      if (!model) return Promise.resolve(null);
      var onProgress = opts && opts.onProgress;
      return getPipe(model, onProgress).then(function (translator) {
        return translator(src, { max_new_tokens: 512 });
      }).then(function (out) {
        var res = Array.isArray(out) ? out[0] : out;
        var txt = res && (res.translation_text || res.text || res.generated_text);
        txt = String(txt == null ? '' : txt).trim();
        return txt.length ? txt : null;
      }).catch(function () { return null; });
    }
  };

  console.log('[AlloTranslate] translate_loader.js ready — window.AlloTranslate.translate(text, from, to) (lazy opus-mt, on-device)');
})();

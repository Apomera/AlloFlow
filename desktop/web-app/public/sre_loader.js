/**
 * sre_loader.js - AlloFlow spoken math (Speech Rule Engine)
 *
 * Converts LaTeX or MathML to deterministic spoken text before AlloFlow routes
 * that text to Gemini, Kokoro, Piper, an OpenAI-compatible provider, or browser
 * speech synthesis.
 *
 * Offline-first: pinned SRE 4.1.4, locale maps, and Temml 0.10.34 assets ship
 * in ./sre-assets. Pinned CDN URLs are optional recovery sources for incomplete
 * web deployments and can be disabled with configure().
 *
 * SRE configuration is process-global. All engine configuration and rendering
 * is serialized so concurrent requests in different languages cannot race.
 */
(function () {
  'use strict';
  if (window.AlloMathSpeech && typeof window.AlloMathSpeech.toSpeech === 'function') return;

  var SRE_VERSION = '4.1.4';
  var TEMML_VERSION = '0.10.34';
  var SETTINGS_KEY = 'alloflow_math_speech_v1';

  function loaderBaseUrl() {
    try {
      var current = document.currentScript && document.currentScript.src;
      if (current) return new URL('.', current).href;
    } catch (_) {}
    try { return new URL('./', window.location.href).href; }
    catch (_) { return './'; }
  }

  var LOCAL_ASSET_BASE = loaderBaseUrl() + 'sre-assets/';
  var SRE_URLS = [
    LOCAL_ASSET_BASE + 'sre.js',
    'https://cdn.jsdelivr.net/npm/speech-rule-engine@4.1.4/lib/sre.js',
    'https://unpkg.com/speech-rule-engine@4.1.4/lib/sre.js'
  ];
  var MATHMAPS_URLS = [
    LOCAL_ASSET_BASE + 'mathmaps',
    'https://cdn.jsdelivr.net/npm/speech-rule-engine@4.1.4/lib/mathmaps',
    'https://unpkg.com/speech-rule-engine@4.1.4/lib/mathmaps'
  ];
  var TEMML_URLS = [
    LOCAL_ASSET_BASE + 'temml.min.js',
    'https://cdn.jsdelivr.net/npm/temml@0.10.34/dist/temml.min.js',
    'https://unpkg.com/temml@0.10.34/dist/temml.min.js'
  ];

  // Every speech locale included in the pinned SRE release.
  var SUPPORTED_LOCALES = {
    af: 1, ca: 1, da: 1, de: 1, en: 1, es: 1, fr: 1,
    hi: 1, it: 1, ko: 1, nb: 1, nn: 1, sv: 1
  };
  var LANG_NAME_TO_LOCALE = {
    afrikaans: 'af', catalan: 'ca', danish: 'da', german: 'de',
    english: 'en', spanish: 'es', french: 'fr', hindi: 'hi',
    italian: 'it', korean: 'ko', norwegian: 'nb',
    'norwegian bokmal': 'nb', 'norwegian bokmaal': 'nb',
    'norwegian nynorsk': 'nn', swedish: 'sv'
  };
  var DEFAULT_SETTINGS = {
    domain: 'clearspeak',
    style: 'default',
    unsupportedLocale: 'passthrough',
    allowRemoteFallback: true
  };

  var _scriptPromise = null;
  var _temmlPromise = null;
  var _engineQueue = Promise.resolve();
  var _engineSignature = null;
  var _engineMapBase = null;
  var _engineProfile = null;
  var _sreSource = null;
  var _temmlSource = null;

  function readStoredSettings() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }

  function normalizeSettings(input) {
    var src = input && typeof input === 'object' ? input : {};
    var domain = String(src.domain || DEFAULT_SETTINGS.domain).toLowerCase();
    if (domain !== 'mathspeak' && domain !== 'clearspeak') domain = DEFAULT_SETTINGS.domain;
    var style = String(src.style || src.verbosity || DEFAULT_SETTINGS.style).toLowerCase();
    if (style === 'superbrief' || style === 'super-brief') style = 'sbrief';
    if (style === 'detailed' || style === 'verbose') style = 'default';
    if (style !== 'default' && style !== 'brief' && style !== 'sbrief') style = 'default';
    return {
      domain: domain,
      style: style,
      unsupportedLocale: src.unsupportedLocale === 'english' ? 'english' : 'passthrough',
      allowRemoteFallback: src.allowRemoteFallback !== false
    };
  }

  var _settings = normalizeSettings(readStoredSettings());

  function settingsCopy() {
    return {
      domain: _settings.domain,
      style: _settings.style,
      unsupportedLocale: _settings.unsupportedLocale,
      allowRemoteFallback: _settings.allowRemoteFallback
    };
  }

  function effectiveSettings(opts) {
    var merged = settingsCopy();
    var src = opts && typeof opts === 'object' ? opts : {};
    Object.keys(src).forEach(function (key) { merged[key] = src[key]; });
    return normalizeSettings(merged);
  }

  function sourceUrls(urls, settings) {
    return settings.allowRemoteFallback ? urls.slice() : urls.slice(0, 1);
  }

  function loadScriptChain(urls, isReady) {
    return new Promise(function (resolve, reject) {
      (function tryAt(index) {
        if (isReady()) { resolve({ url: 'preloaded', index: -1 }); return; }
        if (index >= urls.length) { reject(new Error('all script sources failed')); return; }
        var script = document.createElement('script');
        script.src = urls[index];
        script.async = true;
        script.onload = function () {
          if (isReady()) resolve({ url: urls[index], index: index });
          else { try { script.remove(); } catch (_) {} tryAt(index + 1); }
        };
        script.onerror = function () {
          try { script.remove(); } catch (_) {}
          tryAt(index + 1);
        };
        document.head.appendChild(script);
      })(0);
    });
  }

  function ensureSreScript(settings) {
    if (window.SRE && typeof window.SRE.toSpeech === 'function' &&
        typeof window.SRE.setupEngine === 'function') return Promise.resolve();
    if (_scriptPromise) return _scriptPromise;
    _scriptPromise = loadScriptChain(sourceUrls(SRE_URLS, settings), function () {
      return !!(window.SRE && typeof window.SRE.toSpeech === 'function' &&
        typeof window.SRE.setupEngine === 'function');
    }).then(function (result) {
      _sreSource = result.url;
    }).catch(function (error) {
      _scriptPromise = null;
      throw error;
    });
    return _scriptPromise;
  }

  function ensureTemml(settings) {
    if (window.temml && typeof window.temml.renderToString === 'function') return Promise.resolve();
    if (_temmlPromise) return _temmlPromise;
    _temmlPromise = loadScriptChain(sourceUrls(TEMML_URLS, settings), function () {
      return !!(window.temml && typeof window.temml.renderToString === 'function');
    }).then(function (result) {
      _temmlSource = result.url;
    }).catch(function (error) {
      _temmlPromise = null;
      throw error;
    });
    return _temmlPromise;
  }

  function normalizedLanguageName(lang) {
    var value = String(lang || '').toLowerCase().trim();
    try { value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
    return value.replace(/[_-].*$/, '').replace(/\s+/g, ' ');
  }

  function resolveLocale(lang, settings) {
    if (!lang) return 'en';
    var name = normalizedLanguageName(lang);
    if (LANG_NAME_TO_LOCALE[name]) return LANG_NAME_TO_LOCALE[name];
    var code = name.slice(0, 2);
    if (SUPPORTED_LOCALES[code]) return code;
    return settings.unsupportedLocale === 'english' ? 'en' : null;
  }

  function settleEngine(features) {
    return Promise.resolve()
      .then(function () { return window.SRE.setupEngine(features); })
      .then(function () { return window.SRE.engineReady(); });
  }

  function setupProfiles(locale, settings, mapBase) {
    var base = { json: mapBase, locale: locale, modality: 'speech' };
    var profiles = [
      { json: mapBase, locale: locale, modality: 'speech', domain: settings.domain, style: settings.style },
      { json: mapBase, locale: locale, modality: 'speech', domain: settings.domain },
      base
    ];
    return (function tryProfile(index) {
      if (index >= profiles.length) return Promise.reject(new Error('math speech profile unavailable'));
      return settleEngine(profiles[index]).then(function () {
        _engineProfile = profiles[index];
      }).catch(function () { return tryProfile(index + 1); });
    })(0);
  }

  function setupEngineAt(locale, settings, mapUrls, index) {
    if (index >= mapUrls.length) return Promise.reject(new Error('all mathmaps sources failed'));
    var mapBase = mapUrls[index];
    return setupProfiles(locale, settings, mapBase).then(function () {
      _engineMapBase = mapBase;
      _engineSignature = [locale, settings.domain, settings.style, mapBase].join('|');
    }).catch(function () { return setupEngineAt(locale, settings, mapUrls, index + 1); });
  }

  function ensureEngine(locale, settings) {
    return ensureSreScript(settings).then(function () {
      var expectedPrefix = [locale, settings.domain, settings.style].join('|') + '|';
      if (_engineSignature && _engineSignature.indexOf(expectedPrefix) === 0) {
        return window.SRE.engineReady();
      }
      return setupEngineAt(locale, settings, sourceUrls(MATHMAPS_URLS, settings), 0);
    });
  }

  function withEngine(locale, settings, render) {
    var task = _engineQueue.catch(function () { return null; })
      .then(function () { return ensureEngine(locale, settings); })
      .then(render);
    _engineQueue = task.catch(function () { return null; });
    return task;
  }

  function stripLatexDelims(src) {
    var value = String(src).trim();
    value = value.replace(/^\$\$([\s\S]*)\$\$$/, '$1');
    value = value.replace(/^\$([\s\S]*)\$$/, '$1');
    value = value.replace(/^\\\[([\s\S]*)\\\]$/, '$1');
    value = value.replace(/^\\\(([\s\S]*)\\\)$/, '$1');
    return value.trim();
  }

  function extractMathElement(src) {
    var match = String(src).match(/<math[\s>][\s\S]*?<\/math>/i);
    return match ? match[0] : null;
  }

  function latexToMathML(latex, settings) {
    return ensureTemml(settings).then(function () {
      var html = window.temml.renderToString(latex, { displayMode: true });
      if (!html || html.indexOf('<math') === -1) return null;
      if (/temml-error|<merror/i.test(html)) return null;
      return extractMathElement(html);
    });
  }

  function withTimeout(work, timeoutMs) {
    return new Promise(function (resolve) {
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; resolve(null); }
      }, timeoutMs);
      Promise.resolve(work).then(function (value) {
        if (!settled) { settled = true; clearTimeout(timer); resolve(value); }
      }, function () {
        if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
      });
    });
  }

  window.AlloMathSpeech = {
    toSpeech: function (input, opts) {
      var options = opts || {};
      var src = String(input == null ? '' : input).trim();
      if (!src) return Promise.resolve(null);
      var settings = effectiveSettings(options);
      var locale = resolveLocale(options.lang || options.locale, settings);
      if (!locale) return Promise.resolve(null);
      var timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0
        ? options.timeoutMs : 10000;
      var mathml = /<math[\s>]/i.test(src)
        ? Promise.resolve(extractMathElement(src))
        : latexToMathML(stripLatexDelims(src), settings);
      var work = mathml.then(function (value) {
        if (!value) return null;
        return withEngine(locale, settings, function () {
          var spoken = String(window.SRE.toSpeech(value) || '').trim();
          return spoken || null;
        });
      });
      return withTimeout(work, timeoutMs);
    },
    ready: function () {
      return !!(window.SRE && typeof window.SRE.toSpeech === 'function');
    },
    preload: function (opts) {
      var options = opts || {};
      var settings = effectiveSettings(options);
      var locale = resolveLocale(options.lang || options.locale || 'en', settings) || 'en';
      return Promise.all([
        ensureTemml(settings),
        withEngine(locale, settings, function () { return true; })
      ]).then(function () { return true; }).catch(function () { return false; });
    },
    configure: function (next) {
      _settings = effectiveSettings(next || {});
      _engineSignature = null;
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings)); } catch (_) {}
      return settingsCopy();
    },
    settings: settingsCopy,
    diagnostics: function () {
      return {
        ready: !!(window.SRE && typeof window.SRE.toSpeech === 'function'),
        sreVersion: SRE_VERSION,
        temmlVersion: TEMML_VERSION,
        sreSource: _sreSource,
        temmlSource: _temmlSource,
        mathmapsSource: _engineMapBase,
        engineSignature: _engineSignature,
        engineProfile: _engineProfile,
        localAssetBase: LOCAL_ASSET_BASE,
        settings: settingsCopy(),
        supportedLocales: Object.keys(SUPPORTED_LOCALES)
      };
    }
  };

  console.log('[AlloMathSpeech] offline-first SRE ' + SRE_VERSION + ' ready (lazy ' + _settings.domain + ')');
})();

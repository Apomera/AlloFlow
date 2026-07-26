/**
 * sre_loader.js - AlloFlow semantic math rendering and speech
 *
 * Converts LaTeX to semantic MathML for visual display and deterministic spoken
 * text before AlloFlow routes
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
  if (window.AlloMathRenderer && typeof window.AlloMathRenderer.renderToString === 'function' &&
      window.AlloMathSpeech && typeof window.AlloMathSpeech.toSpeech === 'function') return;

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
  var TEMML_CSS_URLS = [
    LOCAL_ASSET_BASE + 'Temml-Local.css',
    'https://cdn.jsdelivr.net/npm/temml@0.10.34/dist/Temml-Local.css',
    'https://unpkg.com/temml@0.10.34/dist/Temml-Local.css'
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
  var _temmlCssPromise = null;
  var _engineQueue = Promise.resolve();
  var _engineSignature = null;
  var _engineMapBase = null;
  var _engineProfile = null;
  var _sreSource = null;
  var _temmlSource = null;
  var _temmlCssSource = null;

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

  function loadStyleChain(urls) {
    return new Promise(function (resolve, reject) {
      (function tryAt(index) {
        if (index >= urls.length) { reject(new Error('all stylesheet sources failed')); return; }
        var existing = document.querySelector('link[data-allo-temml-css="' + urls[index] + '"]');
        if (existing) { resolve({ url: urls[index], index: index }); return; }
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = urls[index];
        link.setAttribute('data-allo-temml-css', urls[index]);
        link.onload = function () { resolve({ url: urls[index], index: index }); };
        link.onerror = function () {
          try { link.remove(); } catch (_) {}
          tryAt(index + 1);
        };
        document.head.appendChild(link);
      })(0);
    });
  }

  function ensureTemmlStyles(settings) {
    if (_temmlCssSource && document.querySelector('link[data-allo-temml-css]')) return Promise.resolve();
    if (_temmlCssPromise) return _temmlCssPromise;
    _temmlCssPromise = loadStyleChain(sourceUrls(TEMML_CSS_URLS, settings)).then(function (result) {
      _temmlCssSource = result.url;
    }).catch(function (error) {
      _temmlCssPromise = null;
      throw error;
    });
    return _temmlCssPromise;
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

  function ensureTemml(settings, includeStyles) {
    var runtime = (window.temml && typeof window.temml.renderToString === 'function')
      ? Promise.resolve()
      : _temmlPromise;
    if (!runtime) {
      _temmlPromise = loadScriptChain(sourceUrls(TEMML_URLS, settings), function () {
        return !!(window.temml && typeof window.temml.renderToString === 'function');
      }).then(function (result) {
        _temmlSource = result.url;
      }).catch(function (error) {
        _temmlPromise = null;
        throw error;
      });
      runtime = _temmlPromise;
    }
    return runtime.then(function () {
      return includeStyles ? ensureTemmlStyles(settings) : null;
    });
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

  function latexToMathML(latex, settings, displayMode, includeStyles) {
    return ensureTemml(settings, includeStyles === true).then(function () {
      var html;
      try {
        html = window.temml.renderToString(latex, {
          displayMode: displayMode !== false,
          throwOnError: false,
          strict: 'warn',
          trust: false
        });
      } catch (_) { return null; }
      if (!html || html.indexOf('<math') === -1) return null;
      if (/temml-error|<merror|<script|javascript:/i.test(html)) return null;
      return extractMathElement(html);
    });
  }

  function inputDisplayMode(src, opts) {
    if (opts && typeof opts.displayMode === 'boolean') return opts.displayMode;
    var value = String(src || '').trim();
    return /^\$\$[\s\S]*\$\$$/.test(value) || /^\\\[[\s\S]*\\\]$/.test(value);
  }

  function renderMathML(input, opts) {
    var options = opts || {};
    var src = String(input == null ? '' : input).trim();
    if (!src) return Promise.resolve(null);
    if (/^<math[\s>]/i.test(src)) return Promise.resolve(extractMathElement(src));
    var settings = effectiveSettings(options);
    return latexToMathML(stripLatexDelims(src), settings, inputDisplayMode(src, options), true);
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

  window.AlloMathRenderer = {
    renderToString: renderMathML,
    preload: function (opts) {
      return ensureTemml(effectiveSettings(opts || {}), true)
        .then(function () { return true; }).catch(function () { return false; });
    },
    ready: function () {
      return !!(window.temml && typeof window.temml.renderToString === 'function' && _temmlCssSource);
    },
    diagnostics: function () {
      return {
        ready: !!(window.temml && typeof window.temml.renderToString === 'function'),
        version: TEMML_VERSION,
        temmlSource: _temmlSource,
        temmlCssSource: _temmlCssSource,
        cssSource: _temmlCssSource,
        localAssetBase: LOCAL_ASSET_BASE,
        role: 'semantic-math-renderer',
        replaces: ['regex-display-primary'],
        preserves: ['processMathHTML-fallback', 'AlgebraCAS-grading', 'MathLive-input', 'SRE-speech']
      };
    }
  };
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
        : latexToMathML(stripLatexDelims(src), settings, true, false);
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
        ensureTemml(settings, false),
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
        temmlCssSource: _temmlCssSource,
        mathmapsSource: _engineMapBase,
        engineSignature: _engineSignature,
        engineProfile: _engineProfile,
        localAssetBase: LOCAL_ASSET_BASE,
        settings: settingsCopy(),
        supportedLocales: Object.keys(SUPPORTED_LOCALES)
      };
    }
  };

  console.log('[AlloMathRuntime] offline-first Temml ' + TEMML_VERSION + ' renderer + SRE ' + SRE_VERSION + ' speech ready');
})();

/**
 * mathlive_loader.js - AlloFlow accessible math input adapter
 *
 * MathLive is an input and serialization layer for the existing Math view and
 * STEM Lab. It does not generate problems, solve them, or replace AlgebraCAS.
 * The result includes LaTeX/MathML for accessible display and an ASCIIMath-like
 * engineText value that existing deterministic graders can consume.
 *
 * Offline-first: MathLive 0.110.0 and its fonts ship in ./mathlive-assets.
 * Pinned CDN URLs are optional recovery sources for incomplete web deployments.
 */
(function () {
  'use strict';
  if (window.AlloMathInput && typeof window.AlloMathInput.promptEquation === 'function') return;

  var MATHLIVE_VERSION = '0.110.0';
  var SETTINGS_KEY = 'alloflow_math_input_v1';

  function loaderBaseUrl() {
    try {
      var current = document.currentScript && document.currentScript.src;
      if (current) return new URL('.', current).href;
    } catch (_) {}
    try { return new URL('./', window.location.href).href; }
    catch (_) { return './'; }
  }

  var LOCAL_ASSET_BASE = loaderBaseUrl() + 'mathlive-assets/';
  var SOURCES = [
    {
      script: LOCAL_ASSET_BASE + 'mathlive.min.js',
      fonts: LOCAL_ASSET_BASE + 'fonts/'
    },
    {
      script: 'https://cdn.jsdelivr.net/npm/mathlive@' + MATHLIVE_VERSION + '/mathlive.min.js',
      fonts: 'https://cdn.jsdelivr.net/npm/mathlive@' + MATHLIVE_VERSION + '/fonts/'
    },
    {
      script: 'https://unpkg.com/mathlive@' + MATHLIVE_VERSION + '/mathlive.min.js',
      fonts: 'https://unpkg.com/mathlive@' + MATHLIVE_VERSION + '/fonts/'
    }
  ];

  var DEFAULT_SETTINGS = {
    allowRemoteFallback: true,
    virtualKeyboardMode: 'onfocus'
  };
  var _readyPromise = null;
  var _source = null;
  var _fontsSource = null;

  function readStoredSettings() {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) { return {}; }
  }

  function normalizeSettings(input) {
    var src = input && typeof input === 'object' ? input : {};
    var keyboard = String(src.virtualKeyboardMode || DEFAULT_SETTINGS.virtualKeyboardMode).toLowerCase();
    if (keyboard !== 'onfocus' && keyboard !== 'manual' && keyboard !== 'off') keyboard = 'onfocus';
    return {
      allowRemoteFallback: src.allowRemoteFallback !== false,
      virtualKeyboardMode: keyboard
    };
  }

  var _settings = normalizeSettings(readStoredSettings());

  function settingsCopy() {
    return {
      allowRemoteFallback: _settings.allowRemoteFallback,
      virtualKeyboardMode: _settings.virtualKeyboardMode
    };
  }

  function effectiveSettings(opts) {
    var merged = settingsCopy();
    var src = opts && typeof opts === 'object' ? opts : {};
    Object.keys(src).forEach(function (key) { merged[key] = src[key]; });
    return normalizeSettings(merged);
  }

  function mathfieldClass() {
    return window.MathfieldElement || (window.MathLive && window.MathLive.MathfieldElement) || null;
  }

  function apiObject() {
    return window.MathLive || window;
  }

  function customElementReady() {
    return !!(window.customElements && window.customElements.get('math-field') && mathfieldClass());
  }

  function configureRuntime(fontsUrl) {
    try {
      var ElementClass = mathfieldClass();
      if (ElementClass) {
        ElementClass.fontsDirectory = fontsUrl;
        ElementClass.soundsDirectory = null;
      }
      _fontsSource = fontsUrl;
    } catch (_) {}
  }

  function sourceList(settings) {
    return settings.allowRemoteFallback ? SOURCES.slice() : SOURCES.slice(0, 1);
  }

  function loadAt(sources, index, resolve, reject) {
    if (customElementReady()) { resolve({ source: 'preloaded', fonts: _fontsSource }); return; }
    if (index >= sources.length) { reject(new Error('all MathLive sources failed')); return; }
    var candidate = sources[index];
    var script = document.createElement('script');
    script.src = candidate.script;
    script.async = true;
    script.onload = function () {
      configureRuntime(candidate.fonts);
      var deadline = Date.now() + 5000;
      (function poll() {
        if (customElementReady()) { resolve({ source: candidate.script, fonts: candidate.fonts }); return; }
        if (Date.now() >= deadline) {
          try { script.remove(); } catch (_) {}
          loadAt(sources, index + 1, resolve, reject);
          return;
        }
        setTimeout(poll, 50);
      })();
    };
    script.onerror = function () {
      try { script.remove(); } catch (_) {}
      loadAt(sources, index + 1, resolve, reject);
    };
    document.head.appendChild(script);
  }

  function ensureMathLive(opts) {
    var settings = effectiveSettings(opts);
    if (customElementReady()) {
      if (!_fontsSource) configureRuntime(LOCAL_ASSET_BASE + 'fonts/');
      return Promise.resolve(apiObject());
    }
    if (_readyPromise) return _readyPromise;
    _readyPromise = new Promise(function (resolve, reject) {
      loadAt(sourceList(settings), 0, resolve, reject);
    }).then(function (loaded) {
      _source = loaded.source;
      _fontsSource = loaded.fonts;
      return apiObject();
    }).catch(function (error) {
      _readyPromise = null;
      throw error;
    });
    return _readyPromise;
  }

  function readValue(field, format) {
    try { return String(field.getValue ? field.getValue(format) : '').trim(); }
    catch (_) { return ''; }
  }

  function engineTextFrom(value) {
    var result = value && typeof value === 'object' ? value : {};
    var text = String(result.asciiMath || result.plainText || result.latex || value || '').trim();
    return text
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .replace(/[\u00d7\u22c5]/g, '*')
      .replace(/\u00f7/g, '/')
      .replace(/\*\*/g, '^')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function maybeUseSre(formats, opts, loadSpeech) {
    var options = opts && typeof opts === 'object' ? opts : {};
    if (options.useSre === false) return Promise.resolve(formats);
    var prepare = Promise.resolve();
    if (loadSpeech && (!window.AlloMathSpeech || typeof window.AlloMathSpeech.toSpeech !== 'function') && window.__alloLoadPlugin) {
      prepare = Promise.resolve().then(function () { return window.__alloLoadPlugin('sre_loader.js'); }).catch(function () { return null; });
    }
    return prepare.then(function () {
      if (!window.AlloMathSpeech || typeof window.AlloMathSpeech.toSpeech !== 'function') return formats;
      var speechOptions = options.mathSpeech && typeof options.mathSpeech === 'object'
        ? options.mathSpeech : {};
      return window.AlloMathSpeech.toSpeech(formats.mathml || formats.latex, {
        domain: speechOptions.domain,
        style: speechOptions.style,
        lang: options.lang || options.locale,
        timeoutMs: Number(speechOptions.timeoutMs) > 0 ? Number(speechOptions.timeoutMs) : 5000
      }).then(function (spoken) {
        if (spoken && String(spoken).trim()) formats.spoken = String(spoken).trim();
        return formats;
      }).catch(function () { return formats; });
    });
  }

  function collectFormats(field, opts, loadSpeech) {
    var api = apiObject();
    var latex = readValue(field, 'latex') || String(field.value || '').trim();
    var mathml = readValue(field, 'math-ml');
    var asciiMath = readValue(field, 'ascii-math');
    var plainText = readValue(field, 'plain-text');
    var spoken = readValue(field, 'spoken-text') || readValue(field, 'spoken');
    if (!mathml && api && typeof api.convertLatexToMathMl === 'function') {
      try { mathml = String(api.convertLatexToMathMl(latex) || '').trim(); } catch (_) {}
    }
    if (mathml && !/^<math[\s>]/i.test(mathml)) {
      mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML">' + mathml + '</math>';
    }
    if (!spoken && api && typeof api.convertLatexToSpeakableText === 'function') {
      try { spoken = String(api.convertLatexToSpeakableText(latex) || '').trim(); } catch (_) {}
    }
    var formats = {
      latex: latex,
      mathml: mathml,
      asciiMath: asciiMath,
      plainText: plainText,
      spoken: spoken
    };
    formats.engineText = engineTextFrom(formats);
    return maybeUseSre(formats, opts, loadSpeech);
  }

  function applyFieldOptions(field, opts, settings) {
    field.setAttribute('aria-label', (opts && opts.ariaLabel) || 'Equation editor');
    try { field.mathVirtualKeyboardPolicy = settings.virtualKeyboardMode; } catch (_) {}
    try { field.smartFence = true; } catch (_) {}
    if (opts && opts.initialLatex) {
      try { field.value = String(opts.initialLatex); } catch (_) {}
    }
  }

  function speakWithBrowser(text) {
    if (!text || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== 'function') return false;
    try {
      window.speechSynthesis.cancel();
      var utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (_) { return false; }
  }

  function buildModal(opts, resolve) {
    var options = opts || {};
    var settings = effectiveSettings(options);
    var settled = false;
    var previousFocus = document.activeElement;
    var uid = 'allo-math-input-' + Date.now().toString(36);
    var done = function (value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    var backdrop = document.createElement('div');
    backdrop.setAttribute('role', 'presentation');
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:16px;';

    var panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', uid + '-title');
    panel.setAttribute('aria-describedby', uid + '-hint');
    panel.style.cssText = 'background:#fff;color:#0f172a;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(680px,100%);max-height:90vh;overflow:auto;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;';

    var title = document.createElement('h2');
    title.id = uid + '-title';
    title.style.cssText = 'padding:16px 16px 6px;margin:0;font-size:17px;font-weight:800;';
    title.textContent = options.title || 'Insert an equation';

    var hint = document.createElement('p');
    hint.id = uid + '-hint';
    hint.style.cssText = 'padding:0 16px 10px;margin:0;font-size:12px;color:#475569;line-height:1.5;';
    hint.textContent = options.hint || 'Type an equation or use the on-screen math keyboard. This changes how math is entered, not how AlloFlow generates or grades the problem.';

    var field = document.createElement('math-field');
    field.style.cssText = 'display:block;margin:4px 16px 12px;padding:12px;border:2px solid #94a3b8;border-radius:10px;font-size:24px;min-height:62px;';
    applyFieldOptions(field, options, settings);

    var status = document.createElement('div');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'min-height:20px;padding:0 16px;font-size:12px;color:#475569;';

    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:10px 16px 16px;flex-wrap:wrap;';
    var cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'padding:9px 14px;border-radius:8px;border:1px solid #94a3b8;background:#f8fafc;color:#334155;font-weight:700;cursor:pointer;';
    var hear = document.createElement('button');
    hear.type = 'button';
    hear.textContent = 'Hear equation';
    hear.style.cssText = 'padding:9px 14px;border-radius:8px;border:1px solid #4f46e5;background:#eef2ff;color:#3730a3;font-weight:700;cursor:pointer;';
    var insert = document.createElement('button');
    insert.type = 'button';
    insert.textContent = options.insertLabel || 'Insert equation';
    insert.style.cssText = 'padding:9px 14px;border-radius:8px;border:0;background:#4f46e5;color:#fff;font-weight:800;cursor:pointer;';

    footer.appendChild(cancel);
    footer.appendChild(hear);
    footer.appendChild(insert);
    panel.appendChild(title);
    panel.appendChild(hint);
    panel.appendChild(field);
    panel.appendChild(status);
    panel.appendChild(footer);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    function commit() {
      insert.disabled = true;
      collectFormats(field, options, false).then(function (formats) {
        insert.disabled = false;
        if (!formats.latex) { status.textContent = 'Enter an equation first.'; return; }
        done(formats);
      });
    }

    function hearEquation() {
      hear.disabled = true;
      status.textContent = 'Preparing spoken math...';
      collectFormats(field, options, true).then(function (formats) {
        hear.disabled = false;
        if (!formats.latex) { status.textContent = 'Enter an equation first.'; return; }
        if (!formats.spoken) { status.textContent = 'This equation could not be converted to speech.'; return; }
        if (typeof options.onSpeak === 'function') {
          return Promise.resolve(options.onSpeak(formats)).then(function () {
            status.textContent = 'Reading equation.';
          }).catch(function () { status.textContent = 'The selected voice could not read this equation.'; });
        }
        status.textContent = speakWithBrowser(formats.spoken) ? 'Reading equation.' : formats.spoken;
      }).catch(function () {
        hear.disabled = false;
        status.textContent = 'Spoken math is unavailable right now.';
      });
    }

    function onKey(event) {
      if (event.key === 'Escape') { event.preventDefault(); done(null); return; }
      if (event.key !== 'Tab') return;
      var focusables = [field, cancel, hear, insert].filter(function (item) { return !item.disabled; });
      var current = focusables.indexOf(document.activeElement);
      if (event.shiftKey && current <= 0) { event.preventDefault(); focusables[focusables.length - 1].focus(); }
      else if (!event.shiftKey && current === focusables.length - 1) { event.preventDefault(); focusables[0].focus(); }
    }

    function cleanup() {
      document.removeEventListener('keydown', onKey, true);
      try { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); } catch (_) {}
      try { if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.hide(); } catch (_) {}
      try { if (previousFocus && previousFocus.focus) previousFocus.focus(); } catch (_) {}
    }

    cancel.addEventListener('click', function () { done(null); });
    hear.addEventListener('click', hearEquation);
    insert.addEventListener('click', commit);
    backdrop.addEventListener('mousedown', function (event) { if (event.target === backdrop) done(null); });
    field.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commit(); }
    });
    document.addEventListener('keydown', onKey, true);
    setTimeout(function () { try { field.focus(); } catch (_) {} }, 30);
  }

  window.AlloMathInput = {
    ready: customElementReady,
    preload: function (opts) {
      return ensureMathLive(opts || {}).then(function () { return true; }).catch(function () { return false; });
    },
    fromLatex: function (latex, opts) {
      var options = opts || {};
      return ensureMathLive(options).then(function () {
        var field = document.createElement('math-field');
        field.style.cssText = 'position:fixed;left:-10000px;top:-10000px;';
        applyFieldOptions(field, { initialLatex: latex, ariaLabel: 'Equation conversion field' }, effectiveSettings(options));
        document.body.appendChild(field);
        return new Promise(function (resolve) {
          setTimeout(function () {
            collectFormats(field, options, false).then(function (formats) {
              try { field.remove(); } catch (_) {}
              resolve(formats.latex ? formats : null);
            });
          }, 0);
        });
      }).catch(function () { return null; });
    },
    promptEquation: function (opts) {
      var options = opts || {};
      return ensureMathLive(options).then(function () {
        if (!customElementReady()) return null;
        return new Promise(function (resolve) { buildModal(options, resolve); });
      }).catch(function () { return null; });
    },
    toEngineText: engineTextFrom,
    configure: function (next) {
      _settings = normalizeSettings(Object.assign(settingsCopy(), next || {}));
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings)); } catch (_) {}
      return settingsCopy();
    },
    settings: settingsCopy,
    diagnostics: function () {
      return {
        ready: customElementReady(),
        version: MATHLIVE_VERSION,
        source: _source,
        fontsSource: _fontsSource,
        localAssetBase: LOCAL_ASSET_BASE,
        settings: settingsCopy(),
        role: 'accessible-input-adapter',
        replaces: []
      };
    }
  };

  console.log('[AlloMathInput] offline-first MathLive ' + MATHLIVE_VERSION + ' ready (shared input adapter; existing graders unchanged)');
})();

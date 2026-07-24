/**
 * mathlive_loader.js — AlloFlow accessible math INPUT (MathLive)
 *
 * The input twin of sre_loader.js (which gives math OUTPUT — spoken/braille).
 * MathLive (mathlive.io, MIT — by the author of Speech Rule Engine) is a
 * WYSIWYG equation editor web component with built-in virtual math keyboards,
 * screen-reader support, and export to LaTeX / MathML / spoken text. Authoring
 * an equation here produces the SAME <math> MathML the doc pipeline already
 * makes with temml, so it flows straight through the accessibility chain:
 * SRE speaks it, native MathML renders it, liblouis+SRE can braille it.
 *
 * Exposes a fallback-safe, framework-agnostic entry point:
 *     window.AlloMathInput.promptEquation(opts) -> Promise<{latex, mathml, spoken} | null>
 * Opens a small modal with a MathLive field; resolves with the equation in
 * three formats on Insert, or NULL on cancel / load failure (caller does
 * nothing — never a regression). opts: { initialLatex, title }.
 *
 * Lazy: the ~840 KB MathLive UMD + fonts load only on the first call, never at
 * page load. Loaded via a plain <script> tag (MathLive's root build is UMD and
 * attaches window.MathLive + registers the <math-field> custom element).
 *
 * NOTE (2026-07-06): written against verified CDN artifacts (mathlive@0.110.0
 * root mathlive.min.js UMD → window.MathLive; convertLatexToMathMl /
 * convertLatexToSpeakableText present; getValue('math-ml'|'spoken') supported;
 * fonts/ dir 200) but NOT yet browser-smoke-tested.
 */
(function () {
  'use strict';
  if (window.AlloMathInput && typeof window.AlloMathInput.promptEquation === 'function') return;

  var MATHLIVE_VERSION = '0.110.0';
  var MATHLIVE_URLS = [
    'https://cdn.jsdelivr.net/npm/mathlive@' + MATHLIVE_VERSION + '/mathlive.min.js',
    'https://unpkg.com/mathlive@' + MATHLIVE_VERSION + '/mathlive.min.js'
  ];
  var FONTS_DIR = 'https://cdn.jsdelivr.net/npm/mathlive@' + MATHLIVE_VERSION + '/fonts/';

  var _readyPromise = null;

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

  function customElementReady() {
    return !!(window.MathLive && window.customElements && window.customElements.get('math-field'));
  }

  function ensureMathLive() {
    if (customElementReady()) return Promise.resolve(window.MathLive);
    if (_readyPromise) return _readyPromise;
    _readyPromise = loadScriptChain(MATHLIVE_URLS, function () { return !!window.MathLive; })
      .then(function () {
        // Point the renderer at the CDN fonts; silence keypress sounds (avoids
        // extra requests + is quieter in a classroom). Both are static config
        // on the element class, safe to set once.
        try {
          var El = window.MathfieldElement || (window.MathLive && window.MathLive.MathfieldElement);
          if (El) { El.fontsDirectory = FONTS_DIR; El.soundsDirectory = null; }
        } catch (_) {}
        // The custom element may register a tick after the script's onload.
        return new Promise(function (resolve) {
          var deadline = Date.now() + 5000;
          (function poll() {
            if (customElementReady()) { resolve(window.MathLive); return; }
            if (Date.now() > deadline) { resolve(window.MathLive || null); return; }
            setTimeout(poll, 60);
          })();
        });
      })
      .catch(function (e) { _readyPromise = null; throw e; });
    return _readyPromise;
  }

  // Minimal, framework-agnostic modal (vanilla DOM, appended to <body> so it
  // sits above any React overlay). Escape / Cancel / backdrop → resolve(null).
  function buildModal(ML, opts, resolve) {
    var settled = false;
    var done = function (val) { if (settled) return; settled = true; cleanup(); resolve(val); };

    var backdrop = document.createElement('div');
    backdrop.setAttribute('role', 'presentation');
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;';

    var panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', (opts && opts.title) || 'Insert an equation');
    panel.style.cssText = 'background:#fff;color:#0f172a;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.35);width:min(640px,100%);max-height:90vh;overflow:auto;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;';

    var head = document.createElement('div');
    head.style.cssText = 'padding:14px 16px 6px;font-size:15px;font-weight:700;';
    head.textContent = (opts && opts.title) || '∑  Insert an equation';
    panel.appendChild(head);

    var hint = document.createElement('div');
    hint.style.cssText = 'padding:0 16px 8px;font-size:12px;color:#64748b;line-height:1.4;';
    hint.textContent = 'Type math naturally (e.g. x^2, \\frac, sqrt) or tap the on-screen keyboard. It will be inserted as accessible math — a screen reader can read it and it exports to braille.';
    panel.appendChild(hint);

    var field = document.createElement('math-field');
    field.setAttribute('aria-label', 'Equation editor');
    field.style.cssText = 'display:block;margin:4px 16px 12px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:22px;min-height:56px;';
    try { field.mathVirtualKeyboardPolicy = 'onfocus'; } catch (_) {}
    if (opts && opts.initialLatex) { try { field.value = String(opts.initialLatex); } catch (_) {} }
    panel.appendChild(field);

    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:8px 16px 16px;';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;font-weight:600;font-size:13px;cursor:pointer;';
    var insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.textContent = 'Insert equation';
    insertBtn.style.cssText = 'padding:8px 14px;border-radius:8px;border:none;background:#4f46e5;color:#fff;font-weight:700;font-size:13px;cursor:pointer;';
    footer.appendChild(cancelBtn);
    footer.appendChild(insertBtn);
    panel.appendChild(footer);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    function commit() {
      var latex = '';
      try { latex = field.getValue ? field.getValue('latex') : (field.value || ''); } catch (_) { latex = field.value || ''; }
      latex = String(latex || '').trim();
      if (!latex) { done(null); return; }
      var mathml = '';
      var spoken = '';
      try { mathml = field.getValue ? field.getValue('math-ml') : ''; } catch (_) {}
      if (!mathml && ML && ML.convertLatexToMathMl) { try { mathml = ML.convertLatexToMathMl(latex); } catch (_) {} }
      try { spoken = field.getValue ? field.getValue('spoken') : ''; } catch (_) {}
      if (!spoken && ML && ML.convertLatexToSpeakableText) { try { spoken = ML.convertLatexToSpeakableText(latex); } catch (_) {} }
      done({ latex: latex, mathml: String(mathml || ''), spoken: String(spoken || '').trim() });
    }

    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); done(null); } }
    function cleanup() {
      document.removeEventListener('keydown', onKey, true);
      try { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); } catch (_) {}
      // Dismiss the virtual keyboard if MathLive left it up.
      try { if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.hide(); } catch (_) {}
    }

    cancelBtn.addEventListener('click', function () { done(null); });
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) done(null); });
    insertBtn.addEventListener('click', commit);
    field.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    document.addEventListener('keydown', onKey, true);
    setTimeout(function () { try { field.focus(); } catch (_) {} }, 30);
  }

  window.AlloMathInput = {
    ready: customElementReady,
    /**
     * Open the equation editor. Resolves to { latex, mathml, spoken } on Insert,
     * or NULL on cancel / load failure. Never throws.
     */
    promptEquation: function (opts) {
      return ensureMathLive().then(function (ML) {
        if (!ML || !customElementReady()) return null;
        return new Promise(function (resolve) { buildModal(ML, opts || {}, resolve); });
      }).catch(function () { return null; });
    }
  };

  console.log('[AlloMathInput] mathlive_loader.js ready — window.AlloMathInput.promptEquation() (lazy MathLive editor)');
})();

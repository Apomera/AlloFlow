// Speech setup: one place to choose how speech becomes text, download the on-device
// model, and test the microphone. Opened by 'alloflow:open-speech-setup' or
// 'alloflow:speech-setup-needed'; the host owns the open state and focus trap.
var TIER_SIZES_MB = { tiny: 39, base: 73, small: 238 };
var TIERS = ['tiny', 'base', 'small'];
var TEST_SECONDS = 8;
var MB = 1024 * 1024;
var _SS_HAS_OWN = Object.prototype.hasOwnProperty;
function _ssIsBlockedKey(k) { return k === '__proto__' || k === 'constructor' || k === 'prototype'; }
function _ssIsGlobalMuted() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.__alloGlobalMuted === true || window._alloGlobalMute === true) return true;
    if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted() === true) return true;
  } catch (_) {}
  return false;
}
function _ssHardAiPolicyBlocked() {
  if (typeof window === 'undefined') return true;
  try {
    if (window.__alloStudentAiDisabled === true || window.__alloOfflineOnly === true || window.__alloAiSecretsLocked === true || window._alloQrBlocked === true) return true;
    var qr = window.__alloQrStudentMode;
    if (qr === true || (qr && typeof qr === 'object' && (qr.aiDisabled === true || qr.aiPolicy === 'off'))) return true;
    var mp = window.ALLOFLOW_MANAGED_AI_POLICY;
    if (mp && typeof mp === 'object') {
      if (mp.enabled === false || mp.disabled === true || mp.allowAi === false) return true;
      if (Array.isArray(mp.allowedBackends) && mp.allowedBackends.length === 0) return true;
      if (Array.isArray(mp.connections) && mp.connections.length === 0) return true;
    }
    var sp = (window.AlloModules && window.AlloModules.StudentPolicy) || window.StudentPolicy;
    if (sp && typeof sp === 'object') {
      if (sp.disabled === true || sp.aiDisabled === true || sp.allowAi === false || sp.aiEnabled === false) return true;
      if (typeof sp.isAiBlocked === 'function' && sp.isAiBlocked()) return true;
    }
  } catch (_) {
    return true;
  }
  return false;
}
var _SS_CRISIS_RE = /\b(?:kill\s+my\s*self|end\s+my\s+life|want\s+to\s+die|commit\s+suicide|suicidal|hurt\s+myself|harm\s+myself|self[\s-]?harm|cut\s+myself|overdose\s+on|shoot\s+myself|hang\s+myself)\b/i;
var _SS_CRISIS_MSG = 'It sounds like you or someone you know may be going through a difficult time. Please pause and talk with a trusted adult right away. You can call or text 988 (Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in an emergency.';
function _ssScreenCrisis(text) {
  var s = String(text || '').trim();
  if (!s) return null;
  try {
    var checker = typeof window !== 'undefined' && ((window.__alloShared && window.__alloShared.SafetyContentChecker) || window.SafetyContentChecker || (window.AlloModules && window.AlloModules.SafetyContentChecker));
    if (checker && typeof checker.check === 'function') {
      var res = checker.check(s);
      if (Array.isArray(res) && res.some(function(f) { return f && (f.category === 'self_harm' || f.severity === 'crisis'); })) return { blocked: true, message: _SS_CRISIS_MSG };
      if (res && typeof res === 'object' && (res.severity === 'crisis' || res.category === 'self_harm' || res.crisis === true || res.blocked === true)) return { blocked: true, message: _SS_CRISIS_MSG };
    }
  } catch (_) {}
  if (_SS_CRISIS_RE.test(s)) return { blocked: true, message: _SS_CRISIS_MSG };
  return null;
}

function fillText(text, params) {
  var out = String(text == null ? '' : text);
  Object.keys(params || {}).forEach(function(name) {
    out = out.split('{' + name + '}').join(String(params[name]));
  });
  return out;
}
function say(translated, fallback, params) {
  var usable = translated && !/^speech_setup\./.test(String(translated));
  return fillText(usable ? translated : fallback, params);
}
// Files report separately and appear one at a time, so measure against the known
// download size. Otherwise the bar jumps backwards as each new file starts.
function downloadSummary(files, expectedMb) {
  var loaded = Object.keys(files || {}).reduce(function(sum, name) {
    return sum + (Number(files[name] && files[name].loaded) || 0);
  }, 0);
  var loadedMb = Math.round(loaded / MB);
  var cap = Math.max(1, Number(expectedMb) || 1);
  return { loadedMb: Math.min(loadedMb, cap), percent: Math.min(99, Math.floor((loaded / MB / cap) * 100)) };
}
function classifyDownloadError(error) {
  var text = String((error && (error.name + ' ' + error.message)) || '');
  if (/abort|superseded/i.test(text)) return 'ignore';
  if (/quota|storage|disk/i.test(text)) return 'storage';
  return 'network';
}
function classifyMicError(error) {
  var name = String((error && error.name) || '');
  if (name === 'AbortError') return 'ignore';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'blocked';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'missing';
  if (name === 'NotReadableError') return 'busy';
  return 'failed';
}
function summaryKind(choice, modelReady) {
  if (!choice) return 'loading';
  if (choice.requested === 'off') return 'off';
  if (choice.resolved === 'desktop-whisper') return 'desktop';
  if (choice.resolved === 'whisper' && choice.supported && modelReady) return 'ready';
  if (choice.resolved === 'whisper' && !(choice.capabilities && choice.capabilities.getUserMedia)) return 'unavailable';
  if (choice.resolved === 'whisper') return 'needs-model';
  if (choice.resolved === 'webspeech' && choice.supported) return 'browser';
  if (choice.resolved === 'gemini' && choice.supported) return 'gemini';
  return 'unavailable';
}

var SPEECH_SETUP_CSS = [
  '.allo-ss-backdrop{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.72)}',
  '.allo-ss{--ss-bg:#fff;--ss-text:#0f172a;--ss-soft:#475569;--ss-line:#cbd5e1;--ss-tint:#f1f5f9;--ss-accent:#3730a3;--ss-on-accent:#fff;--ss-good:#166534;--ss-warn:#92400e;box-sizing:border-box;width:100%;max-width:560px;max-height:100%;overflow-y:auto;border-radius:14px;padding:20px;background:var(--ss-bg);color:var(--ss-text);font-size:14px;line-height:1.5;box-shadow:0 20px 50px rgba(0,0,0,.4)}',
  '.allo-ss--dark{--ss-bg:#0f172a;--ss-text:#f1f5f9;--ss-soft:#cbd5e1;--ss-line:#475569;--ss-tint:#1e293b;--ss-accent:#a5b4fc;--ss-on-accent:#0f172a;--ss-good:#86efac;--ss-warn:#fcd34d}',
  '.allo-ss--contrast{--ss-bg:#000;--ss-text:#fff;--ss-soft:#fff;--ss-line:#fff;--ss-tint:#000;--ss-accent:#fde047;--ss-on-accent:#000;--ss-good:#fde047;--ss-warn:#fde047;border:2px solid #fff}',
  '.allo-ss *{box-sizing:border-box}',
  '.allo-ss:focus-visible{outline:3px solid var(--ss-accent);outline-offset:2px}',
  '.allo-ss-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
  '.allo-ss-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border:1px solid var(--ss-line);border-radius:999px;background:var(--ss-tint);color:var(--ss-text);font-size:12px;font-weight:700}',
  '.allo-ss-pill[data-tone="good"]{border-color:var(--ss-good);color:var(--ss-good)}',
  '.allo-ss-pill[data-tone="warn"]{border-color:var(--ss-warn);color:var(--ss-warn)}',
  '.allo-ss-heard-row{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px}',
  '.allo-ss h2{margin:0;font-size:20px;font-weight:800;color:inherit}',
  '.allo-ss h3{margin:0 0 8px;font-size:15px;font-weight:800;color:inherit}',
  '.allo-ss p{margin:0;color:inherit}',
  '.allo-ss-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}',
  '.allo-ss-section{border:0;border-top:1px solid var(--ss-line);margin:16px 0 0;padding:14px 0 0;min-width:0}',
  '.allo-ss-section legend{float:left;width:100%;padding:0;margin:0 0 8px;font-size:15px;font-weight:800}',
  '.allo-ss-section legend + *{clear:both}',
  '.allo-ss-soft{color:var(--ss-soft);font-size:13px}',
  '.allo-ss-banner{border:1px solid var(--ss-line);border-left:5px solid var(--ss-accent);border-radius:8px;padding:10px 12px;background:var(--ss-tint);font-weight:650}',
  '.allo-ss-banner[data-kind="ready"],.allo-ss-banner[data-kind="desktop"]{border-left-color:var(--ss-good)}',
  '.allo-ss-banner[data-kind="browser"],.allo-ss-banner[data-kind="needs-model"],.allo-ss-banner[data-kind="unavailable"]{border-left-color:var(--ss-warn)}',
  '.allo-ss-note{margin-top:8px;border-radius:8px;padding:8px 10px;background:var(--ss-tint);font-size:13px}',
  '.allo-ss-error{margin-top:8px;font-size:13px;font-weight:650;color:var(--ss-warn)}',
  '.allo-ss-option{display:flex;gap:10px;align-items:flex-start;min-height:44px;padding:8px 10px;margin-top:6px;border:1px solid var(--ss-line);border-radius:8px;cursor:pointer}',
  '.allo-ss-option[data-selected="true"]{border-color:var(--ss-accent);box-shadow:inset 0 0 0 1px var(--ss-accent)}',
  '.allo-ss-option[data-disabled="true"]{cursor:not-allowed}',
  '.allo-ss-option input{margin:3px 0 0;flex:none;width:16px;height:16px;accent-color:var(--ss-accent)}',
  '.allo-ss-option strong{display:block;font-weight:750}',
  '.allo-ss-option span{display:block;color:var(--ss-soft);font-size:13px}',
  '.allo-ss-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--ss-line)}',
  '.allo-ss-row:last-of-type{border-bottom:0}',
  '.allo-ss-ok{font-weight:750;color:var(--ss-good)}',
  '.allo-ss-tag{display:inline-block;margin-left:6px;padding:0 6px;border:1px solid var(--ss-line);border-radius:999px;font-size:12px;font-weight:650}',
  '.allo-ss-button{min-height:44px;min-width:44px;padding:6px 14px;border:1px solid var(--ss-accent);border-radius:8px;background:var(--ss-accent);color:var(--ss-on-accent);font:inherit;font-weight:750;cursor:pointer}',
  '.allo-ss-button[data-quiet="true"]{background:transparent;color:var(--ss-text);border-color:var(--ss-line)}',
  '.allo-ss-button:disabled{cursor:not-allowed;opacity:.65}',
  '.allo-ss-close{min-width:44px;min-height:44px;border:1px solid var(--ss-line);border-radius:8px;background:transparent;color:var(--ss-text);font-size:20px;line-height:1;cursor:pointer}',
  '.allo-ss button:focus-visible,.allo-ss input:focus-visible{outline:3px solid var(--ss-accent);outline-offset:2px}',
  '.allo-ss-track{height:10px;margin-top:6px;border:1px solid var(--ss-line);border-radius:999px;background:var(--ss-tint);overflow:hidden}',
  '.allo-ss-fill{height:100%;background:var(--ss-accent)}',
  '.allo-ss-quote{margin:8px 0;padding:8px 10px;border-left:3px solid var(--ss-line);font-style:italic}',
  '.allo-ss-heard{margin-top:8px;padding:8px 10px;border:1px solid var(--ss-line);border-radius:8px;background:var(--ss-tint)}',
  '.allo-ss-foot{display:flex;justify-content:flex-end;margin-top:16px}',
  '@media (prefers-reduced-motion: reduce){.allo-ss,.allo-ss *{transition:none!important;animation:none!important}}',
  '@media (forced-colors: active){.allo-ss-fill{background:Highlight}.allo-ss-button{border:1px solid ButtonText}}'
].join('');

var EMPTY_LANG_CONTEXT = typeof React !== 'undefined' && typeof React.createContext === 'function' ? React.createContext(null) : null;

function SpeechSetupPanel(props) {
  props = props && typeof props === 'object' ? props : {};
  var t = props.t || function() { return ''; };
  var onClose = props.onClose || function() {};
  var theme = props.theme === 'dark' || props.theme === 'contrast' ? props.theme : 'light';
  var voiceNow = function() { return (typeof window !== 'undefined' && window.AlloFlowVoice) || null; };
  var V = voiceNow();
  var activeLangCtx = (typeof window !== 'undefined' && window.AlloLanguageContext) || EMPTY_LANG_CONTEXT;
  var languageContext = (activeLangCtx && typeof React.useContext === 'function' ? React.useContext(activeLangCtx) : null) || {};
  var backdropDownRef = React.useRef(false);
  var uiLanguageTag = '';
  try {
    if (languageContext.currentUiLanguage && typeof window !== 'undefined' && window.AlloFlowLang && typeof window.AlloFlowLang.bcp47Full === 'function') {
      uiLanguageTag = window.AlloFlowLang.bcp47Full(languageContext.currentUiLanguage) || '';
    }
  } catch (_) {}
  var loadedPref = (V && typeof V.loadPreference === 'function' ? V.loadPreference() : null) || {};
  var lang = props.lang || uiLanguageTag || loadedPref.lang || 'en-US';

  var dialogRef = React.useRef(null);
  var checkRef = React.useRef(null);
  var filesRef = React.useRef(Object.create(null));
  var checkPhaseRef = React.useRef('idle');
  var mountedRef = React.useRef(true);
  var onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  var _engine = React.useState(function() { return loadedPref.engine || 'auto'; });
  var engine = _engine[0]; var setEngine = _engine[1];
  var _tier = React.useState(function() { return loadedPref.whisperTier || 'tiny'; });
  var tier = _tier[0]; var setTier = _tier[1];
  var _status = React.useState(null);
  var modelStatus = _status[0]; var setModelStatus = _status[1];
  var _download = React.useState(null);
  var download = _download[0]; var setDownload = _download[1];
  var _downloadError = React.useState('');
  var downloadError = _downloadError[0]; var setDownloadError = _downloadError[1];
  var _freeMb = React.useState(null);
  var freeMb = _freeMb[0]; var setFreeMb = _freeMb[1];
  var _note = React.useState('');
  var engineNote = _note[0]; var setEngineNote = _note[1];
  var _check = React.useState({ phase: 'idle', level: 0, report: null, error: '', stoppedOther: false });
  var check = _check[0]; var setCheck = _check[1];
  var _revision = React.useState(0);
  var bump = _revision[1];
  var _copied = React.useState(false);
  var copiedTranscript = _copied[0]; var setCopiedTranscript = _copied[1];
  var copyTimerRef = React.useRef(null);

  function refreshModelStatus() {
    var voice = voiceNow();
    if (!voice || typeof voice.getWhisperModelStatus !== 'function') return Promise.resolve();
    return voice.getWhisperModelStatus().then(function(status) {
      if (mountedRef.current) { setModelStatus(status); bump(function(n) { return n + 1; }); }
    }).catch(function() {});
  }

  React.useEffect(function() {
    mountedRef.current = true;
    var previousFocus = typeof document !== 'undefined' ? document.activeElement : null;
    var dialog = dialogRef.current;
    var isolatedSiblings = [];
    var liveSel = '[aria-live], [role="status"], [role="alert"], [role="log"], [data-toast-region]';
    if (dialog && typeof document !== 'undefined' && document.body) {
      var node = dialog;
      while (node && node.parentElement && node !== document.body) {
        var parent = node.parentElement;
        Array.prototype.slice.call(parent.children).forEach(function(sibling) {
          if (sibling === node || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName) || (typeof sibling.matches === 'function' && sibling.matches(liveSel)) || (typeof sibling.querySelector === 'function' && sibling.querySelector(liveSel))) return;
          isolatedSiblings.push({
            el: sibling,
            hadInert: sibling.hasAttribute('inert'),
            prevAriaHidden: sibling.getAttribute('aria-hidden')
          });
          sibling.inert = true;
          sibling.setAttribute('inert', '');
          sibling.setAttribute('aria-hidden', 'true');
        });
        node = parent;
      }
    }
    var alloScrollLock = typeof window !== 'undefined' ? (window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, overflow: '' })) : null;
    var alloScrollLocked = !!(alloScrollLock && typeof document !== 'undefined' && document.body);
    if (alloScrollLocked && ++alloScrollLock.count === 1) {
      alloScrollLock.overflow = document.body.style.overflow;
      alloScrollLock.prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    var stack = typeof window !== 'undefined'
      ? (window.__alloFocusTrapStack = window.__alloFocusTrapStack || [])
      : null;
    var trap = { root: dialog };
    if (stack) stack.push(trap);
    var isTopTrap = function() {
      if (!stack || !stack.length) return true;
      var top = stack[stack.length - 1];
      return top === trap || Boolean(top && top.root && dialog && dialog.contains(top.root) && top.root === dialog);
    };
    var getFocusables = function(d) {
      if (!d || typeof d.querySelectorAll !== 'function') return [];
      return Array.prototype.slice.call(
        d.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter(function(el) {
        if (!el || el.disabled || el.hidden || el.closest('[hidden], [inert], [aria-hidden="true"]') || el.getAttribute('aria-hidden') === 'true') return false;
        if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
          for (var cur = el; cur && cur !== d.parentElement; cur = cur.parentElement) {
            var cs = window.getComputedStyle(cur);
            if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
            if (cur === d) break;
          }
        }
        return true;
      });
    };
    var focusTimer = setTimeout(function() {
      var d = dialogRef.current;
      if (!d) return;
      if (d.contains(document.activeElement) && document.activeElement !== d) return;
      var focusables = getFocusables(d);
      var preferred = focusables.find(function(el) { return el.getAttribute && el.getAttribute('data-autofocus') === 'true'; });
      var firstFocusable = preferred || focusables[0];
      try {
        if (firstFocusable && typeof firstFocusable.focus === 'function') firstFocusable.focus();
        else d.focus();
      } catch (_) {}
    }, 0);
    var onDocKeyDown = function(event) {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || !isTopTrap()) return;
      var d = dialogRef.current;
      if (!d) return;
      if (event.key === 'Escape') {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof onCloseRef.current === 'function') onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusables = getFocusables(d);
      if (!focusables.length) {
        event.preventDefault();
        try { d.focus(); } catch (_) {}
        return;
      }
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === d || !d.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !d.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('keydown', onDocKeyDown);
    if (dialog) { try { dialog.focus(); } catch (_) {} }
    refreshModelStatus();
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
        navigator.storage.estimate().then(function(estimate) {
          if (mountedRef.current && estimate && estimate.quota) setFreeMb(Math.round((estimate.quota - (estimate.usage || 0)) / MB));
        }).catch(function() {});
      }
    } catch (_) {}
    var syncEngine = function(event) {
      var next = event && event.detail && event.detail.engine;
      if (next) setEngine(next);
    };
    var onModules = function() { bump(function(n) { return n + 1; }); };
    if (typeof window !== 'undefined') {
      window.addEventListener('alloflow:voice-engine-changed', syncEngine);
      window.addEventListener('alloflow:module-registry-changed', onModules);
    }
    var voice = voiceNow();
    var unsubscribe = voice && typeof voice.subscribeToVoiceProgress === 'function'
      ? voice.subscribeToVoiceProgress(function(progress) {
          if (!progress || !mountedRef.current || checkPhaseRef.current !== 'idle') return;
          if (progress.phase === 'model-fetch-progress') {
            if (progress.file && !_ssIsBlockedKey(progress.file) && typeof progress.loaded === 'number') filesRef.current[progress.file] = { loaded: progress.loaded };
            var tierMb = _SS_HAS_OWN.call(TIER_SIZES_MB, progress.tier) ? TIER_SIZES_MB[progress.tier] : 0;
            var summary = downloadSummary(filesRef.current, tierMb);
            setDownload({ tier: progress.tier, key: progress.profile, percent: summary.percent, loadedMb: summary.loadedMb });
          } else if (progress.phase === 'model-loaded') {
            filesRef.current = Object.create(null);
            setDownload(null);
            setDownloadError('');
            refreshModelStatus();
          } else if (progress.phase === 'model-error') {
            filesRef.current = Object.create(null);
            setDownload(null);
            var kind = classifyDownloadError(progress.error);
            if (kind !== 'ignore') setDownloadError(kind);
            refreshModelStatus();
          }
        })
      : function() {};
    return function() {
      mountedRef.current = false;
      clearTimeout(focusTimer);
      if (typeof document !== 'undefined') document.removeEventListener('keydown', onDocKeyDown);
      if (alloScrollLocked) {
        alloScrollLock.count = Math.max(0, alloScrollLock.count - 1);
        if (alloScrollLock.count === 0 && typeof document !== 'undefined' && document.body) {
          document.body.style.overflow = (alloScrollLock.overflow != null ? alloScrollLock.overflow : (alloScrollLock.prev || ''));
        }
      }
      isolatedSiblings.forEach(function(entry) {
        if (!entry.hadInert) {
          entry.el.inert = false;
          entry.el.removeAttribute('inert');
        }
        if (entry.prevAriaHidden === null) entry.el.removeAttribute('aria-hidden');
        else if (entry.prevAriaHidden !== 'true') entry.el.setAttribute('aria-hidden', entry.prevAriaHidden);
      });
      var wasTop = isTopTrap();
      if (stack) {
        var idx = stack.lastIndexOf(trap);
        if (idx >= 0) stack.splice(idx, 1);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('alloflow:voice-engine-changed', syncEngine);
        window.removeEventListener('alloflow:module-registry-changed', onModules);
      }
      try { unsubscribe(); } catch (_) {}
      // Closing stops the microphone. A download keeps going, and reopening shows it.
      if (checkRef.current) { try { checkRef.current.cancel(); } catch (_) {} checkRef.current = null; }
      if (copyTimerRef.current) { clearTimeout(copyTimerRef.current); copyTimerRef.current = null; }
      try {
        if (wasTop && previousFocus && previousFocus.isConnected && previousFocus !== document.body && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
      } catch (_) {}
    };
  }, []);

  if (!V) {
    return <div className="allo-ss-backdrop" role="presentation" onMouseDown={function(e) { backdropDownRef.current = (e.target === e.currentTarget); }} onClick={function(e) { var allow = backdropDownRef.current; backdropDownRef.current = false; if (allow && e.target === e.currentTarget) onClose(); }}>
      <style>{SPEECH_SETUP_CSS}</style>
      <div className={'allo-ss allo-ss--' + theme} role="dialog" aria-modal="true" aria-labelledby="allo-ss-title" tabIndex={-1} ref={dialogRef} onClick={function(e) { e.stopPropagation(); }}>
        <div className="allo-ss-head">
          <h2 id="allo-ss-title">{say(t('speech_setup.title'), 'Speech setup')}</h2>
          <button type="button" className="allo-ss-close" onClick={onClose} aria-label={say(t('speech_setup.close'), 'Close speech setup')}>&times;</button>
        </div>
        <p role="status">{say(t('speech_setup.still_loading'), 'Voice tools are still loading. Try again in a moment.')}</p>
      </div>
    </div>;
  }

  var caps = V.getCapabilities();
  var localOnly = typeof V.isLocalSpeechOnly === 'function' && V.isLocalSpeechOnly();
  var iosCanvas = typeof V.isIosCanvasVoiceSurface === 'function' && V.isIosCanvasVoiceSurface();
  var profile = V.resolveWhisperProfile(lang, tier);
  var languageKey = profile.supported ? profile.key : null;
  var shownEngine = engine === 'webspeech' && localOnly ? 'auto' : engine;
  var geminiAudioAllowed = checkDictationAiAudioAllowed(undefined, V);
  var gatedGeminiAudio = geminiAudioAllowed && typeof window !== 'undefined' ? window.callGeminiAudio : null;
  var geminiCapability = geminiAudioAllowed
    ? V.getGeminiAudioCapability({ callGeminiAudio: gatedGeminiAudio })
    : { available: false, reason: 'policy-blocked' };
  var choice = V.resolveHandsFreeEngine({ engine: shownEngine, lang: lang, callGeminiAudio: gatedGeminiAudio });
  var testTier = typeof V.preparedWhisperTier === 'function' ? V.preparedWhisperTier(tier, lang) : null;
  var canUseOnDevice = !iosCanvas && !caps.desktopWhisper && caps.getUserMedia && caps.audioContext && caps.dynamicImport;
  var kind = summaryKind(choice, !!testTier);
  var tierLabels = {
    tiny: say(t('speech_setup.tier_tiny'), 'Tiny'),
    base: say(t('speech_setup.tier_base'), 'Base'),
    small: say(t('speech_setup.tier_small'), 'Small')
  };
  var summaryText = {
    loading: say(t('speech_setup.summary_loading'), 'Checking this device.'),
    off: say(t('speech_setup.summary_off'), 'Voice input is off.'),
    desktop: say(t('speech_setup.summary_desktop'), 'Ready. The desktop app turns speech into text on this device.'),
    ready: say(t('speech_setup.summary_ready'), 'Ready. Your voice stays on this device.'),
    'needs-model': say(t('speech_setup.summary_needs_model'), 'Not ready yet. Download a speech model below.'),
    browser: say(t('speech_setup.summary_browser'), 'Using your browser\'s speech service. Your voice may leave this device.'),
    gemini: say(t('speech_setup.summary_gemini'), 'Using Gemini. Each spoken turn is sent to Gemini.'),
    unavailable: choice.reason || say(t('speech_setup.summary_unavailable'), 'Voice input is not available on this device.')
  }[kind];

  var engineOptions = [
    { id: 'auto', label: say(t('speech_setup.engine_auto'), 'Automatic'), help: localOnly
      ? say(t('speech_setup.engine_auto_local_help'), 'Uses the on-device model after you download it. Your voice stays on this device.')
      : say(t('speech_setup.engine_auto_help'), 'Uses the on-device model if it is downloaded. If not, it uses your browser\'s speech service, which may send your voice off this device.') },
    { id: 'whisper', label: say(t('speech_setup.engine_whisper'), 'On this device'), help: say(t('speech_setup.engine_whisper_help'), 'Your voice stays on this device. Needs a one-time download.') },
    { id: 'webspeech', hidden: localOnly, label: say(t('speech_setup.engine_browser'), 'Browser speech service'), help: say(t('speech_setup.engine_browser_help'), 'Your browser may send your voice to its maker. In Chrome, that is Google\'s speech service, which a school\'s Google agreement may not cover.') },
    { id: 'gemini', disabled: !geminiCapability.available && engine !== 'gemini', label: say(t('speech_setup.engine_gemini'), 'Gemini'), help: geminiCapability.available
      ? say(t('speech_setup.engine_gemini_help'), 'Each spoken turn is sent to Gemini to turn into text.')
      : say(t('speech_setup.engine_gemini_off_help'), 'Not available here. It needs a Gemini key in AI settings.') },
    { id: 'off', label: say(t('speech_setup.engine_off'), 'Off'), help: say(t('speech_setup.engine_off_help'), 'The microphone stays off. Typing still works.') }
  ].filter(function(option) { return !option.hidden; });

  function chooseEngine(next) {
    V.setVoiceEngine(next);
    setEngine(next);
    var loop = typeof window !== 'undefined' ? window.__alloVoiceLoop : null;
    var listening = !!(loop && loop.isActive && loop.isActive());
    if (next === 'off') {
      if (typeof V.stopActiveVoiceSession === 'function') V.stopActiveVoiceSession('voice-input-off');
      setEngineNote('');
    } else {
      setEngineNote(listening ? say(t('speech_setup.applies_next_start'), 'This change applies the next time listening starts.') : '');
    }
  }
  function chooseTier(next) {
    setTier(next);
    setDownloadError('');
    if (V.isWhisperPrepared(next, { lang: lang })) V.savePreference({ whisperTier: next });
    bump(function(n) { return n + 1; });
  }
  function startDownload(key) {
    setDownloadError('');
    filesRef.current = Object.create(null);
    setDownload({ tier: tier, key: key, percent: 0, loadedMb: 0 });
    var targetLang = key === 'english' ? 'en-US' : (languageKey === 'multilingual' ? lang : 'es');
    V.preloadWhisper(tier, { lang: targetLang }).catch(function() {});
  }
  function startCheck() {
    if (checkRef.current || checkPhaseRef.current !== 'idle' || typeof V.startMicrophoneCheck !== 'function') return;
    var status = typeof V.getActiveVoiceSessionStatus === 'function' ? V.getActiveVoiceSessionStatus() : null;
    var stoppedOther = !!(status && status.state && status.state !== 'idle' && status.owner);
    checkPhaseRef.current = 'starting';
    setCheck({ phase: 'starting', level: 0, report: null, error: '', stoppedOther: stoppedOther });
    var run = null;
    run = V.startMicrophoneCheck({
      seconds: TEST_SECONDS,
      lang: lang,
      tier: canUseOnDevice && profile.supported ? testTier : null,
      onLevel: function(level) {
        if (checkRef.current !== run || !mountedRef.current) return;
        var safeLevel = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
        setCheck(function(previous) { return Object.assign({}, previous, { level: safeLevel }); });
      },
      onPhase: function(phase) {
        if (checkRef.current !== run) return;
        checkPhaseRef.current = phase;
        if (mountedRef.current) setCheck(function(previous) { return Object.assign({}, previous, { phase: phase, level: phase === 'listening' ? previous.level : 0 }); });
      }
    });
    checkRef.current = run;
    if (!run || !run.promise || typeof run.promise.then !== 'function') {
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      return;
    }
    run.promise.then(function(report) {
      if (checkRef.current !== run) return;
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      if (!mountedRef.current) return;
      setCheck({ phase: 'done', level: 0, report: report, error: '', stoppedOther: stoppedOther });
      bump(function(n) { return n + 1; });
    }, function(error) {
      if (checkRef.current !== run) return;
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      if (!mountedRef.current) return;
      var errorKind = classifyMicError(error);
      setCheck({ phase: 'idle', level: 0, report: null, error: errorKind === 'ignore' ? '' : errorKind, stoppedOther: false });
    });
  }
  function stopCheck() {
    if (checkRef.current) { try { checkRef.current.cancel(); } catch (_) {} }
  }
  function copyTestTranscript(text) {
    var value = String(text || '').trim();
    if (!value) return;
    var markCopied = function() {
      if (!mountedRef.current) return;
      setCopiedTranscript(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(function() {
        copyTimerRef.current = null;
        if (mountedRef.current) setCopiedTranscript(false);
      }, 2200);
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(value).then(markCopied, function() {
        try {
          var ta = document.createElement('textarea');
          ta.value = value;
          ta.setAttribute('readonly', '');
          ta.setAttribute('aria-hidden', 'true');
          ta.setAttribute('aria-label', 'Clipboard copy helper');
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          markCopied();
        } catch (_) {}
      });
      return;
    }
    try {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.setAttribute('aria-hidden', 'true');
      ta.setAttribute('aria-label', 'Clipboard copy helper');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      markCopied();
    } catch (_) {}
  }

  var testBusy = check.phase === 'starting' || check.phase === 'listening' || check.phase === 'transcribing';
  var report = check.report;
  var assessment = report && report.assessment;
  var speeds = V.loadPreference().whisperSpeedByModel || {};
  var downloading = !!download;
  var tierSize = TIER_SIZES_MB[tier];
  var lowStorage = freeMb != null && freeMb < tierSize * 1.5;
  var selectedEngineOption = engineOptions.filter(function(o) { return o.id === shownEngine; })[0] || engineOptions[0] || null;
  var statusPillTone = (kind === 'ready' || kind === 'desktop') ? 'good' : ((kind === 'needs-model' || kind === 'unavailable') ? 'warn' : 'neutral');

  function renderModelRow(key, label) {
    var ready = !!(modelStatus && modelStatus[tier] && modelStatus[tier][key]);
    var active = download && download.tier === tier && download.key === key;
    return <div className="allo-ss-row" key={key}>
      <div>
        <span>{label}</span>
        {languageKey === key && <span className="allo-ss-tag">{say(t('speech_setup.your_language'), 'Your language')}</span>}
      </div>
      {ready
        ? <span className="allo-ss-ok">{say(t('speech_setup.downloaded'), '✓ Downloaded')}</span>
        : <button type="button" className="allo-ss-button" disabled={downloading} aria-busy={active ? 'true' : undefined} onClick={function() { startDownload(key); }}>
            {active
              ? say(t('speech_setup.downloading'), 'Downloading…')
              : say(t('speech_setup.download_size'), 'Download ({size} MB)', { size: tierSize })}
          </button>}
    </div>;
  }

  return <div className="allo-ss-backdrop" role="presentation" onMouseDown={function(e) { backdropDownRef.current = (e.target === e.currentTarget); }} onClick={function(e) { var allow = backdropDownRef.current; backdropDownRef.current = false; if (allow && e.target === e.currentTarget) onClose(); }}>
    <style>{SPEECH_SETUP_CSS}</style>
    <div className={'allo-ss allo-ss--' + theme} role="dialog" aria-modal="true" aria-labelledby="allo-ss-title" aria-describedby="allo-ss-summary" tabIndex={-1} ref={dialogRef} data-testid="speech-setup-panel" onClick={function(e) { e.stopPropagation(); }}>
      <div className="allo-ss-head">
        <h2 id="allo-ss-title">{say(t('speech_setup.title'), 'Speech setup')}</h2>
        <button type="button" className="allo-ss-close" onClick={onClose} aria-label={say(t('speech_setup.close'), 'Close speech setup')}>&times;</button>
      </div>
      <p id="allo-ss-summary" className="allo-ss-banner" data-kind={kind} role="status">{summaryText}</p>
      <div className="allo-ss-pills" data-testid="speech-setup-status-strip">
        {selectedEngineOption && <span className="allo-ss-pill" data-tone={statusPillTone}>{selectedEngineOption.label}</span>}
        {canUseOnDevice && profile.supported && (
          <span className="allo-ss-pill" data-tone={testTier ? 'good' : 'warn'}>
            {testTier
              ? say(t('speech_setup.downloaded'), '✓ Downloaded') + ': ' + tierLabels[testTier]
              : say(t('speech_setup.tier_line'), '{name} ({size} MB)', { name: tierLabels[tier], size: tierSize })}
          </span>
        )}
        {freeMb != null && <span className="allo-ss-pill" data-tone={lowStorage ? 'warn' : 'neutral'}>{freeMb} MB free</span>}
      </div>
      {props.automatic && <p className="allo-ss-note">{say(t('speech_setup.opened_from_mic'), 'The microphone button needs this setup first. After the download, press it again.')}</p>}
      {kind === 'needs-model' && canUseOnDevice && profile.supported && !downloading && <div style={{ marginTop: '10px' }}>
        <button type="button" className="allo-ss-button" data-testid="speech-setup-quick-download" onClick={function() { startDownload(languageKey); }}>{say(t('speech_setup.quick_download'), 'Download the {name} model ({size} MB)', { name: tierLabels[tier], size: tierSize })}</button>
        <p className="allo-ss-soft" style={{ marginTop: '4px' }}>{say(t('speech_setup.quick_download_note'), 'It only downloads once on this device. You can change the size below.')}</p>
      </div>}
      {download && <div style={{ marginTop: '10px' }}>
        <p className="allo-ss-soft" role="status">{say(t('speech_setup.download_progress'), 'Downloaded {loaded} of {total} MB. You can keep working while this finishes.', { loaded: download.loadedMb, total: TIER_SIZES_MB[download.tier] || 0 })}{' '}({download.percent}%)</p>
        <div className="allo-ss-track" role="progressbar" aria-label={say(t('speech_setup.download_label'), 'Speech model download')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={download.percent}>
          <div className="allo-ss-fill" style={{ width: download.percent + '%' }} />
        </div>
      </div>}
      {downloadError === 'network' && <p className="allo-ss-error" role="alert">{say(t('speech_setup.download_failed_network'), 'The download did not finish. Check the connection. If this is a school network, ask IT to allow huggingface.co, hf.co, and cdn.jsdelivr.net.')}</p>}
      {downloadError === 'storage' && <p className="allo-ss-error" role="alert">{say(t('speech_setup.download_failed_storage'), 'This device ran out of storage for the download. Free some space or choose a smaller size.')}</p>}
      {!profile.supported && <p className="allo-ss-note">{say(t('speech_setup.language_not_supported'), 'The on-device model does not support this language ({language}). Choose another way to enter text.', { language: profile.requestedLanguage })}</p>}

      <fieldset className="allo-ss-section">
        <legend>{say(t('speech_setup.how_heading'), 'How your voice becomes text')}</legend>
        <div>
          {engineOptions.map(function(option) {
            return <label className="allo-ss-option" key={option.id} data-selected={shownEngine === option.id ? 'true' : 'false'} data-disabled={option.disabled ? 'true' : 'false'}>
              <input type="radio" name="allo-ss-engine" value={option.id} checked={shownEngine === option.id} disabled={!!option.disabled} data-autofocus={shownEngine === option.id ? 'true' : undefined} onChange={function() { chooseEngine(option.id); }} />
              <div><strong>{option.label}</strong><span>{option.help}</span></div>
            </label>;
          })}
        </div>
        {engineNote && <p className="allo-ss-note" role="status">{engineNote}</p>}
      </fieldset>

      {caps.desktopWhisper
        ? <div className="allo-ss-section"><h3>{say(t('speech_setup.model_heading'), 'On-device speech model')}</h3><p className="allo-ss-soft">{say(t('speech_setup.desktop_model_note'), 'The desktop app includes its own speech model, so there is nothing to download here.')}</p></div>
        : iosCanvas
          ? <div className="allo-ss-section"><h3>{say(t('speech_setup.model_heading'), 'On-device speech model')}</h3><p className="allo-ss-soft">{say(t('speech_setup.ios_canvas_note'), 'On an iPhone or iPad inside Gemini Canvas, the on-device model is paused because it can restart the page.')}</p></div>
          : !canUseOnDevice
            ? <div className="allo-ss-section"><h3>{say(t('speech_setup.model_heading'), 'On-device speech model')}</h3><p className="allo-ss-soft">{say(t('speech_setup.browser_too_old'), 'This browser cannot run the on-device model. It needs microphone access, Web Audio, and modern module support.')}</p></div>
            : <div className="allo-ss-section">
                <fieldset className="allo-ss-section" style={{ borderTop: 0, margin: 0, padding: 0 }}>
                  <legend>{say(t('speech_setup.model_heading'), 'On-device speech model')}</legend>
                  <p className="allo-ss-soft">{say(t('speech_setup.size_intro'), 'Bigger models make fewer mistakes but need a faster computer. Start with Tiny, then test below.')}</p>
                  {TIERS.map(function(id) {
                    var speed = speeds[V.resolveWhisperProfile(lang, id).modelId];
                    var help = { tiny: say(t('speech_setup.tier_tiny_help'), 'Fastest. A good place to start.'), base: say(t('speech_setup.tier_base_help'), 'Fewer mistakes. Works best on newer computers.'), small: say(t('speech_setup.tier_small_help'), 'Fewest mistakes. A large download that can run slowly.') }[id];
                    return <label className="allo-ss-option" key={id} data-selected={tier === id ? 'true' : 'false'} data-disabled="false">
                      <input type="radio" name="allo-ss-tier" value={id} checked={tier === id} disabled={downloading} onChange={function() { chooseTier(id); }} />
                      <div>
                        <strong>{say(t('speech_setup.tier_line'), '{name} ({size} MB)', { name: tierLabels[id], size: TIER_SIZES_MB[id] })}</strong>
                        <span>{help}{speed ? ' ' + (speed >= 1.1
                          ? say(t('speech_setup.tier_last_speed'), 'Last test on this device: {speed} times faster than speech.', { speed: speed })
                          : say(t('speech_setup.tier_last_speed_slower'), 'Last test on this device: no faster than speech.')) : ''}</span>
                      </div>
                    </label>;
                  })}
                </fieldset>
                <div style={{ marginTop: '10px' }}>
                  {renderModelRow('english', say(t('speech_setup.model_english'), 'English'))}
                  {renderModelRow('multilingual', say(t('speech_setup.model_other'), 'All other languages'))}
                </div>
                {download && <div className="allo-ss-track" aria-hidden="true" style={{ marginTop: '8px' }}><div className="allo-ss-fill" style={{ width: download.percent + '%' }} /></div>}
                {!download && lowStorage && <p className="allo-ss-error">{say(t('speech_setup.low_storage'), 'This device may not have room for this download ({free} MB free).', { free: freeMb })}</p>}
              </div>}

      <div className="allo-ss-section">
        <h3>{say(t('speech_setup.test_heading'), 'Test your microphone')}</h3>
        <p className="allo-ss-soft">
          {testTier && canUseOnDevice && profile.supported
            ? say(t('speech_setup.test_intro_model'), 'Speak for {seconds} seconds to see what the on-device model hears. This also measures how fast this device is. The test stays on this device and nothing is saved.', { seconds: TEST_SECONDS })
            : say(t('speech_setup.test_intro_level'), 'Speak for {seconds} seconds to check that the microphone picks you up. The test stays on this device and nothing is saved. To see your words too, download a speech model.', { seconds: TEST_SECONDS })}
        </p>
        {testTier && <p className="allo-ss-quote">{say(t('speech_setup.test_sentence'), 'You could read this: Plants make their own food through photosynthesis. They use sunlight, water, and carbon dioxide.')}</p>}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
          {check.phase === 'listening' || check.phase === 'starting'
            ? <button type="button" className="allo-ss-button" data-quiet="true" onClick={stopCheck}>{say(t('speech_setup.test_stop'), 'Stop test')}</button>
            : <button type="button" className="allo-ss-button" disabled={testBusy || downloading} onClick={startCheck}>{report ? say(t('speech_setup.test_again'), 'Test again') : say(t('speech_setup.test_start'), 'Start test')}</button>}
        </div>
        {check.phase === 'starting' && <p className="allo-ss-soft" role="status" style={{ marginTop: '8px' }}>{say(t('speech_setup.test_starting'), 'Opening the microphone. If your browser asks, choose Allow.')}</p>}
        {check.phase === 'listening' && <div style={{ marginTop: '8px' }}>
          <p className="allo-ss-soft" role="status">{say(t('speech_setup.test_listening'), 'Listening. Speak now.')}</p>
          <div className="allo-ss-track" aria-hidden="true"><div className="allo-ss-fill" data-testid="speech-setup-level" style={{ width: Math.round((Number.isFinite(check.level) ? Math.max(0, Math.min(1, check.level)) : 0) * 100) + '%' }} /></div>
        </div>}
        {check.phase === 'transcribing' && <p className="allo-ss-soft" role="status" style={{ marginTop: '8px' }}>{say(t('speech_setup.test_transcribing'), 'Turning your speech into text on this device…')}</p>}
        {check.stoppedOther && check.phase === 'done' && <p className="allo-ss-note">{say(t('speech_setup.test_stopped_other'), 'Other listening stopped for this test. Turn it back on when you are ready.')}</p>}
        {report && <div role="status" data-testid="speech-setup-result">
          {!report.heardSound && <p className="allo-ss-error">{say(t('speech_setup.result_silent'), 'No sound reached the microphone. Check that it is plugged in, not muted, and selected in your device settings.')}</p>}
          {report.heardSound && !report.heardSpeech && <p className="allo-ss-error">{say(t('speech_setup.result_quiet'), 'The microphone works, but it did not pick up clear speech. Try again and speak a little louder or closer.')}</p>}
          {report.heardSpeech && report.tier == null && <p className="allo-ss-note"><span className="allo-ss-ok">{say(t('speech_setup.result_level_ok'), 'Your microphone works.')}</span></p>}
          {report.heardSpeech && report.tier != null && <div className="allo-ss-heard">
            <div className="allo-ss-heard-row">
              <div>
                <strong>{say(t('speech_setup.result_heard'), 'What it heard:')}</strong>{' '}
                <span data-testid="speech-setup-transcript">{report.transcript || say(t('speech_setup.result_no_words'), 'No words came through. Try again.')}</span>
              </div>
              {report.transcript && <button type="button" className="allo-ss-button" data-quiet="true" data-testid="speech-setup-copy-transcript" onClick={function() { copyTestTranscript(report.transcript); }}>
                {copiedTranscript ? '✓ Copied' : 'Copy'}
              </button>}
            </div>
          </div>}
          {assessment && <p className="allo-ss-note" data-testid="speech-setup-speed" data-verdict={assessment.verdict}>
            {assessment.speed >= 1.1
              ? say(t('speech_setup.result_speed'), 'This device worked {speed} times faster than speech.', { speed: assessment.speed })
              : assessment.verdict === 'slow'
                ? say(t('speech_setup.result_speed_slower'), 'This device took longer than the speech itself.')
                : say(t('speech_setup.result_speed_even'), 'This device took about as long as the speech itself.')}{' '}
            {assessment.verdict === 'lesson' && say(t('speech_setup.result_lesson'), 'That is fast enough for long dictation or a whole lesson.')}
            {assessment.verdict === 'short' && say(t('speech_setup.result_short'), 'That is fine for short answers, but it may fall behind during a whole lesson.')}
            {assessment.verdict === 'slow' && (tier === 'tiny'
              ? say(t('speech_setup.result_slow'), 'Expect pauses after you speak, even on short answers.')
              : say(t('speech_setup.result_slow_smaller'), 'Expect pauses after you speak. A smaller size would run faster.'))}
            {assessment.biggerTier && <span>{' '}{say(t('speech_setup.result_try_bigger'), 'This device may handle the {name} size too, which makes fewer mistakes. Download it and test again to be sure.', { name: tierLabels[assessment.biggerTier] })}</span>}
          </p>}
        </div>}
        {check.error === 'blocked' && <p className="allo-ss-error" role="alert">{say(t('speech_setup.mic_blocked'), 'The browser is blocking the microphone. Allow it from the icon beside the web address, then test again.')}</p>}
        {check.error === 'missing' && <p className="allo-ss-error" role="alert">{say(t('speech_setup.mic_missing'), 'No microphone was found on this device.')}</p>}
        {check.error === 'busy' && <p className="allo-ss-error" role="alert">{say(t('speech_setup.mic_busy'), 'Another app may be using the microphone. Close it and test again.')}</p>}
        {check.error === 'failed' && <p className="allo-ss-error" role="alert">{say(t('speech_setup.mic_failed'), 'The test did not finish. Try again.')}</p>}
      </div>

      <div className="allo-ss-foot">
        <button type="button" className="allo-ss-button" onClick={onClose}>{say(t('speech_setup.done'), 'Done')}</button>
      </div>
    </div>
  </div>;
}

// Inline embeddable readiness card used by Dictation Studio (QuickStart & SourceView).
// Defaults to Local Whisper with an explicit first-time download warning, live progress,
// and an inline microphone test — keeping the full SpeechSetupPanel modal unchanged.
function SpeechReadinessCard(props) {
  var t = props.t || function() { return ''; };
  var dsay = function(key, fallback, params) {
    var v = '';
    try { v = t(key); } catch (_) { v = ''; }
    var usable = v && v !== key && !/^[\w-]+(\.[\w-]+)+$/.test(String(v));
    return fillText(usable ? v : fallback, params);
  };
  var voiceNow = function() { return (typeof window !== 'undefined' && window.AlloFlowVoice) || null; };
  var V = voiceNow();
  var rcPref = (V && typeof V.loadPreference === 'function' ? V.loadPreference() : null) || {};
  var lang = props.lang || rcPref.lang || 'en-US';
  var mountedRef = React.useRef(true);
  var filesRef = React.useRef(Object.create(null));
  var checkRef = React.useRef(null);
  var checkPhaseRef = React.useRef('idle');

  var _tier = React.useState(function() { return rcPref.whisperTier || 'tiny'; });
  var tier = _tier[0]; var setTier = _tier[1];
  var _modelStatus = React.useState(null);
  var modelStatus = _modelStatus[0]; var setModelStatus = _modelStatus[1];
  var _download = React.useState(null);
  var download = _download[0]; var setDownload = _download[1];
  var _downloadError = React.useState('');
  var downloadError = _downloadError[0]; var setDownloadError = _downloadError[1];
  var _check = React.useState({ phase: 'idle', level: 0, report: null, error: '' });
  var check = _check[0]; var setCheck = _check[1];
  var _rev = React.useState(0);
  var bump = _rev[1];

  function refreshStatus() {
    var voice = voiceNow();
    if (!voice || typeof voice.getWhisperModelStatus !== 'function') return Promise.resolve();
    return voice.getWhisperModelStatus().then(function(st) {
      if (mountedRef.current) { setModelStatus(st); bump(function(n) { return n + 1; }); }
    }).catch(function() {});
  }

  React.useEffect(function() {
    mountedRef.current = true;
    refreshStatus();
    var onChanged = function() { refreshStatus(); };
    if (typeof window !== 'undefined') {
      window.addEventListener('alloflow:voice-engine-changed', onChanged);
      window.addEventListener('alloflow:module-registry-changed', onChanged);
    }
    var voice = voiceNow();
    var unsub = voice && typeof voice.subscribeToVoiceProgress === 'function'
      ? voice.subscribeToVoiceProgress(function(progress) {
          if (!progress || !mountedRef.current || checkPhaseRef.current !== 'idle') return;
          if (progress.phase === 'model-fetch-progress') {
            if (progress.file && !_ssIsBlockedKey(progress.file) && typeof progress.loaded === 'number') filesRef.current[progress.file] = { loaded: progress.loaded };
            var tierMb = _SS_HAS_OWN.call(TIER_SIZES_MB, progress.tier) ? TIER_SIZES_MB[progress.tier] : 0;
            var summary = downloadSummary(filesRef.current, tierMb);
            setDownload({ tier: progress.tier, key: progress.profile, percent: summary.percent, loadedMb: summary.loadedMb });
          } else if (progress.phase === 'model-loaded') {
            filesRef.current = Object.create(null);
            setDownload(null);
            setDownloadError('');
            refreshStatus();
          } else if (progress.phase === 'model-error') {
            filesRef.current = Object.create(null);
            setDownload(null);
            var kind = classifyDownloadError(progress.error);
            if (kind !== 'ignore') setDownloadError(kind);
            refreshStatus();
          }
        })
      : function() {};
    return function() {
      mountedRef.current = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('alloflow:voice-engine-changed', onChanged);
        window.removeEventListener('alloflow:module-registry-changed', onChanged);
      }
      try { unsub(); } catch (_) {}
      if (checkRef.current) { try { checkRef.current.cancel(); } catch (_) {} checkRef.current = null; }
    };
  }, []);

  var caps = V ? V.getCapabilities() : {};
  var iosCanvas = !!(V && typeof V.isIosCanvasVoiceSurface === 'function' && V.isIosCanvasVoiceSurface());
  var profile = V && typeof V.resolveWhisperProfile === 'function' ? V.resolveWhisperProfile(lang, tier) : { supported: true, key: 'english' };
  var languageKey = profile.supported ? profile.key : null;
  var preparedTier = V && typeof V.preparedWhisperTier === 'function' ? V.preparedWhisperTier(tier, lang) : null;
  var canUseOnDevice = !!(V && !iosCanvas && !caps.desktopWhisper && caps.getUserMedia && caps.audioContext && caps.dynamicImport);
  var isReady = !!(caps.desktopWhisper || preparedTier);
  var tierSize = _SS_HAS_OWN.call(TIER_SIZES_MB, tier) ? TIER_SIZES_MB[tier] : 39;
  var tierLabels = {
    tiny: say(t('speech_setup.tier_tiny'), 'Tiny'),
    base: say(t('speech_setup.tier_base'), 'Base'),
    small: say(t('speech_setup.tier_small'), 'Small')
  };
  var activeTier = preparedTier || tier;
  var activeProfile = V && typeof V.resolveWhisperProfile === 'function' ? V.resolveWhisperProfile(lang, activeTier) : profile;
  var storedSpeeds = (rcPref && rcPref.whisperSpeedByModel && typeof rcPref.whisperSpeedByModel === 'object') ? rcPref.whisperSpeedByModel : {};
  var rawSpeed = activeProfile && activeProfile.modelId && _SS_HAS_OWN.call(storedSpeeds, activeProfile.modelId) ? storedSpeeds[activeProfile.modelId] : null;
  var recordedSpeed = typeof rawSpeed === 'number' && Number.isFinite(rawSpeed) && rawSpeed > 0 ? rawSpeed : null;
  var speedAssessment = recordedSpeed != null
    ? (V && typeof V.assessWhisperSpeed === 'function'
        ? V.assessWhisperSpeed(recordedSpeed, 1000, activeTier)
        : { speed: recordedSpeed, verdict: recordedSpeed >= 1.5 ? 'lesson' : (recordedSpeed >= 1 ? 'short' : 'slow'), biggerTier: null })
    : null;
  var suggestBiggerTier = speedAssessment && speedAssessment.biggerTier && !(V && typeof V.isWhisperPrepared === 'function' && V.isWhisperPrepared(speedAssessment.biggerTier, { lang: lang }))
    ? speedAssessment.biggerTier
    : null;

  React.useEffect(function() {
    if (typeof props.onReadyChange === 'function') {
      props.onReadyChange({
        ready: isReady,
        iosCanvas: iosCanvas,
        canUseOnDevice: canUseOnDevice,
        desktopWhisper: !!caps.desktopWhisper,
        tier: preparedTier || tier,
        downloading: !!download
      });
    }
  }, [isReady, iosCanvas, canUseOnDevice, !!caps.desktopWhisper, preparedTier, tier, !!download]);

  function openFullSetup() {
    if (typeof props.onOpenFullSetup === 'function') { props.onOpenFullSetup(); return; }
    try {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('alloflow:open-speech-setup'));
    } catch (_) {}
  }

  function startDownload() {
    if (!V || !languageKey || download) return;
    setDownloadError('');
    filesRef.current = Object.create(null);
    setDownload({ tier: tier, key: languageKey, percent: 0, loadedMb: 0 });
    var targetLang = languageKey === 'english' ? 'en-US' : lang;
    if (typeof V.savePreference === 'function') V.savePreference({ whisperTier: tier });
    V.preloadWhisper(tier, { lang: targetLang }).catch(function() {});
  }

  function startQuickTest() {
    if (!V || checkRef.current || checkPhaseRef.current !== 'idle' || typeof V.startMicrophoneCheck !== 'function') return;
    checkPhaseRef.current = 'starting';
    setCheck({ phase: 'starting', level: 0, report: null, error: '' });
    var run = V.startMicrophoneCheck({
      seconds: 4,
      lang: lang,
      tier: canUseOnDevice && profile.supported ? preparedTier : null,
      onLevel: function(level) {
        if (checkRef.current !== run || !mountedRef.current) return;
        setCheck(function(prev) { return Object.assign({}, prev, { level: Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0 }); });
      },
      onPhase: function(phase) {
        if (checkRef.current !== run) return;
        checkPhaseRef.current = phase;
        if (mountedRef.current) setCheck(function(prev) { return Object.assign({}, prev, { phase: phase, level: phase === 'listening' ? prev.level : 0 }); });
      }
    });
    checkRef.current = run;
    if (!run || !run.promise || typeof run.promise.then !== 'function') {
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      return;
    }
    run.promise.then(function(report) {
      if (checkRef.current !== run) return;
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      if (mountedRef.current) {
        setCheck({ phase: 'done', level: 0, report: report, error: '' });
        bump(function(n) { return n + 1; });
      }
    }, function(err) {
      if (checkRef.current !== run) return;
      checkRef.current = null;
      checkPhaseRef.current = 'idle';
      if (mountedRef.current) {
        var kind = classifyMicError(err);
        setCheck({ phase: 'idle', level: 0, report: null, error: kind === 'ignore' ? '' : kind });
      }
    });
  }

  function stopQuickTest() {
    if (checkRef.current) { try { checkRef.current.cancel(); } catch (_) {} }
  }

  if (!V) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700" role="status" data-testid="speech-readiness-loading">
      {say(t('speech_setup.still_loading'), 'Voice tools are still loading. Try again in a moment.')}
    </div>;
  }

  var testBusy = check.phase === 'starting' || check.phase === 'listening' || check.phase === 'transcribing';

  if (iosCanvas) {
    return <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2" data-testid="speech-readiness-ios-canvas">
      <div className="font-bold">{dsay('dictation.ios_canvas_title', 'On-device Whisper is paused on iPhone/iPad inside Gemini Canvas')}</div>
      <p className="text-xs leading-relaxed">{say(t('speech_setup.ios_canvas_note'), 'On an iPhone or iPad inside Gemini Canvas, the on-device model is paused because it can restart the page.')}</p>
      <p className="text-xs leading-relaxed">{dsay('dictation.ios_canvas_hint', 'You can type directly below, open AlloFlow in a desktop browser for Local Whisper, or use Gemini Audio if configured.')}</p>
    </div>;
  }

  return <div className={'rounded-xl border-2 p-4 text-sm space-y-3 ' + (isReady ? 'border-emerald-200 bg-emerald-50/70 text-slate-900' : 'border-amber-300 bg-amber-50/80 text-slate-900')} data-testid={isReady ? 'speech-readiness-ready' : 'speech-readiness-download-warning'}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ' + (isReady ? 'bg-emerald-700 text-white' : 'bg-amber-800 text-white')}>
            {caps.desktopWhisper
              ? dsay('dictation.badge_desktop', 'Desktop Whisper Ready')
              : isReady
                ? dsay('dictation.badge_local_ready', 'Local Whisper Ready · {name}', { name: tierLabels[preparedTier] || preparedTier })
                : dsay('dictation.badge_download_needed', 'Local Whisper · First-Time Download')}
          </span>
          <span className="text-xs font-semibold text-slate-700">{dsay('dictation.privacy_tag', 'Private · Offline after download · Zero API key needed')}</span>
          {speedAssessment && (
            <span
              data-testid="speech-readiness-speed-badge"
              data-verdict={speedAssessment.verdict}
              className={'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ' + (speedAssessment.verdict === 'lesson' ? 'border-emerald-300 bg-white text-emerald-900' : speedAssessment.verdict === 'short' ? 'border-indigo-300 bg-white text-indigo-900' : 'border-amber-300 bg-white text-amber-950')}
            >
              {speedAssessment.verdict === 'lesson'
                ? (suggestBiggerTier
                    ? dsay('dictation.speed_badge_upgrade', 'Tested: {speed}x faster than speech · Good for long dictation (can also try {name})', { speed: speedAssessment.speed, name: tierLabels[suggestBiggerTier] || suggestBiggerTier })
                    : dsay('dictation.speed_badge_lesson', 'Tested: {speed}x faster than speech · Good for long dictation', { speed: speedAssessment.speed }))
                : speedAssessment.verdict === 'short'
                  ? dsay('dictation.speed_badge_short', 'Tested: {speed}x faster than speech · Best for short clips', { speed: speedAssessment.speed })
                  : dsay('dictation.speed_badge_slow', 'Tested: {speed}x · Slower than real time (expect pauses)', { speed: speedAssessment.speed })}
            </span>
          )}
        </div>
        {!isReady && canUseOnDevice && profile.supported && (
          <p className="text-xs leading-relaxed text-amber-950" data-testid="speech-readiness-warning-text">
            {dsay('dictation.download_warning', 'Download notice: Local Whisper defaults to private on-device speech recognition. Downloading the {name} model takes ~{size} MB once (~1–2 minutes depending on connection), caches offline in your browser, and keeps your voice recordings on this device.', { name: tierLabels[tier], size: tierSize })}
          </p>
        )}
        {!canUseOnDevice && !caps.desktopWhisper && (
          <p className="text-xs text-amber-950">{say(t('speech_setup.browser_too_old'), 'This browser cannot run the on-device model. It needs microphone access, Web Audio, and modern module support.')}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {check.phase === 'listening' || check.phase === 'starting'
          ? <button type="button" onClick={stopQuickTest} className="min-h-11 rounded-lg border border-slate-400 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-100">{say(t('speech_setup.test_stop'), 'Stop test')}</button>
          : <button type="button" onClick={startQuickTest} disabled={testBusy || !!download} data-testid="speech-readiness-test-mic" className="min-h-11 rounded-lg border border-slate-400 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-100 disabled:opacity-50">{dsay('dictation.test_mic', 'Test mic (4s)')}</button>}
        <button type="button" onClick={openFullSetup} data-testid="speech-readiness-open-setup" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">{dsay('dictation.speech_settings', 'Speech settings')}</button>
      </div>
    </div>

    {!isReady && canUseOnDevice && profile.supported && (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div role="group" aria-label={dsay('dictation.model_size_label', 'Local Whisper model size')} className="inline-flex flex-wrap gap-1.5">
          {TIERS.map(function(id) {
            var active = tier === id;
            return <button key={id} type="button" aria-pressed={active} disabled={!!download} onClick={function() { setTier(id); setDownloadError(''); }} className={'min-h-11 rounded-lg border px-2.5 text-xs font-bold ' + (active ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50')}>
              {tierLabels[id]} ({TIER_SIZES_MB[id]} MB)
            </button>;
          })}
        </div>
        <button type="button" disabled={!!download} onClick={startDownload} data-testid="speech-readiness-download-btn" className="min-h-11 rounded-lg bg-emerald-700 px-4 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
          {download
            ? say(t('speech_setup.downloading'), 'Downloading…')
            : dsay('dictation.download_now', 'Download Local Whisper ({size} MB)', { size: tierSize })}
        </button>
      </div>
    )}

    {download && (
      <div className="space-y-1" role="status" aria-live="polite">
        <p className="text-xs font-semibold text-slate-700">
          {say(t('speech_setup.download_progress'), 'Downloaded {loaded} of {total} MB. You can keep working while this finishes.', { loaded: download.loadedMb, total: TIER_SIZES_MB[download.tier] || tierSize })} ({download.percent}%)
        </p>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={say(t('speech_setup.download_label'), 'Speech model download')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={download.percent}>
          <div className="h-full bg-emerald-600 transition-all motion-reduce:transition-none" style={{ width: download.percent + '%' }} />
        </div>
      </div>
    )}

    {downloadError === 'network' && <p className="text-xs font-bold text-amber-900" role="alert">{say(t('speech_setup.download_failed_network'), 'The download did not finish. Check the connection. If this is a school network, ask IT to allow huggingface.co, hf.co, and cdn.jsdelivr.net.')}</p>}
    {downloadError === 'storage' && <p className="text-xs font-bold text-amber-900" role="alert">{say(t('speech_setup.download_failed_storage'), 'This device ran out of storage for the download. Free some space or choose a smaller size.')}</p>}

    {check.phase === 'listening' && (
      <div className="space-y-1" role="status">
        <p className="text-xs font-semibold text-slate-700">{say(t('speech_setup.test_listening'), 'Listening. Speak now.')}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <div className="h-full bg-indigo-600" style={{ width: Math.round(check.level * 100) + '%' }} />
        </div>
      </div>
    )}
    {check.phase === 'transcribing' && <p className="text-xs font-semibold text-slate-700" role="status">{say(t('speech_setup.test_transcribing'), 'Turning your speech into text on this device…')}</p>}
    {check.report && (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800" role="status" data-testid="speech-readiness-test-result">
        {!check.report.heardSound
          ? <span className="font-semibold text-amber-900">{say(t('speech_setup.result_silent'), 'No sound reached the microphone. Check that it is plugged in, not muted, and selected in your device settings.')}</span>
          : !check.report.heardSpeech
            ? <span className="font-semibold text-amber-900">{say(t('speech_setup.result_quiet'), 'The microphone works, but it did not pick up clear speech. Try again and speak a little louder or closer.')}</span>
            : check.report.tier != null
              ? <span><strong>{say(t('speech_setup.result_heard'), 'What it heard:')}</strong> {check.report.transcript || say(t('speech_setup.result_no_words'), 'No words came through. Try again.')}</span>
              : <span className="font-semibold text-emerald-800">{say(t('speech_setup.result_level_ok'), 'Your microphone works.')}</span>}
      </div>
    )}
    {check.error && <p className="text-xs font-bold text-amber-900" role="alert">{check.error === 'blocked' ? say(t('speech_setup.mic_blocked'), 'The browser is blocking the microphone. Allow it from the icon beside the web address, then test again.') : say(t('speech_setup.mic_failed'), 'The test did not finish. Try again.')}</p>}
  </div>;
}

function formatClockSec(sec) {
  var s = Math.max(0, Math.round(Number(sec) || 0));
  var m = Math.floor(s / 60);
  var r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

function applyDiscrepancyEdit(draftText, whisperText, replacement) {
  var base = String(draftText || '');
  var target = String(whisperText || '').trim();
  var next = String(replacement || '').trim();
  if (!target || !next) return base;
  var exactAt = base.indexOf(target);
  if (exactAt >= 0) {
    return base.slice(0, exactAt) + next + base.slice(exactAt + target.length);
  }
  var lowAt = base.toLowerCase().indexOf(target.toLowerCase());
  if (lowAt >= 0) {
    return base.slice(0, lowAt) + next + base.slice(lowAt + target.length);
  }
  return base;
}

function checkDictationAiTextAllowed(propFlag) {
  if (_ssHardAiPolicyBlocked()) return false;
  if (typeof propFlag === 'boolean') return propFlag;
  if (typeof window === 'undefined') return false;
  if (typeof window.__alloResolveAiCapability === 'function') {
    try { return !!window.__alloResolveAiCapability().text; } catch (_) { return false; }
  }
  if (typeof window.__alloAiUsable === 'function') {
    try { return !!window.__alloAiUsable('text'); } catch (_) { return false; }
  }
  return false;
}

function checkDictationAiAudioAllowed(propFlag, voice) {
  if (_ssHardAiPolicyBlocked()) return false;
  if (typeof propFlag === 'boolean') return propFlag;
  if (typeof window === 'undefined') return false;
  if (typeof window.__alloAiUsable === 'function') {
    try { if (!window.__alloAiUsable('audio', window.callGeminiAudio)) return false; } catch (_) { return false; }
  }
  if (voice && typeof voice.getGeminiAudioCapability === 'function') {
    try {
      var cap = voice.getGeminiAudioCapability({ callGeminiAudio: window.callGeminiAudio });
      return !!(cap && cap.available);
    } catch (_) { return false; }
  }
  return false;
}

function normalizeDictationSegments(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(function(s) { return s && typeof s === 'object'; }).map(function(s, idx) {
    return {
      id: String(s.id || ('seg-' + (idx + 1))),
      index: typeof s.index === 'number' ? s.index : idx,
      startSec: Math.max(0, Number(s.startSec) || 0),
      endSec: Math.max(0, Number(s.endSec) || 0),
      text: typeof s.text === 'string' ? s.text : '',
      blob: s.blob || null,
      mimeType: s.mimeType || (s.blob && s.blob.type) || 'audio/wav'
    };
  });
}

function measureSegmentAudioBytes(list) {
  return (Array.isArray(list) ? list : []).reduce(function(sum, s) {
    return sum + ((s && s.blob && typeof s.blob.size === 'number') ? s.blob.size : 0);
  }, 0);
}

var _SS_RA_MAX_CHARS = 6000;
var _SS_RA_MAX_SENTENCES = 120;
var _SS_RA_MAX_SENTENCE_CHARS = 400;
var _SS_RA_ABBREVIATIONS = ['mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'vs', 'etc', 'e.g', 'i.e', 'no', 'mt', 'prof', 'gen', 'capt', 'sgt', 'lt', 'rev',
  'gov', 'sen', 'rep', 'fig', 'ch', 'sec', 'vol', 'eq', 'ex', 'p', 'pp', 'apt', 'dept', 'u.s'];
var _SS_RA_NUM_ABBREVIATIONS = ['jan', 'feb', 'mar', 'apr', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'ave', 'blvd', 'rd', 'ln', 'ct', 'a.m', 'p.m'];

function _ssCutReadAlongSentence(sentence) {
  var rest = sentence;
  var out = [];
  while (rest.length > _SS_RA_MAX_SENTENCE_CHARS) {
    var head = rest.slice(0, _SS_RA_MAX_SENTENCE_CHARS);
    var at = Math.max(head.lastIndexOf(', '), head.lastIndexOf('; '), head.lastIndexOf(': '));
    if (at < _SS_RA_MAX_SENTENCE_CHARS / 3) at = head.lastIndexOf(' ');
    if (at < 1) at = _SS_RA_MAX_SENTENCE_CHARS - 1;
    out.push(rest.slice(0, at + 1).trim());
    rest = rest.slice(at + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}

function _ssSplitReadAlongSentences(value) {
  var source = String(value == null ? '' : value)
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .slice(0, _SS_RA_MAX_CHARS);
  if (!source.trim()) return [];
  var out = [];
  source.split(/\n[ \t]*\n+/).forEach(function(paragraph) {
    paragraph.split('\n').forEach(function(line) {
      var trimmed = line.replace(/[ \t\u00a0]+/g, ' ').trim();
      if (!trimmed || /^-{3,}$/.test(trimmed)) return;
      var hMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      if (hMatch) {
        var hText = hMatch[2].replace(/\s+/g, ' ').trim();
        if (hText) out.push(hText.slice(0, _SS_RA_MAX_SENTENCE_CHARS));
        return;
      }
      var words = trimmed.split(' ').filter(Boolean);
      var run = [];
      var push = function() {
        if (!run.length) return;
        _ssCutReadAlongSentence(run.join(' ')).forEach(function(piece) {
          var cleanPiece = piece.replace(/\s+/g, ' ').trim();
          if (cleanPiece) out.push(cleanPiece);
        });
        run = [];
      };
      words.forEach(function(word, wi) {
        run.push(word);
        var end = /[.!?]+["'\u201d\u2019)\]]*$/.exec(word);
        if (!end) return;
        if (wi + 1 < words.length && /^[a-z]/.test(words[wi + 1])) return;
        var bare = word.slice(0, end.index).replace(/^["'\u201c\u2018(\[]+/, '').toLowerCase();
        var stop = word.charAt(end.index);
        var nextWord = wi + 1 < words.length ? words[wi + 1] : '';
        if (stop === '.' && (_SS_RA_ABBREVIATIONS.indexOf(bare) >= 0 || /^[a-z]$/.test(bare) || (run.length === 1 && /^\d{1,3}$/.test(bare) && nextWord) || (_SS_RA_NUM_ABBREVIATIONS.indexOf(bare) >= 0 && /^[0-9(\[]/.test(nextWord)))) return;
        push();
      });
      push();
    });
  });
  return out.slice(0, _SS_RA_MAX_SENTENCES);
}

function _ssNormalizeAlignText(raw) {
  var s = String(raw == null ? '' : raw).toLowerCase().replace(/[\u2018\u2019]/g, "'");
  try {
    s = s.replace(/[^\p{L}\p{N}']+/gu, ' ');
  } catch (_) {
    s = s.replace(/[^a-z0-9\u00c0-\u024f']+/g, ' ');
  }
  return s.replace(/(?:^|\s)'+|'+(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
}

function _ssIsValidAudioBlob(blob) {
  if (!blob || typeof blob !== 'object') return false;
  if (typeof blob.size === 'number') return blob.size > 0;
  return typeof blob.arrayBuffer === 'function' || typeof blob.slice === 'function';
}

function _ssTokenBag(tokens) {
  var bag = Object.create(null);
  for (var i = 0; i < tokens.length; i++) {
    var tok = tokens[i];
    if (!tok || _ssIsBlockedKey(tok)) continue;
    bag[tok] = (bag[tok] || 0) + 1;
  }
  return bag;
}

function _ssBagOverlapCount(bagA, bagB) {
  var matched = 0;
  var keys = Object.keys(bagA);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (bagB[k]) matched += Math.min(bagA[k], bagB[k]);
  }
  return matched;
}

function _ssSubtractBags(segBag, sentBag) {
  var res = Object.create(null);
  var count = 0;
  var keys = Object.keys(segBag);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var diff = segBag[k] - (sentBag[k] || 0);
    if (diff > 0) {
      res[k] = diff;
      count += diff;
    }
  }
  return { bag: res, count: count };
}

function alignSegmentsToSentences(text, segments) {
  var sentences = _ssSplitReadAlongSentences(text);
  if (!sentences.length || !Array.isArray(segments) || !segments.length) return [];

  var sentMeta = sentences.map(function(sentence, idx) {
    var norm = _ssNormalizeAlignText(sentence);
    var tokens = norm ? norm.split(' ') : [];
    return {
      sentence: sentence,
      sentenceIndex: idx,
      norm: norm,
      tokens: tokens,
      bag: _ssTokenBag(tokens)
    };
  });

  var bestBySentence = Object.create(null);

  for (var si = 0; si < segments.length; si++) {
    var seg = segments[si];
    if (!seg || typeof seg !== 'object' || !_ssIsValidAudioBlob(seg.blob)) continue;
    var segNorm = _ssNormalizeAlignText(seg.text);
    if (!segNorm) continue;

    var exactMatches = [];
    for (var ei = 0; ei < sentMeta.length; ei++) {
      if (sentMeta[ei].norm && sentMeta[ei].norm === segNorm) exactMatches.push(ei);
    }
    if (exactMatches.length > 0) {
      var chosenExact = -1;
      for (var ex = 0; ex < exactMatches.length; ex++) {
        if (!bestBySentence[exactMatches[ex]]) { chosenExact = exactMatches[ex]; break; }
      }
      if (chosenExact < 0) chosenExact = exactMatches[0];
      var prevExact = bestBySentence[chosenExact];
      if (!prevExact || 1 > prevExact.score) {
        bestBySentence[chosenExact] = {
          sentence: sentMeta[chosenExact].sentence,
          sentenceIndex: chosenExact,
          segment: seg,
          score: 1
        };
      }
      continue;
    }

    var segTokens = segNorm.split(' ');
    var segBag = _ssTokenBag(segTokens);
    var scores = [];
    var bestIdx = -1;
    var bestScore = 0;
    for (var ji = 0; ji < sentMeta.length; ji++) {
      var sm = sentMeta[ji];
      var matched = sm.tokens.length ? _ssBagOverlapCount(segBag, sm.bag) : 0;
      var f1 = (segTokens.length + sm.tokens.length) > 0
        ? (2 * matched) / (segTokens.length + sm.tokens.length)
        : 0;
      scores.push(f1);
      if (f1 > bestScore) {
        bestScore = f1;
        bestIdx = ji;
      }
    }

    if (bestIdx < 0 || bestScore < 0.55) continue;

    if (sentMeta.length > 1) {
      var bestMeta = sentMeta[bestIdx];
      var residual = _ssSubtractBags(segBag, bestMeta.bag);
      var spansMultiple = false;
      for (var oi = 0; oi < sentMeta.length; oi++) {
        if (oi === bestIdx) continue;
        var other = sentMeta[oi];
        if (!other.tokens.length || other.norm === bestMeta.norm) continue;
        var otherScore = scores[oi];
        var resMatched = residual.count > 0 ? _ssBagOverlapCount(residual.bag, other.bag) : 0;
        var resRecall = resMatched / other.tokens.length;
        if (otherScore >= 0.45 && (bestScore < 0.8 || resRecall >= 0.25)) {
          spansMultiple = true;
          break;
        }
        if (residual.count >= Math.min(2, other.tokens.length) && resRecall >= 0.45) {
          spansMultiple = true;
          break;
        }
      }
      if (spansMultiple) continue;
    }

    var prevBest = bestBySentence[bestIdx];
    if (!prevBest || bestScore > prevBest.score) {
      bestBySentence[bestIdx] = {
        sentence: sentMeta[bestIdx].sentence,
        sentenceIndex: bestIdx,
        segment: seg,
        score: bestScore
      };
    }
  }

  var results = [];
  for (var ri = 0; ri < sentMeta.length; ri++) {
    if (bestBySentence[ri]) results.push(bestBySentence[ri]);
  }
  return results;
}

// Reusable Dictation Source Studio (shared by QuickStartWizard Step 3 and SourceView).
// Defaults to Local Whisper (private, offline after one-time download) with clear download
// warning, strengths comparison, opt-in text-only AI cleanup, and explicit opt-in Gemini
// audio cross-triangulation with 5-second local audio slice replay.
function DictationSourceStudio(props) {
  var t = props.t || function() { return ''; };
  var dsay = function(key, fallback, params) {
    var v = '';
    try { v = t(key); } catch (_) { v = ''; }
    var usable = v && v !== key && !/^[\w-]+(\.[\w-]+)+$/.test(String(v));
    return fillText(usable ? v : fallback, params);
  };
  var voiceNow = function() { return (typeof window !== 'undefined' && window.AlloFlowVoice) || null; };
  var V = voiceNow();
  var lang = props.lang || (V && typeof V.loadPreference === 'function' ? V.loadPreference().lang : 'en-US') || 'en-US';
  var value = typeof props.value === 'string' ? props.value : '';
  var onChange = typeof props.onChange === 'function' ? props.onChange : function() {};

  var hydratedSegmentsRef = React.useRef(null);
  if (hydratedSegmentsRef.current === null) hydratedSegmentsRef.current = normalizeDictationSegments(props.initialSegments);
  var prevInitialSegmentsPropRef = React.useRef(props.initialSegments);
  var hydratedUrlsRef = React.useRef([]);

  var _readyInfo = React.useState({ ready: false, iosCanvas: false, canUseOnDevice: true, desktopWhisper: false, tier: 'tiny', downloading: false });
  var readyInfo = _readyInfo[0]; var setReadyInfo = _readyInfo[1];
  var _recState = React.useState('idle'); // idle | recording | paused | stopping
  var recState = _recState[0]; var setRecState = _recState[1];
  var _level = React.useState(0);
  var level = _level[0]; var setLevel = _level[1];
  var _segments = React.useState(function() { return hydratedSegmentsRef.current.slice(); });
  var segments = _segments[0]; var setSegments = _segments[1];
  var _audioBytes = React.useState(function() { return measureSegmentAudioBytes(hydratedSegmentsRef.current); });
  var audioBytes = _audioBytes[0]; var setAudioBytes = _audioBytes[1];
  var _recError = React.useState('');
  var recError = _recError[0]; var setRecError = _recError[1];

  // Text-only AI cleanup state (non-destructive review + Undo)
  var _cleaning = React.useState('');
  var cleaning = _cleaning[0]; var setCleaning = _cleaning[1];
  var _cleanupReview = React.useState(null); // { preset, suggested, previous }
  var cleanupReview = _cleanupReview[0]; var setCleanupReview = _cleanupReview[1];
  var _undoPrevious = React.useState(null);
  var undoPrevious = _undoPrevious[0]; var setUndoPrevious = _undoPrevious[1];
  var _cleanupError = React.useState('');
  var cleanupError = _cleanupError[0]; var setCleanupError = _cleanupError[1];

  // Explicit opt-in Gemini audio cross-triangulation state
  var _checking = React.useState(false);
  var checking = _checking[0]; var setChecking = _checking[1];
  var _checkDone = React.useState(false);
  var checkDone = _checkDone[0]; var setCheckDone = _checkDone[1];
  var _checkError = React.useState('');
  var checkError = _checkError[0]; var setCheckError = _checkError[1];
  var _discrepancies = React.useState([]);
  var discrepancies = _discrepancies[0]; var setDiscrepancies = _discrepancies[1];
  var _editingId = React.useState(null);
  var editingId = _editingId[0]; var setEditingId = _editingId[1];
  var _editDraft = React.useState('');
  var editDraft = _editDraft[0]; var setEditDraft = _editDraft[1];
  var _playingId = React.useState(null);
  var playingId = _playingId[0]; var setPlayingId = _playingId[1];
  var _crisisBanner = React.useState('');
  var crisisBanner = _crisisBanner[0]; var setCrisisBanner = _crisisBanner[1];
  var _includeVoiceClips = React.useState(true);
  var includeVoiceClips = _includeVoiceClips[0]; var setIncludeVoiceClips = _includeVoiceClips[1];

  var mountedRef = React.useRef(true);
  var recorderRef = React.useRef(null);
  var audioElRef = React.useRef(null);
  var sliceTimerRef = React.useRef(null);
  var latestValueRef = React.useRef(value);
  latestValueRef.current = value;

  var aiTextAllowed = checkDictationAiTextAllowed(props.aiTextAvailable);
  var aiAudioAllowed = checkDictationAiAudioAllowed(props.aiAudioAvailable, V);
  var sendToReadAlongFn = typeof props.onSendToReadAlong === 'function'
    ? props.onSendToReadAlong
    : (props.onSendToReadAlong === undefined && typeof window !== 'undefined' && typeof window.__alloSendToReadAlongPacket === 'function'
        ? window.__alloSendToReadAlongPacket
        : null);

  function revokeHydratedUrls() {
    var urls = hydratedUrlsRef.current;
    hydratedUrlsRef.current = [];
    if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
    for (var i = 0; i < urls.length; i++) {
      try { URL.revokeObjectURL(urls[i]); } catch (_) {}
    }
  }

  React.useEffect(function() {
    if (props.initialSegments === prevInitialSegmentsPropRef.current) return;
    prevInitialSegmentsPropRef.current = props.initialSegments;
    revokeHydratedUrls();
    var nextHydrated = normalizeDictationSegments(props.initialSegments);
    hydratedSegmentsRef.current = nextHydrated;
    var recSegs = recorderRef.current ? recorderRef.current.getSegments() : [];
    var merged = nextHydrated.concat(recSegs);
    setSegments(merged);
    setAudioBytes(measureSegmentAudioBytes(merged));
  }, [props.initialSegments]);

  React.useEffect(function() {
    mountedRef.current = true;
    var onMuteChanged = function(event) {
      var muted = (event && event.detail && event.detail.muted === true) || _ssIsGlobalMuted();
      if (muted) {
        if (sliceTimerRef.current) { clearTimeout(sliceTimerRef.current); sliceTimerRef.current = null; }
        if (audioElRef.current) { try { audioElRef.current.pause(); } catch (_) {} audioElRef.current = null; }
        if (mountedRef.current) setPlayingId(null);
      }
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('alloflow-mute-changed', onMuteChanged);
    }
    return function() {
      mountedRef.current = false;
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('alloflow-mute-changed', onMuteChanged);
      }
      if (sliceTimerRef.current) { clearTimeout(sliceTimerRef.current); sliceTimerRef.current = null; }
      if (audioElRef.current) { try { audioElRef.current.pause(); } catch (_) {} audioElRef.current = null; }
      revokeHydratedUrls();
      if (recorderRef.current) {
        try { recorderRef.current.stop(); } catch (_) {}
        try { recorderRef.current.clearAudio(); } catch (_) {}
        recorderRef.current = null;
      }
    };
  }, []);

  function ensureRecorder() {
    if (recorderRef.current) return recorderRef.current;
    var voice = voiceNow();
    if (!voice || typeof voice.createSegmentedDictationRecorder !== 'function') return null;
    var rec = voice.createSegmentedDictationRecorder({
      lang: lang,
      tier: readyInfo.tier || 'tiny',
      initialText: latestValueRef.current,
      onLevel: function(lv) { if (mountedRef.current) setLevel(Number.isFinite(lv) ? Math.max(0, Math.min(1, lv)) : 0); },
      onStatus: function(st) { if (!mountedRef.current) return; setRecState(st); if (st !== 'recording') setLevel(0); },
      onSegment: function() {
        if (!mountedRef.current) return;
        var combined = hydratedSegmentsRef.current.concat(rec.getSegments());
        setSegments(combined);
        setAudioBytes(measureSegmentAudioBytes(combined));
      },
      onDraft: function(draft, segs) {
        if (!mountedRef.current) return;
        var combined = hydratedSegmentsRef.current.concat(Array.isArray(segs) ? segs : []);
        setSegments(combined);
        setAudioBytes(measureSegmentAudioBytes(combined));
        onChange(draft);
      },
      onError: function(err) {
        if (!mountedRef.current) return;
        var msg = (err && err.message) ? err.message : 'Microphone or transcription error.';
        setRecError(msg);
      }
    });
    recorderRef.current = rec;
    return rec;
  }

  function handleStart() {
    setRecError('');
    if (readyInfo.iosCanvas) {
      setRecError(dsay('dictation.ios_canvas_blocked', 'Local Whisper is paused on iPhone/iPad inside Gemini Canvas. Type directly below or open AlloFlow in a desktop browser.'));
      return;
    }
    var rec = ensureRecorder();
    if (!rec) {
      setRecError(dsay('dictation.voice_unavailable', 'Voice recorder is still loading. Please try again in a moment.'));
      return;
    }
    rec.setDraft(latestValueRef.current);
    rec.start().catch(function(err) {
      if (mountedRef.current) setRecError((err && err.message) || dsay('dictation.mic_start_failed', 'Could not start the microphone. Check browser permissions.'));
    });
  }

  function handlePause() {
    if (recorderRef.current) recorderRef.current.pause();
  }

  function handleResume() {
    setRecError('');
    if (recorderRef.current) {
      recorderRef.current.setDraft(latestValueRef.current);
      recorderRef.current.resume().catch(function(err) {
        if (mountedRef.current) setRecError((err && err.message) || dsay('dictation.mic_start_failed', 'Could not resume the microphone.'));
      });
    }
  }

  function handleStop() {
    if (recorderRef.current) {
      recorderRef.current.stop().then(function(res) {
        if (!mountedRef.current) return;
        var recSegs = (res && Array.isArray(res.segments)) ? res.segments : (recorderRef.current ? recorderRef.current.getSegments() : []);
        var combined = hydratedSegmentsRef.current.concat(recSegs);
        setSegments(combined);
        setAudioBytes(measureSegmentAudioBytes(combined));
      }).catch(function() {});
    }
  }

  function handleClearAudio() {
    if (sliceTimerRef.current) { clearTimeout(sliceTimerRef.current); sliceTimerRef.current = null; }
    if (audioElRef.current) { try { audioElRef.current.pause(); } catch (_) {} audioElRef.current = null; }
    setPlayingId(null);
    revokeHydratedUrls();
    hydratedSegmentsRef.current = [];
    if (recorderRef.current) {
      recorderRef.current.clearAudio();
    }
    setSegments([]);
    setAudioBytes(0);
    if (typeof props.onClearInitialSegments === 'function') {
      try { props.onClearInitialSegments(); } catch (_) {}
    }
    setDiscrepancies([]);
    setCheckDone(false);
    setCheckError('');
  }

  function runCleanup(preset) {
    if (!aiTextAllowed || !value.trim() || cleaning) return;
    var crisis = _ssScreenCrisis(value);
    if (crisis) { setCrisisBanner(crisis.message); return; }
    setCrisisBanner('');
    var handler = typeof props.onCleanupText === 'function'
      ? props.onCleanupText
      : (typeof window !== 'undefined' && typeof window.__alloRunDictationTextCleanup === 'function' ? window.__alloRunDictationTextCleanup : null);
    if (!handler) {
      setCleanupError(dsay('dictation.cleanup_unavailable', 'AI text cleanup is unavailable right now.'));
      return;
    }
    setCleanupError('');
    setCleaning(preset);
    var base = value;
    Promise.resolve(handler(base, preset)).then(function(suggested) {
      if (!mountedRef.current) return;
      var clean = typeof suggested === 'string' ? suggested.trim() : '';
      if (clean && clean !== base.trim()) {
        setCleanupReview({ preset: preset, suggested: clean, previous: base });
      } else {
        setCleanupError(dsay('dictation.cleanup_no_changes', 'No changes were suggested for this draft.'));
      }
    }).catch(function(err) {
      if (mountedRef.current) setCleanupError((err && err.message) || dsay('dictation.cleanup_failed', 'Could not clean up the text right now.'));
    }).finally(function() {
      if (mountedRef.current) setCleaning('');
    });
  }

  function applyCleanup() {
    if (!cleanupReview) return;
    setUndoPrevious(value);
    onChange(cleanupReview.suggested);
    setCleanupReview(null);
  }

  function undoCleanup() {
    if (undoPrevious == null) return;
    onChange(undoPrevious);
    setUndoPrevious(null);
  }

  function runCrossCheck() {
    var audioSegs = segments.filter(function(s) { return !!s.blob; });
    if (!aiAudioAllowed || checking || !audioSegs.length || !value.trim()) return;
    var crisis = _ssScreenCrisis(value);
    if (crisis) { setCrisisBanner(crisis.message); return; }
    setCrisisBanner('');
    var handler = typeof props.onCrossCheckAudio === 'function'
      ? props.onCrossCheckAudio
      : (typeof window !== 'undefined' && typeof window.__alloRunGeminiAudioCrossCheck === 'function' ? window.__alloRunGeminiAudioCrossCheck : null);
    if (!handler) {
      setCheckError(dsay('dictation.crosscheck_unavailable', 'Gemini audio cross-triangulation is unavailable right now.'));
      return;
    }
    setCheckError('');
    setChecking(true);
    setCheckDone(false);
    Promise.resolve(handler(audioSegs, value, { lang: lang })).then(function(items) {
      if (!mountedRef.current) return;
      var list = Array.isArray(items) ? items.map(function(it, idx) {
        return {
          id: String((it && it.id) || ('diff-' + (idx + 1))),
          segmentIndex: Number(it && it.segmentIndex) || 0,
          startSec: Number(it && it.startSec) || 0,
          endSec: Number(it && it.endSec) || 5,
          whisperText: String((it && it.whisperText) || '').trim(),
          geminiText: String((it && it.geminiText) || '').trim(),
          reason: String((it && it.reason) || '').trim(),
          status: 'open'
        };
      }).filter(function(it) { return it.whisperText || it.geminiText; }) : [];
      setDiscrepancies(list);
      setCheckDone(true);
    }).catch(function(err) {
      if (mountedRef.current) setCheckError((err && err.message) || dsay('dictation.crosscheck_failed', 'Gemini audio check did not finish. Your local transcript is untouched.'));
    }).finally(function() {
      if (mountedRef.current) setChecking(false);
    });
  }

  function playDiscrepancySlice(item) {
    if (!item) return;
    if (sliceTimerRef.current) { clearTimeout(sliceTimerRef.current); sliceTimerRef.current = null; }
    if (audioElRef.current) { try { audioElRef.current.pause(); } catch (_) {} audioElRef.current = null; }
    if (playingId === item.id) { setPlayingId(null); return; }
    if (_ssIsGlobalMuted()) { setPlayingId(null); return; }
    var target = Math.max(0, Number(item.startSec) || 0);
    var slice = null;
    var match = null;
    if (typeof item.segmentIndex === 'number' && segments[item.segmentIndex] && segments[item.segmentIndex].blob) {
      var indexed = segments[item.segmentIndex];
      if (target >= indexed.startSec - 0.5 && target <= indexed.endSec + 0.5) match = indexed;
    }
    if (!match) {
      for (var i = 0; i < segments.length; i++) {
        if (!segments[i] || !segments[i].blob) continue;
        if (target >= segments[i].startSec - 0.5 && target <= segments[i].endSec + 0.5) {
          match = segments[i];
          break;
        }
      }
    }
    if (!match) {
      for (var j = 0; j < segments.length; j++) {
        if (segments[j] && segments[j].blob) { match = segments[j]; break; }
      }
    }
    if (match && match.blob) {
      var isHydrated = hydratedSegmentsRef.current.indexOf(match) !== -1 || hydratedSegmentsRef.current.some(function(h) { return h && h.id === match.id && h.blob === match.blob; });
      if (!isHydrated && recorderRef.current && typeof recorderRef.current.getAudioSliceUrl === 'function') {
        slice = recorderRef.current.getAudioSliceUrl(item.startSec, item.endSec);
      } else if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        var url = URL.createObjectURL(match.blob);
        hydratedUrlsRef.current.push(url);
        var relStart = Math.max(0, target - (Number(match.startSec) || 0));
        var span = Math.max(2, Math.min(12, (Number(item.endSec) > target ? (Number(item.endSec) - target) : 5)));
        slice = { url: url, offsetSec: relStart, durationSec: span, segmentId: match.id };
      }
    } else if (recorderRef.current && typeof recorderRef.current.getAudioSliceUrl === 'function') {
      slice = recorderRef.current.getAudioSliceUrl(item.startSec, item.endSec);
    }
    if (!slice || !slice.url || typeof window === 'undefined' || typeof window.Audio !== 'function') return;
    var el = new window.Audio(slice.url);
    audioElRef.current = el;
    setPlayingId(item.id);
    var seekToOffset = function() {
      try {
        if (slice.offsetSec > 0) {
          el.currentTime = Number.isFinite(el.duration) && el.duration > 0
            ? Math.min(slice.offsetSec, Math.max(0, el.duration - 0.5))
            : slice.offsetSec;
        }
      } catch (_) {}
    };
    el.onloadedmetadata = seekToOffset;
    if (el.readyState >= 1) seekToOffset();
    var finishPlayback = function() {
      if (sliceTimerRef.current) { clearTimeout(sliceTimerRef.current); sliceTimerRef.current = null; }
      if (audioElRef.current === el) audioElRef.current = null;
      if (mountedRef.current) setPlayingId(null);
    };
    el.onended = finishPlayback;
    el.onerror = finishPlayback;
    try {
      var playRes = el.play();
      if (playRes && typeof playRes.catch === 'function') playRes.catch(finishPlayback);
    } catch (_) { finishPlayback(); }
    var durationMs = Math.max(500, Math.min(30000, Math.round((Number(slice.durationSec) || 5) * 1000)));
    sliceTimerRef.current = setTimeout(function() {
      try { if (audioElRef.current === el) el.pause(); } catch (_) {}
      finishPlayback();
    }, durationMs);
  }

  function resolveDiscrepancy(id, action, customText) {
    var target = discrepancies.filter(function(d) { return d.id === id; })[0];
    if (!target) return;
    if (action === 'accept' && target.geminiText) {
      onChange(applyDiscrepancyEdit(latestValueRef.current, target.whisperText, target.geminiText));
    } else if (action === 'edit' && customText && customText.trim()) {
      onChange(applyDiscrepancyEdit(latestValueRef.current, target.whisperText, customText.trim()));
    }
    setDiscrepancies(function(prev) {
      return prev.map(function(d) { return d.id === id ? Object.assign({}, d, { status: action }) : d; });
    });
    if (editingId === id) { setEditingId(null); setEditDraft(''); }
  }

  var words = value.trim() ? value.trim().split(/\s+/).length : 0;
  var blobSegments = segments.filter(function(s) { return !!(s && _ssIsValidAudioBlob(s.blob)); });
  var audioSegCount = blobSegments.length;
  var totalElapsed = segments.length ? segments[segments.length - 1].endSec : 0;
  var audioMb = (audioBytes / MB).toFixed(1);
  var openDiscrepancies = discrepancies.filter(function(d) { return d.status === 'open'; });
  var canRecord = !readyInfo.iosCanvas && (readyInfo.ready || readyInfo.canUseOnDevice);

  return <div className="space-y-4 text-left" data-testid="dictation-source-studio">
    <SpeechReadinessCard t={t} lang={lang} onReadyChange={setReadyInfo} />

    <details data-testid="dictation-engine-guide" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <summary className="cursor-pointer font-bold text-slate-900 rounded focus-visible:ring-2 focus-visible:ring-indigo-600">
        {dsay('dictation.guide_summary', 'Local Whisper vs. Gemini Audio — strengths & why use both')}
      </summary>
      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-200 bg-white p-2.5 space-y-1">
          <div className="font-bold text-emerald-900">{dsay('dictation.guide_whisper_title', 'Local Whisper (Default)')}</div>
          <p className="leading-relaxed">{dsay('dictation.guide_whisper_body', 'Private and offline after a one-time download (~39–73 MB). No audio leaves your device, no API key or quota is needed, and long continuous dictation works reliably.')}</p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-white p-2.5 space-y-1">
          <div className="font-bold text-indigo-900">{dsay('dictation.guide_gemini_title', 'Gemini Audio (Optional check)')}</div>
          <p className="leading-relaxed">{dsay('dictation.guide_gemini_body', 'No model download required. Stronger on specialized vocabulary, proper nouns, accented speech, noisy classrooms, and punctuation — sends recorded audio chunks to Gemini only if you opt in.')}</p>
        </div>
      </div>
      <p className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 leading-relaxed text-slate-800">
        <strong>{dsay('dictation.guide_both_label', 'Why use both (Cross-Triangulation):')}</strong>{' '}
        {dsay('dictation.guide_both_body', 'Start privately with Local Whisper so your dictation stays fast and offline-first. If you want a second opinion on tricky terms or names, opt in to Gemini cross-triangulation to compare two independent models against your audio and replay 5-second clips at any flagged spot.')}
      </p>
    </details>

    <div className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {recState === 'idle' && (
            <button type="button" data-testid="dictation-start-btn" disabled={!canRecord || readyInfo.downloading} onClick={handleStart} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
              {dsay('dictation.start_recording', 'Start dictating (Local Whisper)')}
            </button>
          )}
          {recState === 'recording' && (
            <button type="button" data-testid="dictation-pause-btn" onClick={handlePause} className="min-h-11 rounded-xl bg-amber-700 px-4 text-sm font-bold text-white hover:bg-amber-800">
              {dsay('dictation.pause_recording', 'Pause')}
            </button>
          )}
          {recState === 'paused' && (
            <button type="button" data-testid="dictation-resume-btn" onClick={handleResume} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">
              {dsay('dictation.resume_recording', 'Resume')}
            </button>
          )}
          {(recState === 'recording' || recState === 'paused') && (
            <button type="button" data-testid="dictation-stop-btn" onClick={handleStop} className="min-h-11 rounded-xl border border-slate-400 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-100">
              {dsay('dictation.stop_recording', 'Stop')}
            </button>
          )}
          {typeof props.onUploadMedia === 'function' && (
            <button type="button" data-testid="dictation-upload-media-btn" onClick={props.onUploadMedia} className="min-h-11 rounded-xl border border-indigo-300 bg-indigo-50 px-3 text-xs font-bold text-indigo-900 hover:bg-indigo-100">
              {dsay('dictation.upload_media', 'Transcribe audio/video file')}
            </button>
          )}
        </div>
        {audioSegCount > 0 && (
          <button type="button" data-testid="dictation-clear-audio" onClick={handleClearAudio} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            {dsay('dictation.clear_audio', 'Clear recorded audio ({mb} MB)', { mb: audioMb })}
          </button>
        )}
      </div>

      {recState === 'recording' && (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>{dsay('dictation.listening_local', 'Listening locally with Whisper… pause briefly or keep talking to append text.')}</span>
            <span>{formatClockSec(totalElapsed)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div className="h-full bg-emerald-600 transition-all motion-reduce:transition-none" style={{ width: Math.round(level * 100) + '%' }} />
          </div>
        </div>
      )}
      {recState === 'paused' && <p className="text-xs font-semibold text-amber-900" role="status">{dsay('dictation.paused_note', 'Paused. You can edit the transcript below or press Resume to keep dictating.')}</p>}
      {recError && <p className="text-xs font-bold text-amber-900" role="alert">{recError}</p>}
      {crisisBanner && <div className="rounded-xl border-2 border-rose-500 bg-rose-50 p-3 text-xs font-semibold text-rose-950" role="alert">{crisisBanner}</div>}

      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="dictation-draft-box" className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {dsay('dictation.draft_label', 'Transcript draft (editable)')}
          </label>
          <span className="text-xs text-slate-600" aria-live="polite">
            {words} {words === 1 ? 'word' : 'words'}{segments.length > 0 ? (' · ' + segments.length + (segments.length === 1 ? ' segment' : ' segments')) : ''}
          </span>
        </div>
        <textarea
          id="dictation-draft-box"
          data-testid="dictation-draft-textarea"
          dir="auto"
          rows={props.compact ? 6 : 8}
          value={value}
          onChange={function(e) { onChange(e.target.value); }}
          placeholder={dsay('dictation.draft_placeholder', 'Press Start dictating above, or type/edit your transcript directly here…')}
          className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-900 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/20 resize-y"
        />
      </div>

      {aiTextAllowed && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2" data-testid="dictation-cleanup-section">
          <div className="text-xs font-bold text-slate-800">
            {dsay('dictation.cleanup_heading', 'Optional AI text cleanup')} <span className="font-normal text-slate-600">({dsay('dictation.cleanup_text_only', 'text only — no audio is sent')})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'punctuation', label: dsay('dictation.cleanup_punctuation', 'Clean punctuation & formatting') },
              { id: 'fillers', label: dsay('dictation.cleanup_fillers', 'Tighten filler words') },
              { id: 'notes', label: dsay('dictation.cleanup_notes', 'Format as classroom notes') }
            ].map(function(preset) {
              return <button key={preset.id} type="button" data-testid={'dictation-cleanup-' + preset.id} disabled={!value.trim() || !!cleaning} onClick={function() { runCleanup(preset.id); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-indigo-50 hover:border-indigo-400 disabled:opacity-50">
                {cleaning === preset.id ? dsay('dictation.cleanup_working', 'Cleaning…') : preset.label}
              </button>;
            })}
            {undoPrevious != null && (
              <button type="button" data-testid="dictation-cleanup-undo" onClick={undoCleanup} className="min-h-11 rounded-lg border border-violet-300 bg-violet-50 px-3 text-xs font-bold text-violet-900 hover:bg-violet-100">
                {dsay('dictation.cleanup_undo', 'Undo cleanup')}
              </button>
            )}
          </div>
          {cleanupError && <p className="text-xs font-semibold text-amber-900" role="alert">{cleanupError}</p>}
          {cleanupReview && (
            <div data-testid="dictation-cleanup-review" className="rounded-xl border-2 border-indigo-300 bg-white p-3 space-y-2">
              <div className="text-xs font-bold text-indigo-900">{dsay('dictation.cleanup_review_title', 'Suggested cleanup ready — your draft has not changed yet')}</div>
              <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900">{cleanupReview.suggested}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" data-testid="dictation-cleanup-apply" onClick={applyCleanup} className="min-h-11 rounded-lg bg-indigo-700 px-3 text-xs font-bold text-white hover:bg-indigo-800">{dsay('dictation.cleanup_apply', 'Apply cleanup')}</button>
                <button type="button" onClick={function() { setCleanupReview(null); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100">{dsay('dictation.cleanup_keep', 'Keep original')}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2" data-testid="dictation-crosscheck-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-bold text-indigo-950">{dsay('dictation.crosscheck_heading', 'Cross-triangulate against audio with Gemini (Opt-in)')}</div>
            <p className="text-xs text-slate-700">
              {aiAudioAllowed
                ? dsay('dictation.crosscheck_disclosure', 'Only runs if you click below: sends your in-memory recorded audio segments and draft text to Gemini to flag possible word errors.')
                : dsay('dictation.crosscheck_disabled_note', 'Unavailable right now (disabled in offline / student AI-off mode or without a Gemini key). Your Local Whisper dictation still works completely offline.')}
            </p>
          </div>
          <button
            type="button"
            data-testid="dictation-crosscheck-btn"
            disabled={!aiAudioAllowed || checking || audioSegCount === 0 || !value.trim()}
            onClick={runCrossCheck}
            className="min-h-11 rounded-lg bg-indigo-700 px-4 text-xs font-bold text-white hover:bg-indigo-800 disabled:opacity-50"
          >
            {checking ? dsay('dictation.crosscheck_running', 'Checking against audio…') : dsay('dictation.crosscheck_btn', 'Verify against audio with Gemini')}
          </button>
        </div>
        {checkError && <p className="text-xs font-bold text-amber-900" role="alert">{checkError}</p>}
        {checkDone && discrepancies.length === 0 && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900" role="status" data-testid="dictation-crosscheck-clean">
            {dsay('dictation.crosscheck_none', 'No substantive discrepancies found between Local Whisper and Gemini Audio.')}
          </p>
        )}
        {discrepancies.length > 0 && (
          <div className="space-y-2" data-testid="dictation-crosscheck-list">
            <div className="text-xs font-bold text-slate-800">
              {openDiscrepancies.length > 0
                ? dsay('dictation.crosscheck_count', '{count} flagged spot(s) to review:', { count: openDiscrepancies.length })
                : dsay('dictation.crosscheck_all_resolved', 'All flagged spots reviewed.')}
            </div>
            {discrepancies.map(function(item) {
              var resolved = item.status !== 'open';
              return <div key={item.id} data-testid={'dictation-diff-' + item.id} className={'rounded-lg border p-2.5 text-xs space-y-2 ' + (resolved ? 'border-slate-200 bg-slate-50 opacity-75' : 'border-indigo-200 bg-white')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-700">{formatClockSec(item.startSec)} – {formatClockSec(item.endSec)}</span>
                  {item.reason && <span className="text-slate-600">{item.reason}</span>}
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  <div className="rounded border border-slate-200 bg-slate-50 p-2"><strong className="block text-slate-700">Local Whisper:</strong> {item.whisperText || '—'}</div>
                  <div className="rounded border border-indigo-200 bg-indigo-50/50 p-2"><strong className="block text-indigo-900">Gemini Audio:</strong> {item.geminiText || '—'}</div>
                </div>
                {editingId === item.id ? (
                  <div className="flex flex-wrap gap-2">
                    <input type="text" value={editDraft} onChange={function(e) { setEditDraft(e.target.value); }} aria-label="Edited phrase" className="min-h-11 flex-1 rounded-lg border border-slate-300 px-2.5 text-xs" />
                    <button type="button" onClick={function() { resolveDiscrepancy(item.id, 'edit', editDraft); }} className="min-h-11 rounded-lg bg-emerald-700 px-3 font-bold text-white">Save edit</button>
                    <button type="button" onClick={function() { setEditingId(null); setEditDraft(''); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-700">Cancel</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {audioSegCount > 0 && (
                      <button type="button" data-testid="dictation-play-slice" onClick={function() { playDiscrepancySlice(item); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-800 hover:bg-slate-100">
                        {playingId === item.id ? 'Stop clip' : 'Play 5s clip'}
                      </button>
                    )}
                    {!resolved && item.geminiText && (
                      <button type="button" data-testid={'dictation-accept-' + item.id} onClick={function() { resolveDiscrepancy(item.id, 'accept'); }} className="min-h-11 rounded-lg bg-indigo-700 px-3 font-bold text-white hover:bg-indigo-800">Accept Gemini</button>
                    )}
                    {!resolved && (
                      <button type="button" data-testid={'dictation-keep-' + item.id} onClick={function() { resolveDiscrepancy(item.id, 'keep'); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-700 hover:bg-slate-100">Keep Whisper</button>
                    )}
                    {!resolved && (
                      <button type="button" onClick={function() { setEditingId(item.id); setEditDraft(item.geminiText || item.whisperText); }} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-bold text-slate-700 hover:bg-slate-100">Edit</button>
                    )}
                    {resolved && <span className="inline-flex items-center font-semibold text-emerald-800">{item.status === 'accept' ? '✓ Accepted Gemini' : item.status === 'edit' ? '✓ Edited' : '✓ Kept Whisper'}</span>}
                  </div>
                )}
              </div>;
            })}
          </div>
        )}
      </div>

      {(typeof props.onApplyToSource === 'function' || (sendToReadAlongFn && value.trim())) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {sendToReadAlongFn && value.trim() && audioSegCount > 0 && (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100">
              <input
                type="checkbox"
                data-testid="dictation-include-voice-clips"
                checked={includeVoiceClips}
                onChange={function(e) { setIncludeVoiceClips(!!e.target.checked); }}
                className="h-4 w-4 rounded border-slate-400 accent-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
              <span>{'Include my recorded voice clips (' + audioSegCount + ')'}</span>
            </label>
          )}
          {sendToReadAlongFn && value.trim() && (
            <button
              type="button"
              data-testid="dictation-send-read-along"
              onClick={function() {
                sendToReadAlongFn({
                  text: value,
                  segments: includeVoiceClips ? blobSegments : [],
                  includeVoiceClips: !!includeVoiceClips
                });
              }}
              className="min-h-11 rounded-xl border border-indigo-600 bg-indigo-50 px-4 text-sm font-bold text-indigo-900 hover:bg-indigo-100"
            >
              {dsay('dictation.send_read_along', 'Send to Read-Along Packet')}
            </button>
          )}
          {typeof props.onApplyToSource === 'function' && (
            <button type="button" data-testid="dictation-apply-source" disabled={!value.trim()} onClick={function() {
              var crisis = _ssScreenCrisis(value);
              if (crisis) { setCrisisBanner(crisis.message); return; }
              setCrisisBanner('');
              props.onApplyToSource(value);
            }} className="min-h-11 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50">
              {dsay('dictation.use_text', 'Use dictated text')}
            </button>
          )}
        </div>
      )}
    </div>
  </div>;
}

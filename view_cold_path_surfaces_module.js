/** Auto-generated first-wave cold-path CDN module. */
(function() {
'use strict';
var React = window.React;
if (!React) { console.error('[ColdPathSurfaces] React not found on window'); return; }
window.AlloModules = window.AlloModules || {};
if (window.AlloModules.ColdPathSurfaces) return;
// Shared between Canvas and standalone AI backend settings.
function AllobotSearchSettings({
  t
}) {
  const tx = (key, fallback) => {
    const value = typeof t === 'function' ? t(key) : '';
    return value && value !== key ? value : fallback;
  };
  const isLocked = () => typeof window !== 'undefined' && (window.__alloAiSecretsLocked === true || window.__alloQrStudentMode === true || window.__alloStudentAiDisabled === true);
  const [locked, setLocked] = React.useState(isLocked);
  React.useEffect(() => {
    const sync = () => setLocked(isLocked());
    const events = ['alloflow:ai-key-lock-changed', 'alloflow:student-ai-config-changed', 'alloflow:ai-config-changed'];
    events.forEach(ev => window.addEventListener(ev, sync));
    return () => {
      events.forEach(ev => window.removeEventListener(ev, sync));
    };
  }, []);
  const read = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  };
  const managed = typeof window !== 'undefined' ? window.ALLOFLOW_MANAGED_AI_POLICY : null;
  const managedSearchOff = managed != null && (managed.version !== 1 || managed.allowExternalSearch !== true);
  const [key, setKey] = React.useState(() => isLocked() ? '' : String(read().serperApiKey || ''));
  const [hasSavedKey, setHasSavedKey] = React.useState(() => !isLocked() && Boolean(String(read().serperApiKey || '').trim()));
  const [enabled, setEnabled] = React.useState(() => {
    if (isLocked()) return false;
    const cfg = read();
    return cfg.allobotWebSearch === true || cfg.allobotWebSearch !== false && (!cfg.backend || cfg.backend === 'gemini');
  });
  const [saved, setSaved] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    if (locked) {
      setKey('');
      setHasSavedKey(false);
    }
  }, [locked]);
  if (locked) return null;
  const save = patch => {
    if (isLocked()) return;
    try {
      const next = {
        ...read(),
        ...patch
      };
      localStorage.setItem('alloflow_ai_config', JSON.stringify(next));
      setHasSavedKey(Boolean(String(next.serperApiKey || '').trim()));
      setSaved(true);
      setFailed(false);
      try {
        window.dispatchEvent(new Event('alloflow:ai-config-changed'));
      } catch (_) {}
    } catch (_) {
      setFailed(true);
      setSaved(false);
    }
  };
  const focusBtn = 'min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  return /*#__PURE__*/React.createElement("section", {
    "aria-label": tx('chat_guide.search_settings', 'Allobot web sources'),
    className: "border-t border-slate-200 pt-4 space-y-2 text-slate-800"
  }, managed != null && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-xs"
  }, tx('chat_guide.managed_policy', 'Managed AI restrictions are active. Requests to unapproved endpoints or credentials are blocked. This policy currently permits approved text connections only; media generation is disabled. Your administrator controls external research access.')), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm"
  }, tx('chat_guide.search_settings', 'Allobot web sources')), /*#__PURE__*/React.createElement("label", {
    className: "flex min-h-11 items-start gap-2 py-1 text-sm cursor-pointer"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "mt-1 h-4 w-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    checked: !managedSearchOff && enabled,
    disabled: managedSearchOff,
    onChange: event => {
      setEnabled(event.target.checked);
      save({
        allobotWebSearch: event.target.checked
      });
    }
  }), tx('chat_guide.search_enabled', 'Look up public sources for UDL, standards and research questions')), /*#__PURE__*/React.createElement("label", {
    className: "block text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block font-medium mb-1"
  }, tx('chat_guide.personal_serper', 'Your Serper API key (optional)')), /*#__PURE__*/React.createElement("input", {
    type: "password",
    autoComplete: "off",
    spellCheck: false,
    value: key,
    placeholder: "serper.dev",
    disabled: managedSearchOff,
    onChange: event => {
      setKey(event.target.value);
      setSaved(false);
    },
    className: "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 p-2 text-slate-900 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:opacity-50"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: focusBtn,
    disabled: managedSearchOff,
    onClick: () => save({
      serperApiKey: key.trim()
    })
  }, tx('chat_guide.save_search_key', 'Save search key')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: focusBtn,
    disabled: !hasSavedKey && !key.trim(),
    onClick: () => {
      setKey('');
      save({
        serperApiKey: ''
      });
    }
  }, tx('chat_guide.remove_search_key', 'Remove personal key'))), /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-xs"
  }, failed ? tx('chat_guide.search_save_failed', 'Could not save these settings in this browser.') : saved ? tx('chat_guide.search_saved', 'Search settings saved.') : ''), /*#__PURE__*/React.createElement("p", {
    className: "text-xs leading-relaxed"
  }, tx('chat_guide.search_key_help', 'Leave blank to use the configured search service or Gemini Google grounding when available. A saved personal key takes priority for Allobot lookups and Serper searches. It is stored in this browser and can be read by code running in the app; use a personal key, not a shared district secret.')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs leading-relaxed"
  }, tx('chat_guide.search_privacy_help', 'Serper is outside your district Google environment. Any topic can be searched. A search that looks like it contains an email address, phone number or ID number is not sent, with or without a personal key. Ordinary Allobot replies send your current question; you can include recent messages or a reviewed excerpt for one reply. Other generation workflows use their task inputs. Use a district-approved connection for student information. A Gemini API key alone does not establish district coverage. Local AI requires this lookup option to be enabled.')));
}

// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

function _useColdSurfaceDialogLock(dialogRef, isOpen) {
  React.useEffect(() => {
    if (!isOpen) return;
    const prevFocus = typeof document !== 'undefined' ? document.activeElement : null;
    const lockState = typeof window !== 'undefined' ? window.__alloScrollLockState = window.__alloScrollLockState || {
      count: 0,
      overflow: ''
    } : null;
    if (lockState && typeof document !== 'undefined' && document.body) {
      if (lockState.count === 0) lockState.overflow = document.body.style.overflow;
      lockState.count += 1;
      document.body.style.overflow = 'hidden';
    }
    const hiddenNodes = [];
    const liveSel = '[aria-live], [role="status"], [role="alert"], [role="log"]';
    if (typeof document !== 'undefined' && dialogRef && dialogRef.current) {
      const rootEl = document.getElementById('root');
      const siblings = rootEl ? Array.from(rootEl.children) : Array.from(document.body?.children || []);
      siblings.forEach(node => {
        if (!node || node === dialogRef.current || node.contains(dialogRef.current)) return;
        if (node.matches?.(liveSel) || node.querySelector?.(liveSel)) return;
        const hadInert = node.hasAttribute('inert');
        const prevHidden = node.getAttribute('aria-hidden');
        if (!hadInert) node.setAttribute('inert', '');
        node.setAttribute('aria-hidden', 'true');
        hiddenNodes.push({
          node,
          hadInert,
          prevHidden
        });
      });
    }
    const focusTimer = setTimeout(() => {
      const el = dialogRef && dialogRef.current;
      if (!el) return;
      const target = el.querySelector('[data-autofocus="true"], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') || el;
      try {
        target.focus();
      } catch (_) {}
    }, 0);
    const onKeyDown = e => {
      if (e.key !== 'Tab' || !dialogRef || !dialogRef.current) return;
      const focusables = Array.from(dialogRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter(n => !n.closest('[hidden]') && (typeof getComputedStyle !== 'function' || getComputedStyle(n).display !== 'none'));
      if (focusables.length === 0) {
        e.preventDefault();
        try {
          dialogRef.current.focus();
        } catch (_) {}
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
          e.preventDefault();
          try {
            last.focus();
          } catch (_) {}
        }
      } else if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
        e.preventDefault();
        try {
          first.focus();
        } catch (_) {}
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearTimeout(focusTimer);
      if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeyDown, true);
      hiddenNodes.forEach(({
        node,
        hadInert,
        prevHidden
      }) => {
        try {
          if (!hadInert) node.removeAttribute('inert');
          if (prevHidden === null) node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden', prevHidden);
        } catch (_) {}
      });
      if (lockState && typeof document !== 'undefined' && document.body) {
        lockState.count = Math.max(0, lockState.count - 1);
        if (lockState.count === 0) document.body.style.overflow = lockState.overflow;
      }
      if (prevFocus && typeof prevFocus.focus === 'function') {
        try {
          prevFocus.focus();
        } catch (_) {}
      }
    };
  }, [dialogRef, isOpen]);
}
function _validateSafeLmsUrl(rawUrl) {
  const str = String(rawUrl || '').trim();
  if (!str) return {
    ok: false,
    reason: 'Empty document URL.'
  };
  let parsed;
  try {
    parsed = new URL(str);
  } catch (_) {
    return {
      ok: false,
      reason: 'Document URL must be a complete https:// address.'
    };
  }
  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      reason: 'Only https:// LMS document URLs are allowed.'
    };
  }
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      reason: 'Document URLs containing embedded credentials are blocked.'
    };
  }
  const host = String(parsed.hostname || '').toLowerCase();
  if (!host || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?|\[?fe80:|\[?fc|\[?fd|0\.0\.0\.0)/.test(host) || host.endsWith('.local') || host.endsWith('.localhost')) {
    return {
      ok: false,
      reason: 'Local or private-network LMS URLs are blocked.'
    };
  }
  return {
    ok: true,
    url: parsed.href,
    hostname: parsed.hostname,
    pathname: parsed.pathname
  };
}

// Extracted from AlloFlowANTI.txt (ai-backend-settings).
function AiBackendSettingsView(props) {
  const {
    GEMINI_MODELS,
    Settings,
    X,
    _isCanvasEnv,
    aiBackendModalRef,
    openCanvasRecoveryManager,
    setShowAIBackendModal,
    t
  } = props;
  const localModalRef = React.useRef(null);
  const resolvedModalRef = aiBackendModalRef || localModalRef;
  const backdropDownRef = React.useRef(false);
  const secretsLocked = typeof window !== 'undefined' && (window.__alloAiSecretsLocked === true || window.__alloStudentAiDisabled === true || window.__alloQrStudentMode === true);
  _useColdSurfaceDialogLock(resolvedModalRef, true);
  return /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    onKeyDown: e => {
      if (e.key === 'Escape' && !(e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229)) {
        e.preventDefault();
        setShowAIBackendModal(false);
      }
    },
    className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in motion-reduce:animate-none fade-in duration-300",
    onMouseDown: e => {
      backdropDownRef.current = e.target === e.currentTarget;
    },
    onClick: e => {
      if (backdropDownRef.current && e.target === e.currentTarget) setShowAIBackendModal(false);
      backdropDownRef.current = false;
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: resolvedModalRef,
    tabIndex: -1,
    className: "allo-docsuite bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative border-4 border-violet-100 animate-in motion-reduce:animate-none zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "ai-backend-canvas-title",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowAIBackendModal(false),
    className: "absolute top-4 right-4 min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-1 z-10",
    "aria-label": t('common.close') || "Close"
  }, /*#__PURE__*/React.createElement(X, {
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-5 text-violet-900 pr-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-violet-100 p-2 rounded-full"
  }, /*#__PURE__*/React.createElement(Settings, {
    size: 20,
    className: "text-violet-600",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h2", {
    id: "ai-backend-canvas-title",
    className: "font-black text-lg"
  }, t('canvas_settings.title') || 'AI Settings & Diagnostics')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, !secretsLocked && typeof AllobotSearchSettings !== 'undefined' && /*#__PURE__*/React.createElement(AllobotSearchSettings, {
    t: t
  }), !secretsLocked && (() => {
    try {
      return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').wolframAppId || '';
    } catch {
      return '';
    }
  })() ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "ai-canvas-wolfram",
    className: "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5"
  }, t('canvas_settings.wolfram_label') || 'Wolfram Alpha App ID', " ", /*#__PURE__*/React.createElement("span", {
    className: "normal-case font-normal text-slate-600"
  }, t('common.optional_parenthetical') || '(optional)')), /*#__PURE__*/React.createElement("input", {
    id: "ai-canvas-wolfram",
    "aria-label": t('canvas_settings.wolfram_label') || 'Wolfram Alpha App ID',
    type: "text",
    placeholder: t('canvas_settings.wolfram_placeholder') || 'XXXXX-XXXXXXXXXX (from developer.wolframalpha.com)',
    defaultValue: (() => {
      try {
        return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').wolframAppId || '';
      } catch {
        return '';
      }
    })(),
    onChange: e => {
      try {
        const parsed = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
        const current = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        localStorage.setItem('alloflow_ai_config', JSON.stringify({
          ...current,
          wolframAppId: e.target.value
        }));
      } catch (_) {}
    },
    className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600 focus-visible:outline-offset-1 text-sm font-medium text-slate-700"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mt-1"
  }, t('canvas_settings.wolfram_unused_note') || 'No tool uses this yet. It is kept on this device only; clear the box to remove it.')) : null, window.AlloModules && window.AlloModules.ModelDiagnosticsSection && React.createElement(window.AlloModules.ModelDiagnosticsSection, {
    t,
    _isCanvasEnv,
    GEMINI_MODELS
  }), window.AlloModules && window.AlloModules.PlatformDiagnosticsSection && React.createElement(window.AlloModules.PlatformDiagnosticsSection, {
    t
  }), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 pt-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5"
  }, t('canvas_settings.device_storage_label') || 'Device Storage'), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mb-2"
  }, t('canvas_settings.device_storage_hint2') || 'Open your saved resource packs to restore, pin, export, or erase them. Everything is kept on this device only, nothing goes to a server.'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openCanvasRecoveryManager,
    className: "min-h-11 bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors motion-reduce:transition-none motion-reduce:transform-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-1"
  }, "\uD83D\uDDC2\uFE0F ", t('canvas_settings.device_storage_btn2') || 'Open saved work')), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 pt-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5"
  }, t('canvas_settings.diagnostics_label') || 'Diagnostics & Logs'), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 mb-2"
  }, t('canvas_settings.diagnostics_hint') || 'View captured errors and the read-aloud (text-to-speech) activity trace — useful when audio stalls without a visible error.'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (typeof window.__alloOpenDiagnosticsLog !== 'function') return;
      let hasErrors = false;
      try {
        hasErrors = (window.AlloModules.ErrorReporter.getBuffer() || []).length > 0;
      } catch (e) {}
      window.__alloOpenDiagnosticsLog(hasErrors ? 'errors' : 'tts');
    },
    className: "min-h-11 bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors motion-reduce:transition-none motion-reduce:transform-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-1"
  }, "\uD83E\uDE7A ", t('canvas_settings.diagnostics_btn') || 'Open error & read-aloud log')), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowAIBackendModal(false),
    className: "min-h-11 bg-violet-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors motion-reduce:transition-none motion-reduce:transform-none shadow-lg shadow-violet-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
  }, t('common.done') || 'Done')))));
}

// Extracted from AlloFlowANTI.txt (lms-audit-banner).
function LmsAuditBannerView(props) {
  const {
    addToast,
    isPdfDocumentIntakeCurrent,
    lmsAuditFetchControllerRef,
    lmsAuditUrls,
    setGenerationStep,
    setIsExtracting,
    setLmsAuditUrls,
    setPdfAuditResult,
    setPendingPdfBase64,
    setPendingPdfFile,
    startNewPdfAudit,
    t
  } = props;
  React.useEffect(() => () => {
    try {
      lmsAuditFetchControllerRef?.current?.abort();
    } catch (_) {}
    try {
      if (typeof startNewPdfAudit === 'function') startNewPdfAudit();
    } catch (_) {}
  }, [lmsAuditFetchControllerRef, startNewPdfAudit]);
  const handleDismiss = () => {
    try {
      lmsAuditFetchControllerRef?.current?.abort();
    } catch (_) {}
    try {
      if (typeof startNewPdfAudit === 'function') startNewPdfAudit();
    } catch (_) {}
    if (typeof setIsExtracting === 'function') setIsExtracting(false);
    if (typeof setGenerationStep === 'function') setGenerationStep('');
    setLmsAuditUrls([]);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-green-700 to-emerald-700 text-white px-4 py-3 z-[500]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-sm"
  }, "\u267F ", t(lmsAuditUrls.length === 1 ? 'lms.queued_one' : 'lms.queued_other', {
    count: lmsAuditUrls.length
  }) || `${lmsAuditUrls.length} document${lmsAuditUrls.length !== 1 ? 's' : ''} queued from LMS`), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleDismiss,
    className: "min-h-11 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-md text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-emerald-800"
  }, t('lms.dismiss_button') || 'Dismiss')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, lmsAuditUrls.map((url, i) => {
    const validation = _validateSafeLmsUrl(url);
    let name = `Document ${i + 1}`;
    let hostLabel = validation.ok ? validation.hostname : '';
    try {
      const parsedUrl = new URL(url, window.location.href);
      if (!hostLabel) hostLabel = parsedUrl.hostname || '';
      const encodedName = parsedUrl.pathname.split('/').filter(Boolean).pop() || '';
      try {
        name = decodeURIComponent(encodedName) || name;
      } catch (_) {
        name = encodedName || name;
      }
    } catch (_) {
      const rawName = String(url || '').split('/').pop().split('?')[0];
      name = rawName || name;
    }
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: i,
      onClick: async () => {
        const check = _validateSafeLmsUrl(url);
        if (!check.ok) {
          addToast(t('lms.blocked_url', {
            reason: check.reason
          }) || `Blocked unsafe LMS document link: ${check.reason}`, 'error');
          return;
        }
        const documentIntakeEpoch = startNewPdfAudit();
        const fetchController = typeof AbortController !== 'undefined' ? new AbortController() : null;
        lmsAuditFetchControllerRef.current = fetchController;
        let fetchTimedOut = false;
        const fetchTimeout = setTimeout(() => {
          fetchTimedOut = true;
          try {
            fetchController?.abort();
          } catch (_) {}
        }, 30000);
        setIsExtracting(true);
        setGenerationStep(t('status_steps.extracting_text'));
        try {
          addToast(t('lms.fetching', {
            name
          }) || `Fetching ${name}...`, 'info');
          const resp = await fetch(url, fetchController ? {
            signal: fetchController.signal
          } : undefined);
          if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const responseType = String(resp.headers.get('content-type') || '').toLowerCase();
          if (/text\/html|application\/json/.test(responseType)) throw new Error('The LMS returned a sign-in page instead of a document.');
          const maxBytes = 30 * 1024 * 1024;
          const declaredBytes = Number(resp.headers.get('content-length'));
          if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) throw new Error('The document is larger than the 30 MB safety limit.');
          let blob;
          if (resp.body && typeof resp.body.getReader === 'function') {
            const streamReader = resp.body.getReader();
            const chunks = [];
            let received = 0;
            while (true) {
              const part = await streamReader.read();
              if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) {
                try {
                  await streamReader.cancel();
                } catch (_) {}
                return;
              }
              if (part.done) break;
              received += part.value.byteLength;
              if (received > maxBytes) {
                try {
                  await streamReader.cancel();
                } catch (_) {}
                throw new Error('The document is larger than the 30 MB safety limit.');
              }
              chunks.push(part.value);
            }
            blob = new Blob(chunks, {
              type: responseType || 'application/octet-stream'
            });
          } else blob = await resp.blob();
          if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;
          if (blob.size > 30 * 1024 * 1024) throw new Error('The document is larger than the 30 MB safety limit.');
          // The fetch timer owns only network/body acquisition. Once the Blob is complete,
          // FileReader's separate timer below owns conversion and visible error cleanup.
          clearTimeout(fetchTimeout);
          const failLmsRead = message => {
            if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;
            setIsExtracting(false);
            setGenerationStep('');
            addToast(message, 'error');
          };
          await new Promise(resolveRead => {
            const reader = new FileReader();
            let readSettled = false;
            let readTimeout = null;
            const onFetchAbort = () => {
              if (readSettled) return;
              settleRead();
              try {
                if (reader.readyState === 1) reader.abort();
              } catch (_) {}
            };
            const settleRead = () => {
              if (readSettled) return;
              readSettled = true;
              if (readTimeout) clearTimeout(readTimeout);
              try {
                fetchController?.signal.removeEventListener('abort', onFetchAbort);
              } catch (_) {}
              resolveRead();
            };
            const failRead = message => {
              if (readSettled) return;
              failLmsRead(message);
              settleRead();
              try {
                if (reader.readyState === 1) reader.abort();
              } catch (_) {}
            };
            reader.onload = () => {
              if (readSettled || !isPdfDocumentIntakeCurrent(documentIntakeEpoch)) {
                settleRead();
                return;
              }
              const result = reader.result;
              const base64 = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : '';
              if (!base64) {
                failRead('The downloaded document was empty.');
                return;
              }
              const looksPdf = responseType.includes('application/pdf') || /\.pdf$/i.test(name);
              if (looksPdf) {
                let header = '';
                try {
                  header = atob(base64.slice(0, 1400));
                } catch (_) {}
                if (!header.includes('%PDF-')) {
                  failRead('The LMS response was not a valid PDF. Sign in to the LMS in this browser, then try again.');
                  return;
                }
              }
              setPendingPdfBase64(base64);
              setPendingPdfFile({
                name,
                size: blob.size,
                type: blob.type || responseType
              });
              setPdfAuditResult({
                _choosing: true,
                fileName: name,
                fileSize: blob.size
              });
              setLmsAuditUrls(prev => prev.filter(item => item !== url));
              setIsExtracting(false);
              setGenerationStep('');
              addToast(t('lms.loaded_ready', {
                name
              }) || `${name} loaded — ready for audit`, 'success');
              settleRead();
            };
            reader.onerror = () => failRead('The downloaded document could not be read.');
            reader.onabort = () => {
              if (readSettled) return;
              if (isPdfDocumentIntakeCurrent(documentIntakeEpoch)) failRead('The downloaded document read was cancelled.');else settleRead();
            };
            try {
              fetchController?.signal.addEventListener('abort', onFetchAbort, {
                once: true
              });
            } catch (_) {}
            readTimeout = setTimeout(() => failRead('The downloaded document could not be read within 30 seconds.'), 30000);
            try {
              reader.readAsDataURL(blob);
            } catch (err) {
              failRead(err?.message || 'The downloaded document could not be read.');
            }
          });
        } catch (err) {
          if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;
          setIsExtracting(false);
          setGenerationStep('');
          const reason = fetchTimedOut ? 'The download timed out after 30 seconds.' : err?.message || 'Unknown download error';
          addToast(t('lms.fetch_failed', {
            name,
            error: reason
          }) || `Failed to fetch ${name}: ${reason}. The file may require LMS authentication.`, 'error');
        } finally {
          clearTimeout(fetchTimeout);
          if (lmsAuditFetchControllerRef.current === fetchController) lmsAuditFetchControllerRef.current = null;
        }
      },
      className: "min-h-11 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-xs font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-emerald-800 flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-white/20 px-1 py-0.5 rounded text-xs font-bold"
    }, name.split('.').pop()?.toUpperCase() || 'FILE'), /*#__PURE__*/React.createElement("span", {
      className: "max-w-[200px] truncate"
    }, name), hostLabel && /*#__PURE__*/React.createElement("span", {
      className: "text-emerald-100 text-[11px] font-normal max-w-[140px] truncate"
    }, "(", hostLabel, ")"));
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-emerald-50 mt-2"
  }, t('lms.audit_queue_help') || 'Click a document to fetch and load it into the accessibility pipeline. Some LMS files may require you to be logged in to the LMS in this browser.'));
}

// Extracted from AlloFlowANTI.txt (read-this-page-panel).
function ReadThisPagePanelView(props) {
  const {
    Ear,
    _readThisPageItemAt,
    closeReadThisPage,
    focusNarrationEnabled,
    getReadableContent,
    readAllReadThisPage,
    rtpCurrentIndex,
    rtpPanelRef,
    rtpPlaybackState,
    setFocusNarrationEnabled,
    stopReadThisPage,
    t,
    theme
  } = props;
  const [selectionNote, setSelectionNote] = React.useState('');
  const [readingSelection, setReadingSelection] = React.useState(false);
  const mountedRef = React.useRef(true);
  const selectionSpeechTokenRef = React.useRef(0);
  React.useEffect(() => () => {
    mountedRef.current = false;
    selectionSpeechTokenRef.current += 1;
  }, []);
  const items = getReadableContent();
  const typeColors = {
    heading: '#f59e0b',
    text: '#cbd5e1',
    status: '#a78bfa',
    term: '#38bdf8',
    question: '#f472b6',
    option: '#60a5fa'
  };
  const typeIcons = {
    heading: '\u{1F4E2}',
    text: '\u{1F4C4}',
    status: '\u{1F4CD}',
    term: '\u{1F4D6}',
    question: '\u{2753}',
    option: '\u{1F520}'
  };
  const handleReadAll = () => {
    selectionSpeechTokenRef.current += 1;
    setSelectionNote('');
    setReadingSelection(false);
    readAllReadThisPage();
  };
  const handleStop = () => {
    selectionSpeechTokenRef.current += 1;
    setReadingSelection(false);
    setSelectionNote('');
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') window.AlloSpeechPlayer.stop();
    } catch (_) {}
    stopReadThisPage();
  };
  const handleReadSelection = () => {
    const token = ++selectionSpeechTokenRef.current;
    let selected = '';
    try {
      selected = (typeof window !== 'undefined' && typeof window.getSelection === 'function' ? String(window.getSelection() || '') : '').replace(/\s+/g, ' ').trim();
    } catch (_) {
      selected = '';
    }
    if (!selected) {
      setReadingSelection(false);
      setSelectionNote(t('read_this_page.select_text_hint') || 'Highlight any text on the page first, then press Selection.');
      return;
    }
    setSelectionNote('');
    try {
      stopReadThisPage();
    } catch (_) {}
    const rate = Number(typeof window !== 'undefined' ? window.__alloPlaybackRate : 1) || 1;
    const volume = typeof window !== 'undefined' && Number.isFinite(Number(window.__alloVoiceVolume)) ? Math.max(0, Math.min(1, Number(window.__alloVoiceVolume))) : 1;
    const done = () => {
      if (!mountedRef.current || selectionSpeechTokenRef.current !== token) return;
      setReadingSelection(false);
    };
    setReadingSelection(true);
    if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
      try {
        const res = window.AlloSpeechPlayer.speak(selected, {
          rate,
          volume,
          onEnd: done,
          onError: done
        });
        if (res && typeof res.then === 'function') res.then(done, done);
        return;
      } catch (_) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
      try {
        window.speechSynthesis.cancel();
        const u = new window.SpeechSynthesisUtterance(selected);
        u.rate = Math.max(0.5, Math.min(2, rate));
        u.volume = volume;
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
        return;
      } catch (_) {}
    }
    if (mountedRef.current && selectionSpeechTokenRef.current === token) {
      setReadingSelection(false);
      setSelectionNote(t('read_this_page.voice_unavailable') || 'Device voice is not available in this browser.');
    }
  };
  const handleItemClick = idx => {
    selectionSpeechTokenRef.current += 1;
    setSelectionNote('');
    setReadingSelection(false);
    _readThisPageItemAt(idx);
  };
  const secondaryTextColor = theme === 'contrast' ? '#fbbf24' : '#cbd5e1';
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed top-16 right-4 z-[45] w-[min(360px,calc(100vw-2rem))] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl shadow-2xl border-s-4 border-purple-500 overflow-hidden animate-in motion-reduce:animate-none slide-in-from-right-5 duration-300",
    style: {
      background: theme === 'contrast' ? '#000' : '#0f172a',
      color: theme === 'contrast' ? '#fbbf24' : '#e2e8f0',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px'
    },
    ref: rtpPanelRef,
    tabIndex: -1,
    "aria-busy": rtpPlaybackState === 'reading' || readingSelection,
    role: "complementary",
    "aria-label": t('read_this_page.panel_aria') || 'Read This Page panel'
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between gap-2 p-3 border-b",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 font-black text-sm"
  }, /*#__PURE__*/React.createElement(Ear, {
    size: 16,
    className: "text-purple-300",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, t('read_this_page.title') || 'Read This Page')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1 flex-wrap justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    id: "rtp-read-all-btn",
    onClick: handleReadAll,
    className: "min-h-11 px-2.5 py-2 rounded-lg text-white text-xs font-bold transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900",
    style: {
      background: rtpPlaybackState === 'reading' ? '#15803d' : '#7c3aed'
    },
    "aria-pressed": rtpPlaybackState === 'reading'
  }, '\u25B6', " ", t('read_this_page.read_all_button') || 'Read All'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    id: "rtp-read-selection-btn",
    "data-rtp-read-selection": "true",
    onClick: handleReadSelection,
    className: "min-h-11 px-2.5 py-2 rounded-lg text-white text-xs font-bold transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900",
    style: {
      background: readingSelection ? '#15803d' : '#0369a1'
    },
    "aria-pressed": readingSelection,
    title: t('read_this_page.read_selection_title') || 'Read highlighted text aloud on any view (no AI needed)'
  }, '\u{1F50A}', " ", t('read_this_page.read_selection_button') || 'Selection'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleStop,
    className: "min-h-11 px-2.5 py-2 rounded-lg text-white text-xs font-bold hover:bg-red-800 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900",
    style: {
      background: '#b91c1c'
    }
  }, '\u23F9', " ", t('read_this_page.stop_button') || 'Stop'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: closeReadThisPage,
    "aria-label": (t('common.close') || 'Close') + ': ' + (t('read_this_page.title') || 'Read This Page'),
    className: "min-w-11 min-h-11 inline-flex items-center justify-center ms-1 px-2 py-2 rounded-lg text-slate-200 hover:text-white hover:bg-slate-700 transition-colors motion-reduce:transition-none text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
  }, '\u2715'))), selectionNote && /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "px-3 py-1.5 text-xs border-b",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155',
      color: theme === 'contrast' ? '#fbbf24' : '#38bdf8',
      background: theme === 'contrast' ? '#000' : 'rgba(14,165,233,0.12)'
    }
  }, selectionNote), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 px-3 py-2 border-b",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155'
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer select-none flex-1 min-h-11"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: focusNarrationEnabled,
    onChange: e => setFocusNarrationEnabled(e.target.checked),
    className: "w-4 h-4 rounded accent-purple-500",
    "aria-describedby": focusNarrationEnabled ? 'focus-narration-sr-warning' : undefined
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold"
  }, t('read_this_page.focus_narration_label') || 'Keyboard Focus Narration')), /*#__PURE__*/React.createElement("span", {
    className: "text-xs",
    style: {
      color: secondaryTextColor
    }
  }, focusNarrationEnabled ? t('read_this_page.focus_narration_on_hint') || 'Tab to hear controls' : t('common.off') || 'Off')), focusNarrationEnabled && /*#__PURE__*/React.createElement("div", {
    id: "focus-narration-sr-warning",
    role: "note",
    className: "px-3 py-1.5 text-xs border-b",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155',
      color: '#fbbf24',
      background: theme === 'contrast' ? '#000' : 'rgba(251,191,36,0.1)'
    }
  }, t('read_this_page.focus_narration_sr_warning') || '⚠ If you use a screen reader (NVDA, JAWS, VoiceOver), turn this off to avoid double-announcements.'), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-2 space-y-1",
    style: {
      maxHeight: 'calc(100vh - 12rem)'
    }
  }, items.map((item, idx) => {
    const itemText = String(item?.text || '');
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      "data-rtp-idx": idx,
      onClick: () => handleItemClick(idx),
      className: "px-3 py-2 rounded-lg cursor-pointer transition-colors motion-reduce:transition-none hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
      style: {
        color: theme === 'contrast' ? '#fbbf24' : typeColors[item.type] || '#cbd5e1',
        lineHeight: 1.5,
        background: rtpCurrentIndex === idx ? theme === 'contrast' ? '#333300' : '#7c3aed33' : 'none'
      },
      role: "button",
      tabIndex: 0,
      "aria-label": t('read_this_page.item_aria', {
        text: itemText
      }) || `Click to hear: ${itemText}`,
      onKeyDown: e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleItemClick(idx);
        }
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "me-1",
      "aria-hidden": "true"
    }, typeIcons[item.type] || '\u{1F50A}'), itemText);
  })), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-xs border-t",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155',
      color: secondaryTextColor
    }
  }, t('read_this_page.footer_stats', {
    count: items.length,
    state: focusNarrationEnabled ? t('read_this_page.narration_on') || 'ON' : t('read_this_page.narration_off') || 'OFF'
  }) || `${items.length} items · Click any item to hear it · Tab narration ${focusNarrationEnabled ? 'ON' : 'OFF'}`));
}
window.AlloModules.AiBackendSettingsView = AiBackendSettingsView;
window.AlloModules.LmsAuditBannerView = LmsAuditBannerView;
window.AlloModules.ReadThisPagePanelView = ReadThisPagePanelView;
window.AlloModules.ColdPathSurfaces = window.AlloModules.AiBackendSettingsView;
console.log('[CDN] ColdPathSurfaces loaded');
})();

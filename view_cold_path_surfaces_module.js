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
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
    } catch (_) {
      return {};
    }
  };
  const managed = window.ALLOFLOW_MANAGED_AI_POLICY;
  const managedSearchOff = managed != null && (managed.version !== 1 || managed.allowExternalSearch !== true);
  const [key, setKey] = React.useState(() => String(read().serperApiKey || ''));
  const [enabled, setEnabled] = React.useState(() => read().allobotWebSearch === true || read().allobotWebSearch !== false && (!read().backend || read().backend === 'gemini'));
  const [saved, setSaved] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const save = patch => {
    try {
      localStorage.setItem('alloflow_ai_config', JSON.stringify({
        ...read(),
        ...patch
      }));
      setSaved(true);
      setFailed(false);
    } catch (_) {
      setFailed(true);
      setSaved(false);
    }
  };
  return /*#__PURE__*/React.createElement("section", {
    "aria-label": tx('chat_guide.search_settings', 'Allobot web sources'),
    className: "border-t border-slate-200 pt-4 space-y-2 text-slate-800"
  }, managed != null && /*#__PURE__*/React.createElement("p", {
    role: "status",
    className: "text-xs"
  }, tx('chat_guide.managed_policy', 'Managed AI restrictions are active. Requests to unapproved endpoints or credentials are blocked. This policy currently permits approved text connections only; media generation is disabled. Your administrator controls external research access.')), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-sm"
  }, tx('chat_guide.search_settings', 'Allobot web sources')), /*#__PURE__*/React.createElement("label", {
    className: "flex items-start gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    className: "mt-1",
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
    onChange: event => {
      setKey(event.target.value);
      setSaved(false);
    },
    className: "w-full min-w-0 rounded-lg border border-slate-300 p-2 text-slate-900 bg-white"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm",
    onClick: () => save({
      serperApiKey: key.trim()
    })
  }, tx('chat_guide.save_search_key', 'Save search key')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "min-h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm",
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
  }, tx('chat_guide.search_privacy_help', 'Serper is outside your district Google environment. External search accepts approved public topics and standard codes only; other queries are blocked. A personal key does not change this restriction. Ordinary Allobot replies send your current question; you can include recent messages or a reviewed excerpt for one reply. Other generation workflows use their task inputs. Use a district-approved connection for student information. A Gemini API key alone does not establish district coverage. Local AI requires this lookup option to be enabled.')));
}

// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

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
  return /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === 'Escape') e.currentTarget.click();
    },
    className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300",
    onClick: () => setShowAIBackendModal(false),
    "aria-label": t('common.close') || 'Close'
  }, /*#__PURE__*/React.createElement("div", {
    ref: aiBackendModalRef,
    className: "bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative border-4 border-violet-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "ai-backend-canvas-title",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAIBackendModal(false),
    className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10",
    "aria-label": t('common.close') || "Close"
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-5 text-violet-900"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-violet-100 p-2 rounded-full"
  }, /*#__PURE__*/React.createElement(Settings, {
    size: 20,
    className: "text-violet-600"
  })), /*#__PURE__*/React.createElement("h3", {
    id: "ai-backend-canvas-title",
    className: "font-black text-lg"
  }, t('canvas_settings.title') || 'AI Settings & Diagnostics')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement(AllobotSearchSettings, {
    t: t
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5"
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
      const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
      localStorage.setItem('alloflow_ai_config', JSON.stringify({
        ...current,
        wolframAppId: e.target.value
      }));
    },
    className: "w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mt-1"
  }, t('canvas_settings.wolfram_hint') || 'Free: 2,000 queries/month. Adds exact math solving and step-by-step verification')), window.AlloModules && window.AlloModules.ModelDiagnosticsSection && React.createElement(window.AlloModules.ModelDiagnosticsSection, {
    t,
    _isCanvasEnv,
    GEMINI_MODELS
  }), window.AlloModules && window.AlloModules.PlatformDiagnosticsSection && React.createElement(window.AlloModules.PlatformDiagnosticsSection, {
    t
  }), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 pt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5"
  }, t('canvas_settings.device_storage_label') || 'Device Storage'), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mb-2"
  }, t('canvas_settings.device_storage_hint2') || 'Open your saved resource packs to restore, pin, export, or erase them. Everything is kept on this device only, nothing goes to a server.'), /*#__PURE__*/React.createElement("button", {
    onClick: openCanvasRecoveryManager,
    className: "bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
  }, "\uD83D\uDDC2\uFE0F ", t('canvas_settings.device_storage_btn2') || 'Open saved work')), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 pt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5"
  }, t('canvas_settings.diagnostics_label') || 'Diagnostics & Logs'), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mb-2"
  }, t('canvas_settings.diagnostics_hint') || 'View captured errors and the read-aloud (text-to-speech) activity trace — useful when audio stalls without a visible error.'), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      if (typeof window.__alloOpenDiagnosticsLog !== 'function') return;
      let hasErrors = false;
      try {
        hasErrors = (window.AlloModules.ErrorReporter.getBuffer() || []).length > 0;
      } catch (e) {}
      window.__alloOpenDiagnosticsLog(hasErrors ? 'errors' : 'tts');
    },
    className: "bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
  }, "\uD83E\uDE7A ", t('canvas_settings.diagnostics_btn') || 'Open error & read-aloud log')), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAIBackendModal(false),
    className: "bg-violet-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 active:scale-95"
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
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-green-700 to-emerald-700 text-white px-4 py-3 z-[500]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-sm"
  }, "\u267F ", t(lmsAuditUrls.length === 1 ? 'lms.queued_one' : 'lms.queued_other', {
    count: lmsAuditUrls.length
  }) || `${lmsAuditUrls.length} document${lmsAuditUrls.length !== 1 ? 's' : ''} queued from LMS`), /*#__PURE__*/React.createElement("button", {
    onClick: () => setLmsAuditUrls([]),
    className: "bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md text-xs transition-colors"
  }, t('lms.dismiss_button') || 'Dismiss')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, lmsAuditUrls.map((url, i) => {
    let name = `Document ${i + 1}`;
    try {
      const parsedUrl = new URL(url, window.location.href);
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
      key: i,
      onClick: async () => {
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
      className: "bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("span", {
      className: "bg-white/20 px-1 py-0.5 rounded text-[11px] font-bold"
    }, name.split('.').pop()?.toUpperCase() || 'FILE'), /*#__PURE__*/React.createElement("span", {
      className: "max-w-[200px] truncate"
    }, name));
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] opacity-70 mt-2"
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
  const items = getReadableContent();
  const typeColors = {
    heading: '#f59e0b',
    text: '#94a3b8',
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
  const handleReadAll = () => readAllReadThisPage();
  const handleStop = () => stopReadThisPage();
  const handleItemClick = idx => _readThisPageItemAt(idx);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed top-16 right-4 z-[45] w-[360px] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl shadow-2xl border-s-4 border-purple-500 overflow-hidden animate-in slide-in-from-right-5 duration-300",
    style: {
      background: theme === 'contrast' ? '#000' : '#0f172a',
      color: theme === 'contrast' ? '#fbbf24' : '#e2e8f0',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '12px'
    },
    ref: rtpPanelRef,
    tabIndex: -1,
    "aria-busy": rtpPlaybackState === 'reading',
    role: "complementary",
    "aria-label": t('read_this_page.panel_aria') || 'Read This Page panel'
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between p-3 border-b",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 font-black text-sm"
  }, /*#__PURE__*/React.createElement(Ear, {
    size: 16,
    className: "text-purple-700"
  }), /*#__PURE__*/React.createElement("span", null, t('read_this_page.title') || 'Read This Page')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("button", {
    id: "rtp-read-all-btn",
    onClick: handleReadAll,
    className: "px-3 py-1 rounded-lg text-white text-[11px] font-bold transition-colors hover:brightness-110",
    style: {
      background: rtpPlaybackState === 'reading' ? '#16a34a' : '#7c3aed'
    },
    "aria-pressed": rtpPlaybackState === 'reading'
  }, '\u25B6', " ", t('read_this_page.read_all_button') || 'Read All'), /*#__PURE__*/React.createElement("button", {
    onClick: handleStop,
    className: "px-2 py-1 rounded-lg text-white text-[11px] font-bold hover:bg-red-600 transition-colors",
    style: {
      background: '#dc2626'
    }
  }, '\u23F9', " ", t('read_this_page.stop_button') || 'Stop'), /*#__PURE__*/React.createElement("button", {
    onClick: closeReadThisPage,
    "aria-label": (t('common.close') || 'Close') + ': ' + (t('read_this_page.title') || 'Read This Page'),
    className: "ms-1 px-2 py-1 rounded-lg text-slate-600 hover:text-white hover:bg-slate-700 transition-colors text-[11px] font-bold"
  }, '\u2715'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 px-3 py-2 border-b",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155'
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 cursor-pointer select-none flex-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: focusNarrationEnabled,
    onChange: e => setFocusNarrationEnabled(e.target.checked),
    className: "w-4 h-4 rounded accent-purple-500",
    "aria-describedby": "focus-narration-sr-warning"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold"
  }, t('read_this_page.focus_narration_label') || 'Keyboard Focus Narration')), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600"
  }, focusNarrationEnabled ? t('read_this_page.focus_narration_on_hint') || 'Tab to hear controls' : t('common.off') || 'Off')), focusNarrationEnabled && /*#__PURE__*/React.createElement("div", {
    id: "focus-narration-sr-warning",
    role: "note",
    className: "px-3 py-1.5 text-[11px] border-b",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155',
      color: theme === 'contrast' ? '#fbbf24' : '#fbbf24',
      background: theme === 'contrast' ? '#000' : 'rgba(251,191,36,0.1)'
    }
  }, t('read_this_page.focus_narration_sr_warning') || '⚠ If you use a screen reader (NVDA, JAWS, VoiceOver), turn this off to avoid double-announcements.'), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-2 space-y-1",
    style: {
      maxHeight: 'calc(100vh - 12rem)'
    }
  }, items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    "data-rtp-idx": idx,
    onClick: () => handleItemClick(idx),
    className: "px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5",
    style: {
      color: typeColors[item.type] || '#94a3b8',
      lineHeight: 1.5,
      background: rtpCurrentIndex === idx ? '#7c3aed33' : 'none'
    },
    role: "button",
    tabIndex: 0,
    "aria-label": t('read_this_page.item_aria', {
      text: item.text.substring(0, 80)
    }) || `Click to hear: ${item.text.substring(0, 80)}`,
    onKeyDown: e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleItemClick(idx);
      }
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "me-1"
  }, typeIcons[item.type] || '\u{1F50A}'), item.text))), /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2 text-[11px] text-slate-600 border-t",
    style: {
      borderColor: theme === 'contrast' ? '#fbbf24' : '#334155'
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

// Auto-extracted cold-path view source. Edit this file, then rebuild its CDN module.

// Extracted from AlloFlowANTI.txt (ai-backend-settings).
function AiBackendSettingsView(props) {
  const { GEMINI_MODELS, Settings, X, _isCanvasEnv, aiBackendModalRef, openCanvasRecoveryManager, setShowAIBackendModal, t } = props;
  return (
<div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.click(); }} className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowAIBackendModal(false)} aria-label={t('common.close') || 'Close'}>
          <div ref={aiBackendModalRef} className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full relative border-4 border-violet-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="ai-backend-canvas-title" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAIBackendModal(false)} className="absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10" aria-label={t('common.close') || "Close"}><X size={20}/></button>
            <div className="flex items-center gap-2 mb-5 text-violet-900">
                <div className="bg-violet-100 p-2 rounded-full"><Settings size={20} className="text-violet-600"/></div>
                <h3 id="ai-backend-canvas-title" className="font-black text-lg">{t('canvas_settings.title') || 'AI Settings & Diagnostics'}</h3>
            </div>
            <div className="space-y-4">
                {/* Web search key. This REPLACED a "Google Search API Key" field that
                    wrote cseApiKey to localStorage and was read by nothing: Google
                    Programmable Search is not part of WebSearchProvider's chain, and
                    its only consumer (testCSE) called a helper that never existed.
                    Serper.dev IS the transport the search chain uses. */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('canvas_settings.serper_label') || 'Web Search API Key (Serper.dev)'} <span className="normal-case font-normal text-slate-600">{t('common.optional_parenthetical') || '(optional)'}</span></label>
                    <input
                        id="ai-canvas-serper-key" aria-label={t('canvas_settings.serper_label') || 'Web Search API Key (Serper.dev)'}
                        type="password"
                        autoComplete="off"
                        placeholder={t('canvas_settings.serper_placeholder') || 'Your serper.dev API key...'}
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').serperApiKey || ''; } catch { return ''; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, serperApiKey: e.target.value.trim() }));
                        }}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
                    />
                    <p className="text-[11px] text-slate-600 mt-1">{t('canvas_settings.serper_hint') || 'Gemini Canvas cannot use Google grounding, so standards lookup and Research with Web Search need a key here (serper.dev, 2,500 free searches). Stored in this browser only. Without it those features fall back to AI knowledge, clearly labelled as not web-verified.'}</p>
                    <button type="button"
                        onClick={() => { try { if (window.__alloOpenDiagnosticsLog) window.__alloOpenDiagnosticsLog('search'); } catch (e) {} }}
                        className="mt-1.5 text-[11px] font-bold text-violet-700 hover:text-violet-900 underline"
                    >
                        🔎 {t('canvas_settings.search_diagnostics_btn') || 'Test web search & view diagnostics'}
                    </button>
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('canvas_settings.wolfram_label') || 'Wolfram Alpha App ID'} <span className="normal-case font-normal text-slate-600">{t('common.optional_parenthetical') || '(optional)'}</span></label>
                    <input
                        id="ai-canvas-wolfram" aria-label={t('canvas_settings.wolfram_label') || 'Wolfram Alpha App ID'}
                        type="text"
                        placeholder={t('canvas_settings.wolfram_placeholder') || 'XXXXX-XXXXXXXXXX (from developer.wolframalpha.com)'}
                        defaultValue={(() => { try { return JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}').wolframAppId || ''; } catch { return ''; } })()}
                        onChange={(e) => {
                            const current = JSON.parse(localStorage.getItem('alloflow_ai_config') || '{}');
                            localStorage.setItem('alloflow_ai_config', JSON.stringify({ ...current, wolframAppId: e.target.value }));
                        }}
                        className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 outline-none text-sm font-medium text-slate-700"
                    />
                    <p className="text-[11px] text-slate-600 mt-1">{t('canvas_settings.wolfram_hint') || 'Free: 2,000 queries/month. Adds exact math solving and step-by-step verification'}</p>
                </div>
                {/* AI Model Diagnostics (shared component — same one used in the deploy modal) */}
                {window.AlloModules && window.AlloModules.ModelDiagnosticsSection && React.createElement(window.AlloModules.ModelDiagnosticsSection, {
                    t, _isCanvasEnv, GEMINI_MODELS
                })}
                {window.AlloModules && window.AlloModules.PlatformDiagnosticsSection && React.createElement(window.AlloModules.PlatformDiagnosticsSection, {
                    t
                })}
                {/* Device storage.
                    N5 (2026-08-16): this button called __alloOpenDeviceStorageProbe — the
                    DEVELOPMENT probe popup (Run probe / Open review page / View app data),
                    built to test whether Canvas storage survives a reload. A teacher who
                    pressed a button labelled "Manage device storage" got a diagnostic
                    harness that confirms storage works and shows none of their saved work.
                    The sibling copy of this panel in view_misc_modals was fixed in July;
                    this one, the copy Canvas actually shows, was missed.
                    It now opens the Storage and recovery manager, which IS the resource
                    pack history: every saved workspace with its resource count, restore,
                    pin, export, erase, retention policy, and the cached remediation. The
                    probe moved to Platform Diagnostics with an honest label, and
                    Ctrl+Alt+Shift+D still reaches it. */}
                <div className="border-t border-slate-100 pt-4">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('canvas_settings.device_storage_label') || 'Device Storage'}</label>
                    <p className="text-[11px] text-slate-600 mb-2">{t('canvas_settings.device_storage_hint2') || 'Open your saved resource packs to restore, pin, export, or erase them. Everything is kept on this device only, nothing goes to a server.'}</p>
                    <button
                        onClick={openCanvasRecoveryManager}
                        className="bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
                    >
                        🗂️ {t('canvas_settings.device_storage_btn2') || 'Open saved work'}
                    </button>
                </div>
                {/* Diagnostics & logs (2026-07-20): always-available entry into the
                    Error Reporter — the red badge only appears AFTER an error is
                    captured, but a stuck read-aloud rarely throws. Opens straight
                    to the read-aloud/TTS trace tab when no errors are buffered. */}
                <div className="border-t border-slate-100 pt-4">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">{t('canvas_settings.diagnostics_label') || 'Diagnostics & Logs'}</label>
                    <p className="text-[11px] text-slate-600 mb-2">{t('canvas_settings.diagnostics_hint') || 'View captured errors and the read-aloud (text-to-speech) activity trace — useful when audio stalls without a visible error.'}</p>
                    <button
                        onClick={() => {
                            if (typeof window.__alloOpenDiagnosticsLog !== 'function') return;
                            let hasErrors = false;
                            try { hasErrors = (window.AlloModules.ErrorReporter.getBuffer() || []).length > 0; } catch (e) {}
                            window.__alloOpenDiagnosticsLog(hasErrors ? 'errors' : 'tts');
                        }}
                        className="bg-white text-violet-700 border-2 border-violet-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-violet-50 transition-colors active:scale-95"
                    >
                        🩺 {t('canvas_settings.diagnostics_btn') || 'Open error & read-aloud log'}
                    </button>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        onClick={() => setShowAIBackendModal(false)}
                        className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 active:scale-95"
                    >
                        {t('common.done') || 'Done'}
                    </button>
                </div>
            </div>
          </div>
        </div>
  );
}

// Extracted from AlloFlowANTI.txt (lms-audit-banner).
function LmsAuditBannerView(props) {
  const { addToast, isPdfDocumentIntakeCurrent, lmsAuditFetchControllerRef, lmsAuditUrls, setGenerationStep, setIsExtracting, setLmsAuditUrls, setPdfAuditResult, setPendingPdfBase64, setPendingPdfFile, startNewPdfAudit, t } = props;
  return (
<div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 z-[500]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">♿ {t(lmsAuditUrls.length === 1 ? 'lms.queued_one' : 'lms.queued_other', { count: lmsAuditUrls.length }) || `${lmsAuditUrls.length} document${lmsAuditUrls.length !== 1 ? 's' : ''} queued from LMS`}</span>
            <button onClick={() => setLmsAuditUrls([])} className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-md text-xs transition-colors">{t('lms.dismiss_button') || 'Dismiss'}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {lmsAuditUrls.map((url, i) => {
              let name = `Document ${i + 1}`;
              try {
                const parsedUrl = new URL(url, window.location.href);
                const encodedName = parsedUrl.pathname.split('/').filter(Boolean).pop() || '';
                try { name = decodeURIComponent(encodedName) || name; } catch (_) { name = encodedName || name; }
              } catch (_) {
                const rawName = String(url || '').split('/').pop().split('?')[0];
                name = rawName || name;
              }
              return (
                <button key={i} onClick={async () => {
                  const documentIntakeEpoch = startNewPdfAudit();
                  const fetchController = typeof AbortController !== 'undefined' ? new AbortController() : null;
                  lmsAuditFetchControllerRef.current = fetchController;
                  let fetchTimedOut = false;
                  const fetchTimeout = setTimeout(() => { fetchTimedOut = true; try { fetchController?.abort(); } catch (_) {} }, 30000);
                  setIsExtracting(true);
                  setGenerationStep(t('status_steps.extracting_text'));
                  try {
                    addToast(t('lms.fetching', { name }) || `Fetching ${name}...`, 'info');
                    const resp = await fetch(url, fetchController ? { signal: fetchController.signal } : undefined);
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
                          try { await streamReader.cancel(); } catch (_) {}
                          throw new Error('The document is larger than the 30 MB safety limit.');
                        }
                        chunks.push(part.value);
                      }
                      blob = new Blob(chunks, { type: responseType || 'application/octet-stream' });
                    } else blob = await resp.blob();
                    if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;
                    if (blob.size > 30 * 1024 * 1024) throw new Error('The document is larger than the 30 MB safety limit.');
                    // The fetch timer owns only network/body acquisition. Once the Blob is complete,
                    // FileReader's separate timer below owns conversion and visible error cleanup.
                    clearTimeout(fetchTimeout);
                    const failLmsRead = (message) => {
                      if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;
                      setIsExtracting(false);
                      setGenerationStep('');
                      addToast(message, 'error');
                    };
                    await new Promise((resolveRead) => {
                      const reader = new FileReader();
                      let readSettled = false;
                      let readTimeout = null;
                      const onFetchAbort = () => {
                        if (readSettled) return;
                        settleRead();
                        try { if (reader.readyState === 1) reader.abort(); } catch (_) {}
                      };
                      const settleRead = () => {
                        if (readSettled) return;
                        readSettled = true;
                        if (readTimeout) clearTimeout(readTimeout);
                        try { fetchController?.signal.removeEventListener('abort', onFetchAbort); } catch (_) {}
                        resolveRead();
                      };
                      const failRead = (message) => {
                        if (readSettled) return;
                        failLmsRead(message);
                        settleRead();
                        try { if (reader.readyState === 1) reader.abort(); } catch (_) {}
                      };
                      reader.onload = () => {
                        if (readSettled || !isPdfDocumentIntakeCurrent(documentIntakeEpoch)) { settleRead(); return; }
                        const result = reader.result;
                        const base64 = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : '';
                        if (!base64) { failRead('The downloaded document was empty.'); return; }
                        const looksPdf = responseType.includes('application/pdf') || /\.pdf$/i.test(name);
                        if (looksPdf) {
                          let header = '';
                          try { header = atob(base64.slice(0, 1400)); } catch (_) {}
                          if (!header.includes('%PDF-')) { failRead('The LMS response was not a valid PDF. Sign in to the LMS in this browser, then try again.'); return; }
                        }
                        setPendingPdfBase64(base64);
                        setPendingPdfFile({ name, size: blob.size, type: blob.type || responseType });
                        setPdfAuditResult({ _choosing: true, fileName: name, fileSize: blob.size });
                        setLmsAuditUrls(prev => prev.filter((item) => item !== url));
                        setIsExtracting(false);
                        setGenerationStep('');
                        addToast(t('lms.loaded_ready', { name }) || `${name} loaded — ready for audit`, 'success');
                        settleRead();
                      };
                      reader.onerror = () => failRead('The downloaded document could not be read.');
                      reader.onabort = () => { if (readSettled) return; if (isPdfDocumentIntakeCurrent(documentIntakeEpoch)) failRead('The downloaded document read was cancelled.'); else settleRead(); };
                      try { fetchController?.signal.addEventListener('abort', onFetchAbort, { once: true }); } catch (_) {}
                      readTimeout = setTimeout(() => failRead('The downloaded document could not be read within 30 seconds.'), 30000);
                      try { reader.readAsDataURL(blob); } catch (err) { failRead(err?.message || 'The downloaded document could not be read.'); }
                    });
                  } catch (err) {
                    if (!isPdfDocumentIntakeCurrent(documentIntakeEpoch)) return;
                    setIsExtracting(false);
                    setGenerationStep('');
                    const reason = fetchTimedOut ? 'The download timed out after 30 seconds.' : (err?.message || 'Unknown download error');
                    addToast(t('lms.fetch_failed', { name, error: reason }) || `Failed to fetch ${name}: ${reason}. The file may require LMS authentication.`, 'error');
                  } finally {
                    clearTimeout(fetchTimeout);
                    if (lmsAuditFetchControllerRef.current === fetchController) lmsAuditFetchControllerRef.current = null;
                  }
                }} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5">
                  <span className="bg-white/20 px-1 py-0.5 rounded text-[11px] font-bold">{name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                  <span className="max-w-[200px] truncate">{name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] opacity-70 mt-2">{t('lms.audit_queue_help') || 'Click a document to fetch and load it into the accessibility pipeline. Some LMS files may require you to be logged in to the LMS in this browser.'}</p>
        </div>
  );
}

// Extracted from AlloFlowANTI.txt (read-this-page-panel).
function ReadThisPagePanelView(props) {
  const { Ear, _readThisPageItemAt, closeReadThisPage, focusNarrationEnabled, getReadableContent, readAllReadThisPage, rtpCurrentIndex, rtpPanelRef, rtpPlaybackState, setFocusNarrationEnabled, stopReadThisPage, t, theme } = props;
          const items = getReadableContent();
          const typeColors = { heading: '#f59e0b', text: '#94a3b8', status: '#a78bfa', term: '#38bdf8', question: '#f472b6', option: '#60a5fa' };
          const typeIcons = { heading: '\u{1F4E2}', text: '\u{1F4C4}', status: '\u{1F4CD}', term: '\u{1F4D6}', question: '\u{2753}', option: '\u{1F520}' };
          const handleReadAll = () => readAllReadThisPage();
          const handleStop = () => stopReadThisPage();
          const handleItemClick = (idx) => _readThisPageItemAt(idx);
          return (
              <div className="fixed top-16 right-4 z-[45] w-[360px] max-h-[calc(100vh-5rem)] flex flex-col rounded-2xl shadow-2xl border-s-4 border-purple-500 overflow-hidden animate-in slide-in-from-right-5 duration-300"
                  style={{ background: theme === 'contrast' ? '#000' : '#0f172a', color: theme === 'contrast' ? '#fbbf24' : '#e2e8f0', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}
                  ref={rtpPanelRef} tabIndex={-1} aria-busy={rtpPlaybackState === 'reading'}
                  role="complementary" aria-label={t('read_this_page.panel_aria') || 'Read This Page panel'}
              >
                  {/* Header */}
                  <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: theme === 'contrast' ? '#fbbf24' : '#334155' }}>
                      <div className="flex items-center gap-2 font-black text-sm">
                          <Ear size={16} className="text-purple-700" />
                          <span>{t('read_this_page.title') || 'Read This Page'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                          <button id="rtp-read-all-btn" onClick={handleReadAll}
                              className="px-3 py-1 rounded-lg text-white text-[11px] font-bold transition-colors hover:brightness-110"
                              style={{ background: rtpPlaybackState === 'reading' ? '#16a34a' : '#7c3aed' }}
                              aria-pressed={rtpPlaybackState === 'reading'}
                          >{'\u25B6'} {t('read_this_page.read_all_button') || 'Read All'}</button>
                          <button onClick={handleStop}
                              className="px-2 py-1 rounded-lg text-white text-[11px] font-bold hover:bg-red-600 transition-colors"
                              style={{ background: '#dc2626' }}
                          >{'\u23F9'} {t('read_this_page.stop_button') || 'Stop'}</button>
                          <button onClick={closeReadThisPage}
                              aria-label={(t('common.close') || 'Close') + ': ' + (t('read_this_page.title') || 'Read This Page')}
                              className="ms-1 px-2 py-1 rounded-lg text-slate-600 hover:text-white hover:bg-slate-700 transition-colors text-[11px] font-bold"
                          >{'\u2715'}</button>
                      </div>
                  </div>
                  {/* Focus Narration Toggle */}
                  {/* This feature is for users WITHOUT a real screen reader (struggling
                      readers, ELL students, low-vision users using a magnifier). If a
                      genuine SR (NVDA/JAWS/VoiceOver) is already running, this WILL
                      double-narrate every focused control. There's no reliable browser
                      API to detect a screen reader, so we render an inline warning
                      below the label so the user can make an informed call. */}
                  <div className="flex items-center gap-3 px-3 py-2 border-b" style={{ borderColor: theme === 'contrast' ? '#fbbf24' : '#334155' }}>
                      <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                          <input type="checkbox" checked={focusNarrationEnabled} onChange={(e) => setFocusNarrationEnabled(e.target.checked)}
                              className="w-4 h-4 rounded accent-purple-500"
                              aria-describedby="focus-narration-sr-warning"
                          />
                          <span className="text-[11px] font-bold">{t('read_this_page.focus_narration_label') || 'Keyboard Focus Narration'}</span>
                      </label>
                      <span className="text-[11px] text-slate-600">{focusNarrationEnabled ? (t('read_this_page.focus_narration_on_hint') || 'Tab to hear controls') : (t('common.off') || 'Off')}</span>
                  </div>
                  {focusNarrationEnabled && (
                      <div id="focus-narration-sr-warning" role="note" className="px-3 py-1.5 text-[11px] border-b" style={{ borderColor: theme === 'contrast' ? '#fbbf24' : '#334155', color: theme === 'contrast' ? '#fbbf24' : '#fbbf24', background: theme === 'contrast' ? '#000' : 'rgba(251,191,36,0.1)' }}>
                          {t('read_this_page.focus_narration_sr_warning') || '⚠ If you use a screen reader (NVDA, JAWS, VoiceOver), turn this off to avoid double-announcements.'}
                      </div>
                  )}
                  {/* Content Items */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
                      {items.map((item, idx) => (
                          <div key={idx} data-rtp-idx={idx}
                              onClick={() => handleItemClick(idx)}
                              className="px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                              style={{ color: typeColors[item.type] || '#94a3b8', lineHeight: 1.5, background: rtpCurrentIndex === idx ? '#7c3aed33' : 'none' }}
                              role="button" tabIndex={0}
                              aria-label={t('read_this_page.item_aria', { text: item.text.substring(0, 80) }) || `Click to hear: ${item.text.substring(0, 80)}`}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(idx); } }}
                          >
                              <span className="me-1">{typeIcons[item.type] || '\u{1F50A}'}</span>
                              {item.text}
                          </div>
                      ))}
                  </div>
                  {/* Footer Stats */}
                  <div className="px-3 py-2 text-[11px] text-slate-600 border-t" style={{ borderColor: theme === 'contrast' ? '#fbbf24' : '#334155' }}>
                      {t('read_this_page.footer_stats', { count: items.length, state: focusNarrationEnabled ? (t('read_this_page.narration_on') || 'ON') : (t('read_this_page.narration_off') || 'OFF') }) || `${items.length} items · Click any item to hear it · Tab narration ${focusNarrationEnabled ? 'ON' : 'OFF'}`}
                  </div>
              </div>
          );
}

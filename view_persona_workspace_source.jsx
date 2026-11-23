// AlloFlow Persona workspace presentation. State, persistence, and actions stay in the host.
function PersonaWorkspaceView({
  ErrorBoundary,
  t,
  isProcessing,
  isGeneratingPersona,
  History,
  personaState,
  setPersonaState,
  isTeacherMode,
  normalizePersonaResumeDays,
  clearPersonaResumeSnapshots,
  addToast,
  generatedContent,
  extractPersonaGroundingDisclosure,
  Sparkles,
  handleTogglePanelSelection,
  openPersonaTeacherEditor,
  handleSelectPersona,
  MessageCircleQuestion,
  CheckCircle2,
  Plus,
  handleStartPanelChat,
  RefreshCw,
  Users,
  personaTeacherEditor,
  setPersonaTeacherEditor,
  personaTeacherEditorRef,
  updatePersonaTeacherEditor,
  getPersonaVoiceOptions,
  savePersonaTeacherEditor
}) {
  const safeT = (key, params) => {
    try {
      if (typeof t !== 'function') return '';
      const out = t(key, params);
      return typeof out === 'string' ? out : '';
    } catch (_) {
      return '';
    }
  };
  const workspaceLabel = (key, fallback, params = {}) => {
    const value = safeT('persona.workspace.' + key, params);
    return value && value !== 'persona.workspace.' + key ? value : fallback;
  };
  const safeExternalUrl = (raw) => {
    const str = String(raw == null ? '' : raw).trim();
    if (!str || /[\u0000-\u001F\u007F]/.test(str)) return '';
    if (!/^https?:\/\/[^@\s\\/?#<>]+(?::\d{1,5})?(?:[/?#]|$)/i.test(str)) return '';
    return str;
  };
  const stripControlChars = (raw) => String(raw == null ? '' : raw).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const crisisPattern = /\b(?:kill\s+myself|end\s+my\s+life|commit\s+suicide|suicid(?:e|al)|want\s+to\s+die|hurt\s+myself|self[\s-]?harm|cut\s+myself|overdose\s+on)\b/i;
  const getEditorFocusables = (dialog) => {
    if (!dialog || typeof dialog.querySelectorAll !== 'function') return [];
    return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter((el) => {
      if (el.disabled || el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
      if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      const closedDetails = el.closest('details:not([open])');
      if (closedDetails && !(el.tagName === 'SUMMARY' && el.parentElement === closedDetails)) return false;
      const view = dialog.ownerDocument && dialog.ownerDocument.defaultView;
      if (view && typeof view.getComputedStyle === 'function') {
        for (let cur = el; cur && cur !== dialog; cur = cur.parentElement) {
          const st = view.getComputedStyle(cur);
          if (st && (st.display === 'none' || st.visibility === 'hidden')) return false;
        }
      }
      return true;
    });
  };
  const Boundary = typeof ErrorBoundary === 'function' ? ErrorBoundary : (p) => p.children;
  const safePersonaState = (personaState && typeof personaState === 'object') ? personaState : { mode: 'single', selectedCharacters: [] };
  const safeMode = safePersonaState.mode === 'panel' ? 'panel' : 'single';
  const candidateList = Array.isArray(generatedContent?.data)
    ? generatedContent.data.filter((item) => item && typeof item === 'object')
    : [];
  const selectedPanelList = Array.isArray(safePersonaState.selectedCharacters)
    ? safePersonaState.selectedCharacters.filter((item) => item && typeof item === 'object')
    : [];
  const safeVoiceOptions = (() => {
    try {
      const list = typeof getPersonaVoiceOptions === 'function' ? getPersonaVoiceOptions() : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  })();
  const editorQuests = Array.isArray(personaTeacherEditor?.quests) ? personaTeacherEditor.quests.filter((q) => q && typeof q === 'object') : [];
  const editorCrisisDetected = !!personaTeacherEditor && (
    crisisPattern.test(String(personaTeacherEditor.role || '')) ||
    crisisPattern.test(String(personaTeacherEditor.context || '')) ||
    crisisPattern.test(String(personaTeacherEditor.guardrails || '')) ||
    editorQuests.some((q) => crisisPattern.test(String(q.text || '')))
  );
  return (
<Boundary fallbackMessage={safeT('persona.error_boundary_fallback')}>
                    <div className="h-full min-h-0 min-w-0 flex flex-col relative" data-help-key="persona_panel" aria-busy={isProcessing || isGeneratingPersona}>
                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-2 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-sm">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center border-2 border-yellow-200 text-yellow-700 shrink-0" aria-hidden="true">
                                    <History size={20} aria-hidden="true" />
                                </div>
                                <div className="text-start flex-grow">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-black text-slate-800 leading-tight">{safeT('persona.setup_title')}</h2>
                                        {candidateList.length > 0 && (
                                            <span data-persona-roster-count className="inline-flex items-center rounded-full border border-yellow-300 bg-white px-2.5 py-0.5 text-xs font-bold text-yellow-900">
                                                {candidateList.length} {candidateList.length === 1 ? workspaceLabel('figure_one', 'figure') : workspaceLabel('figure_many', 'figures')}
                                                {safeMode === 'panel' ? ` · ${selectedPanelList.length}/2` : ''}
                                            </span>
                                        )}
                                    </div>
                                    <p data-persona-mode-guide className="text-slate-600 text-xs leading-relaxed max-w-lg mt-1">
                                        {safeMode === 'single'
                                            ? workspaceLabel('single_guide', 'Choose one figure to explore their ideas and ask follow-up questions.')
                                            : workspaceLabel('panel_guide', 'Choose two figures to compare perspectives, ask both a question, and explore where their ideas differ.')
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex bg-white/60 p-1 rounded-lg border border-yellow-200 shrink-0">
                                <button type="button"
                                    aria-pressed={safeMode === 'single'}
                                    aria-label={safeT('persona.mode_single') || 'Single interview'}
                                    disabled={isProcessing || isGeneratingPersona}
                                    onClick={() => {
                                        if (isProcessing || isGeneratingPersona || typeof setPersonaState !== 'function') return;
                                        setPersonaState(prev => ({ ...(prev || {}), mode: 'single', selectedCharacters: [] }));
                                    }}
                                    className={`min-h-11 px-3 py-1.5 rounded-md text-xs font-bold transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${safeMode === 'single' ? 'bg-white text-yellow-900 shadow-sm ring-1 ring-yellow-200' : 'text-yellow-800 hover:bg-yellow-100'}`}
                                >
                                    {safeT('persona.mode_single')}
                                </button>
                                <button type="button"
                                    aria-pressed={safeMode === 'panel'}
                                    aria-label={safeT('persona.mode_panel') || 'Panel interview'}
                                    disabled={isProcessing || isGeneratingPersona}
                                    onClick={() => {
                                        if (isProcessing || isGeneratingPersona || typeof setPersonaState !== 'function') return;
                                        setPersonaState(prev => ({ ...(prev || {}), mode: 'panel' }));
                                    }}
                                    className={`min-h-11 px-3 py-1.5 rounded-md text-xs font-bold transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${safeMode === 'panel' ? 'bg-white text-yellow-900 shadow-sm ring-1 ring-yellow-200' : 'text-yellow-800 hover:bg-yellow-100'}`}
                                >
                                    {safeT('persona.mode_panel')}
                                </button>
                            </div>
                            {isTeacherMode && (
                                <label className="min-h-11 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-xs font-bold text-slate-700">
                                    <span>{safeT('persona.resume_retention')}</span>
                                    <select
                                        aria-label={safeT('persona.resume_retention')}
                                        disabled={isProcessing || isGeneratingPersona}
                                        defaultValue={(() => { try { return String(typeof normalizePersonaResumeDays === 'function' ? normalizePersonaResumeDays(localStorage.getItem('allo_persona_resume_days')) : 14); } catch (_) { return '14'; } })()}
                                        onChange={async (e) => {
                                            const selectEl = e.currentTarget;
                                            const norm = (val) => (typeof normalizePersonaResumeDays === 'function' ? normalizePersonaResumeDays(val) : 14);
                                            const prevVal = (() => { try { return String(norm(localStorage.getItem('allo_persona_resume_days'))); } catch (_) { return '14'; } })();
                                            try {
                                                const retentionDays = norm(e.target.value);
                                                // Clear existing snapshots BEFORE persisting '0' so a failed clear never leaves '0' saved.
                                                if (retentionDays === 0 && (typeof clearPersonaResumeSnapshots !== 'function' || !(await clearPersonaResumeSnapshots()))) {
                                                    throw new Error('clear failed');
                                                }
                                                localStorage.setItem('allo_persona_resume_days', String(retentionDays));
                                                if (typeof addToast === 'function') addToast(safeT('persona.retention_updated'), 'success');
                                            } catch (_) {
                                                if (selectEl) selectEl.value = prevVal;
                                                if (typeof addToast === 'function') addToast(safeT('persona.retention_update_failed'), 'error');
                                            }
                                        }}
                                        className="min-h-11 rounded border border-slate-300 bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="0">{safeT('persona.retention_off')}</option>
                                        <option value="7">7 {safeT('persona.days')}</option>
                                        <option value="14">14 {safeT('persona.days')}</option>
                                        <option value="30">30 {safeT('persona.days')}</option>
                                    </select>
                                </label>
                            )}
                        </div>
                        {(() => {
                            const sourceBinding = generatedContent?.config?.personaSource;
                            const groundingMetadata = sourceBinding?.groundingMetadata
                                ?? generatedContent?.config?.groundingMetadata;
                            const rawGrounding = (() => {
                                try {
                                    return typeof extractPersonaGroundingDisclosure === 'function'
                                        ? extractPersonaGroundingDisclosure(groundingMetadata)
                                        : { links: [], queries: [] };
                                } catch (_) {
                                    return { links: [], queries: [] };
                                }
                            })();
                            const safeLinks = Array.isArray(rawGrounding?.links)
                                ? rawGrounding.links.map((src) => {
                                    if (!src || typeof src !== 'object') return null;
                                    const href = safeExternalUrl(src.url);
                                    if (!href) return null;
                                    return { url: href, title: String(src.title || '').trim() };
                                }).filter(item => !!item)
                                : [];
                            const safeQueries = Array.isArray(rawGrounding?.queries)
                                ? rawGrounding.queries.map((q) => String(q == null ? '' : q).trim()).filter(item => !!item)
                                : [];
                            const sourceTopic = String(sourceBinding?.topic || '').trim().slice(0, 300);
                            const sourceFingerprint = String(sourceBinding?.fingerprint || '').trim().slice(0, 160);
                            const sourceExcerpt = String(sourceBinding?.excerpt || '').trim().slice(0, 800);
                            if (!sourceBinding && safeLinks.length === 0 && safeQueries.length === 0) return null;
                            const disclosureCount = safeLinks.length + safeQueries.length + (sourceBinding ? 1 : 0);
                            return (
                                <details className="mx-3 mb-2 max-h-40 shrink-0 overflow-auto rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-slate-700">
                                    <summary className="min-h-11 flex items-center cursor-pointer font-bold text-sky-900">
                                        {safeT('persona.verified_sources') || 'Sources and search context'} ({disclosureCount})
                                    </summary>
                                    {sourceBinding && (
                                        <div className="mt-2 rounded-md border border-sky-100 bg-white/70 p-2">
                                            {sourceTopic && <p className="font-bold text-slate-800">{sourceTopic}</p>}
                                            {sourceFingerprint && (
                                                <p role="group" className="mt-1 break-all font-mono text-xs text-slate-600" aria-label={safeT('persona.source_fingerprint') || 'Source fingerprint'}>
                                                    {sourceFingerprint}
                                                </p>
                                            )}
                                            {sourceExcerpt && (
                                                <blockquote className="mt-2 border-s-2 border-sky-200 ps-2 text-slate-600" aria-label={safeT('persona.bound_source_excerpt') || 'Bound lesson source excerpt'}>
                                                    {sourceExcerpt}{String(sourceBinding?.excerpt || '').trim().length > sourceExcerpt.length ? '…' : ''}
                                                </blockquote>
                                            )}
                                        </div>
                                    )}
                                    {safeLinks.length > 0 && (
                                        <ul className="mt-2 list-disc space-y-1 ps-5">
                                            {safeLinks.map((source, sourceIndex) => (
                                                <li key={source.url + '-' + sourceIndex}>
                                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-800 underline decoration-sky-300 hover:text-sky-950">
                                                        {source.title || ('Source ' + (sourceIndex + 1))}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {safeQueries.length > 0 && (
                                        <div className="mt-2">
                                            <p className="font-bold text-slate-700">{safeT('persona.source_queries') || 'Search queries used'}</p>
                                            <ul className="mt-1 list-disc space-y-1 ps-5">
                                                {safeQueries.map((query, queryIndex) => <li key={query + '-' + queryIndex}>{query}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </details>
                            );
                        })()}
                        <div className="flex flex-nowrap gap-4 sm:gap-6 overflow-auto p-3 sm:p-6 custom-scrollbar flex-grow min-h-0 items-start sm:items-center snap-x snap-mandatory z-10 w-full bg-slate-50/50 relative">
                            {isGeneratingPersona && (
                                <div role="status" aria-live="polite" className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin motion-reduce:animate-none"></div>
                                        <Sparkles size={28} aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600 animate-pulse motion-reduce:animate-none" />
                                    </div>
                                    <p className="mt-6 text-lg font-bold text-slate-700">{safeT('persona.identifying')}</p>
                                    <p className="text-sm text-slate-600 mt-1">{safeT('persona.analyzing_historical_figures') || 'Analyzing content for historical figures...'}</p>
                                </div>
                            )}
                            {candidateList.map((persona, idx) => {
                                const isSelectedInPanel = safeMode === 'panel' && selectedPanelList.some(c => c.name === persona.name);
                                return (
                                <div
                                    key={idx}
                                    className={`
                                        min-w-0 w-[min(320px,calc(100vw-2.5rem))] h-[440px] sm:h-[500px] max-h-[75vh] snap-center shrink-0
                                        bg-white rounded-2xl border-2 transition-all motion-reduce:transition-none p-6 flex flex-col relative group overflow-hidden shadow-md duration-300
                                        ${(isProcessing || isGeneratingPersona) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:shadow-xl hover:-translate-y-2 motion-reduce:hover:translate-y-0'}
                                        ${isSelectedInPanel ? 'border-purple-500 ring-4 ring-purple-100' : 'border-slate-100 hover:border-yellow-300'}
                                    `}
                                    data-help-key="persona_card"
                                    data-disabled={(isProcessing || isGeneratingPersona) ? 'true' : undefined}
                                    onClick={(event) => {
                                        if (isProcessing || isGeneratingPersona) return;
                                        if (event && event.target && event.target !== event.currentTarget && typeof event.target.closest === 'function' && event.target.closest('button, a')) return;
                                        if (safeMode === 'panel') { if (typeof handleTogglePanelSelection === 'function') handleTogglePanelSelection(persona); }
                                        else if (typeof handleSelectPersona === 'function') handleSelectPersona(persona);
                                    }}
                                >
                                    <div aria-hidden="true" className="absolute -bottom-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity motion-reduce:transition-none transform group-hover:scale-110 motion-reduce:group-hover:scale-100 duration-500">
                                        <History size={120} aria-hidden="true" className="text-indigo-900"/>
                                    </div>
                                    <div className="mb-4 relative z-10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="inline-block bg-yellow-100 text-yellow-900 text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded border border-yellow-200">
                                                {persona.year}
                                            </span>
                                            {isTeacherMode && (
                                                <button type="button" disabled={isProcessing || isGeneratingPersona} className="min-h-11 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50" onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isProcessing || isGeneratingPersona) return;
                                                    if (typeof openPersonaTeacherEditor === 'function') openPersonaTeacherEditor(persona, idx);
                                                }}>{safeT('common.edit')}</button>
                                            )}
                                        </div>
                                        <h3 className="font-black text-2xl text-slate-800 leading-tight mb-1 group-hover:text-indigo-900 transition-colors motion-reduce:transition-none line-clamp-2">
                                            {persona.name}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider line-clamp-1">
                                            {persona.role}
                                        </p>
                                    </div>
                                    <div className="text-sm text-slate-600 leading-relaxed mb-6 flex-grow relative z-10 border-t border-slate-100 pt-3 overflow-y-auto custom-scrollbar">
                                        {persona.context}
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={(safeMode === 'single' ? (safeT('persona.select') || 'Select Interviewee') : (isSelectedInPanel ? (safeT('persona.selected') || 'Selected') : (safeT('persona.add_to_panel') || 'Add to panel'))) + ': ' + String(persona.name || '')}
                                        aria-pressed={safeMode === 'panel' ? isSelectedInPanel : undefined}
                                        disabled={isProcessing || isGeneratingPersona}
                                        data-help-key="persona_select_button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isProcessing || isGeneratingPersona) return;
                                            if (safeMode === 'single') {
                                                if (typeof handleSelectPersona === 'function') handleSelectPersona(persona);
                                            } else {
                                                if (typeof handleTogglePanelSelection === 'function') handleTogglePanelSelection(persona);
                                            }
                                        }}
                                        className={`min-h-11 w-full py-3 border-2 rounded-xl font-bold text-sm transition-all motion-reduce:transition-none shadow-sm relative z-10 flex items-center justify-center gap-2 group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2
                                        ${safeMode === 'single'
                                            ? 'bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
                                            : isSelectedInPanel
                                                ? 'bg-purple-600 border-purple-600 text-white'
                                                : 'bg-white border-purple-100 text-purple-700 hover:bg-purple-50'}
                                        `}
                                    >
                                        {safeMode === 'single' ? (
                                            <><MessageCircleQuestion size={18} aria-hidden="true" className="group-hover/btn:animate-bounce motion-reduce:animate-none"/> {safeT('persona.select')}</>
                                        ) : (
                                            <>{isSelectedInPanel ? <CheckCircle2 size={18} aria-hidden="true"/> : <Plus size={18} aria-hidden="true"/>} {isSelectedInPanel ? safeT('persona.selected') : safeT('persona.add_to_panel')}</>
                                        )}
                                    </button>
                                </div>
                            )})}
                            {candidateList.length === 0 && (
                                <div className="w-full text-center text-slate-600 py-12 italic">
                                    {safeT('persona.no_candidates')}
                                </div>
                            )}
                        </div>
                        {safeMode === 'panel' && (
                            <div data-persona-panel-selection className="shrink-0 border-t border-purple-200 bg-purple-50 p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="flex-1 min-w-0 text-sm text-purple-900" role="status" aria-live="polite">
                                    <p className="font-bold">{safeT('persona.instruction_panel', { current: selectedPanelList.length })}</p>
                                    <div data-persona-panel-slots className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        {[0, 1].map((slotIdx) => {
                                            const chosen = selectedPanelList[slotIdx];
                                            return (
                                                <span key={slotIdx} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${chosen ? 'border-purple-400 bg-white text-purple-900' : 'border-dashed border-purple-300 bg-purple-100/50 text-purple-700'}`}>
                                                    {chosen ? `${slotIdx + 1}. ${chosen.name}` : workspaceLabel('panel_slot_empty', `Figure ${slotIdx + 1}`)}
                                                </span>
                                            );
                                        })}
                                        {selectedPanelList.length === 2 && (
                                            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                                                ✓ {workspaceLabel('panel_ready', 'Ready')}
                                            </span>
                                        )}
                                    </div>
                                    {selectedPanelList.length > 0 && <p className="mt-1 text-xs leading-relaxed break-words">{selectedPanelList.map(person => person.name).join(' · ')}</p>}
                                </div>
                                <button type="button"
                                    onClick={() => { if (typeof handleStartPanelChat === 'function') handleStartPanelChat(); }}
                                    disabled={selectedPanelList.length !== 2 || isProcessing || isGeneratingPersona} aria-busy={isProcessing || isGeneratingPersona}
                                    className="min-h-11 bg-purple-600 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-purple-700 transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-95 motion-reduce:transform-none shrink-0"
                                >
                                    {(isProcessing || isGeneratingPersona) ? <RefreshCw aria-hidden="true" className="animate-spin motion-reduce:animate-none"/> : <Users aria-hidden="true" size={24}/>}
                                    {safeT('persona.start_panel')}
                                </button>
                            </div>
                        )}
                        {isTeacherMode && personaTeacherEditor && (
                            <div
                                role="presentation"
                                className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
                                onMouseDown={(event) => { if (event.target === event.currentTarget && typeof setPersonaTeacherEditor === 'function') setPersonaTeacherEditor(null); }}
                            >
                                <div
                                    ref={personaTeacherEditorRef}
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="persona-teacher-editor-title"
                                    tabIndex={-1}
                                    onKeyDown={(event) => {
                                        if (event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229) return;
                                        if (event.defaultPrevented) return;
                                        if (event.key === 'Escape' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                                            event.preventDefault();
                                            if (typeof event.stopPropagation === 'function') event.stopPropagation();
                                            if (typeof setPersonaTeacherEditor === 'function') setPersonaTeacherEditor(null);
                                            return;
                                        }
                                        if (event.key === 'Tab' && event.currentTarget) {
                                            const focusables = getEditorFocusables(event.currentTarget);
                                            if (focusables.length > 0) {
                                                const first = focusables[0];
                                                const last = focusables[focusables.length - 1];
                                                const activeEl = event.currentTarget.ownerDocument ? event.currentTarget.ownerDocument.activeElement : undefined;
                                                if (event.shiftKey && (activeEl === first || activeEl === event.currentTarget)) {
                                                    event.preventDefault();
                                                    if (last.isConnected) { try { last.focus(); } catch (_) {} }
                                                } else if (!event.shiftKey && activeEl === last) {
                                                    event.preventDefault();
                                                    if (first.isConnected) { try { first.focus(); } catch (_) {} }
                                                }
                                            }
                                        }
                                    }}
                                    className="allo-docsuite max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-indigo-200 bg-white shadow-2xl"
                                >
                                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                                        <div>
                                            <h3 id="persona-teacher-editor-title" className="text-lg font-black text-slate-900">
                                                {safeT('persona.edit_title') || 'Edit interview character'}
                                            </h3>
                                            <p className="text-xs text-slate-600">{personaTeacherEditor.candidateName}</p>
                                        </div>
                                        <button
                                            type="button"
                                            autoFocus
                                            aria-label={safeT('common.close') || 'Close'}
                                            onClick={() => { if (typeof setPersonaTeacherEditor === 'function') setPersonaTeacherEditor(null); }}
                                            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                                        >×</button>
                                    </div>
                                    <div className="space-y-5 p-5">
                                        {editorCrisisDetected && (
                                            <div role="alert" className="rounded-xl border-2 border-rose-300 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900">
                                                <strong>Safety support notice:</strong> Sensitive self-harm language was detected in this prompt. If you or someone you know needs immediate support, call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline), text <strong>HOME to 741741</strong> (Crisis Text Line), or call <strong>911</strong>.
                                            </div>
                                        )}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <label className="space-y-1 text-sm font-bold text-slate-700">
                                                <span>{safeT('persona.edit_role') || 'Role'}</span>
                                                <input
                                                    value={personaTeacherEditor.role || ''}
                                                    maxLength={200}
                                                    onChange={(event) => { if (typeof updatePersonaTeacherEditor === 'function') updatePersonaTeacherEditor({ role: stripControlChars(event.target.value) }); }}
                                                    className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                                />
                                            </label>
                                            <label className="space-y-1 text-sm font-bold text-slate-700">
                                                <span>{safeT('persona.edit_voice') || 'TTS voice'}</span>
                                                <select
                                                    value={personaTeacherEditor.voice || ''}
                                                    onChange={(event) => { if (typeof updatePersonaTeacherEditor === 'function') updatePersonaTeacherEditor({ voice: event.target.value }); }}
                                                    disabled={safeVoiceOptions.length === 0}
                                                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 disabled:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                                >
                                                    {safeVoiceOptions.length === 0
                                                        ? <option value={personaTeacherEditor.voice || ''}>{personaTeacherEditor.voice || safeT('persona.no_voice_available') || 'Use the default voice'}</option>
                                                        : safeVoiceOptions.map(voice => <option key={voice} value={voice}>{voice}</option>)
                                                    }
                                                </select>
                                            </label>
                                        </div>
                                        <label className="block space-y-1 text-sm font-bold text-slate-700">
                                            <span className="flex items-center justify-between gap-2">
                                                <span>{safeT('persona.edit_context') || 'Character context'}</span>
                                                <span data-persona-context-count className="text-xs font-normal text-slate-600">{String(personaTeacherEditor.context || '').length}/2000</span>
                                            </span>
                                            <textarea
                                                value={personaTeacherEditor.context || ''}
                                                maxLength={2000}
                                                rows={4}
                                                onChange={(event) => { if (typeof updatePersonaTeacherEditor === 'function') updatePersonaTeacherEditor({ context: stripControlChars(event.target.value) }); }}
                                                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                            />
                                        </label>
                                        <label className="block space-y-1 text-sm font-bold text-slate-700">
                                            <span className="flex items-center justify-between gap-2">
                                                <span>{safeT('persona.edit_guardrails') || 'Interview guardrails'}</span>
                                                <span data-persona-guardrails-count className="text-xs font-normal text-slate-600">{String(personaTeacherEditor.guardrails || '').length}/1500</span>
                                            </span>
                                            <textarea
                                                value={personaTeacherEditor.guardrails || ''}
                                                maxLength={1500}
                                                rows={3}
                                                onChange={(event) => { if (typeof updatePersonaTeacherEditor === 'function') updatePersonaTeacherEditor({ guardrails: stripControlChars(event.target.value) }); }}
                                                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                            />
                                        </label>
                                        <fieldset className="space-y-3">
                                            <legend className="text-sm font-black text-slate-800">
                                                {safeT('persona.edit_quests') || 'Quest objectives'}{' '}
                                                <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{editorQuests.length}/6</span>
                                            </legend>
                                            {editorQuests.map((quest, questIndex) => (
                                                <div key={quest.id || questIndex} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_150px_auto] md:items-end">
                                                    <label className="space-y-1 text-xs font-bold text-slate-700">
                                                        <span>{(safeT('persona.quest') || 'Quest') + ' ' + (questIndex + 1)}</span>
                                                        <input
                                                            value={quest.text || ''}
                                                            maxLength={500}
                                                            onChange={(event) => {
                                                                if (typeof updatePersonaTeacherEditor !== 'function') return;
                                                                updatePersonaTeacherEditor({
                                                                    quests: editorQuests.map((item, index) => index === questIndex ? { ...item, text: stripControlChars(event.target.value) } : item)
                                                                });
                                                            }}
                                                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
                                                        />
                                                    </label>
                                                    <label className="space-y-1 text-xs font-bold text-slate-700">
                                                        <span>{(() => { const value = safeT('persona.story_bonus_rapport'); return value && value !== 'persona.story_bonus_rapport' ? value : 'Story bonus rapport (0–100)'; })()}</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            step={1}
                                                            value={quest.difficulty}
                                                            onChange={(event) => {
                                                                if (typeof updatePersonaTeacherEditor !== 'function') return;
                                                                updatePersonaTeacherEditor({
                                                                    quests: editorQuests.map((item, index) => index === questIndex ? { ...item, difficulty: event.target.value } : item)
                                                                });
                                                            }}
                                                            onBlur={(event) => {
                                                                if (typeof updatePersonaTeacherEditor !== 'function') return;
                                                                const raw = String(event.target.value == null ? '' : event.target.value).trim();
                                                                const parsed = +raw;
                                                                const clamped = raw === '' || parsed !== parsed ? 20 : (parsed <= 0 ? 0 : (parsed >= 100 ? 100 : ((parsed + 0.5) | 0)));
                                                                updatePersonaTeacherEditor({
                                                                    quests: editorQuests.map((item, index) => index === questIndex ? { ...item, difficulty: clamped } : item)
                                                                });
                                                            }}
                                                            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        aria-label={(safeT('persona.remove_quest') || 'Remove') + ' ' + (safeT('persona.quest') || 'Quest') + ' ' + (questIndex + 1)}
                                                        onClick={() => {
                                                            if (typeof updatePersonaTeacherEditor !== 'function') return;
                                                            updatePersonaTeacherEditor({
                                                                quests: editorQuests.filter((_, index) => index !== questIndex)
                                                            });
                                                        }}
                                                        className="min-h-11 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {safeT('persona.remove_quest') || 'Remove'}
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                disabled={editorQuests.length >= 6}
                                                onClick={() => {
                                                    if (typeof updatePersonaTeacherEditor !== 'function') return;
                                                    updatePersonaTeacherEditor({
                                                        quests: [...editorQuests, {
                                                            id: 'teacher-q-' + Date.now() + '-' + (editorQuests.length + 1),
                                                            text: '',
                                                            difficulty: 20,
                                                            isCompleted: false
                                                        }]
                                                    });
                                                }}
                                                className="min-h-11 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                + {safeT('persona.add_quest') || 'Add quest'}
                                            </button>
                                        </fieldset>
                                    </div>
                                    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
                                        <button type="button" onClick={() => { if (typeof setPersonaTeacherEditor === 'function') setPersonaTeacherEditor(null); }} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1">
                                            {safeT('common.cancel') || 'Cancel'}
                                        </button>
                                        <button type="button" onClick={() => { if (typeof savePersonaTeacherEditor === 'function') savePersonaTeacherEditor(); }} className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1">
                                            {safeT('persona.save_changes') || safeT('common.save') || 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    </Boundary>
  );
}

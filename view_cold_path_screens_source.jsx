// Auto-extracted cold-path view source (third wave, dev-tools/extract_third_wave_cdn_views.cjs).
// Edit this file, then rebuild its CDN module: node _build_first_wave_view_modules.js ColdPathScreens

// Extracted from AlloFlowANTI.txt (gemini-bridge-view).
function _useColdPathDialogLock(dialogRef, onEscape) {
  const hostHook = typeof window !== 'undefined' && window.__alloHooks && typeof window.__alloHooks.useFocusTrap === 'function'
    ? window.__alloHooks.useFocusTrap
    : null;
  const fallbackNoop = React.useCallback(() => {}, []);
  // Always call the same number of hooks per render.
  if (hostHook) {
    hostHook(dialogRef, true, onEscape);
  } else {
    fallbackNoop();
  }
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) return undefined;
    const lock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
    if (++lock.count === 1) {
      lock.prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      lock.count = Math.max(0, lock.count - 1);
      if (lock.count === 0 && document.body) document.body.style.overflow = lock.prev;
    };
  }, []);
}
function _coldPathAiUsable(kind, fn) {
  if (typeof window !== 'undefined' && (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window.__alloQrStudentMode === true)) return false;
  if (fn && fn._alloQrBlocked === true) return false;
  if ((kind === 'images' || kind === 'imageEdit') && typeof window !== 'undefined' && window.AlloImageGeneration && typeof window.AlloImageGeneration.isEnabled === 'function' && !window.AlloImageGeneration.isEnabled()) return false;
  if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') {
    try { return Boolean(window.__alloAiUsable(kind, fn)); } catch (_) {}
  }
  return fn == null ? true : typeof fn === 'function';
}

function GeminiBridgeView(props) {
  const { Copy, Terminal, copyToClipboard, generatedContent, t } = props;
  const rawSteps = Array.isArray(generatedContent?.data)
    ? generatedContent.data
    : (generatedContent?.data != null ? [generatedContent.data] : []);
  const steps = rawSteps
    .map((entry) => (typeof entry === 'string' ? entry : (entry && typeof entry === 'object' && typeof entry.text === 'string' ? entry.text : '')))
    .filter((step) => step.trim().length > 0);
  return (
<div className="space-y-6 max-w-4xl mx-auto h-full overflow-y-auto pe-2 pb-10">
                        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-700 shadow-lg font-mono relative">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                                <div className="flex items-center gap-2 text-green-300 font-bold">
                                    <Terminal size={18} aria-hidden="true" />
                                    <span>{t('bridge.prompt_header')}</span>
                                </div>
                                <div className="text-xs text-slate-300 font-sans">
                                    {steps.length > 1 ? t('bridge.steps_count_label', { count: steps.length }) : t('bridge.single_prompt_label')}
                                </div>
                            </div>
                            <div className="space-y-6">
                                {steps.length === 0 ? (
                                    <p role="status" className="text-sm text-slate-300 font-sans">{t('bridge.empty_steps') || 'No prompt steps are available yet.'}</p>
                                ) : steps.map((promptStep, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold border-2 border-slate-900 shadow-sm z-10">
                                            {idx + 1}
                                        </div>
                                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors motion-reduce:transition-none">
                                            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100 overflow-x-auto font-mono mb-2">
                                                {promptStep}
                                            </pre>
                                            <div className="flex justify-end pt-2 border-t border-slate-700/50">
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(promptStep)}
                                                    className="min-h-11 flex items-center gap-2 text-[11px] font-bold bg-slate-700 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 uppercase tracking-wider"
                                                >
                                                    <Copy size={12} aria-hidden="true" /> {t('bridge.copy_step', { step: idx + 1 })}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-4 border-t border-slate-700 text-xs text-slate-300 flex items-center gap-2 justify-center">
                                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
                                {t('bridge.next_step')}
                            </div>
                        </div>
                    </div>
  );
}

// Extracted from AlloFlowANTI.txt (saved-math-assessment-view).
function SavedMathAssessmentView(props) {
  const { formatInlineText, generatedContent, isTeacherMode, openMathCreate, setAssessmentBlocks, setGradeLevel, setLeveledTextLanguage, setMathSubject, setShowAssessmentBuilder, t } = props;
                    // Saved plans and submitted work share a historical resource type.
                    // Render their stored payload directly; opening must never generate or grade again.
                    const saved = generatedContent || {};
                    const data = saved.data && typeof saved.data === 'object' ? saved.data : {};
                    const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
                    const label = (key, fallback) => { const value = t(key); return typeof value === 'string' && value !== key ? value : fallback; };
                    const results = Array.isArray(data.results) ? data.results.filter(row => row && typeof row === 'object') : null;
                    const blocks = Array.isArray(data.blocks) ? data.blocks.filter(block => block && typeof block === 'object') : [];
                    const title = label(results ? 'math.saved_results' : 'math.saved_plan', results ? 'Submitted assessment results' : 'Assessment plan');
                    return <section aria-labelledby="saved-math-assessment-title" className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6">
                        <header>
                            <p className="text-sm font-bold text-indigo-800">{title}</p>
                            <h2 id="saved-math-assessment-title" className="text-2xl font-bold text-slate-900 break-words">{text(saved.title) || title}</h2>
                        </header>
                        {results ? <>
                            {Number.isFinite(data.score) && Number.isFinite(data.total) && <p className="text-lg font-bold text-slate-900">{label('math.saved_score', 'Score')}: {data.score} / {data.total}{Number.isFinite(data.percentage) ? ` (${data.percentage}%)` : ''}</p>}
                            <p className="text-sm text-slate-700">{label('math.saved_results_note', 'These are the answers and results recorded when you submitted. Opening this resource does not grade them again.')}</p>
                            <ol className="space-y-4">
                                {results.map((row, index) => <li key={index} className="rounded-xl border border-slate-300 bg-white p-4 space-y-2">
                                    <h3 className="font-semibold text-slate-900 break-words">{index + 1}. {formatInlineText(text(row.question), false)}</h3>
                                    <p className="text-slate-800 break-words"><strong>{label('math.saved_response', 'Your submitted answer')}: </strong>{formatInlineText(text(row.response), false)}</p>
                                    <p className="font-semibold text-slate-800">{row.correct === true ? label('math.saved_correct', 'Correct') : row.correct === false ? label('math.saved_incorrect', 'Incorrect') : label('math.saved_ungraded', 'Not graded')}</p>
                                </li>)}
                            </ol>
                            {!results.length && <p>{label('math.saved_no_results', 'No submitted answers were recorded in this resource.')}</p>}
                        </> : blocks.length ? <>
                            <p className="text-sm text-slate-700">{label('math.saved_plan_note', 'This plan saves the requested sections and settings. Generated questions are saved separately as a Math resource.')}</p>
                            <ol className="space-y-3">
                                {blocks.map((block, index) => <li key={index} className="rounded-xl border border-slate-300 bg-white p-4">
                                    <h3 className="font-bold text-slate-900">{index + 1}. {text(block.type).replace(/_/g, ' ')} · {text(block.quantity)} {label('math.saved_problems', 'problems')}</h3>
                                    <p className="text-slate-800 break-words">{formatInlineText(text(block.directive), false)}</p>
                                </li>)}
                            </ol>
                            {isTeacherMode && <button type="button" className="min-h-[44px] rounded-lg bg-indigo-700 text-white px-4 py-2 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700" onClick={() => {
                                setAssessmentBlocks(blocks.map((block, index) => ({ ...block, id: 'restored-block-' + index })));
                                if (text(data.subject)) setMathSubject(text(data.subject));
                                if (text(saved.config?.grade)) setGradeLevel(text(saved.config.grade));
                                if (text(saved.config?.language)) setLeveledTextLanguage(text(saved.config.language));
                                setShowAssessmentBuilder(true);
                                openMathCreate();
                            }}>{label('math.saved_edit_plan', 'Edit a copy in Math Studio')}</button>}
                        </> : <p role="status" className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-amber-950">{label('math.saved_empty', 'This saved assessment has no readable plan or submitted results. Choose another resource or return to Math Studio.')}</p>}
                    </section>;
}

// Extracted from AlloFlowANTI.txt (adventure-cast-lobby).
function AdventureCastLobbyView(props) {
  const { CastLobby, adventureArtStyle, adventureCustomArtStyle, adventureState, callGeminiImageEdit, callImagen, generateAdventureImage, setAdventureState, t, universalImageStyle, warnLog } = props;
  return (
<CastLobby
                        characters={adventureState.characters}
                        t={t}
                        onAddCharacter={(newChar) => {
                            setAdventureState(prev => ({
                                ...prev,
                                characters: [...(Array.isArray(prev.characters) ? prev.characters : []), newChar]
                            }));
                        }}
                        onRemoveCharacter={(idx) => {
                            setAdventureState(prev => {
                                const chars = Array.isArray(prev.characters) ? prev.characters : [];
                                if (idx < 0 || idx >= chars.length) return prev;
                                return { ...prev, characters: chars.filter((_, i) => i !== idx) };
                            });
                        }}
                        onUpdateCharacter={(idx, updates) => {
                            setAdventureState(prev => {
                                const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                if (idx < 0 || idx >= chars.length) return prev;
                                chars[idx] = { ...chars[idx], ...updates };
                                return { ...prev, characters: chars };
                            });
                        }}
                        onGeneratePortrait={async (idx) => {
                            const targetChar = adventureState.characters?.[idx];
                            if (!targetChar) return;
                            if (!_coldPathAiUsable('images', callImagen)) {
                                if (typeof props.addToast === 'function') props.addToast(t('errors.ai_unavailable') || 'AI image generation is currently unavailable.', 'warning');
                                return;
                            }
                            const targetId = targetChar.id;
                            const genToken = `pgen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                            const resolveIdx = (list) => {
                                const arr = Array.isArray(list) ? list : [];
                                if (targetId) {
                                    const found = arr.findIndex(c => c?.id === targetId);
                                    if (found >= 0) return found;
                                }
                                return (idx >= 0 && idx < arr.length && arr[idx]?.name === targetChar.name) ? idx : -1;
                            };
                            setAdventureState(prev => {
                                const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                const pos = resolveIdx(chars);
                                if (pos < 0) return prev;
                                chars[pos] = { ...chars[pos], isGenerating: true, portraitGenToken: genToken };
                                return { ...prev, characters: chars };
                            });
                            try {
                                const portraitStyleMap = {
                                'auto': 'Digital painting style',
                                'storybook': 'Soft watercolor storybook style',
                                'pixel': '16-bit pixel art retro game style',
                                'cinematic': 'Cinematic digital painting, dramatic lighting',
                                'anime': 'Anime-style illustration, clean linework',
                                'crayon': "Children's crayon hand-drawn style",
                            };
                                const portraitStyle = adventureArtStyle === 'custom' && adventureCustomArtStyle
                                    ? adventureCustomArtStyle
                                    : (adventureArtStyle === 'universal'
                                        ? (String(universalImageStyle || '').trim() || 'Digital painting style')
                                        : (portraitStyleMap[adventureArtStyle] || 'Digital painting style'));
                                const prompt = `Character portrait: ${targetChar.name}, ${targetChar.role}. ${targetChar.appearance || 'fantasy character'}. Bust portrait, centered face, soft lighting, detailed, no text, no labels. ${portraitStyle}.`;
                                const url = await callImagen(prompt, 400, 0.85);
                                setAdventureState(prev => {
                                    const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                    const pos = resolveIdx(chars);
                                    if (pos < 0 || chars[pos].portraitGenToken !== genToken) return prev;
                                    chars[pos] = {
                                        ...chars[pos],
                                        portrait: url || chars[pos].portrait,
                                        isGenerating: false,
                                        isUserUploaded: url ? false : chars[pos].isUserUploaded,
                                        portraitGenToken: null,
                                    };
                                    return { ...prev, characters: chars };
                                });
                            } catch (e) {
                                warnLog("Portrait gen failed:", e);
                                if (typeof props.addToast === 'function') props.addToast(t('adventure.portrait_failed') || 'Could not generate portrait.', 'error');
                                setAdventureState(prev => {
                                    const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                    const pos = resolveIdx(chars);
                                    if (pos < 0 || chars[pos].portraitGenToken !== genToken) return prev;
                                    chars[pos] = { ...chars[pos], isGenerating: false, portraitGenToken: null };
                                    return { ...prev, characters: chars };
                                });
                            }
                        }}
                        onRefinePortrait={async (idx, editText) => {
                            const targetChar = adventureState.characters?.[idx];
                            if (!targetChar || !targetChar.portrait) return;
                            if (!_coldPathAiUsable('imageEdit', callGeminiImageEdit)) {
                                if (typeof props.addToast === 'function') props.addToast(t('errors.ai_unavailable') || 'AI image editing is currently unavailable.', 'warning');
                                return;
                            }
                            const targetId = targetChar.id;
                            const genToken = `pref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                            const resolveIdx = (list) => {
                                const arr = Array.isArray(list) ? list : [];
                                if (targetId) {
                                    const found = arr.findIndex(c => c?.id === targetId);
                                    if (found >= 0) return found;
                                }
                                return (idx >= 0 && idx < arr.length && arr[idx]?.name === targetChar.name) ? idx : -1;
                            };
                            setAdventureState(prev => {
                                const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                const pos = resolveIdx(chars);
                                if (pos < 0) return prev;
                                chars[pos] = { ...chars[pos], isGenerating: true, portraitGenToken: genToken };
                                return { ...prev, characters: chars };
                            });
                            try {
                                const rawBase64 = String(targetChar.portrait).split(',')[1];
                                const refined = rawBase64
                                    ? await callGeminiImageEdit(`Modify this character portrait: ${editText}. Keep the character recognizable. No text.`, rawBase64, 400, 0.85)
                                    : null;
                                setAdventureState(prev => {
                                    const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                    const pos = resolveIdx(chars);
                                    if (pos < 0 || chars[pos].portraitGenToken !== genToken) return prev;
                                    const nextAppearance = refined
                                        ? ((chars[pos].appearance || '') ? `${chars[pos].appearance}, ${editText}` : editText)
                                        : chars[pos].appearance;
                                    chars[pos] = { ...chars[pos], portrait: refined || chars[pos].portrait, appearance: nextAppearance, isGenerating: false, portraitGenToken: null };
                                    return { ...prev, characters: chars };
                                });
                            } catch (e) {
                                warnLog("Portrait refine failed:", e);
                                if (typeof props.addToast === 'function') props.addToast(t('adventure.portrait_refine_failed') || 'Could not refine portrait.', 'error');
                                setAdventureState(prev => {
                                    const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                    const pos = resolveIdx(chars);
                                    if (pos < 0 || chars[pos].portraitGenToken !== genToken) return prev;
                                    chars[pos] = { ...chars[pos], isGenerating: false, portraitGenToken: null };
                                    return { ...prev, characters: chars };
                                });
                            }
                        }}
                        onUploadPortrait={(idx, dataUrl) => {
                            setAdventureState(prev => {
                                const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                if (idx < 0 || idx >= chars.length) return prev;
                                chars[idx] = { ...chars[idx], portrait: dataUrl, isUserUploaded: true, uploadConsent: true, isGenerating: false, portraitGenToken: null };
                                return { ...prev, characters: chars };
                            });
                        }}
                        onConfirm={() => {
                            const sceneText = adventureState.currentScene?.text;
                            if (!sceneText) {
                                warnLog("CastLobby onConfirm: currentScene.text is null, skipping image generation");
                                setAdventureState(prev => ({ ...prev, isReviewingCharacters: false }));
                                return;
                            }
                            setAdventureState(prev => ({ ...prev, isReviewingCharacters: false, isImageLoading: true }));
                            generateAdventureImage(sceneText, 1);
                        }}
                    />
  );
}

// Extracted from AlloFlowANTI.txt (stem-artwork-handoff).
function StemArtworkHandoffView(props) {
  const { _alloReadVisualSupportCollection, saveStemArtworkAsVisualSupport, setStemArtworkDestination, setStemArtworkHandoff, setStemArtworkLabel, stemArtworkDestination, stemArtworkHandoff, stemArtworkLabel } = props;
  const t = typeof props.t === 'function' ? props.t : (k) => k;
  const stemArtworkHandoffRef = React.useRef(null);
  const backdropDownRef = React.useRef(null);
  _useColdPathDialogLock(stemArtworkHandoffRef, () => setStemArtworkHandoff(null));
        const boards = _alloReadVisualSupportCollection('alloSymbolBoards');
        const schedules = _alloReadVisualSupportCollection('alloSchedules');
        const safeLabel = String(stemArtworkLabel || '');
        return (
          <div
            role="presentation"
            className="fixed inset-0 z-[9200] bg-black/70 flex items-center justify-center p-4"
            onMouseDown={(event) => { backdropDownRef.current = event.target === event.currentTarget; }}
            onClick={(event) => {
              const allowClose = backdropDownRef.current !== false;
              backdropDownRef.current = null;
              if (event.target === event.currentTarget && allowClose) setStemArtworkHandoff(null);
            }}
          >
            <div ref={stemArtworkHandoffRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="stem-artwork-handoff-title" className="allo-docsuite bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5" onClick={event => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="stem-artwork-handoff-title" className="text-xl font-black text-slate-900">Save as a Visual Support</h2>
                  <p className="text-sm text-slate-600 mt-1">Give this Art Studio image a short label so it can be shown and spoken from a board or schedule.</p>
                </div>
                <button type="button" onClick={() => setStemArtworkHandoff(null)} className="min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-lg text-slate-700 hover:bg-slate-100" aria-label={t('common.close') || 'Close'}>×</button>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-[180px_1fr] items-start">
                <div className="rounded-xl border border-slate-300 bg-slate-100 p-2">
                  <img src={stemArtworkHandoff.src} alt={stemArtworkHandoff.altText || stemArtworkHandoff.title || 'Art Studio artwork preview'} className="w-full aspect-square object-contain rounded-lg bg-white" />
                  <p className="text-[11px] text-slate-600 mt-2">Created in Art Studio{stemArtworkHandoff.sourceTab ? ' · ' + stemArtworkHandoff.sourceTab : ''}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="stem-artwork-label" className="block text-sm font-bold text-slate-800">Short label</label>
                    <input id="stem-artwork-label" type="text" value={safeLabel} maxLength={80} onChange={event => setStemArtworkLabel(event.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-slate-400 px-3 text-sm text-slate-900" placeholder={t('visuals.artwork_label_placeholder') || 'For example, My spiral pattern'} data-autofocus="true" />
                    <p className="text-[11px] text-slate-600 mt-1">This is the label students will see and hear.</p>
                  </div>
                  <div>
                    <label htmlFor="stem-artwork-destination" className="block text-sm font-bold text-slate-800">Save to</label>
                    <select id="stem-artwork-destination" value={stemArtworkDestination} onChange={event => setStemArtworkDestination(event.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-slate-400 px-3 text-sm text-slate-900">
                      <option value="board:new">New visual board — Art Studio supports</option>
                      {boards.map((board, index) => <option key={'board-' + (board.id || index)} value={'board:' + (board.id || '')}>Board: {board.title || 'Untitled Board'}</option>)}
                      <option value="schedule:new">New visual schedule — Art Studio supports</option>
                      {schedules.map((schedule, index) => <option key={'schedule-' + (schedule.id || index)} value={'schedule:' + (schedule.id || '')}>Schedule: {schedule.title || 'Untitled Schedule'}</option>)}
                    </select>
                  </div>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-950 leading-relaxed">
                    This saves a static image tile. The original interactive Art Studio tool remains available in the STEAM Lab.
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setStemArtworkHandoff(null)} className="min-h-11 px-4 rounded-lg border border-slate-400 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={saveStemArtworkAsVisualSupport} disabled={!safeLabel.trim()} className="min-h-11 px-4 rounded-lg bg-indigo-700 text-white text-sm font-bold hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed">Save visual support</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
}

// Extracted from AlloFlowANTI.txt (session-start-options).
function SessionStartOptionsView(props) {
  const { X, setMbPanelOpen, setShowLiveLessonPrep, setShowSessionStartOptions, startClassSession, t } = props;
  // The dialog owns its focus trap: it starts when this view mounts and ends when it leaves.
  const sessionStartOptionsRef = React.useRef(null);
  const backdropDownRef = React.useRef(null);
  _useColdPathDialogLock(sessionStartOptionsRef, props.onTrapEscape || (() => setShowSessionStartOptions(false)));
  return (
<div
  role="presentation"
  className="fixed inset-0 bg-black/70 z-[260] flex items-center justify-center p-4 no-print"
  onMouseDown={(e) => { backdropDownRef.current = e.target === e.currentTarget; }}
  onClick={(e) => {
    const allowClose = backdropDownRef.current !== false;
    backdropDownRef.current = null;
    if (e.target === e.currentTarget && allowClose) setShowSessionStartOptions(false);
  }}
>
          <div ref={sessionStartOptionsRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('session.start_dialog_aria') || 'Teach live'} className="allo-docsuite bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setShowSessionStartOptions(false)} className="absolute top-3 right-3 min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100" aria-label={t('common.close') || 'Close'}><X size={20} aria-hidden="true"/></button>
            <h2 className="text-xl font-black text-slate-900 mb-1">{t('share_collect.start_live_session') || 'Teach live'}</h2>
            <p className="text-xs text-slate-600 mb-3">{t('share_collect.prepare_the_lesson_flow_if_you') || 'Prepare the lesson flow if you want, then choose how student devices will connect.'}</p>
            <button type="button" onClick={() => { setShowSessionStartOptions(false); setShowLiveLessonPrep(true); }} className="w-full mb-4 text-left rounded-xl border-2 border-cyan-200 bg-cyan-50 p-3 hover:border-cyan-400 hover:bg-cyan-100 transition-colors motion-reduce:transition-none">
              <span className="block text-sm font-black text-cyan-950">{t('share_collect.prepare_live_run') || 'Prepare live lesson'} <span className="text-[10px] uppercase tracking-wide text-cyan-700">optional</span></span>
              <span className="block text-xs text-cyan-800 mt-1">{t('share_collect.attach_private_presenter_cues_and_existing') || 'Attach private presenter cues and existing quick check, Word Cloud, open-response, feedback, Sketch Response, or live-quiz checkpoints to lesson steps. This does not start a session.'}</span>
            </button>
            <div className="space-y-3">
              <button type="button" onClick={() => { setShowSessionStartOptions(false); startClassSession(); }} className="w-full text-left rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 hover:border-indigo-400 hover:bg-indigo-100 transition-colors motion-reduce:transition-none">
                <span className="block text-sm font-black text-indigo-900">{t('mailbox.standard_live_session') || 'Standard live session'}</span>
                <span className="block text-xs text-indigo-800 mt-1">{t('mailbox.use_the_configured_firebase_district_or') || 'Use the configured Firebase, district, or local-network session backend.'}</span>
              </button>
              <button type="button" onClick={() => { setShowSessionStartOptions(false); setMbPanelOpen(true); }} className="w-full text-left rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 hover:border-emerald-400 hover:bg-emerald-100 transition-colors motion-reduce:transition-none">
                <span className="block text-sm font-black text-emerald-900">{t('mailbox.class_mailbox_qr_session') || 'Class Mailbox QR session'}</span>
                <span className="block text-xs text-emerald-800 mt-1">{t('mailbox.students_scan_a_qr_and_join') || 'Students scan a QR and join without accounts through your Google Apps Script mailbox.'}</span>
              </button>
            </div>
          </div>
        </div>
  );
}

// Extracted from AlloFlowANTI.txt (translate-modal).
function TranslateModalView(props) {
  const { Languages, X, _alloHostHandlersOptional, currentUiLanguage, generatedContent, handleSetIsTranslateModalOpenToFalse, handleTranslateAction, headerTranslationMode, isProcessing, resolveTranslationPolicy, selectedLanguages, setHeaderTranslationMode, setTargetTranslationLang, setTranslateScope, t, targetTranslationLang, translationMode, translationTargetChoices } = props;
  // The dialog owns its focus trap: it starts when this view mounts and ends when it leaves.
  const translateModalRef = React.useRef(null);
  const backdropDownRef = React.useRef(null);
  _useColdPathDialogLock(translateModalRef, props.onTrapEscape || handleSetIsTranslateModalOpenToFalse);
        const safeLangInput = String(targetTranslationLang || '');
        const primaryLanguage = safeLangInput.trim();
        const aiTextUsable = _coldPathAiUsable('text');
        const companionChoices = translationTargetChoices(primaryLanguage, currentUiLanguage, selectedLanguages);
        const companionPolicy = resolveTranslationPolicy(headerTranslationMode ?? translationMode, primaryLanguage, currentUiLanguage, companionChoices);
        const batchHandlers = _alloHostHandlersOptional();
        const batch = batchHandlers?.getTranslationBatchItems?.('pack') || { items: [], kind: 'workspace' };
        const currentBatch = batchHandlers?.getTranslationBatchItems?.('single') || { items: [] };
        const scopeLabel = batch.kind === 'pack'
          ? t('translate.action_pack', { count: batch.items.length })
          : t('translate.action_workspace', { count: batch.items.length });
        return (
        <div
            role="presentation"
            className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in motion-reduce:animate-none fade-in duration-200"
            onMouseDown={(e) => { backdropDownRef.current = e.target === e.currentTarget; }}
            onClick={(e) => {
                const allowClose = backdropDownRef.current !== false;
                backdropDownRef.current = null;
                if (e.target === e.currentTarget && allowClose) handleSetIsTranslateModalOpenToFalse();
            }}
        >
            <div ref={translateModalRef} tabIndex={-1} className="allo-docsuite bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative border-4 border-indigo-100 transition-all motion-reduce:transition-none animate-in motion-reduce:animate-none zoom-in-95 duration-200" role="dialog" aria-modal="true" aria-labelledby="header-translate-dialog-title" aria-describedby="header-translate-scope" onClick={e => e.stopPropagation()}>
                <button type="button" onClick={handleSetIsTranslateModalOpenToFalse} className="absolute top-4 right-4 min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors motion-reduce:transition-none" aria-label={t('common.close')}><X size={20} aria-hidden="true"/></button>
                <h2 id="header-translate-dialog-title" className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <span className="inline-flex bg-indigo-100 p-2 rounded-full text-indigo-600" aria-hidden="true"><Languages size={20} aria-hidden="true"/></span>
                    {t('header.translate_button')}
                </h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="header-translate-target-language" className="block text-xs font-bold text-slate-600 mb-1">{t('translate.target_label')}</label>
                        <input id="header-translate-target-language"
                            type="text"
                            value={safeLangInput}
                            onChange={(e) => setTargetTranslationLang(e.target.value)}
                            className="w-full min-h-11 text-sm border-2 border-indigo-600 rounded-xl p-2 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-1 transition-all motion-reduce:transition-none"
                            placeholder={t('translate.placeholder')}
                            data-autofocus="true"
                        />
                    </div>
                    <div>
                        <label htmlFor="header-translate-companion" className="block text-xs font-bold text-slate-600 mb-1">{t('translate.companion_label')}</label>
                        <select id="header-translate-companion" value={companionPolicy.mode} onChange={e => setHeaderTranslationMode(e.target.value)} aria-describedby="header-translate-companion-hint" className="w-full min-h-11 text-sm border-2 border-indigo-600 rounded-xl p-2 focus:ring-4 focus:ring-indigo-500/20">
                            <option value="auto">{(t('universal.translations_auto') || 'Automatic ({language})').replace('{language}', currentUiLanguage || 'English')}</option>
                            <option value="off">{t('universal.translations_none') || 'None'}</option>
                            {companionChoices.map(language => <option key={language} value={language}>{language}</option>)}
                        </select>
                        <p id="header-translate-companion-hint" className="text-xs text-slate-600 mt-1" aria-live="polite">
                            {companionPolicy.enabled
                                ? (t('translate.companion_on') || 'Include a second version in {language}.').replace('{language}', companionPolicy.target)
                                : t('translate.companion_off')}
                        </p>
                    </div>
                    <p id="header-translate-scope" className="text-xs text-slate-600">{t('translate.scope_hint')}</p>
                    {(batch.items.some(item => item.type === 'glossary') || generatedContent?.type === 'glossary') && <p className="text-xs text-slate-600">{t('translate.glossary_hint')}</p>}
                    {!aiTextUsable && <p role="status" className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{t('errors.ai_unavailable') || 'AI translation is currently unavailable.'}</p>}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { if (!aiTextUsable) return; setTranslateScope('single'); handleTranslateAction('single', { translationMode: companionPolicy.mode }); }}
                            disabled={isProcessing || !aiTextUsable || !currentBatch.items.length || !primaryLanguage}
                            className="min-h-11 flex-1 py-3 bg-white text-indigo-700 border-2 border-indigo-200 hover:border-indigo-400 font-bold rounded-xl transition-all motion-reduce:transition-none shadow-sm active:scale-95 motion-reduce:transform-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('translate.action_current')}
                        </button>
                        <button
                            type="button"
                            onClick={() => { if (!aiTextUsable) return; setTranslateScope('pack'); handleTranslateAction('pack', { translationMode: companionPolicy.mode }); }}
                            disabled={isProcessing || !aiTextUsable || !batch.items.length || !primaryLanguage}
                            className="min-h-11 flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all motion-reduce:transition-none shadow-md active:scale-95 motion-reduce:transform-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {scopeLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        );
}

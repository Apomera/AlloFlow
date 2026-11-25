// Auto-extracted cold-path view source (third wave, dev-tools/extract_third_wave_cdn_views.cjs).
// Edit this file, then rebuild its CDN module: node _build_first_wave_view_modules.js ColdPathScreens

// Extracted from AlloFlowANTI.txt (gemini-bridge-view).
function _useColdPathDialogLock(dialogRef, onEscape) {
  const hostHook = typeof window !== 'undefined' && window.__alloHooks && typeof window.__alloHooks.useFocusTrap === 'function'
    ? window.__alloHooks.useFocusTrap
    : null;
  const fallbackNoop = React.useCallback(() => {}, []);
  const onEscapeRef = React.useRef(onEscape);
  onEscapeRef.current = onEscape;
  // Always call the same number of hooks per render.
  if (hostHook) {
    hostHook(dialogRef, true, onEscape);
  } else {
    fallbackNoop();
  }
  React.useEffect(() => {
    if (hostHook || typeof document === 'undefined') return undefined;
    const dialog = dialogRef && dialogRef.current;
    if (!dialog) return undefined;
    const prevFocus = document.activeElement;
    const getFocusable = () => Array.from(dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter(el => !el.closest('[hidden], [inert], [aria-hidden="true"]'));
    const initial = dialog.querySelector('[data-autofocus="true"]') || getFocusable()[0] || dialog;
    try { initial.focus(); } catch (_) {}
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof onEscapeRef.current === 'function') onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      const items = getFocusable();
      if (!items.length) { event.preventDefault(); try { dialog.focus(); } catch (_) {} return; }
      const first = items[0], last = items[items.length - 1];
      if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
        event.preventDefault();
        try { (event.shiftKey ? last : first).focus(); } catch (_) {}
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        try { last.focus(); } catch (_) {}
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        try { first.focus(); } catch (_) {}
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (prevFocus && prevFocus !== document.body && prevFocus !== document.documentElement && prevFocus.isConnected && typeof prevFocus.focus === 'function') {
        try { prevFocus.focus(); } catch (_) {}
      }
    };
  }, [dialogRef, Boolean(hostHook)]);
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
function _safeColdImageUrl(raw) {
  if (typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s || /[\u0000-\u001f\u007f]/.test(s)) return '';
  if (/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(s)) return s;
  if (/^(?:blob:|https:\/\/)/i.test(s)) return s;
  return '';
}
function _cleanColdPromptText(raw, maxLen) {
  return String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLen || 200);
}
function _coldPathAiUsable(kind, fn) {
  if (typeof window !== 'undefined') {
    if (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true || window.__alloQrStudentMode === true || window._alloQrBlocked === true || window.__alloOfflineOnly === true || window.hideStudentAiFeatures === true) return false;
    try {
      const sp = window.AlloModules && window.AlloModules.StudentPolicy;
      if (sp && (sp.aiDisabled === true || sp.aiEnabled === false || (typeof sp.isStudentAiDisabled === 'function' && sp.isStudentAiDisabled()) || (typeof sp.hideStudentAiFeatures === 'function' && sp.hideStudentAiFeatures()))) return false;
    } catch (_) { return false; }
    if (window.ALLOFLOW_MANAGED_AI_POLICY && (window.ALLOFLOW_MANAGED_AI_POLICY.enabled === false || kind === 'images' || kind === 'imageEdit')) return false;
  }
  if (fn && fn._alloQrBlocked === true) return false;
  if ((kind === 'images' || kind === 'imageEdit') && typeof window !== 'undefined' && window.AlloImageGeneration && typeof window.AlloImageGeneration.isEnabled === 'function' && !window.AlloImageGeneration.isEnabled()) return false;
  if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') {
    try { return Boolean(window.__alloAiUsable(kind, fn)); } catch (_) { return false; }
  }
  return fn == null ? true : typeof fn === 'function';
}

function GeminiBridgeView(props) {
  const { Copy, Terminal, copyToClipboard, generatedContent, t } = props;
  const [copiedKey, setCopiedKey] = React.useState('');
  const copyTimerRef = React.useRef(null);
  React.useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);
  const rawSteps = Array.isArray(generatedContent?.data)
    ? generatedContent.data
    : (generatedContent?.data != null ? [generatedContent.data] : []);
  const steps = rawSteps
    .map((entry) => (typeof entry === 'string' ? entry : (entry && typeof entry === 'object' && typeof entry.text === 'string' ? entry.text : '')))
    .filter((step) => step.trim().length > 0);
  const triggerCopy = (text, key) => {
    if (typeof copyToClipboard === 'function') copyToClipboard(text);
    setCopiedKey(key);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedKey(''), 2000);
  };
  return (
<div className="space-y-6 max-w-4xl mx-auto h-full overflow-y-auto pe-2 pb-10">
                        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-700 shadow-lg font-mono relative">
                            <span data-bridge-step-copied="true" role="status" aria-live="polite" className="sr-only">
                                {copiedKey === 'all' ? 'Copied all prompt steps.' : copiedKey ? `Copied step ${copiedKey}.` : ''}
                            </span>
                            <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                                <div className="flex items-center gap-2 text-green-300 font-bold">
                                    <Terminal size={18} aria-hidden="true" />
                                    <span>{t('bridge.prompt_header') || 'Prompt Sequence'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-slate-300 font-sans">
                                        {steps.length > 1 ? (t('bridge.steps_count_label', { count: steps.length }) || `${steps.length} steps`) : (t('bridge.single_prompt_label') || 'Single prompt')}
                                    </div>
                                    {steps.length > 1 && (
                                        <button
                                            type="button"
                                            data-bridge-copy-all="true"
                                            onClick={() => triggerCopy(steps.join('\n\n'), 'all')}
                                            className="min-h-11 inline-flex items-center gap-1.5 font-sans text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                                        >
                                            <Copy size={12} aria-hidden="true" />
                                            <span>{copiedKey === 'all' ? (t('common.copied') || 'Copied!') : (t('bridge.copy_all_steps') || 'Copy all steps')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-6">
                                {steps.length === 0 ? (
                                    <p role="status" className="text-sm text-slate-300 font-sans">{t('bridge.empty_steps') || 'No prompt steps are available yet.'}</p>
                                ) : steps.map((promptStep, idx) => (
                                    <div key={idx} className="relative group">
                                        <div aria-hidden="true" className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold border-2 border-slate-900 shadow-sm z-10">
                                            {idx + 1}
                                        </div>
                                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors motion-reduce:transition-none">
                                            <pre tabIndex={0} className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100 overflow-x-auto font-mono mb-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
                                                {promptStep}
                                            </pre>
                                            <div className="flex justify-end pt-2 border-t border-slate-700/50">
                                                <button
                                                    type="button"
                                                    onClick={() => triggerCopy(promptStep, String(idx + 1))}
                                                    className="min-h-11 flex items-center gap-2 text-[11px] font-bold bg-slate-700 hover:bg-green-700 text-white px-3 py-1.5 rounded transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 uppercase tracking-wider"
                                                >
                                                    <Copy size={12} aria-hidden="true" /> {copiedKey === String(idx + 1) ? (t('common.copied') || 'Copied!') : (t('bridge.copy_step', { step: idx + 1 }) || `Copy Step ${idx + 1}`)}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-4 border-t border-slate-700 text-xs text-slate-300 flex items-center gap-2 justify-center">
                                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
                                {t('bridge.next_step') || 'Copy and run each step in order.'}
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
                    const label = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return typeof value === 'string' && value.trim() && value !== key ? value : fallback; };
                    const safeFormatInline = (val, arg) => (typeof formatInlineText === 'function' ? formatInlineText(val, arg) : val);
                    const results = Array.isArray(data.results) ? data.results.filter(row => row && typeof row === 'object') : null;
                    const blocks = Array.isArray(data.blocks) ? data.blocks.filter(block => block && typeof block === 'object') : [];
                    const title = label(results ? 'math.saved_results' : 'math.saved_plan', results ? 'Submitted assessment results' : 'Assessment plan');
                    const hasScore = Number.isFinite(data.score) && Number.isFinite(data.total) && data.total > 0;
                    const scorePct = hasScore ? (Number.isFinite(data.percentage) ? Math.round(data.percentage) : Math.round((data.score / data.total) * 100)) : null;
                    return <section aria-labelledby="saved-math-assessment-title" className="max-w-4xl mx-auto space-y-5 p-4 sm:p-6">
                        <header>
                            <p className="text-sm font-bold text-indigo-800">{title}</p>
                            <h2 id="saved-math-assessment-title" className="text-2xl font-bold text-slate-900 break-words">{text(saved.title) || title}</h2>
                        </header>
                        {results ? <>
                            {Number.isFinite(data.score) && Number.isFinite(data.total) && (
                                <div className="space-y-2">
                                    <p className="text-lg font-bold text-slate-900">{label('math.saved_score', 'Score')}: {data.score} / {data.total}{Number.isFinite(data.percentage) ? ` (${data.percentage}%)` : ''}</p>
                                    {hasScore && (
                                        <div
                                            role="progressbar"
                                            aria-label={label('math.saved_score', 'Score')}
                                            aria-valuemin={0}
                                            aria-valuemax={data.total}
                                            aria-valuenow={Math.max(0, Math.min(data.total, data.score))}
                                            aria-valuetext={`${data.score} of ${data.total} (${scorePct}%)`}
                                            className="w-full max-w-md h-2.5 rounded-full bg-slate-200 overflow-hidden border border-slate-300"
                                        >
                                            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.max(0, Math.min(100, scorePct))}%` }} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-sm text-slate-700">{label('math.saved_results_note', 'These are the answers and results recorded when you submitted. Opening this resource does not grade them again.')}</p>
                            <ol className="space-y-4">
                                {results.map((row, index) => {
                                    const verdict = row.correct === true ? 'correct' : row.correct === false ? 'incorrect' : 'ungraded';
                                    const verdictSymbol = verdict === 'correct' ? '✓' : verdict === 'incorrect' ? '×' : '·';
                                    const verdictClass = verdict === 'correct'
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                        : verdict === 'incorrect'
                                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                                            : 'bg-slate-100 border-slate-300 text-slate-800';
                                    return <li key={index} className="rounded-xl border border-slate-300 bg-white p-4 space-y-2">
                                        <h3 className="font-semibold text-slate-900 break-words">{index + 1}. {safeFormatInline(text(row.question), false)}</h3>
                                        <p className="text-slate-800 break-words"><strong>{label('math.saved_response', 'Your submitted answer')}: </strong>{safeFormatInline(text(row.response), false)}</p>
                                        <p data-saved-math-verdict={verdict} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${verdictClass}`}>
                                            <span aria-hidden="true">{verdictSymbol}</span>
                                            <span>{verdict === 'correct' ? label('math.saved_correct', 'Correct') : verdict === 'incorrect' ? label('math.saved_incorrect', 'Incorrect') : label('math.saved_ungraded', 'Not graded')}</span>
                                        </p>
                                    </li>;
                                })}
                            </ol>
                            {!results.length && <p>{label('math.saved_no_results', 'No submitted answers were recorded in this resource.')}</p>}
                        </> : blocks.length ? <>
                            <p className="text-sm text-slate-700">{label('math.saved_plan_note', 'This plan saves the requested sections and settings. Generated questions are saved separately as a Math resource.')}</p>
                            <ol className="space-y-3">
                                {blocks.map((block, index) => <li key={index} className="rounded-xl border border-slate-300 bg-white p-4">
                                    <h3 className="font-bold text-slate-900">{index + 1}. {text(block.type).replace(/_/g, ' ')} · {text(block.quantity)} {label('math.saved_problems', 'problems')}</h3>
                                    <p className="text-slate-800 break-words">{safeFormatInline(text(block.directive), false)}</p>
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
  const safeAdventureState = adventureState && typeof adventureState === 'object' ? adventureState : {};
  return (
<CastLobby
                        characters={Array.isArray(safeAdventureState.characters) ? safeAdventureState.characters : []}
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
                            const safeUpdates = {};
                            if (updates && typeof updates === 'object') {
                                Object.keys(updates).forEach((k) => {
                                    if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') safeUpdates[k] = updates[k];
                                });
                            }
                            setAdventureState(prev => {
                                const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                if (idx < 0 || idx >= chars.length) return prev;
                                chars[idx] = { ...chars[idx], ...safeUpdates };
                                return { ...prev, characters: chars };
                            });
                        }}
                        onGeneratePortrait={async (idx) => {
                            const targetChar = safeAdventureState.characters?.[idx];
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
                                const portraitStyleMap = Object.assign(Object.create(null), {
                                'auto': 'Digital painting style',
                                'storybook': 'Soft watercolor storybook style',
                                'pixel': '16-bit pixel art retro game style',
                                'cinematic': 'Cinematic digital painting, dramatic lighting',
                                'anime': 'Anime-style illustration, clean linework',
                                'crayon': "Children's crayon hand-drawn style",
                            });
                                const portraitStyle = adventureArtStyle === 'custom' && adventureCustomArtStyle
                                    ? _cleanColdPromptText(adventureCustomArtStyle, 160)
                                    : (adventureArtStyle === 'universal'
                                        ? (_cleanColdPromptText(universalImageStyle, 160) || 'Digital painting style')
                                        : ((typeof adventureArtStyle === 'string' && Object.prototype.hasOwnProperty.call(portraitStyleMap, adventureArtStyle)) ? portraitStyleMap[adventureArtStyle] : 'Digital painting style'));
                                const safeName = _cleanColdPromptText(targetChar.name, 80);
                                const safeRole = _cleanColdPromptText(targetChar.role, 80);
                                const safeAppearance = _cleanColdPromptText(targetChar.appearance, 240) || 'fantasy character';
                                const prompt = `Character portrait: ${safeName}, ${safeRole}. ${safeAppearance}. Bust portrait, centered face, soft lighting, detailed, no text, no labels. ${portraitStyle}.`;
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
                            const targetChar = safeAdventureState.characters?.[idx];
                            const cleanEdit = _cleanColdPromptText(editText, 240);
                            if (!targetChar || !targetChar.portrait || !cleanEdit) return;
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
                                    ? await callGeminiImageEdit(`Modify this character portrait: ${cleanEdit}. Keep the character recognizable. No text.`, rawBase64, 400, 0.85)
                                    : null;
                                setAdventureState(prev => {
                                    const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                    const pos = resolveIdx(chars);
                                    if (pos < 0 || chars[pos].portraitGenToken !== genToken) return prev;
                                    const nextAppearance = refined
                                        ? ((chars[pos].appearance || '') ? `${chars[pos].appearance}, ${cleanEdit}` : cleanEdit)
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
                            if (!_safeColdImageUrl(dataUrl)) return;
                            setAdventureState(prev => {
                                const chars = Array.isArray(prev.characters) ? [...prev.characters] : [];
                                if (idx < 0 || idx >= chars.length) return prev;
                                chars[idx] = { ...chars[idx], portrait: dataUrl, isUserUploaded: true, uploadConsent: true, isGenerating: false, portraitGenToken: null };
                                return { ...prev, characters: chars };
                            });
                        }}
                        onConfirm={() => {
                            const sceneText = safeAdventureState.currentScene?.text;
                            if (!sceneText) {
                                warnLog("CastLobby onConfirm: currentScene.text is null, skipping image generation");
                                setAdventureState(prev => ({ ...prev, isReviewingCharacters: false }));
                                return;
                            }
                            if (!_coldPathAiUsable('images', generateAdventureImage)) {
                                setAdventureState(prev => ({ ...prev, isReviewingCharacters: false, isImageLoading: false }));
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
        const rawBoards = typeof _alloReadVisualSupportCollection === 'function' ? _alloReadVisualSupportCollection('alloSymbolBoards') : [];
        const rawSchedules = typeof _alloReadVisualSupportCollection === 'function' ? _alloReadVisualSupportCollection('alloSchedules') : [];
        const boards = Array.isArray(rawBoards) ? rawBoards : [];
        const schedules = Array.isArray(rawSchedules) ? rawSchedules : [];
        const safeHandoff = stemArtworkHandoff && typeof stemArtworkHandoff === 'object' ? stemArtworkHandoff : {};
        const safeImgSrc = _safeColdImageUrl(safeHandoff.src);
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
            <div ref={stemArtworkHandoffRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="stem-artwork-handoff-title" aria-describedby="stem-artwork-handoff-desc" className="allo-docsuite bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5" onClick={event => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="stem-artwork-handoff-title" className="text-xl font-black text-slate-900">Save as a Visual Support</h2>
                  <p id="stem-artwork-handoff-desc" className="text-sm text-slate-700 mt-1">Give this Art Studio image a short label so it can be shown and spoken from a board or schedule.</p>
                </div>
                <button type="button" onClick={() => setStemArtworkHandoff(null)} className="min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1" aria-label={t('common.close') || 'Close'}><span aria-hidden="true">×</span></button>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-[180px_1fr] items-start">
                <div className="rounded-xl border border-slate-300 bg-slate-100 p-2">
                  {safeImgSrc && <img src={safeImgSrc} alt={safeHandoff.altText || safeHandoff.title || 'Art Studio artwork preview'} className="w-full aspect-square object-contain rounded-lg bg-white" />}
                  <p className="text-[11px] text-slate-700 mt-2">Created in Art Studio{safeHandoff.sourceTab ? ' · ' + safeHandoff.sourceTab : ''}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="stem-artwork-label" className="block text-sm font-bold text-slate-800">Short label</label>
                      <span data-stem-artwork-label-count="true" className="text-xs font-semibold tabular-nums text-slate-600">{safeLabel.length} / 80</span>
                    </div>
                    <input id="stem-artwork-label" type="text" value={safeLabel} maxLength={80} onChange={event => setStemArtworkLabel(event.target.value)} onKeyDown={(event) => { if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return; if (event.key === 'Enter' && safeLabel.trim()) { event.preventDefault(); saveStemArtworkAsVisualSupport(); } }} className="mt-1 w-full min-h-11 rounded-lg border border-slate-400 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1" placeholder={t('visuals.artwork_label_placeholder') || 'For example, My spiral pattern'} data-autofocus="true" />
                    <p className="text-[11px] text-slate-600 mt-1">This is the label students will see and hear.</p>
                  </div>
                  <div>
                    <label htmlFor="stem-artwork-destination" className="block text-sm font-bold text-slate-800">Save to</label>
                    <select id="stem-artwork-destination" value={stemArtworkDestination} onChange={event => setStemArtworkDestination(event.target.value)} className="mt-1 w-full min-h-11 rounded-lg border border-slate-400 px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1">
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
                    <button type="button" onClick={() => setStemArtworkHandoff(null)} className="min-h-11 px-4 rounded-lg border border-slate-400 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1">Cancel</button>
                    <button type="button" onClick={saveStemArtworkAsVisualSupport} disabled={!safeLabel.trim()} className="min-h-11 px-4 rounded-lg bg-indigo-700 text-white text-sm font-bold hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1">Save visual support</button>
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
          <div ref={sessionStartOptionsRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('session.start_dialog_aria') || 'Teach live'} aria-describedby="session-start-options-desc" className="allo-docsuite bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setShowSessionStartOptions(false)} className="absolute top-3 right-3 min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1" aria-label={t('common.close') || 'Close'}><X size={20} aria-hidden="true"/></button>
            <h2 className="text-xl font-black text-slate-900 mb-1 pr-10">{t('share_collect.start_live_session') || 'Teach live'}</h2>
            <p id="session-start-options-desc" className="text-xs text-slate-700 mb-3">{t('share_collect.prepare_the_lesson_flow_if_you') || 'Prepare the lesson flow if you want, then choose how student devices will connect.'}</p>
            <button type="button" onClick={() => { setShowSessionStartOptions(false); setShowLiveLessonPrep(true); }} className="w-full min-h-11 mb-4 text-left rounded-xl border-2 border-cyan-200 bg-cyan-50 p-3 hover:border-cyan-400 hover:bg-cyan-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-1">
              <span className="block text-sm font-black text-cyan-950">{t('share_collect.prepare_live_run') || 'Prepare live lesson'} <span className="text-[10px] uppercase tracking-wide text-cyan-800">optional</span></span>
              <span className="block text-xs text-cyan-900 mt-1">{t('share_collect.attach_private_presenter_cues_and_existing') || 'Attach private presenter cues and existing quick check, Word Cloud, open-response, feedback, Sketch Response, or live-quiz checkpoints to lesson steps. This does not start a session.'}</span>
            </button>
            <div className="space-y-3">
              <button type="button" onClick={() => { setShowSessionStartOptions(false); startClassSession(); }} className="w-full min-h-11 text-left rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 hover:border-indigo-400 hover:bg-indigo-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1">
                <span className="block text-sm font-black text-indigo-900">{t('mailbox.standard_live_session') || 'Standard live session'}</span>
                <span className="block text-xs text-indigo-800 mt-1">{t('mailbox.use_the_configured_firebase_district_or') || 'Use the configured Firebase, district, or local-network session backend.'}</span>
              </button>
              <button type="button" onClick={() => { setShowSessionStartOptions(false); setMbPanelOpen(true); }} className="w-full min-h-11 text-left rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 hover:border-emerald-400 hover:bg-emerald-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-1">
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
  const [, setPolicyTick] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setPolicyTick(v => v + 1);
    const events = ['alloflow:ai-config-changed', 'alloflow:student-ai-config-changed', 'alloflow:ai-key-lock-changed', 'storage'];
    events.forEach(ev => window.addEventListener(ev, sync));
    return () => { events.forEach(ev => window.removeEventListener(ev, sync)); };
  }, []);
  _useColdPathDialogLock(translateModalRef, props.onTrapEscape || handleSetIsTranslateModalOpenToFalse);
        const safeLangInput = String(targetTranslationLang || '');
        const primaryLanguage = safeLangInput.trim();
        const aiTextUsable = _coldPathAiUsable('text');
        const rawChoices = typeof translationTargetChoices === 'function' ? translationTargetChoices(primaryLanguage, currentUiLanguage, selectedLanguages) : [];
        const companionChoices = Array.isArray(rawChoices) ? rawChoices : [];
        const rawPolicy = typeof resolveTranslationPolicy === 'function' ? resolveTranslationPolicy(headerTranslationMode ?? translationMode, primaryLanguage, currentUiLanguage, companionChoices) : null;
        const companionPolicy = rawPolicy && typeof rawPolicy === 'object' ? rawPolicy : { mode: 'off', enabled: false, target: '' };
        const batchHandlers = typeof _alloHostHandlersOptional === 'function' ? _alloHostHandlersOptional() : null;
        const rawBatch = batchHandlers?.getTranslationBatchItems?.('pack');
        const batch = { items: Array.isArray(rawBatch?.items) ? rawBatch.items : [], kind: rawBatch?.kind || 'workspace' };
        const rawCurrentBatch = batchHandlers?.getTranslationBatchItems?.('single');
        const currentBatch = { items: Array.isArray(rawCurrentBatch?.items) ? rawCurrentBatch.items : [] };
        const scopeLabel = batch.kind === 'pack'
          ? (t('translate.action_pack', { count: batch.items.length }) || `Translate pack (${batch.items.length})`)
          : (t('translate.action_workspace', { count: batch.items.length }) || `Translate workspace (${batch.items.length})`);
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
                <button type="button" onClick={handleSetIsTranslateModalOpenToFalse} className="absolute top-4 right-4 min-w-11 min-h-11 inline-flex items-center justify-center p-2 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1" aria-label={t('common.close') || 'Close'}><X size={20} aria-hidden="true"/></button>
                <h2 id="header-translate-dialog-title" className="text-lg font-black text-slate-800 mb-4 pr-10 flex items-center gap-2">
                    <span className="inline-flex bg-indigo-100 p-2 rounded-full text-indigo-700" aria-hidden="true"><Languages size={20} aria-hidden="true"/></span>
                    {t('header.translate_button') || 'Translate'}
                </h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="header-translate-target-language" className="block text-xs font-bold text-slate-700 mb-1">{t('translate.target_label') || 'Target language'}</label>
                        <div className="flex items-stretch gap-2">
                            <input id="header-translate-target-language"
                                type="text"
                                value={safeLangInput}
                                onChange={(e) => setTargetTranslationLang(e.target.value)}
                                className="flex-1 min-w-0 min-h-11 text-sm border-2 border-indigo-600 rounded-xl p-2 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-1 transition-all motion-reduce:transition-none"
                                placeholder={t('translate.placeholder') || 'e.g. Spanish, Arabic, Vietnamese'}
                                data-autofocus="true"
                            />
                            {primaryLanguage.length > 0 && (
                                <button
                                    type="button"
                                    data-translate-clear-lang="true"
                                    onClick={() => setTargetTranslationLang('')}
                                    className="min-h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                >
                                    {t('common.clear') || 'Clear'}
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="header-translate-companion" className="block text-xs font-bold text-slate-700 mb-1">{t('translate.companion_label') || 'Companion language'}</label>
                        <select id="header-translate-companion" value={companionPolicy.mode} onChange={e => setHeaderTranslationMode(e.target.value)} aria-describedby="header-translate-companion-hint" className="w-full min-h-11 text-sm border-2 border-indigo-600 rounded-xl p-2 focus:ring-4 focus:ring-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
                            <option value="auto">{(t('universal.translations_auto') || 'Automatic ({language})').replace('{language}', currentUiLanguage || 'English')}</option>
                            <option value="off">{t('universal.translations_none') || 'None'}</option>
                            {companionChoices.map(language => <option key={language} value={language}>{language}</option>)}
                        </select>
                        <p id="header-translate-companion-hint" className="text-xs text-slate-700 mt-1" aria-live="polite">
                            {companionPolicy.enabled
                                ? (t('translate.companion_on') || 'Include a second version in {language}.').replace('{language}', String(companionPolicy.target || ''))
                                : (t('translate.companion_off') || 'No companion version will be attached.')}
                        </p>
                    </div>
                    <p id="header-translate-scope" className="text-xs text-slate-700">{t('translate.scope_hint') || 'Choose whether to translate only this item or the whole resource pack.'}</p>
                    {(batch.items.some(item => item.type === 'glossary') || generatedContent?.type === 'glossary') && <p className="text-xs text-slate-700">{t('translate.glossary_hint') || 'Glossary terms keep their aligned definitions.'}</p>}
                    {!aiTextUsable && <p role="status" className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{t('errors.ai_unavailable') || 'AI translation is currently unavailable.'}</p>}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            aria-busy={isProcessing ? 'true' : undefined}
                            onClick={() => { setTranslateScope('single'); handleTranslateAction('single', { translationMode: companionPolicy.mode }); }}
                            disabled={isProcessing || !aiTextUsable || !currentBatch.items.length || !primaryLanguage}
                            className="min-h-11 flex-1 py-3 bg-white text-indigo-700 border-2 border-indigo-200 hover:border-indigo-400 font-bold rounded-xl transition-all motion-reduce:transition-none shadow-sm active:scale-95 motion-reduce:transform-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                        >
                            {t('translate.action_current') || 'This item'}
                        </button>
                        <button
                            type="button"
                            aria-busy={isProcessing ? 'true' : undefined}
                            onClick={() => { setTranslateScope('pack'); handleTranslateAction('pack', { translationMode: companionPolicy.mode }); }}
                            disabled={isProcessing || !aiTextUsable || !batch.items.length || !primaryLanguage}
                            className="min-h-11 flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all motion-reduce:transition-none shadow-md active:scale-95 motion-reduce:transform-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
                        >
                            {scopeLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        );
}

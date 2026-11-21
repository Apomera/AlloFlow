// Preserve split-index keys used by existing student projects and voice inputs.
// Numeric citations ([1], [2, 3]) and Markdown links ([text](url)) are not blanks.
const SCAFFOLD_BLANK_PATTERN = /(\[(?!\s*\d+(?:\s*[,;-]\s*\d+)*\s*\])[^\]\n]*\](?!\())/;
function scaffoldParagraphParts(text) {
  return String(text || '').split(SCAFFOLD_BLANK_PATTERN).map((part, index) => ({
    text: part, responseKey: index % 2 === 1 ? 'paragraph-' + index : null
  }));
}
function serializeScaffoldParagraph(text, responses, missing = '_____') {
  return scaffoldParagraphParts(text).map(part => part.responseKey
    ? (String((responses || {})[part.responseKey] || '').trim() || missing) : part.text).join('');
}
function isScaffoldParagraphComplete(text, responses) {
  const blanks = scaffoldParagraphParts(text).filter(part => part.responseKey);
  return blanks.length > 0 && blanks.every(part => String((responses || {})[part.responseKey] || '').trim());
}

function _scaffoldTranslationTarget(artifact) {
  const api = window.AlloModules?.TextPipelineHelpers;
  if (typeof api?.getArtifactTranslationTarget === 'function') return api.getArtifactTranslationTarget(artifact);
  return [artifact?.config?.translationPolicy?.target, artifact?.translationPolicy?.target, artifact?.translationTarget, artifact?.config?.translationTarget, artifact?.config?.attachedTranslationTarget].find(value => typeof value === 'string' && value.trim()) || 'English';
}
function _scaffoldTranslationAttributes(artifact) {
  const api = window.AlloModules?.TextPipelineHelpers;
  if (typeof api?.getArtifactTranslationTextAttributes === 'function') return api.getArtifactTranslationTextAttributes(artifact);
  const target = _scaffoldTranslationTarget(artifact);
  const helpers = window.AlloModules?.ModuleScopeExtras;
  const lang = helpers?.getSpeechLangCode?.(target) || window.AlloFlowLang?.bcp47Full?.(target) || (/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(target) ? target : target === 'English' ? 'en' : 'und');
  return { lang, dir: helpers?.getContentDirection?.(target) || 'auto', style: { textAlign: 'start' } };
}

function SentenceFramesView(props) {
  // State reads
  var t = typeof props.t === 'function' ? props.t : () => '';
  const label = (key, fallback) => {
    const translated = typeof t === 'function' ? t(key) : '';
    return translated && translated !== key ? translated : fallback;
  };
  var generatedContent = props.generatedContent;
  var studentWorkStatus = props.studentWorkStatus;
  var onRetrySave = props.onRetrySave;
  var isTeacherMode = props.isTeacherMode;
  var isScaffoldComplete = props.isScaffoldComplete;
  var isEditingScaffolds = props.isEditingScaffolds;
  var gradingSession = props.gradingSession || { isOpen: false };
  var studentResponses = props.studentResponses || {};
  var isIndependentMode = props.isIndependentMode;
  var isParentMode = props.isParentMode;
  var isGeneratingRubric = props.isGeneratingRubric;
  var rubricZoom = props.rubricZoom;
  var gradingResult = props.gradingResult;
  var studentWorkInput = typeof props.studentWorkInput === 'string' ? props.studentWorkInput : '';
  var isGrading = props.isGrading;
  var leveledTextLanguage = props.leveledTextLanguage;
  // Setters
  var setGradingSession = props.setGradingSession;
  var setStudentWorkInput = props.setStudentWorkInput;
  // Handlers
  var handleResetScaffolds = props.handleResetScaffolds;
  var launchGradingSession = props.launchGradingSession;
  var handleToggleIsEditingScaffolds = props.handleToggleIsEditingScaffolds;
  var submitGradingSession = props.submitGradingSession;
  var handleScaffoldChange = props.handleScaffoldChange;
  var handleStudentInput = props.handleStudentInput;
  var handleScaffoldTextChange = props.handleScaffoldTextChange;
  var handleGenerateRubric = props.handleGenerateRubric;
  var handleToggleRubricZoom = props.handleToggleRubricZoom;
  var handleAutoGrade = props.handleAutoGrade;
  var handleSetGradingResultToNull = props.handleSetGradingResultToNull;
  // Pure helpers
  var getRows = props.getRows;
  var renderFormattedText = props.renderFormattedText;
  var copyToClipboard = props.copyToClipboard;
  // Components
  var DraftFeedbackInterface = props.DraftFeedbackInterface;
  var ErrorBoundary = props.ErrorBoundary;
  const activeFieldRef = React.useRef(null);
  const gradingTriggerRef = React.useRef(null);
  const draftOpenerRef = React.useRef(null);
  const scaffoldData = generatedContent?.data;
  const usableItems = Array.isArray(scaffoldData?.items) ? scaffoldData.items : [];
  const isUsableItem = item => Boolean(
    item
    && typeof item.text === 'string'
    && (isEditingScaffolds || item.text.trim())
    && (isTeacherMode || isEditingScaffolds || (item.isSelected !== false && item.selected !== false))
  );
  const isAssessmentLockdown = !isTeacherMode && !isIndependentMode && Boolean(
    props.assessmentMode
    || props.isAssessmentMode
    || generatedContent?.config?.assessmentMode
    || generatedContent?.data?.assessmentMode
    || (typeof window !== 'undefined' && window.__alloAssessmentMode === true)
  );
  const canViewRubric = Boolean(isTeacherMode || (generatedContent?.data?.rubric && !isAssessmentLockdown));
  const textAiDoor = (typeof window !== 'undefined' && typeof window.__alloAiSetupDoorway === 'function')
    ? window.__alloAiSetupDoorway('text', t)
    : null;
  const textAiUsable = (() => {
    try {
      if (typeof window !== 'undefined' && (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true)) return false;
      if (textAiDoor && textAiDoor.disabled) return false;
      if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return window.__alloAiUsable('text');
    } catch (_) {}
    return true;
  })();
  // A Mastery Check draft belongs to the scaffold it was started on.
  const sessionResourceId = gradingSession.resourceId;
  const ownsSession = prev => !!prev && String(prev.resourceId) === String(sessionResourceId);
  const effectiveEditingScaffolds = Boolean(isTeacherMode && isEditingScaffolds);
  const isSessionOpen = !!gradingSession.isOpen && textAiUsable && (sessionResourceId == null || String(sessionResourceId) === String(generatedContent?.id));
  const wasSessionOpenRef = React.useRef(isSessionOpen);
  const restoreDraftOpenerFocus = () => {
    const candidate = (draftOpenerRef.current && draftOpenerRef.current.isConnected)
      ? draftOpenerRef.current
      : gradingTriggerRef.current;
    draftOpenerRef.current = null;
    if (candidate && typeof document !== 'undefined' && candidate !== document.body && candidate !== document.documentElement && candidate.isConnected && typeof candidate.focus === 'function') {
      try { candidate.focus(); } catch (_) {}
    }
  };
  const [draftCopied, setDraftCopied] = React.useState(false);
  const draftCopiedTimerRef = React.useRef(null);
  const [activeTierFilter, setActiveTierFilter] = React.useState('all');
  const [speakingDraft, setSpeakingDraft] = React.useState(false);
  const draftSpeechListenerRef = React.useRef(null);
  const bionicOn = (typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function') ? window.__alloUseBionic() : false;
  const stopDraftSpeechListener = () => {
    if (draftSpeechListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('allo-speech-state', draftSpeechListenerRef.current);
      draftSpeechListenerRef.current = null;
    }
  };
  React.useEffect(() => () => {
    if (draftCopiedTimerRef.current) { clearTimeout(draftCopiedTimerRef.current); draftCopiedTimerRef.current = null; }
  }, []);
  React.useEffect(() => {
    setActiveTierFilter('all');
    stopDraftSpeechListener();
    setSpeakingDraft(false);
    return () => { stopDraftSpeechListener(); };
  }, [generatedContent?.id]);
  React.useEffect(() => {
    if (wasSessionOpenRef.current && !isSessionOpen) {
      if (typeof document !== 'undefined' && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) {
        restoreDraftOpenerFocus();
      }
    }
    wasSessionOpenRef.current = isSessionOpen;
  }, [isSessionOpen]);
  if (!scaffoldData || (!effectiveEditingScaffolds && (scaffoldData.mode === 'list' ? !usableItems.some(isUsableItem) : typeof scaffoldData.text !== 'string' || !scaffoldData.text.trim()))) {
    return <div role="status" className="rounded-xl border border-slate-300 bg-slate-50 p-5 text-slate-700">{label('scaffolds.empty_resource', 'No writing prompts are available. Choose or regenerate a writing scaffold to begin.')}</div>;
  }
  const canGenerateRubric = !!isTeacherMode && !isParentMode;
  // Shown numbers count only the items that render, so a dropped item leaves no gap.
  const visibleItemNumbers = {};
  usableItems.reduce((n, item, i) => { if (isUsableItem(item)) { visibleItemNumbers[i] = n + 1; return n + 1; } return n; }, 0);
  const gradeScores = gradingResult && Array.isArray(gradingResult.scores) ? gradingResult.scores.filter(s => s && typeof s === 'object') : [];
  const gradeFeedback = gradingResult && gradingResult.feedback && typeof gradingResult.feedback === 'object' ? gradingResult.feedback : {};
  const gradeText = v => (typeof v === 'string' || typeof v === 'number') ? v : '';
  // Optional generator extras (absent on older scaffolds, which render as before).
  const TIER_LABELS = { emerging: ['scaffolds.tier_emerging', 'Emerging'], expanding: ['scaffolds.tier_expanding', 'Expanding'], bridging: ['scaffolds.tier_bridging', 'Bridging'] };
  const TIER_CLASSES = { emerging: 'bg-sky-50 text-sky-800 border-sky-300', expanding: 'bg-violet-50 text-violet-800 border-violet-300', bridging: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
  const tierOf = item => item && typeof item.tier === 'string' && TIER_LABELS[item.tier] ? item.tier : null;
  const wordBank = (Array.isArray(scaffoldData.wordBank) ? scaffoldData.wordBank : []).filter(w => typeof w === 'string' && w.trim()).map(w => w.trim()).slice(0, 40);
  const wordBankHeadingId = `scaffold-word-bank-${generatedContent?.id}`;
  const isDiscussionPrompts = scaffoldData.frameType === 'Discussion Prompts' || /^Discussion Prompts\b/.test(String(generatedContent?.meta || ''));
  const insertWordBankTerm = (word) => {
    if (!generatedContent || typeof handleStudentInput !== 'function') return;
    const resId = generatedContent.id;
    const data = generatedContent.data || {};
    let targetKey = null;
    const tracked = activeFieldRef.current && activeFieldRef.current.resourceId === resId ? activeFieldRef.current : null;
    if (tracked && tracked.key != null) {
      targetKey = tracked.key;
    } else if (data.mode === 'list') {
      const firstIdx = usableItems.findIndex(isUsableItem);
      if (firstIdx >= 0) targetKey = firstIdx;
    } else {
      const firstBlank = scaffoldParagraphParts(data.text).find(p => p.responseKey);
      if (firstBlank) targetKey = firstBlank.responseKey;
    }
    if (targetKey == null) return;
    const currentVal = String((studentResponses[resId] && studentResponses[resId][targetKey]) || '');
    const el = tracked && tracked.el && tracked.el.isConnected ? tracked.el : null;
    const hasSelection = el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number';
    const start = hasSelection ? Math.max(0, Math.min(currentVal.length, el.selectionStart)) : currentVal.length;
    const end = hasSelection ? Math.max(start, Math.min(currentVal.length, el.selectionEnd)) : start;
    const before = currentVal.slice(0, start);
    const after = currentVal.slice(end);
    const needsLeadingSpace = before.length > 0 && !/[\s(\["'“‘/-]$/.test(before);
    const needsTrailingSpace = after.length > 0 && !/^[\s.,!?;:)\]"'”’/-]/.test(after);
    const inserted = (needsLeadingSpace ? ' ' : '') + word + (needsTrailingSpace ? ' ' : '');
    const nextVal = before + inserted + after;
    handleStudentInput(resId, targetKey, nextVal);
    if (el) {
      const caretPos = before.length + (needsLeadingSpace ? 1 : 0) + word.length;
      const restoreFocus = () => {
        try {
          el.focus();
          if (typeof el.setSelectionRange === 'function') el.setSelectionRange(caretPos, caretPos);
        } catch (_) {}
      };
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(restoreFocus);
      } else {
        restoreFocus();
      }
    }
  };
  const assembleStudentDraft = () => {
    const resKey = generatedContent?.id || 'current';
    const respMap = studentResponses[resKey] || {};
    if (scaffoldData?.mode === 'paragraph' && typeof scaffoldData?.text === 'string') {
      return serializeScaffoldParagraph(scaffoldData.text, respMap, '_____').trim();
    }
    return usableItems
      .map((item, idx) => {
        if (!isUsableItem(item)) return '';
        const ans = String(respMap[idx] || '').trim();
        if (!ans) return '';
        const stem = String(item.text || '').trim();
        return stem.includes('___') ? stem.replace(/_{2,}/, ans) : (stem ? stem + ' ' + ans : ans);
      })
      .filter(Boolean)
      .join('\n\n');
  };
  const handleCopyAssembledDraft = () => {
    const assembled = assembleStudentDraft();
    if (!assembled) return;
    const markCopied = () => {
      setDraftCopied(true);
      if (draftCopiedTimerRef.current) clearTimeout(draftCopiedTimerRef.current);
      draftCopiedTimerRef.current = setTimeout(() => { draftCopiedTimerRef.current = null; setDraftCopied(false); }, 2000);
    };
    if (typeof copyToClipboard === 'function') {
      copyToClipboard(assembled);
      markCopied();
    } else if (typeof window !== 'undefined' && typeof window.alloCopyText === 'function') {
      window.alloCopyText(assembled);
      markCopied();
    } else if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(assembled).then(markCopied).catch(() => {});
    }
  };
  const handleListenAssembledDraft = () => {
    const player = typeof window !== 'undefined' ? window.AlloSpeechPlayer : null;
    const finished = () => { stopDraftSpeechListener(); setSpeakingDraft(false); };
    stopDraftSpeechListener();
    if (speakingDraft) {
      if (player && typeof player.stop === 'function') player.stop();
      else if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
      setSpeakingDraft(false);
      return;
    }
    const spoken = assembleStudentDraft().replace(/_{2,}/g, ' blank ').replace(/\s+/g, ' ').trim();
    if (!spoken) return;
    if (player && typeof player.speak === 'function') {
      let ourId = null;
      const onState = (e) => {
        const d = e.detail || {};
        if (ourId === null) { if (d.isPlaying) ourId = d.currentId; return; }
        if (!d.isPlaying || d.currentId !== ourId) finished();
      };
      draftSpeechListenerRef.current = onState;
      window.addEventListener('allo-speech-state', onState);
      setSpeakingDraft(true);
      const langOpt = leveledTextLanguage && leveledTextLanguage !== 'English' ? { language: leveledTextLanguage } : {};
      Promise.resolve(player.speak(spoken, langOpt)).then(res => { if (res === null && ourId === null) finished(); }, finished);
    } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
      setSpeakingDraft(true);
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(spoken);
      if (leveledTextLanguage && typeof window.languageToTTSCode === 'function') {
        try { u.lang = window.languageToTTSCode(leveledTextLanguage); } catch (_) {}
      }
      u.onend = finished;
      u.onerror = finished;
      window.speechSynthesis.speak(u);
    }
  };
  const assembledDraftText = !isTeacherMode ? assembleStudentDraft() : '';
  const hasAssembledDraft = !isTeacherMode && Boolean(assembledDraftText);
  const currentRespMap = studentResponses[generatedContent?.id] || {};
  const draftStats = (() => {
    if (scaffoldData?.mode === 'paragraph' && typeof scaffoldData?.text === 'string') {
      const blanks = scaffoldParagraphParts(scaffoldData.text).filter(p => p.responseKey);
      const filled = blanks.filter(p => String(currentRespMap[p.responseKey] || '').trim()).length;
      const words = blanks.map(p => String(currentRespMap[p.responseKey] || '')).join(' ').split(/\s+/).filter(Boolean).length;
      return { filled, total: blanks.length, words, isParagraph: true };
    }
    let total = 0, filled = 0;
    const chunks = [];
    usableItems.forEach((item, idx) => {
      if (!isUsableItem(item)) return;
      total += 1;
      const v = String(currentRespMap[idx] || '').trim();
      if (v) { filled += 1; chunks.push(v); }
    });
    return { filled, total, words: chunks.join(' ').split(/\s+/).filter(Boolean).length, isParagraph: false };
  })();
  const studentCombinedLower = Object.values(currentRespMap).filter(v => typeof v === 'string').join(' ').toLowerCase();
  const isWordBankTermUsed = (word) => {
    if (!studentCombinedLower || !word) return false;
    const needle = String(word).trim().toLowerCase();
    if (!needle) return false;
    if (/^[a-z0-9\s'-]+$/i.test(needle)) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'i').test(studentCombinedLower);
    }
    return studentCombinedLower.indexOf(needle) !== -1;
  };
  const usedWordBankCount = (!isTeacherMode && !isEditingScaffolds && wordBank.length > 0)
    ? wordBank.reduce((n, w) => n + (isWordBankTermUsed(w) ? 1 : 0), 0)
    : 0;
  const tierCounts = { emerging: 0, expanding: 0, bridging: 0 };
  if (scaffoldData?.mode === 'list') {
    usableItems.forEach((item) => {
      if (!isUsableItem(item)) return;
      const tier = tierOf(item);
      if (tier) tierCounts[tier] += 1;
    });
  }
  const presentTiers = ['emerging', 'expanding', 'bridging'].filter(k => tierCounts[k] > 0);
  const showTierFilter = scaffoldData?.mode === 'list' && !isEditingScaffolds && !isSessionOpen && presentTiers.length >= 2;
  const effectiveTierFilter = (showTierFilter && presentTiers.includes(activeTierFilter)) ? activeTierFilter : 'all';
  const bt = s => (bionicOn && typeof s === 'string' && typeof window !== 'undefined' && typeof window.__alloBionicReact === 'function') ? window.__alloBionicReact(s) : s;
  return (
                  <div className="space-y-6">
                      <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 mb-6 flex flex-wrap justify-between items-center gap-4" data-help-key="scaffolds_goal_panel">
                        {isTeacherMode && <p className="text-sm text-rose-800 flex-grow"><strong>{t('about.action_title')}</strong> {t('about.action_desc')}</p>}
                        {!isTeacherMode && !isSessionOpen && draftStats.total > 0 && (
                            <div data-scaffolds-progress className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${draftStats.filled === draftStats.total ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-white text-rose-900 border-rose-200'}`}>
                                    {draftStats.filled === draftStats.total
                                      ? '✓ ' + label(draftStats.isParagraph ? 'scaffolds.all_blanks_filled' : 'scaffolds.all_prompts_started', draftStats.isParagraph ? `All ${draftStats.total} blanks filled` : `All ${draftStats.total} prompts started`)
                                      : label(draftStats.isParagraph ? 'scaffolds.blanks_progress' : 'scaffolds.prompts_progress', draftStats.isParagraph ? `${draftStats.filled} / ${draftStats.total} blanks filled` : `${draftStats.filled} / ${draftStats.total} prompts started`).replace('{filled}', String(draftStats.filled)).replace('{total}', String(draftStats.total))}
                                </span>
                                {draftStats.words > 0 && (
                                    <span className="text-xs font-semibold text-rose-800">{draftStats.words} {draftStats.words === 1 ? label('common.word', 'word') : label('common.words', 'words')}</span>
                                )}
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 ml-auto">
                            {['saving', 'saved', 'error'].includes(studentWorkStatus) && (
                                <div role="status" aria-live="polite" aria-atomic="true" className={`flex flex-wrap items-center gap-1.5 text-xs font-bold ${studentWorkStatus === 'error' ? 'text-red-700' : studentWorkStatus === 'saving' ? 'text-rose-700' : 'text-green-700'}`}>
                                    {studentWorkStatus === 'saving' ? <><RefreshCw size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t('status.saving')}</>
                                      : studentWorkStatus === 'saved' ? <><CheckCircle2 size={12} aria-hidden="true" /> {t('status.saved')}</>
                                      : <><span>{label('scaffolds.save_failed', 'Your answers could not be saved on this device.')}</span>{typeof onRetrySave === 'function' && <button type="button" onClick={onRetrySave} className="min-h-11 rounded border border-red-300 px-2 py-1 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600">{label('common.retry', 'Try again')}</button>}</>}
                                </div>
                            )}
                            {!isTeacherMode && (
                                <>
                                <button
                                    type="button"
                                    onClick={handleResetScaffolds}
                                    data-help-key="scaffolds_reset"
                                    className="min-h-11 flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-white border border-rose-300 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none shadow-sm focus-visible:outline-2 focus-visible:outline-rose-600 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-rose-600"
                                    title={t('scaffolds.clear_all')}
                                    aria-label={`${t('common.reset') || 'Reset'} — ${t('scaffolds.clear_all') || 'Clear all answers'}`}
                                >
                                    <RefreshCw size={12} aria-hidden="true" /> {t('common.reset')}
                                </button>
                                <button
                                    type="button"
                                    data-scaffolds-listen-draft
                                    disabled={!hasAssembledDraft && !speakingDraft}
                                    aria-pressed={speakingDraft}
                                    onClick={handleListenAssembledDraft}
                                    className={`min-h-11 flex items-center gap-1 text-xs font-bold border px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 ${speakingDraft ? 'bg-rose-100 text-rose-900 border-rose-400 hover:bg-rose-200' : 'bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-50'}`}
                                    title={speakingDraft ? label('common.stop', 'Stop reading') : label('scaffolds.listen_draft_title', 'Hear your completed writing read aloud')}
                                    aria-label={speakingDraft ? label('a11y.stop_reading', 'Stop reading') : label('scaffolds.listen_draft_aria', 'Listen to my draft')}
                                >
                                    <span aria-hidden="true">{speakingDraft ? '⏹️' : '🔊'}</span>
                                    {speakingDraft ? label('common.stop', 'Stop') : label('scaffolds.listen_draft', 'Listen to draft')}
                                </button>
                                <button
                                    type="button"
                                    data-scaffolds-copy-draft
                                    disabled={!hasAssembledDraft}
                                    onClick={handleCopyAssembledDraft}
                                    className="min-h-11 flex items-center gap-1 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
                                    title={label('scaffolds.copy_draft_title', 'Copy your completed writing draft')}
                                    aria-label={label('scaffolds.copy_draft_aria', 'Copy my completed draft')}
                                >
                                    {draftCopied ? <CheckCircle2 size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                                    {draftCopied ? label('common.copied', 'Copied!') : label('scaffolds.copy_draft', 'Copy my draft')}
                                </button>
                                {textAiUsable && (
                                <button
                                    ref={gradingTriggerRef}
                                    type="button"
                                    onClick={() => {
                                        if (typeof document !== 'undefined' && document.activeElement && document.activeElement !== document.body && document.activeElement !== document.documentElement) {
                                            draftOpenerRef.current = document.activeElement;
                                        } else {
                                            draftOpenerRef.current = gradingTriggerRef.current;
                                        }
                                        launchGradingSession();
                                    }}
                                    data-help-key="scaffolds_grading"
                                    className={`min-h-11 flex items-center gap-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-full transition-all motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 ${isScaffoldComplete ? 'animate-pulse motion-reduce:animate-none ring-4 ring-rose-300 shadow-lg scale-105' : ''}`}
                                    title={label('scaffolds.feedback_purpose', 'Get AI feedback on your draft. This does not submit your work to your teacher.')}
                                    aria-label={label('scaffolds.get_draft_feedback', 'Get feedback on my draft')}
                                >
                                    <Sparkles size={12} aria-hidden="true" className="text-amber-200" /> {label('scaffolds.get_draft_feedback', 'Get feedback on my draft')}
                                </button>
                                )}
                                </>
                            )}
                            {isTeacherMode && (
                            <button
                                type="button"
                                onClick={handleToggleIsEditingScaffolds}
                                aria-pressed={isEditingScaffolds}
                                data-help-key="scaffolds_edit_toggle"
                                className={`min-h-11 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 ${isEditingScaffolds ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'}`}
                            >
                                {isEditingScaffolds ? <CheckCircle2 size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
                                {isEditingScaffolds ? t('common.done_editing') : t('scaffolds.edit')}
                            </button>
                            )}
                        </div>
                    </div>
                    {isTeacherMode && !textAiUsable && typeof window !== 'undefined' && window.AlloAiSetupNotice && (
                        <window.AlloAiSetupNotice kind="text" t={t} />
                    )}
                    {!isTeacherMode && textAiUsable && <p data-scaffold-feedback-purpose className="text-sm text-slate-700">{label('scaffolds.feedback_purpose','Get AI feedback on your draft. This does not submit your work to your teacher.')}</p>}
                    {wordBank.length > 0 && (
                        <section data-scaffold-word-bank aria-labelledby={wordBankHeadingId} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <h4 id={wordBankHeadingId} className="text-xs font-bold text-amber-900 uppercase tracking-wider">{label('scaffolds.word_bank', 'Word bank')}</h4>
                                    {!isTeacherMode && !isEditingScaffolds && (
                                        <span data-scaffold-word-bank-count className={`text-xs font-bold px-2 py-0.5 rounded-full border ${usedWordBankCount === wordBank.length ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-white text-amber-900 border-amber-300'}`}>
                                            {label('scaffolds.word_bank_used_count', '{used}/{total} used').replace('{used}', String(usedWordBankCount)).replace('{total}', String(wordBank.length))}
                                        </span>
                                    )}
                                </div>
                                {!isTeacherMode && !isEditingScaffolds && (
                                    <span className="text-xs font-medium text-amber-800">{label('scaffolds.word_bank_hint', 'Click a word to insert it')}</span>
                                )}
                            </div>
                            <ul className="flex flex-wrap gap-2">
                                {wordBank.map((word, i) => {
                                    const used = !isTeacherMode && !isEditingScaffolds && isWordBankTermUsed(word);
                                    return (
                                    <li key={i}>
                                        {(!isTeacherMode && !isEditingScaffolds) ? (
                                            <button
                                                type="button"
                                                dir="auto"
                                                data-word-bank-used={used ? 'true' : 'false'}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => insertWordBankTerm(word)}
                                                aria-label={`${label('scaffolds.insert_word', 'Insert word')}: ${word}${used ? ' (' + label('scaffolds.word_used', 'used') + ')' : ''}`}
                                                className={`min-h-11 px-3 py-1.5 rounded-full border text-sm font-semibold active:scale-95 transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 cursor-pointer ${used ? 'bg-emerald-50 border-emerald-400 text-emerald-900 hover:bg-emerald-100' : 'bg-white border-amber-300 text-amber-950 hover:bg-amber-100 hover:border-amber-500'}`}
                                            >{used && <span aria-hidden="true" className="mr-1 text-emerald-700">✓</span>}{bt(word)}</button>
                                        ) : (
                                            <span dir="auto" className="inline-block px-3 py-1 rounded-full bg-white border border-amber-300 text-sm font-semibold text-amber-950">{bt(word)}</span>
                                        )}
                                    </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}
                    {showTierFilter && (
                        <div data-scaffolds-tier-filter data-scaffold-tier="filter" role="group" aria-label={label('scaffolds.filter_by_tier', 'Filter writing supports by level')} className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-600">{label('scaffolds.tier_filter_label', 'Level:')}</span>
                            <button
                                type="button"
                                data-tier-filter="all"
                                aria-pressed={effectiveTierFilter === 'all'}
                                onClick={() => setActiveTierFilter('all')}
                                className={`min-h-11 px-3 py-1 rounded-full text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 ${effectiveTierFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                            >{label('common.all', 'All')} ({draftStats.total})</button>
                            {presentTiers.map((tierKey) => (
                                <button
                                    key={tierKey}
                                    type="button"
                                    data-tier-filter={tierKey}
                                    aria-pressed={effectiveTierFilter === tierKey}
                                    onClick={() => setActiveTierFilter(tierKey)}
                                    className={`min-h-11 px-3 py-1 rounded-full text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 ${effectiveTierFilter === tierKey ? 'bg-rose-700 text-white border-rose-700' : TIER_CLASSES[tierKey] + ' hover:opacity-90'}`}
                                >{label(TIER_LABELS[tierKey][0], TIER_LABELS[tierKey][1])} ({tierCounts[tierKey]})</button>
                            ))}
                        </div>
                    )}
                    {isSessionOpen ? (<ErrorBoundary fallbackMessage={label('scaffolds.draft_feedback_error', 'Draft feedback encountered an error. Please try again.')}>
                        <DraftFeedbackInterface
                            status={gradingSession.status}
                            draftText={gradingSession.draftText}
                            setDraftText={(val) => setGradingSession(prev => ownsSession(prev) ? { ...prev, draftText: val } : prev)}
                            previousDraft={gradingSession.previousDraft}
                            gradingDetails={gradingSession.feedback}
                            draftCount={gradingSession.draftCount}
                            finalScore={gradingSession.finalScore}
                            xpEarned={gradingSession.xpAwarded}
                            onSubmit={submitGradingSession}
                            onCancel={() => {
                                setGradingSession(prev => ownsSession(prev) ? { ...prev, isOpen: false } : prev);
                                restoreDraftOpenerFocus();
                            }}
                        />
                    </ErrorBoundary>
                    ) : generatedContent?.data?.mode === 'list' ? (
                        <div className="grid grid-cols-1 gap-4">
                             {usableItems.map((item, idx) => (isUsableItem(item) && (effectiveTierFilter === 'all' || tierOf(item) === effectiveTierFilter)) ? (
                                 <div key={idx} className="bg-white p-4 rounded-xl border border-slate-400 shadow-sm hover:border-indigo-200 transition-colors motion-reduce:transition-none" data-help-key="scaffolds_item">
                                     <div className="flex items-start gap-3">
                                         <div className="bg-rose-100 text-rose-800 font-bold px-2 py-1 rounded text-xs shrink-0 mt-1">{visibleItemNumbers[idx]}</div>
                                         <div className="w-full min-w-0">
                                            {tierOf(item) && <span data-scaffold-tier={tierOf(item)} className={`inline-block mb-1 px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wider ${TIER_CLASSES[tierOf(item)]}`}>{label(TIER_LABELS[tierOf(item)][0], TIER_LABELS[tierOf(item)][1])}</span>}
                                            {effectiveEditingScaffolds ? (
                                                <>
                                                    <textarea
                                                        aria-label={t('scaffolds.edit_item') || `Edit scaffold item ${idx + 1}`}
                                                        value={item.text}
                                                        onChange={(e) => handleScaffoldChange(idx, 'text', e.target.value)}
                                                        className="w-full text-lg font-medium text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus:outline-none resize-none transition-all motion-reduce:transition-none font-serif"
                                                        rows={getRows(item.text)}
                                                    />
                                                    {(item.text_en !== undefined || leveledTextLanguage !== 'English') && (
                                                        <textarea
                                                            {..._scaffoldTranslationAttributes(generatedContent)}
                                                            aria-label={t('scaffolds.edit_item_translation') || `Edit scaffold item ${idx + 1} translation`}
                                                            value={item.text_en || ''}
                                                            onChange={(e) => handleScaffoldChange(idx, 'text_en', e.target.value, true)}
                                                            className="w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus:outline-none resize-none transition-all motion-reduce:transition-none"
                                                            rows={getRows(item.text_en || '')}
                                                            placeholder={t('common.placeholder_translation')}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <p id={`scaffold-prompt-${generatedContent.id}-${idx}`} lang={leveledTextLanguage && leveledTextLanguage !== 'English' && typeof window !== 'undefined' && typeof window.languageToTTSCode === 'function' ? window.languageToTTSCode(leveledTextLanguage) : undefined} dir="auto" className="text-lg break-words font-medium text-slate-800 mb-1 font-serif px-2 py-1">{bt(item.text)}</p>
                                                    {item.text_en && <p {..._scaffoldTranslationAttributes(generatedContent)} className="text-sm text-slate-600 italic px-2">{bt(item.text_en)}</p>}
                                                    <textarea
                                                        aria-label={`${label('scaffolds.student_response', 'Student response')} ${visibleItemNumbers[idx]}`}
                                                        aria-describedby={`scaffold-prompt-${generatedContent.id}-${idx}`}
                                                        value={studentResponses[generatedContent.id]?.[idx] || ''}
                                                        onFocus={(e) => { activeFieldRef.current = { resourceId: generatedContent.id, key: idx, el: e.currentTarget }; }}
                                                        onChange={(e) => handleStudentInput(generatedContent.id, idx, e.target.value)}
                                                        data-help-key="scaffolds_student_input"
                                                        className="w-full mt-2 p-3 border border-slate-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-600 focus:border-rose-600 focus-visible:outline-2 focus-visible:outline-rose-600 focus-visible:outline-offset-2 resize-y bg-slate-50 focus:bg-white transition-all motion-reduce:transition-none font-sans"
                                                        rows={3}
                                                        placeholder={isDiscussionPrompts ? label('scaffolds.discussion_placeholder', 'Write your response to the question...') : t('scaffolds.sentence_placeholder')}
                                                    />
                                                    {typeof window !== 'undefined' && typeof window.AlloDictationButton === 'function' && (
                                                        <div className="mt-2">
                                                            {React.createElement(window.AlloDictationButton, {
                                                                t,
                                                                language: leveledTextLanguage,
                                                                label: label('scaffolds.dictate_response', 'Dictate response'),
                                                                onTranscript: (spoken) => {
                                                                    const prev = String(studentResponses[generatedContent.id]?.[idx] || '');
                                                                    const sep = prev && !/\s$/.test(prev) ? ' ' : '';
                                                                    handleStudentInput(generatedContent.id, idx, prev + sep + spoken);
                                                                },
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="mt-3 border-b border-slate-100 border-dashed w-full"></div>
                                         </div>
                                     </div>
                                 </div>
                              ) : null)}
                        </div>
                    ) : (
                        <div className="bg-white p-4 sm:p-8 rounded-xl border border-slate-400 shadow-sm" data-help-key="scaffolds_paragraph_frame">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">{t('scaffolds.paragraph_frame') || 'Paragraph Frame'}</h4>
                            {isEditingScaffolds ? (
                                <textarea
                                    aria-label={t('scaffolds.edit_paragraph_frame') || 'Edit paragraph frame text'}
                                    value={generatedContent?.data?.text}
                                    onChange={(e) => handleScaffoldTextChange('text', e.target.value)}
                                    className="w-full text-lg leading-loose text-slate-800 font-serif bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus:outline-none resize-none transition-all motion-reduce:transition-none"
                                    rows={getRows(generatedContent?.data?.text)}
                                />
                            ) : (
                                <div lang={leveledTextLanguage && leveledTextLanguage !== 'English' && typeof window !== 'undefined' && typeof window.languageToTTSCode === 'function' ? window.languageToTTSCode(leveledTextLanguage) : undefined} className="text-lg leading-loose text-slate-800 font-serif px-2 py-1">
                                    {scaffoldParagraphParts(generatedContent?.data?.text).map(({ text: part, responseKey }, i) => (
                                        responseKey ?
                                        <input aria-label={`${label('common.enter_student_responses', 'Student response')} ${(i + 1) / 2}: ${part.replace(/[\[\]]/g, '')}`}
                                            key={i}
                                            type="text"
                                            value={studentResponses[generatedContent.id]?.[responseKey] || ''}
                                            onFocus={(e) => { activeFieldRef.current = { resourceId: generatedContent.id, key: responseKey, el: e.currentTarget }; }}
                                            onChange={(e) => handleStudentInput(generatedContent.id, responseKey, e.target.value)}
                                            dir="auto" className="placeholder:text-current placeholder:opacity-100 placeholder:font-normal inline-block w-44 max-w-full min-h-11 border-b-2 border-slate-500 mx-1 text-center text-indigo-700 font-bold focus:border-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-indigo-600 bg-transparent min-w-[100px] px-1 focus:bg-indigo-50 rounded transition-colors motion-reduce:transition-none"
                                            placeholder={part.replace(/[\[\]]/g, '')}
                                        /> :
                                        <span key={i}>{bt(part)}</span>
                                    ))}
                                </div>
                            )}
                            {((isEditingScaffolds && (leveledTextLanguage !== 'English' || generatedContent?.data?.text_en !== undefined)) || generatedContent?.data?.text_en) && (
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{/^english$/i.test(_scaffoldTranslationTarget(generatedContent)) ? t('common.english_translation') : label('translate.companion_label', 'Companion translation') + ' (' + _scaffoldTranslationTarget(generatedContent) + ')'}</h4>
                                    {isEditingScaffolds ? (
                                        <textarea
                                            {..._scaffoldTranslationAttributes(generatedContent)}
                                            aria-label={t('scaffolds.edit_paragraph_translation') || 'Edit paragraph frame translation'}
                                            value={generatedContent?.data?.text_en || ''}
                                            onChange={(e) => handleScaffoldTextChange('text_en', e.target.value)}
                                            className="w-full text-slate-600 italic leading-relaxed bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus-visible:outline-2 focus-visible:outline-indigo-600 focus-visible:outline-offset-2 resize-none transition-all motion-reduce:transition-none"
                                            rows={getRows(generatedContent?.data?.text_en || '')}
                                            placeholder={t('common.placeholder_translation')}
                                        />
                                    ) : (
                                        generatedContent?.data?.text_en && <p {..._scaffoldTranslationAttributes(generatedContent)} className="text-slate-600 italic leading-relaxed px-2 py-1">{bt(generatedContent?.data?.text_en)}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    {canViewRubric && (
                    <div className="mt-1 pt-4 border-t border-rose-100 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                                <h4 className="font-bold text-rose-900 flex items-center gap-2">
                                <ClipboardList size={18} aria-hidden="true" className="text-rose-600"/> {isIndependentMode ? label('scaffolds.self_checklist', 'Self-Checklist') : label('scaffolds.rubric', 'Grading Rubric')}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2">
                                    {canGenerateRubric && (
                                        <button
                                        type="button"
                                        onClick={handleGenerateRubric}
                                        disabled={isGeneratingRubric || !textAiUsable}
                                        title={!textAiUsable ? ((textAiDoor && textAiDoor.title) || label('sidebar.needs_ai_setup', 'Needs AI setup')) : undefined}
                                        aria-busy={!!isGeneratingRubric}
                                        className="min-h-11 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-700 px-3 py-1.5 rounded-full font-bold transition-colors motion-reduce:transition-none flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                                        >
                                        {isGeneratingRubric ? <RefreshCw size={12} aria-hidden="true" className="animate-spin motion-reduce:animate-none"/> : <Sparkles size={12} aria-hidden="true"/>}
                                        {generatedContent?.data?.rubric
                                            ? (isIndependentMode ? label('scaffolds.regenerate_self_checklist', 'Regenerate Self-Checklist') : label('scaffolds.regenerate_rubric', 'Regenerate Rubric'))
                                            : (isIndependentMode ? label('scaffolds.generate_self_checklist', 'Generate Self-Checklist') : label('scaffolds.generate_rubric', 'Generate Rubric'))}
                                        </button>
                                    )}
                                    {generatedContent?.data?.rubric && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleToggleRubricZoom}
                                                aria-pressed={!!rubricZoom}
                                                className={`min-h-11 text-xs flex items-center gap-1 px-3 py-1.5 rounded transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${rubricZoom ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-white text-slate-700 hover:text-indigo-700 border-slate-400'}`}
                                                title={t('scaffolds.rubric_toggle_tooltip')}
                                            >
                                                {rubricZoom ? <Maximize size={12} aria-hidden="true"/> : <Minimize size={12} aria-hidden="true"/>}
                                                {rubricZoom ? t('scaffolds.rubric_normal') : t('scaffolds.rubric_fit')}
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={t('common.copy')}
                                                onClick={() => copyToClipboard(generatedContent?.data?.rubric)}
                                                className="min-h-11 text-xs flex items-center gap-1 bg-white text-slate-700 hover:text-indigo-700 border border-slate-400 hover:border-indigo-400 px-3 py-1.5 rounded transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                                title={t('scaffolds.rubric_copy_tooltip')}
                                            >
                                                <Copy size={12} aria-hidden="true"/> {t('scaffolds.rubric_copy')}
                                            </button>
                                        </>
                                    )}
                                </div>
                        </div>
                        {generatedContent?.data?.rubric && (
                            <div className={`bg-white p-4 rounded-xl border border-slate-400 relative shadow-sm transition-all motion-reduce:transition-none ${rubricZoom ? 'text-xs' : ''}`}>
                                <style>{rubricZoom ? `
                                    .rubric-container table th, .rubric-container table td { padding: 4px !important; line-height: 1.2 !important; }
                                    .rubric-container h1, .rubric-container h2, .rubric-container h3 { font-size: 1em !important; margin: 0.5em 0 !important; }
                                    .rubric-container p { margin-bottom: 0.5em !important; }
                                ` : ''}</style>
                                {isEditingScaffolds ? (
                                    <textarea
                                        aria-label={t('scaffolds.edit_rubric') || 'Edit rubric'}
                                        value={generatedContent?.data?.rubric}
                                        onChange={(e) => handleScaffoldTextChange('rubric', e.target.value)}
                                        className="w-full text-sm bg-transparent border border-slate-400 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:bg-slate-50 rounded p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 resize-y font-medium text-slate-700 transition-all motion-reduce:transition-none font-mono"
                                        rows={getRows(generatedContent?.data?.rubric)}
                                        placeholder={t('scaffolds.rubric_placeholder')}
                                    />
                                ) : (
                                    <div tabIndex={0} role="region" aria-label={t('scaffolds.rubric') || 'Rubric'} className="rubric-container prose prose-sm max-w-none text-slate-700 leading-relaxed overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                                        {renderFormattedText(generatedContent?.data?.rubric)}
                                    </div>
                                )}
                            </div>
                        )}
                        {isTeacherMode && generatedContent?.data?.rubric && (
                            <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
                                <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={18} aria-hidden="true" className="text-indigo-600"/> {t('scaffolds.auto_grader')}
                                </h4>
                                {!gradingResult ? (
                                    <div className="space-y-3">
                                        <textarea
                                            aria-label={t('dashboard.grading.student_work_input') || 'Paste student work for grading'}
                                            value={studentWorkInput}
                                            onChange={(e) => setStudentWorkInput(e.target.value)}
                                            className="w-full p-3 text-sm border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 resize-y h-32 bg-white"
                                            placeholder={t('dashboard.grading.work_placeholder')}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAutoGrade}
                                            disabled={!studentWorkInput.trim() || isGrading || !textAiUsable}
                                            title={!textAiUsable ? ((textAiDoor && textAiDoor.title) || label('sidebar.needs_ai_setup', 'Needs AI setup')) : undefined}
                                            aria-busy={!!isGrading}
                                            className="min-h-11 w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                                        >
                                            {isGrading ? <RefreshCw size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none"/> : <Sparkles size={16} aria-hidden="true" className="text-amber-200 fill-current"/>}
                                            {isGrading ? t('dashboard.grading.grade_work_loading') : t('dashboard.grading.grade_work_btn')}
                                        </button>
                                    </div>
                                ) : (
                                    <div role="status" aria-live="polite" className="animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2">
                                        <div className="bg-white rounded-lg border border-indigo-200 p-4 mb-4">
                                            <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-2">
                                                <span className="font-bold text-indigo-900 text-lg">{t('dashboard.grading.total_score')}</span>
                                                <span className="bg-indigo-100 text-indigo-800 font-black px-3 py-1 rounded-full">{gradeText(gradingResult.totalScore)}</span>
                                            </div>
                                            <div className="space-y-3 mb-4">
                                                {gradeScores.map((s, i) => (
                                                    <div key={i} className="text-sm">
                                                        <div className="flex justify-between font-bold text-slate-700">
                                                            <span>{gradeText(s.criteria)}</span>
                                                            <span>{gradeText(s.score)}</span>
                                                        </div>
                                                        <p className="text-slate-600 text-xs italic">{bt(gradeText(s.comment))}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                                <div className="bg-green-50 p-3 rounded border border-green-200">
                                                    <strong className="text-green-800 block mb-1 flex items-center gap-1"><Sparkles size={12} aria-hidden="true"/> {t('dashboard.grading.glow_label')}</strong>
                                                    <p className="text-green-800">{bt(gradeText(gradeFeedback.glow))}</p>
                                                </div>
                                                <div className="bg-orange-50 p-3 rounded border border-orange-200">
                                                    <strong className="text-orange-800 block mb-1 flex items-center gap-1"><ArrowUpRight size={12} aria-hidden="true"/> {t('dashboard.grading.grow_label')}</strong>
                                                    <p className="text-orange-800">{bt(gradeText(gradeFeedback.grow))}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSetGradingResultToNull}
                                            className="min-h-11 text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline w-full text-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                        >
                                            {t('dashboard.grading.grade_another')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                  </div>
  );
}

SentenceFramesView.paragraphParts = scaffoldParagraphParts;
SentenceFramesView.serializeParagraph = serializeScaffoldParagraph;
SentenceFramesView.isParagraphComplete = isScaffoldParagraphComplete;

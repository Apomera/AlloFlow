/**
 * AlloFlow View - Sentence Frames Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='sentence-frames' block.
 * Source range (post-FaqView): 291 lines.
 * Renders the Sentence Frames / Scaffolds view: list/paragraph modes,
 * grading rubric, AI auto-grader, draft feedback flow.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SentenceFramesView) {
    console.log('[CDN] ViewSentenceFramesModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSentenceFramesModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var RefreshCw = _lazyIcon('RefreshCw');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Sparkles = _lazyIcon('Sparkles');
  var Pencil = _lazyIcon('Pencil');
  var ClipboardList = _lazyIcon('ClipboardList');
  var Maximize = _lazyIcon('Maximize');
  var Minimize = _lazyIcon('Minimize');
  var Copy = _lazyIcon('Copy');
  var ArrowUpRight = _lazyIcon('ArrowUpRight');

  // Preserve split-index keys used by existing student projects and voice inputs.
// Numeric citations ([1], [2, 3]) and Markdown links ([text](url)) are not blanks.
const SCAFFOLD_BLANK_PATTERN = /(\[(?!\s*\d+(?:\s*[,;-]\s*\d+)*\s*\])[^\]\n]*\](?!\())/;
function scaffoldParagraphParts(text) {
  return String(text || '').split(SCAFFOLD_BLANK_PATTERN).map((part, index) => ({
    text: part,
    responseKey: index % 2 === 1 ? 'paragraph-' + index : null
  }));
}
function serializeScaffoldParagraph(text, responses, missing = '_____') {
  return scaffoldParagraphParts(text).map(part => part.responseKey ? String((responses || {})[part.responseKey] || '').trim() || missing : part.text).join('');
}
function isScaffoldParagraphComplete(text, responses) {
  const blanks = scaffoldParagraphParts(text).filter(part => part.responseKey);
  return blanks.length > 0 && blanks.every(part => String((responses || {})[part.responseKey] || '').trim());
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
  var gradingSession = props.gradingSession || {
    isOpen: false
  };
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
  const isUsableItem = item => Boolean(item && typeof item.text === 'string' && item.text.trim() && (isTeacherMode || isEditingScaffolds || item.isSelected !== false && item.selected !== false));
  const isAssessmentLockdown = !isTeacherMode && !isIndependentMode && Boolean(props.assessmentMode || props.isAssessmentMode || generatedContent?.config?.assessmentMode || generatedContent?.data?.assessmentMode || typeof window !== 'undefined' && window.__alloAssessmentMode === true);
  const canViewRubric = Boolean(isTeacherMode || generatedContent?.data.rubric && !isAssessmentLockdown);
  const textAiDoor = typeof window !== 'undefined' && typeof window.__alloAiSetupDoorway === 'function' ? window.__alloAiSetupDoorway('text', t) : null;
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
  const isSessionOpen = !!gradingSession.isOpen && (sessionResourceId == null || String(sessionResourceId) === String(generatedContent?.id));
  const wasSessionOpenRef = React.useRef(isSessionOpen);
  const restoreDraftOpenerFocus = () => {
    const candidate = draftOpenerRef.current && draftOpenerRef.current.isConnected ? draftOpenerRef.current : gradingTriggerRef.current;
    draftOpenerRef.current = null;
    if (candidate && typeof document !== 'undefined' && candidate !== document.body && candidate !== document.documentElement && candidate.isConnected && typeof candidate.focus === 'function') {
      try {
        candidate.focus();
      } catch (_) {}
    }
  };
  React.useEffect(() => {
    if (wasSessionOpenRef.current && !isSessionOpen) {
      if (typeof document !== 'undefined' && (!document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected)) {
        restoreDraftOpenerFocus();
      }
    }
    wasSessionOpenRef.current = isSessionOpen;
  }, [isSessionOpen]);
  if (!scaffoldData || (scaffoldData.mode === 'list' ? !usableItems.some(isUsableItem) : typeof scaffoldData.text !== 'string' || !scaffoldData.text.trim())) {
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      className: "rounded-xl border border-slate-300 bg-slate-50 p-5 text-slate-700"
    }, label('scaffolds.empty_resource', 'No writing prompts are available. Choose or regenerate a writing scaffold to begin.'));
  }
  const canGenerateRubric = !!isTeacherMode && !isParentMode;
  // Shown numbers count only the items that render, so a dropped item leaves no gap.
  const visibleItemNumbers = {};
  usableItems.reduce((n, item, i) => {
    if (isUsableItem(item)) {
      visibleItemNumbers[i] = n + 1;
      return n + 1;
    }
    return n;
  }, 0);
  const gradeScores = gradingResult && Array.isArray(gradingResult.scores) ? gradingResult.scores.filter(s => s && typeof s === 'object') : [];
  const gradeFeedback = gradingResult && gradingResult.feedback && typeof gradingResult.feedback === 'object' ? gradingResult.feedback : {};
  const gradeText = v => typeof v === 'string' || typeof v === 'number' ? v : '';
  // Optional generator extras (absent on older scaffolds, which render as before).
  const TIER_LABELS = {
    emerging: ['scaffolds.tier_emerging', 'Emerging'],
    expanding: ['scaffolds.tier_expanding', 'Expanding'],
    bridging: ['scaffolds.tier_bridging', 'Bridging']
  };
  const TIER_CLASSES = {
    emerging: 'bg-sky-50 text-sky-800 border-sky-300',
    expanding: 'bg-violet-50 text-violet-800 border-violet-300',
    bridging: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  };
  const tierOf = item => item && typeof item.tier === 'string' && TIER_LABELS[item.tier] ? item.tier : null;
  const wordBank = (Array.isArray(scaffoldData.wordBank) ? scaffoldData.wordBank : []).filter(w => typeof w === 'string' && w.trim()).map(w => w.trim()).slice(0, 40);
  const wordBankHeadingId = `scaffold-word-bank-${generatedContent?.id}`;
  const isDiscussionPrompts = scaffoldData.frameType === 'Discussion Prompts' || /^Discussion Prompts\b/.test(String(generatedContent?.meta || ''));
  const insertWordBankTerm = word => {
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
    const currentVal = String(studentResponses[resId] && studentResponses[resId][targetKey] || '');
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
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-rose-50 p-4 rounded-lg border border-rose-100 mb-6 flex flex-wrap justify-between items-start gap-4",
    "data-help-key": "scaffolds_goal_panel"
  }, isTeacherMode && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-rose-800 flex-grow"
  }, /*#__PURE__*/React.createElement("strong", null, t('about.action_title')), " ", t('about.action_desc')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-3 ml-auto"
  }, ['saving', 'saved', 'error'].includes(studentWorkStatus) && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: `flex flex-wrap items-center gap-1.5 text-xs font-bold ${studentWorkStatus === 'error' ? 'text-red-700' : studentWorkStatus === 'saving' ? 'text-rose-700' : 'text-green-700'}`
  }, studentWorkStatus === 'saving' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), " ", t('status.saving')) : studentWorkStatus === 'saved' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('status.saved')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, label('scaffolds.save_failed', 'Your answers could not be saved on this device.')), typeof onRetrySave === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRetrySave,
    className: "min-h-11 rounded border border-red-300 px-2 py-1 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
  }, label('common.retry', 'Try again')))), !isTeacherMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleResetScaffolds,
    "data-help-key": "scaffolds_reset",
    className: "min-h-11 flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-white border border-rose-300 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-colors motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600",
    title: t('scaffolds.clear_all'),
    "aria-label": t('scaffolds.clear_all')
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('common.reset')), textAiUsable && /*#__PURE__*/React.createElement("button", {
    ref: gradingTriggerRef,
    type: "button",
    onClick: () => {
      if (typeof document !== 'undefined' && document.activeElement && document.activeElement !== document.body && document.activeElement !== document.documentElement) {
        draftOpenerRef.current = document.activeElement;
      } else {
        draftOpenerRef.current = gradingTriggerRef.current;
      }
      launchGradingSession();
    },
    "data-help-key": "scaffolds_grading",
    className: `min-h-11 flex items-center gap-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-full transition-all motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 ${isScaffoldComplete ? 'animate-pulse motion-reduce:animate-none ring-4 ring-rose-300 shadow-lg scale-105' : ''}`,
    title: label('scaffolds.feedback_purpose', 'Get AI feedback on your draft. This does not submit your work to your teacher.'),
    "aria-label": label('scaffolds.get_draft_feedback', 'Get feedback on my draft')
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    "aria-hidden": "true",
    className: "text-amber-200"
  }), " ", label('scaffolds.get_draft_feedback', 'Get feedback on my draft'))), isTeacherMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleToggleIsEditingScaffolds,
    "data-help-key": "scaffolds_edit_toggle",
    className: `min-h-11 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all motion-reduce:transition-none shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 ${isEditingScaffolds ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-50'}`
  }, isEditingScaffolds ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14,
    "aria-hidden": "true"
  }), isEditingScaffolds ? t('common.done_editing') : t('scaffolds.edit')))), isTeacherMode && !textAiUsable && typeof window !== 'undefined' && window.AlloAiSetupNotice && /*#__PURE__*/React.createElement(window.AlloAiSetupNotice, {
    kind: "text",
    t: t
  }), !isTeacherMode && textAiUsable && /*#__PURE__*/React.createElement("p", {
    "data-scaffold-feedback-purpose": true,
    className: "text-sm text-slate-700"
  }, label('scaffolds.feedback_purpose', 'Get AI feedback on your draft. This does not submit your work to your teacher.')), wordBank.length > 0 && /*#__PURE__*/React.createElement("section", {
    "data-scaffold-word-bank": true,
    "aria-labelledby": wordBankHeadingId,
    className: "bg-amber-50 border border-amber-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-baseline justify-between gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    id: wordBankHeadingId,
    className: "text-xs font-bold text-amber-900 uppercase tracking-wider"
  }, label('scaffolds.word_bank', 'Word bank')), !isTeacherMode && !isEditingScaffolds && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-medium text-amber-800"
  }, label('scaffolds.word_bank_hint', 'Click a word to insert it'))), /*#__PURE__*/React.createElement("ul", {
    className: "flex flex-wrap gap-2"
  }, wordBank.map((word, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, !isTeacherMode && !isEditingScaffolds ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    dir: "auto",
    onMouseDown: e => e.preventDefault(),
    onClick: () => insertWordBankTerm(word),
    "aria-label": `${label('scaffolds.insert_word', 'Insert word')}: ${word}`,
    className: "min-h-11 px-3 py-1.5 rounded-full bg-white border border-amber-300 text-sm font-semibold text-amber-950 hover:bg-amber-100 hover:border-amber-500 active:scale-95 transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 cursor-pointer"
  }, word) : /*#__PURE__*/React.createElement("span", {
    dir: "auto",
    className: "inline-block px-3 py-1 rounded-full bg-white border border-amber-300 text-sm font-semibold text-amber-950"
  }, word))))), isSessionOpen ? /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: label('scaffolds.draft_feedback_error', 'Draft feedback encountered an error. Please try again.')
  }, /*#__PURE__*/React.createElement(DraftFeedbackInterface, {
    status: gradingSession.status,
    draftText: gradingSession.draftText,
    setDraftText: val => setGradingSession(prev => ownsSession(prev) ? {
      ...prev,
      draftText: val
    } : prev),
    previousDraft: gradingSession.previousDraft,
    gradingDetails: gradingSession.feedback,
    draftCount: gradingSession.draftCount,
    finalScore: gradingSession.finalScore,
    xpEarned: gradingSession.xpAwarded,
    onSubmit: submitGradingSession,
    onCancel: () => {
      setGradingSession(prev => ownsSession(prev) ? {
        ...prev,
        isOpen: false
      } : prev);
      restoreDraftOpenerFocus();
    }
  })) : generatedContent?.data.mode === 'list' ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-4"
  }, usableItems.map((item, idx) => isUsableItem(item) ? /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-white p-4 rounded-xl border border-slate-400 shadow-sm hover:border-indigo-200 transition-colors motion-reduce:transition-none",
    "data-help-key": "scaffolds_item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-rose-100 text-rose-800 font-bold px-2 py-1 rounded text-xs shrink-0 mt-1"
  }, visibleItemNumbers[idx]), /*#__PURE__*/React.createElement("div", {
    className: "w-full min-w-0"
  }, tierOf(item) && /*#__PURE__*/React.createElement("span", {
    "data-scaffold-tier": tierOf(item),
    className: `inline-block mb-1 px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider ${TIER_CLASSES[tierOf(item)]}`
  }, label(TIER_LABELS[tierOf(item)][0], TIER_LABELS[tierOf(item)][1])), isEditingScaffolds ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('scaffolds.edit_item') || `Edit scaffold item ${idx + 1}`,
    value: item.text,
    onChange: e => handleScaffoldChange(idx, 'text', e.target.value),
    className: "w-full text-lg font-medium text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus:outline-none resize-none transition-all motion-reduce:transition-none font-serif",
    rows: getRows(item.text)
  }), (item.text_en || leveledTextLanguage !== 'English') && /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('scaffolds.edit_item_translation') || `Edit scaffold item ${idx + 1} translation`,
    value: item.text_en || '',
    onChange: e => handleScaffoldChange(idx, 'text_en', e.target.value, true),
    className: "w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus:outline-none resize-none transition-all motion-reduce:transition-none",
    rows: getRows(item.text_en || ''),
    placeholder: t('common.placeholder_translation')
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    id: `scaffold-prompt-${generatedContent.id}-${idx}`,
    dir: "auto",
    className: "text-lg break-words font-medium text-slate-800 mb-1 font-serif px-2 py-1"
  }, item.text), leveledTextLanguage !== 'English' && item.text_en && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 italic px-2"
  }, item.text_en), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": `${label('scaffolds.student_response', 'Student response')} ${visibleItemNumbers[idx]}`,
    "aria-describedby": `scaffold-prompt-${generatedContent.id}-${idx}`,
    value: studentResponses[generatedContent.id]?.[idx] || '',
    onFocus: e => {
      activeFieldRef.current = {
        resourceId: generatedContent.id,
        key: idx,
        el: e.currentTarget
      };
    },
    onChange: e => handleStudentInput(generatedContent.id, idx, e.target.value),
    "data-help-key": "scaffolds_student_input",
    className: "w-full mt-2 p-3 border border-slate-400 rounded-lg text-sm focus:ring-2 focus:ring-rose-600 focus:border-rose-600 focus:outline-none resize-y bg-slate-50 focus:bg-white transition-all motion-reduce:transition-none font-sans",
    rows: 3,
    placeholder: isDiscussionPrompts ? label('scaffolds.discussion_placeholder', 'Write your response to the question...') : t('scaffolds.sentence_placeholder')
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 border-b border-slate-100 border-dashed w-full"
  })))) : null)) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 sm:p-8 rounded-xl border border-slate-400 shadow-sm",
    "data-help-key": "scaffolds_paragraph_frame"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-4"
  }, t('scaffolds.paragraph_frame') || 'Paragraph Frame'), isEditingScaffolds ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('scaffolds.edit_paragraph_frame') || 'Edit paragraph frame text',
    value: generatedContent?.data.text,
    onChange: e => handleScaffoldTextChange('text', e.target.value),
    className: "w-full text-lg leading-loose text-slate-800 font-serif bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus:outline-none resize-none transition-all motion-reduce:transition-none",
    rows: getRows(generatedContent?.data.text)
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-lg leading-loose text-slate-800 font-serif px-2 py-1"
  }, scaffoldParagraphParts(generatedContent?.data.text).map(({
    text: part,
    responseKey
  }, i) => responseKey ? /*#__PURE__*/React.createElement("input", {
    "aria-label": `${label('common.enter_student_responses', 'Student response')} ${(i + 1) / 2}: ${part.replace(/[\[\]]/g, '')}`,
    key: i,
    type: "text",
    value: studentResponses[generatedContent.id]?.[responseKey] || '',
    onFocus: e => {
      activeFieldRef.current = {
        resourceId: generatedContent.id,
        key: responseKey,
        el: e.currentTarget
      };
    },
    onChange: e => handleStudentInput(generatedContent.id, responseKey, e.target.value),
    dir: "auto",
    className: "placeholder:text-current placeholder:opacity-100 placeholder:font-normal inline-block w-44 max-w-full min-h-11 border-b-2 border-slate-500 mx-1 text-center text-indigo-700 font-bold focus:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 bg-transparent min-w-[100px] px-1 focus:bg-indigo-50 rounded transition-colors motion-reduce:transition-none",
    placeholder: part.replace(/[\[\]]/g, '')
  }) : /*#__PURE__*/React.createElement("span", {
    key: i
  }, part))), (isEditingScaffolds && leveledTextLanguage !== 'English' || generatedContent?.data.text_en) && /*#__PURE__*/React.createElement("div", {
    className: "mt-8 pt-6 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
  }, t('common.english_translation')), isEditingScaffolds ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('scaffolds.edit_paragraph_translation') || 'Edit paragraph frame translation',
    value: generatedContent?.data.text_en || '',
    onChange: e => handleScaffoldTextChange('text_en', e.target.value),
    className: "w-full text-slate-600 italic leading-relaxed bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600 rounded px-2 py-1 focus:outline-none resize-none transition-all motion-reduce:transition-none",
    rows: getRows(generatedContent?.data.text_en || ''),
    placeholder: t('common.placeholder_translation')
  }) : generatedContent?.data.text_en && /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 italic leading-relaxed px-2 py-1"
  }, generatedContent?.data.text_en))), canViewRubric && /*#__PURE__*/React.createElement("div", {
    className: "mt-1 pt-4 border-t border-rose-100 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-between items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-rose-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ClipboardList, {
    size: 18,
    "aria-hidden": "true",
    className: "text-rose-600"
  }), " ", isIndependentMode ? label('scaffolds.self_checklist', 'Self-Checklist') : label('scaffolds.rubric', 'Grading Rubric')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, canGenerateRubric && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleGenerateRubric,
    disabled: isGeneratingRubric || !textAiUsable,
    title: !textAiUsable ? textAiDoor && textAiDoor.title || label('sidebar.needs_ai_setup', 'Needs AI setup') : undefined,
    "aria-busy": !!isGeneratingRubric,
    className: "min-h-11 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-700 px-3 py-1.5 rounded-full font-bold transition-colors motion-reduce:transition-none flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
  }, isGeneratingRubric ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    "aria-hidden": "true",
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    "aria-hidden": "true"
  }), generatedContent?.data.rubric ? isIndependentMode ? label('scaffolds.regenerate_self_checklist', 'Regenerate Self-Checklist') : label('scaffolds.regenerate_rubric', 'Regenerate Rubric') : isIndependentMode ? label('scaffolds.generate_self_checklist', 'Generate Self-Checklist') : label('scaffolds.generate_rubric', 'Generate Rubric')), generatedContent?.data.rubric && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleToggleRubricZoom,
    "aria-pressed": !!rubricZoom,
    className: `min-h-11 text-xs flex items-center gap-1 px-3 py-1.5 rounded transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${rubricZoom ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-white text-slate-700 hover:text-indigo-700 border-slate-400'}`,
    title: t('scaffolds.rubric_toggle_tooltip')
  }, rubricZoom ? /*#__PURE__*/React.createElement(Maximize, {
    size: 12,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Minimize, {
    size: 12,
    "aria-hidden": "true"
  }), rubricZoom ? t('scaffolds.rubric_normal') : t('scaffolds.rubric_fit')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.copy'),
    onClick: () => copyToClipboard(generatedContent?.data.rubric),
    className: "min-h-11 text-xs flex items-center gap-1 bg-white text-slate-700 hover:text-indigo-700 border border-slate-400 hover:border-indigo-400 px-3 py-1.5 rounded transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    title: t('scaffolds.rubric_copy_tooltip')
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('scaffolds.rubric_copy'))))), generatedContent?.data.rubric && /*#__PURE__*/React.createElement("div", {
    className: `bg-white p-4 rounded-xl border border-slate-400 relative shadow-sm transition-all motion-reduce:transition-none ${rubricZoom ? 'text-[11px]' : ''}`
  }, /*#__PURE__*/React.createElement("style", null, rubricZoom ? `
                                    .rubric-container table th, .rubric-container table td { padding: 4px !important; line-height: 1.2 !important; }
                                    .rubric-container h1, .rubric-container h2, .rubric-container h3 { font-size: 1em !important; margin: 0.5em 0 !important; }
                                    .rubric-container p { margin-bottom: 0.5em !important; }
                                ` : ''), isEditingScaffolds ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('scaffolds.edit_rubric') || 'Edit rubric',
    value: generatedContent?.data.rubric,
    onChange: e => handleScaffoldTextChange('rubric', e.target.value),
    className: "w-full text-sm bg-transparent border border-slate-400 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:bg-slate-50 rounded p-2 focus:outline-none resize-y font-medium text-slate-700 transition-all motion-reduce:transition-none font-mono",
    rows: getRows(generatedContent?.data.rubric),
    placeholder: t('scaffolds.rubric_placeholder')
  }) : /*#__PURE__*/React.createElement("div", {
    className: "rubric-container prose prose-sm max-w-none text-slate-700 leading-relaxed overflow-x-auto"
  }, renderFormattedText(generatedContent?.data.rubric))), isTeacherMode && generatedContent?.data.rubric && /*#__PURE__*/React.createElement("div", {
    className: "mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 18,
    "aria-hidden": "true",
    className: "text-indigo-600"
  }), " ", t('scaffolds.auto_grader')), !gradingResult ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('dashboard.grading.student_work_input') || 'Paste student work for grading',
    value: studentWorkInput,
    onChange: e => setStudentWorkInput(e.target.value),
    className: "w-full p-3 text-sm border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 focus:outline-none resize-y h-32 bg-white",
    placeholder: t('dashboard.grading.work_placeholder')
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleAutoGrade,
    disabled: !studentWorkInput.trim() || isGrading || !textAiUsable,
    title: !textAiUsable ? textAiDoor && textAiDoor.title || label('sidebar.needs_ai_setup', 'Needs AI setup') : undefined,
    "aria-busy": !!isGrading,
    className: "min-h-11 w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
  }, isGrading ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    "aria-hidden": "true",
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 16,
    "aria-hidden": "true",
    className: "text-amber-200 fill-current"
  }), isGrading ? t('dashboard.grading.grade_work_loading') : t('dashboard.grading.grade_work_btn'))) : /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg border border-indigo-200 p-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-4 border-b border-indigo-100 pb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-indigo-900 text-lg"
  }, t('dashboard.grading.total_score')), /*#__PURE__*/React.createElement("span", {
    className: "bg-indigo-100 text-indigo-800 font-black px-3 py-1 rounded-full"
  }, gradeText(gradingResult.totalScore))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 mb-4"
  }, gradeScores.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between font-bold text-slate-700"
  }, /*#__PURE__*/React.createElement("span", null, gradeText(s.criteria)), /*#__PURE__*/React.createElement("span", null, gradeText(s.score))), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 text-xs italic"
  }, gradeText(s.comment))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-3 text-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 p-3 rounded border border-green-200"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "text-green-800 block mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('dashboard.grading.glow_label')), /*#__PURE__*/React.createElement("p", {
    className: "text-green-800"
  }, gradeText(gradeFeedback.glow))), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 p-3 rounded border border-orange-200"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "text-orange-800 block mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(ArrowUpRight, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('dashboard.grading.grow_label')), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-800"
  }, gradeText(gradeFeedback.grow))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetGradingResultToNull,
    className: "min-h-11 text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline w-full text-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, t('dashboard.grading.grade_another'))))));
}
SentenceFramesView.paragraphParts = scaffoldParagraphParts;
SentenceFramesView.serializeParagraph = serializeScaffoldParagraph;
SentenceFramesView.isParagraphComplete = isScaffoldParagraphComplete;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SentenceFramesView = SentenceFramesView;
  window.AlloModules.ViewSentenceFramesModule = true;
})();

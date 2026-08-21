// ui_modals_source.jsx — StudentQuizOverlay, TeacherGate, RoleSelectionModal, StudentEntryModal, StudentWelcomeModal
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useFocusTrap = window.__alloHooks && window.__alloHooks.useFocusTrap;
var UiLanguageSelector = window.UiLanguageSelector || function() { return null; };
var useState = React.useState; var useEffect = React.useEffect; var useRef = React.useRef;
var useContext = React.useContext; var useMemo = React.useMemo; var useCallback = React.useCallback;
var APP_CONFIG = window.APP_CONFIG || {};
var warnLog = window.warnLog || function() { console.warn.apply(console, arguments); };
var doc = window._fbDoc || function() { return null; };
var updateDoc = window._fbUpdateDoc || function() { return Promise.resolve(); };
var db = window._fbDb || null;
var UI_MODAL_A11Y_STYLES = `
  [data-allo-ui-modal]:is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible,
  [data-allo-ui-modal] :is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible {
    outline: 3px solid #0f172a !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 6px #ffffff !important;
  }
  @media (forced-colors: active) {
    [data-allo-ui-modal]:is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible,
    [data-allo-ui-modal] :is(button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])):focus-visible {
      outline: 3px solid CanvasText !important;
      box-shadow: none !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-allo-ui-modal], [data-allo-ui-modal] * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  [data-allo-ui-modal="role-selection"] {
    background: radial-gradient(circle at 15% 5%, rgba(79,70,229,.28), transparent 34%), radial-gradient(circle at 90% 15%, rgba(14,165,233,.18), transparent 32%), rgba(8,13,29,.94) !important;
  }
  [data-allo-ui-modal="role-selection"] > .min-h-full > div {
    background: linear-gradient(145deg, rgba(255,255,255,.99), rgba(248,250,252,.97)) !important;
    border: 1px solid rgba(199,210,254,.8) !important;
    border-radius: 24px !important;
    box-shadow: 0 32px 90px rgba(2,6,23,.42), inset 0 1px 0 #fff !important;
  }
  [data-allo-ui-modal="role-selection"] button[data-help-key^="role_"] {
    border-width: 1px !important;
    border-color: #e2e8f0 !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, #fff, #f8fafc) !important;
    box-shadow: 0 10px 24px rgba(15,23,42,.07), inset 0 1px 0 #fff;
    transform: none !important;
  }
  [data-allo-ui-modal="role-selection"] button[data-help-key^="role_"]:hover {
    border-color: #a5b4fc !important;
    background: #fff !important;
    box-shadow: 0 16px 34px rgba(79,70,229,.12), 0 0 0 1px rgba(99,102,241,.08);
    transform: translateY(-3px) !important;
  }
  [data-allo-ui-modal="role-selection"] button[data-help-key^="role_"] > div {
    border-radius: 14px !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.7);
  }
  @media (prefers-reduced-motion: reduce) {
    [data-allo-ui-modal="role-selection"] button[data-help-key^="role_"]:hover { transform: none !important; }
  }
`;
// Lazy icon wrappers — window.AlloIcons is set in a useEffect after CDN scripts load,
// so each icon must look up window.AlloIcons at RENDER time, not at script load time.
var _lazyIcon = function(name) { return function(props) { var I = window.AlloIcons && window.AlloIcons[name]; return I ? React.createElement(I, props) : null; }; };
var CheckCircle = _lazyIcon('CheckCircle');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var FolderOpen = _lazyIcon('FolderOpen');
var GraduationCap = _lazyIcon('GraduationCap');
var Heart = _lazyIcon('Heart');
var Layers = _lazyIcon('Layers');
var Lock = _lazyIcon('Lock');
var Mic = _lazyIcon('Mic');
var RefreshCw = _lazyIcon('RefreshCw');
var School = _lazyIcon('School');
var ShieldCheck = _lazyIcon('ShieldCheck');
var Sparkles = _lazyIcon('Sparkles');
var Upload = _lazyIcon('Upload');
var UserCircle2 = _lazyIcon('UserCircle2');
var X = _lazyIcon('X');
var XCircle = _lazyIcon('XCircle');

const LIVE_QUIZ_ADVANCED_TYPES = new Set([
  'multi-select',
  'fill-blank',
  'short-answer',
  'self-explanation',
  'numeric-response',
  'sequence-sense',
  'relation-mismatch',
  'answer-evidence'
]);
const LIVE_QUIZ_UNSCORED_TYPES = new Set(['likert', 'opinion-mcq']);
const LIVE_QUIZ_TEXT_LIMIT = 4000;

function normalizeLiveQuizItemType(question) {
  const raw = String(question?.itemType || question?.type || 'mcq').trim().toLowerCase().replace(/_/g, '-');
  if (raw === 'multiple-choice' || raw === 'multiple-choice-question' || raw === 'single-select') return 'mcq';
  return raw || 'mcq';
}

function boundedLiveQuizText(value, limit = LIVE_QUIZ_TEXT_LIMIT) {
  return String(value == null ? '' : value).slice(0, Math.max(1, limit));
}

function boundedLiveQuizStrings(value, limit = 30) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).map((item) => boundedLiveQuizText(item, 500)).filter(Boolean);
}

function resolveLiveQuizCorrectOptionIndex(question, options) {
  if (!question || !Array.isArray(options) || options.length === 0) return -1;
  const answer = question.correctAnswer;
  if (Number.isInteger(answer) && answer >= 0 && answer < options.length) return answer;
  if (typeof answer !== 'string') return -1;
  const trimmed = answer.trim();
  if (/^[A-Za-z]$/.test(trimmed)) {
      const letterIndex = trimmed.toUpperCase().charCodeAt(0) - 65;
      if (letterIndex >= 0 && letterIndex < options.length) return letterIndex;
  }
  if (/^\d+$/.test(trimmed)) {
      const numericIndex = Number(trimmed);
      if (numericIndex >= 0 && numericIndex < options.length) return numericIndex;
  }
  const target = trimmed.toLowerCase();
  return options.findIndex((option) => String(option).trim().toLowerCase() === target);
}

function getLiveQuizSubmittedAnswer(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) return null;
  if (response.answer && typeof response.answer === 'object' && !Array.isArray(response.answer)) return response.answer;
  return response;
}

function normalizeStudentLiveScoringPolicy(policy) {
  const source = policy && typeof policy === 'object' && !Array.isArray(policy) ? policy : {};
  const nested = source.liveScoring && typeof source.liveScoring === 'object' && !Array.isArray(source.liveScoring)
      ? source.liveScoring
      : {};
  const liveMode = typeof policy === 'string' ? policy : source.liveMode || source.mode || nested.mode;
  return {
      accuracy: source.accuracy === false ? false : true,
      confidence: source.confidence === true
          || nested.confidence === true
          || String(liveMode || '').trim().toLowerCase() === 'confidence',
      partialCredit: source.partialCredit === false ? false : true,
  };
}

function getLiveQuizResponseOptionIndex(question, response, options) {
  if (Number.isInteger(response) && response >= 0 && response < options.length) return response;
  const answer = getLiveQuizSubmittedAnswer(response);
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return null;
  const candidate = [answer.optionIdx, answer.optionIndex, answer.selectedIndex]
      .find((value) => Number.isInteger(value));
  if (Number.isInteger(candidate) && candidate >= 0 && candidate < options.length) return candidate;
  if (typeof answer.optionText === 'string') {
      const target = answer.optionText.trim().toLowerCase();
      const match = options.findIndex((option) => String(option).trim().toLowerCase() === target);
      return match >= 0 ? match : null;
  }
  return null;
}

function attachLiveQuizConfidence(response, question, questionIndex, confidence) {
  if (!['knew', 'guessed', 'no-idea'].includes(confidence)) return null;
  const itemType = normalizeLiveQuizItemType(question);
  const existingEnvelope = response && typeof response === 'object' && !Array.isArray(response)
      && Object.prototype.hasOwnProperty.call(response, 'answer')
      ? response
      : null;
  const answer = existingEnvelope
      ? existingEnvelope.answer
      : Number.isInteger(response)
          ? { optionIdx: response, optionText: boundedLiveQuizStrings(question?.options)[response] || '' }
          : response;
  return {
      ...(existingEnvelope || {}),
      questionIdx: questionIndex,
      itemType,
      conceptLabel: boundedLiveQuizText(existingEnvelope?.conceptLabel || question?.conceptLabel, 240),
      answer,
      confidence,
      timestamp: Date.now(),
  };
}

const LiveAdvancedQuizResponse = React.memo(({
  question,
  questionType,
  questionIndex,
  questionKey,
  phase,
  hasAnswered,
  onSubmit
}) => {
  const [draft, setDraft] = useState({
      text: '',
      unit: '',
      selectedIndices: [],
      answerIdx: null,
      evidenceIdx: null,
      sequenceStep: 1,
      verifyAnswer: null,
      clickedIdx: null,
      principleAnswer: null,
      relationStep: 1,
      clickedPairIdx: null,
      partnerAnswer: ''
  });
  useEffect(() => {
      setDraft({
          text: '',
          unit: '',
          selectedIndices: [],
          answerIdx: null,
          evidenceIdx: null,
          sequenceStep: 1,
          verifyAnswer: null,
          clickedIdx: null,
          principleAnswer: null,
          relationStep: 1,
          clickedPairIdx: null,
          partnerAnswer: ''
      });
  }, [questionKey]);
  const patchDraft = (patch) => setDraft((previous) => ({ ...previous, ...patch }));
  const isDisabled = hasAnswered || phase !== 'answering';
  const sendAnswer = (answer) => {
      if (isDisabled || !answer || typeof answer !== 'object' || Array.isArray(answer)) return;
      onSubmit({
          questionIdx: questionIndex,
          itemType: questionType,
          conceptLabel: boundedLiveQuizText(question?.conceptLabel, 240),
          answer,
          timestamp: Date.now()
      });
  };
  const sharedButtonClass = 'min-h-11 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60';
  const submitButtonClass = 'min-h-11 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50';

  if (questionType === 'fill-blank' || questionType === 'short-answer' || questionType === 'self-explanation') {
      const isFillBlank = questionType === 'fill-blank';
      const maxLength = isFillBlank ? 500 : questionType === 'self-explanation' ? 6000 : LIVE_QUIZ_TEXT_LIMIT;
      const submitText = () => {
          const text = boundedLiveQuizText(draft.text, maxLength).trim();
          if (!text) return;
          let status = 'submitted';
          if (isFillBlank) {
              const targets = [question?.expectedFill || '']
                  .concat(Array.isArray(question?.acceptableAlternatives) ? question.acceptableAlternatives : [])
                  .map((target) => boundedLiveQuizText(target, 500).trim().toLowerCase())
                  .filter(Boolean);
              if (targets.length > 0) status = targets.includes(text.toLowerCase()) ? 'correct' : 'incorrect';
          }
          sendAnswer({ text, status });
      };
      return (
          <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/20 bg-white/10 p-5 text-left shadow-xl" data-live-response-type={questionType}>
              <label htmlFor="live-quiz-written-response" className="mb-2 block text-sm font-bold text-white">
                  {isFillBlank ? 'Type the missing word or phrase' : questionType === 'self-explanation' ? 'Explain your thinking' : 'Write your response'}
              </label>
              {isFillBlank ? (
                  <input
                      id="live-quiz-written-response"
                      type="text"
                      value={draft.text}
                      maxLength={maxLength}
                      disabled={isDisabled}
                      onChange={(event) => patchDraft({ text: event.target.value })}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitText(); } }}
                      className="min-h-12 w-full rounded-xl border-2 border-white/30 bg-white px-4 py-3 text-base text-slate-900"
                  />
              ) : (
                  <textarea
                      id="live-quiz-written-response"
                      value={draft.text}
                      maxLength={maxLength}
                      rows={questionType === 'self-explanation' ? 6 : 4}
                      disabled={isDisabled}
                      onChange={(event) => patchDraft({ text: event.target.value })}
                      className="w-full resize-y rounded-xl border-2 border-white/30 bg-white px-4 py-3 text-base text-slate-900"
                  />
              )}
              <div className="mt-3 flex justify-end">
                  <button type="button" onClick={submitText} disabled={isDisabled || !draft.text.trim()} className={submitButtonClass}>
                      Submit response
                  </button>
              </div>
          </div>
      );
  }

  if (questionType === 'numeric-response') {
      const submitNumeric = () => {
          const rawText = boundedLiveQuizText(draft.text, 120).trim();
          const numericValue = Number(rawText);
          if (!rawText || !Number.isFinite(numericValue)) return;
          const unit = boundedLiveQuizText(draft.unit, 80).trim();
          const expected = Number(question?.correctValue);
          const tolerance = Math.max(0, Number(question?.tolerance) || 0);
          const canGradeValue = question?.correctValue !== null && question?.correctValue !== undefined && question?.correctValue !== '' && Number.isFinite(expected);
          const valueCorrect = canGradeValue ? Math.abs(numericValue - expected) <= tolerance + 1e-9 : null;
          const acceptedUnits = [question?.unit || '']
              .concat(Array.isArray(question?.acceptableUnits) ? question.acceptableUnits : [])
              .map((value) => boundedLiveQuizText(value, 80).trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' '))
              .filter(Boolean);
          const normalizedUnit = unit.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
          const unitCorrect = acceptedUnits.length === 0 ? true : acceptedUnits.includes(normalizedUnit);
          let score = null;
          let status = 'submitted';
          if (canGradeValue) {
              score = valueCorrect && unitCorrect ? 100 : valueCorrect || (unitCorrect && acceptedUnits.length > 0) ? 50 : 0;
              status = score === 100 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
          }
          sendAnswer({ text: rawText + (unit ? ' ' + unit : ''), numericValue, unit, valueCorrect, unitCorrect, status, score });
      };
      return (
          <div className="mt-8 w-full max-w-3xl rounded-3xl border border-white/20 bg-white/10 p-5 text-left shadow-xl" data-live-response-type={questionType}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <label className="block text-sm font-bold text-white">
                      Numeric answer
                      <input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={draft.text}
                          disabled={isDisabled}
                          onChange={(event) => patchDraft({ text: event.target.value })}
                          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitNumeric(); } }}
                          className="mt-2 min-h-12 w-full rounded-xl border-2 border-white/30 bg-white px-4 py-3 text-base text-slate-900"
                      />
                  </label>
                  <label className="block text-sm font-bold text-white">
                      Unit{question?.unit ? ` (${boundedLiveQuizText(question.unit, 80)})` : ' (optional)'}
                      <input
                          type="text"
                          value={draft.unit}
                          maxLength="80"
                          disabled={isDisabled}
                          onChange={(event) => patchDraft({ unit: event.target.value })}
                          className="mt-2 min-h-12 w-full rounded-xl border-2 border-white/30 bg-white px-4 py-3 text-base text-slate-900"
                      />
                  </label>
              </div>
              <div className="mt-3 flex justify-end">
                  <button type="button" onClick={submitNumeric} disabled={isDisabled || !draft.text || !Number.isFinite(Number(draft.text))} className={submitButtonClass}>
                      Submit numeric answer
                  </button>
              </div>
          </div>
      );
  }

  if (questionType === 'multi-select') {
      const options = boundedLiveQuizStrings(question?.options);
      const selected = draft.selectedIndices.filter((index) => Number.isInteger(index) && index >= 0 && index < options.length).slice(0, options.length);
      const toggle = (index) => {
          if (isDisabled) return;
          patchDraft({ selectedIndices: selected.includes(index) ? selected.filter((value) => value !== index) : selected.concat(index).sort((a, b) => a - b) });
      };
      const submitMultiSelect = () => {
          if (selected.length === 0) return;
          const correctTexts = boundedLiveQuizStrings(question?.correctAnswers);
          const correctIndices = options.map((option, index) => correctTexts.includes(option) ? index : -1).filter((index) => index >= 0);
          let score = null;
          let status = 'submitted';
          if (correctIndices.length > 0) {
              const selectedCorrect = selected.filter((index) => correctIndices.includes(index)).length;
              const selectedWrong = selected.length - selectedCorrect;
              score = Math.round(100 * Math.max(0, selectedCorrect - selectedWrong) / Math.max(1, correctIndices.length));
              status = selectedWrong === 0 && selectedCorrect === correctIndices.length ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
          }
          sendAnswer({ selectedIndices: selected, selectedTexts: selected.map((index) => options[index]), status, score });
      };
      return (
          <div className="mt-8 w-full max-w-4xl px-4" data-live-response-type={questionType}>
              <div role="group" aria-label="Select every answer that applies" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {options.map((option, index) => {
                      const active = selected.includes(index);
                      return (
                          <button
                              key={index}
                              type="button"
                              aria-pressed={active}
                              disabled={isDisabled}
                              onClick={() => toggle(index)}
                              className={`${sharedButtonClass} ${active ? 'border-yellow-300 bg-yellow-300 text-indigo-950 ring-4 ring-yellow-200/30' : 'border-white/30 bg-white text-slate-900 hover:border-indigo-300'}`}
                          >
                              <span aria-hidden="true" className="mr-2">{active ? '✓' : '□'}</span>{option}
                          </button>
                      );
                  })}
              </div>
              <button type="button" onClick={submitMultiSelect} disabled={isDisabled || selected.length === 0} className={`${submitButtonClass} mt-4`}>
                  Submit selections
              </button>
          </div>
      );
  }

  if (questionType === 'answer-evidence') {
      const answerOptions = boundedLiveQuizStrings(question?.answerOptions);
      const evidenceOptions = boundedLiveQuizStrings(question?.evidenceOptions);
      const submitAnswerEvidence = () => {
          if (!Number.isInteger(draft.answerIdx) || !Number.isInteger(draft.evidenceIdx)) return;
          const answerText = answerOptions[draft.answerIdx];
          const evidenceText = evidenceOptions[draft.evidenceIdx];
          if (answerText === undefined || evidenceText === undefined) return;
          const hasAnswerKey = typeof question?.correctAnswer === 'string' && question.correctAnswer.trim();
          const hasEvidenceKey = typeof question?.correctEvidence === 'string' && question.correctEvidence.trim();
          const answerCorrect = hasAnswerKey ? answerText === question.correctAnswer : null;
          const evidenceCorrect = hasEvidenceKey ? evidenceText === question.correctEvidence : null;
          let score = null;
          let status = 'submitted';
          if (hasAnswerKey && hasEvidenceKey) {
              score = (answerCorrect ? 1 : 0) + (evidenceCorrect ? 1 : 0);
              status = score === 2 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
          }
          sendAnswer({ answerIdx: draft.answerIdx, answerText, evidenceIdx: draft.evidenceIdx, evidenceText, answerCorrect, evidenceCorrect, score, status });
      };
      const renderChoiceGrid = (items, selectedIndex, field) => (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((option, index) => (
                  <button
                      key={index}
                      type="button"
                      aria-pressed={selectedIndex === index}
                      disabled={isDisabled}
                      onClick={() => patchDraft({ [field]: index })}
                      className={`${sharedButtonClass} ${selectedIndex === index ? 'border-yellow-300 bg-yellow-300 text-indigo-950' : 'border-white/30 bg-white text-slate-900'}`}
                  >
                      {String.fromCharCode(65 + index)}. {option}
                  </button>
              ))}
          </div>
      );
      return (
          <div className="mt-8 w-full max-w-4xl space-y-5 rounded-3xl border border-white/20 bg-white/10 p-5 text-left shadow-xl" data-live-response-type={questionType}>
              <fieldset>
                  <legend className="mb-2 text-sm font-black text-white">Part 1 — Choose the best answer</legend>
                  {renderChoiceGrid(answerOptions, draft.answerIdx, 'answerIdx')}
              </fieldset>
              <fieldset>
                  <legend className="mb-2 text-sm font-black text-white">Part 2 — {boundedLiveQuizText(question?.evidencePrompt || 'Choose the best supporting evidence.', 500)}</legend>
                  {renderChoiceGrid(evidenceOptions, draft.evidenceIdx, 'evidenceIdx')}
              </fieldset>
              <button type="button" onClick={submitAnswerEvidence} disabled={isDisabled || !Number.isInteger(draft.answerIdx) || !Number.isInteger(draft.evidenceIdx)} className={submitButtonClass}>
                  Submit answer and evidence
              </button>
          </div>
      );
  }

  if (questionType === 'sequence-sense') {
      const items = boundedLiveQuizStrings(question?.items);
      const candidateOrder = Array.isArray(question?.presentedOrder) ? question.presentedOrder.slice(0, items.length) : [];
      const isPermutation = candidateOrder.length === items.length
          && candidateOrder.every((value) => Number.isInteger(value) && value >= 0 && value < items.length)
          && new Set(candidateOrder).size === items.length;
      const presentedOrder = isPermutation ? candidateOrder : items.map((_, index) => index);
      const displayedItems = presentedOrder.map((index) => items[index]);
      const wrongIndex = Number.isInteger(question?.intentionallyWrongIndex)
          && question.intentionallyWrongIndex >= 0
          && question.intentionallyWrongIndex < displayedItems.length
          ? question.intentionallyWrongIndex
          : null;
      const principleOptions = boundedLiveQuizStrings(question?.principleOptions, 12);
      const principles = principleOptions.length >= 2
          ? principleOptions
          : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
      const chooseVerification = (answer) => patchDraft({ verifyAnswer: answer, sequenceStep: answer === 'no' ? 2 : 3 });
      const chooseMisplaced = (index) => patchDraft({ clickedIdx: index, sequenceStep: 3 });
      const submitPrinciple = (principleAnswer) => {
          const actualOrderIsCorrect = wrongIndex === null;
          const step1Correct = draft.verifyAnswer === 'yes' ? actualOrderIsCorrect : !actualOrderIsCorrect;
          const step2Correct = draft.verifyAnswer === 'yes' ? step1Correct : draft.clickedIdx === wrongIndex;
          const expectedPrinciple = boundedLiveQuizText(question?.orderingPrinciple || '', 200);
          const step3Correct = expectedPrinciple ? principleAnswer === expectedPrinciple : null;
          const gradableSteps = expectedPrinciple ? 3 : 2;
          const rawScore = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0) + (step3Correct ? 1 : 0);
          const status = rawScore === gradableSteps ? 'correct' : rawScore > 0 ? 'partially-correct' : 'incorrect';
          patchDraft({ principleAnswer });
          sendAnswer({ verifyAnswer: draft.verifyAnswer, clickedIdx: draft.clickedIdx, principleAnswer, score: rawScore, status });
      };
      return (
          <div className="mt-8 w-full max-w-4xl rounded-3xl border border-white/20 bg-white/10 p-5 text-left shadow-xl" data-live-response-type={questionType}>
              <ol className="space-y-2">
                  {displayedItems.map((item, index) => (
                      <li key={index}>
                          <button
                              type="button"
                              disabled={isDisabled || draft.sequenceStep !== 2}
                              aria-pressed={draft.clickedIdx === index}
                              onClick={() => chooseMisplaced(index)}
                              className={`${sharedButtonClass} w-full ${draft.clickedIdx === index ? 'border-yellow-300 bg-yellow-300 text-indigo-950' : 'border-white/30 bg-white text-slate-900'}`}
                          >
                              {index + 1}. {item}
                          </button>
                      </li>
                  ))}
              </ol>
              {draft.sequenceStep === 1 && (
                  <fieldset className="mt-4">
                      <legend className="mb-2 text-sm font-black text-white">Is this order correct?</legend>
                      <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={isDisabled} onClick={() => chooseVerification('yes')} className={submitButtonClass}>Yes, it is correct</button>
                          <button type="button" disabled={isDisabled} onClick={() => chooseVerification('no')} className={submitButtonClass}>No, something is misplaced</button>
                      </div>
                  </fieldset>
              )}
              {draft.sequenceStep === 2 && <p className="mt-4 text-sm font-bold text-white">Select the misplaced item above.</p>}
              {draft.sequenceStep === 3 && (
                  <fieldset className="mt-4">
                      <legend className="mb-2 text-sm font-black text-white">What is the ordering principle?</legend>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                          {principles.map((principle) => (
                              <button key={principle} type="button" disabled={isDisabled} onClick={() => submitPrinciple(principle)} className={`${sharedButtonClass} border-white/30 bg-white text-slate-900`}>
                                  {principle}
                              </button>
                          ))}
                      </div>
                  </fieldset>
              )}
          </div>
      );
  }

  if (questionType === 'relation-mismatch') {
      const pairs = (Array.isArray(question?.pairs) ? question.pairs : []).slice(0, 30).map((pair) => ({
          left: boundedLiveQuizText(pair?.left, 500),
          right: boundedLiveQuizText(pair?.right, 500)
      })).filter((pair) => pair.left && pair.right);
      const wrongPairIndex = Number.isInteger(question?.wrongPairIndex)
          && question.wrongPairIndex >= 0
          && question.wrongPairIndex < pairs.length
          ? question.wrongPairIndex
          : null;
      const correctPartner = boundedLiveQuizText(question?.correctPartnerForWrong, 500);
      const candidates = boundedLiveQuizStrings(question?.candidatePartners);
      const choosePair = (index) => patchDraft({ clickedPairIdx: index, relationStep: 2 });
      const submitPartner = (partnerValue) => {
          const partnerAnswer = boundedLiveQuizText(partnerValue, 500).trim();
          if (!partnerAnswer || !Number.isInteger(draft.clickedPairIdx)) return;
          const step1Correct = wrongPairIndex === null ? null : draft.clickedPairIdx === wrongPairIndex;
          const step2Correct = correctPartner ? partnerAnswer === correctPartner : null;
          let score = null;
          let status = 'submitted';
          if (step1Correct !== null && step2Correct !== null) {
              score = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0);
              status = score === 2 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
          }
          patchDraft({ partnerAnswer });
          sendAnswer({ clickedPairIdx: draft.clickedPairIdx, partnerAnswer, score, status });
      };
      return (
          <div className="mt-8 w-full max-w-4xl rounded-3xl border border-white/20 bg-white/10 p-5 text-left shadow-xl" data-live-response-type={questionType}>
              <div role="group" aria-label="Find the mismatched pair" className="space-y-2">
                  {pairs.map((pair, index) => (
                      <button
                          key={index}
                          type="button"
                          aria-pressed={draft.clickedPairIdx === index}
                          disabled={isDisabled || draft.relationStep !== 1}
                          onClick={() => choosePair(index)}
                          className={`${sharedButtonClass} grid w-full grid-cols-2 gap-4 ${draft.clickedPairIdx === index ? 'border-yellow-300 bg-yellow-300 text-indigo-950' : 'border-white/30 bg-white text-slate-900'}`}
                      >
                          <span>{pair.left}</span><span>↔ {pair.right}</span>
                      </button>
                  ))}
              </div>
              {draft.relationStep === 1 && <p className="mt-4 text-sm font-bold text-white">Choose the pair that does not belong.</p>}
              {draft.relationStep === 2 && (
                  <div className="mt-4">
                      <p className="mb-2 text-sm font-black text-white">What should the selected item be paired with?</p>
                      {candidates.length >= 2 ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {candidates.map((candidate) => (
                                  <button key={candidate} type="button" disabled={isDisabled} onClick={() => submitPartner(candidate)} className={`${sharedButtonClass} border-white/30 bg-white text-slate-900`}>
                                      {candidate}
                                  </button>
                              ))}
                          </div>
                      ) : (
                          <div className="flex flex-col gap-2 sm:flex-row">
                              <label className="flex-1 text-sm font-bold text-white">
                                  Replacement partner
                                  <input
                                      type="text"
                                      value={draft.partnerAnswer}
                                      maxLength="500"
                                      disabled={isDisabled}
                                      onChange={(event) => patchDraft({ partnerAnswer: event.target.value })}
                                      className="mt-2 min-h-12 w-full rounded-xl border-2 border-white/30 bg-white px-4 py-3 text-base text-slate-900"
                                  />
                              </label>
                              <button type="button" disabled={isDisabled || !draft.partnerAnswer.trim()} onClick={() => submitPartner(draft.partnerAnswer)} className={`${submitButtonClass} self-end`}>
                                  Submit replacement
                              </button>
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  }

  return null;
});

const StudentQuizOverlay = React.memo(({ sessionData, generatedContent, user, activeSessionCode, targetAppId }) => {
  const { t } = useContext(LanguageContext);
  const isQuizOpen = Boolean(sessionData?.quizState?.isActive && generatedContent && generatedContent.type === 'quiz');
  const quizState = sessionData?.quizState || {};
  const {
      mode = 'live-quiz',
      currentQuestionIndex = 0,
      phase,
      teams = {},
      bossStats,
      responses,
      scoringPolicy
  } = quizState;
  const currentQuestion = generatedContent?.data?.questions?.[currentQuestionIndex];
  const questionType = normalizeLiveQuizItemType(currentQuestion);
  const liveOptions = boundedLiveQuizStrings(currentQuestion?.options);
  const isAdvancedLiveQuestion = LIVE_QUIZ_ADVANCED_TYPES.has(questionType);
  const isUnscoredLiveQuestion = LIVE_QUIZ_UNSCORED_TYPES.has(questionType);
  const liveScoringPolicy = normalizeStudentLiveScoringPolicy(scoringPolicy || generatedContent?.data?.scoringPolicy);
  const confidenceEnabled = liveScoringPolicy.confidence && !isUnscoredLiveQuestion;
  const presentationActivityId = String(quizState.activityId || ('quiz:' + activeSessionCode)).slice(0, 120);
  const receiptQuestionIndex = Number.isInteger(currentQuestionIndex)
      ? Math.min(9999, Math.max(0, currentQuestionIndex))
      : 0;
  const responseAttemptKey = presentationActivityId + ':' + receiptQuestionIndex + ':' + String(user?.uid || '');
  const teamColor = user ? teams?.[user.uid] : null;
  const studentGroupId = sessionData?.roster?.[user?.uid]?.groupId;
  const studentGroup = studentGroupId ? sessionData.groups?.[studentGroupId] : null;
  const groupLanguage = studentGroup?.language;
  const showTranslated = groupLanguage && groupLanguage !== 'English';
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [submittedResponse, setSubmittedResponse] = useState(null);
  const [selectedConfidence, setSelectedConfidence] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isLocallyDismissed, setIsLocallyDismissed] = useState(false);
  const localAnswerKeyRef = useRef('');
  const quizRef = useRef(null);
  useFocusTrap(quizRef, isQuizOpen && !isLocallyDismissed, () => setIsLocallyDismissed(true));
  useEffect(() => {
      setIsLocallyDismissed(false);
  }, [activeSessionCode, isQuizOpen]);
  useEffect(() => {
      setSubmitError('');
      if (user && responses && responses[user.uid] !== undefined) {
          const savedResponse = responses[user.uid];
          localAnswerKeyRef.current = responseAttemptKey;
          setHasAnswered(true);
          setSelectedOptionIndex(getLiveQuizResponseOptionIndex(currentQuestion, savedResponse, liveOptions));
          setSubmittedResponse(savedResponse);
          setSelectedConfidence(['knew', 'guessed', 'no-idea'].includes(savedResponse?.confidence) ? savedResponse.confidence : null);
      } else if (localAnswerKeyRef.current !== responseAttemptKey) {
          setHasAnswered(false);
          setSelectedOptionIndex(null);
          setSubmittedResponse(null);
          setSelectedConfidence(null);
      }
  }, [responseAttemptKey, responses, user, liveOptions.length, currentQuestion]);
  useEffect(() => {
      if (isQuizOpen && mode === 'team-showdown' && user && activeSessionCode) {
          const currentTeam = teams?.[user.uid];
          if (!currentTeam) {
              const teamOptions = ['Red', 'Blue', 'Green', 'Yellow'];
              const groupedTeamIds = Object.keys(sessionData?.groups || {})
                  .filter(groupId => sessionData.groups?.[groupId] && typeof sessionData.groups[groupId] === 'object')
                  .sort();
              const existingGroupIndex = studentGroupId ? groupedTeamIds.indexOf(studentGroupId) : -1;
              // Reuse the live roster's grouping when one exists. The quiz wire
              // format and scoreboard stay on the established four team colors;
              // sessions with more than four groups intentionally share a color.
              const assignedColor = existingGroupIndex >= 0
                  ? teamOptions[existingGroupIndex % teamOptions.length]
                  : teamOptions[Math.floor(Math.random() * teamOptions.length)];
              const joinTeam = async () => {
                  try {
                      const effectiveAppId = targetAppId || appId;
                      const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
                      await updateDoc(sessionRef, {
                          [`quizState.teams.${user.uid}`]: assignedColor
                      });
                  } catch (e) {
                      warnLog("Team assignment failed:", e);
                  }
              };
              joinTeam();
          }
      }
  }, [isQuizOpen, mode, user, teams, activeSessionCode, targetAppId, studentGroupId, sessionData?.groups]);
  const transmitQuizResponse = async (responseValue) => {
      // FERPA-first transport: the answer rides the existing P2P quiz channel
      // when available. The cloud fallback remains a content-free receipt.
      const p2pSend = (typeof window !== 'undefined') && window.__alloQuizChannelSend;
      let sentViaP2P = false;
      if (typeof p2pSend === 'function') {
          try {
              sentViaP2P = Boolean(p2pSend('boss:' + currentQuestionIndex, responseValue));
          } catch (p2pError) {
              warnLog("P2P quiz response failed; recording receipt:", p2pError);
          }
      }
      if (sentViaP2P) return;
      const effectiveAppId = targetAppId || appId;
      const sessionRef = doc(db, 'artifacts', effectiveAppId, 'public', 'data', 'sessions', activeSessionCode);
      await updateDoc(sessionRef, {
          [`quizState.responseReceipts.${user.uid}`]: {
              activityId: presentationActivityId,
              questionIndex: receiptQuestionIndex,
              submittedAt: Date.now(),
              flow: 'presentation'
          }
      });
  };
  const submitQuizResponse = async (responseValue, selectedMarker = responseValue) => {
      if (hasAnswered || !user || !activeSessionCode) return;
      setSubmitError('');
      localAnswerKeyRef.current = responseAttemptKey;
      setHasAnswered(true);
      setSelectedOptionIndex(Number.isInteger(selectedMarker) && selectedMarker >= 0 && selectedMarker < liveOptions.length ? selectedMarker : null);
      setSubmittedResponse(responseValue);
      try {
          await transmitQuizResponse(responseValue);
      } catch (e) {
          warnLog("Error submitting quiz response:", e);
          localAnswerKeyRef.current = '';
          setHasAnswered(false);
          setSelectedOptionIndex(null);
          setSubmittedResponse(null);
          setSelectedConfidence(null);
          setSubmitError(t('errors.quiz_submit_failed') || 'Your answer could not be submitted. Please try again.');
      }
  };
  const submitQuizConfidence = async (confidence) => {
      if (!confidenceEnabled || !hasAnswered || submittedResponse == null || !user || !activeSessionCode || phase !== 'answering') return;
      const nextResponse = attachLiveQuizConfidence(submittedResponse, currentQuestion, receiptQuestionIndex, confidence);
      if (!nextResponse) return;
      const previousConfidence = selectedConfidence;
      setSubmitError('');
      setSelectedConfidence(confidence);
      setSubmittedResponse(nextResponse);
      try {
          await transmitQuizResponse(nextResponse);
      } catch (e) {
          warnLog("Error updating quiz confidence:", e);
          setSelectedConfidence(previousConfidence);
          setSubmitError(t('errors.quiz_submit_failed') || 'Your confidence update could not be sent. Please try again.');
      }
  };
  const getModeStyles = () => {
      switch(mode) {
          case 'boss-battle': return { bg: 'bg-slate-900', accent: 'text-red-500', icon: '⚔️' };
          case 'team-showdown': return { bg: 'bg-slate-900', accent: 'text-yellow-400', icon: '🏆' };
          case 'live-pulse': return { bg: 'bg-indigo-950', accent: 'text-cyan-400', icon: '📊' };
          default: return { bg: 'bg-indigo-950', accent: 'text-white', icon: '📝' };
      }
  };
  if (!isQuizOpen) return null;
  if (isLocallyDismissed) {
      return (
          <button
              type="button"
              onClick={() => setIsLocallyDismissed(false)}
              className="fixed bottom-4 right-4 z-[1000] min-h-11 rounded-xl bg-indigo-700 px-4 py-3 font-bold text-white shadow-2xl"
              data-allo-ui-modal="student-quiz-return"
          >
              Return to live quiz
          </button>
      );
  }
  const styles = getModeStyles();
  const getTeamBadgeColor = (color) => {
      switch(color) {
          case 'Red': return 'bg-red-600 text-white';
          case 'Blue': return 'bg-blue-600 text-white';
          case 'Green': return 'bg-green-600 text-white';
          case 'Yellow': return 'bg-yellow-400 text-black';
          default: return 'bg-slate-600 text-white';
      }
  };
  const isRevealed = phase === 'revealed';
  const correctAnswerIndex = isUnscoredLiveQuestion ? -1 : resolveLiveQuizCorrectOptionIndex(currentQuestion, liveOptions);
  const isCorrect = isRevealed && hasAnswered && correctAnswerIndex >= 0 && selectedOptionIndex === correctAnswerIndex;
  const submittedAdvancedAnswer = getLiveQuizSubmittedAnswer(submittedResponse);
  const advancedStatus = submittedAdvancedAnswer && typeof submittedAdvancedAnswer.status === 'string'
      ? submittedAdvancedAnswer.status
      : hasAnswered ? 'submitted' : 'no-response';
  const normalizedBossPhase = String(bossStats?.phaseName || 'watchful').trim().toLowerCase().replace(/\s+/g, '_');
  const bossPhaseId = ['watchful', 'enraged', 'final_form'].includes(normalizedBossPhase) ? normalizedBossPhase : 'watchful';
  const bossPhaseLabel = t(`concept_quest.boss_phase_${bossPhaseId}`);
  const bossGmEventText = bossStats?.gmEventKey ? t(`concept_quest.${bossStats.gmEventKey}`) : bossStats?.gmEvent;
  return (
    <div
        ref={quizRef}
        className={`fixed inset-0 z-[1000] ${styles.bg} flex flex-col animate-in slide-in-from-bottom duration-500 text-white font-sans motion-reduce:animate-none motion-reduce:transition-none`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-quiz-title"
        aria-describedby="student-quiz-question"
        data-allo-ui-modal="student-quiz"
        data-help-key="quiz_student_overlay"
    >
        <style>{UI_MODAL_A11Y_STYLES}</style>
        {submitError && (
            <p id="quiz-submit-error" role="alert" className="m-4 rounded-lg border border-red-300 bg-red-950 px-4 py-3 font-semibold text-white">
                {submitError}
            </p>
        )}
        <div className="p-4 flex justify-between items-start bg-black/20 backdrop-blur-md border-b border-white/10 shrink-0">
            <div>
                <h2 id="student-quiz-title" className={`font-black text-xl uppercase tracking-widest ${styles.accent} flex items-center gap-2 drop-shadow-md`} data-help-key="quiz_student_mode_header">
                    <span aria-hidden="true">{styles.icon}</span>
                    <span>{mode.replace(/-/g, ' ')}</span>
                </h2>
                {teamColor && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase mt-2 inline-block shadow-sm ${getTeamBadgeColor(teamColor)}`}>
                        {t('quiz.team_label', { color: teamColor })}
                    </span>
                )}
            </div>
             <div className="flex flex-col items-end">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{t('quiz.question_label')}</span>
                <span className="text-3xl font-mono font-black text-white leading-none">
                    {currentQuestionIndex + 1} <span className="text-lg text-white/50">/ {generatedContent?.data?.questions?.length || 0}</span>
                </span>
            </div>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            {phase === 'boss-defeated' && (
                <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-900/95 to-emerald-800/95 backdrop-blur-lg animate-in zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none">
                    <div className="text-center p-8">
                        <div aria-hidden="true" className="text-8xl mb-6">🎉</div>
                        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{t('quiz.boss.victory_msg')}</h2>
                        <p className="text-xl text-green-200">{bossStats?.name || t('quiz.boss.name_fallback')} {t('quiz.boss.defeat_suffix')}</p>
                    </div>
                </div>
            )}
            {phase === 'class-defeated' && (
                <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-900/95 to-rose-800/95 backdrop-blur-lg animate-in zoom-in duration-500 motion-reduce:animate-none motion-reduce:transition-none">
                    <div className="text-center p-8">
                        <div aria-hidden="true" className="text-8xl mb-6">💀</div>
                        <h2 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{t('quiz.boss.class_defeat_msg')}</h2>
                        <p className="text-xl text-red-200">{t('quiz.boss.class_fallen_msg')}</p>
                    </div>
                </div>
            )}
            {mode === 'boss-battle' && bossStats && (
                <div className="mb-8 w-full max-w-lg flex flex-col items-center animate-in fade-in zoom-in duration-700">
                     <div className={`relative mb-6 ${phase === 'revealed' && bossStats.lastDamage > 0 ? 'animate-shake motion-reduce:animate-none' : ''}`}>
                         {bossStats.image ? (
                             <img loading="lazy"
                                src={bossStats.image}
                                alt={t('quiz.boss.alt_text')}
                                className="w-32 h-32 md:w-48 md:h-48 object-contain pixelated drop-shadow-2xl"
                                style={STYLE_IMAGE_PIXELATED}
                             />
                         ) : (
                             <div className="w-24 h-24 md:w-32 md:h-32 bg-red-900/50 rounded-full border-4 border-red-500/50 flex items-center justify-center text-4xl shadow-xl backdrop-blur-sm">
                                 {bossStats.isGenerating ? <RefreshCw aria-hidden="true" className="animate-spin text-red-400 motion-reduce:animate-none"/> : <span aria-hidden="true">👾</span>}
                             </div>
                         )}
                         {phase === 'revealed' && bossStats.lastDamage > 0 && (
                             <div role="status" className="absolute top-0 right-[-20px] text-red-500 font-black text-3xl animate-[bounce_0.5s_infinite] motion-reduce:animate-none z-20 stroke-white drop-shadow-md">
                                 -{bossStats.lastDamage}
                             </div>
                         )}
                     </div>
                     <div className="w-full">
                         <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs font-bold"><span className="rounded-full bg-red-950 px-2 py-1 text-red-200">{t('concept_quest.boss_phase', { phase: bossPhaseLabel })}</span><span className="rounded-full bg-yellow-950 px-2 py-1 text-yellow-200">{t('concept_quest.boss_mastery_streak', { count: bossStats.masteryStreak || 0 })}</span>{bossStats.lastComboBonus > 0 && <span className="rounded-full bg-purple-950 px-2 py-1 text-purple-200">⚡ {t('concept_quest.boss_combo_bonus', { bonus: bossStats.lastComboBonus })}</span>}</div>
                         <div className="flex justify-between text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                             <span>{bossStats.name || "Boss"} HP</span>
                             <span>{Math.round(bossStats.currentHP)} / {bossStats.maxHP}</span>
                         </div>
                         <div className="w-full h-6 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 relative shadow-inner">
                             <div
                                role="progressbar"
                                aria-label={`${bossStats.name || "Boss"} health`}
                                aria-valuemin="0"
                                aria-valuemax={bossStats.maxHP}
                                aria-valuenow={Math.max(0, Math.round(bossStats.currentHP))}
                                className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 ease-out motion-reduce:transition-none"
                                style={{ width: `${Math.max(0, (bossStats.currentHP / bossStats.maxHP) * 100)}%` }}
                             ></div>
                         </div>
                     </div>
                     <div className="w-full mt-3">
                         <div className="flex justify-between text-xs font-bold text-slate-300 mb-1 uppercase tracking-wider">
                             <span>{t('quiz.boss.class_hp')}</span>
                             <span>{Math.round(bossStats.classHP ?? 100)} / {bossStats.classMaxHP || 100}</span>
                         </div>
                         <div className="w-full h-5 bg-slate-800 rounded-full overflow-hidden border-2 border-slate-700 relative shadow-inner">
                             <div
                                role="progressbar"
                                aria-label={t('quiz.boss.class_hp')}
                                aria-valuemin="0"
                                aria-valuemax={bossStats.classMaxHP || 100}
                                aria-valuenow={Math.max(0, Math.round(bossStats.classHP ?? 100))}
                                className="h-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-500 ease-out motion-reduce:transition-none"
                                style={{ width: `${Math.max(0, ((bossStats.classHP ?? 100) / (bossStats.classMaxHP || 100)) * 100)}%` }}
                             ></div>
                         </div>
                         {phase === 'revealed' && bossStats.lastClassDamage > 0 && (
                             <div role="status" className="text-orange-400 text-xs font-bold mt-1 animate-pulse motion-reduce:animate-none text-center">
                                 {t('quiz.boss.counter_attack_msg', { damage: bossStats.lastClassDamage })}
                             </div>
                         )}
                         {bossGmEventText && <p role="status" aria-live="polite" className="mt-2 rounded-lg border border-amber-400/40 bg-amber-950/70 p-2 text-center text-xs font-bold text-amber-100">🎲 {t('concept_quest.boss_teacher_gm', { event: bossGmEventText })}</p>}
                         {phase === 'revealed' && bossStats.roundFeedback && <details className="mt-2 rounded-lg bg-slate-800 p-2 text-left text-xs text-slate-200"><summary className="cursor-pointer font-bold">{t('concept_quest.boss_round_recap', { accuracy: bossStats.roundFeedback.accuracy })}</summary>{bossStats.roundFeedback.explanation ? <p className="mt-1">{bossStats.roundFeedback.explanation}</p> : <p className="mt-1">{t('concept_quest.boss_discuss_evidence')}</p>}</details>}
                     </div>
                </div>
            )}
            <div className="bg-white/10 backdrop-blur-md p-5 md:p-8 rounded-3xl border border-white/10 shadow-2xl max-w-3xl w-full">
                {currentQuestion?.imageUrl && (
                    <img
                        src={currentQuestion.imageUrl}
                        alt={String(currentQuestion.imageAlt || currentQuestion.question || t('quiz.question_image') || 'Question image')}
                        loading="eager"
                        decoding="async"
                        onError={(event) => { event.currentTarget.hidden = true; }}
                        data-live-quiz-question-image="true"
                        className="mb-5 max-h-64 w-full rounded-2xl border border-white/20 bg-white object-contain shadow-lg"
                    />
                )}
                <h3 id="student-quiz-question" aria-live="polite" aria-atomic="true" className="text-2xl md:text-4xl font-bold text-white leading-tight drop-shadow-sm" data-help-key="quiz_student_question">
                    {currentQuestion ? currentQuestion.question : t('quiz.loading_question')}
                </h3>
                {currentQuestion && showTranslated && currentQuestion.question_en && (
                    <p className="mt-3 text-base md:text-lg text-white/70 italic">
                        {currentQuestion.question_en}
                    </p>
                )}
            </div>
            {/* Phase C (poll subtype): Likert items render as a horizontal 1..N tick
                strip with low/high labels above the strip. submitQuizResponse(idx)
                writes the 0-based array index just like MCQ; the host synthesizes
                options=['1','2',...,'N'] so the wire format and rule-eval path
                stay uniform. Polls have NO correct answer, so revealed-state
                styling intentionally never shows a "right" tick. */}
            {isAdvancedLiveQuestion ? (
              <LiveAdvancedQuizResponse
                  question={currentQuestion}
                  questionType={questionType}
                  questionIndex={receiptQuestionIndex}
                  questionKey={responseAttemptKey}
                  phase={phase}
                  hasAnswered={hasAnswered}
                  onSubmit={submitQuizResponse}
              />
            ) : questionType === 'likert' ? (
              <div className="w-full max-w-3xl mt-8 px-4">
                <div className="flex justify-between text-xs md:text-sm font-bold text-white/80 mb-2 uppercase tracking-wider">
                  <span>{currentQuestion.scale?.lowLabel || t('quiz.likert_strongly_disagree') || 'Strongly disagree'}</span>
                  <span>{currentQuestion.scale?.highLabel || t('quiz.likert_strongly_agree') || 'Strongly agree'}</span>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(3, Math.min(7, Number(currentQuestion?.scale?.steps) || liveOptions.length || 5))}, minmax(0, 1fr))` }}>
                  {liveOptions.map((tickLabel, idx) => {
                    const isSelected = selectedOptionIndex === idx;
                    const isDisabled = hasAnswered || phase !== 'answering';
                    let btnClass = 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:bg-purple-50';
                    if (isSelected) btnClass = 'bg-purple-500 text-white border-purple-700 scale-[1.05] ring-4 ring-purple-300/40 z-10';
                    else if (isDisabled) btnClass = 'bg-slate-800 text-slate-300 border-slate-900 opacity-60 cursor-not-allowed';
                    return (
                      <button
                        key={idx}
                        data-help-key="quiz_student_likert_tick"
                        onClick={() => submitQuizResponse(idx)}
                        disabled={isDisabled}
                        aria-label={`${tickLabel} of ${liveOptions.length}`}
                        className={`relative p-4 md:p-6 rounded-2xl font-black text-2xl md:text-3xl transition-all transform duration-200 shadow-xl border-b-4 active:border-b-0 active:translate-y-1 ${btnClass}`}
                      >
                        {tickLabel}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-center text-[11px] md:text-xs text-white/60 italic">
                  {t('quiz.no_right_answer') || 'There are no right or wrong answers here.'}
                </p>
              </div>
            ) : (
            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 px-4">
                {liveOptions.map((option, idx) => {
                    const isSelected = selectedOptionIndex === idx;
                    const letter = String.fromCharCode(65 + idx);
                    const optionImageUrl = Array.isArray(currentQuestion?.optionImageUrls)
                        ? currentQuestion.optionImageUrls[idx]
                        : null;
                    const isDisabled = hasAnswered || phase !== 'answering';
                    let btnClass = 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50';
                    let letterClass = 'bg-indigo-100 text-indigo-600 border-indigo-200 group-hover:bg-white group-hover:border-indigo-300';
                    if (isRevealed && isUnscoredLiveQuestion) {
                        if (isSelected) {
                            btnClass = 'bg-purple-500 text-white border-purple-700 scale-[1.02] ring-4 ring-purple-300/40 z-10';
                            letterClass = 'bg-white text-purple-700 border-white';
                        } else {
                            btnClass = 'bg-slate-800 text-slate-300 border-slate-900 opacity-60';
                            letterClass = 'bg-slate-700 text-slate-300 border-slate-600';
                        }
                    } else if (isRevealed) {
                        if (idx === correctAnswerIndex) {
                            btnClass = 'bg-green-700 text-white border-green-800 ring-4 ring-green-700/30 z-10 scale-[1.02] shadow-xl';
                            letterClass = 'bg-white text-green-600 border-white';
                        } else if (isSelected && idx !== correctAnswerIndex) {
                            btnClass = 'bg-red-500 text-white border-red-600 opacity-90';
                            letterClass = 'bg-white text-red-600 border-white';
                        } else {
                            btnClass = 'bg-slate-800 text-slate-300 border-slate-900 opacity-50';
                            letterClass = 'bg-slate-700 text-slate-300 border-slate-600';
                        }
                    } else if (isSelected) {
                        btnClass = 'bg-yellow-400 text-indigo-900 border-yellow-600 scale-[1.02] ring-4 ring-yellow-200/50 z-10';
                        letterClass = 'bg-indigo-900 text-yellow-400 border-indigo-900';
                    } else if (isDisabled) {
                         btnClass = 'bg-slate-800 text-slate-300 border-slate-900 opacity-60 cursor-not-allowed';
                         letterClass = 'bg-slate-700 text-slate-300 border-slate-600';
                    }
                    return (
                        <button
                            key={idx}
                            data-help-key="quiz_student_answer_option"
                            onClick={() => submitQuizResponse(idx)}
                            disabled={isDisabled}
                            aria-label={String(option) + (showTranslated && currentQuestion?.options_en?.[idx] ? '. ' + currentQuestion.options_en[idx] : '')}
                            aria-pressed={isSelected}
                            className={`
                                relative group overflow-hidden p-6 rounded-2xl font-bold text-lg md:text-xl transition-all transform duration-300 shadow-xl border-b-4 active:border-b-0 active:translate-y-1
                                ${btnClass}
                            `}
                        >
                            {optionImageUrl && (
                                <img
                                    src={optionImageUrl}
                                    alt=""
                                    aria-hidden="true"
                                    loading="eager"
                                    decoding="async"
                                    onError={(event) => { event.currentTarget.hidden = true; }}
                                    data-live-quiz-option-image={idx}
                                    className="relative z-10 mb-4 h-28 w-full rounded-xl border border-slate-200 bg-white object-contain md:h-36"
                                />
                            )}
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center font-black text-lg shrink-0 border-2 transition-colors
                                    ${letterClass}
                                `}>
                                    {letter}
                                </div>
                                <div className="flex flex-col items-start gap-1 text-left leading-tight">
                                    <span>{option}</span>
                                    {showTranslated && currentQuestion?.options_en?.[idx] && (
                                        <span className="text-xs opacity-60 font-normal italic">
                                            {currentQuestion.options_en[idx]}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isSelected && !isRevealed && (
                                <div className="absolute top-2 right-2 text-indigo-900 animate-in zoom-in duration-300">
                                    <CheckCircle2 size={24} className="fill-white"/>
                                </div>
                            )}
                            {isRevealed && !isUnscoredLiveQuestion && idx === correctAnswerIndex && (
                                <div className="absolute top-2 right-2 text-white animate-in zoom-in duration-300">
                                    <CheckCircle2 size={24} />
                                </div>
                            )}
                             {isRevealed && !isUnscoredLiveQuestion && isSelected && idx !== correctAnswerIndex && (
                                <div className="absolute top-2 right-2 text-white animate-in zoom-in duration-300">
                                    <XCircle size={24} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            )}
            {phase === 'answering' && hasAnswered && confidenceEnabled && (
                <fieldset
                    className="mt-6 w-full max-w-2xl rounded-2xl border border-cyan-300/50 bg-cyan-950/60 px-5 py-4 text-left shadow-xl"
                    data-live-confidence-policy="true"
                >
                    <legend className="px-2 text-sm font-black text-white">How sure were you?</legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                            ['knew', 'I knew this'],
                            ['guessed', 'I made an informed guess'],
                            ['no-idea', 'I was not sure'],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={selectedConfidence === value}
                                onClick={() => submitQuizConfidence(value)}
                                className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-bold transition-colors motion-reduce:transition-none ${
                                    selectedConfidence === value
                                        ? 'border-cyan-200 bg-cyan-300 text-slate-950'
                                        : 'border-white/30 bg-white text-slate-900 hover:border-cyan-300'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-[11px] text-cyan-100">This helps your teacher spot secure knowledge and misconceptions. It never changes correctness or points.</p>
                </fieldset>
            )}
            <div className="mt-8 min-h-16 flex items-center justify-center w-full mb-8">
                {phase === 'answering' && (
                    hasAnswered ? (
                        <div role="status" aria-live="polite" aria-atomic="true" className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold text-sm animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none flex items-center gap-3 border border-white/10 shadow-lg">
                           <span className="relative flex h-3 w-3">
                              <span aria-hidden="true" className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 motion-reduce:animate-none"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                           {t('quiz.status.answer_sent')}
                        </div>
                    ) : (
                        <div className="text-white/50 font-mono text-xs uppercase tracking-widest animate-pulse motion-reduce:animate-none">
                            {isAdvancedLiveQuestion ? 'Complete and submit your response' : t('quiz.status.choose_option')}
                        </div>
                    )
                )}
                {phase === 'revealed' && isUnscoredLiveQuestion && (
                    <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-6 items-center w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none px-4">
                        <div className="w-full px-8 py-6 rounded-3xl font-bold text-lg shadow-xl flex items-center justify-center gap-4 border-2 border-purple-300 bg-purple-50 text-purple-900">
                            <span aria-hidden="true">🗣️</span>
                            <span>{hasAnswered ? (t('quiz.poll_completed') || 'Thanks for sharing your take.') : 'This opinion prompt has closed.'}</span>
                        </div>
                    </div>
                )}
                {phase === 'revealed' && isAdvancedLiveQuestion && (
                    <div role="status" aria-live="polite" aria-atomic="true" className="flex w-full max-w-2xl items-center justify-center px-4">
                        <div className={`w-full rounded-3xl border-2 px-8 py-6 text-center text-lg font-bold shadow-xl ${
                            advancedStatus === 'correct'
                                ? 'border-green-300 bg-green-50 text-green-900'
                                : advancedStatus === 'partially-correct'
                                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                                    : advancedStatus === 'incorrect'
                                        ? 'border-red-300 bg-red-50 text-red-900'
                                        : 'border-indigo-300 bg-indigo-50 text-indigo-950'
                        }`}>
                            {advancedStatus === 'correct'
                                ? 'Correct response.'
                                : advancedStatus === 'partially-correct'
                                    ? 'Partially correct response.'
                                    : advancedStatus === 'incorrect'
                                        ? 'This response needs another look.'
                                        : advancedStatus === 'no-response'
                                            ? 'No response was submitted.'
                                            : 'Response submitted for review.'}
                        </div>
                    </div>
                )}
                {phase === 'revealed' && !isUnscoredLiveQuestion && !isAdvancedLiveQuestion && (
                    <div role="status" aria-live="polite" aria-atomic="true" className="flex flex-col gap-6 items-center w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500 motion-reduce:animate-none px-4">
                        <div className={`
                            w-full px-8 py-6 rounded-3xl font-black text-2xl shadow-2xl flex items-center justify-center gap-6 border-4 transform transition-transform hover:scale-105
                            ${isCorrect
                                ? 'bg-green-700 border-green-500 text-white ring-4 ring-green-700/30'
                                : 'bg-red-500 border-red-300 text-white ring-4 ring-red-500/30'}
                        `}>
                            {isCorrect ? <CheckCircle2 aria-hidden="true" size={40} className="fill-white text-green-500"/> : <XCircle aria-hidden="true" size={40} className="fill-white text-red-500"/>}
                            <div>
                                <div className="uppercase tracking-widest text-xs opacity-90 mb-1 font-medium">{t('quiz.result_label')}</div>
                                {mode === 'boss-battle' ? (
                                    isCorrect
                                        ? t('quiz.status.result_hit', { damage: bossStats?.lastDamage || 0 })
                                        : t('quiz.status.result_miss', { hp: bossStats?.lastClassDamage || 0 })
                                ) : mode === 'team-showdown' ? (
                                    isCorrect
                                        ? t('quiz.status.result_correct')
                                        : t('quiz.status.result_incorrect')
                                ) : (
                                    isCorrect ? t('quiz.status.result_correct') : t('quiz.status.result_incorrect')
                                )}
                            </div>
                        </div>
                        {currentQuestion.factCheck && (
                             <div className="bg-white/95 backdrop-blur-xl text-slate-800 p-6 rounded-3xl border border-white/20 shadow-2xl w-full text-left relative overflow-hidden z-20">
                                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                 <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                                     <Sparkles size={14} className="fill-yellow-400 text-yellow-500"/> Explanation
                                 </h4>
                                 {/* XSS guard: factCheck is AI-generated; escape <,>,& BEFORE the markdown-to-HTML replacements so injected tags can't echo through. */}
                                 <div
                                    className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: String(currentQuestion.factCheck)
                                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/\n/g, '<br/>') }}
                                 />
                                 {showTranslated && currentQuestion.factCheck_en && (
                                     <div className="mt-3 pt-3 border-t border-slate-200">
                                         <p className="text-xs text-slate-600 italic whitespace-pre-wrap">
                                             {currentQuestion.factCheck_en}
                                         </p>
                                     </div>
                                 )}
                             </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        <button
            type="button"
            onClick={() => setIsLocallyDismissed(true)}
            className="absolute right-4 top-4 z-[60] min-h-11 rounded-lg border-2 border-white/70 bg-slate-950/90 px-4 py-2 text-sm font-bold text-white shadow-lg"
            aria-label="Leave live quiz view"
        >
            Exit quiz view
        </button>
    </div>
  );
});

const TeacherGate = React.memo(({ isOpen, onClose, onUnlock }) => {
  const { t } = useContext(LanguageContext);
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const gateRef = useRef(null);
  const gateOpenRef = useRef(isOpen);
  const attemptRef = useRef(0);
  const closeGate = () => {
    attemptRef.current += 1;
    gateOpenRef.current = false;
    setBusy(false);
    onClose();
  };
  useFocusTrap(gateRef, isOpen, closeGate);
  useEffect(() => {
    gateOpenRef.current = isOpen;
    if (!isOpen) {
      attemptRef.current += 1;
      setPasswordInput('');
      setError('');
      setBusy(false);
      setBlockedUntil(0);
    }
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || blockedUntil <= Date.now()) return undefined;
    const timer = setInterval(() => setClockNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [isOpen, blockedUntil]);
  if (!isOpen) return null;
  const retrySeconds = Math.max(0, Math.ceil((blockedUntil - clockNow) / 1000));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy || retrySeconds > 0) return;
    const attemptId = ++attemptRef.current;
    const accessCode = window.AlloModules?.DeviceAccessCode;
    const submittedCode = passwordInput;
    setPasswordInput('');
    setBusy(true);
    setError('');
    try {
      if (!accessCode || typeof accessCode.verify !== 'function') {
        setError('The access-code checker is still loading. Please try again.');
        return;
      }
      const result = await accessCode.verify(submittedCode);
      if (!gateOpenRef.current || attemptId !== attemptRef.current) return;
      if (result?.ok) {
        onUnlock();
        closeGate();
        setError('');
        setBlockedUntil(0);
      } else if (result?.reason === 'backoff' || result?.retryAfterMs > 0) {
        const waitMs = Math.max(1000, Number(result.retryAfterMs) || 0);
        setClockNow(Date.now());
        setBlockedUntil(Date.now() + waitMs);
        setError('Too many incorrect attempts. Please wait briefly before trying again.');
      } else {
        setError(result?.reason === 'not-configured'
          ? 'No educator access code is configured on this device.'
          : 'That access code is not correct.');
      }
    } catch (_) {
      if (gateOpenRef.current && attemptId === attemptRef.current) {
        setError('The access code could not be checked on this device.');
      }
    } finally {
      if (gateOpenRef.current && attemptId === attemptRef.current) setBusy(false);
    }
  };
  return (
    <div ref={gateRef} className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-300 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-labelledby="teacher-gate-title" aria-describedby="teacher-gate-helper" data-allo-ui-modal="teacher-gate" data-help-key="teacher_gate_modal">
      <style>{UI_MODAL_A11Y_STYLES}</style>
      <div className="my-auto max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center border-4 border-indigo-100 relative transform transition-all animate-in zoom-in-95 motion-reduce:animate-none motion-reduce:transition-none">

        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-200 shadow-sm">
            <Lock aria-hidden="true" size={32} className="text-red-600" />
        </div>
        <h2 id="teacher-gate-title" className="text-2xl font-black text-slate-800 mb-2">{t('modals.teacher_gate.title')}</h2>
        <p id="teacher-gate-helper" className="text-slate-600 mb-6 text-sm font-medium">{t('modals.teacher_gate.helper')}</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label id="teacher-gate-access-code-label" htmlFor="teacher-gate-access-code" className="mb-2 block text-sm font-bold text-slate-700">
                    {t('modals.teacher_gate.access_code_placeholder')}
                </label>
                <input
                    id="teacher-gate-access-code"
                    type="password"
                    autoComplete="current-password"
                    value={passwordInput}
                    onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setError('');
                    }}
                    placeholder={t('modals.teacher_gate.access_code_placeholder')}
                    className={`w-full text-center text-lg p-3 border-2 rounded-xl outline-none focus:ring-4 transition-all placeholder:text-slate-600 ${error ? 'border-red-400 bg-red-50 focus:ring-red-200 text-red-900' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 text-indigo-900'}`}
                    autoFocus
                    disabled={busy || retrySeconds > 0}
                    aria-invalid={Boolean(error)}
                    aria-labelledby="teacher-gate-access-code-label"
                    aria-describedby={error ? 'teacher-gate-helper teacher-gate-error' : 'teacher-gate-helper'}
                    data-help-key="teacher_gate_input"
                />
                {error && (
                    <p id="teacher-gate-error" role="alert" className="text-xs font-bold text-red-700 mt-2 flex items-center justify-center gap-1">
                        <XCircle aria-hidden="true" size={12} /> {error}{retrySeconds > 0 ? ` (${retrySeconds}s)` : ''}
                    </p>
                )}
            </div>
            <button
                type="submit"
                disabled={busy || retrySeconds > 0 || !passwordInput}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                data-help-key="teacher_gate_unlock"
            >
                {busy ? 'Checking…' : retrySeconds > 0 ? `Try again in ${retrySeconds}s` : t('modals.teacher_gate.unlock')}
            </button>
        </form>
        <button
            type="button"
            onClick={closeGate}
            className="absolute top-4 right-4 min-h-6 min-w-6 text-slate-600 hover:text-slate-900 transition-colors p-1 rounded-full hover:bg-slate-100"
            aria-label={t('common.cancel')}
            data-alloflow-close-on-escape="true"
        >
            <X aria-hidden="true" size={20} />
        </button>
      </div>
    </div>
  );
});

const RoleSelectionModal = React.memo(({ onSelect, onGateRequired, onStartVoiceAccess }) => {
  const { t } = useContext(LanguageContext);
  const roleRef = useRef(null);
  useFocusTrap(roleRef, true);
  const handleRoleClick = (role) => {
    const accessCodeRequired = typeof window._alloEducatorAccessCodeRequired === 'function'
      ? window._alloEducatorAccessCodeRequired()
      : !!APP_CONFIG._cfg_validation_key;
    if (accessCodeRequired && ['teacher', 'parent', 'independent'].includes(role)) {
        if (onGateRequired) onGateRequired(role);
    } else {
        onSelect(role);
    }
  };
  // The host remembers the last chosen role (executeRoleSelect writes it). Shown
  // as a badge on the matching card — a hint, never an auto-skip, because the
  // wizard is the only role chooser and never reopens after selection.
  const lastRole = (() => { try { return localStorage.getItem('alloflow_last_role'); } catch (_) { return null; } })();
  const lastTimeBadge = (role) => lastRole === role ? (
    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-full px-2 py-0.5">
      {t('roles.last_time') || 'Last time'}
    </span>
  ) : null;
  const [micStatus, setMicStatus] = useState('idle');
  const handleMicCheck = async () => {
      if (micStatus === 'requesting' || micStatus === 'granted') return;
      if (typeof onStartVoiceAccess === 'function') {
          setMicStatus('requesting');
          try {
              // The host-owned coordinator is the only microphone owner on this
              // path. Resolve true only after continuous command listening starts.
              const started = await onStartVoiceAccess();
              setMicStatus(started === false ? 'denied' : 'granted');
          } catch (e) {
              warnLog("Unable to start Voice Access:", e);
              setMicStatus('denied');
          }
          return;
      }
      // Safe legacy fallback: probe permission only when the host has not
      // supplied its global voice-session callback.
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
          setMicStatus('unsupported');
          return;
      }
      setMicStatus('requesting');
      const recognition = new SpeechRecognition();
      recognition.onstart = () => {
          setMicStatus('granted');
          recognition.stop();
      };
      recognition.onerror = (event) => {
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
              setMicStatus('denied');
          } else {
              setMicStatus('denied');
          }
      };
      try {
          recognition.start();
      } catch (e) {
          warnLog("Unhandled error:", e);
          setMicStatus('denied');
      }
  };
  const roleCopy = (key, fallback) => {
      const value = t(key);
      return value && value !== key ? value : fallback;
  };
  const usesGlobalVoiceAccess = typeof onStartVoiceAccess === 'function';
  const micStatusText = usesGlobalVoiceAccess
      ? micStatus === 'granted' ? roleCopy('roles.voice_access_active', 'Voice Access started') :
        micStatus === 'denied' ? roleCopy('roles.voice_access_denied', 'Voice Access could not start') :
        micStatus === 'requesting' ? roleCopy('roles.voice_access_starting', 'Starting Voice Access...') :
        roleCopy('roles.voice_access_enable', 'Enable Voice Access')
      : micStatus === 'granted' ? t('roles.mic_ready') :
        micStatus === 'unsupported' ? t('roles.voice_not_supported') :
        micStatus === 'denied' ? t('roles.mic_denied') :
        micStatus === 'requesting' ? t('roles.mic_requesting') :
        t('roles.mic_enable');
  return (
  <div
    ref={roleRef}
    className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md overflow-y-auto py-4 sm:py-8 px-4 animate-in fade-in duration-300 motion-reduce:animate-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="role-selection-title"
    aria-describedby="role-selection-description"
    data-allo-ui-modal="role-selection"
  >
    <style>{UI_MODAL_A11Y_STYLES}</style>
    <div className="min-h-full flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-3xl w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none relative">
      <div className="flex justify-end mb-2">
          <UiLanguageSelector />
      </div>
      <div className="flex justify-center mb-6">
        <div className="bg-indigo-100 p-4 rounded-full shadow-inner">
           <Layers size={48} className="text-indigo-600" />
        </div>
      </div>
      <h2 id="role-selection-title" className="text-3xl font-black text-slate-800 mb-2 tracking-tight">{t('roles.title')}</h2>
      <p id="role-selection-description" className="text-slate-600 mb-8 font-medium">{t('roles.subtitle')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
            onClick={() => handleRoleClick('student')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-teal-400 hover:bg-teal-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_student"
        >
            <div className="bg-teal-100 text-teal-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12">
                <GraduationCap size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-teal-700">{t('roles.student')}</span>
        </button>
        <button
            onClick={() => handleRoleClick('teacher')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_teacher"
        >
            <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:-rotate-12">
                <School size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-indigo-700">{t('roles.teacher')}</span>
            {lastTimeBadge('teacher')}
        </button>
        <button
            onClick={() => handleRoleClick('parent')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_parent"
        >
            <div className="bg-orange-100 text-orange-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12">
                <Heart size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-orange-700">{t('roles.parent')}</span>
            <span className="text-[11px] leading-tight text-slate-500 text-center max-w-[13rem]">{t('parent_mode.role_description') || 'Support learning at home with family-friendly tools.'}</span>
            {lastTimeBadge('parent')}
        </button>
        <button
            onClick={() => handleRoleClick('independent')}
            className="flex flex-col items-center h-full justify-start gap-3 p-6 rounded-xl border-2 border-slate-100 hover:border-cyan-400 hover:bg-cyan-50 transition-all group shadow-sm hover:shadow-md active:scale-95 focus:ring-4 focus:ring-cyan-500 focus:ring-offset-2 focus:outline-none"
            data-help-key="role_independent"
        >
            <div className="bg-cyan-100 text-cyan-600 p-4 rounded-full group-hover:scale-110 transition-transform group-hover:rotate-12">
                <UserCircle2 size={32} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-cyan-700">{t('roles.independent')}</span>
            {lastTimeBadge('independent')}
        </button>
      </div>
      <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-2">{usesGlobalVoiceAccess ? roleCopy('roles.voice_access_setup', 'Voice Access') : t('roles.mic_setup')}</p>
          <button
            type="button"
            onClick={handleMicCheck}
            disabled={micStatus === 'granted' || micStatus === 'requesting'}
            aria-busy={micStatus === 'requesting'}
            aria-describedby="role-mic-status"
            data-help-key="role_voice_access"
            className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-bold transition-all ${
                micStatus === 'granted' ? 'bg-green-100 text-green-700 cursor-default' :
                micStatus === 'denied' || micStatus === 'unsupported' ? 'bg-red-50 text-red-700 border border-red-200' :
                micStatus === 'requesting' ? 'bg-slate-100 text-slate-600' :
                'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
            }`}
          >
              {micStatus === 'granted' ? <CheckCircle aria-hidden="true" size={14} /> :
               micStatus === 'denied' || micStatus === 'unsupported' ? <XCircle aria-hidden="true" size={14} /> :
               micStatus === 'requesting' ? <RefreshCw aria-hidden="true" size={14} className="animate-spin motion-reduce:animate-none"/> :
               <Mic aria-hidden="true" size={14} />}
              <span>{micStatusText}</span>
          </button>
          <p id="role-mic-status" className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {micStatus === 'idle' ? '' : micStatusText}
          </p>
          {micStatus === 'idle' && (
              <p id="role-mic-tip" className="text-[11px] text-slate-600 mt-2">
                  {usesGlobalVoiceAccess
                    ? roleCopy('roles.voice_access_tip', 'Your browser or operating system may ask for microphone activation once. After permission, continuous voice command listening starts. Voice Access is optional; touch, pointer, and keyboard remain available.')
                    : t('roles.mic_tip')}
              </p>
          )}
      </div>
    </div>
    </div>
  </div>
  );
});

const StudentEntryModal = React.memo(({ isOpen, onClose, onConfirm }) => {
  const { t } = useContext(LanguageContext);
  const [selectedAdj, setSelectedAdj] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const entryRef = useRef(null);
  useFocusTrap(entryRef, isOpen, onClose);
  const adjectives = t('codenames.adjectives', { returnObjects: true }) || [];
  const animals = t('codenames.animals', { returnObjects: true }) || [];
  const randomizeName = useCallback(() => {
    if (adjectives.length > 0 && animals.length > 0) {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const animal = animals[Math.floor(Math.random() * animals.length)];
        setSelectedAdj(adj);
        setSelectedAnimal(animal);
    }
  }, [adjectives, animals]);
  useEffect(() => {
    if (isOpen && (!selectedAdj || !selectedAnimal)) {
      randomizeName();
    }
  }, [isOpen, randomizeName]);
  const getFullName = () => `${selectedAdj} ${selectedAnimal}`;
  const handleConfirm = (mode) => {
    if (selectedAdj && selectedAnimal) {
      onConfirm(getFullName(), mode);
    }
  };
  // Student Entry is a required learner setup surface, so it contributes its
  // own semantic command scope instead of asking voice users to operate the
  // two visual select controls. The scope never exposes the generated
  // codename in command snapshots or spoken narration; it stays visible on
  // this device and reaches the host only through the existing onConfirm path.
  const studentEntryVoiceRef = useRef(null);
  studentEntryVoiceRef.current = {
    isOpen: !!isOpen,
    codenameReady: !!(selectedAdj && selectedAnimal),
    randomize: randomizeName,
    startNew: () => handleConfirm('new'),
    cancel: onClose,
  };
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    const commands = window.AlloModules && window.AlloModules.AlloCommands;
    if (!commands || typeof commands.registerCommandScope !== 'function') return undefined;
    return commands.registerCommandScope({
      id: 'student-entry',
      priority: 120,
      isActive: () => !!(studentEntryVoiceRef.current && studentEntryVoiceRef.current.isOpen),
      getCapabilities: () => ({
        semanticStudentSetup: true,
        canRandomizeCodename: true,
        canStartNewWork: !!(studentEntryVoiceRef.current && studentEntryVoiceRef.current.codenameReady),
        canCancel: true,
      }),
      // Deliberately omit the adjective/animal. Debug and command state must
      // not become a second persistence or disclosure path for learner IDs.
      getState: () => ({
        phase: 'codename',
        codenameReady: !!(studentEntryVoiceRef.current && studentEntryVoiceRef.current.codenameReady),
      }),
      getCommands: () => [
        { id: 'student_entry_describe', risk: 'none', confirmation: 'never', label: 'Describe student setup' },
        { id: 'student_entry_list_actions', risk: 'none', confirmation: 'never', label: 'List student setup actions' },
        { id: 'student_entry_randomize_codename', risk: 'state-change', confirmation: 'never', label: 'Choose a different private codename' },
        {
          id: 'student_entry_start_new_work',
          risk: 'state-change',
          confirmation: 'always',
          label: 'Start a new learner workspace',
          confirmMessage: 'Start a new learner workspace using the private codename shown on this device?',
        },
        { id: 'student_entry_cancel', risk: 'state-change', confirmation: 'never', label: 'Return to role selection' },
      ],
      parse: (value) => {
        const text = String(value || '').toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (/^(?:where am i|describe (?:this|the current) screen|what screen is this|describe student setup)$/.test(text)) return { commandId: 'student_entry_describe', confidence: 1 };
        if (/^(?:what can i do(?: here)?|list (?:available )?actions|list my choices|what are my choices|help)$/.test(text)) return { commandId: 'student_entry_list_actions', confidence: 1 };
        if (/^(?:randomize|change|choose|give me)(?: (?:a|the))? (?:different |new )?(?:private )?codename$/.test(text) || /^(?:different|new) codename$/.test(text)) return { commandId: 'student_entry_randomize_codename', confidence: 1 };
        if (/^(?:start|begin)(?: my| a)? new (?:work|workspace|project)$/.test(text) || /^(?:use|choose) this codename$/.test(text) || /^(?:continue|start learning)$/.test(text)) return { commandId: 'student_entry_start_new_work', confidence: 1 };
        if (/^(?:cancel|go back|back|return to role selection|close (?:this|the) (?:screen|dialog))$/.test(text)) return { commandId: 'student_entry_cancel', confidence: 1 };
        return null;
      },
      execute: (commandId) => {
        const current = studentEntryVoiceRef.current;
        if (!current || !current.isOpen) return { ok: false, narration: 'Student setup is no longer open.' };
        if (commandId === 'student_entry_describe') return { ok: true, narration: 'Student setup is open. A private codename has been generated on this device. You can choose a different codename, start new work, or go back.' };
        if (commandId === 'student_entry_list_actions') return { ok: true, narration: 'Available actions: choose a different codename, start new work, or go back.' };
        if (commandId === 'student_entry_randomize_codename') {
          current.randomize();
          return { ok: true, narration: 'A different private codename is now shown on this device.' };
        }
        if (commandId === 'student_entry_start_new_work') {
          if (!current.codenameReady) return { ok: false, narration: 'The private codename is still being prepared. Try again in a moment.' };
          current.startNew();
          return { ok: true, narration: 'New learner workspace started.' };
        }
        if (commandId === 'student_entry_cancel') {
          current.cancel();
          return { ok: true, narration: 'Returned to role selection.' };
        }
        return { ok: false, narration: 'That student setup action is not available.' };
      },
    });
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div
        ref={entryRef}
        className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-300 motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-entry-title"
        aria-describedby="student-entry-description"
        data-allo-ui-modal="student-entry"
    >
      <style>{UI_MODAL_A11Y_STYLES}</style>
      <div className="my-auto max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border-4 border-indigo-100 transform transition-all animate-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none relative">
        <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 min-h-6 min-w-6 p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={t('common.close')}
            data-alloflow-close-on-escape="true"
        >
            <X aria-hidden="true" size={20} />
        </button>
        <h2 id="student-entry-title" className="text-2xl font-black text-slate-800 mb-2">{t('wizard.step_codename') || 'Pick Your Codename!'}</h2>
        <p id="student-entry-description" className="text-slate-600 mb-6 font-medium">{t('modals.student_entry_sub')}</p>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
                <label className="text-left text-xs font-bold text-indigo-900">
                    <span className="mb-1 block">{t('modals.entry.select_adjective')}</span>
                    <select
                        value={selectedAdj}
                        onChange={(e) => setSelectedAdj(e.target.value)}
                        className="w-full min-h-11 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm cursor-pointer"
                        aria-label={t('modals.entry.select_adjective')}
                        data-help-key="entry_adjective"
                    >
                        {adjectives.map((adj, i) => (
                            <option key={i} value={adj}>{adj}</option>
                        ))}
                    </select>
                </label>
                <label className="text-left text-xs font-bold text-indigo-900">
                    <span className="mb-1 block">{t('modals.entry.select_animal')}</span>
                    <select
                        value={selectedAnimal}
                        onChange={(e) => setSelectedAnimal(e.target.value)}
                        className="w-full min-h-11 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm cursor-pointer"
                        aria-label={t('modals.entry.select_animal')}
                        data-help-key="entry_animal"
                    >
                        {animals.map((anim, i) => (
                            <option key={i} value={anim}>{anim}</option>
                        ))}
                    </select>
                </label>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                <div className="text-xl font-black text-indigo-600 tracking-tight truncate mr-2" role="status" aria-live="polite" aria-atomic="true">
                    {selectedAdj} {selectedAnimal}
                </div>
                <button
                    type="button"
                    onClick={randomizeName}
                    className="min-h-6 min-w-6 p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 hover:scale-110 motion-reduce:hover:scale-100 transition-all shrink-0"
                    title={t('modals.entry.randomize_codename')}
                    aria-label={t('modals.entry.randomize_codename')}
                    data-help-key="entry_randomize_btn"
                >
                    <RefreshCw aria-hidden="true" size={18} />
                </button>
            </div>
        </div>
        <p className="text-xs text-slate-600 font-bold flex items-center justify-center gap-1 mb-6">
            <ShieldCheck aria-hidden="true" size={12} className="text-green-500"/> {t('entry.warning')}
        </p>
        <div className="flex flex-col gap-3">
            <button
                onClick={() => handleConfirm('new')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-help-key="entry_start_new"
            >
                <Sparkles size={18} className="text-yellow-400 fill-current" /> {t('entry.start')}
            </button>
            <button
                onClick={() => handleConfirm('load')}
                disabled={!selectedAdj || !selectedAnimal}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                data-help-key="entry_load_exist"
            >
                <Upload size={16} /> {t('entry.load')}
            </button>
        </div>
        <button type="button" onClick={onClose} className="mt-4 min-h-6 inline-flex items-center text-sm text-slate-600 hover:text-slate-900 underline rounded">{t('common.cancel')}</button>
      </div>
    </div>
  );
});

const StudentWelcomeModal = React.memo(({ isOpen, onClose, onUpload }) => {
  const { t } = useContext(LanguageContext);
  const welcomeRef = useRef(null);
  useFocusTrap(welcomeRef, isOpen, onClose);
  if (!isOpen) return null;
  return (
    <div
        ref={welcomeRef}
        className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-300 motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-welcome-title"
        aria-describedby="student-welcome-description"
        data-allo-ui-modal="student-welcome"
    >
      <style>{UI_MODAL_A11Y_STYLES}</style>
      <div className="my-auto max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border-4 border-teal-100 transform transition-all animate-in zoom-in-95 duration-300 motion-reduce:animate-none motion-reduce:transition-none relative">
        <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 min-h-6 min-w-6 p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={t('welcome.close_aria')}
            data-alloflow-close-on-escape="true"
        >
            <X aria-hidden="true" size={20} />
        </button>
        <div className="flex justify-center mb-6">
          <div className="bg-teal-100 p-4 rounded-full shadow-inner">
             <FolderOpen aria-hidden="true" size={48} className="text-teal-600" />
          </div>
        </div>
        <h2 id="student-welcome-title" className="text-2xl font-black text-slate-800 mb-2">{t('modals.student_welcome')}</h2>
        <p id="student-welcome-description" className="text-slate-600 mb-8 font-medium">{t('welcome.prompt')}</p>
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => {
                    onUpload();
                    onClose();
                }}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-teal-700 text-white font-bold hover:bg-teal-800 transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95"
                data-help-key="welcome_load_btn"
            >
                <Upload size={20} /> {t('welcome.load')}
            </button>
            <button
                type="button"
                onClick={onClose}
                className="w-full p-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors active:scale-95"
                data-help-key="welcome_skip_btn"
            >
                {t('welcome.skip')}
            </button>
        </div>
      </div>
    </div>
  );
});

window.AlloModules = window.AlloModules || {};
window.AlloModules.StudentQuizOverlay = StudentQuizOverlay;
window.AlloModules.TeacherGate = TeacherGate;
window.AlloModules.RoleSelectionModal = RoleSelectionModal;
window.AlloModules.StudentEntryModal = StudentEntryModal;
window.AlloModules.StudentWelcomeModal = StudentWelcomeModal;
window.AlloModules.UIModalsModule = true;
console.log('[UIModalsModule] 5 components registered');

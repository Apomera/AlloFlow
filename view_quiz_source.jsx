// Companion language belongs to the saved artifact, independent of current app settings.
function _quizTranslationAttributes(artifact) {
  const api = window.AlloModules?.TextPipelineHelpers;
  if (typeof api?.getArtifactTranslationTextAttributes === 'function') return api.getArtifactTranslationTextAttributes(artifact);
  const target = [artifact?.config?.translationPolicy?.target, artifact?.translationPolicy?.target, artifact?.translationTarget, artifact?.config?.translationTarget, artifact?.config?.attachedTranslationTarget].find(value => typeof value === 'string' && value.trim()) || 'English';
  const helpers = window.AlloModules?.ModuleScopeExtras;
  const lang = helpers?.getSpeechLangCode?.(target) || window.AlloFlowLang?.bcp47Full?.(target) || (/^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(target) ? target : target === 'English' ? 'en' : 'und');
  return { lang, dir: helpers?.getContentDirection?.(target) || 'auto', style: { textAlign: 'start' } };
}

var QuizTranslationContext = React.createContext(null);
function QuizTranslationText(props) {
  const saved = React.useContext(QuizTranslationContext);
  const { as = 'span', artifact, ...textProps } = props;
  return React.createElement(as, { ...textProps, ...(saved || _quizTranslationAttributes(artifact)) });
}

// Light markdown for AI-written assessment text: **bold**, __bold__, *italic*, _italic_, `code`,
// line breaks, and (blocks) lists. No math, links, or HTML, so "$5 and $2", "2 * 3" and "___" stay as written.
var _QUIZ_MD_RULES = [
  { re: /\*\*(?=[^\s*])([^\n]*?[^\s*])\*\*/, tag: 'strong', nest: true },
  { re: /(?<![\w_])__(?=[^\s_])([^\n]*?[^\s_])__(?![\w_])/, tag: 'strong', nest: true },
  { re: /`([^`\n]+)`/, tag: 'code' },
  { re: /(?<![\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])/, tag: 'em', nest: true },
  { re: /(?<![\w_])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\w_])/, tag: 'em', nest: true }
];
function _quizInlineNodes(text, keyBase) {
  var out = [], rest = String(text == null ? '' : text), k = 0;
  function pushText(s) { s.split('\n').forEach(function (line, i) { if (i) out.push(React.createElement('br', { key: keyBase + 'b' + k++ })); if (line) out.push(line); }); }
  while (rest) {
    var best = null;
    _QUIZ_MD_RULES.forEach(function (rule) { var m = rule.re.exec(rest); if (m && (!best || m.index < best.m.index)) best = { m: m, rule: rule }; });
    if (!best) { pushText(rest); break; }
    pushText(rest.slice(0, best.m.index));
    var key = keyBase + 'm' + k++;
    out.push(React.createElement(best.rule.tag, { key: key, className: best.rule.tag === 'code' ? 'font-mono' : undefined }, best.rule.nest ? _quizInlineNodes(best.m[1], key + '-') : best.m[1]));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}
// Inline text: unchanged string when there is nothing to format.
function _quizRich(text) {
  if (text == null) return '';
  var value = String(text);
  if (!/[*_`\n]/.test(value)) return value;
  var nodes = _quizInlineNodes(value, 'md');
  return nodes.length === 1 && typeof nodes[0] === 'string' ? nodes[0] : React.createElement(React.Fragment, null, nodes);
}
// Block text (explanations, feedback): paragraphs, "#" headings as bold lines, real bullet and numbered lists.
function _quizRichBlock(text) {
  var value = String(text == null ? '' : text).replace(/\r\n?/g, '\n').trim();
  if (!value) return null;
  var blocks = [], para = [], list = null;
  function flushPara() { if (para.length) { blocks.push(React.createElement('p', { key: 'p' + blocks.length, className: 'm-0' }, _quizInlineNodes(para.join('\n'), 'p' + blocks.length))); para = []; } }
  function flushList() {
    if (!list) return;
    var ordered = list.ordered, n = blocks.length;
    blocks.push(React.createElement(ordered ? 'ol' : 'ul', { key: 'l' + n, start: ordered && list.start !== 1 ? list.start : undefined, className: (ordered ? 'list-decimal' : 'list-disc') + ' ps-5 m-0 space-y-0.5' },
      list.items.map(function (item, i) { return React.createElement('li', { key: i }, _quizInlineNodes(item, 'l' + n + '-' + i)); })));
    list = null;
  }
  value.split('\n').forEach(function (line) {
    var bullet = /^\s*[-*•]\s+(.+)$/.exec(line), numbered = /^\s*(\d{1,3})[.)]\s+(.+)$/.exec(line), heading = /^\s*#{1,6}\s+(.+)$/.exec(line);
    if (!line.trim()) { flushPara(); flushList(); return; }
    if (bullet || numbered) {
      flushPara();
      if (!list || list.ordered !== !!numbered) { flushList(); list = { ordered: !!numbered, start: numbered ? Number(numbered[1]) : 1, items: [] }; }
      list.items.push(bullet ? bullet[1] : numbered[2]);
      return;
    }
    flushList();
    if (heading) { flushPara(); blocks.push(React.createElement('p', { key: 'h' + blocks.length, className: 'm-0 font-bold' }, _quizInlineNodes(heading[1], 'h' + blocks.length))); return; }
    para.push(line);
  });
  flushPara(); flushList();
  return React.createElement('div', { className: 'space-y-1.5' }, blocks);
}
// Plain text for aria-labels, speech, and <option> elements: the markers go, the words stay.
function _quizPlain(text) {
  var value = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n').map(function (line) {
    return line.replace(/^\s*#{1,6}\s+/, '').replace(/^(\s*)[-*•]\s+/, '$1• ');
  }).join('\n');
  _QUIZ_MD_RULES.forEach(function (rule) {
    var global = new RegExp(rule.re.source, 'g');
    for (var i = 0; i < 3 && global.test(value); i++) { global.lastIndex = 0; value = value.replace(global, '$1'); }
  });
  return value;
}
// Flat styled runs for exporters (PowerPoint text runs): [{ text, bold, italic, code }]; newlines stay in text.
function _quizSegments(text, style, out) {
  out = out || []; style = style || {};
  var rest = String(text == null ? '' : text);
  while (rest) {
    var best = null;
    _QUIZ_MD_RULES.forEach(function (rule) { var m = rule.re.exec(rest); if (m && (!best || m.index < best.m.index)) best = { m: m, rule: rule }; });
    if (!best) { out.push(Object.assign({ text: rest }, style)); break; }
    if (best.m.index) out.push(Object.assign({ text: rest.slice(0, best.m.index) }, style));
    var next = Object.assign({}, style);
    next[best.rule.tag === 'strong' ? 'bold' : best.rule.tag === 'em' ? 'italic' : 'code'] = true;
    if (best.rule.nest) _quizSegments(best.m[1], next, out); else out.push(Object.assign({ text: best.m[1] }, next));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

// i18n accessor for module-level code (2026-06-11): components/handlers below call t('key')
// without binding it (only some do `var t = props.t`), so a free t() throws ReferenceError
// when they run — latent crashes the SSR golden tests never fire. Bind once at module scope
// to the app global i18n (window.__alloT); components that DO `var t = props.t` shadow this.
var t = function () {
  if (typeof window !== 'undefined' && typeof window.__alloT === 'function') {
    try { return window.__alloT.apply(null, arguments); } catch (e) {}
  }
  // A second argument is a fallback string or a params object; never return the object.
  return typeof arguments[1] === 'string' ? arguments[1] : arguments[0];
};
// Single source of truth for "did the student pick the right option?", owned by
// the host (AlloFlowANTI.txt, next to fisherYatesShuffle) and reached the same
// way as window.__alloT above, because these call sites span module scope and
// several components. The host normalizes case and whitespace; the click grader
// already did, but every reveal and the voice check compared exactly, so a key
// differing from its option only by case scored the student correct while no
// option was shown as correct. Falls back to strict equality, the old behaviour,
// rather than carrying a second copy of the normalizer.
// NOTE: the authoring validators below deliberately keep using exact indexOf.
// They exist to warn an author about the very drift this tolerates at runtime.
var _quizAnswerMatches = function (option, key) {
  if (typeof window !== 'undefined' && typeof window.quizAnswerMatches === 'function') {
    try { return window.quizAnswerMatches(option, key); } catch (e) {}
  }
  return option != null && key != null && option === key;
};
var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? <I {...props} /> : null;
    };
  };
  var Wifi = _lazyIcon('Wifi');
  var Users = _lazyIcon('Users');
  var Lock = _lazyIcon('Lock');
  var Unlock = _lazyIcon('Unlock');
  var CheckCircle = _lazyIcon('CheckCircle');
  var MonitorPlay = _lazyIcon('MonitorPlay');
  var XCircle = _lazyIcon('XCircle');
  var Gamepad2 = _lazyIcon('Gamepad2');
  var DoorOpen = _lazyIcon('DoorOpen');
  var FolderDown = _lazyIcon('FolderDown');
  var Pencil = _lazyIcon('Pencil');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var CheckSquare = _lazyIcon('CheckSquare');
  var Volume2 = _lazyIcon('Volume2');
  var MicOff = _lazyIcon('MicOff');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Plus = _lazyIcon('Plus');
  var Brain = _lazyIcon('Brain');
  var Languages = _lazyIcon('Languages');
  var Search = _lazyIcon('Search');
  var X = _lazyIcon('X');
  var Sparkles = _lazyIcon('Sparkles');
  var ChevronUp = _lazyIcon('ChevronUp');
  var Info = _lazyIcon('Info');
  var Eye = _lazyIcon('Eye');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var MessageSquare = _lazyIcon('MessageSquare');
  var PenTool = _lazyIcon('PenTool');
  var ShieldCheck = _lazyIcon('ShieldCheck');
  var quizreducedMotionClass = 'motion-reduce:animate-none';
  var QUIZ_VOICE_CONTROL_EVENT = 'alloflow:quiz-voice-control';
  var QUIZ_VOICE_STATUS_EVENT = 'alloflow:quiz-voice-status';

  // Semantic voice helpers deliberately operate on quiz state, never DOM controls.
  function _quizVoiceNormalizeAction(value) {
    return String(value || 'status').trim().toLowerCase().replace(/[_\s]+/g, '-');
  }
  function _quizAuthoredImageAlt(value) {
    var description = String(value == null ? '' : value).trim();
    return description || 'No visual description provided.';
  }
  function AssessmentQuestionSupport(p) {
    var q = p.q || {};
    var criteria = Array.isArray(q.studentCriteria) ? q.studentCriteria.filter(value => typeof value === 'string' && value.trim()) : [];
    return <>{p.translation !== false && q.question_en && <QuizTranslationText as="p" data-assessment-question-translation className="mt-2 text-sm font-normal italic text-slate-600">{_quizRich(q.question_en)}</QuizTranslationText>}{q.imageUrl && <img data-assessment-question-image src={q.imageUrl} alt={_quizAuthoredImageAlt(q.imageAltText)} loading="lazy" className="my-3 max-h-80 w-full rounded-lg bg-white object-contain" />}{criteria.length > 0 && <div id={p.criteriaId} data-assessment-student-criteria className="my-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950"><strong>What to show in your response</strong><ul className="mt-1 list-disc ps-5">{criteria.map((value, index) => <li key={index}>{value}</li>)}</ul></div>}</>;
  }
  function _quizFillBlankPolicy(q) {
    return q && (q.fillBlankPolicy || (q.spellingPolicy === 'exact' ? 'exact' : 'normalized')) || 'normalized';
  }
  function _quizFillBlankInstruction(q) {
    var policy = _quizFillBlankPolicy(q);
    if (policy === 'exact') return 'Use exact spelling and capitalization.';
    var normal = 'Capitalization, extra spacing, and punctuation around the answer are ignored.';
    return policy === 'review-variants' ? normal + ' Other answers are saved for teacher review.' : normal;
  }
  function _quizResponseLabel(p, label) {
    var q = p.q || {};
    var number = p.itemNumber != null ? p.itemNumber : Number.isInteger(p.questionIdx) ? p.questionIdx + 1 : null;
    var context = number != null ? _quizGradedCopy('quiz.review.question_number', 'Question {number}').replace('{number}', String(number)) : '';
    return _quizPlain([label, [context, q.question || ''].filter(Boolean).join(': ')].filter(Boolean).join(' — '));
  }
  function AssessmentReasoningInput(p) {
    var q = p.q || {};
    var reasoningHelpId = React.useId();
    if (!q.requireReasoning && !q.explanationPrompt) return null;
    return <label className="my-3 block text-sm font-semibold text-slate-800">{q.explanationPrompt || 'Explain why your answer fits.'}<span id={reasoningHelpId} className="block text-xs font-normal text-slate-600">{q.requireReasoning ? 'Required explanation; reviewed separately from the choice score.' : 'Optional explanation; reviewed separately from the choice score.'}</span><textarea ref={p.inputRef} aria-label={_quizResponseLabel(p, q.explanationPrompt || 'Explain why your answer fits.')} required={!!q.requireReasoning} aria-describedby={reasoningHelpId} value={p.value || ''} onChange={event => p.onChange(event.target.value)} disabled={p.disabled} rows={3} maxLength={4000} className="mt-2 block w-full rounded-lg border border-slate-400 bg-white p-3 font-normal text-slate-800 disabled:bg-slate-50" /></label>;
  }
  function AssessmentLearningOptions(p) {
    var q = p.q || {}, patch = p.patch, type = q.type || 'mcq';
    var numeric = Object.assign({ allowEquivalentUnits: false, valueWeight: 0.5 }, q.numericSettings || {});
    return <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
      {['mcq', 'multi-select'].includes(type) && <fieldset className="space-y-2"><legend className="text-xs font-bold text-slate-800">Feedback after checking each choice</legend>{(q.options || []).map((option, index) => <label key={index} className="block text-xs font-semibold text-slate-800">{option}<textarea rows={2} value={q.optionFeedback?.[index] || ''} onChange={event => { var feedback = (q.options || []).map((_, i) => q.optionFeedback?.[i] || ''); feedback[index] = event.target.value; patch({ optionFeedback: feedback }); }} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 font-normal" /></label>)}</fieldset>}
      {type === 'fill-blank' && <label className="block text-xs font-bold text-slate-800">Answer matching<select value={q.fillBlankPolicy || 'normalized'} onChange={e => patch({ fillBlankPolicy: e.target.value })} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2"><option value="normalized">Ignore capitalization, spacing and punctuation</option><option value="exact">Exact spelling and capitalization</option><option value="review-variants">Send other wording for teacher review</option></select></label>}
      {['short-answer', 'self-explanation'].includes(type) && <label className="block text-xs font-bold text-slate-800">Student-visible success criteria (one per line)<textarea value={(q.studentCriteria || []).join('\n')} onChange={e => patch({ studentCriteria: e.target.value.split('\n') })} rows={3} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2" /><span className="font-normal">Describe the evidence to show without including the answer.</span></label>}
      {type === 'sequence-sense' && <label className="block text-xs font-bold text-slate-800">Sequence activity<select value={q.sequenceMode || 'diagnostic'} onChange={e => patch({ sequenceMode: e.target.value })} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2"><option value="diagnostic">Diagnose, repair and identify the principle</option><option value="arrange-explain">Arrange and identify the principle</option></select></label>}
      {['relation-mismatch', 'answer-evidence'].includes(type) && <><label className="flex gap-2 text-xs font-bold text-slate-800"><input type="checkbox" checked={!!q.requireReasoning} onChange={e => patch({ requireReasoning: e.target.checked })} />Require a brief explanation</label><label className="block text-xs font-bold text-slate-800">Explanation prompt<input value={q.explanationPrompt || ''} onChange={e => patch({ explanationPrompt: e.target.value })} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2" /></label><p className="text-xs text-slate-700">The explanation is saved for review and does not change the automatic choice score.</p></>}
      {type === 'numeric-response' && <><label className="flex gap-2 text-xs font-bold text-slate-800"><input type="checkbox" checked={numeric.allowEquivalentUnits} onChange={e => patch({ numericSettings: { ...numeric, allowEquivalentUnits: e.target.checked } })} />Accept equivalent units with conversion</label><label className="block text-xs font-bold text-slate-800">Value share of partial credit<select value={numeric.valueWeight} onChange={e => patch({ numericSettings: { ...numeric, valueWeight: Number(e.target.value) } })} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2"><option value={0.5}>50% value / 50% unit</option><option value={0.75}>75% value / 25% unit</option><option value={0.9}>90% value / 10% unit</option><option value={1}>100% value</option></select></label></>}
    </div>;
  }
  function AssessmentTransferPractice(p) {
    var q = p.q || {}, key = 'q-' + p.questionIdx;
    var [response, setResponse] = _quizUseDraftField(p.draftNamespace, key, 'transferResponse', '');
    return <details className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950"><summary className="cursor-pointer font-bold">Apply this idea to a new example (unscored)</summary><p className="mt-2">{q.transferPrompt || 'Describe a different example of ' + (q.conceptLabel || 'this idea') + ' and explain how the idea applies. Use the lesson to check your reasoning.'}</p>{Array.isArray(q.transferCriteria) && <ul className="my-2 list-disc ps-5">{q.transferCriteria.map((text, i) => <li key={i}>{text}</li>)}</ul>}<label className="mt-2 block font-semibold">Your new example<textarea value={response} onChange={e => setResponse(e.target.value)} rows={3} className="mt-1 block w-full rounded border border-slate-400 bg-white p-2 font-normal text-slate-800" /></label><p className="mt-2 text-xs">Practice is separate from your assessment score. Compare your example with the lesson, or ask your teacher for feedback.</p></details>;
  }
  function _quizRecordPracticeAttempt(p, answer, confidence) {
    if (!p.draftNamespace || p.draftNamespace.startsWith('assess-preview:')) return;
    var q = p.q || {}, summary = '';
    if (answer.idk) summary = 'I do not know yet';
    else if (Array.isArray(answer.selectedIndices)) summary = answer.selectedIndices.map(i => (q.options || [])[i]).join('; ');
    else if (answer.optionIdx != null) summary = (q.options || [])[answer.optionIdx] || answer.optionText || '';
    else if (answer.answerIdx != null) summary = ((q.answerOptions || [])[answer.answerIdx] || '') + ' — ' + ((q.evidenceOptions || [])[answer.evidenceIdx] || '');
    else if (answer.partnerAnswer) summary = 'Pair ' + (Number(answer.clickedPairIdx) + 1) + ': ' + answer.partnerAnswer;
    else if (Array.isArray(answer.orderAnswer)) summary = answer.orderAnswer.map(i => (q.items || [])[i]).join(' → ') + '; ' + (answer.principleAnswer || '');
    else summary = String(answer.text || '');
    if (answer.explanation) summary += '. ' + answer.explanation;
    var key = 'q-' + p.questionIdx, prior = _quizReadDraftField(p.draftNamespace, key, 'practiceAttempts').value;
    var attempts = Array.isArray(prior) ? prior : [];
    if (attempts.length && attempts[attempts.length - 1].response === summary) return;
    var entry = { response: summary, confidence: confidence || null, timestamp: Date.now() };
    _quizWriteDraftField(p.draftNamespace, key, 'practiceAttempts', attempts.length >= 10 ? [attempts[0]].concat(attempts.slice(-8), entry) : attempts.concat(entry));
  }
  function AssessmentPracticeHistory(p) {
    function readAttempts() { return _quizReadWorkingDraft(p.draftNamespace)?.items?.['q-' + p.questionIdx]?.practiceAttempts || []; }
    var [attempts, setAttempts] = React.useState(readAttempts);
    React.useEffect(function () {
      function sync(event) {
        if (event && (event.type === 'storage' ? event.key !== p.draftNamespace : event.detail?.namespace !== p.draftNamespace)) return;
        setAttempts(readAttempts());
      }
      sync();
      // History is read-only. Observe local staged writes without changing draft-save timers.
      window.addEventListener('alloflow:assessment-draft-changed', sync);
      window.addEventListener('alloflow:assessment-draft-synced', sync);
      window.addEventListener('storage', sync);
      return function () {
        window.removeEventListener('alloflow:assessment-draft-changed', sync);
        window.removeEventListener('alloflow:assessment-draft-synced', sync);
        window.removeEventListener('storage', sync);
      };
    }, [p.draftNamespace, p.questionIdx]);
    if (!Array.isArray(attempts) || attempts.length < 2) return null;
    return <details className="my-3 rounded border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800"><summary className="cursor-pointer font-semibold">First response and revisions</summary><ol className="mt-2 list-decimal ps-5">{attempts.map((attempt, i) => <li key={i}><strong>{i === 0 ? 'First response: ' : 'Revision: '}</strong>{attempt.response}</li>)}</ol><p className="mt-2 text-xs">Your first response is preserved separately from practice after feedback.</p></details>;
  }
  function AssessmentLearningContext(p) {
    var data = p.data || {}, coverage = data.criteriaCoverage, review = data.reviewContext, content = data.contentReview;
    if (!coverage && !review && !content) return null;
    var strategies = window.AlloModules && window.AlloModules.QuizModeStrategies;
    if (coverage && strategies && typeof strategies.resolveCriteriaCoverage === 'function') coverage = strategies.resolveCriteriaCoverage(coverage.available || [], coverage.selectedIds || [], (data.questions || []).length, data.questions || []);
    return <details data-assessment-learning-context className="mb-4 rounded-xl border border-indigo-200 bg-white p-4 text-sm text-slate-800"><summary className="cursor-pointer font-bold">Learning targets and source review</summary>
      {coverage && <div className="mt-3"><strong>Criteria sampled by this check</strong><ul className="list-disc ps-5">{(coverage.available || []).map((criterion, i) => <li key={criterion.id || i}>{criterion.statement || criterion.text || criterion.id}{(coverage.coveredIds || []).includes(criterion.id) ? ' — included' : ' — not sampled'}</li>)}</ul><p className="mt-1 text-xs">A short check samples the selected criteria. Uncovered criteria need a separate check.</p></div>}
      {review && <div className="mt-3"><strong>Review sources</strong>{review.fallback ? <p>No earlier lesson was selected. This review uses the current source; it does not establish retention over time.</p> : <ul className="list-disc ps-5">{(review.sources || []).map((source, i) => <li key={source.id || i}>{source.title || 'Earlier lesson'}{source.date ? ' · ' + source.date : ''}</li>)}</ul>}{Array.isArray(review.concepts) && <p>{review.concepts.join(', ')}</p>}</div>}
      {content && <div className="mt-3"><strong>Teacher content review</strong><p className="my-2">Local checks can locate source quotations. Review accuracy, ambiguity and scoring yourself before sharing.</p>{(content.items || []).map((item, index) => { var q = (data.questions || [])[item.questionIdx]; var stale = !q || !strategies || typeof strategies.contentReviewSignature !== 'function' || typeof strategies.contentReviewSignature === 'function' && item.itemSignature !== strategies.contentReviewSignature(q); return <details key={index} className="my-2 rounded border border-slate-300 p-3"><summary className="cursor-pointer font-semibold">{'Question ' + (item.questionIdx + 1) + (stale ? ' — changed since this review' : ' — needs teacher review')}</summary>{!stale && <>{item.reason && <p className="mt-2">{item.reason}</p>}{item.evidenceQuote && <blockquote className="my-2 border-s-4 border-indigo-300 ps-3">{item.evidenceQuote}</blockquote>}<ul className="list-disc ps-5">{(item.checklist || []).map((text, i) => <li key={i}>{text}</li>)}</ul></>}{stale && <p>Review the current item and its answer guide against the source.</p>}</details>; })}</div>}
    </details>;
  }
  function AssessmentChoiceContent(p) {
    var q = p.q || {}, field = p.field || 'options', index = p.index;
    var stems = { options: 'option', answerOptions: 'answerOption', evidenceOptions: 'evidenceOption', items: 'item', candidatePartners: 'candidatePartner' };
    var stem = stems[field] || field;
    var images = q[stem + 'ImageUrls'] || (field === 'answerOptions' ? q.answerImageUrls || q.optionImageUrls : field === 'evidenceOptions' ? q.evidenceImageUrls : null) || [];
    var descriptions = q[stem + 'ImageAltTexts'] || (field === 'answerOptions' ? q.answerImageAltTexts || q.optionImageAltTexts : field === 'evidenceOptions' ? q.evidenceImageAltTexts : null) || [];
    var translations = q[field + '_en'] || [];
    var value = p.text == null ? (q[field] || [])[index] : p.text;
    var renderText = typeof p.renderText === 'function' ? p.renderText : _quizRich;
    return <span data-assessment-choice-field={field} data-assessment-choice-index={index} className="min-w-0 flex-1 break-words"><span>{p.prefix || ''}{renderText(value)}</span>{translations[index] && <QuizTranslationText as="span" className="mt-1 block text-sm font-normal italic opacity-80">{renderText(translations[index])}</QuizTranslationText>}{images[index] && <img src={images[index]} alt={_quizAuthoredImageAlt(descriptions[index])} loading="lazy" className="my-2 max-h-48 w-full rounded bg-white object-contain" />}</span>;
  }
  function AssessmentPairSide(p) {
    var q = p.q || {}, pair = (q.pairs || [])[p.index] || {}, translated = (q.pairs_en || [])[p.index] || {};
    var side = p.side, translation = pair[side + '_en'] || translated[side];
    var renderText = typeof p.renderText === 'function' ? p.renderText : _quizRich;
    return <span className="min-w-0 flex-1 break-words"><span>{renderText(pair[side])}</span>{translation && <QuizTranslationText as="span" className="mt-1 block text-sm font-normal italic opacity-80">{renderText(translation)}</QuizTranslationText>}{pair[side + 'ImageUrl'] && <img src={pair[side + 'ImageUrl']} alt={_quizAuthoredImageAlt(pair[side + 'ImageAltText'])} loading="lazy" className="my-2 max-h-48 w-full rounded bg-white object-contain" />}</span>;
  }
  function AssessmentPairContent(p) {
    return <span data-assessment-choice-field="pairs" data-assessment-choice-index={p.index} className="flex min-w-0 flex-1 items-start gap-2"><AssessmentPairSide q={p.q} index={p.index} side="left" renderText={p.renderText} /><span aria-hidden="true">↔</span><AssessmentPairSide q={p.q} index={p.index} side="right" renderText={p.renderText} /></span>;
  }
  function _quizVoiceChoiceIndex(value, optionCount) {
    var count = Math.max(0, Math.min(8, Number(optionCount) || 0));
    var index = -1;
    if (typeof value === 'number' && isFinite(value)) {
      index = Math.floor(value) - 1;
    } else {
      var normalized = String(value == null ? '' : value).trim().toLowerCase()
        .replace(/^(?:choose|select|answer)\s+/, '')
        .replace(/^(?:option|choice|answer)\s+/, '')
        .replace(/[.]/g, '');
      var ordinalMap = {
        first: 0, one: 0, '1st': 0,
        second: 1, two: 1, '2nd': 1,
        third: 2, three: 2, '3rd': 2,
        fourth: 3, four: 3, '4th': 3,
        fifth: 4, five: 4, '5th': 4,
        sixth: 5, six: 5, '6th': 5,
        seventh: 6, seven: 6, '7th': 6,
        eighth: 7, eight: 7, '8th': 7
      };
      if (/^[a-h]$/.test(normalized)) index = normalized.charCodeAt(0) - 97;
      else if (/^[1-8]$/.test(normalized)) index = Number(normalized) - 1;
      else if (Object.prototype.hasOwnProperty.call(ordinalMap, normalized)) index = ordinalMap[normalized];
    }
    return index >= 0 && index < count ? index : -1;
  }
  function _quizVoiceParseScopedUtterance(rawText) {
    var raw = String(rawText || '').trim();
    var text = raw.toLowerCase().replace(/[?!.,]+$/g, '');
    if (!text) return null;
    var direct = {
      'describe quiz': 'quiz_describe',
      'describe this quiz': 'quiz_describe',
      'where am i': 'quiz_describe',
      'quiz status': 'quiz_describe',
      'list actions': 'quiz_list_actions',
      'what can i do': 'quiz_list_actions',
      'help': 'quiz_list_actions',
      'read question': 'quiz_read_question',
      'read the question': 'quiz_read_question',
      'read current question': 'quiz_read_question',
      'repeat question': 'quiz_read_question',
      'read response': 'quiz_read_question',
      'read my response': 'quiz_read_question',
      'check answer': 'quiz_check',
      'check my answer': 'quiz_check',
      'check response': 'quiz_check',
      'check my response': 'quiz_check',
      'check selections': 'quiz_check',
      'check value': 'quiz_check',
      'check both parts': 'quiz_check',
      'check answer and evidence': 'quiz_check',
      'list reflections': 'quiz_list_reflections',
      'read reflections': 'quiz_list_reflections',
      'open reflections': 'quiz_open_reflections',
      'go to reflections': 'quiz_open_reflections',
      'read reflection': 'quiz_read_reflection',
      'read the reflection': 'quiz_read_reflection',
      'read my reflection': 'quiz_read_reflection_response',
      'read reflection response': 'quiz_read_reflection_response',
      'clear reflection': 'quiz_clear_reflection',
      'clear my reflection': 'quiz_clear_reflection',
      'submit reflection': 'quiz_submit_reflection',
      'submit my reflection': 'quiz_submit_reflection',
      'edit reflection': 'quiz_edit_reflection',
      'edit my reflection': 'quiz_edit_reflection',
      'next reflection': 'quiz_next_reflection',
      'previous reflection': 'quiz_previous_reflection',
      'return to question': 'quiz_return_to_question',
      'back to question': 'quiz_return_to_question',
      'submit assessment': 'quiz_submit',
      'submit quiz': 'quiz_submit',
      'finish assessment': 'quiz_submit',
      'cancel review': 'quiz_review_cancel',
      'close review': 'quiz_review_cancel',
      'return to assessment': 'quiz_review_cancel',
      'next': 'quiz_next',
      'next question': 'quiz_next',
      'previous': 'quiz_previous',
      'previous question': 'quiz_previous',
      'go back a question': 'quiz_previous',
      'repeat feedback': 'quiz_repeat_feedback',
      'repeat response': 'quiz_repeat_feedback',
      'revise these choices': 'quiz_revise_choices',
      'revise choices': 'quiz_revise_choices',
      'try again': 'quiz_try_again',
      'reset answer': 'quiz_try_again',
      'clear answer': 'quiz_try_again',
      'close quiz': 'quiz_close',
      'exit quiz': 'quiz_close'
    };
    if (direct[text]) return { commandId: direct[text] };
    var reflectionSelection = text.match(/^(?:open|select|choose|go to)\s+reflection\s+(.+)$/);
    if (reflectionSelection) {
      return { commandId: 'quiz_select_reflection', params: { reflection: reflectionSelection[1] } };
    }
    var setReflection = raw.match(/^set\s+(?:my\s+)?reflection(?:\s+response)?\s+to\s+(.+)$/i);
    if (setReflection && String(setReflection[1] || '').trim()) {
      return { commandId: 'quiz_set_reflection', params: { response: String(setReflection[1]).trim() } };
    }
    var appendReflection = raw.match(/^(?:append|add)\s+(?:to\s+)?(?:my\s+)?reflection(?:\s+response)?\s+(.+)$/i);
    if (appendReflection && String(appendReflection[1] || '').trim()) {
      return { commandId: 'quiz_append_reflection', params: { response: String(appendReflection[1]).trim() } };
    }
    var evidenceSelection = text.match(/^(?:choose|select)\s+(answer|evidence)(?:\s+(?:option|choice))?\s+(.+)$/);
    if (evidenceSelection) {
      return {
        commandId: evidenceSelection[1] === 'evidence' ? 'quiz_choose_evidence' : 'quiz_choose_answer',
        params: { choice: evidenceSelection[2] }
      };
    }
    var responseMatch = raw.match(/^(?:response|write|dictate|enter\s+(?:a\s+)?response|set\s+(?:my\s+)?answer\s+to|my\s+answer\s+is|answer\s+with)\s+(.+)$/i);
    if (responseMatch && String(responseMatch[1] || '').trim()) {
      return { commandId: 'quiz_enter_response', params: { response: String(responseMatch[1]).trim() } };
    }
    var selectionMatch = text.match(/^(select|choose|toggle|deselect|unselect|remove)(?:\s+(?:option|choice|pair|item|step|principle))?\s+(.+)$/);
    if (selectionMatch) {
      var selectionMode = selectionMatch[1] === 'deselect' || selectionMatch[1] === 'unselect' || selectionMatch[1] === 'remove'
        ? 'deselect'
        : selectionMatch[1] === 'toggle' ? 'toggle' : 'select';
      return {
        commandId: 'quiz_choose',
        params: { choice: selectionMatch[2], mode: selectionMode }
      };
    }
    if (/^(?:the\s+)?order\s+is\s+(?:correct|right)$/.test(text)) {
      return { commandId: 'quiz_choose', params: { choice: 'yes' } };
    }
    if (/^(?:the\s+)?order\s+is\s+(?:wrong|incorrect|not correct)$/.test(text)) {
      return { commandId: 'quiz_choose', params: { choice: 'no' } };
    }
    var explicitChoice = text.match(/^(?:choose|select|answer)(?:\s+(?:option|choice|answer))?\s+(.+)$/);
    var choice = explicitChoice ? explicitChoice[1] : text;
    if (_quizVoiceChoiceIndex(choice, 8) >= 0) {
      return { commandId: 'quiz_choose', params: { choice: choice } };
    }
    return null;
  }
  function _quizVoiceRequestText(request) {
    var input = request && typeof request === 'object' ? request : {};
    var value = input.response != null ? input.response : (input.text != null ? input.text : input.value);
    return String(value == null ? '' : value).trim();
  }
  function _quizVoiceNamedChoiceIndex(value, options) {
    var list = Array.isArray(options) ? options : [];
    var positional = _quizVoiceChoiceIndex(value, list.length);
    if (positional >= 0) return positional;
    var normalized = String(value == null ? '' : value).trim().toLowerCase().replace(/[?!.,]+$/g, '').replace(/\s+/g, ' ');
    if (!normalized) return -1;
    for (var i = 0; i < list.length; i++) {
      var candidate = String(list[i] == null ? '' : list[i]).trim().toLowerCase().replace(/[?!.,]+$/g, '').replace(/\s+/g, ' ');
      if (candidate && candidate === normalized) return i;
    }
    return -1;
  }
  function _quizVoiceReflectionIndex(value, reflectionCount) {
    var count = Math.max(0, Math.min(20, Number(reflectionCount) || 0));
    var normalized = String(value == null ? '' : value).trim().toLowerCase()
      .replace(/^(?:reflection|prompt)\s+/, '')
      .replace(/[?!.,]+$/g, '');
    var positional = _quizVoiceChoiceIndex(normalized, Math.min(8, count));
    if (positional >= 0) return positional;
    if (/^(?:9|1[0-9]|20)$/.test(normalized)) {
      var index = Number(normalized) - 1;
      return index < count ? index : -1;
    }
    return -1;
  }
  function _quizVoiceReflectionPrompt(reflection) {
    if (typeof reflection === 'string') return reflection.trim();
    if (!reflection || typeof reflection !== 'object') return '';
    return String(reflection.text || reflection.prompt || reflection.question || '').trim();
  }
  var _quizVoiceItemControllers = {};
  function _quizVoiceControllerKey(namespace, questionIdx) {
    return String(namespace || 'local') + ':' + String(questionIdx);
  }
  function _quizGetVoiceItemController(namespace, questionIdx) {
    return _quizVoiceItemControllers[_quizVoiceControllerKey(namespace, questionIdx)] || null;
  }
  function _quizUseVoiceController(p, controller) {
    var currentRef = React.useRef(controller);
    currentRef.current = controller;
    React.useEffect(function () {
      if (!p || typeof p.questionIdx !== 'number') return undefined;
      var exposed = {
        getState: function () {
          var current = currentRef.current;
          return current && typeof current.getState === 'function' ? current.getState() : null;
        },
        execute: function (action, request) {
          var current = currentRef.current;
          return current && typeof current.execute === 'function'
            ? current.execute(action, request || {})
            : { ok: false, state: 'unavailable', message: 'This item is not ready for voice input.' };
        }
      };
      if (typeof p.registerVoiceController === 'function') return p.registerVoiceController(p.questionIdx, exposed);
      var key = _quizVoiceControllerKey(p.draftNamespace, p.questionIdx);
      _quizVoiceItemControllers[key] = exposed;
      return function () { if (_quizVoiceItemControllers[key] === exposed) delete _quizVoiceItemControllers[key]; };
    }, [p && p.registerVoiceController, p && p.draftNamespace, p && p.questionIdx]);
  }
  function _quizVoiceQuestionPayload(question, questionIdx, totalQuestions, selectedOptionIdx, itemState) {
    var q = question && typeof question === 'object' ? question : {};
    var type = q.type || 'mcq';
    var state = itemState && typeof itemState === 'object' ? itemState : {};
    var rawOptions = (type === 'mcq' || type === 'multi-select') && Array.isArray(q.options) ? q.options : [];
    var selectedIndices = type === 'multi-select' && Array.isArray(state.selectedIndices) ? state.selectedIndices : [];
    var options = rawOptions.map(function (option, optionIdx) {
      return {
        index: optionIdx,
        number: optionIdx + 1,
        label: String.fromCharCode(65 + optionIdx),
        text: String(option == null ? '' : option),
        selected: type === 'multi-select' ? selectedIndices.indexOf(optionIdx) >= 0 : selectedOptionIdx === optionIdx
      };
    });
    var questionText = String(q.question || q.contextSentence || q.prompt || '');
    var message = 'Question ' + (questionIdx + 1) + ' of ' + totalQuestions + '. ' + questionText;
    if (options.length > 0) {
      message += ' Options: ' + options.map(function (option) {
        return option.label + ', ' + option.text;
      }).join('. ') + '.';
    }
    if (typeof selectedOptionIdx === 'number' && options[selectedOptionIdx]) {
      message += ' Option ' + options[selectedOptionIdx].label + ' is selected.';
    }
    if (type === 'multi-select' && selectedIndices.length > 0) {
      message += ' Selected options: ' + selectedIndices.map(function (idx) {
        return options[idx] ? options[idx].label : '';
      }).filter(Boolean).join(', ') + '.';
    }
    if (type === 'numeric-response') {
      if (q.unit) message += ' Include units such as ' + q.unit + '.';
      if (state.response) message += ' Current response: ' + state.response + '.';
    } else if (type === 'fill-blank' || type === 'short-answer' || type === 'self-explanation') {
      if (state.response) message += ' Current response: ' + state.response + '.';
      else message += ' No written response has been entered.';
    } else if (type === 'sequence-sense') {
      var displayedItems = Array.isArray(state.displayedItems) ? state.displayedItems : [];
      if (displayedItems.length > 0) message += ' Displayed sequence: ' + displayedItems.map(function (item, idx) { return (idx + 1) + ', ' + item; }).join('. ') + '.';
      if (state.prompt) message += ' ' + state.prompt;
    } else if (type === 'relation-mismatch') {
      var pairs = Array.isArray(state.pairs) ? state.pairs : (Array.isArray(q.pairs) ? q.pairs : []);
      if (pairs.length > 0) message += ' Pairs: ' + pairs.map(function (pair, idx) {
        return (idx + 1) + ', ' + String(pair && pair.left || '') + ' with ' + String(pair && pair.right || '');
      }).join('. ') + '.';
      if (state.prompt) message += ' ' + state.prompt;
    } else if (type === 'answer-evidence') {
      var answerOptions = Array.isArray(state.answerOptions) ? state.answerOptions : [];
      var evidenceOptions = Array.isArray(state.evidenceOptions) ? state.evidenceOptions : [];
      message += ' This is an answer and evidence item. Part 1, choose the best answer.';
      if (answerOptions.length > 0) message += ' Answer options: ' + answerOptions.map(function (option, idx) {
        return String.fromCharCode(65 + idx) + ', ' + option;
      }).join('. ') + '.';
      if (typeof state.answerIndex === 'number' && answerOptions[state.answerIndex] != null) {
        message += ' Answer option ' + String.fromCharCode(65 + state.answerIndex) + ' is selected.';
        message += ' Part 2, ' + String(state.evidencePrompt || 'choose the supporting evidence') + '.';
        if (evidenceOptions.length > 0) message += ' Evidence options: ' + evidenceOptions.map(function (option, idx) {
          return String.fromCharCode(65 + idx) + ', ' + option;
        }).join('. ') + '.';
        if (typeof state.evidenceIndex === 'number' && evidenceOptions[state.evidenceIndex] != null) {
          message += ' Evidence option ' + String.fromCharCode(65 + state.evidenceIndex) + ' is selected.';
        }
      } else {
        message += ' Say choose answer followed by a letter, number, ordinal, or the exact answer text.';
      }
    }
    return {
      questionIndex: questionIdx,
      questionNumber: questionIdx + 1,
      totalQuestions: totalQuestions,
      type: type,
      question: questionText,
      options: options,
      selectedOptionIndex: typeof selectedOptionIdx === 'number' ? selectedOptionIdx : null,
      selectedOptionLabel: typeof selectedOptionIdx === 'number' && options[selectedOptionIdx] ? options[selectedOptionIdx].label : null,
      itemState: state,
      message: message
    };
  }
  function _quizVoiceIsSemanticFrontmost(ctx, status) {
    if (!status || !status.mounted || status.state === 'unsupported-mode') return false;
    var context = ctx && typeof ctx === 'object' ? ctx : null;
    if (!context) return true;
    if (context.quizVoiceFrontmost === false || context.testPrepHubOpen === true || context.contentIsQuiz === false) return false;
    var hasResolver = typeof context.getCurrentLearnerResource === 'function';
    var current = null;
    if (hasResolver) {
      try { current = context.getCurrentLearnerResource(); } catch (e) { return false; }
      if (!current || typeof current !== 'object') return false;
    } else if (context.currentLearnerResource && typeof context.currentLearnerResource === 'object') {
      current = context.currentLearnerResource;
    } else if (context.quizVoiceFrontmost === true || context.contentIsQuiz === true) {
      return true;
    } else {
      // Legacy embedded hosts do not yet publish semantic ownership. Preserve
      // their existing Quiz behavior; production hosts use the resolver above.
      return true;
    }
    return String(current.type || '').trim().toLowerCase() === 'quiz' && current.frontmost !== false;
  }
  function _quizVoicePublicState(status, frontmost) {
    var source = status && typeof status === 'object' ? status : {};
    var item = source.itemState && typeof source.itemState === 'object' ? source.itemState : {};
    var actions = Array.isArray(source.actions)
      ? source.actions.map(function (action) { return String(action || '').slice(0, 80); }).filter(Boolean)
      : [];
    var hasSelection = typeof source.selectedOptionIndex === 'number' ||
      (Array.isArray(item.selectedIndices) && item.selectedIndices.length > 0) ||
      typeof item.answerIndex === 'number' || typeof item.evidenceIndex === 'number' ||
      typeof item.selectedIndex === 'number';
    var hasWrittenResponse = typeof item.response === 'string' && item.response.trim().length > 0;
    var hasReflectionResponse = typeof source.reflectionResponse === 'string' && source.reflectionResponse.trim().length > 0;
    return {
      ready: source.ready === true,
      mounted: source.mounted === true,
      frontmost: frontmost !== false,
      state: String(source.state || 'unavailable').slice(0, 80),
      surface: 'quiz',
      surfaceMode: String(source.surfaceMode || (source.reviewOpen ? 'review' : 'question')).slice(0, 40),
      questionNumber: Number.isFinite(Number(source.questionNumber)) ? Number(source.questionNumber) : 0,
      totalQuestions: Number.isFinite(Number(source.totalQuestions)) ? Number(source.totalQuestions) : 0,
      itemType: String(source.type || '').slice(0, 80),
      optionCount: Array.isArray(source.options) ? source.options.length : 0,
      hasSelection: hasSelection,
      hasResponse: hasSelection || hasWrittenResponse,
      checked: source.checked === true,
      submitted: source.state === 'submitted',
      reviewOpen: source.reviewOpen === true,
      reflectionNumber: Number.isFinite(Number(source.reflectionNumber)) ? Number(source.reflectionNumber) : 0,
      reflectionTotal: Number.isFinite(Number(source.reflectionTotal)) ? Number(source.reflectionTotal) : 0,
      hasReflectionResponse: hasReflectionResponse,
      reflectionSubmitted: source.reflectionSubmitted === true,
      hasFeedback: actions.indexOf('repeat-feedback') >= 0,
      actions: actions
    };
  }
  function _quizFocusableElements(container) {
    if (!container || typeof container.querySelectorAll !== 'function') return [];
    var selector = 'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
    return Array.prototype.slice.call(container.querySelectorAll(selector)).filter(function (el) {
      if (!el || el.hidden || el.getAttribute('aria-hidden') === 'true' || el.closest && el.closest('[inert]')) return false;
      return el.offsetWidth > 0 || el.offsetHeight > 0 || typeof el.getClientRects !== 'function' || el.getClientRects().length > 0;
    });
  }
  function _quizHandleDialogKeyDown(event, dialogRef, closeDialog) {
    if (!event) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    var dialog = dialogRef && dialogRef.current;
    var focusable = _quizFocusableElements(dialog);
    if (!dialog || focusable.length === 0) {
      event.preventDefault();
      if (dialog && typeof dialog.focus === 'function') dialog.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = typeof document !== 'undefined' ? document.activeElement : null;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
  function _quizIsolateDialog(dialog) {
    var snapshots = [];
    if (!dialog || typeof document === 'undefined') return function () {};
    var current = dialog;
    while (current && current.parentElement) {
      var parent = current.parentElement;
      Array.prototype.forEach.call(parent.children, function (sibling) {
        if (sibling === current) return;
        snapshots.push({
          element: sibling,
          inert: sibling.inert === true,
          ariaHidden: sibling.getAttribute('aria-hidden')
        });
        sibling.inert = true;
        sibling.setAttribute('aria-hidden', 'true');
      });
      current = parent;
      if (current === document.body) break;
    }
    return function () {
      snapshots.forEach(function (snapshot) {
        snapshot.element.inert = snapshot.inert;
        if (snapshot.ariaHidden === null) snapshot.element.removeAttribute('aria-hidden');
        else snapshot.element.setAttribute('aria-hidden', snapshot.ariaHidden);
      });
    };
  }
  function _quizShuffleCopy(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }
  var _QUIZ_DRAFT_STORAGE_PREFIX = 'alloflow_assess_draft_v1:';
  var _QUIZ_ATTEMPT_STORAGE_PREFIX = 'alloflow_assess_attempt_v1:';
  var _QUIZ_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  var _quizDraftMemory = {};
  var _quizDraftFallback = {};
  var _quizDraftWriteState = {};
  var _quizClosedDrafts = {};
  var _quizDraftContexts = {};
  var _quizDraftPatches = {};
  var _quizDraftSeen = {};
  // Old content-only keys cannot be attributed to a particular assignment.
  // Retain access for explicit download, never silently adopt their answers.
  function _quizLegacyDraftNamespace(data, sessionCode) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var reflections = data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : [];
    var identity = JSON.stringify({ title: data && data.title || '', questions: questions.map(function (q) {
      return { type: q && q.type || 'mcq', question: q && q.question || '', options: q && (q.options || q.answerOptions || q.evidenceOptions || q.items || q.pairs) || [], key: q && (q.correctAnswer || q.correctAnswers || q.expectedFill || q.expectedAnswer || q.correctValue || q.correctPartnerForWrong || q.rubric) || '' };
    }), reflections: reflections });
    var hash = 2166136261;
    for (var i = 0; i < identity.length; i++) { hash ^= identity.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return _QUIZ_DRAFT_STORAGE_PREFIX + String(sessionCode || 'local') + ':' + (hash >>> 0).toString(36);
  }
  function _quizStableAssessmentData(data) {
    // Response identity follows authored stimuli and grading rules. Editorial
    // labels, explanations, translations, and check timestamps do not move an
    // answer to a different item; an actively disputed key still needs review.
    var fields = ['type', 'itemType', 'question', 'contextSentence', 'prompt', 'instructions', 'evidencePrompt', 'unit', 'imageUrl',
      'options', 'answerOptions', 'evidenceOptions', 'items', 'presentedOrder', 'pairs', 'candidatePartners', 'principleOptions',
      'optionImageUrls', 'answerOptionImageUrls', 'answerImageUrls', 'evidenceOptionImageUrls', 'evidenceImageUrls', 'itemImageUrls', 'candidatePartnerImageUrls', 'principleOptionImageUrls', 'principleOptionsImageUrls',
      'correctAnswer', 'correctAnswers', 'correctIndex', 'correctEvidence', 'expectedFill', 'acceptableAlternatives', 'expectedAnswer', 'exemplarAnswer', 'sampleAnswer', 'modelAnswer', 'referenceAnswer', 'rubric',
      'fillBlankPolicy', 'numericSettings', 'sequenceMode', 'requireReasoning', 'explanationPrompt', 'studentCriteria',
      'correctValue', 'tolerance', 'acceptableUnits', 'correctOrder', 'correctSequence', 'intentionallyWrongIndex', 'orderingPrinciple', 'wrongPairIndex', 'correctPartnerForWrong'];
    var choiceFields = ['options', 'answerOptions', 'evidenceOptions', 'items', 'pairs', 'candidatePartners', 'principleOptions'];
    function stableValue(value, choice) {
      if (Array.isArray(value)) return value.map(function (entry) { return stableValue(entry, choice); });
      if (value && typeof value === 'object') {
        var result = {}, keys = choice ? ['id', 'text', 'label', 'value', 'score', 'left', 'right', 'imageUrl', 'leftImageUrl', 'rightImageUrl'] : Object.keys(value).sort();
        keys.forEach(function (key) { if (value[key] !== undefined) result[key] = stableValue(value[key], choice); });
        return result;
      }
      return value;
    }
    function questionIdentity(question) {
      if (!question || typeof question !== 'object' || Array.isArray(question)) return question;
      var result = {};
      fields.forEach(function (field) { if (question[field] !== undefined) result[field] = stableValue(question[field], choiceFields.indexOf(field) >= 0); });
      if (_quizIsAnswerKeyDisputed(question)) result.answerKeyUnderReview = true;
      return result;
    }
    function reflectionIdentity(reflection) {
      if (!reflection || typeof reflection !== 'object' || Array.isArray(reflection)) return reflection;
      var result = {};
      ['text', 'question', 'prompt', 'instructions', 'imageUrl'].forEach(function (field) { if (reflection[field] !== undefined) result[field] = stableValue(reflection[field]); });
      return result;
    }
    return {
      questions: (data && Array.isArray(data.questions) ? data.questions : []).map(questionIdentity),
      reflections: (data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : []).map(reflectionIdentity)
    };
  }
  function _quizPreviousStableAssessmentData(data) {
    // Exact compatibility with the preceding fingerprint, before editorial
    // metadata was removed. Do not use it as the new response identity.
    return JSON.parse(JSON.stringify(data || {}, function (key, value) {
      return /(?:_en|AltText|AltTexts)$/.test(key) ? undefined : value;
    }));
  }
  // Fields a withheld copy never carries (mirrors withholdGradedQuizKeys in
  // live_aac and firestore_sync). The release payload sends the learner-safe rest.
  var _QUIZ_WITHHELD_KEY_FIELDS = ['correctAnswer', 'correctAnswers', 'correctEvidence', 'correctValue', 'tolerance', 'acceptableUnits',
    'expectedAnswer', 'expectedFill', 'acceptableAlternatives', 'rubric', 'sampleAnswer', 'exemplarAnswer', 'modelAnswer', 'answer', 'answerKey',
    'sourceEvidence', 'explanation', 'answerExplanation', 'rationale', 'feedback', 'optionFeedback', 'factCheck', 'keyCheck', 'distractorQuality',
    'intentionallyWrongIndex', 'orderingPrinciple', 'wrongPairIndex', 'correctPartnerForWrong', 'correctOrder', 'correctSequence'];
  var _QUIZ_RELEASE_KEY_FIELDS = _QUIZ_WITHHELD_KEY_FIELDS.filter(function (field) { return ['answerKey', 'factCheck', 'keyCheck', 'distractorQuality'].indexOf(field) < 0; });
  function _quizSequenceDisplayForm(q) {
    var canonical = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (canonical && typeof canonical.sequenceDisplayForm === 'function') return canonical.sequenceDisplayForm(q);
    // Offline copy of QuizLiveAggregators.sequenceDisplayForm.
    var items = q && (q.type || q.itemType) === 'sequence-sense' && Array.isArray(q.items) ? q.items : null, order = q && q.presentedOrder;
    if (!items || !Array.isArray(order) || order.length !== items.length || new Set(order).size !== items.length || !order.every(function (value) { return Number.isInteger(value) && value >= 0 && value < items.length; })) return q;
    var out = Object.assign({}, q);
    ['items', 'items_en', 'itemImageUrls', 'itemImageAltTexts', 'itemImagePrompts'].forEach(function (field) {
      if (Array.isArray(q[field]) && q[field].length === order.length) out[field] = order.map(function (index) { return q[field][index]; });
    });
    out.presentedOrder = order.map(function (_, index) { return index; });
    return out;
  }
  // Withheld timings identify work by what the learner can see, so the keyless
  // copy, the teacher copy, and a released copy share drafts and releases.
  function _quizIdentityData(data) {
    var timing = _quizNormalizeDeliverySettings(data && data.deliverySettings).feedbackTiming;
    if (!data || (timing !== 'teacher-release' && timing !== 'teacher-graded')) return data;
    return Object.assign({}, data, { questions: (Array.isArray(data.questions) ? data.questions : []).map(function (q) {
      if (!q || typeof q !== 'object' || Array.isArray(q)) return q;
      var out = Object.assign({}, _quizSequenceDisplayForm(q));
      _QUIZ_WITHHELD_KEY_FIELDS.forEach(function (field) { delete out[field]; });
      return out;
    }) });
  }
  function _quizDraftNamespace(data, sessionCode, resourceId) {
    return _quizPreviousDraftNamespace(_quizStableAssessmentData(_quizIdentityData(data)), sessionCode, resourceId);
  }
  function _quizPreviousDraftNamespace(data, sessionCode, resourceId) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var reflections = data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : [];
    var identity = JSON.stringify({
      resourceId: String(resourceId || ''),
      // Preserve every response-relevant field, including evidence choices,
      // sequence order, numeric tolerance, illustrations, and answer rubrics.
      questions: questions,
      reflections: reflections
    });
    var hash = 2166136261;
    for (var i = 0; i < identity.length; i++) {
      hash ^= identity.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return _QUIZ_DRAFT_STORAGE_PREFIX + String(sessionCode || 'local') + ':' + (hash >>> 0).toString(36);
  }
  function _quizPrepareDraft(namespace, previousNamespace, context) {
    if (!namespace || namespace.indexOf('assess-preview:') === 0) return;
    _quizDraftContexts[namespace] = context;
    if (!previousNamespace || namespace === previousNamespace) return;
    var storage = _quizLocalStorage();
    if (!storage) return;
    try {
      // Only migrate the exact former fingerprint of this resource/user/session.
      // Never adopt ambiguous content-only legacy drafts.
      if (!_quizReadDraft(namespace) && !_quizReadAttemptReceipt(namespace) && !_quizDraftMemory[namespace] && !_quizDraftFallback[namespace] && !Object.keys(_quizDraftPatches[namespace] || {}).length) {
        var candidates = (Array.isArray(previousNamespace) ? previousNamespace : [{ namespace: previousNamespace, signature: context.previousSignature }]).map(function (candidate) {
          if (!candidate.namespace || candidate.namespace === namespace) return null;
          var receipt = _quizReadAttemptReceipt(candidate.namespace), draft = _quizReadDraft(candidate.namespace);
          if (receipt && receipt.signature === candidate.signature) return { receipt: receipt, savedAt: Number(receipt.submittedAt) || 0 };
          if (draft && !receipt) return { draft: draft, savedAt: Number(draft.updatedAt) || 0 };
          return null;
        }).filter(Boolean).sort(function (a, b) { return b.savedAt - a.savedAt; });
        var selected = candidates[0];
        if (selected && selected.receipt) storage.setItem(_quizAttemptStorageKey(namespace), JSON.stringify(Object.assign({}, selected.receipt, { signature: context.signature, assessmentIdentity: context })));
        else if (selected && selected.draft) storage.setItem(namespace, JSON.stringify(Object.assign({}, selected.draft, { assessmentIdentity: context })));
      }
    } catch (e) { /* Existing work remains available in its original key. */ }
  }
  function _quizMergeDraftIdentity(namespace, context) {
    // Remember only signatures proven equivalent while this exact response
    // identity was current. This preserves an already released legacy receipt
    // across later harmless edits without accepting a changed question's key.
    var savedContexts = namespace ? [_quizDraftContexts[namespace], _quizReadDraft(namespace)?.assessmentIdentity, _quizReadAttemptReceipt(namespace)?.assessmentIdentity, _quizDraftMemory[namespace]?.assessmentIdentity, _quizDraftFallback[namespace]?.assessmentIdentity] : [];
    var signatures = (context.compatibleSignatures || []).slice();
    savedContexts.forEach(function (saved) {
      if (!saved || saved.signature !== context.signature || saved.keyVersion && context.keyVersion && saved.keyVersion !== context.keyVersion || ['resourceId', 'sessionCode', 'activityId', 'userId'].some(function (field) { return saved[field] !== context[field]; })) return;
      signatures = signatures.concat(saved.compatibleSignatures || []);
    });
    return Object.assign({}, context, { compatibleSignatures: Array.from(new Set(signatures)) });
  }
  function _quizFindEarlierVersion(context, namespace) {
    var storage = _quizLocalStorage(), latest = null;
    if (!storage || !context || !context.resourceId) return null;
    try {
      var keys = Object.keys(_quizDraftContexts);
      for (var index = 0; index < storage.length; index++) keys.push(storage.key(index));
      Array.from(new Set(keys)).forEach(function (key) {
        if (!key || key === namespace || key === _quizAttemptStorageKey(namespace) || (key.indexOf(_QUIZ_DRAFT_STORAGE_PREFIX) !== 0 && key.indexOf(_QUIZ_ATTEMPT_STORAGE_PREFIX) !== 0)) return;
        var saved = key.indexOf(_QUIZ_DRAFT_STORAGE_PREFIX) === 0 ? _quizReadWorkingDraft(key) : JSON.parse(storage.getItem(key) || 'null'), identity = saved && saved.assessmentIdentity;
        if (!identity || ['resourceId', 'sessionCode', 'activityId', 'userId'].some(function (field) { return identity[field] !== context[field]; })) return;
        if (identity.signature === context.signature) return;
        var savedAt = Number(saved.submittedAt || saved.updatedAt) || 0;
        if (!saved.submittedAt && Date.now() - savedAt > _QUIZ_DRAFT_MAX_AGE_MS) return;
        if (!latest || savedAt > Number(latest.submittedAt || latest.updatedAt)) latest = Object.assign({}, saved, { _versionStorageKey: key });
      });
    } catch (e) {}
    return latest;
  }
  function _quizLocalStorage() {
    // Reading window.localStorage THROWS (not merely returns undefined) in
    // sandboxed iframes and opaque origins — probe it inside a try.
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage || null;
    } catch (e) {
      return null;
    }
  }
  function _quizReadDraft(namespace) {
    if (namespace && namespace.indexOf('assess-preview:') === 0) return _quizDraftMemory[namespace] || null;
    var storage = _quizLocalStorage();
    if (!namespace || !storage) return null;
    try {
      var raw = storage.getItem(namespace);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !parsed.items || typeof parsed.items !== 'object') return null;
      if (!Number.isFinite(Number(parsed.updatedAt)) || Date.now() - Number(parsed.updatedAt) > _QUIZ_DRAFT_MAX_AGE_MS) {
        storage.removeItem(namespace);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }
  function _quizReadDraftField(namespace, itemKey, field) {
    var draft = _quizReadWorkingDraft(namespace);
    var item = draft && draft.items && draft.items[itemKey];
    var result = item && Object.prototype.hasOwnProperty.call(item, field) ? { found: true, value: item[field] } : { found: false, value: undefined };
    var seen = _quizDraftSeen[namespace] || (_quizDraftSeen[namespace] = {});
    seen[itemKey + ':' + field] = result.value;
    return result;
  }
  function _quizWriteDraftField(namespace, itemKey, field, value) {
    if (!namespace || _quizClosedDrafts[namespace] || _quizReadAttemptReceipt(namespace)) return false;
    _quizStageDraftField(namespace, itemKey, field, value);
    return _quizSaveWorkingDraft(namespace);
  }
  function _quizDraftSaveEvent(namespace, saved, updatedAt, reason) {
    _quizDraftWriteState[namespace] = { state: saved ? 'saved' : 'error', updatedAt: saved ? updatedAt : null, reason: reason || '' };
    try {
      window.dispatchEvent(new CustomEvent(saved ? 'alloflow:assessment-draft-saved' : 'alloflow:assessment-draft-error', { detail: { namespace: namespace, updatedAt: updatedAt, reason: reason || '' } }));
    } catch (eventError) {}
  }
  var _quizDraftLockDatabase = null;
  function _quizWithDraftLock(namespace, operation) {
    if (!namespace || namespace.indexOf('assess-preview:') === 0) return operation();
    var locks = typeof navigator !== 'undefined' && navigator.locks;
    function failed() { _quizDraftSaveEvent(namespace, false); return false; }
    // The lock must cover the entire read/check/merge/write transaction. Storage
    // events arrive too late to protect simultaneous writes in separate tabs.
    if (locks && typeof locks.request === 'function') return locks.request('alloflow:assessment:' + namespace, { mode: 'exclusive' }, operation).catch(failed);
    var database = typeof window !== 'undefined' && window.indexedDB;
    if (!database) return operation();
    // Older browser contexts can use an IndexedDB read/write transaction as
    // the cross-tab mutex. Keep its callback synchronous until commit.
    if (!_quizDraftLockDatabase) {
      var opening = new Promise(function (resolve, reject) {
        var request = database.open('alloflow-assessment-locks', 1);
        request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains('locks')) request.result.createObjectStore('locks'); };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error); };
      });
      _quizDraftLockDatabase = opening;
      opening.catch(function () { if (_quizDraftLockDatabase === opening) _quizDraftLockDatabase = null; });
    }
    return _quizDraftLockDatabase.then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction('locks', 'readwrite'), result;
        var store = transaction.objectStore('locks');
        store.get(namespace).onsuccess = function () {
          try { result = operation(); store.put(Date.now(), namespace); } catch (error) { transaction.abort(); reject(error); }
        };
        transaction.oncomplete = function () { resolve(result); };
        transaction.onerror = transaction.onabort = function () { reject(transaction.error || new Error('Draft save interrupted')); };
      });
    }).catch(failed);
  }
  function _quizSaveWorkingDraft(namespace, overwriteConflicts) {
    return _quizWithDraftLock(namespace, function () { return _quizSaveWorkingDraftNow(namespace, overwriteConflicts); });
  }
  function _quizSaveWorkingDraftNow(namespace, overwriteConflicts) {
    if (!namespace || _quizClosedDrafts[namespace]) return false;
    if (namespace.indexOf('assess-preview:') === 0) return true;
    var savedReceipt = _quizReadAttemptReceipt(namespace);
    if (savedReceipt) { _quizClosedDrafts[namespace] = true; _quizNotifyDraftSync(namespace); return false; }
    var persisted = _quizReadDraft(namespace);
    var localMeta = (_quizDraftFallback[namespace] || {}).items?.root?.attemptMeta;
    var savedMeta = persisted && persisted.items?.root?.attemptMeta;
    if (localMeta && savedMeta && localMeta.attemptId && savedMeta.attemptId && localMeta.attemptId !== savedMeta.attemptId) {
      _quizDraftSaveEvent(namespace, false, null, 'newer-attempt'); return false;
    }
    var conflicts = _quizDraftConflicts(namespace, persisted);
    if (conflicts.length && !overwriteConflicts) { _quizDraftSaveEvent(namespace, false, null, 'conflict'); return false; }
    var draft = _quizReadWorkingDraft(namespace);
    // Keep the entire snapshot available even if storage becomes unreadable.
    _quizDraftFallback[namespace] = draft;
    try {
      var storage = _quizLocalStorage();
      if (!storage) throw new Error('Local storage unavailable');
      storage.setItem(namespace, JSON.stringify(draft));
      // Only unsaved fields should override a newer snapshot from another tab.
      delete _quizDraftMemory[namespace];
      delete _quizDraftPatches[namespace];
      _quizDraftSaveEvent(namespace, true, draft.updatedAt);
      if (overwriteConflicts) _quizNotifyDraftSync(namespace);
      return true;
    } catch (e) {
      _quizDraftSaveEvent(namespace, false);
      return false;
    }
  }
  function _quizNotifyDraftSync(namespace) {
    try { window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-synced', { detail: { namespace: namespace } })); } catch (e) {}
  }
  function _quizUseSavedDraft(namespace) {
    return _quizWithDraftLock(namespace, function () {
      if (_quizClosedDrafts[namespace] || _quizReadAttemptReceipt(namespace)) { _quizNotifyDraftSync(namespace); return false; }
      var saved = _quizReadDraft(namespace);
      if (!saved) { _quizDraftSaveEvent(namespace, false); return false; }
      var localMeta = _quizDraftFallback[namespace]?.items?.root?.attemptMeta, savedMeta = saved.items?.root?.attemptMeta;
      if (localMeta?.attemptId && savedMeta?.attemptId && localMeta.attemptId !== savedMeta.attemptId) { _quizDraftSaveEvent(namespace, false, null, 'newer-attempt'); _quizNotifyDraftSync(namespace); return false; }
      var conflicts = new Set(_quizDraftConflicts(namespace, saved));
      var patches = _quizDraftPatches[namespace] || {}, remaining = {};
      var staged = { version: 1, createdAt: saved.createdAt || Date.now(), updatedAt: Date.now(), items: {} };
      Object.keys(patches).forEach(function (key) {
        var patch = patches[key];
        if (patch.map) {
          var entries = {};
          Object.keys(patch.entries).forEach(function (entryKey) { if (!conflicts.has(key + ':' + entryKey)) entries[entryKey] = patch.entries[entryKey]; });
          if (!Object.keys(entries).length) return;
          patch = Object.assign({}, patch, { entries: entries });
        } else if (conflicts.has(key)) return;
        remaining[key] = patch;
        var item = staged.items[patch.itemKey] || (staged.items[patch.itemKey] = {});
        if (patch.map) {
          var values = Object.assign({}, saved.items?.[patch.itemKey]?.[patch.field] || {});
          Object.keys(patch.entries).forEach(function (entryKey) { var value = patch.entries[entryKey].value; if (value === undefined) delete values[entryKey]; else values[entryKey] = value; });
          item[patch.field] = values;
        } else item[patch.field] = patch.value;
      });
      // Accept remote values only for actual conflicts. Preserve and persist
      // independent local answers, including edits made while the warning was open.
      _quizDraftPatches[namespace] = remaining;
      _quizDraftMemory[namespace] = staged;
      delete _quizDraftSeen[namespace];
      _quizDraftFallback[namespace] = saved;
      var result = _quizSaveWorkingDraftNow(namespace);
      _quizNotifyDraftSync(namespace);
      return result;
    });
  }
  function _quizResetWorkingDraft(namespace) {
    delete _quizDraftMemory[namespace]; delete _quizDraftFallback[namespace]; delete _quizDraftPatches[namespace];
    delete _quizDraftSeen[namespace]; delete _quizDraftWriteState[namespace]; delete _quizClosedDrafts[namespace];
  }
  function _quizMapField(itemKey, field) {
    return itemKey === 'root' && ['mcqAnswers', 'mcqConfidence', 'reflectionAnswers', 'flaggedQuestions'].indexOf(field) >= 0;
  }
  function _quizSameDraftValue(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function _quizDraftConflicts(namespace, persisted) {
    if (!persisted) return [];
    var patches = _quizDraftPatches[namespace] || {}, conflicts = [];
    Object.keys(patches).forEach(function (key) {
      var patch = patches[key], current = persisted && persisted.items?.[patch.itemKey]?.[patch.field];
      if (patch.map) Object.keys(patch.entries).forEach(function (entryKey) {
        var change = patch.entries[entryKey], value = current && current[entryKey];
        if (!_quizSameDraftValue(value, change.before) && !_quizSameDraftValue(value, change.value)) conflicts.push(key + ':' + entryKey);
      });
      else if (!_quizSameDraftValue(current, patch.before) && !_quizSameDraftValue(current, patch.value)) conflicts.push(key);
    });
    return conflicts;
  }
  function _quizStageDraftField(namespace, itemKey, field, value, previousValue) {
    if (!namespace || _quizClosedDrafts[namespace]) return;
    var patchKey = itemKey + ':' + field;
    var seen = _quizDraftSeen[namespace] || (_quizDraftSeen[namespace] = {});
    var previous = arguments.length > 4 ? previousValue : seen[patchKey];
    var patches = _quizDraftPatches[namespace] || (_quizDraftPatches[namespace] = {});
    var patch = patches[patchKey];
    if (_quizMapField(itemKey, field)) {
      patch = patch || { itemKey: itemKey, field: field, map: true, entries: {} };
      Object.keys(Object.assign({}, previous || {}, value || {})).forEach(function (key) {
        var before = previous && previous[key], after = value && value[key];
        if (!_quizSameDraftValue(before, after)) patch.entries[key] = { before: patch.entries[key] ? patch.entries[key].before : before, value: after };
      });
    } else {
      // A hook's display default (for example an empty string) need not exist
      // in storage. Compare against the value actually observed there.
      if (!patch) previous = Object.prototype.hasOwnProperty.call(seen, patchKey) ? seen[patchKey] : _quizReadDraft(namespace)?.items?.[itemKey]?.[field];
      patch = { itemKey: itemKey, field: field, before: patch ? patch.before : previous, value: value };
    }
    patches[patchKey] = patch;
    seen[patchKey] = value;
    var staged = _quizDraftMemory[namespace] || { version: 1, createdAt: Date.now(), items: {} };
    staged.items[itemKey] = Object.assign({}, staged.items[itemKey] || {});
    staged.items[itemKey][field] = value;
    staged.updatedAt = Date.now();
    _quizDraftMemory[namespace] = staged;
    if (!_quizDraftWriteState[namespace] || _quizDraftWriteState[namespace].state !== 'error') _quizDraftWriteState[namespace] = { state: 'pending', updatedAt: null };
    try {
      window.dispatchEvent(new CustomEvent('alloflow:assessment-draft-changed', { detail: { namespace: namespace } }));
    } catch (e) {}
  }
  function _quizReadWorkingDraft(namespace) {
    var persisted = _quizReadDraft(namespace) || _quizDraftFallback[namespace] || { items: {} };
    var fallback = _quizDraftFallback[namespace];
    if (fallback?.items?.root?.attemptMeta?.attemptId && persisted.items?.root?.attemptMeta?.attemptId && fallback.items.root.attemptMeta.attemptId !== persisted.items.root.attemptMeta.attemptId) persisted = fallback;
    var staged = _quizDraftMemory[namespace];
    var working = {
      version: 1,
      createdAt: persisted.createdAt || staged && staged.createdAt || Date.now(),
      updatedAt: Math.max(Number(persisted.updatedAt) || 0, Number(staged && staged.updatedAt) || 0) || Date.now(),
      assessmentIdentity: _quizDraftContexts[namespace] || persisted.assessmentIdentity,
      items: Object.assign({}, persisted.items || {})
    };
    if (staged && staged.items) {
      Object.keys(staged.items).forEach(function (itemKey) {
        working.items[itemKey] = Object.assign({}, working.items[itemKey] || {});
        Object.keys(staged.items[itemKey]).forEach(function (field) {
          var patch = (_quizDraftPatches[namespace] || {})[itemKey + ':' + field];
          if (patch && patch.map) {
            var merged = Object.assign({}, working.items[itemKey][field] || {});
            Object.keys(patch.entries).forEach(function (key) { var value = patch.entries[key].value; if (value === undefined) delete merged[key]; else merged[key] = value; });
            working.items[itemKey][field] = merged;
          } else working.items[itemKey][field] = staged.items[itemKey][field];
        });
      });
    }
    return working;
  }
  function _quizQuestionAnswered(question, questionIdx, draft) {
    if (!question || typeof question !== 'object' || Array.isArray(question)) return false;
    var items = draft && draft.items || {};
    var root = items.root || {};
    var item = items['q-' + questionIdx] || {};
    var type = question.type || 'mcq';
    if (item.idk === true) return true;
    function hasText(value) { return typeof value === 'string' && value.trim().length > 0; }
    function validChoice(value, choices) { return Number.isInteger(value) && Array.isArray(choices) && value >= 0 && value < choices.length; }
    function validOrder(order, count) {
      return count > 0 && Array.isArray(order) && order.length === count
        && order.every(function (value) { return Number.isInteger(value) && value >= 0 && value < count; })
        && new Set(order).size === count;
    }
    if (type === 'mcq') {
      return !!(root.mcqAnswers && Object.prototype.hasOwnProperty.call(root.mcqAnswers, questionIdx) && validChoice(root.mcqAnswers[questionIdx], question.options));
    }
    if (type === 'multi-select') return Array.isArray(item.selected) && item.selected.length > 0
      && item.selected.every(function (value) { return validChoice(value, question.options); })
      && new Set(item.selected).size === item.selected.length;
    if (type === 'answer-evidence') return validChoice(item.answerIdx, question.answerOptions || question.options) && validChoice(item.evidenceIdx, question.evidenceOptions) && (!question.requireReasoning || hasText(item.explanation));
    // Completion records an attempted response, not whether its content is
    // correct. In particular, numeric parsing and units belong to grading.
    if (type === 'numeric-response' || type === 'fill-blank' || type === 'short-answer' || type === 'self-explanation') return hasText(item.response);
    if (type === 'sequence-sense') {
      if (item.grade && item.grade.status === 'idk') return true;
      var sequenceItems = Array.isArray(question.items) ? question.items : [];
      if (question.sequenceMode !== 'arrange-explain' && item.verifyAnswer !== 'yes' && item.verifyAnswer !== 'no') return false;
      if (question.sequenceMode !== 'arrange-explain' && item.verifyAnswer === 'no' && !validChoice(item.clickedIdx, sequenceItems)) return false;
      var principles = Array.isArray(question.principleOptions) ? question.principleOptions : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
      if (!hasText(item.principleAnswer) || principles.indexOf(item.principleAnswer) < 0) return false;
      // An unchanged arrangement is valid: both renderers initialize it from
      // the displayed order, and the immediate card can leave it unstored.
      var order = item.orderAnswer != null ? item.orderAnswer : item.presentedOrder != null ? item.presentedOrder
        : validOrder(question.presentedOrder, sequenceItems.length) ? question.presentedOrder
        : sequenceItems.map(function (_, index) { return index; });
      return validOrder(order, sequenceItems.length);
    }
    if (type === 'relation-mismatch') {
      if (item.grade && item.grade.status === 'idk') return true;
      if (!validChoice(item.clickedPairIdx, question.pairs) || !hasText(item.partnerAnswer) || question.requireReasoning && !hasText(item.explanation)) return false;
      return !Array.isArray(question.candidatePartners) || question.candidatePartners.length === 0 || question.candidatePartners.indexOf(item.partnerAnswer) >= 0;
    }
    return false;
  }
  // A compound item can contain useful work before all required parts are
  // complete. Preserve that work independently from the review completion count.
  function _quizQuestionHasResponse(question, questionIdx, draft) {
    if (_quizQuestionAnswered(question, questionIdx, draft)) return true;
    if (!question || typeof question !== 'object') return false;
    var item = draft && draft.items && draft.items['q-' + questionIdx] || {};
    function choice(value, options) { return Number.isInteger(value) && Array.isArray(options) && value >= 0 && value < options.length; }
    function text(value) { return typeof value === 'string' && value.trim().length > 0; }
    if (question.type === 'answer-evidence') return choice(item.answerIdx, question.answerOptions || question.options) || choice(item.evidenceIdx, question.evidenceOptions);
    if (question.type === 'relation-mismatch') return choice(item.clickedPairIdx, question.pairs) || text(item.partnerAnswer);
    if (question.type === 'sequence-sense') return item.verifyAnswer === 'yes' || item.verifyAnswer === 'no' || choice(item.clickedIdx, question.items) || text(item.principleAnswer)
      || Array.isArray(item.orderAnswer) && item.orderAnswer.length > 0;
    return false;
  }
  function _quizReflectionResponse(entry) {
    entry = entry && typeof entry === 'object' ? entry : {};
    if (entry.submitted === true && typeof entry.submittedText === 'string' && entry.submittedText.trim()) return entry.submittedText;
    // A reopened reflection may intentionally be blank. Never resurrect its
    // previous submitted text merely because the current draft is empty.
    if (typeof entry.draft === 'string') return entry.draft;
    return typeof entry.submittedText === 'string' ? entry.submittedText : '';
  }
  function _quizBuildAttemptProgress(data, draft) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var root = draft && draft.items && draft.items.root || {};
    var flags = root.flaggedQuestions || {};
    var items = questions.map(function (question, questionIdx) {
      return {
        questionIdx: questionIdx,
        type: question && question.type || 'mcq',
        label: question && typeof question.question === 'string' && question.question.trim() ? question.question
          : question && typeof question.contextSentence === 'string' && question.contextSentence.trim() ? question.contextSentence
          : ('Question ' + (questionIdx + 1)),
        answered: _quizQuestionAnswered(question, questionIdx, draft),
        flagged: flags[questionIdx] === true
      };
    });
    var reflections = data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : [];
    var reflectionAnswers = root.reflectionAnswers || {};
    var reflectionAnswered = reflections.reduce(function (count, reflection, idx) {
      var entry = reflectionAnswers[idx] || {};
      var text = _quizReflectionResponse(entry);
      return count + (typeof text === 'string' && text.trim() ? 1 : 0);
    }, 0);
    var answered = items.filter(function (item) { return item.answered; }).length;
    return {
      total: items.length,
      answered: answered,
      unanswered: items.length - answered,
      flagged: items.filter(function (item) { return item.flagged; }).length,
      items: items,
      reflectionTotal: reflections.length,
      reflectionAnswered: reflectionAnswered
    };
  }
  function _quizAttemptStorageKey(namespace) {
    if (!namespace) return '';
    return namespace.indexOf(_QUIZ_DRAFT_STORAGE_PREFIX) === 0 ? _QUIZ_ATTEMPT_STORAGE_PREFIX + namespace.slice(_QUIZ_DRAFT_STORAGE_PREFIX.length) : _QUIZ_ATTEMPT_STORAGE_PREFIX + namespace;
  }
  function _quizReadAttemptReceipt(namespace, signature) {
    if (namespace && namespace.indexOf('assess-preview:') === 0) return null;
    var storage = _quizLocalStorage();
    var key = _quizAttemptStorageKey(namespace);
    if (!storage || !key) return null;
    try {
      var raw = storage.getItem(key);
      var receipt = raw ? JSON.parse(raw) : null;
      return receipt && receipt.version === 1 && receipt.submittedAt && (!signature || receipt.signature === signature) ? receipt : null;
    } catch (e) {
      return null;
    }
  }
  function _quizFinalizeAttempt(namespace, payload) {
    if (namespace && namespace.indexOf('assess-preview:') === 0) return null;
    var storage = _quizLocalStorage();
    var key = _quizAttemptStorageKey(namespace);
    if (!namespace || !key) return null;
    try {
      if (!storage) throw new Error('Local storage unavailable');
      var current = _quizReadAttemptReceipt(namespace), savedMeta = _quizReadDraft(namespace)?.items?.root?.attemptMeta;
      if (current && current.attemptId !== payload?.attemptId || savedMeta?.attemptId && payload?.attemptId && savedMeta.attemptId !== payload.attemptId) return null;
      if (!current && _quizDraftConflicts(namespace, _quizReadDraft(namespace)).length) { _quizDraftSaveEvent(namespace, false, null, 'conflict'); return null; }
      var receipt = Object.assign({ version: 1, submittedAt: Date.now(), assessmentIdentity: _quizDraftContexts[namespace] }, payload || {});
      storage.setItem(key, JSON.stringify(receipt));
      _quizClosedDrafts[namespace] = true;
      // Receipt persistence is the commit point. Draft cleanup is best effort.
      try { storage.removeItem(namespace); } catch (cleanupError) {}
      delete _quizDraftMemory[namespace];
      delete _quizDraftFallback[namespace];
      delete _quizDraftWriteState[namespace];
      delete _quizDraftPatches[namespace];
      return receipt;
    } catch (e) {
      _quizDraftSaveEvent(namespace, false);
      return null;
    }
  }
  function _quizClearAttemptReceipt(namespace, expectedAttemptId) {
    var storage = _quizLocalStorage();
    var key = _quizAttemptStorageKey(namespace);
    if (!storage || !key) return false;
    try {
      var current = _quizReadAttemptReceipt(namespace);
      if (expectedAttemptId && (!current || current.attemptId !== expectedAttemptId)) return false;
      // Leave the committed receipt intact if stale-draft cleanup fails.
      storage.removeItem(namespace);
      // Persist the new owner before removing the old receipt. Delayed callbacks
      // from the completed attempt must never recreate it during a restart.
      var now = Math.max(Date.now(), Number(current?.startedAt || 0) + 1);
      storage.setItem(namespace, JSON.stringify({ version: 1, createdAt: now, updatedAt: now, assessmentIdentity: _quizDraftContexts[namespace] || current?.assessmentIdentity, items: { root: { attemptMeta: { attemptId: 'attempt-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 8), startedAt: now, previousAttemptId: current?.attemptId || '', status: 'in-progress' } } } }));
      storage.removeItem(key);
      delete _quizDraftMemory[namespace];
      delete _quizDraftFallback[namespace];
      delete _quizDraftWriteState[namespace];
      delete _quizDraftPatches[namespace];
      delete _quizDraftSeen[namespace];
      delete _quizClosedDrafts[namespace];
      return true;
    } catch (e) {
      return false;
    }
  }
  function _quizNormalizeDeliverySettings(raw) {
    var source = raw && typeof raw === 'object' ? raw : {};
    var minutes = Math.max(0, Math.min(240, Number(source.timeLimitMinutes) || 0));
    var extension = Math.max(1, Math.min(60, Number(source.extensionMinutes) || 5));
    var warning = Math.max(1, Math.min(15, Number(source.warningMinutes) || 2));
    return {
      profile: source.profile || 'flexible',
      feedbackTiming: ['after-submit','teacher-release','teacher-graded'].includes(source.feedbackTiming) ? source.feedbackTiming : 'immediate',
      feedbackReleasedFor: typeof source.feedbackReleasedFor === 'string' ? source.feedbackReleasedFor : '',
      pacing: source.pacing === 'one-at-a-time' ? 'one-at-a-time' : 'all-at-once',
      timeLimitMinutes: minutes,
      extensionMinutes: extension,
      warningMinutes: warning,
      allowFlagging: source.allowFlagging !== false,
      showProgress: source.showProgress !== false
    };
  }
  // Graded: the teacher checks answers. Student copies arrive without keys
  // (answerKeysWithheld), so learners never get self-check or answer guides.
  // A teacher-release copy is also withheld, but its key arrives on release.
  function _quizIsGraded(data) {
    var timing = _quizNormalizeDeliverySettings(data && data.deliverySettings).feedbackTiming;
    return !!(data && (data.answerKeysWithheld === true && timing !== 'teacher-release' || timing === 'teacher-graded'));
  }
  function _quizGradedCopy(key, fallback) {
    var value = t(key);
    return typeof value === 'string' && value && value !== key ? value : fallback;
  }
  function _quizUseDraftField(namespace, itemKey, field, initialValue) {
    var restoredRef = React.useRef(false);
    var mountedRef = React.useRef(false);
    var pendingRef = React.useRef(null);
    var initialRef = React.useRef({ ready: false });
    function defaultValue() {
      if (!initialRef.current.ready) initialRef.current = { ready: true, value: typeof initialValue === 'function' ? initialValue() : initialValue };
      return initialRef.current.value;
    }
    var state = React.useState(function () {
      var stored = _quizReadDraftField(namespace, itemKey, field);
      if (stored.found) {
        restoredRef.current = true;
        return stored.value;
      }
      return defaultValue();
    });
    var valueRef = React.useRef(state[0]);
    valueRef.current = state[0];
    React.useEffect(function () {
      if (!namespace) return;
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }
      if (!pendingRef.current) return;
      var timer = window.setTimeout(function () {
        _quizSaveWorkingDraft(namespace);
        if (pendingRef.current && pendingRef.current.value === state[0]) pendingRef.current = null;
      }, 350);
      return function () { window.clearTimeout(timer); };
    }, [namespace, itemKey, field, state[0]]);
    React.useEffect(function () {
      function flush() {
        var pending = pendingRef.current;
        if (!pending || pending.namespace !== namespace) return;
        _quizSaveWorkingDraft(pending.namespace);
        pendingRef.current = null;
      }
      window.addEventListener('pagehide', flush);
      return function () { window.removeEventListener('pagehide', flush); flush(); };
    }, [namespace, itemKey, field]);
    React.useEffect(function () {
      function sync(event) {
        if (event.type === 'storage' ? event.key !== namespace : event.detail?.namespace !== namespace) return;
        if (_quizDraftWriteState[namespace]?.reason === 'conflict') return;
        if (event.type !== 'storage') pendingRef.current = null;
        var stored = _quizReadDraftField(namespace, itemKey, field);
        valueRef.current = stored.found ? stored.value : defaultValue();
        state[1](valueRef.current);
      }
      window.addEventListener('storage', sync);
      window.addEventListener('alloflow:assessment-draft-synced', sync);
      return function () { window.removeEventListener('storage', sync); window.removeEventListener('alloflow:assessment-draft-synced', sync); };
    }, [namespace, itemKey, field]);
    function setDraftState(value) {
      var previous = valueRef.current;
      var next = typeof value === 'function' ? value(previous) : value;
      valueRef.current = next;
      pendingRef.current = { namespace: namespace, itemKey: itemKey, field: field, value: next };
      // Notify sibling components from the input handler, never from React's
      // state updater, which React can evaluate again during rendering.
      _quizStageDraftField(namespace, itemKey, field, next, previous);
      state[1](next);
    }
    return [state[0], setDraftState, restoredRef.current];
  }
  function AssessmentDraftStatus(p) {
    var preview = p.namespace && p.namespace.indexOf('assess-preview:') === 0;
    var tr = typeof p.copy === 'function' ? p.copy : _quizGradedCopy;
    var statusState = React.useState(function () {
      var initial = _quizReadDraft(p.namespace);
      return _quizDraftWriteState[p.namespace] || (initial ? { state: 'restored', updatedAt: initial.updatedAt } : { state: _quizLocalStorage() ? 'idle' : 'error', updatedAt: null });
    });
    var status = statusState[0];
    var setStatus = statusState[1];
    React.useEffect(function () {
      function saved(event) {
        if (event && event.detail && event.detail.namespace === p.namespace) setStatus({ state: 'saved', updatedAt: event.detail.updatedAt });
      }
      function failed(event) {
        if (event && event.detail && event.detail.namespace === p.namespace) setStatus({ state: 'error', updatedAt: null, reason: event.detail.reason || '' });
      }
      function changed(event) {
        if (event && event.detail && event.detail.namespace === p.namespace) setStatus(_quizDraftWriteState[p.namespace] || { state: 'pending', updatedAt: null });
      }
      function beforeLeave(event) {
        var latest = _quizDraftWriteState[p.namespace];
        if (preview || !latest || latest.state === 'saved' || _quizClosedDrafts[p.namespace]) return;
        var result = _quizSaveWorkingDraft(p.namespace);
        if (!result || typeof result.then === 'function') { event.preventDefault(); event.returnValue = ''; }
      }
      window.addEventListener('alloflow:assessment-draft-saved', saved);
      window.addEventListener('alloflow:assessment-draft-error', failed);
      window.addEventListener('alloflow:assessment-draft-changed', changed);
      window.addEventListener('beforeunload', beforeLeave);
      return function () {
        window.removeEventListener('alloflow:assessment-draft-saved', saved);
        window.removeEventListener('alloflow:assessment-draft-error', failed);
        window.removeEventListener('alloflow:assessment-draft-changed', changed);
        window.removeEventListener('beforeunload', beforeLeave);
      };
    }, [p.namespace]);
    var timeLabel = status.updatedAt ? new Date(status.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    var conflict = status.reason === 'conflict';
    var message = conflict ? tr('quiz.draft.conflict', 'This answer changed in another tab. Choose which changes to keep.') : status.reason === 'newer-attempt' ? tr('quiz.draft.newer_attempt', 'A newer attempt is open in another tab. Download this draft before switching.') : preview ? tr('quiz.draft.preview', 'Preview responses stay in this preview.') : status.state === 'restored' ? tr('quiz.draft.restored', 'Restored your saved work from this device.') : status.state === 'saved' ? (timeLabel ? _quizFill(tr('quiz.draft.saved_at', 'Saved locally at {time}.'), { time: timeLabel }) : tr('quiz.draft.saved', 'Saved locally.')) : status.state === 'error' ? tr('quiz.draft.unsaved', 'Your latest answers are not saved on this device.') : status.state === 'pending' ? tr('quiz.draft.saving', 'Saving your answers…') : tr('quiz.draft.automatic', 'Answers save automatically on this device.');
    return <div data-assessment-draft-status className={'rounded-lg border px-3 py-2 flex flex-wrap items-center gap-2 text-xs ' + (!preview && status.state === 'error' ? 'bg-amber-50 border-amber-300 text-amber-900' : status.state === 'restored' ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-white border-slate-200 text-slate-700')}><div className="basis-full min-w-0 flex-1 sm:basis-0" role="status" aria-live="polite"><strong>{message}</strong>{!preview && <span className="ml-1">{status.state === 'error' ? tr('quiz.draft.recovery_help', 'Keep this page open. Retry saving or download a copy before leaving.') : tr('quiz.draft.expiration', 'Drafts expire after 7 days.')}</span>}</div>{!preview && status.state === 'error' && <button type="button" className="min-h-11 rounded-lg border border-amber-400 bg-white px-3 py-2 font-bold text-amber-950" onClick={function () { _quizSaveWorkingDraft(p.namespace, conflict); }}>{conflict ? tr('quiz.draft.keep_changes', 'Save my changes') : tr('quiz.draft.retry', 'Retry save')}</button>}{!preview && conflict && <button type="button" className="min-h-11 rounded-lg border border-amber-400 bg-white px-3 py-2 font-bold text-amber-950" onClick={function () { _quizUseSavedDraft(p.namespace); }}>{tr('quiz.draft.use_saved', 'Use saved answers')}</button>}{!preview && typeof p.onDownload === 'function' && <button type="button" className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-slate-800" onClick={p.onDownload}>{tr('quiz.review.download_draft', 'Download draft')}</button>}</div>;
  }
  function AssessmentDeliveryPanel(p) {
    var settings = _quizNormalizeDeliverySettings(p.settings);
    var expandedState = React.useState(false);
    var expanded = expandedState[0];
    var setExpanded = expandedState[1];
    var presets = [{
      id: 'flexible',
      label: 'Flexible access',
      description: 'Untimed, all questions visible',
      values: { profile: 'flexible', pacing: 'all-at-once', timeLimitMinutes: 0, extensionMinutes: 5, warningMinutes: 2, allowFlagging: true, showProgress: true }
    }, {
      id: 'focused',
      label: 'Focused steps',
      description: 'Untimed, one question at a time',
      values: { profile: 'focused', pacing: 'one-at-a-time', timeLimitMinutes: 0, extensionMinutes: 5, warningMinutes: 2, allowFlagging: true, showProgress: true }
    }, {
      id: 'timed-practice',
      label: 'Timed practice',
      description: '20 minutes with pause, warning, and extensions',
      values: { profile: 'timed-practice', pacing: 'one-at-a-time', timeLimitMinutes: 20, extensionMinutes: 5, warningMinutes: 2, allowFlagging: true, showProgress: true }
    }];
    function apply(next) {
      if (typeof p.onChange === 'function') p.onChange(_quizNormalizeDeliverySettings(next));
    }
    function patch(field, value) {
      var next = Object.assign({}, settings);
      next[field] = value;
      next.profile = 'custom';
      apply(next);
    }
    return <section className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4" aria-labelledby="assessment-delivery-heading"><div className="flex items-start justify-between gap-3"><div><h3 id="assessment-delivery-heading" className="font-black text-violet-950">Access &amp; delivery</h3><p className="text-xs text-violet-900 mt-1">Choose a neutral class-wide starting point, then customize it. No diagnosis or accommodation reason is recorded.</p></div><button type="button" onClick={function () { setExpanded(!expanded); }} aria-expanded={expanded} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-violet-300 text-violet-900">{expanded ? 'Hide settings' : 'Customize'}</button></div><div className="mt-4 rounded-lg border border-violet-200 bg-white p-3"><label className="block text-sm font-bold text-slate-800">Feedback timing<select data-assessment-feedback-timing value={settings.feedbackTiming} onChange={e => patch('feedbackTiming', e.target.value)} className="mt-2 block w-full min-h-11 rounded-lg border border-slate-400 bg-white p-2 text-sm text-slate-800"><option value="immediate">Immediate practice feedback</option><option value="after-submit">After submission</option><option value="teacher-release">When the teacher releases it</option><option value="teacher-graded">{_quizGradedCopy('quiz.graded.option', 'Graded: hide answers from students')}</option></select></label><p className="mt-2 text-xs text-slate-600">Delayed feedback keeps correctness, explanations, and answer guides hidden while students work.</p>{settings.feedbackTiming === 'teacher-graded' && <p data-assessment-graded-note className="mt-2 text-xs text-slate-800">{_quizGradedCopy('quiz.graded.teacher_note', 'Answer keys, explanations, and answer guides are removed from every student copy: live sessions, the class mailbox, homework links, and student files. Students submit their responses and you check them in the Submission Inbox. Live quizzes still score on your device.')}</p>}{settings.feedbackTiming === 'teacher-release' && <div className="mt-3"><button type="button" data-assessment-release-feedback onClick={p.onRelease} disabled={p.released || p.releasing || typeof p.onRelease !== 'function'} className="min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{p.released ? 'Feedback released' : p.releasing ? 'Releasing feedback...' : 'Release feedback to students'}</button><p className="mt-2 text-xs text-slate-600">{p.live ? 'Students in this session can view released feedback after submitting.' : 'Share the updated resource again so students with saved copies receive the release.'}</p>{p.releaseError && <p role="alert" className="mt-2 text-sm text-red-800">{p.releaseError}</p>}</div>}</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">{presets.map(function (preset) {
      var active = settings.profile === preset.id;
      return <button key={preset.id} type="button" onClick={function () { apply(Object.assign({}, settings, preset.values)); }} aria-pressed={active} className={'text-left rounded-lg border p-3 transition-colors motion-reduce:transition-none ' + (active ? 'bg-violet-700 border-violet-800 text-white' : 'bg-white border-violet-200 text-violet-950 hover:border-violet-400')}><span className="block text-xs font-black">{preset.label}</span><span className={'block text-[11px] mt-1 ' + (active ? 'text-violet-100' : 'text-violet-800')}>{preset.description}</span></button>;
    })}</div>{expanded && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 p-3 rounded-lg bg-white border border-violet-200"><label className="text-xs font-bold text-slate-700">Pacing<select value={settings.pacing} onChange={function (e) { patch('pacing', e.target.value); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal"><option value="all-at-once">All questions visible</option><option value="one-at-a-time">One at a time</option></select></label><label className="text-xs font-bold text-slate-700">Time limit (minutes)<input type="number" min="0" max="240" value={settings.timeLimitMinutes} onChange={function (e) { patch('timeLimitMinutes', Number(e.target.value)); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" /><span className="block text-[10px] font-normal text-slate-500 mt-1">0 means untimed</span></label><label className="text-xs font-bold text-slate-700">Extension step<input type="number" min="1" max="60" value={settings.extensionMinutes} onChange={function (e) { patch('extensionMinutes', Number(e.target.value)); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" /><span className="block text-[10px] font-normal text-slate-500 mt-1">Learners can add this privately</span></label><label className="text-xs font-bold text-slate-700">Warning (minutes)<input type="number" min="1" max="15" value={settings.warningMinutes} onChange={function (e) { patch('warningMinutes', Number(e.target.value)); }} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-normal" /></label><label className="sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={settings.allowFlagging} onChange={function (e) { patch('allowFlagging', e.target.checked); }} />Allow learners to flag questions for review</label><label className="sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={settings.showProgress} onChange={function (e) { patch('showProgress', e.target.checked); }} />Show question progress</label><p className="sm:col-span-2 lg:col-span-4 text-[11px] text-slate-600">Timed assessments always support pause and extensions. Reaching zero opens the review screen; it never submits or deletes work automatically.</p></div>}</section>;
  }
  function AssessmentQuestionFlagButton(p) {
    return <button type="button" onClick={p.onToggle} aria-pressed={!!p.flagged} className={'text-xs font-bold px-2.5 py-1 rounded-lg border ' + (p.flagged ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}><span aria-hidden="true">{p.flagged ? '⚑ ' : '⚐ '}</span>{p.flagged ? 'Flagged for review' : 'Flag for review'}</button>;
  }
  function AssessmentTimerBar(p) {
    if (!p.enabled) return null;
    var seconds = Math.max(0, Number(p.remainingSeconds) || 0);
    var minutesPart = Math.floor(seconds / 60);
    var secondsPart = String(seconds % 60).padStart(2, '0');
    var warning = seconds <= (Number(p.warningMinutes) || 2) * 60;
    return <div className={'rounded-xl border-2 p-3 flex items-center gap-3 flex-wrap ' + (p.expired ? 'bg-rose-50 border-rose-300' : warning ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-300')} role="region" aria-label="Assessment timer"><div><div className="text-[10px] uppercase font-black tracking-wider text-slate-600">Time remaining</div><div role="timer" aria-live={warning ? 'polite' : 'off'} className={'text-xl font-black tabular-nums ' + (p.expired ? 'text-rose-800' : warning ? 'text-amber-900' : 'text-slate-800')}>{minutesPart + ':' + secondsPart}</div></div><div className="flex items-center gap-2 ml-auto flex-wrap"><button type="button" onClick={p.onTogglePause} disabled={p.expired} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-50">{p.running ? 'Pause timer' : 'Resume timer'}</button><button type="button" onClick={p.onExtend} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">{'+' + p.extensionMinutes + ' minutes'}</button>{p.onReview && <button type="button" onClick={p.onReview} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-white">{_quizGradedCopy('quiz.student.review_submit', 'Review & submit')}</button>}</div>{p.expired && <p className="basis-full text-xs font-semibold text-rose-900">The planned time has ended. Your work is safe—review it, add time, or submit when ready.</p>}</div>;
  }
  function AssessmentReviewDialog(p) {
    var dialogRef = React.useRef(null);
    var closeRef = React.useRef(null);
    var previousFocusRef = React.useRef(null);
    var skipRestoreRef = React.useRef(false);
    var errorRef = React.useRef(null);
    var confirmState = React.useState(false);
    var confirmIncomplete = confirmState[0];
    var setConfirmIncomplete = confirmState[1];
    var filterState = React.useState('all');
    var filter = filterState[0];
    var tr = typeof p.copy === 'function' ? p.copy : _quizGradedCopy;
    React.useEffect(function () {
      if (!p.open) return;
      skipRestoreRef.current = false;
      try {
        previousFocusRef.current = document.activeElement;
        if (closeRef.current) closeRef.current.focus();
      } catch (e) {}
      var restoreBackground = _quizIsolateDialog(dialogRef.current);
      return function () {
        restoreBackground();
        var previous = previousFocusRef.current;
        previousFocusRef.current = null;
        try { if (!skipRestoreRef.current && previous && previous.isConnected !== false && typeof previous.focus === 'function') previous.focus(); } catch (e) {}
      };
    }, [p.open]);
    React.useEffect(function () {
      if (!p.open) { setConfirmIncomplete(false); filterState[1]('all'); }
    }, [p.open]);
    React.useEffect(function () {
      if (p.open && p.submissionError && errorRef.current) {
        try { errorRef.current.focus(); } catch (e) {}
      }
    }, [p.open, p.submissionError]);
    if (!p.open) return null;
    var progress = p.progress || { total: 0, answered: 0, unanswered: 0, flagged: 0, items: [] };
    var items = Array.isArray(progress.items) ? progress.items : [];
    var visibleItems = items.filter(function (item) { return filter === 'unanswered' ? !item.answered : filter === 'flagged' ? item.flagged : true; });
    function requestSubmit() {
      if (p.preview) return;
      if (progress.unanswered > 0 && !confirmIncomplete) {
        setConfirmIncomplete(true);
        return;
      }
      if (typeof p.onSubmit === 'function') p.onSubmit();
    }
    function goToQuestion(questionIdx) {
      if (typeof p.onGo !== 'function') return;
      // The host focuses the selected question after it closes this dialog.
      skipRestoreRef.current = true;
      p.onGo(questionIdx);
    }
    return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60" onMouseDown={function (e) { if (e.target === e.currentTarget && typeof p.onClose === 'function') p.onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="assessment-review-title" aria-describedby="assessment-review-help assessment-review-summary" tabIndex={-1} onKeyDown={function (e) { _quizHandleDialogKeyDown(e, dialogRef, function () { if (typeof p.onClose === 'function') p.onClose(); }); }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border-2 border-indigo-300 shadow-2xl p-5">
        <div className="flex items-start justify-between gap-4"><div>
          <h2 id="assessment-review-title" className="text-xl font-black text-slate-900">{tr('quiz.review.title', 'Review your assessment')}</h2>
          <p id="assessment-review-help" className="text-sm text-slate-600 mt-1">{tr('quiz.review.help', 'Nothing is final until you choose Submit assessment.')}</p>
          <p id="assessment-review-summary" className="sr-only">{_quizFill(tr('quiz.review.summary', '{answered} of {total} questions answered. {unanswered} unanswered. {flagged} flagged for review.'), progress)}</p>
        </div><button type="button" ref={closeRef} onClick={p.onClose} aria-label={tr('quiz.review.close', 'Close review')} className="w-11 h-11 shrink-0 rounded-full border border-slate-300 text-slate-700">×</button></div>
        <div className="grid grid-cols-3 gap-2 my-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center"><div className="text-xl font-black text-emerald-800">{progress.answered}</div><div className="text-[10px] font-bold uppercase text-emerald-700">{tr('quiz.review.answered', 'Answered')}</div></div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center"><div className="text-xl font-black text-amber-900">{progress.unanswered}</div><div className="text-[10px] font-bold uppercase text-amber-800">{tr('quiz.review.unanswered', 'Unanswered')}</div></div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center"><div className="text-xl font-black text-slate-800">{progress.flagged}</div><div className="text-[10px] font-bold uppercase text-slate-600">{tr('quiz.review.flagged', 'Flagged')}</div></div>
        </div>
        <div role="group" aria-label={tr('quiz.review.filter_label', 'Filter questions for review')} className="mb-3 flex flex-wrap gap-2">
          {[{ id: 'all', label: tr('quiz.review.all_questions', 'All questions'), count: items.length }, { id: 'unanswered', label: tr('quiz.review.unanswered', 'Unanswered'), count: progress.unanswered }, { id: 'flagged', label: tr('quiz.review.flagged', 'Flagged'), count: progress.flagged }].map(function (option) {
            return <button key={option.id} type="button" data-assessment-review-filter={option.id} aria-pressed={filter === option.id} aria-controls="assessment-review-questions" onClick={function () { filterState[1](option.id); }} className={'min-h-11 rounded-lg border px-3 py-2 text-sm font-bold ' + (filter === option.id ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-indigo-50')}>{option.label + ' (' + option.count + ')'}</button>;
          })}
        </div>
        <p role="status" aria-live="polite" className="sr-only">{_quizFill(tr('quiz.review.showing_count', 'Showing {count} questions.'), { count: visibleItems.length })}</p>
        <ul id="assessment-review-questions" className="space-y-2">{visibleItems.map(function (item) {
          var answeredLabel = item.answered ? tr('quiz.review.answered', 'Answered') : tr('quiz.review.unanswered', 'Unanswered');
          var flagLabel = item.flagged ? tr('quiz.review.flagged', 'Flagged') : '';
          var numberLabel = _quizFill(tr('quiz.review.question_number', 'Question {number}'), { number: item.questionIdx + 1 });
          return <li key={item.questionIdx}><button type="button" data-assessment-review-question={item.questionIdx} aria-label={[numberLabel, answeredLabel, flagLabel, item.label].filter(Boolean).join('. ')} onClick={function () { goToQuestion(item.questionIdx); }} className="w-full min-h-11 flex items-center gap-3 text-left rounded-lg border border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50">
            <span aria-hidden="true" className={'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-black ' + (item.answered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900')}>{item.answered ? '✓' : '—'}</span>
            <span className="flex-grow min-w-0"><span className="block text-xs font-bold text-slate-600">{numberLabel + ' · ' + answeredLabel + (flagLabel ? ' · ' + flagLabel : '')}</span><span className="block text-sm text-slate-800 break-words">{item.label}</span></span>{item.flagged && <span aria-hidden="true" className="text-amber-700 font-black">⚑</span>}
          </button></li>;
        })}</ul>
        {visibleItems.length === 0 && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{filter === 'unanswered' ? tr('quiz.review.no_unanswered', 'Every question has a response.') : filter === 'flagged' ? tr('quiz.review.no_flags', 'No questions are flagged for review.') : tr('quiz.review.no_questions', 'There are no questions to review.')}</p>}
        {progress.reflectionTotal > 0 && <p className="mt-3 text-xs text-slate-600">{_quizFill(tr('quiz.review.reflections', 'Reflections completed: {answered} / {total}'), { answered: progress.reflectionAnswered, total: progress.reflectionTotal })}</p>}
        {confirmIncomplete && <div id="assessment-review-incomplete" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{_quizFill(tr('quiz.review.incomplete', 'Unanswered questions: {count}. Submit anyway, or return to finish them.'), { count: progress.unanswered })}</div>}
        {p.submissionError && <div ref={errorRef} data-assessment-submit-error role="alert" tabIndex={-1} className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{p.submissionError}</div>}
        <div className="sticky bottom-0 mt-5 flex items-center justify-end gap-2 flex-wrap border-t border-slate-200 bg-white pt-3">
          {!p.preview && typeof p.onDownloadDraft === 'function' && <button type="button" onClick={p.onDownloadDraft} className="min-h-11 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-900">{tr('quiz.review.download_draft', 'Download draft')}</button>}
          <button type="button" onClick={p.onClose} className="min-h-11 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold">{tr('quiz.review.keep_working', 'Keep working')}</button>
          <button type="button" onClick={requestSubmit} disabled={p.preview} aria-describedby={confirmIncomplete ? 'assessment-review-incomplete' : undefined} className={'min-h-11 px-4 py-2 rounded-lg text-white text-sm font-black ' + (confirmIncomplete ? 'bg-amber-700 hover:bg-amber-800' : 'bg-indigo-600 hover:bg-indigo-700')}>{p.preview ? tr('quiz.review.preview_disabled', 'Submission disabled in preview') : confirmIncomplete ? tr('quiz.review.submit_incomplete', 'Submit with unanswered items') : tr('quiz.review.submit', 'Submit assessment')}</button>
        </div>
      </div>
    </div>;
  }
  function AssessmentSubmittedPanel(p) {
    var receipt = p.receipt || {}, summary = receipt.summary || {}, status = p.sending ? 'sending' : receipt.delivery?.status === 'sending' ? 'pending' : receipt.delivery?.status || 'local';
    var received = status === 'received', local = !receipt.sessionCode, pending = !local && !received;
    var tr = typeof p.copy === 'function' ? p.copy : _quizPlainCopy;
    var headingRef = React.useRef(null);
    var restartErrorRef = React.useRef(null);
    var [confirmingRestart, setConfirmingRestart] = React.useState(false);
    var restartRef = React.useRef(null), confirmRef = React.useRef(null), restartAskedRef = React.useRef(false);
    React.useEffect(function () {
      try { if (headingRef.current) headingRef.current.focus(); } catch (e) {}
    }, [receipt.attemptId]);
    React.useEffect(function () {
      if (confirmingRestart) { restartAskedRef.current = true; try { if (confirmRef.current) confirmRef.current.focus(); } catch (e) {} }
      else if (restartAskedRef.current) { restartAskedRef.current = false; try { if (restartRef.current) restartRef.current.focus(); } catch (e) {} }
    }, [confirmingRestart]);
    React.useEffect(function () {
      if (p.restartError && restartErrorRef.current) {
        try { restartErrorRef.current.focus(); } catch (e) {}
      }
    }, [p.restartError]);
    return <section data-assessment-submitted aria-labelledby="assessment-submitted-title" className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-5 text-indigo-950"><h2 ref={headingRef} id="assessment-submitted-title" tabIndex={-1} className="text-xl font-black focus-visible:ring-2 focus-visible:ring-indigo-600">{tr('quiz.attempt.complete', 'Assessment complete')}</h2><p data-assessment-delivery-status role="status" aria-live="polite" className="mt-2 font-bold">{received ? tr('quiz.attempt.received', 'Received by teacher') : status === 'sending' ? tr('quiz.attempt.sending', 'Sending to teacher...') : tr('quiz.attempt.saved_device', 'Saved on this device')}</p><p className="mt-2 text-sm">{received ? tr('quiz.attempt.received_detail', 'Your teacher device confirmed receipt of the responses in this attempt.') : local ? (p.includedInSubmitWork ? tr('quiz.attempt.local_submit_work', 'Your completed responses are saved on this device and will be included when you use Submit Work.') : tr('quiz.attempt.local_detail', 'Your completed responses are saved here. No teacher delivery was requested.')) : receipt.delivery?.message || tr('quiz.attempt.pending_detail', 'Teacher receipt is not confirmed. Your completed responses are saved here.')}</p><p className="mt-3 text-sm">{_quizFill(tr('quiz.attempt.answered_count', '{answered} of {total} questions answered'), { answered: summary.answered || 0, total: summary.total || 0 })}</p><div className="mt-4 flex flex-wrap gap-2">{pending && <button type="button" onClick={p.onRetry} disabled={p.sending || !p.canRetry} className="min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{p.sending ? tr('quiz.attempt.sending_short', 'Sending...') : tr('quiz.attempt.retry', 'Retry delivery')}</button>}<button type="button" onClick={p.onDownload} className="min-h-11 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-900">{tr('quiz.attempt.download', 'Download my responses')}</button>{!pending && <button type="button" ref={restartRef} data-assessment-start-another aria-describedby={p.restartError ? 'assessment-restart-error' : undefined} aria-expanded={confirmingRestart} aria-controls={confirmingRestart ? 'assessment-restart-confirm' : undefined} onClick={function () { setConfirmingRestart(true); }} className="min-h-11 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-900">{tr('quiz.attempt.start_another', 'Start another attempt')}</button>}</div>{!pending && confirmingRestart && <div id="assessment-restart-confirm" data-assessment-restart-confirm onKeyDown={function (event) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setConfirmingRestart(false); } }} role="group" aria-labelledby="assessment-restart-confirm-text" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p id="assessment-restart-confirm-text">{tr('quiz.attempt.restart_confirm', 'Start a new attempt? This clears the responses saved on this device for this assessment. Download them first if you need a copy.')}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" ref={confirmRef} data-assessment-restart-yes onClick={function () { setConfirmingRestart(false); if (typeof p.onStartAnother === 'function') p.onStartAnother(); }} className="min-h-11 rounded-lg bg-amber-800 px-3 py-2 text-sm font-bold text-white hover:bg-amber-900">{tr('quiz.attempt.restart_yes', 'Clear and start again')}</button><button type="button" data-assessment-restart-cancel onClick={function () { setConfirmingRestart(false); }} className="min-h-11 rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-bold text-amber-950">{tr('quiz.attempt.restart_cancel', 'Keep this attempt')}</button></div></div>}{p.restartError && <p ref={restartErrorRef} id="assessment-restart-error" data-assessment-restart-error role="alert" tabIndex={-1} className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{p.restartError}</p>}{pending && !p.canRetry && <p className="mt-3 text-sm">{tr('quiz.attempt.reconnect_hint', 'Reconnect to the original class activity to retry, or download your responses to share with your teacher.')}</p>}</section>;
  }
  // Sequence Sense answer key. The author supplies one "intentionallyWrongIndex",
  // but an adjacent swap leaves BOTH items out of place, so the accepted set is
  // derived from the displayed order itself: a displayed position counts as
  // misplaced when removing it leaves the remaining items in canonical order.
  // Canonical (or missing) order -> nothing is misplaced. A scramble no single
  // removal can repair falls back to the authored index, else every position
  // (all are out of place). Returns { orderIsCorrect, misplaced: [positions] }.
  function sequenceSenseTruth(presentedOrder, intentionallyWrongIndex, itemCount) {
    var n = Number(itemCount) || 0;
    var valid = n > 0 && Array.isArray(presentedOrder) && presentedOrder.length === n
      && presentedOrder.every(function (value) { return Number.isInteger(value) && value >= 0 && value < n; })
      && new Set(presentedOrder).size === n;
    if (!valid || presentedOrder.every(function (value, index) { return value === index; })) return { orderIsCorrect: true, misplaced: [] };
    var misplaced = [];
    for (var skip = 0; skip < n; skip++) {
      var previous = -1;
      var sorted = true;
      for (var j = 0; j < n && sorted; j++) {
        if (j === skip) continue;
        if (presentedOrder[j] < previous) sorted = false;
        previous = presentedOrder[j];
      }
      if (sorted) misplaced.push(skip);
    }
    if (!misplaced.length) {
      misplaced = Number.isInteger(intentionallyWrongIndex) && intentionallyWrongIndex >= 0 && intentionallyWrongIndex < n
        ? [intentionallyWrongIndex]
        : presentedOrder.map(function (_, index) { return index; });
    }
    return { orderIsCorrect: false, misplaced: misplaced };
  }
  // "items 2 and 3 were swapped" / "item 3 was misplaced" / "items 1, 3 and 4 were out of place"
  function describeSequenceMisplaced(misplaced) {
    var numbers = (Array.isArray(misplaced) ? misplaced : []).map(function (index) { return index + 1; });
    if (!numbers.length) return 'the order was correct';
    if (numbers.length === 1) return 'item ' + numbers[0] + ' was misplaced';
    if (numbers.length === 2 && numbers[1] === numbers[0] + 1) return 'items ' + numbers[0] + ' and ' + numbers[1] + ' were swapped';
    return 'items ' + numbers.slice(0, -1).join(', ') + ' and ' + numbers[numbers.length - 1] + ' were out of place';
  }
  function _quizUseStageFocus(stage) {
    var targetRef = React.useRef(null);
    var previousStageRef = React.useRef(stage);
    React.useEffect(function () {
      if (previousStageRef.current === stage) return;
      previousStageRef.current = stage;
      if (targetRef.current && typeof targetRef.current.focus === 'function') targetRef.current.focus();
    }, [stage]);
    return targetRef;
  }
  function SequenceSenseCard(p) {
    var q = p.q;
    var shortSequence = q.sequenceMode === 'arrange-explain';
    var canonicalItems = Array.isArray(q.items) ? q.items.filter(Boolean) : [];
    var intentionallyWrongIndex = typeof q.intentionallyWrongIndex === 'number' ? q.intentionallyWrongIndex : null;
    var orderingPrinciple = q.orderingPrinciple || 'chronological';
    var principleOptions = Array.isArray(q.principleOptions) && q.principleOptions.length >= 2 ? q.principleOptions : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var conceptHint = (q.question || '') + ' — Items in canonical order: ' + canonicalItems.join(', ') + '. Ordering principle: ' + orderingPrinciple + '.';
      var prompt = 'You are a patient teacher. A ' + grade + ' student is working a sequencing item and needs help. ' + conceptHint + '\n\nGive a 60-90 word explanation in plain language: name the ordering principle, walk through one or two items as a concrete example, and end with a sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    function markIDK() {
      setIdkMarked(true);
      setStep('done');
      setGrade({
        step1Correct: false,
        step2Correct: false,
        step3Correct: false,
        status: 'idk',
        score: 0
      });
      if (aiExplainerEnabled) requestExplainer();
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'sequence-sense',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              idk: true
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    var draftItemKey = 'q-' + p.questionIdx;
    var idkState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'idk', false);
    var idkMarked = idkState[0] === true;
    var setIdkMarked = idkState[1];
    var presentedOrderState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'presentedOrder', function () {
      var authored = Array.isArray(q.presentedOrder) ? q.presentedOrder : [];
      var isPermutation = authored.length === canonicalItems.length
        && authored.every(function (value) { return Number.isInteger(value) && value >= 0 && value < canonicalItems.length; })
        && new Set(authored).size === authored.length;
      return isPermutation ? authored.slice() : canonicalItems.map(function (_, i) { return i; });
    });
    var presentedOrder = presentedOrderState[0];
    // What is actually wrong with the displayed order (see sequenceSenseTruth):
    // for a swap both swapped positions count, so the student is never marked
    // wrong for pointing at the other half of the same mistake.
    var truth = sequenceSenseTruth(presentedOrder, intentionallyWrongIndex, canonicalItems.length);
    var actualOrderIsCorrect = truth.orderIsCorrect;
    var misplacedPositions = truth.misplaced;
    var orderState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'orderAnswer', null);
    var setOrderAnswer = orderState[1];
    // The student's arrangement (canonical indices); starts as the displayed order.
    var orderAnswer = Array.isArray(orderState[0]) && orderState[0].length === presentedOrder.length ? orderState[0] : presentedOrder;
    var arrangedItems = orderAnswer.map(function (canonicalIdx) { return canonicalItems[canonicalIdx]; });
    var orderButtonRefs = React.useRef({});
    var pendingOrderFocus = React.useRef(null);
    var [orderAnnouncement, setOrderAnnouncement] = React.useState('');
    React.useEffect(function () {
      var pending = pendingOrderFocus.current;
      pendingOrderFocus.current = null;
      if (!pending) return;
      var controls = orderButtonRefs.current[pending.item] || {};
      var preferred = controls[pending.direction];
      var target = preferred && !preferred.disabled ? preferred : controls[-pending.direction];
      if (target && !target.disabled) target.focus();
    }, [orderAnswer]);
    function moveOrderItem(position, delta, preserveFocus) {
      var target = position + delta;
      if (position < 0 || position >= orderAnswer.length || target < 0 || target >= orderAnswer.length) return false;
      var next = orderAnswer.slice();
      next[position] = orderAnswer[target];
      next[target] = orderAnswer[position];
      if (preserveFocus) pendingOrderFocus.current = { item: orderAnswer[position], direction: delta };
      setOrderAnswer(next);
      setOrderAnnouncement(String(canonicalItems[orderAnswer[position]]) + ' moved to position ' + (target + 1) + ' of ' + orderAnswer.length + '.');
      return true;
    }
    var stepState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'step', shortSequence ? 3 : 1);
    var step = stepState[0];
    var setStep = stepState[1];
    var stageFocusRef = _quizUseStageFocus(step);
    var verifyState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'verifyAnswer', null);
    var verifyAnswer = verifyState[0];
    var setVerifyAnswer = verifyState[1];
    var clickedState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'clickedIdx', null);
    var clickedIdx = clickedState[0];
    var setClickedIdx = clickedState[1];
    var principleState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'principleAnswer', null);
    var principleAnswer = principleState[0];
    var setPrincipleAnswer = principleState[1];
    var gradeState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'grade', null);
    var grade = gradeState[0];
    var setGrade = gradeState[1];
    function answerVerify(ans) {
      setVerifyAnswer(ans);
      setStep(ans === 'no' ? 2 : 3);
    }
    function answerMisplaced(idx) {
      setClickedIdx(idx);
      setStep(3);
    }
    function finishArrange() {
      setStep(4);
    }
    function answerPrinciple(p2) {
      setPrincipleAnswer(p2);
      var step1Correct = verifyAnswer === 'yes' ? actualOrderIsCorrect : !actualOrderIsCorrect;
      var step2Correct;
      if (verifyAnswer === 'yes') {
        step2Correct = step1Correct;
      } else {
        step2Correct = misplacedPositions.indexOf(clickedIdx) >= 0;
      }
      var arrangeCorrect = orderAnswer.every(function (canonicalIdx, position) { return canonicalIdx === position; });
      var step3Correct = p2 === orderingPrinciple;
      var maxScore = shortSequence ? 2 : 4;
      var rawScore = (shortSequence ? 0 : (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0)) + (arrangeCorrect ? 1 : 0) + (step3Correct ? 1 : 0);
      var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
      var score = partialCredit ? rawScore : (rawScore === maxScore ? maxScore : 0);
      var status = score === maxScore ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var gradeResult = {
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        arrangeCorrect: arrangeCorrect,
        step3Correct: step3Correct,
        status: status,
        score: score, maxScore: maxScore
      };
      _quizRecordPracticeAttempt(p, { orderAnswer: orderAnswer, principleAnswer: p2 }, null);
      setGrade(gradeResult);
      setStep('done');
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'sequence-sense',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              verifyAnswer: verifyAnswer,
              clickedIdx: clickedIdx,
              orderAnswer: orderAnswer.slice(),
              principleAnswer: p2,
              score: score,
              status: status
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
      return gradeResult;
    }
    function reset() {
      setIdkMarked(false);
      setStep(shortSequence ? 3 : 1);
      setVerifyAnswer(null);
      setClickedIdx(null);
      setOrderAnswer(null);
      setOrderAnnouncement('');
      setPrincipleAnswer(null);
      setGrade(null);
    }
    _quizUseVoiceController(p, {
      getState: function () {
        var displayedItems = presentedOrder.map(function (canonicalIdx) { return canonicalItems[canonicalIdx]; }).filter(function (item) { return item != null; });
        var prompt = step === 1
          ? 'Is the displayed order correct? Say the order is correct or the order is wrong.'
          : step === 2
            ? 'Choose the misplaced item by its displayed number or exact text.'
            : step === 3
              ? 'Put the items in the correct order. Say move item 2 up or move item 3 down, then say done.'
              : step === 4
                ? 'Choose the ordering principle: ' + principleOptions.join(', ') + '.'
                : grade ? 'This sequence response has been checked. Say try again to reset it.' : '';
        return {
          type: 'sequence-sense',
          step: step,
          displayedItems: displayedItems,
          arrangedItems: arrangedItems.slice(),
          verifyAnswer: verifyAnswer,
          selectedItemIndex: typeof clickedIdx === 'number' ? clickedIdx : null,
          principleAnswer: principleAnswer,
          graded: !!grade,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: grade ? ['try-again'] : ['choose'],
          prompt: prompt
        };
      },
      execute: function (action, request) {
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Sequence response reset. Is the displayed order correct?' };
        }
        if (action !== 'choose') {
          return { ok: false, state: 'invalid-action', message: 'Use choose to answer the current sequence step.' };
        }
        if (grade || step === 'done') {
          return { ok: false, state: 'locked', message: 'This sequence response has already been checked. Say try again to reset it.' };
        }
        var choice = request && (request.choice != null ? request.choice : (request.value != null ? request.value : request.response));
        if (step === 1) {
          var normalized = String(choice == null ? '' : choice).trim().toLowerCase().replace(/[?!.,]+$/g, '');
          var verify = /^(?:yes|correct|right|the order is correct|the order is right)$/.test(normalized)
            ? 'yes'
            : /^(?:no|wrong|incorrect|the order is wrong|the order is incorrect|the order is not correct)$/.test(normalized) ? 'no' : '';
          if (!verify) return { ok: false, state: 'invalid-choice', message: 'Say the order is correct or the order is wrong.' };
          answerVerify(verify);
          return {
            ok: true, state: 'sequence-step', step: verify === 'no' ? 2 : 3,
            message: verify === 'no'
              ? 'Order marked wrong. Choose the misplaced item by its displayed number or exact text.'
              : 'Order marked correct. Put the items in the correct order, or say done to keep them as they are.'
          };
        }
        if (step === 2) {
          var displayed = presentedOrder.map(function (canonicalIdx) { return canonicalItems[canonicalIdx]; });
          var itemIdx = _quizVoiceNamedChoiceIndex(choice, displayed);
          if (itemIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available displayed item by number or exact text.' };
          answerMisplaced(itemIdx);
          return { ok: true, state: 'sequence-step', step: 3, selectedItemIndex: itemIdx, message: 'Item ' + (itemIdx + 1) + ' selected. Now put the items in the correct order: say move item 2 up or move item 3 down, then say done.' };
        }
        if (step === 3) {
          var arrangeText = String(choice == null ? '' : choice).trim().toLowerCase().replace(/[?!.,]+$/g, '').replace(/\s+/g, ' ');
          if (/^(?:done|finished|confirm|keep|next|the order is right|that is the order)$/.test(arrangeText)) {
            finishArrange();
            return { ok: true, state: 'sequence-step', step: 4, message: 'Order saved. Choose the ordering principle: ' + principleOptions.join(', ') + '.' };
          }
          var move = /^move\s+(?:item\s+)?(.+?)\s+(up|down)$/.exec(arrangeText);
          var movePosition = move ? _quizVoiceNamedChoiceIndex(move[1], arrangedItems) : -1;
          if (!move || movePosition < 0) return { ok: false, state: 'invalid-choice', message: 'Say move item 2 up, move item 3 down, or done.' };
          if (!moveOrderItem(movePosition, move[2] === 'up' ? -1 : 1)) return { ok: false, state: 'invalid-choice', message: 'Item ' + (movePosition + 1) + ' cannot move ' + move[2] + '.' };
          return { ok: true, state: 'sequence-step', step: 3, message: 'Moved ' + arrangedItems[movePosition] + ' ' + move[2] + '. Say done when the order is right.' };
        }
        var principleIdx = _quizVoiceNamedChoiceIndex(choice, principleOptions);
        if (step !== 4 || principleIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available ordering principle by number or exact name.' };
        var result = answerPrinciple(principleOptions[principleIdx]);
        var resultMessage = result.status === 'correct'
          ? 'Sequence response checked. All four parts are correct.'
          : result.status === 'partially-correct'
            ? 'Sequence response checked. You earned ' + result.score + ' of 4 points.'
            : 'Sequence response checked. This sequence needs review.';
        return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
      }
    });
    var stageAnnouncement = step === 1 ? 'Step 1 of 4. Is this order correct?' : step === 2 ? 'Step 2 of 4. Choose an item that is out of place.' : step === 3 ? (shortSequence ? 'Step 1 of 2. Arrange the items using the Move up and Move down buttons, then choose Done arranging.' : 'Step 3 of 4. Arrange the items using the Move up and Move down buttons, then choose Done arranging.') : step === 4 ? (shortSequence ? 'Step 2 of 2. Choose the ordering principle.' : 'Step 4 of 4. Choose the ordering principle.') : '';
    if (canonicalItems.length === 0) return null;
    var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><p data-assessment-step-status role="status" aria-live="polite" aria-atomic="true" className="sr-only">{stageAnnouncement}</p><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Sequence Sense</span><p className="text-sm text-slate-800 leading-relaxed">{_quizRich(q.question || 'Below is a sequence. Verify and explain.')}</p><AssessmentQuestionSupport q={q} /></div></div><ol className="space-y-1.5 mb-3">{presentedOrder.map(function (canonicalIdx, displayIdx) {
          var item = canonicalItems[canonicalIdx];
          var isClickable = step === 2;
          var isClicked = clickedIdx === displayIdx;
          var showCorrectness = grade !== null;
          var thisIsActuallyMisplaced = misplacedPositions.indexOf(displayIdx) >= 0;
          var rowClass;
          if (showCorrectness) {
            if (thisIsActuallyMisplaced) rowClass = 'bg-amber-50 border-amber-400';else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';else rowClass = 'bg-slate-50 border-slate-300';
          } else if (isClicked) {
            rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
          } else {
            rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
          }
          return <li key={displayIdx} ref={isClickable && displayIdx === 0 ? stageFocusRef : null} onClick={isClickable ? function () {
            answerMisplaced(displayIdx);
          } : null} className={'flex items-center gap-2 px-3 py-2 rounded-lg border ' + rowClass} role={isClickable ? 'button' : undefined} tabIndex={isClickable ? 0 : undefined} onKeyDown={isClickable ? function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              answerMisplaced(displayIdx);
            }
          } : undefined}><span className="flex-shrink-0 text-xs font-bold text-slate-600 w-6">{displayIdx + 1 + '.'}</span><AssessmentChoiceContent q={q} field="items" index={canonicalIdx} text={item} />{showCorrectness && thisIsActuallyMisplaced && <span className="text-xs font-bold text-amber-700">↔ misplaced</span>}{showCorrectness && isClicked && !thisIsActuallyMisplaced && <span className="text-xs font-bold text-rose-700">✗</span>}</li>;
        })}</ol>{step === 1 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">Step 1 of 4 — Is this order correct?</div><div className="flex gap-2 flex-wrap"><button type="button" ref={stageFocusRef} onClick={function () {
            answerVerify('yes');
          }} className="flex-1 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold transition-colors motion-reduce:transition-none">✓ Yes, correct</button><button type="button" onClick={function () {
            answerVerify('no');
          }} className="flex-1 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors motion-reduce:transition-none">✗ No, something is off</button>{allowIDK && <button type="button" onClick={markIDK} className="px-3 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title={t("tooltips.skip_ai_explain")}><span aria-hidden="true">🤔 </span>{_quizGradedCopy('ui_common.i_dont_know', "I don't know")}</button>}</div></div>}{step === 2 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900">Step 2 of 4 — Click an item that's out of place above.</div></div>}{shortSequence && step === 3 && allowIDK && <button type="button" onClick={markIDK} className="mb-2 min-h-9 rounded border border-sky-300 bg-sky-50 px-3 text-sky-900">I don’t know</button>}{step === 3 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">{shortSequence ? 'Step 1 of 2 — Arrange the items.' : 'Step 3 of 4 — Put the items in the correct order. If they are already right, leave them.'}</div><p data-assessment-order-status role="status" aria-live="polite" aria-atomic="true" className="sr-only">{orderAnnouncement}</p><ol className="space-y-1.5 mb-2" aria-label="Your order">{orderAnswer.map(function (canonicalIdx, position) {
            return <li key={canonicalIdx} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white border-indigo-200"><span className="flex-shrink-0 text-xs font-bold text-slate-600 w-6">{position + 1 + '.'}</span><AssessmentChoiceContent q={q} field="items" index={canonicalIdx} /><button type="button" ref={function (node) { var controls = orderButtonRefs.current[canonicalIdx] || (orderButtonRefs.current[canonicalIdx] = {}); controls[-1] = node; }} disabled={position === 0} aria-label={'Move up: ' + _quizPlain(canonicalItems[canonicalIdx])} onClick={function () {
              moveOrderItem(position, -1, true);
            }} className="px-2 py-1 rounded border border-indigo-300 bg-white text-xs font-bold text-indigo-800 disabled:opacity-40">▲</button><button type="button" ref={function (node) { var controls = orderButtonRefs.current[canonicalIdx] || (orderButtonRefs.current[canonicalIdx] = {}); controls[1] = node; if (position === 0) stageFocusRef.current = node; }} disabled={position === orderAnswer.length - 1} aria-label={'Move down: ' + _quizPlain(canonicalItems[canonicalIdx])} onClick={function () {
              moveOrderItem(position, 1, true);
            }} className="px-2 py-1 rounded border border-indigo-300 bg-white text-xs font-bold text-indigo-800 disabled:opacity-40">▼</button></li>;
          })}</ol><button type="button" ref={orderAnswer.length < 2 ? stageFocusRef : null} onClick={finishArrange} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors motion-reduce:transition-none">Done arranging</button></div>}{step === 4 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">{shortSequence ? 'Step 2 of 2 — Identify the ordering principle.' : "Step 4 of 4 — What's the ordering principle?"}</div><div className="grid grid-cols-2 md:grid-cols-3 gap-2">{principleOptions.map(function (opt) {
            return <button key={opt} type="button" ref={principleOptions.indexOf(opt) === 0 ? stageFocusRef : null} onClick={function () {
              answerPrinciple(opt);
            }} className="px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors motion-reduce:transition-none"><AssessmentChoiceContent q={q} field="principleOptions" index={principleOptions.indexOf(opt)} text={opt} /></button>;
          })}</div></div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-2 flex-wrap"><span ref={stageFocusRef} tabIndex={-1} data-assessment-stage-result className={'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / ' + (shortSequence ? 2 : 4) + ' — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review')}</span></div>{grade.status !== 'idk' && <ul className={'space-y-1 text-sm text-' + statusColor + '-900'}>{!shortSequence && <li>{(grade.step1Correct ? '✓ ' : '✗ ') + 'Verify: ' + (actualOrderIsCorrect ? 'order was correct' : describeSequenceMisplaced(misplacedPositions)) + (grade.step1Correct ? '' : ' (you said "' + verifyAnswer + '")')}</li>}{!shortSequence && verifyAnswer === 'no' && <li>{(grade.step2Correct ? '✓ ' : '✗ ') + 'Diagnose: ' + (grade.step2Correct ? 'you found a misplaced item' : (actualOrderIsCorrect ? 'nothing was misplaced' : describeSequenceMisplaced(misplacedPositions) + (misplacedPositions.length > 1 ? ' (either one counts)' : '')))}</li>}<li>{(grade.arrangeCorrect ? '✓ ' : '✗ ') + 'Arrange: ' + (grade.arrangeCorrect ? 'your order matched' : 'correct order is ' + canonicalItems.join(' → '))}</li><li>{(grade.step3Correct ? '✓ ' : '✗ ') + 'Principle: ' + (grade.step3Correct ? '"' + orderingPrinciple + '"' : 'correct answer was "' + orderingPrinciple + '" (you picked "' + principleAnswer + '")')}</li></ul>}<div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={reset} className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">Try again</button>{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">🤖 Explain this concept</button>}</div></div>}{explainer.open && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <div className="text-sm text-slate-800 leading-relaxed">{_quizRichBlock(explainer.text)}</div>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          // p.callTTS returns the audio URL without playing — never wired up
          // a playback step here, so the original button silently fetched and
          // discarded the audio. Route through AlloSpeechPlayer instead: it
          // plays, respects mute, allows click-stop, and toasts on failure.
          try {
            if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_quizPlain(explainer.text));
            else p.callTTS(_quizPlain(explainer.text));
          } catch (e) {}
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>;
  }
  function RelationMismatchCard(p) {
    var q = p.q;
    var pairs = Array.isArray(q.pairs) ? q.pairs.filter(function (pr) {
      return pr && pr.left && pr.right;
    }) : [];
    var wrongPairIndex = typeof q.wrongPairIndex === 'number' ? q.wrongPairIndex : 0;
    var correctPartnerForWrong = q.correctPartnerForWrong || '';
    var candidatePartners = Array.isArray(q.candidatePartners) ? q.candidatePartners : [];
    var draftItemKey = 'q-' + p.questionIdx;
    var [explanation, setExplanation] = _quizUseDraftField(p.draftNamespace, draftItemKey, 'explanation', '');
    var idkState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'idk', false);
    var idkMarked = idkState[0] === true;
    var setIdkMarked = idkState[1];
    var stepState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'step', 1);
    var step = stepState[0];
    var setStep = stepState[1];
    var stageFocusRef = _quizUseStageFocus(step);
    var clickedPairState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'clickedPairIdx', null);
    var clickedPairIdx = clickedPairState[0];
    var setClickedPairIdx = clickedPairState[1];
    var partnerAnswerState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'partnerAnswer', null);
    var partnerAnswer = partnerAnswerState[0];
    var setPartnerAnswer = partnerAnswerState[1];
    var gradeState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'grade', null);
    var grade = gradeState[0];
    var setGrade = gradeState[1];
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var leftSide = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';
      var conceptHint = (q.question || '') + ' — The correct relationship is "' + leftSide + '" ↔ "' + correctPartnerForWrong + '".';
      var prompt = 'You are a patient teacher. A ' + grade + ' student is working a relation-mismatch item and needs help. ' + conceptHint + '\n\nGive a 60-90 word explanation in plain language: name what makes this relationship correct, and contrast it with the wrong pair the student saw. End with a sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    function markIDK() {
      setIdkMarked(true);
      setStep('done');
      setGrade({
        step1Correct: false,
        step2Correct: false,
        status: 'idk',
        score: 0
      });
      if (aiExplainerEnabled) requestExplainer();
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'relation-mismatch',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              idk: true
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    function answerWhichWrong(idx) {
      setClickedPairIdx(idx);
      setStep(2);
    }
    function answerPartner(ans) {
      if (q.requireReasoning && !explanation.trim()) return null;
      setPartnerAnswer(ans);
      var step1Correct = clickedPairIdx === wrongPairIndex;
      var step2Correct = ans === correctPartnerForWrong;
      var rawScore = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0);
      var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
      var score = partialCredit ? rawScore : (rawScore === 2 ? 2 : 0);
      var status = score === 2 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var gradeResult = {
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        status: status,
        score: score
      };
      _quizRecordPracticeAttempt(p, { clickedPairIdx: clickedPairIdx, partnerAnswer: ans, explanation: explanation }, null);
      setGrade(gradeResult);
      setStep('done');
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'relation-mismatch',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              clickedPairIdx: clickedPairIdx,
              partnerAnswer: ans, explanation: explanation,
              score: score,
              status: status
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
      return gradeResult;
    }
    function reset() {
      setIdkMarked(false);
      setStep(1);
      setClickedPairIdx(null);
      setPartnerAnswer(null);
      setGrade(null);
    }
    _quizUseVoiceController(p, {
      getState: function () {
        var partnerOptions = candidatePartners.length > 0 ? candidatePartners.slice() : [correctPartnerForWrong];
        var prompt = step === 1
          ? 'Choose the mismatched pair by number or by saying its exact left and right text.'
          : step === 2
            ? 'Choose the replacement partner: ' + partnerOptions.join(', ') + '.'
            : grade ? 'This relation response has been checked. Say try again to reset it.' : '';
        return {
          type: 'relation-mismatch',
          step: step,
          pairs: pairs.map(function (pair) { return { left: String(pair.left), right: String(pair.right) }; }),
          selectedPairIndex: typeof clickedPairIdx === 'number' ? clickedPairIdx : null,
          partnerOptions: step === 2 ? partnerOptions : [],
          partnerAnswer: partnerAnswer, explanation: explanation,
          graded: !!grade,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: grade ? ['try-again'] : ['choose'],
          prompt: prompt
        };
      },
      execute: function (action, request) {
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Relation response reset. Choose the mismatched pair.' };
        }
        if (action !== 'choose') {
          return { ok: false, state: 'invalid-action', message: 'Use choose to answer the current relation step.' };
        }
        if (grade || step === 'done') {
          return { ok: false, state: 'locked', message: 'This relation response has already been checked. Say try again to reset it.' };
        }
        var choice = request && (request.choice != null ? request.choice : (request.value != null ? request.value : request.response));
        if (step === 1) {
          var pairNames = pairs.map(function (pair) { return String(pair.left) + ' with ' + String(pair.right); });
          var pairIdx = _quizVoiceNamedChoiceIndex(choice, pairNames);
          if (pairIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available pair by number or exact pair text.' };
          answerWhichWrong(pairIdx);
          var options = candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong];
          return { ok: true, state: 'relation-step', step: 2, selectedPairIndex: pairIdx, message: 'Pair ' + (pairIdx + 1) + ' selected. Choose the replacement partner: ' + options.join(', ') + '.' };
        }
        var partnerOptions = candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong];
        var partnerIdx = _quizVoiceNamedChoiceIndex(choice, partnerOptions);
        if (step !== 2 || partnerIdx < 0) return { ok: false, state: 'invalid-choice', message: 'Choose an available replacement partner by number or exact name.' };
        if (q.requireReasoning && !explanation.trim()) return { ok: false, state: 'incomplete', message: 'Add your explanation in the labeled field before choosing a replacement.' };
        var result = answerPartner(partnerOptions[partnerIdx]);
        var resultMessage = result.status === 'correct'
          ? 'Relation response checked. Both parts are correct.'
          : result.status === 'partially-correct'
            ? 'Relation response checked. You earned ' + result.score + ' of 2 points.'
            : 'Relation response checked. Both parts need review.';
        return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
      }
    });
    var stageAnnouncement = step === 1 ? 'Step 1 of 2. Choose the mismatched pair.' : step === 2 ? 'Step 2 of 2. Choose the replacement partner.' + (q.requireReasoning ? ' First, enter the required explanation.' : q.explanationPrompt ? ' You may also enter an explanation.' : '') : '';
    if (pairs.length === 0) return null;
    var statusColor = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade ? 'rose' : 'slate';
    var wrongPairLeft = pairs[wrongPairIndex] ? pairs[wrongPairIndex].left : '';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><p data-assessment-step-status role="status" aria-live="polite" aria-atomic="true" className="sr-only">{stageAnnouncement}</p><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Relation Mismatch</span><p className="text-sm text-slate-800 leading-relaxed">{_quizRich(q.question || 'One of these pairs is wrong. Find it and fix it.')}</p><AssessmentQuestionSupport q={q} /></div></div><div className="space-y-1.5 mb-3">{pairs.map(function (pair, idx) {
          var isClickable = step === 1;
          var isClicked = clickedPairIdx === idx;
          var thisIsActuallyWrong = idx === wrongPairIndex;
          var showCorrectness = grade !== null;
          var rowClass;
          if (showCorrectness) {
            if (thisIsActuallyWrong) rowClass = 'bg-amber-50 border-amber-400';else if (isClicked) rowClass = 'bg-rose-50 border-rose-400';else rowClass = 'bg-slate-50 border-slate-300';
          } else if (isClicked) {
            rowClass = 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300';
          } else {
            rowClass = 'bg-slate-50 border-slate-300' + (isClickable ? ' hover:bg-slate-100 cursor-pointer' : '');
          }
          return <div key={idx} ref={isClickable && idx === 0 ? stageFocusRef : null} onClick={isClickable ? function () {
            answerWhichWrong(idx);
          } : null} className={'grid grid-cols-2 gap-3 px-3 py-2 rounded-lg border ' + rowClass} role={isClickable ? 'button' : undefined} tabIndex={isClickable ? 0 : undefined} onKeyDown={isClickable ? function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              answerWhichWrong(idx);
            }
          } : undefined}><span className="text-sm font-semibold text-slate-800"><AssessmentPairSide q={q} index={idx} side="left" /></span><span className="text-sm text-slate-700 flex items-center justify-between gap-2"><span className="flex min-w-0 flex-1 items-start gap-2"><span aria-hidden="true">↔</span><AssessmentPairSide q={q} index={idx} side="right" /></span>{showCorrectness && thisIsActuallyWrong && <span className="text-xs font-bold text-amber-700 flex-shrink-0">wrong</span>}{showCorrectness && isClicked && !thisIsActuallyWrong && <span className="text-xs font-bold text-rose-700 flex-shrink-0">✗</span>}</span></div>;
        })}</div>{step === 1 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="flex items-center justify-between gap-2 flex-wrap"><div className="text-sm font-semibold text-indigo-900">Step 1 of 2 — Click the pair that's wrong above.</div>{allowIDK && <button type="button" onClick={markIDK} className="px-2 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title={t("tooltips.skip_ai_explain")}><span aria-hidden="true">🤔 </span>{t("ui_common.i_dont_know")}</button>}</div></div>}{step === 2 && <AssessmentReasoningInput inputRef={stageFocusRef} q={q} itemNumber={p.itemNumber} questionIdx={p.questionIdx} value={explanation} onChange={setExplanation} />}{step === 2 && <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200"><div className="text-sm font-semibold text-indigo-900 mb-2">{'Step 2 of 2 — Which item should "' + (clickedPairIdx !== null && pairs[clickedPairIdx] ? pairs[clickedPairIdx].left : wrongPairLeft) + '" have been paired with?'}</div><div className="grid grid-cols-2 gap-2">{(candidatePartners.length > 0 ? candidatePartners : [correctPartnerForWrong]).map(function (cand, candidateIndex) {
            return <button key={cand} type="button" ref={!q.requireReasoning && !q.explanationPrompt && candidateIndex === 0 ? stageFocusRef : null} disabled={!!q.requireReasoning && !explanation.trim()} onClick={function () {
              answerPartner(cand);
            }} className="px-3 py-2 rounded-lg bg-white hover:bg-indigo-50 border border-indigo-300 hover:border-indigo-500 text-sm font-semibold text-slate-800 transition-colors motion-reduce:transition-none"><AssessmentChoiceContent q={q} field="candidatePartners" index={candidatePartners.indexOf(cand)} text={cand} /></button>;
          })}</div></div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300'} role="status" aria-live="polite"><div className="flex items-center gap-2 mb-2 flex-wrap"><span ref={stageFocusRef} tabIndex={-1} data-assessment-stage-result className={'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900'}>{grade.status === 'idk' ? '🤔 Marked "I don\'t know"' : grade.score + ' / 2 — ' + (grade.status === 'correct' ? 'All correct' : grade.status === 'partially-correct' ? 'Partial' : 'Needs review')}</span></div>{grade.status !== 'idk' && <ul className={'space-y-1 text-sm text-' + statusColor + '-900'}><li>{(grade.step1Correct ? '✓ ' : '✗ ') + 'Find: ' + (grade.step1Correct ? 'you spotted the wrong pair' : 'the wrong pair was "' + wrongPairLeft + ' ↔ ' + (pairs[wrongPairIndex] ? pairs[wrongPairIndex].right : '') + '"')}</li><li>{(grade.step2Correct ? '✓ ' : '✗ ') + 'Fix: ' + (grade.step2Correct ? 'correct partner — "' + correctPartnerForWrong + '"' : 'correct partner was "' + correctPartnerForWrong + '" (you picked "' + partnerAnswer + '")')}</li></ul>}<div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={reset} className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">Try again</button>{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">🤖 Explain this concept</button>}</div></div>}{explainer.open && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <div className="text-sm text-slate-800 leading-relaxed">{_quizRichBlock(explainer.text)}</div>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          // p.callTTS returns the audio URL without playing — never wired up
          // a playback step here, so the original button silently fetched and
          // discarded the audio. Route through AlloSpeechPlayer instead: it
          // plays, respects mute, allows click-stop, and toasts on failure.
          try {
            if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_quizPlain(explainer.text));
            else p.callTTS(_quizPlain(explainer.text));
          } catch (e) {}
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>;
  }
  function McqEnhancements(p) {
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
    if (!allowIDK && !allowConfidence && !aiExplainerEnabled) return null;
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    var idkState = React.useState(function () { return _quizReadDraftField(p.draftNamespace, 'q-' + p.questionIdx, 'idk').value === true; });
    var idkMarked = idkState[0];
    var setIdkMarked = idkState[1];
    React.useEffect(function () {
      function changed(event) {
        if (event.type === 'storage' ? event.key !== p.draftNamespace : event.detail?.namespace !== p.draftNamespace) return;
        if (_quizDraftWriteState[p.draftNamespace]?.reason !== 'conflict') setIdkMarked(_quizReadDraftField(p.draftNamespace, 'q-' + p.questionIdx, 'idk').value === true);
      }
      window.addEventListener('alloflow:assessment-draft-changed', changed);
      window.addEventListener('alloflow:assessment-draft-synced', changed);
      window.addEventListener('storage', changed);
      return function () { window.removeEventListener('alloflow:assessment-draft-changed', changed); window.removeEventListener('alloflow:assessment-draft-synced', changed); window.removeEventListener('storage', changed); };
    }, [p.draftNamespace, p.questionIdx]);
    var localConfidenceState = React.useState(null);
    var hasParentConfidence = typeof p.onSetConfidence === 'function';
    var confidence = hasParentConfidence ? p.currentConfidence : localConfidenceState[0];
    var setConfidence = hasParentConfidence ? p.onSetConfidence : localConfidenceState[1];
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var conceptHint = p.q && (p.q.question || p.q.correctAnswer) || '';
      var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept. Question or concept: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    function markIDK() {
      setIdkMarked(true);
      _quizWriteDraftField(p.draftNamespace, 'q-' + p.questionIdx, 'idk', true);
      if (aiExplainerEnabled) requestExplainer();
      if (typeof p.onSubmitLiveAnswer === 'function' && typeof p.questionIdx === 'number') {
        try {
          p.onSubmitLiveAnswer({
            questionIdx: p.questionIdx,
            itemType: 'mcq',
            conceptLabel: p.q && p.q.conceptLabel || '',
            answer: {
              idk: true
            },
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    return <div className="mt-3 ml-9 space-y-2"><div data-assessment-option-feedback-status role="status" aria-live="polite" aria-atomic="true">{p.feedbackShown && !idkMarked && Array.isArray(p.q?.optionFeedback) && p.q.optionFeedback[p.selectedOptionIdx] && <p data-assessment-option-feedback className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">{_quizRich(p.q.optionFeedback[p.selectedOptionIdx])}</p>}</div>{p.feedbackShown && !idkMarked && <><AssessmentPracticeHistory {...p} /><AssessmentTransferPractice {...p} /></>}{(aiExplainerEnabled || allowIDK) && <div className="flex items-center gap-2 flex-wrap">{aiExplainerEnabled && !explainer.open && <button type="button" onClick={requestExplainer} className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors motion-reduce:transition-none" aria-label={t("a11y.explain_concept")} title={t("tooltips.quick_ai_explanation")}><span aria-hidden="true">🤖 </span>{t("ui_common.explain_concept_action")}</button>}{allowIDK && !idkMarked && <button type="button" onClick={markIDK} className="text-xs font-semibold px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title="Skip without penalty."><span aria-hidden="true">🤔 </span>{_quizGradedCopy('ui_common.i_dont_know', "I don't know")}</button>}{idkMarked && <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-sky-200 text-sky-900">Marked "I don't know"</span>}</div>}{explainer.open && <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <div className="text-sm text-slate-800 leading-relaxed">{_quizRichBlock(explainer.text)}</div>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
          // Route through AlloSpeechPlayer for mute respect / click-stop / toast.
          if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_quizPlain(explainer.text));
          else p.callTTS(_quizPlain(explainer.text));
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}{allowConfidence && <div className="flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">{_quizGradedCopy('quiz.student.confidence_before', 'Before checking: how sure are you?')}</span>{['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = {
            knew: _quizGradedCopy('quiz.student.confidence_know_now', 'I know this'),
            guessed: _quizGradedCopy('quiz.student.confidence_unsure_now', 'I am unsure'),
            'no-idea': _quizGradedCopy('quiz.student.confidence_need_support', 'I need support')
          };
          var active = confidence === lvl;
          return <button key={lvl} type="button" aria-pressed={active} disabled={!!p.feedbackShown || idkMarked} onClick={function () {
            if (!p.feedbackShown && !idkMarked) setConfidence(lvl);
          }} className={'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[lvl]}</button>;
        })}</div>}</div>;
  }
  function AssessmentItemAnalysisPanel(p) {
    var analysis = p.analysis || {};
    var items = Array.isArray(analysis.items) ? analysis.items : [];
    var openState = React.useState(false);
    var open = openState[0];
    var setOpen = openState[1];
    var handoffState = React.useState(false);
    var handoffOpen = handoffState[0];
    var setHandoffOpen = handoffState[1];
    var handoffBusyState = React.useState(false);
    var handoffBusy = handoffBusyState[0];
    var setHandoffBusy = handoffBusyState[1];
    var handoffFeedbackState = React.useState('');
    var handoffFeedback = handoffFeedbackState[0];
    var setHandoffFeedback = handoffFeedbackState[1];
    var handoffDialogRef = React.useRef(null);
    var handoffTriggerRef = React.useRef(null);
    var hasRespondentItems = items.length > 0 && items.some(function (item) {
      return item.respondents > 0;
    });
    React.useEffect(function () {
      if (!handoffOpen) return undefined;
      if (!hasRespondentItems) {
        setHandoffOpen(false);
        setHandoffFeedback('');
        return undefined;
      }
      var restore = _quizIsolateDialog(handoffDialogRef.current);
      if (handoffDialogRef.current && typeof handoffDialogRef.current.focus === 'function') {
        handoffDialogRef.current.focus();
      }
      return restore;
    }, [handoffOpen, hasRespondentItems]);
    if (!hasRespondentItems) return null;
    function closeAlloSheetReview() {
      if (handoffBusy) return;
      setHandoffOpen(false);
      setHandoffFeedback('');
      window.setTimeout(function () {
        if (handoffTriggerRef.current && typeof handoffTriggerRef.current.focus === 'function') {
          handoffTriggerRef.current.focus();
        }
      }, 0);
    }
    function openAlloSheetReview(event) {
      handoffTriggerRef.current = event && event.currentTarget || null;
      setHandoffFeedback('');
      setHandoffOpen(true);
    }
    function confirmAlloSheetReview() {
      if (handoffBusy || typeof p.onOpenAlloSheet !== 'function') return;
      var module = window.AlloModules && window.AlloModules.QuizLiveAggregators;
      if (!module || typeof module.buildQuizAlloSheetEnvelope !== 'function') {
        setHandoffFeedback('Quiz item analysis is still loading. Try again in a moment.');
        return;
      }
      var envelope;
      try {
        envelope = module.buildQuizAlloSheetEnvelope(
          p.quizState || {},
          p.generatedContent,
          p.roster || {},
          {
            aiGradedCache: p.aiGradedCache || {},
            teacherOverrides: p.teacherOverrides || {},
            mode: p.mode,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error) {
        setHandoffFeedback(error && error.message || 'Quiz item analysis could not prepare a bounded table.');
        return;
      }
      setHandoffBusy(true);
      setHandoffFeedback('Opening AlloSheet and waiting for secure receipt…');
      var pending;
      try {
        pending = p.onOpenAlloSheet(envelope);
      } catch (error) {
        pending = Promise.reject(error);
      }
      Promise.resolve(pending).then(function (opened) {
        if (opened === false || opened == null) throw new Error('AlloSheet did not open.');
        setHandoffBusy(false);
        setHandoffFeedback('');
        setHandoffOpen(false);
        window.setTimeout(function () {
          if (handoffTriggerRef.current && typeof handoffTriggerRef.current.focus === 'function') {
            handoffTriggerRef.current.focus();
          }
        }, 0);
      }).catch(function (error) {
        setHandoffBusy(false);
        setHandoffFeedback(error && error.message || 'AlloSheet could not receive the reviewed item analysis.');
      });
    }
    function downloadCsv() {
      var rows = [['Question', 'Type', 'Responses', 'Gradable', 'Correct %', 'Omitted', 'IDK', 'Signal', 'Flags']];
      items.forEach(function (item) {
        rows.push([item.questionIdx + 1, item.type, item.respondents, item.gradableCount, item.correctRate == null ? '' : item.correctRate, item.omittedCount, item.idkCount, item.signalLabel, (item.flags || []).join('; ')]);
      });
      var csv = rows.map(function (row) { return row.map(function (cell) { var s = String(cell == null ? '' : cell); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','); }).join('\n');
      try {
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'assessment-item-analysis-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {}
    }
    return <section className="mt-5 rounded-xl border-2 border-cyan-200 bg-cyan-50 p-4" aria-labelledby="item-analysis-heading"><div className="flex items-start justify-between gap-3 flex-wrap"><div><h4 id="item-analysis-heading" className="font-black text-cyan-950">Item analysis</h4><p className="text-xs text-cyan-900 mt-1">Difficulty, omissions, confidence mismatches, and MCQ choice patterns. Flags wait for at least 5 responses.</p></div><div className="flex gap-2 flex-wrap">{typeof p.onOpenAlloSheet === 'function' && <button type="button" ref={handoffTriggerRef} onClick={openAlloSheetReview} aria-haspopup="dialog" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-700 text-white border border-indigo-800">Open in AlloSheet</button>}<button type="button" onClick={downloadCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-cyan-300 text-cyan-900">Export CSV</button><button type="button" onClick={function () { setOpen(!open); }} aria-expanded={open} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-800 text-white">{open ? 'Hide details' : 'Review items'}</button></div></div>{open && <div className="space-y-3 mt-4">{items.map(function (item) {
      if (item.respondents === 0) return <div key={item.questionIdx} className="rounded-lg border border-slate-200 bg-white p-3"><div className="text-xs font-black text-slate-700">{'Q' + (item.questionIdx + 1) + ' · No responses yet'}</div><p className="text-sm text-slate-600 mt-1">{item.questionText}</p></div>;
      var rateColor = item.correctRate == null ? 'slate' : item.correctRate < 40 ? 'rose' : item.correctRate > 85 ? 'emerald' : 'indigo';
      return <article key={item.questionIdx} className="rounded-lg border border-cyan-200 bg-white p-3"><div className="flex items-start gap-3"><div className="flex-grow min-w-0"><div className="text-[10px] uppercase font-black tracking-wider text-slate-500">{'Q' + (item.questionIdx + 1) + ' · ' + item.type}</div><p className="text-sm font-semibold text-slate-800 mt-1">{item.questionText}</p></div><div className={'rounded-lg px-3 py-2 text-center bg-' + rateColor + '-50 text-' + rateColor + '-900 border border-' + rateColor + '-200'}><div className="text-lg font-black">{item.unscored ? 'Unscored' : item.correctRate == null ? '—' : item.correctRate + '%'}</div><div className="text-[9px] uppercase font-bold">{item.unscored ? 'distribution' : 'correct'}</div></div></div><div className="flex gap-2 flex-wrap mt-3 text-[11px]"><span className="rounded-full bg-slate-100 text-slate-700 px-2 py-1 font-bold">{item.respondents + ' responses'}</span><span className="rounded-full bg-slate-100 text-slate-700 px-2 py-1 font-bold">{item.omittedCount + ' omitted'}</span>{item.idkCount > 0 && <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-1 font-bold">{item.idkCount + ' IDK'}</span>}<span className={'rounded-full px-2 py-1 font-bold ' + (item.smallSample ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800')}>{item.signalLabel}</span></div>{Array.isArray(item.options) && item.options.length > 0 && <div className="space-y-1.5 mt-3">{item.options.map(function (option) {
        var distributionRespondents = item.distributionRespondents == null ? item.respondents : item.distributionRespondents;
        var width = distributionRespondents > 0 ? Math.round(option.count / distributionRespondents * 100) : 0;
        return <div key={option.optionIdx} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 text-xs"><span className={'font-black ' + (!item.unscored && option.correct ? 'text-emerald-700' : 'text-slate-600')}>{String.fromCharCode(65 + option.optionIdx)}</span><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={!item.unscored && option.correct ? 'h-full bg-emerald-500' : item.unscored ? 'h-full bg-purple-500' : 'h-full bg-cyan-500'} style={{ width: width + '%' }} /></div><span className="text-slate-600 tabular-nums">{option.count + ' · ' + width + '%'}</span></div>;
      })}</div>}{item.flags && item.flags.length > 0 && <ul className="mt-3 space-y-1">{item.flags.map(function (flag, idx) { return <li key={idx} className="text-xs rounded bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1">{'⚑ ' + flag}</li>; })}</ul>}{item.smallSample && !item.unscored && <p className="text-[10px] text-slate-500 mt-2">Early signal only—no quality flag is assigned until 5 learners respond.</p>}</article>;
    })}</div>}{handoffOpen && <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/75 p-4" role="presentation"><div ref={handoffDialogRef} role="dialog" aria-modal="true" aria-labelledby="quiz-allosheet-review-title" aria-describedby="quiz-allosheet-review-summary quiz-allosheet-review-privacy" aria-busy={handoffBusy} tabIndex={-1} onKeyDown={function (event) { _quizHandleDialogKeyDown(event, handoffDialogRef, function () { if (!handoffBusy) closeAlloSheetReview(); }); }} className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border-4 border-indigo-300 bg-white p-5 text-slate-900 shadow-2xl"><h3 id="quiz-allosheet-review-title" className="text-xl font-black text-indigo-950">Review Quiz item analysis for AlloSheet</h3><p id="quiz-allosheet-review-summary" className="mt-2 text-sm text-slate-700">This creates one aggregate table with up to 100 item rows. It includes question number, item type, response and scoring counts, correct rate, sample status, and bounded signal codes.</p><p id="quiz-allosheet-review-privacy" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><strong>Excluded:</strong> learner names and IDs, question and option wording, raw answers, reflections, AI feedback, session codes, resource IDs, and cohort arrays. Signal codes remain blank until at least five learners respond. The transfer cannot enable AI or write back to Quiz.</p><div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3"><h4 className="text-sm font-black text-slate-900">Fields sent</h4><p className="mt-1 text-xs text-slate-700">Question number; item type; unscored status; respondents; omitted, gradable, correct, partial, incorrect, IDK, awaiting-review, and high-confidence-incorrect counts; correct-rate percent; sample status; signal codes.</p><p className="mt-2 text-xs font-semibold text-slate-700">{items.length + ' authored item' + (items.length === 1 ? '' : 's') + ' available for bounded aggregate review.'}</p></div>{handoffFeedback && <p className={'mt-3 rounded-lg p-3 text-sm font-semibold ' + (handoffBusy ? 'bg-indigo-50 text-indigo-900' : 'bg-rose-50 text-rose-900')} role={handoffBusy ? 'status' : 'alert'} aria-live="polite">{handoffFeedback}</p>}<div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={closeAlloSheetReview} disabled={handoffBusy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">Cancel</button><button type="button" onClick={confirmAlloSheetReview} disabled={handoffBusy} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{handoffBusy ? 'Waiting for AlloSheet…' : 'Confirm and open AlloSheet'}</button></div></div></div>}</section>;
  }  function LiveResultsDashboard(p) {
    var aggsMod = window.AlloModules && window.AlloModules.QuizLiveAggregators;
    var sessionData = p.sessionData || {};
    var quizState = sessionData.quizState || {};
    var generatedContent = p.generatedContent;
    var roster = sessionData.roster || {};
    var mode = generatedContent && generatedContent.data && generatedContent.data.mode || 'exit-ticket';
    var modeLabel = generatedContent && generatedContent.data && generatedContent.data.modeLabel || 'Exit Ticket';
    var modeIcon = generatedContent && generatedContent.data && generatedContent.data.modeIcon || '📝';
    var appId = p.appId;
    function dashboardCopy(key, fallback) { var value = t(key); return !value || value === key ? fallback : value; }
    var conceptMasteryState = React.useState(null);
    var conceptMasteryByUid = conceptMasteryState[0];
    var setConceptMasteryByUid = conceptMasteryState[1];
    var reflectionsExpandedState = React.useState(true);
    var reflectionsExpanded = reflectionsExpandedState[0];
    var setReflectionsExpanded = reflectionsExpandedState[1];
    var rosterKeysSig = Object.keys(roster).sort().join(',');
    // FERPA refit 2026-07-01: mastery now arrives as a prop from the shell
    // (live peer-to-peer snapshots + project-file imports; device-local
    // model). The Firestore fetch below survives ONLY as a legacy fallback
    // for older shells that don't pass the prop.
    var propMastery = p.conceptMasteryByUid;
    React.useEffect(function () {
      if (mode !== 'review') {
        setConceptMasteryByUid(null);
        return;
      }
      if (propMastery !== undefined && propMastery !== null) {
        setConceptMasteryByUid(propMastery);
        return;
      }
      var fb = window.__alloFirebase;
      if (!fb || !fb.doc || !fb.getDoc || !appId) {
        setConceptMasteryByUid({});
        return;
      }
      var uids = Object.keys(roster);
      if (uids.length === 0) {
        setConceptMasteryByUid({});
        return;
      }
      var cancelled = false;
      Promise.all(uids.map(function (uid) {
        try {
          var ref = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'conceptMastery', uid);
          return fb.getDoc(ref).then(function (snap) {
            return [uid, snap.exists() ? snap.data() : null];
          }).catch(function () {
            return [uid, null];
          });
        } catch (e) {
          return Promise.resolve([uid, null]);
        }
      })).then(function (results) {
        if (cancelled) return;
        var map = {};
        results.forEach(function (entry) {
          if (entry && entry[1]) map[entry[0]] = entry[1];
        });
        setConceptMasteryByUid(map);
      }).catch(function () {
        if (!cancelled) setConceptMasteryByUid({});
      });
      return function () {
        cancelled = true;
      };
    }, [mode, rosterKeysSig, appId, propMastery]);
    // Keep the aggregator's uid:index interface, but only expose grades for
    // the current activity, authored criteria, and exact submitted response.
    var aiGradedState = React.useState({});
    var aiGradeEntries = aiGradedState[0];
    var setAiGradeEntries = aiGradedState[1];
    var aiGradedInFlightRef = React.useRef({});
    var aiGradeMountedRef = React.useRef(true);
    var retryGradingState = React.useState(0);
    var gradingData = generatedContent && generatedContent.data || {};
    var teacherReviewOnly = gradingData.scoringPolicy && gradingData.scoringPolicy.writtenResponseMode === 'teacher-review';
    var gradingScope = JSON.stringify([p.activeSessionCode || '', quizState.activityId || '', generatedContent && generatedContent.id || '', p.gradeLevel || '', teacherReviewOnly]);
    var gradingItems = {};
    if (!teacherReviewOnly) Object.keys(quizState.allResponses || {}).forEach(function (uid) {
      var perStudent = quizState.allResponses[uid] || {};
      Object.keys(perStudent).forEach(function (qKey) {
        if (!/^\d+$/.test(qKey)) return;
        var qIdx = Number(qKey), q = (gradingData.questions || [])[qIdx], response = perStudent[qKey];
        if (!q || !response || !response.answer || response.answer.idk || response.answered === false) return;
        var type = q.type || response.itemType;
        if (type !== 'short-answer' && type !== 'self-explanation') return;
        var text = typeof response.answer.text === 'string' ? response.answer.text : '';
        if (!text.trim()) return;
        var key = uid + ':' + qIdx;
        gradingItems[key] = { key: key, q: q, text: text, signature: JSON.stringify([gradingScope, q, response.answer]) };
      });
    });
    var gradingItemsSig = JSON.stringify(Object.keys(gradingItems).map(function (key) { return [key, gradingItems[key].signature]; }));
    var currentGradingItemsRef = React.useRef(gradingItems);
    currentGradingItemsRef.current = gradingItems;
    var aiGradedCache = {}, gradingFailures = [], inFlightCount = 0;
    Object.keys(gradingItems).forEach(function (key) {
      var entry = aiGradeEntries[key];
      if (!entry || entry.signature !== gradingItems[key].signature) return;
      if (entry.pending) inFlightCount++;
      else if (entry.result && entry.result.status === 'error') gradingFailures.push(key);
      else if (entry.result) aiGradedCache[key] = entry.result;
    });
    React.useEffect(function () {
      aiGradeMountedRef.current = true;
      return function () { aiGradeMountedRef.current = false; aiGradedInFlightRef.current = {}; };
    }, []);
    React.useEffect(function () {
      var aiHelpers = window.AlloModules && window.AlloModules.QuizAIHelpers;
      Object.keys(aiGradedInFlightRef.current).forEach(function (key) {
        if (!gradingItems[key] || gradingItems[key].signature !== aiGradedInFlightRef.current[key].signature) delete aiGradedInFlightRef.current[key];
      });
      if (teacherReviewOnly || !aiHelpers || typeof aiHelpers.gradeFreeformAnswer !== 'function' || typeof p.callGemini !== 'function') return;
      var pending = Object.keys(gradingItems).map(function (key) { return gradingItems[key]; }).filter(function (item) {
        var entry = aiGradeEntries[item.key], request = aiGradedInFlightRef.current[item.key];
        return !(entry && entry.signature === item.signature && !entry.pending) && !(request && request.signature === item.signature);
      });
      if (!pending.length) return;
      pending.forEach(function (item) { aiGradedInFlightRef.current[item.key] = item; });
      setAiGradeEntries(function (previous) {
        var next = Object.assign({}, previous);
        pending.forEach(function (item) { next[item.key] = { signature: item.signature, pending: true }; });
        return next;
      });
      pending.forEach(function (item) {
        Promise.resolve().then(function () {
          var current = currentGradingItemsRef.current[item.key];
          if (!aiGradeMountedRef.current || !current || current.signature !== item.signature || aiGradedInFlightRef.current[item.key] !== item) return null;
          return aiHelpers.gradeFreeformAnswer({
            question: item.q.question || item.q.contextSentence || '',
            expectedAnswer: [item.q.rubric ? 'Rubric: ' + item.q.rubric : '', item.q.expectedAnswer || item.q.exemplarAnswer || item.q.expectedFill || ''].filter(Boolean).join('\n'),
            studentResponse: item.text,
            gradeLevel: p.gradeLevel,
            callGemini: p.callGemini
          });
        }).catch(function (error) {
          return { status: 'error', feedback: error && error.message || 'Grader failed.' };
        }).then(function (result) {
          var current = currentGradingItemsRef.current[item.key];
          if (!aiGradeMountedRef.current || !current || current.signature !== item.signature || aiGradedInFlightRef.current[item.key] !== item) return;
          delete aiGradedInFlightRef.current[item.key];
          setAiGradeEntries(function (previous) {
            var latest = currentGradingItemsRef.current[item.key];
            if (!aiGradeMountedRef.current || !latest || latest.signature !== item.signature) return previous;
            return Object.assign({}, previous, { [item.key]: { signature: item.signature, result: result || { status: 'error', feedback: 'No grade was returned. Try again.' } } });
          });
        });
      });
    }, [gradingItemsSig, p.callGemini, retryGradingState[0]]);
    function retryFailedGrading() {
      setAiGradeEntries(function (previous) {
        var next = Object.assign({}, previous);
        gradingFailures.forEach(function (key) { delete next[key]; });
        return next;
      });
      retryGradingState[1](function (value) { return value + 1; });
    }
    var expandedRowsState = React.useState({});
    var expandedRows = expandedRowsState[0];
    var setExpandedRows = expandedRowsState[1];
    function toggleRowExpanded(uid) {
      setExpandedRows(function (prev) {
        var next = Object.assign({}, prev);
        if (next[uid]) delete next[uid];else next[uid] = true;
        return next;
      });
    }
    var expandedBarsState = React.useState({});
    var expandedBars = expandedBarsState[0];
    var setExpandedBars = expandedBarsState[1];
    function toggleBarExpanded(qIdx) {
      setExpandedBars(function (prev) {
        var next = Object.assign({}, prev);
        if (next[qIdx]) delete next[qIdx];else next[qIdx] = true;
        return next;
      });
    }
    function confidenceChip(confidence, status) {
      if (!confidence) return null;
      var labels = {
        knew: 'knew',
        guessed: 'guessed',
        'no-idea': 'no idea'
      };
      var color = 'slate';
      var note = '';
      if (status === 'correct') {
        if (confidence === 'guessed') {
          color = 'amber';
          note = ' (lucky)';
        } else if (confidence === 'no-idea') {
          color = 'rose';
          note = ' (?)';
        }
      } else if (status === 'incorrect' || status === 'partially-correct') {
        if (confidence === 'knew') {
          color = 'rose';
          note = ' (overconfident)';
        } else if (confidence === 'no-idea') {
          color = 'sky';
          note = '';
        }
      }
      var bgClass = color === 'amber' ? 'bg-amber-100 text-amber-800' : color === 'rose' ? 'bg-rose-100 text-rose-800' : color === 'sky' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700';
      return <span className={'flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ' + bgClass} title={'Student rated: ' + labels[confidence] + note}>{'🎯 ' + labels[confidence]}</span>;
    }
    var explainerModalState = React.useState({
      open: false,
      conceptIdx: null,
      conceptText: '',
      loading: false,
      text: '',
      error: ''
    });
    var explainerModal = explainerModalState[0];
    var setExplainerModal = explainerModalState[1];
    var prevFocusRef = React.useRef(null);
    var explainerCloseBtnRef = React.useRef(null);
    var explainerDialogRef = React.useRef(null);
    function openExplainer(conceptIdx, conceptText) {
      try {
        prevFocusRef.current = document.activeElement;
      } catch (e) {}
      setExplainerModal({
        open: true,
        conceptIdx: conceptIdx,
        conceptText: conceptText,
        loading: true,
        text: '',
        error: ''
      });
      runExplainerCall(conceptText);
    }
    function runExplainerCall(conceptText) {
      if (typeof p.callGemini !== 'function') {
        setExplainerModal(function (prev) {
          return Object.assign({}, prev, {
            loading: false,
            error: 'Explainer unavailable: callGemini not provided.'
          });
        });
        return;
      }
      var grade = p.gradeLevel || 'middle school';
      var prompt = 'You are explaining a concept to ' + grade + ' students who do not yet understand it. They just took a pre-check and got it wrong as a class. Write a 60-90 word explainer that: (1) names the concept clearly, (2) gives ONE concrete relatable example, (3) avoids jargon, (4) reads aloud naturally. Plain text only. No markdown, no fences, no headers.\n\nCONCEPT (from the pre-check question that the class missed):\n"' + String(conceptText || '').slice(0, 400) + '"\n\nReturn ONLY the explainer text.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = typeof raw === 'object' && raw && raw.text ? raw.text : String(raw || '');
        txt = txt.replace(/^```(?:[a-z]+)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        setExplainerModal(function (prev) {
          return Object.assign({}, prev, {
            loading: false,
            text: txt,
            error: ''
          });
        });
      }).catch(function (err) {
        setExplainerModal(function (prev) {
          return Object.assign({}, prev, {
            loading: false,
            error: err && err.message || 'Explainer call failed.'
          });
        });
      });
    }
    function closeExplainer() {
      setExplainerModal({
        open: false,
        conceptIdx: null,
        conceptText: '',
        loading: false,
        text: '',
        error: ''
      });
      setPushState({
        pushing: false,
        pushed: false,
        error: ''
      });

    }
    React.useEffect(function () {
      if (!explainerModal.open) return;
      var raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(function () {
        try {
          if (explainerCloseBtnRef.current) explainerCloseBtnRef.current.focus();
          else if (explainerDialogRef.current) explainerDialogRef.current.focus();
        } catch (e) {}
      }) : setTimeout(function () {
        try {
          if (explainerCloseBtnRef.current) explainerCloseBtnRef.current.focus();
          else if (explainerDialogRef.current) explainerDialogRef.current.focus();
        } catch (e) {}
      }, 0);
      return function () {
        if (typeof cancelAnimationFrame === 'function' && raf) {
          try { cancelAnimationFrame(raf); } catch (e) {}
        } else if (typeof clearTimeout === 'function') {
          clearTimeout(raf);
        }
        var previous = prevFocusRef.current;
        prevFocusRef.current = null;
        try {
          if (previous && previous.isConnected !== false && typeof previous.focus === 'function') previous.focus();
        } catch (e) {}
      };
    }, [explainerModal.open]);
    function copyExplainer() {
      if (!explainerModal.text) return;
      try {
        if (window.alloCopyText) { window.alloCopyText(explainerModal.text); } else { navigator.clipboard.writeText(explainerModal.text); }
      } catch (e) {}
    }
    function playExplainer() {
      if (!explainerModal.text || typeof p.callTTS !== 'function') return;
      try {
        if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_quizPlain(explainerModal.text));
        else p.callTTS(_quizPlain(explainerModal.text));
      } catch (e) {}
    }
    var pushStateState = React.useState({
      pushing: false,
      pushed: false,
      error: ''
    });
    var pushState = pushStateState[0];
    var setPushState = pushStateState[1];
    function pushExplainerToStudents() {
      if (!explainerModal.text || pushState.pushing) return;
      var fb = window.__alloFirebase;
      if (!fb || !fb.db || !fb.doc || !fb.updateDoc || !appId || !p.activeSessionCode) {
        setPushState({
          pushing: false,
          pushed: false,
          error: 'Push unavailable: live session not active.'
        });
        return;
      }
      setPushState({
        pushing: true,
        pushed: false,
        error: ''
      });
      try {
        var sessionRef = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'sessions', p.activeSessionCode);
        Promise.resolve(fb.updateDoc(sessionRef, {
          'quizState.classExplainer': {
            conceptIdx: explainerModal.conceptIdx,
            conceptText: explainerModal.conceptText,
            text: explainerModal.text,
            ts: Date.now()
          }
        })).then(function () {
          setPushState({
            pushing: false,
            pushed: true,
            error: ''
          });
        }).catch(function (err) {
          setPushState({
            pushing: false,
            pushed: false,
            error: err && err.message || 'Push failed.'
          });
        });
      } catch (e) {
        setPushState({
          pushing: false,
          pushed: false,
          error: e && e.message || 'Push failed.'
        });
      }
    }
    var teacherOverrides = quizState && quizState.teacherOverrides || {};
    function setTeacherOverride(uid, qIdx, newStatus) {
      var fb = window.__alloFirebase;
      if (!fb || !fb.db || !fb.doc || !fb.updateDoc || !fb.deleteField || !appId || !p.activeSessionCode) return;
      var sessionRef = fb.doc(fb.db, 'artifacts', appId, 'public', 'data', 'sessions', p.activeSessionCode);
      var path = 'quizState.teacherOverrides.' + uid + '.' + qIdx;
      var update = {};
      if (newStatus == null) {
        update[path] = fb.deleteField();
      } else {
        var reviewedQuestion = generatedContent && generatedContent.data && generatedContent.data.questions && generatedContent.data.questions[qIdx];
        var reviewedResponse = quizState && quizState.allResponses && quizState.allResponses[uid] && quizState.allResponses[uid][qIdx];
        var responseFingerprint = aggsMod.assessmentResponseFingerprint && aggsMod.assessmentResponseFingerprint(reviewedQuestion, reviewedResponse);
        if (!responseFingerprint) return;
        update[path] = {
          status: newStatus,
          ts: Date.now(),
          responseFingerprint: responseFingerprint
        };
      }
      try {
        fb.updateDoc(sessionRef, update);
      } catch (e) {}
    }
    if (!aggsMod) return null;
    var aggResult;
    try {
      aggResult = aggsMod.aggregateForMode(mode, quizState, generatedContent, roster, conceptMasteryByUid, aiGradedCache, teacherOverrides);
    } catch (e) {
      console.warn('[LiveResultsDashboard] aggregator failed:', e);
      return null;
    }
    if (!aggResult || !aggResult.data) return null;
    var data = aggResult.data;
    var variant = aggResult.variant;
    var itemAnalysis = { items: [] };
    try {
      if (typeof aggsMod.aggregateItemAnalysis === 'function') itemAnalysis = aggsMod.aggregateItemAnalysis(quizState, generatedContent, roster, aiGradedCache, teacherOverrides);
    } catch (e) {
      console.warn('[LiveResultsDashboard] item analysis failed:', e);
    }
    // Share an anonymous per-question aggregate to every connected student
    // over the P2P quiz channel (shell hook; nothing stored, no names).
    var canShareResults = typeof window !== 'undefined' && typeof window.__alloQuizShareResults === 'function'
      && (variant === 'liveHeatmap') && Array.isArray(data.bars) && data.bars.some(function (b) { return b.totalPossible > 0 && !b.unscored; });
    var shareResultsToClass = function () {
      var items = data.bars.filter(function (b) { return b.totalPossible > 0 && !b.unscored; }).map(function (b) {
        return {
          label: 'Q' + (b.questionIdx + 1) + ' — ' + String(b.questionText || '').slice(0, 70),
          count: _quizFill(dashboardCopy('quiz.live_points_ratio', '{earned}/{possible} points'), { earned: b.totalEarned, possible: b.totalPossible }),
          percent: b.scorePercent
        };
      });
      var ok = window.__alloQuizShareResults({ title: t('quiz.shared_results_title') || 'How the class did', items: items });
      if (window.AlloFlowUX) window.AlloFlowUX.toast(ok ? (t('quiz.results_shared') || 'Anonymous results shared with the class.') : (t('quiz.results_share_failed') || 'Could not share — no students connected.'), ok ? 'success' : 'error');
    };
    var header = <div className="flex items-center gap-2 mb-3 flex-wrap"><span className="text-2xl" aria-hidden="true">{modeIcon}</span><h3 className="font-black text-lg text-slate-800">{'Live Results — ' + modeLabel}</h3><span className="text-xs text-slate-600">{data.totalStudents + ' student' + (data.totalStudents === 1 ? '' : 's') + ' · ' + data.totalQuestions + ' question' + (data.totalQuestions === 1 ? '' : 's')}</span>{inFlightCount > 0 && <span className={'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 animate-pulse ' + quizreducedMotionClass} role="status" aria-live="polite" aria-label={'AI grading ' + inFlightCount + ' open response' + (inFlightCount === 1 ? '' : 's')} title={inFlightCount + ' open-response answer' + (inFlightCount === 1 ? '' : 's') + ' being graded by AI'}><span aria-hidden="true">✨ </span>{'AI grading ' + inFlightCount + '…'}</span>}{gradingFailures.length > 0 && <span className="flex items-center gap-2 text-xs text-amber-900" role="status"><span>{_quizFill(dashboardCopy('quiz.live_grading_failed', 'AI grading unavailable. Awaiting retry: {count}.'), { count: gradingFailures.length })}</span><button type="button" onClick={retryFailedGrading} className="min-h-9 rounded border border-amber-300 bg-amber-50 px-2 py-1 font-bold hover:bg-amber-100">{dashboardCopy('quiz.live_grading_retry', 'Retry AI grading')}</button></span>}{canShareResults && <button type="button" onClick={shareResultsToClass} className="ml-auto text-xs font-bold px-3 py-1 rounded-full border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition-colors motion-reduce:transition-none" title={t('quiz.share_results_tooltip') || 'Send anonymous per-question results to every connected student (peer-to-peer, nothing stored)'} aria-label={t('quiz.share_results_aria') || 'Share anonymous results with the class'}><span aria-hidden="true">📢 </span>{t('quiz.share_results_btn') || 'Share anonymous results'}</button>}</div>;
    var hasAnyResponses = false;
    if (variant === 'gradebook') {
      hasAnyResponses = data.studentRows.some(function (r) {
        return r.totalAnswered > 0;
      });
    } else if (variant === 'preLessonGap') {
      hasAnyResponses = data.conceptCards.some(function (c) {
        return c.totalAnswered > 0;
      });
    } else if (variant === 'retentionCurve') {
      hasAnyResponses = Array.isArray(data.conceptRows) && data.conceptRows.some(function (row) {
        return row.students.some(function (s) {
          return s.seen;
        });
      });
    } else {
      hasAnyResponses = data.bars.some(function (b) {
        return b.total > 0;
      });
    }
    if (!hasAnyResponses) {
      return <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 mb-4">{header}<p className="text-sm text-slate-600 italic">Waiting for student responses. Results will appear here as students submit answers in this live session.</p></div>;
    }
    var body;
    if (variant === 'gradebook') {
      var csvEscape = function (v) {
        var s = v == null ? '' : String(v);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };
      var buildGradebookCsv = function () {
        var questions = generatedContent && generatedContent.data && generatedContent.data.questions || [];
        var header = ['Student', 'Attempt status', 'Answered', 'Correct', 'IDK', 'Earned points', 'Possible points', 'Score %'];
        questions.forEach(function (_, idx) {
          header.push('Q' + (idx + 1) + ' Status', 'Q' + (idx + 1) + ' Answer', 'Q' + (idx + 1) + ' Confidence', 'Q' + (idx + 1) + ' AI Feedback');
        });
        var lines = [header.map(csvEscape).join(',')];
        data.studentRows.forEach(function (row) {
          var pct = row.scorePercent;
          var line = [row.displayName, row.attemptStatus || 'not-started', row.totalAnswered, row.totalCorrect, row.totalIdk, row.totalEarned, row.totalPossible, pct == null ? 'Unscored' : pct + '%'];
          for (var i = 0; i < questions.length; i++) {
            var cell = row.byQuestion[i];
            if (!cell) {
              line.push('', '', '', '');
            } else {
              line.push(cell.status || '', cell.answerSummary || '', cell.confidence || '', cell.aiFeedback || '');
            }
          }
          lines.push(line.map(csvEscape).join(','));
        });
        return '﻿' + lines.join('\r\n');
      };
      var exportCsv = function () {
        try {
          var csv = buildGradebookCsv();
          var blob = new Blob([csv], {
            type: 'text/csv;charset=utf-8;'
          });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          var d = new Date();
          var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          a.href = url;
          a.download = 'quiz-gradebook-' + stamp + '-' + (mode || 'exit-ticket') + '.csv';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () {
            URL.revokeObjectURL(url);
          }, 100);
        } catch (e) {}
      };
      var statusBadge = function (cell) {
        if (!cell) return <span className="text-slate-600" title={t("tooltips.no_response")}>—</span>;
        if (cell.status === 'no-response') return <span className="text-slate-600" title="No answer">—</span>;
        if (cell.status === 'correct') return <span className="text-emerald-600" title={cell.aiGraded ? 'AI-graded correct' : 'Correct'}>✓</span>;
        if (cell.status === 'incorrect') return <span className="text-rose-600" title={cell.aiGraded ? 'AI-graded incorrect' : 'Incorrect'}>✗</span>;
        if (cell.status === 'idk') return <span className="text-sky-600" title={t("tooltips.marked_unknown")}>🤔</span>;
        if (cell.status === 'partially-correct') return <span className="text-amber-600" title={t("tooltips.partially_correct")}>◐</span>;
        return <span className="text-slate-600" title={t("tooltips.submitted_ungraded")}>·</span>;
      };
      body = <div><div className="flex items-center justify-end mb-2"><button type="button" onClick={exportCsv} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 transition-colors motion-reduce:transition-none" aria-label={t("a11y.export_gradebook_csv")} data-help-key="quiz_csv_export_btn" title={t("tooltips.download_gradebook_csv")}><span aria-hidden="true">📥 </span>{t("ui_common.export_csv")}</button></div><div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr className="bg-slate-100"><th scope="col" className="w-7 px-1 py-1.5" aria-label={t("a11y.expand_row")} /><th scope="col" className="text-left px-2 py-1.5 font-bold text-slate-700">Student</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">Attempt</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">Answered</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">{dashboardCopy('quiz.live_score', 'Score')}</th><th scope="col" className="text-center px-2 py-1.5 font-bold text-slate-700">IDK</th></tr></thead><tbody>{data.studentRows.map(function (row) {
                var pct = row.scorePercent;
                var isExpanded = !!expandedRows[row.uid];
                var canExpand = row.totalAnswered > 0;
                var summaryRow = <tr key={row.uid + ':summary'} className={'border-t border-slate-200 ' + (canExpand ? 'cursor-pointer hover:bg-indigo-50/40' : '')} onClick={canExpand ? function () {
                  toggleRowExpanded(row.uid);
                } : undefined}><td className="text-center px-1 py-1.5">{canExpand ? <button type="button" aria-expanded={isExpanded} aria-label={(isExpanded ? 'Collapse' : 'Expand') + ' ' + row.displayName + ' details'} className="text-slate-600 hover:text-indigo-600 transition-colors motion-reduce:transition-none text-xs font-mono" onClick={function (e) {
                      e.stopPropagation();
                      toggleRowExpanded(row.uid);
                    }}>{isExpanded ? '▼' : '▶'}</button> : <span className="text-slate-600 text-xs">·</span>}</td><th scope="row" className="px-2 py-1.5 text-left font-medium text-slate-800">{row.displayName}</th><td className="text-center px-2 py-1.5"><span className={'text-[10px] font-black uppercase px-2 py-0.5 rounded ' + (row.attemptStatus === 'submitted' ? 'bg-emerald-100 text-emerald-800' : row.attemptStatus === 'in-progress' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600')}>{row.attemptStatus === 'submitted' ? 'Submitted' : row.attemptStatus === 'in-progress' ? 'In progress' : 'Not started'}</span></td><td className="text-center px-2 py-1.5"><span className="text-xs font-mono text-slate-600">{row.totalAnswered + ' / ' + data.totalQuestions}</span></td><td className="text-center px-2 py-1.5" title={_quizFill(dashboardCopy('quiz.live_fully_correct', '{count} fully correct'), { count: row.totalCorrect })}>{row.totalPossible > 0 ? <span className={'text-xs font-bold px-2 py-0.5 rounded ' + (pct >= 80 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')}>{row.totalEarned + ' / ' + row.totalPossible + ' (' + pct + '%)'}</span> : row.totalUnscored > 0 ? <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">Unscored</span> : <span className="text-xs text-slate-600">—</span>}</td><td className="text-center px-2 py-1.5">{row.totalIdk > 0 ? <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">{row.totalIdk}</span> : <span className="text-xs text-slate-600">0</span>}</td></tr>;
                if (!isExpanded) return summaryRow;
                var detailRow = <tr key={row.uid + ':detail'} className="border-t border-slate-100 bg-indigo-50/30"><td colSpan={6} className="px-3 py-3"><div className="space-y-2">{row.byQuestion.map(function (cell, qIdx) {
                        var qNum = qIdx + 1;
                        var qSnippet = cell && cell.questionText ? cell.questionText.slice(0, 90) + (cell.questionText.length > 90 ? '…' : '') : 'Question ' + qNum;
                        var versionReview = cell && (cell.versionMismatch || cell.versionUnverified);
                        var border = !cell ? 'border-slate-200 bg-white' : cell.status === 'correct' ? 'border-emerald-200 bg-emerald-50/50' : cell.status === 'incorrect' ? 'border-rose-200 bg-rose-50/50' : cell.status === 'idk' ? 'border-sky-200 bg-sky-50/50' : 'border-slate-200 bg-white';
                        return <div key={qIdx} className={'p-2 rounded border ' + border}><div className="flex items-start gap-2 mb-1"><span className="text-base mt-0.5 leading-none">{statusBadge(cell)}</span><div className="flex-grow min-w-0"><p className="text-xs font-semibold text-slate-700 mb-0.5">{'Q' + qNum + '. ' + qSnippet}</p>{cell && cell.answerSummary ? <p className="text-xs text-slate-800 break-words"><span className="text-slate-600">Answered: </span>{cell.answerSummary}</p> : !cell && <p className="text-xs italic text-slate-600">No response yet</p>}</div>{cell && cell.aiGraded && <span role="group" className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800" aria-label={'Graded by AI as ' + cell.aiStatus} title={'Graded by AI (' + cell.aiStatus + ')'}><span aria-hidden="true">✨ </span>AI</span>}{cell && cell.teacherOverridden && <span role="group" className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800" aria-label={'Teacher override applied, was previously ' + (cell.priorStatus || 'unknown')} title={'Teacher override (was: ' + (cell.priorStatus || '?') + ')'}><span aria-hidden="true">🖊 </span>Teacher</span>}{cell && confidenceChip(cell.confidence, cell.status)}</div>{cell && cell.aiFeedback && <p className="text-[11px] italic text-indigo-900 bg-indigo-50/60 border border-indigo-100 rounded px-2 py-1 mt-1">"{cell.aiFeedback}"</p>}{cell && cell.teacherOverrideExpired && <p role="status" data-assessment-override-expired className="mt-1 text-xs text-amber-900">{dashboardCopy("quiz.live_override_expired", "This teacher override was for an earlier response or answer key. Review the current response.")}</p>}{versionReview && <p role="status" data-assessment-version-review className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">{cell.versionMismatch ? dashboardCopy('quiz.live_question_version_changed', 'Question version changed; review the original response.') : dashboardCopy('quiz.live_question_version_unavailable', 'Question version unavailable; review the original response.')}</p>}{cell && !cell.unscored && !versionReview && p.activeSessionCode && <div className="mt-1 flex items-center gap-1 flex-wrap" data-help-key="quiz_teacher_override_row"><span className="text-xs text-slate-700 font-semibold mr-1">Override:</span>{[{
                              s: 'correct',
                              icon: '✓',
                              color: 'emerald',
                              label: 'correct'
                            }, {
                              s: 'incorrect',
                              icon: '✗',
                              color: 'rose',
                              label: 'incorrect'
                            }, {
                              s: 'partially-correct',
                              icon: '◐',
                              color: 'amber',
                              label: 'partially correct'
                            }].map(function (opt) {
                              var isActive = cell.teacherOverridden && cell.status === opt.s;
                              return <button key={opt.s} type="button" onClick={function (e) {
                                e.stopPropagation();
                                setTeacherOverride(row.uid, qIdx, isActive ? null : opt.s);
                              }} className={'text-xs font-bold w-6 h-6 rounded transition-colors motion-reduce:transition-none ' + (isActive ? 'bg-' + opt.color + '-600 text-white border border-' + opt.color + '-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-' + opt.color + '-50 hover:border-' + opt.color + '-300')} aria-label={'Override status to ' + opt.label + (isActive ? ' (currently set, click to undo)' : '')} aria-pressed={isActive} title={'Set status to ' + opt.s + (isActive ? ' (click again to undo)' : '')}><span aria-hidden="true">{opt.icon}</span></button>;
                            })}{cell.teacherOverridden && <button type="button" onClick={function (e) {
                              e.stopPropagation();
                              setTeacherOverride(row.uid, qIdx, null);
                            }} className="text-xs font-bold px-2 h-6 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-100" aria-label={t("a11y.remove_teacher_override")} title={t("tooltips.remove_teacher_override")}><span aria-hidden="true">↺ </span>undo</button>}</div>}</div>;
                      })}</div></td></tr>;
                return [summaryRow, detailRow];
              })}</tbody></table></div></div>;
    } else if (variant === 'preLessonGap') {
      body = <div className="space-y-2">{data.conceptCards.map(function (card) {
          var color = card.totalAnswered === 0 ? 'slate' : card.unscored ? 'purple' : card.scorePercent == null ? 'slate' : card.scorePercent >= 80 ? 'emerald' : card.scorePercent >= 50 ? 'amber' : 'rose';
          var urgency = card.totalAnswered === 0 ? 'No responses yet' : card.unscored ? 'Unscored poll' : card.scorePercent == null ? dashboardCopy('quiz.live_no_scores', 'No scored responses') : card.coverageStatus !== 'complete-coverage' ? 'Early signal — keep collecting responses' : card.scorePercent < 50 ? 'Consider prerequisite support' : card.scorePercent < 80 ? 'Review this prerequisite together' : 'Responses suggest readiness';
          var showExplainBtn = !card.unscored && card.totalPossible > 0 && card.scorePercent < 80 && typeof p.callGemini === 'function';
          return <div key={card.questionIdx} className={'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'}><div className="flex items-start justify-between gap-3 mb-1"><span className={'text-xs font-bold uppercase tracking-wider text-' + color + '-800'}>{urgency}</span>{card.totalAnswered > 0 && <span className={'text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-200 text-' + color + '-900'}>{card.unscored ? card.totalAnswered + ' responses' : card.scorePercent == null ? 'Unscored' : _quizFill(dashboardCopy('quiz.live_score_percent', '{percent}% of points'), { percent: card.scorePercent })}</span>}</div><p className="text-sm text-slate-800 mb-2">{card.conceptText}</p><p data-assessment-readiness-coverage className="text-xs text-slate-700 mb-2">{card.totalAnswered + ' of ' + (card.expectedCount || data.totalStudents || 0) + ' learners responded; ' + (card.evaluatedCount || 0) + ' evaluated; ' + (card.awaitingReviewCount || 0) + ' awaiting review. Scores describe evaluated responses only.'}</p><div className={'flex items-center gap-3 text-xs text-' + color + '-900'}>{!card.unscored && <><span>{card.correctCount + ' ✓'}</span>{card.partialCount > 0 && <span>{_quizFill(dashboardCopy('quiz.live_partial_count', '{count} partially correct'), { count: card.partialCount })}</span>}<span>{card.incorrectCount + ' ✗'}</span></>}{card.unscored && <span>Distribution only — no right answer</span>}{card.idkCount > 0 && <span className="text-sky-700">{card.idkCount + ' 🤔'}</span>}<span className="text-slate-600">{'· ' + card.totalAnswered + ' / ' + data.totalStudents + ' students'}</span>{showExplainBtn && <button type="button" onClick={function () {
                openExplainer(card.questionIdx, card.conceptText);
              }} className="ml-auto inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors motion-reduce:transition-none" aria-label={t("a11y.explain_to_class")} data-help-key="quiz_explain_to_class_btn" title={t("tooltips.generate_concept_explainer")}><span aria-hidden="true">🎓 </span>{t("ui_common.explain_to_class")}</button>}</div></div>;
        })}</div>;
    } else if (variant === 'retentionCurve') {
      body = <div className="space-y-3"><p className="text-xs text-slate-600 italic mb-1">Cross-session retention. Concepts with longer time-since-last-attempt or unseen students surface first. Recent attempts shown as colored dots (green=correct, red=miss, sky=IDK).</p>{data.conceptRows.map(function (row) {
          var sortedStudents = row.students.slice().sort(function (a, b) {
            if (!a.seen && b.seen) return -1;
            if (a.seen && !b.seen) return 1;
            if (!a.seen && !b.seen) return 0;
            return (b.daysSinceLast || 0) - (a.daysSinceLast || 0);
          });
          var color = row.unseenCount > 0 ? 'rose' : row.maxDaysSinceLast >= 14 ? 'rose' : row.maxDaysSinceLast >= 7 ? 'amber' : 'emerald';
          return <div key={row.conceptId} className={'p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-200'}><div className="flex items-center gap-2 mb-2"><span className={'text-xs font-bold uppercase tracking-wider text-' + color + '-800'}>{row.label}</span><span className={'ml-auto text-[10px] text-' + color + '-700'}>{row.unseenCount > 0 ? row.unseenCount + ' unseen · ' : ''}{'max ' + row.maxDaysSinceLast + 'd since seen'}</span></div><div className="space-y-1">{sortedStudents.map(function (s) {
                var dayBadgeColor = !s.seen ? 'rose' : s.daysSinceLast >= 14 ? 'rose' : s.daysSinceLast >= 7 ? 'amber' : 'emerald';
                return <div key={s.uid} className="flex items-center gap-2 text-xs"><span className="flex-shrink-0 text-slate-700 font-semibold w-32 truncate">{s.displayName}</span>{!s.seen ? <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">never seen</span> : <span className={'text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + dayBadgeColor + '-100 text-' + dayBadgeColor + '-800'}>{s.daysSinceLast + 'd ago'}</span>}{s.seen && <span className="flex items-center gap-0.5">{s.recent.map(function (att, attIdx) {
                      var dotColor = att.status === 'correct' ? '#10b981' : att.status === 'incorrect' ? '#ef4444' : att.status === 'idk' ? '#0ea5e9' : '#94a3b8';
                      return <span key={attIdx} className="inline-block rounded-full" style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: dotColor
                      }} title={att.status + ' on ' + new Date(att.ts).toLocaleDateString()} />;
                    })}</span>}{s.seen && typeof s.successRate === 'number' && <span className="text-slate-600 ml-auto">{s.correctAttempts + '/' + s.totalAttempts + ' (' + s.successRate + '%)'}</span>}</div>;
              })}</div></div>;
        })}</div>;
    } else {
      var statusColor = function (s) {
        if (s === 'correct') return {
          bg: 'bg-emerald-100',
          text: 'text-emerald-800',
          icon: '✓'
        };
        if (s === 'incorrect') return {
          bg: 'bg-rose-100',
          text: 'text-rose-800',
          icon: '✗'
        };
        if (s === 'idk') return {
          bg: 'bg-sky-100',
          text: 'text-sky-800',
          icon: '🤔'
        };
        if (s === 'partially-correct') return {
          bg: 'bg-amber-100',
          text: 'text-amber-800',
          icon: '◐'
        };
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          icon: '·'
        };
      };
      body = <div className="space-y-2">{data.bars.map(function (bar) {
          var color = bar.total === 0 ? 'slate' : bar.unscored ? 'purple' : bar.scorePercent == null ? 'slate' : bar.scorePercent >= 80 ? 'emerald' : bar.scorePercent >= 50 ? 'amber' : 'rose';
          var pctCorrect = bar.total > 0 ? bar.correct / bar.total * 100 : 0;
          var pctPartial = bar.total > 0 ? (bar.partial || 0) / bar.total * 100 : 0;
          var pctIncorrect = bar.total > 0 ? bar.incorrect / bar.total * 100 : 0;
          var pctIdk = bar.total > 0 ? bar.idk / bar.total * 100 : 0;
          var pctSubmitted = bar.total > 0 ? bar.submitted / bar.total * 100 : 0;
          var qLabel = bar.questionText ? bar.questionText.slice(0, 70) + (bar.questionText.length > 70 ? '…' : '') : 'Question ' + (bar.questionIdx + 1);
          var canExpand = bar.total > 0;
          var isExpanded = !!expandedBars[bar.questionIdx];
          return <div key={bar.questionIdx} className="p-2 rounded bg-white border border-slate-200"><div className={'flex items-start gap-2 mb-1' + (canExpand ? ' cursor-pointer' : '')} onClick={canExpand ? function () {
              toggleBarExpanded(bar.questionIdx);
            } : undefined} role={canExpand ? 'button' : undefined} tabIndex={canExpand ? 0 : undefined} aria-expanded={canExpand ? isExpanded : undefined} aria-label={canExpand ? (isExpanded ? 'Collapse' : 'Expand') + ' question ' + (bar.questionIdx + 1) + ' student detail' : undefined} onKeyDown={canExpand ? function (e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleBarExpanded(bar.questionIdx);
              }
            } : undefined}>{canExpand && <span className="text-slate-600 hover:text-indigo-600 text-[10px] font-mono mt-0.5">{isExpanded ? '▼' : '▶'}</span>}<span className="text-xs text-slate-700 flex-1 min-w-0">{bar.questionIdx + 1 + '. ' + qLabel}</span>{bar.total > 0 && <span className={'flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded bg-' + color + '-100 text-' + color + '-800'}>{bar.unscored || bar.scorePercent == null ? 'Unscored' : _quizFill(dashboardCopy('quiz.live_score_percent', '{percent}% of points'), { percent: bar.scorePercent })}</span>}</div>{bar.total > 0 ? <div className="flex h-3 rounded overflow-hidden border border-slate-200">{pctCorrect > 0 && <div style={{
                width: pctCorrect + '%',
                backgroundColor: '#10b981'
              }} title={bar.correct + ' correct'} />}{pctPartial > 0 && <div style={{ width: pctPartial + '%', backgroundColor: '#f59e0b' }} title={_quizFill(dashboardCopy('quiz.live_partial_count', '{count} partially correct'), { count: bar.partial })} />}{pctIncorrect > 0 && <div style={{
                width: pctIncorrect + '%',
                backgroundColor: '#ef4444'
              }} title={bar.incorrect + ' incorrect'} />}{pctIdk > 0 && <div style={{
                width: pctIdk + '%',
                backgroundColor: '#0ea5e9'
              }} title={bar.idk + ' IDK'} />}{pctSubmitted > 0 && <div style={{
                width: pctSubmitted + '%',
                backgroundColor: bar.unscored ? '#8b5cf6' : '#94a3b8'
              }} title={bar.unscored ? bar.submitted + ' poll responses' : bar.submitted + ' submitted (ungraded)'} />}</div> : <div className="h-3 rounded bg-slate-100 border border-slate-200" />}<div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600">{!bar.unscored && <><span>{bar.correct + ' ✓'}</span>{bar.partial > 0 && <span>{_quizFill(dashboardCopy('quiz.live_partial_count', '{count} partially correct'), { count: bar.partial })}</span>}<span>{bar.incorrect + ' ✗'}</span></>}{bar.unscored && <span className="text-purple-800 font-bold">Distribution only</span>}{bar.idk > 0 && <span className="text-sky-700">{bar.idk + ' 🤔'}</span>}{bar.submitted > 0 && <span className="text-slate-600">{bar.submitted + ' submitted'}</span>}<span className="ml-auto text-slate-600">{bar.total + ' / ' + data.totalStudents}</span></div>{isExpanded && Array.isArray(bar.byStudent) && bar.byStudent.length > 0 && <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">{bar.byStudent.map(function (s) {
                var sc = statusColor(s.status);
                return <div key={s.uid} className="flex items-start gap-2 text-xs"><span className={'flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ' + sc.bg + ' ' + sc.text}>{sc.icon}</span><span className="flex-shrink-0 font-semibold text-slate-700 w-32 truncate">{s.displayName}</span><span className="flex-grow min-w-0 break-words text-slate-700">{s.answerSummary || <em className="text-slate-600">(no text)</em>}</span>{s.aiGraded && <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-indigo-100 text-indigo-800" title={t("tooltips.ai_graded")}>✨</span>}{confidenceChip(s.confidence, s.status)}{s.aiFeedback && <span className="flex-shrink-0 italic text-[10px] text-indigo-800 truncate max-w-[12rem]" title={s.aiFeedback}>{'"' + s.aiFeedback.slice(0, 50) + (s.aiFeedback.length > 50 ? '…' : '') + '"'}</span>}</div>;
              })}</div>}</div>;
        })}</div>;
    }
    var explainerModalEl = explainerModal.open ? <div ref={explainerDialogRef} tabIndex={-1} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="quiz-concept-explainer-title" onKeyDown={function (e) { _quizHandleDialogKeyDown(e, explainerDialogRef, closeExplainer); }} onClick={function (e) {
      if (e.target === e.currentTarget) closeExplainer();
    }}><div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border-2 border-indigo-300"><div className="flex items-start justify-between gap-3 mb-3"><div><h4 id="quiz-concept-explainer-title" className="font-black text-base text-slate-800"><span aria-hidden="true">🎓 </span>Explain to class</h4><p className="text-xs text-slate-600 mt-0.5">Concept the class missed:</p><p className="text-xs italic text-slate-700 mt-0.5">{'"' + (explainerModal.conceptText || '') + '"'}</p></div><button type="button" ref={explainerCloseBtnRef} onClick={closeExplainer} aria-label={t("a11y.close_concept_explainer")} className="flex-shrink-0 text-slate-600 hover:text-slate-700 text-xl leading-none  focus-visible:ring-2 focus-visible:ring-indigo-400 rounded">×</button></div>{explainerModal.loading ? <div className="p-4 text-center text-sm text-slate-600" role="status" aria-live="polite"><span className={'inline-block animate-pulse ' + quizreducedMotionClass}>✨ Generating explainer…</span></div> : explainerModal.error ? <div className="p-3 rounded bg-rose-50 border border-rose-200 text-sm text-rose-800" role="alert">{explainerModal.error}</div> : <div className="p-3 rounded bg-indigo-50 border border-indigo-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{explainerModal.text}</div>}<div className="flex items-center gap-2 mt-4 flex-wrap"><button type="button" onClick={function () {
            runExplainerCall(explainerModal.conceptText);
          }} disabled={explainerModal.loading} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50">↻ Regenerate</button>{!explainerModal.loading && !explainerModal.error && <button type="button" onClick={copyExplainer} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100">📋 Copy</button>}{!explainerModal.loading && !explainerModal.error && typeof p.callTTS === 'function' && <button type="button" onClick={playExplainer} className="text-xs font-bold px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100" title={t("tooltips.play_explainer_aloud")}>🔊 Play aloud</button>}{!explainerModal.loading && !explainerModal.error && p.activeSessionCode && <button type="button" onClick={pushExplainerToStudents} disabled={pushState.pushing} className={'text-xs font-bold px-3 py-1.5 rounded ' + (pushState.pushed ? 'bg-emerald-700 text-white' : 'bg-amber-700 hover:bg-amber-800 text-white') + ' disabled:opacity-50'} aria-label={pushState.pushed ? 'Explainer pushed to all students' : 'Push this explainer to every student\'s screen'} data-help-key="quiz_push_to_students_btn" title={t("tooltips.send_explainer_to_students")}>{pushState.pushing ? 'Pushing…' : pushState.pushed ? <><span aria-hidden="true">✓ </span>Pushed to students</> : <><span aria-hidden="true">📡 </span>Push to all students</>}</button>}{pushState.error && <span className="text-[10px] text-rose-700 italic" role="alert">{pushState.error}</span>}<button type="button" onClick={closeExplainer} className="ml-auto text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700">{t("ui_common.close")}</button></div></div></div> : null;
    var reflectionsData = null;
    try {
      reflectionsData = aggsMod.aggregateReflections && aggsMod.aggregateReflections(quizState, generatedContent, roster);
    } catch (e) {
      reflectionsData = null;
    }
    var reflectionsEl = reflectionsData ? <div className="mt-4 pt-4 border-t-2 border-indigo-100"><button type="button" onClick={function () {
        setReflectionsExpanded(!reflectionsExpanded);
      }} aria-expanded={reflectionsExpanded} className="flex items-center gap-2 text-sm font-bold text-indigo-800 hover:text-indigo-900"><span className="text-xs font-mono">{reflectionsExpanded ? '▼' : '▶'}</span><span>{'✏️ Reflections (' + reflectionsData.totalReflections + ')'}</span></button>{reflectionsExpanded && <div className="mt-3 space-y-3">{reflectionsData.buckets.map(function (bucket) {
          return <div key={bucket.reflectionIdx} className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1">{'Prompt ' + (bucket.reflectionIdx + 1)}</p><p className="text-sm italic text-slate-700 mb-2">{bucket.promptText}</p>{bucket.responses.length === 0 ? <p className="text-xs italic text-slate-600">No responses yet.</p> : <div className="space-y-2">{bucket.responses.map(function (r) {
                return <div key={r.uid} className="p-2 rounded bg-white border border-indigo-100"><p className="text-xs font-bold text-slate-700 mb-0.5">{r.displayName}</p><p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{r.text}</p></div>;
              })}</div>}</div>;
        })}</div>}</div> : null;
    return <div className="p-5 rounded-xl border-2 border-indigo-300 bg-white mb-4 shadow-sm" role="region" aria-label={t("a11y.live_results_dashboard")}>{header}{body}<AssessmentItemAnalysisPanel analysis={itemAnalysis} quizState={quizState} generatedContent={generatedContent} roster={roster} aiGradedCache={aiGradedCache} teacherOverrides={teacherOverrides} mode={mode} onOpenAlloSheet={p.onOpenAlloSheet} />{reflectionsEl}{explainerModalEl}</div>;
  }
  function _quizEmitDeterministicAnswer(p, itemType, answer, confidence) {
    _quizRecordPracticeAttempt(p, answer, confidence);
    if (typeof p.onSubmitLiveAnswer !== 'function' || typeof p.questionIdx !== 'number') return;
    try {
      p.onSubmitLiveAnswer({
        questionIdx: p.questionIdx,
        itemType: itemType,
        conceptLabel: p.q && p.q.conceptLabel || '',
        answer: answer,
        confidence: confidence || null,
        timestamp: Date.now()
      });
    } catch (e) {}
  }
  function _quizConfidenceButtons(p) {
    if (!p.enabled || p.grade && p.grade.status === 'idk') return null;
    var labels = { knew: _quizGradedCopy('quiz.student.confidence_know_now', 'I know this'), guessed: _quizGradedCopy('quiz.student.confidence_unsure_now', 'I am unsure'), 'no-idea': _quizGradedCopy('quiz.student.confidence_need_support', 'I need support') };
    return <div className="mt-2 flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">{_quizGradedCopy('quiz.student.confidence_before', 'Before checking: how sure are you?')}</span>{['knew', 'guessed', 'no-idea'].map(function (level) {
      return <button key={level} type="button" aria-pressed={p.value === level} disabled={!!p.grade} onClick={function () { if (!p.grade) p.onChange(level); }} className={'min-h-9 px-2 py-1 rounded border transition-colors motion-reduce:transition-none disabled:opacity-70 ' + (p.value === level ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[level]}</button>;
    })}</div>;
  }
  function MultiSelectCard(p) {
    var q = p.q;
    var options = Array.isArray(q.options) ? q.options : [];
    var progressId = React.useId();
    var instructionsId = progressId + '-instructions';
    var revisionTargetRef = React.useRef(null);
    var [checkError, setCheckError] = React.useState('');
    var [revisionNotice, setRevisionNotice] = React.useState('');
    var draftItemKey = 'q-' + p.questionIdx;
    var idkState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'idk', false);
    var idkMarked = idkState[0] === true;
    var setIdkMarked = idkState[1];
    var selectedState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'selected', []);
    function validSelections(value) {
      return Array.isArray(value) ? Array.from(new Set(value.filter(function (idx) { return Number.isInteger(idx) && idx >= 0 && idx < options.length; }))).sort(function (a, b) { return a - b; }) : [];
    }
    var selected = validSelections(selectedState[0]);
    var setSelected = selectedState[1];
    var gradeState = React.useState(null);
    var grade = idkMarked ? { status: 'idk', score: 0 } : gradeState[0];
    var setGrade = gradeState[1];
    var responseFocusRef = _quizUseStageFocus(grade ? 'feedback' : 'response');
    var submittedAnswerState = React.useState(null);
    var submittedAnswer = submittedAnswerState[0];
    var setSubmittedAnswer = submittedAnswerState[1];
    var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
    var confidence = confidenceState[0];
    var setConfidence = confidenceState[1];
    var renderRules = p.modeStrategy && p.modeStrategy.render || {};
    function toggleOption(idx) {
      if (grade) return;
      setCheckError(''); setRevisionNotice(''); revisionTargetRef.current = null;
      setSelected(function (prev) {
        prev = validSelections(prev);
        return prev.indexOf(idx) === -1 ? prev.concat([idx]).sort(function (a, b) { return a - b; }) : prev.filter(function (n) { return n !== idx; });
      });
    }
    function submit() {
      if (selected.length === 0) return;
      setCheckError(''); setRevisionNotice('');
      var grader = window.AlloModules && window.AlloModules.QuizLiveAggregators;
      if (!grader || typeof grader.gradePresentationResponse !== 'function') {
        var unavailableMessage = 'Checking is not available yet. Your selections are kept. Try checking again when it has loaded.';
        setCheckError(unavailableMessage); return { status: 'unavailable', message: unavailableMessage };
      }
      var response = { selectedIndices: selected.slice(), selectedTexts: selected.map(function (idx) { return options[idx]; }) };
      var checked = grader.gradePresentationResponse({ itemType: 'multi-select', answer: response }, q, p.scoringPolicy);
      if (!checked || checked.evaluable !== true || !Array.isArray(checked.correctIndices)) {
        var reviewMessage = 'This question needs teacher review before it can be checked. Your selections are kept.';
        setCheckError(reviewMessage); return { status: 'unavailable', message: reviewMessage };
      }
      var answer = Object.assign({}, response, { status: checked.status, score: checked.score });
      setGrade(checked);
      setSubmittedAnswer(answer);
      _quizEmitDeterministicAnswer(p, 'multi-select', answer, confidence);
      return answer;
    }
    function markIDK() { setCheckError(''); setRevisionNotice(''); setIdkMarked(true);
      var answer = { idk: true };
      setGrade({ status: 'idk', score: 0 });
      setSubmittedAnswer(answer);
      _quizEmitDeterministicAnswer(p, 'multi-select', answer, confidence);
    }
    function updateConfidence(level) {
      setConfidence(level);
      if (submittedAnswer) _quizEmitDeterministicAnswer(p, 'multi-select', submittedAnswer, level);
    }
    function reset() { revisionTargetRef.current = null; setCheckError(''); setRevisionNotice(''); setIdkMarked(false); setSelected([]); setGrade(null); setSubmittedAnswer(null); setConfidence(null); }
    var canRevise = !!grade && ['incorrect', 'partially-correct'].includes(grade.status);
    function revise() {
      if (!canRevise) return false;
      var nextIndex = options.findIndex(function (_, idx) { return selected.includes(idx) !== grade.correctIndices.includes(idx); });
      revisionTargetRef.current = nextIndex >= 0 ? nextIndex : 0;
      setCheckError('');
      setRevisionNotice('Your selections are kept. Review the choice that needs work, then check your selections again.');
      setSubmittedAnswer(null); setGrade(null);
      return true;
    }
    _quizUseVoiceController(p, {
      getState: function () {
        return {
          type: 'multi-select',
          selectedIndices: selected.slice(),
          selectedOptions: selected.map(function (idx) { return options[idx]; }).filter(function (value) { return value != null; }),
          graded: !!grade,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: grade ? (canRevise ? ['revise', 'try-again'] : ['try-again']) : (selected.length > 0 ? ['choose', 'check'] : ['choose']),
          resetRequiresConfirmation: !!(grade || selected.length),
          prompt: grade
            ? (canRevise ? 'These selections have been checked. Say revise these choices to keep your selections and improve them, or try again to clear them.' : grade.status === 'idk' ? 'This question was skipped. Say try again to answer it.' : 'These selections have been checked. Say try again to reset them.')
            : checkError || revisionNotice || 'Select or deselect every answer that applies, then say check selections.'
        };
      },
      execute: function (action, request) {
        if (action === 'revise') return revise() ? { ok: true, state: 'revising', message: 'Your selections are kept. Review the choice that needs work, then check your selections again.' } : { ok: false, state: 'inapplicable', message: 'Revision is available after checking a response that needs review.' };
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Multi-select response reset. Choose every option that applies.' };
        }
        if (grade) {
          return { ok: false, state: 'locked', message: 'These selections have already been checked. Say try again to reset them.' };
        }
        if (action === 'choose') {
          var choice = request && (request.choice != null ? request.choice : (request.option != null ? request.option : request.value));
          var optionIdx = _quizVoiceNamedChoiceIndex(choice, options);
          if (optionIdx < 0) {
            return { ok: false, state: 'invalid-choice', message: 'Choose an available option by letter, number, ordinal, or exact option text.' };
          }
          var mode = String(request && request.mode || 'select').toLowerCase();
          var wasSelected = selected.indexOf(optionIdx) >= 0;
          var shouldSelect = mode === 'toggle' ? !wasSelected : mode === 'deselect' ? false : true;
          var nextSelected = shouldSelect
            ? (wasSelected ? selected.slice() : selected.concat([optionIdx]).sort(function (a, b) { return a - b; }))
            : selected.filter(function (idx) { return idx !== optionIdx; });
          setCheckError(''); setRevisionNotice(''); revisionTargetRef.current = null;
          setSelected(nextSelected);
          var label = String.fromCharCode(65 + optionIdx);
          return {
            ok: true,
            state: shouldSelect ? 'selected' : 'deselected',
            selectedIndices: nextSelected,
            message: 'Option ' + label + (shouldSelect ? ' selected.' : ' deselected.') + ' ' + nextSelected.length + ' option' + (nextSelected.length === 1 ? ' is' : 's are') + ' currently selected.'
          };
        }
        if (action === 'check') {
          if (selected.length === 0) return { ok: false, state: 'inapplicable', message: 'Select at least one option before checking.' };
          var result = submit();
          if (!result || result.status === 'unavailable') return { ok: false, state: 'unavailable', message: result && result.message || 'Checking is not available yet. Your selections are kept.' };
          var resultMessage = result.status === 'correct'
            ? 'Selections checked. All selections are correct.'
            : result.status === 'partially-correct'
              ? 'Selections checked. You earned ' + result.score + ' percent partial credit.'
              : 'Selections checked. Review the selected options and try again.';
          return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
        }
        return { ok: false, state: 'invalid-action', message: 'Use select, deselect, or check selections for this item.' };
      }
    });
    if (options.length === 0) return null;
    var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
    var progress = checkError || (grade ? '' : revisionNotice || (selected.length ? selected.length + ' option' + (selected.length === 1 ? ' selected.' : 's selected.') + ' Ready to check selections.' : 'Select at least one option before checking.'));
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm">
      <div className="flex items-start gap-3 mb-3">
        <span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span>
        <div className="flex-1 min-w-0">
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Multi-select</span>
          <p className="text-sm text-slate-800 leading-relaxed">{_quizRich(q.question || '')}</p>
          <AssessmentQuestionSupport q={q} />
          <p id={instructionsId} className="text-sm text-slate-600 mt-1">{(!p.scoringPolicy || p.scoringPolicy.partialCredit !== false) ? 'Select every correct answer. Incorrect selections reduce partial credit.' : 'Select every correct answer. This item uses all-or-nothing scoring.'}</p>
        </div>
      </div>
      <p id={progressId} data-assessment-multi-progress role="status" aria-live="polite" aria-atomic="true" className="mb-3 text-sm font-semibold text-indigo-900">{progress}</p>
      <div className="space-y-2" role="group" aria-label="Answer choices" aria-describedby={instructionsId}>{options.map(function (opt, idx) {
        var active = selected.indexOf(idx) !== -1;
        return <button key={idx} type="button" ref={node => { if (!grade && idx === (revisionTargetRef.current === null ? 0 : revisionTargetRef.current)) responseFocusRef.current = node; }} aria-pressed={active} disabled={!!grade} onClick={function () { toggleOption(idx); }} className={'min-h-11 w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg border text-sm transition-colors motion-reduce:transition-none disabled:cursor-default ' + (active ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300')}>
          <span aria-hidden="true" className={'mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] font-black ' + (active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-400')}>{active ? '✓' : ''}</span>
          <AssessmentChoiceContent q={q} field="options" index={idx} text={opt} />
        </button>;
      })}</div>
      {!grade && <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button type="button" aria-describedby={progressId} onClick={submit} disabled={selected.length === 0} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50">{_quizGradedCopy('quiz.student.check_selections', 'Check selections')}</button>
        {renderRules.allowIDontKnow && <button type="button" onClick={markIDK} className="min-h-11 px-3 py-2 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-sm font-semibold">{_quizGradedCopy('ui_common.i_dont_know', "I don't know")}</button>}
      </div>}
      {grade && <div className={'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300'} role="status" aria-live="polite">
        <div ref={grade ? responseFocusRef : null} tabIndex={-1} data-assessment-multi-result className={'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 text-sm font-bold text-' + color + '-900'}>{grade.status === 'idk' ? 'Marked “I don’t know”' : grade.status === 'correct' ? '✓ All correct' : grade.status === 'partially-correct' ? grade.score + '% partial credit' : 'Not yet — review your selections'}</div>
        {grade.status !== 'idk' && <>
          <ul className="mt-2 space-y-1 text-sm" aria-label="Feedback for each option">{options.map((option, index) => {
            var expected = grade.correctIndices.includes(index);
            var chosen = selected.includes(index);
            return <li key={index}><strong>{_quizRich(option)}: </strong>{chosen && expected ? 'Correct selection.' : chosen ? 'This choice does not belong.' : expected ? 'This correct choice was missing.' : 'Correctly left unselected.'}{q.optionFeedback?.[index] && <span>{' '}{_quizRich(q.optionFeedback[index])}</span>}</li>;
          })}</ul>
          <p className={'text-sm mt-2 text-' + color + '-900'}>{grade.selectedCorrect + ' of ' + grade.totalCorrect + ' correct choices selected' + (grade.selectedWrong ? '; ' + grade.selectedWrong + ' incorrect choice' + (grade.selectedWrong === 1 ? '' : 's') + ' selected.' : '.')}</p>
          {p.scoringPolicy?.partialCredit === false && <p data-assessment-multi-score-policy className="mt-2 text-sm">All correct choices, and no incorrect choices, must be selected for credit.</p>}
        </>}
        {canRevise && <>
          <p id={progressId + '-revision-help'} className="mt-3 text-sm">Review the feedback for each option. Keep the correct selections and change the choices that need work.</p>
          <button type="button" data-assessment-revise-multi aria-describedby={progressId + '-revision-help'} onClick={revise} className="mt-3 me-2 min-h-11 rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm font-semibold text-indigo-900">Revise these choices</button>
        </>}
        <button type="button" onClick={reset} className="mt-3 min-h-11 rounded-lg bg-white border border-slate-400 px-3 py-2 text-sm font-semibold text-slate-800">Try again</button>
      </div>}
      {grade && grade.status !== 'idk' && <AssessmentTransferPractice {...p} />}
      {_quizConfidenceButtons({ enabled: !!renderRules.allowConfidenceRating, grade: grade, value: confidence, onChange: updateConfidence })}
    </div>;
  }
  function AnswerEvidenceCard(p) {
    var q = p.q;
    var answerEvidenceProgressId = React.useId();
    var answerEvidenceInstructionsId = answerEvidenceProgressId + '-instructions';
    var evidenceFirstRef = React.useRef(null);
    var revisionTargetRef = React.useRef(null);
    var [checkError, setCheckError] = React.useState('');
    var [revisionNotice, setRevisionNotice] = React.useState('');
    var [answerChanged, setAnswerChanged] = React.useState(false);
    var answers = Array.isArray(q.answerOptions) ? q.answerOptions : [];
    var evidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
    var draftItemKey = 'q-' + p.questionIdx;
    var [explanation, setExplanation] = _quizUseDraftField(p.draftNamespace, draftItemKey, 'explanation', '');
    var idkState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'idk', false);
    var idkMarked = idkState[0] === true;
    var setIdkMarked = idkState[1];
    var answerState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'answerIdx', null);
    var answerIdx = answerState[0];
    var setAnswerIdx = answerState[1];
    var evidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'evidenceIdx', null);
    var evidenceIdx = evidenceState[0];
    var setEvidenceIdx = evidenceState[1];
    var gradeState = React.useState(null);
    var grade = idkMarked ? { status: 'idk', score: 0 } : gradeState[0];
    var setGrade = gradeState[1];
    var answerEvidenceFocusRef = _quizUseStageFocus(grade ? 'feedback' : 'response');
    var submittedState = React.useState(null);
    var submitted = submittedState[0];
    var setSubmitted = submittedState[1];
    var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
    var confidence = confidenceState[0];
    var setConfidence = confidenceState[1];
    var renderRules = p.modeStrategy && p.modeStrategy.render || {};
    function chooseAnswer(index) {
      if (grade || !Number.isInteger(index) || index < 0 || index >= answers.length) return;
      setCheckError(''); setRevisionNotice(''); revisionTargetRef.current = null;
      if (index !== answerIdx) {
        // Clear the dependent draft first so observers never see the new answer with stale evidence.
        setEvidenceIdx(null);
        setAnswerChanged(evidenceIdx !== null);
        setAnswerIdx(index);
      }
    }
    function chooseEvidence(index) {
      if (grade || answerIdx === null || !Number.isInteger(index) || index < 0 || index >= evidence.length) return;
      setCheckError(''); setRevisionNotice(''); revisionTargetRef.current = null;
      setEvidenceIdx(index); setAnswerChanged(false);
    }
    function submit() {
      if (q.requireReasoning && !explanation.trim()) return null;
      if (answerIdx === null || evidenceIdx === null) return null;
      setCheckError(''); setRevisionNotice('');
      var grader = window.AlloModules && window.AlloModules.QuizLiveAggregators;
      if (!grader || typeof grader.gradePresentationResponse !== 'function') {
        var unavailableMessage = 'Checking is not available yet. Your choices and explanation are kept. Try checking again when it has loaded.';
        setCheckError(unavailableMessage); return { status: 'unavailable', message: unavailableMessage };
      }
      var response = { explanation: explanation, answerIdx: answerIdx, answerText: answers[answerIdx], evidenceIdx: evidenceIdx, evidenceText: evidence[evidenceIdx] };
      var checked = grader.gradePresentationResponse({ itemType: 'answer-evidence', answer: response }, q, p.scoringPolicy);
      if (!checked || checked.evaluable !== true) {
        var reviewMessage = 'This question needs teacher review before it can be checked. Your choices and explanation are kept.';
        setCheckError(reviewMessage); return { status: 'unavailable', message: reviewMessage };
      }
      var payload = Object.assign({}, response, { answerCorrect: checked.answerCorrect, evidenceCorrect: checked.evidenceCorrect, score: checked.score, status: checked.status });
      setGrade(payload);
      setSubmitted(payload);
      _quizEmitDeterministicAnswer(p, 'answer-evidence', payload, confidence);
      return payload;
    }
    function markIDK() { setCheckError(''); setRevisionNotice(''); setIdkMarked(true); var payload = { idk: true }; setGrade({ status: 'idk', score: 0 }); setSubmitted(payload); _quizEmitDeterministicAnswer(p, 'answer-evidence', payload, confidence); }
    function updateConfidence(level) { setConfidence(level); if (submitted) _quizEmitDeterministicAnswer(p, 'answer-evidence', submitted, level); }
    function reset() { revisionTargetRef.current = null; setCheckError(''); setRevisionNotice(''); setAnswerChanged(false); setIdkMarked(false); setAnswerIdx(null); setEvidenceIdx(null); setGrade(null); setSubmitted(null); setConfidence(null); }
    var canRevise = !!grade && ['incorrect', 'partially-correct'].includes(grade.status);
    function revise() {
      if (!canRevise) return false;
      var part = grade.answerCorrect ? 'evidenceOptions' : 'answerOptions';
      revisionTargetRef.current = { field: part, index: part === 'evidenceOptions' ? evidenceIdx : answerIdx };
      setCheckError(''); setAnswerChanged(false);
      setRevisionNotice('Your choices and explanation are kept. Review your ' + (part === 'evidenceOptions' ? 'supporting evidence' : 'answer') + ', then check both parts again.');
      setSubmitted(null); setGrade(null);
      return true;
    }
    _quizUseVoiceController(p, {
      getState: function () {
        var actions = grade ? (canRevise ? ['revise', 'try-again'] : ['try-again']) : ['choose-answer'];
        if (!grade && answerIdx !== null) actions.push('choose-evidence');
        if (!grade && answerIdx !== null && evidenceIdx !== null && (!q.requireReasoning || explanation.trim())) actions.push('check');
        return {
          type: 'answer-evidence',
          answerOptions: answers.slice(0, 8),
          evidenceOptions: evidence.slice(0, 8),
          evidencePrompt: String(q.evidencePrompt || 'Which evidence or reason best supports your answer?'),
          answerIndex: typeof answerIdx === 'number' ? answerIdx : null,
          evidenceIndex: typeof evidenceIdx === 'number' ? evidenceIdx : null,
          gradeStatus: grade && grade.status || null,
          score: grade && typeof grade.score === 'number' ? grade.score : null,
          actions: actions,
          resetRequiresConfirmation: !!(grade || answerIdx !== null || evidenceIdx !== null),
          prompt: grade
            ? (canRevise ? 'Both parts have been checked. Say revise these choices to keep your work and improve it, or try again to clear both selections.' : grade.status === 'idk' ? 'This question was skipped. Say try again to answer it.' : 'Both parts have been checked. Say try again to clear both selections and answer again.')
            : answerIdx === null
              ? 'Choose the answer part explicitly, for example choose answer B.'
              : evidenceIdx === null
                ? 'Now choose the evidence part explicitly, for example choose evidence A.'
                : q.requireReasoning && !explanation.trim() ? 'Add the required explanation before checking both parts.' : 'Both parts are selected. Say check both parts.'
        };
      },
      execute: function (action, request) {
        var input = request && typeof request === 'object' ? request : {};
        if (action === 'revise') return revise() ? { ok: true, state: 'revising', message: 'Your choices and explanation are kept. Review the part that needs work, then check both parts again.' } : { ok: false, state: 'inapplicable', message: 'Revision is available after checking a response that needs review.' };
        if (action === 'try-again' || action === 'reset') {
          if ((grade || answerIdx !== null || evidenceIdx !== null) && input.confirmed !== true) {
            return {
              ok: false, state: 'confirmation-required', confirmationRequired: true,
              confirmationToken: 'reset-answer-evidence',
              message: 'Try again will clear both the answer and evidence selections. Confirm try again to continue.'
            };
          }
          reset();
          return { ok: true, state: 'reset', message: 'Answer and evidence selections cleared. Choose the answer part first.' };
        }
        if (grade) {
          return { ok: false, state: 'locked', message: 'Both parts have already been checked. Say try again to answer again.' };
        }
        var part = action === 'choose-answer' ? 'answer' : action === 'choose-evidence' ? 'evidence' : String(input.part || '').toLowerCase();
        if (action === 'choose' && part !== 'answer' && part !== 'evidence') {
          return { ok: false, state: 'ambiguous-choice', message: 'Name the part explicitly. Say choose answer B or choose evidence A.' };
        }
        if (part === 'answer' || part === 'evidence') {
          if (part === 'evidence' && answerIdx === null) {
            return { ok: false, state: 'inapplicable', message: 'Choose the answer part before choosing supporting evidence.' };
          }
          var items = part === 'answer' ? answers : evidence;
          var choice = input.choice != null ? input.choice : (input.option != null ? input.option : input.value);
          var chosenIndex = _quizVoiceNamedChoiceIndex(choice, items.slice(0, 8));
          if (chosenIndex < 0) {
            return { ok: false, state: 'invalid-choice', message: 'Choose an available ' + part + ' option by letter A through H, number, ordinal, or exact option text.' };
          }
          if (part === 'answer') chooseAnswer(chosenIndex);
          else chooseEvidence(chosenIndex);
          var label = String.fromCharCode(65 + chosenIndex);
          return {
            ok: true, state: 'selected', part: part, selectedIndex: chosenIndex, selectedLabel: label,
            message: (part === 'answer' ? 'Answer' : 'Evidence') + ' option ' + label + ' selected.' +
              (part === 'answer' && (chosenIndex !== answerIdx || evidenceIdx === null) ? ' Now choose supporting evidence.' : q.requireReasoning && !explanation.trim() ? ' Add the required explanation before checking both parts.' : ' Both parts are selected. Say check both parts.')
          };
        }
        if (action === 'check') {
          if (answerIdx === null || evidenceIdx === null) {
            return { ok: false, state: 'inapplicable', message: 'Choose one answer and one evidence option before checking both parts.' };
          }
          if (q.requireReasoning && !explanation.trim()) return { ok: false, state: 'inapplicable', message: 'Add the required explanation before checking both parts.' };
          var result = submit();
          if (!result) return { ok: false, state: 'error', message: 'Both parts could not be checked.' };
          if (result.status === 'unavailable') return { ok: false, state: 'unavailable', message: result.message };
          var message = result.answerCorrect && result.evidenceCorrect ? 'Both parts checked. The answer and supporting evidence are correct.' : result.answerCorrect ? 'Both parts checked. Your answer is correct. Review the supporting evidence.' : result.evidenceCorrect ? 'Both parts checked. Your supporting evidence is correct. Review the answer.' : 'Both parts checked. The answer and supporting evidence need review.';
          if (p.scoringPolicy && p.scoringPolicy.partialCredit === false && result.answerCorrect !== result.evidenceCorrect) message += ' Both parts must be correct for credit.';
          return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: message };
        }
        return { ok: false, state: 'invalid-action', message: 'Use choose answer, choose evidence, or check both parts for this item.' };
      }
    });
    var answerEvidenceProgress = checkError || (grade ? '' : revisionNotice || (answerIdx === null ? 'Choose an answer, then supporting evidence.' : evidenceIdx === null ? (answerChanged ? 'Answer changed. Choose supporting evidence again.' + (explanation.trim() ? ' Your explanation is kept.' : '') : 'Answer selected. Now choose supporting evidence.') : q.requireReasoning && !explanation.trim() ? 'Both parts selected. Add the required explanation before checking.' : 'Both parts selected. Ready to check.'));
    if (answers.length === 0 || evidence.length === 0) return null;
    var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
    function optionGrid(items, selectedIdx, setter, disabled, field) {
      return <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{items.map(function (opt, idx) { return <button key={idx} type="button" ref={node => { if (field === 'evidenceOptions' && idx === 0) evidenceFirstRef.current = node; if (!grade && (revisionTargetRef.current ? field === revisionTargetRef.current.field && idx === revisionTargetRef.current.index : field === 'answerOptions' && idx === 0)) answerEvidenceFocusRef.current = node; }} disabled={disabled} aria-pressed={selectedIdx === idx} onClick={function () { setter(idx); }} className={'px-3 py-2 rounded-lg border text-sm text-left transition-colors motion-reduce:transition-none disabled:cursor-default ' + (selectedIdx === idx ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300')}><AssessmentChoiceContent q={q} field={field} index={idx} text={opt} prefix={String.fromCharCode(65 + idx) + '. '} />{selectedIdx === idx && <span aria-hidden="true" data-assessment-choice-selected className="ms-2 inline-block text-xs font-bold">✓ {_quizGradedCopy('quiz.student.selected', 'Selected')}</span>}</button>; })}</div>;
    }
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Answer + evidence</span><p className="text-sm text-slate-800 leading-relaxed">{_quizRich(q.question || '')}</p><AssessmentQuestionSupport q={q} /></div></div><p id={answerEvidenceInstructionsId} data-assessment-answer-evidence-instructions className="mb-2 text-sm text-slate-600">Choose an answer, then evidence that supports it. If you change your answer, choose the evidence again.</p><p id={answerEvidenceProgressId} data-assessment-answer-evidence-progress role="status" aria-live="polite" aria-atomic="true" className="mb-3 text-sm font-semibold text-indigo-900">{answerEvidenceProgress}</p><div className="space-y-4"><fieldset aria-describedby={answerEvidenceInstructionsId}><legend className="text-xs font-bold text-slate-700 mb-2">Part 1 — Choose the best answer</legend>{optionGrid(answers, answerIdx, chooseAnswer, !!grade, "answerOptions")}</fieldset>{answerIdx !== null && !grade && <button type="button" data-assessment-continue-evidence aria-controls={answerEvidenceProgressId + '-choices'} onClick={() => evidenceFirstRef.current?.focus()} className="min-h-11 rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm font-semibold text-indigo-900">Go to supporting evidence</button>}{answerIdx !== null && <fieldset id={answerEvidenceProgressId + '-choices'} aria-describedby={answerEvidenceInstructionsId}><legend className="text-xs font-bold text-slate-700 mb-2">{'Part 2 — ' + (q.evidencePrompt || 'Which evidence or reason best supports your answer?')}</legend>{q.evidencePrompt_en && <QuizTranslationText as="p" className="mb-2 text-sm italic text-slate-600">{q.evidencePrompt_en}</QuizTranslationText>}{optionGrid(evidence, evidenceIdx, chooseEvidence, !!grade, "evidenceOptions")}</fieldset>}</div><AssessmentReasoningInput q={q} itemNumber={p.itemNumber} questionIdx={p.questionIdx} value={explanation} onChange={value => { setCheckError(''); setRevisionNotice(''); setExplanation(value); }} disabled={!!grade} />{!grade && <div className="mt-3 flex gap-2 flex-wrap"><button type="button" aria-describedby={answerEvidenceProgressId} onClick={submit} disabled={answerIdx === null || evidenceIdx === null || !!q.requireReasoning && !explanation.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">{_quizGradedCopy('quiz.student.check_both_parts', 'Check both parts')}</button>{renderRules.allowIDontKnow && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold">{_quizGradedCopy('ui_common.i_dont_know', "I don't know")}</button>}</div>}{grade && <div className={'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300'} role="status" aria-live="polite"><div ref={grade ? answerEvidenceFocusRef : null} tabIndex={-1} data-assessment-answer-evidence-result className={'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 text-xs font-bold text-' + color + '-900'}>{grade.status === 'idk' ? 'Marked “I don’t know”' : grade.score + ' / 2 — ' + (grade.answerCorrect && grade.evidenceCorrect ? 'both parts correct' : grade.answerCorrect || grade.evidenceCorrect ? 'one part correct' : 'both parts need review')}</div>{grade.status !== 'idk' && <ul className={'mt-1 text-xs text-' + color + '-900'}><li><strong>{'Answer: ' + (grade.answerCorrect ? 'correct' : 'needs review')}</strong><p data-assessment-checked-answer className="mt-1 break-words">{grade.answerText}</p></li><li className="mt-2"><strong>{'Supporting evidence or reason: ' + (grade.evidenceCorrect ? 'correct' : 'needs review')}</strong><p data-assessment-checked-evidence className="mt-1 break-words">{grade.evidenceText}</p></li></ul>}{grade.status !== 'idk' && p.scoringPolicy?.partialCredit === false && <p data-assessment-evidence-score-policy className="mt-2 text-sm">Both parts must be correct for credit.</p>}{canRevise && <><p id={answerEvidenceProgressId + '-revision-help'} data-assessment-evidence-revision-help className="mt-3 text-sm">{grade.answerCorrect ? 'Your answer was correct. Look for evidence that directly supports it.' : grade.evidenceCorrect ? 'Your evidence choice was correct. Reconsider your answer, then confirm the evidence.' : 'Review your answer and its supporting evidence together.'}</p><button type="button" data-assessment-revise-evidence aria-describedby={answerEvidenceProgressId + '-revision-help'} onClick={revise} className="mt-3 me-2 min-h-11 rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm font-semibold text-indigo-900">Revise these choices</button></>}<button type="button" onClick={reset} className="mt-3 min-h-11 rounded-lg bg-white border border-slate-400 px-3 py-2 text-sm font-semibold text-slate-800">Try again</button></div>}{_quizConfidenceButtons({ enabled: !!renderRules.allowConfidenceRating, grade: grade, value: confidence, onChange: updateConfidence })}</div>;
  }
  function _quizParseIntegerWords(tokens) {
    var ones = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
    var tens = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
    var total = 0;
    var current = 0;
    var consumed = 0;
    var sawNumber = false;
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (Object.prototype.hasOwnProperty.call(ones, token)) {
        current += ones[token];
        sawNumber = true;
      } else if (Object.prototype.hasOwnProperty.call(tens, token)) {
        current += tens[token];
        sawNumber = true;
      } else if (/^\d+$/.test(token)) {
        current += Number(token);
        sawNumber = true;
      } else if (token === 'hundred' && sawNumber) {
        current = (current || 1) * 100;
      } else if ((token === 'thousand' || token === 'million') && sawNumber) {
        var scale = token === 'million' ? 1000000 : 1000;
        total += (current || 1) * scale;
        current = 0;
      } else if (token === 'and' && sawNumber && i + 1 < tokens.length) {
      } else {
        break;
      }
      consumed = i + 1;
    }
    return sawNumber ? { value: total + current, consumed: consumed } : null;
  }
  function _quizParseSpokenNumber(raw) {
    var tokens = String(raw || '').toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9.]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;
    var sign = 1;
    if (tokens[0] === 'negative' || tokens[0] === 'minus') {
      sign = -1;
      tokens.shift();
    } else if (tokens[0] === 'positive' || tokens[0] === 'plus') {
      tokens.shift();
    }
    if (!tokens.length) return null;
    function done(value, consumed) {
      return { value: sign * value, unit: tokens.slice(consumed).join(' ') };
    }
    var denominators = { half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, fourth: 4, fourths: 4, fifth: 5, fifths: 5, eighth: 8, eighths: 8, tenth: 10, tenths: 10, hundredth: 100, hundredths: 100 };
    var denominatorIndex = -1;
    for (var d = 0; d < tokens.length; d++) {
      if (denominators[tokens[d]]) {
        denominatorIndex = d;
        break;
      }
    }
    if (denominatorIndex >= 0) {
      var andIndex = tokens.slice(0, denominatorIndex).lastIndexOf('and');
      var whole = 0;
      var numeratorStart = 0;
      if (andIndex >= 0) {
        var wholeParsed = _quizParseIntegerWords(tokens.slice(0, andIndex));
        if (!wholeParsed || wholeParsed.consumed !== andIndex) return null;
        whole = wholeParsed.value;
        numeratorStart = andIndex + 1;
      }
      var numeratorTokens = tokens.slice(numeratorStart, denominatorIndex);
      var numerator = 1;
      if (numeratorTokens.length && numeratorTokens[0] !== 'a' && numeratorTokens[0] !== 'an') {
        var numeratorParsed = _quizParseIntegerWords(numeratorTokens);
        if (!numeratorParsed || numeratorParsed.consumed !== numeratorTokens.length) return null;
        numerator = numeratorParsed.value;
      }
      return done(whole + numerator / denominators[tokens[denominatorIndex]], denominatorIndex + 1);
    }
    var pointIndex = tokens.indexOf('point');
    if (pointIndex >= 0) {
      var integerPart = pointIndex === 0 ? { value: 0, consumed: 0 } : _quizParseIntegerWords(tokens.slice(0, pointIndex));
      if (!integerPart || integerPart.consumed !== pointIndex) return null;
      var digitWords = { zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9' };
      var digits = '';
      var consumedAfterPoint = 0;
      for (var p = pointIndex + 1; p < tokens.length; p++) {
        var digit = Object.prototype.hasOwnProperty.call(digitWords, tokens[p]) ? digitWords[tokens[p]] : /^\d+$/.test(tokens[p]) ? tokens[p] : '';
        if (!digit) break;
        digits += digit;
        consumedAfterPoint += 1;
      }
      if (!digits) return null;
      return done(integerPart.value + Number('0.' + digits), pointIndex + 1 + consumedAfterPoint);
    }
    var integer = _quizParseIntegerWords(tokens);
    return integer ? done(integer.value, integer.consumed) : null;
  }
  function _quizParseNumericResponse(raw) {
    var text = String(raw == null ? '' : raw).trim().replace(/\u2212/g, '-').replace(/[\u00a0\u202f]/g, ' ');
    var mixed = text.match(/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)(?:\s+([^\d\s].*))?$/);
    if (mixed) {
      var denominator = Number(mixed[4]);
      if (!denominator || Number(mixed[3]) >= denominator) return null;
      return { value: (Number(mixed[2]) + Number(mixed[3]) / denominator) * (mixed[1] === '-' ? -1 : 1), unit: String(mixed[5] || '').trim() };
    }
    var fraction = text.match(/^([+-]?\d+)\s*\/\s*(\d+)(?:\s+([^\d\s].*))?$/);
    if (fraction && Number(fraction[2]) !== 0) return { value: Number(fraction[1]) / Number(fraction[2]), unit: String(fraction[3] || '').trim() };
    // A single comma followed by three digits is ambiguous across locales.
    // Ask for a decimal point or ungrouped number instead of guessing.
    var numberPart = text.match(/^([+-]?[\d.,]+)(.*)$/);
    if (numberPart && numberPart[1].includes(',')) {
      var digits = numberPart[1];
      if (/^[+-]?\d+,\d{1,2}$/.test(digits) || /^[+-]?\d+,\d{4,}$/.test(digits)) digits = digits.replace(',', '.');
      else if (/^[+-]?\d{1,3}(,\d{3})+\.\d+$/.test(digits) || /^[+-]?\d{1,3}(,\d{3}){2,}$/.test(digits)) digits = digits.replace(/,/g, '');
      else if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(digits)) digits = digits.replace(/\./g, '').replace(',', '.');
      else return null;
      text = digits + numberPart[2];
    }
    var decimal = text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*(.*))?$/i);
    if (decimal) {
      var value = Number(decimal[1]);
      var unit = String(decimal[2] || '').trim();
      if (/^[\d.,/+\-¼½¾⅐-⅞]/.test(unit) || /^e[+-]?\d/i.test(unit)) return null;
      return Number.isFinite(value) ? { value: value, unit: unit } : null;
    }
    return _quizParseSpokenNumber(text);
  }
  function _quizNormalizeUnit(unit) { return String(unit || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' '); }
  function NumericResponseCard(p) {
    var q = p.q;
    function numericErrorMessage(result) {
      if (!result || result.status !== 'invalid') return '';
      return result.graderUnavailable
        ? 'Numeric checking is not available yet. Your response is saved; retry when it has loaded.'
        : result.invalidKey
          ? 'This item needs a valid answer key. Ask your teacher to review it.'
          : 'Enter a number, optionally followed by its unit.';
    }
    function numericPartsFeedback(result) {
      if (!result || result.status === 'invalid' || result.status === 'idk') return '';
      var parts = result.valueCorrect ? 'The value is correct.' : 'The value needs review.';
      var hasUnits = [q.unit || ''].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).some(function (unit) { return !!_quizNormalizeUnit(unit); });
      if (hasUnits) parts += result.unitCorrect ? ' The units are correct.' : ' The units need review.';
      return parts;
    }
    var numericErrorId = React.useId();
    var draftItemKey = 'q-' + p.questionIdx;
    var idkState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'idk', false);
    var idkMarked = idkState[0] === true;
    var setIdkMarked = idkState[1];
    var responseState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'response', '');
    var response = responseState[0];
    var setResponse = responseState[1];
    var gradeState = React.useState(null);
    var grade = idkMarked ? { status: 'idk', score: 0 } : gradeState[0];
    var setGrade = gradeState[1];
    var responseFocusRef = _quizUseStageFocus(grade && grade.status !== 'invalid' ? 'feedback' : 'response');
    var submittedState = React.useState(null);
    var submitted = submittedState[0];
    var setSubmitted = submittedState[1];
    var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
    var confidence = confidenceState[0];
    var setConfidence = confidenceState[1];
    var renderRules = p.modeStrategy && p.modeStrategy.render || {};
    function submit() {
      var parsed = _quizParseNumericResponse(response);
      if (!parsed) { var invalid = { status: 'invalid', score: 0 }; setGrade(invalid); return invalid; }
      if (!_quizHasNumericKey(q.correctValue)) {
        var unavailable = { status: 'invalid', invalidKey: true, score: 0 };
        setGrade(unavailable);
        return unavailable;
      }
      var loadedGrader = window.AlloModules && window.AlloModules.QuizLiveAggregators;
      if (q.numericSettings && (!loadedGrader || typeof loadedGrader.gradeNumericAnswer !== 'function')) { var pending = { status: 'invalid', graderUnavailable: true }; setGrade(pending); return pending; }
      var expected = Number(q.correctValue);
      var tolerance = Math.max(0, Number(q.tolerance) || 0);
      var valueCorrect = Number.isFinite(expected) && Math.abs(parsed.value - expected) <= tolerance + 1e-9;
      var expectedUnits = [q.unit || ''].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(_quizNormalizeUnit).filter(Boolean);
      var unitCorrect = expectedUnits.length === 0 || expectedUnits.indexOf(_quizNormalizeUnit(parsed.unit)) !== -1;
      var partialCredit = !p.scoringPolicy || p.scoringPolicy.partialCredit !== false;
      var rawScore = valueCorrect && unitCorrect ? 100 : valueCorrect || unitCorrect && expectedUnits.length > 0 ? 50 : 0;
      var score = partialCredit ? rawScore : (rawScore === 100 ? 100 : 0);
      var status = score === 100 ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect';
      var sharedGrader = window.AlloModules && window.AlloModules.QuizLiveAggregators;
      var checked = sharedGrader && typeof sharedGrader.gradeNumericAnswer === 'function' ? sharedGrader.gradeNumericAnswer(parsed, q, p.scoringPolicy) : { valueCorrect: valueCorrect, unitCorrect: unitCorrect, status: status, score: score };
      var payload = Object.assign({ text: response, numericValue: parsed.value, unit: parsed.unit }, checked);
      setGrade(payload);
      setSubmitted(payload);
      _quizEmitDeterministicAnswer(p, 'numeric-response', payload, confidence);
      return payload;
    }
    function markIDK() { setIdkMarked(true); var payload = { idk: true }; setGrade({ status: 'idk', score: 0 }); setSubmitted(payload); _quizEmitDeterministicAnswer(p, 'numeric-response', payload, confidence); }
    function updateConfidence(level) { setConfidence(level); if (submitted) _quizEmitDeterministicAnswer(p, 'numeric-response', submitted, level); }
    function reset() { setIdkMarked(false); setResponse(''); setGrade(null); setSubmitted(null); setConfidence(null); }
    function updateResponse(value) { setResponse(value); if (grade && grade.status === 'invalid') setGrade(null); }
    _quizUseVoiceController(p, {
      getState: function () {
        var parsed = response ? _quizParseNumericResponse(response) : null;
        var locked = !!grade && grade.status !== 'invalid';
        return {
          type: 'numeric-response',
          response: response,
          parsedValue: parsed ? parsed.value : null,
          parsedUnit: parsed ? parsed.unit : '',
          graded: locked,
          gradeStatus: locked && grade ? grade.status : null,
          score: locked && grade && typeof grade.score === 'number' ? grade.score : null,
          actions: locked ? ['try-again'] : (parsed ? ['enter-response', 'check'] : ['enter-response']),
          prompt: numericErrorMessage(grade) || (locked
            ? 'This numeric response has been checked. Say try again to reset it.'
            : 'Say response followed by a number' + (q.unit ? ' and units such as ' + q.unit : '') + ', then say check value.')
        };
      },
      execute: function (action, request) {
        var locked = !!grade && grade.status !== 'invalid';
        if (action === 'try-again' || action === 'reset') {
          reset();
          return { ok: true, state: 'reset', message: 'Numeric response reset. Say response followed by the number and optional units.' };
        }
        if (locked) {
          return { ok: false, state: 'locked', message: 'This numeric response has already been checked. Say try again to reset it.' };
        }
        if (action === 'enter-response') {
          var text = _quizVoiceRequestText(request);
          var parsed = _quizParseNumericResponse(text);
          if (!text || !parsed) {
            return { ok: false, state: 'invalid-response', message: 'I could not identify a number. Say response followed by a number and optional units.' };
          }
          updateResponse(text);
          return {
            ok: true,
            state: 'response-entered',
            response: text,
            numericValue: parsed.value,
            unit: parsed.unit,
            message: 'Numeric response recorded as ' + parsed.value + (parsed.unit ? ' ' + parsed.unit : '') + '. Say check value when ready.'
          };
        }
        if (action === 'check') {
          if (!String(response || '').trim()) return { ok: false, state: 'inapplicable', message: 'Enter a numeric response before checking.' };
          var result = submit();
          if (!result || result.status === 'invalid') return { ok: false, state: result && (result.graderUnavailable || result.invalidKey) ? 'unavailable' : 'invalid-response', message: numericErrorMessage(result) || 'Enter a number, optionally followed by its unit.' };
          var resultMessage = result.status === 'correct'
            ? 'Numeric response checked. Correct response under this scoring policy. '
            : result.status === 'partially-correct'
              ? 'Numeric response checked. Partially correct. '
              : 'Numeric response checked. Not yet correct under this scoring policy. ';
          resultMessage += numericPartsFeedback(result);
          return { ok: true, state: 'checked', correct: result.status === 'correct', score: result.score, message: resultMessage };
        }
        return { ok: false, state: 'invalid-action', message: 'Use enter response or check value for this numeric item.' };
      }
    });
    var color = grade && grade.status === 'correct' ? 'emerald' : grade && grade.status === 'partially-correct' ? 'amber' : grade && grade.status === 'idk' ? 'sky' : grade ? 'rose' : 'slate';
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">Numeric response</span><p className="text-sm text-slate-800 leading-relaxed">{_quizRich(q.question || '')}</p><AssessmentQuestionSupport q={q} />{q.unit && <p className="text-[11px] text-slate-500 mt-1">{'Include units (' + q.unit + ').'}</p>}</div></div><input ref={!grade || grade.status === 'invalid' ? responseFocusRef : null} type="text" inputMode="decimal" aria-label={_quizResponseLabel(p, 'Numeric response')} aria-invalid={grade && grade.status === 'invalid' && !grade.graderUnavailable && !grade.invalidKey ? true : undefined} aria-describedby={grade && grade.status === 'invalid' ? numericErrorId : undefined} value={response} onChange={function (e) { updateResponse(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} disabled={!!grade && grade.status !== 'invalid'} placeholder={q.unit ? 'Example: 12.5 ' + q.unit : 'Enter a number'} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50" /><p id={numericErrorId} data-assessment-numeric-error role="status" aria-live="polite" aria-atomic="true" className="text-xs text-rose-700">{numericErrorMessage(grade)}</p><QuizVoiceInputButton value={response} onChange={updateResponse} disabled={!!grade && grade.status !== 'invalid'} allowDictation={p.allowDictation} label="Dictate number or units" />{!grade || grade.status === 'invalid' ? <div className="mt-3 flex gap-2 flex-wrap"><button type="button" onClick={submit} disabled={!response.trim()} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">{_quizGradedCopy('quiz.student.check_value', 'Check value')}</button>{renderRules.allowIDontKnow && !grade && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold">{_quizGradedCopy('ui_common.i_dont_know', "I don't know")}</button>}</div> : null}{grade && grade.status !== 'invalid' && <div className={'mt-3 p-3 rounded-lg border bg-' + color + '-50 border-' + color + '-300'} role="status" aria-live="polite"><div ref={grade && grade.status !== 'invalid' ? responseFocusRef : null} tabIndex={-1} data-assessment-numeric-result className={'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 text-xs font-bold text-' + color + '-900'}>{grade.status === 'idk' ? 'Marked “I don’t know”' : grade.status === 'correct' ? '✓ Correct response under this scoring policy' : grade.status === 'partially-correct' ? 'Partially correct — check the value or units' : 'Not yet — check your calculation and units'}</div>{grade.status !== 'idk' && <p data-assessment-numeric-details className={'text-xs mt-1 text-' + color + '-900'}>{numericPartsFeedback(grade)}</p>}{grade.status !== 'idk' && <p className={'text-xs mt-1 text-' + color + '-900'}>{'Expected ' + q.correctValue + (q.unit ? ' ' + q.unit : '') + (Number(q.tolerance) > 0 ? ' (±' + q.tolerance + ')' : '') + '.'}</p>}<button type="button" onClick={reset} className="mt-2 px-3 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">Try again</button></div>}{_quizConfidenceButtons({ enabled: !!renderRules.allowConfidenceRating, grade: grade && grade.status !== 'invalid' ? grade : null, value: confidence, onChange: updateConfidence })}</div>;
  }
  function _quizExtractJson(raw) {
    var value = raw && typeof raw === 'object' && raw.text ? raw.text : raw;
    if (value && typeof value === 'object') return value;
    var text = String(value || '').trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/i, '');
    try { return JSON.parse(text); } catch (e) {}
    var start = text.indexOf('{');
    var end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
    }
    return null;
  }
  function _quizSchemaForType(type) {
    var schemas = {
      mcq: '{type:"mcq",question,options:[4 strings],correctAnswer,conceptLabel}',
      'multi-select': '{type:"multi-select",question,options:[4-6 strings],correctAnswers:[2-4 exact option strings],conceptLabel}',
      'fill-blank': '{type:"fill-blank",question:"sentence with ___",expectedFill,acceptableAlternatives:[],conceptLabel}',
      'short-answer': '{type:"short-answer",question,expectedAnswer,conceptLabel}',
      'self-explanation': '{type:"self-explanation",question,rubric,conceptLabel}',
      'sequence-sense': '{type:"sequence-sense",question,items:[canonical strings],presentedOrder:[indices],intentionallyWrongIndex,orderingPrinciple,principleOptions:[],conceptLabel}',
      'relation-mismatch': '{type:"relation-mismatch",question,pairs:[{left,right}],wrongPairIndex,correctPartnerForWrong,candidatePartners:[],conceptLabel}',
      'answer-evidence': '{type:"answer-evidence",question,answerOptions:[4 strings],correctAnswer,evidencePrompt,evidenceOptions:[4 strings],correctEvidence,conceptLabel}',
      'numeric-response': '{type:"numeric-response",question,correctValue:number,tolerance:number,unit,acceptableUnits:[],conceptLabel}'
    };
    return schemas[type] || schemas.mcq;
  }
  function _quizDuplicateStrings(values) {
    var seen = {};
    var duplicates = [];
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var normalized = String(value || '').trim().toLowerCase();
      if (!normalized) return;
      if (seen[normalized] && duplicates.indexOf(normalized) === -1) duplicates.push(normalized);
      seen[normalized] = true;
    });
    return duplicates;
  }
  // Answer-key quality: fact-check verdicts, answer-cue audit, and a
  // deterministic key-position balance applied once at generation.
  function _quizNormChoice(value) { return String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' '); }
  function _quizFill(text, params) {
    var out = String(text || '');
    Object.keys(params || {}).forEach(function (name) { out = out.split('{' + name + '}').join(String(params[name])); });
    return out;
  }
  function _quizPlainCopy(key, fallback) { return fallback; }
  var _QUIZ_KEY_TOKEN = /\[\[\s*KEY\s*:\s*(CONFIRMED|DISPUTED)\s*(?::\s*(\d+))?\s*\]\]/i;
  var _quizFactCheckMarkerCache = null;
  function _quizFactCheckMarkers(t) {
    function read(key, fallback) {
      var value = typeof t === 'function' ? t(key) : '';
      return typeof value === 'string' && value && value !== key && value !== fallback ? [fallback, value] : [fallback];
    }
    return { verified: read('prompts.verified_correct', 'Verified Correct Answer'), correction: read('prompts.correction_warning', 'CORRECTION / WARNING'), actual: read('prompts.actual_correct', 'Actual Correct Answer') };
  }
  function _quizMarkerText(value) { return String(value || '').replace(/\*/g, '').replace(/[:：]\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function _quizSuggestedFromText(raw, options, actualMarkers) {
    var lines = String(raw || '').split(/\r?\n/);
    var found = '';
    lines.some(function (line) {
      var plain = line.replace(/\*/g, '');
      return (actualMarkers || []).some(function (marker) {
        var norm = _quizMarkerText(marker);
        var at = norm ? plain.toLowerCase().indexOf(norm) : -1;
        if (at < 0) return false;
        found = plain.slice(at + norm.length).replace(/^\s*[:：]\s*/, '');
        return true;
      });
    });
    var target = _quizNormChoice(found).replace(/[.;]+$/, '');
    if (!target) return '';
    var exact = options.filter(function (option) { return _quizNormChoice(option) === target; });
    if (exact.length === 1) return String(exact[0]);
    var contained = options.filter(function (option) { var norm = _quizNormChoice(option); return norm && target.indexOf(norm) >= 0; });
    return contained.length === 1 ? String(contained[0]) : '';
  }
  // Same fingerprint as QuizLiveAggregators.keyCheckShape (stem + option set).
  function _quizKeyCheckShape(q) {
    var canonical = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (canonical && typeof canonical.keyCheckShape === 'function') return canonical.keyCheckShape(q);
    var item = q && typeof q === 'object' ? q : {};
    var norm = function (value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase(); };
    var serialized = JSON.stringify([norm(item.question), (Array.isArray(item.options) ? item.options : []).map(norm).sort()]);
    var hash = 2166136261;
    for (var i = 0; i < serialized.length; i++) { hash ^= serialized.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'key-shape-v1:' + (hash >>> 0).toString(36);
  }
  function _quizReadFactCheck(text, q, markers) {
    var raw = String(text == null ? '' : text);
    if (!raw.trim()) return null;
    var options = q && Array.isArray(q.options) ? q.options : [];
    var key = q && q.correctAnswer != null ? String(q.correctAnswer) : '';
    var m = markers || _quizFactCheckMarkerCache || _quizFactCheckMarkers(null);
    var plain = raw.replace(/\*/g, '').toLowerCase();
    var has = function (list) { return (list || []).some(function (marker) { var norm = _quizMarkerText(marker); return !!norm && plain.indexOf(norm) >= 0; }); };
    var status = 'unclear', suggested = '';
    var token = raw.match(_QUIZ_KEY_TOKEN);
    if (token) {
      status = token[1].toUpperCase() === 'CONFIRMED' && !has(m.correction) ? 'confirmed' : 'disputed';
      var n = Number(token[2]);
      if (token[1].toUpperCase() === 'DISPUTED' && Number.isInteger(n) && n >= 1 && n <= options.length) suggested = String(options[n - 1]);
    } else if (has(m.correction)) {
      status = 'disputed';
      suggested = _quizSuggestedFromText(raw, options, m.actual);
    } else if (has(m.verified)) status = 'confirmed';
    if (suggested && _quizNormChoice(suggested) === _quizNormChoice(key)) suggested = '';
    return { status: status, suggestedAnswer: suggested, checkedKey: key, checkedShape: _quizKeyCheckShape(q) };
  }
  function _quizKeyCheck(q, markers) {
    if (!q || (q.type && q.type !== 'mcq')) return null;
    var key = q.correctAnswer != null ? String(q.correctAnswer) : '';
    var stored = q.keyCheck;
    if (stored && typeof stored === 'object' && ['confirmed', 'disputed', 'unclear'].indexOf(stored.status) >= 0) {
      if (String(stored.checkedKey == null ? '' : stored.checkedKey) !== key || stored.checkedShape != null && String(stored.checkedShape) !== _quizKeyCheckShape(q)) return { status: 'stale', suggestedAnswer: '', checkedKey: key };
      var options = Array.isArray(q.options) ? q.options : [];
      var suggestion = typeof stored.suggestedAnswer === 'string' && stored.suggestedAnswer && options.some(function (option) { return _quizNormChoice(option) === _quizNormChoice(stored.suggestedAnswer); }) ? stored.suggestedAnswer : '';
      return { status: stored.status, suggestedAnswer: suggestion, checkedKey: key };
    }
    return q.factCheck ? _quizReadFactCheck(q.factCheck, q, markers) : null;
  }
  function _quizIsAnswerKeyDisputed(q) {
    var canonical = window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (canonical && typeof canonical.isAnswerKeyDisputed === 'function') return canonical.isAnswerKeyDisputed(q);
    if (!q || !['mcq', 'multiple-choice', 'multiple-choice-question', 'single-select', 'true-false', 'tf'].includes(String(q.itemType || q.type || 'mcq').toLowerCase().replace(/_/g, '-'))) return false;
    var key = q.correctAnswer != null ? String(q.correctAnswer) : Number.isInteger(q.correctIndex) && Array.isArray(q.options) ? String(q.options[q.correctIndex]) : '';
    if (q.keyCheck && typeof q.keyCheck === 'object') {
      if (q.keyCheck.checkedKey != null && String(q.keyCheck.checkedKey) !== key) return false;
      if (q.keyCheck.checkedShape != null && String(q.keyCheck.checkedShape) !== _quizKeyCheckShape(q)) return false;
      if (['confirmed', 'disputed', 'unclear', 'stale'].indexOf(q.keyCheck.status) >= 0) return q.keyCheck.status === 'disputed';
    }
    var check = _quizKeyCheck(q);
    return !!(check && check.status === 'disputed');
  }
  function _quizFactCheckText(text) {
    return String(text == null ? '' : text).replace(/^[ \t]*\[\[\s*KEY\s*:[^\]\n]*\]\][ \t]*(\r?\n)?/gim, '').replace(/\[\[\s*KEY\s*:[^\]\n]*\]\]/gi, '').trim();
  }
  // Learner feedback shows only a CONFIRMED check. A facilitator's deliberate
  // reveal (presentation, review game) may also show an unparsed legacy check,
  // but never a disputed or stale one.
  function _quizStudentExplanation(q, facilitated) {
    if (!q || !q.factCheck) return '';
    var check = _quizKeyCheck(q);
    if (check && (check.status === 'disputed' || check.status === 'stale')) return '';
    if (!facilitated && (!check || check.status !== 'confirmed')) return '';
    return _quizFactCheckText(q.factCheck);
  }
  function _quizPlainExplanation(text) {
    return String(text || '').split(/\r?\n/).map(function (line) {
      return line.replace(/\*\*|__/g, '').replace(/^\s*#{1,6}\s*/, '').replace(/^(\s*)[*-]\s+/, '$1• ');
    }).join('\n').trim();
  }
  var _QUIZ_ORDER_REFERENCE = [/\b(all|none|both|neither)\s+of\s+(the\s+)?(above|below|these|those|them|options|answers|choices)\b/i, /^\s*(both\s+)?[a-h]\s*(and|&|or)\s*[a-h]\s*(only)?\s*\.?\s*$/i];
  function _quizNamesOtherOptions(option) {
    var text = String(option == null ? '' : option);
    return _QUIZ_ORDER_REFERENCE.some(function (pattern) { return pattern.test(text); });
  }
  function _quizFixedOrderOptions(options) {
    var norm = options.map(_quizNormChoice);
    if (options.length === 2 && ['true|false', 'false|true', 'yes|no', 'no|yes'].indexOf(norm.join('|')) >= 0) return true;
    return options.every(function (option) { return /^\s*[-+]?[$€£]?\d[\d,]*(\.\d+)?\s*[%a-z°µ/^\d ]{0,12}\s*$/i.test(String(option)); });
  }
  function _quizChoiceSets(q) {
    var type = q && q.type || 'mcq';
    if (type === 'mcq') return [{ field: 'options', parallel: ['optionFeedback', 'options_en', 'optionImagePrompts', 'optionImageAltTexts', 'optionImageUrls'], keys: [q.correctAnswer], group: 'mcq' }];
    if (type === 'answer-evidence') return [{ field: 'answerOptions', parallel: ['answerOptions_en', 'answerOptionImagePrompts', 'answerOptionImageAltTexts', 'answerOptionImageUrls', 'answerImagePrompts', 'answerImageAltTexts', 'answerImageUrls', 'optionImagePrompts', 'optionImageAltTexts', 'optionImageUrls'], keys: [q.correctAnswer], group: 'answer' }, { field: 'evidenceOptions', parallel: ['evidenceOptions_en', 'evidenceOptionImagePrompts', 'evidenceOptionImageAltTexts', 'evidenceOptionImageUrls', 'evidenceImagePrompts', 'evidenceImageAltTexts', 'evidenceImageUrls'], keys: [q.correctEvidence], group: 'evidence' }];
    if (type === 'multi-select') return [{ field: 'options', parallel: ['optionFeedback', 'options_en', 'optionImagePrompts', 'optionImageAltTexts', 'optionImageUrls'], keys: Array.isArray(q.correctAnswers) ? q.correctAnswers : [], group: '' }];
    if (type === 'relation-mismatch') return [{ field: 'candidatePartners', parallel: ['candidatePartners_en', 'candidatePartnerImagePrompts', 'candidatePartnerImageAltTexts', 'candidatePartnerImageUrls'], keys: [q.correctPartnerForWrong], group: '' }];
    return [];
  }
  function _quizKeyIndexes(options, keys) {
    var indexes = [];
    for (var k = 0; k < keys.length; k++) {
      var norm = _quizNormChoice(keys[k]);
      var hits = [];
      options.forEach(function (option, index) { if (norm && _quizNormChoice(option) === norm) hits.push(index); });
      if (hits.length !== 1 || indexes.indexOf(hits[0]) >= 0) return null;
      indexes.push(hits[0]);
    }
    return indexes;
  }
  function _quizSeededRandom(seedText) {
    var text = String(seedText || ''), state = 2166136261;
    for (var i = 0; i < text.length; i++) { state ^= text.charCodeAt(i); state = Math.imul(state, 16777619); }
    state = state >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      var x = state;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function _quizSeededShuffle(list, random) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)); var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp; }
    return copy;
  }
  // Reorders choices (and every per-option array with them) so single-key
  // positions are balanced across the quiz. Keys stay stored as text, so
  // grading is unchanged. Items whose order carries meaning are left alone.
  // Applies chooseOrder(set, options, keyIndexes) -> index order to each
  // reorderable choice set of one item; sets whose order carries meaning are skipped.
  function _quizReorderChoiceSets(q, chooseOrder) {
    if (!q || typeof q !== 'object') return q;
    var next = q;
    _quizChoiceSets(q).forEach(function (set) {
      var options = next[set.field];
      if (!Array.isArray(options) || options.length < 2 || options.some(function (option) { return typeof option !== 'string' || !option.trim(); })) return;
      if (_quizDuplicateStrings(options).length || options.some(_quizNamesOtherOptions) || _quizFixedOrderOptions(options)) return;
      // An empty parallel array (generation's "no optionFeedback") carries nothing to misalign.
      if (set.parallel.some(function (name) { return next[name] != null && (!Array.isArray(next[name]) || (next[name].length > 0 && next[name].length !== options.length)); })) return;
      var keyIndexes = _quizKeyIndexes(options, set.keys.filter(function (key) { return key != null && String(key).trim(); }));
      if (!keyIndexes || !keyIndexes.length) return;
      var order = chooseOrder(set, options, keyIndexes);
      if (!order) return;
      if (next === q) next = Object.assign({}, q);
      [set.field].concat(set.parallel).forEach(function (name) {
        if (Array.isArray(next[name]) && next[name].length) { var source = next[name]; next[name] = order.map(function (i) { return source[i]; }); }
      });
    });
    return next;
  }
  function _quizBalanceChoiceKeys(questions, seedText) {
    if (!Array.isArray(questions)) return questions;
    var random = _quizSeededRandom(seedText || JSON.stringify(questions.map(function (q) { return q && q.question || ''; })));
    var queues = {};
    function nextTarget(group, size) {
      var id = group + ':' + size;
      if (!queues[id] || !queues[id].length) queues[id] = _quizSeededShuffle(Array.from({ length: size }, function (_, i) { return i; }), random);
      return queues[id].shift();
    }
    return questions.map(function (q) {
      return _quizReorderChoiceSets(q, function (set, options, keyIndexes) {
        if (set.group && keyIndexes.length === 1) {
          var target = nextTarget(set.group, options.length);
          var rest = _quizSeededShuffle(options.map(function (_, i) { return i; }).filter(function (i) { return i !== keyIndexes[0]; }), random);
          return rest.slice(0, target).concat([keyIndexes[0]], rest.slice(target));
        }
        return _quizSeededShuffle(options.map(function (_, i) { return i; }), random);
      });
    });
  }
  // One regenerated item: move its key to the position the rest of the quiz
  // uses least (same group and option count), so it cannot add a position cue.
  function _quizBalanceReplacementKeys(questions, index, replacement) {
    var counts = {};
    (Array.isArray(questions) ? questions : []).forEach(function (q, i) {
      if (i === index || !q || typeof q !== 'object') return;
      _quizChoiceSets(q).forEach(function (set) {
        var options = q[set.field];
        var keys = set.group && Array.isArray(options) ? _quizKeyIndexes(options, set.keys.filter(function (key) { return key != null && String(key).trim(); })) : null;
        if (!keys || keys.length !== 1) return;
        var id = set.group + ':' + options.length;
        counts[id] = counts[id] || options.map(function () { return 0; });
        counts[id][keys[0]]++;
      });
    });
    var random = _quizSeededRandom(JSON.stringify([index, replacement && replacement.question || '']));
    return _quizReorderChoiceSets(replacement, function (set, options, keyIndexes) {
      if (!set.group || keyIndexes.length !== 1) return _quizSeededShuffle(options.map(function (_, i) { return i; }), random);
      var used = counts[set.group + ':' + options.length] || options.map(function () { return 0; });
      var least = Math.min.apply(null, used);
      var targets = used.map(function (count, i) { return count === least ? i : -1; }).filter(function (i) { return i >= 0; });
      var target = targets[Math.floor(random() * targets.length)];
      var rest = options.map(function (_, i) { return i; }).filter(function (i) { return i !== keyIndexes[0]; });
      return rest.slice(0, target).concat([keyIndexes[0]], rest.slice(target));
    });
  }
  // Same rules the generation prompt uses (generate_dispatcher _answerCueRules).
  var _QUIZ_ANSWER_CUE_RULES = 'ANSWER-CUE RULES for choice items: write every option in parallel grammatical form with similar length and detail, so the correct option is not the longest, the shortest, or the most specific. Never use "all of the above", "none of the above", or options that combine or name other options. Do not put absolute words (always, never, only, every) only in the wrong options. Vary which position holds the correct answer.';
  function _quizHasChoiceItems(types) {
    return (types || []).some(function (type) { return ['mcq', 'multi-select', 'answer-evidence'].indexOf(type || 'mcq') >= 0; });
  }
  // Types a teacher can add or convert to, in menu order (each has a schema and an editor).
  var _QUIZ_AUTHOR_TYPES = [['mcq', 'Multiple Choice'], ['multi-select', 'Multi-Select'], ['fill-blank', 'Fill-in-the-Blank'], ['short-answer', 'Brief Written Response'], ['self-explanation', 'Explain Your Reasoning'], ['numeric-response', 'Numeric Response'], ['answer-evidence', 'Answer + Evidence'], ['sequence-sense', 'Sequence Sense'], ['relation-mismatch', 'Relation Mismatch']];
  // Display names come from the generation picker's translated labels; the English in the table is the fallback.
  function _quizAuthorTypeLabel(type) {
    var key = type || 'mcq';
    var named = { 'mcq': t('quiz.format_mcq_label'), 'multi-select': t('quiz.format_multi_select_label'), 'fill-blank': t('quiz.format_fill_blank_label'), 'short-answer': t('quiz.format_short_answer_label'), 'self-explanation': t('quiz.format_self_explanation_label'), 'numeric-response': t('quiz.format_numeric_response_label'), 'answer-evidence': t('quiz.format_answer_evidence_label'), 'sequence-sense': t('quiz.format_sequence_sense_label'), 'relation-mismatch': t('quiz.format_relation_mismatch_label') }[key];
    if (named && named.indexOf('quiz.') !== 0) return named;
    var match = _QUIZ_AUTHOR_TYPES.filter(function (entry) { return entry[0] === key; })[0];
    return match ? match[1] : String(key);
  }
  // An empty item of each type, shaped for its editor; the quality review lists what is still missing.
  function _quizBlankItem(type) {
    var fields = {
      mcq: { options: ['', '', '', ''], correctAnswer: '' },
      'multi-select': { options: ['', '', '', ''], correctAnswers: [] },
      'fill-blank': { expectedFill: '', acceptableAlternatives: [] },
      'short-answer': { expectedAnswer: '' },
      'self-explanation': { rubric: '' },
      'numeric-response': { correctValue: '', tolerance: 0, unit: '', acceptableUnits: [] },
      'answer-evidence': { answerOptions: ['', '', '', ''], correctAnswer: '', evidencePrompt: '', evidenceOptions: ['', '', '', ''], correctEvidence: '' },
      'sequence-sense': { items: ['', '', ''], presentedOrder: [0, 1, 2], intentionallyWrongIndex: null, orderingPrinciple: '', principleOptions: ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'] },
      'relation-mismatch': { pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }], wrongPairIndex: null, correctPartnerForWrong: '', candidatePartners: ['', ''] }
    };
    var key = fields[type] ? type : 'mcq';
    return Object.assign({ id: 'assessment-item-' + Date.now(), type: key, question: '', conceptLabel: '' }, JSON.parse(JSON.stringify(fields[key])));
  }
  // AI rewrite payloads never carry a key check: the rewrite would echo a
  // verdict about wording it is about to change.
  function _quizAuthoringPayload(q) {
    if (!q || typeof q !== 'object') return q;
    var copy = Object.assign({}, q);
    delete copy.factCheck;
    delete copy.keyCheck;
    return copy;
  }
  // A repaired item that is unchanged in stem, options, and key keeps its check.
  function _quizKeepUnchangedKeyChecks(original, repaired) {
    var checks = {};
    (Array.isArray(original) ? original : []).forEach(function (q) {
      if (q && (q.factCheck || q.keyCheck)) checks[_quizKeyCheckShape(q) + '|' + String(q.correctAnswer)] = q;
    });
    return repaired.map(function (q) {
      var source = q && typeof q === 'object' && (q.type || 'mcq') === 'mcq' ? checks[_quizKeyCheckShape(q) + '|' + String(q.correctAnswer)] : null;
      var clean = _quizAuthoringPayload(q);
      return source ? Object.assign(clean, source.factCheck ? { factCheck: source.factCheck } : {}, source.keyCheck ? { keyCheck: source.keyCheck } : {}) : clean;
    });
  }
  function _quizLengthRankIndex(options, keyIndex) {
    var lengths = options.map(function (option) { return _quizNormChoice(option).length; });
    var keyLength = lengths[keyIndex];
    if (lengths.some(function (length, i) { return i !== keyIndex && length === keyLength; })) return -1;
    return lengths.filter(function (length) { return length > keyLength; }).length;
  }
  // Warnings only. Over-use of a rank/position is checked from 5 items; a
  // rank/position that is (almost) never keyed needs 10 items to mean much.
  function _quizAnswerCueIssues(questions, copy) {
    var tr = typeof copy === 'function' ? copy : _quizPlainCopy;
    var issues = [];
    var ranks = [0, 0, 0, 0], rankTotal = 0, positions = [0, 0, 0, 0], positionTotal = 0;
    var absolute = /\b(always|never|only|every)\b/i;
    (Array.isArray(questions) ? questions : []).forEach(function (q, index) {
      if (!q || typeof q !== 'object') return;
      var type = q.type || 'mcq';
      var options = type === 'answer-evidence' ? q.answerOptions : q.options;
      if (['mcq', 'multi-select', 'answer-evidence'].indexOf(type) < 0 || !Array.isArray(options)) return;
      if (options.some(_quizNamesOtherOptions)) issues.push({ questionIdx: index, severity: 'warning', code: 'order-reference-option', message: tr('quiz.key_quality.order_reference', 'Avoid all of the above, none of the above, and options that name other options. Students can answer by elimination.') });
      if (type === 'multi-select') return;
      var keyIndexes = _quizKeyIndexes(options, [q.correctAnswer]);
      if (!keyIndexes) return;
      var keyIndex = keyIndexes[0];
      var distractorAbsolute = options.some(function (option, i) { return i !== keyIndex && absolute.test(String(option)); });
      if (distractorAbsolute && !absolute.test(String(options[keyIndex]))) issues.push({ questionIdx: index, severity: 'warning', code: 'absolute-distractor', message: tr('quiz.key_quality.absolute_distractor', 'Absolute words (always, never, only, every) appear only in wrong options, which signals they are wrong.') });
      var keyed = [[options, keyIndex]];
      if (type === 'answer-evidence' && Array.isArray(q.evidenceOptions)) {
        var evidenceKeys = _quizKeyIndexes(q.evidenceOptions, [q.correctEvidence]);
        if (evidenceKeys) keyed.push([q.evidenceOptions, evidenceKeys[0]]);
      }
      keyed.forEach(function (entry) {
        if (entry[0].length !== 4) return;
        positions[entry[1]]++; positionTotal++;
        var rank = _quizLengthRankIndex(entry[0], entry[1]);
        if (rank >= 0) { ranks[rank]++; rankTotal++; }
      });
    });
    function outOfRange(count, total) { return (total >= 5 && count / total > 0.4) || (total >= 10 && count / total < 0.1); }
    function shares(counts, total, names) { return counts.map(function (count, i) { return names[i] + ' ' + Math.round(count / total * 100) + '%'; }).join(', '); }
    var rankNames = [tr('quiz.key_quality.rank_longest', 'longest'), tr('quiz.key_quality.rank_second', 'second longest'), tr('quiz.key_quality.rank_third', 'third longest'), tr('quiz.key_quality.rank_shortest', 'shortest')];
    if (ranks.some(function (count) { return outOfRange(count, rankTotal); })) issues.push({ questionIdx: null, severity: 'warning', code: 'key-length-rank', message: _quizFill(tr('quiz.key_quality.length_rank', 'Correct answers by option length: {shares} (aim for 10-40% each). Students can guess by option length.'), { shares: shares(ranks, rankTotal, rankNames) }) });
    if (positions.some(function (count) { return outOfRange(count, positionTotal); })) issues.push({ questionIdx: null, severity: 'warning', code: 'key-position', message: _quizFill(tr('quiz.key_quality.position', 'Correct answers by position: {shares} (aim for 10-40% each). Students can guess by position.'), { shares: shares(positions, positionTotal, ['A', 'B', 'C', 'D']) }) });
    return issues;
  }
  function _quizHasNumericKey(value) {
    return (typeof value === 'number' || typeof value === 'string')
      && String(value).trim() !== '' && Number.isFinite(Number(value));
  }
  function _quizAuditAssessment(data, auditOptions) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var requested = data && data.requestedItemTypeMix && typeof data.requestedItemTypeMix === 'object' ? data.requestedItemTypeMix : null;
    var actual = {};
    var issues = [];
    var auditMarkers = auditOptions && auditOptions.markers || null;
    var auditCopy = auditOptions && typeof auditOptions.copy === 'function' ? auditOptions.copy : _quizPlainCopy;
    function add(questionIdx, severity, message, code) {
      issues.push({ questionIdx: questionIdx, severity: severity, message: message, code: code || 'quality' });
    }
    questions.forEach(function (q, index) {
      if (!q || typeof q !== 'object') {
        add(index, 'error', 'Question data is missing.', 'missing-question');
        return;
      }
      var type = q.type || 'mcq';
      actual[type] = (actual[type] || 0) + 1;
      if (!String(q.question || '').trim()) add(index, 'error', 'The question prompt is empty.', 'empty-prompt');
      if (!String(q.conceptLabel || '').trim()) add(index, 'warning', 'Add a concept label for clearer results and retention tracking.', 'concept-label');
      if (type === 'mcq') {
        var mcqOptions = Array.isArray(q.options) ? q.options : [];
        if (mcqOptions.length < 2) add(index, 'error', 'Multiple choice needs at least two options.', 'mcq-options');
        if (mcqOptions.some(function (option) { return typeof option !== 'string' || !option.trim(); })) add(index, 'error', 'Every multiple-choice option needs text.', 'empty-options');
        if (mcqOptions.indexOf(q.correctAnswer) === -1) add(index, 'error', 'The correct answer must match one option exactly.', 'mcq-key');
        if (_quizDuplicateStrings(mcqOptions).length) add(index, 'error', 'Multiple-choice options contain duplicates.', 'duplicate-options');
        var keyCheck = _quizKeyCheck(q, auditMarkers);
        if (keyCheck && keyCheck.status === 'disputed') add(index, 'error', auditCopy('quiz.key_quality.disputed_issue', 'The fact check disputes this answer key. Review the item or use the suggested key before sharing.'), 'key-disputed');
        else if (keyCheck && keyCheck.status === 'stale') add(index, 'warning', auditCopy('quiz.key_quality.stale_issue', 'The answer key changed after the fact check. Run the check again.'), 'key-check-stale');
        else if (keyCheck && keyCheck.status === 'unclear') add(index, 'warning', auditCopy('quiz.key_quality.unclear_issue', 'The fact check result could not be read. Review the explanation before sharing.'), 'key-check-unclear');
      } else if (type === 'multi-select') {
        var multiOptions = Array.isArray(q.options) ? q.options : [];
        var correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        if (multiOptions.length < 3) add(index, 'error', 'Multi-select needs at least three options.', 'multi-options');
        if (multiOptions.some(function (option) { return typeof option !== 'string' || !option.trim(); })) add(index, 'error', 'Every multi-select option needs text.', 'empty-options');
        if (correctAnswers.length < 2) add(index, 'error', 'Multi-select should identify at least two correct options.', 'multi-key');
        if (correctAnswers.some(function (answer) { return multiOptions.indexOf(answer) === -1; })) add(index, 'error', 'Every multi-select answer key must match an option exactly.', 'multi-key-match');
        if (correctAnswers.length >= multiOptions.length && multiOptions.length) add(index, 'warning', 'Every option is marked correct, which makes the item weak.', 'multi-all-correct');
        if (_quizDuplicateStrings(multiOptions).length) add(index, 'error', 'Multi-select options contain duplicates.', 'duplicate-options');
        if (_quizDuplicateStrings(correctAnswers).length) add(index, 'error', 'Multi-select answer keys contain duplicates.', 'duplicate-keys');
      } else if (type === 'fill-blank') {
        if (String(q.question || '').indexOf('___') === -1) add(index, 'warning', 'The prompt should visibly contain ___ for the blank.', 'blank-marker');
        if (!String(q.expectedFill || '').trim()) add(index, 'error', 'Fill-in-the-blank needs an expected answer.', 'fill-key');
      } else if (type === 'short-answer') {
        if (!String(q.expectedAnswer || '').trim()) add(index, 'error', 'Brief written response needs a reference answer.', 'written-key');
      } else if (type === 'self-explanation') {
        if (!String(q.rubric || q.expectedAnswer || '').trim()) add(index, 'error', 'Explain Your Reasoning needs a rubric.', 'rubric');
      } else if (type === 'sequence-sense') {
        var items = Array.isArray(q.items) ? q.items : [];
        var order = Array.isArray(q.presentedOrder) ? q.presentedOrder : [];
        if (items.length < 3) add(index, 'error', 'Sequence Sense needs at least three steps.', 'sequence-items');
        var itemTexts = items.map(function (item) { return typeof item === 'string' ? item : item && item.text; });
        if (itemTexts.some(function (text) { return typeof text !== 'string' || !text.trim(); })) add(index, 'error', 'Every sequence step needs text.', 'sequence-empty-items');
        if (_quizDuplicateStrings(itemTexts).length) add(index, 'error', 'Sequence steps must be distinct.', 'sequence-duplicate-items');
        var orderIsPermutation = order.length === items.length && !order.some(function (value) { return !Number.isInteger(value) || value < 0 || value >= items.length; }) && new Set(order).size === order.length;
        if (!orderIsPermutation) add(index, 'error', 'Displayed order must use every step index exactly once.', 'sequence-order');
        if (orderIsPermutation && items.length >= 3) {
          var authoredWrong = q.intentionallyWrongIndex;
          var sequenceTruth = sequenceSenseTruth(order, authoredWrong, items.length);
          if (sequenceTruth.orderIsCorrect && authoredWrong != null) add(index, 'warning', 'The displayed order is already correct, so no position is misplaced. Clear the misplaced position or change the displayed order.', 'sequence-misplaced');
          else if (!sequenceTruth.orderIsCorrect && (authoredWrong == null || sequenceTruth.misplaced.indexOf(authoredWrong) === -1)) add(index, 'warning', 'The misplaced position does not match the displayed order (positions out of place: ' + sequenceTruth.misplaced.map(function (value) { return value + 1; }).join(', ') + ').', 'sequence-misplaced');
        }
        if (!String(q.orderingPrinciple || '').trim()) add(index, 'error', 'Sequence Sense needs an ordering principle.', 'sequence-principle');
        var principles = Array.isArray(q.principleOptions) ? q.principleOptions : ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'];
        if (principles.length < 2 || principles.some(function (value) { return typeof value !== 'string' || !value.trim(); }) || _quizDuplicateStrings(principles).length) add(index, 'error', 'Provide at least two distinct, nonempty ordering principle choices.', 'sequence-principle-options');
        if (principles.indexOf(q.orderingPrinciple) === -1) add(index, 'error', 'Principle choices must include the correct ordering principle.', 'sequence-principle-key');
      } else if (type === 'relation-mismatch') {
        var pairs = Array.isArray(q.pairs) ? q.pairs : [];
        var wrongIndex = Number(q.wrongPairIndex);
        if (pairs.length < 3) add(index, 'error', 'Relation Mismatch needs at least three pairs.', 'relation-pairs');
        if (pairs.some(function (pair) { return !pair || !String(pair.left || '').trim() || !String(pair.right || '').trim(); })) add(index, 'error', 'Every relation pair needs text on both sides.', 'relation-empty-pairs');
        if (!_quizHasNumericKey(q.wrongPairIndex) || !Number.isInteger(wrongIndex) || wrongIndex < 0 || wrongIndex >= pairs.length) add(index, 'error', 'Choose which displayed pair is incorrect.', 'relation-index');
        if (!String(q.correctPartnerForWrong || '').trim()) add(index, 'error', 'Provide the correct partner for the mismatched pair.', 'relation-key');
        if (!Array.isArray(q.candidatePartners) || q.candidatePartners.indexOf(q.correctPartnerForWrong) === -1) add(index, 'error', 'Candidate partners must include the correct repair.', 'relation-candidates');
        var partners = Array.isArray(q.candidatePartners) ? q.candidatePartners : [];
        if (partners.length < 2 || partners.some(function (value) { return typeof value !== 'string' || !value.trim(); }) || _quizDuplicateStrings(partners).length) add(index, 'error', 'Provide at least two distinct, nonempty candidate partners.', 'relation-partner-options');
      } else if (type === 'answer-evidence') {
        var answers = Array.isArray(q.answerOptions) ? q.answerOptions : [];
        var evidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
        if (answers.length < 2 || answers.indexOf(q.correctAnswer) === -1) add(index, 'error', 'Answer + Evidence needs a valid answer key.', 'evidence-answer-key');
        if (evidence.length < 2 || evidence.indexOf(q.correctEvidence) === -1) add(index, 'error', 'Answer + Evidence needs a valid evidence key.', 'evidence-key');
        if (_quizDuplicateStrings(answers).length || _quizDuplicateStrings(evidence).length) add(index, 'error', 'Answer or evidence choices contain duplicates.', 'duplicate-options');
        if (answers.concat(evidence).some(function (value) { return typeof value !== 'string' || !value.trim(); })) add(index, 'error', 'Every answer and evidence choice needs text.', 'empty-options');
      } else if (type === 'numeric-response') {
        if (!_quizHasNumericKey(q.correctValue)) add(index, 'error', 'Numeric Response needs a valid numeric answer.', 'numeric-key');
        if (!_quizHasNumericKey(q.tolerance) || Number(q.tolerance) < 0) add(index, 'error', 'Numeric tolerance must be zero or greater.', 'numeric-tolerance');
        var normalizedUnits = [q.unit || ''].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(_quizNormalizeUnit).filter(Boolean);
        if (_quizDuplicateStrings(normalizedUnits).length) add(index, 'warning', 'Accepted units contain duplicate spellings.', 'numeric-units');
      } else {
        add(index, 'error', 'Unsupported question type: ' + type + '.', 'unsupported-type');
      }
    });
    var missingMix = {};
    if (requested) {
      Object.keys(requested).forEach(function (type) {
        var difference = Math.max(0, Number(requested[type] || 0) - Number(actual[type] || 0));
        if (difference > 0) {
          missingMix[type] = difference;
          add(null, 'error', 'Missing ' + difference + ' ' + type + ' item' + (difference === 1 ? '' : 's') + ' from the requested recipe.', 'missing-type');
        }
      });
      Object.keys(actual).forEach(function (type) {
        var extra = Math.max(0, Number(actual[type] || 0) - Number(requested[type] || 0));
        if (extra > 0) add(null, 'warning', 'Generated ' + extra + ' extra ' + type + ' item' + (extra === 1 ? '' : 's') + '.', 'extra-type');
      });
    }
    var weakItems = data && data.distractorReview && Array.isArray(data.distractorReview.weakItems) ? data.distractorReview.weakItems : [];
    weakItems.forEach(function (index) {
      if (!issues.some(function (issue) { return issue.questionIdx === index && issue.code === 'weak-distractor'; })) add(index, 'warning', 'One or more distractors are generic rather than misconception-based.', 'weak-distractor');
    });
    _quizAnswerCueIssues(questions, auditCopy).forEach(function (issue) { add(issue.questionIdx, issue.severity, issue.message, issue.code); });
    return {
      questions: questions,
      requestedMix: requested,
      actualMix: actual,
      missingMix: missingMix,
      issues: issues,
      errorCount: issues.filter(function (issue) { return issue.severity === 'error'; }).length,
      warningCount: issues.filter(function (issue) { return issue.severity === 'warning'; }).length,
      ready: issues.filter(function (issue) { return issue.severity === 'error'; }).length === 0
    };
  }
  function _quizH5PPreflight(data) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var allMcq = questions.length > 0 && questions.every(function (q) { return !q || !q.type || q.type === 'mcq'; });
    var valid = 0;
    var adapted = 0;
    var manualReview = 0;
    questions.forEach(function (q) {
      q = q || {};
      var type = q.type || 'mcq';
      var prompt = String(q.question || '').trim();
      var okay = false;
      if (type === 'mcq') {
        var mcqOptions = Array.isArray(q.options) ? q.options.filter(function (option) { return String(option || '').trim(); }) : [];
        okay = !!prompt && mcqOptions.length >= 2 && (!allMcq || mcqOptions.length <= 4) && mcqOptions.indexOf(q.correctAnswer) !== -1;
      } else if (type === 'multi-select') {
        var multiOptions = Array.isArray(q.options) ? q.options : [];
        var multiKeys = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        okay = !!prompt && multiOptions.length >= 2 && multiKeys.length > 0 && multiKeys.every(function (answer) { return multiOptions.indexOf(answer) !== -1; });
      } else if (type === 'fill-blank') {
        okay = !!prompt && !!String(q.expectedFill || '').trim();
        if (okay && ['normalized', 'review-variants'].includes(q.fillBlankPolicy)) { adapted += 1; manualReview += 1; }
      } else if (type === 'short-answer') {
        okay = !!prompt;
        manualReview += okay ? 1 : 0;
      } else if (type === 'self-explanation') {
        okay = !!prompt;
        manualReview += okay ? 1 : 0;
      } else if (type === 'sequence-sense') {
        okay = !!prompt && Array.isArray(q.items) && q.items.length >= 3;
        adapted += okay ? 1 : 0;
        manualReview += okay ? 1 : 0;
      } else if (type === 'relation-mismatch') {
        var wrongIndex = Number(q.wrongPairIndex);
        okay = !!prompt && Array.isArray(q.pairs) && q.pairs.length >= 2 && Number.isInteger(wrongIndex) && wrongIndex >= 0 && wrongIndex < q.pairs.length && Array.isArray(q.candidatePartners) && q.candidatePartners.length >= 2 && q.candidatePartners.indexOf(q.correctPartnerForWrong) !== -1;
        adapted += okay ? 1 : 0;
        manualReview += okay && (q.requireReasoning || q.explanationPrompt) ? 1 : 0;
      } else if (type === 'answer-evidence') {
        okay = !!prompt && Array.isArray(q.answerOptions) && q.answerOptions.length >= 2 && q.answerOptions.indexOf(q.correctAnswer) !== -1 && Array.isArray(q.evidenceOptions) && q.evidenceOptions.length >= 2 && q.evidenceOptions.indexOf(q.correctEvidence) !== -1;
        adapted += okay ? 1 : 0;
        manualReview += okay && (q.requireReasoning || q.explanationPrompt) ? 1 : 0;
      } else if (type === 'numeric-response') {
        okay = !!prompt && _quizHasNumericKey(q.correctValue);
        adapted += okay ? 1 : 0;
        manualReview += okay && (Number(q.tolerance) > 0 || q.numericSettings?.allowEquivalentUnits || q.numericSettings?.valueWeight != null && Number(q.numericSettings.valueWeight) !== 0.5) ? 1 : 0;
      }
      if (okay) valid += 1;
    });
    return {
      total: questions.length,
      valid: valid,
      omitted: questions.length - valid,
      adapted: adapted,
      manualReview: manualReview,
      library: allMcq ? 'Single Choice Set 1.11' : 'Question Set 1.21',
      ready: valid > 0
    };
  }
  function QuizVoiceInputButton(p) {
    var statusState = React.useState({ state: 'idle', engineLabel: '', privacy: '', message: '' });
    var status = statusState[0];
    var setStatus = statusState[1];
    var controllerRef = React.useRef(null);
    var mountedRef = React.useRef(true);
    var voiceHandoffRef = React.useRef({ token: 0, restore: false });
    var voice = typeof window !== 'undefined' ? window.AlloFlowVoice : null;
    var nativeSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    var sharedServicePresent = !!(voice && typeof voice.isDictationSupported === 'function');
    var coordinatedFallbackPresent = !!(voice && typeof voice.acquireVoiceSession === 'function');
    var sharedSupported = sharedServicePresent && voice.isDictationSupported();
    var supported = p.allowDictation !== false && (sharedServicePresent ? sharedSupported : (nativeSupported && coordinatedFallbackPresent));
    React.useEffect(function () {
      mountedRef.current = true;
      return function () {
        mountedRef.current = false;
        try { if (controllerRef.current) controllerRef.current.abort('unmount'); } catch (e) {}
        controllerRef.current = null;
      };
    }, []);
    function appendTranscript(transcript) {
      var clean = String(transcript || '').trim();
      if (!clean || typeof p.onChange !== 'function') return;
      var prior = String(p.value || '').trim();
      p.onChange((prior ? prior + ' ' : '') + clean);
    }
    function beginVoiceHandoff() {
      var next = { token: voiceHandoffRef.current.token + 1, restore: false };
      try {
        var loop = window.__alloVoiceLoop;
        var wasActive = !!(loop && typeof loop.isActive === 'function' && loop.isActive());
        var wasPaused = !!(wasActive && loop && typeof loop.isPaused === 'function' && loop.isPaused());
        next.restore = wasActive && !wasPaused;
        if (wasActive && typeof loop.stop === 'function') loop.stop();
      } catch (e) {
        next.restore = false;
      }
      voiceHandoffRef.current = next;
      return next.token;
    }
    function restoreVoiceAccess(token, reason) {
      var handoff = voiceHandoffRef.current;
      if (!handoff || handoff.token !== token || !handoff.restore) return;
      // A replacement session represents newer user intent. Never reopen the
      // microphone after another owner (including a newly toggled Voice Access
      // session) displaced this dictation.
      if (reason === 'replaced' || reason === 'external') {
        handoff.restore = false;
        return;
      }
      handoff.restore = false;
      window.setTimeout(function () {
        try {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          var shared = window.AlloFlowVoice;
          var sessionStatus = shared && typeof shared.getActiveVoiceSessionStatus === 'function'
            ? shared.getActiveVoiceSessionStatus() : null;
          if (sessionStatus && sessionStatus.owner) return;
          var loop = window.__alloVoiceLoop;
          if (!loop || typeof loop.start !== 'function') return;
          if (typeof loop.isActive !== 'function' || !loop.isActive()) loop.start();
        } catch (e) {}
      }, 150);
    }
    function updateDictationStatus(nextStatus, token) {
      var next = nextStatus && typeof nextStatus === 'object' ? nextStatus : { state: 'idle' };
      if (mountedRef.current) setStatus(next);
      if (next.state === 'idle' || next.state === 'error') restoreVoiceAccess(token, next.reason || '');
    }
    function createNativeFallback(token) {
      var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      var coordinator = window.AlloFlowVoice;
      if (!Recognition || !coordinator || typeof coordinator.acquireVoiceSession !== 'function') return null;
      var recognition = new Recognition();
      var active = false;
      var terminal = false;
      var lease = null;
      function release(reason) {
        var currentLease = lease;
        lease = null;
        if (currentLease && typeof currentLease.release === 'function') {
          try { currentLease.release(reason || 'completed'); } catch (e) {}
        }
      }
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang : 'en-US';
      recognition.onstart = function () {
        active = true;
        updateDictationStatus({ state: 'listening', engineLabel: window.__alloLocalSRShim ? 'On-device Whisper' : 'Browser speech service', privacy: window.__alloLocalSRShim ? 'Audio stays on this device.' : 'Your browser may send audio to its speech provider.', message: 'Listening...' }, token);
      };
      recognition.onresult = function (event) {
        var transcript = event && event.results && event.results[0] && event.results[0][0] ? event.results[0][0].transcript : '';
        appendTranscript(transcript);
      };
      recognition.onerror = function (event) {
        active = false;
        terminal = true;
        release('error');
        updateDictationStatus({ state: 'error', engineLabel: '', privacy: '', reason: event && event.error || 'error', message: event && event.error === 'not-allowed' ? 'Microphone permission was not granted.' : 'Dictation was unavailable.' }, token);
      };
      recognition.onend = function () {
        active = false;
        if (terminal) return;
        terminal = true;
        release('completed');
        updateDictationStatus({ state: 'idle', engineLabel: '', privacy: '', reason: 'completed', message: 'Dictation added.' }, token);
      };
      return {
        start: function () {
          terminal = false;
          lease = coordinator.acquireVoiceSession('quiz-dictation', {
            mode: 'dictation',
            label: 'Quiz dictation',
            state: 'starting',
            message: 'Starting microphone...',
            onStop: function (reason) {
              lease = null;
              active = false;
              terminal = true;
              try { recognition.abort(); } catch (e) {}
              updateDictationStatus({ state: 'idle', engineLabel: '', privacy: '', reason: reason || 'replaced', message: '' }, token);
            }
          });
          try {
            recognition.start();
            return true;
          } catch (error) {
            terminal = true;
            release('start-error');
            throw error;
          }
        },
        stop: function () { recognition.stop(); },
        abort: function (reason) {
          active = false;
          terminal = true;
          try { recognition.abort(); } catch (e) {}
          release(reason || 'cancelled');
          updateDictationStatus({ state: 'idle', engineLabel: '', privacy: '', reason: reason || 'cancelled', message: '' }, token);
        },
        isActive: function () { return active; },
        getState: function () { return active ? 'listening' : 'idle'; }
      };
    }
    function toggle() {
      if (!supported || p.disabled) return;
      var current = controllerRef.current;
      if (current && current.isActive && current.isActive()) {
        current.stop();
        return;
      }
      var handoffToken = beginVoiceHandoff();
      if (voice && typeof voice.createDictationController === 'function') {
        current = voice.createDictationController({
          owner: 'quiz-dictation',
          label: 'Quiz dictation',
          continuous: false,
          restartOnEnd: false,
          lang: typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang : 'en-US',
          onTranscript: appendTranscript,
          onStateChange: function (nextStatus) { updateDictationStatus(nextStatus, handoffToken); }
        });
      } else {
        current = createNativeFallback(handoffToken);
      }
      controllerRef.current = current;
      if (!current) {
        updateDictationStatus({ state: 'error', engineLabel: '', privacy: '', reason: 'unavailable', message: 'Dictation was unavailable.' }, handoffToken);
        return;
      }
      try {
        if (current.start() === false) restoreVoiceAccess(handoffToken, 'start-failed');
      } catch (e) {
        updateDictationStatus({ state: 'error', engineLabel: '', privacy: '', reason: 'start-error', message: 'Dictation was unavailable.' }, handoffToken);
      }
    }
    if (!supported) return null;
    var listening = status.state === 'starting' || status.state === 'listening';
    var transcribing = status.state === 'transcribing';
    var buttonLabel = listening ? 'Stop dictation' : transcribing ? 'Transcribing...' : (p.label || 'Dictate response');
    return <div className="mt-2 flex items-center gap-2 flex-wrap"><button type="button" onClick={toggle} disabled={p.disabled || transcribing} aria-pressed={listening} aria-busy={transcribing} data-dictation-engine={status.engine || ''} className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-semibold disabled:opacity-50 ' + (listening || transcribing ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}><span aria-hidden="true">🎙</span>{buttonLabel}</button>{status.message && <span role="status" aria-live="polite" className="text-[10px] text-slate-600"><span className="font-semibold">{status.message}</span>{status.engineLabel && <span>{' · ' + status.engineLabel}</span>}{status.privacy && <span>{' · ' + status.privacy}</span>}</span>}</div>;
  }
  function _quizAuthoringListPatch(q, field, values, operation) {
    var previous = Array.isArray(q[field]) ? q[field] : [];
    var change = operation || {};
    var removing = change.type === 'remove' && Number.isInteger(change.index) && change.index >= 0 && change.index < previous.length && values.length === previous.length - 1;
    var adding = change.type === 'add' && Number.isInteger(change.index) && change.index >= 0 && change.index <= previous.length && values.length === previous.length + 1;
    // Keep the identity of each surviving row. Text matching cannot distinguish
    // a rename from a removal that shifts the remaining rows into its position.
    var sourceIndexes = values.map(function (value, index) {
      if (removing) return index < change.index ? index : index + 1;
      if (adding) return index < change.index ? index : index === change.index ? -1 : index - 1;
      return values.length === previous.length ? index : previous.indexOf(value);
    });
    var update = {};
    update[field] = values;
    var choiceSet = _quizChoiceSets(q).find(function (set) { return set.field === field; });
    var parallel = choiceSet ? choiceSet.parallel : field === 'items' ? ['items_en', 'itemImagePrompts', 'itemImageAltTexts', 'itemImageUrls']
      : field === 'principleOptions' ? ['principleOptions_en', 'principleOptionImagePrompts', 'principleOptionImageAltTexts', 'principleOptionImageUrls', 'principleOptionsImagePrompts', 'principleOptionsImageAltTexts', 'principleOptionsImageUrls']
      : field === 'pairs' ? ['pairs_en'] : [];
    if (removing || adding || values.length !== previous.length) parallel.forEach(function (name) {
      if (Array.isArray(q[name])) update[name] = sourceIndexes.map(function (index) {
        return index >= 0 && index < q[name].length ? q[name][index] : name === 'pairs_en' ? {} : '';
      });
    });
    function keyIndex(key) {
      var exact = previous.indexOf(key);
      return exact >= 0 ? exact : previous.findIndex(function (value) { return _quizAnswerMatches(value, key); });
    }
    function updatedKey(key) {
      var index = keyIndex(key);
      if (index < 0) return key;
      var nextIndex = sourceIndexes.indexOf(index);
      return nextIndex >= 0 ? values[nextIndex] : '';
    }
    if (q.type === 'multi-select' && field === 'options') {
      var keys = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
      // Removing a keyed choice changes the correct set. Require the author to
      // select it again rather than silently publishing an incomplete key.
      update.correctAnswers = removing && keys.some(function (key) { return _quizAnswerMatches(previous[change.index], key); })
        ? [] : keys.map(updatedKey);
    }
    var keyField = field === 'answerOptions' ? 'correctAnswer' : field === 'evidenceOptions' ? 'correctEvidence'
      : field === 'principleOptions' ? 'orderingPrinciple' : field === 'candidatePartners' ? 'correctPartnerForWrong' : '';
    if (keyField) update[keyField] = updatedKey(q[keyField]);
    if (field === 'pairs') {
      var wrong = _quizHasNumericKey(q.wrongPairIndex) ? Number(q.wrongPairIndex) : -1;
      if (removing && wrong === change.index) { update.wrongPairIndex = null; update.correctPartnerForWrong = ''; }
      else if (wrong >= 0 && sourceIndexes.indexOf(wrong) >= 0) update.wrongPairIndex = sourceIndexes.indexOf(wrong);
    }
    if (field === 'items' && (removing || adding)) {
      var order = q.presentedOrder;
      var validOrder = Array.isArray(order) && order.length === previous.length && new Set(order).size === previous.length
        && order.every(function (index) { return Number.isInteger(index) && index >= 0 && index < previous.length; });
      if (validOrder) {
        var nextOrder = order.map(function (index) { return sourceIndexes.indexOf(index); }).filter(function (index) { return index >= 0; });
        if (adding) nextOrder.push(change.index);
        update.presentedOrder = nextOrder;
        var wrongPosition = _quizHasNumericKey(q.intentionallyWrongIndex) ? Number(q.intentionallyWrongIndex) : -1;
        var wrongItem = order[wrongPosition];
        var nextWrongPosition = wrongPosition >= 0 ? nextOrder.indexOf(sourceIndexes.indexOf(wrongItem)) : -1;
        update.intentionallyWrongIndex = nextWrongPosition >= 0 && !nextOrder.every(function (index, position) { return index === position; }) ? nextWrongPosition : null;
      }
    }
    return update;
  }
  function AssessmentTextListEditor(p) {
    var values = Array.isArray(p.values) ? p.values : [];
    function change(index, value) {
      var next = values.slice();
      next[index] = value;
      p.onChange(next, { type: 'edit', index: index });
    }
    function remove(index) {
      if (values.length <= (p.minimum || 0)) return;
      p.onChange(values.filter(function (_, itemIndex) { return itemIndex !== index; }), { type: 'remove', index: index });
    }
    return <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-700">{p.label}</label>{values.map(function (value, index) {
      return <div key={index} className="flex gap-2 items-center"><input aria-label={p.label + ' ' + (index + 1)} value={value} onChange={function (event) { change(index, event.target.value); }} className="flex-1 min-w-0 text-xs border-slate-300 rounded-md p-2 bg-white" /><button type="button" onClick={function () { remove(index); }} disabled={values.length <= (p.minimum || 0)} className="w-7 h-7 rounded border border-rose-200 text-rose-700 bg-white disabled:opacity-30" aria-label={'Remove ' + p.label + ' ' + (index + 1)}>×</button></div>;
    })}<button type="button" onClick={function () { p.onChange(values.concat(['']), { type: 'add', index: values.length }); }} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">+ Add {p.itemLabel || 'item'}</button></div>;
  }
  // With every item deleted there is no edit bar left, so the list offers the first item here.
  function AssessmentEmptyAddPanel(p) {
    var a = p.authoring || {};
    var typeState = React.useState('mcq');
    var busy = !!(a.addingAfter && a.addingAfter[-1]);
    if (typeof a.onAddItem !== 'function') return null;
    return <div role="group" aria-label={t('quiz.authoring.empty_label')} data-assess-empty-add className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 p-4 space-y-2">
      <p className="text-sm font-bold text-slate-800">{t('quiz.authoring.empty_title')}</p>
      <div className="flex items-end gap-2 flex-wrap">
        <label className="text-[11px] font-semibold text-slate-700" htmlFor="assess-empty-add-type">{t('quiz.authoring.item_type')}<select id="assess-empty-add-type" value={typeState[0]} onChange={function (event) { typeState[1](event.target.value); }} className="block mt-1 text-xs border-slate-300 rounded p-1.5 bg-white">{_QUIZ_AUTHOR_TYPES.map(function (entry) { return <option key={entry[0]} value={entry[0]}>{_quizAuthorTypeLabel(entry[0])}</option>; })}</select></label>
        <button type="button" disabled={busy} onClick={function () { a.onAddItem(-1, typeState[0], 'ai'); }} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">{busy ? t('quiz.authoring.writing') : t('quiz.authoring.write_for_me')}</button>
        <button type="button" onClick={function () { a.onAddItem(-1, typeState[0], 'blank'); }} className="px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold">{t('quiz.authoring.start_blank')}</button>
      </div>
    </div>;
  }
  // The edit bar's add/retype handlers and per-item state from the view's `authoring` bundle.
  function _quizAuthoringActionProps(authoring, questionIdx) {
    if (!authoring) return {};
    return { onChangeType: authoring.onChangeType, onAddItem: authoring.onAddItem, adding: !!(authoring.addingAfter && authoring.addingAfter[questionIdx]) };
  }
  function AssessmentItemActions(p) {
    var action = p.onAction;
    var disabled = typeof action !== 'function';
    var q = p.q || {};
    var deleteConfirmState = React.useState(false);
    var deleteConfirmOpen = deleteConfirmState[0];
    var setDeleteConfirmOpen = deleteConfirmState[1];
    var currentType = q.type || 'mcq';
    var targetTypeState = React.useState(currentType);
    var targetType = targetTypeState[0];
    var convertConfirmState = React.useState(false);
    var addOpenState = React.useState(false);
    var addTypeState = React.useState(currentType);
    // While a quiz is live the teacher sees the live dashboard, not this list, so
    // structure changes cannot renumber items students are answering.
    var structureDisabled = disabled;
    var idBase = 'assess-item-' + p.questionIdx;
    var smallButton = 'px-2 py-1 rounded bg-white border border-slate-300 text-xs font-semibold disabled:opacity-30';
    var typeOptions = _QUIZ_AUTHOR_TYPES.map(function (entry) { return <option key={entry[0]} value={entry[0]}>{_quizAuthorTypeLabel(entry[0])}</option>; });
    return <div className="ml-9 mb-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" disabled={structureDisabled || p.questionIdx <= 0} onClick={function () { action(p.questionIdx, 'move', -1); }} className={smallButton}>{t('common.move_up')}</button>
        <button type="button" disabled={structureDisabled || p.questionIdx >= p.totalQuestions - 1} onClick={function () { action(p.questionIdx, 'move', 1); }} className={smallButton}>{t('common.move_down')}</button>
        <button type="button" disabled={structureDisabled} onClick={function () { action(p.questionIdx, 'duplicate'); }} className={smallButton}>{t('common.duplicate')}</button>
        <button type="button" disabled={disabled || p.regenerating} onClick={function () { if (typeof p.onRegenerate === 'function') p.onRegenerate(p.questionIdx, q); }} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">{p.regenerating ? t('quiz.authoring.regenerating') : t('quiz.authoring.regenerate')}</button>
        {!deleteConfirmOpen ? <button type="button" disabled={structureDisabled} onClick={function () { setDeleteConfirmOpen(true); }} className="ml-auto px-2 py-1 rounded bg-white border border-rose-300 text-rose-700 text-xs font-semibold disabled:opacity-30">{t('common.delete')}</button> : <span className="ml-auto inline-flex items-center gap-1" role="group" aria-label={t('quiz.authoring.confirm_delete_label')}><button type="button" autoFocus onClick={function () { setDeleteConfirmOpen(false); action(p.questionIdx, 'delete'); }} className="px-2 py-1 rounded bg-rose-700 text-white text-xs font-semibold">{t('quiz.authoring.confirm_delete')}</button><button type="button" onClick={function () { setDeleteConfirmOpen(false); }} className="px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">{t('common.cancel')}</button></span>}
      </div>
      <div className="flex items-end gap-2 flex-wrap" data-assess-type-tools>
        <label className="text-[11px] font-semibold text-slate-700" htmlFor={idBase + '-type'}>{t('quiz.authoring.change_type')}<select id={idBase + '-type'} data-assess-change-type value={targetType} disabled={structureDisabled || p.regenerating} onChange={function (event) { targetTypeState[1](event.target.value); convertConfirmState[1](false); }} className="block mt-1 text-xs border-slate-300 rounded p-1.5 bg-white">{typeOptions}</select></label>
        {!convertConfirmState[0]
          ? <button type="button" data-assess-convert disabled={structureDisabled || p.regenerating || targetType === currentType || typeof p.onChangeType !== 'function'} onClick={function () { convertConfirmState[1](true); }} className={smallButton}>{p.regenerating ? t('quiz.authoring.rewriting') : t('quiz.authoring.rewrite_as', { type: _quizAuthorTypeLabel(targetType) })}</button>
          : <span className="inline-flex items-center gap-1 flex-wrap" role="group" aria-label={t('quiz.authoring.confirm_rewrite_label')}><span className="text-[11px] text-slate-700">{t('quiz.authoring.confirm_rewrite', { n: p.questionIdx + 1, type: _quizAuthorTypeLabel(targetType) })}</span><button type="button" autoFocus data-assess-convert-confirm onClick={function () { convertConfirmState[1](false); p.onChangeType(p.questionIdx, q, targetType); }} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold">{t('quiz.authoring.rewrite')}</button><button type="button" onClick={function () { convertConfirmState[1](false); }} className={smallButton}>{t('common.cancel')}</button></span>}
        <button type="button" data-assess-add-toggle aria-expanded={addOpenState[0]} aria-controls={idBase + '-add'} disabled={structureDisabled || typeof p.onAddItem !== 'function'} onClick={function () { addOpenState[1](!addOpenState[0]); }} className={smallButton + ' ml-auto'}>{t('quiz.authoring.add_below')}</button>
      </div>
      {addOpenState[0] && <div id={idBase + '-add'} role="group" aria-label={t('quiz.authoring.add_after_label', { n: p.questionIdx + 1 })} className="rounded-md border border-indigo-200 bg-white p-2 space-y-2" data-assess-add-panel>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-[11px] font-semibold text-slate-700" htmlFor={idBase + '-add-type'}>{t('quiz.authoring.new_item_type')}<select id={idBase + '-add-type'} data-assess-add-type value={addTypeState[0]} onChange={function (event) { addTypeState[1](event.target.value); }} className="block mt-1 text-xs border-slate-300 rounded p-1.5 bg-white">{typeOptions}</select></label>
          <button type="button" data-assess-add-ai disabled={!!p.adding} onClick={function () { p.onAddItem(p.questionIdx, addTypeState[0], 'ai'); }} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">{p.adding ? t('quiz.authoring.writing') : t('quiz.authoring.write_for_me')}</button>
          <button type="button" data-assess-add-blank onClick={function () { addOpenState[1](false); p.onAddItem(p.questionIdx, addTypeState[0], 'blank'); }} className={smallButton}>{t('quiz.authoring.start_blank')}</button>
          <button type="button" onClick={function () { addOpenState[1](false); }} className={smallButton}>{t('common.cancel')}</button>
        </div>
        <p className="text-[11px] text-slate-600">{t('quiz.authoring.add_help')}</p>
      </div>}
      {q.type === 'mcq' && Array.isArray(q.options) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-[11px] font-semibold text-slate-700">{t('quiz.authoring.correct_answer')}<select value={q.correctAnswer || ''} onChange={function (event) { action(p.questionIdx, 'patch', { correctAnswer: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded p-1.5 bg-white"><option value="">{t('quiz.authoring.choose_answer')}</option>{q.options.map(function (option, index) { return <option key={index} value={option}>{option ? _quizPlain(option) : t('quiz.authoring.option_n', { n: index + 1 })}</option>; })}</select></label>
        <label className="text-[11px] font-semibold text-slate-700">{t('quiz.authoring.concept_label')}<input value={q.conceptLabel || ''} onChange={function (event) { action(p.questionIdx, 'patch', { conceptLabel: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded p-1.5 bg-white" /></label>
      </div>}
    </div>;
  }
  function AssessmentCoreFields(p) {
    var q = p.q || {};
    var type = q.type || '';
    var patch = p.patch;
    function updateList(field, values, operation) {
      patch(_quizAuthoringListPatch(q, field, values, operation));
    }
    if (type === 'multi-select') return <><AssessmentTextListEditor label="Answer options" itemLabel="option" values={q.options || []} minimum={3} onChange={function (values, operation) { updateList('options', values, operation); }} /><div><div className="text-xs font-bold text-slate-700 mb-1">Correct options</div><div className="space-y-1">{(q.options || []).map(function (option, index) {
      var checked = (q.correctAnswers || []).indexOf(option) !== -1;
      return <label key={index} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" aria-label={'Mark option ' + (index + 1) + ' as correct'} checked={checked} onChange={function (event) {
        var next = (q.correctAnswers || []).filter(function (answer) { return answer !== option; });
        if (event.target.checked) next.push(option);
        patch({ correctAnswers: next });
      }} />{option || 'Option ' + (index + 1)}</label>;
    })}</div></div></>;
    if (type === 'fill-blank') return <><label className="block text-xs font-bold text-slate-700">Expected answer<input value={q.expectedFill || ''} onChange={function (event) { patch({ expectedFill: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Accepted alternatives" itemLabel="alternative" values={q.acceptableAlternatives || []} minimum={0} onChange={function (values) { patch({ acceptableAlternatives: values }); }} /></>;
    if (type === 'short-answer') return <label className="block text-xs font-bold text-slate-700">Reference answer<textarea value={q.expectedAnswer || ''} onChange={function (event) { patch({ expectedAnswer: event.target.value }); }} rows="3" className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 resize-y" /></label>;
    if (type === 'self-explanation') return <label className="block text-xs font-bold text-slate-700">Scoring rubric<textarea value={q.rubric || q.expectedAnswer || ''} onChange={function (event) { patch({ rubric: event.target.value }); }} rows="4" className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 resize-y" /></label>;
    if (type === 'answer-evidence') return <><AssessmentTextListEditor label="Answer choices" itemLabel="answer" values={q.answerOptions || []} minimum={2} onChange={function (values, operation) { updateList('answerOptions', values, operation); }} /><label className="block text-xs font-bold text-slate-700">Correct answer<select value={q.correctAnswer || ''} onChange={function (event) { patch({ correctAnswer: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Choose answer…</option>{(q.answerOptions || []).map(function (option, index) { return <option key={index} value={option}>{option || 'Answer ' + (index + 1)}</option>; })}</select></label><label className="block text-xs font-bold text-slate-700">Evidence prompt<input value={q.evidencePrompt || ''} onChange={function (event) { patch({ evidencePrompt: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Evidence choices" itemLabel="evidence choice" values={q.evidenceOptions || []} minimum={2} onChange={function (values, operation) { updateList('evidenceOptions', values, operation); }} /><label className="block text-xs font-bold text-slate-700">Correct evidence<select value={q.correctEvidence || ''} onChange={function (event) { patch({ correctEvidence: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Choose evidence…</option>{(q.evidenceOptions || []).map(function (option, index) { return <option key={index} value={option}>{option || 'Evidence ' + (index + 1)}</option>; })}</select></label></>;
    if (type === 'numeric-response') return <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><label className="text-xs font-bold text-slate-700">Correct value<input type="number" step="any" value={q.correctValue == null ? '' : q.correctValue} onChange={function (event) { patch({ correctValue: event.target.value === '' ? '' : Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><label className="text-xs font-bold text-slate-700">Tolerance<input type="number" min="0" step="any" value={q.tolerance == null ? 0 : q.tolerance} onChange={function (event) { patch({ tolerance: event.target.value === '' ? '' : Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><label className="text-xs font-bold text-slate-700">Preferred unit<input value={q.unit || ''} onChange={function (event) { patch({ unit: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><div className="sm:col-span-3"><AssessmentTextListEditor label="Accepted unit spellings" itemLabel="unit spelling" values={q.acceptableUnits || []} minimum={0} onChange={function (values) { patch({ acceptableUnits: values }); }} /></div></div>;
    return null;
  }
  function AssessmentDiagnosticFields(p) {
    var q = p.q || {};
    var type = q.type || '';
    var patch = p.patch;
    var items = Array.isArray(q.items) ? q.items : [];
    var pairs = Array.isArray(q.pairs) ? q.pairs : [];
    if (type === 'sequence-sense') return <><AssessmentTextListEditor label="Steps in canonical order" itemLabel="step" values={items} minimum={3} onChange={function (values, operation) {
      patch(_quizAuthoringListPatch(q, 'items', values, operation));
    }} /><label className="block text-xs font-bold text-slate-700">Displayed order <span className="font-normal text-slate-500">(1-based, comma-separated)</span><input aria-label="Displayed sequence order using one-based positions" value={(q.presentedOrder || []).map(function (value) { return Number(value) + 1; }).join(', ')} onChange={function (event) {
      var order = event.target.value.split(',').map(function (value) { return Number(value.trim()) - 1; }).filter(function (value) { return Number.isInteger(value); });
      patch({ presentedOrder: order });
    }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><label className="block text-xs font-bold text-slate-700">Misplaced displayed position<select value={q.intentionallyWrongIndex === null || q.intentionallyWrongIndex === undefined ? '' : q.intentionallyWrongIndex} onChange={function (event) { patch({ intentionallyWrongIndex: event.target.value === '' ? null : Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Order is correct</option>{items.map(function (_, index) { return <option key={index} value={index}>Position {index + 1}</option>; })}</select></label><label className="block text-xs font-bold text-slate-700">Ordering principle<input value={q.orderingPrinciple || ''} onChange={function (event) { patch({ orderingPrinciple: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Principle choices" itemLabel="choice" values={q.principleOptions || []} minimum={3} onChange={function (values, operation) { patch(_quizAuthoringListPatch(q, 'principleOptions', values, operation)); }} /></>;
    if (type === 'relation-mismatch') return <><div className="space-y-1.5"><div className="text-xs font-bold text-slate-700">Displayed pairs</div>{pairs.map(function (pair, index) {
      return <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input aria-label={'Pair ' + (index + 1) + ' left'} value={pair.left || ''} onChange={function (event) {
        var next = pairs.map(function (item, itemIndex) { return itemIndex === index ? Object.assign({}, item, { left: event.target.value }) : item; });
        patch(_quizAuthoringListPatch(q, 'pairs', next, { type: 'edit', index: index }));
      }} className="text-xs border-slate-300 rounded p-2" /><input aria-label={'Pair ' + (index + 1) + ' right'} value={pair.right || ''} onChange={function (event) {
        var next = pairs.map(function (item, itemIndex) { return itemIndex === index ? Object.assign({}, item, { right: event.target.value }) : item; });
        patch(_quizAuthoringListPatch(q, 'pairs', next, { type: 'edit', index: index }));
      }} className="text-xs border-slate-300 rounded p-2" /><button type="button" disabled={pairs.length <= 3} onClick={function () { patch(_quizAuthoringListPatch(q, 'pairs', pairs.filter(function (_, itemIndex) { return itemIndex !== index; }), { type: 'remove', index: index })); }} className="w-7 rounded border border-rose-200 text-rose-700 disabled:opacity-30" aria-label={'Remove pair ' + (index + 1)}>×</button></div>;
    })}<button type="button" onClick={function () { patch(_quizAuthoringListPatch(q, 'pairs', pairs.concat([{ left: '', right: '' }]), { type: 'add', index: pairs.length })); }} className="text-[11px] font-semibold text-indigo-700">+ Add pair</button></div><label className="block text-xs font-bold text-slate-700">Incorrect pair<select value={_quizHasNumericKey(q.wrongPairIndex) && Number.isInteger(Number(q.wrongPairIndex)) ? Number(q.wrongPairIndex) : ''} onChange={function (event) { patch({ wrongPairIndex: event.target.value === '' ? null : Number(event.target.value) }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2 bg-white"><option value="">Choose pair…</option>{pairs.map(function (_, index) { return <option key={index} value={index}>Pair {index + 1}</option>; })}</select></label><label className="block text-xs font-bold text-slate-700">Correct partner<input value={q.correctPartnerForWrong || ''} onChange={function (event) { patch({ correctPartnerForWrong: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" /></label><AssessmentTextListEditor label="Candidate partners" itemLabel="candidate" values={q.candidatePartners || []} minimum={2} onChange={function (values, operation) { patch(_quizAuthoringListPatch(q, 'candidatePartners', values, operation)); }} /></>;
    return null;
  }
  function AssessmentItemEditor(p) {
    var q = p.q || {};
    var type = q.type || 'mcq';
    var action = p.onAction;
    function patch(values) { if (typeof action === 'function') action(p.questionIdx, 'patch', values); }
    var labels = {
      'multi-select': 'Multi-Select',
      'fill-blank': 'Fill-in-the-Blank',
      'short-answer': 'Brief Written Response',
      'self-explanation': 'Explain Your Reasoning',
      'sequence-sense': 'Sequence Sense',
      'relation-mismatch': 'Relation Mismatch',
      'answer-evidence': 'Answer + Evidence',
      'numeric-response': 'Numeric Response'
    };
    return <div className="bg-white p-5 rounded-xl border-2 border-indigo-300 shadow-sm">
      <div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-indigo-100 text-indigo-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">{p.itemNumber}</span><div className="flex-1"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 mb-2">{labels[type] || type}</span><textarea aria-label="Edit question prompt" value={q.question || ''} onChange={function (event) { patch({ question: event.target.value }); }} rows="2" className="w-full text-sm font-semibold border-slate-300 rounded-md p-2 resize-y" /></div></div>
      <div className="ml-9 space-y-3">
        <label className="block text-xs font-bold text-slate-700">Concept label<input value={q.conceptLabel || ''} onChange={function (event) { patch({ conceptLabel: event.target.value }); }} className="block w-full mt-1 text-xs border-slate-300 rounded-md p-2" placeholder="e.g. fraction equivalents" /></label>
        <AssessmentCoreFields q={q} patch={patch} />
        <AssessmentDiagnosticFields q={q} patch={patch} />
        <AssessmentLearningOptions q={q} patch={patch} />
      </div>
      <div className="mt-4"><AssessmentItemActions q={q} questionIdx={p.questionIdx} totalQuestions={p.totalQuestions} onAction={action} onRegenerate={p.onRegenerate} regenerating={p.regenerating} {..._quizAuthoringActionProps(p.authoring, p.questionIdx)} /></div>
    </div>;
  }
  function AssessmentQualityPanel(p) {
    var audit = p.audit;
    var h5p = p.h5p || { total: 0, valid: 0, omitted: 0, adapted: 0, manualReview: 0, library: '', ready: false };
    var openState = React.useState(!audit.ready);
    var open = openState[0];
    var setOpen = openState[1];
    React.useEffect(function () { if (!audit.ready) setOpen(true); }, [audit.errorCount]);
    var mixKeys = Array.from(new Set(Object.keys(audit.requestedMix || {}).concat(Object.keys(audit.actualMix || {}))));
    return <div className={'rounded-xl border-2 mb-4 ' + (audit.ready ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50')} role="region" aria-label="Assessment quality review">
      <button type="button" onClick={function () { setOpen(!open); }} aria-expanded={open} className="w-full p-3 flex items-center gap-3 text-left">
        <span aria-hidden="true" className="text-xl">{audit.ready ? '✓' : '⚠'}</span>
        <span className="flex-1"><span className={'block text-sm font-black ' + (audit.ready ? 'text-emerald-900' : 'text-amber-900')}>{audit.ready ? 'Ready to share' : 'Review before sharing'}</span><span className="block text-[11px] text-slate-700">{audit.errorCount + ' required fix' + (audit.errorCount === 1 ? '' : 'es') + ' · ' + audit.warningCount + ' suggestion' + (audit.warningCount === 1 ? '' : 's') + ' · delivery preflight included'}</span></span>
        <span className="text-xs font-bold text-slate-600">{open ? 'Hide' : 'Review'}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-3">
        <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Delivery preflight</div><div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className={'rounded-lg border p-2 ' + (audit.ready ? 'bg-white border-emerald-200' : 'bg-rose-50 border-rose-200')}><div className="text-[10px] font-black uppercase text-slate-600">In-app assessment</div><div className={'text-xs font-bold mt-0.5 ' + (audit.ready ? 'text-emerald-800' : 'text-rose-800')}>{audit.ready ? 'Answer keys and structure ready' : audit.errorCount + ' blocking fix' + (audit.errorCount === 1 ? '' : 'es')}</div></div>
          <div className="rounded-lg border border-sky-200 bg-white p-2"><div className="text-[10px] font-black uppercase text-slate-600">Live + presentation</div><div className="text-xs font-bold text-sky-800 mt-0.5">{audit.questions.length + ' item' + (audit.questions.length === 1 ? '' : 's') + ' available across supported formats'}</div></div>
          <div className={'rounded-lg border p-2 ' + (h5p.omitted ? 'bg-amber-50 border-amber-300' : 'bg-white border-indigo-200')}><div className="text-[10px] font-black uppercase text-slate-600">H5P export</div><div className={'text-xs font-bold mt-0.5 ' + (h5p.omitted ? 'text-amber-900' : 'text-indigo-800')}>{h5p.valid + ' / ' + h5p.total + ' items · ' + h5p.library}</div>{h5p.adapted > 0 && <div className="text-[10px] text-slate-600 mt-0.5">{h5p.adapted + ' adapted' + (h5p.manualReview ? ' · ' + h5p.manualReview + ' ungraded/manual-review' : '')}</div>}{h5p.omitted > 0 && <div className="text-[10px] font-semibold text-amber-800 mt-0.5">{h5p.omitted + ' incomplete item' + (h5p.omitted === 1 ? '' : 's') + ' would be omitted'}</div>}</div>
        </div></div>
        {mixKeys.length > 0 && <div><div className="text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Requested vs generated</div><div className="flex gap-1.5 flex-wrap">{mixKeys.map(function (key) {
          var requested = audit.requestedMix ? audit.requestedMix[key] || 0 : audit.actualMix[key] || 0;
          var actual = audit.actualMix[key] || 0;
          return <span key={key} className={'text-[10px] font-semibold px-2 py-1 rounded border ' + (requested === actual ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-amber-300 text-amber-900')}>{key + ': ' + actual + ' / ' + requested}</span>;
        })}</div></div>}
        {audit.issues.length > 0 ? <ul className="space-y-1.5">{audit.issues.map(function (issue, index) {
          return <li key={index} className={'text-xs rounded-md border p-2 ' + (issue.severity === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-amber-200 text-amber-900')}><strong>{issue.questionIdx === null ? 'Recipe' : 'Q' + (issue.questionIdx + 1)}:</strong> {' ' + issue.message}</li>;
        })}</ul> : <p className="text-xs text-emerald-800">All answer keys, required fields, counts, and structural checks passed.</p>}
        {audit.issues.length > 0 && <button type="button" onClick={p.onRepairAll} disabled={p.repairing || typeof p.onRepairAll !== 'function'} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">{p.repairing ? 'Repairing assessment…' : 'Fix flagged and missing items'}</button>}
        <p className="text-[10px] text-slate-600">This automated check verifies structure, answer-key consistency, and delivery compatibility. H5P adaptations preserve the prompt and answer guide, but written responses, sequencing, and tolerance-based numeric items may require manual review after export. Teachers should still review content accuracy and instructional fit.</p>
      </div>}
    </div>;
  }
  function FreeformItemsBlock(p) {
    var allQuestions = Array.isArray(p.questions) ? p.questions : [];
    var freeform = allQuestions.map(function (q, idx) {
      return { q: q, idx: idx };
    }).filter(function (entry) {
      if (typeof p.visibleQuestionIdx === 'number' && entry.idx !== p.visibleQuestionIdx) return false;
      return entry.q && (entry.q.type === 'multi-select' || entry.q.type === 'fill-blank' || entry.q.type === 'short-answer' || entry.q.type === 'self-explanation' || entry.q.type === 'sequence-sense' || entry.q.type === 'relation-mismatch' || entry.q.type === 'answer-evidence' || entry.q.type === 'numeric-response');
    });
    if (freeform.length === 0) return null;
    return <div className="space-y-4">{freeform.map(function (entry) {
      var card = null;
      if (p.isEditingQuiz) {
        card = <AssessmentItemEditor q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} totalQuestions={allQuestions.length} onAction={p.onQuestionAction} onRegenerate={p.onRegenerateQuestion} regenerating={!!(p.regeneratingQuestions && p.regeneratingQuestions[entry.idx])} authoring={p.authoring} />;
      } else if (p.deferFeedback) {
        card = <DeferredAssessmentItem {...p} q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} />;
      } else if (entry.q.type === 'multi-select') {
        card = <MultiSelectCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} />;
      } else if (entry.q.type === 'answer-evidence') {
        card = <AnswerEvidenceCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} />;
      } else if (entry.q.type === 'numeric-response') {
        card = <NumericResponseCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} allowDictation={p.allowDictation} />;
      } else if (entry.q.type === 'sequence-sense') {
        card = <SequenceSenseCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} />;
      } else if (entry.q.type === 'relation-mismatch') {
        card = <RelationMismatchCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} onSubmitLiveAnswer={p.onSubmitLiveAnswer} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} />;
      } else {
        card = <FreeformItemCard q={entry.q} itemNumber={entry.idx + 1} questionIdx={entry.idx} draftNamespace={p.draftNamespace} registerVoiceController={p.registerVoiceController} callGemini={p.callGemini} callTTS={p.callTTS} gradeLevel={p.gradeLevel} QuizAIHelpers={p.QuizAIHelpers} modeStrategy={p.modeStrategy} scoringPolicy={p.scoringPolicy} onSubmitLiveAnswer={p.onSubmitLiveAnswer} allowDictation={p.allowDictation} />;
      }
      return <div key={entry.idx} id={'assessment-question-' + entry.idx} className="space-y-2 scroll-mt-24">{!p.isEditingQuiz && p.allowFlagging && <div className="flex justify-end"><AssessmentQuestionFlagButton flagged={!!(p.flaggedQuestions && p.flaggedQuestions[entry.idx])} onToggle={function () { p.onToggleFlag(entry.idx); }} /></div>}{card}<AssessmentPracticeHistory q={entry.q} questionIdx={entry.idx} draftNamespace={p.draftNamespace} /></div>;
    })}</div>;
  }  function FreeformItemCard(p) {
    var q = p.q;
    var responseHelpId = React.useId();
    var criteriaId = responseHelpId + '-criteria', policyId = responseHelpId + '-policy';
    var responseDescription = [q.type === 'fill-blank' ? policyId : null, Array.isArray(q.studentCriteria) && q.studentCriteria.some(value => typeof value === 'string' && value.trim()) ? criteriaId : null].filter(Boolean).join(' ') || undefined;
    var modeStrat = p.modeStrategy || null;
    var allowIDK = !!(modeStrat && modeStrat.render && modeStrat.render.allowIDontKnow);
    var allowConfidence = !!(modeStrat && modeStrat.render && modeStrat.render.allowConfidenceRating);
    // The mode may ask for an explainer, but the host hands callGemini as null
    // when student AI is off; offering a button that can only say "Explainer
    // unavailable." is a leak, so the affordance needs both.
    var aiExplainerEnabled = !!(modeStrat && modeStrat.render && modeStrat.render.aiExplainerOnFail) && typeof p.callGemini === 'function';
    var scoringPolicy = p.scoringPolicy || { partialCredit: true, writtenResponseMode: 'ai-provisional' };
    var teacherReviewWritten = scoringPolicy.writtenResponseMode === 'teacher-review' && (q.type === 'short-answer' || q.type === 'self-explanation');
    var draftItemKey = 'q-' + p.questionIdx;
    var idkState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'idk', false);
    var idkMarked = idkState[0] === true;
    var setIdkMarked = idkState[1];
    var responseState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'response', '');
    var response = responseState[0];
    var setResponse = responseState[1];
    var gradeState = React.useState({
      status: null,
      feedback: '',
      loading: false
    });
    var grade = idkMarked ? { status: 'idk', feedback: '', loading: false } : gradeState[0];
    function setGrade(value) {
      if (value && value.status === null) setIdkMarked(false);
      gradeState[1](value);
    }
    var responseFocusRef = React.useRef(null);
    var feedbackFocusRef = React.useRef(null);
    var pendingFocusRef = React.useRef('');
    React.useEffect(function () {
      var action = pendingFocusRef.current;
      if (!action) return;
      pendingFocusRef.current = '';
      var target = action === 'response' ? responseFocusRef.current : feedbackFocusRef.current;
      if (target) target.focus();
    }, [grade]);
    var confidenceState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'confidence', null);
    var confidence = confidenceState[0];
    var setConfidence = confidenceState[1];
    var explainerState = React.useState({
      open: false,
      loading: false,
      text: '',
      error: ''
    });
    var explainer = explainerState[0];
    var setExplainer = explainerState[1];
    // The AI verdict the learner saw travels with the fill-blank answer it
    // judged, so the teacher's grader can route a disagreement to review.
    var aiVerdictState = _quizUseDraftField(p.draftNamespace, draftItemKey, 'aiVerdict', null);
    function emitLiveAnswer(extraConfidence, verdict) {
      if (typeof p.onSubmitLiveAnswer !== 'function' || typeof p.questionIdx !== 'number') return;
      var saved = verdict === undefined ? aiVerdictState[0] : verdict;
      try {
        p.onSubmitLiveAnswer({
          questionIdx: p.questionIdx,
          itemType: q.type || 'short-answer',
          conceptLabel: q && q.conceptLabel || '',
          answer: q.type === 'fill-blank' && saved && saved.text === response && saved.status ? {
            text: response,
            aiVerdict: saved.status
          } : {
            text: response
          },
          confidence: typeof extraConfidence !== 'undefined' ? extraConfidence : confidence || null,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
    function submitGrade() {
      if (!response || !response.trim() || grade.loading || ['correct', 'idk', 'submitted'].includes(grade.status)) return;
      pendingFocusRef.current = 'feedback';
      _quizRecordPracticeAttempt(p, { text: response }, confidence);
      var isFill = q.type === 'fill-blank', gradedText = response;
      if (isFill) aiVerdictState[1](null);
      emitLiveAnswer(undefined, isFill ? null : undefined);
      // The teacher's key grader decides an exact (normalized) match, so the
      // learner never sees an AI "Not yet" for an answer the teacher scores correct.
      if (isFill && _quizFillBlankMatchesKey(gradedText, q)) {
        setGrade({ status: 'correct', feedback: _quizGradedCopy('quiz.fill_blank.key_match', 'Correct. Your answer matches the answer key.'), loading: false });
        return;
      }
      if (teacherReviewWritten) {
        setGrade({
          status: 'submitted',
          feedback: 'Your response was submitted for teacher review. No automatic correctness judgment was applied.',
          loading: false
        });
        return;
      }
      if (typeof p.callGemini !== 'function' && !isFill) { setGrade({ status: 'submitted', feedback: 'Saved for teacher review. Use the success criteria to review and improve your response.', loading: false }); return; }
      if (!p.QuizAIHelpers) {
        setGrade({
          status: 'error',
          feedback: 'Grader unavailable: QuizAIHelpers not loaded.',
          loading: false
        });
        return;
      }
      setGrade({
        status: null,
        feedback: '',
        loading: true
      });
      var graderArgs = {
        callGemini: p.callGemini,
        gradeLevel: p.gradeLevel,
        studentCriteria: q.studentCriteria || []
      };
      var promise;
      if (q.type === 'fill-blank') {
        graderArgs.contextSentence = q.question;
        graderArgs.expectedFill = q.expectedFill || '';
        graderArgs.acceptableAlternatives = q.acceptableAlternatives || [];
        graderArgs.fillBlankPolicy = _quizFillBlankPolicy(q);
        graderArgs.studentFill = response;
        promise = p.QuizAIHelpers.gradeFillBlank(graderArgs);
      } else if (q.type === 'self-explanation') {
        graderArgs.question = 'EXPLAIN IN YOUR OWN WORDS: ' + (q.question || '');
        graderArgs.expectedAnswer = q.rubric || q.expectedAnswer || 'Student demonstrates understanding of the concept in their own words, including key terms and relationships. Avoid grading on memorization of specific phrasing — reward genuine understanding.';
        graderArgs.studentResponse = response;
        promise = p.QuizAIHelpers.gradeFreeformAnswer(graderArgs);
      } else {
        graderArgs.question = q.question;
        graderArgs.expectedAnswer = q.expectedAnswer || '';
        graderArgs.studentResponse = response;
        promise = p.QuizAIHelpers.gradeFreeformAnswer(graderArgs);
      }
      Promise.resolve(promise).then(function (result) {
        var status = result.status || 'unclear';
        var feedback = result.feedback || '';
        if (isFill && ['correct', 'partially-correct', 'incorrect', 'unclear'].indexOf(status) >= 0) {
          var verdict = { text: gradedText, status: status };
          aiVerdictState[1](verdict);
          emitLiveAnswer(undefined, verdict);
          if (status === 'correct') feedback = (feedback ? feedback + ' ' : '') + _quizGradedCopy('quiz.fill_blank.teacher_confirms', 'Your teacher will confirm this answer because it does not exactly match the answer key.');
        }
        setGrade({
          status: status,
          feedback: feedback,
          criteriaFeedback: result.criteriaFeedback || [],
          loading: false
        });
      }).catch(function (err) {
        setGrade({
          status: 'error',
          feedback: err && err.message ? err.message : 'Grader failed.',
          loading: false
        });
      });
    }
    function markIDK() {
      pendingFocusRef.current = 'feedback';
      setIdkMarked(true);
      _quizEmitDeterministicAnswer(p, q.type || 'short-answer', { idk: true }, confidence);
      setGrade({
        status: 'idk',
        feedback: aiExplainerEnabled ? 'You can review a quick explanation.' : 'Marked as not known yet. Your teacher can help you review this idea.',
        loading: false
      });
      if (aiExplainerEnabled) requestExplainer();
    }
    function requestExplainer() {
      if (typeof p.callGemini !== 'function') {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: 'Explainer unavailable: callGemini not provided.'
        });
        return;
      }
      setExplainer({
        open: true,
        loading: true,
        text: '',
        error: ''
      });
      var grade = p.gradeLevel || 'middle school';
      var conceptHint = q.type === 'fill-blank' ? q.expectedFill || q.question || '' : q.type === 'self-explanation' ? q.question || '' : q.question || '';
      var prompt = 'You are a patient teacher. A ' + grade + ' student needs a quick refresher on this concept so they can answer the question. Concept or question: "' + conceptHint + '". Give a 60-90 word explanation in plain language. Use a concrete example or analogy. End with one sentence checking understanding. Plain text only — no headings, no bullet points.';
      Promise.resolve(p.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainer({
          open: true,
          loading: false,
          text: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainer({
          open: true,
          loading: false,
          text: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    _quizUseVoiceController(p, {
      getState: function () {
        var locked = grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted';
        return {
          type: q.type || 'short-answer',
          response: response,
          responseEntered: !!String(response || '').trim(),
          grading: !!grade.loading,
          gradeStatus: grade.status || null,
          feedback: grade.feedback || '',
          actions: locked
            ? (grade.status === 'submitted' ? ['try-again'] : [])
            : (String(response || '').trim() ? ['enter-response', 'check'] : ['enter-response']),
          prompt: locked
            ? (grade.loading ? 'This response is being graded.' : grade.status === 'submitted' ? 'This response was submitted for teacher review. Say try again to revise it.' : 'This response has been checked.')
            : 'Say response followed by your answer, then say check response.'
        };
      },
      execute: function (action, request) {
        if (action === 'try-again' || action === 'reset') {
          if (grade.loading) return { ok: false, state: 'busy', message: 'Wait for grading to finish before revising this response.' };
          pendingFocusRef.current = 'response';
          setGrade({ status: null, feedback: '', loading: false });

          setExplainer({ open: false, loading: false, text: '', error: '' });
          return { ok: true, state: 'reset', message: grade.status === 'submitted' ? 'Response reopened for revision.' : 'Written response reset. Say response followed by your answer.' };
        }
        var locked = grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted';
        if (locked) return { ok: false, state: grade.loading ? 'busy' : 'locked', message: grade.loading ? 'This response is being graded.' : 'This response is locked. Say try again when revision is available.' };
        if (action === 'enter-response') {
          var text = _quizVoiceRequestText(request);
          if (!text) return { ok: false, state: 'invalid-response', message: 'No response text was provided. Say response followed by your answer.' };
          setResponse(text);
          return { ok: true, state: 'response-entered', response: text, message: 'Response recorded. ' + text + '. Say check response when ready.' };
        }
        if (action === 'check') {
          if (!String(response || '').trim()) return { ok: false, state: 'inapplicable', message: 'Enter a response before checking or submitting it.' };
          submitGrade();
          return {
            ok: true,
            state: teacherReviewWritten ? 'submitted-for-review' : 'grading',
            message: teacherReviewWritten ? 'Response submitted for teacher review.' : 'Response submitted for grading. I will announce feedback when it is available.'
          };
        }
        return { ok: false, state: 'invalid-action', message: 'Use enter response or check response for this written item.' };
      }
    });
    var statusColor = grade.status === 'correct' ? 'emerald' : grade.status === 'partially-correct' ? 'amber' : grade.status === 'submitted' ? 'indigo' : grade.status === 'incorrect' ? 'rose' : grade.status === 'error' ? 'rose' : grade.status === 'idk' ? 'sky' : 'slate';
    var statusLabel = grade.status === 'correct' ? _quizGradedCopy('quiz.student.status_correct', 'Correct') : grade.status === 'partially-correct' ? _quizGradedCopy('quiz.student.status_close', 'Close') : grade.status === 'submitted' ? _quizGradedCopy('quiz.student.status_submitted', 'Submitted for review') : grade.status === 'incorrect' ? _quizGradedCopy('quiz.student.status_not_yet', 'Not yet') : grade.status === 'unclear' ? _quizGradedCopy('quiz.student.status_unclear', 'Unclear') : grade.status === 'error' ? _quizGradedCopy('quiz.student.status_error', 'Error') : grade.status === 'idk' ? _quizGradedCopy('quiz.student.status_idk', 'Marked I do not know') : '';
    var typeLabel = q.type === 'fill-blank' ? _quizGradedCopy('quiz.student.type_fill_blank', 'Fill-in-the-blank') : q.type === 'self-explanation' ? _quizGradedCopy('quiz.student.type_self_explanation', 'Explain your reasoning') : _quizGradedCopy('quiz.student.type_short_answer', 'Brief written response');
    return <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm"><div className="flex items-start gap-3 mb-3"><span className="flex-shrink-0 bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs mt-0.5">{p.itemNumber}</span><div className="flex-1 min-w-0"><span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 mb-1">{typeLabel}</span><p className="text-sm text-slate-800 leading-relaxed">{_quizRich(q.question || '')}</p><AssessmentQuestionSupport q={q} criteriaId={criteriaId} /></div></div>{q.type === 'fill-blank' && <p id={policyId} className="mb-2 text-sm text-slate-700">{_quizFillBlankInstruction(q)}</p>}{q.type === 'fill-blank' ? <input aria-label={_quizResponseLabel(p, _quizGradedCopy('a11y.fill_in_blank', 'Fill in the blank'))} type="text" value={response} ref={responseFocusRef} aria-describedby={responseDescription} onChange={function (ev) {
        setResponse(ev.target.value);
      }} onKeyDown={function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          submitGrade();
        }
      }} placeholder={t("placeholders.missing_word_or_phrase")} disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50" /> : <textarea aria-label={_quizResponseLabel(p, typeLabel + " response")} value={response} ref={responseFocusRef} aria-describedby={responseDescription} onChange={function (ev) {
        setResponse(ev.target.value);
      }} placeholder={q.type === 'self-explanation' ? 'Explain the concept in your own words (3-5 sentences)...' : 'Type your 1-2 sentence response...'} disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} rows={q.type === 'self-explanation' ? 5 : 3} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 resize-y" />}<QuizVoiceInputButton value={response} onChange={setResponse} disabled={grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} allowDictation={p.allowDictation} label="Dictate written response" /><div className="flex items-center justify-between gap-2 mt-2 flex-wrap"><div className="flex items-center gap-2 flex-wrap"><button type="button" onClick={submitGrade} disabled={!response.trim() || grade.loading || grade.status === 'correct' || grade.status === 'idk' || grade.status === 'submitted'} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none">{grade.loading ? _quizGradedCopy('quiz.student.grading', 'Grading…') : grade.status === 'submitted' ? _quizGradedCopy('quiz.student.submitted', 'Submitted') : grade.status === 'correct' ? _quizGradedCopy('quiz.student.checked', 'Response checked') : grade.status === 'idk' ? _quizGradedCopy('quiz.student.skipped', 'Response skipped') : grade.status ? _quizGradedCopy('quiz.student.recheck', 'Re-check') : teacherReviewWritten ? _quizGradedCopy('quiz.student.submit_response', 'Submit response') : _quizGradedCopy('quiz.student.grade_my_answer', 'Grade my answer')}</button>{allowIDK && !grade.status && <button type="button" onClick={markIDK} className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-colors motion-reduce:transition-none" aria-label="I don't know — skip without penalty" title={t("tooltips.skip_ai_explain_concept")}><span aria-hidden="true">🤔 </span>{t("ui_common.i_dont_know")}</button>}</div>{grade.status && grade.status !== 'correct' && <button type="button" onClick={function () {
          pendingFocusRef.current = 'response';
          setGrade({
            status: null,
            feedback: '',
            loading: false
          });
          if (grade.status !== 'submitted') setResponse('');
          setExplainer({
            open: false,
            loading: false,
            text: '',
            error: ''
          });
        }} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors motion-reduce:transition-none">{grade.status === 'submitted' ? _quizGradedCopy('quiz.student.revise_response', 'Revise response') : t("ui_common.try_again")}</button>}</div><div data-assessment-written-feedback className={grade.status || grade.loading ? 'mt-3 p-3 rounded-lg border bg-' + statusColor + '-50 border-' + statusColor + '-300' : ''} role="status" aria-live="polite" aria-atomic="true"><div className={grade.status || grade.loading ? 'flex items-center gap-2 mb-1 flex-wrap' : ''}><span ref={feedbackFocusRef} tabIndex={-1} data-assessment-written-result className={grade.status || grade.loading ? 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-' + statusColor + '-200 text-' + statusColor + '-900' : ''}>{grade.loading ? _quizGradedCopy('quiz.student.grading', 'Grading…') : statusLabel}</span>{aiExplainerEnabled && grade.status && grade.status !== 'correct' && grade.status !== 'idk' && !explainer.open && <button type="button" onClick={requestExplainer} className="ml-auto text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors motion-reduce:transition-none" title={t("tooltips.quick_ai_explanation")}>🤖 Explain this</button>}</div>{Array.isArray(grade.criteriaFeedback) && grade.criteriaFeedback.length > 0 && <ul className="my-2 space-y-2 text-sm" aria-label="Feedback by success criterion">{grade.criteriaFeedback.map((entry, index) => <li key={index}><strong>{(q.studentCriteria || [])[entry.index] || 'Criterion ' + (index + 1)}: {entry.status}</strong>{entry.feedback && <div>{_quizRichBlock(entry.feedback)}</div>}</li>)}</ul>}{grade.feedback && <div className={'text-sm text-' + statusColor + '-900 mb-2'}>{_quizRichBlock(grade.feedback)}</div>}{explainer.open && <div className="mt-2 p-3 bg-white border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">🤖 Quick explanation</div>{explainer.loading && <p className="text-sm text-indigo-700 italic">Generating explanation…</p>}{explainer.text && <div className="text-sm text-slate-800 leading-relaxed">{_quizRichBlock(explainer.text)}</div>}{explainer.error && <p className="text-sm text-rose-700">{explainer.error}</p>}{explainer.text && typeof p.callTTS === 'function' && <button type="button" onClick={function () {
            if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_quizPlain(explainer.text));
            else p.callTTS(_quizPlain(explainer.text));
          }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}</div>{allowConfidence && grade.status !== 'idk' && <div className="mt-2 flex items-center gap-2 flex-wrap text-xs"><span className="text-slate-600 font-semibold">{_quizGradedCopy('quiz.student.confidence_before', 'Before checking: how sure are you?')}</span>{['knew', 'guessed', 'no-idea'].map(function (lvl) {
          var labels = {
            knew: _quizGradedCopy('quiz.student.confidence_know_now', 'I know this'),
            guessed: _quizGradedCopy('quiz.student.confidence_unsure_now', 'I am unsure'),
            'no-idea': _quizGradedCopy('quiz.student.confidence_need_support', 'I need support')
          };
          var active = confidence === lvl;
          return <button key={lvl} type="button" aria-pressed={active} disabled={!!grade.status || grade.loading} onClick={function () {
            setConfidence(lvl);

          }} className={'px-2 py-0.5 rounded border transition-colors motion-reduce:transition-none ' + (active ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')}>{labels[lvl]}</button>;
        })}</div>}</div>;
  }
  function _quizPresentationTypeLabel(type) {
    var labels = {
      'multi-select': 'Select all that apply',
      'fill-blank': 'Fill in the blank',
      'short-answer': 'Short answer',
      'self-explanation': 'Explain your thinking',
      'sequence-sense': 'Sequence sense',
      'relation-mismatch': 'Find the mismatch',
      'answer-evidence': 'Answer + evidence',
      'numeric-response': 'Numeric response'
    };
    return labels[type] || 'Assessment item';
  }
  function AssessmentPresentationItem(p) {
    var q = p.q || {};
    var type = q.type || 'short-answer';
    var showAnswer = !!p.showAnswer;
    var renderText = typeof p.formatInlineText === 'function' ? function (value) { return p.formatInlineText(String(value || ''), false); } : function (value) { return String(value || ''); };
    var body = null;
    var answerGuide = null;
    if (type === 'multi-select') {
      var correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
      body = <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{(Array.isArray(q.options) ? q.options : []).map(function (option, index) {
        var correct = correctAnswers.indexOf(option) !== -1;
        return <div key={index} className={'p-5 rounded-xl border-2 text-lg font-semibold flex gap-3 ' + (showAnswer && correct ? 'bg-green-50 border-green-500 text-green-900' : showAnswer ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-slate-300 text-slate-800')}><span className="w-7 h-7 rounded border-2 border-current flex items-center justify-center shrink-0">{showAnswer && correct ? '✓' : ''}</span><AssessmentChoiceContent q={q} field="options" index={index} text={option} renderText={renderText} /></div>;
      })}</div>;
      answerGuide = <div><span className="font-bold">Correct selections: </span>{correctAnswers.join('; ')}</div>;
    } else if (type === 'fill-blank') {
      body = <div className="p-6 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 text-2xl text-center">{renderText(q.question || '')}</div>;
      var alternatives = Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives.filter(Boolean) : [];
      answerGuide = <div><span className="font-bold">Expected fill: </span>{q.expectedFill || 'Teacher review'}{alternatives.length > 0 && <div className="mt-1 text-sm">Also accept: {alternatives.join(', ')}</div>}</div>;
    } else if (type === 'short-answer') {
      body = <div role="img" className="h-36 rounded-xl border-2 border-slate-200 bg-[repeating-linear-gradient(to_bottom,white,white_34px,#cbd5e1_35px)]" aria-label="Short-answer response space" />;
      answerGuide = <div><span className="font-bold">Expected answer: </span>{q.expectedAnswer || q.sampleAnswer || 'Teacher review'}</div>;
    } else if (type === 'self-explanation') {
      body = <div className="h-48 rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-5 text-slate-500">Explain the idea in your own words. Include how or why it works.</div>;
      answerGuide = <div><span className="font-bold">Success criteria: </span>{q.rubric || q.expectedAnswer || 'Use accurate reasoning, relevant details, and a clear connection to the concept.'}</div>;
    } else if (type === 'sequence-sense') {
      var items = Array.isArray(q.items) ? q.items : [];
      var presented = Array.isArray(q.presentedOrder) && q.presentedOrder.length ? q.presentedOrder.map(function (item) { return typeof item === 'number' ? items[item] : item; }) : items;
      body = <ol className="space-y-3">{presented.map(function (item, index) { return <li key={index} className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200 text-lg flex gap-3"><span className="font-black text-indigo-700">{index + 1}</span><AssessmentChoiceContent q={q} field="items" index={typeof q.presentedOrder?.[index] === "number" ? q.presentedOrder[index] : items.indexOf(item)} text={item} renderText={renderText} /></li>; })}</ol>;
      answerGuide = <div><div><span className="font-bold">Correct order: </span>{(Array.isArray(q.correctOrder) && q.correctOrder.length === items.length ? q.correctOrder.map(function (index) { return items[index]; }) : items).join(' → ')}</div>{q.orderingPrinciple && <div className="mt-1 text-sm">Ordering principle: {q.orderingPrinciple}</div>}</div>;
    } else if (type === 'relation-mismatch') {
      var pairs = Array.isArray(q.pairs) ? q.pairs : [];
      body = <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{pairs.map(function (pair, index) {
        pair = pair || {};
        var mismatch = index === q.wrongPairIndex;
        return <div key={index} className={'p-4 rounded-xl border-2 text-lg ' + (showAnswer && mismatch ? 'bg-rose-50 border-rose-400' : 'bg-slate-50 border-slate-200')}><AssessmentPairContent q={q} index={index} renderText={renderText} />{showAnswer && mismatch && <span className="ml-2 text-rose-700 font-bold">Mismatch</span>}</div>;
      })}</div>;
      var wrongPair = pairs[q.wrongPairIndex] || {};
      answerGuide = <div><span className="font-bold">Fix the mismatch: </span>{wrongPair.left ? wrongPair.left + ' → ' : ''}{q.correctPartnerForWrong || 'Teacher review'}</div>;    } else if (type === 'answer-evidence') {
      body = <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div><h4 className="font-bold text-slate-700 mb-2">Part 1 - answer options</h4><div className="space-y-2">{(Array.isArray(q.answerOptions) ? q.answerOptions : []).map(function (option, index) { return <div key={index} className={'p-3 rounded-lg border-2 ' + (showAnswer && _quizAnswerMatches(option, q.correctAnswer) ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')}><AssessmentChoiceContent q={q} field="answerOptions" index={index} text={option} renderText={renderText} /></div>; })}</div></div><div><h4 className="font-bold text-slate-700 mb-2">Part 2 - supporting evidence</h4>{q.evidencePrompt && <p className="mb-3 text-base text-slate-700">{renderText(q.evidencePrompt)}</p>}{q.evidencePrompt_en && <QuizTranslationText as="p" className="mb-3 text-sm italic text-slate-600">{renderText(q.evidencePrompt_en)}</QuizTranslationText>}<div className="space-y-2">{(Array.isArray(q.evidenceOptions) ? q.evidenceOptions : []).map(function (option, index) { return <div key={index} className={'p-3 rounded-lg border-2 ' + (showAnswer && option === q.correctEvidence ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-200')}><AssessmentChoiceContent q={q} field="evidenceOptions" index={index} text={option} renderText={renderText} /></div>; })}</div></div></div>;
      answerGuide = <div><div><span className="font-bold">Answer: </span>{q.correctAnswer || 'Teacher review'}</div><div className="mt-1"><span className="font-bold">Evidence: </span>{q.correctEvidence || 'Teacher review'}</div></div>;
    } else if (type === 'numeric-response') {
      body = <div className="p-8 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-end gap-3 justify-center"><span className="text-3xl tracking-widest text-slate-400">____________</span>{q.unit && <span className="text-2xl font-bold text-slate-700">{q.unit}</span>}</div>;
      answerGuide = <div><span className="font-bold">Expected value: </span>{String(q.correctValue ?? 'Teacher review')}{q.unit ? ' ' + q.unit : ''}{Number(q.tolerance) > 0 ? ' (±' + q.tolerance + ')' : ''}</div>;
    } else {
      body = <div role="img" className="h-36 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50" aria-label="Response space" />;
      answerGuide = <div><span className="font-bold">Answer guide: </span>{q.expectedAnswer || q.sampleAnswer || q.correctAnswer || q.rubric || 'Teacher review'}</div>;
    }
    if (type === 'sequence-sense' && Array.isArray(q.principleOptions) && q.principleOptions.length) body = <div className="space-y-4">{body}<div><h4 className="mb-2 font-bold text-slate-700">{_quizGradedCopy('quiz.media.ordering_choices', 'Ordering principle choices')}</h4><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{q.principleOptions.map(function (option, index) { return <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><AssessmentChoiceContent q={q} field="principleOptions" index={index} text={option} renderText={renderText} /></div>; })}</div></div></div>;
    if (type === 'relation-mismatch' && Array.isArray(q.candidatePartners) && q.candidatePartners.length) body = <div className="space-y-4">{body}<div><h4 className="mb-2 font-bold text-slate-700">{_quizGradedCopy('quiz.media.replacement_choices', 'Replacement partner choices')}</h4><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{q.candidatePartners.map(function (option, index) { return <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><AssessmentChoiceContent q={q} field="candidatePartners" index={index} text={option} renderText={renderText} /></div>; })}</div></div></div>;
    if (_quizIsAnswerKeyDisputed(q)) answerGuide = <p data-assessment-key-under-review role="status">{t('quiz.attempt.key_under_review', 'Your teacher is reviewing this answer.')} No answer is being marked correct.</p>;
    if (p.compact) {
      var written = ['fill-blank', 'short-answer', 'self-explanation'].indexOf(type) !== -1;
      return <div data-review-question-type={type} className="rounded-xl border-2 border-slate-200 bg-white p-4 sm:p-6 text-left text-slate-800">
        <p className="mb-3 text-xs font-black uppercase tracking-wider text-teal-800">{_quizPresentationTypeLabel(type)}</p>
        {written ? <p className="text-base text-slate-700">{type === 'self-explanation' ? 'Explain your thinking aloud or on paper. Include how or why the idea works.' : 'Share your answer aloud or write it down before revealing the guide.'}</p> : body}
        {showAnswer && <div data-review-answer-guide className="mt-4 rounded-xl border-2 border-green-200 bg-green-50 p-4 text-green-950" role="status">{answerGuide}</div>}
        {showAnswer && _quizStudentExplanation(q, true) && <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-slate-700"><p className="mb-1 text-sm font-bold">Explanation</p>{typeof p.renderFormattedText === 'function' ? p.renderFormattedText(_quizStudentExplanation(q, true)) : _quizRichBlock(_quizStudentExplanation(q, true))}</div>}
      </div>;
    }
    if (p.readOnly) return <div className="space-y-3">{["multi-select", "sequence-sense", "relation-mismatch", "answer-evidence"].indexOf(type) !== -1 && <div data-assessment-feedback-stimulus>{body}</div>}<div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-950">{answerGuide}</div></div>;
    return <div data-presentation-question-type={type} className="bg-white p-4 sm:p-8 rounded-2xl border-2 border-slate-200 shadow-md"><div className="flex gap-4 mb-6"><div className="bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">{p.index + 1}</div><div className="flex-grow"><div className="text-xs uppercase tracking-wider font-black text-teal-800 mb-1">{_quizPresentationTypeLabel(type)}</div><h3 className="text-2xl font-bold text-slate-800 leading-tight">{renderText(q.question || '')}</h3>{q.question_en && <QuizTranslationText as="p" className="text-lg text-slate-600 italic mt-2">{renderText(q.question_en)}</QuizTranslationText>}</div></div><AssessmentQuestionSupport q={q} translation={false} /><div className="ml-0 md:ml-14">{body}<div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">{_quizStudentExplanation(q, true) && <button type="button" onClick={p.onToggleExplanation} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-400 text-slate-700">{p.showExplanation ? 'Hide explanation' : 'Show explanation'}</button>}<button type="button" onClick={p.onToggleAnswer} aria-expanded={showAnswer} className={'text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 ' + (showAnswer ? 'bg-slate-200 text-slate-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100')}>{showAnswer ? <Eye size={14} /> : <MousePointerClick size={14} />}{showAnswer ? 'Hide answer guide' : 'Reveal answer guide'}</button></div>{showAnswer && <div className="mt-4 p-4 rounded-xl bg-green-50 border-2 border-green-200 text-green-950" role="status">{answerGuide}</div>}{p.showExplanation && _quizStudentExplanation(q, true) && <div className="mt-4 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-slate-700">{typeof p.renderFormattedText === 'function' ? p.renderFormattedText(_quizStudentExplanation(q, true)) : _quizRichBlock(_quizStudentExplanation(q, true))}</div>}</div></div>;
  }
  function _quizCreateAuthoringRequests(readProps) {
    var requests = new Map();
    function snapshot(props, questionIdx) {
      var content = props.generatedContent;
      if (Number.isInteger(questionIdx)) {
        // A sibling question's result must not invalidate this request. Keep
        // the resource/settings context, but scope question content to its target.
        var data = Object.assign({}, content && content.data);
        delete data.questions;
        delete data.actualItemTypeMix;
        delete data.itemCountMismatch;
        content = [Object.assign({}, content, { data: data }), questionIdx, props.generatedContent?.data?.questions?.[questionIdx]];
      }
      return JSON.stringify([content, props.inputText || '', props.gradeLevel || '', !!props.isTeacherMode]);
    }
    function currentProps(request) {
      if (!request || requests.get(request.key) !== request) return null;
      var props = readProps();
      if (Number.isInteger(request.questionIdx) && props.generatedContent?.data?.questions?.[request.questionIdx] !== request.question) return null;
      return request.signature === snapshot(props, request.questionIdx) ? props : null;
    }
    return {
      begin: function (key, target) {
        var props = readProps();
        var questionIdx = target && target.questionIdx;
        var question = Number.isInteger(questionIdx) ? props.generatedContent?.data?.questions?.[questionIdx] : undefined;
        if (target && (!Number.isInteger(questionIdx) || questionIdx < 0 || !question || question !== target.question)) return null;
        var signature = snapshot(props, questionIdx);
        var existing = requests.get(key);
        if (existing && existing.signature === signature && existing.question === question) return null;
        var request = { key: key, signature: signature, questionIdx: questionIdx, question: question, questionSignature: question ? JSON.stringify(question) : '' };
        requests.set(key, request);
        return request;
      },
      current: function (request) { return !!currentProps(request); },
      currentProps: currentProps,
      end: function (request) {
        if (!request || requests.get(request.key) !== request) return false;
        requests.delete(request.key);
        return true;
      },
      clear: function () { requests.clear(); }
    };
  }
  function useQuizGameSetupModule(open, moduleKey, componentKey, loaderKey) {
    const isReady = () => typeof window.AlloModules?.[componentKey] === 'function';
    const [ready, setReady] = React.useState(isReady);
    const [failed, setFailed] = React.useState(false);
    const [attempt, setAttempt] = React.useState(0);
    React.useEffect(() => {
      if (!open) return;
      let requested = false, settled = false;
      const started = Date.now();
      setFailed(false);
      const inspect = () => {
        if (settled) return;
        if (isReady()) { settled = true; setReady(true); return; }
        setReady(false);
        try {
          // The loader can be installed after the assessment first renders.
          // Poll until it exists, then request once for this open/retry attempt.
          if (!requested && typeof window[loaderKey] === 'function') {
            requested = true;
            const retried = window.__alloModuleRegistry?.[moduleKey]?.status === 'failed' && window.__alloRetryModule?.(moduleKey);
            if (!retried) {
              const result = window[loaderKey]();
              if (result && typeof result.then === 'function') Promise.resolve(result).then(inspect, () => {
                if (!settled) { settled = true; setReady(isReady()); setFailed(!isReady()); }
              });
            }
          }
          if (isReady()) { settled = true; setReady(true); return; }
          if (window.__alloModuleRegistry?.[moduleKey]?.status === 'failed' || Date.now() - started >= 30000) {
            settled = true; setFailed(true);
          }
        } catch (_) { settled = true; setFailed(true); }
      };
      inspect();
      const timer = setInterval(inspect, 250);
      window.addEventListener('alloflow:module-registry-changed', inspect);
      return () => { settled = true; clearInterval(timer); window.removeEventListener('alloflow:module-registry-changed', inspect); };
    }, [open, attempt, moduleKey, componentKey, loaderKey]);
    return { ready, failed, retry: () => { setFailed(false); setAttempt(value => value + 1); } };
  }

  function _quizFeedbackSignature(data) {
    return _quizPreviousFeedbackSignature(_quizStableAssessmentData(_quizIdentityData(data)));
  }
  function _quizCompatibleFeedbackSignatures(data) {
    // Responses saved before `shortAnswer` was canonicalized keep restoring.
    var legacy = _quizLegacyShortAnswerData(data);
    return Array.from(new Set([_quizFeedbackSignature(data), _quizPreviousFeedbackSignature(_quizStableAssessmentData(data)), _quizPreviousFeedbackSignature(_quizPreviousStableAssessmentData(data)), _quizPreviousFeedbackSignature(data)]
      .concat(legacy ? [_quizFeedbackSignature(legacy), _quizPreviousFeedbackSignature(_quizStableAssessmentData(legacy)), _quizPreviousFeedbackSignature(_quizPreviousStableAssessmentData(legacy)), _quizPreviousFeedbackSignature(legacy)] : [])));
  }
  function _quizPreviousFeedbackSignature(data) {
    var text = JSON.stringify([data && data.questions || [], data && data.reflections || [], data && data.reflection || '']);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'assessment-' + (hash >>> 0).toString(36);
  }
  function _quizAttemptAnswer(q, index, responses) {
    var root = responses.root || {}, item = responses['q-' + index] || {}, type = q.type || 'mcq';
    if (item.idk === true || (type === 'sequence-sense' || type === 'relation-mismatch') && item.grade && item.grade.status === 'idk') return { idk: true };
    if (type === 'mcq') { var optionIdx = (root.mcqAnswers || {})[index]; return { optionIdx: optionIdx, optionText: (q.options || [])[optionIdx] || '' }; }
    if (type === 'multi-select') return { selectedIndices: item.selected || [], selectedOptions: (item.selected || []).map(i => (q.options || [])[i]) };
    if (type === 'answer-evidence') return { answerIdx: item.answerIdx, evidenceIdx: item.evidenceIdx, ...(typeof item.explanation === 'string' ? { explanation: item.explanation } : {}), answerText: (q.answerOptions || q.options || [])[item.answerIdx] || '', evidenceText: (q.evidenceOptions || [])[item.evidenceIdx] || '' };
    if (type === 'sequence-sense') return Object.assign({ verifyAnswer: item.verifyAnswer, clickedIdx: item.clickedIdx, orderAnswer: item.orderAnswer || q.presentedOrder || [], principleAnswer: item.principleAnswer }, q.itemsInDisplayOrder === true ? { orderBasis: 'displayed' } : {});
    if (type === 'relation-mismatch') return { clickedPairIdx: item.clickedPairIdx, partnerAnswer: item.partnerAnswer, ...(typeof item.explanation === 'string' ? { explanation: item.explanation } : {}) };
    if (type === 'numeric-response') { var parsed = _quizParseNumericResponse(item.response || ''); return { text: item.response || '', numericValue: parsed ? parsed.value : null, unit: parsed ? parsed.unit : '' }; }
    if (type === 'fill-blank' && item.aiVerdict && item.aiVerdict.status && item.aiVerdict.text === item.response) return { text: item.response || '', status: 'submitted', aiVerdict: item.aiVerdict.status };
    return { text: item.response || '', status: 'submitted' };
  }
  function _quizFillBlankMatchesKey(text, q) {
    var canonical = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (canonical && typeof canonical.gradeFillBlankAnswer === 'function') return canonical.gradeFillBlankAnswer(text, q).status === 'correct';
    if (_quizFillBlankPolicy(q) === 'exact') return [q.expectedFill].concat(Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : []).some(function (key) { return String(key == null ? '' : key).trim() === String(text == null ? '' : text).trim() && !!String(text || '').trim(); });
    var answer = String(text == null ? '' : text).trim().toLowerCase();
    return !!answer && [q && q.expectedFill].concat(q && Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : []).some(function (key) { return String(key == null ? '' : key).trim().toLowerCase() === answer; });
  }
  function _quizAttemptConfidence(q, index, responses) {
    var root = responses && responses.root || {}, item = responses && responses['q-' + index] || {};
    var confidence = (q.type || 'mcq') === 'mcq' ? (root.mcqConfidence || {})[index] : item.confidence;
    return confidence === 'knew' || confidence === 'guessed' || confidence === 'no-idea' ? confidence : null;
  }
  function _quizResponseDescription(q, index, responses) {
    var a = _quizAttemptAnswer(q, index, responses);
    if (a.idk) return _quizGradedCopy('quiz.attempt.idk_response', 'I don’t know yet.');
    if ((q.type || 'mcq') === 'mcq') return a.optionText || 'No response';
    if (q.type === 'multi-select') return a.selectedOptions.join('; ') || 'No response';
    if (q.type === 'answer-evidence') return 'Answer: ' + (a.answerText || 'Not selected') + '. Evidence: ' + (a.evidenceText || 'Not selected') + (a.explanation ? '. Explanation: ' + a.explanation : '');
    if (q.type === 'sequence-sense') return (q.sequenceMode === 'arrange-explain' ? '' : 'Order correct: ' + (a.verifyAnswer || 'Not selected') + '. ') + 'Your order: ' + a.orderAnswer.map(i => (q.items || [])[i]).join(' → ') + '. Principle: ' + (a.principleAnswer || 'Not selected');
    if (q.type === 'relation-mismatch') return 'Pair: ' + (typeof a.clickedPairIdx === 'number' ? a.clickedPairIdx + 1 : 'Not selected') + '. Replacement: ' + (a.partnerAnswer || 'Not selected') + (a.explanation ? '. Explanation: ' + a.explanation : '');
    return a.text || 'No response';
  }
  // Teacher-readable copy of an attempt: the learner's own responses only,
  // never the key or correctness (feedback may still be held back).
  // legacy === true: the pre-display-form signature (Sequence Sense in canonical order).
  function _quizAssessmentItemSignature(question, legacy) {
    var aggregator = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.QuizLiveAggregators;
    if (aggregator && typeof aggregator.assessmentItemSignature === 'function') return aggregator.assessmentItemSignature(question, legacy === true);
    // Keep the offline fallback equivalent to assessmentItemSignature in the
    // canonical grader. Only public response context belongs in this signature.
    var q = question && typeof question === 'object' ? question : {};
    var shown = q.presentedOrder, count = Array.isArray(q.items) ? q.items.length : -1;
    if (legacy !== true && String(q.type || q.itemType || '') === 'sequence-sense' && Array.isArray(shown) && shown.length === count && new Set(shown).size === count
      && shown.every(function (value) { return Number.isInteger(value) && value >= 0 && value < count; })) {
      q = Object.assign({}, q, { items: shown.map(function (index) { return q.items[index]; }), presentedOrder: shown.map(function (_, index) { return index; }) });
      if (Array.isArray(question.itemImageUrls) && question.itemImageUrls.length === count) q.itemImageUrls = shown.map(function (index) { return question.itemImageUrls[index]; });
    }
    var context = { type: String(q.type || q.itemType || 'mcq') };
    var textFields = ['question', 'contextSentence', 'prompt', 'instructions', 'evidencePrompt', 'unit', 'imageUrl'];
    var arrayFields = ['options', 'answerOptions', 'evidenceOptions', 'items', 'presentedOrder', 'pairs', 'candidatePartners', 'principleOptions', 'optionImageUrls', 'answerOptionImageUrls', 'answerImageUrls', 'evidenceOptionImageUrls', 'evidenceImageUrls', 'itemImageUrls', 'candidatePartnerImageUrls', 'principleOptionImageUrls', 'principleOptionsImageUrls'];
    function publicValue(value) {
      if (Array.isArray(value)) return value.map(publicValue);
      if (value && typeof value === 'object') {
        var result = {};
        ['id', 'text', 'label', 'left', 'right', 'imageUrl', 'leftImageUrl', 'rightImageUrl'].forEach(function (key) {
          if (value[key] != null) result[key] = publicValue(value[key]);
        });
        return result;
      }
      return value == null ? null : value;
    }
    textFields.forEach(function (field) { context[field] = String(q[field] == null ? '' : q[field]); });
    arrayFields.forEach(function (field) { context[field] = Array.isArray(q[field]) ? q[field].map(publicValue) : []; });
    // Add authored task/scoring conditions only when present, so legacy items
    // retain their signatures while edits to new conditions invalidate drafts.
    ['fillBlankPolicy', 'sequenceMode', 'requireReasoning', 'explanationPrompt', 'studentCriteria'].forEach(function (field) {
      if (q[field] != null) context[field] = publicValue(q[field]);
    });
    if (q.numericSettings && typeof q.numericSettings === 'object') context.numericSettings = {
      allowEquivalentUnits: q.numericSettings.allowEquivalentUnits === true,
      valueWeight: q.numericSettings.valueWeight == null ? 0.5 : Number(q.numericSettings.valueWeight)
    };
    var serialized = JSON.stringify(context), hash = 2166136261;
    for (var i = 0; i < serialized.length; i++) { hash ^= serialized.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'assess-item-v1:' + (hash >>> 0).toString(36);
  }
  function _quizResponseSnapshot(data, items, meta) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var responses = items && typeof items === 'object' ? items : {};
    var reflections = data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : [];
    var reflectionAnswers = responses.root && responses.root.reflectionAnswers || {};
    var answered = 0;
    var rows = questions.map(function (q, i) {
      var question = q && typeof q === 'object' ? q : {};
      var isAnswered = false, hasResponse = false, response = '', answer = null;
      try {
        isAnswered = _quizQuestionAnswered(question, i, { items: responses });
        hasResponse = _quizQuestionHasResponse(question, i, { items: responses });
        response = hasResponse ? String(_quizResponseDescription(question, i, responses)).slice(0, 4000) : '';
        answer = hasResponse ? _quizAttemptAnswer(question, i, responses) : null;
      } catch (e) {}
      if (isAnswered) answered++;
      return { number: i + 1, type: question.type || 'mcq', question: String(question.question || question.contextSentence || '').slice(0, 500), questionSignature: _quizAssessmentItemSignature(question), answered: isAnswered, hasResponse: hasResponse, response: response, answer: answer, confidence: _quizAttemptConfidence(question, i, responses), ...(Array.isArray(responses['q-' + i]?.practiceAttempts) ? { practice: responses['q-' + i].practiceAttempts } : {}), ...(typeof responses['q-' + i]?.transferResponse === 'string' ? { transferResponse: responses['q-' + i].transferResponse } : {}) };
    });
    return Object.assign({
      kind: 'alloflow-assessment-responses', version: 1, answered: answered, responded: rows.filter(function (row) { return row.hasResponse; }).length, total: questions.length, items: rows,
      reflections: reflections.map(function (reflection, i) {
        var entry = reflectionAnswers[i] || {};
        return { prompt: String(typeof reflection === 'string' ? reflection : reflection && reflection.text || '').slice(0, 500), response: _quizReflectionResponse(entry).slice(0, 4000) };
      })
    }, meta || {});
  }

  // Project-file responses are portable; device drafts are separately scoped.
  // Rebuild only public learner inputs, never imported grading or answer keys.
  function _quizProjectResponseCandidate(data, record, context) {
    if (!record || !context || !context.resourceId || context.sessionCode || context.activityId) return null;
    var candidates = [record.assessmentDraft, record.assessmentSubmitted].filter(function (value) {
      return value && value.kind === 'alloflow-assessment-responses' && value.version === 1
        && ['in-progress', 'submitted'].includes(value.status) && typeof value.attemptId === 'string' && value.attemptId;
    }).sort(function (a, b) { return (Number(b.startedAt) || 0) - (Number(a.startedAt) || 0) || (Number(b.recordedAt || b.submittedAt) || 0) - (Number(a.recordedAt || a.submittedAt) || 0); });
    var snapshot = candidates[0];
    if (!snapshot) return null;
    var identity = snapshot.assessmentIdentity;
    if (identity && ['resourceId', 'sessionCode', 'activityId'].some(function (key) { return String(identity[key] || '') !== String(context[key] || ''); })) return null;
    // An explicitly imported file gets a new workspace scope and may be opened
    // by a fresh anonymous auth identity. A same-workspace account switch must
    // not silently acquire the previous learner's answers.
    if (identity && String(identity.userId || '') !== String(context.userId || '')
      && !(identity.workspaceScope && context.workspaceScope && identity.workspaceScope !== context.workspaceScope)) return null;
    // Older project snapshots have per-item public signatures, but no private
    // grading fingerprint. They can restore answers without importing scores.
    if (identity?.signature && !(context.compatibleSignatures || [context.signature]).includes(identity.signature)) return null;
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    var reflections = data && Array.isArray(data.reflections) ? data.reflections : data && data.reflection ? [data.reflection] : [];
    if (!Array.isArray(snapshot.items) || snapshot.items.length !== questions.length || snapshot.total !== questions.length
      || !Array.isArray(snapshot.reflections) || snapshot.reflections.length !== reflections.length) return null;
    if (snapshot.items.some(function (row, index) { var q = questions[index]; return !q || typeof q !== 'object' || !row || row.number !== index + 1 || row.type !== (q.type || 'mcq') || row.questionSignature !== _quizAssessmentItemSignature(q) && row.questionSignature !== _quizAssessmentItemSignature(q, true); })) return null;
    if (snapshot.reflections.some(function (row, index) { var reflection = reflections[index]; return !row || row.prompt !== String(typeof reflection === 'string' ? reflection : reflection && reflection.text || '').slice(0, 500) || typeof row.response !== 'string'; })) return null;
    var items = { root: { mcqAnswers: {}, mcqConfidence: {}, reflectionAnswers: {}, attemptMeta: { attemptId: snapshot.attemptId, startedAt: Number(snapshot.startedAt) || Date.now(), status: 'in-progress' } } };
    function choice(value, choices) { return Number.isInteger(value) && Array.isArray(choices) && value >= 0 && value < choices.length; }
    var valid = snapshot.items.every(function (row, index) {
      var q = questions[index], type = q.type || 'mcq', answer = row.answer, item = {};
      items['q-' + index] = item;
      if (typeof row.transferResponse === 'string') item.transferResponse = row.transferResponse;
      if (Array.isArray(row.practice)) item.practiceAttempts = row.practice.filter(entry => entry && typeof entry.response === 'string').slice(0, 10).map(entry => ({ response: entry.response, confidence: ['knew', 'guessed', 'no-idea'].includes(entry.confidence) ? entry.confidence : null, timestamp: Number(entry.timestamp) || 0 }));
      if (['knew', 'guessed', 'no-idea'].includes(row.confidence)) {
        if (type === 'mcq') items.root.mcqConfidence[index] = row.confidence; else item.confidence = row.confidence;
      }
      if (!row.hasResponse) return true;
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
      if (answer.idk === true) { item.idk = true; return true; }
      if (['answer-evidence', 'relation-mismatch'].includes(type) && answer.explanation != null) { if (typeof answer.explanation !== 'string' || answer.explanation.length > 4000) return false; item.explanation = answer.explanation; }
      if (type === 'mcq') { if (!choice(answer.optionIdx, q.options)) return false; items.root.mcqAnswers[index] = answer.optionIdx; }
      else if (type === 'multi-select') { if (!Array.isArray(answer.selectedIndices) || answer.selectedIndices.some(function (value) { return !choice(value, q.options); }) || new Set(answer.selectedIndices).size !== answer.selectedIndices.length) return false; item.selected = answer.selectedIndices.slice(); }
      else if (type === 'answer-evidence') {
        for (var field of ['answerIdx', 'evidenceIdx']) { var options = field === 'answerIdx' ? q.answerOptions || q.options : q.evidenceOptions; if (answer[field] != null) { if (!choice(answer[field], options)) return false; item[field] = answer[field]; } }
      } else if (type === 'sequence-sense') {
        if (answer.verifyAnswer != null) { if (!['yes', 'no'].includes(answer.verifyAnswer)) return false; item.verifyAnswer = answer.verifyAnswer; }
        if (answer.clickedIdx != null) { if (!choice(answer.clickedIdx, q.items)) return false; item.clickedIdx = answer.clickedIdx; }
        if (answer.orderAnswer != null) { if (!Array.isArray(answer.orderAnswer) || answer.orderAnswer.length !== (q.items || []).length || new Set(answer.orderAnswer).size !== answer.orderAnswer.length || answer.orderAnswer.some(function (value) { return !choice(value, q.items); })) return false; item.orderAnswer = answer.orderAnswer.slice(); }
        if (answer.principleAnswer != null) { if (typeof answer.principleAnswer !== 'string') return false; item.principleAnswer = answer.principleAnswer; }
      } else if (type === 'relation-mismatch') {
        if (answer.clickedPairIdx != null) { if (!choice(answer.clickedPairIdx, q.pairs)) return false; item.clickedPairIdx = answer.clickedPairIdx; }
        if (answer.partnerAnswer != null) { if (typeof answer.partnerAnswer !== 'string') return false; item.partnerAnswer = answer.partnerAnswer; }
      } else if (['short-answer', 'self-explanation', 'fill-blank', 'numeric-response'].includes(type)) {
        if (typeof answer.text !== 'string') return false;
        item.response = answer.text;
      } else return false;
      return true;
    });
    if (!valid) return null;
    snapshot.reflections.forEach(function (row, index) { items.root.reflectionAnswers[index] = { draft: row.response, submitted: snapshot.status === 'submitted' && !!row.response, submittedText: snapshot.status === 'submitted' ? row.response : '' }; });
    return { snapshot: snapshot, items: items };
  }
  function _quizRestoreProjectResponses(namespace, data, record, context, isCurrent, unscopedNamespace) {
    if (!namespace || namespace.indexOf('assess-preview:') === 0) return false;
    var candidate = _quizProjectResponseCandidate(data, record, context);
    if (!candidate) return false;
    return _quizWithDraftLock(namespace, function () {
      if (typeof isCurrent === 'function' && !isCurrent()) return false;
      if (_quizReadAttemptReceipt(namespace) || _quizClosedDrafts[namespace]) return false;
      var draft = _quizReadWorkingDraft(namespace), meta = draft.items?.root?.attemptMeta;
      var progress = _quizResponseSnapshot(data, draft.items, {});
      // Never replace work created here, including an explicitly restarted
      // empty attempt. A late file restore may fill only an untouched view.
      if (_quizReadDraft(namespace)?.projectResponseRestore || meta?.previousAttemptId || progress.responded
        || progress.reflections.some(function (row) { return row.response; })
        || progress.items.some(function (row) { return row.confidence; })
        || Object.keys(draft.items?.root?.flaggedQuestions || {}).length) return false;
      var storage = _quizLocalStorage();
      if (!storage) { _quizDraftSaveEvent(namespace, false); return false; }
      var snapshot = candidate.snapshot, now = Date.now(), items = candidate.items;
      // Migrate an unscoped local copy only when this project's own attempt id
      // and full response fingerprint prove ownership. Never adopt by title.
      var legacy = unscopedNamespace && unscopedNamespace !== namespace ? _quizReadAttemptReceipt(unscopedNamespace, context.signature) || _quizReadDraft(unscopedNamespace) : null;
      var legacyIdentity = legacy?.assessmentIdentity;
      var legacyAttempt = legacy?.attemptId || legacy?.items?.root?.attemptMeta?.attemptId;
      if (legacyAttempt === snapshot.attemptId && legacyIdentity?.signature === context.signature
        && ['resourceId', 'sessionCode', 'activityId', 'userId'].every(function (key) { return String(legacyIdentity[key] || '') === String(context[key] || ''); })) items = legacy.responses || legacy.items || items;
      try {
        if (snapshot.status === 'submitted') {
          var summary = _quizBuildAttemptProgress(data, { items: items });
          var receipt = { version: 1, attemptId: snapshot.attemptId, startedAt: Number(snapshot.startedAt) || now, submittedAt: Number(snapshot.submittedAt) || now,
            summary: { total: summary.total, answered: summary.answered, unanswered: summary.unanswered, flagged: summary.flagged }, responses: items,
            feedbackTiming: _quizNormalizeDeliverySettings(data.deliverySettings).feedbackTiming, signature: context.signature, assessmentIdentity: context,
            resourceId: context.resourceId, sessionCode: '', activityId: '', delivery: { status: 'local' }, projectResponseRestore: snapshot.attemptId };
          storage.setItem(_quizAttemptStorageKey(namespace), JSON.stringify(receipt));
          try { storage.removeItem(namespace); } catch (_) {}
          _quizResetWorkingDraft(namespace); _quizClosedDrafts[namespace] = true;
        } else {
          storage.setItem(namespace, JSON.stringify({ version: 1, createdAt: Number(snapshot.startedAt) || now, updatedAt: now, assessmentIdentity: context, items: items, projectResponseRestore: snapshot.attemptId }));
          _quizResetWorkingDraft(namespace);
        }
        _quizDraftContexts[namespace] = context;
        return true;
      } catch (_) { _quizDraftSaveEvent(namespace, false); return false; }
    });
  }
  function _quizLearnerDraftSuffix(props) {
    return (props.sessionData?.quizState?.activityId ? ':' + props.sessionData.quizState.activityId : '')
      + (props.user?.uid ? ':user-' + encodeURIComponent(props.user.uid) : '')
      + (!props.activeSessionCode && props.learnerResponseScope ? ':workspace-' + encodeURIComponent(props.learnerResponseScope) : '');
  }
  // Release payload for a withheld teacher-release copy: per question, the
  // learner-safe key in display form, bound to the item it answers.
  function _quizReleaseKeyObject(q) {
    if (!q || typeof q !== 'object' || Array.isArray(q)) return null;
    var display = _quizSequenceDisplayForm(q), key = {};
    _QUIZ_RELEASE_KEY_FIELDS.forEach(function (field) { if (display[field] != null) key[field] = display[field]; });
    if (display !== q && q.type === 'sequence-sense') key.correctOrder = q.items.map(function (_, rank) { return q.presentedOrder.indexOf(rank); });
    return key;
  }
  // Fingerprint of the grading key alone (not explanations). Drafts ignore the
  // key; a release stays valid only for the key it carried.
  var _QUIZ_GRADING_KEY_FIELDS = ['correctAnswer', 'correctAnswers', 'correctIndex', 'correctEvidence', 'expectedFill', 'acceptableAlternatives', 'expectedAnswer', 'exemplarAnswer', 'sampleAnswer', 'modelAnswer', 'referenceAnswer', 'rubric',
    'correctValue', 'tolerance', 'acceptableUnits', 'correctOrder', 'correctSequence', 'intentionallyWrongIndex', 'orderingPrinciple', 'wrongPairIndex', 'correctPartnerForWrong'];
  function _quizReleaseKeyVersion(data) {
    var text = JSON.stringify((data && Array.isArray(data.questions) ? data.questions : []).map(function (q) {
      var key = _quizReleaseKeyObject(q), grading = {};
      if (!key) return null;
      _QUIZ_GRADING_KEY_FIELDS.forEach(function (field) { if (key[field] !== undefined) grading[field] = key[field]; else if (field === 'correctIndex' && q.correctIndex != null) grading[field] = q.correctIndex; });
      return grading;
    })), hash = 2166136261;
    for (var i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'answer-key-' + (hash >>> 0).toString(36);
  }
  function _quizReleaseKeyPayload(data, signature) {
    var questions = data && Array.isArray(data.questions) ? data.questions : [];
    function build(withExplanations) {
      return { version: 1, signature: String(signature || ''), keyVersion: _quizReleaseKeyVersion(data), questions: questions.map(function (q) {
        var key = _quizReleaseKeyObject(q);
        if (!key) return null;
        var explanation = withExplanations ? _quizStudentExplanation(q) : '';
        return Object.assign({ itemSignature: _quizAssessmentItemSignature(q), key: key }, explanation ? { explanation: explanation } : {});
      }) };
    }
    var payload = build(true);
    return JSON.stringify(payload).length > 150000 ? build(false) : payload;
  }
  // Merges a release into a withheld copy; null when any item no longer matches.
  function _quizApplyReleasedKeys(data, release) {
    var questions = data && Array.isArray(data.questions) ? data.questions : null;
    if (!questions || !release || typeof release !== 'object' || !Array.isArray(release.questions) || release.questions.length !== questions.length) return null;
    var merged = [];
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i], entry = release.questions[i];
      if (!q || typeof q !== 'object' || Array.isArray(q)) { merged.push(q); continue; }
      if (!entry || typeof entry !== 'object' || entry.itemSignature !== _quizAssessmentItemSignature(q)) return null;
      var next = Object.assign({}, q), key = entry.key && typeof entry.key === 'object' ? entry.key : {};
      _QUIZ_RELEASE_KEY_FIELDS.forEach(function (field) { if (key[field] !== undefined) next[field] = key[field]; });
      if (typeof entry.explanation === 'string' && entry.explanation.trim() && next.correctAnswer != null) {
        next.factCheck = entry.explanation;
        next.keyCheck = { status: 'confirmed', suggestedAnswer: '', checkedKey: String(next.correctAnswer), checkedShape: _quizKeyCheckShape(next) };
      }
      merged.push(next);
    }
    return Object.assign({}, data, { questions: merged });
  }
  function AssessmentAttemptFeedback(p) {
    var tr = typeof p.copy === 'function' ? p.copy : _quizPlainCopy;
    return <section data-assessment-attempt-feedback className="space-y-4" aria-label={tr('quiz.attempt.feedback_region', 'Assessment feedback')}><div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-indigo-950"><h2 className="text-lg font-bold">{tr('quiz.attempt.review_title', 'Review your responses')}</h2><p className="mt-1 text-sm">{tr('quiz.attempt.review_help', 'Compare your saved responses with the answer guides. Written responses may still need teacher review.')}</p></div>{(p.data.questions || []).map((q, i) => { var keyCheck = _quizKeyCheck(q), explanation = _quizStudentExplanation(q); return <article key={i} className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800"><h3 className="font-bold">{(i + 1) + '. '}{_quizRich(q.question)}</h3><AssessmentQuestionSupport q={q} />{(q.type || "mcq") === "mcq" && <div data-assessment-feedback-stimulus className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{(q.options || []).map((option, index) => <div key={index} className="rounded-lg border border-slate-200 p-3 text-sm"><AssessmentChoiceContent q={q} field="options" index={index} text={option} /></div>)}</div>}<p className="mt-3 text-sm whitespace-pre-wrap"><strong>{tr('quiz.attempt.your_response', 'Your response:') + ' '}</strong>{_quizResponseDescription(q, i, p.receipt.responses || {})}</p><div className="mt-3" data-assessment-answer-guide>{(q.type || 'mcq') === 'mcq' ? <p className="text-sm"><strong>{tr('quiz.attempt.answer_guide', 'Answer guide:') + ' '}</strong>{keyCheck && keyCheck.status === 'disputed' ? tr('quiz.attempt.key_under_review', 'Your teacher is reviewing this answer.') : q.correctAnswer || tr('quiz.attempt.teacher_review', 'Teacher review')}</p> : <AssessmentPresentationItem q={q} showAnswer={true} onToggleAnswer={null} formatInlineText={p.formatInlineText} readOnly={true} />}</div>{explanation && <div data-assessment-explanation className="mt-3 text-sm">{_quizRichBlock(explanation)}</div>}</article>; })}</section>;
  }
  function DeferredAssessmentItem(p) {
    var q = p.q, type = q.type, key = 'q-' + p.questionIdx;
    var controlId = React.useId();
    var evidenceGroupRef = React.useRef(null);
    var [answerChanged, setAnswerChanged] = React.useState(false);
    var hasCriteria = Array.isArray(q.studentCriteria) && q.studentCriteria.some(value => typeof value === 'string' && value.trim());
    var responseInstruction = type === 'fill-blank' ? _quizFillBlankInstruction(q) : type === 'numeric-response' && q.unit ? 'Include units (' + q.unit + ').' : '';
    var groupDescription = [q.question_en ? controlId + '-translation' : '', hasCriteria ? controlId + '-criteria' : '', responseInstruction ? controlId + '-instruction' : '', controlId + '-feedback-timing', type === 'answer-evidence' ? controlId + '-evidence-instructions' : ''].filter(Boolean).join(' ');
    var responseDescription = controlId + '-question ' + groupDescription;
    var responseGroupRef = React.useRef(null), questionHeadingRef = React.useRef(null), retryRef = React.useRef(null);
    var skipFocusRef = React.useRef(''), moveFocusRef = React.useRef(null), moveButtonsRef = React.useRef({});
    var [moveNotice, setMoveNotice] = React.useState('');
    var [idkMarked, setIdkMarked] = _quizUseDraftField(p.draftNamespace, key, 'idk', function () {
      var legacy = _quizReadDraftField(p.draftNamespace, key, 'grade').value;
      return (type === 'sequence-sense' || type === 'relation-mismatch') && !!legacy && legacy.status === 'idk';
    });
    function markIDK() { skipFocusRef.current = 'retry'; setIdkMarked(true); }
    function clearIDK() { skipFocusRef.current = 'answer'; setIdkMarked(false); _quizWriteDraftField(p.draftNamespace, key, 'grade', null); }
    React.useEffect(function () {
      var target = skipFocusRef.current;
      skipFocusRef.current = '';
      if (target === 'retry') retryRef.current?.focus();
      if (target === 'answer') (responseGroupRef.current?.querySelector('input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled)') || questionHeadingRef.current)?.focus();
    }, [idkMarked]);
    var [explanation, setExplanation] = _quizUseDraftField(p.draftNamespace, key, 'explanation', '');
    var [response, setResponse] = _quizUseDraftField(p.draftNamespace, key, 'response', '');
    var [selected, setSelected] = _quizUseDraftField(p.draftNamespace, key, 'selected', []);
    var [answerIdx, setAnswerIdx] = _quizUseDraftField(p.draftNamespace, key, 'answerIdx', null);
    var [evidenceIdx, setEvidenceIdx] = _quizUseDraftField(p.draftNamespace, key, 'evidenceIdx', null);
    function chooseAnswerEvidenceAnswer(index) {
      var answers = q.answerOptions || q.options || [];
      if (idkMarked || !Number.isInteger(index) || index < 0 || index >= answers.length) return;
      if (index !== answerIdx) { setEvidenceIdx(null); setAnswerChanged(evidenceIdx !== null); setAnswerIdx(index); }
    }
    function chooseAnswerEvidence(index) {
      if (idkMarked || answerIdx === null || !Number.isInteger(index) || index < 0 || index >= (q.evidenceOptions || []).length) return;
      setEvidenceIdx(index); setAnswerChanged(false);
    }
    var answerEvidenceProgress = idkMarked ? '' : answerIdx === null ? 'Choose an answer, then supporting evidence.' : evidenceIdx === null ? (answerChanged ? 'Answer changed. Choose supporting evidence again.' + (explanation.trim() ? ' Your explanation is kept.' : '') : 'Answer selected. Now choose supporting evidence.') : q.requireReasoning && !explanation.trim() ? 'Both parts selected. Add the required explanation before submitting.' : 'Both parts selected. Ready for review.';
    var [verifyAnswer, setVerifyAnswer] = _quizUseDraftField(p.draftNamespace, key, 'verifyAnswer', null);
    var [clickedIdx, setClickedIdx] = _quizUseDraftField(p.draftNamespace, key, 'clickedIdx', null);
    var [principleAnswer, setPrincipleAnswer] = _quizUseDraftField(p.draftNamespace, key, 'principleAnswer', '');
    var [clickedPairIdx, setClickedPairIdx] = _quizUseDraftField(p.draftNamespace, key, 'clickedPairIdx', null);
    var [partnerAnswer, setPartnerAnswer] = _quizUseDraftField(p.draftNamespace, key, 'partnerAnswer', '');
    var [confidence, setConfidence] = _quizUseDraftField(p.draftNamespace, key, 'confidence', '');
    var initialOrder = Array.isArray(q.presentedOrder) && q.presentedOrder.length === (q.items || []).length && new Set(q.presentedOrder).size === q.presentedOrder.length && q.presentedOrder.every(i => Number.isInteger(i) && i >= 0 && i < q.items.length) ? q.presentedOrder : (q.items || []).map((_, i) => i);
    var [orderAnswer, setOrderAnswer] = _quizUseDraftField(p.draftNamespace, key, 'orderAnswer', () => initialOrder.slice());
    function moveDeferredItem(item, delta) {
      var position = orderAnswer.indexOf(item), target = position + delta;
      if (idkMarked || position < 0 || target < 0 || target >= orderAnswer.length) return;
      var next = orderAnswer.slice();
      [next[position], next[target]] = [next[target], next[position]];
      moveFocusRef.current = { item, delta };
      setMoveNotice(String(q.items[item]) + ' moved to position ' + (target + 1) + ' of ' + next.length + '.');
      setOrderAnswer(next);
    }
    React.useEffect(function () {
      var pending = moveFocusRef.current;
      if (!pending) return;
      moveFocusRef.current = null;
      var button = moveButtonsRef.current[pending.item + ':' + pending.delta];
      if (!button || button.disabled) button = moveButtonsRef.current[pending.item + ':' + (-pending.delta)];
      if (button && !button.disabled) button.focus();
    }, [orderAnswer]);
    var inputClass = 'block mt-2 w-full min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-800';
    function choices(label, options, value, update, multiple, field, indices) {
      return <fieldset ref={field === 'evidenceOptions' ? evidenceGroupRef : null} id={field === 'evidenceOptions' ? controlId + '-evidence-choices' : undefined} disabled={type === 'answer-evidence' && field === 'evidenceOptions' && answerIdx === null} className="space-y-2"><legend className="text-sm font-semibold text-slate-800 mb-2">{label}</legend>{options.map((option, i) => <label key={i} className={'flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer ' + ((multiple ? value.includes(i) : value === i) ? 'bg-indigo-50 border-indigo-400 text-indigo-950' : 'bg-white border-slate-300 text-slate-800')}><input className="mt-1 shrink-0" type={multiple ? 'checkbox' : 'radio'} name={controlId + '-' + (field || label)} checked={multiple ? value.includes(i) : value === i} onChange={() => update(multiple ? value.includes(i) ? value.filter(n => n !== i) : value.concat(i).sort((a,b) => a-b) : i)} /><span className="min-w-0 flex-1 break-words">{field === "pairs" ? <AssessmentPairContent q={q} index={i} /> : <AssessmentChoiceContent q={q} field={field || "untranslated"} index={indices ? indices[i] : i} text={option} />}</span></label>)}</fieldset>;
    }
    _quizUseVoiceController(p, {
      getState: () => ({ type, response, selectedIndices: selected, answerIdx, evidenceIdx, verifyAnswer, clickedIdx, principleAnswer, clickedPairIdx, partnerAnswer, orderAnswer, graded: false, actions: ['enter-response', 'choose', 'check'], message: p.feedbackTiming === 'teacher-graded' ? 'Responses are saved. ' + _quizGradedCopy('quiz.graded.student_note', 'Your teacher will check your answers.') : 'Responses are saved. Feedback is available ' + (p.feedbackTiming === 'teacher-release' ? 'after your teacher releases it.' : 'after submission.') }),
      execute: (action, request) => {
        if (idkMarked && action !== 'check') return { ok: false, state: 'skipped', message: 'Choose Try again to replace your skipped response.' };
        if (action === 'check') return { ok: false, state: 'feedback-held', message: p.feedbackTiming === 'teacher-graded' ? _quizGradedCopy('quiz.graded.student_note', 'Your teacher will check your answers.') : 'Feedback is available ' + (p.feedbackTiming === 'teacher-release' ? 'after your teacher releases it.' : 'after you submit the assessment.') };
        if (action === 'enter-response' && ['numeric-response','fill-blank','short-answer','self-explanation'].includes(type)) { setResponse(String(request.text || request.value || request.response || '')); return { ok: true, state: 'draft', message: 'Response saved.' }; }
        if (type === 'answer-evidence' && action === 'choose' && request.part === 'evidence' && answerIdx === null) return { ok: false, state: 'inapplicable', message: 'Choose an answer before choosing supporting evidence.' };
        var options = type === 'multi-select' ? q.options : type === 'answer-evidence' ? (request.part === 'evidence' ? q.evidenceOptions : q.answerOptions) : null;
        if (action === 'choose' && Array.isArray(options)) { var n = Number.isInteger(request.optionIndex) ? request.optionIndex : _quizVoiceChoiceIndex(request.choice ?? request.value ?? request.text, options.length); if (n < 0) n = options.findIndex(value => String(value).toLowerCase() === String(request.choice ?? request.value ?? request.text ?? '').trim().toLowerCase()); if (n >= 0 && n < options.length) { if (type === 'multi-select') setSelected(selected.includes(n) ? selected.filter(i => i !== n) : selected.concat(n)); else if (request.part === 'evidence') chooseAnswerEvidence(n); else chooseAnswerEvidenceAnswer(n); return { ok: true, state: 'draft', message: 'Selection saved.' }; } }
        return { ok: false, state: 'unsupported-action', message: 'Use the labeled response controls for this part. Feedback stays hidden until release.' };
      }
    });
    return <div data-assessment-deferred-item={type} role="group" aria-labelledby={controlId + '-question'} className="rounded-xl border border-slate-300 bg-white p-5 text-slate-800 shadow-sm"><div className="flex items-start gap-3 mb-4"><span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{p.itemNumber}</span><div className="min-w-0"><p className="mb-1 text-xs font-semibold text-slate-600">{_quizPresentationTypeLabel(type)}</p><h3 ref={questionHeadingRef} id={controlId + '-question'} tabIndex={-1} className="font-bold text-slate-800">{_quizRich(q.question)}</h3>{q.question_en && <QuizTranslationText as="p" id={controlId + '-translation'} className="mt-1 text-sm text-slate-600">{_quizRich(q.question_en)}</QuizTranslationText>}</div></div><AssessmentQuestionSupport q={q} translation={false} criteriaId={controlId + '-criteria'} />
      <fieldset ref={responseGroupRef} aria-labelledby={controlId + '-question'} aria-describedby={groupDescription} disabled={idkMarked} className="min-w-0 space-y-4">
      {type === 'multi-select' && choices('Choose all that apply', q.options || [], selected, setSelected, true, 'options')}
      {type === 'answer-evidence' && <div className="space-y-4"><p id={controlId + '-evidence-instructions'} data-assessment-answer-evidence-instructions className="text-sm text-slate-600">Choose an answer, then evidence that supports it. If you change your answer, choose the evidence again.</p><p data-assessment-answer-evidence-progress role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-indigo-900">{answerEvidenceProgress}</p>{choices('Choose an answer', q.answerOptions || q.options || [], answerIdx, chooseAnswerEvidenceAnswer, false, q.answerOptions ? 'answerOptions' : 'options')}{answerIdx !== null && <button type="button" data-assessment-continue-evidence aria-controls={controlId + '-evidence-choices'} onClick={() => (evidenceGroupRef.current?.querySelector('input:checked') || evidenceGroupRef.current?.querySelector('input:not(:disabled)'))?.focus()} className="min-h-11 rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm font-semibold text-indigo-900">Go to supporting evidence</button>}{q.evidencePrompt_en && <QuizTranslationText as="p" className="text-sm italic text-slate-600">{q.evidencePrompt_en}</QuizTranslationText>}{choices(q.evidencePrompt || 'Choose supporting evidence', q.evidenceOptions || [], evidenceIdx, chooseAnswerEvidence, false, 'evidenceOptions')}</div>}
      {['numeric-response','fill-blank','short-answer','self-explanation'].includes(type) && <label className="block text-sm font-semibold">Your response{responseInstruction && <span id={controlId + '-instruction'} data-assessment-response-instruction className="block mt-1 text-sm font-normal text-slate-600">{responseInstruction}</span>}{['numeric-response','fill-blank'].includes(type) ? <input aria-label={"Your response to question " + p.itemNumber} aria-describedby={responseDescription} className={inputClass} value={response} onChange={e => setResponse(e.target.value)} /> : <textarea aria-label={"Your response to question " + p.itemNumber} aria-describedby={responseDescription} className={inputClass + ' resize-y'} rows={type === 'self-explanation' ? 5 : 3} value={response} onChange={e => setResponse(e.target.value)} />}<QuizVoiceInputButton value={response} onChange={setResponse} allowDictation={p.allowDictation} /></label>}
      {type === 'sequence-sense' && <div className="space-y-4"><ol className="list-decimal ps-6 text-sm space-y-1">{initialOrder.map(i => <li key={i}><AssessmentChoiceContent q={q} field="items" index={i} /></li>)}</ol>{q.sequenceMode !== 'arrange-explain' && choices('Is the displayed order correct?', ['Yes','No'], verifyAnswer === 'yes' ? 0 : verifyAnswer === 'no' ? 1 : null, i => setVerifyAnswer(i === 0 ? 'yes' : 'no'))}{q.sequenceMode !== 'arrange-explain' && verifyAnswer === 'no' && choices('Choose an item that is out of place', initialOrder.map(i => q.items[i]), clickedIdx, setClickedIdx, false, 'items', initialOrder)}<fieldset><legend className="text-sm font-semibold mb-2">{_quizGradedCopy('quiz.student.arrange_answer', 'Arrange your answer')}</legend><p data-assessment-reorder-status role="status" aria-live="polite" aria-atomic="true" className="sr-only">{moveNotice}</p><ol className="space-y-2">{orderAnswer.map((i, position) => <li key={i} className="flex items-center gap-2 rounded border border-slate-300 p-2"><AssessmentChoiceContent q={q} field="items" index={i} />{[-1,1].map(delta => <button key={delta} type="button" ref={node => { moveButtonsRef.current[i + ':' + delta] = node; }} aria-label={(delta < 0 ? 'Move up: ' : 'Move down: ') + q.items[i]} disabled={position + delta < 0 || position + delta >= orderAnswer.length} onClick={() => moveDeferredItem(i, delta)} className="min-h-11 min-w-11 rounded border border-slate-400 text-slate-800 disabled:opacity-40">{delta < 0 ? '↑' : '↓'}</button>)}</li>)}</ol></fieldset><label className="block text-sm font-semibold">Ordering principle<select className={inputClass} value={principleAnswer} onChange={e => setPrincipleAnswer(e.target.value)}><option value="">Choose a principle</option>{(q.principleOptions || ['chronological','cause-effect','process','size','hierarchy']).map((v, i) => <option key={v} value={v}>{v}{q.principleOptions_en?.[i] ? ' — ' + q.principleOptions_en[i] : ''}</option>)}</select></label></div>}
      {type === 'relation-mismatch' && <div className="space-y-4">{choices('Choose the mismatched pair', (q.pairs || []).map(pair => pair.left + ' → ' + pair.right), clickedPairIdx, setClickedPairIdx, false, 'pairs')}{q.candidatePartners && q.candidatePartners.length ? choices('Replacement partner', q.candidatePartners, q.candidatePartners.indexOf(partnerAnswer), i => setPartnerAnswer(q.candidatePartners[i]), false, 'candidatePartners') : <label className="block text-sm font-semibold">Replacement partner<input aria-label={"Replacement partner for question " + p.itemNumber} className={inputClass} value={partnerAnswer} onChange={e => setPartnerAnswer(e.target.value)} /></label>}</div>}
      {['relation-mismatch', 'answer-evidence'].includes(type) && <AssessmentReasoningInput q={q} itemNumber={p.itemNumber} questionIdx={p.questionIdx} value={explanation} onChange={setExplanation} disabled={idkMarked} />}
      {p.modeStrategy?.render?.allowConfidenceRating && <label className="block mt-4 text-sm font-semibold">Confidence (optional)<select className={inputClass} value={confidence || ''} onChange={e => setConfidence(e.target.value)}><option value="">Choose confidence</option><option value="knew">I know this</option><option value="guessed">I am unsure</option><option value="no-idea">I need support</option></select></label>}
      </fieldset>
      <p data-assessment-skip-status role="status" aria-live="polite" aria-atomic="true" className="sr-only">{idkMarked ? "Marked as I don’t know yet. Your draft responses are kept. Choose Try again to continue." : ''}</p>{idkMarked ? <div className="mt-3 flex items-center gap-3 text-sm text-sky-900"><span>{_quizGradedCopy('quiz.attempt.idk_response', 'I don’t know yet.')}</span><button type="button" ref={retryRef} onClick={clearIDK} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 font-semibold">{t('ui_common.try_again')}</button></div> : p.modeStrategy?.render?.allowIDontKnow && <button type="button" onClick={markIDK} className="mt-3 min-h-11 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900">{t('ui_common.i_dont_know')}</button>}
      <p id={controlId + '-feedback-timing'} className="mt-4 text-xs text-slate-600">{p.feedbackTiming === 'teacher-graded' ? _quizGradedCopy('quiz.graded.student_note', 'Your teacher will check your answers.') : p.feedbackTiming === 'teacher-release' ? 'Your teacher will release feedback after submission.' : 'Feedback will appear after you submit the assessment.'}</p>
    </div>;
  }
  // The AlloPack spec spells short answers `shortAnswer`; this runtime uses `short-answer`.
  function _quizCanonicalContent(content) {
    var data = content && content.data, questions = data && Array.isArray(data.questions) ? data.questions : null;
    if (!questions || !questions.some(function (q) { return q && q.type === 'shortAnswer'; })) return content;
    return Object.assign({}, content, { data: Object.assign({}, data, { questions: questions.map(function (q) { return q && q.type === 'shortAnswer' ? Object.assign({}, q, { type: 'short-answer' }) : q; }) }) });
  }
  function _quizLegacyShortAnswerData(data) {
    var questions = data && Array.isArray(data.questions) ? data.questions : null;
    if (!questions || !questions.some(function (q) { return q && q.type === 'short-answer'; })) return null;
    return Object.assign({}, data, { questions: questions.map(function (q) { return q && q.type === 'short-answer' ? Object.assign({}, q, { type: 'shortAnswer' }) : q; }) });
  }
  function QuizView(props) {
    var canonicalContent = React.useMemo(function () { return _quizCanonicalContent(props.generatedContent); }, [props.generatedContent]);
    if (canonicalContent !== props.generatedContent) props = Object.assign({}, props, { generatedContent: canonicalContent });
    var identity = JSON.stringify([props.generatedContent?.id, props.activeSessionCode || '', props.sessionData?.quizState?.activityId || '', props.user?.uid || '', props.learnerResponseScope || '', !!props.isTeacherMode, !!props.isParentMode, !!props.isIndependentMode]);
    var [previewScope, setPreviewScope] = React.useState('');
    var [previewNonce, setPreviewNonce] = React.useState(0);
    var [storageRevision, setStorageRevision] = React.useState(0);
    var restoreIdentity = identity + ':' + _quizFeedbackSignature(props.generatedContent?.data);
    var [projectRestoreState, setProjectRestoreState] = React.useState('');
    var restoreEligible = !props.isTeacherMode && !props.isParentMode && !props._assessmentPreview && !props.activeSessionCode;
    var restoreRecord = restoreEligible ? props.learnerResponses : null;
    var restoreToken = JSON.stringify([restoreRecord?.assessmentDraft?.attemptId, restoreRecord?.assessmentDraft?.recordedAt, restoreRecord?.assessmentSubmitted?.attemptId, restoreRecord?.assessmentSubmitted?.recordedAt]);
    React.useEffect(function () {
      var current = true;
      var data = props.generatedContent?.data || {}, resourceId = String(props.generatedContent?.id || '');
      var suffix = _quizLearnerDraftSuffix(props), namespace = _quizDraftNamespace(data, '', resourceId) + suffix;
      var context = { resourceId: resourceId, sessionCode: '', activityId: String(props.sessionData?.quizState?.activityId || ''), userId: String(props.user?.uid || ''), workspaceScope: String(props.learnerResponseScope || ''), signature: _quizFeedbackSignature(data), compatibleSignatures: _quizCompatibleFeedbackSignatures(data), title: data.title || 'Assessment' };
      var unscoped = _quizDraftNamespace(data, '', resourceId) + (props.user?.uid ? ':user-' + encodeURIComponent(props.user.uid) : '');
      Promise.resolve(restoreEligible && restoreRecord ? _quizRestoreProjectResponses(namespace, data, restoreRecord, context, function () { return current; }, unscoped) : false).then(function (restored) {
        if (!current) return;
        if (restored) setStorageRevision(value => value + 1);
        setProjectRestoreState(restoreIdentity);
      }, function () { if (current) setProjectRestoreState(restoreIdentity); });
      return function () { current = false; };
    }, [restoreIdentity, restoreToken]);
    var preview = !!(props.isTeacherMode || props.isParentMode) && previewScope === identity;
    var previewNamespace = 'assess-preview:' + previewNonce + ':' + identity;
    React.useEffect(() => () => { delete _quizDraftMemory[previewNamespace]; }, [previewNamespace, preview]);
    var contentProps = preview ? { ...props, isTeacherMode:false, isParentMode:false, isIndependentMode:false, isPresentationMode:false, isReviewGame:false, isEditingQuiz:false, showQuizAnswers:false, escapeRoomState:{isActive:false}, _assessmentPreview:true, _previewNamespace:previewNamespace, onSubmitLiveAnswer:null, onResourceComplete:null, onRecordQuizResponses:null, callGemini:null, callTTS:null, playSound:()=>{}, addToast:()=>{} } : props;
    // Teachers start preview from the settings drawer; the banner is for leaving it (parents, with no drawer, keep it).
    // Focus follows: to Exit when preview opens, back to the drawer button when it closes.
    var previewRootRef = React.useRef(null);
    var previewFocusRef = React.useRef('');
    var togglePreview = function () { previewFocusRef.current = preview ? 'drawer' : 'exit'; setPreviewScope(preview ? '' : identity); setPreviewNonce(n => n + 1); };
    React.useEffect(() => {
      var target = { exit: '[data-assessment-preview-controls] [data-assessment-preview-toggle]', drawer: '[data-assessment-settings-toggle]' }[previewFocusRef.current];
      previewFocusRef.current = '';
      var el = target && previewRootRef.current ? previewRootRef.current.querySelector(target) : null;
      if (el) el.focus();
    }, [preview]);
    var previewCopy = function (key, fallback) { var value = typeof props.t === 'function' ? props.t(key) : ''; return !value || value === key ? fallback : value; };
    if (props.isTeacherMode && !preview) contentProps = { ...props, _onPreviewAsStudent: togglePreview };
    contentProps = { ...contentProps, _onAssessmentStorageRefresh: function () { setStorageRevision(value => value + 1); } };
    // Include explicit storage refreshes in the child identity so every draft
    // field initializes from the newly selected attempt together.
    var contentIdentity = identity + ':' + storageRevision;
    if (restoreRecord && projectRestoreState !== restoreIdentity) return <div role="status">Restoring saved assessment responses…</div>;
    return <QuizTranslationContext.Provider value={_quizTranslationAttributes(props.generatedContent)}><div ref={previewRootRef} className="space-y-4">{(preview || props.isParentMode) && <section data-assessment-preview-controls className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-3 text-slate-800">{preview ? <p className="text-sm"><strong>{previewCopy('quiz.preview_banner_title', 'Student preview.')}</strong> {previewCopy('quiz.preview_banner_body', 'Responses are temporary. AI grading and submission are disabled.')}</p> : <p className="text-sm">{previewCopy('quiz.preview_parent_hint', "Check the questions and feedback settings from the learner's perspective.")}</p>}<button type="button" data-assessment-preview-toggle onClick={togglePreview} className="min-h-11 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-900">{preview ? previewCopy('quiz.exit_preview', 'Exit student preview') : previewCopy('quiz.preview_as_student', 'Preview as student')}</button></section>}<QuizViewContent key={contentIdentity + ':' + (preview ? previewNonce : 'actual') + ((!props.isTeacherMode && !props.isParentMode) || preview ? ':' + _quizFeedbackSignature(props.generatedContent?.data) : '')} {...contentProps} /></div></QuizTranslationContext.Provider>;
  }
  function QuizViewContent(props) {
    var authoringPropsRef = React.useRef(props);
    authoringPropsRef.current = props;
    var authoringRequestsRef = React.useRef(null);
    if (!authoringRequestsRef.current) authoringRequestsRef.current = _quizCreateAuthoringRequests(function () { return authoringPropsRef.current; });
    var authoringRequests = authoringRequestsRef.current;
    React.useEffect(function () {
      authoringRequests.clear();
      setRegeneratingQuestions({});
      setRepairingAssessment(false);
      setIsRefiningQuizImage({});
      setIsImprovingDistractor({});
      setIsBulkImproving(false);
      return function () { authoringRequests.clear(); };
    }, [props.generatedContent && props.generatedContent.id, props.isTeacherMode]);
    var t = props.t;
    var isTeacherMode = props.isTeacherMode;
    var isParentMode = props.isParentMode;
    var isIndependentMode = props.isIndependentMode;
    var allowDictation = isTeacherMode || !(props.studentProjectSettings && props.studentProjectSettings.allowDictation === false);
    var activeSessionCode = props.activeSessionCode;
    var sessionData = props.sessionData;
    var assessmentData = props.generatedContent && props.generatedContent.data || {};
    // Capture public item identities with this render. A delayed callback from
    // an older card must not acquire the identity of a newly edited question.
    var liveQuestionSignatures = (assessmentData.questions || []).map(_quizAssessmentItemSignature);
    var onSubmitLiveAnswer = activeSessionCode && typeof props.onSubmitLiveAnswer === 'function' ? function (packet) {
      var signature = packet && Number.isInteger(packet.questionIdx) ? liveQuestionSignatures[packet.questionIdx] : '';
      var outgoing = Object.assign({}, packet);
      if (signature && !outgoing.questionSignature) outgoing.questionSignature = signature;
      var owner = attemptReceipt || attemptMeta;
      if (learnerBaseDraftNamespace && owner?.attemptId && !outgoing.assessmentAttemptId) {
        outgoing.assessmentAttemptId = owner.attemptId;
        outgoing.assessmentAttemptStartedAt = owner.startedAt;
      }
      return props.onSubmitLiveAnswer(outgoing);
    } : null;
    var scoringPolicy = Object.assign({ partialCredit: true, writtenResponseMode: 'ai-provisional' }, assessmentData.scoringPolicy || {});
    var deliverySettings = _quizNormalizeDeliverySettings(assessmentData.deliverySettings);
    var quizT = function (key, fallback) { var value = typeof t === 'function' ? t(key) : ''; return !value || value === key ? fallback : value; };
    var quizFactCheckMarkers = _quizFactCheckMarkers(t);
    _quizFactCheckMarkerCache = quizFactCheckMarkers;
    var assessmentAudit = _quizAuditAssessment(assessmentData, { markers: quizFactCheckMarkers, copy: quizT });
    var assessmentH5PPreflight = _quizH5PPreflight(assessmentData);
    var learnerDraftSuffix = _quizLearnerDraftSuffix(props);
    var learnerBaseDraftNamespace = props._assessmentPreview ? props._previewNamespace : !isTeacherMode && !isParentMode ? _quizDraftNamespace(assessmentData, activeSessionCode, props.generatedContent?.id) + learnerDraftSuffix : '';
    var draftContext = _quizMergeDraftIdentity(learnerBaseDraftNamespace, { resourceId: String(props.generatedContent?.id || ''), sessionCode: String(activeSessionCode || ''), activityId: String(sessionData?.quizState?.activityId || ''), userId: String(props.user?.uid || ''), workspaceScope: String(props.learnerResponseScope || ''), signature: _quizFeedbackSignature(assessmentData), previousSignature: _quizPreviousFeedbackSignature(assessmentData), compatibleSignatures: _quizCompatibleFeedbackSignatures(assessmentData), keyVersion: _quizReleaseKeyVersion(assessmentData), title: assessmentData.title || 'Assessment' });
    if (learnerBaseDraftNamespace && !props._assessmentPreview) _quizDraftContexts[learnerBaseDraftNamespace] = draftContext;
    var attemptReceiptState = React.useState(function () {
      if (!learnerBaseDraftNamespace) return null;
      if (!props._assessmentPreview) _quizPrepareDraft(learnerBaseDraftNamespace, [
        { namespace: _quizPreviousDraftNamespace(_quizPreviousStableAssessmentData(assessmentData), activeSessionCode, props.generatedContent?.id) + learnerDraftSuffix, signature: _quizPreviousFeedbackSignature(_quizPreviousStableAssessmentData(assessmentData)) },
        { namespace: _quizPreviousDraftNamespace(assessmentData, activeSessionCode, props.generatedContent?.id) + learnerDraftSuffix, signature: _quizPreviousFeedbackSignature(assessmentData) },
        { namespace: _quizPreviousDraftNamespace(_quizStableAssessmentData(assessmentData), activeSessionCode, props.generatedContent?.id) + learnerDraftSuffix, signature: _quizPreviousFeedbackSignature(_quizStableAssessmentData(assessmentData)) }
      ], draftContext);
      return _quizReadAttemptReceipt(learnerBaseDraftNamespace, _quizFeedbackSignature(assessmentData));
    });
    var attemptReceipt = attemptReceiptState[0];
    var setAttemptReceipt = attemptReceiptState[1];
    var earlierWorkState = React.useState(function () {
      if (!learnerBaseDraftNamespace || props._assessmentPreview) return null;
      var legacyNamespace = _quizLegacyDraftNamespace(assessmentData, activeSessionCode) + (sessionData?.quizState?.activityId ? ':' + sessionData.quizState.activityId : '') + (props.user?.uid ? ':user-' + encodeURIComponent(props.user.uid) : '');
      return _quizFindEarlierVersion(draftContext, learnerBaseDraftNamespace) || _quizReadAttemptReceipt(legacyNamespace) || _quizReadDraft(legacyNamespace);
    });
    var earlierWork = earlierWorkState[0];
    var draftNamespace = learnerBaseDraftNamespace && !attemptReceipt ? learnerBaseDraftNamespace : '';
    var [externalWork, setExternalWork] = React.useState(null);
    React.useEffect(function () {
      if (!learnerBaseDraftNamespace || props._assessmentPreview) return;
      function receive(event) {
        if (event.type === 'storage' ? event.key !== learnerBaseDraftNamespace && event.key !== _quizAttemptStorageKey(learnerBaseDraftNamespace) : event.detail?.namespace !== learnerBaseDraftNamespace) return;
        var saved = _quizReadAttemptReceipt(learnerBaseDraftNamespace, _quizFeedbackSignature(assessmentData));
        var incoming = _quizReadDraft(learnerBaseDraftNamespace)?.items?.root?.attemptMeta;
        var local = _quizDraftFallback[learnerBaseDraftNamespace]?.items?.root?.attemptMeta;
        if (saved && saved.attemptId === attemptReceipt?.attemptId) { setAttemptReceipt(saved); return; }
        if (saved || attemptReceipt && !saved || local?.attemptId && incoming?.attemptId && local.attemptId !== incoming.attemptId) {
          var working = _quizReadWorkingDraft(learnerBaseDraftNamespace);
          _quizClosedDrafts[learnerBaseDraftNamespace] = true;
          setExternalWork({ draft: working, completed: !!saved });
        }
      }
      window.addEventListener('storage', receive);
      window.addEventListener('alloflow:assessment-draft-synced', receive);
      return function () { window.removeEventListener('storage', receive); window.removeEventListener('alloflow:assessment-draft-synced', receive); };
    }, [learnerBaseDraftNamespace, attemptReceipt?.attemptId]);
    var regeneratingState = React.useState({});
    var regeneratingQuestions = regeneratingState[0];
    var setRegeneratingQuestions = regeneratingState[1];
    var repairingState = React.useState(false);
    var repairingAssessment = repairingState[0];
    var setRepairingAssessment = repairingState[1];
    var addingState = React.useState({});
    var addingAfter = addingState[0];
    var setAddingAfter = addingState[1];
    function focusAssessmentItem(index) {
      setTimeout(function () {
        var item = document.getElementById('assessment-question-' + index);
        if (!item) return;
        if (item.scrollIntoView) item.scrollIntoView({ block: 'center', behavior: 'auto' });
        var field = item.querySelector('textarea');
        if (field) field.focus({ preventScroll: true });
      }, 60);
    }
    // Teacher-added items land right after the chosen item; afterIdx -1 adds the first item.
    async function addAssessmentItem(afterIdx, type, mode) {
      if (typeof props.handleQuizQuestionAction !== 'function') return;
      var questions = props.generatedContent?.data?.questions || [];
      var label = _quizAuthorTypeLabel(type);
      var placed = afterIdx + 2;
      if (mode !== 'ai') {
        props.handleQuizQuestionAction(afterIdx, 'insert', { question: _quizBlankItem(type) });
        if (typeof props.addToast === 'function') props.addToast(t('quiz.authoring.toast_blank_added', { type: label, n: placed }), 'success');
        focusAssessmentItem(afterIdx + 1);
        return;
      }
      if (typeof props.callGemini !== 'function') return;
      var anchor = afterIdx >= 0 ? { questionIdx: afterIdx, question: questions[afterIdx] } : null;
      var request = authoringRequests.begin('add:' + afterIdx, anchor);
      if (!request) return;
      setAddingAfter(function (previous) { var next = Object.assign({}, previous); next[afterIdx] = true; return next; });
      try {
        var stems = questions.map(function (q) { return q && q.question ? String(q.question).slice(0, 200) : ''; }).filter(Boolean);
        var prompt = 'Write ONE new assessment item for the same lesson. It must check a learning target or idea that the existing items do not already cover, at grade level ' + String(props.gradeLevel || 'unspecified') + ', in the same language as the existing items. Return ONLY valid JSON using this schema: ' + _quizSchemaForType(type) + '. The type must be "' + type + '". ' + (_quizHasChoiceItems([type]) ? _QUIZ_ANSWER_CUE_RULES + ' ' : '') + 'Existing item prompts: ' + JSON.stringify(stems) + '. Source context: ' + String(props.inputText || '').slice(0, 5000);
        var raw = await props.callGemini(prompt, true);
        var parsed = _quizExtractJson(raw);
        var item = parsed && parsed.question && typeof parsed.question === 'object' ? parsed.question : parsed;
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('The AI did not return a valid item.');
        var currentProps = authoringRequests.currentProps(request);
        if (!currentProps || typeof currentProps.handleQuizQuestionAction !== 'function') {
          if (typeof props.addToast === 'function') props.addToast(t('quiz.authoring.toast_add_stale'), 'info');
          return;
        }
        item.type = type;
        item.id = 'assessment-item-' + Date.now();
        item = _quizBalanceReplacementKeys(currentProps.generatedContent?.data?.questions, -1, _quizAuthoringPayload(item));
        currentProps.handleQuizQuestionAction(afterIdx, 'insert', { question: item });
        if (typeof currentProps.addToast === 'function') currentProps.addToast(t('quiz.authoring.toast_added', { type: label, n: placed }), 'success');
        focusAssessmentItem(afterIdx + 1);
      } catch (error) {
        if (authoringRequests.current(request) && typeof props.addToast === 'function') props.addToast(error && error.message ? error.message : t('quiz.authoring.toast_add_failed'), 'error');
      } finally {
        if (authoringRequests.end(request)) setAddingAfter(function (previous) { var next = Object.assign({}, previous); delete next[afterIdx]; return next; });
      }
    }
    async function regenerateAssessmentQuestion(questionIdx, question, targetType) {
      if (typeof props.callGemini !== 'function' || typeof props.handleQuizQuestionAction !== 'function' || !question) return;
      var request = authoringRequests.begin('question:' + questionIdx, { questionIdx: questionIdx, question: question });
      if (!request) return;
      setRegeneratingQuestions(function (previous) {
        var next = Object.assign({}, previous);
        next[questionIdx] = true;
        return next;
      });
      try {
        var converting = !!targetType && targetType !== (question.type || 'mcq');
        var type = converting ? targetType : question.type || 'mcq';
        var sourceExcerpt = String(props.inputText || '').slice(0, 5000);
        var prompt = (converting
          ? 'Rewrite one assessment item as a different item type. Keep its learning target, content, language, and grade-level fit. Return ONLY valid JSON using this schema: ' + _quizSchemaForType(type) + '. The type must be "' + type + '". '
          : 'Rewrite one assessment item while preserving its learning target and item type. Improve clarity, answer-key validity, and grade-level fit. Return ONLY valid JSON using this schema: ' + _quizSchemaForType(type) + '. The type must remain "' + type + '". ') + (_quizHasChoiceItems([type]) ? _QUIZ_ANSWER_CUE_RULES + ' ' : '') + 'Existing item: ' + JSON.stringify(_quizAuthoringPayload(question)) + '. Source context: ' + sourceExcerpt;
        var raw = await props.callGemini(prompt, true);
        var parsed = _quizExtractJson(raw);
        var replacement = parsed && parsed.question && typeof parsed.question === 'object' ? parsed.question : parsed;
        if (!replacement || typeof replacement !== 'object') throw new Error('The AI did not return a valid question.');
        var currentProps = authoringRequests.currentProps(request);
        if (!currentProps || typeof currentProps.handleQuizQuestionAction !== 'function') return;
        replacement.type = type;
        // A retyped item keeps its stimulus image; the new type's fields come from the rewrite.
        if (converting && question.imageUrl && !replacement.imageUrl) Object.assign(replacement, { imageUrl: question.imageUrl }, question.imageAltText ? { imageAltText: question.imageAltText } : {});
        replacement = _quizBalanceReplacementKeys(currentProps.generatedContent?.data?.questions, questionIdx, _quizAuthoringPayload(replacement));
        var result = await currentProps.handleQuizQuestionAction(questionIdx, 'replace', replacement, {
          resourceId: currentProps.generatedContent.id, questionIndex: questionIdx,
          question: request.question, questionSignature: request.questionSignature, retargetMix: converting
        });
        // A functional host update is queued, not confirmed yet. Its visible
        // replacement provides feedback without announcing a rejected commit.
        if (result !== false && result?.status !== 'queued' && typeof currentProps.addToast === 'function') currentProps.addToast(converting ? t('quiz.authoring.toast_rewritten', { n: questionIdx + 1, type: _quizAuthorTypeLabel(type) }) : t('quiz.authoring.toast_regenerated', { n: questionIdx + 1 }), 'success');
      } catch (error) {
        if (authoringRequests.current(request) && typeof props.addToast === 'function') props.addToast(error && error.message ? error.message : t('quiz.authoring.toast_regenerate_failed'), 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
        setRegeneratingQuestions(function (previous) {
          var next = Object.assign({}, previous);
          delete next[questionIdx];
          return next;
        });
      }
    }
    var assessmentAuthoring = {
      onAddItem: addAssessmentItem,
      onChangeType: function (questionIdx, question, type) { return regenerateAssessmentQuestion(questionIdx, question, type); },
      addingAfter: addingAfter
    };
    async function repairAssessmentQuality() {
      if (typeof props.callGemini !== 'function' || typeof props.handleQuizQuestionAction !== 'function') return;
      var request = authoringRequests.begin('repair');
      if (!request) return;
      setRepairingAssessment(true);
      try {
        var requestedMix = assessmentAudit.requestedMix || assessmentAudit.actualMix;
        var requestedSchemas = Object.keys(requestedMix || {}).filter(function (type) { return Number(requestedMix[type]) > 0; }).map(function (type) {
          return type + ' x' + requestedMix[type] + ': ' + _quizSchemaForType(type);
        }).join('\n');
        var issueText = assessmentAudit.issues.map(function (issue) {
          return (issue.questionIdx === null ? 'Recipe' : 'Q' + (issue.questionIdx + 1)) + ': ' + issue.message;
        }).join('\n');
        var prompt = 'Repair this complete assessment. Preserve strong questions when possible, replace invalid ones, add missing item types, and return the exact requested recipe. Return ONLY JSON in the shape {"questions":[...]}. Every question needs a short lowercase conceptLabel. ' + (_quizHasChoiceItems(Object.keys(requestedMix || {}).concat((assessmentAudit.questions || []).map(function (q) { return q && q.type; }))) ? _QUIZ_ANSWER_CUE_RULES + '\n' : '') + 'Requested recipe and schemas:\n' + requestedSchemas + '\nFlagged issues:\n' + issueText + '\nCurrent questions:\n' + JSON.stringify((assessmentAudit.questions || []).map(_quizAuthoringPayload)) + '\nSource context:\n' + String(props.inputText || '').slice(0, 6000);
        var raw = await props.callGemini(prompt, true);
        var parsed = _quizExtractJson(raw);
        var questions = parsed && Array.isArray(parsed.questions) ? parsed.questions.filter(Boolean) : null;
        if (!questions || questions.length === 0) throw new Error('The AI did not return a repaired assessment.');
        if (!authoringRequests.current(request)) return;
        questions = _quizKeepUnchangedKeyChecks(assessmentAudit.questions, _quizBalanceChoiceKeys(questions));
        props.handleQuizQuestionAction(0, 'replace-all', { questions: questions });
        if (typeof props.addToast === 'function') props.addToast('Assessment repaired. Review the quality panel before sharing.', 'success');
      } catch (error) {
        if (authoringRequests.current(request) && typeof props.addToast === 'function') props.addToast(error && error.message ? error.message : 'Assessment repair failed.', 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
        setRepairingAssessment(false);
      }
    }
    var attemptMetaState = _quizUseDraftField(draftNamespace, 'root', 'attemptMeta', function () {
      return { attemptId: 'attempt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), startedAt: Date.now(), status: 'in-progress' };
    });
    var attemptMeta = attemptMetaState[0];
    var flaggedState = _quizUseDraftField(draftNamespace, 'root', 'flaggedQuestions', {});
    var flaggedQuestions = flaggedState[0];
    var setFlaggedQuestions = flaggedState[1];
    var reviewOpenState = React.useState(false);
    var reviewOpen = reviewOpenState[0];
    var setReviewOpen = reviewOpenState[1];
    var [submissionError, setSubmissionError] = React.useState('');
    var [restartError, setRestartError] = React.useState('');
    React.useEffect(function () { if (!reviewOpen) setSubmissionError(''); }, [reviewOpen]);
    var currentQuestionState = React.useState(0);
    var currentQuestionIdx = currentQuestionState[0];
    var setCurrentQuestionIdx = currentQuestionState[1];
    var quizVoiceLastFeedbackRef = React.useRef('');
    var quizVoiceReflectionState = React.useState(null);
    var quizVoiceReflectionIdx = quizVoiceReflectionState[0];
    var setQuizVoiceReflectionIdx = quizVoiceReflectionState[1];
    var quizVoiceScopeRef = React.useRef({ getStatus: null, getCommands: null });
    var quizItemVoiceControllersRef = React.useRef({});
    var registerQuizItemVoiceController = React.useCallback(function (questionIdx, controller) {
      quizItemVoiceControllersRef.current[questionIdx] = controller;
      return function () {
        if (quizItemVoiceControllersRef.current[questionIdx] === controller) {
          delete quizItemVoiceControllersRef.current[questionIdx];
        }
      };
    }, []);
    function getQuizItemVoiceController(questionIdx) { return quizItemVoiceControllersRef.current[questionIdx] || _quizGetVoiceItemController(draftNamespace, questionIdx); }
    var initialTimeSeconds = deliverySettings.timeLimitMinutes > 0 ? Math.round(deliverySettings.timeLimitMinutes * 60) : 0;
    var timerStateHook = _quizUseDraftField(draftNamespace, 'root', 'timerState', function () {
      return { remainingSeconds: initialTimeSeconds, running: initialTimeSeconds > 0, deadlineAt: initialTimeSeconds > 0 ? Date.now() + initialTimeSeconds * 1000 : 0, expired: false };
    });
    var assessmentTimer = timerStateHook[0] || { remainingSeconds: 0, running: false, deadlineAt: 0, expired: false };
    var setAssessmentTimer = timerStateHook[1];
    React.useEffect(function () {
      if (!draftNamespace || !attemptMeta || !attemptMeta.attemptId) return;
      _quizWriteDraftField(draftNamespace, 'root', 'attemptMeta', attemptMeta);
    }, [draftNamespace, attemptMeta && attemptMeta.attemptId]);
    React.useEffect(function () {
      if (!draftNamespace || !attemptMeta?.previousAttemptId || !activeSessionCode || typeof onSubmitLiveAnswer !== 'function' || props._assessmentPreview) return;
      // A restart replaces the teacher's old completion even before the first
      // new answer. Keep retrying an unconfirmed marker through reconnects.
      var cancelled = false, received = false, sending = false, retryTimer = null, retryDelay = 1000;
      var packet = {
        questionIdx: (assessmentData.questions || []).length, itemType: 'assessment-start',
        answer: null, answered: false, timestamp: attemptMeta.startedAt,
        assessmentAttemptId: attemptMeta.attemptId, assessmentAttemptStartedAt: attemptMeta.startedAt,
        activityId: String(sessionData?.quizState?.activityId || ''), requireConfirmation: true,
        requestId: attemptMeta.attemptId + '-start'
      };
      async function sendStartMarker() {
        if (cancelled || received || sending) return;
        if (retryTimer !== null) { window.clearTimeout(retryTimer); retryTimer = null; }
        sending = true;
        try {
          var result = await onSubmitLiveAnswer(packet);
          received = !!result && result.status === 'received';
        } catch (_) { /* Retry after a temporary connection failure. */ }
        finally {
          sending = false;
          if (!cancelled && !received) {
            retryTimer = window.setTimeout(sendStartMarker, retryDelay);
            retryDelay = Math.min(15000, retryDelay * 2);
          }
        }
      }
      function retryWhenVisible() { if (document.visibilityState !== 'hidden') sendStartMarker(); }
      sendStartMarker();
      window.addEventListener('online', sendStartMarker);
      document.addEventListener('visibilitychange', retryWhenVisible);
      return function () {
        cancelled = true;
        if (retryTimer !== null) window.clearTimeout(retryTimer);
        window.removeEventListener('online', sendStartMarker);
        document.removeEventListener('visibilitychange', retryWhenVisible);
      };
    }, [draftNamespace, attemptMeta && attemptMeta.attemptId, activeSessionCode]);
    React.useEffect(function () {
      if (!draftNamespace || !assessmentTimer.running || !assessmentTimer.deadlineAt || assessmentTimer.expired) return;
      var tick = function () {
        setAssessmentTimer(function (previous) {
          if (!previous || !previous.running || previous.expired) return previous;
          var remaining = Math.max(0, Math.ceil((Number(previous.deadlineAt) - Date.now()) / 1000));
          if (remaining <= 0) return Object.assign({}, previous, { remainingSeconds: 0, running: false, expired: true });
          if (remaining === previous.remainingSeconds) return previous;
          return Object.assign({}, previous, { remainingSeconds: remaining });
        });
      };
      tick();
      var interval = window.setInterval(tick, 1000);
      return function () { window.clearInterval(interval); };
    }, [draftNamespace, assessmentTimer.running, assessmentTimer.deadlineAt, assessmentTimer.expired]);
    React.useEffect(function () {
      if (draftNamespace && assessmentTimer.expired) setReviewOpen(true);
    }, [draftNamespace, assessmentTimer.expired]);
    function toggleQuestionFlag(questionIdx) {
      setFlaggedQuestions(function (previous) {
        var next = Object.assign({}, previous || {});
        if (next[questionIdx]) delete next[questionIdx];else next[questionIdx] = true;
        return next;
      });
    }
    function goToAssessmentQuestion(questionIdx) {
      var total = Array.isArray(assessmentData.questions) ? assessmentData.questions.length : 0;
      var next = Math.max(0, Math.min(Math.max(0, total - 1), Number(questionIdx) || 0));
      setCurrentQuestionIdx(next);
      setQuizVoiceReflectionIdx(null);
      setReviewOpen(false);
      window.setTimeout(function () {
        try {
          var node = document.getElementById('assessment-question-' + next);
          if (node && typeof node.focus === 'function') { node.setAttribute('tabindex', '-1'); node.focus({ preventScroll: true }); }
          if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: (document.querySelector('.reduce-motion') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) ? 'auto' : 'smooth', block: 'start' });
        } catch (e) {}
      }, 0);
    }
    function toggleAssessmentTimer() {
      setAssessmentTimer(function (previous) {
        if (!previous || previous.expired) return previous;
        if (previous.running) {
          var remaining = Math.max(0, Math.ceil((Number(previous.deadlineAt) - Date.now()) / 1000));
          return Object.assign({}, previous, { remainingSeconds: remaining, running: false, deadlineAt: 0 });
        }
        var seconds = Math.max(1, Number(previous.remainingSeconds) || initialTimeSeconds || 1);
        return Object.assign({}, previous, { remainingSeconds: seconds, running: true, deadlineAt: Date.now() + seconds * 1000 });
      });
    }
    function extendAssessmentTimer() {
      var extensionSeconds = deliverySettings.extensionMinutes * 60;
      setAssessmentTimer(function (previous) {
        var current = previous || { remainingSeconds: 0, running: false, deadlineAt: 0, expired: false };
        var remaining = current.running && current.deadlineAt ? Math.max(0, Math.ceil((Number(current.deadlineAt) - Date.now()) / 1000)) : Math.max(0, Number(current.remainingSeconds) || 0);
        var nextRemaining = remaining + extensionSeconds;
        return Object.assign({}, current, { remainingSeconds: nextRemaining, running: true, deadlineAt: Date.now() + nextRemaining * 1000, expired: false });
      });
    }
    function updateAssessmentDelivery(nextSettings) {
      if (typeof props.handleQuizQuestionAction === 'function') props.handleQuizQuestionAction(0, 'patch-assessment', { deliverySettings: nextSettings });
    }
    var submissionContext = JSON.stringify([props.generatedContent?.id, _quizFeedbackSignature(assessmentData), activeSessionCode || '', props.user?.uid || '', sessionData?.quizState?.activityId || '', !!props._assessmentPreview]);
    var submissionContextRef = React.useRef(submissionContext);
    submissionContextRef.current = submissionContext;
    var submissionMountedRef = React.useRef(true);
    React.useEffect(function () { submissionMountedRef.current = true; return function () { submissionMountedRef.current = false; }; }, []);
    var submissionLockRef = React.useRef(false);
    var [deliveryBusy, setDeliveryBusy] = React.useState(false);
    var [feedbackReleaseBusy, setFeedbackReleaseBusy] = React.useState(false);
    var [feedbackReleaseError, setFeedbackReleaseError] = React.useState('');
    var feedbackSignature = _quizFeedbackSignature(assessmentData);
    var feedbackRelease = sessionData?.quizState?.assessmentFeedbackRelease;
    // A release carrying a key version applies to a keyed copy only while that
    // copy holds the same key; a teacher who fixes a key must release again.
    var sessionRelease = feedbackRelease && feedbackRelease.resourceId === String(props.generatedContent?.id || '') ? feedbackRelease : null;
    var savedReleaseKeys = assessmentData.feedbackReleaseKeys && typeof assessmentData.feedbackReleaseKeys === 'object' ? assessmentData.feedbackReleaseKeys : null;
    var releaseMatches = function (signature, keys) {
      if (!signature || draftContext.compatibleSignatures.indexOf(signature) < 0) return false;
      return assessmentData.answerKeysWithheld === true || !keys || !keys.keyVersion || keys.keyVersion === draftContext.keyVersion;
    };
    var feedbackReleased = releaseMatches(deliverySettings.feedbackReleasedFor, savedReleaseKeys) || !!(sessionRelease && releaseMatches(sessionRelease.signature, sessionRelease.keys));
    // A withheld copy shows released feedback only once the released key for
    // this exact version has arrived (session release or a re-shared copy).
    var releasedData = null;
    if (assessmentData.answerKeysWithheld === true) {
      [sessionRelease ? sessionRelease.keys : null, savedReleaseKeys].some(function (keys) {
        releasedData = keys && draftContext.compatibleSignatures.indexOf(keys.signature) >= 0 ? _quizApplyReleasedKeys(assessmentData, keys) : null;
        return !!releasedData;
      });
      feedbackReleased = feedbackReleased && !!releasedData;
    }
    var gradedMode = _quizIsGraded(assessmentData);
    var deferFeedback = !isTeacherMode && !isParentMode && (deliverySettings.feedbackTiming !== 'immediate' || gradedMode);
    async function releaseAssessmentFeedback() {
      if (!isTeacherMode || props._assessmentPreview || feedbackReleaseBusy || typeof props.handleQuizQuestionAction !== 'function') return;
      setFeedbackReleaseBusy(true); setFeedbackReleaseError('');
      try {
        var result = await props.handleQuizQuestionAction(0, 'release-feedback', { signature: feedbackSignature, keys: deliverySettings.feedbackTiming === 'teacher-release' ? _quizReleaseKeyPayload(assessmentData, feedbackSignature) : null });
        if (result !== true) throw new Error('Feedback release was not confirmed. Try again.');
      } catch (error) { setFeedbackReleaseError(error.message || 'Could not release feedback. Try again.'); }
      finally { setFeedbackReleaseBusy(false); }
    }
    function reportAssessmentCompletion(receipt) {
      if (typeof props.onResourceComplete === 'function' && props.generatedContent?.id && !props._assessmentPreview) {
        try { props.onResourceComplete(props.generatedContent.id, { answered: receipt.summary.answered, total: receipt.summary.total }); } catch (e) {}
      }
    }
    async function deliverAssessmentReceipt(receipt) {
      if (props._assessmentPreview || submissionLockRef.current || !receipt || !activeSessionCode) return;
      if (receipt.sessionCode !== activeSessionCode || receipt.activityId !== String(sessionData?.quizState?.activityId || '')) return;
      submissionLockRef.current = true; setDeliveryBusy(true);
      var scope = submissionContext, namespace = learnerBaseDraftNamespace;
      var current = () => submissionMountedRef.current && submissionContextRef.current === scope && _quizReadAttemptReceipt(namespace)?.attemptId === receipt.attemptId && (!_quizReadDraft(namespace)?.items?.root?.attemptMeta?.attemptId || _quizReadDraft(namespace).items.root.attemptMeta.attemptId === receipt.attemptId);
      var latest = Object.assign({}, receipt, { delivery: { status: 'sending' } });
      if (!await _quizWithDraftLock(namespace, function () { return _quizFinalizeAttempt(namespace, latest); })) { submissionLockRef.current = false; setDeliveryBusy(false); _quizNotifyDraftSync(namespace); return; }
      setAttemptReceipt(latest);
      try {
        if (typeof onSubmitLiveAnswer !== 'function' || !receipt.activityId) throw new Error('Your teacher connection is unavailable. Reconnect, then retry.');
        var questions = assessmentData.questions || [];
        for (var i = 0; i <= questions.length; i++) {
          if (!current()) return;
          var q = questions[i], complete = i === questions.length;
          var result = await onSubmitLiveAnswer({
            questionIdx: i, itemType: complete ? 'assessment-complete' : q.type || 'mcq', conceptLabel: complete ? '' : q.conceptLabel || '',
            answer: complete ? { attemptId: receipt.attemptId, answered: receipt.summary.answered, total: receipt.summary.total, submittedAt: receipt.submittedAt, reflections: receipt.responses.root?.reflectionAnswers || {} } : _quizAttemptAnswer(q, i, receipt.responses),
            confidence: complete ? null : _quizAttemptConfidence(q, i, receipt.responses),
            questionSignature: complete ? '' : liveQuestionSignatures[i],
            assessmentAttemptId: receipt.attemptId, assessmentAttemptStartedAt: receipt.startedAt,
            answered: complete || _quizQuestionAnswered(q, i, { items: receipt.responses }),
            timestamp: receipt.submittedAt, activityId: receipt.activityId, requireConfirmation: true,
            requestId: receipt.attemptId + '-q' + i
          });
          if (!result || result.status !== 'received') throw new Error(result?.status === 'too-large' ? 'A response is too large for the live connection. Download your attempt to share with your teacher.' : 'Receipt was not confirmed. Your attempt is saved on this device. Reconnect, then retry.');
        }
        latest = Object.assign({}, receipt, { delivery: { status: 'received', receivedAt: Date.now() } });
        if (current()) reportAssessmentCompletion(latest);
      } catch (error) {
        latest = Object.assign({}, receipt, { delivery: { status: 'pending', message: error.message || 'Your attempt is saved. Delivery is not confirmed.' } });
      } finally {
        if (current()) { var updated = await _quizWithDraftLock(namespace, function () { return current() && _quizFinalizeAttempt(namespace, latest); }); if (updated) setAttemptReceipt(latest); else _quizNotifyDraftSync(namespace); setDeliveryBusy(false); }
        submissionLockRef.current = false;
      }
    }
    function downloadAssessmentAttempt() {
      if (!attemptReceipt || props._assessmentPreview) return;
      var exported = { title: assessmentData.title || 'Assessment', attemptId: attemptReceipt.attemptId, submittedAt: attemptReceipt.submittedAt, delivery: attemptReceipt.delivery, responses: (assessmentData.questions || []).map((q,i) => ({ question: q.question, type: q.type || 'mcq', response: _quizAttemptAnswer(q,i,attemptReceipt.responses || {}), confidence: _quizAttemptConfidence(q,i,attemptReceipt.responses || {}), ...(attemptReceipt.responses?.['q-' + i]?.practiceAttempts ? { practice: attemptReceipt.responses['q-' + i].practiceAttempts } : {}), ...(typeof attemptReceipt.responses?.['q-' + i]?.transferResponse === 'string' ? { transferResponse: attemptReceipt.responses['q-' + i].transferResponse } : {}) })), reflections: attemptReceipt.responses?.root?.reflectionAnswers || {} };
      var url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
      var link = document.createElement('a'); link.href = url; link.download = 'assessment-attempt.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function downloadAssessmentDraft() {
      if ((!draftNamespace && !externalWork) || props._assessmentPreview) return;
      var working = externalWork ? externalWork.draft : _quizReadWorkingDraft(draftNamespace);
      var exported = {
        format: 'alloflow-assessment-draft', version: 1, status: 'in-progress',
        title: assessmentData.title || 'Assessment', resourceId: String(props.generatedContent?.id || ''),
        attemptId: attemptMeta && attemptMeta.attemptId || '', exportedAt: Date.now(), updatedAt: working.updatedAt,
        note: 'A copy of your current responses. This download does not submit the assessment.',
        responses: (assessmentData.questions || []).map(function (q, i) { return { question: q.question || q.contextSentence || '', type: q.type || 'mcq', response: _quizAttemptAnswer(q, i, working.items), confidence: _quizAttemptConfidence(q, i, working.items) }; }),
        reflections: working.items.root && working.items.root.reflectionAnswers || {}
      };
      var url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
      var link = document.createElement('a'); link.href = url; link.download = 'assessment-draft.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function downloadEarlierAssessmentWork() {
      if (!earlierWork || props._assessmentPreview) return;
      var savedWork = earlierWork._versionStorageKey?.indexOf(_QUIZ_DRAFT_STORAGE_PREFIX) === 0 ? _quizReadWorkingDraft(earlierWork._versionStorageKey) : earlierWork;
      // Do not map old answer indices to today's potentially revised choices.
      var exported = { format: 'alloflow-earlier-assessment-work', assignmentIdentity: earlierWork.assessmentIdentity ? 'same-assignment-earlier-version' : 'unverified', note: earlierWork.assessmentIdentity ? 'Saved for an earlier version of this assignment. Its answers have not been applied to the changed questions.' : 'Saved before responses were separated by assignment. Question choices may have changed.', savedWork: savedWork };
      var url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
      var link = document.createElement('a'); link.href = url; link.download = 'earlier-assessment-work.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function submitAssessmentAttempt() {
      return _quizWithDraftLock(draftNamespace, submitAssessmentAttemptNow);
    }
    function submitAssessmentAttemptNow() {
      if (!draftNamespace || props._assessmentPreview || submissionLockRef.current) return null;
      setSubmissionError('');
      var existing = _quizReadAttemptReceipt(draftNamespace, feedbackSignature);
      if (existing) { setAttemptReceipt(existing); return existing; }
      var working = _quizReadWorkingDraft(draftNamespace), progress = _quizBuildAttemptProgress(assessmentData, working), submittedAt = Date.now();
      var receipt = _quizFinalizeAttempt(draftNamespace, {
        attemptId: attemptMeta && attemptMeta.attemptId || ('attempt-' + submittedAt.toString(36)),
        startedAt: attemptMeta && attemptMeta.startedAt || submittedAt, submittedAt,
        summary: { total: progress.total, answered: progress.answered, unanswered: progress.unanswered, flagged: progress.flagged },
        responses: working.items, feedbackTiming: deliverySettings.feedbackTiming, signature: feedbackSignature, resourceId: String(props.generatedContent?.id || ''),
        sessionCode: activeSessionCode || '', activityId: String(sessionData?.quizState?.activityId || ''),
        delivery: { status: activeSessionCode ? 'pending' : 'local' }
      });
      if (!receipt) {
        var saveError = quizT('quiz.draft.submission_failed', 'Your assessment has not been submitted because this browser could not save it. Keep this page open, download your draft, or retry submission when local saving is available.');
        setSubmissionError(saveError);
        if (typeof props.addToast === 'function') props.addToast(saveError, 'error');
        return null;
      }
      setReviewOpen(false); setAttemptReceipt(receipt);
      if (activeSessionCode) deliverAssessmentReceipt(receipt); else reportAssessmentCompletion(receipt);
      if (typeof props.addToast === 'function') props.addToast('Completed attempt saved on this device.', 'success');
      return receipt;
    }
    function startAnotherAssessmentAttempt() {
      return _quizWithDraftLock(learnerBaseDraftNamespace, startAnotherAssessmentAttemptNow);
    }
    function startAnotherAssessmentAttemptNow() {
      setRestartError('');
      if (!_quizClearAttemptReceipt(learnerBaseDraftNamespace, attemptReceipt && attemptReceipt.attemptId)) {
        var message = quizT('quiz.attempt.restart_failed', 'This browser could not start a new attempt. Your completed responses are still available here. Download a copy or try again.');
        setRestartError(message);
        if (typeof props.addToast === 'function') props.addToast(message, 'error');
        return;
      }
      recordAssessmentResponses('assessmentSubmitted', null);
      var restarted = _quizReadWorkingDraft(learnerBaseDraftNamespace), restartedMeta = restarted.items?.root?.attemptMeta || {};
      recordAssessmentResponses('assessmentDraft', _quizResponseSnapshot(assessmentData, restarted.items, { status: 'in-progress', attemptId: restartedMeta.attemptId || '', startedAt: restartedMeta.startedAt || null }));
      if (typeof props._onAssessmentStorageRefresh === 'function') props._onAssessmentStorageRefresh();
      else { setAttemptReceipt(null); try { window.location.reload(); } catch (e) {} }
    }
    // Mirror learner answers into the host's student-work record so Submit
    // Work carries them (non-live attempts otherwise lived only on-device).
    var recordResourceId = props.generatedContent && props.generatedContent.id;
    var recordResponsesRef = React.useRef(null);
    recordResponsesRef.current = !isTeacherMode && !isParentMode && !props._assessmentPreview && recordResourceId && typeof props.onRecordQuizResponses === 'function' ? props.onRecordQuizResponses : null;
    var recordedResponsesRef = React.useRef({});
    var recordAttemptMetaRef = React.useRef(attemptMeta);
    recordAttemptMetaRef.current = attemptMeta;
    function recordAssessmentResponses(key, snapshot) {
      var record = recordResponsesRef.current;
      if (!record || !recordResourceId) return;
      var signature = JSON.stringify(snapshot);
      if (recordedResponsesRef.current[key] === signature) return;
      recordedResponsesRef.current[key] = signature;
      try { record(recordResourceId, key, snapshot ? Object.assign({}, snapshot, { assessmentIdentity: draftContext, recordedAt: Date.now() }) : null); } catch (e) {}
    }
    React.useEffect(function () {
      if (!draftNamespace || !recordResponsesRef.current) return undefined;
      var timer = 0;
      function flush() {
        timer = 0;
        var meta = recordAttemptMetaRef.current || {};
        var snapshot = _quizResponseSnapshot(assessmentData, _quizReadWorkingDraft(draftNamespace).items, { status: 'in-progress', attemptId: meta.attemptId || '', startedAt: meta.startedAt || null });
        if (!snapshot.responded && !snapshot.answered && !snapshot.items.some(function (entry) { return entry.confidence; }) && !snapshot.reflections.some(function (entry) { return entry.response; }) && !recordedResponsesRef.current.assessmentDraft) return;
        recordAssessmentResponses('assessmentDraft', snapshot);
      }
      function onDraft(event) {
        if (!event || !event.detail || event.detail.namespace !== draftNamespace) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 400);
      }
      window.addEventListener('alloflow:assessment-draft-changed', onDraft);
      if (_quizReadDraft(draftNamespace)) flush();
      return function () {
        window.removeEventListener('alloflow:assessment-draft-changed', onDraft);
        if (timer) { clearTimeout(timer); flush(); }
      };
    }, [draftNamespace, recordResourceId]);
    React.useEffect(function () {
      if (!attemptReceipt || !recordResponsesRef.current) return;
      recordAssessmentResponses('assessmentSubmitted', _quizResponseSnapshot(assessmentData, attemptReceipt.responses || {}, { status: 'submitted', attemptId: attemptReceipt.attemptId || '', startedAt: attemptReceipt.startedAt || null, submittedAt: attemptReceipt.submittedAt || null, delivery: attemptReceipt.delivery && attemptReceipt.delivery.status || 'local' }));
      recordAssessmentResponses('assessmentDraft', null);
    }, [attemptReceipt, recordResourceId]);
    var mcqAnswersState = _quizUseDraftField(draftNamespace, 'root', 'mcqAnswers', {});
    var studentMcqAnswers = mcqAnswersState[0];
    var setStudentMcqAnswers = mcqAnswersState[1];
    var mcqConfidenceState = _quizUseDraftField(draftNamespace, 'root', 'mcqConfidence', {});
    var studentMcqConfidence = mcqConfidenceState[0];
    var setStudentMcqConfidence = mcqConfidenceState[1];
    function selectMcqOption(qIdx, optIdx, optText, q) {
      if (!deferFeedback) _quizRecordPracticeAttempt({ draftNamespace: draftNamespace, questionIdx: qIdx, q: q }, { optionIdx: optIdx, optionText: optText }, studentMcqConfidence[qIdx]);
      _quizWriteDraftField(draftNamespace, 'q-' + qIdx, 'idk', false);
      setStudentMcqAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[qIdx] = optIdx;
        return next;
      });
      if (typeof onSubmitLiveAnswer === 'function') {
        try {
          onSubmitLiveAnswer({
            questionIdx: qIdx,
            itemType: 'mcq',
            conceptLabel: q && q.conceptLabel || '',
            answer: {
              optionIdx: optIdx,
              optionText: optText
            },
            confidence: studentMcqConfidence[qIdx] || null,
            timestamp: Date.now()
          });
        } catch (e) {}
      }
    }
    function setMcqConfidence(qIdx, confidenceValue, q) {
      setStudentMcqConfidence(function (prev) {
        var next = Object.assign({}, prev);
        next[qIdx] = confidenceValue;
        return next;
      });
      var prevOptIdx = studentMcqAnswers[qIdx];
      var markedIdk = _quizReadDraftField(draftNamespace, 'q-' + qIdx, 'idk').value === true;
      if ((!markedIdk && typeof prevOptIdx !== 'number') || typeof onSubmitLiveAnswer !== 'function') return;
      try {
        onSubmitLiveAnswer({
          questionIdx: qIdx,
          itemType: 'mcq',
          conceptLabel: q && q.conceptLabel || '',
          answer: markedIdk ? { idk: true } : {
            optionIdx: prevOptIdx,
            optionText: q.options[prevOptIdx]
          },
          confidence: confidenceValue,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
    var reflectionAnswersState = _quizUseDraftField(draftNamespace, 'root', 'reflectionAnswers', {});
    var reflectionAnswers = reflectionAnswersState[0];
    var setReflectionAnswers = reflectionAnswersState[1];
    function setReflectionDraft(rIdx, text) {
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = Object.assign({}, next[rIdx] || {}, {
          draft: text
        });
        return next;
      });
    }
    function submitReflection(rIdx) {
      var entry = reflectionAnswers[rIdx] || {};
      var text = (entry.draft || '').trim();
      if (!text) return false;
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = {
          draft: text,
          submitted: true,
          submittedText: text
        };
        return next;
      });
      if (typeof onSubmitLiveAnswer === 'function') try {
        onSubmitLiveAnswer({
          questionIdx: 'r' + rIdx,
          itemType: 'reflection',
          conceptLabel: '',
          answer: {
            text: text
          },
          timestamp: Date.now()
        });
      } catch (e) {}
      return true;
    }
    function reopenReflection(rIdx) {
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = Object.assign({}, next[rIdx] || {}, {
          submitted: false
        });
        return next;
      });
    }
    function clearReflection(rIdx) {
      setReflectionAnswers(function (prev) {
        var next = Object.assign({}, prev);
        next[rIdx] = { draft: '', submitted: false, submittedText: '' };
        return next;
      });
    }
    var quizImageRefineInputsState = React.useState({});
    var quizImageRefineInputs = quizImageRefineInputsState[0];
    var setQuizImageRefineInputs = quizImageRefineInputsState[1];
    var isRefiningQuizImageState = React.useState({});
    var isRefiningQuizImage = isRefiningQuizImageState[0];
    var setIsRefiningQuizImage = isRefiningQuizImageState[1];
    var refineOpenState = React.useState({});
    var refineOpen = refineOpenState[0];
    var setRefineOpen = refineOpenState[1];
    function refineKey(qIdx, target, optIdx) {
      return target === 'question' ? qIdx + ':question' : qIdx + ':o' + optIdx;
    }
    function toggleRefinePanel(key) {
      setRefineOpen(function (prev) {
        var next = Object.assign({}, prev);
        if (next[key]) delete next[key];else next[key] = true;
        return next;
      });
    }
    async function refineQuizImage(qIdx, target, optIdx, instructionOverride) {
      var key = refineKey(qIdx, target, optIdx);
      var instruction = typeof instructionOverride === 'string' ? instructionOverride : (quizImageRefineInputs[key] || '').trim();
      if (!instruction) return;
      var q = generatedContent && generatedContent.data && generatedContent.data.questions && generatedContent.data.questions[qIdx];
      if (!q) return;
      var currentUrl = target === 'question' ? q.imageUrl : Array.isArray(q.optionImageUrls) ? q.optionImageUrls[optIdx] : null;
      if (!currentUrl || typeof currentUrl !== 'string' || currentUrl.indexOf(',') === -1) {
        if (typeof addToast === 'function') addToast(t('toasts.image_refine_yet'), 'error');
        return;
      }
      if (typeof callGeminiImageEdit !== 'function') {
        if (typeof addToast === 'function') addToast(t('toasts.image_edit_unavailable_callgeminiimageedit_provide'), 'error');
        return;
      }
      var request = authoringRequests.begin('image:' + key);
      if (!request) return;
      setIsRefiningQuizImage(function (prev) {
        var next = Object.assign({}, prev);
        next[key] = true;
        return next;
      });
      try {
        var rawBase64 = currentUrl.split(',')[1];
        var grade = props.gradeLevel || 'middle school';
        var styleHint = generatedContent && generatedContent.data && generatedContent.data.imageStyle || '';
        var styleClause = styleHint ? ' Required visual style: ' + styleHint + '.' : '';
        var prompt = 'Edit this educational quiz illustration. Maintain the same general visual style (colors, line weight, complexity).' + styleClause + ' Audience: ' + grade + ' level students. Edit instruction: "' + instruction + '"';
        var refinedUrl = await callGeminiImageEdit(prompt, rawBase64);
        if (!authoringRequests.current(request)) return;
        if (typeof handleQuizImageRefine === 'function') {
          handleQuizImageRefine(qIdx, target, optIdx, refinedUrl);
        }
        setQuizImageRefineInputs(function (prev) {
          var next = Object.assign({}, prev);
          if (next[key] === instruction) delete next[key];
          return next;
        });
        setRefineOpen(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
        if (typeof addToast === 'function') addToast(t('toasts.image_refined'), 'success');
      } catch (err) {
        if (authoringRequests.current(request) && typeof addToast === 'function') addToast(err && err.message || 'Refine failed — try again.', 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
        setIsRefiningQuizImage(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
      }
    }
    var isImprovingDistractorState = React.useState({});
    var isImprovingDistractor = isImprovingDistractorState[0];
    var setIsImprovingDistractor = isImprovingDistractorState[1];
    async function improveDistractor(qIdx, optIdx, currentDistractor, weakReason) {
      var key = qIdx + ':' + optIdx;
      if (isImprovingDistractor[key]) return;
      if (typeof props.callGemini !== 'function' || typeof handleQuizChange !== 'function') return;
      var q = generatedContent && generatedContent.data && generatedContent.data.questions && generatedContent.data.questions[qIdx];
      if (!q) return;
      var request = authoringRequests.begin('distractor:' + key);
      if (!request) return;
      setIsImprovingDistractor(function (prev) {
        var next = Object.assign({}, prev);
        next[key] = true;
        return next;
      });
      try {
        var grade = props.gradeLevel || 'middle school';
        var prompt = 'You are an assessment-design expert. Rewrite a single MCQ distractor to encode a REAL common student misconception (a predictable error students at the ' + grade + ' level make in their thinking).\n\n' + 'QUESTION: "' + (q.question || '') + '"\n' + 'CORRECT ANSWER: "' + (q.correctAnswer || '') + '"\n' + 'CURRENT WEAK DISTRACTOR: "' + currentDistractor + '"\n' + 'WHY IT IS WEAK: "' + (weakReason || 'does not encode a specific misconception') + '"\n\n' + 'Return ONLY the rewritten distractor text — a single short phrase or sentence at most ~15 words. No quotes, no labels, no explanation, no JSON. Just the new distractor text on a single line.';
        var raw = await props.callGemini(prompt, false);
        var newText = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        newText = newText.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^\s*Distractor:\s*/i, '').trim();
        if (!newText) throw new Error('Empty rewrite');
        if (!authoringRequests.current(request)) return;
        handleQuizChange(qIdx, 'option', newText, optIdx);
        if (typeof addToast === 'function') addToast(t('toasts.distractor_rewritten'), 'success');
      } catch (err) {
        if (authoringRequests.current(request) && typeof addToast === 'function') addToast(err && err.message || 'Rewrite failed.', 'error');
      } finally {
        if (!authoringRequests.end(request)) return;
        setIsImprovingDistractor(function (prev) {
          var next = Object.assign({}, prev);
          delete next[key];
          return next;
        });
      }
    }
    var isBulkImprovingState = React.useState(false);
    var isBulkImproving = isBulkImprovingState[0];
    var setIsBulkImproving = isBulkImprovingState[1];
    async function bulkImproveDistractors() {
      if (isBulkImproving) return;
      if (!generatedContent || !generatedContent.data || !Array.isArray(generatedContent.data.questions)) return;
      if (typeof props.callGemini !== 'function' || typeof handleQuizBulkOptionChange !== 'function') {
        if (typeof addToast === 'function') addToast(t('toasts.bulk_improve_unavailable'), 'error');
        return;
      }
      var tasks = [];
      generatedContent.data.questions.forEach(function (q, qIdx) {
        if (!q || q.type && q.type !== 'mcq') return;
        if (!Array.isArray(q.distractorQuality) || !Array.isArray(q.options)) return;
        q.distractorQuality.forEach(function (dq) {
          if (!dq || dq.encodesMisconception !== false) return;
          var optIdx = q.options.indexOf(dq.distractor);
          if (optIdx < 0) return;
          if (_quizAnswerMatches(q.options[optIdx], q.correctAnswer)) return;
          tasks.push({
            qIdx: qIdx,
            optIdx: optIdx,
            currentDistractor: dq.distractor,
            reason: dq.reason || ''
          });
        });
      });
      if (tasks.length === 0) {
        if (typeof addToast === 'function') addToast(t('toasts.weak_distractors_improve'), 'info');
        return;
      }
      var request = authoringRequests.begin('bulk-distractors');
      if (!request) return;
      setIsBulkImproving(true);
      setIsImprovingDistractor(function (prev) {
        var next = Object.assign({}, prev);
        tasks.forEach(function (t) {
          next[t.qIdx + ':' + t.optIdx] = true;
        });
        return next;
      });
      if (typeof addToast === 'function') addToast(t('toasts.rewriting') + tasks.length + ' weak distractor' + (tasks.length === 1 ? '' : 's') + '…', 'info');
      var grade = props.gradeLevel || 'middle school';
      var results = await Promise.all(tasks.map(function (task) {
        var q = generatedContent.data.questions[task.qIdx];
        var prompt = 'You are an assessment-design expert. Rewrite a single MCQ distractor to encode a REAL common student misconception (a predictable error students at the ' + grade + ' level make in their thinking).\n\n' + 'QUESTION: "' + (q.question || '') + '"\n' + 'CORRECT ANSWER: "' + (q.correctAnswer || '') + '"\n' + 'CURRENT WEAK DISTRACTOR: "' + task.currentDistractor + '"\n' + 'WHY IT IS WEAK: "' + task.reason + '"\n\n' + 'Return ONLY the rewritten distractor text — a single short phrase or sentence at most ~15 words. No quotes, no labels, no explanation, no JSON. Just the new distractor text on a single line.';
        return Promise.resolve().then(function () { return props.callGemini(prompt, false); }).then(function (raw) {
          var newText = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
          newText = newText.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^\s*Distractor:\s*/i, '').trim();
          if (!newText) return {
            ok: false,
            task: task
          };
          return {
            ok: true,
            task: task,
            newText: newText
          };
        }).catch(function () {
          return {
            ok: false,
            task: task
          };
        });
      }));
      if (!authoringRequests.current(request)) {
        if (authoringRequests.end(request)) { setIsBulkImproving(false); setIsImprovingDistractor({}); }
        return;
      }
      authoringRequests.end(request);
      var updates = results.filter(function (r) {
        return r.ok;
      }).map(function (r) {
        return {
          qIdx: r.task.qIdx,
          optIdx: r.task.optIdx,
          newText: r.newText
        };
      });
      if (updates.length > 0) {
        handleQuizBulkOptionChange(updates);
      }
      setIsImprovingDistractor(function (prev) {
        var next = Object.assign({}, prev);
        tasks.forEach(function (t) {
          delete next[t.qIdx + ':' + t.optIdx];
        });
        return next;
      });
      setIsBulkImproving(false);
      var failures = tasks.length - updates.length;
      if (typeof addToast === 'function') {
        if (failures === 0) addToast(t('toasts.rewrote') + updates.length + ' distractor' + (updates.length === 1 ? '' : 's') + '.', 'success');else addToast(t('toasts.rewrote') + updates.length + ' / ' + tasks.length + ' (' + failures + ' failed — try again).', failures > updates.length ? 'error' : 'success');
      }
    }
    function renderImageRefineOverlay(qIdx, target, optIdx, isCompact) {
      if (!isEditingQuiz) return null;
      var key = refineKey(qIdx, target, optIdx);
      var isOpen = !!refineOpen[key];
      var isLoading = !!isRefiningQuizImage[key];
      var inputValue = quizImageRefineInputs[key] || '';
      var btnSize = isCompact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 text-xs';
      return <><button type="button" onClick={function (e) {
          e.stopPropagation();
          toggleRefinePanel(key);
        }} disabled={isLoading} className={'absolute top-1 right-1 ' + btnSize + ' rounded-full bg-white/90 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 text-slate-700 shadow-sm flex items-center justify-center transition-colors motion-reduce:transition-none disabled:opacity-50'} title={isLoading ? 'Refining…' : 'Refine this image'} aria-label={t("a11y.refine_image")} data-help-key="quiz_image_refine_btn">{isLoading ? '⋯' : '✏️'}</button>{isOpen && <div className="mt-2 p-2 rounded border border-indigo-200 bg-indigo-50 text-xs"><div className="flex items-center gap-2 mb-1.5 flex-wrap"><button type="button" onClick={function () {
              refineQuizImage(qIdx, target, optIdx, 'Remove all text and labels from this image. Keep everything else identical.');
            }} disabled={isLoading} className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50" aria-label="Remove text from this image" title={t("tooltips.one_click_remove_text")}><span aria-hidden="true">🧹 </span>{t("ui_common.remove_text")}</button></div><textarea aria-label="Image refinement instructions" value={inputValue} onChange={function (e) {
            var v = e.target.value;
            setQuizImageRefineInputs(function (prev) {
              var next = Object.assign({}, prev);
              next[key] = v;
              return next;
            });
          }} onKeyDown={function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              refineQuizImage(qIdx, target, optIdx);
            }
          }} placeholder={'Describe how to refine this image (e.g. "make the background pure white", "add a clearer label")…'} rows={2} className="w-full text-xs p-1.5 rounded border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200  resize-y" disabled={isLoading} /><div className="flex items-center gap-2 mt-1.5"><button type="button" onClick={function () {
              refineQuizImage(qIdx, target, optIdx);
            }} disabled={isLoading || !inputValue.trim()} className="text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading ? 'Refining…' : 'Submit'}</button><button type="button" onClick={function () {
              toggleRefinePanel(key);
            }} disabled={isLoading} className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50">{t("ui_common.cancel")}</button></div></div>}</>;
    }
    // Student answering must not inherit facilitator display flags after a role switch.
    var canFacilitateAssessment = !!(isTeacherMode || isParentMode);
    var canPlayAssessmentGames = canFacilitateAssessment || !!(isIndependentMode && !activeSessionCode);
    var isPresentationMode = canFacilitateAssessment && !!props.isPresentationMode;
    var isReviewGame = canPlayAssessmentGames && !!props.isReviewGame;
    var isEditingQuiz = !!(props.isEditingQuiz && isTeacherMode && !isParentMode && !isIndependentMode);
    var [quizGamesOpen, setQuizGamesOpen] = React.useState(false);
    var quizGamesButtonRef = React.useRef(null);
    var quizGamesPanelRef = React.useRef(null);
    function quizCopy(key, fallback) { var value = t(key); return !value || value === key ? fallback : value; }
    function closeQuizGames() { setQuizGamesOpen(false); quizGamesButtonRef.current?.focus(); }
    function launchQuizGame(action) { closeQuizGames(); if (typeof action === 'function') action(); }
    React.useEffect(function () {
      if (!quizGamesOpen) return;
      function dismiss(event) {
        if (event.type === 'keydown') { if (event.key === 'Escape') { event.preventDefault(); closeQuizGames(); } }
        else if (!quizGamesPanelRef.current?.contains(event.target) && !quizGamesButtonRef.current?.contains(event.target)) setQuizGamesOpen(false);
      }
      document.addEventListener('pointerdown', dismiss);
      document.addEventListener('keydown', dismiss);
      return function () { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss); };
    }, [quizGamesOpen]);
    var [presentationAllQuestions, setPresentationAllQuestions] = React.useState(false);
    var [presentationQuestionIndex, setPresentationQuestionIndex] = React.useState(0);
    var presentationQuestions = Array.isArray(props.generatedContent?.data?.questions) ? props.generatedContent.data.questions : [];
    var presentationSlides = presentationQuestions.map((question, index) => question ? index : -1).filter(index => index >= 0);
    var presentationCurrent = Math.max(0, Math.min(presentationQuestionIndex, presentationSlides.length - 1));
    React.useEffect(function () { setPresentationQuestionIndex(0); setPresentationAllQuestions(false); setQuizGamesOpen(false); }, [props.generatedContent?.id, props.isPresentationMode, canFacilitateAssessment, canPlayAssessmentGames]);
    var presentationReflections = Array.isArray(props.generatedContent?.data?.reflections) ? props.generatedContent.data.reflections.filter(ref => typeof ref === 'string' ? ref.trim() : ref?.text) : props.generatedContent?.data?.reflection ? [props.generatedContent.data.reflection] : [];
    var escapeRoomState = canPlayAssessmentGames ? (props.escapeRoomState || {isActive:false}) : {isActive:false};
    var escapeTimeLeft = props.escapeTimeLeft;
    var isEscapeTimerRunning = props.isEscapeTimerRunning;
    var gameTeams = props.gameTeams;
    var reviewGameState = props.reviewGameState;
    var scoreAnimation = props.scoreAnimation;
    var soundEnabled = props.soundEnabled;
    var globalPoints = props.globalPoints;
    var inputText = props.inputText;
    // Presentation selections are local discussion marks, never learner submissions or grades.
    // Include content and role boundaries so an old reveal cannot flash on a new surface.
    var presentationScope = JSON.stringify([props.generatedContent?.id || '', presentationQuestions, presentationReflections, !!isTeacherMode, !!isParentMode, !!isIndependentMode, activeSessionCode || '', props.user?.uid || '', isPresentationMode]);
    var [localPresentation, setLocalPresentation] = React.useState({scope:'',items:{}});
    var presentationScopeRef = React.useRef(presentationScope);
    presentationScopeRef.current = presentationScope;
    var presentationState = isPresentationMode && localPresentation.scope === presentationScope ? localPresentation.items : {};
    React.useEffect(function () { setLocalPresentation({scope:presentationScope,items:{}}); }, [presentationScope]);
    var visiblePresentationGuides = Object.values(presentationState).filter(item => item.showAnswer || item.showExplanation).length;
    function updatePresentationItem(index, update) {
      if (!canFacilitateAssessment || !isPresentationMode || !presentationQuestions[index] || presentationScopeRef.current !== presentationScope) return;
      setLocalPresentation(function (previous) {
        if (presentationScopeRef.current !== presentationScope) return previous;
        var items = previous.scope === presentationScope ? previous.items : {};
        return {scope:presentationScope,items:{...items,[index]:update(items[index] || {})}};
      });
    }
    var generatedContent = props.generatedContent;
    var isFactChecking = props.isFactChecking;
    var showQuizAnswers = canFacilitateAssessment && !!props.showQuizAnswers;
    var leveledTextLanguage = props.leveledTextLanguage;
    var appId = props.appId;
    var setReviewGameState = props.setReviewGameState;
    var setSoundEnabled = props.setSoundEnabled;
    var setGameTeams = props.setGameTeams;
    var setEscapeRoomState = props.setEscapeRoomState;
    var setIsEscapeTimerRunning = props.setIsEscapeTimerRunning;
    var setConfirmDialog = props.setConfirmDialog;
    var handleStartLiveSession = props.handleStartLiveSession;
    var handleToggleInteractive = props.handleToggleInteractive;
    var handleEndLiveSession = props.handleEndLiveSession;
    var handleToggleIsPresentationMode = props.handleToggleIsPresentationMode;
    var handleToggleIsReviewGame = props.handleToggleIsReviewGame;
    var handleToggleIsEditingQuiz = props.handleToggleIsEditingQuiz;
    var handleToggleShowQuizAnswers = props.handleToggleShowQuizAnswers;
    var handleExportQTI = props.handleExportQTI;
    var handleManualScore = props.handleManualScore;
    var handleAddTeam = props.handleAddTeam;
    var handleRemoveTeam = props.handleRemoveTeam;
    var handleReviewTileClick = props.handleReviewTileClick;
    var handleAwardPoints = props.handleAwardPoints;
    var closeReviewModal = props.closeReviewModal;
    var [reviewPauseForAnswers, setReviewPauseForAnswers] = React.useState(false);
    var [reviewLearning, setReviewLearning] = React.useState({});
    React.useEffect(function () { setReviewLearning({}); }, [props.generatedContent?.id]);
    function recordReviewLearning(index, patch) { setReviewLearning(previous => ({ ...previous, [index]: { ...previous[index], ...patch } })); }
    var reviewDialogRef = React.useRef(null);
    var reviewCloseBtnRef = React.useRef(null);
    var reviewPreviousFocusRef = React.useRef(null);
    var reviewBoardRef = React.useRef(null);
    var reviewBoardHeadingRef = React.useRef(null);
    var reviewAwardHelpRef = React.useRef(null);
    var reviewRevealFocusPendingRef = React.useRef(false);
    function reviewTeamButtonClass(color) {
      var family = String(color || '').match(/(?:^|\s)bg-(blue|red|green|yellow|purple|pink|gray|slate)-\d+(?:\s|$)/)?.[1];
      return {
        blue: 'bg-blue-700 hover:bg-blue-800 text-white',
        red: 'bg-red-700 hover:bg-red-800 text-white',
        green: 'bg-green-700 hover:bg-green-800 text-white',
        yellow: 'bg-yellow-800 hover:bg-yellow-900 text-white',
        purple: 'bg-purple-700 hover:bg-purple-800 text-white',
        pink: 'bg-pink-700 hover:bg-pink-800 text-white'
      }[family] || 'bg-slate-700 hover:bg-slate-800 text-white';
    }
    var reviewModalOpen = !!(isReviewGame && reviewGameState && reviewGameState.activeQuestion);
    React.useEffect(function () {
      if (!reviewModalOpen) return;
      try { reviewPreviousFocusRef.current = document.activeElement; } catch (e) {}
      var restoreReviewBackground = function () {};
      var raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(function () {
        try {
          if (reviewCloseBtnRef.current) reviewCloseBtnRef.current.focus();
          else if (reviewDialogRef.current) reviewDialogRef.current.focus();
          restoreReviewBackground = _quizIsolateDialog(reviewDialogRef.current);
        } catch (e) {}
      }) : setTimeout(function () {
        try {
          if (reviewCloseBtnRef.current) reviewCloseBtnRef.current.focus();
          else if (reviewDialogRef.current) reviewDialogRef.current.focus();
          restoreReviewBackground = _quizIsolateDialog(reviewDialogRef.current);
        } catch (e) {}
      }, 0);
      return function () {
        if (typeof cancelAnimationFrame === 'function' && raf) {
          try { cancelAnimationFrame(raf); } catch (e) {}
        } else if (typeof clearTimeout === 'function') {
          clearTimeout(raf);
        }
        restoreReviewBackground();
        var previous = reviewPreviousFocusRef.current;
        reviewPreviousFocusRef.current = null;
        reviewRevealFocusPendingRef.current = false;
        try {
          if (previous && previous !== document.body && previous.isConnected !== false && !previous.disabled && typeof previous.focus === 'function') {
            previous.focus();
          } else {
            // Claiming a question disables its opener. Continue on the board instead of losing position.
            var tiles = Array.from(reviewBoardRef.current?.querySelectorAll('[data-review-tile]') || []);
            var previousIndex = tiles.indexOf(previous);
            var next = tiles.slice(previousIndex + 1).concat(tiles.slice(0, previousIndex + 1)).find(tile => !tile.disabled);
            (next || reviewBoardHeadingRef.current)?.focus();
          }
        } catch (e) {}
      };
    }, [reviewModalOpen]);
    React.useEffect(function () {
      if (reviewModalOpen && reviewGameState?.showAnswer && reviewRevealFocusPendingRef.current) {
        reviewRevealFocusPendingRef.current = false;
        reviewAwardHelpRef.current?.focus();
      }
    }, [reviewModalOpen, reviewGameState?.showAnswer]);
    function handlePresentationOptionClick(index, option) {
      if (!presentationQuestions[index]?.options?.includes(option)) return;
      updatePresentationItem(index, previous => previous.showAnswer ? previous : {...previous,selectedOption:option});
    }
    function togglePresentationAnswer(index) {
      updatePresentationItem(index, previous => ({...previous,showAnswer:!previous.showAnswer,showExplanation:false}));
    }
    function togglePresentationExplanation(index) {
      updatePresentationItem(index, previous => ({...previous,showExplanation:!previous.showExplanation}));
    }
    function resetPresentation() { setLocalPresentation({scope:presentationScope,items:{}}); }
    function hidePresentationGuides() {
      setLocalPresentation(function (previous) {
        if (previous.scope !== presentationScope) return {scope:presentationScope,items:{}};
        return {scope:presentationScope,items:Object.fromEntries(Object.entries(previous.items).map(([index,item]) => [index,{...item,showAnswer:false,showExplanation:false}]))};
      });
    }
    var handleQuizChange = props.handleQuizChange;
    var handleQuizImageRefine = props.handleQuizImageRefine;
    var handleQuizBulkOptionChange = props.handleQuizBulkOptionChange;
    var handleReflectionChange = props.handleReflectionChange;
    var handleFactCheck = props.handleFactCheck;
    var endCollaborativeEscapeRoom = props.endCollaborativeEscapeRoom;
    var resetEscapeRoom = props.resetEscapeRoom;
    var launchCollaborativeEscapeRoom = props.launchCollaborativeEscapeRoom;
    var launchConceptQuest = props.launchConceptQuest;
    var [soloQuestOpen, setSoloQuestOpen] = React.useState(false);
    var soloQuestSetup = useQuizGameSetupModule(canPlayAssessmentGames && soloQuestOpen, 'ConceptQuestSoloModule', 'ConceptQuestSolo', '__alloLazyConceptQuestSolo');
    function closeSoloQuest() { setSoloQuestOpen(false); setTimeout(() => quizGamesButtonRef.current?.focus(), 0); }
    var [boardSetupOpen, setBoardSetupOpen] = React.useState(false);
    var boardSetup = useQuizGameSetupModule(canPlayAssessmentGames && boardSetupOpen, 'LessonBoardModule', 'LessonBoardSetup', '__alloLazyLessonBoard');
    var [connectedSetupOpen, setConnectedSetupOpen] = React.useState(false);
    var connectedSetup = useQuizGameSetupModule(canPlayAssessmentGames && connectedSetupOpen, 'ConnectedEscapeRoomModule', 'ConnectedEscapeRoomSetup', '__alloLazyConnectedEscape');
    React.useEffect(function () { if (!canPlayAssessmentGames) { setSoloQuestOpen(false); setBoardSetupOpen(false); setConnectedSetupOpen(false); } }, [canPlayAssessmentGames]);
    var openEscapeRoomSettings = props.openEscapeRoomSettings;
    var generateEscapeRoom = props.generateEscapeRoom;
    var handlePuzzleSolved = props.handlePuzzleSolved;
    var handleSelectObject = props.handleSelectObject;
    var handleWrongAnswer = props.handleWrongAnswer;
    var handleEscapeRoomAnswer = props.handleEscapeRoomAnswer;
    var handleSequenceAnswer = props.handleSequenceAnswer;
    var handleCipherAnswer = props.handleCipherAnswer;
    var handleMatchingSelect = props.handleMatchingSelect;
    var handleScrambleAnswer = props.handleScrambleAnswer;
    var handleFillinAnswer = props.handleFillinAnswer;
    var handleFinalDoorAnswer = props.handleFinalDoorAnswer;
    var handleRevealHint = props.handleRevealHint;
    var derangeShuffle = props.derangeShuffle;
    var handleCreateGroup = props.handleCreateGroup;
    var handleAssignStudent = props.handleAssignStudent;
    var handleSetGroupResource = props.handleSetGroupResource;
    var handleSetGroupLanguage = props.handleSetGroupLanguage;
    var handleSetGroupProfile = props.handleSetGroupProfile;
    var handleDeleteGroup = props.handleDeleteGroup;
    // PHASE A persistence callback for TeacherLiveQuizControls — round-trips
    // routing rules into generatedContent.data.questions[i].routingRules so
    // they survive teacher-tab reload. See teacher_source.jsx
    // TeacherLiveQuizControls comment block for the contract.
    var handleUpdateQuestionRoutingRules = props.handleUpdateQuestionRoutingRules;
    var isPushingResource = props.isPushingResource;
    var callImagen = props.callImagen;
    var callGeminiImageEdit = props.callGeminiImageEdit;
    var getRows = props.getRows;
    var formatInlineText = props.formatInlineText;
    var renderFormattedText = props.renderFormattedText;
    var getReviewCategories = props.getReviewCategories;
    var playSound = props.playSound;
    var addToast = props.addToast;
    var ErrorBoundary = props.ErrorBoundary;
    var EscapeRoomTeacherControls = props.EscapeRoomTeacherControls;
    var TeacherLiveQuizControls = props.TeacherLiveQuizControls;
    var Stamp = props.Stamp;
    var ConfettiExplosion = props.ConfettiExplosion;
    var _quizMode = generatedContent && generatedContent.data && generatedContent.data.mode || 'exit-ticket';
    var _qmStrategiesMod = window.AlloModules && window.AlloModules.QuizModeStrategies || null;
    var _modeStrat = _qmStrategiesMod ? _qmStrategiesMod.getStrategy(_quizMode) : null;
    var _aiExplainerEnabled = !deferFeedback && !!(_modeStrat && _modeStrat.render && _modeStrat.render.aiExplainerOnFail) && typeof props.callGemini === 'function';
    var _showModeBanner = _quizMode !== 'exit-ticket' && !!_modeStrat;
    var _explainerState = React.useState({
      topic: '',
      loading: false,
      response: '',
      error: ''
    });
    var explainerData = _explainerState[0];
    var setExplainerData = _explainerState[1];
    var _explainerInput = React.useState('');
    var explainerInput = _explainerInput[0];
    var setExplainerInput = _explainerInput[1];
    function explainConcept(topic) {
      if (!topic || !topic.trim()) return;
      if (typeof props.callGemini !== 'function') {
        setExplainerData({
          topic: topic,
          loading: false,
          response: '',
          error: 'Explainer unavailable: callGemini not provided.'
        });
        return;
      }
      setExplainerData({
        topic: topic,
        loading: true,
        response: '',
        error: ''
      });
      var grade = props.gradeLevel || 'middle school';
      var prompt = 'You are a patient teacher explaining a concept to a ' + grade + ' student who needs a quick refresher. Explain "' + topic + '" in 60-90 words. Use simple, concrete language. Use an analogy or example if it helps. End with one sentence checking the student\'s understanding (e.g., "Does that make sense?"). Plain text only — no headings, no bullet points.';
      Promise.resolve(props.callGemini(prompt, false)).then(function (raw) {
        var txt = raw && typeof raw === 'object' && raw.text ? raw.text : String(raw || '');
        setExplainerData({
          topic: topic,
          loading: false,
          response: txt.trim(),
          error: ''
        });
      }).catch(function (err) {
        setExplainerData({
          topic: topic,
          loading: false,
          response: '',
          error: err && err.message ? err.message : 'Explainer failed.'
        });
      });
    }
    var _smartSkips = generatedContent && generatedContent.data && Array.isArray(generatedContent.data.smartSkips) ? generatedContent.data.smartSkips : [];
    var _pushedExplainer = sessionData && sessionData.quizState && sessionData.quizState.classExplainer;
    var settingsDrawerOpenState = React.useState(false);
    var dismissedExplainerTsState = React.useState(0);
    var dismissedExplainerTs = dismissedExplainerTsState[0];
    var setDismissedExplainerTs = dismissedExplainerTsState[1];
    var _showClassExplainer = !!_pushedExplainer && _pushedExplainer.text && _pushedExplainer.ts !== dismissedExplainerTs && !isEditingQuiz && !isPresentationMode && !isTeacherMode;
    var classExplainerBanner = _showClassExplainer ? <div key="class-explainer-banner" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 mb-2 shadow-sm animate-in motion-reduce:animate-none fade-in slide-in-from-top-2" role="region" aria-label="Teacher explanation"><div className="flex items-start gap-3"><span className="text-2xl flex-shrink-0" aria-hidden="true">📡</span><div className="flex-grow min-w-0"><div className="text-[10px] uppercase font-bold tracking-wider text-amber-800 mb-1">From your teacher · pause and read</div>{_pushedExplainer.conceptText && <p className="text-xs italic text-amber-700 mb-1">{'"' + _pushedExplainer.conceptText + '"'}</p>}<div className="text-sm text-slate-800 leading-relaxed">{_quizRichBlock(_pushedExplainer.text)}</div><div className="flex items-center gap-2 mt-3 flex-wrap">{typeof props.callTTS === 'function' && <button type="button" onClick={function () {
              try {
                if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_quizPlain(_pushedExplainer.text));
                else props.callTTS(_quizPlain(_pushedExplainer.text));
              } catch (e) {}
            }} className="text-xs font-bold px-3 py-1 rounded bg-white border border-amber-300 text-amber-900 hover:bg-amber-100" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}<button type="button" onClick={function () {
              setDismissedExplainerTs(_pushedExplainer.ts);
            }} className="text-xs font-bold px-3 py-1 rounded bg-amber-700 text-white hover:bg-amber-800">✓ Got it</button></div></div></div></div> : null;
    var modeBanner = _showModeBanner ? <div key="mode-banner" className={'rounded-xl border-2 p-4 mb-2 ' + (_quizMode === 'pre-check' ? 'border-amber-300 bg-amber-50' : _quizMode === 'review' ? 'border-purple-300 bg-purple-50' : 'border-sky-300 bg-sky-50')} role="region" aria-label={_modeStrat.label}><div className="flex items-center gap-2 mb-1"><span className="text-xl" aria-hidden="true">{_modeStrat.icon}</span><h3 className={'font-black text-base ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')}>{_modeStrat.label}</h3><span className={'ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded ' + (_quizMode === 'pre-check' ? 'bg-amber-200 text-amber-900' : _quizMode === 'review' ? 'bg-purple-200 text-purple-900' : 'bg-sky-200 text-sky-900')}>{_quizMode}</span></div>{_modeStrat.render.intro && <p className={'text-sm leading-relaxed ' + (_quizMode === 'pre-check' ? 'text-amber-900' : _quizMode === 'review' ? 'text-purple-900' : 'text-sky-900')}>{_modeStrat.render.intro}</p>}{_smartSkips.length > 0 && <p className={'text-xs italic mt-2 ' + (_quizMode === 'pre-check' ? 'text-amber-800' : _quizMode === 'review' ? 'text-purple-800' : 'text-sky-800')}>{'ℹ️ Skipped ' + _smartSkips.join(' and ') + ' — using the dedicated tool instead avoids redundancy.'}</p>}{isTeacherMode && generatedContent && generatedContent.data && generatedContent.data.distractorReview && <div className="mt-2 flex items-center gap-2 flex-wrap" data-help-key="quiz_distractor_review_summary"><p className={'text-xs italic ' + (_quizMode === 'pre-check' ? 'text-amber-800' : 'text-sky-800')} title={(generatedContent.data.distractorReview.weakItems || []).length > 0 ? 'Weak items: Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
          return i + 1;
        }).join(', Q') : 'All MCQs have at least half their distractors encoding a known misconception'}><span aria-hidden="true">🎯 </span>{'Distractor review: ' + (generatedContent.data.distractorReview.misconceptionCount || 0) + ' of ' + (generatedContent.data.distractorReview.totalDistractors || 0) + ' distractors encode a misconception (' + (generatedContent.data.distractorReview.quality != null ? generatedContent.data.distractorReview.quality + '%' : '—') + ')' + ((generatedContent.data.distractorReview.weakItems || []).length > 0 ? ' — review Q' + generatedContent.data.distractorReview.weakItems.map(function (i) {
            return i + 1;
          }).join(', Q') + ' before deploying' : ' — looks solid')}</p>{isEditingQuiz && function () {
          var weakCount = (Array.isArray(generatedContent.data.questions) ? generatedContent.data.questions : []).reduce(function (sum, q) {
            if (!q || q.type && q.type !== 'mcq') return sum;
            if (!Array.isArray(q.distractorQuality)) return sum;
            return sum + q.distractorQuality.filter(function (dq) {
              return dq && dq.encodesMisconception === false && Array.isArray(q.options) && q.options.indexOf(dq.distractor) >= 0 && !_quizAnswerMatches(q.options[q.options.indexOf(dq.distractor)], q.correctAnswer);
            }).length;
          }, 0);
          if (weakCount === 0) return null;
          return <button type="button" onClick={bulkImproveDistractors} disabled={isBulkImproving} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors motion-reduce:transition-none" aria-label={isBulkImproving ? 'Rewriting ' + weakCount + ' weak distractors' : 'Rewrite all ' + weakCount + ' flagged distractors in one batch'} data-help-key="quiz_bulk_improve_btn" title={'Rewrite all ' + weakCount + ' flagged distractor' + (weakCount === 1 ? '' : 's') + ' in one batch'}><span aria-hidden="true">✨ </span>{isBulkImproving ? 'Rewriting ' + weakCount + '…' : 'Improve all ' + weakCount}</button>;
        }()}</div>}</div> : null;
    // A learner support, collapsed to its question until wanted. Teachers and
    // parents see what students see through Preview as student.
    var explainerPanel = _aiExplainerEnabled && !isTeacherMode && !props.isParentMode ? <details key="ai-explainer" data-quiz-explainer className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6" aria-label="AI concept explainer"><summary className="flex min-h-11 cursor-pointer items-center gap-2 mb-2"><span className="text-lg" aria-hidden="true">🤖</span><h4 className="font-bold text-sm text-indigo-900">Don't know a concept? Ask for a quick explainer.</h4></summary><p className="text-xs text-indigo-800 mb-2">Type any concept from the quiz (or any prior knowledge you're unsure about). The AI will give you a 60-90 word explanation tuned to your grade level.</p><div className="flex items-stretch gap-2"><input aria-label="Concept to explain" type="text" value={explainerInput} onChange={function (ev) {
          setExplainerInput(ev.target.value);
        }} onKeyDown={function (ev) {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            explainConcept(explainerInput);
          }
        }} placeholder={_quizMode === 'pre-check' ? 'e.g., "what plants need to grow"' : 'e.g., "photosynthesis"'} className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-indigo-300 bg-white text-sm  focus:ring-2 focus:ring-indigo-400" /><button type="button" onClick={function () {
          explainConcept(explainerInput);
        }} disabled={!explainerInput.trim() || explainerData.loading} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none">{explainerData.loading ? 'Explaining…' : 'Explain'}</button></div>{explainerData.response && <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-lg"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">{explainerData.topic}</div><div className="text-sm text-slate-800 leading-relaxed">{_quizRichBlock(explainerData.response)}</div>{typeof props.callTTS === 'function' && <button type="button" onClick={function () {
          if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.speak(_quizPlain(explainerData.response));
          else props.callTTS(_quizPlain(explainerData.response));
        }} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900" aria-label={t("a11y.read_aloud")}>🔊 Read aloud</button>}</div>}{explainerData.error && <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">{explainerData.error}</div>}</details> : null;
    var qualityReviewPanel = isTeacherMode && !(activeSessionCode && sessionData && sessionData.quizState && sessionData.quizState.isActive) ? <><AssessmentLearningContext data={assessmentData} /><AssessmentQualityPanel audit={assessmentAudit} h5p={assessmentH5PPreflight} repairing={repairingAssessment} onRepairAll={repairAssessmentQuality} /></> : null;
    var deliverySettingsPanel = isTeacherMode && !(activeSessionCode && sessionData && sessionData.quizState && sessionData.quizState.isActive) ? <AssessmentDeliveryPanel settings={deliverySettings} onChange={updateAssessmentDelivery} onRelease={releaseAssessmentFeedback} released={feedbackReleased} releasing={feedbackReleaseBusy} releaseError={feedbackReleaseError} live={!!activeSessionCode} /> : null;
    // The teacher's settings share one drawer, its button naming what is set.
    // A quality check that finds problems stays in view: they can be answer-key errors.
    var settingsDrawerOpen = settingsDrawerOpenState[0];
    var _deliveryProfileLabel = { flexible: quizCopy('quiz.delivery_flexible', 'Flexible access'), focused: quizCopy('quiz.delivery_focused', 'Focused steps'), 'timed-practice': quizCopy('quiz.delivery_timed', 'Timed practice') }[deliverySettings.profile] || quizCopy('quiz.delivery_custom', 'Custom settings');
    var _feedbackTimingLabel = { immediate: quizCopy('quiz.feedback_immediate', 'Immediate practice feedback'), 'after-submit': quizCopy('quiz.feedback_after_submit', 'Feedback after submission'), 'teacher-release': quizCopy('quiz.feedback_teacher_release', 'Feedback when you release it'), 'teacher-graded': quizCopy('quiz.graded.option', 'Graded: hide answers from students') }[deliverySettings.feedbackTiming] || '';
    var drawerQuality = qualityReviewPanel && assessmentAudit.ready ? qualityReviewPanel : null;
    var canExportQti = isTeacherMode && !isIndependentMode && typeof handleExportQTI === 'function';
    var canPreviewAsStudent = typeof props._onPreviewAsStudent === 'function';
    var drawerTools = canExportQti || canPreviewAsStudent ? <div data-assessment-drawer-tools className="flex flex-wrap gap-2">{canPreviewAsStudent && <button type="button" data-assessment-preview-toggle onClick={props._onPreviewAsStudent} className="min-h-11 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-900">{quizCopy('quiz.preview_as_student', 'Preview as student')}</button>}{canExportQti && <button type="button" data-assessment-export-qti onClick={handleExportQTI} className="flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold bg-white text-teal-700 border border-teal-200 hover:bg-teal-50 transition-all motion-reduce:transition-none" title={t('export_menu.qti')}><FolderDown size={14} aria-hidden="true" /> {t('quiz.export_qti_btn')}</button>}</div> : null;
    var settingsDrawer = drawerQuality || deliverySettingsPanel || drawerTools ? <section data-assessment-settings-drawer className="rounded-xl border border-slate-300 bg-white"><button type="button" data-assessment-settings-toggle aria-expanded={settingsDrawerOpen} aria-controls="assessment-settings-panel" onClick={function () { settingsDrawerOpenState[1](!settingsDrawerOpen); }} className="w-full min-h-11 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 p-3 text-left focus-visible:ring-2 focus-visible:ring-indigo-600"><span className="text-sm font-bold text-slate-800">{quizCopy('quiz.settings_drawer', 'Settings, preview and export')}</span><span className="text-xs text-slate-600">{[_deliveryProfileLabel, _feedbackTimingLabel].filter(Boolean).join(' · ')}</span></button><div id="assessment-settings-panel" hidden={!settingsDrawerOpen} style={{ display: settingsDrawerOpen ? undefined : 'none' }} className="space-y-3 p-3 pt-0">{drawerTools}{drawerQuality}{deliverySettingsPanel}</div></section> : null;
    var draftStatusPanel = draftNamespace && !isEditingQuiz && !isPresentationMode && !isReviewGame ? <AssessmentDraftStatus namespace={draftNamespace} onDownload={downloadAssessmentDraft} copy={quizT} /> : null;
    var oneQuestionAtATime = deliverySettings.pacing === 'one-at-a-time' && !isEditingQuiz && !isPresentationMode;
    var assessmentQuestionCount = Array.isArray(assessmentData.questions) ? assessmentData.questions.length : 0;
    var reviewProgress = draftNamespace ? _quizBuildAttemptProgress(assessmentData, _quizReadWorkingDraft(draftNamespace)) : null;
    // The navigation row keeps `pr-20 md:pr-0`: on phones the Student Tools
    // launcher is pinned to the bottom-right corner (view_fab_stack, 12px in),
    // and Next / Review & submit are the row's right-most controls, so without
    // that clearance the launcher covered them whenever the row scrolled to the
    // bottom of the screen.
    var learnerAttemptPanel = draftNamespace && !isEditingQuiz && !isPresentationMode && !isReviewGame ? <section className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4" aria-label="Assessment progress and submission">{gradedMode && <p data-assessment-graded-banner className="mb-3 text-sm font-bold text-indigo-950">{quizT('quiz.graded.student_banner', 'Graded: answers are not shown here. Your teacher will check them after you submit.')}</p>}<AssessmentTimerBar enabled={deliverySettings.timeLimitMinutes > 0} remainingSeconds={assessmentTimer.remainingSeconds} running={assessmentTimer.running} expired={assessmentTimer.expired} warningMinutes={deliverySettings.warningMinutes} extensionMinutes={deliverySettings.extensionMinutes} onTogglePause={toggleAssessmentTimer} onExtend={extendAssessmentTimer} /><div className={'flex items-center gap-2 flex-wrap pr-20 md:pr-0 ' + (deliverySettings.timeLimitMinutes > 0 ? 'mt-3' : '')}>{deliverySettings.showProgress && <span className="text-xs font-black text-indigo-950">{oneQuestionAtATime ? 'Question ' + (currentQuestionIdx + 1) + ' of ' + assessmentQuestionCount : assessmentQuestionCount + ' questions'}</span>}{oneQuestionAtATime && <div className="flex items-center gap-2"><button type="button" onClick={function () { goToAssessmentQuestion(currentQuestionIdx - 1); }} disabled={currentQuestionIdx <= 0} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-indigo-900 disabled:opacity-40">Previous</button><button type="button" onClick={function () { goToAssessmentQuestion(currentQuestionIdx + 1); }} disabled={currentQuestionIdx >= assessmentQuestionCount - 1} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-indigo-300 text-indigo-900 disabled:opacity-40">Next</button></div>}<button type="button" onClick={function () { setReviewOpen(true); }} className="ml-auto text-xs font-black px-3 py-1.5 rounded-lg bg-indigo-700 text-white hover:bg-indigo-800">{_quizGradedCopy('quiz.student.review_submit', 'Review & submit')}</button></div></section> : null;
    var reviewDialog = <AssessmentReviewDialog preview={!!props._assessmentPreview} open={reviewOpen} progress={reviewProgress} submissionError={submissionError} onDownloadDraft={downloadAssessmentDraft} onClose={function () { setReviewOpen(false); }} onGo={goToAssessmentQuestion} onSubmit={submitAssessmentAttempt} copy={quizT} />;
    function getQuizReflections() {
      if (Array.isArray(assessmentData.reflections)) return assessmentData.reflections;
      return assessmentData.reflection ? [assessmentData.reflection] : [];
    }
    function getQuizVoiceReflectionStatus(reflections, canExit, requestedIdx) {
      var list = Array.isArray(reflections) ? reflections : [];
      var focusIdx = typeof requestedIdx === 'number' ? requestedIdx : quizVoiceReflectionIdx;
      var rIdx = typeof focusIdx === 'number' && focusIdx >= 0 && focusIdx < list.length ? focusIdx : null;
      if (rIdx === null) return null;
      var entry = reflectionAnswers[rIdx] || {};
      var draft = String(entry.draft || '');
      var submitted = !!entry.submitted;
      var response = _quizReflectionResponse(entry);
      var actions = ['status', 'describe', 'list-actions', 'list-reflections', 'select-reflection', 'read-reflection', 'read-reflection-response', 'return-to-question'];
      if (submitted) actions.push('edit-reflection');
      else {
        actions.push('set-reflection', 'append-reflection');
        if (draft.trim()) actions.push('submit-reflection');
      }
      if (response.trim() && !submitted) actions.push('clear-reflection');
      if (rIdx > 0) actions.push('previous-reflection');
      if (rIdx < list.length - 1) actions.push('next-reflection');
      if (draftNamespace) actions.push('submit');
      if (quizVoiceLastFeedbackRef.current) actions.push('repeat-feedback');
      if (canExit) actions.push('close');
      var prompt = _quizVoiceReflectionPrompt(list[rIdx]);
      var message = 'Reflection ' + (rIdx + 1) + ' of ' + list.length + '. ' + prompt;
      if (submitted) message += ' This reflection is submitted. Say read my reflection or edit reflection.';
      else if (draft.trim()) message += ' A draft response is present. Say read my reflection, append to reflection, clear reflection, or submit reflection.';
      else message += ' No response has been entered. Say set reflection to, followed by your response.';
      return {
        ok: true, ready: true, mounted: true, state: submitted ? 'reflection-submitted' : 'reflection-ready',
        surface: 'quiz', surfaceMode: 'reflection', type: 'reflection', actions: actions,
        reflectionIndex: rIdx, reflectionNumber: rIdx + 1, reflectionTotal: list.length,
        reflectionPrompt: prompt, reflectionResponse: response, reflectionSubmitted: submitted,
        canChooseByVoice: false, canEnterFreeformByVoice: !submitted, canResetByVoice: false,
        reviewOpen: reviewOpen, message: message
      };
    }
    // QUIZ VOICE SURFACE: semantic state actions; pointer and keyboard remain available.
    function getQuizVoiceBoundaryStatus() {
      var questions = Array.isArray(assessmentData.questions) ? assessmentData.questions : [];
      var reflections = getQuizReflections();
      var learnerSurface = (!isTeacherMode && !isParentMode) || isIndependentMode;
      var ordinarySurface = learnerSurface && !isEditingQuiz && !isPresentationMode && !isReviewGame && !(escapeRoomState && escapeRoomState.isActive);
      var canExit = typeof props.onClose === 'function' || typeof props.onExit === 'function';
      if (!ordinarySurface) {
        return {
          ok: false, ready: false, mounted: true, state: 'unsupported-mode', surface: 'quiz',
          actions: ['status'],
          message: 'Quiz voice controls are available only in the ordinary learner quiz view.'
        };
      }
      if (attemptReceipt) {
        return {
          ok: true, ready: false, mounted: true, state: 'submitted', surface: 'quiz',
          actions: canExit ? ['status', 'describe', 'close'] : ['status', 'describe'],
          message: attemptReceipt.delivery?.status === 'received' ? 'Your teacher device confirmed receipt of this attempt.' : 'Your completed attempt is saved on this device.' + (attemptReceipt.sessionCode ? ' Teacher receipt is not yet confirmed.' : '')
        };
      }
      if (reviewOpen) {
        var currentReviewProgress = reviewProgress || _quizBuildAttemptProgress(assessmentData, _quizReadWorkingDraft(draftNamespace));
        return {
          ok: true,
          ready: false,
          mounted: true,
          state: 'review',
          surface: 'quiz',
          surfaceMode: 'review',
          type: 'assessment-review',
          actions: ['status', 'describe', 'list-actions', 'submit', 'cancel-review'],
          reviewOpen: true,
          totalQuestions: questions.length,
          answeredCount: currentReviewProgress.answered,
          unansweredCount: currentReviewProgress.unanswered,
          flaggedCount: currentReviewProgress.flagged,
          message: 'Quiz review is open. ' + currentReviewProgress.answered + ' of ' + currentReviewProgress.total + ' questions are answered. Say submit assessment or cancel review.'
        };
      }
      var reflectionStatus = getQuizVoiceReflectionStatus(reflections, canExit);
      if (reflectionStatus) return reflectionStatus;
      if (questions.length === 0) {
        var emptyActions = ['status', 'describe'];
        if (reflections.length > 0) emptyActions.push('list-reflections', 'open-reflections', 'select-reflection');
        if (canExit) emptyActions.push('close');
        return {
          ok: reflections.length > 0, ready: false, mounted: true,
          state: reflections.length > 0 ? 'reflection-overview' : 'empty', surface: 'quiz',
          actions: emptyActions, reflectionTotal: reflections.length,
          message: reflections.length > 0
            ? 'This quiz has no questions and ' + reflections.length + ' reflection prompt' + (reflections.length === 1 ? '' : 's') + '. Say open reflections.'
            : 'This quiz does not contain any questions or reflections.'
        };
      }
      var questionIdx = Math.max(0, Math.min(questions.length - 1, currentQuestionIdx));
      var question = questions[questionIdx] || {};
      var type = question.type || 'mcq';
      var selectedOptionIdx = typeof studentMcqAnswers[questionIdx] === 'number' ? studentMcqAnswers[questionIdx] : null;
      var itemController = getQuizItemVoiceController(questionIdx);
      var itemState = itemController && typeof itemController.getState === 'function' ? itemController.getState() : null;
      var itemActions = itemState && Array.isArray(itemState.actions) ? itemState.actions : [];
      var actions = ['status', 'describe', 'list-actions', 'read-question'];
      if (reflections.length > 0) actions.push('list-reflections', 'open-reflections', 'select-reflection');
      if (type === 'mcq' && Array.isArray(question.options) && question.options.length > 0) actions.push('choose');
      itemActions.forEach(function (itemAction) { if (actions.indexOf(itemAction) < 0) actions.push(itemAction); });
      if (type === 'mcq' && isIndependentMode && typeof handleToggleShowQuizAnswers === 'function') actions.push('check');
      if (draftNamespace) actions.push('submit');
      if (questionIdx > 0) actions.push('previous');
      if (questionIdx < questions.length - 1) actions.push('next');
      if (quizVoiceLastFeedbackRef.current) actions.push('repeat-feedback');
      if (canExit) actions.push('close');
      return Object.assign({
        ok: true,
        ready: true,
        mounted: true,
        state: 'ready',
        surface: 'quiz',
        actions: actions,
        canChooseByVoice: (type === 'mcq' && Array.isArray(question.options) && question.options.length > 0) || itemActions.indexOf('choose') >= 0 || itemActions.indexOf('choose-answer') >= 0 || itemActions.indexOf('choose-evidence') >= 0,
        canChooseAnswerPartByVoice: itemActions.indexOf('choose-answer') >= 0,
        canChooseEvidencePartByVoice: itemActions.indexOf('choose-evidence') >= 0,
        reflectionTotal: reflections.length,
        canEnterFreeformByVoice: itemActions.indexOf('enter-response') >= 0,
        canResetByVoice: itemActions.indexOf('try-again') >= 0,
        canReviseByVoice: itemActions.indexOf('revise') >= 0,
        reviewOpen: false,
        checked: Boolean(showQuizAnswers),
        message: 'Quiz is ready at question ' + (questionIdx + 1) + ' of ' + questions.length + '.'
      }, _quizVoiceQuestionPayload(question, questionIdx, questions.length, selectedOptionIdx, itemState));
    }
    function publishQuizVoiceBoundaryResult(result, request, action) {
      var input = request && typeof request === 'object' ? request : {};
      var payload = Object.assign({
        surface: 'quiz',
        action: action || 'status',
        requestId: input.requestId == null ? null : input.requestId
      }, result || {});
      try { if (typeof input.respond === 'function') input.respond(payload); } catch (e) {}
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
          window.dispatchEvent(new window.CustomEvent(QUIZ_VOICE_STATUS_EVENT, { detail: payload }));
        }
      } catch (e) {}
      return payload;
    }
    function handleQuizVoiceChoice(request, status, question) {
      if (!status.ready) return status;
      if (!question || (question.type && question.type !== 'mcq') || !Array.isArray(question.options)) {
        var itemController = getQuizItemVoiceController(status.questionIndex);
        if (itemController && typeof itemController.execute === 'function') {
          var itemResult = itemController.execute('choose', request);
          if (itemResult && itemResult.message) quizVoiceLastFeedbackRef.current = itemResult.message;
          return Object.assign({}, status, itemResult || {});
        }
        return Object.assign({}, status, {
          ok: false,
          state: 'unsupported-item',
          message: 'Choosing an option by voice is supported for multiple-choice items only. Voice entry for ' + status.type + ' is not available yet.'
        });
      }
      var requestedIndex = typeof request.optionIndex === 'number'
        ? Math.floor(request.optionIndex)
        : _quizVoiceChoiceIndex(request.choice != null ? request.choice : (request.option != null ? request.option : request.value), question.options.length);
      if (requestedIndex < 0 || requestedIndex >= Math.min(8, question.options.length)) {
        return Object.assign({}, status, {
          ok: false,
          state: 'invalid-choice',
          message: 'Choose an available option by letter A through H, number 1 through 8, or ordinal such as first or second.'
        });
      }
      selectMcqOption(status.questionIndex, requestedIndex, question.options[requestedIndex], question);
      var choiceLabel = String.fromCharCode(65 + requestedIndex);
      var choiceMessage = 'Option ' + choiceLabel + ' selected for question ' + status.questionNumber + '.';
      quizVoiceLastFeedbackRef.current = choiceMessage;
      return Object.assign({}, status, {
        ok: true,
        state: 'selected',
        selectedOptionIndex: requestedIndex,
        selectedOptionLabel: choiceLabel,
        message: choiceMessage
      });
    }
    function handleQuizVoiceCheck(status, question, selectedOptionIdx) {
      if (deferFeedback) return Object.assign({}, status, { ok:false, state:'feedback-held', message: gradedMode ? _quizGradedCopy('quiz.graded.student_note', 'Your teacher will check your answers.') : 'Feedback is available after submission' + (deliverySettings.feedbackTiming === 'teacher-release' ? ' and teacher release.' : '.') });
      if (!status.ready) return status;
      if (!isIndependentMode) {
        return Object.assign({}, status, {
          ok: false,
          state: 'inapplicable',
          message: draftNamespace
            ? 'This learner assessment uses review and submit instead of check answers.'
            : 'Check answers is not available in this quiz mode.'
        });
      }
      if (!question || (question.type && question.type !== 'mcq') || !Array.isArray(question.options)) {
        return Object.assign({}, status, {
          ok: false,
          state: 'unsupported-item',
          message: 'Voice checking is currently available for multiple-choice items only.'
        });
      }
      if (_quizIsAnswerKeyDisputed(question)) return Object.assign({}, status, { ok: false, state: 'key-under-review', checked: false, correct: null, message: quizT('quiz.attempt.key_under_review', 'Your teacher is reviewing this answer.') });
      if (typeof selectedOptionIdx !== 'number') {
        return Object.assign({}, status, {
          ok: false,
          state: 'inapplicable',
          message: 'Choose an option before checking the answer.'
        });
      }
      if (typeof handleToggleShowQuizAnswers !== 'function') {
        return Object.assign({}, status, {
          ok: false,
          state: 'unsupported',
          message: 'Check answers is unavailable because this quiz has no check-answer handler.'
        });
      }
      if (!showQuizAnswers) handleToggleShowQuizAnswers();
      var isCorrect = _quizAnswerMatches(question.options[selectedOptionIdx], question.correctAnswer);
      var checkMessage = isCorrect
        ? 'Option ' + String.fromCharCode(65 + selectedOptionIdx) + ' is correct for question ' + status.questionNumber + '.'
        : 'Option ' + String.fromCharCode(65 + selectedOptionIdx) + ' is not correct for question ' + status.questionNumber + '. Try another option.';
      quizVoiceLastFeedbackRef.current = checkMessage;
      return Object.assign({}, status, {
        ok: true,
        state: 'checked',
        checked: true,
        correct: isCorrect,
        message: checkMessage
      });
    }
    function handleQuizVoiceReflectionNavigation(action, request, status) {
      var reflections = getQuizReflections();
      var canExit = typeof props.onClose === 'function' || typeof props.onExit === 'function';
      if (action === 'list-reflections') {
        if (reflections.length === 0) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'This quiz has no reflection prompts.' });
        var listed = reflections.slice(0, 20).map(function (reflection, idx) {
          return 'Reflection ' + (idx + 1) + ': ' + _quizVoiceReflectionPrompt(reflection);
        }).join(' ');
        if (reflections.length > 20) listed += ' Voice number selection is limited to the first 20 reflections.';
        return Object.assign({}, status, { ok: true, state: 'reflection-list', reflectionTotal: reflections.length, message: listed });
      }
      if (action === 'open-reflections' || action === 'select-reflection') {
        if (reflections.length === 0) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'This quiz has no reflection prompts.' });
        var requested = action === 'open-reflections' ? 0 : (
          typeof request.reflectionIndex === 'number'
            ? Math.floor(request.reflectionIndex)
            : _quizVoiceReflectionIndex(request.reflection != null ? request.reflection : (request.choice != null ? request.choice : request.value), reflections.length)
        );
        if (requested < 0 || requested >= reflections.length) {
          return Object.assign({}, status, { ok: false, state: 'invalid-reflection', message: 'Choose a reflection by its exact number, from 1 through ' + Math.min(20, reflections.length) + '.' });
        }
        setQuizVoiceReflectionIdx(requested);
        return Object.assign({}, getQuizVoiceReflectionStatus(reflections, canExit, requested), { state: 'reflection-selected' });
      }
      if (action === 'next-reflection' || action === 'previous-reflection') {
        if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Open reflections before moving between reflection prompts.' });
        var nextIdx = status.reflectionIndex + (action === 'next-reflection' ? 1 : -1);
        if (nextIdx < 0 || nextIdx >= reflections.length) {
          return Object.assign({}, status, { ok: false, state: 'inapplicable', message: action === 'next-reflection' ? 'This is the last reflection.' : 'This is the first reflection.' });
        }
        setQuizVoiceReflectionIdx(nextIdx);
        return Object.assign({}, getQuizVoiceReflectionStatus(reflections, canExit, nextIdx), { state: 'reflection-selected' });
      }
      if (action === 'return-to-question') {
        if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Quiz voice focus is already on a question.' });
        setQuizVoiceReflectionIdx(null);
        var questions = Array.isArray(assessmentData.questions) ? assessmentData.questions : [];
        if (questions.length === 0) return { ok: true, ready: false, mounted: true, state: 'reflection-overview', surface: 'quiz', reflectionTotal: reflections.length, message: 'Returned to the Quiz overview. This quiz has no questions.' };
        var qIdx = Math.max(0, Math.min(questions.length - 1, currentQuestionIdx));
        return Object.assign({ ok: true, ready: true, mounted: true, state: 'returned-to-question', surface: 'quiz' }, _quizVoiceQuestionPayload(questions[qIdx], qIdx, questions.length, studentMcqAnswers[qIdx]), { message: 'Returned to question ' + (qIdx + 1) + ' of ' + questions.length + '.' });
      }
      if (action === 'read-reflection' || action === 'read-reflection-response') {
        if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Open or select a reflection first.' });
        if (action === 'read-reflection') return Object.assign({}, status, { ok: true, state: 'reading-reflection', message: 'Reflection ' + status.reflectionNumber + ' of ' + status.reflectionTotal + '. ' + status.reflectionPrompt });
        return Object.assign({}, status, {
          ok: !!String(status.reflectionResponse || '').trim(),
          state: String(status.reflectionResponse || '').trim() ? 'reading-reflection-response' : 'inapplicable',
          message: String(status.reflectionResponse || '').trim() ? 'Your reflection response is: ' + status.reflectionResponse : 'No reflection response has been entered.'
        });
      }
      return null;
    }
    function handleQuizVoiceReflectionEdit(action, request, status) {
      if (['set-reflection', 'append-reflection', 'clear-reflection', 'submit-reflection', 'edit-reflection'].indexOf(action) < 0) return null;
      if (status.surfaceMode !== 'reflection') return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Open or select a reflection before changing its response.' });
      var rIdx = status.reflectionIndex;
      var entry = reflectionAnswers[rIdx] || {};
      var current = String(entry.draft || '');
      if (action === 'edit-reflection') {
        if (!entry.submitted) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'This reflection is already open for editing.' });
        reopenReflection(rIdx);
        var editMessage = 'Reflection ' + (rIdx + 1) + ' reopened for editing. Your submitted text remains in the draft.';
        quizVoiceLastFeedbackRef.current = editMessage;
        return Object.assign({}, status, { ok: true, state: 'reflection-editing', reflectionSubmitted: false, message: editMessage });
      }
      if (entry.submitted) return Object.assign({}, status, { ok: false, state: 'locked', message: 'This reflection is submitted. Say edit reflection before changing it.' });
      if (action === 'set-reflection' || action === 'append-reflection') {
        var text = _quizVoiceRequestText(request);
        if (!text) return Object.assign({}, status, { ok: false, state: 'invalid-response', message: action === 'set-reflection' ? 'Say set reflection to, followed by your response.' : 'Say append to reflection, followed by the text to add.' });
        if (action === 'set-reflection' && current.trim() && current.trim() !== text && request.confirmed !== true) {
          return Object.assign({}, status, {
            ok: false, state: 'confirmation-required', confirmationRequired: true, confirmationToken: 'replace-reflection',
            message: 'Setting this reflection will replace the current draft. Confirm set reflection to replace it, or say append to reflection.'
          });
        }
        var nextText = action === 'append-reflection' && current.trim() ? current.replace(/\s+$/g, '') + ' ' + text : text;
        setReflectionDraft(rIdx, nextText);
        var wordCount = nextText.trim() ? nextText.trim().split(/\s+/).length : 0;
        var changedMessage = 'Reflection ' + (rIdx + 1) + (action === 'append-reflection' ? ' updated. ' : ' response set. ') + wordCount + ' word' + (wordCount === 1 ? '' : 's') + ' in the draft.';
        quizVoiceLastFeedbackRef.current = changedMessage;
        return Object.assign({}, status, { ok: true, state: action === 'append-reflection' ? 'reflection-appended' : 'reflection-set', reflectionResponse: nextText, message: changedMessage });
      }
      if (action === 'clear-reflection') {
        if (!current.trim()) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'The current reflection response is already empty.' });
        if (request.confirmed !== true) return Object.assign({}, status, {
          ok: false, state: 'confirmation-required', confirmationRequired: true, confirmationToken: 'clear-reflection',
          message: 'Clear reflection will permanently erase the current response. Confirm clear reflection to continue.'
        });
        clearReflection(rIdx);
        var clearMessage = 'Reflection ' + (rIdx + 1) + ' response cleared.';
        quizVoiceLastFeedbackRef.current = clearMessage;
        return Object.assign({}, status, { ok: true, state: 'reflection-cleared', reflectionResponse: '', reflectionSubmitted: false, message: clearMessage });
      }
      if (!current.trim()) return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Enter a reflection response before submitting it.' });
      if (request.confirmed !== true) return Object.assign({}, status, {
        ok: false, state: 'confirmation-required', confirmationRequired: true, confirmationToken: 'submit-reflection',
        message: 'Submit reflection ' + (rIdx + 1) + ' now? You can reopen it later by saying edit reflection. Confirm submit reflection to continue.'
      });
      if (!submitReflection(rIdx)) return Object.assign({}, status, { ok: false, state: 'error', message: 'The reflection could not be submitted. Its draft remains saved.' });
      var submitMessage = 'Reflection ' + (rIdx + 1) + ' submitted.';
      quizVoiceLastFeedbackRef.current = submitMessage;
      return Object.assign({}, status, { ok: true, state: 'reflection-submitted', reflectionSubmitted: true, message: submitMessage });
    }
    async function handleQuizVoiceSubmit(request, status) {
      if (props._assessmentPreview) return Object.assign({}, status, { ok:false, state:'preview', message:'Submission is disabled in student preview.' });
      if (status.surfaceMode === 'review') {
        if (!draftNamespace) {
          return Object.assign({}, status, {
            ok: false,
            state: 'inapplicable',
            message: 'This quiz mode does not have a submit-assessment action.'
          });
        }
        if (request.confirmed !== true) {
          return Object.assign({}, status, {
            ok: false,
            state: 'confirmation-required',
            confirmationRequired: true,
            confirmationToken: 'submit-assessment',
            message: 'Submit this assessment now? Say yes or no.'
          });
        }
        var reviewReceipt = await submitAssessmentAttempt();
        if (!reviewReceipt) {
          return Object.assign({}, status, {
            ok: false,
            state: 'error',
            message: 'The assessment could not be submitted. The draft remains saved.'
          });
        }
        var reviewSubmitMessage = 'Completed attempt saved on this device with ' + reviewReceipt.summary.answered + ' of ' + reviewReceipt.summary.total + ' questions answered.';
        quizVoiceLastFeedbackRef.current = reviewSubmitMessage;
        return {
          ok: true,
          ready: false,
          mounted: true,
          state: 'submitted',
          surface: 'quiz',
          receipt: {
            submittedAt: reviewReceipt.submittedAt,
            total: reviewReceipt.summary.total,
            answered: reviewReceipt.summary.answered,
            unanswered: reviewReceipt.summary.unanswered
          },
          message: reviewSubmitMessage
        };
      }
      if (!status.ready) return status;
      if (!draftNamespace) {
        return Object.assign({}, status, {
          ok: false,
          state: 'inapplicable',
          message: 'This quiz mode does not have a submit-assessment action. Use check instead when it is available.'
        });
      }
      if (request.confirmed !== true) {
        setReviewOpen(true);
        var submitProgress = reviewProgress || _quizBuildAttemptProgress(assessmentData, _quizReadWorkingDraft(draftNamespace));
        return Object.assign({}, status, {
          ok: false,
          state: 'confirmation-required',
          reviewOpen: true,
          confirmationRequired: true,
          confirmationToken: 'submit-assessment',
          message: 'Review opened. ' + submitProgress.answered + ' of ' + submitProgress.total + ' questions are answered. Confirm submit assessment to finish.'
        });
      }
      var receipt = await submitAssessmentAttempt();
      if (!receipt) {
        return Object.assign({}, status, {
          ok: false,
          state: 'error',
          message: 'The assessment could not be submitted. The draft remains saved.'
        });
      }
      var submitMessage = 'Completed attempt saved on this device with ' + receipt.summary.answered + ' of ' + receipt.summary.total + ' questions answered.';
      quizVoiceLastFeedbackRef.current = submitMessage;
      return {
        ok: true,
        ready: false,
        mounted: true,
        state: 'submitted',
        surface: 'quiz',
        receipt: {
          submittedAt: receipt.submittedAt,
          total: receipt.summary.total,
          answered: receipt.summary.answered,
          unanswered: receipt.summary.unanswered
        },
        message: submitMessage
      };
    }
    function handleQuizVoiceOtherAction(action, status) {
      if (action === 'cancel-review') {
        if (!status.reviewOpen) {
          return Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'Quiz review is not open.' });
        }
        setReviewOpen(false);
        return Object.assign({}, status, {
          ok: true,
          ready: true,
          state: 'review-closed',
          surfaceMode: 'question',
          reviewOpen: false,
          message: 'Quiz review closed. Your assessment draft remains saved.'
        });
      }
      if (action === 'next' || action === 'previous') {
        if (!status.ready) return status;
        var nextQuestionIdx = status.questionIndex + (action === 'next' ? 1 : -1);
        if (nextQuestionIdx < 0 || nextQuestionIdx >= status.totalQuestions) {
          return Object.assign({}, status, {
            ok: false,
            state: 'inapplicable',
            message: action === 'next' ? 'This is the last question.' : 'This is the first question.'
          });
        }
        goToAssessmentQuestion(nextQuestionIdx);
        return Object.assign({}, _quizVoiceQuestionPayload(
          assessmentData.questions[nextQuestionIdx] || {},
          nextQuestionIdx,
          status.totalQuestions,
          studentMcqAnswers[nextQuestionIdx]
        ), {
          ok: true,
          ready: true,
          mounted: true,
          state: 'navigated',
          surface: 'quiz',
          message: 'Moved to question ' + (nextQuestionIdx + 1) + ' of ' + status.totalQuestions + '.'
        });
      }
      if (action === 'repeat-feedback' || action === 'repeat-response') {
        return quizVoiceLastFeedbackRef.current
          ? Object.assign({}, status, { ok: true, state: 'feedback', message: quizVoiceLastFeedbackRef.current })
          : Object.assign({}, status, { ok: false, state: 'inapplicable', message: 'There is no Quiz feedback to repeat yet.' });
      }
      if (action === 'close' || action === 'exit') {
        var exitHandler = typeof props.onClose === 'function' ? props.onClose : (typeof props.onExit === 'function' ? props.onExit : null);
        if (!exitHandler) {
          return Object.assign({}, status, {
            ok: false,
            state: 'unsupported',
            message: 'This Quiz host did not provide a close action.'
          });
        }
        try {
          exitHandler();
          return Object.assign({}, status, { ok: true, state: 'closed', message: 'Quiz closed.' });
        } catch (error) {
          return Object.assign({}, status, { ok: false, state: 'error', message: 'Quiz could not close.' });
        }
      }
      return null;
    }
    function executeQuizVoiceAction(request, action, status) {
      var question = status.ready && Array.isArray(assessmentData.questions)
        ? assessmentData.questions[status.questionIndex]
        : null;
      var selectedOptionIdx = status.ready && typeof studentMcqAnswers[status.questionIndex] === 'number'
        ? studentMcqAnswers[status.questionIndex]
        : null;
      if (action === 'status') return status;
      var reflectionNavigation = handleQuizVoiceReflectionNavigation(action, request, status);
      if (reflectionNavigation) return reflectionNavigation;
      var reflectionEdit = handleQuizVoiceReflectionEdit(action, request, status);
      if (reflectionEdit) return reflectionEdit;
      if (action === 'describe') {
        if (status.surfaceMode === 'reflection') return Object.assign({}, status, { message: status.message + ' Say list actions for reflection commands, or return to question.' });
        if (!status.ready) return status;
        var description = 'Ordinary learner quiz. Question ' + status.questionNumber + ' of ' + status.totalQuestions + '.';
        var progress = reviewProgress;
        if (progress) {
          description += ' ' + progress.answered + ' answered and ' + progress.unanswered + ' unanswered.';
        } else {
          description += ' ' + Object.keys(studentMcqAnswers || {}).length + ' multiple-choice selection' +
            (Object.keys(studentMcqAnswers || {}).length === 1 ? '' : 's') + ' made.';
        }
        if (status.type === 'mcq') description += ' Say read question or choose an option.';
        else if (status.canEnterFreeformByVoice) description += ' Say response followed by your answer, then say check response.';
        else if (status.canChooseByVoice) description += ' Say read question, then choose an available item or option.';
        else description += ' This ' + status.type + ' item does not expose a safe voice answer action.';
        return Object.assign({}, status, {
          progress: progress ? {
            total: progress.total,
            answered: progress.answered,
            unanswered: progress.unanswered,
            flagged: progress.flagged
          } : null,
          timer: deliverySettings.timeLimitMinutes > 0 ? {
            remainingSeconds: assessmentTimer.remainingSeconds,
            running: assessmentTimer.running,
            expired: assessmentTimer.expired
          } : null,
          message: description
        });
      }
      if (action === 'list-actions' || action === 'actions') {
        return Object.assign({}, status, {
          message: status.ready ? 'Available Quiz voice actions: ' + status.actions.join(', ') + '.' : status.message
        });
      }
      if (action === 'read' || action === 'read-question' || action === 'repeat-question') {
        return status.ready ? Object.assign({}, status, { state: 'reading' }) : status;
      }
      if (action === 'choose-answer' || action === 'choose-evidence') {
        var partController = getQuizItemVoiceController(status.questionIndex);
        if (!partController || typeof partController.execute !== 'function') return Object.assign({}, status, { ok: false, state: 'unsupported-item', message: 'This item does not expose answer-and-evidence voice selection.' });
        var partResult = partController.execute(action, request);
        if (partResult && partResult.message) quizVoiceLastFeedbackRef.current = partResult.message;
        return Object.assign({}, status, partResult || {});
      }
      if (action === 'choose' || action === 'select' || action === 'answer') {
        return handleQuizVoiceChoice(request, status, question);
      }
      if (action === 'check' || (action === 'submit-or-check' && !draftNamespace)) {
        if (question && question.type && question.type !== 'mcq') {
          var checkController = getQuizItemVoiceController(status.questionIndex);
          if (!checkController || typeof checkController.execute !== 'function') return Object.assign({}, status, { ok: false, state: 'unsupported-item', message: 'This item does not expose a safe voice check action.' });
          var checkResult = checkController.execute('check', request);
          if (checkResult && checkResult.message) quizVoiceLastFeedbackRef.current = checkResult.message;
          return Object.assign({}, status, checkResult || {});
        }
        return handleQuizVoiceCheck(status, question, selectedOptionIdx);
      }
      if (action === 'enter-response' || action === 'revise' || action === 'try-again' || action === 'reset') {
        var itemController = getQuizItemVoiceController(status.questionIndex);
        if (!itemController || typeof itemController.execute !== 'function') return Object.assign({}, status, { ok: false, state: 'unsupported-item', message: 'This item does not expose that voice action.' });
        var itemResult = itemController.execute(action, request);
        if (itemResult && itemResult.message) quizVoiceLastFeedbackRef.current = itemResult.message;
        return Object.assign({}, status, itemResult || {});
      }
      if (action === 'submit' || (action === 'submit-or-check' && Boolean(draftNamespace))) {
        return handleQuizVoiceSubmit(request, status);
      }
      var otherResult = handleQuizVoiceOtherAction(action, status);
      return otherResult || Object.assign({}, status, {
        ok: false,
        state: 'invalid-action',
        message: 'Unsupported Quiz voice action. Ask to list actions.'
      });
    }
    function getQuizVoiceScopedCommands() {
      var status = getQuizVoiceBoundaryStatus();
      var command = function (id, label, aliases, extra) {
        return Object.assign({ id: id, label: label, aliases: aliases || [] }, extra || {});
      };
      var commands = [
        command('quiz_describe', 'Describe this Quiz', ['describe quiz', 'quiz status']),
        command('quiz_list_actions', 'List Quiz actions', ['list actions', 'what can I do'])
      ];
      if (status.ready && status.surfaceMode !== 'reflection' && status.canEnterFreeformByVoice) {
        commands.push(command('quiz_enter_response', 'Enter a Quiz response', ['response followed by your answer', 'my answer is'], {
          params: ['response'],
          risk: 'state-change',
          confirmation: 'low-confidence',
          confirmMessage: 'Update this Quiz response? The dictated text will not be repeated. Say yes or no.'
        }));
      }
      if (status.actions && status.actions.indexOf('read-question') >= 0) commands.push(command('quiz_read_question', 'Read the current question', ['read question', 'repeat question']));
      if (status.ready && status.canReviseByVoice) commands.push(command('quiz_revise_choices', 'Revise these choices without clearing them', ['revise these choices', 'revise choices'], { risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Keep these choices and reopen them for revision? Say yes or no.' }));
      if (status.ready && status.canResetByVoice) commands.push(command('quiz_try_again', 'Reset this Quiz response', ['try again', 'reset answer', 'clear answer'], status.itemState && status.itemState.resetRequiresConfirmation ? { risk: 'destructive', confirmation: 'always', confirmMessage: 'Clear this Quiz response and try again? Say yes or no.' } : { risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Reset this Quiz response and try again? Say yes or no.' }));
      if (status.ready && status.type !== 'answer-evidence' && status.canChooseByVoice) {
        commands.push(command('quiz_choose', 'Choose a Quiz answer', ['choose A', 'answer one', 'select first'], { params: ['choice'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Change the selected Quiz answer? Say yes or no.' }));
      }
      if (status.ready && status.canChooseAnswerPartByVoice) commands.push(command('quiz_choose_answer', 'Choose the answer part', ['choose answer A', 'select answer option one'], { params: ['choice'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Change the selected answer part? Say yes or no.' }));
      if (status.ready && status.canChooseEvidencePartByVoice) commands.push(command('quiz_choose_evidence', 'Choose the evidence part', ['choose evidence A', 'select evidence option one'], { params: ['choice'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Change the selected evidence part? Say yes or no.' }));
      if (status.ready && status.actions.indexOf('check') >= 0) {
        commands.push(command('quiz_check', status.type === 'answer-evidence' ? 'Check both answer and evidence parts' : 'Check my Quiz answer', status.type === 'answer-evidence' ? ['check both parts', 'check answer and evidence'] : ['check answer', 'check my answer'], { risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Check this Quiz response now? Say yes or no.' }));
      }
      if (status.actions && status.actions.indexOf('list-reflections') >= 0) commands.push(command('quiz_list_reflections', 'List Quiz reflections', ['list reflections', 'read reflections']));
      if (status.actions && status.actions.indexOf('open-reflections') >= 0) commands.push(command('quiz_open_reflections', 'Open Quiz reflections', ['open reflections', 'go to reflections'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('select-reflection') >= 0) commands.push(command('quiz_select_reflection', 'Select a Quiz reflection', ['select reflection one', 'open reflection two'], { params: ['reflection'], risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('read-reflection') >= 0) commands.push(command('quiz_read_reflection', 'Read the reflection prompt', ['read reflection', 'read the reflection']));
      if (status.actions && status.actions.indexOf('read-reflection-response') >= 0) commands.push(command('quiz_read_reflection_response', 'Read my reflection response', ['read my reflection', 'read reflection response']));
      if (status.actions && status.actions.indexOf('set-reflection') >= 0) commands.push(command('quiz_set_reflection', 'Set the reflection response', ['set reflection to'], Object.assign({ params: ['response'] }, String(status.reflectionResponse || '').trim() ? { risk: 'destructive', confirmation: 'always', confirmMessage: 'Replace the current reflection draft? Say yes or no.' } : { risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Set this reflection response? The dictated text will not be repeated. Say yes or no.' })));
      if (status.actions && status.actions.indexOf('append-reflection') >= 0) commands.push(command('quiz_append_reflection', 'Append to the reflection response', ['append to reflection', 'add to my reflection'], { params: ['response'], risk: 'state-change', confirmation: 'low-confidence', confirmMessage: 'Append to this reflection? The dictated text will not be repeated. Say yes or no.' }));
      if (status.actions && status.actions.indexOf('clear-reflection') >= 0) commands.push(command('quiz_clear_reflection', 'Clear the reflection response', ['clear reflection', 'clear my reflection'], { risk: 'destructive', confirmation: 'always', confirmMessage: 'Permanently clear this reflection response? Say yes or no.' }));
      if (status.actions && status.actions.indexOf('submit-reflection') >= 0) commands.push(command('quiz_submit_reflection', 'Submit this reflection', ['submit reflection', 'submit my reflection'], { risk: 'destructive', confirmation: 'always', confirmMessage: 'Submit this reflection now? Say yes or no.' }));
      if (status.actions && status.actions.indexOf('edit-reflection') >= 0) commands.push(command('quiz_edit_reflection', 'Edit the submitted reflection', ['edit reflection', 'edit my reflection'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('next-reflection') >= 0) commands.push(command('quiz_next_reflection', 'Next Quiz reflection', ['next reflection'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('previous-reflection') >= 0) commands.push(command('quiz_previous_reflection', 'Previous Quiz reflection', ['previous reflection'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('return-to-question') >= 0) commands.push(command('quiz_return_to_question', 'Return to the Quiz question', ['return to question', 'back to question'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.ready && status.actions.indexOf('next') >= 0) commands.push(command('quiz_next', 'Next Quiz question', ['next', 'next question'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.ready && status.actions.indexOf('previous') >= 0) commands.push(command('quiz_previous', 'Previous Quiz question', ['previous', 'previous question'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('repeat-feedback') >= 0) commands.push(command('quiz_repeat_feedback', 'Repeat Quiz feedback', ['repeat feedback', 'repeat response']));
      if (status.actions && status.actions.indexOf('submit') >= 0) {
        commands.push(command('quiz_submit', 'Submit this assessment', ['submit assessment', 'submit quiz', 'finish assessment'], {
          risk: 'destructive',
          confirmation: 'always',
          confirmMessage: 'Submit this assessment now? Say yes or no.'
        }));
      }
      if (status.actions && status.actions.indexOf('cancel-review') >= 0) commands.push(command('quiz_review_cancel', 'Cancel assessment review', ['cancel review', 'close review', 'return to assessment'], { risk: 'state-change', confirmation: 'low-confidence' }));
      if (status.actions && status.actions.indexOf('close') >= 0) commands.push(command('quiz_close', 'Close Quiz', ['close quiz', 'exit quiz'], {
        risk: 'destructive',
        confirmation: 'always',
        confirmMessage: 'Close Quiz? Your saved assessment draft will remain available. Say yes or no.'
      }));
      return commands;
    }

    function dispatchQuizVoiceScopeAction(action, params, meta) {
      var response = null;
      var detail = {
        action: action,
        requestId: 'quiz-scope-' + Date.now().toString(36),
        respond: function (payload) { response = payload; }
      };
      if (params && Object.prototype.hasOwnProperty.call(params, 'response')) detail.response = params.response;
      if (params && Object.prototype.hasOwnProperty.call(params, 'mode')) detail.mode = params.mode;
      if (params && Object.prototype.hasOwnProperty.call(params, 'value')) detail.value = params.value;
      if (params && Object.prototype.hasOwnProperty.call(params, 'choice')) detail.choice = params.choice;
      if (params && Object.prototype.hasOwnProperty.call(params, 'reflection')) detail.reflection = params.reflection;
      if (params && Object.prototype.hasOwnProperty.call(params, 'reflectionIndex')) detail.reflectionIndex = params.reflectionIndex;
      if (meta && meta.confirmed === true) detail.confirmed = true;
      var event = typeof window.CustomEvent === 'function'
        ? new window.CustomEvent(QUIZ_VOICE_CONTROL_EVENT, { detail: detail })
        : { type: QUIZ_VOICE_CONTROL_EVENT, detail: detail };
      window.dispatchEvent(event);
      return response || detail._quizResponsePromise || {
        ok: false,
        handled: true,
        state: 'unavailable',
        narration: 'Quiz did not respond to that command.'
      };
    }
    // Keep one stable scope registration while exposing the latest React state.
    // This preserves an in-flight destructive confirmation across timer rerenders.
    quizVoiceScopeRef.current.getStatus = getQuizVoiceBoundaryStatus;
    quizVoiceScopeRef.current.getCommands = getQuizVoiceScopedCommands;

    function registerQuizVoiceCommandScope() {
      var module = window.AlloModules && window.AlloModules.AlloCommands;
      if (!module || typeof module.registerCommandScope !== 'function') return null;
      return module.registerCommandScope({
        id: 'quiz',
        priority: 80,
        isActive: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          // Includes the legacy status.state !== 'unsupported-mode' guard plus
          // the production host's semantic frontmost ownership contract.
          return _quizVoiceIsSemanticFrontmost(ctx, status);
        },
        getCommands: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          if (!_quizVoiceIsSemanticFrontmost(ctx, status)) return [];
          return current && current.getCommands ? current.getCommands() : [];
        },
        getCapabilities: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : { actions: [] };
          if (!_quizVoiceIsSemanticFrontmost(ctx, status)) {
            return {
              describe: false, listActions: false, readQuestion: false, chooseAnswer: false,
              chooseAnswerPart: false, chooseEvidencePart: false, reflections: false,
              editReflection: false, checkAnswer: false, submit: false, next: false,
              previous: false, repeatFeedback: false, close: false
            };
          }
          return {
            describe: true,
            listActions: true,
            readQuestion: status.ready,
            chooseAnswer: status.canChooseByVoice,
            chooseAnswerPart: status.canChooseAnswerPartByVoice,
            chooseEvidencePart: status.canChooseEvidencePartByVoice,
            reflections: status.reflectionTotal > 0,
            editReflection: status.actions && (status.actions.indexOf('set-reflection') >= 0 || status.actions.indexOf('edit-reflection') >= 0),
            checkAnswer: status.actions && status.actions.indexOf('check') >= 0,
            submit: status.actions && status.actions.indexOf('submit') >= 0,
            next: status.actions && status.actions.indexOf('next') >= 0,
            previous: status.actions && status.actions.indexOf('previous') >= 0,
            repeatFeedback: status.actions && status.actions.indexOf('repeat-feedback') >= 0,
            close: status.actions && status.actions.indexOf('close') >= 0
          };
        },
        getState: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : { ready: false, state: 'unavailable' };
          var frontmost = _quizVoiceIsSemanticFrontmost(ctx, status);
          return _quizVoicePublicState(status, frontmost);
        },
        help: function (ctx) {
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          if (!_quizVoiceIsSemanticFrontmost(ctx, status)) return [];
          var commands = current && current.getCommands ? current.getCommands() : [];
          return commands.map(function (item) { return item.label; });
        },
        parse: function (text) {
          var parsed = _quizVoiceParseScopedUtterance(text);
          var current = quizVoiceScopeRef.current;
          var status = current && current.getStatus ? current.getStatus() : null;
          if (!parsed || !status || status.surfaceMode !== 'review') return parsed;
          // The modal owns the semantic surface. Recognized question actions
          // are consumed as orientation instead of falling through to mutate
          // the obscured question beneath the focus trap.
          if (parsed.commandId !== 'quiz_submit' &&
              parsed.commandId !== 'quiz_review_cancel' &&
              parsed.commandId !== 'quiz_describe' &&
              parsed.commandId !== 'quiz_list_actions') {
            return { commandId: 'quiz_describe' };
          }
          return parsed;
        },
        execute: function (commandId, params, ctx, meta) {
          var current = quizVoiceScopeRef.current;
          var currentStatus = current && current.getStatus ? current.getStatus() : null;
          if (!_quizVoiceIsSemanticFrontmost(ctx, currentStatus)) {
            return { ok: false, narration: 'Quiz is not the frontmost learner surface, so nothing was changed.' };
          }
          var actionMap = {
            quiz_enter_response: 'enter-response',
            quiz_try_again: 'try-again',
            quiz_revise_choices: 'revise',
            quiz_describe: 'describe',
            quiz_list_actions: 'list-actions',
            quiz_read_question: 'read-question',
            quiz_choose: 'choose',
            quiz_choose_answer: 'choose-answer',
            quiz_choose_evidence: 'choose-evidence',
            quiz_check: 'check',
            quiz_list_reflections: 'list-reflections',
            quiz_open_reflections: 'open-reflections',
            quiz_select_reflection: 'select-reflection',
            quiz_read_reflection: 'read-reflection',
            quiz_read_reflection_response: 'read-reflection-response',
            quiz_set_reflection: 'set-reflection',
            quiz_append_reflection: 'append-reflection',
            quiz_clear_reflection: 'clear-reflection',
            quiz_submit_reflection: 'submit-reflection',
            quiz_edit_reflection: 'edit-reflection',
            quiz_next_reflection: 'next-reflection',
            quiz_previous_reflection: 'previous-reflection',
            quiz_return_to_question: 'return-to-question',
            quiz_review_cancel: 'cancel-review',
            quiz_submit: 'submit',
            quiz_next: 'next',
            quiz_previous: 'previous',
            quiz_repeat_feedback: 'repeat-feedback',
            quiz_close: 'close'
          };
          var action = actionMap[commandId];
          if (!action) return { ok: false, narration: 'That Quiz command is not available.' };
          var result = dispatchQuizVoiceScopeAction(action, params, meta);
          var narrate = function (value) { return Object.assign({}, value, { narration: value && value.message ? value.message : 'Done.' }); };
          return result && typeof result.then === 'function' ? result.then(narrate) : narrate(result);
        }
      });
    }
    React.useEffect(function () {
      if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
      var handleQuizVoiceControl = function (event) {
        var request = event && event.detail && typeof event.detail === 'object' ? event.detail : {};
        var action = _quizVoiceNormalizeAction(request.action);
        var status = getQuizVoiceBoundaryStatus();
        var result = executeQuizVoiceAction(request, action, status);
        if (result && typeof result.then === 'function') {
          request._quizResponsePromise = Promise.resolve(result).then(function (value) {
            return publishQuizVoiceBoundaryResult(value, request, action);
          }, function () {
            return publishQuizVoiceBoundaryResult({ ok: false, state: 'error', message: 'The voice action could not finish. Check the assessment status before trying again.' }, request, action);
          });
        } else publishQuizVoiceBoundaryResult(result, request, action);
      };
      window.addEventListener(QUIZ_VOICE_CONTROL_EVENT, handleQuizVoiceControl);
      return function () {
        window.removeEventListener(QUIZ_VOICE_CONTROL_EVENT, handleQuizVoiceControl);
      };
    });
    React.useEffect(function () {
      if (typeof window === 'undefined') return undefined;
      var unregister = registerQuizVoiceCommandScope();
      if (typeof unregister === 'function') return unregister;
      // Quiz can mount before the deferred AlloCommands script finishes.
      // Retry briefly without introducing a second command engine.
      var attempts = 0;
      var timer = window.setInterval(function () {
        attempts += 1;
        unregister = registerQuizVoiceCommandScope();
        if (typeof unregister === 'function' || attempts >= 40) window.clearInterval(timer);
      }, 250);
      return function () {
        window.clearInterval(timer);
        if (typeof unregister === 'function') unregister();
      };
    }, []);
    if (externalWork && !isTeacherMode && !isParentMode && !props._assessmentPreview) {
      return <section data-assessment-external-change role="alert" className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950"><h2 className="text-lg font-bold">{quizT('quiz.draft.external_title', 'This assessment changed in another tab.')}</h2><p>{quizT('quiz.draft.external_help', 'You can download the answers from this tab before opening the latest attempt.')}</p><div className="flex flex-wrap gap-3"><button type="button" onClick={downloadAssessmentDraft} className="min-h-11 rounded-lg border border-amber-400 bg-white px-4 py-2 font-bold">{quizT('quiz.review.download_draft', 'Download draft')}</button><button type="button" onClick={function () { _quizResetWorkingDraft(learnerBaseDraftNamespace); props._onAssessmentStorageRefresh?.(); }} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white">{quizT('quiz.draft.open_latest', 'Open latest attempt')}</button></div></section>;
    }
    if (attemptReceipt && !isTeacherMode && !isParentMode && !isEditingQuiz && !isPresentationMode && !isReviewGame) {
      return <div className="space-y-6">{modeBanner}<AssessmentSubmittedPanel receipt={attemptReceipt} sending={deliveryBusy} canRetry={!!activeSessionCode && attemptReceipt.sessionCode === activeSessionCode && attemptReceipt.activityId === String(sessionData?.quizState?.activityId || '')} onRetry={() => deliverAssessmentReceipt(attemptReceipt)} onDownload={downloadAssessmentAttempt} onStartAnother={startAnotherAssessmentAttempt} restartError={restartError} copy={quizT} includedInSubmitWork={!!recordResponsesRef.current} />{gradedMode ? <p data-assessment-graded-waiting role="status" className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">{quizT('quiz.graded.submitted', 'Your responses are saved. Your teacher will check your answers.')}</p> : ((attemptReceipt.feedbackTiming || deliverySettings.feedbackTiming) !== 'teacher-release' && deliverySettings.feedbackTiming !== 'teacher-release') || feedbackReleased ? <AssessmentAttemptFeedback data={releasedData || assessmentData} receipt={attemptReceipt} formatInlineText={formatInlineText} copy={quizT} /> : <p data-assessment-feedback-waiting role="status" className="rounded-xl border border-slate-300 bg-white p-4 text-slate-800">{quizT('quiz.attempt.feedback_waiting', 'Your responses are saved. Feedback will appear here when your teacher releases it.')}</p>}</div>;
    }
    if (soloQuestOpen && canPlayAssessmentGames && (isTeacherMode || !activeSessionCode)) {
      return soloQuestSetup.ready && window.AlloModules?.ConceptQuestSolo ? <window.AlloModules.ConceptQuestSolo generatedContent={generatedContent} inputText={inputText} callGemini={props.callGemini} user={props.user} appId={appId} t={t} onClose={closeSoloQuest}/> : <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5"><p role={soloQuestSetup.failed ? 'alert' : 'status'}>{soloQuestSetup.failed ? quizCopy('concept_quest.solo_load_failed', 'Concept Quest could not load. Check your connection and try again.') : quizCopy('concept_quest.solo_loading', 'Loading Concept Quest...')}</p><div className="mt-3 flex gap-2">{soloQuestSetup.failed && <button type="button" onClick={soloQuestSetup.retry} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white">{quizCopy('common.retry', 'Retry')}</button>}<button type="button" onClick={closeSoloQuest} className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 font-bold">{quizCopy('common.close', 'Close')}</button></div></section>;
    }
    return <div className="space-y-6">{!isEditingQuiz && Array.isArray(assessmentData.questions) && assessmentData.questions.length > 0 && <button type="button" data-assessment-skip onClick={function () { var target = document.querySelector('[id^="assessment-question-"]'); if (!target) return; if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus(); }} className="sr-only focus:not-sr-only focus:inline-block focus:rounded focus:bg-indigo-700 focus:px-3 focus:py-2 focus:font-bold focus:text-white">{quizCopy('quiz.skip_to_questions', 'Skip to the questions')}</button>}{boardSetupOpen && canPlayAssessmentGames && (isTeacherMode || !activeSessionCode) && (boardSetup.ready && window.AlloModules?.LessonBoardSetup ? <window.AlloModules.LessonBoardSetup history={props.history} callImagen={props.callImagen} callGemini={props.callGemini} inputText={props.inputText} generatedContent={generatedContent} language={leveledTextLanguage === 'All selected languages' ? props.selectedLanguages?.[0] || 'English' : leveledTextLanguage || 'English'} activeSessionCode={activeSessionCode} appId={appId} sessionData={sessionData} user={props.user} allowLive={!!(isTeacherMode && activeSessionCode)} t={t} onClose={() => setBoardSetupOpen(false)} onLaunched={() => setEscapeRoomState(previous => ({ ...previous, isActive: false, isGenerating: false, isPreview: false }))}/> : <div className="rounded-xl border border-teal-200 bg-teal-50 p-4"><p role={boardSetup.failed ? 'alert' : 'status'}>{boardSetup.failed ? t('lesson_board.load_failed', { defaultValue: 'The lesson board could not load. Check your connection and try again.' }) : t('lesson_board.loading', { defaultValue: 'Loading the lesson board…' })}</p>{boardSetup.failed && <button type="button" data-retry-lesson-board onClick={boardSetup.retry} className="mr-3 font-bold">{t('common.retry', { defaultValue: 'Retry' })}</button>}<button type="button" onClick={() => setBoardSetupOpen(false)}>{t('common.close')}</button></div>)}{connectedSetupOpen && canPlayAssessmentGames && (isTeacherMode || !activeSessionCode) && (connectedSetup.ready && window.AlloModules?.ConnectedEscapeRoomSetup ? <window.AlloModules.ConnectedEscapeRoomSetup callGemini={props.callGemini} inputText={props.inputText} generatedContent={generatedContent} language={leveledTextLanguage === 'All selected languages' ? props.selectedLanguages?.[0] || 'English' : leveledTextLanguage || 'English'} activeSessionCode={activeSessionCode} appId={appId} sessionData={sessionData} user={props.user} allowLive={!!(isTeacherMode && activeSessionCode)} learnerMode={!!isIndependentMode} t={t} onClose={() => setConnectedSetupOpen(false)} onLaunched={() => setEscapeRoomState(previous => ({ ...previous, isActive: false, isGenerating: false, isPreview: false }))} /> : <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p role={connectedSetup.failed ? 'alert' : 'status'}>{connectedSetup.failed ? t('connected_escape.load_failed', { defaultValue: 'The escape room could not load. Check your connection and try again.' }) : t('connected_escape.loading', { defaultValue: 'Loading the escape room…' })}</p>{connectedSetup.failed && <button type="button" data-retry-connected-room onClick={connectedSetup.retry} className="mr-3 font-bold">{t('common.retry', { defaultValue: 'Retry' })}</button>}<button type="button" onClick={() => setConnectedSetupOpen(false)}>{t('common.close')}</button></div>)}{!canFacilitateAssessment && !isReviewGame && !escapeRoomState.isActive && <section data-assessment-student-view className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950"><h2 className="text-base font-bold">{quizCopy('quiz.student_view_title','Your assessment')}</h2><p className="mt-1 text-sm">{quizCopy('quiz.student_view_help','Answer the questions below. You can review your responses before submitting.')}</p></section>}{classExplainerBanner}{isTeacherMode && activeSessionCode && sessionData?.quizState?.isActive && deliverySettings.feedbackTiming === 'teacher-release' && <section data-assessment-live-feedback-release className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-950"><h2 className="text-base font-bold">Student feedback</h2><p className="mt-1 text-sm">Students can view answer guides after submitting and receiving your release.</p><button type="button" data-assessment-release-feedback onClick={releaseAssessmentFeedback} disabled={feedbackReleased || feedbackReleaseBusy} className="mt-3 min-h-11 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{feedbackReleased ? 'Feedback released' : feedbackReleaseBusy ? 'Releasing feedback...' : 'Release feedback to students'}</button>{feedbackReleaseError && <p role="alert" className="mt-2 text-sm text-red-800">{feedbackReleaseError}</p>}</section>}{!isPresentationMode && !isReviewGame && <>{modeBanner}{explainerPanel}{assessmentAudit.ready ? null : qualityReviewPanel}{settingsDrawer}</>}{!canFacilitateAssessment && !isPresentationMode && !isReviewGame && <p data-assessment-feedback-note className="rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800">{deliverySettings.feedbackTiming === 'immediate' ? 'Practice feedback is available as you check responses.' : deliverySettings.feedbackTiming === 'teacher-release' ? 'Answer feedback stays hidden until you submit and your teacher releases it.' : 'Answer feedback stays hidden until you submit the assessment.'}</p>}{!props._assessmentPreview && draftStatusPanel}{earlierWork && <section data-assessment-earlier-work className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950"><p>{earlierWork.assessmentIdentity ? quizT('quiz.earlier_version_note', 'Your saved work from an earlier version of this assignment is available to download. The questions have changed, so these answers have been kept separate.') : quizT('quiz.earlier_work_note', 'Earlier saved work is available for this question set. It may belong to another assignment or an earlier version, so it has not been added to this attempt.')}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={downloadEarlierAssessmentWork} className="min-h-11 rounded-lg border border-sky-400 bg-white px-3 py-2 font-bold">{quizT('quiz.download_earlier_work', 'Download earlier work')}</button><button type="button" onClick={function () { earlierWorkState[1](null); }} className="min-h-11 rounded-lg px-3 py-2 font-bold">{quizT('common.dismiss', 'Dismiss')}</button></div></section>}{learnerAttemptPanel}{reviewDialog}{canPlayAssessmentGames && <div data-assessment-facilitator-tools className="bg-teal-50 p-4 rounded-xl border border-teal-200 mb-6"><p className="mb-3 text-sm text-teal-900"><strong>UDL Goal:</strong> Providing options for action and expression. Frequent formative assessments help track progress and adjust instruction.</p><div className="flex items-center gap-2 flex-wrap">{isTeacherMode && activeSessionCode && !sessionData?.quizState?.isActive && <><button type="button" onClick={handleStartLiveSession} disabled={!!sessionData?.escapeRoomState?.isActive} className={'flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse ring-2 ring-indigo-200 ' + quizreducedMotionClass} title={t('quiz.launch_live_tooltip')}><Wifi size={14} /> {t('quiz.launch_live_btn')}</button><div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-full animate-in motion-reduce:animate-none fade-in duration-300"><Users size={12} className="text-orange-700" /><span className="text-xs font-black text-orange-700">{Object.keys(sessionData?.roster || {}).length} {t('quiz.lobby_waiting') || "Ready"}</span></div><button type="button" onClick={handleToggleInteractive} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm ${sessionData?.forceStatic ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-400 hover:bg-slate-50'}`} title={t('session.toggle_interactive_title')}>{sessionData?.forceStatic ? <Lock size={12} /> : <Unlock size={12} />}{sessionData?.forceStatic ? t('session.static_only') : t('session.interactive')}</button></>}<>{canFacilitateAssessment && <button type="button" data-assessment-presentation-toggle aria-label={isPresentationMode ? quizCopy('quiz.exit_presentation', 'Exit presentation') : quizCopy('quiz.present_questions','Present questions')} aria-pressed={!!isPresentationMode} onClick={handleToggleIsPresentationMode} disabled={isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || isTeacherMode && (sessionData?.quizState?.isActive || sessionData?.escapeRoomState?.isActive)} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${isPresentationMode ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-200' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'}`} title={t('quiz.presentation')}>{isPresentationMode ? <CheckCircle size={14} /> : <MonitorPlay size={14} />}{isPresentationMode ? quizCopy('quiz.exit_presentation', 'Exit presentation') : quizCopy('quiz.present_questions','Present questions')}</button>}</><button type="button" ref={quizGamesButtonRef} data-quiz-games-toggle aria-expanded={quizGamesOpen} aria-controls="quiz-games-tools" onClick={() => setQuizGamesOpen(open => !open)} className="min-h-11 flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-50"><Gamepad2 size={16} aria-hidden="true"/>{isIndependentMode ? quizCopy('quiz.practice_games','Practice games') : t('common.start_game')}<span aria-hidden="true">{quizGamesOpen ? '▴' : '▾'}</span></button>
      {isReviewGame && <button type="button" onClick={handleToggleIsReviewGame} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><XCircle size={16} aria-hidden="true"/>{quizCopy('quiz.exit_review_game', 'Exit review game')}</button>}
      {escapeRoomState.isActive && <button type="button" data-quiz-exit-puzzle onClick={() => {
            closeQuizGames();
            if (escapeRoomState.isActive) {
              if (isTeacherMode && activeSessionCode) {
                endCollaborativeEscapeRoom();
              } else {
                resetEscapeRoom();
              }
            } else {
              if (isTeacherMode && activeSessionCode) {
                launchCollaborativeEscapeRoom();
              } else {
                openEscapeRoomSettings();
              }
            }
          }} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!sessionData?.quizState?.isActive || (['connected-room', 'lesson-board'].includes(sessionData?.escapeRoomState?.mode) && sessionData.escapeRoomState.isActive)} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${escapeRoomState.isActive ? 'bg-purple-600 text-white hover:bg-purple-700 ring-2 ring-purple-200' : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-50'}`} title={isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title')} aria-label={t('escape_room.title')}>{escapeRoomState.isActive ? <XCircle size={14} /> : <DoorOpen size={14} />}{escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')}</button>}{!isPresentationMode && !isReviewGame && (isTeacherMode || isParentMode) && <>{!isIndependentMode && !isParentMode && <button type="button" onClick={handleToggleIsEditingQuiz} className={`flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg text-sm font-bold transition-all motion-reduce:transition-none shadow-sm ${isEditingQuiz ? 'bg-teal-700 text-white hover:bg-teal-700' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'}`}>{isEditingQuiz ? <CheckCircle2 size={14} /> : <Pencil size={14} />}{isEditingQuiz ? t('common.done_editing') : t('quiz.edit')}</button>}<button type="button" onClick={handleToggleShowQuizAnswers} className="text-xs flex items-center gap-2 bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full font-bold hover:bg-teal-200 transition-colors motion-reduce:transition-none">{showQuizAnswers ? <CheckSquare size={14} className="fill-current" /> : <CheckSquare size={14} />}{showQuizAnswers ? isIndependentMode ? t('quiz.hide_answers_student') : isParentMode ? 'Hide Scores' : t('quiz.hide_key') : isIndependentMode ? t('quiz.check_answers') : isParentMode ? 'View Scores' : t('quiz.show_key')}</button></>}</div>{quizGamesOpen && <section ref={quizGamesPanelRef} id="quiz-games-tools" aria-labelledby="quiz-games-title" className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
      <h3 id="quiz-games-title" className="text-sm font-bold text-indigo-950">{t('common.start_game')}</h3>
      <p className="mb-3 mt-1 text-sm text-slate-700">{quizCopy('quiz.games_description', 'Choose a game using this resource. Each option explains how to play.')}</p>{isIndependentMode && <p className="mb-3 text-sm text-indigo-950">{quizCopy('quiz.practice_games_help','Practice games can reveal answers and explanations. They do not submit this assessment.')}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div><button type="button" data-quiz-game="review" onClick={() => launchQuizGame(handleToggleIsReviewGame)} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{t('quiz.review_game')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.review_game_description', 'Answer every question on a category board and award team points.')}</p></div>
        <div><button type="button" onClick={() => {
            closeQuizGames();
            if (escapeRoomState.isActive) {
              if (isTeacherMode && activeSessionCode) {
                endCollaborativeEscapeRoom();
              } else {
                resetEscapeRoom();
              }
            } else {
              if (isTeacherMode && activeSessionCode) {
                launchCollaborativeEscapeRoom();
              } else {
                openEscapeRoomSettings();
              }
            }
          }} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!sessionData?.quizState?.isActive || (['connected-room', 'lesson-board'].includes(sessionData?.escapeRoomState?.mode) && sessionData.escapeRoomState.isActive)} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed" title={isTeacherMode && activeSessionCode ? t('escape_room.launch_live_tooltip') : t('escape_room.title')} aria-label={t('escape_room.title')}>{escapeRoomState.isActive ? <XCircle size={14} /> : <DoorOpen size={14} />}{escapeRoomState.isActive ? t('common.close') : isTeacherMode && activeSessionCode ? t('escape_room.launch_live_btn') : t('escape_room.title')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.puzzle_challenge_description', 'Solve a series of question-based puzzles.')}</p></div>
        {(isTeacherMode || !activeSessionCode) && <div><button type="button" data-open-lesson-board onClick={() => launchQuizGame(() => setBoardSetupOpen(true))} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{t('lesson_board.title', { defaultValue: 'Lesson board game' })}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.lesson_board_description', 'Explore lesson locations and solve activities, solo or together.')}</p></div>}
        {(isTeacherMode || !activeSessionCode) && <div><button type="button" data-open-connected-room onClick={() => launchQuizGame(() => setConnectedSetupOpen(true))} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><DoorOpen size={16} aria-hidden="true"/>{t('connected_escape.title', { defaultValue: 'Escape Room' })}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.escape_room_description', 'Explore a room, collect clues, and solve connected puzzles.')}</p></div>}
        {(isTeacherMode || !activeSessionCode) && <div><button type="button" data-open-concept-quest-solo onClick={() => launchQuizGame(() => setSoloQuestOpen(true))} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{quizCopy('concept_quest.solo_title', 'Concept Quest solo')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.concept_quest_description', 'Explore a role-playing adventure with abilities, encounters, and a final boss.')}</p></div>}
        {isTeacherMode && activeSessionCode && <div><button type="button" data-open-concept-quest onClick={() => launchQuizGame(launchConceptQuest)} disabled={isPresentationMode || isReviewGame || isEditingQuiz || !!escapeRoomState.isActive || !!sessionData?.quizState?.isActive || !!sessionData?.escapeRoomState?.isActive} className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm font-bold text-slate-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"><Gamepad2 size={16} aria-hidden="true"/>{quizCopy('quiz.concept_quest_live', 'Concept Quest with class')}</button><p className="mt-1 px-1 text-sm text-slate-600">{quizCopy('quiz.concept_quest_description', 'Send teams on a live collaborative concept adventure.')}</p></div>}
      </div>
    </section>}</div>}{isTeacherMode && activeSessionCode && (sessionData?.escapeRoomState?.isActive || sessionData?.escapeRoomState?.isGameOver) && <ErrorBoundary fallbackMessage="Escape room controls encountered an error. Refreshing..."><EscapeRoomTeacherControls sessionData={sessionData} generatedContent={generatedContent} activeSessionCode={activeSessionCode} appId={appId} t={t} addToast={addToast} callGemini={props.callGemini} /></ErrorBoundary>}{isTeacherMode && activeSessionCode && sessionData?.quizState?.isActive ? <div className="flex flex-col gap-4"><LiveResultsDashboard sessionData={sessionData} generatedContent={generatedContent} appId={appId} activeSessionCode={activeSessionCode} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} conceptMasteryByUid={props.conceptMasteryByUid} onOpenAlloSheet={props.onOpenAlloSheet} /><ErrorBoundary fallbackMessage="Live quiz controls encountered an error. Refreshing..."><TeacherLiveQuizControls sessionData={sessionData} generatedContent={generatedContent} activeSessionCode={activeSessionCode} appId={appId} onGenerateImage={callImagen} onRefineImage={callGeminiImageEdit} onCreateGroup={handleCreateGroup} onAssignStudent={handleAssignStudent} onSetGroupResource={handleSetGroupResource} isPushingResource={isPushingResource} onSetGroupLanguage={handleSetGroupLanguage} onSetGroupProfile={handleSetGroupProfile} onDeleteGroup={handleDeleteGroup} onUpdateQuestionRoutingRules={handleUpdateQuestionRoutingRules} history={props.history} callGemini={props.callGemini} /></ErrorBoundary>{/* 9rem clears the fixed Live Dashboard launcher (bottom 5.5rem) so End Session can always scroll above it. */}<div className="flex justify-end px-4" style={{ paddingBottom: '9rem' }} data-live-quiz-end-session-row="true"><button type="button" onClick={handleEndLiveSession} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none shadow-sm flex items-center gap-2"><XCircle size={14} /> {t('session.action_end')}</button></div></div> : isReviewGame ? (() => {
      const reviewCategories = getReviewCategories();
      const reviewQuestions = reviewCategories.flatMap(category => category.questions);
      const reviewClaimed = reviewGameState.claimed instanceof Set ? reviewGameState.claimed : new Set();
      const reviewCompleted = reviewQuestions.filter(question => reviewClaimed.has(question.originalIndex)).length;
      const activeReviewQuestion = reviewGameState.activeQuestion;
      const activeReviewKeyDisputed = _quizIsAnswerKeyDisputed(activeReviewQuestion);
      const activeReviewIsMcq = activeReviewQuestion && (!activeReviewQuestion.type || activeReviewQuestion.type === 'mcq') && Array.isArray(activeReviewQuestion.options);
      return <div className="animate-in motion-reduce:animate-none fade-in duration-500"><div className="bg-slate-900 p-6 rounded-2xl shadow-2xl border-4 border-yellow-500 relative overflow-hidden min-h-[700px] flex flex-col"><div className="absolute inset-0 opacity-10 pointer-events-none"><div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" /><div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(to_top,rgba(59,130,246,0.2),transparent)]" /></div><div className="flex justify-between items-start mb-6 relative z-10"><div className="text-left"><h2 ref={reviewBoardHeadingRef} tabIndex={-1} data-review-board-heading className="text-2xl sm:text-3xl font-black text-yellow-300 tracking-wide uppercase drop-shadow-md flex items-center gap-3"><Gamepad2 size={32} /> {t('review_game.title')}</h2><p className="text-slate-200 text-sm mt-2 font-medium">{quizCopy('review_game.all_formats_help', 'Pick a tile, answer together, then reveal the guide and award points. Every assessment item is included.')}</p><p data-review-progress role="status" aria-live="polite" className="mt-2 text-sm font-bold text-yellow-200">{reviewCompleted + ' of ' + reviewQuestions.length + ' items completed · ' + reviewCategories.length + (reviewCategories.length === 1 ? ' category' : ' categories')}</p><label className="mt-3 flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={reviewPauseForAnswers} onChange={e => setReviewPauseForAnswers(e.target.checked)} />Pause for individual answers before revealing</label></div><div className="flex gap-2"><button type="button" aria-label={quizCopy('review_game.sound_effects', 'Sound effects')} aria-pressed={!!soundEnabled} onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSound('click');
              }} className={`p-2 rounded-full transition-colors motion-reduce:transition-none ${soundEnabled ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-100'}`} title={t('review_game.toggle_sound')}>{soundEnabled ? <Volume2 size={20} /> : <MicOff size={20} />}</button><button type="button" aria-label={t('review_game.reset')} onClick={() => {
                setConfirmDialog({
                  message: t('review_game.reset_confirm') || 'Reset the game?',
                  onConfirm: () => {
                    setReviewLearning({});
                    setReviewGameState({
                      claimed: new Set(),
                      activeQuestion: null,
                      showAnswer: false
                    });
                    setGameTeams(gameTeams.map(t => ({
                      ...t,
                      score: 0
                    })));
                  }
                });
              }} className="p-2 bg-slate-700 text-slate-100 rounded-full hover:bg-slate-600" title={t('review_game.reset')}><RefreshCw size={20} /></button></div></div><div className="flex flex-wrap gap-4 justify-center mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700">{gameTeams.map(team => <div key={team.id} className={`${team.color} bg-opacity-20 border-2 border-opacity-50 border-${team.color.split('-')[1]}-400 rounded-lg p-3 min-w-[140px] flex flex-col items-center relative group`}><input aria-label={t('common.enter_team')} className="bg-transparent text-center font-bold text-white  focus:ring-2 focus:ring-white/50 w-full mb-1" value={team.name} onChange={e => setGameTeams(prev => prev.map(t => t.id === team.id ? {
                ...t,
                name: e.target.value
              } : t))} /><div className="text-3xl font-black text-white drop-shadow-md">{team.score}</div>{scoreAnimation.teamId === team.id && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-700 font-black text-xl animate-[ping_1s_ease-out_reverse] motion-reduce:animate-none pointer-events-none z-20 whitespace-nowrap shadow-sm">+{scoreAnimation.points}</div>}<div className="flex gap-2 mt-2 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none"><button type="button" onClick={() => handleManualScore(team.id, -100)} className="min-w-6 min-h-6 inline-flex items-center justify-center text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded">-</button><button type="button" onClick={() => handleManualScore(team.id, 100)} className="min-w-6 min-h-6 inline-flex items-center justify-center text-xs bg-white/10 hover:bg-white/20 text-white px-2 rounded">+</button></div>{gameTeams.length > 1 && <button type="button" onClick={() => handleRemoveTeam(team.id)} className="absolute -top-2 -right-2 min-w-6 min-h-6 inline-flex items-center justify-center bg-slate-800 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-slate-700 transition-all motion-reduce:transition-none shadow-sm" aria-label={t('common.remove')}><X size={10} /></button>}</div>)}{gameTeams.length < 6 && <button type="button" onClick={handleAddTeam} className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-600 rounded-lg text-slate-600 hover:text-white hover:border-slate-400 transition-colors motion-reduce:transition-none"><Plus size={24} /><span className="text-xs font-bold mt-1">{t('review_game.add_team')}</span></button>}</div><div ref={reviewBoardRef} data-review-board className="grid gap-2 sm:gap-4 max-w-4xl mx-auto w-full flex-grow content-start relative z-10" style={{ gridTemplateColumns: 'repeat(' + Math.max(1, reviewCategories.length) + ', minmax(0, 1fr))' }}>{reviewCategories.map((cat, cIdx) => {
              const CategoryIcon = cIdx === 0 ? Brain : cIdx === 1 ? Languages : Search;
              const iconColor = cIdx === 0 ? "text-yellow-400" : cIdx === 1 ? "text-green-400" : "text-blue-400";
              return <div key={cIdx} className="flex flex-col gap-4"><div className="bg-slate-800/80 backdrop-blur-sm text-white font-bold text-center py-4 rounded-lg border-b-4 border-blue-600 shadow-lg uppercase tracking-wider text-sm md:text-base flex flex-col items-center gap-1"><CategoryIcon size={20} className={iconColor} />{cat.name}<span className="text-xs normal-case tracking-normal font-medium text-slate-300">{cat.questions.length + (cat.questions.length === 1 ? ' item' : ' items')}</span></div>{cat.questions.map((q, qIdx) => {
                  const isClaimed = reviewClaimed.has(q.originalIndex);
                  return <button type="button" key={q.originalIndex} data-review-tile={q.originalIndex} onClick={() => !isClaimed && handleReviewTileClick(q, q.points)} disabled={isClaimed} aria-label={`Category: ${cat.name}, question ${q.originalIndex + 1}, ${q.points} points${isClaimed ? ', completed' : ''}`} aria-disabled={isClaimed} className={`
                                                            h-24 rounded-lg font-black text-xl sm:text-3xl shadow-lg transition-all motion-reduce:transition-none duration-300 transform flex items-center justify-center border-b-4 relative overflow-hidden group  focus:ring-4 focus:ring-yellow-400 focus:ring-offset-4 focus:ring-offset-slate-900
                                                            ${isClaimed ? 'bg-slate-800/50 text-slate-300 border-slate-700 cursor-default' : 'bg-gradient-to-b from-blue-500 to-blue-600 text-yellow-300 border-blue-800 hover:from-blue-400 hover:to-blue-500 hover:-translate-y-1 hover:shadow-blue-500/20 hover:shadow-xl cursor-pointer active:scale-95'}
                                                        `}>{!isClaimed && <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_infinite] motion-reduce:animate-none" />}<span className="relative z-10 drop-shadow-md">{isClaimed ? <CheckCircle2 size={24} aria-hidden="true" /> : q.points}</span></button>;
                })}</div>;
            })}</div>
      {reviewQuestions.some(q => reviewLearning[q.originalIndex]?.needsReview) && <section data-review-learning-recap className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-slate-900"><h3 className="font-bold">Ideas to revisit</h3><ul className="mt-2 list-disc ps-5">{reviewQuestions.filter(q => reviewLearning[q.originalIndex]?.needsReview).map(q => <li key={q.originalIndex}><strong>{q.conceptLabel || 'Question ' + (q.originalIndex + 1)}</strong>{': ' + q.question}{reviewLearning[q.originalIndex]?.notes && <p className="text-sm">{reviewLearning[q.originalIndex].notes}</p>}</li>)}</ul><p className="mt-2 text-sm">Use a fresh example to check each learner after discussion. Team points do not establish individual understanding.</p></section>}
      {reviewQuestions.length === 0 && <p className="mt-6 text-center text-slate-200">No assessment items are available yet. Add questions to start a review game.</p>}
      {activeReviewQuestion && <div ref={reviewDialogRef} tabIndex={-1} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-3 sm:p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quiz-review-question-title" onKeyDown={function (e) { _quizHandleDialogKeyDown(e, reviewDialogRef, function () { closeReviewModal(false); }); }}>
        <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border-4 border-yellow-500 bg-blue-900 p-4 text-center shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-3"><span className="rounded-full bg-yellow-400 px-4 py-2 text-lg font-black text-slate-950">{activeReviewQuestion.points + ' points'}</span><button type="button" ref={reviewCloseBtnRef} aria-label={t('common.close')} onClick={() => closeReviewModal(false)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-blue-100 hover:bg-blue-800 hover:text-white"><X size={24} /></button></div>
          <div className="my-6"><p className="mb-2 text-sm font-semibold text-blue-200">{'Assessment question ' + (activeReviewQuestion.originalIndex + 1)}</p><h3 id="quiz-review-question-title" className="text-2xl font-bold leading-tight text-white sm:text-3xl">{formatInlineText(activeReviewQuestion.question || '', false, true)}</h3>{activeReviewQuestion.question_en && <QuizTranslationText as="p" className="mt-4 text-lg italic text-blue-200">{formatInlineText(activeReviewQuestion.question_en, false, true)}</QuizTranslationText>}</div>
          {activeReviewQuestion.imageUrl && <img src={activeReviewQuestion.imageUrl} alt={_quizAuthoredImageAlt(activeReviewQuestion.imageAltText)} className="mb-5 max-h-80 w-full rounded-lg bg-white object-contain" />}
          {activeReviewIsMcq ? <div data-review-question-type="mcq" className="mb-6 text-left"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{activeReviewQuestion.options.map((option, optionIndex) => {
            const correct = !activeReviewKeyDisputed && _quizAnswerMatches(option, activeReviewQuestion.correctAnswer);
            return <div key={optionIndex} className={'rounded-xl border-2 p-4 text-lg font-medium ' + (reviewGameState.showAnswer && correct ? 'border-green-400 bg-green-800 text-white' : 'border-blue-500 bg-blue-800 text-white')}><span className="mr-2 inline-block font-bold">{String.fromCharCode(65 + optionIndex) + '.'}</span>{formatInlineText(option, false, true)}{activeReviewQuestion.options_en?.[optionIndex] && <QuizTranslationText as="p" className="mt-2 text-base italic">{formatInlineText(activeReviewQuestion.options_en[optionIndex], false, true)}</QuizTranslationText>}{activeReviewQuestion.optionImageUrls?.[optionIndex] && <img src={activeReviewQuestion.optionImageUrls[optionIndex]} alt={_quizAuthoredImageAlt(activeReviewQuestion.optionImageAltTexts?.[optionIndex])} loading="lazy" className="mt-3 max-h-48 w-full rounded-lg bg-white object-contain" />}{reviewGameState.showAnswer && correct && <span className="ml-2 text-sm font-bold">✓ Correct</span>}</div>;
          })}</div>{reviewGameState.showAnswer && <div data-review-answer-guide className="mt-4 rounded-xl border-2 border-green-300 bg-green-50 p-4 text-green-950" role="status">{activeReviewKeyDisputed ? <p data-review-key-under-review>{quizCopy('quiz.key_quality.review_game_key_under_review', 'Answer key under review. No answer is being marked correct, and points are paused for this item.')}</p> : <><strong>Answer: </strong>{formatInlineText(String(activeReviewQuestion.correctAnswer ?? activeReviewQuestion.expectedAnswer ?? 'Teacher review'), false)}</>}{_quizStudentExplanation(activeReviewQuestion, true) && <div className="mt-3 border-t border-green-200 pt-3"><strong>Explanation: </strong>{renderFormattedText(_quizStudentExplanation(activeReviewQuestion, true))}</div>}</div>}</div> : <div className="mb-6"><AssessmentPresentationItem compact q={activeReviewQuestion} index={activeReviewQuestion.originalIndex} showAnswer={reviewGameState.showAnswer} formatInlineText={formatInlineText} renderFormattedText={renderFormattedText} /></div>}
          {reviewPauseForAnswers && !reviewGameState.showAnswer && <div className="mb-4 rounded-lg border border-blue-400 bg-blue-800 p-4 text-left text-white"><p>Everyone writes, draws, or says their own answer before the group discusses it.</p><label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={!!reviewLearning[activeReviewQuestion.originalIndex]?.committed} onChange={e => recordReviewLearning(activeReviewQuestion.originalIndex, { committed: e.target.checked })} />Individual answers are ready to discuss</label></div>}
          {reviewGameState.showAnswer && <div className="mb-4 text-left text-white"><label className="flex gap-2"><input type="checkbox" checked={!!reviewLearning[activeReviewQuestion.originalIndex]?.needsReview} onChange={e => recordReviewLearning(activeReviewQuestion.originalIndex, { needsReview: e.target.checked })} />Revisit this idea after the game</label><label className="mt-2 block text-sm">Discussion notes (optional)<textarea rows={2} value={reviewLearning[activeReviewQuestion.originalIndex]?.notes || ''} onChange={e => recordReviewLearning(activeReviewQuestion.originalIndex, { notes: e.target.value })} className="mt-1 block w-full rounded border border-blue-300 bg-white p-2 text-slate-900" /></label></div>}
          <div className="mt-auto flex flex-col items-center gap-5 border-t border-blue-700 pt-5">{!reviewGameState.showAnswer ? <button type="button" aria-label={t('review_game.reveal_answer')} disabled={reviewPauseForAnswers && !reviewLearning[activeReviewQuestion.originalIndex]?.committed} onClick={() => { if (reviewPauseForAnswers && !reviewLearning[activeReviewQuestion.originalIndex]?.committed) return; reviewRevealFocusPendingRef.current = true; setReviewGameState(prev => ({ ...prev, showAnswer: true })); playSound('reveal'); }} className="min-h-11 rounded-full bg-yellow-400 px-6 py-3 text-lg font-bold text-slate-950 hover:bg-yellow-300">{t('review_game.reveal_answer')}</button> : <div className="w-full"><p ref={reviewAwardHelpRef} tabIndex={-1} data-review-award-help className="mb-3 text-sm font-bold text-blue-100">{quizCopy('review_game.award_help', 'Use the answer guide to decide which team earned the points.')}</p><div className="flex flex-wrap justify-center gap-3">{gameTeams.map(team => <button type="button" aria-label={`Award ${activeReviewQuestion.points} points to ${team.name}`} key={team.id} disabled={activeReviewKeyDisputed} onClick={() => !activeReviewKeyDisputed && handleAwardPoints(team.id, activeReviewQuestion.points)} className={reviewTeamButtonClass(team.color) + ' min-h-11 rounded-lg px-4 py-2 font-bold shadow-md border-b-4 border-black/20 disabled:opacity-50 disabled:cursor-not-allowed'}><CheckCircle2 size={16} className="mr-2 inline" />{team.name}</button>)}<button type="button" onClick={() => { recordReviewLearning(activeReviewQuestion.originalIndex, { needsReview: true }); playSound('incorrect'); closeReviewModal(true); }} className="min-h-11 rounded-lg bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-600">{t('review_game.no_points')}</button></div></div>}</div>
        </div>
      </div>}
      </div></div>;
    })() : escapeRoomState.isActive ? window.AlloModules && window.AlloModules.EscapeRoomGameplay ? <window.AlloModules.EscapeRoomGameplay escapeRoomState={escapeRoomState} setEscapeRoomState={setEscapeRoomState} escapeTimeLeft={escapeTimeLeft} isEscapeTimerRunning={isEscapeTimerRunning} setIsEscapeTimerRunning={setIsEscapeTimerRunning} handleSetIsEscapeTimerRunningToTrue={() => setIsEscapeTimerRunning(true)} handlers={{
        generateEscapeRoom,
        handlePuzzleSolved,
        handleSelectObject,
        handleWrongAnswer,
        handleEscapeRoomAnswer,
        handleSequenceAnswer,
        handleCipherAnswer,
        handleMatchingSelect,
        handleScrambleAnswer,
        handleFillinAnswer,
        handleFinalDoorAnswer,
        resetEscapeRoom,
        handleRevealHint,
        derangeShuffle,
        openEscapeRoomSettings
      }} t={t} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} playSound={playSound} globalPoints={globalPoints} inputText={inputText} /> : null : isPresentationMode ? <div data-assessment-presentation className="space-y-8 animate-in motion-reduce:animate-none fade-in duration-500"><div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-lg"><h2 className="font-bold text-xl flex items-center gap-2"><MonitorPlay size={24} className="text-teal-300" /> {t('quiz.presentation_board')}</h2><button type="button" onClick={() => { resetPresentation(); setPresentationQuestionIndex(0); }} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none"><RefreshCw size={14} /> {t('quiz.reset_board')}</button></div>
        <p className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">{quizCopy('quiz.presentation_visibility_help', 'This is a discussion screen. Selecting an option only marks it for discussion. Reveal an answer or explanation when everyone is ready; anything revealed is visible to people viewing this screen. This does not submit student responses or control their screens.')}</p>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-300 bg-white p-3"><p data-presentation-visibility role="status" aria-live="polite" className="text-sm font-bold text-slate-800">{visiblePresentationGuides ? quizCopy('quiz.presentation_guides_visible','Questions with visible answers or explanations: {count}').replace('{count}',String(visiblePresentationGuides)) : quizCopy('quiz.presentation_guides_hidden','Answer guides and explanations are hidden.')}</p><button type="button" data-presentation-hide-guides disabled={!visiblePresentationGuides} onClick={hidePresentationGuides} className="min-h-11 rounded-lg border border-slate-400 px-3 py-2 text-sm font-bold text-slate-800 disabled:opacity-50">{quizCopy('quiz.presentation_hide_guides','Hide all answers and explanations')}</button></div>
        <nav aria-label="Presentation questions" className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-800">
          <button type="button" onClick={() => setPresentationAllQuestions(all => !all)} aria-pressed={presentationAllQuestions} className="min-h-11 rounded-lg border border-indigo-300 px-3 py-2 text-sm font-bold text-indigo-800">{presentationAllQuestions ? 'Show one question' : 'Show all questions'}</button>
          <span role="status" aria-live="polite" className="text-sm font-bold text-slate-700">{presentationAllQuestions ? presentationSlides.length + ' questions' : presentationSlides.length ? 'Question ' + (presentationCurrent + 1) + ' of ' + presentationSlides.length : 'No questions'}</span>
          {!presentationAllQuestions && presentationSlides.length > 0 && <><button type="button" disabled={presentationCurrent === 0} onClick={() => setPresentationQuestionIndex(presentationCurrent - 1)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-50">Previous question</button><label className="flex items-center gap-2 text-sm font-semibold">Go to question<select aria-label="Go to presentation question" value={presentationCurrent} onChange={event => setPresentationQuestionIndex(Number(event.target.value))} className="min-h-11 rounded-lg border border-slate-300 px-2">{presentationSlides.map((index, position) => <option key={index} value={position}>{position + 1}</option>)}</select></label><button type="button" disabled={presentationCurrent >= presentationSlides.length - 1} onClick={() => setPresentationQuestionIndex(presentationCurrent + 1)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-50">Next question</button></>}
        </nav>{presentationQuestions.map((q, i) => {
          if (!q || (!presentationAllQuestions && i !== presentationSlides[presentationCurrent])) return null;
          const pState = presentationState[i] || {};
          if ((q.type && q.type !== 'mcq') || !Array.isArray(q.options)) {
            return <AssessmentPresentationItem key={i} q={q} index={i} showAnswer={!!pState.showAnswer} showExplanation={!!pState.showExplanation} onToggleAnswer={() => togglePresentationAnswer(i)} onToggleExplanation={() => togglePresentationExplanation(i)} formatInlineText={formatInlineText} renderFormattedText={renderFormattedText} />;
          }
          const keyUnderReview = _quizIsAnswerKeyDisputed(q);
          const isAnswered = pState.selectedOption != null && !keyUnderReview;
          const isCorrectlyAnswered = isAnswered && _quizAnswerMatches(pState.selectedOption, q.correctAnswer);
          const showAnswer = pState.showAnswer;
          const showExplanation = pState.showExplanation;
          return <div key={i} data-presentation-question-type="mcq" className="bg-white p-4 sm:p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all motion-reduce:transition-none">{showAnswer && keyUnderReview && <p data-presentation-key-under-review role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{quizCopy('quiz.key_quality.presentation_key_under_review', 'Answer key under review. No option is being marked correct or incorrect.')}</p>}<div className="flex gap-4 mb-6"><div className="bg-teal-100 text-teal-800 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">{i + 1}</div><div className="flex-grow"><h3 className="text-2xl font-bold text-slate-800 leading-tight">{formatInlineText(q.question, false)}</h3>{q.question_en && <QuizTranslationText as="p" className="text-lg text-slate-600 italic mt-2">{formatInlineText(q.question_en, false)}</QuizTranslationText>}</div></div>{q.imageUrl && <img src={q.imageUrl} alt={_quizAuthoredImageAlt(q.imageAltText)} className="mb-5 max-h-80 w-full rounded-lg object-contain"/>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-0 md:ml-14">{q.options.map((opt, optIdx) => {
                const isSelected = pState.selectedOption === opt;
                const isCorrectOption = !keyUnderReview && _quizAnswerMatches(opt, q.correctAnswer);
                let btnClass = "bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";
                let icon = <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-indigo-400 transition-colors motion-reduce:transition-none" />;
                if (isSelected && (!showAnswer || keyUnderReview)) {
                  btnClass = "bg-indigo-50 border-2 border-indigo-500 text-indigo-950";
                  icon = <span data-assessment-selected-choice className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-current font-bold" aria-hidden="true">✓</span>;
                } else if (isSelected) {
                  if (isCorrectOption) {
                    btnClass = "bg-green-100 border-2 border-green-500 text-green-900 shadow-md transform scale-[1.02]";
                    icon = <CheckCircle2 size={24} className="text-green-600" />;
                  } else {
                    btnClass = "bg-red-100 border-2 border-red-400 text-red-900 animate-shake motion-reduce:animate-none";
                    icon = <XCircle size={24} className="text-red-500" />;
                  }
                } else if (showAnswer && isCorrectOption) {
                  btnClass = "bg-green-50 border-2 border-green-400 text-green-800 ring-2 ring-green-200 ring-offset-2";
                  icon = <CheckCircle2 size={24} className="text-green-500" />;
                } else if (showAnswer) {
                  btnClass = "opacity-50 bg-slate-50 border-slate-100 text-slate-600 cursor-not-allowed";
                }
                return <button type="button" key={optIdx} aria-pressed={isSelected} onClick={() => handlePresentationOptionClick(i, opt)} disabled={showAnswer} className={`p-5 rounded-xl text-left font-bold text-lg transition-all motion-reduce:transition-none duration-200 flex items-center gap-4 group w-full ${btnClass}`}><div className="shrink-0">{icon}</div><div className="min-w-0 flex-grow">{q.optionImageUrls?.[optIdx] && <img src={q.optionImageUrls[optIdx]} alt={_quizAuthoredImageAlt(q.optionImageAltTexts?.[optIdx])} className="mb-3 h-32 w-full rounded object-contain"/>}<span className="mr-2">{String.fromCharCode(65 + optIdx)}.</span>{formatInlineText(opt, false)}{q.options_en && q.options_en[optIdx] && <QuizTranslationText as="div" className="text-sm font-normal opacity-80 italic mt-1">{formatInlineText(q.options_en[optIdx], false)}</QuizTranslationText>}</div></button>;
              })}</div><div className="mt-6 ml-0 md:ml-14 flex items-center justify-between border-t border-slate-100 pt-4 flex-wrap gap-2"><div role="status" aria-live="polite" className="min-h-8 flex items-center relative">{isAnswered && !isCorrectlyAnswered && showAnswer && <span data-presentation-selection-feedback className="text-red-700 font-bold flex items-center gap-2 animate-in motion-reduce:animate-none fade-in slide-in-from-left-2"><XCircle size={18} /> {quizCopy('quiz.presentation_selection_differs','The selected option differs from the answer guide.')}</span>}{isAnswered && isCorrectlyAnswered && showAnswer && <span data-presentation-selection-feedback className="text-green-700 font-bold flex items-center gap-2 animate-in motion-reduce:animate-none zoom-in duration-300 overflow-visible"><Sparkles size={18} /> {t('quiz.presentation_correct')}<ConfettiExplosion /></span>}</div><div className="flex gap-2">{_quizStudentExplanation(q, true) && <button type="button" aria-label={showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')} onClick={() => togglePresentationExplanation(i)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2 ${showExplanation ? 'bg-yellow-100 text-yellow-700' : 'bg-white border border-slate-400 text-slate-600 hover:bg-slate-50'}`}>{showExplanation ? <ChevronUp size={14} /> : <Info size={14} />}{showExplanation ? t('quiz.hide_explanation') : t('quiz.show_explanation')}</button>}<button type="button" aria-label={showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')} onClick={() => togglePresentationAnswer(i)} aria-expanded={!!showAnswer} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors motion-reduce:transition-none flex items-center gap-2 ${showAnswer ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{showAnswer ? <Eye size={14} /> : <MousePointerClick size={14} />}{showAnswer ? t('quiz.hide_answer') : t('quiz.reveal_answer')}</button></div></div>{showExplanation && _quizStudentExplanation(q, true) && <div className="mt-4 ml-0 md:ml-14 p-4 bg-yellow-50 border border-yellow-100 rounded-xl animate-in motion-reduce:animate-none slide-in-from-top-2"><div className="prose prose-sm text-slate-700 max-w-none leading-relaxed">{renderFormattedText(_quizStudentExplanation(q, true))}</div></div>}</div>;
        })}{presentationReflections.length > 0 && (presentationAllQuestions || presentationCurrent === presentationSlides.length - 1 || !presentationSlides.length) && <section className="bg-indigo-900 text-white p-4 sm:p-8 rounded-2xl shadow-xl mt-8"><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><MessageSquare size={24} className="text-indigo-300" /> {t('quiz.presentation_discussion')}</h3><div className="space-y-8">{presentationReflections.map((ref, i) => <div key={i} className="bg-indigo-800/50 p-6 rounded-xl border border-indigo-700"><p className="text-2xl font-medium leading-relaxed">{_quizRich(typeof ref === 'string' ? ref : ref.text)}</p>{ref?.text_en && <QuizTranslationText as="p" className="text-lg text-indigo-200 italic mt-4">{_quizRich(ref.text_en)}</QuizTranslationText>}</div>)}</div></section>}</div> : <div className="space-y-6">{isEditingQuiz && !(generatedContent?.data?.questions || []).length && <AssessmentEmptyAddPanel authoring={assessmentAuthoring} />}{generatedContent?.data.questions.map((q, i) => oneQuestionAtATime && i !== currentQuestionIdx ? null : !q ? null : q.type && q.type !== 'mcq' ? <FreeformItemsBlock questions={generatedContent.data.questions} key={i} compact={true} deferFeedback={deferFeedback} feedbackTiming={gradedMode ? 'teacher-graded' : deliverySettings.feedbackTiming} registerVoiceController={registerQuizItemVoiceController} visibleQuestionIdx={i} flaggedQuestions={flaggedQuestions} allowFlagging={deliverySettings.allowFlagging} onToggleFlag={toggleQuestionFlag} draftNamespace={draftNamespace} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} QuizAIHelpers={window.AlloModules && window.AlloModules.QuizAIHelpers} modeStrategy={_modeStrat} scoringPolicy={scoringPolicy} onSubmitLiveAnswer={onSubmitLiveAnswer} allowDictation={allowDictation} isEditingQuiz={isEditingQuiz} onQuestionAction={props.handleQuizQuestionAction} onRegenerateQuestion={regenerateAssessmentQuestion} regeneratingQuestions={regeneratingQuestions} authoring={assessmentAuthoring} /> : <div key={i} id={'assessment-question-' + i} className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm relative group/question scroll-mt-24">{!isEditingQuiz && deliverySettings.allowFlagging && <div className="flex justify-end mb-2"><AssessmentQuestionFlagButton flagged={!!flaggedQuestions[i]} onToggle={function () { toggleQuestionFlag(i); }} /></div>}{q.imageUrl && <div className="relative mb-3"><img src={q.imageUrl} alt={_quizAuthoredImageAlt(q.imageAltText)} loading="lazy" className="w-full max-h-64 object-contain rounded-lg border border-slate-200 bg-slate-50" />{renderImageRefineOverlay(i, 'question', null, false)}</div>}<div className="flex justify-between items-start mb-4 gap-4"><div className="flex-grow flex gap-3"><span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-1.5">{i + 1}</span><div className="flex-grow space-y-2">{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_question') || 'Edit question'} value={q.question} onChange={e => handleQuizChange(i, 'question', e.target.value)} className="w-full font-bold text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(q.question)} />{q.question_en !== undefined && <QuizTranslationText as="textarea" aria-label={t('quiz.edit_question_english') || 'Edit question English translation'} value={q.question_en || ''} onChange={e => handleQuizChange(i, 'question', e.target.value, null, true)} className="w-full text-sm text-slate-600 italic bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(q.question_en || '')} placeholder={t('common.placeholder_english_trans')} />}</> : <><p className="font-bold text-slate-800 px-2 py-1">{_quizRich(q.question)}</p>{q.question_en && <QuizTranslationText as="p" className="text-sm text-slate-600 italic px-2">{_quizRich(q.question_en)}</QuizTranslationText>}</>}</div></div>{isTeacherMode && <button type="button" aria-label={isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check')} onClick={() => handleFactCheck(i)} disabled={isFactChecking[i]} className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border transition-colors motion-reduce:transition-none ${q.factCheck ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-200' : 'text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200'}`} title={t('quiz.verify_tooltip')}>{isFactChecking[i] ? <RefreshCw size={12} className={"animate-spin " + quizreducedMotionClass} /> : q.factCheck ? <RefreshCw size={12} /> : <ShieldCheck size={12} />}{isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check')}</button>}</div>{isEditingQuiz && <AssessmentItemActions q={q} questionIdx={i} totalQuestions={generatedContent.data.questions.length} onAction={props.handleQuizQuestionAction} onRegenerate={regenerateAssessmentQuestion} regenerating={!!regeneratingQuestions[i]} {..._quizAuthoringActionProps(assessmentAuthoring, i)} />}<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9">{q.options.map((opt, optIdx) => <div key={optIdx} role={!isEditingQuiz ? 'button' : undefined} tabIndex={!isEditingQuiz ? 0 : undefined} aria-pressed={!isEditingQuiz ? studentMcqAnswers[i] === optIdx : undefined} onClick={!isEditingQuiz ? () => selectMcqOption(i, optIdx, opt, q) : undefined} onKeyDown={!isEditingQuiz ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectMcqOption(i, optIdx, opt, q);
              }
            } : undefined} className={`p-2 rounded-lg border text-sm relative group/option ${!isEditingQuiz ? 'cursor-pointer hover:bg-indigo-50/40 transition-colors motion-reduce:transition-none' : ''} ${showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : studentMcqAnswers[i] === optIdx ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400' : 'bg-slate-50 border-slate-100'}`}>{Array.isArray(q.optionImageUrls) && q.optionImageUrls[optIdx] && <div className="relative mb-2"><img src={q.optionImageUrls[optIdx]} alt={_quizAuthoredImageAlt(Array.isArray(q.optionImageAltTexts) ? q.optionImageAltTexts[optIdx] : '')} loading="lazy" className="w-full h-24 object-contain rounded bg-white border border-slate-200" />{renderImageRefineOverlay(i, 'option', optIdx, true)}</div>}{!isEditingQuiz && studentMcqAnswers[i] === optIdx && <span data-assessment-selected-choice aria-hidden="true" className="mb-1 inline-flex items-center gap-1 rounded border border-current px-1.5 py-0.5 text-xs font-bold">✓ {quizCopy('quiz.selected_choice', 'Selected')}</span>}<div className="flex items-start gap-2"><span className="mt-1.5 text-slate-600">{String.fromCharCode(65 + optIdx)}.</span><div className="flex-grow">{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_option') || 'Edit answer option'} value={opt} onChange={e => handleQuizChange(i, 'option', e.target.value, optIdx)} className={`w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5  resize-none transition-all motion-reduce:transition-none ${showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) ? 'text-green-800 font-medium' : 'text-slate-600'}`} rows={getRows(opt, 30)} />{q.options_en && <QuizTranslationText as="textarea" aria-label={t('quiz.edit_option_translation') || 'Edit option translation'} value={q.options_en[optIdx] || ''} onChange={e => handleQuizChange(i, 'option', e.target.value, optIdx, true)} className="w-full text-xs text-slate-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 py-0.5  resize-none transition-all motion-reduce:transition-none mt-1" rows={getRows(q.options_en[optIdx] || '', 30)} placeholder={t('common.placeholder_option_trans')} />}</> : <><p className={`px-1 py-0.5 ${showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) ? 'text-green-800 font-medium' : 'text-slate-600'}`}>{_quizRich(opt)}</p>{q.options_en && q.options_en[optIdx] && <QuizTranslationText as="p" className="text-xs text-slate-600 mt-1 px-1 italic">{_quizRich(q.options_en[optIdx])}</QuizTranslationText>}</>}</div></div>{showQuizAnswers && (isTeacherMode || isParentMode) && _quizAnswerMatches(opt, q.correctAnswer) && <div className="absolute top-2 right-2 text-green-600"><CheckCircle2 size={14} /></div>}{isEditingQuiz && !_quizAnswerMatches(opt, q.correctAnswer) && Array.isArray(q.distractorQuality) && function () {
                var dq = q.distractorQuality.find(function (d) {
                  return d && d.distractor === opt;
                });
                if (!dq) return null;
                return <div className="mt-1.5 ml-1 flex items-center gap-1.5 flex-wrap">{dq.encodesMisconception ? <span role="group" className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800" aria-label={'This distractor encodes a known student misconception. ' + (dq.reason || '')} title={dq.reason || 'Encodes a known student misconception'}><span aria-hidden="true">🎯 </span>misconception</span> : <><span role="group" className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" aria-label={'Generic distractor — does not encode a specific misconception. ' + (dq.reason || '')} title={dq.reason || 'Generic distractor — does not encode a specific misconception'}><span aria-hidden="true">⚠ </span>generic</span><button type="button" onClick={function (e) {
                      e.stopPropagation();
                      improveDistractor(i, optIdx, opt, dq.reason || '');
                    }} disabled={!!isImprovingDistractor[i + ':' + optIdx]} className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" aria-label={isImprovingDistractor[i + ':' + optIdx] ? 'Rewriting distractor' : 'Rewrite this distractor to encode a real misconception'} title={t("tooltips.rewrite_distractor")}><span aria-hidden="true">✨ </span>{isImprovingDistractor[i + ':' + optIdx] ? 'rewriting…' : 'improve'}</button></>}</div>;
              }()}</div>)}</div>{isEditingQuiz && <AssessmentLearningOptions q={q} patch={changes => props.handleQuizQuestionAction?.(i, 'patch', changes)} />}{!deferFeedback && <McqEnhancements q={q} selectedOptionIdx={studentMcqAnswers[i]} feedbackShown={studentMcqAnswers[i] !== undefined && studentMcqAnswers[i] !== null} questionIdx={i} draftNamespace={draftNamespace} modeStrategy={_modeStrat} callGemini={props.callGemini} callTTS={props.callTTS} gradeLevel={props.gradeLevel} onSubmitLiveAnswer={onSubmitLiveAnswer} currentConfidence={studentMcqConfidence[i] || null} onSetConfidence={function (lvl) {
            setMcqConfidence(i, lvl, q);
          }} />}{q.factCheck && isTeacherMode && (!isIndependentMode || showQuizAnswers) && function () {
            var keyCheck = _quizKeyCheck(q, quizFactCheckMarkers) || { status: 'unclear', suggestedAnswer: '' };
            var disputed = keyCheck.status === 'disputed', confirmed = keyCheck.status === 'confirmed';
            return <div data-quiz-key-check={keyCheck.status} className={'mt-4 ml-9 p-3 pr-20 border rounded-lg text-xs flex gap-2 items-start animate-in motion-reduce:animate-none slide-in-from-top-2 relative ' + (disputed ? 'bg-rose-50 border-rose-300 text-rose-900' : confirmed ? 'bg-yellow-50 border-yellow-100 text-yellow-800' : 'bg-amber-50 border-amber-300 text-amber-900')}>{confirmed && <Stamp label={t('quiz.verified_stamp')} position="top-2 right-2" size="small" />}<button type="button" aria-label={isFactChecking[i] ? t('quiz.verifying') : q.factCheck ? t('quiz.reverify') : t('quiz.fact_check')} onClick={() => handleFactCheck(i)} disabled={isFactChecking[i]} className="absolute bottom-2 right-2 p-1.5 text-yellow-800 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors motion-reduce:transition-none" title={t('quiz.regenerate_check')}><RefreshCw size={14} className={isFactChecking[i] ? "animate-spin " + quizreducedMotionClass : ""} /></button><Sparkles size={14} className={'mt-0.5 shrink-0 ' + (disputed ? 'text-rose-700' : 'text-yellow-600')} /><div className="flex-grow">{!confirmed && <p className="mb-2 text-sm font-bold">{disputed ? quizT('quiz.key_quality.key_disputed', 'Key disputed') : keyCheck.status === 'stale' ? quizT('quiz.key_quality.check_stale', 'Answer key changed since this check') : quizT('quiz.key_quality.check_unclear', 'Check needs review')}</p>}{disputed && (keyCheck.suggestedAnswer ? <div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-sm">{_quizFill(quizT('quiz.key_quality.suggested_key', 'Suggested key: {answer}'), { answer: keyCheck.suggestedAnswer })}</span>{typeof handleQuizChange === 'function' && <button type="button" data-quiz-use-suggested-key onClick={() => handleQuizChange(i, 'correctAnswer', keyCheck.suggestedAnswer)} className="min-h-9 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800">{quizT('quiz.key_quality.use_suggested', 'Use suggested key')}</button>}</div> : <p className="mb-2 text-sm">{quizT('quiz.key_quality.no_suggestion', 'The check did not name a single correct option. Review this item.')}</p>)}<div className="whitespace-pre-line leading-relaxed text-slate-700">{renderFormattedText(_quizFactCheckText(q.factCheck))}</div></div></div>;
          }()}</div>)}{(Array.isArray(generatedContent?.data.reflections) && generatedContent.data.reflections.length > 0 || generatedContent?.data.reflection) && <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 mt-8"><h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><PenTool size={16} /> {t('quiz.reflections')}</h4>{Array.isArray(generatedContent?.data.reflections) ? <div className="space-y-6">{generatedContent?.data.reflections.map((ref, i) => {
              const text = typeof ref === 'string' ? ref : ref.text || ref.prompt || ref.question || (typeof ref === 'object' ? JSON.stringify(ref) : '');
              const textEn = typeof ref === 'object' && ref.text_en ? ref.text_en : null;
              var refEntry = reflectionAnswers[i] || {};
              var refSubmitted = !!refEntry.submitted;
              var refDraft = refEntry.draft || '';
              return <div key={i}>{isEditingQuiz ? <><textarea aria-label={t('quiz.edit_reflection') || 'Edit reflection prompt'} value={text} onChange={e => handleReflectionChange(i, e.target.value)} className="w-full text-indigo-800 mb-1 italic text-sm bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(text)} />{(textEn !== null || leveledTextLanguage !== 'English') && <QuizTranslationText as="textarea" aria-label={t('quiz.edit_reflection_translation') || 'Edit reflection translation'} value={textEn || ''} onChange={e => handleReflectionChange(i, e.target.value, true)} className="w-full text-indigo-600 mb-4 text-xs bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-none transition-all motion-reduce:transition-none" rows={getRows(textEn || '')} placeholder={t('common.placeholder_reflection_trans')} />}</> : <><p className="text-indigo-800 mb-1 italic text-sm px-2 py-1">{_quizRich(text)}</p>{textEn && <QuizTranslationText as="p" className="text-indigo-600 mb-4 text-xs px-2 py-1 italic">{textEn}</QuizTranslationText>}</>}{!isEditingQuiz && (isPresentationMode ? <div className="h-24 border-b border-indigo-200 border-dashed" /> : refSubmitted ? <div className="mt-2 p-3 rounded-lg bg-white border border-indigo-200"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">✓ Reflection submitted</div><p className="text-sm text-slate-800 whitespace-pre-wrap">{refEntry.submittedText || refDraft}</p><button type="button" onClick={function () {
                    reopenReflection(i);
                  }} className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900">{t("ui_common.edit_response")}</button></div> : <div className="mt-2"><textarea aria-label="Your reflection" value={refDraft} onChange={function (e) {
                    setReflectionDraft(i, e.target.value);
                  }} placeholder={t("placeholders.reflection_here")} className="w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-y transition-all motion-reduce:transition-none" rows={4} /><QuizVoiceInputButton value={refDraft} onChange={function (value) { setReflectionDraft(i, value); }} allowDictation={allowDictation} label="Dictate reflection" /><div className="flex items-center gap-2 mt-2"><button type="button" onClick={function () {
                      submitReflection(i);
                    }} disabled={!refDraft.trim()} className="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{t("ui_common.submit_reflection")}</button>{!refDraft.trim() && <span className="text-[11px] italic text-slate-600">{_quizGradedCopy('quiz.student.type_to_enable_submit', 'Type a response to enable submit')}</span>}</div></div>)}</div>;
            })}</div> : <><p className="text-indigo-800 mb-4 italic text-sm">{generatedContent?.data.reflection}</p>{!isEditingQuiz && (isPresentationMode ? <div className="h-24 border-b border-indigo-200 border-dashed" /> : function () {
              var refEntry = reflectionAnswers[0] || {};
              var refSubmitted = !!refEntry.submitted;
              var refDraft = refEntry.draft || '';
              return refSubmitted ? <div className="mt-2 p-3 rounded-lg bg-white border border-indigo-200"><div className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 mb-1">✓ Reflection submitted</div><p className="text-sm text-slate-800 whitespace-pre-wrap">{refEntry.submittedText || refDraft}</p><button type="button" onClick={function () {
                  reopenReflection(0);
                }} className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900">{t("ui_common.edit_response")}</button></div> : <div className="mt-2"><textarea aria-label="Your reflection" value={refDraft} onChange={function (e) {
                  setReflectionDraft(0, e.target.value);
                }} placeholder={t("placeholders.reflection_here")} className="w-full text-sm text-slate-800 bg-white border border-indigo-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1  resize-y transition-all motion-reduce:transition-none" rows={4} /><QuizVoiceInputButton value={refDraft} onChange={function (value) { setReflectionDraft(0, value); }} allowDictation={allowDictation} label="Dictate reflection" /><div className="flex items-center gap-2 mt-2"><button type="button" onClick={function () {
                    submitReflection(0);
                  }} disabled={!refDraft.trim()} className="text-xs font-bold px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">{t("ui_common.submit_reflection")}</button>{!refDraft.trim() && <span className="text-[11px] italic text-slate-600">{_quizGradedCopy('quiz.student.type_to_enable_submit', 'Type a response to enable submit')}</span>}</div></div>;
            }())}</>}</div>}{learnerAttemptPanel && assessmentQuestionCount > 0 && <div data-assessment-submit-footer className="flex justify-end rounded-xl border border-indigo-200 bg-indigo-50 p-4 pr-20 md:pr-4"><button type="button" onClick={function () { setReviewOpen(true); }} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800">{_quizGradedCopy('quiz.student.review_submit', 'Review & submit')}</button></div>}</div>}</div>;
  }
  QuizView.voiceBoundary = Object.freeze({
    controlEvent: QUIZ_VOICE_CONTROL_EVENT,
    statusEvent: QUIZ_VOICE_STATUS_EVENT,
    parseChoice: _quizVoiceChoiceIndex,
    parseScopedUtterance: _quizVoiceParseScopedUtterance,
    choiceRange: 'A-H / 1-8 / first-eighth'
  });
  // Concept Quest renders the same items, so it shares the assessment text formatting.
  QuizView.markdown = Object.freeze({ inline: _quizRich, block: _quizRichBlock, plain: _quizPlain, segments: function (text) { return _quizSegments(text); } });
  QuizView.keyQuality = Object.freeze({
    readFactCheck: _quizReadFactCheck,
    keyCheck: _quizKeyCheck,
    factCheckText: _quizFactCheckText,
    studentExplanation: _quizStudentExplanation,
    balanceChoiceKeys: _quizBalanceChoiceKeys,
    feedbackSignature: _quizFeedbackSignature,
    releaseKeyPayload: _quizReleaseKeyPayload,
    releaseKeyVersion: _quizReleaseKeyVersion,
    applyReleasedKeys: _quizApplyReleasedKeys,
    answerCueIssues: _quizAnswerCueIssues,
    auditAssessment: function (data, auditOptions) { return _quizAuditAssessment(_quizCanonicalContent({ data: data }).data, auditOptions); },
    responseSnapshot: function (data, items, meta) { return _quizResponseSnapshot(_quizCanonicalContent({ data: data }).data, items, meta); },
    isGraded: _quizIsGraded
  });

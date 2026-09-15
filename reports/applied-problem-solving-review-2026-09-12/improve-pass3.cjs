const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
let s=read('applied_challenge_source.jsx');
function replace(from,to){if(!s.includes(from))throw Error('Missing anchor: '+from.slice(0,110));s=s.replace(from,to);}
replace('function appliedChallengeFeedbackOutdated(value) {',fs.readFileSync(path.join(__dirname,'pass3-helpers.txt'),'utf8')+'\n\nfunction appliedChallengeFeedbackOutdated(value) {');
replace('    strength: _apsString(raw.strength, 1200),','    coverage: normalizeAppliedChallengeCoverage(raw.coverage),\n    strength: _apsString(raw.strength, 1200),');
replace('    plan: normalizeAppliedChallengePlan(raw.plan),','    qualityReview: normalizeAppliedChallengeQualityReview(raw.qualityReview),\n    plan: normalizeAppliedChallengePlan(raw.plan),');
replace("    purpose: _apsString(purpose, 40),","    purpose: _apsString(purpose, 40),\n    feedbackContextVersion: purpose === 'feedback' ? 1 : undefined,\n    feedbackPlan: purpose === 'feedback' ? { learningTarget: data.plan.learningTarget, availableTime: data.plan.availableTime, materials: data.plan.materials } : undefined,");
replace("sourceExcerpt: purpose === 'feedback' ? _apsString(opts.sourceExcerpt || data.sourceExcerpt, 4000)","sourceExcerpt: purpose === 'feedback' ? _apsString(opts.sourceExcerpt || data.sourceExcerpt, 5000)");
replace("const sourceExcerpt = _apsString((options && options.sourceExcerpt) || data.sourceExcerpt, 4000);","const sourceExcerpt = _apsString((options && options.sourceExcerpt) || data.sourceExcerpt, 5000);");
replace("'REFERENCE CONTEXT (bounded JSON; validationCycles separate planned checks from student-reported observations):\\n' + appliedChallengePromptContextSnapshot(data, {\n      includeValidationCycles: true,\n      sourceExcerpt,\n      gradeLevel,\n    }),","'Review every supplied evidence row and saved check, including later items. The coverage object records exactly which text fields were shortened; do not infer their missing contents or imply a complete-text review when shortening occurred. Source connections identify the fact and its revision, not verification of the student claim.',\n    'REFERENCE CONTEXT (bounded JSON; validationCycles separate planned checks from student-reported observations):\\n' + JSON.stringify(appliedChallengeFeedbackContext(data, { sourceExcerpt, gradeLevel }).context),");
// A source excerpt's final characters participate in both the request and its stale guard.
replace("const feedback = Object.assign(finalizeAppliedChallengeFeedback(raw, data), {","const feedback = Object.assign(finalizeAppliedChallengeFeedback(raw, data), {\n        coverage: appliedChallengeFeedbackContext(data, { sourceExcerpt: feedbackSourceExcerpt, gradeLevel: feedbackGradeLevel }).coverage,");
// Recovery is session-local, identity-scoped and does not enter saved submissions.
replace("  const updateWorkspace = React.useCallback((key, value) => {",String.raw`  const recoveryScope = JSON.stringify([resourceId, props.activeProfileId || 'session', !!props.previewMode, !!isTeacherMode, !!learnerReadOnly]);
  const [recovery, setRecovery] = React.useState({ scope: recoveryScope, entries: [] });
  const [recoveryMessage, setRecoveryMessage] = React.useState('');
  React.useEffect(() => { setRecovery({ scope: recoveryScope, entries: [] }); setRecoveryMessage(''); }, [recoveryScope]);
  const recoveryEntries = recovery.scope === recoveryScope ? recovery.entries : [];
  const rememberRemoval = entry => {
    setRecovery(old => ({ scope: recoveryScope, entries: [...(old.scope === recoveryScope ? old.entries : []), entry].slice(-10) }));
    setRecoveryMessage('');
  };
  const restoreLastChange = () => {
    if (isTeacherMode || learnerReadOnly || !recoveryEntries.length) return;
    const entry = recoveryEntries[recoveryEntries.length - 1], current = latestDataRef.current;
    if (entry.kind === 'question') {
      if (current.workspace.workingQuestion !== entry.replacement) {
        setRecoveryMessage(tx('applied_challenge.undo.question_changed', 'Your question has changed again. Copy the earlier question below if you want to reuse it; your newer writing will stay in place.')); return;
      }
      commitField('workspace', value => {
        const workspace = normalizeAppliedChallengeWorkspace(value);
        return workspace.workingQuestion === entry.replacement ? { ...workspace, workingQuestion: entry.value, questionAccepted: entry.questionAccepted } : workspace;
      });
      setReviewOpen(false); goToPhase('workingQuestion');
    } else {
      const key = entry.kind === 'evidence' ? 'evidenceLedger' : 'validationCycles';
      const list = current[key], limit = key === 'evidenceLedger' ? 12 : 6;
      if (list.length >= limit || list.some(item => item.id === entry.value.id)) {
        setRecoveryMessage(tx('applied_challenge.undo.no_room', 'There is no room to restore this item, or it is already present. Your saved items have not changed.')); return;
      }
      const insert = items => items.length >= limit || items.some(item => item.id === entry.value.id) ? items : [...items.slice(0, entry.index), entry.value, ...items.slice(entry.index)];
      if (key === 'evidenceLedger') {
        updateEvidenceLedger(insert); setLedgerExpanded(true); setReviewOpen(false); setHintPhase('possibilities');
        setFocusRequest({ elementId: 'aps-ledger-claim-' + entry.value.id });
      } else {
        updateValidationCycles(insert); setChecksExpanded(true); setOpenValidationCycleId(entry.value.id); setReviewOpen(false); goToPhase('testReflection');
      }
    }
    if (current.coachHint) commitField('coachHint', '');
    setRecovery(old => ({ ...old, entries: old.entries.slice(0, -1) }));
    setRecoveryMessage(tx('applied_challenge.undo.restored', 'Restored. Your other work is unchanged.'));
  };
  const useSuggestedQuestion = () => {
    if (isTeacherMode || learnerReadOnly) return;
    const workspace = latestDataRef.current.workspace;
    if (workspace.workingQuestion.trim() && workspace.workingQuestion !== data.brief.drivingQuestion) rememberRemoval({ kind: 'question', value: workspace.workingQuestion, questionAccepted: workspace.questionAccepted, replacement: data.brief.drivingQuestion });
    updateWorkspace('workingQuestion', data.brief.drivingQuestion); goToPhase('workingQuestion');
  };

  const updateWorkspace = React.useCallback((key, value) => {`);
replace("  const removeEvidenceLedgerRow = (id) => {\n    updateEvidenceLedger", "  const removeEvidenceLedgerRow = (id) => {\n    if (isTeacherMode || learnerReadOnly) return;\n    const rows = latestDataRef.current.evidenceLedger, index = rows.findIndex(row => row.id === id);\n    if (index < 0) return;\n    rememberRemoval({ kind: 'evidence', value: rows[index], index });\n    setFocusRequest({ elementId: 'aps-undo' });\n    updateEvidenceLedger");
replace("  const removeValidationCycle = (id) => {\n    updateValidationCycles", "  const removeValidationCycle = (id) => {\n    if (isTeacherMode || learnerReadOnly) return;\n    const cycles = latestDataRef.current.validationCycles, index = cycles.findIndex(cycle => cycle.id === id);\n    if (index < 0) return;\n    rememberRemoval({ kind: 'check', value: cycles[index], index });\n    setFocusRequest({ elementId: 'aps-undo' });\n    updateValidationCycles");
replace("onClick={() => { updateWorkspace('workingQuestion', data.brief.drivingQuestion); goToPhase('workingQuestion'); }}", "onClick={useSuggestedQuestion}");
replace("      <div className='aps-grid'><div",String.raw`      {(recoveryEntries.length > 0 || recoveryMessage) && <aside className='my-3 rounded-xl border border-amber-300 bg-amber-50 p-3 applied-challenge-no-print' aria-label={tx('applied_challenge.undo.heading', 'Recover a recent change')}>
        <p role='status' className='text-sm text-amber-950'>{recoveryMessage || tx('applied_challenge.undo.available', 'A removed item or earlier question is available to restore.')}</p>
        {recoveryEntries.length > 0 && <><div className='mt-2 flex flex-wrap gap-2'><button id='aps-undo' type='button' className='aps-button' onClick={restoreLastChange}>{tx('applied_challenge.undo.action', 'Undo last change')}</button><button type='button' className='aps-button' onClick={() => { setRecovery(old => ({ ...old, entries: old.entries.slice(0, -1) })); setRecoveryMessage(''); }}>{tx('applied_challenge.undo.dismiss', 'Dismiss this recovery')}</button></div>
          <p className='mt-2 text-xs text-slate-700'>{_apsFill(tx('applied_challenge.undo.session', '{count} recent changes available in this open workspace (up to 10). Recovery is cleared when you leave or reload.'), { count: recoveryEntries.length })}</p>
          {recoveryEntries[recoveryEntries.length - 1].kind === 'question' && <details className='mt-2 text-sm'><summary className='cursor-pointer'>{tx('applied_challenge.undo.earlier_question', 'Earlier question')}</summary><p className='whitespace-pre-wrap'>{recoveryEntries[recoveryEntries.length - 1].value}</p></details>}
        </>}
      </aside>}
      <div className='aps-grid'><div`);
// Teacher review has its own permission and request identity. learnerReadOnly
// protects learner fields in authoring mode, not teacher task review.
replace("  const renderWorkspacePhase = (phase) => {",String.raw`  const qualityAi = isTeacherMode && !props.previewMode && allowRuntimeAi ? (callGeminiProp === undefined ? (typeof window !== 'undefined' && window.callGemini) : callGeminiProp) : null;
  const [qualityBusy, setQualityBusy] = React.useState(false);
  const [qualityMessage, setQualityMessage] = React.useState('');
  const qualityToken = React.useRef(0);
  const qualityScopeRef = React.useRef('');
  const qualityScope = recoveryScope + ':' + (typeof qualityAi === 'function');
  qualityScopeRef.current = qualityScope;
  React.useEffect(() => {
    qualityToken.current++; setQualityBusy(false); setQualityMessage('');
    return () => { qualityToken.current++; };
  }, [qualityScope]);
  const qualityFingerprint = appliedChallengeHashText(appliedChallengeQualityContext(data, gradeLevel));
  const qualityOutdated = !!data.qualityReview && data.qualityReview.contextFingerprint !== qualityFingerprint;
  const requestQualityReview = async () => {
    if (typeof qualityAi !== 'function' || qualityBusy || isProcessing) return;
    const token = ++qualityToken.current, scope = qualityScope, fingerprint = qualityFingerprint;
    setQualityBusy(true); setQualityMessage('');
    try {
      const raw = await qualityAi(buildAppliedChallengeQualityPrompt(data, gradeLevel), true);
      if (token !== qualityToken.current || scope !== qualityScopeRef.current) return;
      if (fingerprint !== appliedChallengeHashText(appliedChallengeQualityContext(latestDataRef.current, latestGradeLevelRef.current))) {
        setQualityMessage(tx('applied_challenge.quality.changed', 'The task changed during review. Run the review again for the current version.')); return;
      }
      const review = parseAppliedChallengeQualityReview(raw, data);
      if (!review) throw Error('Incomplete quality review');
      commitField('qualityReview', { ...review, contextFingerprint: fingerprint, createdAt: new Date().toISOString() });
      setQualityMessage(tx('applied_challenge.quality.saved', 'Task review saved. Review the suggestions before editing the challenge.'));
    } catch (_) {
      if (token === qualityToken.current && scope === qualityScopeRef.current) setQualityMessage(tx('applied_challenge.quality.failed', 'The task review could not be completed. Use the three review questions below, or try again.'));
    } finally { if (token === qualityToken.current && scope === qualityScopeRef.current) setQualityBusy(false); }
  };
  const feedbackCoverage = React.useMemo(() => appliedChallengeFeedbackContext(data, { gradeLevel }).coverage, [generatedContent?.data, gradeLevel]);

  const renderWorkspacePhase = (phase) => {`);
replace("          <dl className='mt-3 grid gap-3 text-sm md:grid-cols-2'>","          <p className='mt-3 text-sm text-slate-700'>{appliedChallengeCoverageText(data.feedback.coverage, t)}</p>\n          <dl className='mt-3 grid gap-3 text-sm md:grid-cols-2'>");
replace("<>{renderStress()}<button type='button' onClick={requestFeedback}","<>{renderStress()}<p className='text-sm text-slate-700'>{tx('applied_challenge.coverage.next', 'The next feedback request will include your current writing, source connections, and every saved check.')} {appliedChallengeCoverageText(feedbackCoverage, t)}</p><button type='button' onClick={requestFeedback}");
replace("      {details(tx('applied_challenge.teacher.source', 'Review source connections'), <>",String.raw`      {details(tx('applied_challenge.quality.heading', 'Review task quality'), <>
        <p className='text-sm text-slate-700'>{tx('applied_challenge.quality.note', 'Check whether the task requires lesson reasoning, leaves meaningful choices, and fits the available time and materials. AI suggestions support your judgment; they do not approve the task or verify facts.')}</p>
        <button type='button' className='aps-button' onClick={requestQualityReview} disabled={typeof qualityAi !== 'function' || qualityBusy || isProcessing}>{qualityBusy ? tx('applied_challenge.quality.busy', 'Reviewing task quality…') : tx('applied_challenge.quality.request', 'Get AI task review')}</button>
        {typeof qualityAi !== 'function' && <p className='text-sm text-slate-600'>{tx('applied_challenge.quality.offline', 'AI review is unavailable. You can review the task with the questions below.')}</p>}
        {qualityMessage && <p role='status' className='text-sm text-slate-700'>{qualityMessage}</p>}
        {qualityOutdated && <p role='status' className='rounded-xl bg-amber-50 p-3 text-sm text-amber-950'>{tx('applied_challenge.quality.outdated', 'This review is for an earlier task. Update it after changing the brief, source, settings, or supports.')}</p>}
        {APPLIED_CHALLENGE_QUALITY_KEYS.map(key => {
          const item = data.qualityReview?.checks[key];
          const label = key === 'lessonUse' ? tx('applied_challenge.quality.lesson', 'Lesson reasoning') : key === 'alternatives' ? tx('applied_challenge.quality.choices', 'Meaningful choices') : tx('applied_challenge.quality.feasible', 'Time and materials');
          const question = key === 'lessonUse' ? tx('applied_challenge.quality.lesson_question', 'Could a learner meet the criteria without applying the lesson idea? Tighten the task if so.') : key === 'alternatives' ? tx('applied_challenge.quality.choices_question', 'Can learners compare defensible approaches and explain a real tradeoff?') : tx('applied_challenge.quality.feasible_question', 'Can learners create and check this product with the time, materials, and access they actually have?');
          return <section key={key} className='rounded-xl border p-3'><h3 className='text-sm font-bold'>{label}</h3><p className='mt-2 text-sm text-slate-700'>{question}</p>
            {key === 'lessonUse' && !data.sourceExcerpt.trim() && <p className='mt-2 text-sm text-amber-950'>{tx('applied_challenge.quality.missing_source', 'Source excerpt missing: lesson alignment needs a teacher check against the original lesson.')}</p>}
            {key === 'feasibility' && (!data.plan.availableTime.trim() || !data.plan.materials.trim()) && <p className='mt-2 text-sm text-amber-950'>{tx('applied_challenge.quality.missing_limits', 'Add available time and materials in task settings so feasibility can be reviewed.')}</p>}
            {item && <><p className='mt-3 text-sm font-bold'>{item.status === 'supported' ? tx('applied_challenge.quality.supported', 'AI found supporting task wording') : item.status === 'revise' ? tx('applied_challenge.quality.revise', 'Revision suggested') : tx('applied_challenge.quality.unknown', 'More information needed')}</p><p className='mt-1 whitespace-pre-wrap text-sm'>{item.reason}</p>{item.nextStep && <p className='mt-2 whitespace-pre-wrap text-sm'><strong>{tx('applied_challenge.quality.next', 'Teacher next step:')}</strong> {item.nextStep}</p>}</>}
          </section>;
        })}
      </>)}
      {details(tx('applied_challenge.teacher.source', 'Review source connections'), <>`);
replace("        {data.brief.factSources.map((fact, index) => <section", "        <p className='text-sm text-slate-700'>{tx('applied_challenge.source.boundary', 'Matching a quotation only locates its words. Check that it supports the fact in context before marking lesson facts reviewed. An unmatched quotation may be elsewhere in the full lesson.')}</p>\n        {data.brief.factSources.map((fact, index) => <section");
replace("<p className='text-sm font-bold'>{fact.text}</p>{['sourceQuote'", "<p className='text-sm font-bold'>{fact.text}</p><p className='mt-2 text-sm text-slate-700' role='status'>{appliedChallengeSourceStatusLabel(appliedChallengeSourceReview(data)[index].status, t)}</p>{['sourceQuote'");
// Printed teacher feedback retains the same coverage disclosure as the screen.
replace(" : m.feedback.statusLabel) + text(m.feedback.strength)"," : m.feedback.statusLabel) + text(appliedChallengeCoverageText(m.feedback.coverage, t)) + text(m.feedback.strength)");
fs.writeFileSync(path.join(root,'applied_challenge_source.jsx'),s);
let builder=read('_build_applied_challenge_module.js');
const helperExports=['appliedChallengeSourceReview','appliedChallengeFeedbackContext','appliedChallengeCoverageText','normalizeAppliedChallengeCoverage','appliedChallengeQualityContext','buildAppliedChallengeQualityPrompt','parseAppliedChallengeQualityReview'];
builder=builder.replace("  '  _testing: {',", "  '  coverageText: appliedChallengeCoverageText,',\n  '  _testing: {',\n"+helperExports.map(name=>`  '    ${name}: ${name},',`).join('\n'));
fs.writeFileSync(path.join(root,'_build_applied_challenge_module.js'),builder);
let boundary=read('studio_response_module.js');
boundary=boundary.replace('id studentDraft studentReasoning', 'coverage version workspaceFields evidenceRows validationChecks selfChecks shortenedFields id studentDraft studentReasoning');
fs.writeFileSync(path.join(root,'studio_response_module.js'),boundary);
fs.writeFileSync(path.join(root,'desktop/web-app/public/studio_response_module.js'),boundary);
console.log('Applied pass 3 source, recovery, coverage, quality review and boundary edits.');

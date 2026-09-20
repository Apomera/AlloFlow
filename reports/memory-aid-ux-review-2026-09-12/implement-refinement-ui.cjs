const fs=require('fs'),p='memory_aid_source.jsx';let s=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
function rep(a,b){if(!s.includes(a))throw Error('Missing UI anchor: '+a.slice(0,150));s=s.replace(a,b);}
rep('    onDeleteAttempt, onClearHistory, onSaveRevision, onSaveFollowUp, t,','    onDeleteAttempt, onClearHistory, onSaveRevision, onSaveFollowUp, onFollowUpChange, onResume, recallReadAloud, t,');
rep("        <p role=\"status\" className=\"mt-2 text-sm leading-relaxed text-slate-700\">{tr('practice_hidden_note', 'The facts, mapping, feedback, and creation supports stay hidden until you record what you remember.')}</p>",`        <p className="mt-3 text-base font-bold text-slate-900">{memoryAidRecallQuestion(card) || (unsupported ? tr('recall_legacy', 'Recall the topic you just studied. Returning later? Open Study to identify the topic, then try again without hints.') : tr('practice_recall_question', 'What does the cue help you remember?'))}</p>
        {unsupported && recallReadAloud}
        <p className="mt-2 text-sm text-slate-600">{tr('recall_hidden_short', 'Record your response before revealing the facts.')}</p>`);
rep("{tr('practice_response_mode_legend', 'How will you retrieve what the cue means?')}","{unsupported ? tr('recall_response_mode', 'How will you respond?') : tr('practice_response_mode_legend', 'How will you retrieve what the cue means?')}");
rep("tr('practice_without_question', 'What do you remember about this target?')", "tr('recall_write_answer', 'Your recall response')");
rep("        {summary.complete && <MemoryAidFollowUp card={card} session={session} onChange={onChange}","        {attempt.basisKey !== memoryAidPracticeBasis(card) && <p className=\"mt-3 text-sm text-amber-950\">{tr('review_earlier_cue', 'This attempt used an earlier cue. Try the revised cue to find out how it helps now.')}</p>}\n        {summary.complete && <MemoryAidFollowUp card={card} session={session} onChange={onFollowUpChange || onChange}");
rep("  const disabled = session.followUpSaving === true;", "  const disabled = session.followUpSaving === true;");
rep("{session.followUpSaved ? tr('followup_saved', 'Private practice plan saved.') : ''}","{session.followUpSaving ? tr('followup_autosaving', 'Saving private changes…') : session.followUpError ? tr('followup_error', 'Could not save these changes. Keep this view open and use Save private practice plan to retry.') : session.followUpSaved ? tr('followup_saved', 'Private practice plan saved.') : tr('followup_autosave_note', 'Changes to this explanation and plan save privately in this browser.')}");
rep("{!plan.latest ? tr('overview_new', 'Not practiced yet') : plan.needsPractice", "{plan.earlierCue ? tr('overview_earlier', 'Practiced with an earlier cue — try the revised cue') : plan.contentChanged ? tr('overview_changed_facts', 'The facts changed. Review the new content before practicing.') : !plan.latest ? tr('overview_new', 'Not practiced yet') : plan.needsPractice");
rep('onPersonalize, onRecall, tr }) {','onPersonalize, onRecall, onResume, tr }) {');
rep("      {card.visualImage && !visualMatches &&", "      {reviewPlan.earlierCue && <p className=\"text-sm text-amber-950\">{tr('review_earlier_cue', 'This attempt used an earlier cue. Try the revised cue to find out how it helps now.')}</p>}\n      {lastAttempt && onResume && <button type=\"button\" onClick={onResume} className=\"memory-aid-no-print min-h-11 rounded-xl border border-teal-300 px-4 py-2 text-sm font-bold text-teal-900\">{tr('followup_resume', 'Continue my application and plan')}</button>}\n      {card.visualImage && !visualMatches &&");
rep('  const [studyNavigation, setStudyNavigation]', '  const [reviewQueue, setReviewQueue] = React.useState(null);\n  const followUpWriteRef = React.useRef(Object.create(null));\n  const [studyNavigation, setStudyNavigation]');
rep("  const saveFollowUp = async (card, patch) => {", "  const saveFollowUp = async (card, patch) => {");
let a=s.indexOf('  const saveFollowUp = async (card, patch) => {'),b=s.indexOf('  const deletePracticeAttempt =',a);if(a<0||b<0)throw Error('followup boundary');
s=s.slice(0,a)+`  const patchPrivateFollowUp = async (card, attemptId, patch) => {
    if (isTeacherMode || previewMode || learnerReadOnly) return null;
    const owner = currentPracticeOwnerIdentity;
    let result;
    try { result = await mutateMemoryAidPrivatePractice(resourceKey, { action: 'patch-followup', cardId: card.id, attemptId, patch }, cards, activePracticeProfileId); }
    catch (_) { result = { ok: false, applied: false, scope: 'failed', reason: 'storage-unavailable' }; }
    if (!practiceMutationCanCommit(owner)) return null;
    if (result.ok) { setPrivatePracticeState({ ownerIdentity: owner, cards: result.cards }); reportPracticeStorageScope(result.scope); }
    if (!result.ok || !result.applied) setPracticeStorageWarning(result.reason === 'attempt-tombstoned' || result.reason === 'attempt-missing' ? tr('followup_removed', 'This private attempt is no longer saved. Your current text is still here to copy; saving will not recreate a removed attempt.') : tr('followup_error', 'Could not save these changes. Keep this view open and use Save private practice plan to retry.'));
    return result;
  };
  const saveFollowUp = async (card, patch) => {
    const session = visiblePracticeByCard[card.id];
    if (!session?.attempt || isTeacherMode || previewMode || learnerReadOnly) return;
    const attemptId = session.attempt.id, owner = currentPracticeOwnerIdentity, key = owner + '|' + attemptId;
    const serial = (followUpWriteRef.current[key] || 0) + 1; followUpWriteRef.current[key] = serial;
    updatePracticeSession(card.id, { followUpSaving: true, followUpSaved: false, followUpError: false });
    const result = await patchPrivateFollowUp(card, attemptId, patch);
    if (!practiceMutationCanCommit(owner) || followUpWriteRef.current[key] !== serial || !result) return;
    const saved = result.ok && result.applied, attempt = result.cards?.[card.id]?.find(item => item.id === attemptId);
    setPracticeByCard(previous => previous[card.id]?.attempt?.id !== attemptId ? previous : ({ ...previous, [card.id]: { ...previous[card.id], ...(saved && attempt ? { attempt } : {}), followUpSaving: false, followUpSaved: saved, followUpError: !saved } }));
  };
  const changeFollowUp = (card, patch) => {
    if (isTeacherMode || previewMode) { updatePracticeSession(card.id, patch); return; }
    if (learnerReadOnly) return;
    const next = { ...patch };
    if ('nextReviewDate' in next) next.reviewSchedule = next.nextReviewDate ? 'date' : 'off';
    if (Object.keys(next).some(key => key.startsWith('application'))) {
      next.applicationQuestion = card.applicationQuestion || tr('application_fallback', 'Give a new example of {target}. Explain how the facts help you predict or explain what happens.', { target: card.target });
    }
    updatePracticeSession(card.id, next);
    void saveFollowUp(card, next);
  };
  const adjustReviewDate = async (card, attempt, date) => { await patchPrivateFollowUp(card, attempt.id, { nextReviewDate: date, reviewSchedule: date ? 'date' : 'off' }); };
  const resumeFollowUp = card => {
    const latest = memoryAidReviewPlan(card, privatePracticeByCard[card.id]).latest;
    if (!latest || isTeacherMode || previewMode || learnerReadOnly) return;
    setPracticeOwnerIdentity(currentPracticeOwnerIdentity);
    setPracticeByCard({ [card.id]: { stage: 'review', cardKey: memoryAidPracticeBasis(card), supportMode: latest.supportMode, attempt: latest, followUpSaved: true } });
    navigateStudy(card.id, 'recall', false);
  };

`+s.slice(b);
rep("onSaveFollowUp={(patch) => saveFollowUp(card, patch)}",`onSaveFollowUp={(patch) => saveFollowUp(card, patch)}
                  onFollowUpChange={patch => changeFollowUp(card, patch)}
                  onResume={!isTeacherMode && !previewMode && !learnerReadOnly ? () => resumeFollowUp(card) : null}
                  recallReadAloud={LocalReadAloud && memoryAidRecallQuestion(card) ? <LocalReadAloud text={memoryAidRecallQuestion(card)} t={tProp} voiceSpeed={props.voiceSpeed} voiceVolume={props.voiceVolume} stopPlayback={props.stopPlayback} /> : null}`);
rep("  const idleReadiness = readiness;", "  const idleReadiness = readiness;\n  const previousPlan = memoryAidReviewPlan(card, savedAttempts);");
rep("      {saveEvidence && <p className=\"mt-2 text-xs leading-relaxed text-slate-600\">{tr('practice_privacy_note'", "      {saveEvidence && previousPlan.latest && onResume && <button type=\"button\" onClick={onResume} className=\"mt-3 min-h-11 rounded-xl border border-teal-300 px-3 py-2 text-sm font-bold text-teal-900\">{tr('followup_resume', 'Continue my application and plan')}</button>}\n      {saveEvidence && <p className=\"mt-2 text-xs leading-relaxed text-slate-600\">{tr('practice_privacy_note'");
rep("onRecall={() => navigateStudy(card.id, 'recall', false)} tr={tr}","onRecall={() => navigateStudy(card.id, 'recall', false)} onResume={!isTeacherMode && !previewMode && !learnerReadOnly ? () => resumeFollowUp(card) : null} tr={tr}");
rep("                {isEditing && <details className=\"rounded-xl border border-slate-200 p-3\"><summary",`                {isEditing && <section className="rounded-xl border border-teal-200 p-3"><label className="block text-sm font-bold">{tr('recall_question_editor', 'Question for recall without hints')}<textarea aria-label={tr('recall_question_aria', 'Recall question for {target}', { target: card.target })} value={card.recallQuestion} rows={2} maxLength={1600} onChange={e => updateCard(card.id, { recallQuestion: e.target.value })} className="mt-2 w-full rounded-xl border border-slate-300 p-2 font-normal" /></label><p className="mt-2 text-sm text-slate-600">{tr('recall_question_help', 'Identify the topic or situation without including the facts, mnemonic, or answer. This question also appears on the worksheet without hints.')}</p>{card.recallQuestion.trim() && !memoryAidRecallQuestion(card) && <p role="status" className="mt-2 text-sm text-amber-950">{tr('recall_question_copy', 'This question appears to copy an answer or cue. Rewrite it before using it in recall without hints.')}</p>}</section>}
                {isEditing && <details className="rounded-xl border border-slate-200 p-3"><summary`);
rep("                {data.reflectionLevel !== 'none' && (", "                {!isEditing && memoryAidPracticeCue(card) && <MemoryAidConnectionEditor card={card} tr={tr} readOnly={learnerReadOnly || isTeacherMode || previewMode} onChange={rows => updateCard(card.id, { studentConnections: rows })} />}\n\n                {data.reflectionLevel !== 'none' && (");
// A bounded due-review sequence; no title or cue is exposed during recall.
rep("  if (!resourceActive) return <div role=\"status\"",`  const queueScope = currentPracticeOwnerIdentity + '|' + !!previewMode + '|' + !!learnerReadOnly;
  const queue = reviewQueue?.scope === queueScope ? reviewQueue : null;
  const dueCards = cards.filter(card => memoryAidReviewPlan(card, privatePracticeByCard[card.id]).due && memoryAidPracticeReady(card).ok);
  const queueSession = queue && visiblePracticeByCard[queue.ids[queue.index]];
  const queueCompleted = !!(queueSession?.stage === 'review' && queueSession.attempt && memoryAidPracticeSummary(queueSession.attempt, cardById.get(queue.ids[queue.index])).complete);
  const queueCanMove = !activePracticeCardId || queueCompleted;
  const startDueReview = () => {
    if (!dueCards.length) return;
    setReviewQueue({ scope: queueScope, ids: dueCards.map(card => card.id), index: 0, completed: 0, skipped: 0, done: false });
    navigateStudy(dueCards[0].id, 'recall');
  };
  const advanceDueReview = () => {
    if (!queue || !queueCanMove) return;
    const currentId = queue.ids[queue.index]; let index = queue.index + 1;
    while (index < queue.ids.length && !cardById.has(queue.ids[index])) index++;
    setPracticeByCard(previous => { const next = { ...previous }; delete next[currentId]; return next; });
    setReviewQueue({ ...queue, index, completed: queue.completed + (queueCompleted ? 1 : 0), skipped: queue.skipped + (queueCompleted ? 0 : 1), done: index >= queue.ids.length });
    if (index < queue.ids.length) navigateStudy(queue.ids[index], 'recall');
    else navigateStudy(cardById.has(currentId) ? currentId : cards[0]?.id, 'study');
  };
  const reviewQueueUi = !isTeacherMode && !previewMode && !learnerReadOnly && !isEditing && (queue || (!practiceIsolationActive && dueCards.length)) ? <aside className="memory-aid-no-print mb-4 rounded-xl border border-teal-200 bg-teal-50 p-3" aria-label={tr('due_review_heading', 'Review planned targets')}>
    {!queue ? <><p className="text-sm font-bold text-teal-950">{tr('due_review_count', '{count} targets are ready to revisit.', { count: dueCards.length })}</p><button type="button" onClick={startDueReview} className="mt-2 min-h-11 rounded-xl bg-teal-700 px-4 py-2 font-bold text-white">{tr('due_review_start', 'Practice due targets')}</button></> : queue.done ? <><p role="status" className="text-sm font-bold">{tr('due_review_finished', 'Review finished: {completed} completed, {skipped} skipped.', queue)}</p><button type="button" onClick={() => setReviewQueue(null)} className="mt-2 min-h-11 rounded-xl border border-teal-300 px-3 py-2">{tr('due_review_done', 'Done with this review')}</button></> : <><p className="text-sm font-bold">{tr('due_review_position', 'Planned review {n} of {total}', { n: queue.index + 1, total: queue.ids.length })}</p><p className="mt-1 text-sm">{tr('due_review_support', 'Choose the recall support that is useful for each target. These self-checks are not mastery scores.')}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={!queueCanMove} onClick={advanceDueReview} className="min-h-11 rounded-xl border border-teal-300 bg-white px-3 py-2 disabled:opacity-50">{queueCompleted ? tr('due_review_next', 'Next review target') : tr('due_review_skip', 'Skip this target')}</button><button type="button" onClick={() => setReviewQueue(null)} className="min-h-11 rounded-xl border border-slate-300 px-3 py-2">{tr('due_review_stop', 'Leave review sequence')}</button></div>{!queueCanMove && <p className="mt-2 text-sm">{tr('due_review_finish_attempt', 'Finish or exit this attempt before moving to another target.')}</p>}</>}
  </aside> : null;

  if (!resourceActive) return <div role="status"`);
rep("      {isTeacherMode && !practiceIsolationActive && SharingCheck", "      {reviewQueueUi}\n      {isTeacherMode && !practiceIsolationActive && SharingCheck");
rep("{!isEditing && !practiceIsolationActive && cards.length > 0 && <nav", "{!isEditing && !practiceIsolationActive && (!queue || queue.done) && cards.length > 0 && <nav");
rep("{!practiceIsolationActive && !isEditing && <MemoryAidOverview", "{!practiceIsolationActive && !isEditing && (!queue || queue.done) && <MemoryAidOverview");
rep("<style>{'@media print", "<style>{'@media screen { .memory-aid-practice-isolating [hidden] { display:none !important; } } @media print");
fs.writeFileSync(p,s);console.log('Memory Aid recall, autosave, resume, review queue and connection UI written.');

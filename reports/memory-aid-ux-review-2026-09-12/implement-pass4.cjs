const fs=require('fs');
let s=fs.readFileSync('memory_aid_source.jsx','utf8').replace(/\r/g,'');
const replace=(before,after)=>{before=before.replace(/\r/g,'');after=after.replace(/\r/g,'');if(!s.includes(before))throw Error('Missing anchor: '+before.slice(0,100));s=s.replace(before,after);};
replace(`  const laterAttempts = attempts.slice(planIndex + 1);
  const followUp = laterAttempts
    .filter(attempt => plannedAttempt.cueKey && attempt.cueKey && attempt.cueKey !== plannedAttempt.cueKey)
    .at(-1) || null;
  const sameCueAttempts = laterAttempts.filter(attempt => (
    plannedAttempt.cueKey && attempt.cueKey === plannedAttempt.cueKey
  )).length;`.replaceAll('\n','\r\n'),`  // Compare the same targeted fact occurrences and the cue currently being studied.
  // A removed fact is not failed recall, and an older cue is not evidence for a new one.
  const currentFactKeys = _maPracticeFactKeys(_maList(card && (card.essentialFacts || card.facts), 10, 600));
  const contentChanged = !targetFactKeys.every(key => currentFactKeys.includes(key));
  const currentCueKey = memoryAidPracticeCueKey(card);
  const laterAttempts = attempts.slice(planIndex + 1)
    .filter(attempt => targetFactKeys.every(key => attempt.factKeys.includes(key)));
  const followUp = !contentChanged && plannedAttempt.cueKey && currentCueKey !== plannedAttempt.cueKey
    ? laterAttempts.filter(attempt => attempt.cueKey === currentCueKey).at(-1) || null
    : null;
  const sameCueAttempts = contentChanged ? 0 : laterAttempts.filter(attempt => (
    plannedAttempt.cueKey && attempt.cueKey === plannedAttempt.cueKey
  )).length;`.replaceAll('\n','\r\n'));
replace(`    pending: !followUp,`,`    pending: !contentChanged && !followUp,\r\n    contentChanged,\r\n    followUpSupportMode: followUp ? followUp.supportMode : '',`);
replace(`function MemoryAidFollowUp({ card, session, onChange, onSave, tr, saveEvidence }) {`,`function MemoryAidReviewDate({ value, onChange, tr, target }) {
  const label = target ? tr('overview_date_aria', 'Review date for {target}', { target }) : tr('review_date_label', 'Review again on');
  const offsetDate = days => { const date = new Date(); date.setDate(date.getDate() + days); return memoryAidLocalDate(date); };
  const choices = [
    { label: tr('review_date_tomorrow', 'Tomorrow'), value: offsetDate(1) },
    { label: tr('review_date_week', 'In one week'), value: offsetDate(7) },
    { label: tr('review_date_none', 'No date'), value: '' },
  ];
  return <fieldset className="min-w-0 space-y-2" aria-label={label}>
    <legend className="text-sm font-bold text-slate-800">{tr('review_date_label', 'Review again on')}</legend>
    <input type="date" aria-label={label} value={value} onChange={e => onChange(e.target.value)} className="mt-1 block min-h-11 w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal" />
    <div className="flex flex-wrap gap-2">{choices.map(choice => <button key={choice.value || 'none'} type="button" onClick={() => onChange(choice.value)} aria-label={target ? tr('review_date_choice_aria', '{action} for {target}', { action: choice.label, target }) : choice.label} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-teal-900 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">{choice.label}</button>)}</div>
    {!value && <p className="text-xs text-slate-600">{tr('review_date_off', 'No review date set. You can still practice whenever you want.')}</p>}
  </fieldset>;
}
function MemoryAidFollowUp({ card, session, onChange, onSave, tr, saveEvidence }) {`.replaceAll('\n','\r\n'));
replace(`<label className="block text-sm font-bold text-slate-800">{tr('review_date_label', 'Review again on')}<input type="date" aria-label={tr('review_date_label', 'Review again on')} value={date} onChange={e => onChange({ nextReviewDate: e.target.value })} className="mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 font-normal" /></label>`,`<MemoryAidReviewDate value={date} onChange={nextReviewDate => onChange({ nextReviewDate })} tr={tr} />`);
replace(`<label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">{tr('review_date_label', 'Review again on')}<input type="date" aria-label={tr('overview_date_aria', 'Review date for {target}', { target: card.target })} value={plan.date} onChange={e => onAdjustDate(card, plan.latest, e.target.value)} className="min-h-11 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" /></label>`,`<div className="mt-2 max-w-md"><MemoryAidReviewDate value={plan.date} onChange={date => onAdjustDate(card, plan.latest, date)} tr={tr} target={card.target} /></div>`);
replace(`      {revisionState && !revisionState.pending && (`,`      {revisionState && revisionState.contentChanged && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">{tr('revision_earlier_facts_note', 'Your saved goal refers to facts that have changed. It remains in private history. Practice the current facts before setting a new goal; earlier results are not compared here.')}</p>}\r\n      {revisionState && !revisionState.contentChanged && !revisionState.pending && (`);
replace(`tr('practice_revision_result', 'After changing the cue, you recalled {recalled} of {total} targeted facts on a completed attempt. Use the fact-by-fact evidence to decide whether to keep revising.', { recalled: revisionState.recalledAfter, total: revisionState.targetCount })`,`tr('practice_revision_current_result', 'On your latest completed attempt with this cue, your self-check marked {recalled} of {total} targeted facts as recalled. Support: {support}. Use the saved fact checks to decide what to revisit.', { recalled: revisionState.recalledAfter, total: revisionState.targetCount, support: revisionState.followUpSupportMode === 'none' ? tr('practice_without_cue', 'Without hints') : tr('practice_with_cue', 'With my cue') })`);
replace(`{tr('practice_self_check_counts', '{recalled}/{total} recalled · {practice} need practice · {unrated} unchecked',`,`{tr('practice_self_check_count_labels', 'Recalled: {recalled}/{total} · To revisit: {practice} · Unchecked: {unrated}',`);
replace(`{tr('due_review_count', '{count} targets are ready to revisit.', { count: dueCards.length })}`,`{dueCards.length === 1 ? tr('due_review_one', '1 target is ready to revisit.') : tr('due_review_count', '{count} targets are ready to revisit.', { count: dueCards.length })}`);
replace(`                  {revisionState && revisionState.pending && (`,`                  {revisionState && revisionState.contentChanged && <p className="memory-aid-no-print mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{tr('revision_earlier_facts_note', 'Your saved goal refers to facts that have changed. It remains in private history. Practice the current facts before setting a new goal; earlier results are not compared here.')}</p>}\r\n                  {revisionState && revisionState.pending && (`);
replace('    contentChanged,','    contentChanged,\n    cueChanged: !!plannedAttempt.cueKey && currentCueKey !== plannedAttempt.cueKey,');
replace('      {revisionState && revisionState.pending && revisionState.sameCueAttempts > 0 && (', `      {revisionState && revisionState.pending && revisionState.cueChanged && <p role="status" className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs leading-relaxed text-violet-950">{tr('revision_current_cue_waiting', 'Your cue changed. Complete a recall attempt with this cue to compare your targeted facts. Results from earlier cues stay in private history.')}</p>}
      {revisionState && revisionState.pending && !revisionState.cueChanged && revisionState.sameCueAttempts > 0 && (`);
fs.writeFileSync('memory_aid_source.jsx',s.replaceAll('\n','\r\n'));
console.log('Implemented revision evidence checks and review date shortcuts.');

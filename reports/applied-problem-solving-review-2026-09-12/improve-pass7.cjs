const fs=require('fs'),vm=require('vm');const p='applied_challenge_source.jsx';let s=fs.readFileSync(p,'utf8');
if(s.includes('function appliedChallengeReviewFollowups('))throw Error('Pass 7 already applied');
s=s.replace('function appliedChallengeReviewItems(value) {',fs.readFileSync(__dirname+'/pass7-review-helpers.jsx','utf8')+'\nfunction appliedChallengeReviewItems(value, t) {');
s=s.replace("recorded: !!w.evidence.trim() || data.evidenceLedger.some(row => row.claim.trim() && row.evidence.trim())", "recorded: appliedChallengeEvidenceHasNotes(w.evidence, t) || data.evidenceLedger.some(row => row.claim.trim() && appliedChallengeEvidenceHasNotes(row.evidence, t))");
s=s.replace('function appliedChallengeEvidenceLedgerProgress(value) {','function appliedChallengeEvidenceLedgerProgress(value, t) {');
s=s.replace('complete: populated.filter((row) => row.claim.trim() && row.evidence.trim()).length,','complete: populated.filter((row) => row.claim.trim() && appliedChallengeEvidenceHasNotes(row.evidence, t)).length,');
s=s.replace('appliedChallengeEvidenceLedgerProgress(data.evidenceLedger);','appliedChallengeEvidenceLedgerProgress(data.evidenceLedger, t);');
const state="  const [recovery, setRecovery] = React.useState({ scope: recoveryScope, entries: [] });";
s=s.replace(state,`  const [reviewReturn, setReviewReturn] = React.useState(null);
  React.useEffect(() => { setReviewReturn(null); }, [recoveryScope]);
  const editReviewTarget = target => {
    setReviewReturn(recoveryScope); setReviewOpen(false); setFocusMode(true); setExampleOpen(false); setPromptOpen(false);
    if (target.rowId) setLedgerExpanded(true);
    if (target.cycleId) { setChecksExpanded(true); setOpenValidationCycleId(target.cycleId); }
    setHintPhase(target.phase); setFocusRequest({ phase: target.phase, elementId: target.elementId });
  };
`+state);
const idEdits=[
 ["<input type='url' value={artifactLink}","<input id='applied-artifact-url' type='url' value={artifactLink}"],
 ["<select aria-label={_apsFill(tx('applied_challenge.aria.cycle_choice',","<select id={'aps-cycle-choice-' + cycle.id} aria-label={_apsFill(tx('applied_challenge.aria.cycle_choice',"],
 ["<AcTextarea aria-label={_apsFill(tx('applied_challenge.aria.cycle_observed',","<AcTextarea id={'aps-cycle-observed-' + cycle.id} aria-label={_apsFill(tx('applied_challenge.aria.cycle_observed',"],
 ["<select aria-label={_apsFill(tx('applied_challenge.aria.cycle_decision',","<select id={'aps-cycle-decision-' + cycle.id} aria-label={_apsFill(tx('applied_challenge.aria.cycle_decision',"],
 ["<AcTextarea aria-label={_apsFill(tx('applied_challenge.aria.cycle_reasoning',","<AcTextarea id={'aps-cycle-reasoning-' + cycle.id} aria-label={_apsFill(tx('applied_challenge.aria.cycle_reasoning',"],
 ["<select aria-label={_apsFill(tx('applied_challenge.aria.self_check_rating',","<select id={'aps-criterion-' + item.key} aria-label={_apsFill(tx('applied_challenge.aria.self_check_rating',"],
 ["<AcTextarea aria-label={_apsFill(tx('applied_challenge.aria.self_check_note',","<AcTextarea id={'aps-criterion-note-' + item.key} aria-label={_apsFill(tx('applied_challenge.aria.self_check_note',"],
];
for(const [a,b] of idEdits){if(!s.includes(a))throw Error('Missing control '+a);s=s.replace(a,b);}
s=s.replace('const items = appliedChallengeReviewItems(data);','const items = appliedChallengeReviewItems(data, t);\n    const followups = appliedChallengeReviewFollowups(data, t);');
s=s.replace('const editStage = index => { setFocusMode(true); goToStage(index); };',"const editStage = index => editReviewTarget({ phase: APPLIED_CHALLENGE_STAGES[index].phases[0], elementId: 'applied-workspace-' + APPLIED_CHALLENGE_STAGES[index].phases[0] });");
s=s.replace('onClick={() => editStage(item.stage)}','onClick={() => editReviewTarget(appliedChallengeReviewTarget(data, item.id))}');
const point="      {!appliedChallengeHasResponse(data.workspace) && <p role='status'";
const start=s.indexOf(point),end=s.indexOf('\n',start);
if(start<0)throw Error('Review notice missing');
s=s.slice(0,start)+`      {followups.length > 0 && <aside aria-labelledby='aps-next-improvement-heading' className='mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3'>
        <h3 id='aps-next-improvement-heading' className='text-sm font-bold text-orange-950'>{tx('applied_challenge.review_next.heading', 'One place to continue')}</h3>
        <p id='aps-next-improvement-message' className='mt-2 text-sm text-slate-800'>{followups[0].message}</p>
        <button type='button' className='aps-button mt-3' aria-describedby='aps-next-improvement-message' onClick={() => editReviewTarget(followups[0].target)}>{tx('applied_challenge.review_next.open', 'Work on this next')}</button>
        {followups.length > 1 && <details className='mt-2 text-sm'><summary className='min-h-11 cursor-pointer font-semibold'>{_apsFill(tx('applied_challenge.review_next.more', '{count} more places to review'), { count: followups.length - 1 })}</summary><ul className='space-y-2 pb-2'>{followups.slice(1).map(item => <li key={item.id}><button type='button' className='aps-button w-full text-start' onClick={() => editReviewTarget(item.target)}>{item.message}</button></li>)}</ul></details>}
        <p className='mt-2 text-xs text-slate-600'>{tx('applied_challenge.review_next.note', 'These prompts point to missing writing or saved checks. Choose what is useful; they do not grade your reasoning or submit your work.')}</p>
      </aside>}`+s.slice(end);
const evidenceTail="{row.tradeoff}</p>}</article>)}</section>}";
if(!s.includes(evidenceTail))throw Error('Review row footer missing');
s=s.replace(evidenceTail,"{row.tradeoff}</p>}<button type='button' className='aps-button mt-3' onClick={() => editReviewTarget(appliedChallengeReviewTarget(data, 'evidence', row.id))}>{_apsFill(tx('applied_challenge.review_next.edit_row', 'Edit evidence row {n}'), { n: index + 1 })}</button></article>)}</section>}");
const cycleTail="{text || missing}</dd></div>)}</dl></article>)}</section>}";
if(!s.includes(cycleTail))throw Error('Review cycle footer missing');
s=s.replace(cycleTail,"{text || missing}</dd></div>)}</dl><button type='button' className='aps-button mt-3' onClick={() => editReviewTarget(appliedChallengeReviewTarget(data, 'check', cycle.id))}>{_apsFill(tx('applied_challenge.review_next.edit_check', 'Edit check {n}'), { n: index + 1 })}</button></article>)}</section>}");
s=s.replace("{row.note}</p></article>)}</>)}","{row.note}</p><button type='button' className='aps-button mt-3' onClick={() => editReviewTarget(appliedChallengeReviewTarget(data, 'criterion', row.key))}>{tx('applied_challenge.review_next.edit_criterion', 'Review this requirement')}</button></article>)}</>)}");
const banner="      <div className='aps-grid'><div className='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5'>";
s=s.replace(banner,banner+`\n        {!reviewOpen && reviewReturn === recoveryScope && <aside className='mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-orange-50 p-3 applied-challenge-no-print'><p className='text-sm text-orange-950'>{tx('applied_challenge.review_next.editing', 'Editing from your review')}</p><button type='button' className='aps-button' onClick={() => { setReviewReturn(null); setReviewOpen(true); }}>{tx('applied_challenge.review_next.return', 'Return to my review')}</button></aside>}`);
s=s.replace("{complete} of {total} rows have both a claim and support", "{complete} of {total} rows have a claim and written evidence notes");
fs.writeFileSync(p,s);
let build=fs.readFileSync('_build_applied_challenge_module.js','utf8');build=build.replace("  '  _testing: {',","  '  _testing: {',\n  '    appliedChallengeReviewFollowups: appliedChallengeReviewFollowups,',\n  '    appliedChallengeReviewTarget: appliedChallengeReviewTarget,',\n  '    appliedChallengeEvidenceHasNotes: appliedChallengeEvidenceHasNotes,',");fs.writeFileSync('_build_applied_challenge_module.js',build);
const catalog=JSON.parse(fs.readFileSync('ui_strings.js','utf8'));catalog.applied_challenge.review_next ||= {};
const fragment=s.slice(s.indexOf('function appliedChallengeReviewFollowups('),s.indexOf('function appliedChallengeReviewItems('));
for(const m of fragment.matchAll(/tx\('([a-z_]+)',\s*('(?:\\.|[^'\\])*')/g))catalog.applied_challenge.review_next[m[1]]=vm.runInNewContext(m[2]);
for(const m of s.matchAll(/tx\('applied_challenge\.review_next\.([a-z_]+)',\s*('(?:\\.|[^'\\])*')/g))catalog.applied_challenge.review_next[m[1]]=vm.runInNewContext(m[2]);
catalog.applied_challenge.ledger.progress='{complete} of {total} rows have a claim and written evidence notes · {verified} verified · {needsCheck} need checking · {assumptions} assumptions';
for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js'])fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
console.log('Added specific review follow-ups and precise edit targets.');

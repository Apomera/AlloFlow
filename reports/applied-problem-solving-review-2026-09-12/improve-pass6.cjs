const fs=require('fs'),vm=require('vm');
const file='applied_challenge_source.jsx';let s=fs.readFileSync(file,'utf8');
const start=s.indexOf('function AppliedChallengeSourceSearch('),end=s.indexOf('function AppliedChallengeView(',start);
if(start<0||end<0||s.includes('function appliedChallengeAttachReference('))throw Error('Unexpected pass 6 input');
s=s.slice(0,start)+fs.readFileSync(__dirname+'/pass6-search-fragment.jsx','utf8')+'\n'+s.slice(end);
const from=s.indexOf('  const addOutsideReference = '),to=s.indexOf('  const connectLessonFact =',from);
s=s.slice(0,from)+`  const addOutsideReference = (result, rowId = '') => {
    if (isTeacherMode || learnerReadOnly || props.previewMode || !resourceActive) return;
    const current = latestDataRef.current;
    const newId = 'ledger-' + Date.now().toString(36) + '-' + String(++ledgerIdCounterRef.current);
    const attached = appliedChallengeAttachReference(current.evidenceLedger, result, rowId, newId, t);
    if (!attached.ok) { addToast(tx('applied_challenge.search.changed', 'The evidence row changed. Check the row and try adding the reference again.'), 'info'); return; }
    updateEvidenceLedger(rows => { const next = appliedChallengeAttachReference(rows, result, rowId, newId, t); return next.ok ? next.rows : rows; });
    setLedgerExpanded(true); setReviewOpen(false); setFocusMode(true); setHintPhase('possibilities');
    setFocusRequest({ phase: 'possibilities', elementId: (rowId ? 'aps-ledger-evidence-' : 'aps-ledger-claim-') + attached.id });
  };

`+s.slice(to);
const scope="  const [recovery, setRecovery] = React.useState({ scope: recoveryScope, entries: [] });";
if(!s.includes(scope))throw Error('Scope missing');
s=s.replace(scope,`  const sourceSearchSession = React.useRef({ scope: recoveryScope });
  if (sourceSearchSession.current.scope !== recoveryScope || !allowRuntimeAi || learnerReadOnly || isTeacherMode || props.previewMode) sourceSearchSession.current = { scope: recoveryScope };
`+scope);
s=s.replace('<AppliedChallengeSourceSearch key={recoveryScope} t={t}', '<AppliedChallengeSourceSearch key={recoveryScope} session={sourceSearchSession} t={t}');
const textarea="<AcTextarea aria-label={_apsFill(tx('applied_challenge.aria.ledger_evidence',";
if(!s.includes(textarea))throw Error('Evidence textarea missing');
s=s.replace(textarea,"<AcTextarea id={'aps-ledger-evidence-' + row.id} maxLength={2200} aria-label={_apsFill(tx('applied_challenge.aria.ledger_evidence',");
s=s.replace("updateEvidenceLedgerRow(row.id, { evidence: event.target.value })} rows={2}","updateEvidenceLedgerRow(row.id, { evidence: event.target.value })} rows={appliedChallengeEvidenceLinks(row.evidence).length ? 5 : 2}");
const status="                    <label className='block text-xs font-black text-slate-700'>{tx('applied_challenge.ledger.status',";
s=s.replace(status,"                    <AppliedChallengeEvidenceSources evidence={row.evidence} rowId={row.id} t={t} editable={!learnerReadOnly && !isTeacherMode} />\n"+status);
const review="{row.evidence}</p>{row.sourceText &&";
if(!s.includes(review))throw Error('Review evidence missing');
s=s.replace(review,"{row.evidence}</p><AppliedChallengeEvidenceSources evidence={row.evidence} t={t} />{row.sourceText &&");
fs.writeFileSync(file,s);
let builder=fs.readFileSync('_build_applied_challenge_module.js','utf8');builder=builder.replace("  '  _testing: {',","  '  _testing: {',\n  '    appliedChallengeAttachReference: appliedChallengeAttachReference,',\n  '    appliedChallengeEvidenceLinks: appliedChallengeEvidenceLinks,',");fs.writeFileSync('_build_applied_challenge_module.js',builder);
const catalog=JSON.parse(fs.readFileSync('ui_strings.js','utf8'));
for(const [name,a,b] of [['search','function AppliedChallengeSourceSearch(','function AppliedChallengeView('],['source_review','function AppliedChallengeEvidenceSources(','function AppliedChallengeSourceSearch(']]){
 const fragment=s.slice(s.indexOf(a),s.indexOf(b));catalog.applied_challenge[name] ||= {};
 for(const m of fragment.matchAll(/tx\('([a-z_]+)',\s*('(?:\\.|[^'\\])*')/g))catalog.applied_challenge[name][m[1]]=vm.runInNewContext(m[2]);
}
catalog.applied_challenge.search.changed='The evidence row changed. Check the row and try adding the reference again.';
for(const f of ['ui_strings.js','desktop/web-app/public/ui_strings.js'])fs.writeFileSync(f,JSON.stringify(catalog,null,2)+'\n');
console.log('Added source search continuity, existing-row references and source-review links.');

const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require(process.env.SLD_STATE_CORE_PATH || '../maine_sld_state_reference_core.js');
const ids=['criteria','language','intervention','exclusions','special-education','documentation'];
const source=(id='primary-rule')=>({...C.emptySource(),id,title:'Public rule <literal>',url:'https://education.example.gov/sld',effectiveDate:'2025-07-01',checkedDate:'2026-10-04',pageSection:'Section 4',excerpt:'Exact <em>wording</em>\n语言 access and evidence.',transferNotes:'Participant notes stay local.',reviewed:true,reviewedAt:'2026-10-04'});
const withSource=(state='Maine',id='primary-rule')=>C.upsertSource(C.emptyWorkspace(),state,source(id));
const withRecorded=(state='Maine',id='primary-rule',topic='criteria')=>C.recordComparison(C.updateComparison(withSource(state,id),state,topic,{sourceId:id,note:'Observed exact criteria <literal>.',followUp:'Verify source effective date.'}),state,topic);
const unchanged=(workspace,action,pattern)=>{const before=C.serializeWorkspace(workspace);assert.throws(action,pattern);assert.equal(C.serializeWorkspace(workspace),before);};

test('v1 references migrate to v2 with exact source text and six empty topic rows',()=>{
  const oldSource=source();delete oldSource.revision;
  const old={format:C.FORMAT,version:1,activeState:'Vermont',byState:{Maine:{sources:[oldSource],comparison:{criteria:{note:'A v1 extra must not become a checked plan.',status:'recorded'}}},Vermont:{sources:[]}}};
  const migrated=C.parseWorkspace(JSON.stringify(old));
  assert.equal(migrated.version,2);assert.equal(migrated.activeState,'Vermont');
  assert.deepEqual(C.getSources(migrated,'Maine')[0],C.normalizeSource({...oldSource,revision:1}));
  assert.deepEqual(Object.keys(C.getComparison(migrated,'Maine')),ids);
  for(const row of Object.values(C.getComparison(migrated,'Maine')))assert.deepEqual(row,{sourceId:'',note:'',followUp:'',status:'draft',checkedRevision:0,checkedAt:''});
  assert.deepEqual(C.comparisonSummary(migrated,'Maine'),{unstarted:6,draft:0,'follow-up':0,recorded:0,recheck:0});
  assert.deepEqual(C.parseWorkspace(C.serializeWorkspace(migrated)),migrated);
});

test('recorded plan stores explicit participant check and preserves literal notes in a coherent backup',()=>{
  const w=withRecorded(),row=C.getComparison(w,'Maine').criteria;
  assert.equal(row.status,'recorded');assert.equal(row.checkedRevision,1);assert.equal(row.checkedAt,C.today());
  assert.equal(C.comparisonStatus(w,'Maine','criteria'),'recorded');
  assert.deepEqual(C.comparisonSummary(w,'Maine'),{unstarted:5,draft:0,'follow-up':0,recorded:1,recheck:0});
  const restored=C.parseWorkspace(C.serializeWorkspace(w));assert.deepEqual(restored,w);assert.equal(C.getComparison(restored,'Maine').criteria.note,'Observed exact criteria <literal>.');
  assert.equal(Object.hasOwn(restored,'byCase'),false);
});

test('source revisions derive from saved values and incoming counters cannot replace them',()=>{
  let w=withSource(),saved=C.getSources(w,'Maine')[0];assert.equal(saved.revision,1);
  w=C.upsertSource(w,'Maine',{...saved,revision:999});assert.equal(C.getSources(w,'Maine')[0].revision,1);
  w=C.upsertSource(w,'Maine',{...saved,revision:999,excerpt:'New literal wording'});assert.equal(C.getSources(w,'Maine')[0].revision,2);
  w=C.upsertSource(w,'Maine',{...saved,revision:1});assert.equal(C.getSources(w,'Maine')[0].revision,3);
  const current=C.getSources(w,'Maine')[0];w=C.upsertSource(w,'Maine',{...current});assert.equal(C.getSources(w,'Maine')[0].revision,3);
});

test('every stored provenance and review change invalidates a recorded source check',()=>{
  const baseline=withRecorded(),saved=C.getSources(baseline,'Maine')[0];
  const changes={title:'Other title',url:'https://education.example.gov/other',fileName:'other.pdf',effectiveDate:'2025-08-01',checkedDate:'2026-10-03',pageSection:'Section 5',excerpt:'Other wording',transferNotes:'Other note',content:'Other full source text',importMethod:'local-file',fileFormat:'pdf',extractionMethod:'pdf-text',documentPartCount:2,fileSize:42,fileContentHash:'fnv1a:changed',fileLastModified:1234,reviewed:false,reviewedAt:'2026-10-03'};
  for(const [field,value] of Object.entries(changes)){
    const next=C.upsertSource(baseline,'Maine',{...saved,[field]:value});
    assert.equal(C.getSources(next,'Maine')[0].revision,2,field);assert.equal(C.comparisonStatus(next,'Maine','criteria'),'recheck',field);assert.equal(C.getComparison(next,'Maine').criteria.note,C.getComparison(baseline,'Maine').criteria.note,field);
  }
  assert.equal(C.comparisonStatus(baseline,'Maine','criteria'),'recorded');
});

test('source no-op saves preserve current checks and explicit source revisions survive transfer',()=>{
  const w=withRecorded(),same=C.upsertSource(w,'Maine',{...C.getSources(w,'Maine')[0],revision:100000});
  assert.equal(C.comparisonStatus(same,'Maine','criteria'),'recorded');assert.deepEqual(C.getComparison(same,'Maine'),C.getComparison(w,'Maine'));
  assert.deepEqual(C.parseWorkspace(C.serializeWorkspace(same)),same);
});

test('changed source stays stale through backup and explicit recheck requires reviewed wording',()=>{
  const w=withRecorded(),saved=C.getSources(w,'Maine')[0];
  let changed=C.upsertSource(w,'Maine',C.editSource(saved,{excerpt:'Replacement rule wording'}));
  assert.equal(C.comparisonStatus(changed,'Maine','criteria'),'recheck');
  changed=C.parseWorkspace(C.serializeWorkspace(changed));assert.equal(C.comparisonStatus(changed,'Maine','criteria'),'recheck');
  unchanged(changed,()=>C.recordComparison(changed,'Maine','criteria'),/review/i);
  changed=C.upsertSource(changed,'Maine',C.editSource(C.getSources(changed,'Maine')[0],{reviewed:true}));
  assert.equal(C.comparisonStatus(changed,'Maine','criteria'),'recheck');
  changed=C.recordComparison(changed,'Maine','criteria');const row=C.getComparison(changed,'Maine').criteria;
  assert.equal(row.checkedRevision,C.getSources(changed,'Maine')[0].revision);assert.equal(C.comparisonStatus(changed,'Maine','criteria'),'recorded');
});

test('removal retains literal comparison writing and cannot revive a check by reusing a source ID',()=>{
  const before=withRecorded(),oldRow=C.getComparison(before,'Maine').criteria;
  let removed=C.removeSource(before,'Maine','primary-rule');assert.equal(C.getSources(removed,'Maine').length,0);
  assert.equal(C.getComparison(removed,'Maine').criteria.note,oldRow.note);assert.equal(C.getComparison(removed,'Maine').criteria.followUp,oldRow.followUp);
  assert.equal(C.getComparison(removed,'Maine').criteria.checkedRevision,0);assert.equal(C.comparisonStatus(removed,'Maine','criteria'),'recheck');
  removed=C.parseWorkspace(C.serializeWorkspace(removed));removed=C.upsertSource(removed,'Maine',source());assert.equal(C.getSources(removed,'Maine')[0].revision,1);assert.equal(C.comparisonStatus(removed,'Maine','criteria'),'recheck');
  assert.equal(C.comparisonStatus(before,'Maine','criteria'),'recorded');
});

test('topic writing and source selection edits clear prior check while exact no-ops preserve it',()=>{
  const before=withRecorded();assert.deepEqual(C.updateComparison(before,'Maine','criteria',{note:C.getComparison(before,'Maine').criteria.note}),before);
  for(const patch of [{note:'Changed comparison note'},{followUp:'Changed follow-up question'},{sourceId:''}]){
    const changed=C.updateComparison(before,'Maine','criteria',patch),row=C.getComparison(changed,'Maine').criteria;
    assert.equal(row.status,'draft');assert.equal(row.checkedRevision,0);assert.equal(row.checkedAt,'');assert.notEqual(C.comparisonStatus(changed,'Maine','criteria'),'recorded');
  }
  const flagged=C.flagComparison(before,'Maine','criteria');assert.equal(C.comparisonStatus(flagged,'Maine','criteria'),'follow-up');assert.equal(C.getComparison(flagged,'Maine').criteria.note,C.getComparison(before,'Maine').criteria.note);
});

test('recording rejects missing note, missing source and a source from another state without changing work',()=>{
  const w=withSource('Vermont','vermont-rule');
  unchanged(w,()=>C.recordComparison(w,'Maine','criteria'),/source|reference|note/i);
  const cross=C.updateComparison(w,'Maine','criteria',{sourceId:'vermont-rule',note:'This is a note.'});unchanged(cross,()=>C.recordComparison(cross,'Maine','criteria'),/source|reference/i);
  const missingNote=C.updateComparison(w,'Vermont','criteria',{sourceId:'vermont-rule',note:' \n\t'});unchanged(missingNote,()=>C.recordComparison(missingNote,'Vermont','criteria'),/note|wording/i);
});

test('all six topic states remain distinct and state switching does not retag plans',()=>{
  let w=withRecorded();w=C.updateComparison(w,'Maine','language',{note:'Inspect assessment language.'});w=C.flagComparison(w,'Maine','documentation');
  w=C.upsertSource(w,'Vermont',source('vermont-rule'));w=C.updateComparison(w,'Vermont','language',{sourceId:'vermont-rule',note:'Vermont multilingual process.'});w=C.recordComparison(w,'Vermont','language');
  const maine=C.getComparison(w,'Maine'),vermont=C.getComparison(w,'Vermont');w=C.selectState(w,'Vermont');assert.deepEqual(C.getComparison(w,'Maine'),maine);assert.deepEqual(C.getComparison(w,'Vermont'),vermont);
  w=C.selectState(C.parseWorkspace(C.serializeWorkspace(w)),'Maine');assert.equal(w.activeState,'Maine');assert.deepEqual(C.getComparison(w,'Maine'),maine);
  assert.deepEqual(C.comparisonSummary(w,'Maine'),{unstarted:3,draft:1,'follow-up':1,recorded:1,recheck:0});assert.equal(Object.values(C.comparisonSummary(w,'Vermont')).reduce((a,b)=>a+b,0),6);
});

test('comparison writing limits and invalid topic or patch errors preserve existing references and plans',()=>{
  const w=withRecorded();
  unchanged(w,()=>C.updateComparison(w,'Maine','criteria',{note:'x'.repeat(C.LIMITS.comparisonNote+1)}),/exceeds|characters/i);
  unchanged(w,()=>C.updateComparison(w,'Maine','criteria',{followUp:'x'.repeat(C.LIMITS.followUp+1)}),/exceeds|characters/i);
  unchanged(w,()=>C.updateComparison(w,'Maine','unlisted',{note:'unknown'}),/topic/i);
  unchanged(w,()=>C.updateComparison(w,'Maine','criteria',{status:'recorded'}),/Only.*edited/i);
  unchanged(w,()=>C.updateComparison(w,'Maine','criteria',{sourceId:'<img onerror=alert(1)>'}),/identifier/i);
  const exact=C.updateComparison(w,'Maine','language',{note:'x'.repeat(C.LIMITS.comparisonNote),followUp:'y'.repeat(C.LIMITS.followUp)});assert.equal(C.getComparison(exact,'Maine').language.note.length,C.LIMITS.comparisonNote);
});

test('malformed imported check metadata remains a visible recheck with exact participant writing',()=>{
  const w=withRecorded(),input=JSON.parse(C.serializeWorkspace(w));input.byState.Maine.comparison.criteria.checkedRevision='forged';input.byState.Maine.comparison.criteria.checkedAt='not-a-date';input.byState.Maine.comparison.criteria.extra='<script>literal</script>';
  const restored=C.parseWorkspace(JSON.stringify(input)),row=C.getComparison(restored,'Maine').criteria;
  assert.equal(row.checkedRevision,0);assert.equal(row.checkedAt,'');assert.equal(row.note,C.getComparison(w,'Maine').criteria.note);assert.equal(Object.hasOwn(row,'extra'),false);assert.equal(C.comparisonStatus(restored,'Maine','criteria'),'recheck');
});

test('foreign, unsafe and oversize restored bundles reject without replacing an existing plan',()=>{
  const w=withRecorded(),before=C.serializeWorkspace(w),bad=JSON.parse(before);bad.byState.Maine.comparison['not-a-topic']={note:'bad'};
  assert.throws(()=>C.parseWorkspace(JSON.stringify(bad)),/topic/i);
  for(const id of ['with spaces','javascript:alert(1)','<b>id</b>']){const unsafe=JSON.parse(before);unsafe.byState.Maine.comparison.criteria.sourceId=id;assert.throws(()=>C.parseWorkspace(JSON.stringify(unsafe)),/identifier/i);}
  const url=JSON.parse(before);url.byState.Maine.sources[0].url='javascript:alert(1)';assert.throws(()=>C.parseWorkspace(JSON.stringify(url)),/HTTP/i);
  const future=JSON.parse(before);future.version=3;assert.throws(()=>C.parseWorkspace(JSON.stringify(future)),/version|references/i);
  assert.throws(()=>C.parseWorkspace('x'.repeat(C.LIMITS.json+1)),/smaller/i);assert.equal(C.serializeWorkspace(w),before);
});

test('source capacity rejection leaves checked plan and literal source text intact',()=>{
  let w=withRecorded();for(let n=2;n<=4;n++)w=C.upsertSource(w,'Maine',source('rule-'+n));
  const before=C.serializeWorkspace(w);assert.throws(()=>C.upsertSource(w,'Maine',source('overflow-rule')),/four/i);assert.equal(C.serializeWorkspace(w),before);assert.equal(C.comparisonStatus(w,'Maine','criteria'),'recorded');
  assert.equal(C.getSources(w,'Maine')[0].excerpt,'Exact <em>wording</em>\n语言 access and evidence.');
});

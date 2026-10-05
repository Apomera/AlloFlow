const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require(process.env.SLD_STATE_CORE_PATH || '../maine_sld_state_reference_core.js');
const fixture=()=>({...C.emptySource(),title:'State rule <literal>',url:'https://education.example.gov/rules',excerpt:'Section 4\n<em>literal</em>\n multilingual learners: 文本',transferNotes:'Compare exclusionary factors; do not decide the case.',checkedDate:'2026-10-04'});
test('references preserve literal text and independent state records through JSON transfer',()=>{
  let w=C.emptyWorkspace();const maine=fixture(),vermont={...fixture(),id:'vermont-source',effectiveDate:'2025-07-01'};
  w=C.upsertSource(w,'Maine',maine);w=C.upsertSource(w,'Vermont',vermont);w=C.selectState(w,'Vermont');
  const restored=C.parseWorkspace(C.serializeWorkspace(w));assert.deepEqual(restored,w);assert.equal(C.getSources(restored,'Maine')[0].excerpt,maine.excerpt);assert.equal(C.getSources(restored,'Vermont')[0].effectiveDate,'2025-07-01');
  assert.equal(Object.hasOwn(w,'byCase'),false);
});
test('every source edit invalidates manual review, explicit review records date',()=>{
  const s=C.editSource(fixture(),{reviewed:true});assert.equal(s.reviewed,true);assert.equal(s.reviewedAt,C.today());
  for(const k of ['title','url','fileName','effectiveDate','checkedDate','pageSection','excerpt','content','transferNotes']){
    const changed=C.editSource(s,{[k]:s[k]+' changed'});assert.equal(changed.reviewed,false,k);assert.equal(changed.reviewedAt,'',k);
  }
  assert.equal(C.editSource(s,{title:s.title}).reviewed,true);
  assert.throws(()=>C.normalizeSource({...s,excerpt:''}),/Review requires/);
});
test('document extraction retains all text and does not fabricate a reviewed excerpt',()=>{
  const content='# Page 1\n'+ 'x'.repeat(590000)+'\n# Page 2\nEnd';
  const s=C.fromDocument({title:'Rule',fileName:'state.pdf',content,fileFormat:'pdf',extractionMethod:'pdf-text',documentPartCount:2,fileSize:100000,fileContentHash:'fnv1a:abc123',fileLastModified:1710000000000});
  assert.equal(s.content,content);assert.equal(s.excerpt,'');assert.equal(s.checkedDate,'');assert.equal(s.reviewed,false);assert.equal(s.documentPartCount,2);
  assert.equal(s.fileContentHash,'fnv1a:abc123');assert.equal(s.fileLastModified,1710000000000);
  assert.throws(()=>C.fromDocument({content:'x'.repeat(600001)}),/exceeds/);
});
test('JSON expansion cannot create a downloadable backup that exceeds restore limits',()=>{
  let w=C.emptyWorkspace();w=C.upsertSource(w,'Maine',{...fixture(),id:'control-1',content:'\u0000'.repeat(600000)});const before=C.serializeWorkspace(w);
  assert.throws(()=>C.upsertSource(w,'Vermont',{...fixture(),id:'control-2',content:'\u0000'.repeat(100000)}),/backup exceeds/);
  assert.equal(C.serializeWorkspace(w),before);assert.deepEqual(C.parseWorkspace(before),w);
});
test('unsafe URLs, invalid dates, foreign worksheet formats and oversized restores reject',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hi','https://user:secret@site.example','https://example.gov/ private','file:///state.pdf'])assert.equal(C.safeUrl(url),'');
  assert.throws(()=>C.normalizeSource({...fixture(),url:'javascript:alert(1)'}),/HTTP/);
  assert.throws(()=>C.normalizeSource({...fixture(),effectiveDate:'2026-02-30'}),/valid date/);
  assert.throws(()=>C.parseWorkspace('{"format":"worksheet","version":1,"byState":{}}'),/State references/);
  assert.throws(()=>C.parseWorkspace('x'.repeat(C.LIMITS.json+1)),/smaller/);
  const w=C.emptyWorkspace();assert.throws(()=>C.normalizeWorkspace({...w,byState:{__unlisted:{sources:[]}}}),/listed state/);
});
test('bounded source capacity errors leave original work intact',()=>{
  let w=C.emptyWorkspace();for(let i=0;i<4;i++)w=C.upsertSource(w,'Maine',{...fixture(),id:'ref-'+i});const before=C.serializeWorkspace(w);
  assert.throws(()=>C.upsertSource(w,'Maine',{...fixture(),id:'ref-5'}),/four/);assert.equal(C.serializeWorkspace(w),before);
  const next=C.removeSource(w,'Maine','ref-1');assert.equal(C.getSources(next,'Maine').length,3);assert.equal(C.getSources(w,'Maine').length,4);
});
test('search stays in the closed jurisdiction set and discovery snippets remain unreviewed',()=>{
  assert.equal(C.STATES.length,51);
  for(const state of C.STATES)assert.equal(C.searchQuery(state),state+' department of education specific learning disability eligibility requirements official state rule');
  assert.throws(()=>C.searchQuery('Maine student IEP'),/listed state/);
  const rows=C.normalizeSearchResults({results:[{url:'javascript:alert(1)',title:'Bad'},{url:'https://education.example.gov/rule',title:'<strong>Rule</strong>',snippet:'<img onerror=alert(1)>'},{url:'https://education.example.gov/rule',title:'duplicate'}]});
  assert.equal(rows.length,1);assert.equal(rows[0].snippet,'<img onerror=alert(1)>');const s=C.fromSearchResult(rows[0]);assert.equal(s.excerpt,'');assert.equal(s.reviewed,false);assert.equal(s.importMethod,'web-search');
});

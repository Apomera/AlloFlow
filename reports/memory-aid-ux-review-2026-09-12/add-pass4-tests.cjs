const fs=require('fs'),p='tests/memory_aid_refinement_20260919.test.js';
let s=fs.readFileSync(p,'utf8');
if(s.includes('Memory Aid comparable revision evidence'))throw Error('Pass 4 tests already added');
s+=String.raw`

describe('Memory Aid comparable revision evidence',()=>{
 const planned=(c=card(),targets=[0,1])=>completed(c,{id:'revision-plan',factChecks:['practice','practice'],revisionPlan:{strategy:'Make the shape and volume connections clear.',targetFactIndexes:targets,cueBefore:c.aiExample}});
 const storeAttempt=async(c,a)=>H.mutateMemoryAidPrivatePractice('resource:refinement',{action:'upsert-attempt',cardId:c.id,attempt:a},[c],'refinement-learner');
 it('does not treat changed targeted facts as failed recall or a completed revision',()=>{
  const before=card(),after=card({essentialFacts:['A different fact.','A solid has a definite volume.'],studentDraft:'Different cue'});
  const state=H.memoryAidPracticeRevisionState([planned(before),completed(after)],after);
  expect(state).toMatchObject({contentChanged:true,pending:false,followUpAttemptId:'',recalledAfter:0,targetCount:2});
 });
 it('ignores follow-up attempts missing any targeted fact, including duplicate occurrences',()=>{
  const before=card({essentialFacts:['Check the lock.','Check the lock.']}),after={...before,studentDraft:'First check, then check again.'};
  const incompleteFacts=completed({...after,essentialFacts:['Check the lock.']},{id:'missing-occurrence',factChecks:['recalled']});
  expect(H.memoryAidPracticeRevisionState([planned(before),incompleteFacts],after)).toMatchObject({pending:true,contentChanged:false,followUpAttemptId:''});
 });
 it('compares the current cue only, without carrying success to another revision or a reverted cue',()=>{
  const before=card(),v2=card({studentDraft:'A new shape and volume cue'}),v3=card({studentDraft:'An even newer cue'}),plan=planned(before),followUp=completed(v2,{id:'v2-result'});
  expect(H.memoryAidPracticeRevisionState([plan,followUp],v2)).toMatchObject({pending:false,recalledAfter:2,followUpAttemptId:'v2-result',followUpSupportMode:'none'});
  for(const current of [v3,before])expect(H.memoryAidPracticeRevisionState([plan,followUp],current)).toMatchObject({pending:true,followUpAttemptId:'',recalledAfter:0});
 });
 it('uses targeted fact identities across reordering and changes to unrelated facts',()=>{
  const before=card(),after=card({essentialFacts:['A new unrelated fact.','A solid keeps its shape.'],studentDraft:'Shape is the statue.'});
  expect(H.memoryAidPracticeRevisionState([planned(before,[0]),completed(after,{id:'targeted',factChecks:['practice','recalled'],supportMode:'cue'})],after)).toMatchObject({pending:false,contentChanged:false,recalledAfter:1,targetCount:1,followUpSupportMode:'cue'});
 });
 it('shows an earlier-facts explanation instead of a recall result or active goal for changed targets',async()=>{
  const before=card(),after=card({essentialFacts:['A changed shape fact.','A solid has a definite volume.'],studentDraft:'New cue'});
  await storeAttempt(before,planned(before));await storeAttempt(after,completed(after,{id:'after'}));await mount([after]);await click('Try recall');
  expect(host.textContent).toContain('Your saved goal refers to facts that have changed.');expect(host.textContent).not.toContain('your self-check marked');
  await click('Make it mine');expect(host.textContent).toContain('Your saved goal refers to facts that have changed.');expect(host.textContent).not.toContain('Your private revision goal');
 });
 it('identifies support in the current-cue result and requests fresh practice after another cue edit',async()=>{
  const before=card(),after=card({studentDraft:'New shape cue'});await storeAttempt(before,planned(before));await storeAttempt(after,completed(after,{id:'after',supportMode:'cue'}));await mount([after]);await click('Try recall');
  expect(host.textContent).toContain('marked 2 of 2 targeted facts as recalled. Support: With my cue.');
  await click('Make it mine');await input(host.querySelector('textarea[id$="-draft"]'),'Another new cue');await click('Try recall');
  expect(host.textContent).toContain('Complete a recall attempt with this cue');expect(host.textContent).not.toContain('marked 2 of 2 targeted facts');
 });
});

describe('Memory Aid easier private review dates',()=>{
 it('chooses dates from the local calendar across a year boundary and retains an explicit no-date choice',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date(2026,11,31,23,40));
  try{
   await seed([card()]);await mount();await click('Continue my application and plan');const id=saved().solid[0].id;
   await click('Tomorrow');expect(saved().solid[0]).toMatchObject({id,nextReviewDate:'2027-01-01',reviewSchedule:'date',applicationResponse:'Earlier private explanation'});
   await click('In one week');expect(saved().solid[0].nextReviewDate).toBe('2027-01-07');
   await click('No date');expect(saved().solid[0]).toMatchObject({nextReviewDate:'',reviewSchedule:'off'});expect(host.textContent).toContain('No review date set.');
   await act(async()=>root.unmount());host.remove();await mount();await click('Continue my application and plan');
   expect(host.querySelector('[aria-label="Review again on"][type="date"]').value).toBe('');
   await input(host.querySelector('[aria-label="Review again on"][type="date"]'),'2027-02-12');expect(saved().solid[0]).toMatchObject({nextReviewDate:'2027-02-12',reviewSchedule:'date'});expect(saved().solid).toHaveLength(1);
  }finally{vi.useRealTimers();}
 });
 it('lets the overview clear only the chosen target date and removes its due marker',async()=>{
  const cards=[card(),card({id:'second',target:'Second target'})];await seed(cards);await mount(cards);
  const clear=host.querySelector('button[aria-label="No date for A solid keeps its shape"]');expect(clear).toBeTruthy();await act(async()=>clear.click());
  const rows=H.loadMemoryAidPrivatePractice('resource:refinement',cards,'refinement-learner');expect(rows.solid[0].reviewSchedule).toBe('off');expect(rows.second[0].nextReviewDate).toBe('2026-01-01');
  expect(host.textContent).toContain('1 target is ready to revisit.');expect(host.textContent).not.toContain('1 targets are ready');
 });
});
`;
fs.writeFileSync(p,s);console.log('Added eight Memory Aid comparison and calendar regressions.');

const fs=require('fs'),file='memory_aid_source.jsx';let s=fs.readFileSync(file,'utf8');const change=(a,b)=>{if(!s.includes(a))throw Error('Missing recovery anchor '+a.slice(0,80));s=s.replace(a,b);};
change("const combined = existingIndex >= 0\n      ? existing.map((item, index) => index === existingIndex ? attempt : item)", "// A first save can be retried, while later self-check edits preserve\n    // newer follow-up fields already in the store. Tombstones are checked above.\n    const updatedAttempt = existingIndex >= 0 && mutation.selfCheckOnly === true\n      ? normalizeMemoryAidPracticeAttempt({ ...existing[existingIndex], factChecks: attempt.factChecks }, card, 0) : attempt;\n    const combined = existingIndex >= 0\n      ? existing.map((item, index) => index === existingIndex ? updatedAttempt : item)");
change("selfCheckOnly ? { action: 'patch-self-check', cardId: card.id, attemptId: attempt.id, factChecks: attempt.factChecks } : { action: 'upsert-attempt', cardId: card.id, attempt }", "{ action: 'upsert-attempt', cardId: card.id, attempt, selfCheckOnly }");
change("    const result = await patchPrivateFollowUp(card, currentAttempt.id, { revisionDraft: revisionStrategy, revisionPlan: attempt.revisionPlan });", `    let result = await patchPrivateFollowUp(card, currentAttempt.id, { revisionDraft: revisionStrategy, revisionPlan: attempt.revisionPlan });
    // Explicitly committing a goal can retry the first save of a new attempt.
    // Resumed records stay patch-only, and upsert still rejects tombstones.
    if (result?.reason === 'attempt-missing' && !session.resumeFollowUp) {
      const pendingFields = ['applicationQuestion','applicationResponse','applicationRevealed','applicationCheck','nextReviewDate','reviewSchedule'];
      const pending = Object.fromEntries(pendingFields.filter(key => Object.prototype.hasOwnProperty.call(session, key)).map(key => [key, session[key]]));
      const recovery = normalizeMemoryAidPracticeAttempt({ ...attempt, ...pending, revisionDraft: revisionStrategy }, card, 0);
      if (await persistPracticeAttempt(card, recovery)) result = { ok: true, applied: true };
    }`);
fs.writeFileSync(file,s);
const browserFile=__dirname+'/pass3-browser-qa.cjs';s=fs.readFileSync(browserFile,'utf8');s=s.replace("page.getByRole('textbox',{name:/Memory aid for Solids/}).waitFor({state:'visible'})", "page.locator('textarea[id$=\"-draft\"]:visible').waitFor({state:'visible'})");fs.writeFileSync(browserFile,s);
const testFile='tests/memory_aid_refinement_20260919.test.js';s=fs.readFileSync(testFile,'utf8');s+=`
describe('Memory Aid first-save recovery',()=>{
 it('can retry the first failed save through another self-check without replacing saved follow-up fields',async()=>{
  await mount();await click('Try recall');navigator.locks.request.mockRejectedValueOnce(new Error('Temporary storage failure'));await finish();expect(saved().solid).toBeUndefined();
  await act(async()=>host.querySelector('input[aria-label^="Needs more practice for fact 1:"]').click());expect(saved().solid[0].factChecks).toEqual(['practice','recalled']);
  const id=saved().solid[0].id;await H.mutateMemoryAidPrivatePractice('resource:refinement',{action:'patch-followup',cardId:'solid',attemptId:id,patch:{applicationResponse:'Newer private application.',revisionDraft:'Newer private draft.'}},[card()],'refinement-learner');
  await act(async()=>host.querySelector('input[aria-label^="I recalled fact 1:"]').click());expect(saved().solid[0]).toMatchObject({applicationResponse:'Newer private application.',revisionDraft:'Newer private draft.',factChecks:['recalled','recalled']});
 });
 it('can explicitly commit a fresh goal after a first-save failure while retaining local application text',async()=>{
  await mount();await click('Try recall');await click('Start recall practice');await input(host.querySelector('textarea[aria-label^="Recall response"]'),'My fresh recall.');await click('Reveal the facts');
  await act(async()=>host.querySelector('input[aria-label^="Needs more practice for fact 1:"]').click());navigator.locks.request.mockRejectedValueOnce(new Error('Temporary storage failure'));await act(async()=>host.querySelector('input[aria-label^="I recalled fact 2:"]').click());expect(saved().solid).toBeUndefined();
  await input(host.querySelector('[aria-label="Your explanation"]'),'Keep my local application too.');await input(host.querySelector('[aria-label^="Revision goal for"]'),'My recovery goal.');await click('Save goal and revise cue');
  expect(saved().solid[0]).toMatchObject({applicationResponse:'Keep my local application too.',revisionDraft:'My recovery goal.',revisionPlan:{strategy:'My recovery goal.'}});
 });
});
`;fs.writeFileSync(testFile,s);console.log('Preserved first-save recovery and corrected the cue-editor browser selector.');

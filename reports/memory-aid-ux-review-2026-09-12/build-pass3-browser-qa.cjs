const fs=require('fs'),path=require('path');let s=fs.readFileSync(path.join(__dirname,'pass2-browser-qa.cjs'),'utf8');
s=s.replaceAll("'pass2-", "'pass3-").replace("path.join(out,'pass3-baseline.json')","path.join(out,'pass2-baseline.json')");
const marker='  assert.equal(result.errors.length,0);';if(!s.includes(marker))throw Error('Missing final browser assertion');
s=s.replace(marker,`  await page.goto(url+'?pass=3');
  await page.evaluate(async()=>{
   localStorage.clear();sessionStorage.clear();const h=window.AlloModules.MemoryAid._testing,c=window.fixture.data.cards[0];
   for(const [id,date,response] of [['history-old','2026-08-10T12:00:00Z','My earlier application response.'],['history-new','2026-08-11T12:00:00Z','My latest application response.']]){
    const a={...h.createMemoryAidPracticeAttempt(c,{response:'A solid keeps its shape.',supportMode:'none'}),id,createdAt:date,factChecks:['practice','recalled'],applicationQuestion:c.applicationQuestion,applicationResponse:response};
    await h.mutateMemoryAidPrivatePractice('resource:ux-review-fixture',{action:'upsert-attempt',cardId:c.id,attempt:a},window.fixture.data.cards,'memory-ux-review-only');
   }
  });
  await page.reload();await page.setViewportSize({width:390,height:844});
  const openHistory=async()=>{await page.getByRole('button',{name:'Try recall',exact:true}).first().click();await page.locator('summary:visible').filter({hasText:'Private practice attempts'}).click();};
  await openHistory();const old=page.locator('[data-memory-attempt="history-old"]');await old.getByText('Facts and follow-up from this attempt',{exact:true}).click();
  assert((await old.innerText()).includes('My earlier application response.'));assert.equal(await old.locator('time').getAttribute('datetime'),'2026-08-10T12:00:00.000Z');await audit('saved-history-390',true);
  await page.getByRole('button',{name:'Continue saved plan from attempt 1',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'Your explanation',exact:true}).inputValue(),'My earlier application response.');
  await page.getByRole('textbox',{name:/Revision goal for/}).fill('PRIVATE_REVISION_DRAFT: make the shape link clearer.');
  await page.waitForFunction(()=>window.AlloModules.MemoryAid._testing.loadMemoryAidPrivatePractice('resource:ux-review-fixture',window.fixture.data.cards,'memory-ux-review-only').solid.find(a=>a.id==='history-old').revisionDraft.includes('PRIVATE_REVISION_DRAFT'));
  await page.setViewportSize({width:320,height:800});await audit('revision-draft-320',true);
  await page.reload();await openHistory();await page.getByRole('button',{name:'Continue saved plan from attempt 1',exact:true}).click();
  assert((await page.getByRole('textbox',{name:/Revision goal for/}).inputValue()).includes('PRIVATE_REVISION_DRAFT'));assert((await page.locator('body').innerText()).includes('Continuing this plan does not create a new recall attempt.'));
  const draftState=await page.evaluate(()=>{const h=window.AlloModules.MemoryAid._testing,rows=h.loadMemoryAidPrivatePractice('resource:ux-review-fixture',window.fixture.data.cards,'memory-ux-review-only').solid;return {count:rows.length,goal:rows.find(a=>a.id==='history-old').revisionPlan,newer:rows.find(a=>a.id==='history-new').applicationResponse};});assert.deepEqual(draftState,{count:2,goal:null,newer:'My latest application response.'});
  await page.getByRole('button',{name:'Save goal and revise cue',exact:true}).click();await page.locator('textarea[id$="-draft"]:visible').waitFor({state:'visible'});await audit('revision-goal-320',true);
  const finalPlan=await page.evaluate(()=>window.AlloModules.MemoryAid._testing.loadMemoryAidPrivatePractice('resource:ux-review-fixture',window.fixture.data.cards,'memory-ux-review-only').solid.find(a=>a.id==='history-old'));
  assert(finalPlan.revisionPlan.strategy.includes('PRIVATE_REVISION_DRAFT'));assert.equal(finalPlan.applicationResponse,'My earlier application response.');
  result.checks.push('Historical application answers and dates are inspectable; a specific older plan resumes without becoming a new attempt.','Revision drafts survive reload without committing a goal; explicit commitment preserves the application and opens cue editing.');
`+marker);
fs.writeFileSync(path.join(__dirname,'pass3-browser-qa.cjs'),s);console.log('Created saved-history and revision-draft browser checks.');

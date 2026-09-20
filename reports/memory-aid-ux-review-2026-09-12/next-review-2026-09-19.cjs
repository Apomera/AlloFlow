const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true}),result={};
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);
  await page.goto(pathToFileURL(path.join(__dirname,'current-preview.html')).href);
  await page.getByRole('button',{name:'Try recall',exact:true}).first().click();
  await page.getByRole('radio',{name:'Without hints',exact:true}).check();
  await page.getByRole('button',{name:'Start recall practice',exact:true}).click();
  result.unsupportedText=await page.locator('body').innerText();
  result.unsupportedHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  result.firstResponseTop=await page.getByRole('textbox',{name:/Recall response for/}).evaluate(el=>Math.round(el.getBoundingClientRect().top+scrollY));
  await page.screenshot({path:path.join(__dirname,'next-review-recall-390.png'),fullPage:true});
  await page.getByRole('textbox',{name:/Recall response for/}).fill('It keeps its shape and volume.');
  await page.getByRole('button',{name:'Reveal the facts',exact:true}).click();
  for(const radio of await page.getByRole('radio',{name:/I recalled fact/}).all())await radio.check();
  await page.getByText('Use it in a new situation',{exact:true}).click();
  await page.getByRole('textbox',{name:'Your explanation',exact:true}).fill('UNSAVED_APPLICATION_DRAFT');
  result.beforeLeaving=await page.evaluate(()=>JSON.stringify(window.AlloModules.MemoryAid._testing.loadMemoryAidPrivatePractice('resource:ux-review-fixture',window.fixture.data.cards,'memory-ux-review-only')).includes('UNSAVED_APPLICATION_DRAFT'));
  await page.getByRole('button',{name:'Return to card',exact:true}).click();
  await page.reload();
  result.draftRetainedAfterReload=await page.evaluate(()=>JSON.stringify(window.AlloModules.MemoryAid._testing.loadMemoryAidPrivatePractice('resource:ux-review-fixture',window.fixture.data.cards,'memory-ux-review-only')).includes('UNSAVED_APPLICATION_DRAFT'));
  result.returnView=await page.locator('body').innerText();
  await page.getByText('All targets and practice',{exact:true}).click();
  await page.getByLabel('Review date for Solids keep their shape',{exact:true}).fill('2026-09-18');
  await page.waitForFunction(()=>JSON.stringify(window.AlloModules.MemoryAid._testing.loadMemoryAidPrivatePractice('resource:ux-review-fixture',window.fixture.data.cards,'memory-ux-review-only')).includes('2026-09-18'));
  await page.reload();result.dueReturnView=await page.locator('body').innerText();
  await page.screenshot({path:path.join(__dirname,'next-review-due-390.png'),fullPage:true});
  const H=await page.evaluate(()=>{const h=window.AlloModules.MemoryAid._testing,c=window.fixture.data.cards[0],a=h.createMemoryAidPracticeAttempt(c,{response:'Recall',supportMode:'none'});const complete=h.normalizeMemoryAidPracticeAttempt({...a,factChecks:['recalled','recalled'],nextReviewDate:'2026-09-18'},c,0);return {before:window.AlloModules.MemoryAid.exportRules.reviewPlan(c,[complete],'2026-09-19'),after:window.AlloModules.MemoryAid.exportRules.reviewPlan({...c,studentDraft:'A revised cue'},[complete],'2026-09-19')};});result.cueRevisionReviewPlan=H;
  fs.writeFileSync(path.join(__dirname,'next-review-2026-09-19.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

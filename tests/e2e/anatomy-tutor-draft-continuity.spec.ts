import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_TUTOR_DRAFT_QA_OUT||'reports/anatomy-tutor-draft-continuity-2026-09-30';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/tutor-draft-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>{
  await page.evaluate(()=>{
    const runtime=window as any,requests=runtime.__alloAnatomyAiRequests;
    const entries=requests instanceof Map?[...requests.values()]:Object.values(requests||{});
    for(const request of entries as any[])if(request?.timer)clearTimeout(request.timer);
    if(runtime.__alloAnatomyAiRequest?.timer)clearTimeout(runtime.__alloAnatomyAiRequest.timer);
    runtime.__alloAnatomyAiRequests=null;runtime.__alloAnatomyAiRequest=null;runtime.__alloAnatomyAiPending=null;
  });
  await harness.destroy(page);
});

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
const requestCount=(page:Page)=>page.evaluate(()=>(window as any).__tutorDraftMock.requests.length);
async function reply(page:Page,index:number,text:string,reject=false){
  await page.evaluate(({index,text,reject})=>{
    const request=(window as any).__tutorDraftMock.requests[index];
    if(!request)throw Error('No mocked Tutor request at index '+index);
    if(reject)request.reject(Error(text));else request.resolve({text});
  },{index,text,reject});
}
async function openDetails(details:Locator){
  if(!await details.evaluate(element=>(element as HTMLDetailsElement).open))await details.locator(':scope > summary').click();
}
async function capture(page:Page,locator:Locator,path:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();
  if(!box)throw Error('Screenshot target is not visible: '+path);
  await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{
    await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-100)));
    await locator.screenshot({path});
  }finally{await page.setViewportSize({width,height:1000});}
}
async function scan(page:Page,record:any,width:number,theme:string,locale:string){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async()=>{
    const result=await (window as any).axe.run({include:[['[data-anatomy-tutor-panel]'],['[data-anatomy-study-controls]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  });
  record.scans.push({width,theme,locale,dimensions,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);
}
async function installArabic(page:Page){
  const dict=JSON.parse(await readFile('lang/arabic.js','utf8'));
  await page.evaluate(dict=>{
    document.documentElement.dir='rtl';const ctx=(window as any).__ctx;
    ctx.t=(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback;
    ctx.updateMulti('anatomy',{_readingMode:true});
  },dict);
  return dict.stem.anatomy;
}

test('Tutor preserves draft context, protects new writing and makes the empty lesson actionable',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[]};validation.tutor=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:1000});
  const originalQuestion='What does this structure do?',editedQuestion=originalQuestion+'\nHow does it help the body?';
  const work={
    _structureNotes:{kidneys:'My saved explanation of kidney filtration.',heart:'My saved explanation of circulation.'},
    _structureConfidence:{kidneys:'learning',heart:'practice'},_confidenceAt:{kidneys:Date.now(),heart:Date.now()},
    _retrievalEvidence:{kidneys:{attempts:3,correct:2},heart:{attempts:1,correct:0}}
  };
  await harness.mount(page,{anatomy:{
    _activeTab:'aiTutor',system:'organs',view:'posterior',selectedStructure:'kidneys',complexity:3,
    _bodyView3d:false,_startHereDismissed:true,_aiConversationBand:'g912',_aiLoading:true,
    _aiRequestToken:'saved-request-with-no-live-owner',_aiInput:'',
    _aiMessages:[{role:'user',text:originalQuestion,systemId:'organs',structureId:'kidneys'}],...work
  }},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{
    const runtime=window as any,mock=runtime.__tutorDraftMock={requests:[] as any[],announcements:[] as string[]};
    runtime.__ctx.callGemini=(prompt:string)=>new Promise((resolve,reject)=>mock.requests.push({prompt,resolve,reject}));
    runtime.__ctx.announceToSR=(message:string)=>mock.announcements.push(message);
    runtime.__ctx.gradeLevel='9';runtime.__ctx.gradeBand='g912';runtime.__ctx.updateMulti('anatomy',{});
  });
  const panel=page.locator('[data-anatomy-tutor-panel]'),input=panel.locator('[data-anatomy-tutor-input]');
  const context=panel.locator('[data-anatomy-tutor-draft-context]');
  const reference=panel.locator('[data-anatomy-tutor-reference]');
  const starters=panel.locator('.anatomy-tutor-starters'),starterButtons=panel.locator('[data-anatomy-tutor-draft]');
  const search=page.locator('#anatomy-global-search-input');
  const kidneyContext={version:1,systemId:'organs',structureId:'kidneys',band:'g912'};
  const heartContext={version:1,systemId:'circulatory',structureId:'heart',band:'g912'};
  await expect(panel.locator('[data-anatomy-tutor-interrupted]')).toBeVisible();
  await expect(panel.locator('[data-anatomy-tutor-log]')).toHaveAttribute('aria-busy','false');

  // Use the real controls to leave the original kidney lesson and select the heart.
  await page.locator('#anatomy-study-system').selectOption('circulatory');
  const moreControls=page.locator('[data-anatomy-study-controls-toggle]');
  await expect(moreControls).toHaveAttribute('aria-expanded','false');
  await moreControls.click();await expect(moreControls).toHaveAttribute('aria-expanded','true');
  await expect(search).toBeVisible();
  await search.fill('heart');await expect(search).toHaveAttribute('aria-expanded','true');await search.press('Enter');
  await expect(page.locator('[data-anatomy-structure-detail]')).toHaveAttribute('data-anatomy-structure-detail','heart');
  await page.locator('#anatomy-mobile-activity').selectOption('aiTutor');
  await expect(moreControls).toHaveAttribute('aria-expanded','true');
  await moreControls.click();await expect(moreControls).toHaveAttribute('aria-expanded','false');
  await expect(panel.locator('.anatomy-tutor-context')).toContainText('Heart');
  await panel.locator('[data-anatomy-tutor-draft-again="interrupted"]').focus();
  await panel.locator('[data-anatomy-tutor-draft-again="interrupted"]').press('Enter');
  await expect(input).toBeFocused();await expect(input).toHaveValue(originalQuestion);
  await expect(context).toContainText('Kidneys');
  expect((await state(page))._aiDraftContext).toEqual(kidneyContext);
  expect((await state(page)).selectedStructure).toBe('heart');
  expect(await requestCount(page)).toBe(0);
  const beforeEdit=await state(page);
  await input.fill(editedQuestion);
  expect((await state(page))._aiDraftContext).toEqual(kidneyContext);
  expect((await state(page))._aiDraftRevision).toBeGreaterThan(beforeEdit._aiDraftRevision);
  await expect(panel).toHaveAttribute('data-anatomy-tutor-revision',/^\d+$/);
  await capture(page,panel,out+'/draft-context-phone.png');
  await input.press('Enter');await expect.poll(()=>requestCount(page)).toBe(1);
  const firstPrompt=await page.evaluate(()=>(window as any).__tutorDraftMock.requests[0].prompt);record.retryPrompt=firstPrompt;
  expect(firstPrompt).toContain('Lesson context: Kidneys.');expect(firstPrompt).not.toContain('Lesson context: Heart.');
  expect(firstPrompt).toContain('Student question: '+editedQuestion);
  const sent=await state(page);expect(sent._aiMessages.at(-1)).toMatchObject({role:'user',text:editedQuestion,systemId:'organs',structureId:'kidneys'});
  expect(sent.selectedStructure).toBe('heart');
  await reply(page,0,'Unavailable in this browser mock',true);
  const lesson=panel.locator('[data-role="ai"][data-anatomy-tutor-message="lesson"]');
  await expect(lesson).toBeVisible();await expect(lesson.locator('[data-anatomy-tutor-message-context]')).toContainText('Kidneys');
  const retry=lesson.locator('[data-anatomy-tutor-draft-again]');

  // New writing makes both kinds of draft insertion unavailable until explicitly cleared.
  const heartQuestion='How do heart valves keep blood moving?';await input.fill(heartQuestion);
  await openDetails(starters);await expect(starterButtons).toHaveCount(3);
  for(const button of await starterButtons.all())await expect(button).toBeDisabled();
  await expect(retry).toBeDisabled();await expect(input).toHaveValue(heartQuestion);
  await panel.locator('[data-anatomy-tutor-clear-draft]').click();
  await expect(input).toBeFocused();await expect(input).toHaveValue('');
  expect((await state(page))._aiDraftContext).toBeNull();
  for(const button of await starterButtons.all())await expect(button).toBeEnabled();
  await starterButtons.nth(1).click();await expect(input).toBeFocused();await expect(input).toHaveValue(/Heart/);
  expect(await requestCount(page)).toBe(1);
  await panel.locator('[data-anatomy-tutor-clear-draft]').click();await expect(input).toHaveValue('');
  await retry.click();await expect(input).toBeFocused();await expect(context).toContainText('Kidneys');
  await input.fill(heartQuestion);expect((await state(page))._aiDraftContext).toEqual(kidneyContext);
  await panel.locator('[data-anatomy-tutor-use-current]').click();await expect(input).toBeFocused();await expect(input).toHaveValue(heartQuestion);
  await expect(context).toContainText('Heart');expect((await state(page))._aiDraftContext).toEqual(heartContext);
  await panel.locator('[data-anatomy-tutor-send]').click();await expect.poll(()=>requestCount(page)).toBe(2);
  const heartPrompt=await page.evaluate(()=>(window as any).__tutorDraftMock.requests[1].prompt);record.heartPrompt=heartPrompt;
  expect(heartPrompt).toContain('Lesson context: Heart.');expect(heartPrompt).toContain('Student question: '+heartQuestion);

  // Clearing an active chat preserves a newer draft and its context; the old request cannot refill the log.
  const newerDraft='My next question stays saved after clearing the chat.';await input.fill(newerDraft);
  const beforeClear=await state(page);record.beforeClear=beforeClear;
  expect(beforeClear._aiDraftContext).toEqual(heartContext);
  await expect(panel.locator('[data-anatomy-tutor-stop]')).toBeVisible();
  await panel.locator('[data-anatomy-tutor-clear]').focus();await panel.locator('[data-anatomy-tutor-clear]').press('Enter');
  await expect(input).toBeFocused();await expect(input).toHaveValue(newerDraft);
  await expect(panel.locator('[data-anatomy-tutor-log]')).toHaveAttribute('aria-busy','false');
  await expect(panel.locator('[data-anatomy-tutor-stop]')).toHaveCount(0);
  const cleared=await state(page);expect(cleared._aiMessages).toEqual([]);expect(cleared._aiDraftContext).toEqual(beforeClear._aiDraftContext);
  const announcementsAfterClear=await page.evaluate(()=>(window as any).__tutorDraftMock.announcements.slice());
  await reply(page,1,'Late reply that should never replace the new draft');
  await expect(panel.locator('[data-role="ai"]')).toHaveCount(0);expect((await state(page))._aiMessages).toEqual([]);
  expect(await page.evaluate(()=>(window as any).__tutorDraftMock.announcements)).toEqual(announcementsAfterClear);
  await expect(input).toHaveValue(newerDraft);
  for(const button of await starterButtons.all())await expect(button).toBeDisabled();
  await capture(page,panel,out+'/recovery-phone.png');

  // The empty lesson opens a usable search, and choosing a structure preserves all saved writing.
  await page.locator('#anatomy-study-system').selectOption('organs');
  await openDetails(reference);await expect(reference.locator('[data-anatomy-tutor-lesson="empty"]')).toBeVisible();
  await reference.locator('[data-anatomy-tutor-choose-structure]').focus();await reference.locator('[data-anatomy-tutor-choose-structure]').press('Enter');
  await expect(search).toBeVisible();await expect(search).toBeFocused();
  await expect(page.locator('[data-anatomy-tool]')).toHaveAttribute('data-anatomy-tab','explore');
  await search.fill('kidneys');await expect(search).toHaveAttribute('aria-expanded','true');await search.press('Enter');
  await expect(page.locator('[data-anatomy-structure-detail]')).toHaveAttribute('data-anatomy-structure-detail','kidneys');
  await page.locator('#anatomy-mobile-activity').selectOption('aiTutor');await expect(input).toHaveValue(newerDraft);
  await expect(context).toContainText('Heart');expect((await state(page))._aiDraftContext).toEqual(heartContext);
  await openDetails(reference);await expect(reference.locator('[data-anatomy-tutor-lesson="kidneys"]')).toBeVisible();
  await openDetails(reference.locator('[data-anatomy-tutor-reflection]'));
  await expect(reference.locator('#anatomy-own-words-kidneys')).toHaveValue(work._structureNotes.kidneys);
  for(const [key,value] of Object.entries(work))expect((await state(page))[key]).toEqual(value);
  record.beforeScans=await state(page);

  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,390,768,1440])for(const theme of themes){
    await scan(page,record,width,theme,'en');
    if(width===390&&theme==='light')await capture(page,panel,out+'/after-phone.png');
    if(width===390&&theme==='dark')await capture(page,panel,out+'/after-dark.png');
    if(width===1440&&theme==='light')await capture(page,panel,out+'/after-desktop.png');
  }
  const arabic=await installArabic(page);
  await expect(panel.locator('[data-anatomy-tutor-clear-draft]')).toHaveText(arabic.tutor_draft_clear);
  await expect(panel.locator('[data-anatomy-tutor-use-current]')).toHaveText(arabic.tutor_draft_current);
  await expect(context).toContainText(arabic.tutor_draft_context_help);
  await expect(input).toHaveAttribute('dir','auto');
  await expect(reference.locator(':scope > summary')).toHaveText(arabic.tutor_flow_reference);
  record.readingFonts=await panel.locator('p,button,summary,label,textarea').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,id:element.id,text:element.textContent?.trim().slice(0,70),size:parseFloat(getComputedStyle(element).fontSize)})));
  for(const font of record.readingFonts)expect(font.size).toBeGreaterThanOrEqual(17);
  for(const theme of themes){
    await scan(page,record,320,theme,'ar-larger');
    if(theme==='light')await capture(page,panel,out+'/after-arabic.png');
  }
  record.finalState=await state(page);record.requests=await requestCount(page);
  for(const [key,value] of Object.entries(work))expect(record.finalState[key]).toEqual(value);
  expect(record.finalState._aiInput).toBe(newerDraft);expect(record.finalState._aiMessages).toEqual([]);
  expect(record.finalState._aiDraftContext).toEqual(record.beforeScans._aiDraftContext);
  expect(record.requests).toBe(2);expect(record.scans).toHaveLength(15);
  expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);expect(record.errors).toEqual([]);
});

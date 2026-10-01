import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_GUIDANCE_QA_OUT||'reports/anatomy-guidance-2026-10-01';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];
const skeletalIds=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const allViewed=Object.fromEntries(skeletalIds.map(id=>[id,true]));
const allMastered=Object.fromEntries(skeletalIds.map(id=>[id,'mastered']));

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,timeout:300000});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/guidance-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>{if(page)await harness.destroy(page);});

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
async function frame(page:Page){
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
}
async function openDashboard(page:Page){
  const dashboard=page.locator('[data-anatomy-study-dashboard]');
  if(!await dashboard.isVisible()){
    const controls=page.locator('.anatomy-explorer-settings-toggle');
    await expect(controls).toBeVisible();
    if(await controls.getAttribute('aria-expanded')==='false')await controls.click();
  }
  await expect(dashboard).toBeVisible();
  if(!await dashboard.evaluate(element=>(element as HTMLDetailsElement).open))await dashboard.locator('[data-anatomy-study-dashboard-summary]').click();
  await expect(dashboard.locator('[data-anatomy-study-dashboard-content]')).toBeVisible();return dashboard;
}
async function selectMode(page:Page,mode:string){
  if(await page.locator('#anatomy-mobile-activity').isVisible())await page.locator('#anatomy-mobile-activity').selectOption(mode);
  else await page.locator('#anatomy-mode-tab-'+mode).click();
}
function quizWork(s:any){return {index:s.quizIdx,score:s.quizScore,feedback:s.quizFeedback,attempts:s._quizAttempts,question:s._quizQuestion,seed:s._quizSeed};}
function learningWork(s:any){return {notes:s._structureNotes,tutorDraft:s._aiInput,tutorContext:s._aiDraftContext,tutorRevision:s._aiDraftRevision,tutorMessages:s._aiMessages,reviewRound:s._flashcardRounds?.['skeletal:3:review']};}
async function capture(page:Page,locator:Locator,path:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();
  if(!box)throw Error('Screenshot target is not visible: '+path);
  await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{
    await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-100)));
    const clip=await locator.evaluate(element=>{
      const rect=element.getBoundingClientRect(),root=document.documentElement,body=document.body;
      const rightBound=Math.min(innerWidth,Math.max(root.scrollWidth,body.scrollWidth)-scrollX);
      const bottomBound=Math.min(innerHeight,Math.max(root.scrollHeight,body.scrollHeight)-scrollY);
      const x=Math.max(0,Math.floor(rect.left-6)),y=Math.max(0,Math.floor(rect.top-6));
      return {x,y,width:Math.min(rightBound,Math.ceil(rect.right+6))-x,height:Math.min(bottomBound,Math.ceil(rect.bottom+6))-y};
    });
    if(clip.width<=0||clip.height<=0)throw Error('Screenshot target is outside the viewport: '+path);
    await page.screenshot({path,clip});
  }finally{await page.setViewportSize({width,height:1000});}
}
async function scan(page:Page,record:any,width:number,theme:string,locale:string,area:string){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async()=>{
    const result=await (window as any).axe.run({include:[['[data-anatomy-study-dashboard]'],['[data-anatomy-guidance]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  });
  const overflow=await page.locator('[data-anatomy-study-dashboard]').evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth}));
  const targets=await page.locator('[data-anatomy-study-dashboard] button,[data-anatomy-study-dashboard-summary]').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({text:element.textContent?.trim(),height:element.getBoundingClientRect().height,width:element.getBoundingClientRect().width})));
  const layout=await page.locator('[data-anatomy-study-dashboard]').evaluate(element=>{
    const metrics=(node:Element)=>{
      const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
      return {text:node.textContent?.trim(),bounds:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height},clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,display:style.display,overflowX:style.overflowX,overflowY:style.overflowY,maxHeight:style.maxHeight};
    };
    const grid=element.querySelector('.anatomy-metric-grid')!,challenge=element.querySelector('.anatomy-challenge-strip')!;
    return {metricGrid:metrics(grid),metricCards:Array.from(grid.querySelectorAll('.anatomy-metric')).map(metrics),challengeStrip:metrics(challenge),challengeItems:Array.from(challenge.children).map(metrics)};
  });
  record.scans.push({width,theme,locale,area,dimensions,overflow,targets,layout,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
  for(const target of targets){expect(target.height,target.text).toBeGreaterThanOrEqual(44);expect(target.width,target.text).toBeGreaterThanOrEqual(44);}
  expect(layout.metricCards).toHaveLength(6);
  for(const region of [layout.metricGrid,layout.challengeStrip]){
    expect(region.scrollWidth,region.text).toBeLessThanOrEqual(region.clientWidth+1);
    expect(region.scrollHeight,region.text).toBeLessThanOrEqual(region.clientHeight+1);
  }
  for(const [parent,children] of [[layout.metricGrid,layout.metricCards],[layout.challengeStrip,layout.challengeItems]] as const){
    for(const child of children){
      expect(child.bounds.left,child.text).toBeGreaterThanOrEqual(parent.bounds.left-1);
      expect(child.bounds.right,child.text).toBeLessThanOrEqual(parent.bounds.right+1);
      expect(child.bounds.top,child.text).toBeGreaterThanOrEqual(parent.bounds.top-1);
      expect(child.bounds.bottom,child.text).toBeLessThanOrEqual(parent.bounds.bottom+1);
      expect(child.scrollWidth,child.text).toBeLessThanOrEqual(child.clientWidth+1);
      expect(child.scrollHeight,child.text).toBeLessThanOrEqual(child.clientHeight+1);
    }
  }
}
async function installArabic(page:Page){
  const dict=JSON.parse(await readFile('lang/arabic.js','utf8'));
  await page.evaluate(dict=>{
    document.documentElement.lang='ar';document.documentElement.dir='rtl';const ctx=(window as any).__ctx;
    ctx.t=(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback;
    ctx.updateMulti('anatomy',{_readingMode:true});
  },dict);
  return dict.stem.anatomy;
}
async function readingFonts(page:Page){return page.locator('[data-anatomy-study-dashboard] summary,[data-anatomy-study-dashboard] p,[data-anatomy-study-dashboard] button,[data-anatomy-study-dashboard] span,[data-anatomy-study-dashboard] bdi,[data-anatomy-study-dashboard] strong,[data-anatomy-guidance-title]').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,text:element.textContent?.trim().slice(0,70),size:parseFloat(getComputedStyle(element).fontSize)})));}
async function holdGuidanceFocus(page:Page){
  await page.evaluate(()=>{
    const w=window as any,saved=w.__guidanceTimers={native:w.setTimeout,pending:[]};
    w.setTimeout=function(callback:any,delay:any,...args:any[]){
      if(delay===0&&typeof callback==='function'){saved.pending.push({callback,args});return -saved.pending.length;}
      return saved.native.call(w,callback,delay,...args);
    };
  });
}
async function restoreTimers(page:Page){await page.evaluate(()=>{const w=window as any;if(w.__guidanceTimers)w.setTimeout=w.__guidanceTimers.native;});}
async function flushHeldFocus(page:Page){
  await page.evaluate(()=>{const w=window as any,pending=w.__guidanceTimers.pending.splice(0);for(const timer of pending)timer.callback.apply(w,timer.args);});
  await page.waitForTimeout(250);
}
async function removeTimers(page:Page){await page.evaluate(()=>{const w=window as any,saved=w.__guidanceTimers;if(saved){w.setTimeout=saved.native;delete w.__guidanceTimers;}});}

test('Guidance resumes recall, explains review timing and recovers an empty view without losing saved work',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[]};validation.guidance=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  const now=Date.now();
  const savedRound={context:'skeletal:3:review:'+skeletalIds.join(','),deckIds:['ribs'],index:0,rated:{}};
  await harness.mount(page,{anatomy:{
    _activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,_tourCompleted:true,
    _structuresViewed:allViewed,_structureConfidence:allMastered,_confidenceAt:Object.fromEntries(skeletalIds.map(id=>[id,now])),_totalCorrect:0,
    _structureNotes:{ribs:'The ribs protect the chest. شرح محفوظ.'},_flashcardRounds:{'skeletal:3:review':savedRound},
    _aiInput:'How does this structure protect nearby organs?',_aiDraftContext:{version:1,systemId:'skeletal',structureId:'ribs',band:'g912'},_aiDraftRevision:2,_aiConversationBand:'g912',
    _aiMessages:[{role:'user',text:'My saved Tutor question.',systemId:'skeletal',structureId:'ribs',band:'g912'}]
  }},undefined,{expectCanvas:false});
  await frame(page);
  let dashboard=await openDashboard(page);
  const guidance=page.locator('[data-anatomy-guidance]'),action=guidance.locator('[data-anatomy-guidance-action]');
  await expect(guidance).toHaveAttribute('data-anatomy-guidance','quiz');
  await action.focus();await action.press('Enter');
  const panel=page.locator('[data-anatomy-quiz-panel]'),feedback=page.locator('[data-anatomy-quiz-feedback]');
  await expect(panel).toBeFocused();await panel.locator('[data-anatomy-quiz-option]').first().click();await expect(feedback).toBeFocused();
  const answered=quizWork(await state(page)),savedWork=learningWork(await state(page));record.answeredQuiz=answered;
  expect(answered.attempts).toBe(1);expect(answered.feedback).toBeTruthy();
  await selectMode(page,'explore');
  await page.evaluate(allMastered=>(window as any).__ctx.updateMulti('anatomy',{_structureConfidence:allMastered}),allMastered);
  dashboard=await openDashboard(page);await expect(guidance).toHaveAttribute('data-anatomy-guidance','quiz');
  await expect(action).toHaveText('Open quiz');await action.click();await expect(feedback).toBeFocused();
  expect(quizWork(await state(page))).toEqual(answered);expect(learningWork(await state(page))).toEqual(savedWork);record.resumedQuiz=quizWork(await state(page));

  await selectMode(page,'explore');
  await page.evaluate(({allMastered,now})=>(window as any).__ctx.updateMulti('anatomy',{_structureConfidence:{...allMastered,ribs:'learning'},_confidenceAt:{...Object.fromEntries(Object.keys(allMastered).map(id=>[id,now]))}}),{allMastered,now});
  dashboard=await openDashboard(page);await expect(guidance).toHaveAttribute('data-anatomy-guidance','review');
  await expect(guidance.locator('[data-anatomy-guidance-title]')).toContainText('Ribs');
  await expect(page.locator('[data-anatomy-review-queue] [data-review-queue-id="ribs"]')).toBeVisible();
  record.reviewGuidance={title:await guidance.locator('[data-anatomy-guidance-title]').innerText(),help:await guidance.locator('[data-anatomy-guidance-help]').innerText(),dashboard:await dashboard.innerText()};
  await expect(dashboard).toContainText('To revisit');
  await selectMode(page,'flashcards');
  const dueScope=page.locator('[data-anatomy-flashcards]').getByRole('button',{name:'Due for review (0)',exact:true});
  await expect(dueScope).toBeVisible();record.flashcardDueLabel=await dueScope.innerText();
  expect(quizWork(await state(page))).toEqual(answered);expect(learningWork(await state(page))).toEqual(savedWork);
  await selectMode(page,'explore');dashboard=await openDashboard(page);
  await expect(guidance).toHaveAttribute('data-anatomy-guidance','review');
  await page.locator('[data-review-queue-id="ribs"]').click();
  const detailHeading=page.locator('[data-anatomy-structure-detail-heading]');await expect(detailHeading).toContainText('Ribs');await expect(detailHeading).toBeFocused();
  expect(quizWork(await state(page))).toEqual(answered);expect(learningWork(await state(page))).toEqual(savedWork);

  // New activity focus takes priority over the earlier structure action's queued callbacks.
  dashboard=await openDashboard(page);
  await holdGuidanceFocus(page);
  try{
    await action.click();await expect(page.locator('[data-anatomy-structure-detail="ribs"]')).toBeVisible();
    await restoreTimers(page);await selectMode(page,'quiz');await feedback.focus();await flushHeldFocus(page);await expect(feedback).toBeFocused();
  }finally{await removeTimers(page);}
  expect(quizWork(await state(page))).toEqual(answered);
  await selectMode(page,'explore');dashboard=await openDashboard(page);
  // A freshly opened study sheet also keeps its own focus.
  await holdGuidanceFocus(page);
  try{
    await action.click();await restoreTimers(page);await page.locator('[data-anatomy-study-toggle]').click();
    await expect(page.locator('#anatomy-study-sheet-title')).toBeFocused();await flushHeldFocus(page);await expect(page.locator('#anatomy-study-sheet-title')).toBeFocused();
  }finally{await removeTimers(page);}
  await page.locator('[data-anatomy-study-sheet]').getByRole('button',{name:'Close study sheet',exact:true}).click();
  dashboard=await openDashboard(page);
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,720,1280])for(const theme of themes){
    await scan(page,record,width,theme,'en','review-guidance');
    if(width===320&&theme==='light')await capture(page,dashboard,out+'/dashboard-phone.png');
    if(width===1280&&theme==='dark')await capture(page,dashboard,out+'/dashboard-dark.png');
  }
  await installArabic(page);await expect(action).toContainText(/[\u0600-\u06ff]/);await expect(guidance.locator('[data-anatomy-guidance-help]')).toContainText(/[\u0600-\u06ff]/);
  record.reviewReadingFonts=await readingFonts(page);for(const font of record.reviewReadingFonts)expect(font.size,font.text).toBeGreaterThanOrEqual(17);
  for(const theme of themes){await scan(page,record,320,theme,'ar-larger','review-guidance');if(theme==='light')await capture(page,dashboard,out+'/dashboard-arabic.png');}

  // Posterior respiratory has no available structures; guidance provides a concrete way back.
  const recoverySeed=await state(page);await harness.destroy(page);
  await harness.mount(page,{anatomy:{...recoverySeed,_activeTab:'explore',quizMode:false,system:'respiratory',view:'posterior',selectedStructure:null,search:'',_bodyView3d:false,_readingMode:false,_showStudySheet:false}},undefined,{expectCanvas:false});
  await frame(page);await page.evaluate(()=>{document.documentElement.lang='en';document.documentElement.dir='ltr';document.body.className='';});
  dashboard=await openDashboard(page);await expect(guidance).toHaveAttribute('data-anatomy-guidance','view');
  await expect(action).toHaveText('Switch view');await expect(guidance.locator('[data-anatomy-guidance-title]')).toContainText(/anterior/i);await expect(guidance.locator('[data-anatomy-guidance-help]')).toBeVisible();
  const beforeRecovery=await state(page);record.recoveryBefore=beforeRecovery;
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,720,1280])for(const theme of themes){
    await scan(page,record,width,theme,'en','empty-view-recovery');
    if(width===320&&theme==='light')await capture(page,dashboard,out+'/recovery-phone.png');
  }
  await installArabic(page);record.recoveryReadingFonts=await readingFonts(page);for(const font of record.recoveryReadingFonts)expect(font.size,font.text).toBeGreaterThanOrEqual(17);
  for(const theme of themes)await scan(page,record,320,theme,'ar-larger','empty-view-recovery');
  await action.focus();await action.press('Enter');
  await expect(page.locator('#anatomy-structure-list-title')).toBeFocused();
  const recovered=await state(page);expect(recovered.view).toBe('anterior');expect(recovered.system).toBe('respiratory');expect(recovered.selectedStructure).toBeNull();
  expect(quizWork(recovered)).toEqual(quizWork(beforeRecovery));expect(learningWork(recovered)).toEqual(learningWork(beforeRecovery));
  record.finalState=recovered;
  expect(record.scans).toHaveLength(24);expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);expect(record.errors).toEqual([]);
});

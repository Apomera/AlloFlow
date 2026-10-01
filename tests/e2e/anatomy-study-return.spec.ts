import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_STUDY_RETURN_QA_OUT||'reports/anatomy-study-return-2026-09-30';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];
const skeletalIds=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const context=(scope:string)=>'skeletal:3:'+scope+':'+skeletalIds.join(',');
const reviewDeck=['ribs','skull'];
const savedAllRound={context:context('all'),deckIds:skeletalIds,index:8,rated:{ulna:true}};

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/study-return-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
async function frame(page:Page){
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
}
async function openSheet(page:Page){
  const sheet=page.locator('[data-anatomy-study-sheet]');
  if(!await sheet.count())await page.locator('[data-anatomy-study-toggle]').click();
  await expect(sheet).toBeVisible();return sheet;
}
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
    const result=await (window as any).axe.run({include:[['[data-anatomy-study-sheet]'],['[data-anatomy-study-toggle]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  });
  const overflow=await page.locator('[data-anatomy-study-sheet]').evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth}));
  record.scans.push({width,theme,locale,area,dimensions,overflow,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
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
function protectedWork(s:any){return {
  notes:s._structureNotes,confidence:s._structureConfidence,confidenceAt:s._confidenceAt,evidence:s._retrievalEvidence,
  reflections:s._systemsMotionLearning,feedback:s._feedbackExperiment,
  tutorDraft:s._aiInput,tutorContext:s._aiDraftContext,tutorRevision:s._aiDraftRevision,tutorMessages:s._aiMessages,tutorBand:s._aiConversationBand,
  quizIndex:s.quizIdx,quizScore:s.quizScore,quizFeedback:s.quizFeedback,quizAttempts:s._quizAttempts
};}
function frozenRound(s:any){return {deck:s._flashcardDeck,index:s._flashcardIdx,rated:s._flashcardRoundRated,context:s._flashcardDeckContext};}
async function savedRound(sheet:Locator){
  const round=sheet.locator('[data-anatomy-study-round="skeletal"]');
  await expect(round).toBeVisible();await expect(round).toHaveAccessibleName(await round.locator('h5').innerText());
  await expect(round.locator('[data-anatomy-study-round-position]')).toContainText('Skull');
  await expect(round.locator('[data-anatomy-study-round-rated]')).toContainText(/1\s*\/\s*2/);
  return round;
}
async function controlledClipboard(page:Page){
  await page.evaluate(()=>{
    const w=window as any;
    w.__studyClipboard={texts:[],pending:[],fallbackCalls:0};
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText(text:string){
      w.__studyClipboard.texts.push(text);
      return new Promise<void>((resolve,reject)=>w.__studyClipboard.pending.push({resolve,reject}));
    }}});
    document.execCommand=((command:string)=>{if(command==='copy')w.__studyClipboard.fallbackCalls++;return true;}) as typeof document.execCommand;
  });
}
async function settleClipboard(page:Page,index:number,reject=false){
  await page.evaluate(({index,reject})=>{
    const pending=(window as any).__studyClipboard.pending[index];
    if(!pending)throw Error('No deferred clipboard request '+index);
    if(reject)pending.reject(new Error('Clipboard unavailable'));else pending.resolve();
  },{index,reject});
  await page.waitForTimeout(100);
}
async function downloadedText(page:Page,button:Locator){
  const downloadEvent=page.waitForEvent('download');await button.click();
  const download=await downloadEvent;return readFile((await download.path())!,'utf8');
}

test('Study sheets resume saved rounds, keep fresh exports and guard late copy results',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[],printChecks:[]};validation.studyReturn=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  const now=Date.now(),day=86400000;
  const note='The ribs protect the chest. هذا شرح محفوظ للتركيب.';
  const latestNote=note+' My latest note connects protection with movement.';
  const reflection='Exercise links muscle force with oxygen delivery. شرح النشاط محفوظ.';
  const latestReflection=reflection+' My latest writing follows the chain across systems.';
  const transfer='Both situations depend on transport and exchange.';
  const feedback='The cooling response becomes smaller as the disturbance decreases.';
  await harness.mount(page,{anatomy:{
    _activeTab:'flashcards',system:'skeletal',view:'anterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,
    selectedStructure:'ribs',_flashcardScope:'review',_flashcardDeck:reviewDeck,_flashcardDeckContext:context('review'),
    _flashcardRoundContext:context('review'),_flashcardRoundRated:{},_flashcardIdx:0,_flashcardFlipped:false,
    _flashcardRounds:{'skeletal:3:all':savedAllRound,'skeletal:3:review':{context:context('review'),deckIds:reviewDeck,index:0,rated:{}}},
    _structuresViewed:{ribs:true,skull:true},_structureConfidence:{ribs:'practice',skull:'learning'},_confidenceAt:{ribs:now,skull:now-3*day},
    _structureNotes:{ribs:note,femur:'The femur transfers weight through the thigh.'},_retrievalEvidence:{ribs:{attempts:4,correct:2}},
    quizIdx:4,quizScore:7,quizFeedback:null,_quizAttempts:9,
    _aiInput:'My current Tutor question remains saved.',_aiDraftContext:{version:1,systemId:'circulatory',structureId:'heart',band:'g912'},_aiDraftRevision:3,_aiConversationBand:'g912',
    _aiMessages:[{role:'user',text:'My earlier question.',systemId:'circulatory',structureId:'heart',band:'g912'}],
    _systemsMotionLearning:{exercise:{prediction:'less',explanation:reflection,transfer:1,transferExplanation:transfer,selfReview:true}},
    _feedbackExperiment:{direction:'cool',context:'temperature-feedback-v1|cool',token:'saved-cooling-attempt',prediction:'active',revealed:true,explanation:feedback,sessions:{}}
  }},undefined,{expectCanvas:false});
  await frame(page);
  const cards=page.locator('[data-anatomy-flashcards]'),card=cards.locator('[data-anatomy-recall-card]');
  await expect(cards).toHaveAttribute('data-anatomy-current-card','ribs');await card.focus();await card.press('Space');await card.press('2');
  await cards.locator('[data-anatomy-card-next]').click();await expect(cards).toHaveAttribute('data-anatomy-current-card','skull');
  await card.press('Space');await expect(card).toHaveAttribute('data-anatomy-card-revealed','true');
  const partial=await state(page);expect(frozenRound(partial)).toEqual({deck:reviewDeck,index:1,rated:{ribs:true},context:context('review')});
  let sheet=await openSheet(page);
  // Improving ratings does not erase the remaining place in this frozen round.
  await page.evaluate(now=>{(window as any).__ctx.updateMulti('anatomy',{_structureConfidence:{ribs:'learning',skull:'learning'},_confidenceAt:{ribs:now,skull:now}});},now);
  const stableWork=protectedWork(await state(page));
  const filter=sheet.getByLabel('Show',{exact:true}),collection=sheet.getByLabel('Browsing collection',{exact:true});
  await filter.selectOption('review');await collection.selectOption('muscular');
  await expect(sheet.locator('[data-anatomy-study-structures-empty="filtered"]')).toBeVisible();
  await expect(sheet.locator('[data-anatomy-study-open]')).toHaveCount(0);
  let round=await savedRound(sheet);
  const resume=round.locator('[data-anatomy-study-resume-round="skeletal"]');
  await resume.focus();await resume.press('Enter');await expect(sheet).toHaveCount(0);await expect(card).toBeFocused();
  await expect(cards).toHaveAttribute('data-anatomy-current-card','skull');await expect(card).toHaveAttribute('data-anatomy-card-revealed','true');
  expect(frozenRound(await state(page))).toEqual(frozenRound(partial));expect(protectedWork(await state(page))).toEqual(stableWork);
  expect((await state(page))._flashcardRounds['skeletal:3:all']).toEqual(savedAllRound);
  record.liveResume=await state(page);

  await page.locator('#anatomy-mobile-activity').selectOption('explore');
  sheet=await openSheet(page);round=await savedRound(sheet);
  // Reopening through the fresh opener wins over activation's delayed focus callbacks.
  await page.evaluate(()=>{
    const w=window as any;
    const saved=w.__studyResumeTimers={native:w.setTimeout,pending:[]};
    w.setTimeout=function(callback:any,delay:any,...args:any[]){
      if(delay===0&&typeof callback==='function'){
        saved.pending.push({callback,args});return -saved.pending.length;
      }
      return saved.native.call(w,callback,delay,...args);
    };
  });
  try{
    await round.locator('[data-anatomy-study-resume-round="skeletal"]').click();
    await expect(sheet).toHaveCount(0);
    await page.evaluate(()=>{const w=window as any;w.setTimeout=w.__studyResumeTimers.native;});
    sheet=await openSheet(page);await expect(page.locator('#anatomy-study-sheet-title')).toBeFocused();
    await page.evaluate(()=>{
      const w=window as any,pending=w.__studyResumeTimers.pending.splice(0);
      for(const timer of pending)timer.callback.apply(w,timer.args);
    });
    await page.waitForTimeout(250);await expect(page.locator('#anatomy-study-sheet-title')).toBeFocused();
  }finally{
    await page.evaluate(()=>{
      const w=window as any,saved=w.__studyResumeTimers;
      if(saved){w.setTimeout=saved.native;delete w.__studyResumeTimers;}
    });
  }
  expect(frozenRound(await state(page))).toEqual(frozenRound(partial));expect(protectedWork(await state(page))).toEqual(stableWork);
  record.savedResume=await state(page);
  await sheet.getByRole('button',{name:'Close study sheet',exact:true}).click();
  await page.locator('#anatomy-mobile-activity').selectOption('explore');sheet=await openSheet(page);

  await controlledClipboard(page);
  const copy=sheet.locator('[data-anatomy-study-copy]'),notice=sheet.locator('[data-anatomy-study-record-notice]');
  await copy.click();await expect(copy).toBeDisabled();await expect(copy).toHaveAttribute('aria-busy','true');
  await expect(copy).toHaveText('Copying study sheet…');
  await sheet.getByRole('button',{name:'Close study sheet',exact:true}).click();
  const activity=page.locator('#anatomy-mobile-activity');await activity.focus();
  await page.evaluate(({latestNote,latestReflection})=>{
    const w=window as any,s=w.__toolData.anatomy;
    w.__ctx.updateMulti('anatomy',{_structureNotes:{...s._structureNotes,ribs:latestNote},_systemsMotionLearning:{...s._systemsMotionLearning,exercise:{...s._systemsMotionLearning.exercise,explanation:latestReflection}}});
  },{latestNote,latestReflection});
  const closedNotice=(await state(page))._studyRecordNotice;
  await settleClipboard(page,0);await expect(activity).toBeFocused();await expect(sheet).toHaveCount(0);
  expect((await state(page))._studyRecordNotice).toBe(closedNotice);
  expect(await page.evaluate(()=>(window as any).__studyClipboard.fallbackCalls)).toBe(0);

  sheet=await openSheet(page);await copy.click();await expect(copy).toBeDisabled();
  await filter.selectOption('notes');await expect(copy).toBeEnabled();
  const filteredNotice=(await state(page))._studyRecordNotice;await filter.focus();
  await settleClipboard(page,1,true);await expect(filter).toBeFocused();
  expect((await state(page))._studyRecordNotice).toBe(filteredNotice);
  expect(await page.evaluate(()=>(window as any).__studyClipboard.fallbackCalls)).toBe(0);

  await collection.selectOption('all');await copy.click();await expect(copy).toBeDisabled();
  await collection.focus();await settleClipboard(page,2,true);await expect(copy).toBeEnabled();await expect(collection).toBeFocused();
  await expect(notice).toContainText('copied');
  expect(await page.evaluate(()=>(window as any).__studyClipboard.fallbackCalls)).toBe(1);
  const copiedTexts=await page.evaluate(()=>(window as any).__studyClipboard.texts);record.clipboardTexts=copiedTexts;
  expect(copiedTexts[0]).toContain(note);expect(copiedTexts[2]).toContain(latestNote);expect(copiedTexts[2]).toContain(latestReflection);

  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{complexity:1});});
  await copy.click();await expect(copy).toBeDisabled();
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='1';ctx.gradeBand='k2';ctx.updateMulti('anatomy',{});});
  await collection.focus();const profileNotice=(await state(page))._studyRecordNotice;
  await settleClipboard(page,3,true);await expect(collection).toBeFocused();
  expect((await state(page))._studyRecordNotice).toBe(profileNotice);
  expect(await page.evaluate(()=>(window as any).__studyClipboard.fallbackCalls)).toBe(1);
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{complexity:3});});
  await filter.selectOption('notes');await collection.selectOption('skeletal');
  await expect(sheet.locator('[data-anatomy-study-open="ribs"]')).toBeVisible();
  await expect(sheet.locator('[data-anatomy-study-open="femur"]')).toBeVisible();await expect(sheet.locator('[data-anatomy-study-open="skull"]')).toHaveCount(0);
  await expect(sheet.locator('[data-anatomy-study-filter-scope]')).toContainText('recorded structures');
  await expect(sheet.locator('[data-anatomy-study-structures-title]')).toHaveText('Recorded structures');
  const text=await downloadedText(page,sheet.locator('[data-anatomy-study-export="txt"]'));
  const json=await downloadedText(page,sheet.locator('[data-anatomy-study-export="json"]')),packet=JSON.parse(json);
  record.exportedText=text;record.exportedPacket=packet;
  expect(text).toContain(latestNote);expect(text).toContain(latestReflection);expect(text).toContain('Skull');
  expect(packet.records.map((row:any)=>row.id)).toEqual(expect.arrayContaining(['femur','ribs','skull']));
  expect(packet.records.find((row:any)=>row.id==='ribs').note).toBe(latestNote);
  expect(packet.learningNotes.find((row:any)=>row.id==='exercise').explanation).toBe(latestReflection);
  expect(packet.feedbackNotes.find((row:any)=>row.direction==='cool').explanation).toBe(feedback);
  expect(json).not.toContain('My current Tutor question');expect(packet).not.toHaveProperty('quizScore');
  record.beforeScans=await state(page);

  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,390,768,1440])for(const theme of themes){
    await scan(page,record,width,theme,'en','saved-round-sheet');
    if(width===390&&theme==='light')await capture(page,sheet,out+'/after-phone.png');
    if(width===390&&theme==='dark')await capture(page,sheet,out+'/after-dark.png');
  }
  const arabic=await installArabic(page);
  await expect(sheet.locator('[data-anatomy-study-rounds] h4')).toHaveText(arabic.study_return_rounds_title);
  await expect(sheet.locator('[data-anatomy-study-resume-round="skeletal"]')).toHaveText(arabic.study_return_resume);
  await expect(sheet.locator('[data-anatomy-study-filter-scope]')).toHaveText(arabic.study_return_filter_scope);
  await expect(sheet.locator('[data-anatomy-study-structures-title]')).toHaveText(arabic.study_return_structures_title);
  record.readingFonts=await sheet.locator('p,button,summary,label,select,input,span,bdi').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,text:element.textContent?.trim().slice(0,60),size:parseFloat(getComputedStyle(element).fontSize)})));
  for(const font of record.readingFonts)expect(font.size).toBeGreaterThanOrEqual(17);
  for(const theme of themes){await scan(page,record,320,theme,'ar-larger','saved-round-sheet');if(theme==='light')await capture(page,sheet,out+'/after-arabic.png');}

  const beforePrint=await state(page),screenTheme=await page.evaluate(()=>document.body.className);
  try{
    await page.emulateMedia({media:'print'});
    for(const theme of themes){
      await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
      const metrics=await sheet.evaluate(element=>{
        const displayed=(selector:string)=>Array.from(element.querySelectorAll(selector)).filter(node=>node.getClientRects().length>0).map(node=>({text:node.textContent?.trim(),color:getComputedStyle(node).color,background:getComputedStyle(node).backgroundColor}));
        return {paper:{color:getComputedStyle(element).color,background:getComputedStyle(element).backgroundColor},rows:Array.from(element.querySelectorAll('[data-anatomy-study-open]')).filter(node=>node.getClientRects().length>0).map(node=>node.getAttribute('data-anatomy-study-open')),text:displayed('#anatomy-study-sheet-title,[data-anatomy-study-structures-title],.anatomy-study-saved-text,[data-anatomy-study-reflection] h5'),hidden:{workbench:getComputedStyle(element.querySelector('[data-anatomy-study-workbench]')!).display,actions:getComputedStyle(element.querySelector('.anatomy-study-sheet-actions')!).display}};
      });
      record.printChecks.push({theme,metrics});expect(metrics.paper).toEqual({color:'rgb(0, 0, 0)',background:'rgb(255, 255, 255)'});
      expect(metrics.rows.slice().sort()).toEqual(['femur','ribs']);expect(metrics.text.length).toBeGreaterThan(0);
      for(const item of metrics.text)expect(item.color,'Printed text: '+item.text).toBe('rgb(0, 0, 0)');
      expect(metrics.hidden).toEqual({workbench:'none',actions:'none'});expect(await state(page)).toEqual(beforePrint);
    }
  }finally{await page.emulateMedia({media:'screen'});await page.evaluate(theme=>{document.body.className=theme;},screenTheme);}
  expect(record.printChecks).toHaveLength(3);
  await sheet.locator('[data-anatomy-study-resume-round="skeletal"]').click();await expect(card).toBeFocused();
  await expect(cards).toHaveAttribute('data-anatomy-current-card','skull');
  await page.evaluate(()=>{document.body.className='';});await capture(page,cards,out+'/resumed-card-phone.png');
  expect(frozenRound(await state(page))).toEqual(frozenRound(partial));expect(protectedWork(await state(page))).toEqual(protectedWork(beforePrint));
  sheet=await openSheet(page);
  await sheet.locator('[data-anatomy-study-refresh-round="skeletal"]').click();await expect(sheet).toHaveCount(0);
  const refreshed=await state(page);record.refreshedState=refreshed;
  expect(refreshed._flashcardDeck).toEqual([]);expect(refreshed._flashcardRoundRated).toEqual({});
  expect(protectedWork(refreshed)).toEqual(protectedWork(beforePrint));expect(refreshed._flashcardRounds['skeletal:3:all']).toEqual(savedAllRound);

  // Activity writing remains useful when no structures have been recorded.
  await harness.destroy(page);
  await harness.mount(page,{anatomy:{
    _activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,_showStudySheet:true,
    _studyCopyToken:'persisted-interrupted-copy',_studyRecordNotice:'Copying study sheet…',
    _systemsMotionLearning:{exercise:{explanation:latestReflection,transferExplanation:transfer}},
    _feedbackExperiment:{direction:'cool',context:'temperature-feedback-v1|cool',token:'reflection-only-cooling',prediction:'active',revealed:false,explanation:feedback,sessions:{}}
  }},undefined,{expectCanvas:false});
  await frame(page);const reflectionArabic=await installArabic(page);sheet=await openSheet(page);
  await expect(sheet.locator('[data-anatomy-study-structures-empty="reflection"]')).toHaveText(reflectionArabic.study_return_reflections_only);
  await expect(sheet.locator('[data-anatomy-study-reflection="exercise"]')).toContainText(latestReflection);
  await expect(sheet.locator('[data-anatomy-study-reflection="homeostasis-cool"]')).toContainText(feedback);
  await expect(sheet.locator('[data-anatomy-study-record-notice]')).toHaveText(reflectionArabic.study_return_copy_interrupted);
  await expect(sheet.locator('[data-anatomy-study-copy]')).toBeEnabled();
  const reflectionText=await downloadedText(page,sheet.locator('[data-anatomy-study-export="txt"]'));record.reflectionOnlyText=reflectionText;
  expect(reflectionText).toContain(latestReflection);expect(reflectionText).toContain(feedback);expect(reflectionText).toContain(reflectionArabic.study_return_reflections_only);
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const theme of themes){await scan(page,record,320,theme,'ar-larger','reflection-only-sheet');if(theme==='light')await capture(page,sheet,out+'/reflection-only-phone.png');}
  record.finalState=await state(page);
  expect(record.scans).toHaveLength(18);expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);expect(record.errors).toEqual([]);
});

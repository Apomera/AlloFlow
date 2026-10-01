import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_ACTIVITY_SWITCH_QA_OUT||'reports/anatomy-activity-switch-2026-10-01';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];
const skeletalIds=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const cardContext='skeletal:3:review:'+skeletalIds.join(',');

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,timeout:300000});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/activity-switch-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>{if(page)await harness.destroy(page);});

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
function quizWork(s:any){return {index:s.quizIdx,score:s.quizScore,attempts:s._quizAttempts,feedback:s.quizFeedback,question:s._quizQuestion,seed:s._quizSeed};}
function cardWork(s:any){return {deck:s._flashcardDeck,index:s._flashcardIdx,rated:s._flashcardRoundRated,context:s._flashcardDeckContext,flipped:s._flashcardFlipped};}
function writing(s:any){return {notes:s._structureNotes,draft:s._aiInput,draftContext:s._aiDraftContext,draftRevision:s._aiDraftRevision,messages:s._aiMessages};}
async function frame(page:Page){
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{
    const runtime=window as any,ctx=runtime.__ctx;runtime.__activitySwitchAnnouncements=[];
    ctx.announceToSR=(message:string)=>runtime.__activitySwitchAnnouncements.push(message);
    ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});
  });
}
async function selectMode(page:Page,mode:string){
  if(await page.locator('#anatomy-mobile-activity').isVisible())await page.locator('#anatomy-mobile-activity').selectOption(mode);
  else await page.locator('#anatomy-mode-tab-'+mode).click();
  await expect(page.locator('[data-anatomy-tool]')).toHaveAttribute('data-anatomy-tab',mode);
}
async function holdFocus(page:Page){
  await page.evaluate(()=>{
    const w=window as any,saved=w.__activitySwitchTimers={native:w.setTimeout,pending:[]};
    w.setTimeout=function(callback:any,delay:any,...args:any[]){
      if(delay===0&&typeof callback==='function'){saved.pending.push({callback,args});return -saved.pending.length;}
      return saved.native.call(w,callback,delay,...args);
    };
  });
}
async function restoreTimers(page:Page){await page.evaluate(()=>{const w=window as any;if(w.__activitySwitchTimers)w.setTimeout=w.__activitySwitchTimers.native;});}
async function flushFocus(page:Page){
  await page.evaluate(()=>{const w=window as any,pending=w.__activitySwitchTimers.pending.splice(0);for(const timer of pending)timer.callback.apply(w,timer.args);});
  await page.waitForTimeout(250);
}
async function removeTimers(page:Page){await page.evaluate(()=>{const w=window as any,saved=w.__activitySwitchTimers;if(saved){w.setTimeout=saved.native;delete w.__activitySwitchTimers;}});}
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
async function scan(page:Page,record:any,width:number,theme:string,locale:string){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const strip=page.locator('[data-anatomy-quiz-return]');await expect(strip).toBeVisible();
  const layout=await strip.evaluate(element=>{
    const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
    return {clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,overflowX:style.overflowX,overflowY:style.overflowY,bounds:{left:rect.left,right:rect.right,width:rect.width,height:rect.height}};
  });
  const targets=await strip.locator('button').evaluateAll(elements=>elements.map(element=>({text:element.textContent?.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
  const violations=await page.evaluate(async()=>{
    const result=await (window as any).axe.run({include:[['[data-anatomy-quiz-return]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  });
  record.scans.push({width,theme,locale,dimensions,layout,targets,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth+1);expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight+1);
  expect(layout.bounds.left).toBeGreaterThanOrEqual(0);expect(layout.bounds.right).toBeLessThanOrEqual(width);
  for(const target of targets){expect(target.width,target.text).toBeGreaterThanOrEqual(44);expect(target.height,target.text).toBeGreaterThanOrEqual(44);}
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

test('Regular activity switches preserve saved Quiz, Cards and writing while newer focus wins',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[],focusGuards:{}};validation.activitySwitch=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});
  const originalDraft='How does this structure help protect nearby organs?';
  await harness.mount(page,{anatomy:{
    _activeTab:'quiz',quizMode:true,system:'skeletal',view:'anterior',complexity:3,selectedStructure:'skull',_bodyView3d:false,_startHereDismissed:true,
    _tourActive:true,_tourSystem:'circulatory',_tourStepIdx:3,_activePathway:'path_air',_pathwayStep:3,
    _flashcardScope:'review',_flashcardDeck:['ribs','skull'],_flashcardDeckContext:cardContext,_flashcardRoundContext:cardContext,_flashcardIdx:0,_flashcardRoundRated:{},_flashcardFlipped:false,
    _flashcardRounds:{'skeletal:3:review':{context:cardContext,deckIds:['ribs','skull'],index:0,rated:{}}},
    _structureConfidence:{ribs:'practice'},_confidenceAt:{ribs:Date.now()},_structureNotes:{skull:'The skull protects the brain. شرح محفوظ.'},
    _aiInput:originalDraft,_aiDraftContext:{version:1,systemId:'skeletal',structureId:'skull',band:'g912'},_aiDraftRevision:2,_aiConversationBand:'g912',
    _aiMessages:[{role:'user',text:'My earlier saved question.',systemId:'skeletal',structureId:'skull',band:'g912'}]
  }},undefined,{expectCanvas:false});
  await frame(page);
  const quiz=page.locator('[data-anatomy-quiz-panel]'),feedback=page.locator('[data-anatomy-quiz-feedback]');
  const initialQuestion=(await state(page))._quizQuestion;
  await quiz.locator('[data-anatomy-quiz-option="'+initialQuestion.structureId+'"]').click();await expect(feedback).toBeFocused();
  const answered=quizWork(await state(page)),originalWriting=writing(await state(page));record.answeredQuiz=answered;
  expect(answered.feedback.correct).toBe(true);expect(answered.score).toBe(1);expect(answered.attempts).toBe(1);

  // The saved Tour visits another diagram; returning through a regular tab restores Quiz.
  await selectMode(page,'tour');
  const tour=page.locator('[data-anatomy-tour-panel]'),tourStep=tour.locator('[data-anatomy-tour-step]');
  await expect(tourStep).toHaveAttribute('data-anatomy-tour-step','3');await expect(tourStep).toBeFocused();
  expect((await state(page)).system).toBe('circulatory');expect(quizWork(await state(page))).toEqual(answered);
  await expect.poll(()=>page.evaluate(()=>(window as any).__activitySwitchAnnouncements.join(' | '))).toContain('Carotid Arteries');
  record.tourAnnouncements=await page.evaluate(()=>(window as any).__activitySwitchAnnouncements.slice());
  const returnStrip=page.locator('[data-anatomy-quiz-return]');await expect(returnStrip).toBeVisible();await expect(returnStrip).toContainText('Question 1');
  await tour.locator('[data-anatomy-tour-recap-open]').click();
  const heartClue=tour.locator('[data-anatomy-recap-question="heart"]');
  await heartClue.locator('[data-anatomy-tour-option="heart"]').click();await expect(heartClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  const savedRecap=(await state(page))._tourRecap;record.savedTourRecap=savedRecap;
  await selectMode(page,'quiz');await expect(feedback).toBeFocused();expect((await state(page)).system).toBe('skeletal');expect(quizWork(await state(page))).toEqual(answered);

  // Pathway entry uses its saved step, then a phone return control restores the same answer.
  const beforePathAnnouncements=await page.evaluate(()=>(window as any).__activitySwitchAnnouncements.length);
  await selectMode(page,'pathways');
  const pathway=page.locator('[data-anatomy-pathway-panel]'),pathwayStep=pathway.locator('[data-anatomy-pathway-step]');
  await expect(pathwayStep).toHaveAttribute('data-anatomy-pathway-step','3');await expect(pathwayStep).toBeFocused();
  expect((await state(page)).system).toBe('respiratory');expect(quizWork(await state(page))).toEqual(answered);
  await expect.poll(()=>page.evaluate(index=>(window as any).__activitySwitchAnnouncements.slice(index).join(' | '),beforePathAnnouncements)).toContain('Trachea');
  record.pathwayAnnouncements=await page.evaluate(index=>(window as any).__activitySwitchAnnouncements.slice(index),beforePathAnnouncements);
  await page.setViewportSize({width:320,height:1000});
  await returnStrip.getByRole('button',{name:'Return to Question 1',exact:true}).click();await expect(feedback).toBeFocused();
  expect(quizWork(await state(page))).toEqual(answered);expect((await state(page)).system).toBe('skeletal');
  await selectMode(page,'tour');await expect(heartClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  expect((await state(page))._tourRecap).toEqual(savedRecap);expect(quizWork(await state(page))).toEqual(answered);
  await selectMode(page,'quiz');await expect(feedback).toBeFocused();

  // A normal mode change checkpoints an unfinished Cards round and keeps the visible side.
  await selectMode(page,'flashcards');
  const cards=page.locator('[data-anatomy-flashcards]'),card=cards.locator('[data-anatomy-recall-card]');
  await expect(card).toBeFocused();await expect(cards).toHaveAttribute('data-anatomy-current-card','ribs');
  await card.press('Space');await card.press('2');await cards.locator('[data-anatomy-card-next]').click();await card.press('Space');
  await expect(cards).toHaveAttribute('data-anatomy-current-card','skull');await expect(card).toHaveAttribute('data-anatomy-card-revealed','true');
  const partialCards=cardWork(await state(page));record.partialCards=partialCards;
  await selectMode(page,'aiTutor');
  const draft=page.locator('[data-anatomy-tutor-input]');await expect(draft).toHaveValue(originalDraft);
  const latestDraft=originalDraft+'\nHow does its location support that function?';await draft.fill(latestDraft);
  const draftWork=writing(await state(page));expect(draftWork.notes).toEqual(originalWriting.notes);expect(draftWork.messages).toEqual(originalWriting.messages);
  expect((await state(page))._flashcardRounds['skeletal:3:review']).toMatchObject({deckIds:partialCards.deck,index:partialCards.index,rated:partialCards.rated});
  await page.setViewportSize({width:1280,height:1000});await selectMode(page,'flashcards');await expect(card).toBeFocused();
  expect(cardWork(await state(page))).toEqual(partialCards);expect(writing(await state(page))).toEqual(draftWork);expect(quizWork(await state(page))).toEqual(answered);

  // Keyboard navigation follows visual direction and keeps focus on the active tab.
  await selectMode(page,'explore');const exploreTab=page.locator('#anatomy-mode-tab-explore'),quizTab=page.locator('#anatomy-mode-tab-quiz');
  await exploreTab.focus();await exploreTab.press('ArrowRight');await expect(quizTab).toBeFocused();await expect(quizTab).toHaveAttribute('aria-selected','true');
  expect(quizWork(await state(page))).toEqual(answered);
  await page.evaluate(()=>{document.documentElement.dir='rtl';});
  await quizTab.press('ArrowRight');await expect(exploreTab).toBeFocused();await expect(exploreTab).toHaveAttribute('aria-selected','true');
  await exploreTab.press('ArrowLeft');await expect(quizTab).toBeFocused();await expect(quizTab).toHaveAttribute('aria-selected','true');
  await page.evaluate(()=>{document.documentElement.dir='ltr';});record.keyboardDirections=['ltr-right-to-quiz','rtl-right-to-explore','rtl-left-to-quiz'];
  await page.setViewportSize({width:320,height:1000});

  // A newer activity and focused writing own the screen when an older transition settles.
  await holdFocus(page);
  try{
    await selectMode(page,'tour');await restoreTimers(page);await selectMode(page,'aiTutor');await draft.focus();
    await flushFocus(page);await expect(draft).toBeFocused();record.focusGuards.newerMode=true;
  }finally{await removeTimers(page);}
  await selectMode(page,'quiz');await expect(feedback).toBeFocused();
  await holdFocus(page);
  try{
    await selectMode(page,'tour');await restoreTimers(page);await page.locator('[data-anatomy-study-toggle]').click();
    await expect(page.locator('#anatomy-study-sheet-title')).toBeFocused();await flushFocus(page);await expect(page.locator('#anatomy-study-sheet-title')).toBeFocused();record.focusGuards.studySheet=true;
  }finally{await removeTimers(page);}
  await page.locator('[data-anatomy-study-sheet]').getByRole('button',{name:'Close study sheet',exact:true}).click();
  await selectMode(page,'quiz');await expect(feedback).toBeFocused();
  await holdFocus(page);
  try{
    await selectMode(page,'aiTutor');await restoreTimers(page);await draft.focus();
    await draft.evaluate(element=>(element as HTMLTextAreaElement).setSelectionRange(4,10));
    await flushFocus(page);await expect(draft).toBeFocused();
    expect(await draft.evaluate(element=>({start:(element as HTMLTextAreaElement).selectionStart,end:(element as HTMLTextAreaElement).selectionEnd}))).toEqual({start:4,end:10});record.focusGuards.writingSelection=true;
  }finally{await removeTimers(page);}
  await selectMode(page,'tour');
  await holdFocus(page);
  try{
    await selectMode(page,'quiz');await restoreTimers(page);await quiz.locator('[data-anatomy-quiz-next]').click();
    await expect(quiz).toBeFocused();const newer=(await state(page))._quizQuestion;expect(newer.token).not.toBe(answered.question.token);expect(newer.index).toBe(1);
    const restart=quiz.getByRole('button',{name:'Restart quiz',exact:true});await restart.focus();await flushFocus(page);await expect(restart).toBeFocused();
    expect((await state(page))._quizQuestion).toEqual(newer);record.focusGuards.newerQuestion=true;
  }finally{await removeTimers(page);}
  const binary=(await state(page))._quizQuestion.binaryTrue;
  await quiz.locator('[data-anatomy-quiz-option="'+String(binary)+'"]').click();await expect(feedback).toBeFocused();
  const latestQuiz=quizWork(await state(page));expect(latestQuiz.score).toBe(2);expect(latestQuiz.attempts).toBe(2);record.latestQuiz=latestQuiz;
  await selectMode(page,'tour');await expect(heartClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  await expect(returnStrip).toContainText('Question 2');await expect(returnStrip.getByRole('button',{name:'Return to Question 2',exact:true})).toBeVisible();
  expect(quizWork(await state(page))).toEqual(latestQuiz);expect(writing(await state(page))).toEqual(draftWork);expect((await state(page))._tourRecap).toEqual(savedRecap);

  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,720,1280])for(const theme of themes){
    await scan(page,record,width,theme,'en');
    if(width===320&&theme==='light')await capture(page,returnStrip,out+'/saved-quiz-phone.png');
    if(width===1280&&theme==='dark')await capture(page,returnStrip,out+'/saved-quiz-dark.png');
  }
  const arabic=await installArabic(page);
  await expect(returnStrip).toContainText(arabic.activity_switch_saved_quiz.replace('{number}','2'));
  await expect(returnStrip).toContainText(arabic.activity_switch_saved_help);
  record.readingFonts=await returnStrip.locator('h3,h4,h5,strong,p,button,span,bdi').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,text:element.textContent?.trim(),size:parseFloat(getComputedStyle(element).fontSize)})));
  for(const font of record.readingFonts)expect(font.size,font.text).toBeGreaterThanOrEqual(17);
  for(const theme of themes){await scan(page,record,320,theme,'ar-larger');if(theme==='light')await capture(page,returnStrip,out+'/saved-quiz-arabic.png');}
  await returnStrip.getByRole('button',{name:arabic.quiz_flow_return.replace('{number}','2'),exact:true}).click();await expect(feedback).toBeFocused();
  expect(quizWork(await state(page))).toEqual(latestQuiz);expect(writing(await state(page))).toEqual(draftWork);
  await page.evaluate(()=>{document.body.className='';});await capture(page,quiz,out+'/returned-quiz-phone.png');
  record.finalState=await state(page);
  expect(record.scans).toHaveLength(12);expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);expect(record.errors).toEqual([]);
});

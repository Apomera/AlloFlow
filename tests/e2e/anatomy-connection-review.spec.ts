import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';
import {readPng,pixelStats} from './helpers/png_pixels';

const out=process.env.ANATOMY_CONNECTION_REVIEW_QA_OUT||'reports/anatomy-connection-review-2026-10-02';
const captures=out+'/screenshots';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const validation:Record<string,any>={};
const panelSelector='[data-anatomy-connections-panel]';
const articleSelector='[data-anatomy-connection="conn_3"][data-anatomy-connection-open="true"]';
const firstFeedbackSelector=articleSelector+' [data-anatomy-connection-feedback-kind="first"]';
const practiceFeedbackSelector=articleSelector+' [data-anatomy-connection-feedback-kind="practice"]';
const practiceStartSelector=articleSelector+' [data-anatomy-connection-practice-start="conn_3"]';
const practiceSavedSelector=articleSelector+' [data-anatomy-connection-practice-saved="conn_3"]';
const practiceFieldSelector=articleSelector+' [data-anatomy-connection-practice="conn_3"]';
const deck=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const deckContext='skeletal:3:all:'+deck.join(',');
const work={
  quizIdx:3,quizScore:2,quizFeedback:{correct:true,selected:0,questionKey:'saved-question'},_quizAttempts:4,
  _quizActivityReturn:{questionKey:'saved-question',token:'saved-question-token',index:3,score:2,attempts:4},
  _flashcardDeck:deck,_flashcardDeckContext:deckContext,_flashcardRoundContext:deckContext,
  _flashcardIdx:1,_flashcardFlipped:true,_flashcardRoundRated:{skull:true},
  _flashcardRounds:{'skeletal:3:all':{context:deckContext,deckIds:deck,index:1,rated:{skull:true}}},
  _structureNotes:{femur:'My saved explanation of the femur.',biceps:'My saved explanation of the biceps.'},
  _structureConfidence:{femur:'learning'},_confidenceAt:{femur:1800000000000},
  _retrievalEvidence:{femur:{attempts:4,correct:3}},_compareStructure:'tibia'
};
const selectedState={system:'skeletal',view:'anterior',complexity:3,_activeTab:'connections',_expandedConn:'conn_3',...work};
const savedFirst={version:1,answers:{conn_3:'choice_1'}};
const originState={...selectedState,_activeTab:'explore',selectedStructure:'femur',search:'Femur',_studyFilter:'notes',_connectionConcepts:savedFirst};

test.use({video:'off',trace:'off'});
test.describe.configure({mode:'serial',retries:0,timeout:300000});
test.beforeAll(async()=>{
  await harness.start();await mkdir(captures,{recursive:true});
  const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');
  validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),startedAt:new Date().toISOString()};
  if(process.env.ANATOMY_CONNECTION_REVIEW_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_CONNECTION_REVIEW_SOURCE_HASH);
});
test.afterAll(async()=>{
  const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');
  validation.metadata.finishedSourceLfSha256=createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');
  validation.metadata.finishedAt=new Date().toISOString();await writeFile(out+'/browser-validation.json',JSON.stringify(validation,null,2));
  try{expect(validation.metadata.finishedSourceLfSha256).toBe(validation.metadata.sourceLfSha256);}finally{await harness.stop();}
});
test.afterEach(async({page},info)=>{
  if(info.status!==info.expectedStatus){
    const name='diagnostic-'+info.title.replace(/[^a-z0-9]+/gi,'-').slice(0,100)+'.png';
    try{await page.screenshot({path:captures+'/'+name,fullPage:true});(validation.diagnostics??=[]).push(name);}catch{}
  }
  await harness.destroy(page);
});

function recordFor(page:Page,name:string){
  const record:any={errors:[],scans:[],steps:[],captures:[]};validation[name]=record;
  page.on('pageerror',error=>record.errors.push(error.message));return record;
}
async function mounted(page:Page,state:Record<string,any>){
  await harness.mount(page,{anatomy:{_bodyView3d:false,_startHereDismissed:true,...state}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
}
const anatomyState=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
async function checkWork(page:Page,record:any,label:string){
  const state=await anatomyState(page);
  for(const key of Object.keys(work))expect(state[key],label+': '+key).toEqual((work as any)[key]);
  record.steps.push({label,system:state.system,selected:state.selectedStructure,activeTab:state._activeTab,first:state._connectionConcepts,practice:state._connectionPractice});return state;
}
async function oneTopic(page:Page,id='conn_3'){
  const articles=page.locator(panelSelector+' [data-anatomy-connection]');await expect(articles).toHaveCount(10);
  await expect(page.locator(panelSelector+' [data-anatomy-connection][hidden]')).toHaveCount(9);
  await expect(page.locator(panelSelector+' [data-anatomy-connection]:visible')).toHaveCount(1);
  await expect(page.locator(panelSelector+' [data-anatomy-connection="'+id+'"][data-anatomy-connection-open="true"]')).toBeVisible();
}
async function firstSummary(page:Page){
  await expect(page.locator('.anatomy-connection-progress')).toContainText('First answers: 1/10');
  await expect(page.locator('.anatomy-connection-progress')).toContainText('0 correct');
  expect((await anatomyState(page))._connectionConcepts).toEqual(savedFirst);
}
async function startPractice(page:Page){
  const old=(await anatomyState(page))._connectionPractice?.sessions?.conn_3?.token;
  await page.locator(practiceStartSelector).click();
  const session=(await anatomyState(page))._connectionPractice.sessions.conn_3;
  expect(session).toMatchObject({active:true,answer:null});expect(typeof session.token).toBe('string');expect(session.token.length).toBeGreaterThan(0);
  if(old)expect(session.token).not.toBe(old);
  const field=page.locator(practiceFieldSelector);await expect(field).toBeFocused();await expect(field).toHaveAttribute('data-anatomy-connection-attempt',session.token);
  await expect(field.locator('[data-anatomy-connection-option]:enabled')).toHaveCount(3);return session.token;
}
async function returnSaved(page:Page){
  await page.locator(practiceSavedSelector).click();await expect(page.locator(firstFeedbackSelector)).toBeFocused();
  await expect(page.locator(firstFeedbackSelector)).toHaveAttribute('data-anatomy-connection-response','choice_1');
  await expect(page.locator(practiceFeedbackSelector)).toHaveCount(0);
}
async function answerPractice(page:Page,token:string){
  await page.locator(practiceFieldSelector+' [data-anatomy-connection-option="choice_0"]').click();
  const feedback=page.locator(practiceFeedbackSelector);await expect(feedback).toBeVisible();await expect(feedback).toHaveAttribute('data-anatomy-connection-feedback-token',token);
  await expect(feedback).toHaveAttribute('data-anatomy-connection-response','choice_0');
  expect((await anatomyState(page))._connectionPractice.sessions.conn_3).toEqual({token,answer:'choice_0',active:true});
  expect((await anatomyState(page))._connectionConcepts).toEqual(savedFirst);
}
async function overview(page:Page){
  await page.locator('[data-anatomy-connection-all]').click();await expect(page.locator('#anatomy-connection-select')).toBeFocused();
  await expect(page.locator(panelSelector+' [data-anatomy-connection]:visible')).toHaveCount(10);
  await expect(page.locator(panelSelector+' [data-anatomy-connection][hidden]')).toHaveCount(0);
  await expect(page.locator(panelSelector+' [data-anatomy-connection-open="true"]')).toHaveCount(0);
  await expect(page.locator('#anatomy-connection-select')).toHaveValue('');
}
async function capture(page:Page,record:any,locator:Locator,name:string){
  await expect(locator).toBeVisible();const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('No screenshot target: '+name);
  await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{
    await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));
    const clip=await locator.evaluate(element=>{const rect=element.getBoundingClientRect(),x=Math.max(0,Math.floor(rect.left-6)),y=Math.max(0,Math.floor(rect.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(rect.right+6))-x,height:Math.min(innerHeight,Math.ceil(rect.bottom+6))-y};});
    expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');
  }finally{await page.setViewportSize({width,height:1000});}
}

test('A wrong first response stays recorded while correct practice and returning to saved feedback preserve other work',async({page})=>{
  const record=recordFor(page,'firstAndPractice');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mounted(page,selectedState);await oneTopic(page);
  await expect(page.locator(articleSelector+' [data-anatomy-connection-attempt="first"]')).toBeVisible();
  await page.locator(articleSelector+' [data-anatomy-connection-option="choice_1"]').click();
  await expect(page.locator(firstFeedbackSelector)).toHaveAttribute('data-anatomy-connection-response','choice_1');await firstSummary(page);await checkWork(page,record,'wrong first answer');
  const token=await startPractice(page);await answerPractice(page,token);await firstSummary(page);await checkWork(page,record,'correct practice answer');
  await capture(page,record,page.locator(panelSelector),'desktop-practice-feedback');
  await returnSaved(page);let state=await checkWork(page,record,'saved first feedback');expect(state._connectionPractice.sessions.conn_3).toEqual({token,answer:'choice_0',active:false});await firstSummary(page);
  await capture(page,record,page.locator(firstFeedbackSelector),'desktop-saved-first-feedback');
  const nextToken=await startPractice(page);expect(nextToken).not.toBe(token);await firstSummary(page);await checkWork(page,record,'fresh practice question');expect(record.errors).toEqual([]);
});

test('An unfinished review persists across topics, overview, markers, activities and reload, and its answer survives another reload',async({page})=>{
  const record=recordFor(page,'persistentReview');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});await mounted(page,originState);
  await page.locator('[data-anatomy-relationship-process="conn_3"]').click();await expect(page.locator(articleSelector)).toBeFocused();await oneTopic(page);
  const token=await startPractice(page);await page.locator('#anatomy-connection-select').selectOption('conn_1');await oneTopic(page,'conn_1');await overview(page);
  expect((await anatomyState(page))._connectionPractice.sessions.conn_3).toEqual({token,answer:null,active:true});
  await page.locator('#anatomy-connection-select').selectOption('conn_3');await oneTopic(page);await expect(page.locator(practiceFieldSelector)).toHaveAttribute('data-anatomy-connection-attempt',token);
  await page.locator(articleSelector+' [data-anatomy-connection-marker="biceps"][data-anatomy-connection-marker-system="muscular"]').click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  await checkWork(page,record,'marker detour');expect((await anatomyState(page))._connectionPractice.sessions.conn_3).toEqual({token,answer:null,active:true});
  await page.locator('.anatomy-connection-model-context [data-anatomy-connection-return]').click();await expect(page.locator(articleSelector)).toBeFocused();
  await page.locator('#anatomy-mobile-activity').selectOption('explore');await page.locator('#anatomy-mobile-activity').selectOption('connections');await oneTopic(page);
  let state=await checkWork(page,record,'activity return');expect(state._connectionPractice.sessions.conn_3).toEqual({token,answer:null,active:true});
  await harness.destroy(page);await mounted(page,state);await oneTopic(page);await expect(page.locator(practiceFieldSelector)).toHaveAttribute('data-anatomy-connection-attempt',token);
  await expect(page.locator(practiceFieldSelector+' [data-anatomy-connection-option]:enabled')).toHaveCount(3);await answerPractice(page,token);state=await checkWork(page,record,'answered after reload');
  await harness.destroy(page);await mounted(page,state);await oneTopic(page);await expect(page.locator(practiceFeedbackSelector)).toHaveAttribute('data-anatomy-connection-feedback-token',token);
  await expect(page.locator(practiceFeedbackSelector)).toHaveAttribute('data-anatomy-connection-response','choice_0');await firstSummary(page);
  await capture(page,record,page.locator(panelSelector),'phone-reloaded-practice');await returnSaved(page);await checkWork(page,record,'saved feedback after reload');expect(record.errors).toEqual([]);
});

test('The compact overview and topic picker retain first-answer statuses and put focus on the topic chooser',async({page})=>{
  const record=recordFor(page,'topicNavigation');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});await mounted(page,{...selectedState,_connectionConcepts:savedFirst});
  await oneTopic(page);await expect(page.locator('#anatomy-connection-select option[value="conn_3"]')).toContainText('Review first answer');
  await overview(page);await expect(page.locator('[data-anatomy-connection="conn_3"] [data-anatomy-connection-first-status="review"]')).toBeVisible();
  await expect(page.locator(panelSelector+' [data-anatomy-connection-first-status="unanswered"]')).toHaveCount(9);await capture(page,record,page.locator(panelSelector),'phone-topic-overview');
  await page.locator('[data-anatomy-connection-toggle="conn_3"]').click();await oneTopic(page);await expect(page.locator(articleSelector)).toBeFocused();
  await page.locator('#anatomy-connection-select').selectOption('');await expect(page.locator('#anatomy-connection-select')).toBeFocused();
  await expect(page.locator(panelSelector+' [data-anatomy-connection]:visible')).toHaveCount(10);await checkWork(page,record,'empty chooser opens overview');expect(record.errors).toEqual([]);
});

const displays=[{width:1280,locale:'en',reading:false},{width:320,locale:'en',reading:false},{width:320,locale:'ar',reading:true}];
async function display(page:Page,context:{width:number,locale:string,reading:boolean},theme:string){
  await page.setViewportSize({width:context.width,height:1000});const dict=context.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,theme,reading})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=theme==='light'?'':'theme-'+theme;const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:reading});},{dict,theme,reading:context.reading});
}
async function scan(page:Page,record:any,context:any,theme:string,view:string){
  const panel=page.locator(panelSelector);await expect(panel).toBeVisible();
  const layout=await panel.evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,height:element.getBoundingClientRect().height,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}));
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},panelSelector);
  record.scans.push({...context,theme,view,layout,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(layout.scroll).toBeLessThanOrEqual(layout.client+1);expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeLessThanOrEqual(dimensions.width);expect(violations).toEqual([]);
}
async function readable(page:Page,reading:boolean){
  const metrics=await page.locator(articleSelector).evaluate(element=>Array.from(element.querySelectorAll('p,fieldset legend,fieldset button,[data-anatomy-connection-feedback-kind] :is(strong,h6),[data-anatomy-connection-practice-start],[data-anatomy-connection-practice-saved]')).filter(node=>node.getClientRects().length).map(node=>({text:node.textContent?.trim().slice(0,90),font:parseFloat(getComputedStyle(node).fontSize)})));
  (validation.styleChecks??=[]).push({type:'readable',context:validation.displayMatrix?.currentDisplay,metrics});
  expect(metrics.length).toBeGreaterThan(0);for(const item of metrics)expect(item.font,item.text||'reading text').toBeGreaterThanOrEqual(reading?17:16);return metrics;
}
async function targets(page:Page){
  const metrics=await page.locator(panelSelector+' button,'+panelSelector+' select').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>({label:element.getAttribute('aria-label')||element.textContent?.trim().slice(0,100),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
  (validation.styleChecks??=[]).push({type:'targets',context:validation.displayMatrix?.currentDisplay,metrics});
  expect(metrics.length).toBeGreaterThan(0);for(const item of metrics){expect(item.width,item.label||'control').toBeGreaterThanOrEqual(44);expect(item.height,item.label||'control').toBeGreaterThanOrEqual(44);}return metrics;
}
async function contrast(page:Page,selector:string){
  const metrics=await page.locator(selector).evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>{
    const foreground=getComputedStyle(element).color;let parent:Element|null=element,background='rgb(255, 255, 255)';
    while(parent){const candidate=getComputedStyle(parent).backgroundColor,numbers=candidate.match(/[\d.]+/g)?.map(Number);if(numbers&&numbers.length>=3&&(numbers.length===3||numbers[3]!==0)){background=candidate;break;}parent=parent.parentElement;}
    const luminance=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(component=>component/255).map(component=>component<=0.04045?component/12.92:Math.pow((component+0.055)/1.055,2.4)).reduce((total,component,index)=>total+component*[0.2126,0.7152,0.0722][index],0);
    const first=luminance(foreground),second=luminance(background);return {label:element.textContent?.trim().slice(0,100),foreground,background,ratio:(Math.max(first,second)+0.05)/(Math.min(first,second)+0.05)};
  }));(validation.styleChecks??=[]).push({type:'contrast',context:validation.displayMatrix?.currentDisplay,metrics});expect(metrics.length).toBeGreaterThan(0);for(const item of metrics)expect(item.ratio,item.label+' actual contrast').toBeGreaterThanOrEqual(4.5);return metrics;
}
async function labelPixels(page:Page,record:any,selector:string,name:string){
  const button=page.locator(selector);await button.scrollIntoViewIfNeeded();
  const bounds=await button.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const rect=range.getBoundingClientRect();return {left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom};});
  const clip={x:Math.ceil(bounds.left)+2,y:Math.ceil(bounds.top)+2,width:Math.floor(bounds.right)-Math.ceil(bounds.left)-4,height:Math.floor(bounds.bottom)-Math.ceil(bounds.top)-4};expect(clip.width).toBeGreaterThan(30);expect(clip.height).toBeGreaterThan(6);
  const metrics=pixelStats(readPng(await page.screenshot({path:captures+'/'+name+'.png',clip})));record.labelPixels.push({name,...metrics});record.captures.push(name+'.png');expect(metrics.significantColors,'button label has letter strokes').toBeGreaterThanOrEqual(2);expect(metrics.dominantShare,'button label is not a flat backplate').toBeLessThan(0.95);
}

test('First feedback, practice feedback and the topic overview are readable across desktop, phone, Arabic larger text and display themes',async({page})=>{
  const record=recordFor(page,'displayMatrix');record.styles=[];record.labelPixels=[];await page.emulateMedia({reducedMotion:'reduce'});await mounted(page,{...selectedState,_connectionConcepts:savedFirst});
  for(const context of displays)for(const theme of ['light','dark','contrast']){
    record.currentDisplay={...context,theme};
    await display(page,context,theme);await page.locator('#anatomy-connection-select').selectOption('conn_3');
    if((await anatomyState(page))._connectionPractice?.sessions?.conn_3?.active)await returnSaved(page);
    await oneTopic(page);const firstStyles={text:await readable(page,context.reading),targets:await targets(page),contrast:await contrast(page,firstFeedbackSelector+' :is(p,strong,h6),'+practiceStartSelector)};
    await scan(page,record,context,theme,'first');
    if(context.width===320&&context.locale==='en'&&theme==='light')await capture(page,record,page.locator(panelSelector),'phone-focused-first-feedback');
    const token=await startPractice(page);await answerPractice(page,token);
    const practiceStyles={text:await readable(page,context.reading),targets:await targets(page),contrast:await contrast(page,practiceFeedbackSelector+' :is(p,strong,h6),'+practiceSavedSelector)};
    await scan(page,record,context,theme,'practice');
    if(context.width===1280&&theme==='light')await capture(page,record,page.locator(practiceFeedbackSelector),'desktop-practice-detail');
    if(context.locale==='ar'&&theme==='dark')await capture(page,record,page.locator(practiceFeedbackSelector),'phone-arabic-dark-practice');
    await overview(page);const overviewTargets=await targets(page);await scan(page,record,context,theme,'overview');
    if(context.locale==='ar'&&theme==='dark')await capture(page,record,page.locator(panelSelector),'phone-arabic-dark-overview');
    const state=await checkWork(page,record,context.locale+' '+context.width+' '+theme);expect(state._connectionConcepts).toEqual(savedFirst);record.styles.push({...context,theme,first:firstStyles,practice:practiceStyles,overviewTargets});
  }
  await display(page,{width:320,locale:'en',reading:false},'light');await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.locator('#anatomy-connection-select').selectOption('conn_3');if((await anatomyState(page))._connectionPractice.sessions.conn_3.active)await returnSaved(page);
  const forced={width:320,locale:'en',reading:false,forcedColors:true};record.currentDisplay={...forced,theme:'forced-colors'};record.forcedFirstContrast=await contrast(page,firstFeedbackSelector+' :is(p,strong,h6),'+practiceStartSelector);await scan(page,record,forced,'forced-colors','first');await capture(page,record,page.locator(firstFeedbackSelector),'phone-forced-first-feedback');await labelPixels(page,record,practiceStartSelector,'phone-forced-practice-start-label');
  const token=await startPractice(page);await answerPractice(page,token);record.forcedPracticeContrast=await contrast(page,practiceFeedbackSelector+' :is(p,strong,h6),'+practiceSavedSelector);await scan(page,record,forced,'forced-colors','practice');await capture(page,record,page.locator(practiceFeedbackSelector),'phone-forced-practice-feedback');await labelPixels(page,record,practiceSavedSelector,'phone-forced-saved-feedback-label');
  await overview(page);await targets(page);await scan(page,record,forced,'forced-colors','overview');await capture(page,record,page.locator(panelSelector),'phone-forced-overview');await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});await checkWork(page,record,'display matrix finished');expect(record.scans).toHaveLength(30);expect(record.errors).toEqual([]);
});

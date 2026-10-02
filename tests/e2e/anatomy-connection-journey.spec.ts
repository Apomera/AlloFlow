import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';
import {readPng,pixelStats} from './helpers/png_pixels';

const out=process.env.ANATOMY_CONNECTION_JOURNEY_QA_OUT||'reports/anatomy-connection-journey-2026-10-02';
const captures=out+'/screenshots';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const validation:Record<string,any>={};
const connectionSelector='[data-anatomy-connection="conn_3"][data-anatomy-connection-open="true"]';
const contextSelector='.anatomy-connection-model-context';
const panelSelector='[data-anatomy-connections-panel]';
const processSelector='[data-anatomy-relationship-process="conn_3"]';
const partnerSelector='[data-anatomy-relationship-partner="muscular"][data-anatomy-relationship-connection="conn_3"]';
const markerSelector=(id:string)=>'[data-anatomy-connection-marker="'+id+'"][data-anatomy-connection-marker-system="muscular"]';
const preservedKeys=['quizIdx','quizScore','quizFeedback','_quizAttempts','_quizActivityReturn','_flashcardDeck','_flashcardDeckContext','_flashcardRoundContext','_flashcardIdx','_flashcardFlipped','_flashcardRoundRated','_flashcardRounds','_structureNotes','_structureConfidence','_confidenceAt','_compareStructure'];
const deck=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const deckContext='skeletal:3:all:'+deck.join(',');
const savedWork={
  quizIdx:3,quizScore:2,quizFeedback:{correct:true,selected:0,questionKey:'saved-question'},_quizAttempts:4,
  _quizActivityReturn:{questionKey:'saved-question',token:'saved-question-token',index:3,score:2,attempts:4},
  _flashcardDeck:deck,_flashcardDeckContext:deckContext,_flashcardRoundContext:deckContext,
  _flashcardIdx:1,_flashcardFlipped:true,_flashcardRoundRated:{skull:true},
  _flashcardRounds:{'skeletal:3:all':{context:deckContext,deckIds:deck,index:1,rated:{skull:true}}},
  _structureNotes:{femur:'The femur supports the leg and is involved in movement.',biceps:'My biceps note stays with this structure.'},
  _structureConfidence:{femur:'learning'},_confidenceAt:{femur:1800000000000},_compareStructure:'tibia'
};
const originState={_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur',search:'Femur',_studyFilter:'notes',...savedWork};

test.use({video:'off',trace:'off'});
test.describe.configure({mode:'serial',retries:0,timeout:300000});
test.beforeAll(async()=>{
  await harness.start();await mkdir(captures,{recursive:true});
  const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');
  validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),startedAt:new Date().toISOString()};
  if(process.env.ANATOMY_CONNECTION_JOURNEY_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_CONNECTION_JOURNEY_SOURCE_HASH);
});
test.afterAll(async()=>{
  const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');
  validation.metadata.finishedSourceLfSha256=createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');
  validation.metadata.finishedAt=new Date().toISOString();await writeFile(out+'/browser-validation.json',JSON.stringify(validation,null,2));
  try{expect(validation.metadata.finishedSourceLfSha256).toBe(validation.metadata.sourceLfSha256);}finally{await harness.stop();}
});
test.afterEach(async({page})=>{await harness.destroy(page);});

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
async function checkSavedWork(page:Page,record:any,label:string){
  const state=await anatomyState(page),saved:Record<string,any>={};
  for(const key of preservedKeys){saved[key]=state[key];expect(state[key],label+': '+key).toEqual((savedWork as any)[key]);}
  record.steps.push({label,system:state.system,view:state.view,complexity:state.complexity,selected:state.selectedStructure,activeTab:state._activeTab,savedWork:saved});
  return state;
}
async function screenshot(page:Page,record:any,locator:Locator,name:string){
  await expect(locator).toBeVisible();const width=page.viewportSize()!.width,box=await locator.boundingBox();
  if(!box)throw Error('Screenshot target has no bounds: '+name);
  await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{
    await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));
    const clip=await locator.evaluate(element=>{
      const rect=element.getBoundingClientRect(),x=Math.max(0,Math.floor(rect.left-6)),y=Math.max(0,Math.floor(rect.top-6));
      return {x,y,width:Math.min(innerWidth,Math.ceil(rect.right+6))-x,height:Math.min(innerHeight,Math.ceil(rect.bottom+6))-y};
    });
    expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);
    await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');
  }finally{await page.setViewportSize({width,height:1000});}
}
async function openProcess(page:Page){
  await page.locator(processSelector).click();
  await expect(page.locator(connectionSelector)).toBeVisible();
  await expect(page.locator(connectionSelector)).toBeFocused();
  await expect(page.locator(panelSelector+' [data-anatomy-connection-origin="femur"]')).toBeVisible();
}
async function backToOrigin(page:Page,entry:'process'|'partner',complexity=3){
  await page.locator(panelSelector+' [data-anatomy-connection-origin-return="femur"]').click();
  await expect(page.locator('[data-anatomy-structure-detail="femur"]')).toBeVisible();
  await expect(page.locator(entry==='process'?processSelector:partnerSelector)).toBeFocused();
  const state=await anatomyState(page);
  expect(state).toMatchObject({_activeTab:'explore',system:'skeletal',view:'anterior',complexity,selectedStructure:'femur',search:'Femur',_studyFilter:'notes',_bodyView3d:false,_connectionStudyOrigin:null});
  await expect(page.locator('[data-anatomy-connection-origin-return]')).toHaveCount(0);return state;
}

test('A relationship detour returns to its exact structure and preserves practice, writing and the comparison pin',async({page})=>{
  const record=recordFor(page,'processJourney');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});
  await mounted(page,originState);await checkSavedWork(page,record,'origin');
  await openProcess(page);
  let state=await checkSavedWork(page,record,'opened connection');
  expect(state._connectionStudyOrigin).toMatchObject({version:1,structureId:'femur',systemId:'skeletal',connectionId:'conn_3',entry:'process',search:'Femur',studyFilter:'notes'});
  await expect(page.locator(panelSelector+' [data-anatomy-connection-origin="femur"]')).toContainText('Started at Femur');
  await screenshot(page,record,page.locator(panelSelector),'desktop-expanded-connection');
  await page.locator(connectionSelector+' [data-anatomy-connection-diagram="muscular"]').click();
  await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  state=await checkSavedWork(page,record,'muscular diagram');expect(state).toMatchObject({_activeTab:'connections',system:'muscular',selectedStructure:null,_expandedConn:'conn_3',search:'',_studyFilter:'all'});
  await page.locator(connectionSelector+' '+markerSelector('biceps')).click();
  await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  state=await checkSavedWork(page,record,'biceps marker');expect(state).toMatchObject({system:'muscular',view:'anterior',selectedStructure:'biceps',complexity:3});
  await expect(page.locator(connectionSelector+' [data-anatomy-connection-current="biceps"]')).toContainText('Biceps Brachii');
  await expect(page.locator(connectionSelector+' '+markerSelector('biceps'))).toHaveAttribute('aria-pressed','true');
  await screenshot(page,record,page.locator(contextSelector),'desktop-marker-return');
  await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  await backToOrigin(page,'process');await checkSavedWork(page,record,'returned to origin');
  record.returnedToExactButton=true;expect(record.errors).toEqual([]);
});

test('A direct participating-system entry keeps both return actions and adjusts only the inspected marker level and view',async({page})=>{
  const record=recordFor(page,'partnerJourney');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  await mounted(page,{...originState,complexity:1});
  await page.locator(partnerSelector).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  let state=await checkSavedWork(page,record,'partner entry');
  expect(state).toMatchObject({_activeTab:'connections',system:'muscular',complexity:1,selectedStructure:null,_expandedConn:'conn_3'});
  expect(state._connectionStudyOrigin).toMatchObject({entry:'partner',partnerSystemId:'muscular',complexity:1});
  await expect(page.locator(contextSelector+' [data-anatomy-connection-origin-return="femur"]')).toBeVisible();
  await expect(page.locator(contextSelector+' [data-anatomy-connection-return]')).toBeVisible();
  await screenshot(page,record,page.locator(contextSelector),'phone-partner-context');
  await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  await page.locator(connectionSelector+' '+markerSelector('rotator_cuff')).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  state=await checkSavedWork(page,record,'posterior intermediate marker');expect(state).toMatchObject({system:'muscular',view:'posterior',complexity:2,selectedStructure:'rotator_cuff'});
  await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  await backToOrigin(page,'partner',1);await checkSavedWork(page,record,'partner origin restored');
  record.returnedToExactButton=true;record.markerRaisedOnlyNeededLevelAndView=true;expect(record.errors).toEqual([]);
});

test('A saved relationship route survives a page reload and retains its latest connection answer',async({page})=>{
  const record=recordFor(page,'reloadJourney');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  await mounted(page,originState);await openProcess(page);
  await page.locator(connectionSelector+' [data-anatomy-connection-option="choice_0"]').click();
  await expect(page.locator(connectionSelector+' [data-anatomy-connection-feedback]')).toBeVisible();
  await page.locator(connectionSelector+' '+markerSelector('biceps')).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  const saved=await checkSavedWork(page,record,'before reload'),answers=saved._connectionConcepts;
  expect(answers).toEqual({version:1,answers:{conn_3:'choice_0'}});
  await harness.destroy(page);await mounted(page,saved);
  await expect(page.locator(contextSelector+' [data-anatomy-connection-origin-return="femur"]')).toBeVisible();
  await expect(page.locator(connectionSelector+' [data-anatomy-connection-feedback]')).toBeVisible();
  await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  await screenshot(page,record,page.locator(panelSelector),'phone-reloaded-connection');
  await backToOrigin(page,'process');const returned=await checkSavedWork(page,record,'reload return');
  expect(returned._connectionConcepts).toEqual(answers);record.pageReloadRestoresRoute=true;expect(record.errors).toEqual([]);
});

test('An authored relationship can return to a source collection outside its participating-system list',async({page})=>{
  const record=recordFor(page,'crossCollectionJourney');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  await mounted(page,{...originState,system:'lymphatic',selectedStructure:'bone_marrow',search:'marrow',_studyFilter:'all'});
  const process=page.locator('[data-anatomy-relationship-process="conn_10"]');await expect(process).toBeVisible();
  await process.click();const connection=page.locator('[data-anatomy-connection="conn_10"][data-anatomy-connection-open="true"]');await expect(connection).toBeFocused();
  let state=await checkSavedWork(page,record,'cross-collection origin');
  expect(state._connectionStudyOrigin).toMatchObject({structureId:'bone_marrow',systemId:'lymphatic',connectionId:'conn_10',search:'marrow'});
  await connection.locator('[data-anatomy-connection-diagram="skeletal"]').click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  state=await checkSavedWork(page,record,'cross-collection diagram');expect(state).toMatchObject({_activeTab:'connections',system:'skeletal',selectedStructure:null,_expandedConn:'conn_10'});
  await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(connection).toBeFocused();
  await page.locator(panelSelector+' [data-anatomy-connection-origin-return="bone_marrow"]').click();
  await expect(page.locator('[data-anatomy-structure-detail="bone_marrow"]')).toBeVisible();await expect(process).toBeFocused();
  state=await checkSavedWork(page,record,'cross-collection return');expect(state).toMatchObject({_activeTab:'explore',system:'lymphatic',view:'anterior',complexity:3,selectedStructure:'bone_marrow',search:'marrow',_studyFilter:'all',_connectionStudyOrigin:null});
  record.authoredSourceOutsideParticipatingSystems=true;expect(record.errors).toEqual([]);
});

const displayContexts=[{width:1280,locale:'en',reading:false},{width:320,locale:'en',reading:false},{width:320,locale:'ar',reading:true}];
async function display(page:Page,context:{width:number,locale:string,reading:boolean},theme:string){
  await page.setViewportSize({width:context.width,height:1000});
  const dict=context.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,theme,reading})=>{
    document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=theme==='light'?'':'theme-'+theme;
    const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;
    ctx.updateMulti('anatomy',{_readingMode:reading});
  },{dict,theme,reading:context.reading});
}
async function scan(page:Page,record:any,selector:string,context:any,theme:string){
  const locator=page.locator(selector);await expect(locator).toBeVisible();
  const layout=await locator.evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}));
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{
    const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  },selector);
  record.scans.push({...context,theme,selector,layout,dimensions,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(layout.scroll).toBeLessThanOrEqual(layout.client+1);
  expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeLessThanOrEqual(dimensions.width);expect(violations).toEqual([]);
}
async function targets(locator:Locator){
  const metrics=await locator.evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>({label:element.getAttribute('aria-label')||element.textContent?.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
  expect(metrics.length).toBeGreaterThan(0);for(const item of metrics){expect(item.width,item.label||'control').toBeGreaterThanOrEqual(44);expect(item.height,item.label||'control').toBeGreaterThanOrEqual(44);}return metrics;
}
async function originHeadingContrast(page:Page){
  const metrics=await page.locator('[data-anatomy-connection-origin]').evaluateAll(elements=>elements.map(element=>{
    const heading=element.querySelector('strong')!,foreground=getComputedStyle(heading).color,background=getComputedStyle(element).backgroundColor;
    const channels=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number);
    const luminance=(value:string)=>channels(value).map(component=>component/255).map(component=>component<=0.04045?component/12.92:Math.pow((component+0.055)/1.055,2.4)).reduce((total,component,index)=>total+component*[0.2126,0.7152,0.0722][index],0);
    const first=luminance(foreground),second=luminance(background);
    return {place:element.getAttribute('data-anatomy-connection-origin-place'),foreground,background,ratio:(Math.max(first,second)+0.05)/(Math.min(first,second)+0.05)};
  }));
  expect(metrics).toHaveLength(2);
  for(const item of metrics)expect(item.ratio,item.place+' origin-heading contrast').toBeGreaterThanOrEqual(4.5);
  return metrics;
}
async function forcedButtonContrast(page:Page){
  const metrics=await page.locator('[data-anatomy-connection-origin-return],[data-anatomy-connection-marker][aria-pressed="true"]').evaluateAll(elements=>elements.map(element=>{
    const style=getComputedStyle(element),foreground=style.color,background=style.backgroundColor;
    const channels=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number);
    const luminance=(value:string)=>channels(value).map(component=>component/255).map(component=>component<=0.04045?component/12.92:Math.pow((component+0.055)/1.055,2.4)).reduce((total,component,index)=>total+component*[0.2126,0.7152,0.0722][index],0);
    const first=luminance(foreground),second=luminance(background);
    return {label:element.textContent?.trim(),foreground,background,ratio:(Math.max(first,second)+0.05)/(Math.min(first,second)+0.05)};
  }));
  expect(metrics).toHaveLength(3);for(const item of metrics)expect(item.ratio,item.label+' forced-color contrast').toBeGreaterThanOrEqual(4.5);return metrics;
}
async function forcedLabelPixels(page:Page,record:any){
  const button=page.locator(contextSelector+' [data-anatomy-connection-origin-return]');await button.scrollIntoViewIfNeeded();
  const bounds=await button.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const rect=range.getBoundingClientRect();return {left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom};});
  const clip={x:Math.ceil(bounds.left)+2,y:Math.ceil(bounds.top)+2,width:Math.floor(bounds.right)-Math.ceil(bounds.left)-4,height:Math.floor(bounds.bottom)-Math.ceil(bounds.top)-4};
  expect(clip.width).toBeGreaterThan(30);expect(clip.height).toBeGreaterThan(6);
  const pixels=pixelStats(readPng(await page.screenshot({path:captures+'/phone-forced-colors-label-interior.png',clip})));
  record.forcedLabelPixels=pixels;record.captures.push('phone-forced-colors-label-interior.png');
  expect(pixels.significantColors,'return label has visible letter strokes').toBeGreaterThanOrEqual(2);
  expect(pixels.dominantShare,'return label is not one flat backplate').toBeLessThan(0.95);
}

test('Relationship context and authored markers remain readable in every theme, phone layout, Arabic larger text and forced colors',async({page})=>{
  const record=recordFor(page,'displayMatrix');record.styles=[];
  await page.emulateMedia({reducedMotion:'reduce'});await mounted(page,originState);await openProcess(page);
  await page.locator(connectionSelector+' '+markerSelector('biceps')).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  const bannerSelector=panelSelector+' [data-anatomy-connection-origin="femur"]';
  for(const context of displayContexts)for(const theme of ['light','dark','contrast']){
    await display(page,context,theme);
    const metrics=await page.locator(bannerSelector).evaluate(element=>{const style=getComputedStyle(element);return {left:style.borderLeftWidth,right:style.borderRightWidth,background:style.backgroundColor,textColor:style.color};});
    expect(metrics.left).toBe(context.locale==='ar'?'1px':'4px');expect(metrics.right).toBe(context.locale==='ar'?'4px':'1px');
    const text=await page.locator('.anatomy-connection-origin,.anatomy-connection-anatomy,.anatomy-connection-model-context').evaluateAll(elements=>elements.flatMap(element=>Array.from(element.querySelectorAll('p,strong,span,h6,button')).filter(node=>node.getClientRects().length).map(node=>({text:node.textContent?.trim().slice(0,90),font:parseFloat(getComputedStyle(node).fontSize)}))));
    if(context.reading)for(const item of text)expect(item.font,item.text||'larger text').toBeGreaterThanOrEqual(17);
    record.styles.push({...context,theme,...metrics,text,headingContrast:await originHeadingContrast(page),targets:await targets(page.locator('[data-anatomy-connection-origin-return],[data-anatomy-connection-marker],'+contextSelector+' [data-anatomy-connection-return]'))});
    for(const selector of [bannerSelector,connectionSelector,contextSelector])await scan(page,record,selector,context,theme);
    await checkSavedWork(page,record,context.locale+' '+context.width+' '+theme);
    if(context.width===320&&context.locale==='en'&&theme==='light')await screenshot(page,record,page.locator(contextSelector),'phone-marker-return');
    if(context.locale==='ar'&&theme==='dark'){
      await screenshot(page,record,page.locator(contextSelector),'phone-arabic-dark-context');
      await screenshot(page,record,page.locator('[data-anatomy-connection-anatomy="conn_3"]'),'phone-arabic-dark-markers');
      await expect(page.locator(bannerSelector+' button')).toContainText('العودة');
    }
  }
  await display(page,{width:320,locale:'en',reading:false},'light');await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  for(const selector of [bannerSelector,connectionSelector,contextSelector])await scan(page,record,selector,{width:320,locale:'en',reading:false,forcedColors:true},'forced-colors');
  await targets(page.locator('[data-anatomy-connection-origin-return],[data-anatomy-connection-marker],'+contextSelector+' [data-anatomy-connection-return]'));
  record.forcedButtonContrast=await forcedButtonContrast(page);
  await screenshot(page,record,page.locator(contextSelector),'phone-forced-colors-context');
  await screenshot(page,record,page.locator('[data-anatomy-connection-anatomy="conn_3"]'),'phone-forced-colors-markers');
  await forcedLabelPixels(page,record);
  await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
  await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  await backToOrigin(page,'process');await checkSavedWork(page,record,'returned after display changes');
  expect(record.scans).toHaveLength(30);expect(record.errors).toEqual([]);
});

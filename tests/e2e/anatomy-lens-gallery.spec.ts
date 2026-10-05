import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_LENS_GALLERY_QA_OUT||'reports/anatomy-lens-gallery-2026-10-02';
const captures=out+'/screenshots';
const gallery='[data-anatomy-lens]';
const heading='#anatomy-lens-title';
const close='[data-anatomy-lens-close]';
const toggle='[data-anatomy-lens-toggle]';
const detail='[data-anatomy-learning-tools] button[data-scale-stage="tissue"]';
const firstCard=gallery+' [data-anatomy-lens-id="heart"]';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const validation:Record<string,any>={};
const base={system:'muscular',view:'anterior',complexity:1,_activeTab:'explore',quizMode:false,selectedStructure:'quads',search:'',_studyFilter:'all',_bodyView3d:false,_startHereDismissed:true,
  _structureNotes:{quads:'My saved explanation of knee extension.',kidneys:'My saved explanation of filtration.'},_structureConfidence:{quads:'learning',kidneys:'practice'},
  _spotterScore:2,_spotterTotal:3,quizIdx:2,_quizAttempts:4,quizScore:3,quizFeedback:'saved-feedback',_quizSeed:23,
  _flashcardRounds:{muscular:1},_connectionConcepts:{version:1,answers:{conn_3:'choice_1'}},_anatomyLensViewed:{heart:true}};
const workKeys=['_structureNotes','_structureConfidence','_spotterScore','_spotterTotal','quizIdx','_quizAttempts','quizScore','quizFeedback','_quizSeed','_quizQuestion','_flashcardRounds','_connectionConcepts'];

test.use({video:'off',trace:'off'});
test.describe.configure({mode:'default',retries:0,timeout:300000});
test.beforeAll(async()=>{
  await mkdir(captures,{recursive:true});
  const [source,mirror]=await Promise.all([readFile('stem_lab/stem_tool_anatomy.js','utf8'),readFile('desktop/web-app/public/stem_lab/stem_tool_anatomy.js','utf8')]);
  validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),sourceRawSha256:createHash('sha256').update(source).digest('hex'),mirrorsEqual:source===mirror,startedAt:new Date().toISOString()};
  expect(source).toBe(mirror);
  if(process.env.ANATOMY_LENS_GALLERY_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_LENS_GALLERY_SOURCE_HASH);
  await harness.start();
});
test.afterAll(async()=>{
  const [source,mirror]=await Promise.all([readFile('stem_lab/stem_tool_anatomy.js','utf8'),readFile('desktop/web-app/public/stem_lab/stem_tool_anatomy.js','utf8')]);
  validation.metadata.finishedSourceLfSha256=createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');validation.metadata.finishedMirrorsEqual=source===mirror;validation.metadata.finishedAt=new Date().toISOString();
  await writeFile(out+'/browser-validation.json',JSON.stringify(validation,null,2));
  try{expect(validation.metadata.finishedSourceLfSha256).toBe(validation.metadata.sourceLfSha256);expect(source).toBe(mirror);}finally{await harness.stop();}
});
test.afterEach(async({page},info)=>{
  if(info.status!==info.expectedStatus){const name='diagnostic-'+info.title.replace(/[^a-z0-9]+/gi,'-').slice(0,100)+'.png';try{await page.screenshot({path:captures+'/'+name,fullPage:true});(validation.diagnostics??=[]).push(name);}catch{}}
  await harness.destroy(page);
});
const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
function recordFor(page:Page,name:string){const record:any={errors:[],steps:[],scans:[],styles:[],captures:[]};validation[name]=record;page.on('pageerror',error=>record.errors.push(error.message));return record;}
function work(data:Record<string,any>){return Object.fromEntries(workKeys.map(key=>[key,data[key]]));}
async function sameWork(page:Page,expected:Record<string,any>){const data=await state(page);for(const key of workKeys)expect(data[key],'saved learning work: '+key).toEqual(expected[key]);return data;}
async function mount(page:Page,data:Record<string,any>={}){
  await harness.mount(page,{anatomy:{...base,...data}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const runtime=window as any,ctx=runtime.__ctx;runtime.__lensHandoffs=[];ctx.setStemLabTool=(tool:string)=>runtime.__lensHandoffs.push({tool,data:JSON.parse(JSON.stringify(runtime.__toolData))});ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});await expect(page.locator('[data-anatomy-structure-detail="quads"]')).toBeVisible();
}
async function openFromScale(page:Page){
  const tools=page.locator('[data-anatomy-learning-tools]');if(!await tools.evaluate(element=>(element as HTMLDetailsElement).open))await tools.locator('summary').click();
  await expect(page.locator(detail)).toHaveAttribute('data-scale-specialist','anatomyLensGallery');await page.locator(detail).click();await expect(page.locator(heading)).toBeFocused();await expect(page.locator(gallery)).toBeVisible();
}
async function openFromToolbar(page:Page){
  if(!await page.locator(toggle).isVisible())await page.locator('.anatomy-explorer-settings-toggle').click();
  await expect(page.locator(toggle)).toBeVisible();await page.locator(toggle).click();await expect(page.locator(heading)).toBeFocused();
}

test('The gallery closes back to its entry, opens a cross-system diagram with saved work and keeps its specialist destination separate',async({page})=>{
  const record=recordFor(page,'navigation');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mount(page);
  const saved=work(await state(page));await openFromScale(page);expect((await state(page))._anatomyLensEntry).toBe('scale');await sameWork(page,saved);
  await expect(page.locator(close)).toBeVisible();await page.locator(close).click();await expect(page.locator(gallery)).toHaveCount(0);await expect(page.locator(detail)).toBeFocused();await sameWork(page,saved);record.steps.push({action:'close gallery returns keyboard focus to Scale detail action',workPreserved:true});
  await openFromScale(page);
  await page.evaluate(()=>{const ctx=(window as any).__ctx,current=(window as any).__toolData.anatomy;ctx.updateMulti('anatomy',{_structureNotes:{...current._structureNotes,quads:'A newer note saved while the gallery is open.'},_anatomyLensViewed:{...current._anatomyLensViewed,alveoli:true}});});
  const newer=await state(page),savedNewer=work(newer);expect(newer.complexity).toBe(1);await page.locator('[data-anatomy-lens-id="kidneys"]').click();
  await expect(page.locator('#anatomy-regional-atlas')).toBeFocused();await expect(page.locator('#anatomy-regional-atlas')).toHaveAttribute('data-anatomy-atlas','kidneys');await expect(page.locator(gallery)).toHaveCount(0);
  const destination=await sameWork(page,savedNewer);expect(destination).toMatchObject({system:'organs',view:'posterior',selectedStructure:'kidneys',complexity:1,_activeTab:'explore',quizMode:false,_regionalAtlasOpen:'kidneys',_regionalAtlasStep:0});expect(destination._anatomyLensViewed).toEqual({...newer._anatomyLensViewed,kidneys:true});
  const placement=await page.locator('#anatomy-regional-atlas').evaluate(element=>{const css=getComputedStyle(element);return {top:element.getBoundingClientRect().top,scroll:scrollY,outlineWidth:css.outlineWidth,outlineStyle:css.outlineStyle,outlineColor:css.outlineColor,outlineOffset:css.outlineOffset};});expect(placement.top).toBeGreaterThanOrEqual(0);expect(placement.top).toBeLessThan(100);expect(parseFloat(placement.outlineWidth)).toBeGreaterThanOrEqual(3);expect(placement.outlineStyle).toBe('solid');record.steps.push({action:'open kidney diagram from muscular level 1',placement,system:destination.system,view:destination.view,complexity:destination.complexity,viewed:destination._anatomyLensViewed,workPreserved:true});await capture(page,record,page.locator('#anatomy-regional-atlas'),'desktop-kidney-destination');
  await openFromToolbar(page);expect((await state(page))._anatomyLensEntry).not.toBe('scale');await page.locator(close).click();await expect(page.locator(toggle)).toBeFocused();await sameWork(page,savedNewer);record.steps.push({action:'close gallery returns keyboard focus to toolbar entry',workPreserved:true});
  await openFromToolbar(page);await page.locator('.anatomy-explorer-settings-toggle').click();await expect(page.locator('.anatomy-explorer-settings-toggle')).toHaveAttribute('aria-expanded','false');await expect(page.locator(toggle)).toBeHidden();await expect(page.locator(gallery)).toBeVisible();await page.locator(close).click();await expect(page.locator('.anatomy-explorer-settings-toggle')).toBeFocused();await expect(page.locator('.anatomy-explorer-settings-toggle')).toBeVisible();await sameWork(page,savedNewer);record.steps.push({action:'closing after More controls is collapsed returns focus to its visible disclosure',workPreserved:true});
  await openFromToolbar(page);await page.locator('[data-anatomy-lens-id="patella"]').click();await expect(page.locator('#anatomy-regional-atlas')).toBeFocused();await expect(page.locator('#anatomy-regional-atlas')).toHaveAttribute('data-anatomy-atlas','patella');const promoted=await sameWork(page,savedNewer);expect(promoted).toMatchObject({system:'skeletal',view:'anterior',selectedStructure:'patella',complexity:2,_regionalAtlasOpen:'patella'});expect(promoted._anatomyLensViewed).toEqual({...destination._anatomyLensViewed,patella:true});record.steps.push({action:'open knee diagram promotes level1 to required level2',viewed:promoted._anatomyLensViewed,workPreserved:true});
  await openFromToolbar(page);await expect(page.locator(gallery+' [data-anatomy-lens-id]')).toHaveCount(8);await expect(page.locator(gallery+' [data-anatomy-lens-specialist]')).toHaveCount(1);await expect(page.locator(gallery+' .anatomy-lens-progress')).toHaveText('4 of 8 diagrams opened');await expect(page.locator(gallery+' progress')).toHaveAttribute('value','4');await expect(page.locator(gallery+' progress')).toHaveAttribute('max','8');
  const specialist=page.locator('[data-anatomy-lens-specialist="brainAtlas"]');expect(await specialist.evaluate(element=>!!element.closest('aside'))).toBe(true);const beforeSpecialist=await state(page);await specialist.click();
  const handoffs=await page.evaluate(()=>(window as any).__lensHandoffs);expect(handoffs).toHaveLength(1);expect(handoffs[0].tool).toBe('brainAtlas');expect(handoffs[0].data.anatomy).toEqual(beforeSpecialist);await sameWork(page,savedNewer);record.steps.push({action:'separate Brain Atlas specialist handoff',diagramCount:8,handoff:handoffs[0]});expect(record.errors).toEqual([]);
});

async function display(page:Page,view:{width:number,locale:string,reading:boolean,theme:string}){
  await page.setViewportSize({width:view.width,height:1000});await page.emulateMedia({forcedColors:view.theme==='forced-colors'?'active':'none',reducedMotion:'reduce'});const dict=view.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,view})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=view.theme==='dark'?'theme-dark':'';const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:view.reading});},{dict,view});await expect(page.locator(gallery)).toBeVisible();
}
async function measure(page:Page,record:any,view:any){
  const metrics=await page.locator(gallery+' :is(h3,h4,p,span,strong,bdi,button)').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length&&(element.textContent?.trim()||element.getAttribute('aria-label'))).map(element=>{
    const css=getComputedStyle(element),foreground=css.color;let parent:Element|null=element,background='rgb(255, 255, 255)';while(parent){const color=getComputedStyle(parent).backgroundColor,n=color.match(/[\d.]+/g)?.map(Number);if(n&&n.length>=3&&(n.length===3||n[3]!==0)){background=color;break;}parent=parent.parentElement;}
    const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background),box=element.getBoundingClientRect();return {tag:element.tagName,className:element.className,text:element.textContent?.trim().slice(0,140),font:parseFloat(css.fontSize),width:box.width,height:box.height,foreground,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),cardTitle:!!element.closest('.anatomy-lens-card')&&(element.tagName==='STRONG'||(element.tagName==='BDI'&&element.parentElement?.tagName==='STRONG'))};
  }));record.styles.push({view,metrics});expect(metrics.length).toBeGreaterThan(0);
  for(const metric of metrics){expect(metric.font,metric.text).toBeGreaterThanOrEqual(view.reading?17:14);expect(metric.ratio,metric.text+' actual contrast').toBeGreaterThanOrEqual(4.5);if(metric.tag==='BUTTON'){expect(metric.width,metric.text).toBeGreaterThanOrEqual(44);expect(metric.height,metric.text).toBeGreaterThanOrEqual(44);}if(['H3','H4','P','STRONG'].includes(metric.tag)&&metric.className!=='anatomy-lens-progress-help')expect(metric.font,metric.text+' primary text').toBeGreaterThanOrEqual(view.reading?17:16);if(metric.cardTitle)expect(metric.font,metric.text+' card title').toBeGreaterThanOrEqual(view.reading?20:18);}
}
async function scan(page:Page,record:any,view:any){
  const box=await page.locator(gallery).evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right})),dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},gallery);
  record.scans.push({view,box,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(box.scroll).toBeLessThanOrEqual(box.client+1);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(dimensions.width);expect(violations).toEqual([]);
}
async function capture(page:Page,record:any,locator:Locator,name:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('Missing screenshot target '+name);await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));const clip=await locator.evaluate(element=>{const r=element.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left-6)),y=Math.max(0,Math.floor(r.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(r.right+6))-x,height:Math.min(innerHeight,Math.ceil(r.bottom+6))-y};});expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');}finally{await page.setViewportSize({width,height:1000});}
}

test('The diagram gallery is readable and keyboard accessible on desktop, 320px phones, Arabic larger text and forced colors',async({page})=>{
  test.setTimeout(420000);const record=recordFor(page,'display');await mount(page,{_showAnatomyLens:true,_anatomyLensViewed:{heart:true,alveoli:true}});
  const views=[{width:1280,locale:'en',reading:false,theme:'light',name:'desktop-light'},{width:320,locale:'en',reading:false,theme:'light',name:'phone-light'},{width:320,locale:'en',reading:false,theme:'dark',name:'phone-dark'},{width:320,locale:'ar',reading:true,theme:'dark',name:'phone-arabic-dark-larger'},{width:320,locale:'en',reading:false,theme:'forced-colors',name:'phone-forced-colors'}];
  for(const view of views){
    record.currentDisplay=view;await display(page,view);await expect(page.locator(gallery+' [data-anatomy-lens-id]')).toHaveCount(8);await expect(page.locator(gallery+' [data-anatomy-lens-specialist]')).toHaveCount(1);await expect(page.locator(gallery+' progress')).toHaveAttribute('value','2');await expect(page.locator(gallery+' progress')).toHaveAttribute('max','8');await measure(page,record,view);await scan(page,record,view);
    const labels=view.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')).stem.anatomy:null,cue=labels?.lens_open||'Open guided view';for(const card of await page.locator(gallery+' [data-anatomy-lens-id]').all()){await expect(card).toHaveAccessibleName(new RegExp((await card.locator('strong').innerText()).trim(),'u'));await expect(card).toHaveAccessibleName(new RegExp(cue,'u'));}await expect(page.locator(gallery+' [data-anatomy-lens-specialist]')).toHaveAccessibleName(new RegExp(labels?.lens_specialist_open||'Open Brain Atlas','u'));
    if(view.locale==='ar'){expect(await page.evaluate(()=>document.documentElement.dir)).toBe('rtl');await expect(page.locator(close)).toHaveAccessibleName(/[\u0600-\u06ff]/);for(const description of await page.locator(gallery+' .anatomy-lens-desc').all())await expect(description).toContainText(/[\u0600-\u06ff]/);await expect(page.locator(gallery)).not.toContainText('Open deep dive');await expect(page.locator(gallery)).not.toContainText('Focused structure and process diagrams');}
    await page.locator(firstCard).focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(page.locator(firstCard)).toBeFocused();const focus=await page.locator(firstCard).evaluate(element=>({width:getComputedStyle(element).outlineWidth,style:getComputedStyle(element).outlineStyle,color:getComputedStyle(element).outlineColor,offset:getComputedStyle(element).outlineOffset}));expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);expect(focus.style).toBe('solid');record.steps.push({view,keyboardFocus:focus});
    await capture(page,record,page.locator(gallery),view.name+'-lens-gallery');
  }
  expect(record.scans).toHaveLength(5);expect(record.captures).toHaveLength(5);expect(record.errors).toEqual([]);
});

import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_SCALE_JOURNEY_QA_OUT||'reports/anatomy-scale-journey-2026-10-02';
const captures=out+'/screenshots';
const tools='[data-anatomy-learning-tools]';
const journey='[data-anatomy-scale-journey]';
const tissue=journey+' button[data-scale-stage="tissue"]';
const cell=journey+' button[data-scale-stage="cell"]';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const validation:Record<string,any>={};
const base={system:'muscular',view:'anterior',complexity:3,_activeTab:'explore',quizMode:false,selectedStructure:'quads',search:'',_studyFilter:'all',_bodyView3d:false,_startHereDismissed:true,
  _structureNotes:{quads:'My saved explanation of knee extension.',alveoli:'My saved explanation of the air–blood barrier.'},_structureConfidence:{quads:'learning',alveoli:'practice'},
  _spotterScore:2,_spotterTotal:3,_quizAttempts:4,quizScore:3,_flashcardRounds:{muscular:1},_connectionConcepts:{version:1,answers:{conn_3:'choice_1'}}};

test.use({video:'off',trace:'off'});
test.describe.configure({mode:'default',retries:0,timeout:300000});
test.beforeAll(async()=>{
  await mkdir(captures,{recursive:true});
  const [source,mirror]=await Promise.all([readFile('stem_lab/stem_tool_anatomy.js','utf8'),readFile('desktop/web-app/public/stem_lab/stem_tool_anatomy.js','utf8')]);
  validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),sourceRawSha256:createHash('sha256').update(source).digest('hex'),mirrorsEqual:source===mirror,startedAt:new Date().toISOString()};
  expect(source).toBe(mirror);
  if(process.env.ANATOMY_SCALE_JOURNEY_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_SCALE_JOURNEY_SOURCE_HASH);
  await harness.start();
});
test.afterAll(async()=>{
  const [source,mirror]=await Promise.all([readFile('stem_lab/stem_tool_anatomy.js','utf8'),readFile('desktop/web-app/public/stem_lab/stem_tool_anatomy.js','utf8')]);
  validation.metadata.finishedSourceLfSha256=createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');
  validation.metadata.finishedMirrorsEqual=source===mirror;validation.metadata.finishedAt=new Date().toISOString();
  await writeFile(out+'/browser-validation.json',JSON.stringify(validation,null,2));
  try{expect(validation.metadata.finishedSourceLfSha256).toBe(validation.metadata.sourceLfSha256);expect(source).toBe(mirror);}finally{await harness.stop();}
});
test.afterEach(async({page},info)=>{
  if(info.status!==info.expectedStatus){const name='diagnostic-'+info.title.replace(/[^a-z0-9]+/gi,'-').slice(0,100)+'.png';try{await page.screenshot({path:captures+'/'+name,fullPage:true});(validation.diagnostics??=[]).push(name);}catch{}}
  await harness.destroy(page);
});
const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
function recordFor(page:Page,name:string){const record:any={errors:[],steps:[],scans:[],styles:[],captures:[]};validation[name]=record;page.on('pageerror',error=>record.errors.push(error.message));return record;}
async function mount(page:Page,data:Record<string,any>,other:Record<string,any>={}){
  await harness.mount(page,{...other,anatomy:{...base,...data}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const runtime=window as any,ctx=runtime.__ctx;runtime.__scaleHandoffs=[];ctx.setStemLabTool=(tool:string)=>runtime.__scaleHandoffs.push({tool,data:JSON.parse(JSON.stringify(runtime.__toolData))});ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  await expect(page.locator('[data-anatomy-structure-detail="'+(data.selectedStructure||base.selectedStructure)+'"]')).toBeVisible();
}
async function openTools(page:Page){
  await expect(page.locator(tools)).toBeVisible();
  if(!await page.locator(tools).evaluate(element=>(element as HTMLDetailsElement).open))await page.locator(tools+' > summary').click();
  await expect(page.locator(journey)).toBeVisible();
}
async function activity(page:Page,tab:string){const mobile=page.locator('#anatomy-mobile-activity');if(await mobile.isVisible())await mobile.selectOption(tab);else await page.locator('#anatomy-mode-tab-'+tab).click();expect((await state(page))._activeTab).toBe(tab);}

test('Scale actions expose their destination, focus the opened gallery and keep saved learning work and destination context',async({page})=>{
  const record=recordFor(page,'destinations');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mount(page,{});await openTools(page);
  await expect(page.locator(tissue)).toHaveAttribute('data-scale-specialist','anatomyLensGallery');
  await expect(page.locator(tissue)).toHaveAccessibleName(/Tissue \/ region.*Anatomy Lens gallery.*Open detail view/);
  await expect(page.locator(cell)).toHaveAccessibleName(/Cell scale.*Cell microdissection.*Open cell view/);
  expect(await page.locator(journey+' [data-scale-stage="body"]').evaluate(element=>element.tagName)).toBe('DIV');
  expect(await page.locator(journey+' [data-scale-stage="structure"]').evaluate(element=>element.tagName)).toBe('DIV');
  const saved=await state(page);await page.locator(tissue).scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);expect(before).toBeGreaterThan(0);
  await page.locator(tissue).click();await expect(page.locator('#anatomy-lens-title')).toBeFocused();await expect(page.locator('[data-anatomy-lens]')).toBeVisible();
  const gallery=await page.locator('#anatomy-lens-title').evaluate(element=>({top:element.getBoundingClientRect().top,bottom:element.getBoundingClientRect().bottom,scroll:scrollY,height:innerHeight}));
  expect(gallery.top).toBeGreaterThanOrEqual(0);expect(gallery.bottom).toBeLessThanOrEqual(gallery.height);expect(gallery.scroll).toBeLessThan(before);
  expect(await state(page)).toEqual({...saved,_showAnatomyLens:true});
  record.steps.push({action:'open detail gallery',beforeScroll:before,gallery,selectedStructure:saved.selectedStructure,notesPreserved:true,scoresPreserved:true});

  await harness.destroy(page);await mount(page,{system:'respiratory',selectedStructure:'alveoli',_showAnatomyLens:false},{cellAtlasLab:{tissue:'brain',view:'detail',savedMemo:'Existing Cell Atlas work'}});await openTools(page);
  await expect(page.locator(cell)).toHaveAttribute('data-scale-cell-context','lung');await expect(page.locator(cell)).toHaveAccessibleName(/Cell scale.*Lung Cell Atlas.*Open cell view/);
  const beforeCell=await state(page);await page.locator(cell).click();
  const handoffs=await page.evaluate(()=>(window as any).__scaleHandoffs);expect(handoffs).toHaveLength(1);expect(handoffs[0].tool).toBe('cellAtlasLab');
  expect(handoffs[0].data.anatomy).toEqual(beforeCell);expect(await state(page)).toEqual(beforeCell);
  expect(handoffs[0].data.cellAtlasLab).toEqual({tissue:'lung',view:'map',savedMemo:'Existing Cell Atlas work',_scaleJourneySource:'anatomy',_scaleJourneySystem:'respiratory',_scaleJourneyStructure:'alveoli',_scaleJourneyLabel:'Alveoli'});
  record.steps.push({action:'open lung cell atlas',handoff:handoffs[0],selectedStructurePreserved:true,notesPreserved:true,scoresPreserved:true});

  await activity(page,'spotter');await page.evaluate(()=>{Math.random=()=>0;});await page.locator('[data-anatomy-spotter-start]').click();
  await expect(page.locator('#anatomy-spotter-question-title')).toBeFocused();expect((await state(page))._spotterActive).toBe(true);await expect(page.locator(tools)).toHaveCount(0);
  await activity(page,'explore');await expect(page.locator(tools)).toBeVisible();await activity(page,'spotter');await expect(page.locator(tools)).toHaveCount(0);
  record.steps.push({action:'pending Spotter conceals learning destinations; paused Explore restores them',target:(await state(page))._spotterTarget});expect(record.errors).toEqual([]);
});

async function display(page:Page,view:{width:number,locale:string,reading:boolean,theme:string}){
  await page.setViewportSize({width:view.width,height:1000});await page.emulateMedia({forcedColors:view.theme==='forced-colors'?'active':'none',reducedMotion:'reduce'});
  const dict=view.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,view})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=view.theme==='dark'?'theme-dark':'';const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:view.reading});},{dict,view});
  await openTools(page);
}
async function measure(page:Page,record:any,view:any){
  const metrics=await page.locator(tools+' :is(h3,h4,p,span,strong,bdi,button,summary)').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length&&(element.textContent?.trim()||element.getAttribute('aria-label'))).map(element=>{
    const css=getComputedStyle(element),foreground=css.color;let parent:Element|null=element,background='rgb(255, 255, 255)';
    while(parent){const color=getComputedStyle(parent).backgroundColor,n=color.match(/[\d.]+/g)?.map(Number);if(n&&n.length>=3&&(n.length===3||n[3]!==0)){background=color;break;}parent=parent.parentElement;}
    const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background),box=element.getBoundingClientRect();
    return {tag:element.tagName,className:element.className,text:element.textContent?.trim().slice(0,140),font:parseFloat(css.fontSize),width:box.width,height:box.height,foreground,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),ariaHidden:element.getAttribute('aria-hidden')==='true'};
  }));
  record.styles.push({view,metrics});expect(metrics.length).toBeGreaterThan(0);
  for(const metric of metrics){expect(metric.font,metric.text).toBeGreaterThanOrEqual(view.reading?17:14);expect(metric.ratio,metric.text+' actual contrast').toBeGreaterThanOrEqual(4.5);if(metric.tag==='BUTTON'||metric.tag==='SUMMARY'){expect(metric.width,metric.text).toBeGreaterThanOrEqual(44);expect(metric.height,metric.text).toBeGreaterThanOrEqual(44);}if(['H3','H4','P','STRONG'].includes(metric.tag))expect(metric.font,metric.text+' primary text').toBeGreaterThanOrEqual(view.reading?17:16);}
}
async function scan(page:Page,record:any,view:any){
  const box=await page.locator(tools).evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}));
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},tools);
  record.scans.push({view,box,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(box.scroll).toBeLessThanOrEqual(box.client+1);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(dimensions.width);expect(violations).toEqual([]);
}
async function capture(page:Page,record:any,locator:Locator,name:string){
  await expect(locator).toBeVisible();const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('Missing screenshot target '+name);await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));const clip=await locator.evaluate(element=>{const r=element.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left-6)),y=Math.max(0,Math.floor(r.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(r.right+6))-x,height:Math.min(innerHeight,Math.ceil(r.bottom+6))-y};});expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');}finally{await page.setViewportSize({width,height:1000});}
}

test('Learning tools remain readable and operable on desktop, 320px phones, Arabic larger text and forced colors',async({page})=>{
  test.setTimeout(420000);const record=recordFor(page,'display');await mount(page,{});
  const views=[{width:1280,locale:'en',reading:false,theme:'light',name:'desktop-light'},{width:320,locale:'en',reading:false,theme:'light',name:'phone-light'},{width:320,locale:'en',reading:false,theme:'dark',name:'phone-dark'},{width:320,locale:'ar',reading:true,theme:'dark',name:'phone-arabic-dark-larger'},{width:320,locale:'en',reading:false,theme:'forced-colors',name:'phone-forced-colors'}];
  for(const view of views){
    record.currentDisplay=view;await display(page,view);await measure(page,record,view);await scan(page,record,view);
    expect(await page.locator(journey+' .anatomy-scale-track').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(view.width===1280?2:1);
    if(view.locale==='ar'){
      expect(await page.evaluate(()=>document.documentElement.dir)).toBe('rtl');await expect(page.locator(journey+' h3')).toContainText(/[\u0600-\u06ff]/);await expect(page.locator(tissue)).toHaveAccessibleName(/[\u0600-\u06ff]/);
      const dict=JSON.parse(await readFile('lang/arabic.js','utf8'));await expect(page.locator(tissue)).toContainText(dict.stem.anatomy.scale_open_detail);await expect(page.locator(cell)).toContainText(dict.stem.anatomy.scale_open_cell);
      await expect(page.locator(tools)).not.toContainText('Open detail view');await expect(page.locator(tools)).not.toContainText('Learning tools');expect(await page.locator(journey+' [data-scale-stage="structure"] bdi').count()).toBe(1);
    }
    await page.locator(tools+' > summary').focus();await page.keyboard.press('Tab');await expect(page.locator(tissue)).toBeFocused();const focus=await page.locator(tissue).evaluate(element=>({width:getComputedStyle(element).outlineWidth,style:getComputedStyle(element).outlineStyle,color:getComputedStyle(element).outlineColor}));expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);expect(focus.style).toBe('solid');record.steps.push({view,keyboardFocus:focus});
    await page.keyboard.press('Shift+Tab');await expect(page.locator(tools+' > summary')).toBeFocused();const summaryFocus=await page.locator(tools+' > summary').evaluate(element=>{const css=getComputedStyle(element),parent=getComputedStyle(element.parentElement!);return {width:css.outlineWidth,offset:css.outlineOffset,style:css.outlineStyle,parentOverflow:parent.overflow};});
    expect(parseFloat(summaryFocus.width)).toBeGreaterThanOrEqual(3);expect(summaryFocus.style).toBe('solid');expect(parseFloat(summaryFocus.offset),'The summary outline stays inside its clipping container').toBeLessThanOrEqual(-parseFloat(summaryFocus.width));record.steps.push({view,summaryFocus});
    if(view.width!==1280){await page.keyboard.press('Tab');await expect(page.locator(tissue)).toBeFocused();}
    await capture(page,record,page.locator(tools),view.name+'-learning-tools');
  }
  expect(record.scans).toHaveLength(5);expect(record.captures).toHaveLength(5);expect(record.errors).toEqual([]);
});

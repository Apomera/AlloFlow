import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_VISUAL_POLISH_QA_OUT||'reports/anatomy-visual-polish-2026-10-01';
const phase=process.env.ANATOMY_VISUAL_POLISH_PHASE||'after';
const captureOut=out+'/'+phase;
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const validation:Record<string,any>={};

test.use({video:'off',trace:'off'});
test.describe.configure({mode:'serial',retries:0,timeout:300000});
test.beforeAll(async()=>{await harness.start();await mkdir(captureOut,{recursive:true});const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex')};});
test.afterAll(async()=>{await writeFile(out+'/'+phase+'-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>{if(page)await harness.destroy(page);});

async function frame(page:Page){
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
}
async function mounted(page:Page,state:Record<string,any>){
  await harness.mount(page,{anatomy:{complexity:3,view:'anterior',_bodyView3d:false,_startHereDismissed:true,...state}},undefined,{expectCanvas:false});
  await frame(page);
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
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
async function inspect(page:Page,record:any,area:string,locator:Locator){
  await expect(locator).toBeVisible();
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const metrics=await locator.evaluate(element=>{
    const rect=element.getBoundingClientRect();
    return {width:rect.width,height:rect.height,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,
      text:Array.from(element.querySelectorAll('h2,h3,h4,h5,h6,p,label,button')).filter(node=>node.getClientRects().length>0).map(node=>{const box=node.getBoundingClientRect(),style=getComputedStyle(node);return {tag:node.tagName,text:node.textContent?.trim().slice(0,100),font:style.fontSize,lineHeight:style.lineHeight,color:style.color,height:box.height,width:box.width};})};
  });
  record.screens.push({area,dimensions,metrics});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
}

test('Anatomy teaching screens retain their content and fit desktop and phone layouts',async({page})=>{
  const record:any={errors:[],screens:[]};validation.visualPolish=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});
  await mounted(page,{_activeTab:'explore',system:'circulatory',selectedStructure:'heart',_structuresViewed:{heart:true},_structureConfidence:{heart:'learning'},_confidenceAt:{heart:Date.now()},_structureNotes:{heart:'The right and left sides pump blood through different circuits.'}});
  const detail=page.locator('[data-anatomy-structure-detail="heart"]');await expect(detail).toBeVisible();
  await inspect(page,record,'desktop-explore',page.locator('[data-anatomy-workspace]'));
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:captureOut+'/desktop-explore.png'});
  await page.setViewportSize({width:320,height:1000});
  await inspect(page,record,'phone-explore',page.locator('[data-anatomy-workspace]'));
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:captureOut+'/phone-explore.png'});
  await capture(page,detail,captureOut+'/phone-detail.png');

  await harness.destroy(page);
  await mounted(page,{_activeTab:'tour',system:'circulatory',selectedStructure:'coronary',_tourActive:true,_tourSystem:'circulatory',_tourStepIdx:2});
  const tour=page.locator('[data-anatomy-tour-panel]');await expect(tour.locator('[data-anatomy-tour-step]')).toHaveAttribute('data-anatomy-tour-step','2');
  await inspect(page,record,'phone-tour',tour);await capture(page,tour,captureOut+'/phone-tour.png');

  await harness.destroy(page);
  await mounted(page,{_activeTab:'pathways',system:'respiratory',selectedStructure:'alveoli',_activePathway:'path_blood',_pathwayStep:3});
  const pathway=page.locator('[data-anatomy-pathway-panel]');await expect(pathway.locator('[data-anatomy-pathway-step]')).toHaveAttribute('data-anatomy-pathway-step','3');
  await inspect(page,record,'phone-pathway',pathway);await capture(page,pathway,captureOut+'/phone-pathway.png');

  await harness.destroy(page);
  await mounted(page,{_activeTab:'flashcards',system:'skeletal',_flashcardScope:'all',_structureConfidence:{ribs:'practice'},_confidenceAt:{ribs:Date.now()}});
  const cards=page.locator('[data-anatomy-flashcards]');await expect(cards.locator('[data-anatomy-recall-card]')).toBeVisible();
  await inspect(page,record,'phone-cards',cards);await capture(page,cards,captureOut+'/phone-cards.png');
  record.finalState=await page.evaluate(()=>(window as any).__toolData.anatomy);
  expect(record.screens).toHaveLength(5);expect(record.errors).toEqual([]);
});


const themes=['light','dark','contrast'];
const visualContexts=[{width:1280,locale:'en',reading:false},{width:320,locale:'en',reading:false},{width:320,locale:'ar',reading:true}];
const savedNote='My saved explanation stays intact while I change the display.';
async function visualContext(page:Page,context:{width:number,locale:string,reading:boolean},theme:string){
  await page.setViewportSize({width:context.width,height:1000});
  const dict=context.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,theme,reading})=>{
    document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';
    document.body.className=theme==='light'?'':'theme-'+theme;
    const ctx=(window as any).__ctx;
    ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;
    ctx.updateMulti('anatomy',{_readingMode:reading});
  },{dict,theme,reading:context.reading});
}
async function visualScan(page:Page,record:any,selector:string,context:any,theme:string){
  const panel=page.locator(selector);await expect(panel).toBeVisible();
  const layout=await panel.evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right,background:getComputedStyle(element).backgroundColor}));
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{
    const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  },selector);
  record.scans.push({...context,theme,layout,dimensions,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(layout.scroll).toBeLessThanOrEqual(layout.client+1);
  expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeLessThanOrEqual(dimensions.width);
  expect(violations).toEqual([]);
}
async function minimumTargets(locator:Locator){
  const targets=await locator.evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>({label:element.getAttribute('aria-label')||element.textContent?.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
  expect(targets.length).toBeGreaterThan(0);
  for(const target of targets){expect(target.width,target.label||'control').toBeGreaterThanOrEqual(44);expect(target.height,target.label||'control').toBeGreaterThanOrEqual(44);}
  return targets;
}
const anatomyState=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);

test('Structure explanations stay legible across themes, phones and Arabic larger text',async({page})=>{
  if(phase==='baseline'){test.skip();return;}
  const record:any={errors:[],scans:[],styles:[],metadata:[]};validation.detail=record;
  page.on('pageerror',error=>record.errors.push(error.message));await page.emulateMedia({reducedMotion:'reduce'});
  await mounted(page,{_activeTab:'explore',system:'circulatory',selectedStructure:'heart',_structureNotes:{heart:savedNote},_structureConfidence:{heart:'learning'},_confidenceAt:{heart:Date.now()}});
  const panel=page.locator('[data-anatomy-structure-detail="heart"]'),functionCard=panel.locator('.anatomy-detail-function');
  await expect(functionCard.getByRole('heading',{level:5})).toHaveCount(1);
  await expect(functionCard.locator('p')).toContainText('A muscular pump with four chambers.');
  for(const context of visualContexts)for(const theme of themes){
    await visualContext(page,context,theme);
    const styles=await panel.evaluate(element=>{
      const root=getComputedStyle(element),next=element.querySelector('[data-anatomy-browse="next"]')!,counter=element.querySelector('.anatomy-detail-navigation>span')!;
      const nextStyle=getComputedStyle(next),counterStyle=getComputedStyle(counter);
      const texts=Array.from(element.querySelectorAll('.anatomy-detail-function :is(p,h5),.anatomy-myth-buster :is(p,span),.anatomy-relation-map :is(p,span,strong,button),.anatomy-confidence :is(p,button),.anatomy-own-words :is(label,p,span,textarea)')).filter(node=>node.getClientRects().length);
      return {background:root.backgroundColor,left:root.borderLeftWidth,right:root.borderRightWidth,nextColor:nextStyle.color,nextBackground:nextStyle.backgroundColor,counterColor:counterStyle.color,texts:texts.map(node=>({text:node.textContent?.trim().slice(0,60),font:parseFloat(getComputedStyle(node).fontSize)}))};
    });
    expect(styles.left).toBe(context.locale==='ar'?'2px':'4px');expect(styles.right).toBe(context.locale==='ar'?'4px':'2px');
    if(theme==='dark'){expect(styles.background).toBe('rgb(15, 23, 42)');expect(styles.nextColor).toBe('rgb(226, 232, 240)');expect(styles.nextBackground).toBe('rgb(15, 23, 42)');expect(styles.counterColor).toBe('rgb(203, 213, 225)');}
    if(context.reading)for(const text of styles.texts)expect(text.font,text.text||'reading text').toBeGreaterThanOrEqual(17);
    if(context.reading){const actions=panel.locator('.anatomy-structure-detail-actions');const widths=await actions.evaluate(element=>({grid:element.clientWidth,back:element.querySelector('.anatomy-detail-back-list')!.getBoundingClientRect().width}));expect(Math.abs(widths.grid-widths.back)).toBeLessThanOrEqual(1);record.readingBackActionFullWidth=true;}
    record.styles.push({...context,theme,...styles,targets:await minimumTargets(panel.locator('.anatomy-structure-detail-actions button,.anatomy-detail-section-heading button,.anatomy-myth-heading button,.anatomy-relation-map button,.anatomy-detail-navigation button'))});
    if(context.width===320&&context.locale==='en'&&theme==='light'){
      const rows=await panel.locator('.anatomy-structure-detail-actions button').evaluateAll(elements=>[...new Set(elements.map(element=>Math.round(element.getBoundingClientRect().top)))]);
      expect(rows).toHaveLength(2);record.phoneActionRows=rows.length;
    }
    if(theme==='dark')expect(await panel.locator('.anatomy-relation-map').evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(30, 41, 59)');
    await visualScan(page,record,'[data-anatomy-structure-detail="heart"]',context,theme);
    expect((await anatomyState(page))._structureNotes.heart).toBe(savedNote);
    if(context.width===320&&theme==='dark')await capture(page,panel,captureOut+(context.locale==='ar'?'/phone-detail-arabic-dark.png':'/phone-detail-dark.png'));
  }
  await visualContext(page,{width:320,locale:'en',reading:false},'light');
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await visualScan(page,record,'[data-anatomy-structure-detail="heart"]',{width:320,locale:'en',reading:false,forcedColors:true},'forced-colors');
  await minimumTargets(panel.locator('.anatomy-detail-primary,.anatomy-detail-section-heading button'));
  await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
  await panel.locator('[data-anatomy-practice-structure="heart"]').click();
  await expect(page.locator('[data-anatomy-recall-card="heart"]')).toBeVisible();expect((await anatomyState(page))._structureNotes.heart).toBe(savedNote);
  record.practiceKeepsNote=true;
  await harness.destroy(page);
  await mounted(page,{_activeTab:'explore',system:'muscular',selectedStructure:'biceps'});
  const metadata=page.locator('.anatomy-detail-metadata');await expect(metadata).toBeVisible();
  await expect(metadata.getByRole('heading',{level:5})).toHaveCount(2);
  for(const width of [1280,320]){
    await page.setViewportSize({width,height:1000});
    const boxes=await metadata.locator(':scope>div').evaluateAll(elements=>elements.map(element=>({x:element.getBoundingClientRect().x,y:element.getBoundingClientRect().y,client:element.clientWidth,scroll:element.scrollWidth})));
    expect(boxes).toHaveLength(2);for(const box of boxes)expect(box.scroll).toBeLessThanOrEqual(box.client+1);
    if(width===320)expect(boxes[1].y).toBeGreaterThan(boxes[0].y);else expect(boxes[1].y).toBe(boxes[0].y);
    record.metadata.push({width,boxes});
  }
  await capture(page,metadata,captureOut+'/phone-muscle-metadata.png');expect(record.errors).toEqual([]);
});

for(const mode of ['tour','pathways'])test(mode+' teaching steps keep clear context and balanced navigation in every display',async({page})=>{
  if(phase==='baseline'){test.skip();return;}
  const record:any={errors:[],scans:[],styles:[]};validation[mode]=record;page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  const tour=mode==='tour';
  await mounted(page,{_activeTab:mode,system:tour?'circulatory':'respiratory',selectedStructure:tour?'coronary':'alveoli',_tourActive:true,_tourSystem:'circulatory',_tourStepIdx:2,_activePathway:'path_blood',_pathwayStep:3,_structureNotes:{heart:savedNote}});
  const selector=tour?'[data-anatomy-tour-panel]':'[data-anatomy-pathway-panel]',panel=page.locator(selector),step=panel.locator('.anatomy-teaching-step');
  await expect(step).toBeVisible();await expect(step).toHaveAttribute('role','status');await expect(step).toHaveAttribute('aria-live','polite');
  for(const context of visualContexts)for(const theme of themes){
    await visualContext(page,context,theme);
    const styles=await step.evaluate(element=>{
      const heading=element.querySelector('h5')!,narration=element.querySelector('.anatomy-step-narration')!,context=element.querySelector('.anatomy-step-context')!,button=context.querySelector('button')!;
      return {background:getComputedStyle(element).backgroundColor,title:parseFloat(getComputedStyle(heading).fontSize),prose:parseFloat(getComputedStyle(narration).fontSize),contextClient:context.clientWidth,contextScroll:context.scrollWidth,markerWidth:button.getBoundingClientRect().width,contextInner:context.clientWidth-parseFloat(getComputedStyle(context).paddingLeft)-parseFloat(getComputedStyle(context).paddingRight)};
    });
    expect(styles.title).toBeGreaterThanOrEqual(context.reading?23:21);expect(styles.prose).toBeGreaterThanOrEqual(context.reading?17:16);
    expect(styles.contextScroll).toBeLessThanOrEqual(styles.contextClient+1);expect(Math.abs(styles.markerWidth-styles.contextInner)).toBeLessThanOrEqual(1);
    if(theme==='dark')expect(styles.background).toBe('rgb(15, 23, 42)');
    const widths=await panel.locator('.anatomy-step-navigation button').evaluateAll(elements=>elements.map(element=>element.getBoundingClientRect().width));
    expect(widths).toHaveLength(2);expect(Math.abs(widths[0]-widths[1])).toBeLessThanOrEqual(1);
    record.styles.push({...context,theme,...styles,navWidths:widths,targets:await minimumTargets(panel.locator('.anatomy-step-context button,.anatomy-step-resources button,.anatomy-step-navigation button'))});
    await visualScan(page,record,selector,context,theme);
    if(context.locale==='ar'&&theme==='dark')await capture(page,panel,captureOut+'/phone-'+mode+'-arabic-dark.png');
  }
  await visualContext(page,{width:320,locale:'en',reading:false},'light');
  await panel.locator(tour?'[data-anatomy-tour-diagram]':'[data-anatomy-pathway-diagram]').click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  expect((await anatomyState(page))._activeTab).toBe(mode);expect((await anatomyState(page))._structureNotes.heart).toBe(savedNote);
  await panel.locator('.anatomy-step-navigation button').last().click();await expect(step).toBeFocused();
  await expect(step).toHaveAttribute(tour?'data-anatomy-tour-step':'data-anatomy-pathway-step',tour?'3':'4');
  expect((await anatomyState(page))._structureNotes.heart).toBe(savedNote);record.diagramAndNextKeepNote=true;
  expect(record.errors).toEqual([]);
});

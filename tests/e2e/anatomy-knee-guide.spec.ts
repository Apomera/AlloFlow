import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_KNEE_GUIDE_QA_OUT||'reports/anatomy-knee-guide-2026-10-04';
const captures=out+'/screenshots';
const atlas='[data-anatomy-atlas="patella"]';
const stepDetail='#anatomy-knee-step-detail';
const flow=atlas+' [data-anatomy-knee-flow]';
const previous=atlas+' [data-anatomy-knee-previous]';
const next=atlas+' [data-anatomy-knee-next]';
const stepIds=['knee_architecture','knee_extension','knee_flexion','knee_stability'];
const mechanisms=['joint-load-distribution','patellar-lever-arm','tibial-flexion-geometry','ligament-translation-restraint'];
const mechanismCaptions=['load spreads across cartilage + menisci','patella increases lever arm','flexed tibia position','ligaments limit translation'];
const routePaths=['M249 151 C269 129 324 122 374 149 C390 165 385 194 366 207 C329 226 282 218 258 196','M220 28 L226 116 L230 180 C242 205 257 229 275 244','M382 294 C414 263 421 214 405 175 C396 153 383 136 364 124','M289 193 L351 139 M333 191 L292 139 M369 136 C385 160 393 193 408 231'];
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const validation:Record<string,any>={};
const base={system:'muscular',view:'anterior',complexity:1,_activeTab:'explore',quizMode:false,selectedStructure:'quads',search:'',_studyFilter:'all',_bodyView3d:false,_startHereDismissed:true,
  _structureNotes:{quads:'My saved explanation of knee extension.',patella:'My saved explanation of knee mechanics.',biceps:'My saved explanation of skeletal muscle force.'},_structureConfidence:{quads:'learning',patella:'learning',biceps:'practice'},
  _spotterScore:2,_spotterTotal:3,quizIdx:2,_quizAttempts:4,quizScore:3,quizFeedback:'saved-feedback',_quizSeed:23,
  _flashcardRounds:{muscular:1},_connectionConcepts:{version:1,answers:{conn_3:'choice_1'}},_anatomyLensViewed:{patella:true}};
const workKeys=['_structureNotes','_structureConfidence','_spotterScore','_spotterTotal','quizIdx','_quizAttempts','quizScore','quizFeedback','_quizSeed','_quizQuestion','_flashcardRounds','_connectionConcepts'];
type View={width:number,locale:string,reading:boolean,theme:string,name:string};

test.use({video:'off',trace:'off'});
test.describe.configure({mode:'default',retries:0,timeout:300000});
test.beforeAll(async()=>{
  await mkdir(captures,{recursive:true});
  const [source,mirror]=await Promise.all([readFile('stem_lab/stem_tool_anatomy.js','utf8'),readFile('desktop/web-app/public/stem_lab/stem_tool_anatomy.js','utf8')]);
  validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),sourceRawSha256:createHash('sha256').update(source).digest('hex'),mirrorsEqual:source===mirror,startedAt:new Date().toISOString()};
  expect(source).toBe(mirror);
  if(process.env.ANATOMY_KNEE_GUIDE_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_KNEE_GUIDE_SOURCE_HASH);
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
  await harness.destroy(page);await page.close();
});
const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
function recordFor(page:Page,name:string){const record:any={errors:[],steps:[],scans:[],styles:[],captures:[]};validation[name]=record;page.on('pageerror',error=>record.errors.push(error.message));return record;}
function work(data:Record<string,any>){return Object.fromEntries(workKeys.map(key=>[key,data[key]]));}
async function sameWork(page:Page,expected:Record<string,any>){const data=await state(page);for(const key of workKeys)expect(data[key],'saved learning work: '+key).toEqual(expected[key]);return data;}
async function mount(page:Page,data:Record<string,any>={}){
  await harness.mount(page,{anatomy:{...base,...data}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
}
async function assertStep(page:Page,index:number,playing:boolean){
  await expect(page.locator(atlas)).toHaveAttribute('data-anatomy-atlas-step',stepIds[index]);
  await expect(page.locator(atlas+' [data-anatomy-knee-step][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator(atlas+' [data-anatomy-knee-step="'+stepIds[index]+'"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(stepDetail)).toHaveAttribute('role','status');await expect(page.locator(stepDetail)).toHaveAttribute('aria-live','polite');await expect(page.locator(stepDetail)).toHaveAttribute('aria-atomic','true');
  await expect(page.locator(stepDetail)).toContainText('Step '+(index+1)+' of 4');
  await expect(page.locator(atlas+' [data-anatomy-mechanism]')).toHaveCount(8);
  await expect(page.locator(atlas+' [data-anatomy-mechanism].is-active')).toHaveCount(2);
  for(const group of await page.locator(atlas+' [data-anatomy-mechanism="'+mechanisms[index]+'"]').all())await expect(group).toHaveClass(/is-active/);
  await expect(page.locator(atlas+' [data-anatomy-knee-mechanism-caption]')).toContainText(mechanismCaptions[index]);
  await expect(page.locator(atlas+' .anatomy-atlas-route')).toHaveCount(8);await expect(page.locator(atlas+' .anatomy-atlas-route.is-active')).toHaveCount(2);
  await expect(page.locator(atlas+' [data-anatomy-knee-route="'+index+'"].is-active')).toHaveCount(2);
  for(const figure of await page.locator(atlas+' figure[data-anatomy-knee-scale]').all()){
    const suffix=await figure.getAttribute('data-anatomy-knee-scale')==='support'?'-support':'';
    for(const [position,path] of routePaths.entries())await expect(figure.locator('[data-anatomy-knee-route="'+position+'"]')).toHaveAttribute('d',path);
    const ids=await figure.locator('marker').evaluateAll(nodes=>nodes.map(node=>node.id));expect(ids).toEqual(['anatomy-arrow-joint','anatomy-arrow-extension','anatomy-arrow-flexion','anatomy-arrow-stability'].map(id=>id+suffix));
    for(const path of ['M289 193 L351 139','M333 191 L292 139'])await expect(figure.locator('path[d="'+path+'"]')).toHaveAttribute('stroke-width',index===3?'9':'6');
    await expect(figure.locator('path[d="M369 136 C385 160 393 193 408 231"]')).toHaveAttribute('stroke-width',index===3?'8':'5');
    for(const path of ['M220 22 C219 64 220 96 226 120','M234 181 C244 201 256 222 275 244'])await expect(figure.locator('path[d="'+path+'"]')).toHaveAttribute('stroke-width',index===1?'11':'7');
  }
  await expect(page.locator(flow)).toHaveText(playing?'Pause motion':'Play motion');
  await expect(page.locator(atlas+' .anatomy-knee-playback')).toHaveText(playing?'Motion playing':'Motion paused');
  expect((await state(page))._regionalAtlasPlaying).toBe(playing);
  if(playing)await expect(page.locator(atlas)).not.toHaveClass(/is-paused/);else await expect(page.locator(atlas)).toHaveClass(/is-paused/);
  if(index===0)await expect(page.locator(previous)).toBeDisabled();else await expect(page.locator(previous)).toBeEnabled();
  if(index===3)await expect(page.locator(next)).toBeDisabled();else await expect(page.locator(next)).toBeEnabled();
}
async function assertFigures(page:Page){
  await expect(page.locator(atlas+' figure[data-anatomy-knee-scale]')).toHaveCount(2);
  for(const scale of ['overview','support']){
    const figure=page.locator(atlas+' figure[data-anatomy-knee-scale="'+scale+'"]');await expect(figure).toBeVisible();
    await expect(figure).toHaveAccessibleName(/\S/);await expect(figure.locator('svg')).toHaveAttribute('role','img');await expect(figure.locator('svg')).toHaveAccessibleName(/\S/);await expect(figure.locator('svg title')).toHaveCount(1);await expect(figure.locator('svg desc')).toHaveCount(1);await expect(figure.locator('svg desc')).not.toBeEmpty();
    await expect(figure.locator('figcaption')).toBeVisible();await expect(figure.locator('li')).toHaveCount(scale==='overview'?4:7);await expect(figure.locator('[data-anatomy-knee-marker]')).toHaveCount(scale==='overview'?4:7);
    const numeric=await figure.locator('[data-anatomy-knee-marker] text').allTextContents();expect(numeric).toEqual(Array.from({length:scale==='overview'?4:7},(_,index)=>String(index+1)));
    await expect(figure.locator('svg')).toHaveAttribute('direction','ltr');
  }
}

async function assertClinicalPaintOrder(page:Page){
  const ordering=await page.locator(atlas+' figure[data-anatomy-knee-scale]').evaluateAll(figures=>figures.map(figure=>{
    const overlay=figure.querySelector('[data-anatomy-clinical-overlay="acl_tear"]');if(!overlay)throw Error('Missing ACL clinical overlay');
    const routes=[...figure.querySelectorAll('[data-anatomy-knee-route]')];return {scale:figure.getAttribute('data-anatomy-knee-scale'),routes:routes.map(route=>({step:route.getAttribute('data-anatomy-knee-route'),sameSVG:route.ownerSVGElement===overlay.ownerSVGElement,overlayPaintsAfter:!!(route.compareDocumentPosition(overlay)&Node.DOCUMENT_POSITION_FOLLOWING)}))};
  }));
  expect(ordering).toHaveLength(2);for(const drawing of ordering){expect(drawing.routes.map(route=>route.step)).toEqual(['0','1','2','3']);for(const route of drawing.routes){expect(route.sameSVG,drawing.scale+' clinical overlay and route share the SVG').toBe(true);expect(route.overlayPaintsAfter,drawing.scale+' ACL interruption paints above route '+route.step).toBe(true);}}
  return ordering;
}

test('A learner explores four knee steps, retains paused motion and saved work, and follows muscle force with keyboard focus',async({page})=>{
  const record=recordFor(page,'journey');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mount(page);
  const saved=work(await state(page)),tools=page.locator('[data-anatomy-learning-tools]');if(!await tools.evaluate(element=>(element as HTMLDetailsElement).open))await tools.locator('summary').click();
  await page.locator('[data-anatomy-learning-tools] button[data-scale-stage="tissue"]').click();await expect(page.locator('#anatomy-lens-title')).toBeFocused();await sameWork(page,saved);
  await page.locator('[data-anatomy-lens-id="patella"]').click();await expect(page.locator(atlas)).toBeFocused();await expect(page.locator('[data-anatomy-lens]')).toHaveCount(0);
  const opened=await sameWork(page,saved);expect(opened).toMatchObject({system:'skeletal',view:'anterior',complexity:2,selectedStructure:'patella',_regionalAtlasOpen:'patella',_regionalAtlasStep:0,_regionalAtlasPlaying:true});await assertFigures(page);
  await expect(page.locator(atlas+' .anatomy-atlas-steps [data-anatomy-knee-step]')).toHaveCount(4);
  await expect(page.locator(atlas+' [data-anatomy-knee-orientation]')).toContainText('the patella to the left of the femur and tibia');
  for(const id of stepIds)await expect(page.locator(atlas+' [data-anatomy-knee-step="'+id+'"]')).toHaveAttribute('aria-controls','anatomy-knee-step-detail');
  await assertStep(page,0,true);await page.locator(flow).click();await expect(page.locator(flow)).toBeFocused();await assertStep(page,0,false);record.steps.push({action:'pause knee motion',focus:'flow',workPreserved:true});
  await page.evaluate(()=>{const current=(window as any).__toolData.anatomy;(window as any).__ctx.updateMulti('anatomy',{_structureNotes:{...current._structureNotes,patella:'A newer saved explanation while knee motion is paused.'}});});const newer=work(await state(page));
  for(let index=1;index<4;index++){
    const button=page.locator(atlas+' [data-anatomy-knee-step="'+stepIds[index]+'"]');await button.focus();await page.keyboard.press('Enter');await expect(button).toBeFocused();await assertStep(page,index,false);await sameWork(page,newer);record.steps.push({action:'choose step',step:stepIds[index],playing:false,focus:'step',workPreserved:true,originalGeometryVerified:true});
  }
  for(let index=2;index>=0;index--){await page.locator(previous).click();await assertStep(page,index,false);if(index>0)await expect(page.locator(previous)).toBeFocused();else await expect(page.locator(atlas)).not.toBeFocused();await sameWork(page,newer);}
  await page.locator(previous).evaluate(element=>(element as HTMLButtonElement).click());await assertStep(page,0,false);record.steps.push({action:'previous stops at first step',boundary:'start',playing:false});
  for(let index=1;index<4;index++){await page.locator(next).click();await assertStep(page,index,false);if(index<3)await expect(page.locator(next)).toBeFocused();else await expect(page.locator(atlas)).not.toBeFocused();await sameWork(page,newer);}
  await page.locator(next).evaluate(element=>(element as HTMLButtonElement).click());await assertStep(page,3,false);record.steps.push({action:'next stops at final step',boundary:'end',playing:false});
  await page.locator(flow).click();await expect(page.locator(flow)).toBeFocused();await assertStep(page,3,true);await page.locator(previous).click();await assertStep(page,2,true);await page.locator(next).click();await assertStep(page,3,true);await sameWork(page,newer);record.steps.push({action:'step while playing retains motion preference',playing:true});
  await page.locator(atlas+' [data-anatomy-clinical-toggle="patella"]').click();await expect(page.locator(atlas+' [data-anatomy-clinical-toggle="patella"]')).toBeFocused();await expect(page.locator(atlas+' [data-anatomy-clinical-toggle="patella"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(atlas+' [data-anatomy-clinical-panel="acl_tear"]')).toBeVisible();const overlays=page.locator(atlas+' [data-anatomy-clinical-overlay="acl_tear"]');await expect(overlays).toHaveCount(2);for(const overlay of await overlays.all()){await expect(overlay.locator('path')).toHaveCount(2);await expect(overlay.locator('path').nth(0)).toHaveAttribute('d','M289 193 L312 173 M327 160 L351 139');await expect(overlay.locator('path').nth(1)).toHaveAttribute('d','M313 164 L326 176 M326 164 L313 176');}await sameWork(page,newer);record.clinicalPaintOrder=await assertClinicalPaintOrder(page);
  await expect(page.locator(atlas+' [data-anatomy-clinical-panel="acl_tear"]')).toContainText(/anterior tibial translation and rotation/);const clinicalText=await page.locator(atlas+' [data-anatomy-clinical-overlay="acl_tear"] text').evaluateAll(elements=>elements.filter(element=>element.getBoundingClientRect().width&&element.getBoundingClientRect().height).map(element=>element.textContent));expect(clinicalText).toEqual([]);record.steps.push({action:'clinical overlay retains original interrupted-ligament geometry and readable explanation',workPreserved:true});
  await capture(page,record,page.locator(atlas),'desktop-knee-clinical-step-4');
  await page.locator(flow).click();await assertStep(page,3,false);
  const handoff=page.locator(atlas+' [data-anatomy-knee-handoff]');await handoff.focus();await page.keyboard.press('Enter');const muscle=page.locator('[data-anatomy-atlas="biceps"]');await expect(muscle).toBeFocused();await expect(page.locator(atlas)).toHaveCount(0);const destination=await sameWork(page,newer);expect(destination).toMatchObject({system:'muscular',view:'anterior',selectedStructure:'biceps',_regionalAtlasOpen:'biceps',_regionalAtlasStep:3,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});await expect(muscle).not.toHaveClass(/is-clinical/);await expect(muscle.locator('[data-anatomy-clinical-panel]')).toHaveCount(0);await expect(muscle.locator('button').first()).toHaveText('Play activation');record.steps.push({action:'follow muscle force with keyboard',destinationStep:3,clinical:false,playing:false,workPreserved:true});
  if(!await page.locator('[data-anatomy-lens-toggle]').isVisible())await page.locator('.anatomy-explorer-settings-toggle').click();const gallery=page.locator('[data-anatomy-lens-toggle]');await gallery.focus();await page.keyboard.press('Enter');await expect(page.locator('#anatomy-lens-title')).toBeFocused();await sameWork(page,newer);await page.locator('[data-anatomy-lens-id="patella"]').focus();await page.keyboard.press('Enter');await expect(page.locator(atlas)).toBeFocused();const returned=await sameWork(page,newer);expect(returned).toMatchObject({system:'skeletal',view:'anterior',selectedStructure:'patella',_regionalAtlasOpen:'patella',_regionalAtlasStep:0,_regionalAtlasPlaying:true,_regionalAtlasClinical:false});await assertStep(page,0,true);record.steps.push({action:'reopen knee through lens gallery with keyboard',destinationStep:0,clinical:false,playing:true,workPreserved:true});
  await page.locator(flow).click();await assertStep(page,0,false);await page.locator(atlas+' [data-anatomy-knee-handoff]').focus();await page.keyboard.press('Enter');await expect(muscle).toBeFocused();await sameWork(page,newer);expect(await state(page)).toMatchObject({_regionalAtlasOpen:'biceps',_regionalAtlasStep:3,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});record.steps.push({action:'repeat knee to muscle handoff',clinical:false,playing:false,workPreserved:true});expect(record.errors).toEqual([]);
});

async function display(page:Page,view:View){
  await page.setViewportSize({width:view.width,height:1000});await page.emulateMedia({forcedColors:view.theme==='forced-colors'?'active':'none',reducedMotion:'reduce'});const dict=view.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,view})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=view.theme==='dark'?'theme-dark':'';const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:view.reading,_regionalAtlasStep:dict?3:0,_regionalAtlasClinical:!!dict});},{dict,view});await expect(page.locator(atlas)).toBeVisible();
}
async function measure(page:Page,record:any,view:View){
  const flowSymbols=await page.locator(atlas+' .anatomy-knee-flow-symbol').evaluateAll(elements=>elements.map(element=>({text:element.textContent,direction:getComputedStyle(element).direction,unicodeBidi:getComputedStyle(element).unicodeBidi})));
  expect(flowSymbols).toHaveLength(3);for(const symbol of flowSymbols){expect(symbol.direction,symbol.text+' fixed visual key symbol direction').toBe('ltr');expect(symbol.unicodeBidi,symbol.text+' isolated visual key symbol').toBe('isolate');}
  const metrics=await page.locator(atlas+' :is(h3,h4,h5,h6,p,li,strong,span,bdi,button,a,figcaption)').evaluateAll(elements=>elements.filter(element=>!(element instanceof SVGElement)&&element.getClientRects().length&&(element.tagName==='BUTTON'||[...element.childNodes].some(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim()))).map(element=>{
    const css=getComputedStyle(element),foreground=css.color;let parent:Element|null=element,background='rgb(255,255,255)',backgroundCandidates=['rgb(255,255,255)'],backgroundMethod='opaque CSS color';while(parent){const style=getComputedStyle(parent),colors=style.backgroundImage.match(/rgba?\([^)]*\)/g);if(colors?.length){backgroundCandidates=colors;background=colors[0];backgroundMethod='conservative gradient endpoints';break;}const color=style.backgroundColor,nums=color.match(/[\d.]+/g)?.map(Number);if(nums&&nums.length>=3&&(nums.length===3||nums[3]===1)){background=color;backgroundCandidates=[color];break;}parent=parent.parentElement;}
    const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background),box=element.getBoundingClientRect();return {tag:element.tagName,className:element.className,text:element.textContent?.trim().slice(0,180),font:parseFloat(css.fontSize),width:box.width,height:box.height,foreground,background,backgroundCandidates,backgroundMethod,ratio:Math.min(...backgroundCandidates.map(color=>{const value=lum(color);return(Math.max(a,value)+.05)/(Math.min(a,value)+.05)})),key:!!element.closest('figure[data-anatomy-knee-scale]')};
  }));
  const diagrams=await page.locator(atlas+' figure[data-anatomy-knee-scale]').evaluateAll(figures=>figures.map(figure=>{
    const svg=figure.querySelector('svg')!,svgBox=svg.getBoundingClientRect();
    const texts=[...svg.querySelectorAll('text')].filter(element=>element.getBoundingClientRect().width&&element.getBoundingClientRect().height).map(element=>{
      const css=getComputedStyle(element),m=element.getScreenCTM(),box=element.getBoundingClientRect();
      const circle=element.parentElement?.querySelector('circle');if(!circle)throw Error('Numbered marker needs a circular backdrop');
      const foreground=css.fill,background=getComputedStyle(circle).fill;
      const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background);
      return {text:element.textContent?.trim(),font:parseFloat(css.fontSize),effectiveFont:parseFloat(css.fontSize)*(m?Math.hypot(m.c,m.d):0),foreground,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom}};
    });
    const intersections:any[]=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i].box,b=texts[j].box;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5)intersections.push([texts[i].text,texts[j].text]);}
    return {scale:figure.getAttribute('data-anatomy-knee-scale'),width:svgBox.width,height:svgBox.height,texts,intersections};
  }));
  record.styles.push({view,flowSymbols,metrics,diagrams});expect(metrics.length).toBeGreaterThan(0);expect(diagrams).toHaveLength(2);
  for(const metric of metrics){expect(metric.font,metric.text+' rendered HTML text').toBeGreaterThanOrEqual(view.reading?17:16);expect(metric.ratio,metric.text+' actual contrast').toBeGreaterThanOrEqual(4.5);if(metric.tag==='BUTTON'){expect(metric.width,metric.text+' touch width').toBeGreaterThanOrEqual(44);expect(metric.height,metric.text+' touch height').toBeGreaterThanOrEqual(44);}}
  for(const diagram of diagrams){expect(diagram.texts.length,diagram.scale+' visible numerical markers').toBeGreaterThan(0);expect(diagram.intersections,diagram.scale+' label intersections').toEqual([]);for(const text of diagram.texts){expect(text.text,diagram.scale+' SVG text belongs in the HTML key').toMatch(/^\d+$/);expect(text.effectiveFont,diagram.scale+' marker '+text.text+' effective CSS size').toBeGreaterThanOrEqual(14);expect(text.ratio,diagram.scale+' marker '+text.text+' actual fill contrast').toBeGreaterThanOrEqual(4.5);}}
}
async function scan(page:Page,record:any,view:View){
  const boxes=await page.locator(atlas+', '+atlas+' figure[data-anatomy-knee-scale]').evaluateAll(elements=>elements.map(element=>({tag:element.tagName,scale:element.getAttribute('data-anatomy-knee-scale'),client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}))),dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},atlas);
  record.scans.push({view,boxes,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);for(const box of boxes){expect(box.scroll,box.scale||'atlas').toBeLessThanOrEqual(box.client+1);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(dimensions.width);}expect(violations).toEqual([]);
}
async function capture(page:Page,record:any,locator:Locator,name:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('Missing screenshot target '+name);await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));const clip=await locator.evaluate(element=>{const r=element.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left-6)),y=Math.max(0,Math.floor(r.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(r.right+6))-x,height:Math.min(innerHeight,Math.ceil(r.bottom+6))-y};});expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');}finally{await page.setViewportSize({width,height:1000});}
}

test('Knee bone and supporting tissue keys remain readable across desktop, 320px phones, Arabic larger text and forced colors',async({page})=>{
  test.setTimeout(420000);const record=recordFor(page,'display');await mount(page,{system:'skeletal',view:'anterior',complexity:2,selectedStructure:'patella',_regionalAtlasOpen:'patella',_regionalAtlasStep:0,_regionalAtlasPlaying:false});const saved=work(await state(page));
  const views:View[]=[{width:1280,locale:'en',reading:false,theme:'light',name:'desktop-light'},{width:320,locale:'en',reading:false,theme:'light',name:'phone-light'},{width:320,locale:'en',reading:false,theme:'dark',name:'phone-dark'},{width:320,locale:'ar',reading:true,theme:'dark',name:'phone-arabic-dark-larger'},{width:320,locale:'en',reading:false,theme:'forced-colors',name:'phone-forced-colors'}];
  for(const view of views){
    record.currentDisplay=view;await display(page,view);await assertFigures(page);await measure(page,record,view);await scan(page,record,view);await sameWork(page,saved);
    if(view.locale==='ar'){
      expect(await page.evaluate(()=>document.documentElement.dir)).toBe('rtl');const labels=JSON.parse(await readFile('lang/arabic.js','utf8')).stem.anatomy;
      for(const [scale,key] of [['overview','knee_guide_overview_title'],['support','knee_guide_support_title']])await expect(page.locator(atlas+' figure[data-anatomy-knee-scale="'+scale+'"]')).toHaveAccessibleName(labels[key]);
      await expect(page.locator(flow)).toHaveText(labels.knee_guide_play_flow);await expect(page.locator(stepDetail)).toContainText(labels.knee_guide_step_position.replace('{current}','4').replace('{total}','4'));
      await expect(page.locator(atlas+' [data-anatomy-clinical-panel="acl_tear"]')).toContainText(labels.knee_guide_clinical_effect);record.arabicClinicalPaintOrder=await assertClinicalPaintOrder(page);
      await expect(page.locator(atlas+' .anatomy-scale-continuation')).toContainText(labels.knee_guide_handoff_context);await expect(page.locator(atlas+' .anatomy-scale-continuation button')).toHaveText(labels.knee_guide_handoff_button);
    }
    const second=page.locator(atlas+' [data-anatomy-knee-step="knee_extension"]');await second.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(second).toBeFocused();const focus=await second.evaluate(element=>({width:getComputedStyle(element).outlineWidth,style:getComputedStyle(element).outlineStyle,color:getComputedStyle(element).outlineColor,offset:getComputedStyle(element).outlineOffset}));expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);expect(focus.style).toBe('solid');record.steps.push({view,keyboardFocus:focus});
    await capture(page,record,page.locator(atlas),view.name+'-knee-guide');
  }
  expect(record.scans).toHaveLength(5);expect(record.captures).toHaveLength(5);expect(record.errors).toEqual([]);
});

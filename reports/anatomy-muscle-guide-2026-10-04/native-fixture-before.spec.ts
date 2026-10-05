import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_MUSCLE_GUIDE_QA_OUT||'reports/anatomy-muscle-guide-2026-10-04';
const captures=out+'/screenshots';
const atlas='.anatomy-muscle-guide[data-anatomy-atlas]';
const stepDetail='#anatomy-muscle-step-detail';
const flow=atlas+' [data-anatomy-muscle-flow]';
const previous=atlas+' [data-anatomy-muscle-previous]';
const next=atlas+' [data-anatomy-muscle-next]';
const stepIds=['motor_terminal','end_plate','calcium_release','cross_bridge_cycle'];
const mechanisms=['terminal-calcium-entry','end-plate-depolarization','calcium-release-to-troponin','cross-bridge-power-stroke'];
const mechanismCaptions=['terminal Ca2+ entry triggers vesicle fusion','Na+ entry depolarizes the end plate','Ca2+ exposes actin binding sites','Z discs move closer'];
const routePaths=['M22 72 C94 72 160 69 218 101 C239 111 264 111 292 102','M242 108 C242 132 242 149 242 174 M280 112 C280 139 280 153 280 178','M304 181 C334 181 362 195 375 225 L375 272 C375 289 390 297 407 300','M468 258 L523 258 M595 291 L540 291'];
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
  if(process.env.ANATOMY_MUSCLE_GUIDE_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_MUSCLE_GUIDE_SOURCE_HASH);
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
async function assertIonTokens(page:Page,index:number){
  const tokens=await page.locator(atlas+' [data-anatomy-muscle-ion]').evaluateAll(nodes=>nodes.map(node=>({token:node.getAttribute('data-anatomy-muscle-ion'),text:node.textContent?.trim(),dir:node.getAttribute('dir'),direction:getComputedStyle(node).direction,unicodeBidi:getComputedStyle(node).unicodeBidi,context:node.closest('[data-anatomy-muscle-mechanism-caption]')?'caption':'key'})));
  expect(tokens.filter(token=>token.context==='key').map(token=>token.token)).toEqual(['Ca2+']);expect(tokens.filter(token=>token.context==='caption').map(token=>token.token)).toEqual(index===3?[]:[index===1?'Na+':'Ca2+']);
  for(const token of tokens){expect(token.text,'Ion text retains the authored ASCII token').toBe(token.token);expect(token.dir,token.token+' explicit HTML direction').toBe('ltr');expect(token.direction,token.token+' computed direction').toBe('ltr');expect(token.unicodeBidi,token.token+' isolated within translated text').toBe('isolate');}return tokens;
}

async function assertStep(page:Page,index:number,playing:boolean){
  await assertIonTokens(page,index);
  await expect(page.locator(atlas)).toHaveAttribute('data-anatomy-atlas-step',stepIds[index]);
  await expect(page.locator(atlas+' [data-anatomy-muscle-step][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator(atlas+' [data-anatomy-muscle-step="'+stepIds[index]+'"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(stepDetail)).toHaveAttribute('role','status');await expect(page.locator(stepDetail)).toHaveAttribute('aria-live','polite');await expect(page.locator(stepDetail)).toHaveAttribute('aria-atomic','true');
  await expect(page.locator(stepDetail)).toContainText('Step '+(index+1)+' of 4');
  await expect(page.locator(atlas+' [data-anatomy-mechanism]')).toHaveCount(5);
  await expect(page.locator(atlas+' g[data-anatomy-mechanism].is-active')).toHaveCount(1);
  await expect(page.locator(atlas+' [data-anatomy-mechanism="'+mechanisms[index]+'"]')).toHaveClass(/is-active/);
  await expect(page.locator(atlas+' [data-anatomy-muscle-mechanism-caption]')).toContainText(mechanismCaptions[index]);
  await expect(page.locator(atlas+' .anatomy-atlas-route')).toHaveCount(4);await expect(page.locator(atlas+' .anatomy-atlas-route.is-active')).toHaveCount(1);
  for(const [position,path] of routePaths.entries())await expect(page.locator(atlas+' [data-anatomy-muscle-route="'+position+'"]')).toHaveAttribute('d',path);
  await expect(page.locator(atlas+' [data-anatomy-muscle-route="'+index+'"]')).toHaveClass(/is-active/);
  const activation=page.locator(atlas+' figure[data-anatomy-muscle-scale="activation"]'),sarcomere=page.locator(atlas+' figure[data-anatomy-muscle-scale="sarcomere"]');
  await expect(activation.locator('[data-anatomy-muscle-route]')).toHaveCount(3);await expect(sarcomere.locator('[data-anatomy-muscle-route]')).toHaveCount(1);
  expect(await activation.locator('marker').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(['anatomy-arrow-neuron','anatomy-arrow-ach','anatomy-arrow-calcium']);expect(await sarcomere.locator('marker').evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(['anatomy-arrow-contraction']);
  const filaments=await page.locator(atlas+' [data-anatomy-filament]').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-anatomy-filament'),x1:Number(node.getAttribute('x1')),x2:Number(node.getAttribute('x2')),length:Math.abs(Number(node.getAttribute('x2'))-Number(node.getAttribute('x1')))})));
  expect(filaments).toEqual([{id:'actin-left',x1:index===3?482:462,x2:index===3?547:527,length:65},{id:'actin-right',x1:index===3?581:601,x2:index===3?516:536,length:65}]);
  const z=sarcomere.locator('[data-anatomy-mechanism="sarcomere-shortening"]');await expect(z).toHaveAttribute('x1',index===3?'482':'462');await expect(sarcomere.locator('line[stroke="#475569"]').nth(1)).toHaveAttribute('x1',index===3?'581':'601');
  await expect(sarcomere.locator('line[stroke="#7c3aed"][stroke-width="11"]')).toHaveAttribute('x1','493');await expect(sarcomere.locator('line[stroke="#7c3aed"][stroke-width="11"]')).toHaveAttribute('x2','570');
  await expect(activation.locator('[data-anatomy-mechanism="terminal-calcium-entry"] circle')).toHaveCount(3);await expect(activation.locator('[data-anatomy-mechanism="end-plate-depolarization"] circle')).toHaveCount(4);await expect(activation.locator('[data-anatomy-mechanism="calcium-release-to-troponin"] circle')).toHaveCount(5);
  await expect(page.locator(flow)).toHaveText(playing?'Pause activation':'Play activation');
  await expect(page.locator(atlas+' .anatomy-muscle-playback')).toHaveText(playing?'Activation playing':'Activation paused');
  expect((await state(page))._regionalAtlasPlaying).toBe(playing);
  if(playing)await expect(page.locator(atlas)).not.toHaveClass(/is-paused/);else await expect(page.locator(atlas)).toHaveClass(/is-paused/);
  if(index===0)await expect(page.locator(previous)).toBeDisabled();else await expect(page.locator(previous)).toBeEnabled();
  if(index===3)await expect(page.locator(next)).toBeDisabled();else await expect(page.locator(next)).toBeEnabled();
}
async function assertFigures(page:Page){
  await expect(page.locator(atlas+' figure[data-anatomy-muscle-scale]')).toHaveCount(2);
  for(const scale of ['activation','sarcomere']){
    const figure=page.locator(atlas+' figure[data-anatomy-muscle-scale="'+scale+'"]');await expect(figure).toBeVisible();
    await expect(figure).toHaveAccessibleName(/\S/);await expect(figure.locator('svg')).toHaveAttribute('role','img');await expect(figure.locator('svg')).toHaveAccessibleName(/\S/);await expect(figure.locator('svg title')).toHaveCount(1);await expect(figure.locator('svg desc')).toHaveCount(1);await expect(figure.locator('svg desc')).not.toBeEmpty();
    await expect(figure.locator('figcaption')).toBeVisible();await expect(figure.locator('li')).toHaveCount(scale==='activation'?8:3);await expect(figure.locator('[data-anatomy-muscle-marker]')).toHaveCount(scale==='activation'?8:3);
    const numeric=await figure.locator('[data-anatomy-muscle-marker] text').allTextContents();expect(numeric).toEqual(Array.from({length:scale==='activation'?8:3},(_,index)=>String(index+1)));
  }
}

async function assertClinicalPaintOrder(page:Page){
  const activation=page.locator(atlas+' figure[data-anatomy-muscle-scale="activation"]');await expect(activation.locator('[data-anatomy-clinical-overlay="myasthenia_gravis"]')).toHaveCount(1);await expect(page.locator(atlas+' figure[data-anatomy-muscle-scale="sarcomere"] [data-anatomy-clinical-overlay]')).toHaveCount(0);
  const ordering=await activation.evaluate(figure=>{const overlay=figure.querySelector('[data-anatomy-clinical-overlay="myasthenia_gravis"]')!;return [...figure.querySelectorAll('[data-anatomy-muscle-route]')].map(route=>({step:route.getAttribute('data-anatomy-muscle-route'),sameSVG:(route as SVGElement).ownerSVGElement===(overlay as SVGElement).ownerSVGElement,overlayPaintsAfter:!!(route.compareDocumentPosition(overlay)&Node.DOCUMENT_POSITION_FOLLOWING)}));});
  expect(ordering.map(route=>route.step)).toEqual(['0','1','2']);for(const route of ordering){expect(route.sameSVG).toBe(true);expect(route.overlayPaintsAfter,'Clinical receptor mark paints above route '+route.step).toBe(true);}return ordering;
}

test('A learner traces four muscle activation steps, retains paused motion and saved work, and follows force to the knee and back with keyboard focus',async({page})=>{
  const record=recordFor(page,'journey');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mount(page);
  const saved=work(await state(page)),tools=page.locator('[data-anatomy-learning-tools]');if(!await tools.evaluate(element=>(element as HTMLDetailsElement).open))await tools.locator('summary').click();
  await page.locator('[data-anatomy-learning-tools] button[data-scale-stage="tissue"]').click();await expect(page.locator('#anatomy-lens-title')).toBeFocused();await sameWork(page,saved);
  await page.locator('[data-anatomy-lens-id="biceps"]').click();await expect(page.locator(atlas)).toBeFocused();await expect(page.locator('[data-anatomy-lens]')).toHaveCount(0);
  const opened=await sameWork(page,saved);expect(opened).toMatchObject({system:'muscular',view:'anterior',complexity:1,selectedStructure:'biceps',_regionalAtlasOpen:'biceps',_regionalAtlasStep:0,_regionalAtlasPlaying:true});await assertFigures(page);
  await expect(page.locator(atlas+' .anatomy-atlas-steps [data-anatomy-muscle-step]')).toHaveCount(4);await expect(page.locator(atlas+' [data-anatomy-muscle-orientation]')).toContainText('close-up shows the sarcomere');
  for(const id of stepIds)await expect(page.locator(atlas+' [data-anatomy-muscle-step="'+id+'"]')).toHaveAttribute('aria-controls','anatomy-muscle-step-detail');
  await assertStep(page,0,true);await page.locator(flow).click();await expect(page.locator(flow)).toBeFocused();await assertStep(page,0,false);record.steps.push({action:'pause activation',focus:'flow',workPreserved:true});
  await page.evaluate(()=>{const current=(window as any).__toolData.anatomy;(window as any).__ctx.updateMulti('anatomy',{_structureNotes:{...current._structureNotes,biceps:'A newer saved explanation while muscle activation is paused.'}});});const newer=work(await state(page));
  for(let index=1;index<4;index++){const button=page.locator(atlas+' [data-anatomy-muscle-step="'+stepIds[index]+'"]');await button.focus();await page.keyboard.press('Enter');await expect(button).toBeFocused();await assertStep(page,index,false);await sameWork(page,newer);record.steps.push({action:'choose step',step:stepIds[index],playing:false,focus:'step',workPreserved:true,actinLength:65,originalGeometryVerified:true});}
  for(let index=2;index>=0;index--){await page.locator(previous).click();await assertStep(page,index,false);if(index>0)await expect(page.locator(previous)).toBeFocused();else await expect(page.locator(atlas)).not.toBeFocused();await sameWork(page,newer);}
  await page.locator(previous).evaluate(element=>(element as HTMLButtonElement).click());await assertStep(page,0,false);record.steps.push({action:'previous stops at first step',boundary:'start',playing:false});
  for(let index=1;index<4;index++){await page.locator(next).click();await assertStep(page,index,false);if(index<3)await expect(page.locator(next)).toBeFocused();else await expect(page.locator(atlas)).not.toBeFocused();await sameWork(page,newer);}
  await page.locator(next).evaluate(element=>(element as HTMLButtonElement).click());await assertStep(page,3,false);record.steps.push({action:'next stops at final step',boundary:'end',playing:false});
  await page.locator(flow).click();await expect(page.locator(flow)).toBeFocused();await assertStep(page,3,true);await page.locator(previous).click();await assertStep(page,2,true);await page.locator(next).click();await assertStep(page,3,true);await sameWork(page,newer);record.steps.push({action:'step while playing retains activation preference',playing:true});
  await page.locator(atlas+' [data-anatomy-clinical-toggle="biceps"]').click();await expect(page.locator(atlas+' [data-anatomy-clinical-toggle="biceps"]')).toBeFocused();await expect(page.locator(atlas+' [data-anatomy-clinical-toggle="biceps"]')).toHaveAttribute('aria-pressed','true');
  const overlay=page.locator(atlas+' [data-anatomy-clinical-overlay="myasthenia_gravis"]');await expect(overlay).toHaveCount(1);await expect(overlay.locator('path')).toHaveCount(3);expect(await overlay.locator('path').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('d')))).toEqual(['M228 173 L244 190 M244 173 L228 190','M273 173 L289 190 M289 173 L273 190','M224 205 C250 214 283 214 315 205']);record.clinicalPaintOrder=await assertClinicalPaintOrder(page);await sameWork(page,newer);
  await expect(page.locator(atlas+' [data-anatomy-clinical-panel="myasthenia_gravis"]')).toContainText(/motor end plate safety factor/);await expect(overlay.locator('text')).toHaveCount(0);record.steps.push({action:'clinical receptor marks remain visible above signal routes with readable explanation',workPreserved:true});await capture(page,record,page.locator(atlas),'desktop-muscle-clinical-step-4');
  await page.locator(flow).click();await assertStep(page,3,false);const handoff=page.locator(atlas+' [data-anatomy-muscle-handoff]');await handoff.focus();await page.keyboard.press('Enter');const knee=page.locator('[data-anatomy-atlas="patella"]');await expect(knee).toBeFocused();await expect(page.locator(atlas)).toHaveCount(0);const destination=await sameWork(page,newer);expect(destination).toMatchObject({system:'skeletal',view:'anterior',complexity:2,selectedStructure:'patella',_regionalAtlasOpen:'patella',_regionalAtlasStep:1,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});await expect(knee).not.toHaveClass(/is-clinical/);await expect(knee.locator('[data-anatomy-clinical-panel]')).toHaveCount(0);await expect(knee.locator('[data-anatomy-knee-flow]')).toHaveText('Play motion');record.steps.push({action:'apply force at knee with keyboard',destinationStep:1,level:2,clinical:false,playing:false,workPreserved:true});
  await knee.locator('[data-anatomy-knee-handoff]').focus();await page.keyboard.press('Enter');await expect(page.locator(atlas)).toBeFocused();const returned=await sameWork(page,newer);expect(returned).toMatchObject({system:'muscular',view:'anterior',complexity:2,selectedStructure:'biceps',_regionalAtlasOpen:'biceps',_regionalAtlasStep:3,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});await assertStep(page,3,false);record.steps.push({action:'return from knee force source with keyboard',destinationStep:3,clinical:false,playing:false,workPreserved:true});
  await page.locator(atlas+' [data-anatomy-muscle-handoff]').focus();await page.keyboard.press('Enter');await expect(knee).toBeFocused();await sameWork(page,newer);expect(await state(page)).toMatchObject({_regionalAtlasOpen:'patella',_regionalAtlasStep:1,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});await knee.locator('[data-anatomy-knee-handoff]').focus();await page.keyboard.press('Enter');await expect(page.locator(atlas)).toBeFocused();await sameWork(page,newer);record.steps.push({action:'repeat muscle and knee roundtrip',clinical:false,playing:false,workPreserved:true});
  await page.evaluate(()=>(window as any).__ctx.updateMulti('anatomy',{system:'muscular',view:'anterior',complexity:1,selectedStructure:'quads',_regionalAtlasOpen:'quads',_regionalAtlasStep:0,_regionalAtlasPlaying:false,_regionalAtlasClinical:false}));await expect(page.locator(atlas)).toHaveAttribute('data-anatomy-atlas','quads');await expect(page.locator(atlas+' .anatomy-muscle-intro p')).toContainText('also used by the quadriceps');await assertFigures(page);await assertStep(page,0,false);await page.locator(atlas+' [data-anatomy-muscle-step="calcium_release"]').click();await assertStep(page,2,false);await sameWork(page,newer);record.steps.push({action:'quadriceps alias shows representative cellular scope and retains paused step behavior',level:1,workPreserved:true});expect(record.errors).toEqual([]);
});

async function display(page:Page,view:View){
  await page.setViewportSize({width:view.width,height:1000});await page.emulateMedia({forcedColors:view.theme==='forced-colors'?'active':'none',reducedMotion:'reduce'});const dict=view.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,view})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=view.theme==='dark'?'theme-dark':'';const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:view.reading,_regionalAtlasStep:dict?3:0,_regionalAtlasClinical:!!dict});},{dict,view});await expect(page.locator(atlas)).toBeVisible();
}
async function measure(page:Page,record:any,view:View){
  const flowSymbols=await page.locator(atlas+' .anatomy-muscle-flow-symbol').evaluateAll(elements=>elements.map(element=>({text:element.textContent,direction:getComputedStyle(element).direction,unicodeBidi:getComputedStyle(element).unicodeBidi})));
  expect(flowSymbols).toHaveLength(3);for(const symbol of flowSymbols){expect(symbol.direction,symbol.text+' fixed visual key symbol direction').toBe('ltr');expect(symbol.unicodeBidi,symbol.text+' isolated visual key symbol').toBe('isolate');}
  const metrics=await page.locator(atlas+' :is(h3,h4,h5,h6,p,li,strong,span,bdi,button,a,figcaption)').evaluateAll(elements=>elements.filter(element=>!(element instanceof SVGElement)&&element.getClientRects().length&&(element.tagName==='BUTTON'||[...element.childNodes].some(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim()))).map(element=>{
    const css=getComputedStyle(element),foreground=css.color;let parent:Element|null=element,background='rgb(255,255,255)',backgroundCandidates=['rgb(255,255,255)'],backgroundMethod='opaque CSS color';while(parent){const style=getComputedStyle(parent),colors=style.backgroundImage.match(/rgba?\([^)]*\)/g);if(colors?.length){backgroundCandidates=colors;background=colors[0];backgroundMethod='conservative gradient endpoints';break;}const color=style.backgroundColor,nums=color.match(/[\d.]+/g)?.map(Number);if(nums&&nums.length>=3&&(nums.length===3||nums[3]===1)){background=color;backgroundCandidates=[color];break;}parent=parent.parentElement;}
    const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background),box=element.getBoundingClientRect();return {tag:element.tagName,className:element.className,text:element.textContent?.trim().slice(0,180),font:parseFloat(css.fontSize),width:box.width,height:box.height,foreground,background,backgroundCandidates,backgroundMethod,ratio:Math.min(...backgroundCandidates.map(color=>{const value=lum(color);return(Math.max(a,value)+.05)/(Math.min(a,value)+.05)})),key:!!element.closest('figure[data-anatomy-muscle-scale]')};
  }));
  const diagrams=await page.locator(atlas+' figure[data-anatomy-muscle-scale]').evaluateAll(figures=>figures.map(figure=>{
    const svg=figure.querySelector('svg')!,svgBox=svg.getBoundingClientRect();
    const texts=[...svg.querySelectorAll('text')].filter(element=>element.getBoundingClientRect().width&&element.getBoundingClientRect().height).map(element=>{
      const css=getComputedStyle(element),m=element.getScreenCTM(),box=element.getBoundingClientRect();
      const circle=element.parentElement?.querySelector('circle');if(!circle)throw Error('Numbered marker needs a circular backdrop');
      const foreground=css.fill,background=getComputedStyle(circle).fill;
      const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background);
      return {text:element.textContent?.trim(),font:parseFloat(css.fontSize),effectiveFont:parseFloat(css.fontSize)*(m?Math.hypot(m.c,m.d):0),foreground,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom}};
    });
    const intersections:any[]=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i].box,b=texts[j].box;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5)intersections.push([texts[i].text,texts[j].text]);}
    return {scale:figure.getAttribute('data-anatomy-muscle-scale'),width:svgBox.width,height:svgBox.height,texts,intersections};
  }));
  const ionTokens=await assertIonTokens(page,(await state(page))._regionalAtlasStep);record.styles.push({view,flowSymbols,metrics,diagrams,ionTokens});expect(metrics.length).toBeGreaterThan(0);expect(diagrams).toHaveLength(2);
  for(const metric of metrics){expect(metric.font,metric.text+' rendered HTML text').toBeGreaterThanOrEqual(view.reading?17:16);expect(metric.ratio,metric.text+' actual contrast').toBeGreaterThanOrEqual(4.5);if(metric.tag==='BUTTON'){expect(metric.width,metric.text+' touch width').toBeGreaterThanOrEqual(44);expect(metric.height,metric.text+' touch height').toBeGreaterThanOrEqual(44);}}
  for(const diagram of diagrams){expect(diagram.texts.length,diagram.scale+' visible numerical markers').toBeGreaterThan(0);expect(diagram.intersections,diagram.scale+' label intersections').toEqual([]);for(const text of diagram.texts){expect(text.text,diagram.scale+' SVG text belongs in the HTML key').toMatch(/^\d+$/);expect(text.effectiveFont,diagram.scale+' marker '+text.text+' effective CSS size').toBeGreaterThanOrEqual(14);expect(text.ratio,diagram.scale+' marker '+text.text+' actual fill contrast').toBeGreaterThanOrEqual(4.5);}}
}
async function scan(page:Page,record:any,view:View){
  const boxes=await page.locator(atlas+', '+atlas+' figure[data-anatomy-muscle-scale]').evaluateAll(elements=>elements.map(element=>({tag:element.tagName,scale:element.getAttribute('data-anatomy-muscle-scale'),client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}))),dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},atlas);
  record.scans.push({view,boxes,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);for(const box of boxes){expect(box.scroll,box.scale||'atlas').toBeLessThanOrEqual(box.client+1);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(dimensions.width);}expect(violations).toEqual([]);
}
async function capture(page:Page,record:any,locator:Locator,name:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('Missing screenshot target '+name);await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));const clip=await locator.evaluate(element=>{const r=element.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left-6)),y=Math.max(0,Math.floor(r.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(r.right+6))-x,height:Math.min(innerHeight,Math.ceil(r.bottom+6))-y};});expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');}finally{await page.setViewportSize({width,height:1000});}
}

test('Muscle activation and sarcomere keys remain readable across desktop, 320px phones, Arabic larger text and forced colors',async({page})=>{
  test.setTimeout(420000);const record=recordFor(page,'display');await mount(page,{system:'muscular',view:'anterior',complexity:1,selectedStructure:'biceps',_regionalAtlasOpen:'biceps',_regionalAtlasStep:0,_regionalAtlasPlaying:false});const saved=work(await state(page));
  const views:View[]=[{width:1280,locale:'en',reading:false,theme:'light',name:'desktop-light'},{width:320,locale:'en',reading:false,theme:'light',name:'phone-light'},{width:320,locale:'en',reading:false,theme:'dark',name:'phone-dark'},{width:320,locale:'ar',reading:true,theme:'dark',name:'phone-arabic-dark-larger'},{width:320,locale:'en',reading:false,theme:'forced-colors',name:'phone-forced-colors'}];
  for(const view of views){
    record.currentDisplay=view;await display(page,view);await assertFigures(page);await measure(page,record,view);await scan(page,record,view);await sameWork(page,saved);
    if(view.locale==='ar'){
      expect(await page.evaluate(()=>document.documentElement.dir)).toBe('rtl');const labels=JSON.parse(await readFile('lang/arabic.js','utf8')).stem.anatomy;
      for(const [scale,key] of [['activation','muscle_guide_activation_title'],['sarcomere','muscle_guide_sarcomere_title']])await expect(page.locator(atlas+' figure[data-anatomy-muscle-scale="'+scale+'"]')).toHaveAccessibleName(labels[key]);
      await expect(page.locator(flow)).toHaveText(labels.muscle_guide_play_flow);await expect(page.locator(stepDetail)).toContainText(labels.muscle_guide_step_position.replace('{current}','4').replace('{total}','4'));
      await expect(page.locator(atlas+' [data-anatomy-clinical-panel="myasthenia_gravis"]')).toContainText(labels.muscle_guide_clinical_effect);record.arabicClinicalPaintOrder=await assertClinicalPaintOrder(page);
      await page.evaluate(()=>(window as any).__ctx.updateMulti('anatomy',{selectedStructure:'quads',_regionalAtlasOpen:'quads'}));await expect(page.locator(atlas)).toHaveAttribute('data-anatomy-atlas','quads');const scope=page.locator(atlas+' .anatomy-muscle-intro p');await expect(scope).toBeVisible();await expect(scope).toHaveText(labels.quads_mechanism_scope);await sameWork(page,saved);record.nativeQuadsScope={locale:'ar',subtitle:await scope.textContent(),visible:true,ionTokens:await assertIonTokens(page,3)};await page.evaluate(()=>(window as any).__ctx.updateMulti('anatomy',{selectedStructure:'biceps',_regionalAtlasOpen:'biceps'}));await expect(page.locator(atlas)).toHaveAttribute('data-anatomy-atlas','biceps');

      await expect(page.locator(atlas+' .anatomy-scale-continuation')).toContainText(labels.muscle_guide_handoff_context);await expect(page.locator(atlas+' .anatomy-scale-continuation button')).toHaveText(labels.muscle_guide_handoff_button);
    }
    const second=page.locator(atlas+' [data-anatomy-muscle-step="end_plate"]');await second.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(second).toBeFocused();const focus=await second.evaluate(element=>({width:getComputedStyle(element).outlineWidth,style:getComputedStyle(element).outlineStyle,color:getComputedStyle(element).outlineColor,offset:getComputedStyle(element).outlineOffset}));expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);expect(focus.style).toBe('solid');record.steps.push({view,keyboardFocus:focus});
    await capture(page,record,page.locator(atlas),view.name+'-muscle-guide');
  }
  expect(record.scans).toHaveLength(5);expect(record.captures).toHaveLength(5);expect(record.errors).toEqual([]);
});

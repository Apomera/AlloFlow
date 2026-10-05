import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_HEART_GUIDE_QA_OUT||'reports/anatomy-heart-guide-2026-10-03';
const captures=out+'/screenshots';
const atlas='[data-anatomy-atlas="heart"]';
const stepDetail='#anatomy-heart-step-detail';
const flow=atlas+' [data-anatomy-heart-flow]';
const previous=atlas+' [data-anatomy-heart-previous]';
const next=atlas+' [data-anatomy-heart-next]';
const stepIds=['venous_return','pulmonary_outflow','pulmonary_return','systemic_outflow'];
const mechanisms=[null,'pulmonary-valve-open',null,'aortic-valve-open'];
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const validation:Record<string,any>={};
const base={system:'muscular',view:'anterior',complexity:1,_activeTab:'explore',quizMode:false,selectedStructure:'quads',search:'',_studyFilter:'all',_bodyView3d:false,_startHereDismissed:true,
  _structureNotes:{quads:'My saved explanation of knee extension.',heart:'My saved explanation of circulation.',alveoli:'My saved explanation of gas exchange.'},_structureConfidence:{quads:'learning',heart:'learning',alveoli:'practice'},
  _spotterScore:2,_spotterTotal:3,quizIdx:2,_quizAttempts:4,quizScore:3,quizFeedback:'saved-feedback',_quizSeed:23,
  _flashcardRounds:{muscular:1},_connectionConcepts:{version:1,answers:{conn_3:'choice_1'}},_anatomyLensViewed:{heart:true}};
const workKeys=['_structureNotes','_structureConfidence','_spotterScore','_spotterTotal','quizIdx','_quizAttempts','quizScore','quizFeedback','_quizSeed','_quizQuestion','_flashcardRounds','_connectionConcepts'];
type View={width:number,locale:string,reading:boolean,theme:string,name:string};

test.use({video:'off',trace:'off'});
test.describe.configure({mode:'default',retries:0,timeout:300000});
test.beforeAll(async()=>{
  await mkdir(captures,{recursive:true});
  const [source,mirror]=await Promise.all([readFile('stem_lab/stem_tool_anatomy.js','utf8'),readFile('desktop/web-app/public/stem_lab/stem_tool_anatomy.js','utf8')]);
  validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),sourceRawSha256:createHash('sha256').update(source).digest('hex'),mirrorsEqual:source===mirror,startedAt:new Date().toISOString()};
  expect(source).toBe(mirror);
  if(process.env.ANATOMY_HEART_GUIDE_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_HEART_GUIDE_SOURCE_HASH);
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
  await expect(page.locator(atlas+' [data-anatomy-heart-step][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator(atlas+' [data-anatomy-heart-step="'+stepIds[index]+'"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(stepDetail)).toHaveAttribute('role','status');await expect(page.locator(stepDetail)).toHaveAttribute('aria-live','polite');await expect(page.locator(stepDetail)).toHaveAttribute('aria-atomic','true');
  await expect(page.locator(stepDetail)).toContainText('Step '+(index+1)+' of 4');
  await expect(page.locator(atlas+' [data-anatomy-mechanism]')).toHaveCount(10);
  await expect(page.locator(atlas+' [data-anatomy-mechanism].is-active')).toHaveCount(mechanisms[index]?2:0);
  if(mechanisms[index])for(const group of await page.locator(atlas+' [data-anatomy-mechanism="'+mechanisms[index]+'"]').all())await expect(group).toHaveClass(/is-active/);
  await expect(page.locator(atlas+' .anatomy-atlas-route')).toHaveCount(8);await expect(page.locator(atlas+' .anatomy-atlas-route.is-active')).toHaveCount(2);
  await expect(page.locator(atlas+' [data-anatomy-heart-route="'+index+'"].is-active')).toHaveCount(2);
  const valveStates=[['Open','Closed','Not highlighted in this step','Not highlighted in this step'],['Closed','Closed','Open','Not highlighted in this step'],['Closed','Open','Not highlighted in this step','Not highlighted in this step'],['Closed','Closed','Not highlighted in this step','Open']];
  for(const [position,id] of ['tricuspid','mitral','pulmonary','aortic'].entries()){
    const valve=page.locator(atlas+' [data-anatomy-heart-valve="'+id+'"]');await expect(valve).toBeVisible();await expect(valve.locator('.anatomy-heart-valve-state')).toHaveText(valveStates[index][position]);await expect(valve).toHaveAttribute('data-current',valveStates[index][position]==='Open'?'true':'false');
  }
  for(const figure of await page.locator(atlas+' figure[data-anatomy-heart-scale]').all()){
    const gating=figure.locator('[data-anatomy-mechanism="heart-valve-gating"] path');await expect(gating).toHaveCount(2);
    await expect(gating.nth(0)).toHaveAttribute('d',index===0?'M253 168 L280 181 M315 168 L288 181':'M253 172 L315 172');await expect(gating.nth(1)).toHaveAttribute('d',index===2?'M348 168 L375 181 M410 168 L383 181':'M348 172 L410 172');
    await expect(figure.locator('[data-anatomy-mechanism="right-ventricle-contraction"]')).toHaveAttribute('height',index===1?'84':'96');await expect(figure.locator('[data-anatomy-mechanism="left-ventricle-contraction"]')).toHaveAttribute('height',index===3?'90':'105');
  }
  await expect(page.locator(flow)).toHaveText(playing?'Pause flow':'Play flow');
  await expect(page.locator(atlas+' .anatomy-heart-playback')).toHaveText(playing?'Flow playing':'Flow paused');
  expect((await state(page))._regionalAtlasPlaying).toBe(playing);
  if(playing)await expect(page.locator(atlas)).not.toHaveClass(/is-paused/);else await expect(page.locator(atlas)).toHaveClass(/is-paused/);
  if(index===0)await expect(page.locator(previous)).toBeDisabled();else await expect(page.locator(previous)).toBeEnabled();
  if(index===3)await expect(page.locator(next)).toBeDisabled();else await expect(page.locator(next)).toBeEnabled();
}
async function assertFigures(page:Page){
  await expect(page.locator(atlas+' figure[data-anatomy-heart-scale]')).toHaveCount(2);
  for(const scale of ['circuit','chambers']){
    const figure=page.locator(atlas+' figure[data-anatomy-heart-scale="'+scale+'"]');await expect(figure).toBeVisible();
    await expect(figure).toHaveAccessibleName(/\S/);await expect(figure.locator('svg')).toHaveAttribute('role','img');await expect(figure.locator('svg')).toHaveAccessibleName(/\S/);await expect(figure.locator('svg title')).toHaveCount(1);await expect(figure.locator('svg desc')).toHaveCount(1);await expect(figure.locator('svg desc')).not.toBeEmpty();
    await expect(figure.locator('figcaption')).toBeVisible();await expect(figure.locator('li')).toHaveCount(scale==='circuit'?3:4);
  }
}

test('A learner explores four heart steps and valves, retains paused flow and saved work, and cycles to gas exchange with keyboard focus',async({page})=>{
  const record=recordFor(page,'journey');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mount(page);
  const saved=work(await state(page)),tools=page.locator('[data-anatomy-learning-tools]');if(!await tools.evaluate(element=>(element as HTMLDetailsElement).open))await tools.locator('summary').click();
  await page.locator('[data-anatomy-learning-tools] button[data-scale-stage="tissue"]').click();await expect(page.locator('#anatomy-lens-title')).toBeFocused();await sameWork(page,saved);
  await page.locator('[data-anatomy-lens-id="heart"]').click();await expect(page.locator(atlas)).toBeFocused();await expect(page.locator('[data-anatomy-lens]')).toHaveCount(0);
  const opened=await sameWork(page,saved);expect(opened).toMatchObject({system:'circulatory',view:'anterior',complexity:1,selectedStructure:'heart',_regionalAtlasOpen:'heart',_regionalAtlasStep:0,_regionalAtlasPlaying:true});await assertFigures(page);
  await expect(page.locator(atlas+' .anatomy-atlas-steps [data-anatomy-heart-step]')).toHaveCount(4);
  await expect(page.locator(atlas+' [data-anatomy-heart-orientation]')).toContainText('the right heart appears on the left side');
  for(const id of stepIds)await expect(page.locator(atlas+' [data-anatomy-heart-step="'+id+'"]')).toHaveAttribute('aria-controls','anatomy-heart-step-detail');
  await assertStep(page,0,true);await page.locator(flow).click();await expect(page.locator(flow)).toBeFocused();await assertStep(page,0,false);record.steps.push({action:'pause circulation',focus:'flow',workPreserved:true});
  await page.evaluate(()=>{const current=(window as any).__toolData.anatomy;(window as any).__ctx.updateMulti('anatomy',{_structureNotes:{...current._structureNotes,heart:'A newer saved explanation while circulation is paused.'}});});const newer=work(await state(page));
  for(let index=1;index<4;index++){
    const button=page.locator(atlas+' [data-anatomy-heart-step="'+stepIds[index]+'"]');await button.focus();await page.keyboard.press('Enter');await expect(button).toBeFocused();await assertStep(page,index,false);await sameWork(page,newer);record.steps.push({action:'choose step',step:stepIds[index],playing:false,focus:'step',workPreserved:true,allValveStatesVerified:true});
  }
  for(let index=2;index>=0;index--){await page.locator(previous).click();await assertStep(page,index,false);if(index>0)await expect(page.locator(previous)).toBeFocused();else await expect(page.locator(atlas)).not.toBeFocused();await sameWork(page,newer);}
  await page.locator(previous).evaluate(element=>(element as HTMLButtonElement).click());await assertStep(page,0,false);record.steps.push({action:'previous stops at first step',boundary:'start',playing:false});
  for(let index=1;index<4;index++){await page.locator(next).click();await assertStep(page,index,false);if(index<3)await expect(page.locator(next)).toBeFocused();else await expect(page.locator(atlas)).not.toBeFocused();await sameWork(page,newer);}
  await page.locator(next).evaluate(element=>(element as HTMLButtonElement).click());await assertStep(page,3,false);record.steps.push({action:'next stops at final step',boundary:'end',playing:false});
  await page.locator(flow).click();await expect(page.locator(flow)).toBeFocused();await assertStep(page,3,true);await page.locator(previous).click();await assertStep(page,2,true);await page.locator(next).click();await assertStep(page,3,true);await sameWork(page,newer);record.steps.push({action:'step while playing retains flow preference',playing:true});
  await page.locator(atlas+' [data-anatomy-clinical-toggle="heart"]').click();await expect(page.locator(atlas+' [data-anatomy-clinical-toggle="heart"]')).toBeFocused();await expect(page.locator(atlas+' [data-anatomy-clinical-toggle="heart"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(atlas+' [data-anatomy-clinical-panel="aortic_stenosis"]')).toBeVisible();const overlays=page.locator(atlas+' [data-anatomy-clinical-overlay="aortic_stenosis"]');await expect(overlays).toHaveCount(2);for(const overlay of await overlays.all())await expect(overlay.locator('path')).toHaveCount(2);await sameWork(page,newer);
  await expect(page.locator(atlas+' [data-anatomy-clinical-panel="aortic_stenosis"]')).toContainText(/higher pressure/);const clinicalText=await page.locator(atlas+' [data-anatomy-clinical-overlay="aortic_stenosis"] text').evaluateAll(elements=>elements.filter(element=>element.getBoundingClientRect().width&&element.getBoundingClientRect().height).map(element=>element.textContent));expect(clinicalText).toEqual([]);record.steps.push({action:'clinical overlay retains valve/ventricle geometry and readable explanation',workPreserved:true});
  await capture(page,record,page.locator(atlas),'desktop-heart-clinical-step-4');
  await page.locator(flow).click();await assertStep(page,3,false);
  const handoff=page.locator(atlas+' [data-anatomy-heart-handoff]');await handoff.focus();await page.keyboard.press('Enter');const exchange=page.locator('[data-anatomy-atlas="alveoli"]');await expect(exchange).toBeFocused();await expect(page.locator(atlas)).toHaveCount(0);const exchanged=await sameWork(page,newer);expect(exchanged).toMatchObject({system:'respiratory',view:'anterior',selectedStructure:'alveoli',_regionalAtlasOpen:'alveoli',_regionalAtlasStep:1,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});await expect(exchange).not.toHaveClass(/is-clinical/);await expect(exchange.locator('[data-anatomy-clinical-panel]')).toHaveCount(0);await expect(exchange.locator('[data-anatomy-alveolus-flow]')).toHaveText('Play exchange');record.steps.push({action:'follow oxygen diffusion with keyboard',destinationStep:1,clinical:false,playing:false,workPreserved:true});
  const back=exchange.locator('.anatomy-scale-continuation button');await back.focus();await page.keyboard.press('Enter');await expect(page.locator(atlas)).toBeFocused();const returned=await sameWork(page,newer);expect(returned).toMatchObject({system:'circulatory',view:'anterior',selectedStructure:'heart',_regionalAtlasOpen:'heart',_regionalAtlasStep:2,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});await assertStep(page,2,false);await expect(page.locator(atlas+' [data-anatomy-clinical-panel]')).toHaveCount(0);record.steps.push({action:'return from gas exchange with keyboard',destinationStep:2,clinical:false,playing:false,workPreserved:true});
  await page.locator(atlas+' [data-anatomy-heart-handoff]').focus();await page.keyboard.press('Enter');await expect(exchange).toBeFocused();await sameWork(page,newer);expect(await state(page)).toMatchObject({_regionalAtlasOpen:'alveoli',_regionalAtlasStep:1,_regionalAtlasPlaying:false,_regionalAtlasClinical:false});record.steps.push({action:'repeat connected pathway cycle',clinical:false,playing:false,workPreserved:true});expect(record.errors).toEqual([]);
});

async function display(page:Page,view:View){
  await page.setViewportSize({width:view.width,height:1000});await page.emulateMedia({forcedColors:view.theme==='forced-colors'?'active':'none',reducedMotion:'reduce'});const dict=view.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  await page.evaluate(({dict,view})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=view.theme==='dark'?'theme-dark':'';const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:view.reading,_regionalAtlasStep:dict?3:0,_regionalAtlasClinical:!!dict});},{dict,view});await expect(page.locator(atlas)).toBeVisible();
}
async function measure(page:Page,record:any,view:View){
  const flowSymbols=await page.locator(atlas+' .anatomy-heart-flow-symbol').evaluateAll(elements=>elements.map(element=>({text:element.textContent,direction:getComputedStyle(element).direction,unicodeBidi:getComputedStyle(element).unicodeBidi})));
  expect(flowSymbols).toHaveLength(2);for(const symbol of flowSymbols){expect(symbol.direction,symbol.text+' fixed oxygenation symbol direction').toBe('ltr');expect(symbol.unicodeBidi,symbol.text+' isolated oxygenation symbol').toBe('isolate');}
  const metrics=await page.locator(atlas+' :is(h3,h4,h5,h6,p,li,strong,span,bdi,button,a,figcaption)').evaluateAll(elements=>elements.filter(element=>!(element instanceof SVGElement)&&element.getClientRects().length&&(element.tagName==='BUTTON'||[...element.childNodes].some(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim()))).map(element=>{
    const css=getComputedStyle(element),foreground=css.color;let parent:Element|null=element,background='rgb(255,255,255)',backgroundCandidates=['rgb(255,255,255)'],backgroundMethod='opaque CSS color';while(parent){const style=getComputedStyle(parent),colors=style.backgroundImage.match(/rgba?\([^)]*\)/g);if(colors?.length){backgroundCandidates=colors;background=colors[0];backgroundMethod='conservative gradient endpoints';break;}const color=style.backgroundColor,nums=color.match(/[\d.]+/g)?.map(Number);if(nums&&nums.length>=3&&(nums.length===3||nums[3]===1)){background=color;backgroundCandidates=[color];break;}parent=parent.parentElement;}
    const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background),box=element.getBoundingClientRect();return {tag:element.tagName,className:element.className,text:element.textContent?.trim().slice(0,180),font:parseFloat(css.fontSize),width:box.width,height:box.height,foreground,background,backgroundCandidates,backgroundMethod,ratio:Math.min(...backgroundCandidates.map(color=>{const value=lum(color);return(Math.max(a,value)+.05)/(Math.min(a,value)+.05)})),key:!!element.closest('figure[data-anatomy-heart-scale]')};
  }));
  const diagrams=await page.locator(atlas+' figure[data-anatomy-heart-scale]').evaluateAll(figures=>figures.map(figure=>{
    const svg=figure.querySelector('svg')!,svgBox=svg.getBoundingClientRect();
    const texts=[...svg.querySelectorAll('text')].filter(element=>element.getBoundingClientRect().width&&element.getBoundingClientRect().height).map(element=>{
      const css=getComputedStyle(element),m=element.getScreenCTM(),box=element.getBoundingClientRect();
      const circle=element.parentElement?.querySelector('circle');if(!circle)throw Error('Numbered marker needs a circular backdrop');
      const foreground=css.fill,background=getComputedStyle(circle).fill;
      const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0),a=lum(foreground),b=lum(background);
      return {text:element.textContent?.trim(),font:parseFloat(css.fontSize),effectiveFont:parseFloat(css.fontSize)*(m?Math.hypot(m.c,m.d):0),foreground,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom}};
    });
    const intersections:any[]=[];for(let i=0;i<texts.length;i++)for(let j=i+1;j<texts.length;j++){const a=texts[i].box,b=texts[j].box;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5)intersections.push([texts[i].text,texts[j].text]);}
    return {scale:figure.getAttribute('data-anatomy-heart-scale'),width:svgBox.width,height:svgBox.height,texts,intersections};
  }));
  record.styles.push({view,flowSymbols,metrics,diagrams});expect(metrics.length).toBeGreaterThan(0);expect(diagrams).toHaveLength(2);
  for(const metric of metrics){expect(metric.font,metric.text+' rendered HTML text').toBeGreaterThanOrEqual(view.reading?17:16);expect(metric.ratio,metric.text+' actual contrast').toBeGreaterThanOrEqual(4.5);if(metric.tag==='BUTTON'){expect(metric.width,metric.text+' touch width').toBeGreaterThanOrEqual(44);expect(metric.height,metric.text+' touch height').toBeGreaterThanOrEqual(44);}}
  for(const diagram of diagrams){expect(diagram.texts.length,diagram.scale+' visible numerical markers').toBeGreaterThan(0);expect(diagram.intersections,diagram.scale+' label intersections').toEqual([]);for(const text of diagram.texts){expect(text.text,diagram.scale+' SVG text belongs in the HTML key').toMatch(/^\d+$/);expect(text.effectiveFont,diagram.scale+' marker '+text.text+' effective CSS size').toBeGreaterThanOrEqual(14);expect(text.ratio,diagram.scale+' marker '+text.text+' actual fill contrast').toBeGreaterThanOrEqual(4.5);}}
}
async function scan(page:Page,record:any,view:View){
  const boxes=await page.locator(atlas+', '+atlas+' figure[data-anatomy-heart-scale]').evaluateAll(elements=>elements.map(element=>({tag:element.tagName,scale:element.getAttribute('data-anatomy-heart-scale'),client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}))),dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},atlas);
  record.scans.push({view,boxes,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);for(const box of boxes){expect(box.scroll,box.scale||'atlas').toBeLessThanOrEqual(box.client+1);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(dimensions.width);}expect(violations).toEqual([]);
}
async function capture(page:Page,record:any,locator:Locator,name:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('Missing screenshot target '+name);await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));const clip=await locator.evaluate(element=>{const r=element.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left-6)),y=Math.max(0,Math.floor(r.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(r.right+6))-x,height:Math.min(innerHeight,Math.ceil(r.bottom+6))-y};});expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');}finally{await page.setViewportSize({width,height:1000});}
}

test('Heart circuit, chamber and valve keys remain readable across desktop, 320px phones, Arabic larger text and forced colors',async({page})=>{
  test.setTimeout(420000);const record=recordFor(page,'display');await mount(page,{system:'circulatory',view:'anterior',selectedStructure:'heart',_regionalAtlasOpen:'heart',_regionalAtlasStep:0,_regionalAtlasPlaying:false});const saved=work(await state(page));
  const views:View[]=[{width:1280,locale:'en',reading:false,theme:'light',name:'desktop-light'},{width:320,locale:'en',reading:false,theme:'light',name:'phone-light'},{width:320,locale:'en',reading:false,theme:'dark',name:'phone-dark'},{width:320,locale:'ar',reading:true,theme:'dark',name:'phone-arabic-dark-larger'},{width:320,locale:'en',reading:false,theme:'forced-colors',name:'phone-forced-colors'}];
  for(const view of views){
    record.currentDisplay=view;await display(page,view);await assertFigures(page);await measure(page,record,view);await scan(page,record,view);await sameWork(page,saved);
    if(view.locale==='ar'){
      expect(await page.evaluate(()=>document.documentElement.dir)).toBe('rtl');const labels=JSON.parse(await readFile('lang/arabic.js','utf8')).stem.anatomy;
      for(const [scale,key] of [['circuit','heart_guide_circuit_title'],['chambers','heart_guide_chambers_title']])await expect(page.locator(atlas+' figure[data-anatomy-heart-scale="'+scale+'"]')).toHaveAccessibleName(labels[key]);
      await expect(page.locator(flow)).toHaveText(labels.heart_guide_play_flow);await expect(page.locator(stepDetail)).toContainText(labels.heart_guide_step_position.replace('{current}','4').replace('{total}','4'));
      await expect(page.locator(atlas+' [data-anatomy-clinical-panel="aortic_stenosis"]')).toContainText(labels.heart_guide_clinical_effect);
      await expect(page.locator(atlas+' .anatomy-scale-continuation')).toContainText(labels.heart_guide_handoff_context);await expect(page.locator(atlas+' .anatomy-scale-continuation button')).toHaveText(labels.heart_guide_handoff_button);
    }
    const second=page.locator(atlas+' [data-anatomy-heart-step="pulmonary_outflow"]');await second.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(second).toBeFocused();const focus=await second.evaluate(element=>({width:getComputedStyle(element).outlineWidth,style:getComputedStyle(element).outlineStyle,color:getComputedStyle(element).outlineColor,offset:getComputedStyle(element).outlineOffset}));expect(parseFloat(focus.width)).toBeGreaterThanOrEqual(3);expect(focus.style).toBe('solid');record.steps.push({view,keyboardFocus:focus});
    await capture(page,record,page.locator(atlas),view.name+'-heart-guide');
  }
  expect(record.scans).toHaveLength(5);expect(record.captures).toHaveLength(5);expect(record.errors).toEqual([]);
});

import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,timeout:240000});
const output=resolve(process.env.DNA_KEYBOARD_WCAG_REPORT||'reports/dna-keyboard-wcag-20261024');
const harness=new GlHarness({toolId:'dnaLab',toolFile:'stem_lab/stem_tool_dna.js',width:1120,height:900,appStyles:true,layout:'document'});
const sibling={observations:['Keep the earlier ecology evidence.'],revision:4};
const saved={dnaSequence:'ATGGCTTTTTAA',dnaReportNote:'My earlier DNA claim.',dnaCompareReflection:'Keep the comparison reasoning.',dnaEvidenceReasoning:'Keep the codon evidence.',score:7,dnaScenarioScore:2};
const correctTypes=['silent','missense','nonsense','frameshift','inframe','silent','nonsense','frameshift','inframe','missense'];
const frameScope='[data-dna-reading-frame-explorer]',guidedScope='[data-dna-guided]',msScope='[data-dna-mutation-sleuth]';

test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
function report(name:string,value:unknown){writeFileSync(resolve(output,name),JSON.stringify(value,null,2));}
async function state(page:Page){return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData.dnaLab)));}
async function patch(page:Page,values:Record<string,unknown>){await page.evaluate(values=>(window as any).__ctx.setToolData((p:any)=>({...p,dnaLab:{...p.dnaLab,...values}})),values);}
async function activate(page:Page,node:Locator,key='Enter'){await node.focus();await page.keyboard.press(key);}
async function setup(page:Page,extra:Record<string,unknown>={}){
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'none'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{dnaLab:{...saved,tab:'translate',dnaGradeOverride:'9-12',showHelix3d:false,dnaFocusMode:false,
  dnaReadingFrame:1,transStep:0,builtProtein:[],transPlaying:false,protein:[],animPlaying:false,replPlaying:false,
  guidedStarted:false,guidedComplete:false,guidedStep:0,guidedSelectedAnswer:'',guidedAnswers:{},guidedActions:{},guidedFeedback:'',
  dnaReportOpen:false,msOpen:false,msIdx:-1,msSeed:1,msAnswered:false,msPick:null,msScore:0,msRounds:0,msStreak:0,msBest:4,msShown:[],...extra},ecology:sibling},undefined,{expectCanvas:false});
 await page.locator('#wrap').evaluate((n:HTMLElement)=>Object.assign(n.style,{width:'100%',background:'#fff',color:'#0f172a',colorScheme:'light'}));
 await page.evaluate(()=>{const w=window as any;w.__dnaXP=[];w.__dnaAnnouncements=[];w.__dnaAI=[];
  Object.assign(w.__ctx,{gradeLevel:'10th Grade',awardXP:(...a:unknown[])=>w.__dnaXP.push(a),announceToSR:(s:string)=>w.__dnaAnnouncements.push(s),
   callGemini:null,callTTS:null});w.__rerender();});
 await expect(page.locator('[data-dna-tool]')).toBeVisible();return{errors,baseline:await state(page)};
}
async function preserved(page:Page,baseline:any,changed:string[]=[]){const current=await state(page);
 for(const key of Object.keys(saved))if(!changed.includes(key))expect(current[key],key+' remains saved').toEqual(baseline[key]);
 expect(await page.evaluate(()=>(window as any).__toolData.ecology)).toEqual(sibling);expect(await harness.glContexts(page)).toEqual([]);
}
async function openSleuth(page:Page){const toggle=page.locator('#dna-ms-toggle');await expect(toggle).toHaveAttribute('aria-expanded','false');
 await activate(page,toggle,'Space');await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute('aria-expanded','true');
 const id=await toggle.getAttribute('aria-controls');expect(id).toBeTruthy();await expect(page.locator('#'+id)).toBeVisible();
 await activate(page,page.locator('#dna-ms-start'));await expect(page.locator('#dna-ms-vignette')).toBeFocused();
}
function nextDraw(seed:number,shown:number[]){const next=((seed*16807+11)%2147483647)||7,pool=Array.from({length:10},(_,i)=>i).filter(i=>!shown.includes(i));return{seed:next,index:pool[next%pool.length]};}

test('reading-frame radios form one Tab stop and arrows, Home and End select without changing molecular evidence',async({page})=>{
 const initial=await setup(page,{transStep:2,builtProtein:[{aa:'Met',codon:'AUG',pos:0}],protein:[{aa:'Met',codon:'AUG',pos:0}]}),root=page.locator(frameScope);
 const radios=root.getByRole('radio');await expect(radios).toHaveCount(3);await expect(radios.nth(0)).toHaveAttribute('tabindex','0');
 await expect(radios.nth(1)).toHaveAttribute('tabindex','-1');await expect(radios.nth(2)).toHaveAttribute('tabindex','-1');
 await radios.nth(0).focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await expect(radios.nth(0)).toBeFocused();
 const visits:[string,number][]=[['ArrowRight',2],['ArrowDown',3],['ArrowRight',1],['ArrowLeft',3],['Home',1],['End',3],['ArrowUp',2]];
 for(const [key,frame] of visits){await page.keyboard.press(key);const selected=page.locator('[data-dna-reading-frame="'+frame+'"]');
  await expect(selected).toBeFocused();await expect(selected).toHaveAttribute('aria-checked','true');
  expect(await radios.evaluateAll(ns=>ns.filter(n=>n.getAttribute('tabindex')==='0').length)).toBe(1);expect((await state(page)).dnaReadingFrame).toBe(frame);}
 const after=await state(page);expect(after.transStep).toBe(0);expect(after.builtProtein).toEqual([]);expect(after.protein).toEqual([]);expect(after.transPlaying).toBe(false);
 await page.keyboard.press('Tab');await expect(root.getByRole('img',{name:/Reading-frame alignment/})).toBeFocused();
 await page.keyboard.press('Tab');await expect(root.locator('[data-dna-use-frame-evidence]')).toBeFocused();
 await page.keyboard.press('Tab');await expect(root.getByRole('region',{name:'Scrollable codon rail for reading frame plus 2',exact:true})).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__dnaXP)).toEqual([]);
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);await root.screenshot({path:resolve(output,'reading-frame-keyboard.jpg'),type:'jpeg',quality:90});
 report('reading-frame-keyboard.json',{visits,oneTabStop:true,translationReset:true,molecularSequencePreserved:true});
});

test('guided radios only select until the separate Check action, preserving attempts, science and one-time XP',async({page})=>{
 const initial=await setup(page,{tab:'build',guidedStarted:true}),root=page.locator(guidedScope),radios=root.getByRole('radio');
 await root.locator('summary').focus();await page.keyboard.press('Tab');await expect(radios.nth(0)).toBeFocused();
 await expect(root.getByRole('button',{name:/Check answer/})).toBeDisabled();await page.keyboard.press('ArrowRight');
 await expect(radios.nth(1)).toBeFocused();await expect(radios.nth(1)).toHaveAttribute('aria-checked','true');
 expect((await state(page)).guidedSelectedAnswer).toBe('G');expect((await state(page)).guidedAnswers).toEqual({});expect(await page.evaluate(()=>(window as any).__dnaXP)).toEqual([]);
 await page.keyboard.press('End');await expect(radios.nth(2)).toBeFocused();await page.keyboard.press('Home');await expect(radios.nth(0)).toBeFocused();
 await page.keyboard.press('Space');expect((await state(page)).guidedSelectedAnswer).toBe('T');expect((await state(page)).guidedAnswers).toEqual({});
 await page.keyboard.press('Tab');const check=root.getByRole('button',{name:/Check answer/});await expect(check).toBeFocused();await page.keyboard.press('Enter');
 await expect(root).toContainText('A pairs with T in DNA.');expect((await state(page)).guidedAnswers.pairing).toEqual({attempts:1,answer:'T',correct:true});
 expect(await page.evaluate(()=>(window as any).__dnaXP)).toEqual([['dnaLab',5,'Guided DNA checkpoint']]);
 await page.keyboard.press('Space');expect((await state(page)).guidedAnswers.pairing.attempts).toBe(2);expect(await page.evaluate(()=>(window as any).__dnaXP)).toHaveLength(1);
 expect((await state(page)).guidedComplete).toBe(false);expect((await state(page)).guidedActions).toEqual({});await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
 report('guided-selection-and-check.json',{selectionDoesNotSubmit:true,checkedAnswer:'T',attempts:2,oneXPReward:true,actionStillRequired:true});
});

test('report disclosure keeps its visible name, saves a draft and returns Hide focus to the surviving toggle',async({page})=>{
 const initial=await setup(page),toggle=page.locator('#dna-report-toggle');await expect(toggle).toHaveAccessibleName('Lab report');await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('[data-dna-lab-report]')).toHaveCount(0);await activate(page,toggle,'Space');await expect(toggle).toBeFocused();
 await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(toggle).toHaveAttribute('aria-controls','dna-lab-report-panel');
 const panel=page.locator('#dna-lab-report-panel');await expect(panel).toBeVisible();await expect(panel).toHaveAccessibleName('Student DNA lab report');
 const draft=panel.getByRole('textbox',{name:'DNA lab report reflection or claim',exact:true});await expect(draft).toHaveValue(saved.dnaReportNote);
 await draft.fill('The same DNA can be grouped into three reading frames.');await activate(page,panel.getByRole('button',{name:'Hide report',exact:true}));
 await expect(toggle).toBeFocused();await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(panel).toHaveCount(0);
 await page.keyboard.press('Enter');await expect(draft).toHaveValue('The same DNA can be grouped into three reading frames.');await page.keyboard.press('Space');
 await expect(toggle).toBeFocused();await expect(panel).toHaveCount(0);await preserved(page,initial.baseline,['dnaReportNote']);expect(initial.errors).toEqual([]);
 expect(await page.evaluate(()=>(window as any).__dnaXP)).toEqual([]);report('report-disclosure.json',{nativeVisibleName:true,conditionalPanel:true,hideReturnsFocus:true,draftRetained:true});
});

test('Mutation Sleuth uses labelled action buttons, persistent concise feedback and locked answers without focus loss',async({page})=>{
 const initial=await setup(page,{tab:'protein'});await openSleuth(page);const root=page.locator(msScope),answers=root.locator('[data-dna-ms-answers]');
 await expect(answers).toHaveRole('group');await expect(answers.getByRole('radio')).toHaveCount(0);const buttons=answers.getByRole('button');await expect(buttons).toHaveCount(5);
 const feedback=page.locator('#dna-ms-feedback');await expect(feedback).toHaveRole('status');await expect(feedback).toHaveAttribute('aria-live','polite');await expect(feedback).toHaveAttribute('aria-atomic','true');await expect(feedback).toHaveText('');
 await feedback.evaluate(n=>(window as any).__dnaOriginalFeedback=n);
 const relations=await buttons.evaluateAll(ns=>ns.map(n=>({id:n.getAttribute('data-dna-ms-answer'),label:n.getAttribute('aria-labelledby'),description:n.getAttribute('aria-describedby'),native:n.tagName,type:n.getAttribute('type')})));
 for(const item of relations){expect(item.native).toBe('BUTTON');expect(item.type).toBe('button');expect(item.label).toBeTruthy();expect(item.description).toBeTruthy();
  const label=page.locator('#'+item.label),button=answers.locator('[data-dna-ms-answer="'+item.id+'"]');await expect(button).toHaveAccessibleName((await label.textContent())!);
  for(const id of item.description!.split(/\s+/))await expect(page.locator('#'+id)).toHaveCount(1);}
 const draw=nextDraw(1,[]);expect((await state(page)).msSeed).toBe(draw.seed);expect((await state(page)).msIdx).toBe(draw.index);const right=correctTypes[draw.index];
 await page.keyboard.press('Tab');await expect(buttons.nth(0)).toBeFocused();const chosen=answers.locator('[data-dna-ms-answer="'+right+'"]');await activate(page,chosen,'Space');
 await expect(chosen).toBeFocused();await expect(feedback).toContainText(/Correct/);expect(await feedback.evaluate(n=>n===(window as any).__dnaOriginalFeedback)).toBe(true);
 expect((await feedback.textContent())!.length).toBeLessThan(260);await expect(feedback.locator('button')).toHaveCount(0);
 const answered=await state(page);expect(answered.msPick).toBe(right);expect(answered.msScore).toBe(1);expect(answered.msRounds).toBe(1);expect(answered.msStreak).toBe(1);expect(answered.msBest).toBe(4);
 for(const button of await buttons.all()){await expect(button).toHaveAttribute('aria-disabled','true');expect(await button.evaluate((n:HTMLButtonElement)=>n.disabled)).toBe(false);}
 await page.keyboard.press('Enter');await page.keyboard.press('ArrowRight');expect(await state(page)).toEqual(answered);await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement!==document.body)).toBe(true);
 const other=buttons.nth(right==='silent'?1:0);await activate(page,other,'Space');await expect(other).toBeFocused();expect(await state(page)).toEqual(answered);
 await activate(page,root.getByRole('button',{name:/Next vignette/}));await expect(page.locator('#dna-ms-vignette')).toBeFocused();await expect(feedback).toHaveText('');
 const second=nextDraw(draw.seed,[draw.index]);expect((await state(page)).msSeed).toBe(second.seed);expect((await state(page)).msIdx).toBe(second.index);expect((await state(page)).msShown).toEqual([draw.index,second.index]);
 expect(await page.evaluate(()=>(window as any).__dnaXP)).toEqual([]);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
 await root.screenshot({path:resolve(output,'mutation-sleuth-next-focus.jpg'),type:'jpeg',quality:90});report('mutation-sleuth-actions.json',{relations,firstDraw:draw,secondDraw:second,lockedFocusRetained:true,persistentFeedback:true,noImplicitAdvance:true});
});

test('all ten authored vignettes keep deterministic order and scoring; explicit Restart retains best and seed and focuses Start',async({page})=>{
 const initial=await setup(page,{tab:'protein'});await openSleuth(page);const root=page.locator(msScope),rounds:any[]=[];let seed=1,shown:number[]=[],score=0,streak=0;
 for(let round=0;round<10;round++){const draw=nextDraw(seed,shown);seed=draw.seed;shown.push(draw.index);const before=await state(page);expect(before.msIdx).toBe(draw.index);expect(before.msShown).toEqual(shown);
  const correct=correctTypes[draw.index],pick=round%2===0?correct:(correct==='silent'?'missense':'silent');score+=pick===correct?1:0;streak=pick===correct?streak+1:0;
  const button=root.locator('[data-dna-ms-answer="'+pick+'"]');await activate(page,button,round%2?'Space':'Enter');await expect(button).toBeFocused();
  const after=await state(page);expect(after.msScore).toBe(score);expect(after.msRounds).toBe(round+1);expect(after.msStreak).toBe(streak);expect(after.msBest).toBe(4);
  await expect(page.locator('#dna-ms-feedback')).toContainText(pick===correct?/Correct/:/effect is/);rounds.push({round:round+1,index:draw.index,correct,pick,score,seed});
  if(round<9){await activate(page,root.getByRole('button',{name:/Next vignette/}),'Space');await expect(page.locator('#dna-ms-vignette')).toBeFocused();}}
 expect(new Set(shown).size).toBe(10);expect(score).toBe(5);await expect(root).toContainText('All 10 vignettes complete');await expect(root).toContainText('5 / 10 (50%)');await expect(root.getByRole('button',{name:/Next vignette/})).toHaveCount(0);
 await activate(page,root.getByRole('button',{name:/Restart/}));await expect(page.locator('#dna-ms-start')).toBeFocused();const restarted=await state(page);
 expect(restarted.msIdx).toBe(-1);expect(restarted.msShown).toEqual([]);expect(restarted.msScore).toBe(0);expect(restarted.msRounds).toBe(0);expect(restarted.msStreak).toBe(0);expect(restarted.msBest).toBe(4);expect(restarted.msSeed).toBe(seed);
 await preserved(page,initial.baseline);expect(await page.evaluate(()=>(window as any).__dnaXP)).toEqual([]);expect(initial.errors).toEqual([]);
 report('mutation-sleuth-ten-rounds.json',{rounds,finalScore:5,uniqueVignettes:10,restartFocus:'dna-ms-start',bestRetained:4,seedRetained:seed});
});

test('targeted learning panels reflow at 320px with text spacing, reachable targets and inset forced-color focus',async({page})=>{
 await page.setViewportSize({width:320,height:900});const initial=await setup(page,{guidedStarted:true});
 await page.addStyleTag({content:'[data-dna-tool], [data-dna-tool] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-dna-tool] p{margin-bottom:2em!important}'});
 const results:any[]=[];
 for(const item of [{name:'reading-frame',tab:'translate',selector:frameScope},{name:'guided',tab:'build',selector:guidedScope},{name:'report',tab:'translate',selector:'#dna-lab-report-panel'},{name:'mutation-sleuth',tab:'protein',selector:msScope}]){
  await patch(page,{tab:item.tab,dnaReportOpen:item.name==='report',msOpen:item.name==='mutation-sleuth',msIdx:item.name==='mutation-sleuth'?0:-1,msShown:item.name==='mutation-sleuth'?[0]:[],msAnswered:false,msPick:null});
  const root=page.locator(item.selector);await expect(root).toBeVisible();await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});const controls=root.locator('button,input,select,textarea,[tabindex="0"]');const targets:any[]=[];
  for(const control of await controls.all()){if(!await control.isVisible()||!await control.isEnabled())continue;await control.scrollIntoViewIfNeeded();await control.focus();
   const box=await control.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    return{id:n.id,tag:n.tagName,text:n.textContent?.trim().slice(0,100),left:b.left,right:b.right,width:b.width,height:b.height,centerHits:!!hit&&(hit===n||n.contains(hit)),
     focusVisible:n.matches(':focus-visible'),outline:parseFloat(s.outlineWidth),offset:parseFloat(s.outlineOffset),style:s.outlineStyle,forced:matchMedia('(forced-colors: active)').matches};});
   if(box.offset> -3){const styles=await control.evaluate(n=>{const matched:any[]=[];function walk(rules:CSSRuleList){for(const rule of Array.from(rules)){const x=rule as CSSStyleRule;if(x.selectorText){try{if(n.matches(x.selectorText)&&/outline|box-shadow/.test(x.style.cssText))matched.push({selector:x.selectorText,style:x.style.cssText});}catch{}}if((rule as CSSMediaRule).cssRules)walk((rule as CSSMediaRule).cssRules);}}for(const sheet of Array.from(document.styleSheets)){try{walk(sheet.cssRules);}catch{}}return{html:n.outerHTML,matched};});report('focus-diagnostic.json',{panel:item.name,box,styles});}
   expect(box.left,item.name+': '+box.text).toBeGreaterThanOrEqual(-1);expect(box.right,item.name+': '+box.text).toBeLessThanOrEqual(321);expect(box.width).toBeGreaterThanOrEqual(24);expect(box.height).toBeGreaterThanOrEqual(24);expect(box.centerHits).toBe(true);
   expect(box.focusVisible).toBe(true);expect(box.outline,item.name+': '+box.text).toBeGreaterThanOrEqual(3);expect(box.offset).toBeLessThanOrEqual(-3);expect(box.style).not.toBe('none');expect(box.forced).toBe(true);targets.push(box);}
  expect(targets.length).toBeGreaterThan(0);const geometry=await root.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right,width:document.documentElement.scrollWidth};});
  expect(geometry.width,item.name+' document reflow').toBeLessThanOrEqual(321);expect(geometry.left).toBeGreaterThanOrEqual(-1);expect(geometry.right).toBeLessThanOrEqual(321);
  await root.screenshot({path:resolve(output,item.name+'-320px-forced-colors.jpg'),type:'jpeg',quality:90});results.push({panel:item.name,geometry,targets});}
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);report('mobile-reflow-focus-targets.json',{viewport:320,textSpacing:{line:1.5,letter:'.12em',word:'.16em',paragraph:'2em'},horizontalScientificRulerMayScroll:true,results});
});

test('scoped axe covers changed panels and answer states with computed gradient-endpoint contrast for every mutation label',async({page})=>{
 const initial=await setup(page,{guidedStarted:true});await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const scans:any[]=[],contrasts:any[]=[];
 async function scan(name:string,selector:string){const audit=await page.locator(selector).evaluate(async root=>{const result=await(window as any).axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
  const compact=(r:any)=>({id:r.id,impact:r.impact,nodes:r.nodes.map((n:any)=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))});return{version:result.testEngine.version,violations:result.violations.map(compact),incomplete:result.incomplete.map(compact),passes:result.passes.map((r:any)=>r.id)};});
  scans.push({name,selector,...audit});report('scoped-axe.json',{scope:'Reading-frame choices; guided checkpoint; student report; Mutation Sleuth introduction, choices and both result states.',limitation:'Scoped automation does not establish complete WCAG conformance. Incomplete rules are retained for manual review. No screen-reader behavior was tested.',scans});}
 await scan('Reading frame initial',frameScope);await activate(page,page.locator('[data-dna-reading-frame="3"]'),'Space');await scan('Reading frame changed',frameScope);
 await patch(page,{tab:'build'});await scan('Guided unanswered',guidedScope);await activate(page,page.locator(guidedScope).getByRole('radio',{name:'T',exact:true}));await activate(page,page.locator(guidedScope).getByRole('button',{name:/Check answer/}));await scan('Guided checked',guidedScope);
 await patch(page,{dnaReportOpen:true});await scan('Report open','#dna-lab-report-panel');await patch(page,{tab:'protein',dnaReportOpen:false,msOpen:true,msIdx:-1});await scan('Mutation introduction',msScope);
 await activate(page,page.locator('#dna-ms-start'));await scan('Mutation unanswered',msScope);contrasts.push({state:'unanswered',nodes:await mutationLabelContrast(page)});
 let current=await state(page);const correct=correctTypes[current.msIdx];await activate(page,page.locator('[data-dna-ms-answer="'+correct+'"]'));await scan('Mutation correct',msScope);contrasts.push({state:'correct',nodes:await mutationLabelContrast(page)});
 await activate(page,page.locator(msScope).getByRole('button',{name:/Next vignette/}));current=await state(page);const wrong=correctTypes[current.msIdx]==='silent'?'missense':'silent';await activate(page,page.locator('[data-dna-ms-answer="'+wrong+'"]'),'Space');await scan('Mutation incorrect',msScope);contrasts.push({state:'incorrect',nodes:await mutationLabelContrast(page)});
 report('mutation-label-contrast.json',{method:'Computed RGB/alpha backgrounds and all CSS linear-gradient color endpoints, using WCAG sRGB relative luminance.',limitation:'Endpoint sampling supplements axe incompletes; it does not model glyph antialiasing, overlapping content or arbitrary images.',states:contrasts});
 await page.locator(msScope).screenshot({path:resolve(output,'mutation-sleuth-incorrect.jpg'),type:'jpeg',quality:90});
 expect(scans.flatMap(s=>s.violations),JSON.stringify(scans.filter(s=>s.violations.length))).toEqual([]);for(const state of contrasts){expect(state.nodes).toHaveLength(5);
  for(const node of state.nodes){expect(node.limitations,state.state+': '+node.text).toEqual([]);expect(node.ratios.length).toBeGreaterThan(0);for(const ratio of node.ratios)expect(ratio,state.state+': '+node.text).toBeGreaterThanOrEqual(4.5);}}
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
});

async function mutationLabelContrast(page:Page){return page.locator('[data-dna-ms-answer] [id^="dna-ms-label-"]').evaluateAll(nodes=>{
 type Color=[number,number,number,number];
 const parse=(s:string):Color|null=>{const v=s.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);if(!v||v.length<3)return null;
  const c=(n:string)=>n.endsWith('%')?parseFloat(n)*2.55:parseFloat(n);return[c(v[0]),c(v[1]),c(v[2]),v[3]?parseFloat(v[3])/(v[3].endsWith('%')?100:1):1];};
 const over=(a:Color,b:Color):Color=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1] as Color;
 const lum=(c:Color)=>{const a=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2];};
 return nodes.map(node=>{const limitations:string[]=[],layers:any[]=[];for(let a:Element|null=node;a;a=a.parentElement){const s=getComputedStyle(a);layers.push({tag:a.tagName,id:a.id,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity});}
  let colors:Color[]=[[255,255,255,1]];for(const layer of [...layers].reverse()){const c=parse(layer.background);if(c)colors=colors.map(b=>over(c,b));else limitations.push('Unmodeled background '+layer.background);
   if(Number(layer.opacity)!==1)limitations.push('Ancestor opacity '+layer.opacity);
   if(layer.image!=='none'){const stops=layer.image.match(/rgba?\([^)]+\)/gi)?.map(parse).filter((c:Color|null):c is Color=>!!c)||[];
    if(/^linear-gradient\(/.test(layer.image)&&stops.length>=2)colors=colors.flatMap(b=>stops.map((c:Color)=>over(c,b)));else limitations.push('Unmodeled image '+layer.image);}}
  const foreground=parse(getComputedStyle(node).color);if(!foreground)limitations.push('Unmodeled text color');return{id:node.id,text:node.textContent,color:getComputedStyle(node).color,layers,
   ratios:foreground?colors.map(b=>{const a=lum(over(foreground,b)),z=lum(b);return(Math.max(a,z)+.05)/(Math.min(a,z)+.05);}):[],limitations:[...new Set(limitations)]};});
 });}

import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,timeout:240000});
const output=resolve(process.env.PUNNETT_SHELL_REPORT||'reports/punnett-shell-wcag-20261024');
const harness=new GlHarness({toolId:'punnett',toolFile:'stem_lab/stem_tool_punnett.js',width:1120,height:900,appStyles:true,layout:'document'});
const modes=['cross','pedigree','population','traits','dna2protein','challenge','battle','learn','freqDyn'];
const shell=(name:string)=>'[data-punnett-shell="'+name+'"]';
const toggles={guide:'#punnett-guide-toggle',quest:'#punnett-quest-toggle',badges:'#punnett-badges-toggle',tutor:'#punnett-tutor-toggle'};
const panels={guide:'#punnett-guide-panel',quest:'#punnett-quest-progress',badges:'#punnett-badge-panel',tutor:'#punnett-ai-panel'};
type Panel=keyof typeof toggles;
const sibling={observations:['Keep my earlier ecology evidence.'],revision:4};
const panelChanges=['_showLabGuide','_showQuestProgress','_showBadgePanel','_showAI'];
const question='#punnett-tutor-question',status='#punnett-tutor-status',response='#punnett-tutor-response';

test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
function report(name:string,value:unknown){writeFileSync(resolve(output,name),JSON.stringify(value,null,2));}
async function state(page:Page){return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData.punnett)));}
async function patch(page:Page,values:Record<string,unknown>){await page.evaluate(values=>(window as any).__ctx.setToolData((p:any)=>({...p,punnett:{...p.punnett,...values}})),values);}
async function activate(page:Page,node:Locator,key='Enter'){await node.focus();await page.keyboard.press(key);}
async function setup(page:Page,extra:Record<string,unknown>={}){
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'none'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{punnett:{subtool:'learn',parent1:['A','a'],parent2:['a','a'],inheritMode:'complete',_activePreset:null,
  researchPoints:17,learnerNotes:'Keep my genetics prediction.',_dnaSeq:'ATGAAATAA',_chalScore:3,_chalTotalScore:7,_battleScore:2,
  _studiedVocab:{genotype:true},_visited:Object.fromEntries(modes.map(m=>[m,true])),_modesUsed:{complete:true},_crossCount:1,
  _badges:{firstCross:true,allSubtools:true},_completedChallenges:{first_cross:true},_showLabGuide:false,_showQuestProgress:false,_showBadgePanel:false,_showAI:false,
  _aiQuestion:'',_aiResponse:'',_aiLoading:false,_aiRequestId:null,popRunning:false,popHistory:null,...extra},ecology:sibling},undefined,{expectCanvas:false});
 await page.locator('#wrap').evaluate((n:HTMLElement)=>Object.assign(n.style,{width:'100%',background:'#fff',color:'#0f172a',colorScheme:'light'}));
 await expect(page.locator('[data-punnett-root]')).toBeVisible();
 await page.evaluate(()=>{
  const w=window as any;w.__shellRequests=[];w.__shellProviderMode='deferred';w.__shellXP=[];w.__shellTTS=[];w.__shellAnnouncements=[];w.__shellNavigation=[];w.__shellSnapshots=[];
  w.__shellProvider=(...args:unknown[])=>{const entry:any={args,mode:w.__shellProviderMode};w.__shellRequests.push(entry);
   if(w.__shellProviderMode==='throw')throw new Error('Mock synchronous provider failure');
   return new Promise((resolve,reject)=>{entry.resolve=resolve;entry.reject=reject;});};
  Object.assign(w.__ctx,{gradeLevel:'10th Grade',callGemini:w.__shellProvider,callTTS:(...a:unknown[])=>w.__shellTTS.push(a),
   awardXP:(...a:unknown[])=>w.__shellXP.push(a),announceToSR:(s:string)=>w.__shellAnnouncements.push(s),setStemLabTool:(s:string)=>w.__shellNavigation.push(s),
   setToolSnapshots:(update:any)=>{w.__shellSnapshots=typeof update==='function'?update(w.__shellSnapshots):update;}});
  // Model the real host's component rekey while preserving its parent store/context.
  // Recreating the entire harness would incorrectly orphan pending provider writes.
  const cfg=w.StemLab._registry.punnett,Original=cfg._PunnettComponent;w.__shellRemountRevision=0;
  cfg._PunnettComponent=function ShellHostRemount(props:any){return w.React.createElement(Original,{...props,key:props.ctx.toolData.punnett.subtool+':'+w.__shellRemountRevision});};
  w.__shellRemountTool=()=>{w.__shellRemountRevision++;w.__rerender();};w.__rerender();
 });
 await expect(page.locator(shell('header'))).toBeVisible();expect(await harness.glContexts(page)).toEqual([]);
 return{errors,baseline:await state(page)};
}
async function preserved(page:Page,baseline:any,changes:string[]=[],allowAI=false){const actual=await state(page),expected={...baseline};
 const ignored=[...changes,...(allowAI?[...new Set([...Object.keys(actual),...Object.keys(expected)].filter(k=>k.startsWith('_ai')))]:[])];
 for(const key of ignored){delete actual[key];delete expected[key];}expect(actual).toEqual(expected);
 expect(await page.evaluate(()=>(window as any).__toolData.ecology)).toEqual(sibling);expect(await harness.glContexts(page)).toEqual([]);
 expect(await page.evaluate(()=>(window as any).__shellTTS)).toEqual([]);
}
async function openPanel(page:Page,panel:Panel){const toggle=page.locator(toggles[panel]);if(await toggle.getAttribute('aria-expanded')!=='true')await activate(page,toggle,panel==='tutor'?'Space':'Enter');
 await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(page.locator(panels[panel])).toBeVisible();return page.locator(panels[panel]);}
async function provider(page:Page,mode:'deferred'|'throw'|'missing'){await page.evaluate(mode=>{const w=window as any;w.__shellProviderMode=mode;w.__ctx.callGemini=mode==='missing'?undefined:w.__shellProvider;w.__rerender();},mode);}
async function requests(page:Page){return page.evaluate(()=>(window as any).__shellRequests.map((r:any)=>({mode:r.mode,args:r.args})));}
async function settle(page:Page,index:number,text:string,reject=false){await page.evaluate(({index,text,reject})=>{const r=(window as any).__shellRequests[index];if(!r||typeof r[reject?'reject':'resolve']!=='function')throw new Error('Expected local deferred request '+index);r[reject?'reject':'resolve'](reject?new Error(text):text);},{index,text,reject});}
async function submit(page:Page,text:string,usingButton=false){const count=(await requests(page)).length;await page.locator(question).fill(text);
 await activate(page,usingButton?page.locator(panels.tutor).getByRole('button',{name:'Ask',exact:true}):page.locator(question),usingButton?'Space':'Enter');
 await expect.poll(async()=>(await requests(page)).length).toBe(count+1);await expect(page.locator(response)).toHaveAttribute('aria-busy','true');if(usingButton)await expect(page.locator(question)).toBeFocused();return count;
}
async function stopped(page:Page){await expect.poll(async()=>(await state(page))._aiLoading).toBe(false);expect((await state(page))._aiRequestId).toBeNull();await expect(page.locator(status)).toContainText(/stop/i);await expect(page.locator(response)).toHaveAttribute('aria-busy','false');}

test('shared disclosure controls retain names and relationships, and Guide navigation restores keyboard focus across host remounts',async({page})=>{
 const initial=await setup(page);const names={guide:/Guide/,quest:/Quests/,badges:/Badges/,tutor:/Tutor/};
 for(const key of Object.keys(toggles) as Panel[]){const toggle=page.locator(toggles[key]),panel=page.locator(panels[key]);
  await expect(toggle).toHaveRole('button');await expect(toggle).toHaveAccessibleName(names[key]);await expect(toggle).toHaveAttribute('aria-expanded','false');
  await expect(toggle).toHaveAttribute('aria-controls',panels[key].slice(1));await expect(panel).toHaveCount(1);await expect(panel).toBeHidden();
  await activate(page,toggle,'Space');await expect(toggle).toBeFocused();await expect(panel).toBeVisible();await expect(toggle).toHaveAttribute('aria-expanded','true');
  await activate(page,toggle);await expect(panel).toBeHidden();await expect(toggle).toBeFocused();}
 const guide=await openPanel(page,'guide');await activate(page,guide.getByRole('button',{name:/Close/i}));await expect(guide).toBeHidden();await expect(page.locator(toggles.guide)).toBeFocused();
 const routes=[{id:'cross',title:/Predict Traits/},{id:'pedigree',title:/Trace Families/},{id:'population',title:/Model Populations/},{id:'dna2protein',title:/Translate DNA/}];
 for(const route of routes){const panel=await openPanel(page,'guide');await activate(page,panel.getByRole('button',{name:route.title}));
  await expect.poll(async()=>(await state(page)).subtool).toBe(route.id);await expect(page.locator('#punnett-activity-'+route.id)).toBeFocused();}
 expect(await page.evaluate(()=>(window as any).__shellAnnouncements)).toHaveLength(routes.length);
 expect(await requests(page)).toEqual([]);expect(await page.evaluate(()=>(window as any).__shellXP)).toEqual([]);
 await preserved(page,initial.baseline,[...panelChanges,'subtool']);expect(initial.errors).toEqual([]);
 report('shell-disclosures.json',{stablePanels:true,nativeNames:true,closeReturnsToGuide:true,remountingRoutes:routes.map(r=>r.id),navigationAnnouncements:routes.length,noProviderCalls:true,learningPreserved:true});
});

test('Quest and Badges expose visible criteria and earned states without fading or changing progress',async({page})=>{
 const initial=await setup(page);const quest=await openPanel(page,'quest'),badges=await openPanel(page,'badges');
 for(const description of ['Cross two parents in Punnett mode','Determine the correct genotypes on a pedigree tree','Simulate population genetics over time','Defeat the virus in battle mode','Study flashcards for genetics terms'])await expect(quest.getByText(description,{exact:true})).toBeVisible();
 await expect(badges.getByText('Complete your first Punnett cross',{exact:true})).toBeVisible();await expect(badges.getByText('Try all 4 inheritance modes',{exact:true})).toBeVisible();
 expect(await badges.getByText(/^Earned$/).count()).toBeGreaterThanOrEqual(2);expect(await badges.getByText(/^Not (?:yet )?earned(?: yet)?$/i).count()).toBeGreaterThan(0);
 const faded=await badges.evaluate((node:HTMLElement)=>Array.from(node.querySelectorAll<HTMLElement>('*')).filter(element=>Number(getComputedStyle(element).opacity)<1).map(element=>({text:element.textContent?.trim(),opacity:getComputedStyle(element).opacity})));
 expect(faded).toEqual([]);const after=await state(page);expect(after._badges).toEqual(initial.baseline._badges);expect(after._completedChallenges).toEqual(initial.baseline._completedChallenges);expect(after.researchPoints).toBe(initial.baseline.researchPoints);
 expect(await page.evaluate(()=>(window as any).__shellXP)).toEqual([]);expect(await requests(page)).toEqual([]);await preserved(page,initial.baseline,panelChanges);expect(initial.errors).toEqual([]);
 report('shell-progress.json',{badgeNamesAndCriteriaVisible:true,earnedAndNotYetEarnedVisible:true,noFadedInformationalCards:true,badges:after._badges,completedQuests:after._completedChallenges,researchPoints:after.researchPoints,noRewardsOnInspection:true});
});

test('Tutor uses explicit mocked requests, announces lifecycle, and survives remount, cancellation and provider errors without duplicate work',async({page})=>{
 const initial=await setup(page);const panel=await openPanel(page,'tutor'),input=page.locator(question),live=page.locator(status),answer=page.locator(response);
 const visibleLabel=page.locator('label[for="punnett-tutor-question"]');await expect(visibleLabel).toBeVisible();await expect(input).toHaveAccessibleName((await visibleLabel.textContent())!.trim());
 await expect(live).toHaveRole('status');await expect(live).toHaveAttribute('aria-live','polite');await expect(live).toHaveAttribute('aria-atomic','true');
 await expect(answer).toHaveCount(1);await expect(answer).toHaveAttribute('role','region');await expect(answer).toHaveAttribute('aria-busy','false');await expect(answer).toBeHidden();
 await expect(panel.getByRole('button',{name:'Ask',exact:true})).toBeDisabled();expect(await requests(page)).toEqual([]);
 await input.fill('Why can recessive alleles remain in a population?');await input.evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:229,isComposing:true,bubbles:true,cancelable:true})));
 expect(await requests(page)).toEqual([]);await expect(input).toBeFocused();
 const first=await submit(page,'Why can recessive alleles remain in a population?');const firstId=(await state(page))._aiRequestId;expect(firstId).toBeTruthy();
 await page.keyboard.press('Enter');await page.keyboard.press('Enter');expect(await requests(page)).toHaveLength(1);await expect(page.locator('#punnett-tutor-ask')).toBeDisabled();await expect(page.locator('#punnett-tutor-ask')).toHaveAccessibleName(/Thinking/);await expect(live).toContainText(/think|wait|work|load/i);
 await page.evaluate(()=>(window as any).__shellRemountTool());await expect(input).toHaveValue('Why can recessive alleles remain in a population?');await expect(answer).toHaveAttribute('aria-busy','true');expect((await state(page))._aiRequestId).toBe(firstId);
 const stop=panel.getByRole('button',{name:/Stop waiting/i});await stop.focus();
 await settle(page,first,'A recessive allele can remain in heterozygotes. Compare phenotype with genotype evidence.');
 await expect(answer).toBeVisible();await expect(answer).toHaveAccessibleName('Tutor response');await expect(answer).toContainText('heterozygotes');await expect(answer).toHaveAttribute('aria-busy','false');await expect(live).toContainText(/ready|answer|received/i);
 await expect(stop).toBeFocused();await expect(stop).toHaveAttribute('aria-disabled','true');await page.keyboard.press('Tab');await expect(stop).toBeHidden();
 // Two submissions in one browser task exercise the immediate guard before a deferred host commit.
 const beforeSecond=(await requests(page)).length;await input.fill('How do genotype and phenotype differ?');await input.focus();
 await input.evaluate(node=>{for(let i=0;i<2;i++)node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true}));});
 await expect.poll(async()=>(await requests(page)).length).toBe(beforeSecond+1);const canceled=beforeSecond;const canceledId=(await state(page))._aiRequestId;expect(canceledId).not.toBe(firstId);
 const draft=await input.inputValue();await activate(page,stop);await stopped(page);await expect(input).toBeFocused();await expect(input).toHaveValue(draft);await expect(answer).toBeHidden();
 const newer=await submit(page,'Can you compare two inheritance models?',true);const newerId=(await state(page))._aiRequestId;expect(newerId).not.toBe(canceledId);await stop.focus();
 await settle(page,canceled,'This late canceled answer must never replace the newer request.');await expect(stop).toBeFocused();await expect(answer).toHaveAttribute('aria-busy','true');await expect(answer).toBeHidden();expect((await state(page))._aiRequestId).toBe(newerId);
 await settle(page,newer,'Complete and incomplete dominance describe different heterozygote phenotypes.');await expect(answer).toContainText('heterozygote phenotypes');await expect(stop).toBeFocused();await expect(stop).toHaveAttribute('aria-disabled','true');
 await page.keyboard.press('Tab');await expect(stop).toBeHidden();await expect(answer).not.toContainText('late canceled');
 const rejected=await submit(page,'What evidence can a pedigree provide?');await settle(page,rejected,'Mock provider rejected the request.',true);
 await expect(live).toContainText(/fail|error|connect|unavailable|could not|try again/i);await expect(answer).toHaveAttribute('aria-busy','false');expect((await state(page))._aiLoading).toBe(false);expect((await state(page))._aiRequestId).toBeNull();
 const countBeforeMissing=(await requests(page)).length;await provider(page,'missing');await input.fill('Explain allele frequency.');await activate(page,input);
 await expect(live).toContainText(/unavailable|not available/i);expect(await requests(page)).toHaveLength(countBeforeMissing);expect((await state(page))._aiLoading).toBe(false);
 await provider(page,'throw');await input.fill('Explain genetic drift.');await activate(page,input);
 await expect.poll(async()=>(await requests(page)).length).toBe(countBeforeMissing+1);await expect(live).toContainText(/fail|error|connect|unavailable|could not|try again/i);expect((await state(page))._aiLoading).toBe(false);expect((await state(page))._aiRequestId).toBeNull();
 expect(await requests(page)).toHaveLength(5);expect((await requests(page))[0].args[0]).toContain('Why can recessive alleles remain');
 await preserved(page,initial.baseline,panelChanges,true);expect(await page.evaluate(()=>(window as any).__shellXP)).toEqual([]);expect(initial.errors).toEqual([]);
 report('shell-tutor.json',{mockRequests:(await requests(page)).map(r=>({mode:r.mode,prompt:r.args[0]})),automaticRequests:0,compositionIgnored:true,sameTaskAndPendingDeduplication:true,persistedRequestSurvivesHostRemount:true,
  cancellationPreservesDraft:true,canceledResultCannotStealStateOrFocus:true,focusedStopRetainedUntilBlur:true,missingAndThrowingProvidersSettle:true,errors:initial.errors,learningPreserved:true});
});

test('shared panels and footer retain visible keyboard targets at 320px with text spacing and forced colors',async({page})=>{
 await page.setViewportSize({width:320,height:900});const longAnswer='A long model response remains readable: '+('ACGT'.repeat(180));
 const initial=await setup(page,{_showLabGuide:true,_showQuestProgress:true,_showBadgePanel:true,_showAI:true,_aiQuestion:'How can I test my inheritance prediction?',_aiResponse:longAnswer});
 await page.addStyleTag({content:'[data-punnett-root],[data-punnett-root] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-punnett-root] p{margin-bottom:2em!important}'});
 const beforePresentation=await state(page);const normal=await geometry(page,shell('tutor'));expect(normal.documentWidth).toBeLessThanOrEqual(321);expect(normal.horizontalOverflow).toEqual([]);
 await page.locator(panels.tutor).screenshot({path:resolve(output,'shell-tutor-mobile-normal.jpg'),type:'jpeg',quality:90});
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});const samples:any[]=[];
 for(const part of ['header','guide','quest','hero','badges','tutor','footer']){
  const root=page.locator(shell(part));await expect(root).toBeVisible();const controls=root.locator('button,input');const targets:any[]=[];
  for(let index=0;index<await controls.count();index++){
   const control=controls.nth(index);if(!await control.isVisible())continue;if(await control.isDisabled())continue;
   await control.scrollIntoViewIfNeeded();await control.focus();const box=await control.evaluate((node:HTMLElement)=>{const b=node.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2),style=getComputedStyle(node);return{
    name:node.textContent?.trim()||node.getAttribute('aria-label')||node.id,left:b.left,right:b.right,width:b.width,height:b.height,centerHitsControl:!!hit&&(hit===node||node.contains(hit)),focusVisible:node.matches(':focus-visible'),outlineStyle:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth)};});
   const targetMessage=part+' target '+(box.name||'<unnamed>')+' '+JSON.stringify({left:box.left,right:box.right,width:box.width,height:box.height});
   expect(box.left,targetMessage+' left').toBeGreaterThanOrEqual(-1);expect(box.right,targetMessage+' right').toBeLessThanOrEqual(321);expect(box.width,targetMessage+' width').toBeGreaterThanOrEqual(24);expect(box.height,targetMessage+' height').toBeGreaterThanOrEqual(44);expect(box.centerHitsControl,targetMessage+' hit test').toBe(true);
   expect(box.focusVisible,targetMessage+' keyboard focus').toBe(true);expect(box.outlineStyle,targetMessage+' outline style').not.toBe('none');expect(box.outlineWidth,targetMessage+' outline width').toBeGreaterThanOrEqual(3);targets.push(box);
  }
  const layout=await geometry(page,shell(part));expect(layout.documentWidth).toBeLessThanOrEqual(321);expect(layout.left).toBeGreaterThanOrEqual(-1);expect(layout.right).toBeLessThanOrEqual(321);expect(layout.horizontalOverflow).toEqual([]);expect(layout.forcedColors).toBe(true);
  samples.push({part,...layout,targets});
  if(['header','badges','tutor'].includes(part))await root.screenshot({path:resolve(output,'shell-'+part+'-mobile-forced-colors.jpg'),type:'jpeg',quality:90});
 }
 expect(await state(page)).toEqual(beforePresentation);const footer=page.locator(shell('footer'));
 await activate(page,footer.getByRole('button',{name:'Snapshot',exact:true}),'Space');const snapshots=await page.evaluate(()=>(window as any).__shellSnapshots);
 expect(snapshots).toHaveLength(1);expect(snapshots[0].tool).toBe('punnett');expect(snapshots[0].data.learnerNotes).toBe(initial.baseline.learnerNotes);
 await activate(page,footer.getByRole('button',{name:/DNA Lab/}));expect(await page.evaluate(()=>(window as any).__shellNavigation)).toEqual(['dnaLab']);
 expect(await requests(page)).toEqual([]);await preserved(page,initial.baseline,[],true);expect(initial.errors).toEqual([]);
 report('shell-mobile-reflow.json',{viewport:320,spacing:{lineHeight:1.5,letterSpacing:'.12em',wordSpacing:'.16em',paragraphSpacing:'2em'},normal,samples,minimumButtonAndInputHeight:44,longResponseWraps:true,keyboardSnapshotAndDNALabNavigation:true,presentationPreservesLearning:true});
});

test('scoped axe and computed colors cover shared panels and all nine activity hero headings',async({page})=>{
 const initial=await setup(page);await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const scans:any[]=[];
 async function scan(name:string,part:string){const selector=shell(part);await expect(page.locator(selector)).toBeVisible();
  const audit=await page.locator(selector).evaluate(async root=>{const result=await (window as any).axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
   const compact=(rule:any)=>({id:rule.id,impact:rule.impact,nodes:rule.nodes.map((n:any)=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))});
   return{version:result.testEngine.version,forcedColors:matchMedia('(forced-colors: active)').matches,violations:result.violations.map(compact),incomplete:result.incomplete.map(compact),
    inspectedNodes:[...result.passes,...result.incomplete,...result.violations].reduce((sum,r)=>sum+r.nodes.length,0)};});
  const contrast=await contrastEvidence(page,selector,audit.incomplete);scans.push({state:name,part,...audit,contrast});const textSamples=scans.flatMap(s=>s.contrast.nodes).filter(n=>!n.decorativeGlyph).flatMap(n=>n.samples);
  report('shell-axe.json',{scope:'Shared header, Guide, Quest, mixed earned/unearned Badges, all Tutor states, footer and every activity hero heading',
   limitation:'Scoped axe checks do not establish full WCAG conformance. RGB/alpha and gradient endpoint calculations supplement incomplete checks; overlap warnings, glyph meaning/colors, intermediate gradient pixels, images, opacity and antialiasing still require review. Forced colors are inspected separately.',
   totals:{scans:scans.length,violations:scans.reduce((sum,s)=>sum+s.violations.length,0),incompleteRules:scans.reduce((sum,s)=>sum+s.incomplete.length,0),incompleteNodes:scans.reduce((sum,s)=>sum+s.incomplete.reduce((n:number,r:any)=>n+r.nodes.length,0),0),
    supplementarySamples:textSamples.length,minimumSupplementaryTextContrast:textSamples.length?Math.min(...textSamples.map(s=>s.ratio)):null},scans});
  expect(audit.forcedColors).toBe(false);expect(audit.inspectedNodes).toBeGreaterThan(0);expect(audit.violations,name+': '+JSON.stringify(audit.violations)).toEqual([]);
  for(const node of contrast.nodes){expect(node.found,name+': unresolved '+node.target.join(' ')).toBe(true);if(node.decorativeGlyph)continue;
   expect(node.limitations,name+': '+node.text).toEqual([]);expect(node.samples.length).toBeGreaterThan(0);for(const sample of node.samples)expect(sample.ratio,name+': '+node.text+' against '+sample.background).toBeGreaterThanOrEqual(4.5);}
 }
 await scan('Header with disclosures closed','header');await openPanel(page,'guide');await scan('Guide open','guide');await openPanel(page,'quest');await scan('Quest criteria and progress','quest');await openPanel(page,'badges');await scan('Mixed earned and unearned badges','badges');
 await openPanel(page,'tutor');await page.locator(question).fill('How can I compare genotype and phenotype?');await scan('Tutor ready to ask','tutor');
 const waiting=await submit(page,'How can I compare genotype and phenotype?');await scan('Tutor waiting for mocked answer','tutor');await settle(page,waiting,'A genotype describes alleles; a phenotype describes observable traits. Compare the evidence for each.');
 await expect(page.locator(response)).toBeVisible();await scan('Tutor response ready','tutor');
 await provider(page,'throw');await page.locator(question).fill('What does a model assume?');await activate(page,page.locator(question));await expect(page.locator(status)).toContainText(/fail|error|connect|unavailable|could not|try again/i);await scan('Tutor provider error','tutor');
 await provider(page,'deferred');const canceled=await submit(page,'How does mutation change a population?');await activate(page,page.locator(panels.tutor).getByRole('button',{name:/Stop waiting/i}));await stopped(page);await scan('Tutor stopped waiting','tutor');
 await settle(page,canceled,'Ignored canceled answer.');await expect(page.locator(status)).toContainText(/stop/i);await scan('Footer actions','footer');
 const heroEvidence:any[]=[];await page.locator('#wrap').evaluate((node:HTMLElement)=>Object.assign(node.style,{background:'#0f172a',color:'#e2e8f0'}));
 for(const mode of modes){await patch(page,{subtool:mode});await expect(page.locator('#punnett-activity-'+mode)).toHaveAttribute('aria-current','page');await scan('Hero heading: '+mode,'hero');
  const surface=await page.locator(shell('hero')).evaluate((node:HTMLElement)=>({background:getComputedStyle(node).backgroundColor,gradient:getComputedStyle(node).backgroundImage,host:getComputedStyle(document.getElementById('wrap')!).backgroundColor}));
  expect(surface.host).toBe('rgb(15, 23, 42)');expect(surface.background).toBe('rgb(255, 255, 255)');
  const model=await contrastEvidence(page,shell('hero'),[{id:'supplementary-hero-heading',nodes:[{target:['h3'],failureSummary:'Supplementary heading contrast on an opaque hero over a dark host.'}]}]);
  expect(model.nodes).toHaveLength(1);expect(model.nodes[0].found).toBe(true);expect(model.nodes[0].limitations).toEqual([]);expect(model.nodes[0].samples.length).toBeGreaterThan(0);
  for(const sample of model.nodes[0].samples)expect(sample.ratio,'Hero '+mode+' on '+sample.background).toBeGreaterThanOrEqual(4.5);
  heroEvidence.push({mode,surface,...model.nodes[0]});report('shell-hero-contrast.json',{darkHost:true,opaqueWhiteHeroSurface:true,limitation:'Computed RGB and endpoint checks do not sample every interpolated pixel or antialiasing.',headings:heroEvidence});

  if(mode==='pedigree'){await openPanel(page,'guide');await scan('Guide with family route active','guide');}}
 expect(scans).toHaveLength(20);await page.locator(shell('hero')).screenshot({path:resolve(output,'shell-hero-discovery-normal.jpg'),type:'jpeg',quality:90});
 await patch(page,{subtool:'pedigree'});await expect(page.locator('#punnett-activity-pedigree')).toHaveAttribute('aria-current','page');await page.locator(panels.guide).screenshot({path:resolve(output,'shell-guide-family-normal.jpg'),type:'jpeg',quality:90});
 await preserved(page,initial.baseline,[...panelChanges,'subtool'],true);expect(await page.evaluate(()=>(window as any).__shellXP)).toEqual([]);expect(initial.errors).toEqual([]);
});

async function geometry(page:Page,selector:string){return page.locator(selector).evaluate((node:HTMLElement)=>{const b=node.getBoundingClientRect();return{left:b.left,right:b.right,documentWidth:document.documentElement.scrollWidth,forcedColors:matchMedia('(forced-colors: active)').matches,
 horizontalOverflow:Array.from(node.querySelectorAll<HTMLElement>('button,p,h2,h3,label,#punnett-tutor-response')).filter(element=>!element.closest('[hidden]')&&element.scrollWidth>element.clientWidth+2).map(element=>element.textContent?.trim())};});}
async function contrastEvidence(page:Page,selector:string,incomplete:any[]){return page.locator(selector).evaluate((root,incomplete)=>{
 type Color=[number,number,number,number];
 const parse=(s:string):Color|null=>{const a=s.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);if(!a||a.length<3)return null;const channel=(v:string)=>v.endsWith('%')?parseFloat(v)*2.55:parseFloat(v);
  return[channel(a[0]),channel(a[1]),channel(a[2]),a[3]?parseFloat(a[3])/(a[3].endsWith('%')?100:1):1];};
 const over=(a:Color,b:Color):Color=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1] as Color;
 const luminance=(c:Color)=>{const v=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
 const label=(c:Color)=>'rgb('+c.slice(0,3).map(v=>Math.round(v*1000)/1000).join(', ')+')';
 const nodes=incomplete.flatMap((rule:any)=>rule.nodes.map((node:any)=>{let element:HTMLElement|null=null;try{if(node.target.length===1)element=(root.matches(node.target[0])?root:root.querySelector(node.target[0])) as HTMLElement|null;}catch{}
  if(!element)return{found:false,target:node.target,text:'',decorativeGlyph:false,samples:[],limitations:['Target did not resolve.']};
  const css=getComputedStyle(element),foreground=parse(css.color),text=element.textContent?.trim()||'',chain:any[]=[],limitations:string[]=[];
  for(let ancestor:HTMLElement|null=element;ancestor;ancestor=ancestor.parentElement){const style=getComputedStyle(ancestor);chain.push({tag:ancestor.tagName,id:ancestor.id,className:ancestor.getAttribute('class'),color:style.color,background:style.backgroundColor,gradient:style.backgroundImage,opacity:style.opacity});}
  let backgrounds:Color[]=[[255,255,255,1]];
  for(const layer of [...chain].reverse()){
   if(Number(layer.opacity)<1)limitations.push('Ancestor opacity requires visual review: '+layer.tag);const color=parse(layer.background);if(color)backgrounds=backgrounds.map(b=>over(color,b));
   if(layer.gradient!=='none'){const colors=layer.gradient.match(/rgba?\([^)]+\)/gi)?.map(parse).filter((color:Color|null):color is Color=>!!color)||[];
    if(/^linear-gradient\(/.test(layer.gradient)&&colors.length>=2)backgrounds=backgrounds.flatMap(b=>colors.map(color=>over(color,b)));else limitations.push('Image outside endpoint model: '+layer.gradient);}
  }
  if(!foreground)limitations.push('Foreground outside RGB model: '+css.color);const unique=[...new Map(backgrounds.map(color=>[label(color),color])).values()];
  // Emoji/lock artwork is separately labelled by adjacent status/criteria text; its
  // rendered multicolor glyph pixels are not represented by CSS foreground color.
  const decorativeGlyph=!/[\p{L}\p{N}]/u.test(text);
  return{found:true,target:node.target,rule:rule.id,text,decorativeGlyph,foreground:css.color,fontSize:css.fontSize,fontWeight:css.fontWeight,ancestorBackdrops:chain,
   samples:foreground?unique.map(background=>{const effective=over(foreground,background),a=luminance(effective),b=luminance(background);return{background:label(background),effectiveForeground:label(effective),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};}):[],
   limitations:[...new Set(limitations)],overlapWarningRetained:String(node.failureSummary||'').includes('overlap')};
 }));return{method:'Computed RGB/alpha foregrounds and ancestor surfaces, composited linear-gradient endpoints, WCAG sRGB relative luminance.',nodes};
 },incomplete);}

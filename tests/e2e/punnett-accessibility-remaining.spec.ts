import {test,expect,type Page,type Locator} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,timeout:240000});
type Activity='cross'|'pedigree'|'population'|'traits'|'learn'|'freqDyn';
const output=resolve(process.env.PUNNETT_REMAINING_REPORT||'reports/punnett-remaining-wcag-20261024');
const harness=new GlHarness({toolId:'punnett',toolFile:'stem_lab/stem_tool_punnett.js',width:1120,height:900,appStyles:true,layout:'document'});
const scope=(activity:Activity)=>'[data-punnett-activity="'+activity+'"]';
const sibling={notes:['Keep the ecology observation.'],revision:4};
const iq={p:50,selection:0,mutation:0,hypothesis:'',stuckRevealed:false,understood:false,explanation:'',log:[]};
const states=[
 {p:50,selection:0,mutation:0,key:'equilibrium',label:/Near Hardy-Weinberg equilibrium/},
 {p:50,selection:20,mutation:0,key:'selectionStrong',label:/Strong selection signal/},
 {p:50,selection:0,mutation:20,key:'mutationDriven',label:/Mutation-driven shift/},
 {p:50,selection:2,mutation:0,key:'driftPotential',label:/Drift potential/}
];
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
function report(name:string,data:unknown){writeFileSync(resolve(output,name),JSON.stringify(data,null,2));}
async function state(page:Page){return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData.punnett)));}
async function patch(page:Page,values:Record<string,unknown>){await page.evaluate(values=>(window as any).__ctx.setToolData((p:any)=>({...p,punnett:{...p.punnett,...values}})),values);}
async function setup(page:Page,activity:Activity,extra:Record<string,unknown>={}){
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'none'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,{punnett:{subtool:activity,parent1:['A','a'],parent2:['A','a'],inheritMode:'complete',_activePreset:null,
  researchPoints:17,learnerNotes:'Keep my earlier genetic evidence.',_dnaSeq:'ATGAAATAA',_chalScore:3,_chalTotalScore:7,_battleScore:2,_studiedVocab:{genotype:true},
  _visited:{cross:true,pedigree:true,population:true,traits:true,learn:true,freqDyn:true},
  _learnTopic:-1,_traitSelected:-1,_traitFilter:'all',_pedPreset:0,_pedSolveMode:false,_pedShowGeno:true,
  popFreqA:.5,popSize:200,popGens:30,popSelection:0,popMutation:0,popDrift:false,popRunning:false,popHistory:null,freqDyn:{...iq},...extra},ecology:sibling},undefined,{expectCanvas:false});
 await page.locator('#wrap').evaluate((n:HTMLElement)=>Object.assign(n.style,{width:'100%',background:'#fff',color:'#0f172a',colorScheme:'light'}));
 await page.evaluate(()=>{(window as any).__remainingXP=[];(window as any).__remainingTTS=[];(window as any).__remainingAI=[];
  Object.assign((window as any).__ctx,{gradeLevel:'10th Grade',awardXP:(...a:unknown[])=>(window as any).__remainingXP.push(a),
   callTTS:(s:string)=>(window as any).__remainingTTS.push(s),callGemini:(...a:unknown[])=>{(window as any).__remainingAI.push(a);return Promise.resolve('Unused');}});
  (window as any).__rerender();});
 await expect(page.locator(scope(activity))).toBeVisible();return{errors,baseline:await state(page)};
}
async function activate(page:Page,node:Locator,key='Enter'){await node.focus();await page.keyboard.press(key);}
async function open(page:Page,activity:Activity){await activate(page,page.locator('#punnett-activity-'+activity));await expect(page.locator(scope(activity))).toBeVisible();await expect(page.locator('#punnett-activity-'+activity)).toBeFocused();}
async function preserved(page:Page,baseline:any,changes:string[]=[]){const actual=await state(page),expected={...baseline};
 for(const key of [...changes,'researchPoints','_badges','_completedChallenges']){delete actual[key];delete expected[key];}
 expect(actual).toEqual(expected);expect(await page.evaluate(()=>(window as any).__toolData.ecology)).toEqual(sibling);
 expect(await page.evaluate(()=>(window as any).__remainingAI)).toEqual([]);expect(await harness.glContexts(page)).toEqual([]);
}
async function xp(page:Page,id:string){return page.evaluate(id=>(window as any).__remainingXP.filter((a:any[])=>a[0]===id),id);}
async function label(page:Page,selector:string){const node=page.locator(selector);const text=await node.evaluate((n:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement)=>{
 if(!n.labels||n.labels.length!==1)throw Error('Expected one native label for '+n.id);
 if(n.labels[0].htmlFor!==n.id)throw Error('Label target mismatch');return(n.labels[0].textContent||'').replace(/\s+/g,' ').trim();});
 await expect(node).toHaveAccessibleName(text);return text;
}
async function range(page:Page,node:Locator,target:number){const current=Number(await node.inputValue()),step=Number(await node.getAttribute('step')||1);
 const count=Math.round(Math.abs(target-current)/step);expect(count).toBeLessThanOrEqual(120);await node.focus();
 for(let i=0;i<count;i++)await page.keyboard.press(target>current?'ArrowRight':'ArrowLeft');await expect(node).toHaveValue(String(target));await expect(node).toBeFocused();
}
function reference(p:number,s:number,m:number){const initial=p/100,selection=s/100,mutation=m/1000,next=Math.max(0,Math.min(1,initial*(1-selection)+mutation*(1-initial))),delta=Math.abs(next-initial);
 return{next,delta:(delta*100).toFixed(2),key:delta<.005?'equilibrium':Math.abs(selection)>.10?'selectionStrong':mutation>.005?'mutationDriven':'driftPotential'};}
test('Learn disclosures retain relationships, TTS is explicit, and native Try actions focus the chosen activity',async({page})=>{
 const initial=await setup(page,'learn'),root=page.locator(scope('learn')),topics=root.locator('button[id^="punnett-learn-topic-"]'),count=await topics.count();
 expect(count).toBeGreaterThanOrEqual(4);await expect(root.getByRole('button',{name:'Read Aloud',exact:true})).toBeDisabled();
 for(let i=0;i<count;i++){const panel=page.locator('#punnett-learn-panel-'+i);await expect(topics.nth(i)).toHaveAttribute('aria-expanded','false');
  await expect(topics.nth(i)).toHaveAttribute('aria-controls','punnett-learn-panel-'+i);await expect(panel).toHaveCount(1);await expect(panel).toBeHidden();await expect(panel).toHaveAttribute('aria-labelledby','punnett-learn-topic-'+i);}
 await activate(page,topics.nth(0));await expect(topics.nth(0)).toBeFocused();await expect(page.locator('#punnett-learn-panel-0')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).__remainingTTS)).toEqual([]);
 await activate(page,root.getByRole('button',{name:'Read Aloud',exact:true}),'Space');const spoken=await page.evaluate(()=>(window as any).__remainingTTS);
 expect(spoken).toHaveLength(1);expect(spoken[0]).toContain('DNA');expect(spoken[0].length).toBeGreaterThan(100);
 await activate(page,topics.nth(0),'Space');await expect(page.locator('#punnett-learn-panel-0')).toBeHidden();await expect(topics.nth(0)).toBeFocused();
 const destinations=[{i:0,target:'dna2protein',name:/Try DNA→Protein/},{i:1,target:'cross',name:/Try Punnett Cross/},{i:2,target:'pedigree',name:/Try Pedigree Builder/},{i:3,target:'population',name:/Try Population Genetics/}];
 for(const item of destinations){if((await state(page)).subtool!=='learn')await open(page,'learn');const topic=page.locator('#punnett-learn-topic-'+item.i);
  if(await topic.getAttribute('aria-expanded')!=='true')await activate(page,topic,'Space');
  const link=page.locator('#punnett-learn-panel-'+item.i).getByRole('button',{name:item.name});await expect(link).not.toHaveAttribute('aria-label');
  await expect(link).toHaveAccessibleName((await link.textContent())!.trim());await activate(page,link);
  await expect.poll(async()=>(await state(page)).subtool).toBe(item.target);await expect(page.locator('#punnett-activity-'+item.target)).toBeFocused();}
 expect(await page.evaluate(()=>(window as any).__remainingTTS)).toEqual(spoken);expect((await state(page))._visited).toEqual({...initial.baseline._visited,dna2protein:true});await preserved(page,initial.baseline,['subtool','_learnTopic','_visited']);expect(initial.errors).toEqual([]);
 report('remaining-learn.json',{topics:count,stablePanels:true,explicitTTSCalls:spoken.length,nativeTryNames:true,destinationActivityFocus:true,destinations:destinations.map(x=>x.target)});
});
test('Discovery keyboard sliders retain all four formulas, capped observations, prompts and learner reflections',async({page})=>{
 const initial=await setup(page,'freqDyn'),root=page.locator(scope('freqDyn'));
 for(const id of ['#fd-p','#fd-selection','#fd-mutation','#punnett-discovery-hypothesis'])await label(page,id);
 const status=page.locator('#punnett-discovery-state');await expect(status).toHaveRole('status');await expect(status).toHaveAttribute('aria-live','polite');await expect(status).toHaveAttribute('aria-atomic','true');
 const snapshots:any[]=[];
 for(const config of states){await range(page,page.locator('#fd-p'),config.p);await range(page,page.locator('#fd-selection'),config.selection);await range(page,page.locator('#fd-mutation'),config.mutation);
  const expected=reference(config.p,config.selection,config.mutation);expect(expected.key).toBe(config.key);await expect(status).toContainText(config.label);
  await expect(root).toContainText('Δp ≈ '+expected.delta+'%');snapshots.push({...config,label:config.label.source,...expected});}
 await root.getByLabel('Allele frequency hypothesis',{exact:true}).fill('Selection can counter a mutation-driven increase.');
 const prompts=root.locator('[data-punnett-discovery-prompts]'),panel=page.locator('#punnett-discovery-prompts');
 await expect(prompts).toHaveAttribute('aria-controls','punnett-discovery-prompts');await expect(panel).toBeHidden();
 await activate(page,prompts,'Space');await expect(prompts).toBeFocused();await expect(prompts).toHaveAttribute('aria-expanded','true');await expect(panel).toBeVisible();
 await activate(page,prompts);await expect(prompts).toBeFocused();await expect(panel).toBeHidden();await expect(panel).toHaveCount(1);
 const understood=root.getByRole('checkbox',{name:/I understand/});await activate(page,understood,'Space');await expect(understood).toBeChecked();
 const explanation=root.getByLabel('Explain allele selection and mutation',{exact:true});await explanation.fill('The balance of forces changes allele frequencies.');await label(page,'#punnett-discovery-explanation');
 const boundaries=await root.locator('textarea').evaluateAll((nodes:HTMLTextAreaElement[])=>{
  type Color=[number,number,number,number];
  const parse=(s:string):Color|null=>{const a=s.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);if(!a||a.length<3)return null;
   const c=(v:string)=>v.endsWith('%')?parseFloat(v)*2.55:parseFloat(v);return[c(a[0]),c(a[1]),c(a[2]),a[3]?parseFloat(a[3])/(a[3].endsWith('%')?100:1):1];};
  const over=(a:Color,b:Color):Color=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1] as Color;
  const lum=(c:Color)=>{const a=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2];};
  const ratio=(a:Color,b:Color)=>{const x=lum(over(a,b)),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const rgb=(c:Color)=>'rgb('+c.slice(0,3).map(v=>Math.round(v*1000)/1000).join(', ')+')';
  return nodes.map(node=>{
   const css=getComputedStyle(node),box=node.getBoundingClientRect(),ancestors:any[]=[],limitations:string[]=[];
   for(let parent:HTMLElement|null=node.parentElement;parent;parent=parent.parentElement){const s=getComputedStyle(parent);ancestors.push({tag:parent.tagName,id:parent.id,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity});}
   let outer:Color=[255,255,255,1];
   for(const layer of [...ancestors].reverse()){const c=parse(layer.background);if(c)outer=over(c,outer);else limitations.push('Non-RGB ancestor background: '+layer.background);
    if(layer.image!=='none')limitations.push('Ancestor image needs manual boundary review: '+layer.image);
    if(Number(layer.opacity)!==1)limitations.push('Ancestor opacity needs manual boundary review: '+layer.tag);}
   const own=parse(css.backgroundColor);if(!own)limitations.push('Textarea background is outside RGB model.');
   const inner=own?over(own,outer):outer;
   const borders=['Top','Right','Bottom','Left'].map(side=>{const s=css as any,color=s['border'+side+'Color'],width=parseFloat(s['border'+side+'Width']),style=s['border'+side+'Style'],parsed=parse(color);
    if(!parsed)limitations.push('Border color is outside RGB model: '+color);
    return{side,color,width,style,opaque:parsed?.[3]===1,contrastInside:parsed?ratio(parsed,inner):null,contrastOutside:parsed?ratio(parsed,outer):null};});
   return{id:node.id,geometry:{left:box.left,right:box.right,width:box.width,height:box.height},background:css.backgroundColor,resolvedInside:rgb(inner),resolvedOutside:rgb(outer),
    ancestorBackdrops:ancestors,borders,minimumContrast:Math.min(...borders.flatMap(b=>[b.contrastInside??0,b.contrastOutside??0])),limitations:[...new Set(limitations)]};
  });
 });
 const boundaryMinimumContrast=Math.min(...boundaries.map(b=>b.minimumContrast));
 report('remaining-discovery.json',{stage:'normal textarea boundaries',boundaries,boundaryMinimumContrast});
 await root.getByRole('checkbox',{name:/I understand/}).focus();
 await root.screenshot({path:resolve(output,'remaining-discovery-boundaries-normal.jpg'),type:'jpeg',quality:90});
 expect(boundaries.map(b=>b.id).sort()).toEqual(['punnett-discovery-explanation','punnett-discovery-hypothesis']);
 for(const boundary of boundaries){expect(boundary.limitations,'Boundary model for '+boundary.id).toEqual([]);
  for(const border of boundary.borders){expect(border.width).toBeGreaterThanOrEqual(1);expect(border.style).not.toBe('none');expect(border.opaque).toBe(true);
   expect(border.contrastInside!,boundary.id+' '+border.side+' inside contrast').toBeGreaterThanOrEqual(3);expect(border.contrastOutside!,boundary.id+' '+border.side+' outside contrast').toBeGreaterThanOrEqual(3);}}

 for(let i=0;i<9;i++){await range(page,page.locator('#fd-p'),51+i);await activate(page,root.getByRole('button',{name:/Log/}));}
 const current=await state(page);expect(current.freqDyn.log).toHaveLength(8);expect(current.freqDyn.log[0].p).toBe(52);expect(current.freqDyn.log[7].p).toBe(59);
 const table=root.getByRole('table',{name:'Logged allele frequency observations',exact:true});await expect(table.locator('tbody tr')).toHaveCount(8);await expect(table.locator('thead th')).toHaveCount(5);
 await expect(page.locator('#punnett-discovery-log-status')).toHaveRole('status');await expect(page.locator('#punnett-discovery-log-status')).toContainText(/8|logged|recorded/i);
 await expect(root.getByLabel('Allele frequency hypothesis',{exact:true})).toHaveValue('Selection can counter a mutation-driven increase.');
 await expect(explanation).toHaveValue('The balance of forces changes allele frequencies.');await activate(page,prompts);await expect(prompts).toBeFocused();await expect(panel).toBeVisible();
 await preserved(page,initial.baseline,['freqDyn']);expect(initial.errors).toEqual([]);report('remaining-discovery.json',{snapshots,keyboardSliders:true,cap:8,recordedP:current.freqDyn.log.map((x:any)=>x.p),stablePrompts:true,reflectionsPreserved:true,boundaries,boundaryMinimumContrast});
});
test('Population pauses and resumes history without new XP, stops on exit and exposes every recorded generation',async({page})=>{
 const initial=await setup(page,'population'),root=page.locator(scope('population'));
 for(const id of ['#punnett-pop-frequency','#punnett-pop-size','#punnett-pop-generations','#punnett-pop-selection','#punnett-pop-mutation'])await label(page,id);
 await activate(page,root.getByRole('button',{name:/Drift OFF/}),'Space');await expect(root.getByRole('button',{name:/Drift ON/})).toHaveAttribute('aria-pressed','true');
 await activate(page,root.getByRole('button',{name:/Drift ON/}));await range(page,page.locator('#punnett-pop-frequency'),.6);
 const lifecycle=page.locator('#punnett-population-status');await expect(lifecycle).toHaveRole('status');await expect(lifecycle).toHaveAttribute('aria-live','polite');await expect(lifecycle).toHaveAttribute('aria-atomic','true');
 await page.clock.install({time:new Date('2026-10-24T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-24T12:01:00Z'));await activate(page,root.getByRole('button',{name:/Simulate/}));await expect(lifecycle).toContainText(/running/i);
 await page.clock.runFor(151);await expect.poll(async()=>(await state(page)).popHistory.length).toBe(2);
 await activate(page,root.getByRole('button',{name:/Pause/}),'Space');await expect(lifecycle).toContainText(/paused/i);const paused=await state(page);
 await page.clock.runFor(2000);expect((await state(page)).popHistory).toEqual(paused.popHistory);expect(await xp(page,'popSim')).toEqual([['popSim',10,'Population Simulation']]);
 await activate(page,root.getByRole('button',{name:/Resume/}));await page.clock.runFor(151);await expect.poll(async()=>(await state(page)).popHistory.length).toBe(3);
 await activate(page,root.getByRole('button',{name:/Pause/}));const continued=await state(page);expect(continued.popHistory.slice(0,2)).toEqual(paused.popHistory);expect(await xp(page,'popSim')).toHaveLength(1);
 await activate(page,root.locator('[data-punnett-population-data] summary'),'Space');const table=root.getByRole('table',{name:'Allele frequencies by generation',exact:true});
 await expect(table).toBeVisible();await expect(table.locator('thead th')).toHaveText(['Generation','Allele p','Allele q']);await expect(table.locator('tbody tr')).toHaveCount(3);
 const rows=await table.locator('tbody tr').allTextContents();expect(rows[0].replace(/\s/g,'')).toContain('00.60000.4000');
 const data=root.getByRole('region',{name:/Recorded allele frequencies/});await data.focus();await page.keyboard.press('ArrowRight');await expect(data).toBeFocused();
 await activate(page,root.getByRole('button',{name:/Resume/}));await activate(page,page.locator('#punnett-activity-traits'));await page.clock.runFor(30);
 await expect(page.locator(scope('traits'))).toBeVisible();await expect.poll(async()=>(await state(page)).popRunning).toBe(false);
 const away=await state(page);await page.clock.runFor(2000);expect((await state(page)).popHistory).toEqual(away.popHistory);
 await activate(page,page.locator('#punnett-activity-population'));await page.clock.runFor(30);await expect(root.getByRole('button',{name:/Resume/})).toBeVisible();
 await activate(page,root.getByRole('button',{name:/Reset/}));const reset=await state(page);expect(reset.popHistory).toBeNull();expect(reset.popRunning).toBe(false);await expect(lifecycle).toContainText(/ready/i);expect(await xp(page,'popSim')).toHaveLength(1);
 await preserved(page,initial.baseline,['subtool','popFreqA','popRunning','popHistory','popDrift','_popSimDone']);expect(initial.errors).toEqual([]);
 report('remaining-population.json',{pausedHistory:paused.popHistory,continuedHistory:continued.popHistory,tableRows:rows,resumeRetainsHistory:true,resumeDoesNotAwardXP:true,pauseOnExit:true,resetFrequency:reset.popFreqA});
});
test('Cross and pedigree retain their models, and closed trait cards expose an unclipped inset focus indicator',async({page})=>{
 const initial=await setup(page,'cross'),cross=page.locator(scope('cross'));await expect(cross).toContainText('Aa: 2/4');
 await label(page,'#punnett-parent1-genotype');await label(page,'#punnett-parent2-genotype');
 const first=page.locator('#punnett-parent1-genotype');await first.focus();await page.keyboard.press('Home');await expect(first).toHaveValue('AA');await expect(first).toBeFocused();
 await page.locator('#punnett-parent2-genotype').selectOption('aa');await expect(cross).toContainText('Aa: 4/4');
 await activate(page,cross.getByRole('button',{name:/Dihybrid Cross/}),'Space');await expect(cross.getByRole('button',{name:/Dihybrid ON/})).toHaveAttribute('aria-pressed','true');
 await expect(cross.getByRole('region',{name:/Four by four dihybrid/}).getByRole('table').locator('td')).toHaveCount(16);await expect(cross).toContainText('9:3:3:1');
 await open(page,'pedigree');const ped=page.locator(scope('pedigree'));await expect(ped.getByRole('img')).toHaveAccessibleName(/pedigree/i);
 await activate(page,ped.getByRole('button',{name:/Solve Mode/}),'Space');await expect(ped.getByRole('button',{name:/Solve Mode ON/})).toHaveAttribute('aria-pressed','true');
 const genotypes=ped.getByRole('button',{name:/Genotypes/});await expect(genotypes).toBeDisabled();await expect(genotypes).toHaveAttribute('aria-pressed','false');
 const answers=ped.getByRole('group',{name:'What inheritance pattern does this pedigree show?',exact:true}),status=page.locator('#punnett-pedigree-feedback');
 await expect(status).toHaveRole('status');await expect(status).toHaveText('');
 const wrong=answers.getByRole('button',{name:'Autosomal Recessive',exact:true});await activate(page,wrong);await expect(wrong).toBeFocused();await expect(status).toContainText(/Not quite/);
 const correct=answers.getByRole('button',{name:'Autosomal Dominant',exact:true});await activate(page,correct,'Space');await expect(correct).toBeFocused();await expect(status).toContainText(/Correct!/);expect(await xp(page,'pedigreeSolve')).toHaveLength(1);
 await open(page,'traits');const traits=page.locator(scope('traits')),card=page.locator('#punnett-trait-button-0'),panel=page.locator('#punnett-trait-detail-0');
 await card.focus();const ring=await traitFocus(card);checkRing(ring);await card.screenshot({path:resolve(output,'remaining-trait-closed-focus.jpg'),type:'jpeg',quality:90});
 await expect(panel).toHaveCount(1);await expect(panel).toBeHidden();await activate(page,card,'Space');await expect(card).toBeFocused();await expect(panel).toBeVisible();await expect(panel).toHaveAttribute('aria-labelledby','punnett-trait-button-0');
 await activate(page,card);await expect(panel).toBeHidden();await expect(card).toBeFocused();
 const all=await traits.locator('button[id^="punnett-trait-button-"]').count(),filter=traits.getByRole('button',{name:'Recessive',exact:true});await activate(page,filter,'Space');await expect(filter).toBeFocused();await expect(filter).toHaveAttribute('aria-pressed','true');
 const filtered=await traits.locator('button[id^="punnett-trait-button-"]').count();expect(filtered).toBeGreaterThan(0);expect(filtered).toBeLessThan(all);
 await activate(page,traits.getByRole('button',{name:'All Traits',exact:true}));await expect(traits.locator('button[id^="punnett-trait-button-"]')).toHaveCount(all);
 await preserved(page,initial.baseline,['subtool','parent1','parent2','_activePreset','_crossCount','_modesUsed','_isDihybrid','_diCrossCount','_pedSolveMode','_pedSolveAnswer','_pedSolveFeedback','_pedShowGeno','_pedigreeSolved','_traitSelected','_traitFilter']);expect(initial.errors).toEqual([]);
 report('remaining-cross-pedigree-traits.json',{cross:'AA × aa → all Aa',dihybridCells:16,ratio:'9:3:3:1',pedigreeSemantics:true,traitRing:ring,stableDetails:true,filterCounts:{all,recessive:filtered}});
});
test('all six activities reflow at 320px with text spacing and visible forced-color keyboard controls',async({page})=>{
 await page.setViewportSize({width:320,height:900});const initial=await setup(page,'traits');
 await page.addStyleTag({content:'[data-punnett-tool], [data-punnett-tool] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-punnett-tool] p{margin-bottom:2em!important}'});
 const card=page.locator('#punnett-trait-button-0');await card.focus();checkRing(await traitFocus(card));await card.screenshot({path:resolve(output,'remaining-trait-mobile-inset-focus.jpg'),type:'jpeg',quality:90});
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});const snapshots:any[]=[];
 for(const activity of ['cross','pedigree','population','traits','learn','freqDyn'] as Activity[]){
  await patch(page,{subtool:activity,_isDihybrid:activity==='cross',_pedSolveMode:false,_pedShowGeno:true,popRunning:false,popHistory:[.5,.55,.6],_learnTopic:activity==='learn'?0:-1,
   freqDyn:{...iq,hypothesis:'Keep this hypothesis',understood:true,explanation:'Keep this explanation',stuckRevealed:true,log:[{p:50,s:0,m:0,dp:'0.00',st:'equilibrium'}]}});
  const root=page.locator(scope(activity));await expect(root).toBeVisible();if(activity==='population')await activate(page,root.locator('[data-punnett-population-data] summary'),'Space');
  const before=await state(page),targets:any[]=[],controls=root.locator('button,input,select,textarea,summary');
  for(let i=0;i<await controls.count();i++){const control=controls.nth(i);if(!(await control.isVisible())||!(await control.isEnabled()))continue;await control.scrollIntoViewIfNeeded();await control.focus();
   const box=await control.evaluate((n:HTMLElement)=>{const target=n.matches('input[type="checkbox"]')?n.closest('label') as HTMLElement:n,b=target.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    const inputStyle=getComputedStyle(n),track=n.matches('input[type="range"]')?getComputedStyle(n,'::-webkit-slider-runnable-track'):null;
    const rangeTrack=track?{height:parseFloat(track.height),inputHeight:parseFloat(inputStyle.height),background:track.backgroundColor,inputBackground:inputStyle.backgroundColor,border:parseFloat(track.borderTopWidth),borderColor:track.borderTopColor,forcedColorAdjust:track.forcedColorAdjust,
      distinctPseudoStyle:track.height!==inputStyle.height&&track.backgroundColor!==inputStyle.backgroundColor,
      limitation:track.height===inputStyle.height||track.backgroundColor===inputStyle.backgroundColor?'Chromium CSSOM exposes input styles for this range-track pseudo; inspect the saved forced-color screenshot.':null}:null;
    return{tag:n.tagName,type:n.getAttribute('type'),id:n.id,text:target.textContent?.trim(),left:b.left,right:b.right,width:b.width,height:b.height,checkboxLabel:target!==n,centerHits:!!hit&&(hit===target||target.contains(hit)),rangeTrack};});
   expect(box.left).toBeGreaterThanOrEqual(-1);expect(box.right).toBeLessThanOrEqual(321);expect(box.width).toBeGreaterThanOrEqual(24);const minimumHeight=box.tag==='BUTTON'||box.type==='range'||box.tag==='SUMMARY'||box.checkboxLabel?44:24;expect(box.height).toBeGreaterThanOrEqual(minimumHeight);expect(box.centerHits).toBe(true);if(box.rangeTrack?.distinctPseudoStyle){expect(box.rangeTrack.height).toBe(4);expect(box.rangeTrack.border).toBeGreaterThanOrEqual(1);expect(box.rangeTrack.background).not.toBe(box.rangeTrack.inputBackground);expect(box.rangeTrack.forcedColorAdjust).toBe('none');}targets.push(box);}
  expect(targets.length).toBeGreaterThan(0);const geometry=await layout(root);expect(geometry.documentWidth).toBeLessThanOrEqual(321);expect(geometry.left).toBeGreaterThanOrEqual(-1);expect(geometry.right).toBeLessThanOrEqual(321);
  expect(geometry.forcedColors).toBe(true);expect(geometry.focus.visible).toBe(true);expect(geometry.focus.width).toBeGreaterThanOrEqual(3);expect(geometry.focus.style).not.toBe('none');
  expect(geometry.focus.line).toBeCloseTo(geometry.focus.font*1.5,1);expect(geometry.focus.letter).toBeCloseTo(geometry.focus.font*.12,1);expect(geometry.focus.word).toBeCloseTo(geometry.focus.font*.16,1);
  for(const region of await root.locator('.punnett-data-scroll').all())if(await region.isVisible()){await region.focus();await page.keyboard.press('ArrowRight');await expect(region).toBeFocused();}
  expect(await state(page)).toEqual(before);await root.screenshot({path:resolve(output,'remaining-'+activity+'-mobile-forced-colors.jpg'),type:'jpeg',quality:90});snapshots.push({activity,geometry,targets});}
 expect((await state(page)).learnerNotes).toBe(initial.baseline.learnerNotes);expect((await state(page))._dnaSeq).toBe(initial.baseline._dnaSeq);expect(await page.evaluate(()=>(window as any).__toolData.ecology)).toEqual(sibling);expect(initial.errors).toEqual([]);
 report('remaining-mobile-reflow.json',{width:320,spacing:{line:1.5,letter:'.12em',word:'.16em',paragraph:'2em'},checkboxLabelIsTarget:true,nativeTableRegionsMayScroll:true,snapshots});
});
test('scoped axe and computed contrast cover all six activities and their expanded learning states',async({page})=>{
 const initial=await setup(page,'cross');await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const scans:any[]=[];
 async function scan(name:string,activity:Activity){
  const audit=await page.locator(scope(activity)).evaluate(async root=>{const result=await(window as any).axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
   const compact=(rule:any)=>({id:rule.id,impact:rule.impact,nodes:rule.nodes.map((n:any)=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))});
   return{version:result.testEngine.version,forcedColors:matchMedia('(forced-colors: active)').matches,violations:result.violations.map(compact),incomplete:result.incomplete.map(compact),
    inspectedNodes:[...result.passes,...result.incomplete,...result.violations].reduce((sum,r)=>sum+r.nodes.length,0)};});
  const contrast=await contrastEvidence(page,scope(activity),audit.incomplete);scans.push({state:name,activity,...audit,contrast});const samples=scans.flatMap(s=>s.contrast.nodes).filter(n=>!n.decorativeEmpty).flatMap(n=>n.samples);
  report('remaining-axe.json',{scope:'Cross/dihybrid; pedigree explanation and solve; Population settings and history; Traits and Learn disclosures; four Discovery states and logs/reflection',
   limitation:'Scoped axe does not certify complete WCAG conformance. RGB/alpha and gradient endpoint ratios supplement incompletes; overlap, glyph interpretation, intermediate gradients, images and antialiasing require manual review.',
   totals:{scans:scans.length,violations:scans.reduce((n,s)=>n+s.violations.length,0),incompleteRules:scans.reduce((n,s)=>n+s.incomplete.length,0),
    incompleteNodes:scans.reduce((n,s)=>n+s.incomplete.reduce((a:number,r:any)=>a+r.nodes.length,0),0),supplementarySamples:samples.length,minimumSupplementaryContrast:samples.length?Math.min(...samples.map(s=>s.ratio)):null},scans});
  expect(audit.forcedColors).toBe(false);expect(audit.inspectedNodes).toBeGreaterThan(0);expect(audit.violations,name+': '+JSON.stringify(audit.violations)).toEqual([]);
  for(const n of contrast.nodes)if(!n.decorativeEmpty){expect(n.found,name+': unresolved '+n.target.join(' ')).toBe(true);expect(n.limitations,name+': '+n.text).toEqual([]);expect(n.samples.length).toBeGreaterThan(0);
   for(const sample of n.samples)expect(sample.ratio,name+': '+n.text+' / '+sample.color).toBeGreaterThanOrEqual(4.5);for(const glyph of n.selectChevronSamples||[])expect(glyph.ratio,name+': known native chevron / '+glyph.color).toBeGreaterThanOrEqual(3);}
 }
 await scan('Cross monohybrid','cross');await activate(page,page.locator(scope('cross')).getByRole('button',{name:/Dihybrid Cross/}));await scan('Cross dihybrid','cross');
 await open(page,'pedigree');await scan('Pedigree explanation','pedigree');await activate(page,page.locator(scope('pedigree')).getByRole('button',{name:/Solve Mode/}));
 const answers=page.locator(scope('pedigree')).getByRole('group',{name:'What inheritance pattern does this pedigree show?',exact:true});
 await activate(page,answers.getByRole('button',{name:'Autosomal Recessive',exact:true}));await scan('Pedigree incorrect','pedigree');await activate(page,answers.getByRole('button',{name:'Autosomal Dominant',exact:true}));await scan('Pedigree correct','pedigree');
 await open(page,'population');await scan('Population settings','population');await patch(page,{popRunning:false,popHistory:[.5,.55,.6]});await activate(page,page.locator(scope('population')).locator('[data-punnett-population-data] summary'));await scan('Population history','population');
 await open(page,'traits');await scan('Traits collapsed','traits');await activate(page,page.locator('#punnett-trait-button-0'));await scan('Traits expanded','traits');
 await open(page,'learn');await scan('Learn collapsed','learn');await activate(page,page.locator('#punnett-learn-topic-0'));await scan('Learn expanded','learn');
 await open(page,'freqDyn');for(const config of states){await patch(page,{freqDyn:{...iq,p:config.p,selection:config.selection,mutation:config.mutation}});await scan('Discovery '+config.key,'freqDyn');}
 await patch(page,{freqDyn:{...iq,understood:true,hypothesis:'Mutation may change allele frequency.',explanation:'Compare the forces.',stuckRevealed:true,log:[{p:50,s:0,m:0,dp:'0.00',st:'equilibrium'}]}});await scan('Discovery log prompts and reflection','freqDyn');
 expect(scans).toHaveLength(16);expect(initial.errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__remainingTTS)).toEqual([]);expect((await state(page)).learnerNotes).toBe(initial.baseline.learnerNotes);expect(await page.evaluate(()=>(window as any).__toolData.ecology)).toEqual(sibling);
});
async function traitFocus(control:Locator){return control.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect(),a=n.closest('article')!.getBoundingClientRect(),s=getComputedStyle(n),width=parseFloat(s.outlineWidth),offset=parseFloat(s.outlineOffset),extent=width+offset;
 return{visible:n.matches(':focus-visible'),width,offset,color:s.outlineColor,style:s.outlineStyle,clipSafe:b.left-extent>=a.left-1&&b.right+extent<=a.right+1&&b.top-extent>=a.top-1&&b.bottom+extent<=a.bottom+1};});}
function checkRing(r:Awaited<ReturnType<typeof traitFocus>>){expect(r.visible).toBe(true);expect(r.width).toBeGreaterThanOrEqual(3);expect(r.style).not.toBe('none');expect(r.offset).toBeLessThanOrEqual(-3);expect(r.clipSafe).toBe(true);}
async function layout(root:Locator){return root.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect(),f=document.activeElement as HTMLElement,s=getComputedStyle(f);
 return{left:b.left,right:b.right,documentWidth:document.documentElement.scrollWidth,forcedColors:matchMedia('(forced-colors: active)').matches,focus:{visible:f.matches(':focus-visible'),width:parseFloat(s.outlineWidth),style:s.outlineStyle,color:s.color,background:s.backgroundColor,font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),letter:parseFloat(s.letterSpacing),word:parseFloat(s.wordSpacing)}};});}
async function contrastEvidence(page:Page,selector:string,incomplete:any[]){
 return page.locator(selector).evaluate((root,incomplete)=>{
  type Color=[number,number,number,number];
  const parse=(s:string):Color|null=>{const a=s.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);if(!a||a.length<3)return null;const c=(v:string)=>v.endsWith('%')?parseFloat(v)*2.55:parseFloat(v);
   return[c(a[0]),c(a[1]),c(a[2]),a[3]?parseFloat(a[3])/(a[3].endsWith('%')?100:1):1];};
  const over=(a:Color,b:Color):Color=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1] as Color;
  const lum=(c:Color)=>{const a=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*a[0]+.7152*a[1]+.0722*a[2];};
  const text=(c:Color)=>'rgb('+c.slice(0,3).map(v=>Math.round(v*1000)/1000).join(', ')+')';
  const nodes=incomplete.flatMap((rule:any)=>rule.nodes.map((node:any)=>{let element:HTMLElement|null=null;
   try{if(node.target.length===1)element=(root.matches(node.target[0])?root:root.querySelector(node.target[0])) as HTMLElement|null;}catch{}
   if(!element)return{found:false,target:node.target,text:'',decorativeEmpty:false,samples:[],limitations:['Target did not resolve.']};
   const style=getComputedStyle(element),foreground=parse(style.color),chain:any[]=[],limitations:string[]=[],modeledSelectChevrons:any[]=[];
   for(let a:HTMLElement|null=element;a;a=a.parentElement){const s=getComputedStyle(a);chain.push({tag:a.tagName,id:a.id,className:a.getAttribute('class'),color:s.color,background:s.backgroundColor,gradient:s.backgroundImage,opacity:s.opacity,paddingRight:s.paddingRight,backgroundSize:s.backgroundSize,positionX:s.backgroundPositionX,repeat:s.backgroundRepeat});}
   let colors:Color[]=[[255,255,255,1]];
   for(const layer of [...chain].reverse()){if(Number(layer.opacity)<1)limitations.push('Ancestor opacity needs visual review: '+layer.tag);const c=parse(layer.background);if(c)colors=colors.map(b=>over(c,b));
    if(layer.gradient!=='none'){const stops=layer.gradient.match(/rgba?\([^)]+\)/gi)?.map(parse).filter((c:Color|null):c is Color=>!!c)||[];
     if(/^linear-gradient\(/.test(layer.gradient)&&stops.length>=2)colors=colors.flatMap(b=>stops.map((c:Color)=>over(c,b)));
     else{
      let decoded='';try{decoded=decodeURIComponent(layer.gradient);}catch{}
      const known=layer.tag==='SELECT'&&/^url\(["']?data:image\/svg\+xml(?:;utf8)?,/i.test(decoded)&&/<svg\b/.test(decoded)&&(decoded.match(/<path\b/g)||[]).length===1&&/\bviewBox=['"]0 0 24 24['"]/.test(decoded)&&/\bfill=['"]none['"]/.test(decoded)&&/\bd=['"]M6 9l6 6 6-6['"]/.test(decoded)&&/\bstroke=['"]#475569['"]/.test(decoded)&&/\bwidth=['"]16['"]/.test(decoded)&&/\bheight=['"]16['"]/.test(decoded)&&!/<(?:image|text|script|style|foreignObject|circle|rect|polygon|polyline|line|ellipse)\b/i.test(decoded);
      const size=/^([\d.]+)px/.exec(layer.backgroundSize),glyphWidth=size?Number(size[1]):/^auto/.test(layer.backgroundSize)?16:NaN;
      const rightGap=/^right ([\d.]+)px$/.exec(layer.positionX)||/^calc\(100% - ([\d.]+)px\)$/.exec(layer.positionX);
      const gap=layer.positionX==='100%'?0:rightGap?Number(rightGap[1]):NaN;
      const textClear=Number.isFinite(glyphWidth)&&Number.isFinite(gap)&&parseFloat(layer.paddingRight)>=glyphWidth+gap;
      if(known&&textClear&&layer.repeat==='no-repeat')modeledSelectChevrons.push({kind:'Known decorative native select chevron',path:'M6 9l6 6 6-6',stroke:'#475569',intrinsicSize:16,glyphWidth,rightGap:gap,paddingRight:layer.paddingRight,textClear,backgroundSize:layer.backgroundSize,positionX:layer.positionX});
      else limitations.push('Image outside endpoint model: '+layer.gradient);
     }}}
   if(!foreground)limitations.push('Foreground outside RGB model.');const unique=[...new Map(colors.map(c=>[text(c),c])).values()];
   return{found:true,target:node.target,rule:rule.id,text:element.textContent?.trim(),decorativeEmpty:!element.textContent?.trim(),color:style.color,font:style.fontSize,weight:style.fontWeight,ancestorBackdrops:chain,
    samples:foreground?unique.map(b=>{const a=lum(over(foreground,b)),z=lum(b);return{color:text(b),ratio:(Math.max(a,z)+.05)/(Math.min(a,z)+.05)};}):[],modeledSelectChevrons,selectChevronSamples:modeledSelectChevrons.length?unique.map(b=>{const a=lum([71,85,105,1]),z=lum(b);return{color:text(b),ratio:(Math.max(a,z)+.05)/(Math.min(a,z)+.05)};}):[],limitations:[...new Set(limitations)]};}));
  return{method:'Computed RGB/alpha surfaces and composited linear-gradient endpoints; WCAG sRGB relative luminance.',nodes};
 },incomplete);
}


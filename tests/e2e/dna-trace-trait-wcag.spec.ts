import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,timeout:240000});
const output=resolve(process.env.DNA_TRAIT_WCAG_REPORT||'reports/dna-trait-wcag-20261024');
const harness=new GlHarness({toolId:'dnaLab',toolFile:'stem_lab/stem_tool_dna.js',width:1120,height:900,appStyles:true,layout:'document'});
const scope='[data-dna-trace-trait]';
const sibling={observations:['Keep earlier ecology evidence.'],revision:4};
const main={tab:'build',dnaGradeOverride:'9-12',showHelix3d:false,dnaSequence:'ATGGCTTTTTAA',dnaReportNote:'My earlier claim.',dnaCompareReflection:'Keep this comparison.',dnaEvidenceReasoning:'Keep the codon evidence.',score:7,
 animPlaying:false,replPlaying:false,transPlaying:false,guidedStarted:false,guidedAnswers:{},dnaReportOpen:false};
const expansion={expSection:'traceTrait',mutationInquiry:{hypothesis:'Keep the fixation hypothesis.',log:[{state:'Drift-dominated'}]},learnerNote:'Keep reference notes.'};
const families=[
 {id:'p1',name:'Family A',correct:'autosomal_recessive',ranking:['skip_generations','unaffected_carriers','no_sex_bias','present_in_homozygote']},
 {id:'p2',name:'Family B',correct:'x_linked_recessive',ranking:['male_bias','mother_carrier','skip_via_daughters','no_male_to_male']},
 {id:'p3',name:'Family C',correct:'autosomal_dominant',ranking:['every_gen','affected_parent_required','fifty_pct','no_sex_bias_dom']}
];
const firstExplanation='Trait skips generations (unaffected parents → affected child).';
const secondExplanation='Parents must be heterozygous carriers passing one recessive allele each.';
const clone=(value:any)=>JSON.parse(JSON.stringify(value));

test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
function report(name:string,value:unknown){writeFileSync(resolve(output,name),JSON.stringify(value,null,2));}
async function store(page:Page){return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__toolData)));}
async function trace(page:Page){return(await store(page)).dna.traceTrait;}
async function activate(page:Page,node:Locator,key='Enter'){await node.focus();await page.keyboard.press(key);}
function puzzle(page:Page,id:string){return page.locator('[data-dna-trait-puzzle="'+id+'"]');}
function choice(page:Page,id:string,pattern:string){return puzzle(page,id).locator('[data-dna-trait-pattern="'+pattern+'"]');}
function row(page:Page,id:string,explanation:string){return puzzle(page,id).locator('[data-dna-trait-explanation="'+explanation+'"]');}
function move(page:Page,id:string,explanation:string,direction:string){return row(page,id,explanation).locator('[data-dna-trait-move="'+direction+'"]');}
function reveal(page:Page,id:string){return puzzle(page,id).locator('[data-dna-trait-reveal="'+id+'"]');}
async function setup(page:Page,traceTrait:any={puzzles:{},score:0},existing?:any){
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'none'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await harness.mount(page,existing||{dnaLab:clone(main),dna:{...clone(expansion),traceTrait:clone(traceTrait)},ecology:clone(sibling)},undefined,{expectCanvas:false});
 await page.locator('#wrap').evaluate((n:HTMLElement)=>Object.assign(n.style,{width:'100%',background:'#fff',color:'#0f172a',colorScheme:'light'}));
 await page.evaluate(()=>{const w=window as any;w.__traitXP=[];w.__traitAnnouncements=[];Object.assign(w.__ctx,{gradeLevel:'10th Grade',callGemini:null,callTTS:null,
  awardXP:(...a:unknown[])=>w.__traitXP.push(a),announceToSR:(s:string)=>w.__traitAnnouncements.push(s)});w.__rerender();});
 const library=page.locator('.dna-reference-library');await expect(library).toBeVisible();await activate(page,library.locator(':scope > summary'),'Space');
 await expect(library).toHaveAttribute('open','');await expect(page.locator(scope)).toBeVisible();return{errors,baseline:await store(page)};
}
async function preserved(page:Page,baseline:any){const current=await store(page);expect(current.dnaLab).toEqual(baseline.dnaLab);expect(current.ecology).toEqual(baseline.ecology);
 const actual={...current.dna},expected={...baseline.dna};delete actual.traceTrait;delete expected.traceTrait;expect(actual).toEqual(expected);
 expect(await page.evaluate(()=>(window as any).__traitXP)).toEqual([]);expect(await harness.glContexts(page)).toEqual([]);
}
async function stableStatus(node:Locator){await expect(node).toHaveRole('status');await expect(node).toHaveAttribute('aria-live','polite');await expect(node).toHaveAttribute('aria-atomic','true');}
async function order(page:Page,id:string){return puzzle(page,id).locator('[data-dna-trait-explanation]').evaluateAll(ns=>ns.map(n=>n.getAttribute('data-dna-trait-explanation')));}

test('opening Trace Trait does not initialize saved puzzles; family groups, lists, positions and native controls have contextual names',async({page})=>{
 const initial=await setup(page),root=page.locator(scope);await expect(root).toHaveAttribute('id','dna-trace-trait-panel');await expect(root).toHaveRole('region');await expect(root).toHaveAccessibleName(/Trace the trait/i);
 expect(await trace(page)).toEqual({puzzles:{},score:0});
 const structure:any[]=[];
 for(const family of families){const panel=puzzle(page,family.id),title=page.locator('#dna-trait-'+family.id+'-title'),patterns=panel.locator('[data-dna-trait-patterns="'+family.id+'"]'),ranking=page.locator('#dna-trait-'+family.id+'-ranking');
  await expect(title).toHaveRole('heading');await expect(title).toContainText(family.name);await expect(patterns).toHaveRole('group');await expect(patterns).toHaveAccessibleName(new RegExp(family.name));await expect(patterns).toHaveAccessibleName(/inheritance pattern/i);
  await expect(ranking).toHaveRole('list');await expect(ranking).toHaveAccessibleName(new RegExp(family.name));await expect(ranking).toHaveAccessibleName(/rank.*explanation/i);await expect(ranking.getByRole('listitem')).toHaveCount(4);expect(await order(page,family.id)).toEqual(family.ranking);
  const picks=patterns.locator('button');await expect(picks).toHaveCount(6);for(const button of await picks.all()){expect(await button.evaluate((n:HTMLButtonElement)=>n.tagName==='BUTTON'&&n.type==='button'&&!n.disabled)).toBe(true);await expect(button).toHaveAttribute('aria-pressed','false');}
  const verdict=page.locator('#dna-trait-'+family.id+'-verdict'),movement=page.locator('#dna-trait-'+family.id+'-move-status');await stableStatus(verdict);await stableStatus(movement);await expect(verdict).toHaveText('');await expect(movement).toHaveText('');
  for(let index=0;index<4;index++){const item=row(page,family.id,family.ranking[index]);for(const direction of ['up','down']){const button=item.locator('[data-dna-trait-move="'+direction+'"]');
    await expect(button).toHaveCount(1);await expect(button).toHaveAccessibleName(new RegExp(family.name));await expect(button).toHaveAccessibleName(new RegExp(direction,'i'));
    const described=await button.getAttribute('aria-describedby');expect(described).toBeTruthy();const descriptions=await page.evaluate(ids=>ids.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' '),described!);
    expect(descriptions).toMatch(new RegExp('(?:position|#)\\s*'+(index+1),'i'));expect(await button.evaluate((n:HTMLButtonElement)=>n.disabled)).toBe(false);
    if((index===0&&direction==='up')||(index===3&&direction==='down')){await expect(button).toHaveAttribute('aria-disabled','true');await expect(button).toHaveAttribute('tabindex','-1');}}}
  await expect(reveal(page,family.id)).toHaveAttribute('aria-disabled','true');expect(await reveal(page,family.id).evaluate((n:HTMLButtonElement)=>n.disabled)).toBe(false);structure.push({family:family.id,ranking:await order(page,family.id),patterns:6,moves:8});}
 const first=choice(page,'p1','autosomal_dominant');await first.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await expect(first).toBeFocused();await page.keyboard.press('Enter');await expect(first).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Tab');const second=choice(page,'p1','autosomal_recessive');await expect(second).toBeFocused();await page.keyboard.press('Space');await expect(second).toHaveAttribute('aria-pressed','true');await expect(first).toHaveAttribute('aria-pressed','false');
 expect((await trace(page)).score).toBe(0);expect((await trace(page)).puzzles.p1.revealed).toBe(false);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
 report('structure-and-selection.json',{noInitializationWrites:true,structure,keyboardPatternSelection:true,noAutomaticReveal:true});
});

test('ranking movement retains the same focused arrow at both boundaries and announces the moved explanation and new position',async({page})=>{
 await page.setViewportSize({width:320,height:900});
 await page.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='[data-dna-trace-trait], [data-dna-trace-trait] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-dna-trace-trait] p{margin-bottom:2em!important}';document.head.appendChild(style);},{once:true});});
 const initial=await setup(page),up=move(page,'p1','unaffected_carriers','up'),down=move(page,'p1','unaffected_carriers','down'),status=page.locator('#dna-trait-p1-move-status');
 const visibility:any[]=[];async function movedTarget(button:Locator,stage:string){const geometry=await button.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height,viewport:{width:innerWidth,height:innerHeight},centerHits:!!hit&&(hit===n||n.contains(hit))};});
  visibility.push({stage,...geometry});report('ranking-movement-visibility.json',{viewport:320,textSpacing:true,visibility});await expect(button).toBeInViewport({ratio:1});expect(geometry.centerHits,stage+' moved control center remains reachable').toBe(true);}
 await up.evaluate(n=>(window as any).__traitUp=n);await down.evaluate(n=>(window as any).__traitDown=n);await status.evaluate(n=>(window as any).__traitMoveStatus=n);
 await expect(up).toHaveAccessibleName(new RegExp(secondExplanation.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));await activate(page,up,'Space');
 await expect(up).toBeFocused();await movedTarget(up,'Up to first position');expect(await up.evaluate(n=>n===(window as any).__traitUp)).toBe(true);await expect(up).toHaveAttribute('aria-disabled','true');await expect(up).toHaveAttribute('tabindex','-1');
 expect(await order(page,'p1')).toEqual(['unaffected_carriers','skip_generations','no_sex_bias','present_in_homozygote']);await expect(status).toContainText(secondExplanation);await expect(status).toContainText(/(?:position|#)\s*1/i);
 const boundary=await trace(page);await page.keyboard.press('Enter');await page.keyboard.press('Space');expect(await trace(page)).toEqual(boundary);await expect(up).toBeFocused();
 const positions:any[]=[];for(let index=1;index<4;index++){await activate(page,down,index%2?'Enter':'Space');await expect(down).toBeFocused();await movedTarget(down,'Down to position '+(index+1));expect(await down.evaluate(n=>n===(window as any).__traitDown)).toBe(true);await expect(status).toContainText(new RegExp('(?:position|#)\\s*'+(index+1),'i'));positions.push(await order(page,'p1'));}
 await expect(down).toHaveAttribute('aria-disabled','true');await expect(down).toHaveAttribute('tabindex','-1');const bottom=await trace(page);await page.keyboard.press('Space');expect(await trace(page)).toEqual(bottom);await expect(down).toBeFocused();
 expect(await status.evaluate(n=>n===(window as any).__traitMoveStatus)).toBe(true);expect((await trace(page)).score).toBe(0);await expect(page.locator('#dna-trait-p1-verdict')).toHaveText('');
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);await puzzle(page,'p1').screenshot({path:resolve(output,'ranking-bottom-boundary-focus.jpg'),type:'jpeg',quality:90});
 report('ranking-focus-and-status.json',{moved:secondExplanation,topAndBottomRetainDOMFocus:true,blockedBoundaryDoesNotWrite:true,positions,visibility,stableMoveStatus:true});
});

test('all three verdicts retain independent ranking grades, one-time pattern bonuses, locked controls and Reveal focus',async({page})=>{
 const initial=await setup(page);await activate(page,move(page,'p1','unaffected_carriers','up'));const results:any[]=[];
 for(const [index,family] of families.entries()){const pick=index===1?'autosomal_dominant':family.correct,expectedRank=index===0?2:4,verdict=page.locator('#dna-trait-'+family.id+'-verdict');
  await verdict.evaluate((n,id)=>(window as any)['__traitVerdict'+id]=n,family.id);await activate(page,choice(page,family.id,pick),index%2?'Space':'Enter');await expect(reveal(page,family.id)).not.toHaveAttribute('aria-disabled','true');
  await activate(page,reveal(page,family.id),'Space');await expect(reveal(page,family.id)).toBeFocused();await expect(reveal(page,family.id)).toHaveAttribute('aria-disabled','true');expect(await reveal(page,family.id).evaluate((n:HTMLButtonElement)=>n.disabled)).toBe(false);
  await expect(verdict).toContainText(index===1?/Pattern off/i:/Pattern correct/i);await expect(verdict).toContainText(new RegExp(expectedRank+'\\s*/\\s*4'));expect(await verdict.evaluate((n,id)=>n===(window as any)['__traitVerdict'+id],family.id)).toBe(true);
  const after=await trace(page);await page.keyboard.press('Enter');await page.keyboard.press('Space');await reveal(page,family.id).evaluate((n:HTMLButtonElement)=>{n.click();n.click();});expect(await trace(page)).toEqual(after);await expect(reveal(page,family.id)).toBeFocused();
  for(const control of await puzzle(page,family.id).locator('[data-dna-trait-pattern],[data-dna-trait-move]').all()){await expect(control).toHaveAttribute('aria-disabled','true');await expect(control).toHaveAttribute('tabindex','-1');expect(await control.evaluate((n:HTMLButtonElement)=>n.disabled)).toBe(false);}
  const selected=choice(page,family.id,pick);await expect(selected).toHaveAttribute('aria-pressed','true');await selected.evaluate((n:HTMLButtonElement)=>n.click());await move(page,family.id,family.ranking[0],'down').evaluate((n:HTMLButtonElement)=>n.click());expect(await trace(page)).toEqual(after);
  results.push({family:family.id,pick,patternCorrect:index!==1,rankingMatches:expectedRank,score:after.score});}
 expect((await trace(page)).score).toBe(2);await expect(page.locator(scope)).toContainText('Pattern score: 2 / 3');await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
 await page.locator(scope).screenshot({path:resolve(output,'all-three-verdicts.jpg'),type:'jpeg',quality:90});report('verdicts-scoring-locks.json',{results,finalScore:2,rankingDoesNotChangePatternBonus:true,noDuplicateBonuses:true,noXP:true});
});

test('sparse saved puzzles and metadata survive edits and reload without initialization writes or stale cross-family overwrites',async({page})=>{
 const seeded={puzzles:{p1:{pick:'autosomal_recessive',ranking:['unaffected_carriers','skip_generations','no_sex_bias','present_in_homozygote'],revealed:true,note:'Keep family A reasoning.'},p2:{pick:'x_linked_recessive',ranking:[...families[1].ranking],revealed:false,note:'Keep family B reasoning.'}},score:1,learnerClaim:'A correct pattern can have a partial ranking.'};
 const initial=await setup(page,seeded);expect(await trace(page)).toEqual(seeded);await activate(page,move(page,'p2','mother_carrier','up'),'Space');
 const changed=await trace(page);expect(changed.puzzles.p1).toEqual(seeded.puzzles.p1);expect(changed.puzzles.p2.note).toBe(seeded.puzzles.p2.note);expect(changed.puzzles.p2.ranking).toEqual(['mother_carrier','male_bias','skip_via_daughters','no_male_to_male']);expect(changed.puzzles.p3).toBeUndefined();
 await page.evaluate(()=>{const a=document.querySelector<HTMLButtonElement>('[data-dna-trait-puzzle="p2"] [data-dna-trait-pattern="x_linked_recessive"]'),b=document.querySelector<HTMLButtonElement>('[data-dna-trait-puzzle="p3"] [data-dna-trait-pattern="autosomal_dominant"]');if(!a||!b)throw Error('Missing family choices');a.click();b.click();});
 await expect(choice(page,'p2','x_linked_recessive')).toHaveAttribute('aria-pressed','true');await expect(choice(page,'p3','autosomal_dominant')).toHaveAttribute('aria-pressed','true');const stored=await store(page);
 expect(stored.dna.traceTrait.puzzles.p2.ranking).toEqual(changed.puzzles.p2.ranking);expect(stored.dna.traceTrait.puzzles.p1).toEqual(seeded.puzzles.p1);expect(stored.dna.traceTrait.learnerClaim).toBe(seeded.learnerClaim);expect(stored.dna.traceTrait.score).toBe(1);await preserved(page,initial.baseline);
 await harness.destroy(page);const reloaded=await setup(page,undefined,stored);expect(await trace(page)).toEqual(stored.dna.traceTrait);await expect(page.locator('#dna-trait-p1-verdict')).toContainText(/2\s*\/\s*4/);await expect(page.locator('#dna-trait-p2-verdict')).toHaveText('');
 await activate(page,reveal(page,'p1'));expect((await trace(page)).score).toBe(1);await expect(reveal(page,'p1')).toBeFocused();await preserved(page,reloaded.baseline);expect(initial.errors).toEqual([]);expect(reloaded.errors).toEqual([]);
 report('saved-reload.json',{seeded,saved:stored.dna.traceTrait,sparseMissingPuzzleNotInitialized:true,rapidCrossFamilySelectionsPreserved:true,metadataRetained:true,reloadPreservesVerdicts:true});
});

test('Trace Trait alone reflows at 320px with text spacing, 44px targets and inset normal and forced-color focus',async({page})=>{
 await page.setViewportSize({width:320,height:900});const initial=await setup(page),root=page.locator(scope);
 await page.addStyleTag({content:'[data-dna-trace-trait], [data-dna-trace-trait] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-dna-trace-trait] p{margin-bottom:2em!important}'});
 const keyboard=choice(page,'p1','autosomal_recessive');await keyboard.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(keyboard).toBeFocused();const normal=await focusEvidence(keyboard);
 checkFocus(normal);expect(normal.shadow).toContain('inset');expect(normal.shadow).toContain('rgb(255, 255, 255)');await keyboard.screenshot({path:resolve(output,'mobile-normal-inset-focus.jpg'),type:'jpeg',quality:90});
 await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});const before=await trace(page),targets:any[]=[];
 for(const button of await root.locator('button').all()){await button.scrollIntoViewIfNeeded();await button.focus();const geometry=await button.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);return{text:n.textContent?.trim(),left:b.left,right:b.right,width:b.width,height:b.height,centerHits:!!hit&&(hit===n||n.contains(hit))};});
  expect(geometry.left).toBeGreaterThanOrEqual(-1);expect(geometry.right).toBeLessThanOrEqual(321);expect(geometry.width).toBeGreaterThanOrEqual(44);expect(geometry.height).toBeGreaterThanOrEqual(44);expect(geometry.centerHits).toBe(true);checkFocus(await focusEvidence(button));targets.push(geometry);}
 const layout=await root.evaluate((n:HTMLElement)=>{const b=n.getBoundingClientRect();return{left:b.left,right:b.right,client:n.clientWidth,scroll:n.scrollWidth,document:document.documentElement.scrollWidth,forced:matchMedia('(forced-colors: active)').matches};});
 expect(layout.left).toBeGreaterThanOrEqual(-1);expect(layout.right).toBeLessThanOrEqual(321);expect(layout.scroll).toBeLessThanOrEqual(layout.client+1);expect(layout.forced).toBe(true);
 for(const family of families){const panel=puzzle(page,family.id);await panel.screenshot({path:resolve(output,family.id+'-320px-forced-colors.jpg'),type:'jpeg',quality:90});}
 expect(await trace(page)).toEqual(before);await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);report('mobile-reflow-targets-focus.json',{scope:'Trace Trait only; unchanged reference navigation and other tools excluded.',textSpacing:{line:1.5,letter:'.12em',word:'.16em',paragraph:'2em'},normalFocus:normal,layout,targets});
});

test('scoped axe checks unanswered, moved, selected, correct and incorrect Trace Trait states',async({page})=>{
 const initial=await setup(page);await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const scans:any[]=[],glyphs:any[]=[];
 async function scan(name:string){const result=await page.locator(scope).evaluate(async root=>{const r=await(window as any).axe.run(root,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}),compact=(v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))});
  return{version:r.testEngine.version,violations:r.violations.map(compact),incomplete:r.incomplete.map(compact),passes:r.passes.map((v:any)=>v.id)};});scans.push({name,...result});
  glyphs.push({state:name,nodes:await moveGlyphContrast(page)});report('move-glyph-contrast.json',{method:'Actual computed text and opaque solid button background colors, with WCAG sRGB relative luminance; all up/down triangle buttons in each scanned state.',limitation:'This supplements axe nontext-glyph incompletes; it does not model glyph antialiasing or establish full WCAG conformance.',states:glyphs});
  report('scoped-axe.json',{scope:'Trace Trait family cases, pattern choices, ranking controls and verdicts.',limitation:'Scoped automation does not establish complete WCAG conformance. Incomplete rules remain visible for manual review. No screen-reader behavior was tested.',scans});}
 await scan('Unanswered');await activate(page,move(page,'p1','unaffected_carriers','up'));await scan('Moved ranking');await activate(page,choice(page,'p1','autosomal_recessive'),'Space');await scan('Selected pattern');await activate(page,reveal(page,'p1'));await scan('Correct pattern and partial ranking');
 await activate(page,choice(page,'p2','autosomal_dominant'));await activate(page,reveal(page,'p2'),'Space');await scan('Incorrect pattern and exact ranking');
 await puzzle(page,'p2').screenshot({path:resolve(output,'incorrect-pattern-exact-ranking.jpg'),type:'jpeg',quality:90});expect(scans.flatMap(s=>s.violations),JSON.stringify(scans.filter(s=>s.violations.length))).toEqual([]);
 for(const state of glyphs){expect(state.nodes).toHaveLength(24);for(const node of state.nodes){expect(node.limitations,state.state+': '+node.family+' '+node.explanation+' '+node.direction).toEqual([]);expect(node.backgroundAlpha).toBe(1);expect(node.ratio,state.state+': '+node.family+' '+node.explanation+' '+node.direction).toBeGreaterThanOrEqual(4.5);}}
 await preserved(page,initial.baseline);expect(initial.errors).toEqual([]);
});

async function focusEvidence(control:Locator){return control.evaluate((n:HTMLElement)=>{const s=getComputedStyle(n);return{visible:n.matches(':focus-visible'),width:parseFloat(s.outlineWidth),offset:parseFloat(s.outlineOffset),style:s.outlineStyle,color:s.outlineColor,shadow:s.boxShadow,forced:matchMedia('(forced-colors: active)').matches};});}
function checkFocus(value:Awaited<ReturnType<typeof focusEvidence>>){expect(value.visible).toBe(true);expect(value.width).toBeGreaterThanOrEqual(3);expect(value.offset).toBeLessThanOrEqual(-3);expect(value.style).not.toBe('none');}

async function moveGlyphContrast(page:Page){return page.locator(scope+' [data-dna-trait-move]').evaluateAll(nodes=>{
 type Color=[number,number,number,number];const parse=(s:string):Color|null=>{const parts=s.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);if(!parts||parts.length<3)return null;
  const channel=(v:string)=>v.endsWith('%')?parseFloat(v)*2.55:parseFloat(v);return[channel(parts[0]),channel(parts[1]),channel(parts[2]),parts[3]?parseFloat(parts[3])/(parts[3].endsWith('%')?100:1):1];};
 const luminance=(c:Color)=>{const channels=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];};
 return nodes.map(node=>{const css=getComputedStyle(node),foreground=parse(css.color),background=parse(css.backgroundColor),limitations:string[]=[];
  if(!foreground)limitations.push('Foreground is outside the RGB model.');if(!background||background[3]!==1)limitations.push('Button background is not an opaque RGB color.');if(css.backgroundImage!=='none')limitations.push('Button has a background image.');
  for(let ancestor:Element|null=node;ancestor;ancestor=ancestor.parentElement)if(Number(getComputedStyle(ancestor).opacity)!==1)limitations.push('Ancestor opacity needs visual review.');
  let ratio:number|null=null;if(foreground&&background&&background[3]===1){const composited=[...foreground.slice(0,3).map((v,i)=>v*foreground[3]+background[i]*(1-foreground[3])),1] as Color,a=luminance(composited),b=luminance(background);ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  return{family:node.closest('[data-dna-trait-puzzle]')?.getAttribute('data-dna-trait-puzzle'),explanation:node.closest('[data-dna-trait-explanation]')?.getAttribute('data-dna-trait-explanation'),direction:node.getAttribute('data-dna-trait-move'),glyph:node.textContent?.trim(),foreground:css.color,background:css.backgroundColor,backgroundAlpha:background?.[3]??null,ratio,limitations:[...new Set(limitations)]};});
 });}

import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output=resolve('reports/weldlab-wcag-workflows');
const harness=new GlHarness({toolId:'weldLab',toolFile:'stem_lab/stem_tool_weldlab.js',preScripts:['stem_lab/stem_lab_module.js','app_styles_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document'});
test.describe.configure({timeout:180_000,retries:0});
test.use({video:'off'});
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
async function mount(page:any,width:number,state:object,contrast=false,motion:'reduce'|'no-preference'='reduce'){
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:motion});
  await harness.mount(page,{weldLab:state},undefined,{expectCanvas:false});
    await page.evaluate(()=>{const host=document.createElement('div');host.id='wcag-host-styles';document.body.append(host);const w=window as any;w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles),host);});
  await page.addStyleTag({content:'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}'});
  await page.locator('#wrap').evaluate((el:HTMLElement)=>{el.style.width='100%';el.style.height='auto';el.style.display='block';});
  await page.waitForFunction(()=>Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width-innerWidth)<1);
  if(contrast)await page.evaluate(()=>{document.body.classList.add('theme-contrast');Object.assign((window as any).__ctx,{isContrast:true,theme:'contrast'});(window as any).__rerender();});
  await page.waitForTimeout(250);
}
async function enter(page:any,button:any){await button.focus();await page.keyboard.press('Enter');}
async function focusVisible(page:any,target:any){
  await expect(target).toBeFocused();
  const box=await target.boundingBox();expect(box).toBeTruthy();expect(box!.y).toBeLessThan(900);expect(box!.y+box!.height).toBeGreaterThan(0);
  const outline=await target.evaluate((el:HTMLElement)=>({width:parseFloat(getComputedStyle(el).outlineWidth),style:getComputedStyle(el).outlineStyle}));
  expect(outline.width).toBeGreaterThanOrEqual(2);expect(outline.style).not.toBe('none');
}
async function audit(page:any,name:string,screenshot?:string){
  await page.waitForTimeout(250);
  const result=await page.evaluate(async()=>{
    (window as any).axe.reset();const r=await (window as any).axe.run(document.getElementById('wrap'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
    return {overflow:document.documentElement.scrollWidth-innerWidth,violations:r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,html:n.html,summary:n.failureSummary}))})),incomplete:r.incomplete.map((v:any)=>({id:v.id,nodes:v.nodes.length}))};
  });writeFileSync(resolve(output,name+'.json'),JSON.stringify(result,null,2));
  if(screenshot)await page.locator(screenshot).screenshot({path:resolve(output,name+'.png')});
  expect(result.overflow).toBeLessThanOrEqual(1);expect(result.violations).toEqual([]);
}


test('Reference table keyboard discovery at 320px',async({page})=>{
 const rows:any[]=[];
 const fixtures=[
 {name:'heat-log',state:{view:'heatInput'},click:'📋 Log this setting'},
 {name:'bead-pin',state:{view:'beadLab',arc_pin:{V:22,A:180,TS:12,P:'mig',M:'steel',TH:.25,run:[]}}},
 {name:'process-matrix',state:{view:'processCompare'},open:'[data-proc-rating-reference]'},
 {name:'pathway-earnings',state:{view:'careerPaths',cp_view:'earnings',car2_pred:{a25:'apprentice',a35:'college',shown:true}}},
 {name:'haz-widths',state:{view:'metallurgy',met_sect:'haz',met2_hazPred:2}},
 {name:'preheat-matrix',state:{view:'metallurgy',met_sect:'ce',met2_ceFree:true}},
 {name:'qualification-matrix',state:{view:'qualPrep',qp_view:'matrix'}},
 {name:'robot-program',state:{view:'robotic',rob_sect:'pendant',tech2_rob_prog:[{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true}]}},
 {name:'inspection-report',state:{view:'inspection',insp_sect:'bench',insp2_bench:{uc1:{pick:'accept',recs:[6.25]}}}},
 {name:'roadmap-summary',state:{view:'maineEcosystem',me_mode:'roadmap',me_road_path:'ua_apprentice',car2_road:{d1:'stay',d2:'cwi'}}},
 {name:'eye-shades',state:{view:'safetyHealth',sh_sect:'eyes'}},
 ];
 for(const f of fixtures){
  await mount(page,320,f.state);if(f.click)await page.getByRole('button',{name:f.click,exact:true}).click();
  if(f.open)await page.locator(f.open).evaluate((el:HTMLDetailsElement)=>{el.open=true;});
  const result=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.getElementById('wrap'),{runOnly:{type:'rule',values:['scrollable-region-focusable']}});return {tables:[...document.querySelectorAll('.overflow-x-auto')].map((el:HTMLElement)=>({scroll:el.scrollWidth-el.clientWidth,tabIndex:el.tabIndex,caption:el.querySelector('caption')?.textContent||el.querySelector('thead')?.textContent?.slice(0,130),interactive:el.querySelectorAll('button:not(:disabled),input,select,a[href],[tabindex="0"]').length})),violations:r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,html:n.html}))}))};});
  if(process.env.WELDLAB_TABLE_PHASE==='final'){
    const region=page.locator('[data-weld-reference-scroll]').first();
    if(await region.count()){
      await expect(region).toHaveAttribute('tabindex','0');await expect(region).toHaveAccessibleName(/\S/);
      await region.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await focusVisible(page,region);
      await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate((el:HTMLElement)=>el.scrollLeft)).toBeGreaterThan(0);
      await audit(page,'table-'+f.name);
    }
  }
  rows.push({name:f.name,...result});console.log(f.name+': '+JSON.stringify(result));
 }
 writeFileSync(resolve(output,(process.env.WELDLAB_TABLE_PHASE||'before')+'-tables.json'),JSON.stringify(rows,null,2));
 if(process.env.WELDLAB_TABLE_PHASE==='final')expect(rows.flatMap(r=>r.violations)).toEqual([]);
});

for(const width of [1280,320]){
 test('PPE, code and joint exercises focus their next task at '+width+'px',async({page})=>{
  await mount(page,width,{view:'ppeSafety',ps_view:'scenarios',safe2_scIdx:0});
  await enter(page,page.getByRole('radiogroup',{name:'Response choices'}).getByRole('radio').first());
  await focusVisible(page,page.locator('[data-ppe-scenario-feedback]'));
  await enter(page,page.getByRole('button',{name:'Next scenario →',exact:true}));await focusVisible(page,page.locator('[data-ppe-scenario-heading]'));
  await audit(page,'ppe-next-'+width);
  await mount(page,width,{view:'codes',insp2_codesTab:'sort',insp2_sortIdx:0});
  await enter(page,page.getByRole('radiogroup',{name:'Sort this change'}).getByRole('radio').first());
  await enter(page,page.getByRole('button',{name:'Next ➡️',exact:true}));await focusVisible(page,page.locator('[data-codes-step-heading="sort"]'));
  await enter(page,page.getByRole('button',{name:'🔄 Reset sorter',exact:true}));await focusVisible(page,page.locator('[data-codes-step-heading="sort"]'));
  await audit(page,'codes-sort-'+width);
  await mount(page,width,{view:'codes',insp2_codesTab:'clause'});
  await enter(page,page.getByRole('radiogroup',{name:'Pick the clause'}).getByRole('radio').first());
  await enter(page,page.getByRole('button',{name:'Next task ➡️',exact:true}));await focusVisible(page,page.locator('[data-codes-step-heading="clause"]'));
  await audit(page,'codes-clause-'+width);
  await mount(page,width,{view:'jointCatalog',proc2_jqOn:true,proc2_jqSeed:7,proc2_jqIdx:9,proc2_jqAns:['butt','lap','tjoint','corner','edge','butt','lap','tjoint','corner']});
  await enter(page,page.getByRole('radiogroup',{name:'Joint type choices'}).getByRole('radio').first());
  await focusVisible(page,page.locator('[data-proc2="jq-feedback"]'));
  await enter(page,page.getByRole('button',{name:'See your results →',exact:true}));await focusVisible(page,page.locator('[data-joint-step-heading="results"]'));
  await audit(page,'joint-results-'+width,'[data-proc2="jq-end"]');
  await enter(page,page.getByRole('button',{name:'🔄 Retry Quiz',exact:true}));await focusVisible(page,page.locator('[data-joint-step-heading="question"]'));
  await enter(page,page.getByRole('button',{name:'← Back to Catalog',exact:true}));await focusVisible(page,page.locator('[data-joint-step-heading="catalog"]'));
 });
 test('Symbol practice and career preferences retain meaningful keyboard context at '+width+'px',async({page})=>{
  await mount(page,width,{view:'symbolsReader',sr_view:'practice',sym2_pr_idx:0});
  const groups=page.locator('#weld-symbols-panel [role="radiogroup"]');
  for(let i=0;i<3;i++){
    const group=groups.nth(i);await enter(page,group.getByRole('radio').first());
    await enter(page,group.locator('..').getByRole('button',{name:'Check answer',exact:true}));
    await focusVisible(page,page.locator('#sym2-pr-fb-0_'+i));
  }
  await enter(page,page.getByRole('button',{name:'Next challenge →',exact:true}));await focusVisible(page,page.locator('#sym2-pr-context'));
  await audit(page,'symbols-practice-'+width);
  await mount(page,width,{view:'symbolsReader',sr_view:'builder',sym2_b_idx:8});
  await enter(page,page.getByRole('button',{name:'Next work order →',exact:true}));await focusVisible(page,page.locator('#sym2-b-order'));
  await audit(page,'symbols-builder-'+width);
  await mount(page,width,{view:'careerStories',cs_mode:'fit'});
  for(const id of ['want','school','place']){
    const group=page.locator('[role="radiogroup"][aria-labelledby="story-fit-'+id+'"]'),radios=group.getByRole('radio');
    await radios.first().focus();await page.keyboard.press('End');await expect(radios.last()).toBeFocused();await expect(radios.last()).toHaveAttribute('aria-checked','true');
    await expect(group.locator('[role="radio"][tabindex="0"]')).toHaveCount(1);
    if(id!=='place'){
      await page.keyboard.press('Tab');const next=id==='want'?'school':'place';
      await expect(page.locator('[aria-labelledby="story-fit-'+next+'"] [role="radio"]').first()).toBeFocused();
    }
  }
  await expect(page.locator('[data-career-fit-status]')).not.toBeEmpty();
  await audit(page,'career-fit-'+width,'[data-weld-tabpanel="stories"]');
  await enter(page,page.getByRole('button',{name:'Read full profile →',exact:true}).first());await focusVisible(page,page.locator('#story-profile-title'));
  await enter(page,page.getByRole('button',{name:'Compare this profile',exact:false}));await focusVisible(page,page.locator('#car2-cmp-0'));
  await audit(page,'career-compare-'+width);
 });
 test('Underwater and Maine roadmap transitions preserve deliberate focus at '+width+'px',async({page})=>{
  await mount(page,width,{view:'underwater',uw_view:'pressure'});
  await enter(page,page.getByRole('radiogroup',{name:'Your prediction'}).getByRole('radio').first());
  await focusVisible(page,page.locator('[data-uw-depth-control] input[type="range"]'));
  await enter(page,page.getByRole('button',{name:'Predict again',exact:false}));await focusVisible(page,page.locator('[data-uw-prediction-prompt]'));
  await audit(page,'underwater-prediction-'+width);
  await mount(page,width,{view:'maineEcosystem',me_mode:'roadmap'});
  await enter(page,page.locator('[data-maine-start-path="ua_apprentice"]'));await focusVisible(page,page.locator('[data-maine-roadmap-heading]'));
  await enter(page,page.getByRole('button',{name:'← Pick a different path',exact:true}));await focusVisible(page,page.locator('[data-maine-roadmap-picker]'));
  await audit(page,'roadmap-picker-'+width);
  await mount(page,width,{view:'maineEcosystem',me_mode:'roadmap',me_road_path:'ua_apprentice',car2_road:{d1:'stay',d2:'cwi'}});
  await enter(page,page.getByRole('button',{name:'↺ Clear my two choices',exact:true}));await focusVisible(page,page.locator('[data-maine-decision-heading="d1"]'));
  await audit(page,'roadmap-reset-'+width);
 });
}

test('Clearing bead and robot evidence returns focus to retained controls',async({page})=>{
 await mount(page,320,{view:'beadLab',arc_pin:{V:22,A:180,TS:12,P:'mig',M:'steel',TH:.25,run:[]}});
 await enter(page,page.getByRole('button',{name:'Clear pin',exact:true}));await focusVisible(page,page.locator('[data-weld-bead-pin]'));
 await mount(page,320,{view:'robotic',rob_sect:'sorter'});
 await page.locator('[data-rob-job-note]').click();await enter(page,page.locator('[data-rob-job-clear-notes]'));
 await focusVisible(page,page.locator('[data-rob-job-note]'));await expect(page.locator('[data-rob-job-clear-notes]')).toBeDisabled();
 await audit(page,'evidence-clear-320');
});

test('High contrast preserves named table scrolling and focus',async({page})=>{
 await mount(page,320,{view:'processCompare'},true);await page.locator('[data-proc-rating-reference]').evaluate((el:HTMLDetailsElement)=>{el.open=true;});
 const region=page.locator('[data-weld-reference-scroll="process-matrix"]');await region.focus();await page.keyboard.press('ArrowRight');
 await expect.poll(()=>region.evaluate((el:HTMLElement)=>el.scrollLeft)).toBeGreaterThan(0);await focusVisible(page,region);
 expect(await page.locator('[data-weld-view] h1').evaluate((el:HTMLElement)=>getComputedStyle(el).color)).toBe('rgb(255, 255, 0)');
 await audit(page,'reference-contrast-320','[data-proc-rating-reference]');
 await mount(page,320,{view:'beadLab'},true);
 const setup=page.locator('.weldlab-setup');
 expect(await setup.evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');
 await setup.locator('summary').focus();await focusVisible(page,setup.locator('summary'));
 await audit(page,'bead-setup-contrast-320','.weldlab-setup');
});

import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output=resolve('reports/weldlab-wcag-practice');
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

for(const width of [1280,320]){
 test('Practice navigation follows new tasks and results at '+width+'px',async({page})=>{
  await mount(page,width,{view:'defectDiagnose',dd2Idx:-1});
  await enter(page,page.getByRole('button',{name:/Start: defect 1/}));await focusVisible(page,page.locator('[data-weld-practice-prompt="diagnose"]'));
  await enter(page,page.getByRole('radiogroup',{name:'Pick the root cause',exact:true}).getByRole('radio').first());
  await enter(page,page.getByRole('button',{name:'Submit diagnosis',exact:true}));
  await expect(page.locator('[aria-labelledby="dh2-dd-feedback-title"]')).toBeFocused();
  await enter(page,page.getByRole('button',{name:'➡️ Next defect',exact:true}));await focusVisible(page,page.locator('[data-weld-practice-prompt="diagnose"]'));
  await audit(page,'diagnose-navigation-'+width,'[data-weld-practice-prompt="diagnose"]');
  await mount(page,width,{view:'consumables',cons_mode:'scenarios'});
  await enter(page,page.getByRole('radiogroup',{name:'Consumable options'}).getByRole('radio').first());
  await enter(page,page.getByRole('button',{name:'Next scenario →',exact:true}));await focusVisible(page,page.locator('#weld-consumables-panel h3[tabindex="-1"]'));
  await audit(page,'consumables-navigation-'+width);
  await mount(page,width,{view:'mathBlueprint',mb_mode:'quiz',mb_q_idx:9,mb_q_picked:0,mb_q_score:4});
  await enter(page,page.getByRole('button',{name:'See results →',exact:true}));await focusVisible(page,page.locator('#sym2-mq-sum'));
  await enter(page,page.getByRole('button',{name:'↺ Restart quiz',exact:true}));await focusVisible(page,page.locator('#sym2-mq-question'));
  await page.keyboard.press('Tab');await expect(page.getByRole('radiogroup',{name:'Choose the meaning'}).getByRole('radio').first()).toBeFocused();
  await audit(page,'math-quiz-navigation-'+width);
  await mount(page,width,{view:'qualPrep',qp_view:'quiz',qp_ans:{0:0,1:1},qp_quizidx:0});
  await enter(page,page.getByRole('button',{name:'Next →',exact:true}));await focusVisible(page,page.locator('[data-qp-step-heading="run"]'));
  await enter(page,page.getByRole('button',{name:'📊 See results',exact:true}).first());await focusVisible(page,page.locator('[data-qp-step-heading="summary"]'));
  await audit(page,'qualification-results-'+width,'[data-qp-step-heading="summary"]');
  await mount(page,width,{view:'inspection',insp_sect:'ndt',insp2_ndtMode:'quiz'});
  await enter(page,page.getByRole('radiogroup',{name:'Pick the best NDT method'}).getByRole('radio').first());
  await enter(page,page.getByRole('button',{name:'Next case ➡️',exact:true}));await focusVisible(page,page.locator('[data-insp-step-heading="ndt"]'));
  await audit(page,'inspection-ndt-'+width);
 });
 test('All nine checked math fields expose context, errors and solutions at '+width+'px',async({page})=>{
  await mount(page,width,{view:'mathBlueprint',mb_mode:'practice',sym2_m_seed:12345,sym2_m_rounds:{}});
  const kinds=['frac2dec','frac2mm','mm2frac','tape','plateWeight','brace','square','filler','bid'];
  for(const kind of kinds){
    const card=page.locator('[data-sym2-math="'+kind+'"]'),input=card.locator('input[type="text"]');
    await expect(input).toHaveAccessibleName(/Your answer/);await input.fill('oops');await enter(page,card.getByRole('button',{name:'Check answer',exact:true}));
    await focusVisible(page,input);await expect(input).toHaveAttribute('aria-invalid','true');await expect(input).toHaveAccessibleDescription(/Type a number, a fraction/);
    await input.fill('-1');await enter(page,card.getByRole('button',{name:'Check answer',exact:true}));await focusVisible(page,card.locator('#sym2-m-fb-'+kind));
    await expect(input).not.toHaveAttribute('aria-invalid','true');await enter(page,card.getByRole('button',{name:'Show the worked solution',exact:true}));await focusVisible(page,card.locator('#sym2-m-solution-'+kind));
  }
  await audit(page,'math-checked-'+width,'[data-sym2-math="bid"]');
 });
 test('Removing observations and noise rows keeps keyboard focus useful at '+width+'px',async({page})=>{
  await mount(page,width,{view:'processSleuth',psIdx:0,psShown:[0],proc2_psClues:[1]});
  await enter(page,page.getByRole('button',{name:/Unmark observation 1:/}));await focusVisible(page,page.locator('[data-sleuth-hotspot="1"]'));
  await audit(page,'sleuth-unmark-'+width);
  await mount(page,width,{view:'safetyHealth',sh_sect:'noise',safe2_noise:[{db:100,h:1},{db:85,h:6},{db:75,h:2}]});
  await enter(page,page.getByRole('button',{name:'Remove task 3',exact:true}));await focusVisible(page,page.locator('[data-noise-editor-task="1"] select'));
  await expect(page.locator('[data-noise-editor-task="1"] select')).toHaveAccessibleName('Task 2: Typical task');
  await enter(page,page.getByRole('button',{name:'Remove task 1',exact:true}));await focusVisible(page,page.locator('[data-noise-editor-task="0"] select'));
  if(width===320){
    const table=page.locator('[data-noise-dose-table]');await table.focus();await page.keyboard.press('ArrowRight');
    await expect.poll(()=>table.evaluate((el:HTMLElement)=>el.scrollLeft)).toBeGreaterThan(0);
    await focusVisible(page,table);
  }
  await audit(page,'noise-remove-'+width);
 });
}

test('Active robot and pipe demonstrations respond to reduced-motion changes',async({page})=>{
 await mount(page,1280,{view:'robotic',rob_sect:'pendant',tech2_rob_prog:[{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true}]},false,'no-preference');
 await page.getByRole('button',{name:'▶ Run program',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByRole('button',{name:'▶ Run program',exact:true})).toBeEnabled();
 await expect(page.locator('[data-weld-view="robotic"]')).toContainText(/Weld complete|Program complete|too far|seam|missed/i);
 await audit(page,'robot-reduced-motion');
 await mount(page,1280,{view:'pipeWelding',pipe_sect:'updown'},false,'no-preference');
 await page.getByRole('button',{name:'▶ Play',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByRole('button',{name:'▶ Play',exact:true})).toBeVisible();
 await expect(page.locator('[data-weld-view="pipeWelding"]')).toContainText('100%');
 await audit(page,'pipe-reduced-motion');
});

test('Reduced-motion first-find celebration remains visible',async({page})=>{
 await mount(page,1280,{view:'defectHunt',dh_sampleIdx:0,defectCatalog:{}},false,'reduce');
 const surface=page.getByRole('application',{name:/Weld under inspection/});
 await surface.focus();
 // The initial reticle is .5/0; Home brings it to the start, then eleven .02 steps reach A1.
 await page.keyboard.press('Home');
 for(let i=0;i<11;i++)await page.keyboard.press('ArrowRight');
 await page.keyboard.press('Enter');
 await expect(page.getByRole('radiogroup',{name:'Classify the selected spot'})).toBeVisible();
 await page.getByRole('radiogroup',{name:'Classify the selected spot'}).getByRole('radio',{name:'Porosity',exact:true}).click();
 await page.getByRole('button',{name:'Confirm classification',exact:true}).click();
 const toast=page.locator('.weldlab-defect-celebration');await expect(toast).toBeVisible();
 expect(await toast.evaluate((el:HTMLElement)=>({opacity:getComputedStyle(el).opacity,animation:getComputedStyle(el).animationName}))).toEqual({opacity:'1',animation:'none'});
 await toast.screenshot({path:resolve(output,'reduced-motion-celebration.png')});
});

test('High-contrast practice keeps error and answer feedback readable at 320px',async({page})=>{
 await mount(page,320,{view:'mathBlueprint',mb_mode:'practice',sym2_m_seed:12345,sym2_m_rounds:{}},true);
 const card=page.locator('[data-sym2-math="frac2dec"]'),input=card.locator('input[type="text"]');
 expect(await input.evaluate((el:HTMLElement)=>getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');
 await input.fill('oops');await enter(page,card.getByRole('button',{name:'Check answer',exact:true}));
 await focusVisible(page,input);await audit(page,'math-error-contrast-320','[data-sym2-math="frac2dec"]');
 const answer=await page.evaluate(()=>{const c=(window as any).__WeldLabCore.sym2;return c.gen('frac2dec',c.mixSeed(12345,c.KINDS.indexOf('frac2dec'),0)).answer;});
 await input.fill(String(answer));await enter(page,card.getByRole('button',{name:'Check answer',exact:true}));
 await focusVisible(page,card.locator('#sym2-m-fb-frac2dec'));await audit(page,'math-answer-contrast-320','[data-sym2-math="frac2dec"]');
 await mount(page,320,{view:'consumables',cons_mode:'scenarios'},true);
 await enter(page,page.getByRole('radiogroup',{name:'Consumable options'}).getByRole('radio').first());
 await audit(page,'consumables-answer-contrast-320','#weld-consumables-panel');
});

import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

// Real React draft/inspection lifecycle; physical routes remain covered by
// the existing real-WebGL animal and ruler workflows.
const harness=new GlHarness({
  toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true,
  probes:'window.THREE=undefined;window.StemLab.ensureThree=function(){return Promise.reject(new Error("Renderer deferred for transactional fieldwork lifecycle"));};',
});
const reportDir=process.env.ECOLOGY_REPORT_DIR||'reports/ecosystem-refinement-next';
test.describe.configure({timeout:180_000,retries:0});
test.beforeAll(async()=>{await mkdir(reportDir,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>{
  expect(await page.evaluate(()=>(window as any).__events?.errors||[])).toEqual([]);
  expect(await harness.glContexts(page)).toEqual([]);
  await harness.destroy(page);
});
async function activity(page:Page){return page.evaluate(()=>(window as any).__toolData.ecosystem.foodWeb.fieldwork);}

test('same-task native toggles, inspections and sibling edits retain the latest fieldwork drafts through save, replacement and reopening',async({page})=>{
  await page.setViewportSize({width:1140,height:1050});
  await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Rabbit neighbors',exact:true}).click();
  const prediction='A rapid inspection must preserve my working explanation and source judgments.';
  await page.getByLabel('Your prediction (optional)',{exact:true}).fill(prediction);
  await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]');
  if(!(await meadow.isVisible()))await page.getByRole('button',{name:'Show 3D meadow',exact:true}).click();
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');
  const fixture=await page.evaluate(()=>{
    const w=window as any,api=w.StemLab.ecosystemFoodWeb,config=w.__toolData.ecosystem.foodWeb.run.config,pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),encounters=api.encounters(frames,config),encounter=encounters.find((row:any)=>row.kind==='spacing'),other=encounters.find((row:any)=>row.kind!=='spacing');
    if(!encounter||!other)throw new Error('The unchanged recording must supply spacing and another encounter.');
    const trial=api.inferenceTrial(frames,encounter,'baseline');
    return {encounter,other,trial,codes:api.inferenceClaims(trial).map((row:any)=>row.category),run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};
  });
  const fieldwork=meadow.locator('[data-efw-fieldwork]'),inference=fieldwork.locator('[data-efw-inference]'),ruler=fieldwork.locator('[data-efw-pair-lab]'),probe=fieldwork.locator('[data-efw-cue-probe]');
  await fieldwork.locator('[data-efw-encounter="spacing"]').click();
  await fieldwork.getByLabel('Wildlife prediction',{exact:true}).selectOption('avoid');
  await fieldwork.getByRole('button',{name:'Reveal encounter',exact:true}).click();
  await inference.locator('summary').press('Enter');
  await expect(inference.locator('[data-efw-inference-card]')).toHaveCount(4);
  await inference.locator('summary').press('Enter');
  await expect.poll(async()=>(await activity(page)).inference.open).toBe(false);
  const firstExplanation='The rabbit changed position beside a grazing neighbor; that does not show dominance.';
  const firstLimit='These recorded representatives do not establish an individual capture or a population effect.';
  await page.evaluate(({step,codes,explanation,limit})=>{
    const w=window as any,root=document.querySelector('[data-efw-fieldwork]')!;
    function toggle(selector:string){const el=root.querySelector(selector) as HTMLDetailsElement;if(!el)throw new Error(selector);el.open=true;el.dispatchEvent(new Event('toggle'));}
    function set(label:string,value:string){const el=root.querySelector('[aria-label="'+label+'"]') as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;if(!el)throw new Error(label);const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value')!.set!;setter.call(el,value);el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));}
    // Keep the original rendered closures alive for every real native event.
    // A readiness wait between these actions would conceal the regression.
    w.ReactDOM.unstable_batchedUpdates(()=>{
      toggle('[data-efw-pair-lab]');set('Pair measurement time',String(step));
      toggle('[data-efw-inference]');set('Evidence statement 1 source',codes[0]);set('Evidence statement 2 source',codes[1]);
      toggle('[data-efw-cue-probe]');set('Cue test variable','feeding');set('Cue test prediction','unsure');
      set('Wildlife explanation',explanation);set('Wildlife model limit',limit);
    });
  },{step:fixture.encounter.before,codes:fixture.codes,explanation:firstExplanation,limit:firstLimit});
  await expect.poll(async()=>activity(page)).toMatchObject({
    id:fixture.encounter.id,reflection:firstExplanation,limit:firstLimit,
    measurement:{open:true},inference:{open:true,codes:[fixture.codes[0],fixture.codes[1],'','']},
    probe:{open:true,variable:'feeding',prediction:'unsure'},
  });
  await expect(meadow.getByLabel('Meadow timeline',{exact:true})).toHaveValue(String(fixture.encounter.before));
  await expect(ruler).toHaveAttribute('open','');
  await expect(probe.getByLabel('Cue test variable',{exact:true})).toHaveValue('feeding');
  for(const k of [2,3])await inference.getByLabel('Evidence statement '+(k+1)+' source',{exact:true}).selectOption(fixture.codes[k]);
  await page.evaluate(()=>{
    const w=window as any,root=document.querySelector('[data-efw-inference]')!;
    w.ReactDOM.unstable_batchedUpdates(()=>{for(const button of root.querySelectorAll('button'))if(/^Inspect evidence checkpoint [123]$/.test(button.textContent||''))(button as HTMLButtonElement).click();});
  });
  await expect.poll(async()=>(await activity(page)).inference.visited.slice().sort((a:number,b:number)=>a-b)).toEqual([fixture.trial.before,fixture.trial.step,fixture.trial.after]);
  await expect(inference.getByRole('button',{name:'Check evidence sources',exact:true})).toBeEnabled();
  await inference.getByRole('button',{name:'Check evidence sources',exact:true}).press('Enter');
  await expect(inference.locator('[data-efw-inference-feedback]')).toBeVisible();
  const first=JSON.stringify((await activity(page)).inference.firstCodes),revised=fixture.codes.slice();
  revised[1]=revised[1]==='unsupported'?'scene':'unsupported';
  const revision='I revised one source judgment after inspecting all three original checkpoints.';
  const latestExplanation='My newest explanation remains attached while I return to the pair measurement.';
  await page.evaluate(({step,value,revision,explanation})=>{
    const w=window as any,root=document.querySelector('[data-efw-fieldwork]')!;
    function set(label:string,value:string){const el=root.querySelector('[aria-label="'+label+'"]') as HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;if(!el)throw new Error(label);Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value')!.set!.call(el,value);el.dispatchEvent(new Event(el instanceof HTMLSelectElement?'change':'input',{bubbles:true}));}
    w.ReactDOM.unstable_batchedUpdates(()=>{
      set('Evidence and inference reflection',revision);
      set('Evidence statement 2 source',value);
      set('Pair measurement time',String(step));
      set('Wildlife explanation',explanation);
    });
  },{step:fixture.encounter.after,value:revised[1],revision,explanation:latestExplanation});
  await expect.poll(async()=>activity(page)).toMatchObject({reflection:latestExplanation,limit:firstLimit,measurement:{open:true},inference:{open:true,codes:revised,checked:false,reflection:revision},probe:{open:true,variable:'feeding',prediction:'unsure'}});
  expect(JSON.stringify((await activity(page)).inference.firstCodes)).toBe(first);
  const save=fieldwork.getByRole('button',{name:'Save wildlife observation',exact:true});
  await expect(save).toBeDisabled();
  await inference.getByRole('button',{name:'Check revised evidence sources',exact:true}).press('Enter');
  await expect(save).toBeEnabled();
  await save.press('Enter');
  const saved=await page.evaluate(()=>(window as any).__toolData.ecosystem.foodWeb.notebook[0]),frozen=JSON.stringify(saved);
  expect(saved.explanation).toBe(latestExplanation);
  expect(saved.sighting).toMatchObject({kind:'spacing',branch:'baseline',limitation:firstLimit,inference:{codes:revised,firstCodes:fixture.codes,reflection:revision}});
  expect(saved.sighting).not.toHaveProperty('probe');
  expect(saved.sighting).not.toHaveProperty('measurement');
  await fieldwork.getByRole('button',{name:'Leave fieldwork',exact:true}).press('Enter');
  await expect.poll(()=>activity(page)).toBeNull();
  await page.getByRole('button',{name:'Reopen observation 1',exact:true}).press('Enter');
  await expect.poll(async()=>activity(page)).toMatchObject({id:fixture.encounter.id,revealed:true,reflection:latestExplanation,limit:firstLimit,saved:true,inference:{open:true,codes:revised,firstCodes:fixture.codes,reflection:revision,checked:true}});
  const reopened=await activity(page);expect(reopened.measurement).toBeUndefined();expect(reopened.probe).toBeUndefined();
  await fieldwork.locator('[data-efw-encounter="'+fixture.other.kind+'"]').click();
  await expect.poll(async()=>activity(page)).toEqual({key:JSON.stringify(saved.config)+'|baseline',id:fixture.other.id,forecast:'',revealed:false,reflection:'',limit:'',saved:false});
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('experiment');
  await expect.poll(()=>activity(page)).toBeNull();
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(frozen);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(fixture.run);
  await writeFile(reportDir+'/fieldwork-transactions.json',JSON.stringify({sameTaskTogglesAndInspection:true,siblingCodesPreserved:true,firstCodes:fixture.codes,latestCodes:revised,latestExplanation,revision,rulerAndProbeOpenPreserved:true,normalSaveAndReopen:true,explicitSelectionAndBranchReplacement:true,savedNoteUnchanged:true,runUnchanged:true},null,2)+'\n');
});

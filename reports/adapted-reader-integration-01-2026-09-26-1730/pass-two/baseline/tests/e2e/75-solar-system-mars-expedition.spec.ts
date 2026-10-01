import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const probes="const originalAdd=THREE.Scene.prototype.add;THREE.Scene.prototype.add=function(...objects){if(objects.some(o=>o.name==='drone-survey-pulse'))window.__missionScene=this;return originalAdd.apply(this,objects);};";
const wide=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:950,appStyles:true,probes});
const phone=new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:320,height:850,appStyles:true});
test.beforeAll(async()=>{await wide.start();await phone.start();});
test.afterAll(async()=>{await wide.stop();await phone.stop();});
test.afterEach(async({page})=>wide.destroy(page));
test.describe.configure({timeout:240000});test.use({video:'off',trace:'off'});
for(const compact of [false,true])test('connected Mars expedition on '+(compact?'phone':'desktop'),async({page},info)=>{
 await page.setViewportSize({width:compact?320:1180,height:compact?850:950});
 await page.emulateMedia({reducedMotion:compact?'reduce':'no-preference'});
 const harness=compact?phone:wide;
 await harness.mount(page,{solarSystem:{tutorialDismissed:true,orreryMode:true,orr_tab:5,orr_trf:'earth',orr_trt:'mars',orr_paused:true}},undefined,{expectCanvas:false});
 const mission=page.getByRole('region',{name:'Earth-to-Mars mission',exact:true});
 await page.getByRole('button',{name:'Start Earth-to-Mars mission',exact:true}).click();
 const record=page.getByRole('button',{name:'Record arrival for Mars mission',exact:true});
 await expect(record).toBeDisabled();
 await page.getByLabel('Predict: if Mars starts',{exact:false}).selectOption('meet');
 await mission.getByRole('button',{name:'Open Earth-to-Mars planner',exact:true}).click();
 await expect(page.locator('[data-transfer-flight] canvas')).toBeFocused();
 await expect(record).toBeDisabled();
 await page.getByRole('button',{name:'Show transfer arrival',exact:true}).click();
 await record.evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
 await expect(page.locator('[data-mars-transfer-task]')).toContainText('1/2 mission trials recorded');
 await expect(page.getByLabel('Predict: if Mars starts',{exact:false})).toBeDisabled();
 await page.getByLabel('Launch alignment offset:',{exact:false}).fill('30');await record.click();
 await expect(page.locator('[data-mars-transfer-task]')).toContainText('2/2 mission trials recorded');
 await expect(mission).toContainText('0.789 AU separation');
 await expect(mission).toContainText('Revise your launch prediction');
 await expect(mission.locator('[data-mars-step="2"]')).toHaveAttribute('data-complete','false');
 await expect(mission.getByRole('button',{name:'Deploy Mars rover',exact:true})).toBeDisabled();
 await page.getByLabel('Before surface work:',{exact:false}).fill('A scan can estimate conditions; a sample may reveal modeled minerals.');
 const bounds=await mission.evaluate(el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,overflow:el.scrollWidth>el.clientWidth+1};});
 expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(compact?320:1180);expect(bounds.overflow).toBe(false);
 await mission.screenshot({path:info.outputPath(compact?'mars-mission-phone.png':'mars-mission-desktop.png')});
 if(!compact){
  await mission.getByRole('button',{name:'Deploy Mars rover',exact:true}).click();
  const canvas=page.locator('[data-drone-canvas]');await expect(canvas).toBeVisible({timeout:60000});await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
  await canvas.press('g');
  await expect.poll(()=>page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries||[]).filter((e:any)=>e.kind==='Scan').length)).toBe(1);
  // The environment scan may have selected a different authored contact.
  // Clear it before placing the specimen used by this collection fixture.
  await page.getByRole('button',{name:'Clear target',exact:true}).evaluate((button:HTMLButtonElement)=>{if(!button.disabled)button.click();});
  await page.evaluate(()=>{const w=window as any,scene=w.__missionScene,v=scene.getObjectByName('exploration-vehicle');const orbs=scene.children.filter((o:any)=>o._sampleData&&!o._collected);orbs.forEach((o:any,i:number)=>o.position.set(v.position.x+90+i,v.position.y+0.6,v.position.z+90));orbs[0].position.copy(v.position).add(new w.THREE.Vector3(0.65,0.6,-0.4));});
  const station=page.getByRole('region',{name:'Sampling station',exact:true});
  await station.getByRole('button',{name:'Collect sample',exact:true}).click();
  await expect(station).toHaveAttribute('data-drone-sampling','sealed',{timeout:90000});
  await expect(mission.locator('[data-mars-step="2"]')).toHaveAttribute('data-complete','true');
  const save=mission.getByRole('button',{name:'Save Mars mission report',exact:true});await expect(save).toBeDisabled();
  await page.getByLabel('Explain using a transfer result',{exact:false}).fill('Changing alignment caused a 0.789 AU miss. My scan and sample describe simulated Mars conditions; this model cannot prove real mineral composition.');
  await save.evaluate((b:HTMLButtonElement)=>{b.click();b.click();});
  await expect(mission).toContainText('Mission complete');
  const reports=await page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries||[]).filter((e:any)=>e.missionId==='earth-mars'));
  expect(reports).toHaveLength(1);expect(reports[0].expedition.scan.observation.length).toBeGreaterThan(10);expect(reports[0].expedition.sample.observation.length).toBeGreaterThan(10);
  expect(reports[0].expedition.trials.offset.separation).toBeCloseTo(0.789,3);
  // The long-lived drone scene must append to the current journal after saving the report.
  await canvas.scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Find samples',exact:true})).toBeEnabled({timeout:10000});await canvas.press('g');
  await expect.poll(()=>page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries||[]).filter((e:any)=>e.kind==='Scan').length)).toBe(2);
  expect(await page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries||[]).filter((e:any)=>e.missionId==='earth-mars').length)).toBe(1);
 }
 await mission.getByRole('button',{name:'Hide mission',exact:true}).click();
 await page.getByRole('button',{name:'Open mission dashboard',exact:true}).click();
 await page.locator('[data-solar-journey="mars"]').click();
 await page.locator('[data-journey-continue]').click();
 await expect(mission.locator('[data-mars-step="1"]')).toHaveAttribute('data-complete','true');
 const persisted=await page.evaluate(()=>(window as any).__toolData);
 await harness.destroy(page);
 // Restore in the lightweight planner; mission evidence is stored with the tool data.
 persisted.solarSystem.orreryMode=true;persisted.solarSystem.orr_tab=5;
 await harness.mount(page,persisted,undefined,{expectCanvas:false});
 await expect(mission.locator('[data-mars-step="1"]')).toHaveAttribute('data-complete','true');
 if(!compact){await expect(mission).toContainText('Mission complete');await mission.getByRole('button',{name:'Open mission journal',exact:true}).click();await expect(page.getByText('Earth-to-Mars expedition',{exact:true})).toBeVisible();}
 expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
});

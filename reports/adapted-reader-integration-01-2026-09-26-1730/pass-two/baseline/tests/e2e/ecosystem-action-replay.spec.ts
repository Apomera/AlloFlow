import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_ecosystem.js',toolId:'ecosystem',width:1100,height:900,appStyles:true});
test.beforeAll(async()=>harness.start());test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function setup(page:any){
  await page.setViewportSize({width:1140,height:1050});await harness.mount(page,{ecosystem:{tab:'foodweb',tutorialDismissed:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block;padding:16px;background:white';});
  await page.getByRole('button',{name:'Insect food shortage',exact:true}).click();await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();
  const meadow=page.locator('[data-efw-meadow]'),panel=meadow.getByRole('group',{name:'Behavior moments',exact:true}),timeline=meadow.getByLabel('Meadow timeline',{exact:true});
  await meadow.getByRole('button',{name:/Red foxes\s/}).click();await meadow.getByRole('button',{name:'Inspect selected group',exact:true}).click();await timeline.fill('0');
  return {meadow,panel,timeline,replay:panel.getByRole('button',{name:'Replay this behavior',exact:true}),pause:panel.getByRole('button',{name:'Pause behavior replay',exact:true})};
}
test('action replay stops exactly, pauses, restarts and cancels on navigation without changing the saved run',async({page})=>{
  const {meadow,panel,timeline,replay,pause}=await setup(page);
  const data=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,m=a.behaviorMoments(a.behaviorTimeline(c,a.compare(c).experiment),'foxes',0);return {short:m.find((x:any)=>x.active&&x.end-x.start>=2&&x.end-x.start<=6&&x.end<239),long:m.find((x:any)=>x.active&&x.end-x.start>=15),run:JSON.stringify(w.__toolData.ecosystem.foodWeb.run)};});
  expect(data.short).toBeTruthy();expect(data.long).toBeTruthy();
  await timeline.fill(String(data.short.end));await replay.click();
  await expect(panel.locator('[data-efw-replay-status]')).toContainText('Replay finished');await expect(timeline).toHaveValue(String(data.short.end));await page.waitForTimeout(300);await expect(timeline).toHaveValue(String(data.short.end));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-behavior',data.short.state);
  await panel.screenshot({path:'reports/ecosystem-action-replay/desktop-controls.jpg',type:'jpeg',quality:90});
  await meadow.getByRole('button',{name:'Play meadow timeline',exact:true}).click();await expect.poll(async()=>Number(await timeline.inputValue())).toBeGreaterThan(data.short.end);await meadow.getByRole('button',{name:'Pause meadow timeline',exact:true}).click();
  await timeline.fill(String(data.long.end));await replay.click();await pause.click();const stopped=await timeline.inputValue();await expect(panel.locator('[data-efw-replay-status]')).toContainText('Replay paused');await page.waitForTimeout(300);await expect(timeline).toHaveValue(stopped);
  await replay.click();await expect.poll(async()=>Number(await timeline.inputValue())).toBeLessThan(data.long.end);await timeline.fill('90');await page.waitForTimeout(300);await expect(timeline).toHaveValue('90');await expect(pause).toHaveCount(0);await expect(panel.locator('[data-efw-replay-status]')).toHaveCount(0);
  await timeline.fill(String(data.long.start));await replay.click();await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('baseline');const branchStopped=await timeline.inputValue();await page.waitForTimeout(300);await expect(timeline).toHaveValue(branchStopped);await expect(pause).toHaveCount(0);
  await meadow.getByLabel('Meadow scene data',{exact:true}).selectOption('experiment');await timeline.fill(String(data.long.start));await replay.click();await meadow.getByLabel('Representative animal',{exact:true}).selectOption('1');const animalStopped=await timeline.inputValue();await page.waitForTimeout(300);await expect(timeline).toHaveValue(animalStopped);await expect(pause).toHaveCount(0);
  await meadow.getByLabel('Representative animal',{exact:true}).selectOption('0');await timeline.fill(String(data.long.start));await replay.click();await page.emulateMedia({reducedMotion:'reduce'});await expect(replay).toBeDisabled();const reducedStopped=await timeline.inputValue();await page.waitForTimeout(300);await expect(timeline).toHaveValue(reducedStopped);await expect(replay).toBeDisabled();await expect(panel.locator('[data-efw-replay-help]')).toContainText('reduced motion');
  await panel.getByLabel('Jump to behavior',{exact:true}).selectOption('1');await expect(meadow.locator('canvas')).toHaveAttribute('data-behavior','Starting pose');
  await page.setViewportSize({width:390,height:844});await panel.screenshot({path:'reports/ecosystem-action-replay/mobile-controls.jpg',type:'jpeg',quality:90});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(data.run);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
test('single-sample actions finish as stills and absent groups cannot replay',async({page})=>{
  const {meadow,panel,timeline,replay}=await setup(page);
  const single=await page.evaluate(()=>{const w=window as any,a=w.StemLab.ecosystemFoodWeb,c=w.__toolData.ecosystem.foodWeb.run.config,frames=a.behaviorTimeline(c,a.compare(c).experiment);for(const id of ['foxes','rabbits','voles','owls','caterpillars','bluetits']){const m=a.behaviorMoments(frames,id,0).find((x:any)=>x.active&&x.start===x.end);if(m)return {id,...m};}return null;});expect(single).toBeTruthy();
  const names:any={foxes:/Red foxes\s/,rabbits:/Rabbits\s/,voles:/Voles\s/,owls:/Owls\s/,caterpillars:/Caterpillars\s/,bluetits:/Blue tits\s/};
  await meadow.getByRole('button',{name:names[single.id]}).click();await timeline.fill(String(single.start));await replay.click();await expect(panel.locator('[data-efw-replay-status]')).toContainText('Replay finished');await page.waitForTimeout(300);await expect(timeline).toHaveValue(String(single.end));await expect(meadow.getByRole('button',{name:'Play meadow timeline',exact:true})).toBeVisible();
  await meadow.getByRole('button',{name:/Red foxes\s/}).click();await page.getByLabel('Disturbance',{exact:true}).selectOption('remove');await page.getByLabel('Affected group',{exact:true}).selectOption('foxes');await page.getByRole('button',{name:'Run food-web comparison',exact:true}).click();await expect(replay).toBeDisabled();await expect(panel.locator('[data-efw-replay-help]')).toContainText('No representative');expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

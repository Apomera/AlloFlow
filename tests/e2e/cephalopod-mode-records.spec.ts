import {test,expect,Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
import {useCephalopodAudioFallback} from './helpers/cephalopod_audio';
import {clickCephalopodControl} from './helpers/cephalopod_controls';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:1100,height:1000,layout:'document'});
const key='allo.cephalopodlab.leaderboard.v2',oldKey='allo.cephalopodlab.leaderboard.v1';
const rec=(score:number,time:number,dives=1)=>({bestScore:score,bestSurvivalMs:time,bestCamoEff:.5,totalDives:dives,totalCatches:2});
const seed={version:2,byMode:{reefMission:{commonOcto:rec(7,9000)},free:{commonOcto:rec(99,660000),humboldtSquid:rec(12,15000)},observe:{commonOcto:rec(0,1000)}}};
const legacy=JSON.stringify({commonOcto:rec(80,900000,6)});
const errors=new WeakMap<Page,string[]>();
test.describe.configure({timeout:150000,retries:0});
test.use({trace:'off',video:'off'});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());
test.beforeEach(async({page})=>{const found:string[]=[];errors.set(page,found);page.on('pageerror',e=>found.push(e.message));await useCephalopodAudioFallback(page);});
test.afterEach(async({page})=>{await harness.destroy(page);expect(errors.get(page)).toEqual([]);});
async function launch(page:Page,mode='observe'){
  await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:false,huntSpeciesId:'commonOcto',huntMode:mode,huntSeed:2741,huntQuality:'low',_threeLoaded:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';});
}
async function seedRecords(page:Page){
  await page.evaluate(({key,oldKey,seed,legacy})=>{localStorage.setItem(key,JSON.stringify(seed));localStorage.setItem(oldKey,legacy);},{key,oldKey,seed,legacy});
  // A real selection change asks React to reread the saved book.
  await page.getByLabel('Dive mode',{exact:true}).selectOption('free');
  await page.getByLabel('Dive mode',{exact:true}).selectOption('observe');
}

test('a real Field study meal saves only its mode and remains distinct after reload',async({page},info)=>{
  await launch(page);await seedRecords(page);
  const best=page.locator('[data-cl-best-species=commonOcto]');
  await expect(best).toHaveAttribute('data-cl-best-mode','observe');await expect(best).toContainText('0 best score');await expect(best).toContainText('longest study');
  await expect(page.locator('[data-cl-legacy-best=commonOcto]')).toContainText('80 best score');
  await page.getByLabel('Dive mode',{exact:true}).selectOption('reefMission');await expect(best).toContainText('7 best score');
  await expect(page.locator('[data-cl-best-species=humboldtSquid]')).toHaveAttribute('data-cl-best-mode','free');await expect(page.locator('[data-cl-best-species=humboldtSquid]')).toContainText('12 best score');
  await page.getByLabel('Dive mode',{exact:true}).selectOption('observe');
  await page.getByRole('button',{name:'Start field study · Common Octopus',exact:true}).click();
  await expect.poll(async()=>(await harness.glScene(page,'.cl-hunt-stage'))?.draws||0).toBeGreaterThan(0);
  // Keep the native hunting/scoring path; only place a real seeded crab within reach.
  await page.evaluate(()=>{
    const w=window as any,scene=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1).scene,player=scene.getObjectByName('cl-player');
    const crabs=scene.children.filter((o:any)=>o.userData.alive&&o.userData.cfg);if(!crabs.length)throw Error('Expected seeded prey');
    crabs.forEach((o:any)=>{o.position.set(70,.18,70);o.userData.speed=0;});crabs[0].position.copy(player.position);
  });
  await page.locator('canvas[role=application]').focus();await page.keyboard.press('KeyT');await page.keyboard.press('KeyE');
  await expect.poll(async()=>Number(await page.locator('[data-hud=score]').textContent())).toBeGreaterThan(0);
  const caughtScore=Number(await page.locator('[data-hud=score]').textContent());
  await page.getByRole('button',{name:/End run \+ surface/}).click();
  const debrief=page.getByRole('dialog',{name:'End of dive',exact:true});
  await expect(debrief).toBeVisible();await expect(debrief).toContainText('Field study recorded');
  await expect(debrief).toContainText('New best score · Field study');await expect(debrief).toContainText('Modeled energy use');
  await expect(debrief.getByRole('heading',{name:'End of dive'})).toBeFocused();
  expect(await debrief.evaluate(el=>el.scrollTop)).toBe(0);
  await debrief.screenshot({path:info.outputPath('field-study-debrief.png')});
  await page.keyboard.press('Shift+Tab');await expect(debrief.getByRole('button',{name:/Pick different species/})).toBeFocused();
  await page.keyboard.press('Tab');await expect(debrief.getByRole('button',{name:/Dive again as/})).toBeFocused();
  await debrief.getByRole('button',{name:/Pick different species/}).click();
  await expect(page.getByRole('button',{name:'Start field study · Common Octopus',exact:true})).toBeVisible();
  await expect(page.getByLabel('Dive species',{exact:true})).toBeFocused();
  const saved=await page.evaluate(({key,oldKey})=>({book:JSON.parse(localStorage.getItem(key)!),legacy:localStorage.getItem(oldKey),run:JSON.parse(localStorage.getItem('allo.cephalopodlab.lastRun.v2')!)}),{key,oldKey});
  expect(saved.book.byMode.free).toEqual(seed.byMode.free);expect(saved.book.byMode.reefMission).toEqual(seed.byMode.reefMission);expect(saved.legacy).toBe(legacy);
  expect(saved.book.byMode.observe.commonOcto.bestScore).toBe(caughtScore);expect(saved.book.byMode.observe.commonOcto.totalDives).toBe(2);expect(saved.book.byMode.observe.commonOcto.totalCatches).toBe(3);expect(saved.run.mode).toBe('observe');expect(saved.run.stats.crabs).toBe(1);
  await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await launch(page);await expect(best).toContainText(caughtScore+' best score');await expect(best).toContainText('2 dives');
  await best.locator('..').screenshot({path:info.outputPath('field-study-record.png')});
  await page.getByLabel('Dive mode',{exact:true}).selectOption('free');await expect(best).toContainText('99 best score');await expect(best).toContainText('660s longest dive');
});

test('ending from help closes the guide and Escape leaves the saved review once',async({page})=>{
  await launch(page);await seedRecords(page);
  await page.getByRole('button',{name:'Start field study · Common Octopus',exact:true}).click();
  await expect.poll(async()=>(await harness.glScene(page,'.cl-hunt-stage'))?.draws||0).toBeGreaterThan(0);
  await clickCephalopodControl(page,'Help / settings');
  const help=page.getByRole('dialog',{name:'Dive controls',exact:true});
  await help.getByRole('button',{name:'End run',exact:true}).click();
  await expect(help).toBeHidden();
  const debrief=page.getByRole('dialog',{name:'End of dive',exact:true});await expect(debrief).toBeVisible();
  await expect(debrief.getByRole('heading',{name:'End of dive'})).toBeFocused();
  await page.keyboard.press('Escape');await expect(debrief).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Start field study · Common Octopus',exact:true})).toBeVisible();
  await expect(page.getByLabel('Dive species',{exact:true})).toBeFocused();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).byMode.observe.commonOcto.totalDives,key)).toBe(2);
  await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

for(const width of [390,320])test(`mode labels and preserved older records fit ${width}px`,async({page},info)=>{
  await page.setViewportSize({width,height:900});await launch(page);await seedRecords(page);
  await page.getByLabel('Dive mode',{exact:true}).selectOption('reefMission');
  const best=page.locator('[data-cl-best-species=commonOcto]');await expect(best).toHaveAttribute('data-cl-best-mode','reefMission');
  const blocks=await page.locator('[data-cl-best-species], [data-cl-legacy-best]').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {left:b.left,right:b.right,width:node.clientWidth,scroll:node.scrollWidth};}));
  for(const b of blocks){expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(width+1);expect(b.scroll).toBeLessThanOrEqual(b.width+1);}
  await best.locator('..').screenshot({path:info.outputPath(`mode-records-${width}.png`)});
});

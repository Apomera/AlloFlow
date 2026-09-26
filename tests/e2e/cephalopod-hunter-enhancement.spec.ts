import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({toolFile:'stem_lab/stem_tool_cephalopodlab.js',toolId:'cephalopodLab',width:900,height:1000,layout:'document'});
const sel='canvas[role=application]';
async function mount(page:Page,species='commonOcto',mode='free'){
  await harness.mount(page,{cephalopodLab:{activeSection:'hunt',hunt3DActive:true,huntSpeciesId:species,huntMode:mode,huntSeed:2741,huntQuality:'low',_threeLoaded:true}});
  await page.evaluate(()=>{const w=window as any;w.__scene=w.__glRecorder.records.filter((r:any)=>r.scene&&r.canvas.isConnected).at(-1).scene;w.__player=w.__scene.getObjectByName('cl-player');});
}
const player=(page:Page)=>page.evaluate(()=>(window as any).__player.position.toArray());
async function hold(page:Page,key:string,ms:number){await page.locator(sel).focus();await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
async function placeCrab(page:Page){await page.evaluate(()=>{const w=window as any;const c=w.__scene.children.find((o:any)=>o.userData.alive&&o.userData.cfg);c.position.copy(w.__player.position);c.userData.speed=0;});}
test.describe.configure({timeout:120000});
test.beforeAll(()=>harness.start());test.afterAll(()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
test('pause freezes dive time and energy; losing canvas focus releases held movement',async({page})=>{
  await mount(page);await hold(page,'KeyW',400);
  await page.locator(sel).focus();await page.keyboard.press('Escape');
  const time=await page.locator('[data-hud=time]').innerText(),energy=await page.locator('[data-hud=energy]').innerText();
  const phase=await page.locator('[data-hud=phase]').innerText();await page.waitForTimeout(1500);
  expect(await page.locator('[data-hud=time]').innerText()).toBe(time);expect(await page.locator('[data-hud=energy]').innerText()).toBe(energy);expect(await page.locator('[data-hud=phase]').innerText()).toBe(phase);
  await page.keyboard.press('Escape');await page.keyboard.down('KeyW');await page.waitForTimeout(250);
  await page.locator('input[type=search]').focus();await page.keyboard.up('KeyW');const before=await player(page);await page.waitForTimeout(500);const after=await player(page);
  expect(after[0]).toBeCloseTo(before[0],5);expect(after[2]).toBeCloseTo(before[2],5);
});
test('the seabed is solid and the home den only protects at its actual height',async({page})=>{
  await mount(page);await hold(page,'KeyZ',600);expect((await player(page))[1]).toBeGreaterThan(0.35);
  await page.evaluate(()=>{const w=window as any,h=w.__scene.getObjectByName('cl-home');w.__player.position.x=h.position.x;w.__player.position.z=h.position.z;});
  await expect(page.locator('[data-hud=status]')).toContainText('IN DEN');await hold(page,'KeyQ',1300);
  await expect(page.locator('[data-hud=status]')).not.toContainText('IN DEN');expect((await player(page))[1]).toBeGreaterThan(2);
});
test('target selection never catches a different nearby animal, and repeated catches persist',async({page})=>{
  await mount(page);await placeCrab(page);await page.locator(sel).focus();await page.keyboard.press('KeyT');
  await page.evaluate(()=>{const w=window as any,all=w.__scene.children.filter((o:any)=>o.userData.alive&&o.userData.cfg);all[0].position.set(18,0.18,18);all[1].position.copy(w.__player.position);all[1].userData.speed=0;});
  await page.keyboard.press('KeyE');await page.waitForTimeout(200);expect(await page.locator('[data-hud=score]').innerText()).toBe('0');
  await page.keyboard.press('KeyT');await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.cephalopodLab.huntsSuccessful)).toBe(1);
  await placeCrab(page);await page.keyboard.press('KeyT');await page.keyboard.press('KeyE');await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.cephalopodLab.huntsSuccessful)).toBe(2);
});
test('reef mission requires both foods and a return home, then writes one debrief',async({page})=>{
  await mount(page,'commonOcto','reefMission');await placeCrab(page);await page.locator(sel).focus();await page.keyboard.press('KeyE');await expect(page.locator('.cl-hunt-mission')).toContainText('Open a clam');
  await page.evaluate(()=>{const w=window as any,c=w.__scene.getObjectByName('cl-mission-clam');c.position.x=w.__player.position.x;c.position.z=w.__player.position.z;});
  await page.locator(sel).focus();await page.keyboard.down('KeyE');await expect(page.locator('.cl-hunt-mission')).toContainText('Both meals collected');await page.keyboard.up('KeyE');
  await page.evaluate(()=>{const w=window as any,h=w.__scene.getObjectByName('cl-home');w.__player.position.x=h.position.x;w.__player.position.z=h.position.z;});
  await expect(page.getByText('Mission complete',{exact:true})).toBeVisible();
  const summary=await page.evaluate(()=>JSON.parse(localStorage.getItem('allo.cephalopodlab.lastRun.v2')!));expect(summary.reason).toBe('mission');expect(summary.stats.crabs).toBe(1);expect(summary.stats.clams).toBe(1);expect(summary.missionComplete).toBe(true);expect(summary.events.filter((e:any)=>e.kind==='Finish')).toHaveLength(1);
  await page.getByRole('button',{name:/Pick different species/}).click();await expect(page.getByLabel('Last dive summary')).toContainText('Reef mission complete');
});
test('vampire squid gathers marine snow and has no ink',async({page})=>{
  await mount(page,'vampireSquid');await expect(page.locator('[data-hud=ink]')).toContainText('No ink');await page.locator(sel).focus();await page.keyboard.down('KeyE');
  await expect.poll(async()=>Number(await page.locator('[data-hud=score]').innerText())).toBeGreaterThan(0);await page.keyboard.up('KeyE');
  await page.keyboard.press('KeyI');await page.waitForTimeout(100);await expect(page.locator('[data-hud=ink]')).toContainText('No ink');
  await page.getByRole('button',{name:/End run \+ surface/}).click();const summary=await page.evaluate(()=>JSON.parse(localStorage.getItem('allo.cephalopodlab.lastRun.v2')!));expect(summary.stats.crabs).toBe(0);expect(summary.stats.marineSnow).toBeGreaterThan(0);
});
test('touch buttons move and release cleanly; settings can be changed during a dive',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mount(page);await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';window.dispatchEvent(new Event('resize'));});
  const forward=page.getByRole('button',{name:'Forward',exact:true});await expect(forward).toBeVisible();await forward.scrollIntoViewIfNeeded();const pos=await player(page);const b=await forward.boundingBox();await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();
  const moved=await player(page);expect(moved[2]).toBeGreaterThan(pos[2]+0.3);await page.waitForTimeout(300);expect((await player(page))[2]).toBeCloseTo(moved[2],4);
  await page.getByRole('button',{name:'Help / settings'}).click();await page.getByLabel('Larger text',{exact:true}).check();await page.getByLabel('Reduced motion',{exact:true}).check();await page.getByRole('button',{name:'Resume dive'}).click();await expect(page.locator('.cl-hunt-stage')).toHaveClass(/cl-large-text/);
  const hud=await page.locator('.cl-hunt-hud').boundingBox(),mission=await page.locator('.cl-hunt-mission').boundingBox(),controls=await page.locator('.cl-hunt-controls').boundingBox(),touch=await page.locator('.cl-hunt-touch').boundingBox();expect(hud!.y+hud!.height).toBeLessThanOrEqual(mission!.y);expect(controls!.y+controls!.height).toBeLessThanOrEqual(touch!.y);
});
test('new rigs have distinct anatomy, render without shader errors and release every context',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const [species,form,arms,tentacles] of [['commonOcto','octopus',8,0],['humboldtSquid','squid',8,2],['cuttlefish','cuttlefish',8,2],['vampireSquid','vampire',8,0],['nautilus','nautilus',90,0],['dumboOcto','cirrate',8,0],['bobtailSquid','bobtail',8,2],['blueRinged','octopus',8,0],['giantPacific','octopus',8,0],['mimicOcto','octopus',8,0],['coconutOcto','octopus',8,0],['caribReef','octopus',8,0]]){
    await mount(page,String(species),'observe');const anatomy=await page.evaluate(()=>{const p=(window as any).__player;return {data:p.userData.anatomy,arms:p.children.filter((c:any)=>/^cl-arm-/.test(c.name)).length,tentacles:p.children.filter((c:any)=>/^cl-tentacle-/.test(c.name)).length};});expect(anatomy.data.form).toBe(form);expect(anatomy.arms).toBe(arms);expect(anatomy.tentacles).toBe(tentacles);
    await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  }expect(errors).toEqual([]);
});
test('voluntary surfacing persists results and releases the actual WebGL context',async({page})=>{
  await mount(page);const contexts=await harness.glContexts(page);expect(contexts.some(c=>!c.lost)).toBe(true);await page.getByRole('button',{name:/End run \+ surface/}).click();
  await expect(page.getByLabel('Last dive summary')).toBeVisible();await expect.poll(async()=>(await harness.glContexts(page)).filter(c=>!c.lost).length).toBe(0);
  const summary=await page.evaluate(()=>JSON.parse(localStorage.getItem('allo.cephalopodlab.lastRun.v2')!));expect(summary.reason).toBe('surfaced');expect(summary.seed).toBe(2741);
});
test('rock cover blocks awareness and a spatial ink cloud interrupts pursuit',async({page})=>{
  await mount(page);
  await page.evaluate(()=>{
    const w=window as any,rocks=w.__scene.children.filter((o:any)=>o.userData.substrate==='rock');
    rocks.forEach((r:any)=>{r.position.set(300,1,300);r.scale.setScalar(0.001);r.userData.substrateRadius=0;});
    w.__cover=rocks[0];w.__cover.geometry.dispose();w.__cover.geometry=new w.THREE.BoxGeometry(6,5,0.8);w.__cover.rotation.set(0,0,0);w.__cover.position.set(0,1.2,3);w.__cover.scale.set(1,1,1);w.__cover.userData.substrateRadius=0;
    w.__predator=w.__scene.children.find((o:any)=>o.userData.aggroRange===10&&o.userData.state==='patrol');
    w.__predator.position.set(0,1.2,6);w.__predator.userData.aggroRange=50;w.__predator.userData.speed=0;w.__predator.userData.cooldownUntil=0;
  });
  await page.waitForTimeout(1700);expect(await page.evaluate(()=>(window as any).__predator.userData.state)).toBe('patrol');
  await page.evaluate(()=>{(window as any).__cover.position.set(300,1,300);});
  await expect.poll(()=>page.evaluate(()=>(window as any).__predator.userData.state)).toBe('attacking');
  await page.locator(sel).focus();await page.keyboard.press('KeyI');
  await expect.poll(()=>page.evaluate(()=>(window as any).__predator.userData.state)).toBe('patrol');
  await expect(page.locator('[data-hud=ink]')).toContainText('2/3');
});

import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const probes = `const originalAdd = THREE.Scene.prototype.add;
THREE.Scene.prototype.add = function(...objects) { if(objects.some(o=>o._sampleData)) window.__sampleScene=this; return originalAdd.apply(this,objects); };`;
const wide = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true,probes});
const phone = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:340,height:820,appStyles:true,probes});
test.beforeAll(async()=>{await wide.start();await phone.start();});
test.afterAll(async()=>{await wide.stop();await phone.stop();});
test.afterEach(async({page})=>{await wide.destroy(page);});
test.describe.configure({timeout:300000});
test.use({video:'off',trace:'off'});
async function placeSpecimen(page:Page) {
  await page.evaluate(()=>{
    const scene=(window as any).__sampleScene;
    const vehicle=scene.getObjectByName('exploration-vehicle');
    const orbs=scene.children.filter((o:any)=>o._sampleData&&!o._collected);
    orbs.forEach((orb:any,i:number)=>{orb.position.x=vehicle.position.x+30+i*2;orb.position.z=vehicle.position.z-30;});
    const orb=orbs[0];orb.position.copy(vehicle.position);orb.position.x+=0.9;orb.position.y+=0.6;orb.position.z-=0.5;
    (window as any).__targetSample=orb;
  });
}
const sampleEntries = (page:Page)=>page.evaluate(()=>((window as any).__toolData.solarSystem.journalEntries || []).filter((e:any)=>e.kind==='Sample'));
for(const mode of [{planet:'mars',method:'drill',mobile:false},{planet:'earth',method:'intake',mobile:true},{planet:'jupiter',method:'intake',mobile:false}]) {
  test(mode.planet+' collects once after a visible procedure and preserves cancelled specimens',async({page},info)=>{
    await page.emulateMedia({reducedMotion:mode.mobile?'reduce':'no-preference'});
    await page.setViewportSize(mode.mobile?{width:340,height:820}:{width:1180,height:900});
    const harness=mode.mobile?phone:wide;
    await harness.mount(page,{solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',paused:true}},'document.querySelector("[data-drone-sampling]")');
    const canvas=page.locator('[data-drone-canvas]');await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
    const station=page.getByRole('region',{name:'Sampling station'});
    const collect=page.getByRole('button',{name:'Collect sample',exact:true});
    await page.getByRole('combobox',{name:'Collection method'}).selectOption(mode.method);
    await placeSpecimen(page);
    // A click starts the whole operation, without a sustained touch/hold.
    await collect.click();
    await expect(station).toHaveAttribute('data-drone-sampling','deploying');
    expect(await sampleEntries(page)).toHaveLength(0);
    await page.getByRole('button',{name:'Cancel sampling',exact:true}).click();
    await expect(station).toHaveAttribute('data-drone-sampling','cancelled');
    expect(await page.evaluate(()=>(window as any).__targetSample._collected)).toBe(false);
    expect(await sampleEntries(page)).toHaveLength(0);
    await placeSpecimen(page);
    await collect.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
    await expect(station).toHaveAttribute('data-drone-sampling','collecting',{timeout:60000});
    expect(await page.evaluate(()=>(window as any).__sampleScene.getObjectByName('drone-sampling-rig').visible)).toBe(true);
    if(mode.mobile) {
      const box=await station.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(340);
      expect((await collect.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(()=>(window as any).__targetSample.scale.x)).toBe(1);
      const overlay=await page.locator('[data-drone-sampling-overlay]').boundingBox();
      const dock=await page.locator('[data-drone-action-dock]').boundingBox();
      expect(overlay!.y+overlay!.height).toBeLessThanOrEqual(dock!.y);
      await expect(page.locator('#hud-sample-prox')).toBeHidden();
    }
    await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-sampling-active.png'),timeout:60000});
    await expect(station).toHaveAttribute('data-drone-sampling','sealed',{timeout:90000});
    const entries=await sampleEntries(page);expect(entries).toHaveLength(1);
    expect(JSON.stringify(entries[0])).toContain(mode.method==='drill'?'Core drill (demonstration)':'Sealed intake');
    expect(JSON.stringify(entries[0])).toContain('not a new measurement');
    expect(await page.evaluate(()=>(window as any).__targetSample._collected)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__sampleScene.getObjectByName('drone-sampling-rig').visible)).toBe(false);
    // No duplicate award/evidence from holding F after a completed specimen.
    await canvas.press('f');expect(await sampleEntries(page)).toHaveLength(1);
    await placeSpecimen(page);await collect.click();
    await page.evaluate(()=>{(window as any).__targetSample.position.x+=10;});
    await expect(station).toHaveAttribute('data-drone-sampling','cancelled',{timeout:30000});
    expect(await sampleEntries(page)).toHaveLength(1);
    expect(await page.evaluate(()=>(window as any).__targetSample._collected)).toBe(false);
    if(mode.planet==='mars') {
      await page.getByRole('combobox',{name:'Collection method'}).selectOption('scoop');await placeSpecimen(page);
      await canvas.press('f');
      await expect(station).toHaveAttribute('data-drone-sampling','collecting',{timeout:60000});
      await page.keyboard.down('f');
      await expect(station).toHaveAttribute('data-drone-sampling','sealed',{timeout:90000});
      await placeSpecimen(page);
      await page.keyboard.down('f'); // repeated keydown while still held
      await page.waitForTimeout(1200);await page.keyboard.up('f');
      expect(await sampleEntries(page)).toHaveLength(2);
      expect(JSON.stringify((await sampleEntries(page))[1])).toContain('Surface scoop');
    }
    await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-sampling-scene.png'),timeout:60000});
    expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
    await harness.destroy(page);await expect(station).toHaveCount(0);
  });
}

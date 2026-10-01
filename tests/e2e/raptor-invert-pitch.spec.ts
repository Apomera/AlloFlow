import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
// Invert pitch, flight-sim style: the nose keys swap, vertical drag reverses, and every label
// that names a key follows the swap, including custom bindings.
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.huntScene=scene;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor invert pitch',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  // Overridable so a mutation can run against a COPY; other sessions edit this file.
  const harness=new GlHarness({toolFile:process.env.RAPTOR_SOURCE_E2E||'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:960,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepHunt=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
      (window as any).advanceHunt=(ms:number)=>{while(ms>0){const dt=Math.min(ms,50);(window as any).stepHunt(dt);ms-=dt;}};
    });
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:0});(window as any).advanceHunt(200);});
  });
  const canvas=(page:any)=>page.locator('[data-raptor-canvas]');
  const pitch=(page:any)=>canvas(page).evaluate((c:any)=>c._rhSnapshot().pitchRadians);
  // Hold a real key on the focused canvas for 300 ms of flight; returns the pitch change.
  async function holdKey(page:any,key:string){
    await canvas(page).focus();
    const before=await pitch(page);
    await page.keyboard.down(key);
    await canvas(page).evaluate(()=>(window as any).advanceHunt(300));
    const after=await pitch(page);
    await page.keyboard.up(key);
    await canvas(page).evaluate(()=>(window as any).advanceHunt(1500));
    return after-before;
  }
  async function dragUp(page:any){
    const box=(await canvas(page).boundingBox())!,x=box.x+box.width/2,y=box.y+box.height/2;
    const before=await pitch(page);
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y-80,{steps:4});await page.mouse.up();
    await canvas(page).evaluate(()=>(window as any).stepHunt(50));
    const after=await pitch(page);
    await canvas(page).evaluate(()=>(window as any).advanceHunt(1500));
    return after-before;
  }
  const bindingRow=(page:any,label:string)=>page.locator('[data-raptor-keymap] li').filter({hasText:label});

  test('swaps the nose keys and vertical drag, and the labels name the right keys',async({page})=>{
    expect(await holdKey(page,'w')).toBeGreaterThan(0.1);
    expect(await dragUp(page)).toBeGreaterThan(0.05);
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();
    const toggle=page.locator('[data-raptor-invert-pitch-toggle]');
    await expect(toggle).toHaveText('Invert pitch off');await expect(toggle).toHaveAttribute('aria-pressed','false');
    await expect(bindingRow(page,'Nose up').locator('kbd').first()).toHaveText('W');
    await toggle.click();
    await expect(toggle).toHaveText('Invert pitch on');await expect(toggle).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.invertPitch)).toBe(true);
    await expect.poll(()=>canvas(page).evaluate((c:any)=>c._rhSnapshot().invertPitch)).toBe(true);
    await expect(bindingRow(page,'Nose down').locator('kbd').first()).toHaveText('W');
    await expect(bindingRow(page,'Nose up').locator('kbd').first()).toHaveText('S');
    await expect(page.locator('[data-raptor-canvas]')).toHaveAttribute('aria-keyshortcuts',/W/);
    expect(await holdKey(page,'w')).toBeLessThan(-0.1);
    expect(await holdKey(page,'s')).toBeGreaterThan(0.1);
    expect(await dragUp(page)).toBeLessThan(-0.05);
    await toggle.click();
    await expect(toggle).toHaveText('Invert pitch off');
    await expect.poll(()=>canvas(page).evaluate((c:any)=>c._rhSnapshot().invertPitch)).toBe(false);
    expect(await holdKey(page,'w')).toBeGreaterThan(0.1);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('custom bindings stay truthful with pitch inverted',async({page})=>{
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();
    await page.locator('[data-raptor-control-scheme-select]').selectOption('custom');
    await page.locator('[data-raptor-invert-pitch-toggle]').click();
    await expect(page.locator('[data-raptor-invert-pitch-toggle]')).toHaveAttribute('aria-pressed','true');
    const noseUp=page.locator('[data-raptor-rebind-action="pitchUp"]');
    await expect(noseUp).toContainText('S');
    await noseUp.click();
    await page.keyboard.press('i');
    await expect(noseUp).toHaveText('I');
    // Stored plainly: with invert switched off, I is the nose-down key.
    const stored=await page.evaluate(()=>(window as any).__toolData.raptorHunt.customControlKeys);
    expect(stored.i).toBe('pitchDown');
    expect(Object.keys(stored).filter(key=>stored[key]==='pitchDown')).toEqual(['i']);
    await expect.poll(()=>canvas(page).evaluate((c:any)=>c._rhSnapshot().invertPitch)).toBe(true);
    expect(await holdKey(page,'i')).toBeGreaterThan(0.1);
    await page.locator('[data-raptor-invert-pitch-toggle]').click();
    await expect(page.locator('[data-raptor-rebind-action="pitchDown"]')).toHaveText('I');
    await expect.poll(()=>canvas(page).evaluate((c:any)=>c._rhSnapshot().invertPitch)).toBe(false);
    expect(await holdKey(page,'i')).toBeLessThan(-0.1);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});

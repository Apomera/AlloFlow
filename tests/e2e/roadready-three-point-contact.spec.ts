import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_roadready.js',toolId:'roadReady',width:1100,height:780,appStyles:true,preScripts:['stem_lab/stem_lab_module.js'],probes:"window.__testHooks={};document.documentElement.classList.add('theme-dark');"});
test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});

test('curb contact stops once, recovers, and retains its penalty in a legal finish',async({page})=>{
  await harness.mount(page,{roadReady:{view:'threePoint',reducedMotion:true}},undefined,{expectCanvas:false});
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__testHooks.maneuverDrill.carRef.current.requireParkingNeutral)).toBe(false);
  await page.evaluate(()=>Object.assign((window as any).__testHooks.maneuverDrill.carRef.current,{x:350,y:179,heading:-Math.PI/2,speed:0,steering:0}));
  await page.keyboard.down('w');
  const progress=page.getByRole('status',{name:'Practice progress'});
  await expect(progress).toContainText('Score 85/100');
  await expect(progress).toContainText('Contacts 1');
  const pose=await page.evaluate(()=>{const c=(window as any).__testHooks.maneuverDrill.carRef.current;return{x:c.x,y:c.y};});
  await page.waitForTimeout(400);
  expect(await page.evaluate(()=>{const c=(window as any).__testHooks.maneuverDrill.carRef.current;return{x:c.x,y:c.y,speed:c.speed};})).toEqual({...pose,speed:0});
  await expect(progress).toContainText('Score 85/100');
  await expect(page.getByRole('status',{name:'Next maneuver action'})).toContainText('Move away');
  await page.keyboard.up('w');await page.keyboard.down('s');
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__testHooks.maneuverDrill.carRef.current.contactState)).toBe(false);
  await page.keyboard.up('s');
  await page.evaluate(()=>{
    const h=(window as any).__testHooks.maneuverDrill;
    h.stageRef.current=2;h.legDistanceRef.current=10;h.keysRef.current={};
    Object.assign(h.carRef.current,{x:320,y:290,heading:Math.PI,speed:0,steering:0});
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(()=>(window as any).__testHooks.maneuverDrill.doneRef.current)).toBe(false);
  await page.evaluate(()=>{(window as any).__testHooks.maneuverDrill.carRef.current.y=210;});
  await expect(progress).toContainText('Practice complete');
  await expect(progress).toContainText('Score 85/100');
  await expect(page.getByRole('region',{name:'Driving instructor'})).toContainText('85/100 (1 contact)');
  await page.getByRole('button',{name:'Reset practice',exact:true}).click();
  await expect(progress).toContainText('Score 100/100');
  await expect(progress).toContainText('Contacts 0');
  expect(await page.evaluate(()=>{const c=(window as any).__testHooks.maneuverDrill.carRef.current;return{x:c.x,y:c.y};})).toEqual({x:350,y:300});
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

test('phone layout exposes the braking cue and a legal lane start',async({page})=>{
  await page.setViewportSize({width:320,height:844});
  await harness.mount(page,{roadReady:{view:'threePoint',reducedMotion:true}},undefined,{expectCanvas:false});
  await page.evaluate(()=>{document.getElementById('wrap')!.style.width='100%';});
  const cue=page.getByRole('status',{name:'Next maneuver action'});
  await expect(cue).toContainText('Steer left and move forward');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({path:'reports/roadready-review/threepoint-live-coach-320.png',fullPage:true,scale:'css',animations:'disabled'});
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

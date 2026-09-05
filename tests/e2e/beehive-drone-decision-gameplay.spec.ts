import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_beehive.js',toolId:'beehive',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,width:1100,height:900,probes:'window.__testHooks={};',extraScripts:['node_modules/axe-core/axe.min.js']});
test.describe.configure({timeout:180000});test.use({viewport:{width:1100,height:900}});
test.beforeAll(async()=>{mkdirSync('scratch/beehive-flight-upgrade',{recursive:true});await harness.start();});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>{await harness.destroy(page);});
async function mount(page:any,fallback=false){
  await page.goto(harness.url+'/__harness');await page.evaluate((fallback:boolean)=>{
    const w=window as any;if(fallback) w.StemLab.ensureThree=()=>Promise.reject(new Error('Test: WebGL unavailable'));
    w.__mount({beehive:{viewMode:'drone',honey:80,queenHealth:100,morale:90,varroaLevel:2,soundOn:false,tutorialDone:true,drone:{active:false,pacing:'steps',difficulty:'easy',courseSeed:20260904}}});
    Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
  },fallback);
  await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
  await expect(page.locator('[data-flight-decision-panel]')).toBeVisible();
}
async function state(page:any){return page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return {x:s.x,y:s.y,z:s.z,timer:s.timer,energy:s.energy,phase:s.phase,turn:s.decisionCount||0,reachedDca:s.reachedDca,reachedQueen:s.reachedQueen};});}
async function audit(page:any){
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-flight-decision-panel]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});expect(violations).toEqual([]);
}
test('deliberate flight renders the landscape, waits for the learner, and completes using keyboard choices',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
  const world=page.locator('[data-beehive-drone-webgl]');await expect(world).toBeVisible();
  await expect(world).toHaveAttribute('data-flight-landscape','textured-meadow-river-fields');
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-frame-health','verified',{timeout:45000});
  await page.locator('#beehive-drone-playfield').screenshot({path:'scratch/beehive-flight-upgrade/flight-landscape.png'});
  const before=await state(page);await page.waitForTimeout(1200);expect(await state(page)).toEqual(before);
  await audit(page);
  const choice=page.locator('input[name="bee-flight-decision"][value="climb"]');await choice.focus();await page.keyboard.press('Space');
  const advance=page.locator('[data-flight-advance-decision]');await advance.focus();await page.keyboard.press('Enter');
  expect((await state(page)).turn).toBe(1);await expect(advance).toBeFocused();
  await page.locator('#beehive-drone-playfield').screenshot({path:'scratch/beehive-flight-upgrade/flight-in-air.png'});
  await page.locator('input[name="bee-flight-decision"][value="navigate"]').check();
  for(let i=0;i<3;i++) await advance.press('Enter');
  for(let i=0;i<78 && (await state(page)).phase!=='end';i++) await advance.press('Enter');
  expect(await state(page)).toMatchObject({phase:'end',reachedDca:true,reachedQueen:true});
  await expect(page.getByRole('region',{name:'Saved flight decision evidence'})).toBeVisible(); await expect(page.getByRole('region',{name:'Saved flight decision evidence'})).toBeFocused();
  expect(errors).toEqual([]);
});
test('fallback flight is usable at narrow widths, with enlarged text and dark/forced colors',async({page})=>{
  await page.setViewportSize({width:390,height:844});await mount(page,true);
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer','canvas-2d-fallback');
  await audit(page);await page.locator('[data-flight-advance-decision]').click();
  await page.locator('[data-flight-decision-panel]').screenshot({path:'scratch/beehive-flight-upgrade/mobile-planner.png'});
  await page.setViewportSize({width:320,height:844});
  const overflow=await page.locator('[data-flight-decision-panel]').evaluate((el:HTMLElement)=>el.scrollWidth-el.clientWidth);expect(overflow).toBeLessThanOrEqual(1);
  await page.evaluate(()=>{(window as any).__ctx.isDark=true;(window as any).__rerender();document.documentElement.style.fontSize='24px';});
  await audit(page);
  await page.locator('[data-flight-decision-panel]').screenshot({path:'scratch/beehive-flight-upgrade/mobile-dark.png'});
  await page.emulateMedia({forcedColors:'active'});await page.locator('[data-flight-decision-panel]').screenshot({path:'scratch/beehive-flight-upgrade/forced-colors.png'});
  await page.getByRole('button',{name:'Record flight and debrief',exact:true}).click();await expect(page.getByRole('region',{name:'Saved flight decision evidence'})).toBeVisible();
});

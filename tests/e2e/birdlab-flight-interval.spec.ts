import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({video:'off',trace:'off',hasTouch:true});
test.describe.configure({timeout:180000,retries:0});
const output=resolve('reports/avian-simulations-round34-2026-10-23/bird');
const root='[data-birdlab-flight-workbench]';
const harness=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page){await harness.mount(page,{birdLab:{view:'flightPatterns',blXp:23,blLifeList:{},blBadges:{}}},undefined,{expectCanvas:false});await expect(page.locator(root)).toBeVisible();await page.locator('[data-flight-interval-toggle]').click();}
async function verify(page:Page,lane='A'){
  const info=await page.evaluate(lane=>{
    const path=document.querySelector(`[data-interval-path="${lane}"]`) as SVGPathElement,chord=document.querySelector(`[data-interval-chord="${lane}"]`) as SVGLineElement,reading=document.querySelector(`[data-interval-reading="${lane}"]`)!;
    const first=path.getPointAtLength(0),last=path.getPointAtLength(path.getTotalLength());
    return {nativeLength:path.getTotalLength(),nativeGap:Math.hypot(last.x-first.x,last.y-first.y),length:Number(reading.getAttribute('data-route-length')),gap:Number(reading.getAttribute('data-endpoint-gap')),first:[first.x,first.y],last:[last.x,last.y],chord:[chord.x1.baseVal.value,chord.y1.baseVal.value,chord.x2.baseVal.value,chord.y2.baseVal.value],poses:[...reading.querySelectorAll('[data-interval-pose]')].map(n=>n.getAttribute('data-posture'))};
  },lane);
  // Native SVG geometry is independent of the feature's JavaScript length sum.
  expect(Math.abs(info.nativeLength-info.length)).toBeLessThan(.02);expect(Math.abs(info.nativeGap-info.gap)).toBeLessThan(.002);
  info.first.forEach((v,i)=>expect(v).toBeCloseTo(info.chord[i],3));info.last.forEach((v,i)=>expect(v).toBeCloseTo(info.chord[i+2],3));expect(info.length+.00001).toBeGreaterThanOrEqual(info.gap);return info;
}
test('all ten authored routes measure the selected interval; comparisons and one-shot playback stay synchronized',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let now=1000,next=0;const pending=new Map<number,FrameRequestCallback>();window.requestAnimationFrame=fn=>{pending.set(++next,fn);return next;};window.cancelAnimationFrame=id=>pending.delete(id);(window as any).intervalStep=(ms:number)=>{now+=ms;const frames=[...pending.values()];pending.clear();frames.forEach(f=>f(now));};(window as any).intervalPending=()=>pending.size;});
  await mount(page);const checks:any[]=[];
  await page.locator('[data-flight-compare-toggle]').click();
  for(const style of ['soar','direct','bound','hover','glide','dive','erratic','plow','dart','slowflap']){
    await page.locator(`[data-flight-style="${style}"]`).click();
    const current=await verify(page),other=await verify(page,'B');checks.push({style,current,other});
    if(style==='hover'){expect(current.length).toBe(0);expect(current.gap).toBe(0);expect(current.poses).toEqual(['beating','beating']);}
    if(['direct','glide','plow','slowflap'].includes(style))expect(current.length).toBeCloseTo(current.gap,6);
    if(['bound','soar','dart','erratic'].includes(style))expect(current.length).toBeGreaterThan(current.gap+5);
  }
  await page.locator('[data-flight-style=bound]').click();await page.locator('[data-flight-compare-select]').selectOption('hover');
  await page.locator('[data-flight-interval-bound=start]').fill('170');await page.locator('[data-flight-interval-bound=end]').fill('690');
  await verify(page);await verify(page,'B');
  await page.locator('[data-interval-shift="100"]').click();await expect(page.locator('[data-flight-interval-bound=start]')).toHaveValue('270');await expect(page.locator('[data-flight-interval-bound=end]')).toHaveValue('790');
  await page.locator('[data-interval-shift="-100"]').click();await expect(page.locator('[data-flight-interval-bound=start]')).toHaveValue('170');
  await page.getByRole('button',{name:'Swap A and B',exact:true}).click();expect((await verify(page)).length).toBe(0);await verify(page,'B');
  await page.locator('[data-interval-jump=end]').click();await expect(page.locator('[data-flight-body]')).toHaveAttribute('data-flight-phase','690.0');
  await page.getByRole('button',{name:'Play interval',exact:true}).click();await page.evaluate(()=>(window as any).intervalStep(40));await page.evaluate(()=>(window as any).intervalStep(800));
  expect(Number(await page.locator('[data-flight-body]').getAttribute('data-flight-phase'))).toBeCloseTo(270,0);
  expect(await page.locator('[data-flight-comparison-body]').getAttribute('data-flight-comparison-phase')).toBe(await page.locator('[data-flight-body]').getAttribute('data-flight-phase'));
  await page.evaluate(()=>(window as any).intervalStep(6000));await expect(page.locator(root)).toHaveAttribute('data-flight-playing','false');await expect(page.locator('[data-flight-body]')).toHaveAttribute('data-flight-phase','690.0');
  await page.evaluate(()=>(window as any).intervalStep(60000));await expect(page.locator('[data-flight-body]')).toHaveAttribute('data-flight-phase','690.0');
  await page.getByRole('button',{name:'Play interval',exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator(root)).toHaveAttribute('data-flight-playing','false');
  await page.locator('[data-interval-full]').click();await expect(page.locator('[data-interval-shift="100"]')).toBeDisabled();await expect(page.locator('[data-interval-shift="-100"]')).toBeDisabled();
  await page.locator('[data-flight-interval-toggle]').click();await expect(page.locator('[data-interval-path]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Play sequence',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>{const d=(window as any).__toolData.birdLab;return[d.blXp,d.blLifeList,d.blBadges];})).toEqual([23,{},{}]);expect(errors).toEqual([]);
  await harness.destroy(page);await page.evaluate(()=>(window as any).intervalStep(1000));expect(await page.evaluate(()=>(window as any).intervalPending())).toBe(0);
  writeFileSync(resolve(output,'interval-geometry.json'),JSON.stringify(checks,null,2));
});
test('interval endpoints support native keyboard and touch with readable responsive comparisons',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);const checks:any[]=[];
  await page.locator('[data-flight-compare-toggle]').click();
  await page.locator('[data-flight-interval-bound=start]').focus();await page.keyboard.press('End');await expect(page.locator('[data-flight-interval-bound=start]')).toHaveValue('590');
  await page.keyboard.press('Home');await expect(page.locator('[data-flight-interval-bound=start]')).toHaveValue('0');
  await page.locator('[data-flight-interval-bound=end]').focus();await page.keyboard.press('Home');await expect(page.locator('[data-flight-interval-bound=end]')).toHaveValue('10');await verify(page);
  await page.keyboard.press('End');await expect(page.locator('[data-flight-interval-bound=end]')).toHaveValue('1000');
  await page.locator('[data-flight-interval-bound=start]').fill('200');await page.locator('[data-flight-interval-bound=end]').fill('600');
  for(const [viewport,host] of [[1280,1100],[1280,500],[390,390]]){
    await page.setViewportSize({width:viewport,height:1200});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>{n.style.width=w+'px';n.style.maxWidth='100%';},host);
    const layout=await page.locator('[data-flight-interval]').evaluate(n=>({doc:document.documentElement.scrollWidth,controls:[...n.querySelectorAll('button,input')].map(c=>({height:c.getBoundingClientRect().height,left:c.getBoundingClientRect().left,right:c.getBoundingClientRect().right}))}));
    expect(layout.doc).toBeLessThanOrEqual(viewport);layout.controls.forEach(c=>{expect(c.height).toBeGreaterThanOrEqual(44);expect(c.left).toBeGreaterThanOrEqual(0);expect(c.right).toBeLessThanOrEqual(viewport);});
    const axe=await page.evaluate(async()=>(await (window as any).axe.run({include:['[data-flight-interval]','.birdlab-flight-interval-readings']},{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));
    expect(axe).toEqual([]);checks.push({viewport,host,...layout,axe});
    if(host===1100||host===390){
      await page.setViewportSize({width:viewport,height:4000});await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
      await page.locator(root).evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)p.scrollTop=0;window.scrollTo(0,0);n.scrollIntoView({block:'center',behavior:'instant'});});
      const b=(await page.locator(root).boundingBox())!;expect(b.y).toBeGreaterThanOrEqual(0);expect(b.y+b.height).toBeLessThanOrEqual(4000);
      const path=resolve(output,`interval-${host}.png`);await page.locator(root).screenshot({path,animations:'disabled',scale:'css'});const png=readPng(readFileSync(path));expect(Math.abs(png.width-b.width)).toBeLessThanOrEqual(2);expect(Math.abs(png.height-b.height)).toBeLessThanOrEqual(2);await page.setViewportSize({width:viewport,height:1200});
    }
  }
  await page.locator('[data-flight-interval-bound=start]').scrollIntoViewIfNeeded();const b=(await page.locator('[data-flight-interval-bound=start]').boundingBox())!,cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:b.x+b.width*.65,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  expect(Number(await page.locator('[data-flight-interval-bound=start]').inputValue())).toBeGreaterThan(200);await verify(page);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(output,'interval-layout.json'),JSON.stringify(checks,null,2));
});

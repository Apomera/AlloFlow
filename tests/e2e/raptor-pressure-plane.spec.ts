import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({video:'off',trace:'off',hasTouch:true});test.describe.configure({retries:0,timeout:150000});
const report=resolve(process.env.AVIAN_REPORT_DIR ? process.env.AVIAN_REPORT_DIR + '/raptor-pressure' : 'reports/avian-simulations-round37-2026-10-23/raptor');
const harness=new GlHarness({toolId:'raptorHunt',toolFile:'stem_lab/stem_tool_raptorhunt.js',width:1100,height:1000,layout:'document',appStyles:true,extraScripts:['node_modules/axe-core/axe.min.js']});
test.beforeAll(async()=>{mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page){const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await harness.mount(page,{raptorHunt:{activeSection:'talons',xp:17,visited:[],contactPressure:{version:1,force:40,area:20,count:4}}},undefined,{expectCanvas:false});await expect(page.locator('[data-pressure-plane]')).toBeVisible();return errors;}
async function pair(page:Page,force:number,area:number){for(const [name,value] of [['force',force],['area',area]] as const)await page.locator('#rh-contact-'+name).fill(String(value));}
async function current(page:Page){return {force:Number(await page.locator('#rh-contact-force').inputValue()),area:Number(await page.locator('#rh-contact-area').inputValue())};}
async function geometry(page:Page){return page.locator('[data-pressure-plane]').evaluate(n=>{
 const dot=(q:SVGCircleElement)=>({area:2+(q.cx.baseVal.value-72)/548*38,force:5+(306-q.cy.baseVal.value)/256*95});
 return {current:dot(n.querySelector('[data-pressure-plane-marker=current] circle')!),pinned:n.querySelector('[data-pressure-plane-marker=pinned]')?dot(n.querySelector('[data-pressure-plane-marker=pinned] circle')!):null,stops:[...n.querySelectorAll('[data-pressure-rail-stop]')].map(q=>dot(q as SVGCircleElement)),rays:[...n.querySelectorAll('[data-pressure-ray]')].map(q=>{const l=q as SVGLineElement;return {p:Number(l.getAttribute('data-pressure-ray')),a1:2+(l.x1.baseVal.value-72)/548*38,f1:5+(306-l.y1.baseVal.value)/256*95,a2:2+(l.x2.baseVal.value-72)/548*38,f2:5+(306-l.y2.baseVal.value)/256*95};}),bands:[...n.querySelectorAll('[data-pressure-band]')].map(q=>({low:Number(q.getAttribute('data-pressure-band')),points:[...(q as SVGPolygonElement).points].map(p=>[2+(p.x-72)/548*38,5+(306-p.y)/256*95])}))};
});}
async function point(page:Page,force:number,area:number){return page.locator('[data-pressure-plane-pad]').evaluate((svg:SVGSVGElement,p)=>{const q=svg.createSVGPoint();q.x=72+(p.area-2)/38*548;q.y=306-(p.force-5)/95*256;const v=q.matrixTransform(svg.getScreenCTM()!);return{x:v.x,y:v.y};},{force,area});}
test('the rendered pressure plane and exact rails agree with independent force-area arithmetic',async({page})=>{
 const errors=await mount(page),checks:any[]=[];
 const initial=await geometry(page);let total=0;
 for(const ray of initial.rays){expect(ray.f1/ray.a1).toBeCloseTo(ray.p,5);expect(ray.f2/ray.a2).toBeCloseTo(ray.p,5);}
 for(let i=0;i<initial.bands.length;i++){
  const band=initial.bands[i],upper=[.25,.5,1,2,5,10,25,50][i];let twice=0;
  for(let j=0;j<band.points.length;j++){const [a,f]=band.points[j],next=band.points[(j+1)%band.points.length];expect(a).toBeGreaterThanOrEqual(2-1e-5);expect(a).toBeLessThanOrEqual(40+1e-5);expect(f).toBeGreaterThanOrEqual(5-1e-5);expect(f).toBeLessThanOrEqual(100+1e-5);expect(f/a).toBeGreaterThanOrEqual(band.low-1e-4);expect(f/a).toBeLessThanOrEqual(upper+1e-4);twice+=a*next[1]-f*next[0];}total+=Math.abs(twice)/2;
 }expect(total).toBeCloseTo(38*95,2);
 for(const [force,area] of [[40,20],[73,17],[5,40],[100,2],[35,14],[9,6]]){
  await pair(page,force,area);if(await page.locator('[data-pressure-follow]').getAttribute('aria-pressed')==='true')await page.locator('[data-pressure-follow]').click();await page.locator('[data-contact-pin]').click();await page.locator('[data-pressure-follow]').click();
  const g=await geometry(page),expected:any[]=[];for(let a=2;a<=40;a++)for(let f=5;f<=100;f++)if(f*area===a*force)expected.push({force:f,area:a});
  expect(g.stops.length).toBe(expected.length);g.stops.forEach((s,i)=>{expect(s.force).toBeCloseTo(expected[i].force,4);expect(s.area).toBeCloseTo(expected[i].area,4);});
  const pad=page.locator('[data-pressure-plane-pad]');await pad.focus();await page.keyboard.press('Home');expect(await current(page)).toEqual(expected[0]);await expect(page.locator('[data-pressure-step=less]')).toBeDisabled();await page.keyboard.press('End');expect(await current(page)).toEqual(expected.at(-1));await expect(page.locator('[data-pressure-step=more]')).toBeDisabled();
  if(expected.length>1){await page.locator('[data-pressure-step=less]').click();expect(await current(page)).toEqual(expected.at(-2));await page.locator('[data-pressure-step=more]').click();expect(await current(page)).toEqual(expected.at(-1));}
  const after=await geometry(page);expect(after.pinned!.force).toBeCloseTo(force,4);expect(after.pinned!.area).toBeCloseTo(area,4);const value=await current(page);expect(value.force*area).toBe(value.area*force);await expect(page.locator('[data-contact-reading]')).toHaveText((force/area).toFixed(3)+' MPa');
  for(const count of [1,2,4]){await page.locator('[data-contact-count="'+count+'"]').click();await expect(page.locator('[data-pressure-follow]')).toHaveAttribute('aria-pressed','true');const disks=await page.locator('[data-contact-disk=current]').evaluateAll(nodes=>nodes.map(n=>(n as SVGCircleElement).r.baseVal.value));expect(disks.reduce((sum,r)=>sum+Math.PI*(r/17)**2,0)).toBeCloseTo(value.area,4);}
  checks.push({force,area,stops:expected.length});await page.locator('[data-pressure-follow]').click();
 }
 await pair(page,40,20);await page.locator('[data-pressure-follow]').click();await page.locator('#rh-contact-force').fill('41');await expect(page.locator('[data-pressure-follow]')).toHaveAttribute('aria-pressed','false');await expect(page.locator('[data-pressure-rail]')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.xp)).toBe(17);expect(errors).toEqual([]);writeFileSync(resolve(report,'pressure-geometry.json'),JSON.stringify({bands:initial.bands,rays:initial.rays,rails:checks,totalArea:total},null,2));
});
test('pressure exploration supports keyboard, cancellable mouse and touch, and responsive layouts',async({page})=>{
 const errors=await mount(page),pad=page.locator('[data-pressure-plane-pad]'),layouts:any[]=[];
 await pad.focus();await page.keyboard.press('Home');expect(await current(page)).toEqual({force:5,area:2});await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('ArrowUp');expect(await current(page)).toEqual({force:6,area:7});await page.keyboard.press('End');expect(await current(page)).toEqual({force:100,area:40});
 await pair(page,40,20);await pad.scrollIntoViewIfNeeded();let a=await point(page,40,20),b=await point(page,75,30);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});expect(await current(page)).toEqual({force:75,area:30});await page.keyboard.press('Escape');await page.mouse.up();expect(await current(page)).toEqual({force:40,area:20});
 await page.locator('[data-pressure-follow]').click();await pad.scrollIntoViewIfNeeded();a=await point(page,40,20);b=await point(page,60,30);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});await page.mouse.up();expect(await current(page)).toEqual({force:60,area:30});await page.locator('[data-pressure-follow]').click();
 for(const [viewport,host] of [[1280,1100],[1280,500],[390,390]]){
  await page.setViewportSize({width:viewport,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>{n.style.width=w+'px';n.style.maxWidth='100%';n.setAttribute('data-stem-tool-shell','true');},host);
  await pair(page,40,20);await page.locator('[data-contact-pin]').click();await page.locator('[data-pressure-follow]').click();await page.locator('[data-pressure-step=more]').click();
  const layout=await page.locator('[data-pressure-plane]').evaluate(n=>({overflow:document.documentElement.scrollWidth,controls:[...n.querySelectorAll('button')].map(q=>q.getBoundingClientRect().height),labels:[...n.querySelectorAll('svg text')].map(q=>q.getBoundingClientRect().height)}));expect(layout.overflow).toBeLessThanOrEqual(viewport);layout.controls.forEach(h=>expect(h).toBeGreaterThanOrEqual(44));layout.labels.forEach(h=>expect(h).toBeGreaterThan(9));
  const axe=await page.evaluate(async()=>(await (window as any).axe.run('[data-pressure-plane]',{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));expect(axe).toEqual([]);layouts.push({viewport,host,...layout,axe});
  if(host!==500){await pad.focus();await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');await page.locator('[data-pressure-plane]').screenshot({path:resolve(report,'pressure-'+host+'.png'),animations:'disabled',scale:'css'});}await page.locator('[data-pressure-follow]').click();
 }
 await pair(page,40,20);await pad.scrollIntoViewIfNeeded();a=await point(page,40,20);b=await point(page,75,30);const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...a}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...b}]});expect(await current(page)).toEqual({force:75,area:30});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});expect(await current(page)).toEqual({force:40,area:20});await cdp.detach();
 expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);writeFileSync(resolve(report,'pressure-layouts.json'),JSON.stringify(layouts,null,2));
});

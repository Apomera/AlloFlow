import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readPng } from './helpers/png_pixels';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace:'off',hasTouch:true });
const output=resolve(process.env.AVIAN_REPORT_DIR ? process.env.AVIAN_REPORT_DIR + '/bird-breath' : 'reports/avian-simulations-round36-2026-10-23/bird');
test.describe.configure({ mode: 'default', retries: 0, timeout: 180_000 });
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 960, appStyles: true, layout: 'document' });
test.beforeAll(async () => { mkdirSync(output,{recursive:true});await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page: Page, viewport: number, host: number) {
  await page.setViewportSize({ width: viewport, height: 1000 });
  await page.locator('#wrap').evaluate((element: HTMLElement, width) => {
    element.style.width = width + 'px'; element.style.maxWidth = '100%'; element.setAttribute('data-stem-tool-shell', 'true');
  }, host);
}
async function mount(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view: 'physiology', blXp: 0, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await sizing(page, 1280, 1100);
  await expect(page.locator('[data-birdlab-breath-study]')).toBeVisible();
}
async function geometry(page: Page) {
  return page.locator('[data-birdlab-breath-study]').evaluate(element => {
    const map = element.querySelector('[data-breath-map]') as SVGSVGElement;
    const transform = (node: SVGGraphicsElement) => map.getCTM()!.inverse().multiply(node.getCTM()!);
    const point = new DOMPoint(0, 0).matrixTransform(transform(element.querySelector('[data-breath-packet]') as SVGGraphicsElement));
    const lung = element.querySelector('[data-breath-lung]') as SVGGraphicsElement;
    const bbox = lung.getBBox();
    return { phase: Number((element as HTMLElement).dataset.breathPhase), packet: [point.x, point.y],
      sacs: [...element.querySelectorAll('[data-breath-sac]')].map(node => transform(node as SVGGraphicsElement).a),
      lung: [bbox.x, bbox.y, bbox.width, bbox.height, lung.innerHTML],
      routes: [...element.querySelectorAll('[data-breath-route]')].map(node => {
        const route = node as SVGPathElement, length = route.getTotalLength();
        const a = route.getPointAtLength(0), b = route.getPointAtLength(length);
        return { start: [a.x, a.y], end: [b.x, b.y], d: route.getAttribute('d'), stroke: route.getAttribute('stroke') };
      }),
      lungArrow: element.querySelector('[data-breath-lung-arrow]')?.getAttribute('d'),
      tracheaArrow: element.querySelector('[data-breath-trachea-arrow]')?.getAttribute('d') };
  });
}
async function seek(page: Page, value: number) {
  await page.locator('#birdlab-breath-phase').fill(String(value));
  await expect(page.locator('[data-birdlab-breath-study]')).toHaveAttribute('data-breath-phase', value.toFixed(3));
}
async function progress(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.birdLab;
    return { xp: data.blXp, sightings: data.blLifeList, badges: data.blBadges };
  });
}


async function comparison(page:Page){return page.locator('[data-birdlab-breath-study]').evaluate(n=>{
 const map=n.querySelector('[data-breath-map]') as SVGSVGElement,transform=(q:SVGGraphicsElement)=>map.getCTM()!.inverse().multiply(q.getCTM()!),point=n.querySelector('[data-breath-reference-packet]') as SVGCircleElement,dot=n.querySelector('[data-breath-rhythm-dot]') as SVGCircleElement;
 return {sacs:[...n.querySelectorAll('[data-breath-reference-sac]')].map(q=>transform(q as SVGGraphicsElement).a),packet:[point.cx.baseVal.value,point.cy.baseVal.value],cursor:[dot.cx.baseVal.value,dot.cy.baseVal.value],kept:n.querySelector('[data-breath-kept-cursor]')!.getAttribute('data-phase'),scale:Number(n.querySelector('[data-breath-current-cursor]')!.getAttribute('data-scale'))};
});}
test('kept geometry, rhythm curve and equal-size phases agree with the existing airway diagram',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);const initial=await geometry(page),before=await progress(page),checks:any[]=[];
 for(const phase of [0,100,250,500,750,1000,1250,1750,2000,2250,2750,3000,3250,3750,4000]){
  await seek(page,phase);const g=await geometry(page);await page.locator('[data-breath-pin]').click();const pin=await comparison(page);expect(pin.kept).toBe(String(phase));pin.sacs.forEach(s=>expect(s).toBeCloseTo(g.sacs[0],6));pin.packet.forEach((v,i)=>expect(v).toBeCloseTo(g.packet[i],4));expect(g.lung).toEqual(initial.lung);expect(pin.cursor[0]).toBeCloseTo(60+phase*.15,4);expect(pin.cursor[1]).toBeCloseTo(174-(g.sacs[0]-.78)/.22*112,3);
  if(phase%1000===0){await expect(page.locator('[data-breath-match-size]')).toBeDisabled();await seek(page,phase===4000?0:phase+500);}else{await page.locator('[data-breath-match-size]').click();const matching=await geometry(page);expect(matching.sacs[0]).toBeCloseTo(g.sacs[0],6);expect(matching.phase).toBe(Math.floor(phase/2000)*2000+2000-phase%2000);expect(matching.packet).not.toEqual(g.packet);expect(matching.tracheaArrow).not.toBe(g.tracheaArrow);await expect(page.locator('[data-breath-comparison-note]')).toContainText('one phase expands');}
  const later=await comparison(page);expect(later.sacs).toEqual(pin.sacs);expect(later.packet).toEqual(pin.packet);expect((await geometry(page)).lung).toEqual(initial.lung);checks.push({phase,pin,current:await geometry(page)});await page.locator('[data-breath-restore]').click();expect((await geometry(page)).phase).toBe(phase);
 }
 await page.locator('[data-breath-clear]').click();await expect(page.locator('[data-breath-pin]')).toBeFocused();await expect(page.locator('[data-breath-reference]')).toHaveCount(0);expect(await progress(page)).toEqual(before);expect(errors).toEqual([]);writeFileSync(resolve(output,'breathing-geometry.json'),JSON.stringify(checks,null,2));
});
async function svgPoint(page:Page,phase:number){return page.locator('[data-breath-rhythm]').evaluate((svg:SVGSVGElement,phase)=>{const p=svg.createSVGPoint();p.x=60+phase*.15;p.y=120;const q=p.matrixTransform(svg.getScreenCTM()!);return{x:q.x,y:q.y};},phase);}
test('rhythm scrubbing, cancellation and pinned comparisons work with keyboard and touch',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);const graph=page.locator('[data-breath-rhythm]'),layouts:any[]=[];await graph.focus();await page.keyboard.press('End');expect((await geometry(page)).phase).toBe(4000);await page.keyboard.press('Home');await page.keyboard.press('Shift+ArrowRight');expect((await geometry(page)).phase).toBe(100);
 await graph.scrollIntoViewIfNeeded();let a=await svgPoint(page,500),b=await svgPoint(page,2750);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});expect((await geometry(page)).phase).toBe(2750);await page.keyboard.press('Escape');await page.mouse.up();expect((await geometry(page)).phase).toBe(100);
 for(const [viewport,host] of [[1280,1100],[1280,500],[390,390]]){
  await sizing(page,viewport,host);await seek(page,250);await page.locator('[data-breath-pin]').click();await page.locator('[data-breath-match-size]').click();
  const layout=await page.locator('[data-breath-timeline]').evaluate(n=>({overflow:document.documentElement.scrollWidth,controls:[...n.querySelectorAll('button')].map(q=>q.getBoundingClientRect().height),labels:[...n.querySelectorAll('svg text')].map(q=>q.getBoundingClientRect().height)}));expect(layout.overflow).toBeLessThanOrEqual(viewport);layout.controls.forEach(v=>expect(v).toBeGreaterThanOrEqual(44));layout.labels.forEach(v=>expect(v).toBeGreaterThan(9));
  const axe=await page.evaluate(async()=>(await (window as any).axe.run('[data-breath-timeline]',{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));expect(axe).toEqual([]);layouts.push({viewport,host,...layout,axe});
  if(host!==500){await page.setViewportSize({width:viewport,height:4000});await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});const panel=page.locator('[data-birdlab-breath-study]');await panel.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const box=(await panel.boundingBox())!;const path=resolve(output,'breathing-'+host+'.png');await panel.screenshot({path,animations:'disabled',scale:'css'});const png=readPng(readFileSync(path));expect(Math.abs(png.height-box.height)).toBeLessThanOrEqual(2);await page.setViewportSize({width:viewport,height:1000});}
 }
 await seek(page,500);await graph.scrollIntoViewIfNeeded();a=await svgPoint(page,500);b=await svgPoint(page,2250);const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...a}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...b}]});await expect(page.locator('#birdlab-breath-phase')).toHaveValue('2250');await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator('#birdlab-breath-phase')).toHaveValue('500');await cdp.detach();
 await page.locator('[data-breath-play]').click();await expect(page.locator('[data-birdlab-breath-study]')).toHaveAttribute('data-playing','true');await page.locator('[data-breath-pin]').click();await expect(page.locator('[data-birdlab-breath-study]')).toHaveAttribute('data-playing','false');expect(errors).toEqual([]);writeFileSync(resolve(output,'breathing-layout.json'),JSON.stringify(layouts,null,2));
});

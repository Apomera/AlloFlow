import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ timeout: 180000, retries: 0 });
const output = resolve(process.env.AVIAN_NESTBOX_REPORT || 'reports/avian-simulations-round32-2026-10-22/bird');
const root = '[data-nestbox-study]', scene = '[data-box-scene]';
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document' });
const specs: Record<string, number[]> = {
  'Eastern Bluebird': [4,8,1.5,1.5], 'Tree Swallow': [5,6,1.5,1.5],
  'Black-capped Chickadee': [4,8,1.125,1.125], 'White-breasted Nuthatch': [4,8,1.25,1.25],
  'Tufted Titmouse': [4,8,1.25,1.25], 'Wood Duck': [10,24,4,3],
  'Hooded Merganser': [10,24,4,4], 'Northern Flicker': [7,18,2.5,2.5],
  'American Kestrel': [8,14,3,3], 'Eastern Screech-Owl': [8,14,3,3],
  'House Wren': [4,7,1,1], 'Purple Martin': [6,6,2,2]
};
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { birdLab: { view: 'nestbox', blXp: 23, blLifeList: {}, blBadges: {} } }, undefined, { expectCanvas: false });
  await expect(page.locator(root)).toBeVisible(); return errors;
}
const near = (a: number, b: number, precision = 4) => expect(a).toBeCloseTo(b, precision);
async function verify(page: Page, name: string, percent: number, saved?: { name: string; percent: number }) {
  await expect(page.locator(root)).toHaveAttribute('data-species', name);
  const [side, height, ew, eh] = specs[name];
  await expect(page.locator(scene)).toHaveAttribute('aria-valuenow', String(percent));
  const actual = await page.locator(root).evaluate(n => {
    const svg = n.querySelector('[data-box-scene]') as SVGSVGElement;
    const points = (sel: string) => { const p = n.querySelector(sel) as SVGPolygonElement; return p ? [...p.points].map(v => [v.x, v.y]) : null; };
    const hole = n.querySelector('[data-box-entrance=current]') as SVGEllipseElement;
    return { scale: Number(n.getAttribute('data-scale')), plane: points('[data-box-plane]')!, saved: points('[data-box-reference-plane]'),
      readings: Object.fromEntries([...n.querySelectorAll('[data-box-reading]')].map(r => [r.getAttribute('data-box-reading'), r.querySelector('strong')!.textContent])),
      hole: [hole.rx.baseVal.value, hole.ry.baseVal.value], texts: [...svg.querySelectorAll('text')].map(t => ({ display: getComputedStyle(t).display, size: t.getBoundingClientRect().height })) };
  });
  // Recover actual floor edges and vertical plane position from native SVG geometry.
  // The four corners' mean cancels the isometric horizontal contribution.
  const planeHeight = (450 - actual.plane.reduce((a, p) => a + p[1], 0) / 4) / actual.scale;
  near(planeHeight, height * percent / 100);
  near((actual.plane[1][0] - actual.plane[0][0]) / actual.scale / .82, side);
  near((actual.plane[1][1] - actual.plane[0][1]) / actual.scale / .32, side);
  near(actual.hole[0] / 20, ew); near(actual.hole[1] / 20, eh);
  const numeric = (s: any) => Number(s.replaceAll(',', '').split(' ')[0]);
  near(numeric(actual.readings.height), height * percent / 100, 2);
  near(numeric(actual.readings.area), side * side, 2);
  near(numeric(actual.readings.capacity), side * side * height, 2);
  near(numeric(actual.readings.volume), side * side * height * percent / 100, 2);
  if (saved) {
    const [ss, sh] = specs[saved.name]; expect(actual.saved).toHaveLength(4);
    near((450 - actual.saved!.reduce((a, p) => a + p[1], 0) / 4) / actual.scale, sh * saved.percent / 100);
    near((actual.saved![1][0] - actual.saved![0][0]) / actual.scale / .82, ss);
  }
  actual.texts.forEach(t => { expect(t.display).not.toBe('none'); expect(t.size).toBeGreaterThan(9); });
  return { name, percent, ...actual };
}
test('all twelve interiors, moving planes, ellipse entrances and full saved comparisons use real geometry', async ({ page }) => {
  const errors = await mount(page), checks: any[] = [];
  await page.locator('[data-box-level]').fill('37.5'); await page.locator('[data-box-keep]').click();
  for (const name of Object.keys(specs)) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.locator('[data-box-level]').fill('62.5');
    checks.push(await verify(page, name, 62.5, { name: 'Eastern Bluebird', percent: 37.5 }));
  }
  await page.locator('[data-box-restore]').click();
  await verify(page, 'Eastern Bluebird', 37.5, { name: 'Eastern Bluebird', percent: 37.5 });
  for (const [name, value] of [['Floor',0], ['Ceiling',100], ['Halfway',50]] as const) { await page.getByRole('button', { name, exact: true }).click(); await verify(page, 'Eastern Bluebird', value, { name: 'Eastern Bluebird', percent: 37.5 }); }
  await page.locator('[data-box-clear]').click(); await expect(page.locator('[data-box-keep]')).toBeFocused(); await expect(page.locator('[data-box-reference-plane]')).toHaveCount(0);
  expect(await page.evaluate(() => { const d = (window as any).__toolData.birdLab; return [d.blXp,d.blLifeList,d.blBadges]; })).toEqual([23,{},{}]);
  expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(output, 'geometry.json'), JSON.stringify(checks, null, 2));
});
test('native drag, cancellation, keyboard and touch work across desktop, embedded and phone layouts', async ({ page }) => {
  const errors = await mount(page);
  await page.locator(scene).focus(); await page.keyboard.press('End'); await expect(page.locator(scene)).toHaveAttribute('aria-valuenow', '100');
  await page.keyboard.press('Shift+ArrowDown'); await expect(page.locator(scene)).toHaveAttribute('aria-valuenow', '90');
  await page.keyboard.press('Home'); await expect(page.locator(scene)).toHaveAttribute('aria-valuenow', '0');
  await page.locator('[data-box-level]').fill('50');
  await page.locator(scene).scrollIntoViewIfNeeded(); let box = (await page.locator(scene).boundingBox())!;
  const start = { x: box.x+box.width*.5, y: box.y+box.height*.5 };
  await page.mouse.move(start.x,start.y); await page.mouse.down(); await page.mouse.move(start.x,start.y-35,{steps:4});
  expect(Number(await page.locator(scene).getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  await page.keyboard.press('Escape'); await page.mouse.up(); await expect(page.locator(scene)).toHaveAttribute('aria-valuenow','50');
  await page.mouse.move(start.x,start.y); await page.mouse.down(); await page.mouse.move(start.x,start.y-40,{steps:4}); await page.mouse.up();
  expect(Number(await page.locator(scene).getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  const layouts: any[] = [];
  for (const [viewport,host] of [[1280,1100],[1280,500],[390,390]]) {
    await page.setViewportSize({width:viewport,height:1200});
    await page.locator('#wrap').evaluate((n: HTMLElement,w) => { n.style.width=w+'px';n.style.maxWidth='100%'; },host);
    await page.getByRole('button',{name:'Eastern Bluebird',exact:true}).click(); await page.locator('[data-box-level]').fill('50'); await page.locator('[data-box-keep]').click();
    await page.getByRole('button',{name:'Wood Duck',exact:true}).click(); await page.locator('[data-box-level]').fill('62.5');
    await verify(page,'Wood Duck',62.5,{name:'Eastern Bluebird',percent:50});
    const layout=await page.locator(root).evaluate(n=>({width:n.getBoundingClientRect().width,doc:document.documentElement.scrollWidth,controls:[...n.querySelectorAll('button,input')].map(c=>({height:c.getBoundingClientRect().height,left:c.getBoundingClientRect().left,right:c.getBoundingClientRect().right}))}));
    expect(layout.doc).toBeLessThanOrEqual(viewport); layout.controls.forEach(c=>{expect(c.height).toBeGreaterThanOrEqual(44);expect(c.left).toBeGreaterThanOrEqual(0);expect(c.right).toBeLessThanOrEqual(viewport);});
    const axe=await page.evaluate(async()=> (await (window as any).axe.run({include:['[data-nestbox-study]']},{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})));
    expect(axe).toEqual([]);layouts.push({viewport,host,...layout,axe});
    if(host===390||host===1100){
      await page.setViewportSize({width:viewport,height:3200}); await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
      await page.locator(root).evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)p.scrollTop=0;window.scrollTo(0,0);n.scrollIntoView({block:'center',behavior:'instant'});});
      const bounds=(await page.locator(root).boundingBox())!;expect(bounds.y).toBeGreaterThanOrEqual(0);expect(bounds.y+bounds.height).toBeLessThanOrEqual(3200);
      const path=resolve(output,`nestbox-${host}.png`);await page.locator(root).screenshot({path,animations:'disabled',scale:'css'});
      const png=readPng(readFileSync(path));expect(Math.abs(png.width-bounds.width)).toBeLessThanOrEqual(2);expect(Math.abs(png.height-bounds.height)).toBeLessThanOrEqual(2);
      await page.setViewportSize({width:viewport,height:1200});
    }
  }
  await page.locator('[data-box-level]').fill('50');await page.locator(scene).scrollIntoViewIfNeeded();box=(await page.locator(scene).boundingBox())!;
  const cdp=await page.context().newCDPSession(page),touch={id:71,x:box.x+box.width*.5,y:box.y+box.height*.5};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,y:touch.y-30}]});
  expect(Number(await page.locator(scene).getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect(page.locator(scene)).toHaveAttribute('aria-valuenow','50');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touch,y:touch.y-25}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect(Number(await page.locator(scene).getAttribute('aria-valuenow'))).toBeGreaterThan(50);await cdp.detach();
  expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  writeFileSync(resolve(output,'interaction-layout.json'),JSON.stringify(layouts,null,2));
});

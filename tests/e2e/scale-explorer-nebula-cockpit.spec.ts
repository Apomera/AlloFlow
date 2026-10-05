import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const repo = path.resolve('.');
const out = path.resolve(process.env.SCALE_COCKPIT_REPORT_DIR || 'reports/scale-explorer-nebula-cockpit');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100, layout: 'document',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `window.__guideEncodes=0;const png=HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL=function(){if(this.width===96&&this.height===96)window.__guideEncodes++;return png.apply(this,arguments);};
    const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__guideCamera=c;return render.apply(this,arguments);};return r;}});`
});
type Pose = { x: number; y: number; z: number; heading: number; pitch: number; travel: number };
type Point = { x: number; z: number };
const canvas = (page: Page) => page.locator('[data-atlas-ready]');
const chart = (page: Page) => page.locator('[data-nebula-chart-map]');
const nav = (page: Page) => page.getByRole('region', { name: 'Nebula navigation', exact: true });
const guide = (page: Page) => page.locator('[data-nebula-world-destination]');
const cue = (page: Page) => page.locator('[data-nebula-destination-cue]');
const toggle = (page: Page) => page.getByRole('button', { name: 'Destination guide', exact: true });
const look = (page: Page) => page.getByRole('button', { name: 'Look toward destination', exact: true });
const fly = (page: Page) => page.locator('[data-nebula-chart-fly]');
const pose = async (page: Page): Promise<Pose> => JSON.parse((await canvas(page).getAttribute('data-atlas-nebula-position'))!);
const progress = async (page: Page) => Number(await canvas(page).getAttribute('data-atlas-nebula-progress'));
const horizontal = (p: Pose) => ({ x: p.x, y: p.y, z: p.z, travel: p.travel });
const encodes = (page: Page) => page.evaluate(() => (window as any).__guideEncodes);
function save(name: string, value: unknown) { writeFileSync(path.join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }

async function mount(page: Page, phone = false) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (phone) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      return type === 'webgl2' ? null : original.apply(this, [type, ...args] as any);
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  const tools = page.getByRole('button', { name: 'Show all tools', exact: true });
  if (await tools.count()) await tools.click();
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('orion-nebula');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'orion-nebula');
  await expect(page.getByRole('button', { name: 'Flight cockpit', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active');
  await expect(page.getByRole('button', { name: 'Flight cockpit', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.locator('[data-nebula-map-toggle]').click();
  await expect(chart(page)).toHaveAttribute('role', 'application');
  await expect(toggle(page)).toHaveCount(0);
  await expect(guide(page).locator('..')).toHaveAttribute('aria-hidden', 'true');
  await expect(cue(page).locator('..')).toHaveAttribute('aria-hidden', 'true');
  await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination', /.+/);
  return errors;
}
async function selected(page: Page): Promise<Point | null> {
  const mark = page.locator('[data-nebula-chart-selection]');
  if (!await mark.count()) return null;
  const t = (await mark.getAttribute('transform'))!.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/ig)!.map(Number);
  return { x: (t[0] - 100) / 200 * 33.6, z: (t[1] - 100) / 200 * 33.6 };
}
async function choose(page: Page, point: Point, touch = false) {
  await chart(page).scrollIntoViewIfNeeded();
  const target = await chart(page).evaluate((element, p) => {
    const svg = element as SVGSVGElement, v = svg.createSVGPoint();
    v.x = 100 + p.x / 33.6 * 200; v.y = 100 + p.z / 33.6 * 200;
    const s = v.matrixTransform(svg.getScreenCTM()!); return { x: s.x, y: s.y };
  }, point);
  if (touch) await page.touchscreen.tap(target.x, target.y); else await page.mouse.click(target.x, target.y);
  await expect.poll(async () => { const p = await selected(page); return p ? Math.max(Math.abs(p.x - point.x), Math.abs(p.z - point.z)) : Infinity; }).toBeLessThan(touch ? .14 : 1e-5);
  return (await selected(page))!;
}
async function pauseWithChart(page: Page) {
  await chart(page).press('Space');
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'paused');
}
async function midCourse(page: Page) {
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-atlas-ready]') as HTMLElement, p = Number(c.dataset.atlasNebulaProgress);
    return c.dataset.atlasNebulaCourse === 'moving' && p > .04 && p < .8;
  }, null, { timeout: 30000, polling: 50 });
}
async function projection(page: Page, target: Point, targetY: number) {
  return page.evaluate(({ target, targetY }) => {
    const w = window as any, T = w.THREE, camera = w.__guideCamera;
    const record = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    let root: any; record.scene.traverse((n: any) => { if (n.userData.itemId === 'orion-nebula') root = n; });
    const world = root.userData.model.localToWorld(new T.Vector3(target.x / 24, targetY / 24, target.z / 24));
    const cameraPoint = world.clone().applyMatrix4(camera.matrixWorldInverse), ndc = world.clone().project(camera);
    const cv = document.querySelector('[data-atlas-ready]') as HTMLCanvasElement, box = cv.getBoundingClientRect();
    const node = document.querySelector('[data-nebula-world-destination]') as HTMLElement;
    const p = JSON.parse(cv.dataset.atlasNebulaPosition!);
    return { cameraZ: cameraPoint.z, ndc: ndc.toArray(), projected: { x: (ndc.x * .5 + .5) * box.width, y: (-ndc.y * .5 + .5) * box.height }, canvas: { width: box.width, height: box.height, top: box.top, bottom: box.bottom }, transform: node.style.transform, hidden: node.hidden, state: cv.dataset.atlasNebulaDestination, range: Math.hypot(target.x - p.x, targetY - p.y, target.z - p.z), text: node.textContent, type: record.type, renders: record.renders, draws: record.draws };
  }, { target, targetY });
}
async function assertProjected(page: Page, target: Point, targetY: number) {
  await canvas(page).scrollIntoViewIfNeeded();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-destination', 'in-view');
  await expect(guide(page)).toHaveJSProperty('hidden', false);
  const result = await projection(page, target, targetY);
  expect(result.cameraZ).toBeLessThan(0); expect(result.ndc[2]).toBeGreaterThan(-1); expect(result.ndc[2]).toBeLessThan(1);
  const offset = result.transform.match(/translate\(([-+\d.]+)px,\s*([-+\d.]+)px\)/)!;
  expect(offset).not.toBeNull(); expect(Math.abs(Number(offset[1]) - result.projected.x)).toBeLessThan(.11); expect(Math.abs(Number(offset[2]) - result.projected.y)).toBeLessThan(.11);
  expect(result.text).toContain(result.range.toFixed(2) + ' ly'); expect(result.text).toContain('Position reference');
  await expect(page.locator('[data-nebula-destination-bearing]')).toContainText(result.range.toFixed(2) + ' ly');
  return result;
}
async function framesStart(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__guideFrames = []; w.__guideCapture = true;
    function capture() { if (!w.__guideCapture) return; const c = document.querySelector('[data-atlas-ready]') as HTMLElement; if (c?.dataset.atlasNebulaPosition) w.__guideFrames.push({ pose: JSON.parse(c.dataset.atlasNebulaPosition), progress: Number(c.dataset.atlasNebulaProgress), course: c.dataset.atlasNebulaCourse, orienting: c.dataset.atlasNebulaOrienting, destination: c.dataset.atlasNebulaDestination }); w.__guideFrame = requestAnimationFrame(capture); } capture();
  });
}
async function framesStop(page: Page): Promise<{ pose: Pose; progress: number; course?: string; orienting?: string; destination?: string }[]> {
  return page.evaluate(() => { const w = window as any; w.__guideCapture = false; cancelAnimationFrame(w.__guideFrame); return w.__guideFrames; });
}
function exactArrival(arrived: Pose, departure: Pose, target: Point) {
  expect(arrived.x).toBeCloseTo(target.x, 8); expect(arrived.z).toBeCloseTo(target.z, 8); expect(arrived.y).toBe(departure.y); expect(arrived.travel).toBe(departure.travel); expect(arrived.pitch).toBe(0);
}
async function capture(page: Page, name: string) {
  await page.locator('.sx-viewport').screenshot({ path: path.join(out, name + '-viewport.png') });
  await page.locator('.sx-stage').screenshot({ path: path.join(out, name + '-stage.png') });
  const gl = await harness.glPixels(page); expect(gl).not.toBeNull(); expect(looksBlank(gl!)).toBe(false); writeFileSync(path.join(out, name + '-gl.png'), gl!.png);
}

test.beforeAll(async () => {
  mkdirSync(out, { recursive: true });
  expect(process.env.STEM_GL_SUBSTITUTE || '').toBe('');
  const sha = (file: string) => createHash('sha256').update(readFileSync(repo + '/' + file)).digest('hex');
  save('cockpit-browser-source', { checkedAt: new Date().toISOString(), sourceSha256: sha('stem_lab/stem_tool_scaleexplorer.js'), desktopSha256: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'), substitution: null });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await page.evaluate(() => { const w = window as any; w.__guideCapture = false; if (w.__guideFrame) cancelAnimationFrame(w.__guideFrame); });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

const cockpit = (page: Page) => page.getByRole('button', { name: 'Flight cockpit', exact: true });
const panel = (page: Page) => page.locator('[data-nebula-cockpit-panel]');
const stage = (page: Page) => page.locator('.sx-stage');
const pauseTravel = (page: Page) => page.getByRole('button', { name: 'Pause travel', exact: true });
async function alignStage(page: Page) {
  await stage(page).evaluate(node => window.scrollTo({ top: node.getBoundingClientRect().top + scrollY, behavior: 'instant' as ScrollBehavior }));
  await page.waitForTimeout(100);
}
async function layout(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => { const r = document.querySelector(selector)!.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const p=document.querySelector('[data-nebula-cockpit-panel]') as HTMLElement;
    return { screen: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth, scroll: scrollY, stage: rect('.sx-stage'), scene: rect('.sx-viewport'), panel: rect('[data-nebula-cockpit-panel]'), chart: rect('[data-nebula-chart-map]'), panelScroll: p.scrollTop, panelClient: p.clientHeight, panelTotal: p.scrollHeight, panelOverflow: getComputedStyle(p).overflowY };
  });
}
async function keepNodes(page: Page) {
  await page.evaluate(() => { (window as any).__cockpitNodes={ canvas:document.querySelector('[data-atlas-ready]'), nav:document.querySelector('[data-nebula-cockpit-panel]'), chart:document.querySelector('[data-nebula-chart-map]') }; });
}
async function sameNodes(page: Page) {
  return page.evaluate(() => { const n=(window as any).__cockpitNodes; return { canvas:n.canvas===document.querySelector('[data-atlas-ready]'), nav:n.nav===document.querySelector('[data-nebula-cockpit-panel]'), chart:n.chart===document.querySelector('[data-nebula-chart-map]'), navigationCount:document.querySelectorAll('[aria-label="Nebula navigation"]').length }; });
}

async function twoFingerToggle(page: Page) {
  await canvas(page).evaluate(n=>{const w=window as any;w.__cockpitPointers=[];n.addEventListener('pointerdown',(event:Event)=>w.__cockpitPointers.push((event as PointerEvent).pointerId));});
  const box=(await canvas(page).boundingBox())!,touches=[{x:box.x+box.width*.35,y:box.y+box.height*.68,id:1},{x:box.x+box.width*.68,y:box.y+box.height*.68,id:2}],session=await page.context().newCDPSession(page),before=await pose(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});
  const captureBefore=await canvas(page).evaluate((n:HTMLCanvasElement)=>{const ids=(window as any).__cockpitPointers;return {ids,captured:ids.map((id:number)=>n.hasPointerCapture(id))};}); expect(captureBefore.ids).toHaveLength(2); expect(captureBefore.captured).toEqual([true,true]);
  await cockpit(page).evaluate((n:HTMLButtonElement)=>n.click()); await expect(cockpit(page)).toHaveAttribute('aria-pressed','false');
  const captureAfter=await canvas(page).evaluate((n:HTMLCanvasElement)=>{const ids=(window as any).__cockpitPointers;return {ids,captured:ids.map((id:number)=>n.hasPointerCapture(id))};}); expect(captureAfter.captured).toEqual([false,false]); await expect(canvas(page)).toBeFocused();
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[touches[0]]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touches[0],x:touches[0].x+24,y:touches[0].y-12}]}); await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await session.detach();
  await page.waitForTimeout(100); const after=await pose(page); expect(after).toEqual(before); await cockpit(page).evaluate((n:HTMLButtonElement)=>n.click()); await expect(cockpit(page)).toHaveAttribute('aria-pressed','true'); return {before,after,captureBefore,captureAfter};
}

// Toggle through the actual accessible control and verify that resize never rebuilds navigation or its canvas.
test('cockpit keeps the same navigation, chart, focus and paused course while moving the scene beside its bounded panel', async ({ page }) => {
  const errors=await mount(page), initial=await pose(page), target=await choose(page,{x:3.5,z:-2.25});
  await fly(page).click(); await midCourse(page); await pauseWithChart(page);
  const paused=await pose(page), pausedProgress=await progress(page), pathBefore=await page.locator('[data-nebula-course-path]').getAttribute('d'), targetBefore=await page.locator('[data-nebula-chart-course-target]').getAttribute('transform');
  const defaultGuide=await assertProjected(page,target,initial.y), before=await layout(page); await keepNodes(page);
  await chart(page).focus(); await expect(chart(page)).toBeFocused();
  await cockpit(page).evaluate((button: HTMLButtonElement)=>button.click());
  await expect(cockpit(page)).toHaveAttribute('aria-pressed','true'); await expect(stage(page)).toHaveClass(/sx-stage-cockpit/); await expect(stage(page)).toHaveAttribute('data-nebula-cockpit','on');
  await expect(chart(page)).toBeFocused();
  expect(await sameNodes(page)).toEqual({canvas:true,nav:true,chart:true,navigationCount:1});
  expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(pausedProgress); expect(await selected(page)).toEqual(target);
  expect(await page.locator('[data-nebula-course-path]').getAttribute('d')).toBe(pathBefore); expect(await page.locator('[data-nebula-chart-course-target]').getAttribute('transform')).toBe(targetBefore);
  const after=await layout(page); expect(after.scene.right).toBeLessThanOrEqual(after.panel.left+1); expect(Math.abs(after.scene.top-after.panel.top)).toBeLessThan(2); expect(after.scene.width).toBeGreaterThan(400); expect(after.panel.width).toBeGreaterThan(280); expect(after.panelTotal).toBeGreaterThan(after.panelClient); expect(after.panelOverflow).toBe('auto'); expect(after.documentWidth).toBeLessThanOrEqual(after.screen.width+1);
  const resizedGuide=await assertProjected(page,target,initial.y); expect(resizedGuide.canvas.width).toBeLessThan(defaultGuide.canvas.width); expect(resizedGuide.range).toBe(defaultGuide.range);
  await capture(page,'cockpit-desktop');
  await page.locator('.sx-explorer').evaluate(async node=>await node.requestFullscreen());
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  const fullscreenLayout=await layout(page); expect(fullscreenLayout.scene.right).toBeLessThanOrEqual(fullscreenLayout.panel.left+1); expect(fullscreenLayout.documentWidth).toBeLessThanOrEqual(fullscreenLayout.screen.width+1); expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(pausedProgress); expect(await sameNodes(page)).toEqual({canvas:true,nav:true,chart:true,navigationCount:1});
  const fullscreenGuide=await assertProjected(page,target,initial.y); await page.evaluate(async()=>await document.exitFullscreen());
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);

  const help=page.locator('[data-nebula-flight-help]'), summary=help.locator('summary');
  await expect(help).not.toHaveAttribute('open',''); await summary.press('Enter'); await expect(help).toHaveAttribute('open',''); await expect(summary).toBeFocused(); await expect(help).toContainText('Drag to look.'); await expect(help).toContainText('saved observations reopen at your exact position');
  expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(pausedProgress);
  await summary.press('Enter'); await expect(help).not.toHaveAttribute('open','');
  await cockpit(page).click(); await expect(summary).toBeFocused(); await expect(cockpit(page)).toHaveAttribute('aria-pressed','false'); await expect(stage(page)).not.toHaveClass(/sx-stage-cockpit/); await expect(stage(page)).toHaveAttribute('data-nebula-cockpit','off');
  expect(await sameNodes(page)).toEqual({canvas:true,nav:true,chart:true,navigationCount:1}); expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(pausedProgress); expect(await selected(page)).toEqual(target);
  const restoredGuide=await assertProjected(page,target,initial.y); expect(restoredGuide.canvas.width).toBe(defaultGuide.canvas.width);
  save('cockpit-desktop-layout',{initial,target,paused,pausedProgress,before,after,defaultGuide,resizedGuide,fullscreenLayout,fullscreenGuide,restoredGuide}); expect(errors).toEqual([]);
});

test('cockpit toolbar pauses the live chart course and the camera continues drawing beside the console through resume', async ({ page }) => {
  const errors=await mount(page), departure=await pose(page); await cockpit(page).click(); await alignStage(page);
  const target=await choose(page,{x:3.5,z:-2.25}), start=await pose(page); await keepNodes(page); await framesStart(page); await fly(page).click(); await midCourse(page);
  const activePath=await page.locator('[data-nebula-course-path]').getAttribute('d'), activeTarget=await page.locator('[data-nebula-chart-course-target]').getAttribute('transform');
  await pauseTravel(page).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course','paused'); await expect(pauseTravel(page)).toBeFocused();
  const paused=await pose(page), pausedProgress=await progress(page); await page.waitForTimeout(200); expect(await pose(page)).toEqual(paused); expect(await progress(page)).toBe(pausedProgress);
  await look(page).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-orienting','false',{timeout:20000}); const turned=await pose(page); expect(horizontal(turned)).toEqual(horizontal(paused));
  const projected=await assertProjected(page,target,departure.y); const before=await harness.glScene(page); expect(before).not.toBeNull();
  const resume=nav(page).getByRole('button',{name:'Resume passage',exact:true}); await resume.scrollIntoViewIfNeeded(); const consoleLayout=await layout(page);
  expect(consoleLayout.scene.top).toBeGreaterThanOrEqual(-1); expect(consoleLayout.scene.bottom).toBeLessThanOrEqual(consoleLayout.screen.height+1);
  await resume.click(); await midCourse(page); await expect(canvas(page)).not.toBeFocused();
  expect(await page.locator('[data-nebula-course-path]').getAttribute('d')).toBe(activePath); expect(await page.locator('[data-nebula-chart-course-target]').getAttribute('transform')).toBe(activeTarget);
  await pauseTravel(page).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course','paused'); const moved=await pose(page); expect(Math.hypot(moved.x-paused.x,moved.z-paused.z)).toBeGreaterThan(.001);
  const after=await harness.glScene(page); expect(after!.renders).toBeGreaterThan(before!.renders); expect(after!.draws).toBeGreaterThan(before!.draws); expect(await sameNodes(page)).toEqual({canvas:true,nav:true,chart:true,navigationCount:1});
  const map=await page.locator('[data-nebula-map-point]').getAttribute('transform'); expect(map).toContain('translate(');
  await nav(page).getByRole('button',{name:'Resume passage',exact:true}).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course','arrived',{timeout:45000});
  const arrived=await pose(page); exactArrival(arrived,start,target); const frames=await framesStop(page); const moving=frames.filter(f=>f.course==='moving'); expect(moving.length).toBeGreaterThan(3); moving.forEach(f=>expect(f.pose.y).toBe(start.y));
  await expect(cockpit(page)).toHaveAttribute('aria-pressed','true'); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-destination','arrived');
  await capture(page,'cockpit-desktop-arrived'); save('cockpit-desktop-journey',{departure,start,target,paused,pausedProgress,turned,projected,consoleLayout,before,after,moved,map,arrived,frames}); expect(errors).toEqual([]);
});

test('320px WebGL 1 cockpit scrolls its touch panel with the scene visible and keeps keyboard, reduced-motion and exit behavior', async ({ page }) => {
  const errors=await mount(page,true); await cockpit(page).click(); await alignStage(page); await chart(page).scrollIntoViewIfNeeded();
  const initial=await pose(page), target=await choose(page,{x:2.52,z:6.72},true); const twoFinger=await twoFingerToggle(page); await alignStage(page); await chart(page).scrollIntoViewIfNeeded(); const before=await layout(page); expect((await harness.glContexts(page)).filter(c=>!c.lost)[0].type).toBe('webgl');
  expect(before.documentWidth).toBeLessThanOrEqual(321); expect(before.scene.bottom).toBeLessThanOrEqual(before.panel.top+1); expect(before.scene.height).toBeGreaterThan(160); expect(before.scene.top).toBeGreaterThanOrEqual(-1); expect(before.panel.bottom).toBeLessThanOrEqual(before.screen.height+1); expect(before.chart.top).toBeGreaterThanOrEqual(before.panel.top-1); expect(before.chart.bottom).toBeLessThanOrEqual(before.panel.bottom+1); expect(before.panelTotal).toBeGreaterThan(before.panelClient);
  const box=(await chart(page).boundingBox())!,cdp=await page.context().newCDPSession(page), x=box.x+box.width*.75,y=box.y+box.height*.8;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]}); for(let i=1;i<=5;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*24}]});await page.waitForTimeout(30);} await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
  await expect.poll(()=>panel(page).evaluate(n=>n.scrollTop)).toBeGreaterThan(before.panelScroll+20); const afterTouch=await layout(page); expect(afterTouch.scroll).toBeCloseTo(before.scroll,1); expect(afterTouch.scene).toEqual(before.scene); expect(await selected(page)).toEqual(target); expect(await pose(page)).toEqual(initial);
  await chart(page).press('Home'); await chart(page).press('Shift+ArrowUp'); await chart(page).press('ArrowRight'); const keyTarget=(await selected(page))!; expect(keyTarget.x).toBeCloseTo(initial.x+.25,8); expect(keyTarget.z).toBeCloseTo(initial.z-1,8); await expect(chart(page)).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'}); await chart(page).press('Enter'); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course','arrived'); await expect(chart(page)).toBeFocused(); const arrived=await pose(page); exactArrival(arrived,initial,keyTarget);
  const sizes=await page.locator('[data-nebula-cockpit-bar] button,[data-nebula-cockpit-panel] button,[data-nebula-flight-help] summary').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {label:n.getAttribute('aria-label')||n.textContent,height:r.height,width:r.width};})); sizes.filter(s=>s.height>0).forEach(s=>expect(s.height,s.label||'button').toBeGreaterThanOrEqual(44));
  await chart(page).scrollIntoViewIfNeeded(); await alignStage(page); await capture(page,'cockpit-phone');
  await nav(page).getByRole('button',{name:'Whole nebula',exact:true}).click(); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-inside',/.+/); await expect(cockpit(page)).toHaveCount(0); await expect(stage(page)).not.toHaveClass(/sx-stage-cockpit/); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course',/.+/);
  await page.getByRole('button',{name:'Enter the nebula',exact:true}).click(); await expect(cockpit(page)).toHaveAttribute('aria-pressed','false'); await expect(stage(page)).not.toHaveClass(/sx-stage-cockpit/); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course',/.+/); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-destination',/.+/); await expect(fly(page)).toBeDisabled();
  await cockpit(page).click(); await alignStage(page); const reentered=await layout(page); expect(reentered.scene.top).toBeGreaterThanOrEqual(-1); expect(reentered.panel.bottom).toBeLessThanOrEqual(reentered.screen.height+1); expect(reentered.documentWidth).toBeLessThanOrEqual(321);
  await page.getByRole('button',{name:'Reset camera',exact:true}).click(); await expect(cockpit(page)).toHaveCount(0); await page.getByRole('button',{name:'Enter the nebula',exact:true}).click(); await expect(cockpit(page)).toHaveAttribute('aria-pressed','false'); await expect(page.locator('[data-nebula-flight-help]')).toHaveAttribute('open',''); await expect(canvas(page)).not.toHaveAttribute('data-atlas-nebula-course',/.+/);
  save('cockpit-phone',{initial,target,twoFinger,before,afterTouch,keyTarget,arrived,sizes,reentered}); expect(errors).toEqual([]);
});

test('compact cockpit phone destination marker and text stay projected and separated from the direction cue', async ({ page }) => {
  const errors=await mount(page,true), departure=await pose(page); await cockpit(page).click(); await alignStage(page); const target=await choose(page,{x:2.52,z:6.72},true); await fly(page).click(); await midCourse(page); await pauseTravel(page).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course','paused');
  const paused=await pose(page), expectedHeading=(Math.atan2(target.x-paused.x,paused.z-target.z)*180/Math.PI+360)%360; await look(page).click(); await expect.poll(async()=>Math.abs(((await pose(page)).heading-expectedHeading+540)%360-180),{timeout:20000}).toBeLessThan(.001); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-orienting','false');
  const results:unknown[]=[];
  for(const height of [780,700]) {
    await page.setViewportSize({width:320,height}); await alignStage(page); await canvas(page).scrollIntoViewIfNeeded(); await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-destination','in-view'); await expect(guide(page)).toHaveJSProperty('hidden',false); const projected=await projection(page,target,departure.y); const client=await canvas(page).evaluate(n=>({width:n.clientWidth,height:n.clientHeight})),offset=projected.transform.match(/translate\(([-+\d.]+)px,\s*([-+\d.]+)px\)/)!;
    const clientProjection={x:(projected.ndc[0]*.5+.5)*client.width,y:(-projected.ndc[1]*.5+.5)*client.height}; expect(Math.abs(Number(offset[1])-clientProjection.x)).toBeLessThan(.11); expect(Math.abs(Number(offset[2])-clientProjection.y)).toBeLessThan(.11); expect(projected.cameraZ).toBeLessThan(0); expect(projected.ndc[2]).toBeGreaterThan(-1); expect(projected.ndc[2]).toBeLessThan(1);

    const geometry=await page.evaluate(()=>{const rect=(sel:string)=>{const r=document.querySelector(sel)!.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};const toolbar=rect('[data-nebula-cockpit-bar]'),viewport=rect('.sx-viewport'),label=rect('.sx-nebula-destination-label'),cue=rect('[data-nebula-destination-cue]'),diamond=rect('[data-nebula-world-destination]>i');const horizontal=Math.min(label.right,cue.right)-Math.max(label.left,cue.left),vertical=Math.min(label.bottom,cue.bottom)-Math.max(label.top,cue.top);return {toolbar,viewport,label,cue,diamond,overlap:horizontal>0&&vertical>0,horizontalOverlap:horizontal,verticalOverlap:vertical,gap:cue.top-label.bottom,documentWidth:document.documentElement.scrollWidth,screen:{width:innerWidth,height:innerHeight}};});
    results.push({height,projected,client,clientProjection,geometry}); save('cockpit-phone-guide-'+height,{departure,target,paused,expectedHeading,projected,client,clientProjection,geometry}); await capture(page,'cockpit-phone-guide-'+height);
    expect(geometry.documentWidth).toBeLessThanOrEqual(321); expect(geometry.toolbar.height).toBeLessThanOrEqual(120); expect(geometry.overlap,'projected label and direction cue at '+height+'px screen height').toBe(false);
  }
  save('cockpit-phone-guide',{departure,target,paused,expectedHeading,results}); expect(errors).toEqual([]);
});

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({ video: 'off', trace: 'off', hasTouch: true });
test.describe.configure({ timeout: 240_000, retries: 0 });
const report = resolve('reports/avian-simulations-round31-2026-10-22/bird');
const canvas = '[data-birdlab-3d-canvas]';
const ids = ['robin', 'chickadee', 'mourningDove', 'grouse', 'blueJay', 'northernCardinal', 'darkEyedJunco', 'tuftedTitmouse', 'easternTowhee', 'americanGoldfinch', 'easternBluebird', 'whiteThroatedSparrow'];
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1100, height: 1000, appStyles: true, layout: 'document',
  probes: "window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){window.compassProbe={scene,camera,renderer:r};return render(scene,camera);};return r;};})();" });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function call(page: Page, method: string, value?: any): Promise<any> { return page.locator(canvas).evaluate((n: any, v) => n._birdlab3d[v.method](v.value), { method, value }); }
async function step(page: Page, count = 3) { await page.evaluate(n => { for (let i = 0; i < n; i++) (window as any).compassStep(); }, count); }
async function mount(page: Page) {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1280, height: 1000 });
  await page.addInitScript(() => {
    let time = 1000, id = 0; const pending = new Map();
    window.requestAnimationFrame = fn => { pending.set(++id, fn); return id; };
    window.cancelAnimationFrame = id => { pending.delete(id); };
    (window as any).compassStep = () => { time += 100; const work = [...pending.values()]; pending.clear(); work.forEach(fn => fn(time)); };
    (window as any).compassPending = () => pending.size;
  });
  await harness.mount(page, { birdLab: { view: 'observatory3d', blXp: 23, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.waitForFunction("!!document.querySelector('[data-birdlab-3d-canvas]')?._birdlab3d && !!window.compassProbe", null, { polling: 50 });
  await call(page, 'seek', 0); await step(page); return errors;
}
async function native(page: Page) {
  return page.evaluate(() => {
    const w = window as any, p = w.compassProbe, T = w.THREE;
    const state = (document.querySelector('[data-birdlab-3d-canvas]') as any)._birdlab3d.getState();
    const root = p.scene.getObjectByName('woodland-' + state.camera), forward = root.userData.speciesId ? 1 : -1;
    const local = p.camera.getWorldDirection(new T.Vector3()).negate().applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());
    const up = new T.Vector3(0, 1, 0).applyQuaternion(p.camera.quaternion).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());
    const resources: any[] = []; let hash = 2166136261;
    function bytes(a: any) { for (const b of new Uint8Array(a.buffer, a.byteOffset, a.byteLength)) hash = Math.imul(hash ^ b, 16777619); }
    root.traverse((n: any) => {
      resources.push([n.uuid, n.geometry?.uuid, ...(Array.isArray(n.material) ? n.material : n.material ? [n.material] : []).map((m: any) => m.uuid)]);
      for (const attr of Object.values(n.geometry?.attributes || {}) as any[]) bytes(attr.array);
      if (n.geometry?.index) bytes(n.geometry.index.array);
      bytes(new Float64Array([...n.position.toArray(), ...n.quaternion.toArray(), ...n.scale.toArray(), ...(n.morphTargetInfluences || []), n.visible ? 1 : 0]));
    });
    return { local: local.toArray(), up: up.toArray(), forward, hash: hash >>> 0, resources, state,
      live: !p.renderer.getContext().isContextLost(), calls: p.renderer.info.render.calls,
      programs: p.renderer.info.programs.every((s: any) => !s.diagnostics || s.diagnostics.runnable) };
  });
}
function near(a: number, b: number) { expect(a).toBeCloseTo(b, 7); }
function direction(n: any, azimuth: number, elevation: number) {
  const a = azimuth * Math.PI / 180, e = elevation * Math.PI / 180;
  const expected = [Math.sin(a) * Math.cos(e), Math.sin(e), n.forward * Math.cos(a) * Math.cos(e)];
  n.local.forEach((v: number, i: number) => near(v, expected[i]));
  near(n.local.reduce((s: number, v: number, i: number) => s + v * n.up[i], 0), 0);
  near(Math.hypot(...n.up), 1); expect(n.live && n.programs).toBe(true); expect(n.calls).toBeGreaterThan(0);
}
function frozen(a: any, b: any) {
  expect(b.hash).toBe(a.hash); expect(b.resources).toEqual(a.resources);
  for (const key of ['time', 'pose', 'wildlife', 'position', 'orientation', 'sightings']) expect(b.state[key], key).toEqual(a.state[key]);
}
async function compassMatches(page: Page, n: any) {
  const actual = n.state.residentInspection.orientation, a = actual.azimuth * Math.PI / 180, e = actual.elevation * Math.PI / 180;
  near(Math.asin(Math.max(-1, Math.min(1, n.local[1]))) * 180 / Math.PI, actual.elevation);
  direction(n, actual.azimuth, actual.elevation);
  const dot = await page.locator('[data-resident-compass-camera]').evaluate(n => [Number(n.getAttribute('cx')), Number(n.getAttribute('cy'))]);
  near(dot[0], 180 + 85 * Math.sin(a) * Math.cos(e)); near(dot[1], 140 - 85 * Math.cos(a) * Math.cos(e));
}

test('body-relative views and custom camera angles retain native geometry for all twelve residents', async ({ page }) => {
  const errors = await mount(page), cases: any[] = [];
  for (const id of ids) {
    await call(page, 'setCamera', id); await call(page, 'seek', id === 'easternBluebird' ? 22.3 : 0);
    await call(page, 'setResidentPart', 'whole'); await step(page); const original = await native(page);
    for (const [view, a, e] of [['opposite', -90, 0], ['rear', 180, 0]] as const) {
      await call(page, 'setResidentView', view); await step(page); const n = await native(page);
      direction(n, a, e); frozen(original, n); await compassMatches(page, n);
      cases.push({ id, view, orientation: n.state.residentInspection.orientation, direction: n.local });
    }
    for (const [a, e] of [[-135, -35]]) {
      await call(page, 'setResidentAngle', { azimuth: a, elevation: e }); await step(page); const n = await native(page);
      direction(n, a, e); frozen(original, n); await compassMatches(page, n);
    }
    console.log('Verified native compass for', id);
  }
  for (const part of ['head', 'wing', 'tail']) {
    await call(page, 'setResidentPart', part); await call(page, 'pinResidentShape'); await call(page, 'setResidentFrozenSurface', true);
    const before = await native(page); await call(page, 'setResidentAngle', { azimuth: -73, elevation: 24 }); await step(page);
    const after = await native(page); frozen(before, after); direction(after, -73, 24); expect(after.state.residentInspection.comparison.visible).toBe(true);
    expect(after.state.residentInspection.comparison.pinned).toEqual(before.state.residentInspection.comparison.pinned);
  }
  await call(page, 'setResidentAngle', { azimuth: 300, elevation: -200 }); await step(page); direction(await native(page), 180, -90);
  await call(page, 'setResidentAngle', { azimuth: -180, elevation: 90 }); await step(page); direction(await native(page), -180, 90);
  await call(page, 'setResidentAngle', { azimuth: 42, elevation: 68 }); await step(page);
  const before = await native(page); await call(page, 'setResidentAngle', { azimuth: '10', elevation: 0 }); await step(page);
  expect((await native(page)).state.cameraPosition).toEqual(before.state.cameraPosition);
  await call(page, 'setResidentView', 'free'); await step(page); const released = await native(page); frozen(before, released);
  released.local.forEach((v: number, i: number) => near(v, before.local[i]));
  await step(page, 16); expect(await page.evaluate(() => (window as any).compassPending())).toBe(0);
  expect(errors).toEqual([]); writeFileSync(resolve(report, 'camera-geometry.json'), JSON.stringify({ cases, errors }, null, 2));
});

test('native sliders, orbit, small layouts and lifecycle keep the compass synchronized', async ({ page }) => {
  const errors = await mount(page), evidence: any[] = [], stored = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  for (const [width, host] of [[1280, 1100], [1280, 500], [390, 390]]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('#wrap').evaluate((n: HTMLElement, width) => { n.style.width = width + 'px'; n.style.maxWidth = '100%'; n.setAttribute('data-stem-tool-shell', 'true'); }, host);
    await call(page, 'setCamera', 'americanGoldfinch'); await call(page, 'seek', 0); await call(page, 'setResidentPart', 'head'); await step(page);
    const opposite = page.locator('[data-resident-view-choice=opposite]'); await opposite.focus(); await page.keyboard.press('Enter'); await step(page);
    await expect(opposite).toHaveAttribute('aria-pressed', 'true'); direction(await native(page), -90, 0);
    const az = page.locator('[data-resident-angle=azimuth]'), el = page.locator('[data-resident-angle=elevation]');
    await az.focus(); await page.keyboard.press('ArrowRight'); await step(page); direction(await native(page), -89, 0);
    await el.focus(); await page.keyboard.press('Home'); await step(page); direction(await native(page), -89, -90);
    await el.fill('23'); await az.fill('38'); await step(page); await compassMatches(page, await native(page));
    await expect(page.locator('[data-resident-inspection-status]')).toContainText('Custom angle');
    await az.scrollIntoViewIfNeeded(); const box = (await az.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width * .68, box.y + box.height / 2); await step(page);
    expect((await native(page)).state.residentInspection.orientation.azimuth).not.toBeCloseTo(38, 1); await compassMatches(page, await native(page));
    await page.locator(canvas).focus(); await page.keyboard.press('ArrowLeft'); await step(page); const orbited = await native(page);
    expect(orbited.state.residentInspection.view).toBe('free'); await compassMatches(page, orbited);
    await call(page, 'setResidentAngle', { azimuth: 128, elevation: 28 }); await step(page);
    const checks = await page.evaluate(async () => {
      const selectors = '[data-resident-angle], [data-resident-view-choice]';
      return { sizes: [...document.querySelectorAll(selectors)].map(n => { const r = n.getBoundingClientRect(); return [r.width, r.height]; }),
        overflow: document.querySelector('#wrap')!.scrollWidth - document.querySelector('#wrap')!.clientWidth,
        violations: (await (window as any).axe.run('[data-birdlab-resident-inspection]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-required-children', 'aria-required-parent', 'nested-interactive'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })) };
    });
    expect(checks.violations).toEqual([]); expect(checks.overflow).toBeLessThanOrEqual(1); checks.sizes.forEach(s => { expect(s[0]).toBeGreaterThanOrEqual(44); expect(s[1]).toBeGreaterThanOrEqual(44); });
    if (width === 390) {
      await page.locator('[data-resident-compass]').evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await step(page, 12);
      await page.waitForFunction(() => { const r = document.querySelector('[data-birdlab-3d-canvas]')!.getBoundingClientRect(); return r.bottom <= 0 || r.top >= innerHeight; }, null, { polling: 50 });
      const before = await call(page, 'getState'); await page.locator('.birdlab-3d-stage').evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(() => (window as any).compassPending() > 0, null, { polling: 50 }); await step(page, 3);
      const after = await call(page, 'getState'); expect(after.time).toBe(before.time); expect(after.paused).toBe(true); expect(after.frames).toBeGreaterThan(before.frames);
    }
    if (host !== 500) for (const [selector, name] of [['.birdlab-3d-stage', 'bird'], ['[data-resident-compass]', 'compass']]) {
      const node = page.locator(selector); await node.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' })); await step(page);
      const clip = await node.evaluate(n => { const r = n.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height, scale: 1 }; });
      const cdp = await page.context().newCDPSession(page); const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: true, clip }); await cdp.detach();
      const bytes = Buffer.from(shot.data, 'base64'), png = readPng(bytes); expect(Math.abs(png.width - clip.width)).toBeLessThanOrEqual(2); expect(Math.abs(png.height - clip.height)).toBeLessThanOrEqual(2);
      if (name === 'bird') {
        let colored = 0, samples = 0; const colors = new Set();
        for (let y = Math.floor(png.height * .2); y < png.height * .8; y += 7) for (let x = Math.floor(png.width * .1); x < png.width * .9; x += 7) {
          const rgb = png.at(x, y); samples++; if (rgb.reduce((s, c) => s + c, 0) > 45) colored++; colors.add(rgb.map(c => Math.floor(c / 8)).join(','));
        }
        expect(colored / samples, 'native canvas must contain the scene after scroll re-entry').toBeGreaterThan(.6); expect(colors.size).toBeGreaterThan(20);
      }
      writeFileSync(resolve(report, name + '-' + width + '.png'), bytes);
    }
    await step(page, 16); expect(await page.evaluate(() => (window as any).compassPending())).toBe(0);
    const before = await native(page); await call(page, 'setMode', 'free'); await step(page); await call(page, 'setMode', 'guided'); await step(page);
    const after = await native(page); frozen(before, after); direction(after, 128, 28);
    await call(page, 'setPaused', false); await step(page); await expect(page.locator('[data-resident-compass]')).toHaveCount(0); await call(page, 'setPaused', true);
    evidence.push({ width, host, checks });
  }
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(stored); expect(errors).toEqual([]);
  await harness.destroy(page); await step(page, 5); expect(await page.evaluate(() => (window as any).compassPending())).toBe(0);
  writeFileSync(resolve(report, 'camera-interactions.json'), JSON.stringify({ evidence, errors }, null, 2));
});

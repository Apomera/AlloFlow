import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve(process.env.SCALE_CHART_REPORT_DIR || 'reports/scale-explorer-cloud-chart');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer',
  width: 1400, height: 1100, layout: 'document',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `window.__chartEncodes=0;window.__chartEncodingMs=[];const png=HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL=function(){const chart=this.width===96&&this.height===96,start=performance.now(),result=png.apply(this,arguments);if(chart){window.__chartEncodes++;window.__chartEncodingMs.push(performance.now()-start);}return result;};
    const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__chartCamera=c;return render.apply(this,arguments);};return r;}});`
});
type Pose = { x: number; y: number; z: number; heading: number; pitch: number; travel: number };
const canvas = (page: Page) => page.locator('[data-atlas-ready]');
const navigation = (page: Page) => page.getByRole('region', { name: 'Nebula navigation', exact: true });
const toggle = (page: Page) => page.locator('[data-nebula-map-toggle]');
const image = (page: Page) => page.locator('[data-nebula-map-slice]');
const pose = async (page: Page): Promise<Pose> => JSON.parse((await canvas(page).getAttribute('data-atlas-nebula-position'))!);
const href = async (page: Page) => image(page).getAttribute('href');
const encodes = async (page: Page) => page.evaluate(() => (window as any).__chartEncodes);

async function mount(page: Page, phone = false) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  if (phone) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      if (type === 'webgl2') return null;
      return original.apply(this, [type, ...args] as any);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  const tools = page.getByRole('button', { name: 'Show all tools', exact: true });
  if (await tools.count()) await tools.click();
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('orion-nebula');
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'orion-nebula');
  await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active');
  await canvas(page).scrollIntoViewIfNeeded();
  await canvas(page).focus();
  await expect(image(page)).toHaveAttribute('href', /^data:image\/png;base64,/);
  return errors;
}
async function scene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE;
    const record = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    let root: any;
    record.scene.traverse((n: any) => { if (n.userData.itemId === 'orion-nebula') root = n; });
    const model = root.userData.model, nebula = model.userData.nebula;
    return {
      position: model.worldToLocal(w.__chartCamera.position.clone()).multiplyScalar(24).toArray(),
      scale: root.scale.x, stars: Array.from(nebula.stars.geometry.attributes.position.array),
      texture: nebula.cloud.material.uniforms.uVolume.value.uuid,
      span: model.localToWorld(new T.Vector3(.5, 0, 0)).distanceTo(model.localToWorld(new T.Vector3(-.5, 0, 0))),
      type: record.type, renders: record.renders, draws: record.draws
    };
  });
}
const identity = (s: Awaited<ReturnType<typeof scene>>) => ({ scale: s.scale, stars: s.stars, texture: s.texture, span: s.span });
async function registered(page: Page) {
  const p = await pose(page), s = await scene(page);
  s.position.forEach((value: number, i: number) => expect(value).toBeCloseTo([p.x, p.y, p.z][i], 8));
  const height = Math.round(p.y * 10) / 10;
  await expect(image(page)).toHaveAttribute('data-nebula-map-height', String(height));
  await expect(page.locator('output[data-nebula-slice-height]')).toContainText((height >= 0 ? '+' : '') + height.toFixed(1));
  const geometry = await image(page).evaluate(n => {
    const svg = n.closest('svg')!, marker = svg.querySelector('[data-nebula-map-point]')!;
    const numbers = (marker.getAttribute('transform') || '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/ig)!.map(Number);
    return { x: Number(n.getAttribute('x')), y: Number(n.getAttribute('y')),
      width: Number(n.getAttribute('width')), height: Number(n.getAttribute('height')),
      viewBox: svg.getAttribute('viewBox'), marker: numbers };
  });
  expect(geometry.viewBox).toBe('0 0 200 200');
  expect(geometry.x).toBeCloseTo((33.6 - 24) / 33.6 * 100, 6);
  expect(geometry.y).toBeCloseTo(geometry.x, 6);
  expect(geometry.width).toBeCloseTo(24 / 33.6 * 200, 6);
  expect(geometry.height).toBeCloseTo(geometry.width, 6);
  expect(geometry.marker[0]).toBeCloseTo(100 + p.x / 33.6 * 200, 8);
  expect(geometry.marker[1]).toBeCloseTo(100 + p.z / 33.6 * 200, 8);
  expect(geometry.marker[2]).toBeCloseTo(p.heading, 8);
  return { pose: p, geometry };
}
async function assertMaterialRegistration(page: Page) {
  // Probe the actual field at clear and dense positions in each quadrant. This
  // checks PNG orientation/registration without reimplementing its palette.
  const measured = await page.evaluate(async () => {
    const node = document.querySelector('[data-nebula-map-slice]')!;
    const png = new Image(); png.src = node.getAttribute('href')!; await png.decode();
    const cv = document.createElement('canvas'); cv.width = png.naturalWidth; cv.height = png.naturalHeight;
    const ctx = cv.getContext('2d')!; ctx.drawImage(png, 0, 0);
    const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const w = window as any, record = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    let root: any; record.scene.traverse((n: any) => { if (n.userData.itemId === 'orion-nebula') root = n; });
    const field = root.userData.model.userData.nebula.cloud.material.uniforms.uVolume.value.image.data;
    const y = (Number(node.getAttribute('data-nebula-map-height')) / 24 + .5) * 95;
    const lower = Math.floor(y), upper = Math.min(95, lower + 1);
    const probes: { x: number; z: number; kind: string; alpha: number }[] = [];
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      let clear: any, dense: any, maximum = -1;
      for (let z = quadrant >= 2 ? 48 : 0; z < (quadrant >= 2 ? 96 : 48); z++) {
        for (let x = quadrant % 2 ? 48 : 0; x < (quadrant % 2 ? 96 : 48); x++) {
          const base = Math.floor(z / 12) * 96 * 1152 + (z % 12) * 96 + x;
          const a = (base + lower * 1152) * 4, b = (base + upper * 1152) * 4;
          const minimum = Math.min(field[a] + field[a + 2], field[b] + field[b + 2]);
          const alpha = pixels[(z * 96 + x) * 4 + 3];
          if (!clear && field[a] + field[a + 2] + field[b] + field[b + 2] === 0) clear = { x, z, kind: 'clear', alpha };
          if (minimum > maximum) { maximum = minimum; dense = { x, z, kind: 'dense', alpha }; }
        }
      }
      if (clear) probes.push(clear);
      if (maximum > 80) probes.push(dense);
    }
    return { width: cv.width, height: cv.height, probes, nonzero: pixels.filter((_, i) => i % 4 === 3 && pixels[i] > 0).length };
  });
  expect(measured.width).toBe(96); expect(measured.height).toBe(96);
  expect(measured.nonzero).toBeGreaterThan(50); expect(measured.nonzero).toBeLessThan(9216);
  expect(measured.probes.filter(p => p.kind === 'clear').length).toBeGreaterThanOrEqual(2);
  expect(measured.probes.some(p => p.kind === 'dense')).toBe(true);
  measured.probes.forEach(p => {
    if (p.kind === 'clear') expect(p.alpha).toBe(0);
    else expect(p.alpha).toBeGreaterThan(150);
  });
  return measured;
}
async function nonblank(page: Page, filename?: string) {
  const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false);
  if (filename) writeFileSync(path.join(out, filename), pixels!.png);
  await canvas(page).focus();
}
async function discrete(page: Page, label: string, count = 1) {
  const before = await pose(page);
  if (count === 1) await navigation(page).getByRole('button', { name: label, exact: true }).press('Enter');
  else await navigation(page).getByRole('button', { name: label, exact: true }).evaluate((button, n) => {
    for (let i = 0; i < n; i++) (button as HTMLButtonElement).click();
  }, count);
  await expect.poll(() => pose(page)).not.toEqual(before);
}
async function visit(page: Page, label: string) {
  await navigation(page).getByRole('button', { name: label, exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-course', 'arrived');
  await registered(page);
}

test.beforeAll(async () => {
  mkdirSync(out, { recursive: true });
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  writeFileSync(path.join(out, 'cloud-chart-source.json'), JSON.stringify({
    sourceSha256: sha('stem_lab/stem_tool_scaleexplorer.js'),
    desktopSha256: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'),
    substitution: process.env.STEM_GL_SUBSTITUTE || null
  }, null, 2));
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

test('cloud chart expands without moving the camera and follows height while sideways travel and looking reuse its slice', async ({ page }) => {
  const errors = await mount(page), initial = await pose(page), before = identity(await scene(page));
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  const compact = (await image(page).locator('..').boundingBox())!;
  await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  expect(await pose(page)).toEqual(initial);
  const expanded = (await image(page).locator('..').boundingBox())!;
  expect(expanded.width).toBeGreaterThan(compact.width + 40);
  const registration = await registered(page), material = await assertMaterialRegistration(page);
  const initialImage = await href(page), count = await encodes(page);
  await discrete(page, 'Turn right');
  expect(await href(page)).toBe(initialImage); expect(await encodes(page)).toBe(count);
  await discrete(page, 'Strafe right');
  const sideways = await pose(page); expect(sideways.y).toBe(initial.y);
  expect(sideways.x === initial.x && sideways.z === initial.z).toBe(false);
  expect(await href(page)).toBe(initialImage); expect(await encodes(page)).toBe(count); await registered(page);
  await discrete(page, 'Rise through cloud');
  await expect.poll(async () => (await pose(page)).y).toBeCloseTo(initial.y + .25, 8);
  await registered(page); expect(await href(page)).not.toBe(initialImage); expect(await encodes(page)).toBeGreaterThan(count);
  await discrete(page, 'Sink through cloud');
  await expect.poll(async () => (await pose(page)).y).toBeCloseTo(initial.y, 8);
  await registered(page); expect(await href(page)).toBe(initialImage);
  const held = await pose(page);
  await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false'); expect(await pose(page)).toEqual(held);
  await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true'); expect(await pose(page)).toEqual(held);
  await nonblank(page, 'cloud-chart-desktop-gl.png'); expect(identity(await scene(page))).toEqual(before);
  await page.locator('.sx-stage').screenshot({ path: path.join(out, 'cloud-chart-desktop.png') });
  await page.locator('.sx-nebula-map').screenshot({ path: path.join(out, 'cloud-chart-desktop-map.png') });
  const encoding = await page.evaluate(() => ({ count: (window as any).__chartEncodes, durationsMs: (window as any).__chartEncodingMs }));
  writeFileSync(path.join(out, 'cloud-chart-desktop.json'), JSON.stringify({ registration, material, compact, expanded, initial, sideways, held, encoding }, null, 2));
  expect(errors).toEqual([]);
});

test('guided cloud viewpoints show registered material slices and a saved observation restores its height after exit', async ({ page }) => {
  const errors = await mount(page), before = identity(await scene(page));
  await toggle(page).click();
  const readings: any[] = [];
  for (const [label, expected] of [
    ['Along the glowing front', [7, -4.5, 3.5]], ['Beside the dust ridge', [-6.6, 6.6, 6.8]]
  ] as const) {
    await visit(page, label);
    const p = await pose(page); expect([p.x, p.y, p.z]).toEqual(expected);
    const registration = await registered(page), material = await assertMaterialRegistration(page);
    const course = await navigation(page).locator('[data-nebula-course-path]').getAttribute('d');
    expect(course).toContain('L' + (100 + p.x / 33.6 * 200) + ',' + (100 + p.z / 33.6 * 200));
    readings.push({ label, registration, material });
    await page.locator('.sx-stage').screenshot({ path: path.join(out, label.includes('ridge') ? 'cloud-chart-dust.png' : 'cloud-chart-front.png') });
  }
  const saved = await pose(page), savedImage = await href(page), book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await book.getByRole('textbox').fill('The horizontal chart traces the ridge at this model height.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  await navigation(page).getByRole('button', { name: 'Whole nebula', exact: true }).click();
  await expect(image(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Enter the nebula', exact: true }).click();
  await expect(image(page)).toHaveAttribute('href', /^data:image\/png;base64,/); await registered(page);
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption('moon');
  await book.locator('[data-observation="orion-nebula:"]').getByRole('button', { name: /^Return to/ }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-nebula-inside', 'active');
  await expect.poll(() => pose(page)).toEqual(saved); await registered(page); expect(await href(page)).toBe(savedImage);
  await canvas(page).scrollIntoViewIfNeeded(); await canvas(page).focus();
  expect(identity(await scene(page))).toEqual(before);
  await nonblank(page); writeFileSync(path.join(out, 'cloud-chart-viewpoints.json'), JSON.stringify({ readings, saved }, null, 2));
  expect(errors).toEqual([]);
});

test('320px WebGL 1 chart stays readable and clears a slice outside the cloud volume', async ({ page }) => {
  const errors = await mount(page, true), before = identity(await scene(page));
  expect((await scene(page)).type).toBe('webgl');
  await toggle(page).click(); await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  await visit(page, 'Beside the dust ridge');
  await registered(page); await assertMaterialRegistration(page);
  const layout = await page.evaluate(() => {
    const nav = document.querySelector('.sx-nebula-console')!, chart = document.querySelector('[data-nebula-map-slice]')!.closest('svg')!, caption = document.querySelector('output[data-nebula-slice-height]')!;
    const rect = (n: Element) => { const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { width: innerWidth, documentFits: document.documentElement.scrollWidth <= innerWidth + 1,
      consoleFits: nav.scrollWidth <= nav.clientWidth + 1, chart: rect(chart), caption: rect(caption), canvas: rect(document.querySelector('[data-atlas-ready]')!) };
  });
  expect(layout.documentFits).toBe(true); expect(layout.consoleFits).toBe(true);
  expect(layout.chart.width).toBeGreaterThanOrEqual(180); expect(layout.chart.x).toBeGreaterThanOrEqual(0);
  expect(layout.chart.x + layout.chart.width).toBeLessThanOrEqual(321);
  expect(layout.canvas.height).toBeGreaterThanOrEqual(359.5);
  await page.locator('.sx-stage').screenshot({ path: path.join(out, 'cloud-chart-phone-dust.png') });
  await page.locator('.sx-nebula-map').screenshot({ path: path.join(out, 'cloud-chart-phone-map.png') });
  const inside = await pose(page), insideImage = await href(page);
  // Leave the map and pad in view. The expanded chart must remain useful when
  // the 3D canvas has scrolled away instead of depending on a new GL frame.
  await navigation(page).getByRole('button', { name: 'Rise through cloud', exact: true }).scrollIntoViewIfNeeded();
  const controlViewport = await page.evaluate(() => {
    const cv=document.querySelector('[data-atlas-ready]')!.getBoundingClientRect();
    const button=document.querySelector('[data-air-direction="up"]')!.getBoundingClientRect();
    return { height:innerHeight, canvas:{top:cv.top,bottom:cv.bottom}, rise:{top:button.top,bottom:button.bottom},
      canvasInView:cv.bottom>0&&cv.top<innerHeight };
  });
  const canvasInView = controlViewport.canvasInView;
  writeFileSync(path.join(out, 'cloud-chart-phone-control-viewport.json'), JSON.stringify(controlViewport, null, 2));
  expect(canvasInView).toBe(false);
  await page.waitForTimeout(150);
  const hiddenBefore = await scene(page);
  await discrete(page, 'Rise through cloud'); await registered(page); expect(await href(page)).not.toBe(insideImage);
  await discrete(page, 'Sink through cloud'); await registered(page); expect(await href(page)).toBe(insideImage);
  await discrete(page, 'Rise through cloud', 23);
  await expect.poll(async () => (await pose(page)).y).toBeGreaterThan(12);
  await expect(image(page)).toHaveAttribute('data-nebula-map-height', 'outside');
  const outsidePixels = await image(page).evaluate(async n => {
    const img = new Image(); img.src = n.getAttribute('href')!; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d')!; ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
    return Array.from(pixels).filter((_, i) => i % 4 === 3).every(value => value === 0);
  });
  expect(outsidePixels).toBe(true);
  await expect(page.locator('output[data-nebula-slice-height]')).toContainText(/outside/i);
  const outside = await pose(page); expect(outside.x).toBe(inside.x); expect(outside.z).toBe(inside.z);
  await discrete(page, 'Sink through cloud', 23);
  await expect.poll(async () => (await pose(page)).y).toBeCloseTo(inside.y, 8);
  await registered(page); expect(await href(page)).toBe(insideImage);
  const hiddenAfter = await scene(page);
  expect(hiddenAfter.renders).toBe(hiddenBefore.renders); expect(hiddenAfter.draws).toBe(hiddenBefore.draws);
  const count = await encodes(page), idle = (await scene(page)).renders;
  await canvas(page).focus(); await page.waitForTimeout(350);
  expect(await encodes(page)).toBe(count); expect((await scene(page)).renders - idle).toBeLessThanOrEqual(1);
  expect(identity(await scene(page))).toEqual(before); await nonblank(page, 'cloud-chart-phone-gl.png');
  writeFileSync(path.join(out, 'cloud-chart-phone.json'), JSON.stringify({ layout, inside, outside, canvasInView, hiddenGL: {
    rendersBefore: hiddenBefore.renders, rendersAfter: hiddenAfter.renders, drawsBefore: hiddenBefore.draws, drawsAfter: hiddenAfter.draws
  } }, null, 2));
  expect(errors).toEqual([]);
});

import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_DNA_REPORT_DIR || 'reports/scale-explorer-dna');
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const route = (p: Page) => p.getByRole('region', { name: 'DNA base-pair navigation', exact: true });
const pairSlider = (p: Page) => route(p).getByRole('slider', { name: 'Base pair', exact: true });
const atoms = (p: Page) => p.getByRole('button', { name: 'Atoms and bonds', exact: true });
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(p => p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const dataSandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__dnaData = DNA_STRUCTURE;\n  window.StemLab.registerTool('scaleExplorer', {"), dataSandbox);
const centers = JSON.parse(JSON.stringify(dataSandbox.window.__dnaData.pairs.map((p: any) => p.center)));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__dnaCamera=c;return render.apply(this,arguments);};return r;}});`
});
function save(name: string, value: unknown) { writeFileSync(path.join(out, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }
async function mount(page: Page, phone = false, reduced = false) {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('**/*', request => {
    const url = request.request().url();
    if (/^https?:/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url)) { external.push(url); return request.abort(); }
    return request.continue();
  });
  if (phone) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) { return type === 'webgl2' ? null : original.apply(this, [type, ...args] as any); };
  });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.setViewportSize({ width: phone ? 320 : 1400, height: phone ? 780 : 1100 });
  await harness.mount(page, { _scaleExplorer: { ambient: false } }, '!!document.querySelector("[data-atlas-ready]")');
  await showScaleExplorerTools(page);
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await fly(page, 'dna');
  return { errors, external };
}
async function fly(page: Page, id: string) {
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', id);
  await expect.poll(() => canvas(page).evaluate((c: HTMLElement) => Math.abs(Number(c.dataset.atlasExponent) - Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function scene(page: Page) {
  return page.evaluate(centers => {
    const w = window as any, T = w.THREE, rec = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost()); let root: any;
    rec.scene.traverse((o: any) => { if (o.userData.itemId === 'dna') root = o; });
    const model = root.userData.model, dna = model.userData.dna, camera = w.__dnaCamera, geometry: string[] = [];
    model.traverse((o: any) => { if (o.geometry) geometry.push(o.geometry.uuid); });
    const bounds = new T.Box3().setFromObject(dna.atoms), scale = root.scale.x;
    const aim = new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
    const expected = dna.selectedPair ? model.localToWorld(new T.Vector3().fromArray(centers[dna.selectedPair - 1])) : null;
    return { type: rec.type, width: (bounds.max.x - bounds.min.x) / scale, worldWidth: bounds.max.x - bounds.min.x, scale,
      aligned: camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(camera.position).normalize()), aim: aim.toArray(), camera: camera.position.toArray(),
      selected: dna.selectedPair, atomsVisible: dna.atoms.visible, covalentVisible: dna.covalent.visible,
      atomMeshes: dna.atoms.children.length, pairs: dna.pairs.length, visiblePlanes: dna.pairs.filter((p: any) => p.planes.visible).length,
      geometry, targetError: expected ? expected.distanceTo(aim) : 0, draws: rec.draws, renders: rec.renders };
  }, centers);
}
async function pair(page: Page, n: number) {
  await expect(canvas(page)).toHaveAttribute('data-atlas-dna-pair', String(n));
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'base-pair-' + String(n).padStart(2, '0'));
  await expect(pairSlider(page)).toHaveValue(String(n));
  await expect.poll(async () => (await scene(page)).selected).toBe(n);
  await expect.poll(async () => (await scene(page)).aligned).toBeGreaterThan(.99999);
  await expect.poll(async () => (await scene(page)).targetError).toBeLessThan(.0002);
}
async function actualMolecularClick(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  const point = await page.evaluate(() => {
    const w = window as any, T = w.THREE, rec = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost()); let root: any;
    rec.scene.traverse((o: any) => { if (o.userData.itemId === 'dna') root = o; });
    const model = root.userData.model, dna = model.userData.dna, camera = w.__dnaCamera, ray = new T.Raycaster(), rect = document.querySelector('[data-atlas-ready]')!.getBoundingClientRect();
    // Find an exposed molecular triangle by raycasting the real generated meshes.
    // This avoids a test-only marker or picking a base behind the backbone.
    for (const p of dna.pairs) {
      for (const mesh of [p.planes, p.atoms]) {
        const positions = mesh.geometry.attributes.position, step = Math.max(3, Math.floor(positions.count / 200 / 3) * 3);
        for (let i = 0; i < positions.count; i += step) {
          const projected = mesh.localToWorld(new T.Vector3().fromBufferAttribute(positions, i)).project(camera);
          if (Math.abs(projected.x) > .8 || Math.abs(projected.y) > .65 || projected.z >= 1) continue;
          ray.setFromCamera(new T.Vector2(projected.x, projected.y), camera);
          const hit = ray.intersectObjects(model.children, true).find((h: any) => h.object.visible && h.object.isMesh);
          if (hit?.object.userData.dnaPairId === p.id) return { id: p.id, n: p.number, x: rect.x + (projected.x + 1) * rect.width / 2, y: rect.y + (1 - projected.y) * rect.height / 2 };
        }
      }
    }
    return null;
  });
  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
  await pair(page, point!.n);
  return point;
}
async function capture(page: Page, name: string) {
  await page.locator('.sx-stage').screenshot({ path: path.join(out, name + '-stage.png') });
  const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false);
  writeFileSync(path.join(out, name + '-gl.png'), pixels!.png);
}
test.beforeAll(async () => {
  mkdirSync(out, { recursive: true });
  const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
  save('dna-browser-source', { checkedAt: new Date().toISOString(), source: sha('stem_lab/stem_tool_scaleexplorer.js'), desktop: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'), substitution: process.env.STEM_GL_SUBSTITUTE || null });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => {
  await page.evaluate(() => { const w = window as any; w.__dnaCapture = false; if (w.__dnaFrame) cancelAnimationFrame(w.__dnaFrame); });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('recorded DNA geometry supports molecular picking and a camera route without changing measured width', async ({ page }) => {
  const log = await mount(page), initial = await scene(page);
  expect(initial.atomMeshes).toBe(12); expect(initial.pairs).toBe(12); expect(initial.width).toBeCloseTo(1, 5);
  expect(initial.selected).toBe(0); await expect(canvas(page)).toHaveAttribute('data-atlas-dna-pair', '0');
  await expect(atoms(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sx-detail-choices button')).toHaveCount(2);
  const clicked = await actualMolecularClick(page);
  expect((await scene(page)).width).toBeCloseTo(initial.width, 8);
  await route(page).getByRole('button', { name: 'Whole molecule', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-dna-pair', '0');
  await page.getByRole('button', { name: 'Follow the helix', exact: true }).click(); await pair(page, 6);
  const sixth = await scene(page); await page.evaluate(() => {
    const w = window as any; w.__dnaAims = []; w.__dnaCapture = true;
    function capture() { const el = document.querySelector('[data-atlas-ready]') as HTMLElement; if (w.__dnaCapture) { w.__dnaAims.push(el.dataset.atlasAim); w.__dnaFrame = requestAnimationFrame(capture); } } capture();
  });
  await pairSlider(page).fill('11'); await pair(page, 11);
  const eleventh = await scene(page);
  await expect.poll(async () => {
    const aims = await page.evaluate(() => (window as any).__dnaAims); return new Set(aims).size;
  }).toBeGreaterThan(3);
  const aims = await page.evaluate(() => { const w = window as any; w.__dnaCapture = false; cancelAnimationFrame(w.__dnaFrame); return w.__dnaAims; });
  expect(eleventh.aim).not.toEqual(sixth.aim);
  await atoms(page).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-dna-detail', 'structure');
  const simplified = await scene(page); expect(simplified.atomsVisible).toBe(false); expect(simplified.covalentVisible).toBe(false); expect(simplified.visiblePlanes).toBe(12);
  expect(simplified.geometry).toEqual(initial.geometry); expect(simplified.scale).toBe(initial.scale); expect(simplified.width).toBeCloseTo(initial.width, 8);
  expect(simplified.aim).toEqual(eleventh.aim);
  await atoms(page).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-dna-detail', 'atoms');
  expect((await scene(page)).atomsVisible).toBe(true); await capture(page, 'dna-desktop-pair');
  save('dna-desktop', { initial, clicked, sixth, eleventh, simplified, aims, ...log });
  expect(log.errors).toEqual([]); expect(log.external).toEqual([]);
});

test('phone touch targets and native keyboard steps reach both ends with reduced motion', async ({ page }) => {
  const log = await mount(page, true, true), initial = await scene(page); expect(initial.type).toBe('webgl');
  const seventh = page.getByRole('button', { name: 'Base pair 7: T with A', exact: true });
  await seventh.scrollIntoViewIfNeeded(); const target = await seventh.boundingBox(); expect(target!.width).toBeGreaterThanOrEqual(44); expect(target!.height).toBeGreaterThanOrEqual(44);
  await seventh.tap(); await pair(page, 7); await expect(canvas(page)).toBeInViewport();
  await pairSlider(page).focus(); await pairSlider(page).press('ArrowRight'); await pair(page, 8);
  await pairSlider(page).press('Home'); await pair(page, 1);
  await expect(route(page).getByRole('button', { name: 'Previous pair', exact: true })).toBeDisabled();
  await pairSlider(page).press('End'); await pair(page, 12);
  await expect(route(page).getByRole('button', { name: 'Next pair', exact: true })).toBeDisabled();
  await route(page).getByRole('button', { name: 'Previous pair', exact: true }).press('Enter'); await pair(page, 11);
  for (const label of ['Previous pair', 'Next pair', 'Whole molecule']) { const box = await route(page).getByRole('button', { name: label, exact: true }).boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); }
  expect((await scene(page)).width).toBeCloseTo(initial.width, 8); expect((await scene(page)).scale).toBe(initial.scale);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await capture(page, 'dna-phone-route');
  await route(page).getByRole('button', { name: 'Whole molecule', exact: true }).tap();
  await expect(route(page)).toHaveCount(0); await expect(canvas(page)).toHaveAttribute('data-atlas-dna-pair', '0'); await expect(canvas(page)).toHaveAttribute('data-atlas-zoom', '1.00');
  save('dna-phone', { initial, ...log }); expect(log.errors).toEqual([]); expect(log.external).toEqual([]);
});

test('notebook returns to the exact pair and chromosome portal preserves the bacterial return route', async ({ page }) => {
  const log = await mount(page, false, true), book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await page.getByRole('button', { name: 'Base pair 7: T with A', exact: true }).click(); await pair(page, 7);
  const zoom = Number(await canvas(page).getAttribute('data-atlas-zoom'));
  await book.getByRole('textbox', { name: 'What do you notice?', exact: true }).fill('T pairs with A at this stop.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData._scaleExplorer.observations[0]);
  expect(saved).toMatchObject({ itemId: 'dna', detailId: 'base-pair-07', size: 2.4e-9, zoom, note: 'T pairs with A at this stop.' });
  await fly(page, 'ecoli'); await page.locator('.sx-details').getByRole('button', { name: 'Folded chromosome', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'nucleoid');
  const portal = page.getByRole('region', { name: 'Continue the journey', exact: true }); await expect(portal).toBeVisible(); await portal.getByRole('button', { name: /^Explore/ }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'dna');
  const breadcrumb = page.getByRole('navigation', { name: 'Your exploration route', exact: true }).getByRole('button', { name: /^Return to/ });
  await expect(breadcrumb).toBeVisible(); await breadcrumb.click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'ecoli'); await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'nucleoid'); await expect(canvas(page)).toHaveAttribute('data-atlas-cutaway', 'open');
  await book.locator('[data-observation="dna:base-pair-07"]').getByRole('button', { name: /^Return to/ }).click(); await pair(page, 7);
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom', zoom.toFixed(2));
  await expect(book.getByRole('textbox')).toHaveValue('T pairs with A at this stop.');
  await expect(page.locator('.sx-details').getByRole('link', { name: 'Read the science source', exact: true })).toHaveAttribute('href', 'https://www.rcsb.org/structure/1BNA');
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-dna-pair', '0'); await expect(route(page)).toHaveCount(0);
  expect((await scene(page)).width).toBeCloseTo(1, 5); save('dna-notebook-portal', { saved, ...log }); expect(log.errors).toEqual([]); expect(log.external).toEqual([]);
});

import { test, expect, type Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { showScaleExplorerTools } from './helpers/scale_explorer_workspace';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off', hasTouch: true });
const out = path.resolve(process.env.SCALE_MITO_REPORT_DIR || 'reports/scale-explorer-mitochondrion');
const canvas = (p: Page) => p.locator('[data-atlas-ready]');
const route = (p: Page) => p.getByRole('region', { name: 'Crista navigation', exact: true });
const energyRoute = (p: Page) => p.getByRole('region', { name: 'Energy pathway navigation', exact: true });
const foldSlider = (p: Page) => route(p).getByRole('slider', { name: 'Crista', exact: true });
const flow = (p: Page) => p.getByRole('button', { name: 'Show energy flow', exact: true });
const replacement = (process.env.STEM_GL_SUBSTITUTE || '').split(';').find(p => p.startsWith('stem_lab/stem_tool_scaleexplorer.js='));
const sourceFile = replacement ? replacement.slice(replacement.indexOf('=') + 1) : 'stem_lab/stem_tool_scaleexplorer.js';
const sourceSandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } } as any;
vm.runInNewContext(readFileSync(sourceFile, 'utf8').replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.__mitoFolds = MITO_FOLDS;\n  window.StemLab.registerTool('scaleExplorer', {"), sourceSandbox);
const centers = JSON.parse(JSON.stringify(sourceSandbox.window.__mitoFolds.map((p: any) => p.at)));
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'],
  probes: `const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__mitoCamera=c;return render.apply(this,arguments);};return r;}});`
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
  await fly(page, 'mitochondrion');
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
    rec.scene.traverse((o: any) => { if (o.userData.itemId === 'mitochondrion') root = o; });
    const model = root.userData.model, mito = model.userData.mito, camera = w.__mitoCamera, geometry: string[] = [], flowPositions: number[][] = [];
    model.traverse((o: any) => { if (o.geometry) geometry.push(o.geometry.uuid); });
    const flowParticles = mito.flowParticles.map((p: any) => {
      const t = (mito.flowPhase + p.phase) % 1, segments = p.path.length - 1, index = Math.min(segments - 1, Math.floor(t * segments)), local = t * segments - index;
      const expected = new T.Vector3().fromArray(p.path[index]).lerp(new T.Vector3().fromArray(p.path[index + 1]), local);
      flowPositions.push(p.mesh.position.toArray());
      return { kind: p.kind, phase: p.phase, path: p.path.map((p: number[]) => p.slice()), position: p.mesh.position.toArray(), interpolationError: expected.distanceTo(p.mesh.position) };
    });
    const bounds = new T.Box3().setFromObject(mito.body), scale = root.scale.x;
    const aim = new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
    const expected = mito.selectedFold ? model.localToWorld(new T.Vector3().fromArray(centers[mito.selectedFold - 1])) : null;
    return { type: rec.type, width: (bounds.max.x - bounds.min.x) / scale, worldWidth: bounds.max.x - bounds.min.x, scale,
      aligned: camera.getWorldDirection(new T.Vector3()).dot(aim.clone().sub(camera.position).normalize()), aim: aim.toArray(), camera: camera.position.toArray(),
      selected: mito.selectedFold, inside: mito.inside.visible, folds: mito.folds.length, coverVisible: model.userData.outerMembrane.visible,
      coverLayers: model.userData.outerMembrane.children.length, flowVisible: mito.flowGroup.visible, flowPositions, flowParticles, flowPhase: mito.flowPhase, flowClock: mito.flowClock,
      centralMembrane: { opacity: mito.folds[3].membraneMaterial.opacity, transparent: mito.folds[3].membraneMaterial.transparent, depthWrite: mito.folds[3].membraneMaterial.depthWrite,
        membraneBaseOpacity: mito.folds[3].membrane.userData.baseOpacity, neckBaseOpacity: mito.folds[3].neck.userData.baseOpacity,
        membraneBaseTransparent: mito.folds[3].membrane.userData.baseTransparent, neckBaseTransparent: mito.folds[3].neck.userData.baseTransparent,
        membraneShadow: mito.folds[3].membrane.castShadow, neckShadow: mito.folds[3].neck.castShadow },
      respiratoryPresent: !!mito.respiratoryComplex && mito.respiratoryComplex.userData.mitoDetailId === 'energy-electrons',
      geometry, targetError: expected ? expected.distanceTo(aim) : 0, draws: rec.draws, renders: rec.renders };
  }, centers);
}
async function fold(page: Page, n: number) {
  await expect(canvas(page)).toHaveAttribute('data-atlas-mito-fold', String(n));
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'crista-' + String(n).padStart(2, '0'));
  await expect(foldSlider(page)).toHaveValue(String(n));
  await expect.poll(async () => (await scene(page)).selected).toBe(n);
  await expect.poll(async () => (await scene(page)).aligned).toBeGreaterThan(.99999);
  await expect.poll(async () => (await scene(page)).targetError).toBeLessThan(.0002);
}
async function actualMitoClick(page: Page, tag: 'mitoFoldId' | 'mitoDetailId', wanted = '') {
  await canvas(page).scrollIntoViewIfNeeded();
  if (tag === 'mitoDetailId' && wanted === 'energy-electrons') {
    await expect(canvas(page)).toHaveAttribute('data-atlas-yaw', '0.3200');
    await expect.poll(async () => { const view=await scene(page),delta=view.camera.map((v:number,i:number)=>v-view.aim[i]);return Math.atan2(delta[1],Math.hypot(delta[0],delta[2])); }).toBeCloseTo(.22, 4);
    await expect(canvas(page)).toHaveAttribute('data-atlas-zoom', '1.00');
  }
  const point = await page.evaluate(({ tag, wanted }) => {
    const w = window as any, T = w.THREE, rec = w.__glRecorder.records.find((r: any) => !r.ctx.isContextLost()); let root: any;
    rec.scene.traverse((o: any) => { if (o.userData.itemId === 'mitochondrion') root = o; });
    const model = root.userData.model, camera = w.__mitoCamera, ray = new T.Raycaster(), rect = document.querySelector('[data-atlas-ready]')!.getBoundingClientRect(), meshes: any[] = [];
    const visible = (object: any) => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
    model.traverse((o: any) => { if (o.isMesh && o.userData[tag] && (!wanted || o.userData[tag] === wanted) && visible(o)) meshes.push(o); });
    const firstHit = (x: number, y: number) => {
      ray.setFromCamera(new T.Vector2((x - rect.x) / rect.width * 2 - 1, 1 - (y - rect.y) / rect.height * 2), camera);
      return ray.intersectObjects(model.children, true).find((h: any) => h.object.isMesh && visible(h.object));
    };
    for (const mesh of meshes) {
      const positions = mesh.geometry.attributes.position, indices = mesh.geometry.index, count = indices ? indices.count : positions.count;
      const step = Math.max(3, Math.floor(count / 240 / 3) * 3);
      for (let i = 0; i + 2 < count; i += step) {
        // Face centers avoid silhouettes and seams shared with neighboring folds.
        // Use integer CSS pixels, then require the surrounding pixel grid to hit
        // the same real mesh before dispatching a native mouse click.
        const centroid = new T.Vector3();
        for (let j = 0; j < 3; j++) centroid.add(new T.Vector3().fromBufferAttribute(positions, indices ? indices.getX(i + j) : i + j));
        const projected = mesh.localToWorld(centroid.multiplyScalar(1 / 3)).project(camera);
        if (Math.abs(projected.x) > .8 || Math.abs(projected.y) > .65 || projected.z >= 1) continue;
        const id = mesh.userData[tag], x = Math.round(rect.x + (projected.x + 1) * rect.width / 2), y = Math.round(rect.y + (1 - projected.y) * rect.height / 2);
        let margin = true;
        for (let dx = -1; dx <= 1 && margin; dx++) for (let dy = -1; dy <= 1; dy++) {
          if (document.elementFromPoint(x + dx, y + dy) !== document.querySelector('[data-atlas-ready]') || firstHit(x + dx, y + dy)?.object.userData[tag] !== id) { margin = false; break; }
        }
        if (margin) return { id, n: tag === 'mitoFoldId' ? Number(id.slice(-2)) : 0, x, y, marginPx: 1 };
      }
    }
    return null;
  }, { tag, wanted });
  expect(point, 'an exposed triangle on the requested generated molecular mesh').not.toBeNull(); await page.mouse.click(point!.x, point!.y); return point;
}
async function actualFoldClick(page: Page) {
  const point = await actualMitoClick(page, 'mitoFoldId'); await fold(page, point!.n); return point;
}
function opaqueCentral(state: any) {
  expect(state.centralMembrane).toEqual({ opacity: 1, transparent: false, depthWrite: true, membraneBaseOpacity: 1, neckBaseOpacity: 1,
    membraneBaseTransparent: false, neckBaseTransparent: false, membraneShadow: true, neckShadow: true });
}
function revealedCentral(state: any) {
  expect(state.centralMembrane).toEqual({ opacity: .25, transparent: true, depthWrite: false, membraneBaseOpacity: .25, neckBaseOpacity: .25,
    membraneBaseTransparent: true, neckBaseTransparent: true, membraneShadow: false, neckShadow: false });
}
async function capture(page: Page, name: string) {
  await page.locator('.sx-stage').screenshot({ path: path.join(out, name + '-stage.png') });
  const pixels = await harness.glPixels(page); expect(pixels).not.toBeNull(); expect(looksBlank(pixels!)).toBe(false);
  writeFileSync(path.join(out, name + '-gl.png'), pixels!.png);
}
test.beforeAll(async () => {
  mkdirSync(out, { recursive: true }); const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
  save('mito-browser-source', { checkedAt: new Date().toISOString(), source: sha('stem_lab/stem_tool_scaleexplorer.js'), desktop: sha('desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js'), substitution: process.env.STEM_GL_SUBSTITUTE || null });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

test('membrane geometry supports picking, a seven-fold route, and directed energy motion at a fixed measured width', async ({ page }) => {
  const log = await mount(page), initial = await scene(page);
  expect(initial.folds).toBe(7); expect(initial.width).toBeCloseTo(1, 5); expect(initial.coverLayers).toBe(2); expect(initial.coverVisible).toBe(false);
  expect(initial.respiratoryPresent).toBe(true); opaqueCentral(initial);
  await expect(canvas(page)).toHaveAttribute('data-atlas-mito-fold', '0'); await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'hidden');
  const respiratoryClicked = await actualMitoClick(page, 'mitoDetailId', 'energy-electrons');
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'energy-electrons'); await expect(energyRoute(page)).toBeVisible();
  await expect(flow(page)).toHaveAttribute('aria-pressed', 'true'); await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'paused');
  const respiratoryView = await scene(page); revealedCentral(respiratoryView);
  expect(respiratoryView.width).toBeCloseTo(initial.width, 8); expect(respiratoryView.geometry).toEqual(initial.geometry);
  const nextEnergy = energyRoute(page).getByRole('button', { name: 'Next energy step', exact: true });
  await nextEnergy.focus(); await nextEnergy.press('Enter'); await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'energy-gradient'); await expect(nextEnergy).toBeFocused();
  await nextEnergy.press('Escape'); await expect(energyRoute(page)).toHaveCount(0); await expect(canvas(page)).toHaveAttribute('data-atlas-detail', '');
  await expect(page.getByRole('button', { name: 'Trace the cristae', exact: true })).toBeFocused();
  await flow(page).click(); await canvas(page).scrollIntoViewIfNeeded(); await expect(flow(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'hidden'); opaqueCentral(await scene(page));
  const clicked = await actualFoldClick(page);
  expect((await scene(page)).width).toBeCloseTo(initial.width, 8);
  await route(page).getByRole('button', { name: 'Whole mitochondrion', exact: true }).click();
  await page.getByRole('button', { name: 'Trace the cristae', exact: true }).click(); await fold(page, 4);
  const fourth = await scene(page); await foldSlider(page).fill('7'); await fold(page, 7); const seventh = await scene(page);
  expect(seventh.aim).not.toEqual(fourth.aim); expect(seventh.geometry).toEqual(initial.geometry); expect(seventh.scale).toBe(initial.scale);
  await flow(page).click(); await expect(flow(page)).toHaveAttribute('aria-pressed', 'true'); await canvas(page).scrollIntoViewIfNeeded(); await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'paused');
  await page.getByRole('button', { name: 'Resume ambience', exact: true }).click(); await canvas(page).scrollIntoViewIfNeeded(); await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'active');
  const moving = await scene(page); expect(moving.flowVisible).toBe(true); expect(moving.flowParticles).toHaveLength(6); revealedCentral(moving);
  for (const kind of ['pump', 'return', 'product']) {
    const particles = moving.flowParticles.filter((p: any) => p.kind === kind); expect(particles).toHaveLength(2);
    expect(particles[1].phase - particles[0].phase).toBeCloseTo(.5, 10);
    const path = particles[0].path; expect(path).toHaveLength(4);
    for (let i = 1; i < path.length; i++) {
      expect(path[i].every(Number.isFinite)).toBe(true);
      if (kind === 'pump') expect(path[i][0]).toBeLessThan(path[i - 1][0]);
      else expect(path[i][0]).toBeGreaterThan(path[i - 1][0]);
    }
  }
  expect(moving.flowParticles.every((p: any) => p.interpolationError < 1e-12)).toBe(true);
  const phaseStart = moving.flowClock;
  await expect.poll(async () => (await scene(page)).flowClock - phaseStart).toBeGreaterThan(.15);
  await expect.poll(async () => JSON.stringify((await scene(page)).flowPositions)).not.toBe(JSON.stringify(moving.flowPositions));
  await page.getByRole('button', { name: 'Pause ambience', exact: true }).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'paused');
  const paused = await scene(page); await page.waitForTimeout(350); const unchanged = await scene(page);
  expect(unchanged.flowPositions).toEqual(paused.flowPositions); expect(unchanged.flowClock).toBe(paused.flowClock);
  expect(unchanged.flowParticles.every((p: any) => p.interpolationError < 1e-12)).toBe(true);
  await page.locator('.sx-mito-energy').getByRole('button', { name: /ATP synthase$/ }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'energy-synthase');
  await expect(canvas(page)).toHaveAttribute('data-atlas-mito-fold', '0');
  await capture(page, 'mito-desktop-energy');
  await page.getByRole('button', { name: 'Open cutaway', exact: true }).click();
  const closed = await scene(page); expect(closed.coverVisible).toBe(true); expect(closed.coverLayers).toBe(2); expect(closed.flowVisible).toBe(false); opaqueCentral(closed);
  await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'hidden'); expect(closed.width).toBeCloseTo(initial.width, 8); expect(closed.geometry).toEqual(initial.geometry);
  await capture(page, 'mito-desktop-closed');
  await page.getByRole('button', { name: 'Open cutaway', exact: true }).click(); expect((await scene(page)).coverVisible).toBe(false);
  save('mito-desktop', { initial, respiratoryClicked, respiratoryView, clicked, fourth, seventh, moving, paused, closed, ...log }); expect(log.errors).toEqual([]); expect(log.external).toEqual([]);
});

test('phone touch and keyboard reach each route end with reduced motion and stable flow', async ({ page }) => {
  const log = await mount(page, true, true), initial = await scene(page); expect(initial.type).toBe('webgl');
  const start = page.getByRole('button', { name: 'Trace the cristae', exact: true }); await start.scrollIntoViewIfNeeded();
  const target = await start.boundingBox(); expect(target!.width).toBeGreaterThanOrEqual(44); expect(target!.height).toBeGreaterThanOrEqual(44);
  await start.tap(); await fold(page, 4); await expect(canvas(page)).toBeInViewport();
  await foldSlider(page).focus(); await foldSlider(page).press('ArrowRight'); await fold(page, 5);
  await foldSlider(page).press('Home'); await fold(page, 1); await expect(route(page).getByRole('button', { name: 'Previous fold', exact: true })).toBeDisabled();
  await foldSlider(page).press('End'); await fold(page, 7); await expect(route(page).getByRole('button', { name: 'Next fold', exact: true })).toBeDisabled();
  await route(page).getByRole('button', { name: 'Previous fold', exact: true }).press('Enter'); await fold(page, 6);
  for (const label of ['Previous fold', 'Next fold', 'Whole mitochondrion']) { const box = await route(page).getByRole('button', { name: label, exact: true }).boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); }
  expect((await foldSlider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await flow(page).tap(); await canvas(page).scrollIntoViewIfNeeded(); await expect(canvas(page)).toHaveAttribute('data-atlas-mito-flow', 'paused');
  const still = await scene(page); await page.waitForTimeout(350); const unchanged = await scene(page);
  expect(unchanged.flowPositions).toEqual(still.flowPositions); expect(unchanged.flowClock).toBe(still.flowClock);
  expect((await scene(page)).width).toBeCloseTo(initial.width, 8); expect((await scene(page)).scale).toBe(initial.scale);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); await canvas(page).scrollIntoViewIfNeeded(); await capture(page, 'mito-phone-route');
  await route(page).getByRole('button', { name: 'Whole mitochondrion', exact: true }).tap(); await expect(route(page)).toHaveCount(0);
  await expect(canvas(page)).toHaveAttribute('data-atlas-mito-fold', '0'); await expect(canvas(page)).toHaveAttribute('data-atlas-zoom', '1.00');
  save('mito-phone', { initial, still, ...log }); expect(log.errors).toEqual([]); expect(log.external).toEqual([]);
});

test('notebook restores the exact fold and mitochondrial genome portal preserves the return route', async ({ page }) => {
  const log = await mount(page, false, true), book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await page.getByRole('button', { name: 'Trace the cristae', exact: true }).click(); await fold(page, 4); await foldSlider(page).fill('6'); await fold(page, 6);
  const zoom = Number(await canvas(page).getAttribute('data-atlas-zoom'));
  await book.getByRole('textbox', { name: 'What do you notice?', exact: true }).fill('The sixth inner-membrane fold.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData._scaleExplorer.observations[0]);
  expect(saved).toMatchObject({ itemId: 'mitochondrion', detailId: 'crista-06', size: 1e-6, zoom, note: 'The sixth inner-membrane fold.' });
  await page.locator('.sx-details').getByRole('button', { name: /Mitochondrial DNA/i }).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'genome');
  const portal = page.getByRole('region', { name: 'Continue the journey', exact: true }); await expect(portal).toBeVisible(); await portal.getByRole('button', { name: /^Explore/ }).click();
  await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'dna');
  const breadcrumb = page.getByRole('navigation', { name: 'Your exploration route', exact: true }).getByRole('button', { name: /^Return to/ });
  await expect(breadcrumb).toBeVisible(); await breadcrumb.click(); await expect(canvas(page)).toHaveAttribute('data-atlas-objects', 'mitochondrion');
  await expect(canvas(page)).toHaveAttribute('data-atlas-detail', 'genome'); await expect(canvas(page)).toHaveAttribute('data-atlas-cutaway', 'open');
  await book.locator('[data-observation="mitochondrion:crista-06"]').getByRole('button', { name: /^Return to/ }).click(); await fold(page, 6);
  await expect(canvas(page)).toHaveAttribute('data-atlas-zoom', zoom.toFixed(2)); await expect(book.getByRole('textbox')).toHaveValue('The sixth inner-membrane fold.');
  await expect(page.locator('.sx-details').getByRole('link', { name: 'Read the science source', exact: true })).toHaveAttribute('href', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4625866/');
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click(); await expect(canvas(page)).toHaveAttribute('data-atlas-mito-fold', '0'); await expect(route(page)).toHaveCount(0);
  expect((await scene(page)).width).toBeCloseTo(1, 5); save('mito-notebook-portal', { saved, ...log }); expect(log.errors).toEqual([]); expect(log.external).toEqual([]);
});

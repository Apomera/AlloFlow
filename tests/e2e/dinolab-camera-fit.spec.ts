import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = process.env.DINO_CAMERA_FIT_REPORT_DIR || 'reports/dinolab-camera-fit';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__fitScene=s;window.__fitCamera=c;window.__fitRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
async function settle(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function mount(page: Page, species: string, width: number, layers: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false, field3dLabelMode: 'off',
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100, ...layers } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__fitScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await settle(page);
}
async function inspect(page: Page, region = 'full') {
  return page.evaluate(region => {
    const w = window as any, T = w.THREE, scene = w.__fitScene, camera = w.__fitCamera, renderer = w.__fitRenderer, model = scene.getObjectByName('dinolab-specimen');
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const raw = region === 'full' ? model.userData.overviewBounds : model.userData.studyBounds[region];
    const bounds = new T.Box3(new T.Vector3().fromArray(raw.min), new T.Vector3().fromArray(raw.max)), half = bounds.getSize(new T.Vector3()).multiplyScalar(.5);
    const center = bounds.getCenter(new T.Vector3()).applyMatrix4(model.matrixWorld), distance = camera.position.distanceTo(center), yaw = model.rotation.y;
    const pitch = Math.asin((camera.position.y - center.y) / distance), tangent = Math.tan(camera.fov * Math.PI / 360);
    const across = Math.abs(Math.cos(yaw)) * half.x + Math.abs(Math.sin(yaw)) * half.z, along = Math.abs(Math.sin(yaw)) * half.x + Math.abs(Math.cos(yaw)) * half.z;
    const oldDistance = Math.max((half.y * Math.cos(pitch) + along * Math.sin(pitch)) / tangent, across / (tangent * Math.max(.1, camera.aspect))) * 1.24 + half.y * Math.sin(pitch) + along * Math.cos(pitch);
    const points = [];
    for (const x of [raw.min[0], raw.max[0]]) for (const y of [raw.min[1], raw.max[1]]) for (const z of [raw.min[2], raw.max[2]]) points.push(new T.Vector3(x, y, z).applyMatrix4(model.matrixWorld).project(camera).toArray());
    const geometries = new Set<string>(), materials = new Set<string>();
    model.traverse((node: any) => { if (!node.isMesh) return; geometries.add(node.geometry.uuid); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat.uuid); });
    return { model: model.uuid, geometries: [...geometries].sort(), materials: [...materials].sort(), state: w.__toolData.dinoLab, camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(),
      center: center.toArray(), distance, oldDistance, points, canvas: [renderer.domElement.clientWidth, renderer.domElement.clientHeight],
      readout: document.querySelector('.dinolab-3d-camera-readout')?.textContent, errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length, fits: document.documentElement.scrollWidth <= innerWidth };
  }, region);
}
function healthy(row: Awaited<ReturnType<typeof inspect>>, full = true) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fits).toBe(true);
  for (const point of row.points) { expect(point.every(Number.isFinite)).toBe(true); expect(Math.max(...point.map(Math.abs))).toBeLessThan(1); }
  if (full) {
    expect(row.readout).toContain('full model'); expect(row.readout).toContain('Zoom 100 percent');
    expect(row.distance).toBeLessThanOrEqual(row.oldDistance + 1e-6);
    expect(Math.max(...row.points.flatMap(point => [Math.abs(point[0]), Math.abs(point[1])]))).toBeCloseTo(1 / 1.24, 5);
  }
}
async function controls(page: Page) {
  const summary = page.locator('.dinolab-3d-controls-disclosure > summary');
  if (!(await summary.evaluate(node => node.parentElement!.hasAttribute('open')))) await summary.click();
}
async function photo(page: Page, name: string) { await settle(page); await page.locator('.dinolab-3d-viewer').screenshot({ path: report + '/' + name + '.png' }); }
async function comparison(page: Page, name: string) {
  const before = await inspect(page); healthy(before);
  // Render the previous fit on this same specimen for a true camera-only
  // comparison. Restore the native camera before any UI interaction.
  await page.evaluate(row => {
    const w = window as any, T = w.THREE, c = w.__fitCamera, center = new T.Vector3().fromArray(row.center);
    w.__fitSavedCamera = { position: c.position.clone(), near: c.near, far: c.far };
    c.position.copy(center).add(new T.Vector3().fromArray(row.camera).sub(center).normalize().multiplyScalar(row.oldDistance));
    c.near = Math.max(.005, row.oldDistance / 500); c.far = Math.max(c.far, row.oldDistance * 8);
    c.updateProjectionMatrix(); c.updateMatrixWorld(true); w.__fitRenderer.render(w.__fitScene, c);
  }, before);
  await page.locator('.dinolab-3d-viewer').screenshot({ path: report + '/' + name + '-before.png' });
  await page.evaluate(() => {
    const w = window as any, c = w.__fitCamera, saved = w.__fitSavedCamera;
    c.position.copy(saved.position); c.near = saved.near; c.far = saved.far; c.updateProjectionMatrix(); c.updateMatrixWorld(true); w.__fitRenderer.render(w.__fitScene, c);
  });
  await photo(page, name + '-after'); expect(await inspect(page)).toEqual(before); return before;
}

test('whole animal uses more of desktop and phone frames without clipping during orbit', async ({ page }) => {
  await mount(page, 'tyrannosaurus', 1180); const desktop = await comparison(page, 'tyrannosaurus-desktop');
  await page.setViewportSize({ width: 320, height: 844 }); await settle(page); const phone = await comparison(page, 'tyrannosaurus-320px');
  expect(phone.distance).toBeLessThan(phone.oldDistance * .96);
  for (const field of ['model', 'geometries', 'materials', 'state'] as const) expect(phone[field]).toEqual(desktop[field]);
  await controls(page); const views = [];
  for (const view of ['Side', 'Front', 'Overhead']) {
    await page.getByRole('button', { name: view + ' camera view', exact: true }).click(); await settle(page);
    const row = await inspect(page); healthy(row); expect(row.model).toBe(phone.model); views.push({ view, row });
  }
  await canvas(page).focus(); await page.keyboard.press('ArrowRight'); await settle(page); healthy(await inspect(page));
  fs.writeFileSync(report + '/desktop-phone-audit.json', JSON.stringify({ desktop, phone, views }, null, 2));
});

test('tall skeleton, rulers and fossil tray stay inside the tighter whole-animal frame', async ({ page }) => {
  await mount(page, 'brachiosaurus', 390, { field3dShowEvidence: true, field3dShowSkeleton: true, field3dShowBody: false });
  const initial = await comparison(page, 'brachiosaurus-390px'); await controls(page);
  await page.getByRole('button', { name: 'Overhead camera view', exact: true }).click(); await settle(page); const overhead = await inspect(page); healthy(overhead);
  await page.getByRole('button', { name: 'Study size reference', exact: true }).click(); await settle(page); const size = await inspect(page, 'size'); healthy(size, false);
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page); const head = await inspect(page, 'head'); healthy(head, false);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await settle(page); const returned = await inspect(page); healthy(returned);
  expect(returned.camera).toEqual(initial.camera); expect(returned.state).toEqual(initial.state);
  fs.writeFileSync(report + '/sauropod-audit.json', JSON.stringify({ initial, overhead, size, head, returned }, null, 2));
});

test('small feathered animal keeps scientific labels and exact return from whole-animal context', async ({ page }) => {
  await mount(page, 'archaeopteryx', 320); const initial = await comparison(page, 'archaeopteryx-320px');
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click(); await page.locator('#dinolab-part-picker').selectOption('wing');
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).check(); await page.getByRole('checkbox', { name: 'Focus selected label', exact: true }).check(); await settle(page);
  const label = page.locator('[data-dino-part-label="wing"]'); await expect(label).toBeVisible(); await expect(label.locator('[data-dino-anatomical-name]')).not.toBeEmpty();
  const detail = await inspect(page, 'body');
  await page.locator('[data-dino-part-context-toggle]').click(); await settle(page); const context = await inspect(page); healthy(context);
  await expect(label).toBeVisible(); await photo(page, 'archaeopteryx-scientific-context');
  await page.locator('[data-dino-part-context-toggle]').click(); await settle(page); const returned = await inspect(page, 'body');
  for (const field of ['model', 'geometries', 'materials', 'camera', 'quaternion', 'projection', 'state', 'readout'] as const) expect(returned[field]).toEqual(detail[field]);
  fs.writeFileSync(report + '/small-animal-audit.json', JSON.stringify({ initial, detail, context, returned }, null, 2));
});

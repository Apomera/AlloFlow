import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0, mode: 'serial' });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-context-return';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1280, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.__contextIdentity=(window.__contextRendererCount||0)+1;window.__contextRendererCount=r.__contextIdentity;r.render=function(s,c){window.__contextScene=s;window.__contextCamera=c;window.__contextRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
const toggle = (page: Page) => page.locator('[data-dino-part-context-toggle]');
const summary = (page: Page) => page.locator('.dinolab-selected-part-summary');
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function showCanvas(page: Page) { await canvas(page).scrollIntoViewIfNeeded(); await settle(page); }
async function mount(page: Page, species: string, width: number) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__contextScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
}
async function select(page: Page, part: string) {
  await page.locator('#dinolab-part-picker').selectOption(part); await showCanvas(page);
  // Wait for the requested side pose, which can be deferred while the guide
  // has scrolled the native canvas out of view.
  await expect.poll(() => page.evaluate(() => (window as any).__contextScene.getObjectByName('dinolab-specimen').rotation.y)).toBe(0);
  await expect(page.locator('[data-dino-part-label="' + part + '"]')).toBeVisible(); await settle(page);
}
async function activateContext(page: Page, returning = false) {
  await expect(toggle(page)).toHaveAccessibleName(returning ? 'Return to detail' : 'See whole animal');
  await toggle(page).focus(); await page.keyboard.press('Enter'); await expect(canvas(page)).toBeFocused(); await settle(page);
  await expect(toggle(page)).toHaveAccessibleName(returning ? 'See whole animal' : 'Return to detail');
  await expect(toggle(page)).toHaveAttribute('aria-pressed', returning ? 'false' : 'true');
  const box = await canvas(page).boundingBox();
  expect(box!.y).toBeLessThan(page.viewportSize()!.height); expect(box!.y + box!.height).toBeGreaterThan(0);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, renderer = w.__contextRenderer, camera = w.__contextCamera, model = w.__contextScene.getObjectByName('dinolab-specimen');
    const geometries = new Set<string>(), materials = new Set<string>();
    model.traverse((mesh: any) => { if (!mesh.isMesh) return; if (mesh.geometry) geometries.add(mesh.geometry.uuid); for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (mat) materials.add(mat.uuid); });
    const overlay = document.querySelector('.dinolab-body-label-overlay') as HTMLElement, bounds = overlay.getBoundingClientRect();
    const labels = Array.from(overlay.querySelectorAll<HTMLElement>('[data-dino-part-label]')).filter(node => getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden').map(node => {
      const rect = node.getBoundingClientRect();
      return { id: node.dataset.dinoPartLabel, term: node.querySelector('[data-dino-anatomical-name]')?.textContent, selected: node.getAttribute('aria-pressed') === 'true',
        x: rect.left - bounds.left, y: rect.top - bounds.top, width: rect.width, height: rect.height, contentFits: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1 };
    });
    const strip = document.querySelector('.dinolab-selected-part-summary') as HTMLElement;
    return { renderer: renderer.__contextIdentity, model: model.uuid, geometries: [...geometries].sort(), materials: [...materials].sort(),
      camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(), rotation: model.rotation.toArray(), aspect: camera.aspect,
      selected: (document.querySelector('#dinolab-part-picker') as HTMLSelectElement)?.value,
      study: document.querySelector('.dinolab-study-controls [aria-pressed="true"]')?.getAttribute('aria-label'),
      presets: Array.from(document.querySelectorAll('.dinolab-3d-view-controls [aria-pressed="true"]')).map(node => node.getAttribute('aria-label')),
      readout: document.querySelector('.dinolab-3d-camera-readout')?.textContent,
      focused: !!w.__toolData.dinoLab.field3dFocusSelectedLabel, scientific: !!w.__toolData.dinoLab.field3dScientificNames,
      labels, overlay: { width: bounds.width, height: bounds.height }, summaryFits: !strip || strip.scrollWidth <= strip.clientWidth + 1,
      fitsPage: document.documentElement.scrollWidth <= innerWidth, errors: w.__events.errors, lost: w.__glLive().lost,
      shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true); expect(row.summaryFits).toBe(true);
  for (const item of row.labels) {
    expect(item.contentFits, item.id + ' text fits').toBe(true); expect(item.height).toBeGreaterThanOrEqual(43.99);
    expect(item.x).toBeGreaterThanOrEqual(-1); expect(item.y).toBeGreaterThanOrEqual(-1);
    expect(item.x + item.width).toBeLessThanOrEqual(row.overlay.width + 1); expect(item.y + item.height).toBeLessThanOrEqual(row.overlay.height + 1);
  }
}
function retained(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>) {
  healthy(after);
  for (const field of ['renderer', 'model', 'geometries', 'materials', 'selected', 'focused', 'scientific']) expect(after[field], field + ' retained').toEqual(before[field]);
}
function exactView(before: Awaited<ReturnType<typeof audit>>, after: Awaited<ReturnType<typeof audit>>) {
  retained(before, after);
  for (const field of ['camera', 'quaternion', 'projection', 'rotation', 'study', 'presets', 'readout']) expect(after[field], field + ' restored exactly').toEqual(before[field]);
}
async function fittedGeometry(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, model = w.__contextScene.getObjectByName('dinolab-specimen'), camera = w.__contextCamera;
    let vertices = 0, outside = 0, invalid = 0, maxProjection = 0;
    model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    model.traverseVisible((mesh: any) => {
      const position = mesh.isMesh && mesh.geometry?.attributes.position; if (!position) return;
      const point = new T.Vector3();
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).project(camera); vertices++;
        const extent = Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z));
        if (!Number.isFinite(extent)) invalid++; if (extent > 1.001) outside++; maxProjection = Math.max(maxProjection, extent);
      }
    });
    return { vertices, outside, invalid, maxProjection };
  });
}
async function resize(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 }); await showCanvas(page);
  await expect.poll(() => page.evaluate(() => { const w = window as any, c = document.querySelector('canvas.dinolab-3d-canvas') as HTMLCanvasElement; return Math.abs(w.__contextCamera.aspect - c.clientWidth / c.clientHeight) < 1e-8; })).toBe(true);
  await settle(page);
}
async function focusedLabelClearance(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, model = w.__contextScene.getObjectByName('dinolab-specimen'), camera = w.__contextCamera;
    const surface = document.querySelector('canvas.dinolab-3d-canvas') as HTMLCanvasElement;
    const overlay = document.querySelector('.dinolab-body-label-overlay')!.getBoundingClientRect();
    const selected = document.querySelector('[data-dino-part-label][aria-pressed="true"]')!.getBoundingClientRect();
    const label = { x: selected.left - overlay.left, y: selected.top - overlay.top, width: selected.width, height: selected.height };
    const anchors: Record<string, { id: string, x: number, y: number, depth: number }> = {};
    model.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    model.traverse((node: any) => {
      const id = node.userData.dinoBodyPart; if (node.isMesh || !['head', 'trunk', 'hip'].includes(id)) return;
      const world = node.getWorldPosition(new T.Vector3()), view = world.clone().applyMatrix4(camera.matrixWorldInverse), clip = world.clone().project(camera);
      if (view.z >= 0 || Math.max(Math.abs(clip.x), Math.abs(clip.y), Math.abs(clip.z)) > 1) return;
      // The marker renderer chooses the frontmost visible anchor for each part.
      if (!anchors[id] || view.z > anchors[id].depth) anchors[id] = { id, x: (clip.x + 1) * surface.clientWidth / 2, y: (1 - clip.y) * surface.clientHeight / 2, depth: view.z };
    });
    return { label, anchors: Object.values(anchors).map(point => ({ ...point,
      covered: point.x > label.x && point.x < label.x + label.width && point.y > label.y && point.y < label.y + label.height })) };
  });
}

test('whole-animal context preserves a manually adjusted detail frame and returns exactly', async ({ page }) => {
  await mount(page, 'microraptor', 1280); await select(page, 'hand');
  await canvas(page).focus();
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowUp', 'PageUp']) await canvas(page).press(key);
  await settle(page); const detail = await audit(page); healthy(detail);
  expect(detail.study).toBe('Study body details'); expect(detail.presets).toEqual([]); expect(detail.rotation[1]).not.toBe(0);
  await canvas(page).screenshot({ path: report + '/microraptor-adjusted-detail-desktop.png' });
  await activateContext(page); const whole = await audit(page); retained(detail, whole);
  expect(whole.study).toBe('Study whole animal'); expect(whole.rotation).toEqual(detail.rotation);
  whole.quaternion.forEach((value: number, index: number) => expect(value).toBeCloseTo(detail.quaternion[index], 10));
  expect(whole.readout).toContain('Zoom 100 percent'); expect(whole.camera).not.toEqual(detail.camera);
  const fit = await fittedGeometry(page); expect(fit.vertices).toBeGreaterThan(0); expect(fit.invalid).toBe(0); expect(fit.outside).toBe(0);
  await canvas(page).screenshot({ path: report + '/microraptor-whole-context-desktop.png' });
  for (const key of ['ArrowLeft', 'ArrowDown', 'PageDown']) await canvas(page).press(key);
  await settle(page); const orbitedWhole = await audit(page); expect(orbitedWhole.rotation).not.toEqual(detail.rotation);
  await activateContext(page, true); const returned = await audit(page); exactView(detail, returned);
  await canvas(page).screenshot({ path: report + '/microraptor-returned-detail-desktop.png' });
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await showCanvas(page);
  const reset = await audit(page); retained(detail, reset); expect(reset.study).toBe('Study whole animal'); expect(reset.rotation[1]).toBe(0.35); expect(reset.readout).toContain('Zoom 100 percent');
  await expect(toggle(page)).toHaveAccessibleName('See whole animal'); await expect(toggle(page)).toBeDisabled();

  await select(page, 'knee'); await activateContext(page);
  const relation = page.locator('.dinolab-supporting-relation[data-dino-support-relation="knee-ankle"]');
  if (!(await relation.evaluate(node => (node as HTMLDetailsElement).open))) await relation.locator(':scope > summary').click();
  await relation.locator('[data-dino-support-start]').click(); await showCanvas(page); await expect(toggle(page)).toHaveCount(0);
  await relation.locator('[data-dino-support-end]').click(); await showCanvas(page);
  await expect(toggle(page)).toHaveAccessibleName('See whole animal'); await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  fs.writeFileSync(report + '/desktop-audit.json', JSON.stringify({ detail, whole, fit, orbitedWhole, returned, reset }, null, 2));
});

test('mobile scientific context survives resize and clears stale returns when part or layers change', async ({ page }) => {
  await mount(page, 'triceratops', 320); await select(page, 'frill');
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Focus selected label', exact: true }).check(); await showCanvas(page);
  const detail = await audit(page); healthy(detail); expect(detail.scientific).toBe(true); expect(detail.focused).toBe(true);
  await expect(summary(page)).toContainText('Parietosquamosal frill');
  await activateContext(page); const whole320 = await audit(page); retained(detail, whole320);
  expect(whole320.labels.map(item => item.id)).toEqual(['frill']); expect(whole320.labels[0].term).toBe('Parietosquamosal frill');
  await canvas(page).screenshot({ path: report + '/frill-whole-context-320px.png' });
  const clearance = await focusedLabelClearance(page);
  expect(clearance.anchors.map(point => point.id).sort()).toEqual(['head', 'hip', 'trunk']);
  for (const point of clearance.anchors) expect(point.covered, point.id + ' anchor remains clear when its label is hidden').toBe(false);
  await resize(page, 390); const whole390 = await audit(page); retained(detail, whole390); expect(whole390.aspect).not.toBe(detail.aspect);
  await activateContext(page, true); const returned390 = await audit(page); retained(detail, returned390);
  expect(returned390.study).toBe('Study head details'); expect(returned390.rotation).toEqual(detail.rotation); expect(returned390.presets).toEqual(detail.presets);
  returned390.quaternion.forEach((value: number, index: number) => expect(value).toBeCloseTo(detail.quaternion[index], 10));
  await resize(page, 320); const returned320 = await audit(page); exactView(detail, returned320);
  await canvas(page).screenshot({ path: report + '/frill-returned-detail-320px.png' });
  await summary(page).screenshot({ path: report + '/frill-context-controls-320px.png' });

  await activateContext(page); await select(page, 'horns');
  await expect(toggle(page)).toHaveAccessibleName('See whole animal'); await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(summary(page)).toContainText('Horns');
  await activateContext(page);
  await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Fossil anchors/ }).click(); await showCanvas(page);
  await expect(toggle(page)).toHaveAccessibleName('See whole animal'); await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  const rebuilt = await audit(page); healthy(rebuilt); expect(rebuilt.selected).toBe('horns'); expect(rebuilt.scientific).toBe(true); expect(rebuilt.focused).toBe(true);
  await page.getByRole('combobox', { name: 'Choose species for 3D field station', exact: true }).selectOption('tyrannosaurus'); await showCanvas(page);
  await expect(toggle(page)).toHaveCount(0);
  fs.writeFileSync(report + '/mobile-audit.json', JSON.stringify({ detail, whole320, clearance, whole390, returned390, returned320, rebuilt }, null, 2));
});

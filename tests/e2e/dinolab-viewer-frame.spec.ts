import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off', actionTimeout: 60_000 });
const report = 'reports/dinolab-viewer-frame';
const baseline = process.env.DINO_FRAME_PHASE === 'before', phase = baseline ? 'before' : 'after';
const harness = new GlHarness({ toolFile: process.env.DINO_FRAME_SOURCE || 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 960, layout: 'document', appStyles: true,
  probes: 'var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),draw=r.render.bind(r);r.render=function(s,c){window.__frameScene=s;window.__frameCamera=c;window.__frameRenderer=r;return draw(s,c);};return r;};' });
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const canvas = (page: Page) => page.locator('canvas.dinolab-3d-canvas');
async function settle(page: Page) {
  await canvas(page).scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function mount(page: Page, species: string, width = 1180) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', selected: species, field3dSelected: species, field3dStage: 'studio', field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: false, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false, field3dBodyOpacity: 100 } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__frameScene?.getObjectByName('dinolab-specimen')), { timeout: 120_000 }).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await settle(page);
}
async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, scene = w.__frameScene, camera = w.__frameCamera, renderer = w.__frameRenderer, model = scene.getObjectByName('dinolab-specimen');
    const box = (node: Element | null) => { if (!node) return null; const b = node.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
    const c = document.querySelector('canvas.dinolab-3d-canvas')!, stage = document.querySelector('.dinolab-3d-stage'), footer = document.querySelector('.dinolab-viewer-footer');
    const overlay = document.querySelector('.dinolab-body-label-overlay') as HTMLElement, cb = c.getBoundingClientRect();
    const readout = document.querySelector('.dinolab-3d-camera-readout') as HTMLElement, status = document.querySelector('.dinolab-3d-status') as HTMLElement;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.dinolab-viewer-actions,.dinolab-3d-camera-readout,.dinolab-3d-status'));
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.dinolab-viewer-actions button')).map(node => ({ name: node.textContent, box: box(node), fits: node.scrollWidth <= node.clientWidth + 1 }));
    const geometries = new Set<string>(), materials = new Set<string>();
    model.traverse((node: any) => { if (!node.isMesh) return; geometries.add(node.geometry.uuid); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat.uuid); });
    const visibleLabels = getComputedStyle(overlay).display === 'none' ? [] : Array.from(overlay.querySelectorAll<HTMLElement>('[data-dino-part-label]')).filter(node => getComputedStyle(node).display !== 'none').map(node => {
      const b = node.getBoundingClientRect();
      return { id: node.dataset.dinoPartLabel, selected: node.getAttribute('aria-pressed') === 'true', term: node.querySelector('[data-dino-anatomical-name]')?.textContent,
        x: b.x - cb.x, y: b.y - cb.y, right: b.right - cb.x, bottom: b.bottom - cb.y, fits: node.scrollWidth <= node.clientWidth + 1 && node.scrollHeight <= node.clientHeight + 1 };
    });
    return { model: model.uuid, geometries: [...geometries].sort(), materials: [...materials].sort(), camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(),
      canvas: box(c)!, stage: box(stage), footer: box(footer), overlay: box(overlay), chrome: nodes.map(node => ({ box: box(node)!, fits: node.scrollWidth <= node.clientWidth + 1 })), buttons, visibleLabels,
      readout: readout.textContent, readoutFontSize: parseFloat(getComputedStyle(readout).fontSize), status: status.textContent, statusFontSize: parseFloat(getComputedStyle(status).fontSize),
      live: [status.getAttribute('role'), status.getAttribute('aria-live'), status.getAttribute('aria-atomic')], state: w.__toolData.dinoLab,
      errors: w.__events.errors, lost: w.__glLive().lost, shaderFailures: renderer.info.programs.filter((p: any) => p.diagnostics?.runnable === false).length,
      fitsPage: document.documentElement.scrollWidth <= innerWidth };
  });
}
function healthy(row: Awaited<ReturnType<typeof audit>>) {
  expect(row.errors).toEqual([]); expect(row.lost).toBe(false); expect(row.shaderFailures).toBe(0); expect(row.fitsPage).toBe(true);
  expect(row.live).toEqual(['status', 'polite', 'true']); expect(row.camera.every(Number.isFinite)).toBe(true);
  if (baseline) return;
  expect(row.footer!.y).toBeGreaterThanOrEqual(row.canvas.bottom - 1);
  expect(row.stage!.height).toBeCloseTo(row.canvas.height, 1);
  for (const node of row.chrome) {
    expect(node.box.y).toBeGreaterThanOrEqual(row.canvas.bottom - 1); expect(node.fits).toBe(true);
    expect(node.box.x).toBeGreaterThanOrEqual(row.canvas.x); expect(node.box.right).toBeLessThanOrEqual(row.canvas.right + 1);
  }
  expect(row.readoutFontSize).toBeGreaterThanOrEqual(12); expect(row.statusFontSize).toBeGreaterThanOrEqual(12);
  for (const button of row.buttons) { expect(button.box!.height).toBeGreaterThanOrEqual(43.99); expect(button.fits).toBe(true); }
  for (const label of row.visibleLabels) {
    expect(label.fits).toBe(true); expect(label.x).toBeGreaterThanOrEqual(-1); expect(label.y).toBeGreaterThanOrEqual(-1);
    expect(label.right).toBeLessThanOrEqual(row.canvas.width + 1); expect(label.bottom).toBeLessThanOrEqual(row.canvas.height + 1);
  }
}
async function photo(page: Page, name: string) { await settle(page); await page.locator('.dinolab-3d-viewer').screenshot({ path: report + '/' + phase + '-' + name + '.png' }); }

test('viewer controls and camera text leave the model clear from desktop to 320px', async ({ page }) => {
  await mount(page, 'tyrannosaurus'); const initial = await audit(page), rows = [];
  for (const width of [1180, 720, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 960 }); await settle(page);
    const row = await audit(page); healthy(row);
    for (const field of ['model', 'geometries', 'materials', 'state'] as const) expect(row[field], field + ' retained on resize').toEqual(initial[field]);
    rows.push({ width, row }); await photo(page, 'whole-' + width + 'px');
  }
  await canvas(page).focus(); const beforeKey = await audit(page); await page.keyboard.press('ArrowRight'); await page.keyboard.press('PageUp'); await settle(page);
  const moved = await audit(page); healthy(moved); expect(moved.camera).not.toEqual(beforeKey.camera); expect(moved.readout).not.toBe(beforeKey.readout);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).focus(); await page.keyboard.press('Enter'); await settle(page);
  expect((await audit(page)).readout).toContain('Zoom 100 percent');
  fs.writeFileSync(report + '/' + phase + '-responsive-audit.json', JSON.stringify({ initial, rows, moved }, null, 2));
});

test('scientific callouts stay aligned with the canvas through detail and whole-animal views', async ({ page }) => {
  await mount(page, 'triceratops', 320);
  await page.getByRole('button', { name: 'Body-part labels', exact: true }).click();
  await page.locator('#dinolab-part-picker').selectOption('frill');
  await page.getByRole('checkbox', { name: 'Show scientific names', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Focus selected label', exact: true }).check(); await settle(page);
  await expect(page.locator('[data-dino-part-label="frill"]')).toBeVisible();
  const detail = await audit(page); healthy(detail); expect(detail.visibleLabels).toHaveLength(1);
  expect(detail.visibleLabels[0].term).toBeTruthy();
  if (!baseline) expect(detail.overlay!.height).toBeCloseTo(detail.canvas.height, 1);
  await photo(page, 'frill-detail-320px');
  const context = page.locator('[data-dino-part-context-toggle]');
  await context.click(); await settle(page); const whole = await audit(page); healthy(whole);
  expect(whole.readout).toContain('full model'); await photo(page, 'frill-context-320px');
  await context.click(); await settle(page); const returned = await audit(page); healthy(returned);
  for (const field of ['model', 'geometries', 'materials', 'camera', 'quaternion', 'projection', 'readout', 'state'] as const) expect(returned[field], field + ' restored').toEqual(detail[field]);
  fs.writeFileSync(report + '/' + phase + '-anatomy-audit.json', JSON.stringify({ detail, whole, returned }, null, 2));
});

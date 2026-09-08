
import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-enhancement-2026-09-08';
const state = { specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'skin', anatomicalView: 'dorsal', toolbarStudyOpen: true,
  reducedMotion: true, soundEnabled: false, exploredOrgans: { 'sheepEye|cornea': true }, organNotes: { 'sheepEye|cornea': 'I observed the curved anterior surface.' },
  organConfidence: { 'sheepEye|cornea': 2 }, revealedLayers: {}, quizScore: 1, quizTotal: 2 };

test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });

test('3D eye study loads on demand, rotates, selects references, and releases resources', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const original = (window as any).StemLab.ensureThree;
    (window as any).__eyeLoads = 0;
    (window as any).StemLab.ensureThree = function (options: any) { (window as any).__eyeLoads++; return original.call(this, options); };
  });
  await expect(page.locator('[data-eye-study]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__eyeLoads)).toBe(0);
  await page.locator('#diss-eye-study-toggle').click();
  const panel = page.locator('[data-eye-study]');
  const canvas = panel.locator('[data-eye-canvas]');
  await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  await expect(panel.locator('#diss-eye-study-title')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__eyeLoads)).toBe(1);
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissEyeStudy.renderCount)).toBeGreaterThan(0);
  await panel.locator('[data-eye-part="optic_nerve"]').click();
  await expect(canvas).toHaveAttribute('data-eye-selected', 'optic_nerve');
  await expect(panel.locator('.diss-eye-study__reference')).toContainText('Light does not travel along it');
  await panel.getByRole('button', { name: 'Side', exact: true }).click();
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await expect(panel.locator('[data-eye-camera]')).toHaveAttribute('data-eye-view', 'custom');
  await page.keyboard.press('Home');
  await expect(panel.locator('[data-eye-camera]')).toHaveAttribute('data-eye-view', 'oblique');
  await panel.getByRole('button', { name: 'Opened shell on', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-eye-shell', 'whole');
  await panel.getByRole('button', { name: 'Open the shell', exact: true }).click();
  await panel.getByRole('button', { name: 'Anterior · cornea', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-eye-rendered-view', 'anterior');
  const front = await canvas.boundingBox();
  await page.mouse.click(front!.x + front!.width / 2, front!.y + front!.height / 2);
  await expect(canvas).toHaveAttribute('data-eye-selected', 'cornea');
  await panel.getByRole('button', { name: 'Overview', exact: true }).click();
  await panel.locator('[data-eye-part="lens"]').click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-eye-rendered-view', 'oblique');
  await expect(canvas).toHaveAttribute('data-eye-rendered-selection', 'lens');
  await panel.locator('.diss-eye-study__viewport').screenshot({ path: out + '/eye-3d-overview.png' });
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * .45, bounds!.y + bounds!.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * .6, bounds!.y + bounds!.height * .55, { steps: 8 });
  await page.mouse.up();
  await expect(panel.locator('[data-eye-camera]')).toHaveAttribute('data-eye-view', 'custom');
  const actual = await page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { specimen: d.specimen, layer: d.activeLayer, explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, revealed: d.revealedLayers, score: d.quizScore, total: d.quizTotal };
  });
  expect(actual).toEqual({ specimen: state.specimen, layer: state.activeLayer, explored: state.exploredOrgans, notes: state.organNotes, confidence: state.organConfidence, revealed: {}, score: 1, total: 2 });
  await canvas.evaluate((el: any) => { (window as any).__closedEye = el._dissEyeStudy; });
  await panel.getByRole('button', { name: 'Return to 2D dissection' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('#diss-canvas')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__closedEye.disposed)).toBe(true);
  expect(errors).toEqual([]);
});

test('phone eye study reflows and offers accessible nonvisual structure references', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  await page.locator('#diss-eye-study-toggle').click();
  const panel = page.locator('[data-eye-study]');
  await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  await panel.getByRole('button', { name: 'Anterior · cornea', exact: true }).click();
  await panel.locator('[data-eye-part="iris"]').click();
  await panel.getByRole('button', { name: 'Focus 3D view', exact: true }).click();
  await expect(panel.locator('[data-eye-canvas]')).toBeFocused();
  await expect(panel.locator('[data-eye-canvas]')).toHaveAttribute('data-eye-rendered-view', 'anterior');
  await expect(panel.locator('[data-eye-canvas]')).toHaveAttribute('data-eye-rendered-selection', 'iris');
  await panel.locator('.diss-eye-study__viewport').screenshot({ path: out + '/eye-3d-anterior-mobile.png' });
  await panel.getByRole('button', { name: 'Overview', exact: true }).click();
  await panel.locator('.diss-eye-study__transcript summary').click();
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-eye-study]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  expect(await panel.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await panel.screenshot({ path: out + '/eye-3d-study-mobile.png' });
});

test('3D failure and context recovery keep references and the 2D return available', async ({ page }) => {
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => { (window as any).StemLab.ensureThree = () => Promise.reject(new Error('Offline fixture')); });
  await page.locator('#diss-eye-study-toggle').click();
  const panel = page.locator('[data-eye-study]');
  await expect(panel).toHaveAttribute('data-eye-status', 'unavailable');
  await panel.locator('[data-eye-part="retina"]').click();
  await expect(panel.locator('.diss-eye-study__reference')).toContainText('Light-sensitive tissue');
  await page.evaluate(() => { (window as any).StemLab.ensureThree = () => Promise.resolve((window as any).THREE); });
  await panel.getByRole('button', { name: 'Retry 3D', exact: true }).click();
  await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  const canvas = panel.locator('[data-eye-canvas]');
  await expect(canvas).toHaveAttribute('data-eye-selected', 'retina');
  await canvas.evaluate((el: HTMLCanvasElement) => {
    const gl = el.getContext('webgl2') || el.getContext('webgl');
    (window as any).__eyeContext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
    (window as any).__eyeContext.loseContext();
  });
  await expect(panel).toHaveAttribute('data-eye-status', 'lost');
  await page.evaluate(() => (window as any).__eyeContext.restoreContext());
  await expect(panel).toHaveAttribute('data-eye-status', 'ready');
  await expect(canvas).toHaveAttribute('data-eye-selected', 'retina');
  await panel.getByRole('button', { name: 'Return to 2D dissection' }).click();
  await expect(page.locator('#diss-canvas')).toBeFocused();
});


test('closing a pending 3D load cannot create a detached renderer', async ({ page }) => {
  await harness.mount(page, { dissection: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const w = window as any;
    const Original = w.THREE.WebGLRenderer;
    w.__eyeRendererCount = 0;
    w.THREE.WebGLRenderer = function (options: any) { w.__eyeRendererCount++; return new Original(options); };
    w.StemLab.ensureThree = () => new Promise(resolve => { w.__resolveEye = resolve; });
  });
  await page.locator('#diss-eye-study-toggle').click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).__resolveEye)).toBe('function');
  await page.locator('[data-eye-study]').getByRole('button', { name: 'Return to 2D dissection' }).click();
  await page.evaluate(async () => {
    (window as any).__resolveEye((window as any).THREE);
    await Promise.resolve(); await Promise.resolve();
  });
  expect(await page.evaluate(() => (window as any).__eyeRendererCount)).toBe(0);
  await expect(page.locator('[data-eye-study]')).toHaveCount(0);
  await expect(page.locator('#diss-canvas')).toBeFocused();
});


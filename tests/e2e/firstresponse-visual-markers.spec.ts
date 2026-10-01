import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const report = 'reports/firstresponse-visual-markers';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080, layout: 'document', appStyles: true,
  probes: `var BaseCamera = THREE.PerspectiveCamera;
    THREE.PerspectiveCamera = class extends BaseCamera { constructor(...args) { super(...args); window.__visualCamera = this; } };
    window.__visualPose = function () {
    var canvas = document.querySelector('#wrap canvas'), rec = canvas && window.__glRecorder.forCanvas(canvas);
    if (!rec || !rec.scene) return null;
    var s = rec.scene, marker = s.getObjectByName('fr-depth-marker');
    var ref = s.getObjectByName('fr-depth-reference'), rest = s.getObjectByName('fr-depth-resting-line'), saved = s.getObjectByName('fr-depth-saved');
    var box = new THREE.Box3().setFromObject(s.getObjectByName('fr-training-manikin')), corners = [];
    for (var x of [box.min.x, box.max.x]) for (var y of [box.min.y, box.max.y]) for (var z of [box.min.z, box.max.z])
      corners.push(new THREE.Vector3(x, y, z).project(window.__visualCamera).toArray());
    return { marker: marker.position.y, reference: ref.position.y, rest: rest.position.y, saved: saved.visible, corners,
      colors: [ref.material.color.getHexString(), marker.material.color.getHexString(), saved.children[0].material.color.getHexString()],
      surfaces: [s.getObjectByName('fr-training-floor').material.color.getHexString(), s.getObjectByName('fr-training-mat').material.color.getHexString(),
        s.getObjectByName('fr-depth-chest').children[0].material.color.getHexString(), s.getObjectByName('fr-rescuer-lower-heel').material.color.getHexString()],
      fill: !!s.getObjectByName('fr-model-fill'), mat: !!s.getObjectByName('fr-training-mat'),
      hands: s.getObjectByName('fr-depth-hands').visible };
  };`
});
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: Page, width = 1280, extra = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
}
const pose = (page: Page) => page.evaluate(() => (window as any).__visualPose());
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const failures = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    // Existing diagnostic: reports/firstresponse-prediction-activity/forced-colors-auditor.json.
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
test('matte manikin and marker key preserve the saved comparison in a live WebGL scene', async ({ page }) => {
  await mount(page);
  expect((await pose(page)).mat).toBe(true); expect((await pose(page)).fill).toBe(true);
  expect((await harness.glScene(page))!.renders).toBeGreaterThan(0);
  const corners = (await pose(page)).corners;
  expect(corners.every((p: number[]) => Math.abs(p[0]) < .97 && Math.abs(p[1]) < .97 && p[2] > -1 && p[2] < 1), JSON.stringify(corners)).toBe(true);
  await page.locator('.fr-body3d-stage').screenshot({ path: report + '/whole-manikin.png' });
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Measure movement between release and peak', exact: true }).check();
  await page.locator('.fr-depth-compare summary').click();
  await page.getByRole('button', { name: 'Save current settings as A', exact: true }).click();
  await page.getByRole('button', { name: 'Try a leaning example', exact: true }).click();
  await expect.poll(async () => (await pose(page)).saved).toBe(true);
  expect((await pose(page)).colors).toEqual(['5eead4', 'fbbf24', 'c4b5fd']);
  await expect.poll(async () => (await pose(page)).marker - (await pose(page)).rest).toBeLessThan(0);
  await expect(page.locator('.fr-model-key')).toContainText('Current B height');
  await expect(page.locator('.fr-model-key')).toContainText('Reference depth');
  await expect(page.locator('.fr-model-key')).toContainText('Saved A height');
  await expect(page.locator('.fr-model-key')).toContainText('Movement per push');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/adult-marker-comparison.png' });
  await audit(page);
  await page.getByRole('button', { name: 'Clear saved A', exact: true }).click();
  await expect(page.locator('.fr-model-key [data-marker="saved"]')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Measure movement between release and peak', exact: true }).uncheck();
  await expect(page.locator('.fr-model-key [data-marker="travel"]')).toHaveCount(0);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('marker key fits phone layouts, enlarged spacing, and system colors', async ({ page }) => {
  await mount(page, 320, { b3dDepthLab: { age: 'adult', depth: 5.5, lean: 1, measure: true },
    b3dDepthReference: { age: 'adult', depth: 5.5, lean: 0 } });
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  await page.locator('.fr-model-key').scrollIntoViewIfNeeded();
  const stage = await page.locator('.fr-body3d-stage').boundingBox(), key = await page.locator('.fr-model-key').boundingBox();
  expect(key!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height);
  expect(key!.x + key!.width).toBeLessThanOrEqual(320);
  await page.screenshot({ path: report + '/phone-marker-key.png' }); await audit(page);
  await page.addStyleTag({ content: '.fr-body3d *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-body3d p{margin-bottom:2em!important}' });
  await page.locator('.fr-model-key').scrollIntoViewIfNeeded();
  await page.screenshot({ path: report + '/phone-marker-spacing.png' }); await audit(page);
  await page.emulateMedia({ forcedColors: 'active' });
  const colors = await page.locator('.fr-model-key').evaluate(el => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor,
    symbols: [...el.querySelectorAll('svg')].map(s => getComputedStyle(s).color) }));
  expect(colors.fg).toBe('rgb(0, 0, 0)'); expect(colors.bg).toBe('rgb(255, 255, 255)');
  expect(colors.symbols.every(c => c === 'rgb(0, 0, 0)')).toBe(true);
  await page.screenshot({ path: report + '/phone-marker-system-colors.png' }); await audit(page);
});
test('child placement stays clear and contrast mode uses shapes with monochrome markers', async ({ page }) => {
  await mount(page, 1280, { b3dAge: 'child', b3dChildHands: 'two', b3dTab: 'place' });
  await page.getByRole('button', { name: 'Centre of the chest', exact: true }).click();
  await expect.poll(async () => (await pose(page)).hands).toBe(true);
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/child-placement.png' }); await audit(page);
  await page.getByRole('tab', { name: /Depth \+ recoil/ }).click();
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); });
  await expect.poll(async () => (await pose(page))?.fill).toBe(false);
  expect((await pose(page)).colors).toEqual(['ffffff', 'ffffff', 'ffffff']);
  expect((await pose(page)).surfaces).toEqual(['000000', '000000', '333333', 'ffffff']);
  await expect(page.locator('.fr-model-key')).toHaveClass(/is-contrast/);
  await page.getByRole('checkbox', { name: 'Measure movement between release and peak', exact: true }).check();
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/contrast-marker-shapes.png' }); await audit(page);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

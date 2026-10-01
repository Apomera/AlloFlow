import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const report = 'reports/firstresponse-chest-inspection';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse', preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1160, height: 1080, layout: 'document', appStyles: true,
  probes: `var OriginalCamera = THREE.PerspectiveCamera;
    THREE.PerspectiveCamera = class extends OriginalCamera {
      constructor(...args) { super(...args); window.__inspectionCamera = this; }
    };
    window.__inspectionPose = function () {
      var canvas = document.querySelector('#wrap canvas');
      var rec = canvas && window.__glRecorder.forCanvas(canvas);
      var scene = rec && rec.scene, camera = window.__inspectionCamera;
      if (!scene || !camera) return null;
      var chest = scene.getObjectByName('fr-depth-chest'), hands = scene.getObjectByName('fr-depth-hands');
      var marker = scene.getObjectByName('fr-depth-marker'), travel = scene.getObjectByName('fr-depth-travel');
      var release = scene.getObjectByName('fr-depth-travel-release'), peak = scene.getObjectByName('fr-depth-travel-peak');
      var heel = scene.getObjectByName('fr-rescuer-lower-heel');
      function projected(object) { return object.getWorldPosition(new THREE.Vector3()).project(camera).toArray(); }
      return { marker: marker.position.y, hands: hands.visible, handCount: hands.children.filter(o => o.visible).length,
        organs: scene.getObjectByName('fr-schematic-lungs').visible || scene.getObjectByName('fr-schematic-heart').visible,
        measure: scene.getObjectByName('fr-depth-measure').visible, travel: travel.scale.y,
        release: release.position.y, peak: peak.position.y, camera: camera.position.toArray(),
        projected: [projected(heel), projected(release), projected(peak)],
        sameChest: !window.__savedChest || window.__savedChest === chest,
        sameHands: !window.__savedHands || window.__savedHands === hands };
    };`
});
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); mkdirSync('reports/firstresponse-child-hands', { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: Page, width = 1280, extra = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
}
const pose = (page: Page) => page.evaluate(() => (window as any).__inspectionPose());
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    // Existing local diagnostic documents axe's author/system color mismatch.
    rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {},
  })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
test('close-up preserves the scene and distinguishes movement from peak depth', async ({ page }) => {
  await mount(page);
  const home = await pose(page);
  await page.evaluate(() => {
    const scene = (window as any).__glRecorder.forCanvas(document.querySelector('#wrap canvas')).scene;
    (window as any).__savedChest = scene.getObjectByName('fr-depth-chest');
    (window as any).__savedHands = scene.getObjectByName('fr-depth-hands');
  });
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  await expect.poll(async () => (await pose(page)).camera[0]).toBeLessThan(home.camera[0]);
  await page.getByRole('checkbox', { name: 'Measure movement between release and peak', exact: true }).check();
  await expect.poll(async () => (await pose(page)).measure).toBe(true);
  const fullTravel = (await pose(page)).travel;
  await page.getByRole('button', { name: 'Try a leaning example', exact: true }).click();
  await expect(page.locator('.fr-depth-measure-equation')).toContainText('5.5 cm − 1.0 cm = 4.5 cm');
  await expect.poll(async () => (await pose(page)).travel).toBeLessThan(fullTravel);
  const release = await pose(page);
  expect(release.marker).toBeCloseTo(release.release, 8);
  await page.getByRole('button', { name: 'Show compression', exact: true }).click();
  await expect.poll(async () => (await pose(page)).marker).toBeCloseTo(release.peak, 8);
  expect((await pose(page)).travel).toBeCloseTo(release.travel, 8);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/adult-close-up.png' });
  await page.getByRole('checkbox', { name: 'Show rescuer hands and arms', exact: true }).uncheck();
  await expect.poll(async () => (await pose(page)).hands).toBe(false);
  expect((await pose(page)).marker).toBeCloseTo(release.peak, 8);
  expect((await pose(page)).sameHands).toBe(true); expect((await pose(page)).sameChest).toBe(true);
  await page.locator('.fr-depth-measurement').scrollIntoViewIfNeeded();
  await page.screenshot({ path: report + '/movement-inspection.png' });
  await audit(page);
  await page.getByRole('button', { name: 'Whole manikin', exact: true }).click();
  await expect.poll(async () => (await pose(page)).camera[0]).toBeCloseTo(home.camera[0], 8);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('close-up frames the contact heel and bracket at every age', async ({ page }) => {
  await mount(page);
  for (const [label, age, depth, count] of [[/^Adult —/, 'adult', '5.5', 2], [/^Child —/, 'child', '5.0', 1], [/^Infant —/, 'infant', '4.0', 1]] as const) {
    await page.getByRole('button', { name: label }).click();
    await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Measure movement between release and peak', exact: true }).check();
    await page.getByRole('button', { name: 'Show compression', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Show compression', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await pose(page)).marker - (await pose(page)).peak).toBeCloseTo(0, 8);
    await expect.poll(async () => (await pose(page)).handCount).toBe(count);
    await expect(page.locator('.fr-depth-measure-equation')).toContainText(depth + ' cm − 0.0 cm = ' + depth + ' cm');
    await expect.poll(async () => (await pose(page)).projected.every((p: number[]) => Math.abs(p[0]) < .92 && Math.abs(p[1]) < .92 && p[2] > -1 && p[2] < 1)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: report + '/' + age + '-contact.png' });
  }
  await audit(page);
});
test('phone keyboard controls, text spacing, and system colors keep measurements usable', async ({ page }) => {
  await mount(page, 320);
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  const ruler = page.getByRole('checkbox', { name: 'Measure movement between release and peak', exact: true });
  await ruler.focus(); await page.keyboard.press('Space');
  await expect(page.locator('.fr-depth-measurement')).toBeVisible();
  await page.locator('#fr-depth-lean').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('.fr-depth-measure-equation')).toContainText('5.5 cm − 0.5 cm = 5.0 cm');
  const stage = await page.locator('.fr-body3d-stage').boundingBox();
  const row = await page.locator('#fr-depth-lean').locator('..').boundingBox();
  expect(stage!.y + stage!.height).toBeLessThan(row!.y);
  expect(row!.y + row!.height).toBeLessThan(840);
  await page.screenshot({ path: report + '/phone-controls.png' });
  await audit(page);
  await page.addStyleTag({ content: '.fr-body3d *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-body3d p{margin-bottom:2em!important}' });
  await page.locator('.fr-depth-measurement').scrollIntoViewIfNeeded();
  await page.screenshot({ path: report + '/phone-text-spacing.png' });
  await audit(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await audit(page);
  const colors = await page.locator('.fr-depth-measurement dd').first().evaluate(el => {
    const style = getComputedStyle(el), panel = getComputedStyle(el.closest('.fr-depth-measurement')!);
    return { fg: style.color, bg: panel.backgroundColor };
  });
  expect(colors).toEqual({ fg: 'rgb(0, 0, 0)', bg: 'rgb(255, 255, 255)' });
  await page.screenshot({ path: report + '/phone-forced-colors.png' });
});

test('child arrangements stay live across depth and correct hand placement', async ({ page }) => {
  await mount(page, 1280, { b3dAge: 'child' });
  await page.evaluate(() => {
    const scene = (window as any).__glRecorder.forCanvas(document.querySelector('#wrap canvas')).scene;
    (window as any).__savedChest = scene.getObjectByName('fr-depth-chest');
    (window as any).__savedHands = scene.getObjectByName('fr-depth-hands');
  });
  await page.getByRole('checkbox', { name: 'Measure movement between release and peak', exact: true }).check();
  await page.getByRole('button', { name: 'Show compression', exact: true }).click();
  await expect.poll(async () => (await pose(page)).marker - (await pose(page)).peak).toBeCloseTo(0, 8);
  const one = await pose(page);
  await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).check();
  await expect.poll(async () => (await pose(page)).handCount).toBe(2);
  await expect(page.locator('.fr-child-hand-reading')).toContainText('Two stacked hands');
  const two = await pose(page);
  expect(two.marker).toBe(one.marker); expect(two.travel).toBe(one.travel);
  expect(two.sameChest).toBe(true); expect(two.sameHands).toBe(true);
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  await page.getByRole('radio', { name: 'Two stacked hands', exact: true }).focus();
  await page.screenshot({ path: 'reports/firstresponse-child-hands/child-two-hand-inspection.png' });
  await audit(page);
  await page.getByRole('tab', { name: /Hand placement/ }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await pose(page)).hands).toBe(false);
  await page.getByRole('button', { name: 'Upper breastbone', exact: true }).click();
  expect((await pose(page)).hands).toBe(false);
  await page.getByRole('button', { name: 'Centre of the chest', exact: true }).click();
  await expect.poll(async () => (await pose(page)).hands).toBe(true);
  expect((await pose(page)).handCount).toBe(2);
  expect((await pose(page)).organs).toBe(false);
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'reports/firstresponse-child-hands/child-placement-demonstration.png', fullPage: true });
  await page.getByRole('radio', { name: 'One hand', exact: true }).check();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await pose(page)).handCount).toBe(1);
  await page.screenshot({ path: 'reports/firstresponse-child-hands/child-one-hand-placement.png', fullPage: true });
  await audit(page);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('child technique choices support phone keyboard input, hidden hands, and system colors', async ({ page }) => {
  await mount(page, 320, { b3dAge: 'child' });
  await page.getByRole('button', { name: 'Chest close-up', exact: true }).click();
  const one = page.getByRole('radio', { name: 'One hand', exact: true });
  const two = page.getByRole('radio', { name: 'Two stacked hands', exact: true });
  await one.focus(); await page.keyboard.press('ArrowDown');
  await expect(two).toBeChecked();
  await expect.poll(async () => (await pose(page)).handCount).toBe(2);
  const stage = await page.locator('.fr-body3d-stage').boundingBox();
  const row = await two.locator('..').boundingBox();
  expect(stage!.y + stage!.height).toBeLessThan(row!.y); expect(row!.y + row!.height).toBeLessThan(840);
  await page.screenshot({ path: 'reports/firstresponse-child-hands/phone-hand-choices.png' });
  await audit(page);
  await page.addStyleTag({ content: '.fr-body3d *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-body3d p{margin-bottom:2em!important}' });
  await two.focus(); await page.keyboard.press('ArrowUp');
  await expect(one).toBeChecked(); await expect.poll(async () => (await pose(page)).handCount).toBe(1);
  await page.screenshot({ path: 'reports/firstresponse-child-hands/phone-hand-text-spacing.png' });
  await audit(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await audit(page);
  const colors = await page.locator('.fr-child-hands legend').evaluate(el => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el.closest('fieldset')!).backgroundColor }));
  expect(colors).toEqual({ fg: 'rgb(0, 0, 0)', bg: 'rgb(255, 255, 255)' });
  await page.screenshot({ path: 'reports/firstresponse-child-hands/phone-hand-forced-colors.png' });
  await page.getByRole('checkbox', { name: 'Show rescuer hands and arms', exact: true }).uncheck();
  await expect(one).toBeDisabled(); await expect(two).toBeDisabled();
  await expect(page.locator('.fr-child-hand-reading')).toContainText('Turn on rescuer hands');
  await page.getByRole('checkbox', { name: 'Show rescuer hands and arms', exact: true }).check();
  await expect(one).toBeEnabled(); await expect(one).toBeChecked();
  await expect.poll(async () => (await pose(page)).hands).toBe(true);
});

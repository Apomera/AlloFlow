import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const report = 'reports/firstresponse-3d-explorer';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse', preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 940, layout: 'document', appStyles: true,
  probes: `window.__depthPose = function () {
    var canvas = document.querySelector('#wrap canvas');
    var rec = canvas && window.__glRecorder.forCanvas(canvas);
    var scene = rec && rec.scene;
    if (!scene) return null;
    var chest = scene.getObjectByName('fr-depth-chest');
    var hands = scene.getObjectByName('fr-depth-hands');
    var marker = scene.getObjectByName('fr-depth-marker');
    return chest && hands && marker ? { top: chest.position.y + .25 * chest.scale.y,
      bottom: chest.position.y - .25 * chest.scale.y, hand: hands.position.y,
      marker: marker.position.y, anatomy: scene.getObjectByName('fr-depth-anatomy').visible,
      sameChest: !window.__savedChest || window.__savedChest === chest } : null;
  };`
});
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: Page, width = 1280, extra = {}) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', ...extra } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
}
async function pose(page: Page) { return page.evaluate(() => (window as any).__depthPose()); }
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
test('real 3D compression, full recoil, leaning, and stable scene controls', async ({ page }) => {
  const warnings: string[] = []; page.on('console', msg => { if (msg.text().includes('animation disabled')) warnings.push(msg.text()); });
  await mount(page);
  expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas');
    (window as any).__savedChest = (window as any).__glRecorder.forCanvas(canvas).scene.getObjectByName('fr-depth-chest');
  });
  const released = await pose(page);
  await page.getByRole('button', { name: 'Show compression', exact: true }).click();
  await expect.poll(async () => (await pose(page)).marker).toBeLessThan(released.marker);
  const pressed = await pose(page);
  expect(pressed.bottom).toBeCloseTo(-.25, 5); expect(pressed.hand - pressed.marker).toBeCloseTo(.036, 5);
  await page.getByRole('button', { name: 'Side view', exact: true }).click();
  await page.screenshot({ path: report + '/compression-side-desktop.png', fullPage: true });
  await audit(page);
  await page.getByRole('button', { name: 'Try a leaning example' }).click();
  await expect.poll(async () => (await pose(page)).marker).toBeGreaterThan(pressed.marker);
  expect((await pose(page)).marker).toBeLessThan(released.marker);
  await page.screenshot({ path: report + '/incomplete-recoil-desktop.png', fullPage: true });
  const lean = page.getByRole('slider', { name: /^Depression left at release/ });
  await lean.focus(); await page.keyboard.press('Home');
  await expect(page.locator('.fr-depth-readout')).toContainText('returns to its resting height');
  await expect.poll(async () => (await pose(page)).marker).toBeCloseTo(released.marker, 5);
  await page.getByRole('checkbox', { name: 'Show the schematic anatomy layer' }).check();
  await expect.poll(async () => (await pose(page)).anatomy).toBe(true);
  await page.getByRole('button', { name: 'Overhead view' }).click();
  await page.screenshot({ path: report + '/anatomy-overhead-desktop.png', fullPage: true });
  expect((await pose(page)).sameChest).toBe(true);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); expect(warnings).toEqual([]);
});
test('all ages, live sliders, and reduced-motion static inspection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  for (const [age, label, reference] of [['child', /^Child —/, '5'], ['infant', /^Infant —/, '4'], ['adult', /^Adult —/, '5.5']] as const) {
    await page.getByRole('button', { name: label }).click();
    await expect(page.locator('#fr-depth-depth')).toHaveValue(reference);
    await page.getByRole('button', { name: 'Show release', exact: true }).click();
    await expect.poll(async () => (await pose(page)).top).toBeCloseTo(.25, 5);
    await page.getByRole('button', { name: 'Animate cycle' }).click();
    const a = await pose(page); await page.waitForTimeout(350); const b = await pose(page);
    expect(a.marker).toBeCloseTo(b.marker, 5);
    await page.getByRole('button', { name: 'Show compression', exact: true }).click();
    await expect.poll(async () => (await pose(page)).top).toBeLessThan(.2);
    if (age === 'infant') { await page.getByRole('button', { name: 'Side view', exact: true }).click(); await page.screenshot({ path: report + '/infant-compression-desktop.png', fullPage: true }); }
  }
  await page.locator('#fr-depth-rate').focus(); await page.keyboard.press('End');
  await expect(page.locator('.fr-depth-readout')).toContainText('faster than 100');
  await page.locator('#fr-depth-depth').focus(); await page.keyboard.press('End');
  await expect(page.locator('.fr-depth-readout')).toContainText('above the adult');
  await audit(page);
  await page.getByText('Technique examples and age guidance', { exact: true }).click(); await audit(page);
});
test('phone reflow, enlarged spacing, and forced-color controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, 320); await audit(page);
  await page.getByRole('button', { name: 'Show compression', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/explorer-phone.png', fullPage: true });
  await page.locator('#fr-depth-lean').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.fr-depth-readout')).toContainText('leaning keeps the chest');
  async function expectVisibleControl(id: string) {
    await expect.poll(async () => {
      const stage = await page.locator('.fr-body3d-stage').boundingBox();
      const row = await page.locator('#' + id).locator('..').boundingBox();
      return stage!.y >= 0 && stage!.y + stage!.height < row!.y && row!.y + row!.height < 840;
    }).toBe(true);
  }
  await expectVisibleControl('fr-depth-lean');
  await page.screenshot({ path: report + '/phone-live-controls.png' });
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#fr-depth-depth')).toBeFocused();
  await expectVisibleControl('fr-depth-depth');
  await page.addStyleTag({ content: '.fr-body3d *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-body3d p{margin-bottom:2em!important}' });
  await page.getByRole('button', { name: 'Try a leaning example' }).click(); await audit(page);
  await page.locator('#fr-depth-lean').focus();
  await expectVisibleControl('fr-depth-lean');
  await page.screenshot({ path: report + '/phone-text-spacing.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.getByRole('button', { name: 'Show compression', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show compression', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#fr-depth-lean').focus();
  await expectVisibleControl('fr-depth-lean');
  await page.screenshot({ path: report + '/phone-forced-colors.png' });
});

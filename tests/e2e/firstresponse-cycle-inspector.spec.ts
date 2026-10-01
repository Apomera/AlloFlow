import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const report = 'reports/firstresponse-cycle-inspector';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse', preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1160, height: 1080, layout: 'document', appStyles: true,
  probes: `window.__cyclePose = function () {
    var canvas = document.querySelector('#wrap canvas');
    var rec = canvas && window.__glRecorder.forCanvas(canvas);
    var scene = rec && rec.scene;
    if (!scene) return null;
    var chest = scene.getObjectByName('fr-depth-chest');
    var arrow = scene.getObjectByName('fr-depth-direction');
    var marker = scene.getObjectByName('fr-depth-marker');
    return chest && arrow && marker ? { height: marker.position.y, bottom: chest.position.y - .25 * chest.scale.y,
      direction: new THREE.Vector3(0,1,0).applyQuaternion(arrow.quaternion).y, visible: arrow.visible,
      sameChest: !window.__savedChest || window.__savedChest === chest } : null;
  };`
});
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: Page, width = 1280) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth' } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
}
const pose = (page: Page) => page.evaluate(() => (window as any).__cyclePose());
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
test('phase inspection links real geometry, movement direction, and graph without rebuilding', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    (window as any).__savedChest = (window as any).__glRecorder.forCanvas(document.querySelector('#wrap canvas')).scene.getObjectByName('fr-depth-chest');
  });
  await page.getByRole('button', { name: 'Side view', exact: true }).click();
  await page.locator('.fr-depth-steps button').filter({ hasText: 'Pressing down' }).click();
  await expect.poll(async () => (await pose(page)).direction).toBeCloseTo(-1, 7);
  const down = await pose(page);
  expect(down.visible).toBe(true); expect(down.bottom).toBeCloseTo(-.25, 7);
  await expect(page.locator('.fr-depth-cursor circle')).toHaveAttribute('cx', '120');
  await expect(page.locator('.fr-depth-inspection-note')).toContainText('2.8 cm');
  const stage = await page.locator('.fr-body3d-stage').boundingBox();
  const control = await page.locator('.fr-depth-steps button').filter({ hasText: 'Pressing down' }).boundingBox();
  expect(stage!.y).toBeGreaterThanOrEqual(0);
  expect(stage!.y + stage!.height).toBeLessThan(control!.y);
  await page.screenshot({ path: report + '/inspector-live-desktop.png' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/pressing-desktop.png', fullPage: true });
  await page.locator('.fr-depth-steps button').filter({ hasText: 'Releasing' }).click();
  await expect.poll(async () => (await pose(page)).direction).toBeCloseTo(1, 7);
  expect((await pose(page)).height).toBeCloseTo(down.height, 7);
  await expect(page.locator('.fr-depth-cursor circle')).toHaveAttribute('cx', '310');
  await expect(page.locator('.fr-depth-inspection-note')).toContainText('2.8 cm');
  await page.waitForTimeout(350);
  expect((await pose(page)).height).toBeCloseTo(down.height, 7);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/releasing-desktop.png', fullPage: true });
  await page.locator('#fr-depth-phase').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#fr-depth-phase')).toHaveValue('76');
  await expect.poll(async () => (await pose(page)).height).toBeGreaterThan(down.height);
  await page.getByRole('button', { name: 'Animate cycle', exact: true }).click();
  await expect(page.locator('.fr-depth-cursor')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try a leaning example' }).click();
  await page.locator('.fr-depth-steps button').filter({ hasText: 'Between pushes' }).click();
  await expect(page.locator('.fr-depth-inspection-note')).toContainText('1.0 cm');
  await expect.poll(async () => (await pose(page)).visible).toBe(false);
  expect((await pose(page)).sameChest).toBe(true);
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  await audit(page);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('manual inspection works for all ages with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  for (const [name, peak] of [[/^Adult —/, '5.5'], [/^Child —/, '5.0'], [/^Infant —/, '4.0']] as const) {
    await page.getByRole('button', { name }).click();
    await page.locator('.fr-depth-steps button').filter({ hasText: 'Deepest point' }).click();
    await expect(page.locator('.fr-depth-selected-depth')).toContainText(peak + ' cm');
    const pressed = (await pose(page)).height;
    await page.locator('#fr-depth-phase').focus(); await page.keyboard.press('End');
    await expect(page.locator('#fr-depth-phase')).toHaveValue('100');
    await expect.poll(async () => (await pose(page)).height).toBeGreaterThan(pressed);
    await page.keyboard.press('Home');
    await expect(page.locator('#fr-depth-phase')).toHaveValue('0');
    await expect(page.locator('.fr-depth-inspection-note')).toContainText('Before the push');
  }
  await audit(page);
});
test('phone inspector keeps keyboard focus visible with large spacing and forced colors', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, 320);
  const slider = page.locator('#fr-depth-phase');
  await slider.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('1');
  async function visibleFocus() {
    await expect.poll(async () => {
      const stage = await page.locator('.fr-body3d-stage').boundingBox();
      const row = await page.locator('.fr-depth-scrub').boundingBox();
      return stage!.y >= 0 && stage!.y + stage!.height < row!.y && row!.y + row!.height < 840;
    }).toBe(true);
  }
  await visibleFocus(); await audit(page);
  await page.screenshot({ path: report + '/inspector-phone.png' });
  await page.addStyleTag({ content: '.fr-body3d *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-body3d p{margin-bottom:2em!important}' });
  await slider.blur(); await slider.focus(); await page.keyboard.press('End');
  await visibleFocus(); await audit(page);
  await page.screenshot({ path: report + '/inspector-text-spacing.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('.fr-depth-inspection-note')).toContainText('Pressing down');
  await page.screenshot({ path: report + '/inspector-forced-colors.png' });
});

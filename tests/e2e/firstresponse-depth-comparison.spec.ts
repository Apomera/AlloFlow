import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const report = 'reports/firstresponse-depth-comparison';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse', preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1160, height: 1080, layout: 'document', appStyles: true,
  probes: `window.__comparisonPose = function () {
    var canvas = document.querySelector('#wrap canvas');
    var rec = canvas && window.__glRecorder.forCanvas(canvas);
    var scene = rec && rec.scene;
    if (!scene) return null;
    var saved = scene.getObjectByName('fr-depth-saved');
    var marker = scene.getObjectByName('fr-depth-marker');
    var chest = scene.getObjectByName('fr-depth-chest');
    return saved && marker ? { a: saved.position.y, b: marker.position.y, visible: saved.visible,
      sameChest: !window.__savedChest || window.__savedChest === chest } : null;
  };`
});
test.describe.configure({ mode: 'serial', retries: 0, timeout: 150000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); mkdirSync('reports/firstresponse-prediction-activity', { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: Page, width = 1280) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth' } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await page.locator('.fr-depth-compare > summary').click();
}
const pose = (page: Page) => page.evaluate(() => (window as any).__comparisonPose());
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => {
    // axe uses authored foreground colors against system backgrounds in forced-color mode.
    // Normal rendering keeps its contrast rule; system-color contrast is checked below.
    const forced = matchMedia('(forced-colors:active)').matches;
    const result = await (window as any).axe.run('.fr-body3d', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: forced ? { 'color-contrast': { enabled: false } } : {},
    });
    return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }));
  });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
test('saved and current conditions match at the peak and differ at release in real 3D', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { (window as any).__savedChest = (window as any).__glRecorder.forCanvas(document.querySelector('#wrap canvas')).scene.getObjectByName('fr-depth-chest'); });
  await page.getByRole('button', { name: 'Try full recoil vs leaning', exact: true }).click();
  await expect.poll(async () => (await pose(page)).visible).toBe(true);
  await expect(page.locator('.fr-depth-comparison-reading')).toContainText('A is 0.0 cm depressed; B is 1.0 cm');
  const released = await pose(page); expect(released.a).toBeGreaterThan(released.b);
  await page.getByRole('button', { name: 'Side view', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect peak', exact: true }).click();
  await expect.poll(async () => { const p = await pose(page); return p.a - p.b; }).toBeCloseTo(0, 8);
  await expect(page.locator('.fr-depth-comparison-reading')).toContainText('A is 5.5 cm depressed; B is 5.5 cm');
  const squareY = Number(await page.locator('.fr-depth-saved-cursor').getAttribute('y')) + 5;
  expect(squareY).toBeCloseTo(Number(await page.locator('.fr-depth-cursor circle').getAttribute('cy')), 7);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: report + '/same-peak-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Inspect release', exact: true }).click();
  await expect.poll(async () => (await pose(page)).b).toBeCloseTo(released.b, 8);
  await page.locator('.fr-depth-comparison-reading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: report + '/different-recoil-desktop.png' });
  await audit(page);
  await page.getByRole('button', { name: 'Clear saved A', exact: true }).click();
  await expect.poll(async () => (await pose(page)).visible).toBe(false);
  expect((await pose(page)).b).toBeCloseTo(released.b, 8);
  expect((await pose(page)).sameChest).toBe(true);
  await expect(page.locator('.fr-depth-key')).toContainText('Reference with full recoil');
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('saving, replacing, age changes, and keyboard adjustments keep the reference independent', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Save current settings as A', exact: true }).click();
  await page.locator('#fr-depth-lean').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('.fr-depth-comparison-reading')).toContainText('A is 0.0 cm depressed; B is 0.5 cm');
  await page.getByRole('button', { name: 'Replace A with current settings', exact: true }).click();
  await expect(page.locator('.fr-depth-comparison-reading')).toContainText('A is 0.5 cm depressed; B is 0.5 cm');
  await page.getByRole('button', { name: /^Infant —/ }).click();
  await expect.poll(async () => (await pose(page)).visible).toBe(false);
  await expect(page.locator('.fr-depth-compare')).toContainText('No A is saved for this age');
  await page.getByRole('button', { name: 'Try full recoil vs leaning', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect peak', exact: true }).click();
  await expect(page.locator('.fr-depth-comparison-reading')).toContainText('A is 4.0 cm depressed; B is 4.0 cm');
  await expect.poll(async () => { const p = await pose(page); return p.a - p.b; }).toBeCloseTo(0, 8);
  await audit(page);
});
test('phone comparison table and keyboard actions work with enlarged spacing and forced colors', async ({ page }) => {
  await mount(page, 320);
  await page.getByRole('button', { name: 'Try full recoil vs leaning', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect peak', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.fr-depth-comparison-reading')).toContainText('A is 5.5 cm depressed; B is 5.5 cm');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Inspect release', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const stage = await page.locator('.fr-body3d-stage').boundingBox();
  const button = await page.getByRole('button', { name: 'Inspect release', exact: true }).boundingBox();
  expect(stage!.y).toBeGreaterThanOrEqual(0); expect(button!.y).toBeGreaterThan(stage!.y + stage!.height);
  await audit(page); await page.screenshot({ path: report + '/comparison-phone.png' });
  await page.addStyleTag({ content: '.fr-body3d *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-body3d p{margin-bottom:2em!important}' });
  await page.locator('.fr-depth-comparison-table').evaluate(el => el.scrollIntoView({ block: 'center' }));
  await audit(page); await page.screenshot({ path: report + '/comparison-text-spacing.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.screenshot({ path: report + '/comparison-forced-colors.png' });
});

test('prediction feedback follows the model, supports revision, and resets with new settings', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Try full recoil vs leaning', exact: true }).click();
  await page.locator('.fr-depth-inquiry > summary').click();
  const peak = page.getByRole('group', { name: 'At the deepest point, which chest is more depressed?', exact: true });
  const release = page.getByRole('group', { name: 'Between pushes, which chest is more depressed?', exact: true });
  await expect(page.getByRole('button', { name: 'Check predictions', exact: true })).toBeDisabled();
  await peak.getByRole('radio', { name: 'Same depression', exact: true }).check();
  await release.getByRole('radio', { name: 'Current B', exact: true }).check();
  await page.getByRole('button', { name: 'Check predictions', exact: true }).click();
  await expect(page.locator('.fr-depth-prediction-result')).toHaveText('2 of 2 predictions match this model.');
  await page.getByRole('button', { name: 'View peak evidence', exact: true }).click();
  await expect.poll(async () => { const p = await pose(page); return p.a - p.b; }).toBeCloseTo(0, 8);
  await page.getByLabel('My explanation', { exact: true }).fill('Both reach 5.5 cm, but B stays 1 cm depressed at release.');
  await page.getByRole('button', { name: 'View release evidence', exact: true }).click();
  const pinnedStage = await page.locator('.fr-body3d-stage').boundingBox();
  expect(pinnedStage!.y).toBeGreaterThanOrEqual(0);
  expect(pinnedStage!.y + pinnedStage!.height).toBeLessThan(1080);
  await expect.poll(async () => { const p = await pose(page); return p.a - p.b; }).toBeGreaterThan(0);
  await expect(page.locator('.fr-depth-evidence-progress')).toContainText('Both positions inspected');
  await expect(page.getByLabel('My explanation', { exact: true })).toHaveValue('Both reach 5.5 cm, but B stays 1 cm depressed at release.');
  await page.locator('.fr-depth-evidence').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'reports/firstresponse-prediction-activity/inquiry-desktop.png' });
  await audit(page);
  await release.getByRole('radio', { name: 'Same depression', exact: true }).check();
  await expect(page.locator('.fr-depth-prediction-result')).toBeEmpty();
  await page.getByRole('button', { name: 'Check predictions', exact: true }).click();
  await expect(page.locator('.fr-depth-prediction-result')).toContainText('1 of 2');
  await page.locator('#fr-depth-depth').focus(); await page.keyboard.press('End');
  await expect(page.locator('.fr-depth-inquiry input:checked')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Check predictions', exact: true })).toBeDisabled();
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('prediction radios and reflection work by keyboard on a phone with spacing and forced colors', async ({ page }) => {
  await mount(page, 320);
  await page.getByRole('button', { name: 'Try full recoil vs leaning', exact: true }).click();
  await page.locator('.fr-depth-inquiry > summary').click();
  const peak = page.getByRole('group', { name: 'At the deepest point, which chest is more depressed?', exact: true });
  const release = page.getByRole('group', { name: 'Between pushes, which chest is more depressed?', exact: true });
  await peak.getByRole('radio', { name: 'Saved A', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  await expect(peak.getByRole('radio', { name: 'Same depression', exact: true })).toBeChecked();
  await release.getByRole('radio', { name: 'Same depression', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  await expect(release.getByRole('radio', { name: 'Current B', exact: true })).toBeChecked();
  await page.screenshot({ path: 'reports/firstresponse-prediction-activity/inquiry-phone-predictions.png' });
  await page.getByRole('button', { name: 'Check predictions', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.fr-depth-prediction-result')).toContainText('2 of 2');
  await page.getByRole('button', { name: 'View peak evidence', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'View release evidence', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.getByLabel('My explanation', { exact: true }).fill('Same peak, different release.');
  await expect.poll(async () => {
    const stage = await page.locator('.fr-body3d-stage').boundingBox();
    const note = await page.getByLabel('My explanation', { exact: true }).boundingBox();
    return note!.y > stage!.y + stage!.height && note!.y + note!.height < 840;
  }).toBe(true);
  await audit(page); await page.screenshot({ path: 'reports/firstresponse-prediction-activity/inquiry-phone-evidence.png' });
  await page.addStyleTag({ content: '.fr-body3d *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.fr-body3d p{margin-bottom:2em!important}' });
  await page.getByLabel('My explanation', { exact: true }).blur();
  await page.getByLabel('My explanation', { exact: true }).focus();
  await audit(page); await page.screenshot({ path: 'reports/firstresponse-prediction-activity/inquiry-text-spacing.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  const contrast = await page.evaluate(() => {
    function rgb(value: string) { return (value.match(/[\d.]+/g) || []).map(Number); }
    function luminance(color: number[]) {
      const linear = color.slice(0, 3).map(v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    }
    return ['.fr-depth-predictions legend', '.fr-depth-prediction-option span', '.fr-depth-evidence button', '#fr-depth-explanation'].map(selector => {
      const element = document.querySelector(selector)!;
      let parent: Element | null = element, background: number[] = [];
      while (parent) {
        background = rgb(getComputedStyle(parent).backgroundColor);
        if (background.length === 3 || background[3] === 1) break;
        parent = parent.parentElement;
      }
      const a = luminance(rgb(getComputedStyle(element).color)), b = luminance(background);
      return { selector, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    });
  });
  for (const sample of contrast) expect(sample.ratio, sample.selector).toBeGreaterThanOrEqual(4.5);
  await audit(page); await page.screenshot({ path: 'reports/firstresponse-prediction-activity/inquiry-forced-colors.png' });
});

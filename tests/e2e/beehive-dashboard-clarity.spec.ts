import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 900 });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, extra: any = {}) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(extra => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', tutorialDone: true, soundOn: false, motionPaused: true,
      beeView: 'lifecycle', day: 60, workers: 30000, queenHealth: 20, honey: 90, syrup: 40,
      morale: 100, varroaLevel: 0, diseaseRisk: 45, actionPoints: 3, ...extra }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, extra);
}
async function colonyInputs(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__toolData.beehive;
    return Object.fromEntries(['day', 'workers', 'brood', 'queenHealth', 'honey', 'syrup', 'actionPoints', 'randomState', 'morale', 'diseaseRisk'].map(key => [key, state[key]]));
  });
}
async function accessible(page: Page, selector: string) {
  const violations = await page.evaluate(async selector => {
    const result = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  }, selector);
  expect(violations).toEqual([]);
  const sizing = await page.locator(selector).evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth,
    offenders: Array.from(node.querySelectorAll('*')).filter(child => child.scrollWidth > child.clientWidth + 1 && child.clientWidth > 0)
      .map(child => ({ tag: child.tagName, cls: child.className, width: child.clientWidth, content: child.scrollWidth })).slice(0, 12) }));
  expect(sizing.content, selector + ': ' + JSON.stringify(sizing)).toBeLessThanOrEqual(sizing.width + 1);
}

test('a fed colony exposes honest food, a weak score input, and accessible model explanations in both themes', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const dashboard = page.locator('[data-colony-dashboard]');
  await expect(dashboard).toContainText('Model score 84/100');
  await expect(page.locator('[data-colony-diagnosis]')).toContainText('queen condition (20 / 100)');
  await expect(page.locator('[data-colony-food-origins]')).toContainText('Nectar honey50 lb');
  await expect(page.locator('[data-colony-harvest-balance]')).toContainText('No harvestable nectar surplus');
  await expect(page.locator('[data-harvest-surplus]')).toHaveCount(0);
  await expect(page.locator('[data-management-choice="harvest_honey"]')).toHaveAttribute('aria-disabled', 'true');
  const initial = await colonyInputs(page);
  const score = page.locator('[data-colony-score-guide] > summary');
  await score.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-colony-score-guide]')).toHaveAttribute('open', '');
  await expect(page.locator('[data-colony-score-guide]')).toContainText('does not check the seasonal reserve');
  await page.keyboard.press('Enter');
  const roles = page.locator('[data-colony-role-guide] > summary');
  await roles.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-colony-role-guide]')).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  const disease = page.locator('[data-colony-stat-toggle="disease"]');
  await expect(disease).toContainText('Watch');
  await disease.focus(); await page.keyboard.press('Enter');
  await expect(disease).toBeFocused();
  await expect(page.locator('#beehive-stat-explanation-disease')).toBeVisible();
  await expect(page.locator('#beehive-stat-explanation-disease')).toContainText('Above 45 points');
  expect(await colonyInputs(page)).toEqual(initial);
  const readings = await dashboard.evaluate(node => ({
    target: node.querySelector('[data-colony-stat-toggle]')!.getBoundingClientRect().height,
    explanation: parseFloat(getComputedStyle(node.querySelector('[data-colony-stat-explanation]')!).fontSize),
    columns: getComputedStyle(node.querySelector('[data-colony-population]')!).gridTemplateColumns.split(' ').length,
  }));
  expect(readings.target).toBeGreaterThanOrEqual(44);
  expect(readings.explanation).toBeGreaterThanOrEqual(14);
  expect(readings.columns).toBeLessThanOrEqual(2);
  await accessible(page, '[data-colony-dashboard]');
  await accessible(page, '[data-beehive-pulse]');
  await dashboard.screenshot({ path: testInfo.outputPath('colony-dashboard-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await accessible(page, '[data-colony-dashboard]');
  await accessible(page, '[data-beehive-pulse]');
  await dashboard.screenshot({ path: testInfo.outputPath('colony-dashboard-dark.png') });
  expect(errors).toEqual([]);
});

test('narrow desktop management cards keep readable effects, one cost, and keyboard access to unavailable reasons', async ({ page }, testInfo) => {
  await mount(page, { actionPoints: 0, diseaseRisk: 12, queenHealth: 100 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; });
  const actions = page.locator('[data-live-management-actions]');
  const harvest = page.locator('[data-management-choice="harvest_honey"]');
  await expect(harvest).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-management-choice="add_super"]')).toContainText('Add super');
  await expect(harvest.locator('[data-management-cost-badge]')).toHaveCount(1);
  const before = await colonyInputs(page);
  await harvest.focus(); await page.keyboard.press('Enter');
  await expect(harvest).toBeFocused();
  expect(await colonyInputs(page)).toEqual(before);
  const metrics = await actions.evaluate(node => ({
    columns: getComputedStyle(node).gridTemplateColumns.split(' ').length,
    effectSizes: Array.from(node.querySelectorAll('.bee-live-action-effect')).map(item => parseFloat(getComputedStyle(item).fontSize)),
    statusSizes: Array.from(node.querySelectorAll('[data-management-status]')).map(item => parseFloat(getComputedStyle(item).fontSize)),
  }));
  expect(metrics.columns).toBeLessThanOrEqual(2);
  expect(metrics.effectSizes.every(size => size >= 14)).toBe(true);
  expect(metrics.statusSizes.every(size => size >= 13)).toBe(true);
  await accessible(page, '[data-live-management-actions]');
  await actions.screenshot({ path: testInfo.outputPath('management-cards-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await accessible(page, '[data-live-management-actions]');
  await actions.screenshot({ path: testInfo.outputPath('management-cards-dark.png') });
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await accessible(page, '[data-colony-dashboard]');
  await accessible(page, '[data-live-management-actions]');
  await page.emulateMedia({ forcedColors: 'active' });
  await harvest.focus();
  expect(await harvest.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
  expect(await colonyInputs(page)).toEqual(before);
  // The shell should restore its scene/sidebar layout when the panel itself is wide.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '16px';
    document.getElementById('wrap')!.style.width = '100%';
  });
  const wideLayout = await page.locator('.bee-discovery-grid').evaluate(node => ({
    columns: getComputedStyle(node).gridTemplateColumns.split(' ').length,
    scene: node.querySelector('.bee-discovery-scene')!.clientWidth,
  }));
  expect(wideLayout.columns).toBe(2);
  expect(wideLayout.scene).toBeGreaterThan(400);
});

test('the advertised nectar-only surplus equals the actual harvest and preserves fed syrup', async ({ page }) => {
  await mount(page, { honey: 105, syrup: 40, queenHealth: 100, diseaseRisk: 0 });
  await expect(page.locator('[data-harvest-surplus]')).toContainText('5 lbs ready');
  const before = await colonyInputs(page);
  await page.locator('[data-management-choice="harvest_honey"]').click();
  await expect(page.locator('[data-harvest-surplus]')).toHaveCount(0);
  await expect(page.locator('[data-colony-harvest-balance]')).toContainText('No harvestable nectar surplus');
  const after = await colonyInputs(page);
  expect(after.honey).toBe(100); expect(after.syrup).toBe(40); expect(after.actionPoints).toBe(2);
  expect(after.day).toBe(before.day); expect(after.randomState).toBe(before.randomState);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.totalHarvested)).toBe(5);
  expect(await page.evaluate(() => (window as any).__toolData.otherTool)).toEqual({ retained: true });
  await expect(page.locator('[data-management-choice="harvest_honey"]')).toHaveAttribute('aria-disabled', 'true');
});

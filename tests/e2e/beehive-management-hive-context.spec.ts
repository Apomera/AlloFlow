import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => {
  if (info.error) console.error(info.error.message);
  await harness.destroy(page);
});

const artifactDir = path.resolve('.codex-artifacts/bee-management-hive-context-2026-10-12');
function interior(page: Page) { return page.locator('[data-hive-interior]'); }
function context(page: Page) { return page.locator('[data-management-hive-context]'); }
function choice(page: Page) { return page.locator('[data-management-preview-choice]'); }
function horizon(page: Page) { return page.locator('[data-management-preview-horizon]'); }
function metric(page: Page) { return page.locator('[data-preview-timeline-metric]'); }
function topic(page: Page, id: string) { return interior(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return interior(page).locator('[data-interior-role="' + id + '"]'); }
function reading(page: Page, id: string) { return context(page).locator('[data-management-hive-reading="' + id + '"]'); }
function difference(page: Page) { return context(page).locator('[data-management-hive-difference]'); }
function status(page: Page) { return context(page).locator('[data-management-hive-status]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in this study test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40,
      syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep my own observation <strong>as text</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
}
async function openHive(page: Page) {
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await interior(page).locator('[data-interior-frame="2"]').click();
}
async function hold(page: Page) {
  await interior(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(interior(page).locator('[data-interior-clear]')).toBeVisible();
}
async function enterManagement(page: Page) {
  await interior(page).locator('[data-interior-management]').focus(); await page.keyboard.press('Enter');
  await expect(choice(page)).toBeFocused(); await expect(context(page)).toBeVisible();
}
async function returnToHive(page: Page) {
  await context(page).locator('[data-management-return-interior]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(interior(page).locator('[data-interior-frame="2"]')).toHaveAttribute('aria-pressed', 'true');
}
async function heldMarks(page: Page) {
  return interior(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]));
}
async function assertStructure(page: Page) {
  await expect(context(page)).toHaveCount(1);
  await expect(context(page).getByRole('heading', { name: 'From your hive study', exact: true })).toBeVisible();
  await expect(page.locator('[data-management-return-interior]')).toHaveCount(1);
  await expect(context(page).getByRole('button', { name: 'Return inside the hive', exact: true })).toBeVisible();
  await expect(context(page).locator('[data-management-hive-focus]')).toContainText('Frame 3 of 6');
  await expect(context(page).locator('[data-management-hive-focus]')).toContainText('Centre');
  const description = (await choice(page).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  for (const id of ['beehive-management-hive-focus', 'beehive-management-hive-scope', 'beehive-management-hive-readings', 'beehive-management-hive-status']) {
    expect(description).toContain(id); await expect(context(page).locator('#' + id)).toHaveCount(1);
  }
  expect(await context(page).evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('.bee-preview-controls')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(context(page)).toContainText(/project/i);
  await expect(context(page)).not.toContainText('No selected-category cells are shown');
}

test('management carries the selected hive study and exact held readings through previews and actual feeding without changing saved work', async ({ page }) => {
  await mount(page);
  await page.locator('[data-management-preview] summary').click();
  await expect(choice(page)).toBeVisible(); await expect(context(page)).toHaveCount(0);
  expect(await choice(page).getAttribute('aria-describedby')).toBeNull();
  await choice(page).selectOption({ value: 'feed_bees' }); await horizon(page).selectOption({ value: '30' });
  await metric(page).selectOption({ value: 'brood' });
  await openHive(page); await hold(page);
  const unchanged = await work(page), originalMarks = await heldMarks(page);
  expect(originalMarks.length).toBeGreaterThan(0);
  for (const item of [
    { id: 'food', label: 'Food stores', value: '40 honey-equivalent lb', difference: '0 honey-equivalent lb' },
    { id: 'pollen', label: 'Pollen stores', value: '12 lb', difference: '0 lb' },
    { id: 'brood', label: 'Developing brood', value: '6,000 cells', difference: '0 cells' },
    { id: 'queen', label: 'Queen', value: '90 / 100', difference: '0 points' },
  ]) {
    await topic(page, item.id).click(); await enterManagement(page); await assertStructure(page);
    await expect(context(page).locator('[data-management-hive-focus]')).toContainText(item.label);
    await expect(context(page).locator('[data-management-hive-scope]')).toContainText(item.label);
    await expect(reading(page, 'held')).toHaveText(item.value); await expect(reading(page, 'current')).toHaveText(item.value);
    await expect(difference(page)).toHaveText(item.difference); await expect(status(page)).toContainText('Same modeled day');
    await expect(context(page).locator('dt').filter({ hasText: /Held.*Day 15/i })).toHaveCount(1);
    await expect(context(page).locator('dt').filter({ hasText: /Current.*Day 15/i })).toHaveCount(1);
    if (item.id === 'food') await expect(context(page)).toContainText(/fed syrup/i);
    if (item.id === 'brood') await expect(context(page)).toContainText(/all modeled brood/i);
    if (item.id === 'queen') { await expect(context(page)).toContainText(/model.*score/i); await expect(context(page)).toContainText('does not locate the queen'); }
    await expect(choice(page)).toHaveValue('feed_bees'); await expect(horizon(page)).toHaveValue('30'); await expect(metric(page)).toHaveValue('brood');
    expect(await work(page)).toEqual(unchanged); expect(await heldMarks(page)).toEqual(originalMarks);
    await returnToHive(page); await expect(topic(page, item.id)).toHaveAttribute('aria-pressed', 'true');
  }
  await topic(page, 'brood').click(); await role(page, 'empty').click(); await enterManagement(page);
  await expect(context(page).locator('[data-management-hive-focus]')).toContainText('Unmarked comb');
  await expect(context(page)).toContainText(/No separate colony (?:reading|total)/i);
  await expect(reading(page, 'current')).toHaveText('6,000 cells');
  await choice(page).selectOption({ value: 'add_super' }); await horizon(page).selectOption({ value: '7' });
  await expect(metric(page)).toHaveValue('brood'); expect(await work(page)).toEqual(unchanged);
  await returnToHive(page); await expect(role(page, 'empty')).toHaveAttribute('aria-pressed', 'true');
  await role(page, 'honey').click(); await enterManagement(page);
  await choice(page).selectOption({ value: 'feed_bees' }); await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); expect(await work(page)).toEqual(unchanged);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 20000 }).toBeNull();
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(45); expect(fed.beehive.syrup).toBe(10);
  expect(fed.beehive.actionPoints).toBe(unchanged.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(15);
  expect(fed.beehive.notebook).toEqual(unchanged.beehive.notebook); expect(fed.otherTool).toEqual(unchanged.otherTool);
  await expect(reading(page, 'held')).toHaveText('40 honey-equivalent lb'); await expect(reading(page, 'current')).toHaveText('45 honey-equivalent lb');
  await expect(difference(page)).toHaveText('+5 honey-equivalent lb'); expect(await heldMarks(page)).toEqual(originalMarks);
  await returnToHive(page); await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
  expect(await work(page)).toEqual(fed); await enterManagement(page); expect(await work(page)).toEqual(fed);
  await fixture(page, { day: 16 }); const later = await work(page);
  await expect(status(page)).toContainText('1 modeled day elapsed');
  await expect(reading(page, 'held')).toHaveText('40 honey-equivalent lb'); await expect(reading(page, 'current')).toHaveText('45 honey-equivalent lb');
  await returnToHive(page); expect(await work(page)).toEqual(later);
});

test('management hive context distinguishes no reference, zero, missing readings and latched invalid comparisons', async ({ page }) => {
  await mount(page); await openHive(page); await topic(page, 'food').click(); await enterManagement(page);
  await expect(status(page)).toContainText(/no.*reference/i);
  await expect(reading(page, 'current')).toHaveText('40 honey-equivalent lb');
  await expect(reading(page, 'held')).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
  await fixture(page, { honey: 0, syrup: 0 }); await hold(page);
  await expect(reading(page, 'held')).toHaveText('0 honey-equivalent lb'); await expect(reading(page, 'current')).toHaveText('0 honey-equivalent lb');
  await expect(difference(page)).toHaveText('0 honey-equivalent lb');
  await fixture(page, { honey: null }); const missing = await work(page);
  await expect(reading(page, 'held')).toHaveText('0 honey-equivalent lb'); await expect(reading(page, 'current')).toHaveText('Not recorded');
  await expect(difference(page)).toHaveText('Not comparable');
  await choice(page).selectOption({ value: 'add_super' }); await horizon(page).selectOption({ value: '30' });
  expect(await work(page)).toEqual(missing);
  await hold(page); await fixture(page, { honey: 40, syrup: 5 });
  await expect(reading(page, 'held')).toHaveText('Not recorded'); await expect(reading(page, 'current')).toHaveText('40 honey-equivalent lb');
  await expect(difference(page)).toHaveText('Not comparable');
  await hold(page); await fixture(page, { experimentRunSerial: 4 });
  await expect(status(page)).toContainText('different run, seed or model');
  await expect(reading(page, 'held')).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
  await expect(reading(page, 'current')).toHaveText('40 honey-equivalent lb');
  await fixture(page, { experimentRunSerial: 3 }); await expect(status(page)).toContainText('different run, seed or model');
  const changedRun = await work(page); await returnToHive(page); await enterManagement(page); expect(await work(page)).toEqual(changedRun);
  await hold(page); await fixture(page, { day: 14 });
  await expect(status(page)).toContainText('earlier than the held day');
  await expect(reading(page, 'held')).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
  await fixture(page, { day: 16 }); await expect(status(page)).toContainText('earlier than the held day');
  await hold(page); await expect(reading(page, 'held')).toHaveText('40 honey-equivalent lb');
  await expect(difference(page)).toHaveText('0 honey-equivalent lb');
  await interior(page).locator('[data-interior-clear]').click();
  await expect(status(page)).toContainText(/no.*reference/i); await expect(reading(page, 'held')).toHaveCount(0);
  await expect(difference(page)).toHaveCount(0); await assertStructure(page);
});

async function audit(page: Page) {
  const violations = await context(page).evaluate(async node => {
    const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
  const layout = await context(page).evaluate(node => {
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize), elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,h5,dt,dd,span,strong,button,dl'))];
    return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.slice(1).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(node.querySelectorAll('button')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  await context(page).locator('[data-management-return-interior]').focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(context(page).locator('[data-management-return-interior]')).toBeFocused();
  expect(await context(page).locator('[data-management-return-interior]').evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
}

test('hive context is readable before management controls on phones, dark mode, forced colors and enlarged text', async ({ page }) => {
  await mount(page); await openHive(page); await role(page, 'honey').click(); await hold(page);
  await fixture(page, { day: 16, honey: 45 }); await enterManagement(page);
  const unchanged = await work(page), marks = await heldMarks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await assertStructure(page); await audit(page);
    await expect(reading(page, 'held')).toHaveText('40 honey-equivalent lb'); await expect(reading(page, 'current')).toHaveText('45 honey-equivalent lb');
    await expect(difference(page)).toHaveText('+5 honey-equivalent lb');
    await context(page).screenshot({ path: path.join(artifactDir, 'preview-context-' + mode + '.png'), animations: 'disabled' });
    expect(await heldMarks(page)).toEqual(marks);
  }
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
  await returnToHive(page); await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
});

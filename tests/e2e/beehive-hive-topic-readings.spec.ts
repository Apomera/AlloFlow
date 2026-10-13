import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const artifacts = path.resolve('.codex-artifacts/bee-topic-readings-2026-10-12');
const topics = [
  { id: 'food', key: 'honey', label: 'Food stores', value: '40 honey-equivalent lb', scope: 'Whole-colony total' },
  { id: 'pollen', key: 'pollen', label: 'Pollen stores', value: '12 lb', scope: 'Whole-colony total' },
  { id: 'brood', key: 'brood', label: 'Developing brood', value: '6,000 cells', scope: 'Whole-colony total · all modeled brood' },
  { id: 'queen', key: 'queenHealth', label: 'Queen', value: '90 / 100', scope: 'Model health score' },
];

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => {
  if (info.error) console.error(info.error.message);
  await harness.destroy(page);
});

function interior(page: Page) { return page.locator('[data-hive-interior]'); }
function detail(page: Page) { return interior(page).locator('[data-interior-detail]'); }
function readings(page: Page) { return detail(page).locator('[data-interior-topic-readings]'); }
function topic(page: Page, id: string) { return interior(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return interior(page).locator('[data-interior-role="' + id + '"]'); }
function comparison(page: Page) { return interior(page).locator('[data-interior-comparison]'); }
function row(page: Page, id: string) { return comparison(page).locator('[data-interior-change="' + id + '"]'); }
function current(page: Page) { return readings(page).locator('[data-interior-reading]'); }
function held(page: Page) { return readings(page).locator('[data-interior-topic-held]'); }
function difference(page: Page) { return readings(page).locator('[data-interior-topic-difference]'); }
function status(page: Page) { return readings(page).locator('[data-interior-topic-status]'); }
function compareButton(page: Page) { return readings(page).locator('[data-interior-topic-compare]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function marks(page: Page) {
  return interior(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]));
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the topic readings test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my exact observation</strong> & punctuation.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await interior(page).locator('[data-interior-frame="2"]').click();
}
async function hold(page: Page) {
  await interior(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(interior(page).locator('[data-interior-clear]')).toBeVisible();
}
async function structure(page: Page, id: string) {
  const item = topics.find(item => item.id === id)!;
  await expect(detail(page)).toHaveAttribute('data-interior-detail', id);
  await expect(readings(page)).toHaveCount(1);
  await expect(readings(page)).toHaveAttribute('role', 'group');
  await expect(readings(page)).toHaveAccessibleName('Readings for this topic');
  await expect(readings(page).locator('#beehive-interior-topic-readings-title')).toHaveText('Readings for this topic');
  await expect(readings(page).locator('[data-interior-topic-scope]')).toHaveText(item.scope);
  await expect(current(page)).toHaveCount(1);
  await expect(status(page)).toHaveAttribute('role', 'status');
  await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await expect(status(page)).toHaveAttribute('aria-atomic', 'true');
  await expect(compareButton(page)).toHaveText('Compare all colony readings');
  expect((await compareButton(page).getAttribute('aria-describedby') || '').split(/\s+/)).toContain('beehive-interior-topic-status');
  if (id === 'food') await expect(detail(page)).toContainText('Fed syrup already included:');
  if (id === 'queen') await expect(detail(page)).toContainText('The cutaway does not locate a live queen.');
}
async function pairMatchesComparison(page: Page, id: string) {
  await structure(page, id);
  await expect(readings(page).locator('dl')).toHaveAttribute('data-paired', 'true');
  await expect(held(page)).toHaveText(await row(page, id).locator('[data-change-held]').innerText());
  await expect(current(page)).toHaveText(await row(page, id).locator('[data-change-current]').innerText());
  await expect(difference(page)).toHaveText(await row(page, id).locator('[data-change-difference]').innerText());
  await expect(status(page)).toHaveText(/^(?:Same modeled day; changes may be immediate\.|\d+ modeled days? elapsed\.)$/);
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText(await status(page).innerText());
}
async function allPairs(page: Page) {
  const unchanged = await work(page), heldMarks = await marks(page);
  for (const item of topics) { await topic(page, item.id).click(); await pairMatchesComparison(page, item.id); }
  expect(await work(page)).toEqual(unchanged); expect(await marks(page)).toEqual(heldMarks);
}

test('selected topics keep exact colony readings across roles frames zeros missing values and invalid references', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await work(page);
  for (const item of topics) {
    await topic(page, item.id).click(); await structure(page, item.id);
    await expect(current(page)).toHaveText(item.value);
    await expect(readings(page).locator('dl')).toHaveAttribute('data-paired', 'false');
    await expect(held(page)).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
    await expect(status(page)).toHaveText('Current readings only. Hold a reference to compare this topic over time.');
  }
  await compareButton(page).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-comparison-title')).toBeFocused();
  await expect(held(page)).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
  expect(await work(page)).toEqual(original); await hold(page); await allPairs(page);
  await fixture(page, { day: 16, honey: 45.12549, pollen: 9.5005, brood: 5700.55549, queenHealth: 86.25049 });
  await allPairs(page);
  for (const item of [
    { id: 'food', value: '45.125 honey-equivalent lb', delta: '+5.125 honey-equivalent lb', direction: 'Increased' },
    { id: 'pollen', value: '9.501 lb', delta: '-2.499 lb', direction: 'Decreased' },
    { id: 'brood', value: '5,700.555 cells', delta: '-299.445 cells', direction: 'Decreased' },
    { id: 'queen', value: '86.25 / 100', delta: '-3.75 points', direction: 'Decreased' },
  ]) {
    await topic(page, item.id).click(); await expect(current(page)).toHaveText(item.value);
    await expect(difference(page)).toHaveText(item.delta);
    await expect(readings(page).locator('[data-interior-topic-direction]')).toHaveText(item.direction);
    await expect(readings(page).locator('dt').filter({ hasText: /^Held · Day 15$/ })).toHaveCount(1);
    await expect(readings(page).locator('dt').filter({ hasText: /^Current · Day 16$/ })).toHaveCount(1);
    await expect(readings(page).locator('dt').filter({ hasText: /^Current minus held$/ })).toHaveCount(1);
  }
  for (const frame of [0, 5, 2]) {
    await interior(page).locator('[data-interior-frame="' + frame + '"]').click(); const unchanged = await work(page);
    for (const item of [
      { role: 'honey', topic: 'food' }, { role: 'pollen', topic: 'pollen' },
      { role: 'open_brood', topic: 'brood' }, { role: 'capped_brood', topic: 'brood' },
      { role: 'drone_brood', topic: 'brood' }, { role: 'empty', topic: 'brood' },
    ]) {
      await role(page, item.role).click(); await pairMatchesComparison(page, item.topic);
      await expect(role(page, item.role)).toHaveAttribute('aria-pressed', 'true');
      if (item.role === 'empty') await expect(detail(page)).toContainText(/No separate colony (?:reading|total)/i);
      expect(await work(page)).toEqual(unchanged);
    }
  }
  await fixture(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 }); await hold(page);
  for (const item of [
    { id: 'food', value: '0 honey-equivalent lb', delta: '0 honey-equivalent lb' },
    { id: 'pollen', value: '0 lb', delta: '0 lb' }, { id: 'brood', value: '0 cells', delta: '0 cells' },
    { id: 'queen', value: '0 / 100', delta: '0 points' },
  ]) {
    await topic(page, item.id).click(); await pairMatchesComparison(page, item.id);
    await expect(held(page)).toHaveText(item.value); await expect(current(page)).toHaveText(item.value);
    await expect(difference(page)).toHaveText(item.delta); await expect(readings(page).locator('[data-interior-topic-direction]')).toHaveText('Unchanged');
  }
  await fixture(page, { pollen: null }); await topic(page, 'pollen').click(); await pairMatchesComparison(page, 'pollen');
  await expect(held(page)).toHaveText('0 lb'); await expect(current(page)).toHaveText('Not recorded');
  await expect(difference(page)).toHaveText('Not comparable'); await expect(readings(page).locator('[data-interior-topic-direction]')).toHaveText('Unavailable');
  await hold(page); await fixture(page, { pollen: 3, queenHealth: null });
  await expect(held(page)).toHaveText('Not recorded'); await expect(current(page)).toHaveText('3 lb');
  await expect(difference(page)).toHaveText('Not comparable'); await allPairs(page);
  await fixture(page, { queenHealth: 90 }); await hold(page); await fixture(page, { experimentRunSerial: 4 });
  await expect(status(page)).toContainText('different run, seed or model');
  await expect(status(page)).toHaveText(await comparison(page).locator('[data-interior-comparison-status]').innerText());
  await expect(readings(page).locator('dl')).toHaveAttribute('data-paired', 'false');
  await expect(held(page)).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
  await expect(current(page)).toHaveText('90 / 100');
  await fixture(page, { experimentRunSerial: 3 }); await expect(status(page)).toContainText('different run, seed or model');
  await hold(page); await fixture(page, { day: 14 }); await expect(status(page)).toContainText('earlier than the held day');
  await expect(held(page)).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
  await fixture(page, { day: 17 }); await expect(status(page)).toContainText('earlier than the held day');
  await hold(page); await allPairs(page); await interior(page).locator('[data-interior-clear]').click();
  await expect(status(page)).toHaveText('Current readings only. Hold a reference to compare this topic over time.');
  await expect(held(page)).toHaveCount(0); await expect(difference(page)).toHaveCount(0);
  const final = await work(page); expect(final.beehive.notebook).toEqual(original.beehive.notebook);
  expect(final.beehive.actionPoints).toBe(original.beehive.actionPoints); expect(final.otherTool).toEqual(original.otherTool);
  expect(final.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

test('keyboard comparison and hive inspection preserve study state before and after an actual beekeeper choice', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); const unchanged = await work(page), heldMarks = await marks(page);
  for (const [index, item] of topics.entries()) {
    await topic(page, item.id).focus(); await page.keyboard.press('Enter');
    await compareButton(page).focus(); await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
    await expect(page.locator('#beehive-interior-comparison-title')).toBeFocused();
    await expect(page.locator('#beehive-interior-comparison-title')).toHaveAttribute('tabindex', '-1');
    await expect(detail(page)).toHaveAttribute('data-interior-detail', item.id);
    await expect(interior(page).locator('[data-interior-frame="2"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await work(page)).toEqual(unchanged); expect(await marks(page)).toEqual(heldMarks);
    await row(page, item.id).locator('[data-interior-reading-inspect]').focus(); await page.keyboard.press(index % 2 ? 'Enter' : 'Space');
    await expect(page.locator('#beehive-interior-detail-title')).toBeFocused(); await pairMatchesComparison(page, item.id);
    expect(await work(page)).toEqual(unchanged); expect(await marks(page)).toEqual(heldMarks);
  }
  await role(page, 'honey').click(); await compareButton(page).focus(); await page.keyboard.press('Space');
  await expect(page.locator('#beehive-interior-comparison-title')).toBeFocused();
  await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true'); expect(await work(page)).toEqual(unchanged);
  await interior(page).locator('[data-interior-management]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-preview-choice]')).toBeFocused();
  await page.locator('[data-management-preview-choice]').selectOption({ value: 'feed_bees' });
  await page.locator('[data-management-preview-locate]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); expect(await work(page)).toEqual(unchanged);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.beehive.bkAnim), { timeout: 20000 }).toBeNull();
  const fed = await work(page); expect(fed.beehive.honey).toBe(45); expect(fed.beehive.syrup).toBe(10);
  expect(fed.beehive.actionPoints).toBe(unchanged.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(15);
  expect(fed.beehive.notebook).toEqual(unchanged.beehive.notebook); expect(fed.otherTool).toEqual(unchanged.otherTool);
  expect(fed.beehive.managementTrail.length).toBe((unchanged.beehive.managementTrail || []).length + 1);
  await page.locator('[data-management-return-interior]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused(); await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
  await pairMatchesComparison(page, 'food'); await expect(held(page)).toHaveText('40 honey-equivalent lb');
  await expect(current(page)).toHaveText('45 honey-equivalent lb'); await expect(difference(page)).toHaveText('+5 honey-equivalent lb');
  await expect(status(page)).toContainText('Same modeled day'); expect(await work(page)).toEqual(fed);
  expect(await marks(page)).toEqual(heldMarks);
  await compareButton(page).focus(); await page.keyboard.press('Enter'); await expect(page.locator('#beehive-interior-comparison-title')).toBeFocused();
  await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true'); expect(await work(page)).toEqual(fed);
  await row(page, 'food').locator('[data-interior-reading-inspect]').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#beehive-interior-detail-title')).toBeFocused(); expect(await work(page)).toEqual(fed);
  await page.locator('#beehive-next-day').click(); const later = await work(page); expect(later.beehive.day).toBe(16);
  await allPairs(page); await expect(status(page)).toContainText('1 modeled day elapsed'); expect(await marks(page)).toEqual(heldMarks);
  expect(later.beehive.notebook).toEqual(unchanged.beehive.notebook); expect(later.otherTool).toEqual(unchanged.otherTool);
  expect(later.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

async function audit(page: Page) {
  const violations = await detail(page).evaluate(async node => {
    const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const layout = await detail(page).evaluate(node => {
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize), elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,h5,dt,dd,span,strong,button,dl'))];
    return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.slice(1).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, pixels: parseFloat(getComputedStyle(el).fontSize), ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(node.querySelectorAll('button')).filter(el => el.getClientRects().length).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.pixels).toBeGreaterThanOrEqual(14); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  await compareButton(page).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(compareButton(page)).toBeFocused();
  const focus = await compareButton(page).evaluate(node => ({ width: parseFloat(getComputedStyle(node).outlineWidth), style: getComputedStyle(node).outlineStyle }));
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
  expect(await held(page).evaluate(node => getComputedStyle(node.parentElement!).borderTopStyle)).toBe('dashed');
  expect(await current(page).evaluate(node => getComputedStyle(node.parentElement!).borderTopStyle)).toBe('solid');
}

async function captureLargeReading(page: Page) {
  const position = await detail(page).evaluate(node => {
    const box = node.getBoundingClientRect();
    return { top: box.top + window.scrollY, height: box.height };
  });
  const tiles: { file: string; offset: number; height: number }[] = [];
  let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10);
    await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await detail(page).boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize()!;
    const y = box!.y + offset;
    expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, viewport.height - y);
    expect(height).toBeGreaterThan(0);
    const file = 'preview-topic-large' + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false,
      clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height });
    offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'large-preview-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), detailHeight: position.height, tiles }, null, 2));
}

test('topic readings remain clear and keyboard accessible on phones dark mode forced colors and enlarged text', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await role(page, 'honey').click(); await hold(page); await fixture(page, { day: 16, honey: 45.125 });
  const unchanged = await work(page), heldMarks = await marks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await pairMatchesComparison(page, 'food'); await audit(page);
    await expect(held(page)).toHaveText('40 honey-equivalent lb'); await expect(current(page)).toHaveText('45.125 honey-equivalent lb');
    await expect(difference(page)).toHaveText('+5.125 honey-equivalent lb');
    if (mode === 'large') await captureLargeReading(page);
    else await detail(page).screenshot({ path: path.join(artifacts, 'preview-topic-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    expect(await marks(page)).toEqual(heldMarks); await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
  }
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
  expect(errors).toEqual([]);
});

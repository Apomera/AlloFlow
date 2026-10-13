import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const artifacts = path.resolve('.codex-artifacts/bee-notebook-readings-2026-10-12');
const topics = [
  { id: 'food', label: 'Food stores', scope: 'Whole-colony total' },
  { id: 'pollen', label: 'Pollen stores', scope: 'Whole-colony total' },
  { id: 'brood', label: 'Developing brood', scope: 'Whole-colony total · all modeled brood' },
  { id: 'queen', label: 'Queen', scope: 'Model health score' },
];

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function interior(page: Page) { return page.locator('[data-hive-interior]'); }
function topic(page: Page, id: string) { return interior(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return interior(page).locator('[data-interior-role="' + id + '"]'); }
function notebook(page: Page) { return page.locator('[data-beehive-notebook="beekeeper"]'); }
function field(page: Page, id: string) { return notebook(page).locator('[data-notebook-field="' + id + '"]'); }
function context(page: Page) { return notebook(page).locator('[data-notebook-hive-context]'); }
function status(page: Page) { return context(page).locator('[data-notebook-hive-context-status]'); }
function value(page: Page, kind: string) { return context(page).locator('[data-notebook-hive-value="' + kind + '"]'); }
function row(page: Page, id: string) { return interior(page).locator('[data-interior-change="' + id + '"]'); }
function returnButton(page: Page) { return context(page).locator('[data-notebook-return-interior]'); }
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
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the notebook reading test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [], hive3dPart: null, hive3dFoundQueen: false,
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
  await interior(page).locator('[data-interior-frame="2"]').click(); await role(page, 'honey').click();
}
async function hold(page: Page) {
  await interior(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(interior(page).locator('[data-interior-clear]')).toBeVisible();
}
async function writing(page: Page, id: 'prediction' | 'explanation' = 'prediction') {
  await interior(page).locator('[data-interior-inquiry-' + id + ']').focus(); await page.keyboard.press('Enter');
  await expect(notebook(page)).toHaveAttribute('open', ''); await expect(field(page, id)).toBeFocused();
}
async function returnToHive(page: Page, key: 'Enter' | 'Space' = 'Enter') {
  await returnButton(page).focus(); await page.keyboard.press(key); await expect(page.locator('#beehive-interior-title')).toBeFocused();
}
async function structure(page: Page, id: string, selected: string, frame = 2) {
  const item = topics.find(item => item.id === id)!;
  await expect(context(page)).toHaveCount(1); await expect(context(page)).toHaveAccessibleName('Your held hive readings');
  await expect(context(page).getByRole('heading', { name: 'Your held hive readings', exact: true })).toBeVisible();
  await expect(returnButton(page)).toHaveCount(1); await expect(returnButton(page)).toHaveText('Return to held hive view');
  const readings = context(page).locator('[data-notebook-hive-context-reading="' + id + '"]');
  await expect(readings).toHaveAttribute('role', 'group'); await expect(readings).toHaveAccessibleName(item.label);
  await expect(readings.locator('#beehive-notebook-hive-reading-title')).toHaveText(item.label);
  await expect(context(page).locator('[data-notebook-hive-scope]')).toHaveText(item.scope);
  await expect(context(page).locator('[data-notebook-hive-focus]')).toHaveText('Studying: ' + selected + ' · Frame ' + (frame + 1) + '/6');
  await expect(context(page).locator('[data-notebook-hive-readings]')).toHaveCount(1);
  await expect(context(page).locator('[data-notebook-hive-card]')).toHaveCount(3);
  await expect(context(page).locator('[data-notebook-hive-card="difference"] dt')).toHaveText('Current minus held');
  expect(await status(page).getAttribute('role')).toBeNull(); expect(await status(page).getAttribute('aria-live')).toBeNull();
  expect(await returnButton(page).evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('[data-notebook-hive-readings]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  const note = context(page).locator('[data-notebook-hive-scope-note]');
  if (selected === 'Unmarked comb') await expect(note).toContainText('Unmarked comb has no separate colony total; these readings provide colony context.');
  else if (id === 'queen') await expect(note).toHaveText('This score does not locate the queen.');
  else await expect(note).toContainText('These readings cover the whole colony, not the selected frame or the number of drawn marks.');
  if (id === 'food') await expect(note).toContainText('Food includes fed syrup; it does not measure harvestable honey.');
}
async function matchReadings(page: Page, id: string) {
  await expect(value(page, 'held')).toHaveText(await row(page, id).locator('[data-change-held]').innerText());
  await expect(value(page, 'current')).toHaveText(await row(page, id).locator('[data-change-current]').innerText());
  await expect(value(page, 'difference')).toHaveText(await row(page, id).locator('[data-change-difference]').innerText());
}

test('notebook hive readings preserve exact topic and role context across frames rounding missing values and invalid references', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const initial = await work(page); await writing(page); await expect(context(page)).toHaveCount(0);
  expect(await work(page)).toEqual({ ...initial, beehive: { ...initial.beehive, notebookOpen: true } });
  await hold(page); await fixture(page, { day: 16, honey: 45.12549, pollen: 9.5005, brood: 5700.55549, queenHealth: 86.25049 });
  const unchanged = await work(page), heldMarks = await marks(page);
  for (const item of [
    { id: 'food', label: 'Food stores', held: '40 honey-equivalent lb', current: '45.125 honey-equivalent lb', difference: '+5.125 honey-equivalent lb', direction: 'Increased' },
    { id: 'pollen', label: 'Pollen stores', held: '12 lb', current: '9.501 lb', difference: '-2.499 lb', direction: 'Decreased' },
    { id: 'brood', label: 'Developing brood', held: '6,000 cells', current: '5,700.555 cells', difference: '-299.445 cells', direction: 'Decreased' },
    { id: 'queen', label: 'Queen', held: '90 / 100', current: '86.25 / 100', difference: '-3.75 points', direction: 'Decreased' },
  ]) {
    await topic(page, item.id).click(); await structure(page, item.id, item.label); await matchReadings(page, item.id);
    for (const kind of ['held', 'current', 'difference'] as const) await expect(value(page, kind)).toHaveText(item[kind]);
    await expect(context(page).locator('[data-notebook-hive-direction]')).toHaveText(item.direction);
    await expect(context(page).locator('[data-notebook-hive-card="held"] dt')).toHaveText('Held · Day 15');
    await expect(context(page).locator('[data-notebook-hive-card="current"] dt')).toHaveText('Current · Day 16');
    await expect(status(page)).toHaveText('Held Day 15 → Current Day 16 · Frame 3/6 in both schematics. 1 modeled day elapsed.');
    expect(await work(page)).toEqual(unchanged); expect(await marks(page)).toEqual(heldMarks);
  }
  for (const frame of [0, 5, 2]) {
    await interior(page).locator('[data-interior-frame="' + frame + '"]').click(); const frameWork = await work(page);
    for (const item of [
      { id: 'honey', topic: 'food', label: 'Food cells' }, { id: 'pollen', topic: 'pollen', label: 'Pollen cells' },
      { id: 'open_brood', topic: 'brood', label: 'Open brood' }, { id: 'capped_brood', topic: 'brood', label: 'Capped brood' },
      { id: 'drone_brood', topic: 'brood', label: 'Drone brood' }, { id: 'empty', topic: 'brood', label: 'Unmarked comb' },
    ]) {
      await role(page, item.id).click(); await structure(page, item.topic, item.label, frame); await matchReadings(page, item.topic);
      expect(await work(page)).toEqual(frameWork);
    }
  }
  for (const id of ['queen', 'food']) {
    await topic(page, id).click(); await role(page, 'empty').click(); await structure(page, id, 'Unmarked comb'); await matchReadings(page, id);
  }
  await fixture(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 }); await hold(page);
  for (const item of [
    { id: 'food', reading: '0 honey-equivalent lb', delta: '0 honey-equivalent lb' }, { id: 'pollen', reading: '0 lb', delta: '0 lb' },
    { id: 'brood', reading: '0 cells', delta: '0 cells' }, { id: 'queen', reading: '0 / 100', delta: '0 points' },
  ]) {
    await topic(page, item.id).click(); await matchReadings(page, item.id);
    await expect(value(page, 'held')).toHaveText(item.reading); await expect(value(page, 'current')).toHaveText(item.reading);
    await expect(value(page, 'difference')).toHaveText(item.delta); await expect(context(page).locator('[data-notebook-hive-direction]')).toHaveText('Unchanged');
  }
  await topic(page, 'pollen').click(); await fixture(page, { pollen: null }); await matchReadings(page, 'pollen');
  await expect(value(page, 'held')).toHaveText('0 lb'); await expect(value(page, 'current')).toHaveText('Not recorded');
  await expect(value(page, 'difference')).toHaveText('Not comparable'); await expect(context(page).locator('[data-notebook-hive-direction]')).toHaveText('Unavailable');
  await hold(page); await fixture(page, { pollen: 3 }); await expect(value(page, 'held')).toHaveText('Not recorded');
  await expect(value(page, 'current')).toHaveText('3 lb'); await expect(value(page, 'difference')).toHaveText('Not comparable');
  await hold(page); await fixture(page, { experimentRunSerial: 4 });
  await expect(status(page)).toContainText('different run, seed or model');
  await expect(context(page).locator('[data-notebook-hive-context-reading],[data-notebook-hive-readings],[data-notebook-hive-value]')).toHaveCount(0);
  await expect(context(page).locator('[data-notebook-hive-focus]')).toHaveText('Studying: Pollen stores · Frame 3/6');
  const invalid = await work(page); await returnToHive(page, 'Space'); await writing(page); expect(await work(page)).toEqual(invalid);
  await fixture(page, { experimentRunSerial: 3 }); await expect(status(page)).toContainText('different run, seed or model');
  await hold(page); await fixture(page, { day: 14 }); await expect(status(page)).toContainText('earlier than the held day');
  await expect(context(page).locator('[data-notebook-hive-readings]')).toHaveCount(0);
  await fixture(page, { day: 17 }); await expect(status(page)).toContainText('earlier than the held day');
  await hold(page); await matchReadings(page, 'pollen');
  const final = await work(page); expect(final.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(final.beehive.actionPoints).toBe(initial.beehive.actionPoints); expect(final.otherTool).toEqual(initial.otherTool);
  expect(final.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

test('notebook reading cards support keyboard writing and real choices without auto writing or changing held evidence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); const initial = await work(page), heldMarks = await marks(page);
  await writing(page); const opened = { ...initial, beehive: { ...initial.beehive, notebookOpen: true } }; expect(await work(page)).toEqual(opened);
  await structure(page, 'food', 'Food cells'); await expect(field(page, 'prediction')).toHaveValue(initial.beehive.notebook.beekeeper.prediction);
  const prediction = 'I predict feeding will increase the food reading today, while the held reading stays fixed.';
  await field(page, 'prediction').fill(prediction); const predicted = JSON.parse(JSON.stringify(opened));
  predicted.beehive.notebook.beekeeper.prediction = prediction; predicted.beehive.notebook.beekeeper.review.prediction = false;
  expect(await work(page)).toEqual(predicted);
  await returnToHive(page, 'Space'); await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
  await expect(interior(page).locator('[data-interior-frame="2"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await work(page)).toEqual(predicted); expect(await marks(page)).toEqual(heldMarks);
  await writing(page); expect(await work(page)).toEqual(predicted); await returnToHive(page);
  await interior(page).locator('[data-interior-management]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-preview-choice]')).toBeFocused();
  await page.locator('[data-management-preview-choice]').selectOption({ value: 'feed_bees' });
  await page.locator('[data-management-preview-locate]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); expect(await work(page)).toEqual(predicted);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.beehive.bkAnim), { timeout: 20000 }).toBeNull();
  const fed = await work(page); expect(fed.beehive.honey).toBe(45); expect(fed.beehive.syrup).toBe(10);
  expect(fed.beehive.actionPoints).toBe(predicted.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(15);
  expect(fed.beehive.notebook).toEqual(predicted.beehive.notebook); expect(fed.otherTool).toEqual(predicted.otherTool);
  expect(fed.beehive.managementTrail.length).toBe((predicted.beehive.managementTrail || []).length + 1);
  await page.locator('[data-management-return-interior]').focus(); await page.keyboard.press('Enter'); await writing(page, 'explanation');
  await matchReadings(page, 'food'); await expect(value(page, 'held')).toHaveText('40 honey-equivalent lb');
  await expect(value(page, 'current')).toHaveText('45 honey-equivalent lb'); await expect(value(page, 'difference')).toHaveText('+5 honey-equivalent lb');
  await expect(status(page)).toContainText('Same modeled day'); expect(await work(page)).toEqual(fed); expect(await marks(page)).toEqual(heldMarks);
  const explanation = 'Food increased by 5 honey-equivalent lb after feeding. These readings include syrup, so this is not 5 lb of new honey.';
  await field(page, 'explanation').fill(explanation); const explained = JSON.parse(JSON.stringify(fed));
  explained.beehive.notebook.beekeeper.explanation = explanation; explained.beehive.notebook.beekeeper.review.explanation = false;
  expect(await work(page)).toEqual(explained); await returnToHive(page); await writing(page, 'explanation'); expect(await work(page)).toEqual(explained);
  await returnToHive(page, 'Space'); await page.locator('#beehive-next-day').click(); const later = await work(page); expect(later.beehive.day).toBe(16);
  await writing(page, 'explanation'); await matchReadings(page, 'food'); await expect(status(page)).toContainText('1 modeled day elapsed.');
  expect(await work(page)).toEqual(later); expect(await marks(page)).toEqual(heldMarks); expect(later.beehive.notebook).toEqual(explained.beehive.notebook);
  await returnToHive(page); await hold(page); await writing(page); await expect(value(page, 'difference')).toHaveText('0 honey-equivalent lb');
  await expect(status(page)).toContainText('Held Day 16 → Current Day 16'); expect(await work(page)).toEqual(later);
  await returnToHive(page); await interior(page).locator('[data-interior-clear]').focus(); await page.keyboard.press('Space');
  await expect(interior(page).locator('[data-interior-hold]')).toBeFocused(); await expect(context(page)).toHaveCount(0); expect(await work(page)).toEqual(later);
  await writing(page); await expect(field(page, 'prediction')).toHaveValue(prediction); await expect(context(page)).toHaveCount(0);
  expect(await work(page)).toEqual(later); expect(later.beehive.notebook.beekeeper.review).toEqual({ prediction: false, evidence: true, explanation: false });
  expect(later.otherTool).toEqual(initial.otherTool); expect(later.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

async function audit(page: Page) {
  const violations = await context(page).evaluate(async node => {
    const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const layout = await context(page).evaluate(node => {
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize), elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,h5,dt,dd,span,strong,button,dl'))];
    return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.slice(1).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, pixels: parseFloat(getComputedStyle(el).fontSize), ellipsis: getComputedStyle(el).textOverflow })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.pixels).toBeGreaterThanOrEqual(14); expect(item.ellipsis).not.toBe('ellipsis'); }
  await returnButton(page).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(returnButton(page)).toBeFocused();
  const control = await returnButton(page).evaluate(node => {
    const box = node.getBoundingClientRect(), css = getComputedStyle(node);
    return { width: box.width, height: box.height, outline: parseFloat(css.outlineWidth), style: css.outlineStyle };
  });
  expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44);
  expect(control.outline).toBeGreaterThanOrEqual(2); expect(control.style).not.toBe('none');
  expect(await context(page).locator('[data-notebook-hive-card="held"]').evaluate(node => getComputedStyle(node).borderTopStyle)).toBe('dashed');
  expect(await context(page).locator('[data-notebook-hive-card="current"]').evaluate(node => getComputedStyle(node).borderTopStyle)).toBe('solid');
}
async function capture(page: Page, mode: string) {
  const position = await context(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = [];
  let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10);
    await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await context(page).boundingBox(); expect(box).not.toBeNull();
    const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-notebook-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false,
      clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-notebook-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('notebook hive reading cards remain clear and keyboard accessible across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); await fixture(page, { day: 16, honey: 45.125 }); await writing(page);
  const unchanged = await work(page), heldMarks = await marks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await structure(page, 'food', 'Food cells'); await matchReadings(page, 'food'); await audit(page);
    await expect(value(page, 'held')).toHaveText('40 honey-equivalent lb'); await expect(value(page, 'current')).toHaveText('45.125 honey-equivalent lb');
    await expect(value(page, 'difference')).toHaveText('+5.125 honey-equivalent lb');
    if (mode === 'wide') {
      const cards = await context(page).locator('[data-notebook-hive-card]').evaluateAll(nodes => nodes.map(node => { const box = node.getBoundingClientRect(); return { kind: node.getAttribute('data-notebook-hive-card'), top: box.top, left: box.left, width: box.width }; }));
      const held = cards.find(card => card.kind === 'held')!, current = cards.find(card => card.kind === 'current')!, difference = cards.find(card => card.kind === 'difference')!;
      expect(Math.abs(held.top - current.top)).toBeLessThanOrEqual(1); expect(current.left).toBeGreaterThan(held.left);
      expect(difference.top).toBeGreaterThan(held.top); expect(difference.width).toBeGreaterThan(held.width);
    }
    await capture(page, mode); await returnToHive(page, 'Space'); await writing(page);
    expect(await marks(page)).toEqual(heldMarks); await expect(role(page, 'honey')).toHaveAttribute('aria-pressed', 'true');
    await expect(interior(page).locator('[data-interior-frame="2"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await work(page)).toEqual(mode === 'wide' ? unchanged : { ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
  }
  expect(errors).toEqual([]);
});

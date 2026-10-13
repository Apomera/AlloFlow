import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const artifacts = path.resolve('.codex-artifacts/bee-reference-panel-2026-10-12');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => {
  if (info.error) console.error(info.error.message);
  await harness.destroy(page);
});

function interior(page: Page) { return page.locator('[data-hive-interior]'); }
function reference(page: Page) { return interior(page).locator('[data-interior-reference]'); }
function comparison(page: Page) { return interior(page).locator('[data-interior-comparison]'); }
function row(page: Page, id: string) { return comparison(page).locator('[data-interior-change="' + id + '"]'); }
function status(page: Page) { return reference(page).locator('[data-interior-reference-status]'); }
function holdButton(page: Page) { return reference(page).locator('[data-interior-hold]'); }
function clearButton(page: Page) { return reference(page).locator('[data-interior-clear]'); }
function locateButton(page: Page) { return comparison(page).locator('[data-interior-reference-locate]'); }
function day(page: Page, kind: 'held' | 'current') { return reference(page).locator('[data-reference-day="' + kind + '"]'); }
function description(page: Page, kind: 'held' | 'current') { return reference(page).locator('[data-reference-description="' + kind + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function marks(page: Page, kind: 'held' | 'current' = 'held') {
  const attribute = kind === 'held' ? 'data-held-cell' : 'data-interior-cell';
  return interior(page).locator('[' + attribute + ']').evaluateAll((nodes, attribute) => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute(attribute)]), attribute);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the reference panel test'); };
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
  await interior(page).locator('[data-interior-role="honey"]').click();
}
async function hold(page: Page, key: 'Enter' | 'Space' = 'Enter') {
  await holdButton(page).focus(); await page.keyboard.press(key);
  await expect(clearButton(page)).toBeVisible();
}
async function locate(page: Page, key: 'Enter' | 'Space' = 'Enter') {
  await locateButton(page).focus(); await page.keyboard.press(key);
  await expect(reference(page).locator('#beehive-interior-reference-title')).toBeFocused();
}
async function structure(page: Page) {
  await expect(reference(page)).toHaveCount(1); await expect(reference(page)).toHaveAttribute('id', 'beehive-interior-reference');
  await expect(reference(page)).toHaveAccessibleName('Comparison reference');
  await expect(reference(page).getByRole('heading', { level: 4, name: 'Comparison reference', exact: true })).toHaveAttribute('tabindex', '-1');
  await expect(reference(page).locator('[data-interior-reference-days]')).toHaveCount(1);
  for (const kind of ['held', 'current']) await expect(reference(page).locator('[data-reference-card="' + kind + '"]')).toHaveCount(1);
  await expect(interior(page).locator('[data-interior-hold]')).toHaveCount(1);
  await expect(comparison(page).locator('[data-interior-hold],[data-interior-clear]')).toHaveCount(0);
  await expect(holdButton(page)).toHaveAttribute('aria-describedby', 'beehive-interior-reference-status');
  if (await clearButton(page).count()) {
    await expect(interior(page).locator('[data-interior-clear]')).toHaveCount(1);
    await expect(clearButton(page)).toHaveAttribute('aria-describedby', 'beehive-interior-reference-status');
  }
  expect(await status(page).getAttribute('role')).toBeNull(); expect(await status(page).getAttribute('aria-live')).toBeNull();
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toHaveAttribute('aria-live', 'polite');
  await expect(locateButton(page)).toHaveCount(1); await expect(locateButton(page)).toHaveText('Manage held reference');
  await expect(locateButton(page)).toHaveAttribute('aria-controls', 'beehive-interior-reference');
  await expect(description(page, 'current')).toHaveText('Updates with the colony.');
  const order = await reference(page).evaluate(node => {
    const root = node.closest('[data-hive-interior]')!;
    const before = root.querySelector('[data-interior-frame-note]')!, after = root.querySelector('#beehive-interior-read-title')!, diagram = root.querySelector('[data-hive-interior-diagram]')!;
    return [Boolean(before.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
      Boolean(node.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING), Boolean(node.compareDocumentPosition(diagram) & Node.DOCUMENT_POSITION_FOLLOWING)];
  });
  expect(order).toEqual([true, true, true]);
}
async function referenceState(page: Page, state: 'empty' | 'held' | 'unavailable') {
  await expect(reference(page)).toHaveAttribute('data-reference-state', state);
  await expect(reference(page).locator('[data-interior-reference-state]')).toHaveText({ empty: 'Current only', held: 'Held + current', unavailable: 'Comparison unavailable' }[state]);
}
async function disabledReason(page: Page, state: 'empty' | 'unavailable' = 'unavailable') {
  const reason = await page.evaluate(() => { const w = window as any; return w.__RR_TEST_EXPORTS__.beehive.bhHiveInteriorSnapshot(w.__toolData.beehive).reason; });
  expect(reason).not.toBe(''); await expect(holdButton(page)).toBeDisabled(); await expect(status(page)).toHaveText(reason);
  await referenceState(page, state);
}

test('reference controls stay beside the hive and preserve held evidence through choices days replacement and clearing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const initial = await work(page), initialMarks = await marks(page, 'current');
  await structure(page); await referenceState(page, 'empty');
  await expect(day(page, 'held')).toHaveText('No reference'); await expect(day(page, 'current')).toHaveText('Day 15');
  await expect(description(page, 'held')).toHaveText('Hold the current readings to begin.');
  await expect(status(page)).toHaveText('Hold the current readings before trying a choice or advancing a modeled day.');
  await expect(holdButton(page)).toHaveText('Hold current readings'); await expect(clearButton(page)).toHaveCount(0);
  await locate(page); expect(await work(page)).toEqual(initial); expect(await marks(page)).toEqual([]);
  await hold(page); await structure(page); await referenceState(page, 'held');
  await expect(day(page, 'held')).toHaveText('Day 15'); await expect(day(page, 'current')).toHaveText('Day 15');
  await expect(description(page, 'held')).toHaveText('Fixed until replaced.');
  await expect(status(page)).toHaveText('Same modeled day; changes may be immediate.');
  await expect(holdButton(page)).toHaveText('Replace held readings');
  await expect(reference(page)).toContainText('Replacing starts a new comparison from the current readings. The reference lasts until cleared or you leave this tool.');
  expect(await work(page)).toEqual(initial); expect(await marks(page)).toEqual(initialMarks);
  for (const frame of [5, 0, 2]) {
    await interior(page).locator('[data-interior-frame="' + frame + '"]').click();
    const frameWork = await work(page), frameMarks = await marks(page);
    await locate(page, 'Space'); expect(await work(page)).toEqual(frameWork); expect(await marks(page)).toEqual(frameMarks);
    await expect(day(page, 'held')).toHaveText('Day 15'); await expect(row(page, 'food').locator('[data-change-held]')).toHaveText('40 honey-equivalent lb');
    await expect(interior(page).locator('[data-interior-role="honey"]')).toHaveAttribute('aria-pressed', 'true');
  }
  const beforeChoice = await work(page), heldMarks = await marks(page);
  await interior(page).locator('[data-interior-management]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-preview-choice]')).toBeFocused();
  await page.locator('[data-management-preview-choice]').selectOption({ value: 'feed_bees' });
  await page.locator('[data-management-preview-locate]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); expect(await work(page)).toEqual(beforeChoice);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.beehive.bkAnim), { timeout: 20000 }).toBeNull();
  const fed = await work(page); expect(fed.beehive.honey).toBe(45); expect(fed.beehive.syrup).toBe(10);
  expect(fed.beehive.actionPoints).toBe(beforeChoice.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(15);
  expect(fed.beehive.managementTrail.length).toBe((beforeChoice.beehive.managementTrail || []).length + 1);
  await page.locator('[data-management-return-interior]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused(); await locate(page);
  await expect(status(page)).toHaveText('Same modeled day; changes may be immediate.');
  await expect(row(page, 'food').locator('[data-change-held]')).toHaveText('40 honey-equivalent lb');
  await expect(row(page, 'food').locator('[data-change-current]')).toHaveText('45 honey-equivalent lb');
  expect(await work(page)).toEqual(fed); expect(await marks(page)).toEqual(heldMarks);
  await page.locator('#beehive-next-day').click(); const later = await work(page); expect(later.beehive.day).toBe(16);
  await expect(day(page, 'held')).toHaveText('Day 15'); await expect(day(page, 'current')).toHaveText('Day 16');
  await expect(status(page)).toHaveText('1 modeled day elapsed.'); expect(await marks(page)).toEqual(heldMarks);
  const laterCurrentMarks = await marks(page, 'current'); await locate(page, 'Space'); await hold(page, 'Space');
  await expect(day(page, 'held')).toHaveText('Day 16'); await expect(day(page, 'current')).toHaveText('Day 16');
  await expect(status(page)).toHaveText('Same modeled day; changes may be immediate.');
  expect(await marks(page)).toEqual(laterCurrentMarks); expect(await work(page)).toEqual(later);
  await expect(row(page, 'food').locator('[data-change-difference]')).toHaveText('0 honey-equivalent lb');
  await clearButton(page).focus(); await page.keyboard.press('Space'); await expect(holdButton(page)).toBeFocused();
  await referenceState(page, 'empty'); await expect(day(page, 'held')).toHaveText('No reference');
  await expect(day(page, 'current')).toHaveText('Day 16'); await expect(clearButton(page)).toHaveCount(0);
  await expect(interior(page).locator('[data-interior-topic-held]')).toHaveCount(0); expect(await marks(page)).toEqual([]);
  await expect(reference(page)).not.toContainText('Replacing starts a new comparison'); await structure(page);
  expect(await work(page)).toEqual(later); expect(later.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(later.otherTool).toEqual(initial.otherTool); expect(later.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

test('reference panel explains invalid identity and days while keeping zeros missing measurements and clear focus honest', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const original = await work(page); await hold(page);
  await fixture(page, { simulationSeed: 778 }); const changedSeed = await work(page);
  await referenceState(page, 'unavailable'); await expect(status(page)).toContainText('different run, seed or model');
  await expect(day(page, 'held')).toHaveText('Day 15'); await expect(description(page, 'held')).toHaveText('Unavailable for comparison');
  await expect(holdButton(page)).toBeEnabled(); await expect(interior(page).locator('[data-held-cell]')).toHaveCount(0);
  await locate(page); expect(await work(page)).toEqual(changedSeed);
  await fixture(page, { simulationSeed: 777 }); await expect(status(page)).toContainText('different run, seed or model');
  const restoredSeed = await work(page); await hold(page); await referenceState(page, 'held'); expect(await work(page)).toEqual(restoredSeed);
  await fixture(page, { day: 14 }); await referenceState(page, 'unavailable');
  await expect(status(page)).toContainText('earlier than the held day'); await expect(holdButton(page)).toBeEnabled();
  await expect(day(page, 'held')).toHaveText('Day 15'); await expect(day(page, 'current')).toHaveText('Day 14');
  await fixture(page, { day: 16 }); await expect(status(page)).toContainText('earlier than the held day');
  await hold(page); await referenceState(page, 'held'); await expect(day(page, 'held')).toHaveText('Day 16');
  await fixture(page, { day: null }); const missingDay = await work(page);
  await disabledReason(page); await expect(day(page, 'current')).toContainText(/not recorded/i);
  await expect(day(page, 'current')).not.toHaveText('Day 0'); await expect(day(page, 'held')).toHaveText('Day 16');
  await expect(description(page, 'held')).toHaveText('Unavailable for comparison');
  await locate(page, 'Space'); expect(await work(page)).toEqual(missingDay);
  await fixture(page, { day: 16, simulationSeed: null }); const missingIdentity = await work(page);
  await disabledReason(page); await expect(day(page, 'current')).toHaveText('Day 16');
  expect(await work(page)).toEqual(missingIdentity);
  await fixture(page, { simulationSeed: 777 }); await expect(holdButton(page)).toBeEnabled();
  const beforeClear = await work(page); await clearButton(page).focus(); await page.keyboard.press('Enter');
  await expect(holdButton(page)).toBeFocused(); await referenceState(page, 'empty'); expect(await work(page)).toEqual(beforeClear);
  await fixture(page, { day: null }); await disabledReason(page, 'empty'); await expect(day(page, 'held')).toHaveText('No reference');
  await expect(clearButton(page)).toHaveCount(0);
  await fixture(page, { day: 0, simulationSeed: 0, honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
  await referenceState(page, 'empty'); await expect(holdButton(page)).toBeEnabled(); await expect(day(page, 'current')).toHaveText('Day 0');
  const zero = await work(page); await hold(page); await referenceState(page, 'held');
  await expect(day(page, 'held')).toHaveText('Day 0'); await expect(day(page, 'current')).toHaveText('Day 0');
  await expect(row(page, 'food').locator('[data-change-held]')).toHaveText('0 honey-equivalent lb');
  await expect(row(page, 'food').locator('[data-change-difference]')).toHaveText('0 honey-equivalent lb'); expect(await work(page)).toEqual(zero);
  await fixture(page, { day: 1, honey: null }); await expect(holdButton(page)).toBeEnabled();
  await expect(day(page, 'held')).toHaveText('Day 0'); await expect(day(page, 'current')).toHaveText('Day 1');
  await expect(status(page)).toHaveText('1 modeled day elapsed.'); await referenceState(page, 'held');
  await expect(row(page, 'food').locator('[data-change-current]')).toHaveText('Not recorded');
  await expect(row(page, 'food').locator('[data-change-difference]')).toHaveText('Not comparable');
  const missingMeasurement = await work(page); await hold(page, 'Space'); expect(await work(page)).toEqual(missingMeasurement);
  await expect(day(page, 'held')).toHaveText('Day 1'); await expect(row(page, 'food').locator('[data-change-held]')).toHaveText('Not recorded');
  await fixture(page, { honey: 20 }); const recovered = await work(page);
  await expect(row(page, 'food').locator('[data-change-held]')).toHaveText('Not recorded');
  await expect(row(page, 'food').locator('[data-change-current]')).toHaveText('20 honey-equivalent lb');
  await expect(row(page, 'food').locator('[data-change-difference]')).toHaveText('Not comparable');
  await clearButton(page).focus(); await page.keyboard.press('Space'); await expect(holdButton(page)).toBeFocused();
  await referenceState(page, 'empty'); expect(await work(page)).toEqual(recovered); await structure(page);
  expect(recovered.beehive.notebook).toEqual(original.beehive.notebook); expect(recovered.beehive.actionPoints).toBe(original.beehive.actionPoints);
  expect(recovered.otherTool).toEqual(original.otherTool); expect(recovered.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

async function audit(page: Page) {
  const violations = await reference(page).evaluate(async node => {
    const result = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const layout = await reference(page).evaluate(node => {
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize), elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,dt,dd,span,strong,button,dl'))];
    return { overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: elements.slice(1).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / font, pixels: parseFloat(getComputedStyle(el).fontSize), ellipsis: getComputedStyle(el).textOverflow })),
      controls: Array.from(node.querySelectorAll('button')).filter(el => el.getClientRects().length).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.pixels).toBeGreaterThanOrEqual(14); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  for (const control of [holdButton(page), clearButton(page), locateButton(page)]) {
    await control.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(control).toBeFocused();
    const focus = await control.evaluate(node => {
      const css = getComputedStyle(node), rect = node.getBoundingClientRect();
      return { width: parseFloat(css.outlineWidth), style: css.outlineStyle, targetWidth: rect.width, targetHeight: rect.height };
    });
    expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none');
    expect(focus.targetWidth).toBeGreaterThanOrEqual(44); expect(focus.targetHeight).toBeGreaterThanOrEqual(44);
  }
  expect(await reference(page).locator('[data-reference-card="held"]').evaluate(node => getComputedStyle(node).borderTopStyle)).toBe('dashed');
  expect(await reference(page).locator('[data-reference-card="current"]').evaluate(node => getComputedStyle(node).borderTopStyle)).toBe('solid');
  await locate(page, 'Space');
}

async function captureReference(page: Page, mode: string) {
  const position = await reference(page).evaluate(node => {
    const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height };
  });
  const tiles: { file: string; offset: number; height: number }[] = [];
  let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10);
    await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await reference(page).boundingBox(); expect(box).not.toBeNull();
    const viewport = page.viewportSize()!, y = box!.y + offset;
    expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, viewport.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-reference-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false,
      clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-reference-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), referenceHeight: position.height, tiles }, null, 2));
}

async function assertPanelFits(page: Page) {
  const overflow = await reference(page).evaluate(node => [node, ...Array.from(node.querySelectorAll('div,p,h4,dt,dd,span,button,dl'))]
    .filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1)
    .map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })));
  expect(overflow).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test('reference panel and return shortcut remain readable and keyboard accessible across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await hold(page); await fixture(page, { day: 16, honey: 45.125 });
  const unchanged = await work(page), heldMarks = await marks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await structure(page); await referenceState(page, 'held'); await audit(page);
    await expect(day(page, 'held')).toHaveText('Day 15'); await expect(day(page, 'current')).toHaveText('Day 16');
    await expect(status(page)).toHaveText('1 modeled day elapsed.'); await captureReference(page, mode);
    expect(await marks(page)).toEqual(heldMarks);
    await expect(interior(page).locator('[data-interior-frame="2"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(interior(page).locator('[data-interior-role="honey"]')).toHaveAttribute('aria-pressed', 'true');
  }
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
  // The longer unavailable badge and the empty instructions must also fit a phone.
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; });
  await fixture(page, { simulationSeed: unchanged.beehive.simulationSeed + 1 });
  await referenceState(page, 'unavailable'); await assertPanelFits(page);
  await fixture(page, { simulationSeed: unchanged.beehive.simulationSeed });
  await clearButton(page).focus(); await page.keyboard.press('Enter');
  await referenceState(page, 'empty'); await assertPanelFits(page);
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } }); expect(errors).toEqual([]);
});

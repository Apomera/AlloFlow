import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const artifacts = '.codex-artifacts/bee-reading-scales-2026-10-10';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const topics = [
  { id: 'food', key: 'honey', label: 'Food stores', suffix: ' honey-equivalent lb' },
  { id: 'pollen', key: 'pollen', label: 'Pollen stores', suffix: ' lb' },
  { id: 'brood', key: 'brood', label: 'Developing brood', suffix: ' cells' },
  { id: 'queen', key: 'queenHealth', label: 'Queen', suffix: ' / 100' },
];

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.error) console.error(testInfo.error.message);
  await harness.destroy(page);
});

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function comparison(page: Page) { return panel(page).locator('[data-interior-comparison]'); }
function row(page: Page, id: string) { return comparison(page).locator('[data-interior-change="' + id + '"]'); }
function detail(page: Page) { return panel(page).locator('#beehive-interior-detail'); }
function inspect(page: Page, id: string) { return row(page, id).locator('[data-interior-reading-inspect="' + id + '"]'); }

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my exact observation</strong> & its punctuation.', explanation: 'Keep my explanation.',
      review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    queen: { evidence: 'Keep my network writing.', review: { evidence: true } },
    drone: { evidence: 'Keep my flight writing.', review: { evidence: true } },
    synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my discovery writing.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Reading scales use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive reading scales test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false, notebook,
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, seededNotebook());
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
}
async function open(page: Page) {
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  await expect(page.locator('[data-bay-canvas-frame="hive"] canvas')).toHaveCount(0);
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
}
async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}
async function hold(page: Page) {
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(comparison(page)).toBeVisible();
}
function displayed(value: number) {
  return Number(value.toLocaleString('en-US', { maximumFractionDigits: 3, useGrouping: false }));
}
function reading(value: number, suffix: string) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 3 }) + suffix;
}
async function assertBar(bar: Locator, expectedPercent: number) {
  await expect(bar).toHaveCount(1); await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute('aria-hidden', 'true'); await expect(bar).toHaveAttribute('viewBox', '0 0 100 10');
  const fill = bar.locator('[data-reading-bar-fill]'); await expect(fill).toHaveCount(1);
  expect(Number(await fill.getAttribute('x1'))).toBe(0);
  const actual = Number(await fill.getAttribute('x2'));
  expect(Number.isFinite(actual)).toBe(true); expect(actual).toBeGreaterThanOrEqual(0); expect(actual).toBeLessThanOrEqual(100);
  expect(actual).toBeCloseTo(expectedPercent, 6);
}
async function assertPair(page: Page, id: string, before: number, current: number) {
  const item = topics.find(item => item.id === id)!;
  const a = displayed(before), b = displayed(current), max = id === 'queen' ? 100 : Math.max(a, b);
  const delta = Math.round((b - a) * 1000) / 1000;
  await expect(row(page, id)).toHaveAttribute('data-interior-reading-scale', id);
  await expect(row(page, id)).toHaveAttribute('data-scale-available', 'true');
  await expect(row(page, id).locator('[data-change-held]')).toHaveText(reading(before, item.suffix));
  await expect(row(page, id).locator('[data-change-current]')).toHaveText(reading(current, item.suffix));
  await expect(row(page, id).locator('[data-change-difference]')).toHaveText((delta > 0 ? '+' : '') + reading(delta, id === 'queen' ? ' points' : item.suffix));
  await assertBar(row(page, id).locator('[data-reading-bar="held"]'), max === 0 ? 0 : a / max * 100);
  await assertBar(row(page, id).locator('[data-reading-bar="current"]'), max === 0 ? 0 : b / max * 100);
  await expect(row(page, id).locator('[data-interior-scale-caption]')).toContainText(/\S/);
  if (max === 0) await expect(row(page, id).locator('[data-interior-scale-caption]')).toContainText('Both readings are zero.');
}
async function assertUnavailable(page: Page, id: string) {
  await expect(row(page, id)).toHaveAttribute('data-scale-available', 'false');
  await expect(row(page, id).locator('[data-reading-bar]')).toHaveCount(0);
  await expect(row(page, id).locator('[data-change-difference]')).toHaveText('Not comparable');
  await expect(row(page, id).locator('[data-interior-scale-caption]')).toContainText(/unavailable|recorded|not comparable|valid|known|needed/i);
}
async function assertSelected(page: Page, id: string) {
  const item = topics.find(item => item.id === id)!;
  await expect(detail(page)).toHaveAttribute('data-interior-detail', id);
  await expect(detail(page).locator('#beehive-interior-detail-title')).toHaveText(item.label);
  for (const candidate of topics) {
    const selected = candidate.id === id ? 'true' : 'false';
    await expect(row(page, candidate.id)).toHaveAttribute('data-selected', selected);
    await expect(inspect(page, candidate.id)).toHaveAttribute('aria-pressed', selected);
    await expect(panel(page).locator('[data-interior-topic="' + candidate.id + '"]')).toHaveAttribute('aria-pressed', selected);
  }
}
async function inspectWithKeyboard(page: Page, id: string, key: 'Enter' | 'Space' = 'Enter') {
  const item = topics.find(item => item.id === id)!;
  await expect(inspect(page, id)).toHaveText('Inspect in hive');
  await expect(inspect(page, id)).toHaveAccessibleName('Inspect ' + item.label + ' inside the hive');
  await expect(inspect(page, id)).toHaveAttribute('aria-controls', 'beehive-interior-detail');
  await inspect(page, id).focus(); await page.keyboard.press(key);
  await expect(detail(page).locator('#beehive-interior-detail-title')).toBeFocused();
  await expect(detail(page).locator('#beehive-interior-detail-title')).toHaveAttribute('tabindex', '-1');
  await assertSelected(page, id);
  await expect(panel(page).locator('[data-interior-role][aria-pressed="true"]')).toHaveCount(0);
}

test('hive reading scales use exact independent paired arithmetic with honest zeros rounding and unavailable readings', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await open(page); const initial = await work(page); await hold(page); expect(await work(page)).toEqual(initial);
  await fixture(page, { honey: 20, pollen: 24, brood: 3000, queenHealth: 75 });
  const changed = await work(page);
  await expect(comparison(page).locator('[data-interior-reading-scale]')).toHaveCount(4);
  await assertPair(page, 'food', 40, 20); await assertPair(page, 'pollen', 12, 24);
  await assertPair(page, 'brood', 6000, 3000); await assertPair(page, 'queen', 90, 75);
  await expect(comparison(page).locator('[data-interior-scale-guide]')).toContainText('compare the two bars in one row');
  for (const index of [5, 0, 3]) {
    await panel(page).locator('[data-interior-frame="' + index + '"]').click();
    for (const hook of ['data-interior-held-diagram', 'data-hive-interior-diagram'])
      await expect(panel(page).locator('[' + hook + ']')).toHaveAccessibleName(new RegExp('Frame ' + (index + 1) + ' of 6'));
    await assertPair(page, 'food', 40, 20); await assertPair(page, 'pollen', 12, 24);
    await assertPair(page, 'brood', 6000, 3000); await assertPair(page, 'queen', 90, 75);
  }
  expect(await work(page)).toEqual({ ...changed, beehive: { ...changed.beehive, hive3dFrame: 3, hive3dFramesSeen: [5, 0, 3] } });
  await fixture(page, { honey: 0, pollen: 0, brood: 0, queenHealth: 0 }); await hold(page);
  for (const item of topics) await assertPair(page, item.id, 0, 0);
  await fixture(page, { honey: 0.00049, pollen: 0.501, brood: 123.45649, queenHealth: 50.55549 }); await hold(page);
  await fixture(page, { honey: 0.000499, pollen: 0.5005, brood: 123.456499, queenHealth: 50.555499 });
  await assertPair(page, 'food', 0.00049, 0.000499); await assertPair(page, 'pollen', 0.501, 0.5005);
  await assertPair(page, 'brood', 123.45649, 123.456499); await assertPair(page, 'queen', 50.55549, 50.555499);
  await fixture(page, { pollen: null }); await hold(page); await assertUnavailable(page, 'pollen');
  await fixture(page, { pollen: 3, queenHealth: null }); await assertUnavailable(page, 'pollen'); await assertUnavailable(page, 'queen');
  await expect(row(page, 'pollen').locator('[data-change-held]')).toHaveText('Not recorded');
  await expect(row(page, 'queen').locator('[data-change-current]')).toHaveText('Not recorded');
  const beforeIdentity = await work(page); await fixture(page, { modelVersion: beforeIdentity.beehive.modelVersion + '-changed' });
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText('different run, seed or model');
  await expect(comparison(page).locator('[data-reading-bar]')).toHaveCount(0);
  await fixture(page, { modelVersion: beforeIdentity.beehive.modelVersion }); await expect(comparison(page).locator('[data-reading-bar]')).toHaveCount(0);
  expect((await work(page)).beehive.notebook).toEqual(initial.beehive.notebook);
  expect((await work(page)).beehive.actionPoints).toBe(initial.beehive.actionPoints);
  expect((await work(page)).beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

test('hive reading scales connect keyboard inspection to actual feeding and later days while preserving held evidence and notebook writing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await open(page); await hold(page); const initial = await work(page);
  for (const [index, item] of topics.entries()) {
    await inspectWithKeyboard(page, item.id, index % 2 ? 'Space' : 'Enter'); expect(await work(page)).toEqual(initial);
  }
  await inspectWithKeyboard(page, 'queen', 'Enter'); await inspectWithKeyboard(page, 'queen', 'Space');
  await panel(page).locator('[data-interior-role="honey"]').click();
  await expect(panel(page).locator('[data-interior-role="honey"]')).toHaveAttribute('aria-pressed', 'true');
  await inspectWithKeyboard(page, 'queen', 'Space');
  await expect(detail(page)).toContainText(/not her location|not.*queen.*location/i);
  expect(await work(page)).toEqual(initial); expect((await work(page)).beehive.hive3dFoundQueen).toBe(false);
  await panel(page).locator('[data-interior-topic="food"]').focus(); await page.keyboard.press('Enter');
  await assertSelected(page, 'food'); expect(await work(page)).toEqual(initial);
  const heldCells = await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')));
  await panel(page).locator('[data-interior-management]').click(); await expect(page.locator('[data-management-preview-choice]')).toBeFocused();
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees');
  await page.locator('[data-management-preview-locate]').click(); await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused();
  expect(await work(page)).toEqual(initial); await page.keyboard.press('Enter');
  // Finish the transient feeding animation before comparing complete saved states.
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.beehive.bkAnim), { timeout: 15000 }).toBeNull();
  const fed = await work(page); expect(fed.beehive.honey).toBe(45); expect(fed.beehive.syrup).toBe(10);
  expect(fed.beehive.actionPoints).toBe(initial.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(15);
  expect(fed.beehive.notebook).toEqual(initial.beehive.notebook); expect(fed.otherTool).toEqual(initial.otherTool);
  expect(fed.beehive.managementTrail.length).toBe((initial.beehive.managementTrail || []).length + 1);
  await page.locator('[data-management-return-interior]').click(); await assertPair(page, 'food', 40, 45);
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText('Same modeled day');
  expect(await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')))).toEqual(heldCells);
  await page.locator('#beehive-next-day').click(); const later = await work(page); expect(later.beehive.day).toBe(16);
  for (const item of topics) await assertPair(page, item.id, initial.beehive[item.key], later.beehive[item.key]);
  await expect(comparison(page).locator('[data-interior-comparison-status]')).toContainText('1 modeled day elapsed');
  expect(await panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-held-cell')))).toEqual(heldCells);
  for (const item of topics) await inspectWithKeyboard(page, item.id, 'Space');
  expect(await work(page)).toEqual(later); expect(later.beehive.notebook).toEqual(initial.beehive.notebook);
  expect(later.otherTool).toEqual(initial.otherTool); expect(later.beehive.hive3dFoundQueen).toBe(false); expect(errors).toEqual([]);
});

async function auditReadings(page: Page) {
  for (const scope of [comparison(page), detail(page)]) {
    const violations = await scope.evaluate(async node => {
      const audit = await (window as any).axe.run(node, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
      });
      return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) }));
    });
    expect(violations).toEqual([]);
    const layout = await scope.evaluate(node => {
      const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const elements = [node, ...Array.from(node.querySelectorAll('div,p,h4,dt,dd,strong,span,button,label,summary,pre'))];
      return {
        overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
        text: elements.filter(el => el !== node && !['DIV'].includes(el.tagName)).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow, whiteSpace: getComputedStyle(el).whiteSpace })),
        controls: Array.from(node.querySelectorAll('button,summary')).filter(el => el.getClientRects().length > 0).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); expect(item.whiteSpace).not.toBe('nowrap'); }
    for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  }
  for (const item of topics) {
    await inspect(page, item.id).focus(); await expect(inspect(page, item.id)).toBeFocused();
    const focus = await inspect(page, item.id).evaluate(node => {
      const css = getComputedStyle(node); return { style: css.outlineStyle, width: parseFloat(css.outlineWidth) };
    });
    expect(focus.style).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(2);
  }
  for (const item of topics) {
    const heldFill = row(page, item.id).locator('[data-reading-bar="held"] [data-reading-bar-fill]');
    const currentFill = row(page, item.id).locator('[data-reading-bar="current"] [data-reading-bar-fill]');
    const heldDash = await heldFill.evaluate(node => getComputedStyle(node).strokeDasharray);
    const currentDash = await currentFill.evaluate(node => getComputedStyle(node).strokeDasharray);
    expect(heldDash).not.toBe('none'); expect(currentDash).toBe('none');
    for (const fill of [heldFill, currentFill]) {
      const visual = await fill.evaluate(node => {
        const css = getComputedStyle(node); return { stroke: css.stroke, width: parseFloat(css.strokeWidth), cap: css.strokeLinecap };
      });
      expect(visual.stroke).not.toBe('none'); expect(visual.stroke).not.toBe('rgba(0, 0, 0, 0)'); expect(visual.width).toBeGreaterThan(0); expect(visual.cap).toBe('butt');
    }
  }
}
async function captureReadings(page: Page, mode: string) {
  await comparison(page).screenshot({ path: artifacts + '/preview-readings-' + mode + '.png', animations: 'disabled', timeout: 120000 });
  await detail(page).screenshot({ path: artifacts + '/preview-reading-topic-' + mode + '.png', animations: 'disabled', timeout: 120000 });
}

test('hive reading scales stay clear in wide phone dark forced colors and enlarged text with exact values and keyboard inspection', async ({ page }) => {
  await mount(page); await open(page); await hold(page);
  await fixture(page, { honey: 45, pollen: 9.875, brood: 5700, queenHealth: 86.25 });
  await inspectWithKeyboard(page, 'food'); const unchanged = await work(page);
  const values = await comparison(page).locator('[data-change-held],[data-change-current],[data-change-difference]').allTextContents();
  await auditReadings(page); await captureReadings(page, 'wide');
  await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 });
  await auditReadings(page); await captureReadings(page, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await auditReadings(page); await captureReadings(page, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await auditReadings(page); await captureReadings(page, 'forced');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await auditReadings(page); await captureReadings(page, 'large');
  expect(await comparison(page).locator('[data-change-held],[data-change-current],[data-change-difference]').allTextContents()).toEqual(values);
  for (const item of topics) await inspectWithKeyboard(page, item.id, 'Space');
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});

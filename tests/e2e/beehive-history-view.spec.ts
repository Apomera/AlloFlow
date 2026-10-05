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

// Deliberate gaps, a missing measurement, real zeros, and values beyond the old
// chart's food/worker caps distinguish recorded evidence from interpolated data.
const recordedHistory = [
  { d: 1, w: 18000, h: 65, v: 0, m: 82 },
  { d: 2, w: 19000, h: 86, v: 4, m: 80 },
  { d: 4, w: 22000, h: 140, v: 8, m: 76 },
  { d: 5, w: 23000, h: 190, m: 74 },
  { d: 40, w: 39000, h: 360, v: 0, m: 0 },
  { d: 41, w: 47000, h: 420, v: 12, m: 35 },
  { d: 42, w: 55000, h: 480, v: 18, m: 55 },
];

async function mount(page: Page, extra: any = {}) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ history, extra }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', tutorialDone: true, soundOn: false, motionPaused: true,
      beeView: 'lifecycle', day: 42, workers: 58000, honey: 500, syrup: 40, capacity: 800,
      morale: 80, varroaLevel: 20, actionPoints: 3, history, ...extra },
      otherTool: { retained: true, note: 'History navigation must preserve unrelated data.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.__historyClipboard = '';
    w.StemLab.writeClipboard = (text: string) => { w.__historyClipboard = text; return Promise.resolve(); };
  }, { history: recordedHistory, extra });
  await expect(page.locator('[data-colony-history]')).toBeVisible();
}

async function savedState(page: Page) {
  return page.evaluate(() => JSON.stringify((window as any).__toolData));
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-colony-history]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id,
      nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const dimensions = await page.locator('[data-colony-history]').evaluate(node => ({
    width: node.clientWidth, content: node.scrollWidth,
  }));
  expect(dimensions.content, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 1);
}

async function openReadings(page: Page) {
  const summary = page.locator('[data-history-table] > summary');
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-history-table]')).toHaveAttribute('open', '');
}

// Parse CSV rather than assuming headers or cells are unquoted.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if (char === '\n' && !quoted) { row.push(field); rows.push(row); row = []; field = ''; }
    else if (char !== '\r' || quoted) field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(record => record.some(cell => cell !== ''));
}

test('metric, window, keyboard reading and CSV controls preserve exact recorded evidence without spending actions', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const initial = await savedState(page);
  const metric = page.locator('[data-history-metric]');
  const reading = page.locator('[data-history-reading]');
  const selected = page.locator('[data-history-selected]');
  await expect(metric).toHaveValue('workers');
  expect(await metric.locator('option').evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value))).toEqual(['workers', 'food', 'mites', 'stability']);
  await expect(page.locator('[data-history-window="30"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-history-row]')).toHaveCount(3);
  await expect(selected).toContainText('Day 42');
  await expect(selected).toContainText(/55,?000\s+workers/);
  await expect(reading).toHaveAttribute('min', '0');
  await expect(reading).toHaveAttribute('max', '2');
  await expect(reading).toHaveAttribute('step', '1');
  await expect(reading).toHaveValue('2');
  const workerHeights = await page.locator('[data-history-point]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('y1'))));
  expect(workerHeights[2]).toBeLessThan(workerHeights[1]);

  await metric.selectOption('food');
  await expect(selected).toContainText(/480\s+lb/);
  const foodPoints = await page.locator('[data-history-point]').evaluateAll(nodes => nodes.map(node => ({
    day: Number(node.getAttribute('data-day')), value: Number(node.getAttribute('data-value')),
    x: Number(node.getAttribute('x1')), y: Number(node.getAttribute('y1')),
  })));
  expect(foodPoints.map(point => point.value)).toEqual([360, 420, 480]);
  expect(foodPoints[2].y).toBeLessThan(foodPoints[1].y);
  const chartBounds = await page.locator('[data-history-chart]').evaluate(node => {
    const box = (node as SVGSVGElement).viewBox.baseVal;
    return { width: box.width, height: box.height };
  });
  expect(foodPoints.every(point => point.x >= 0 && point.x <= chartBounds.width && point.y >= 0 && point.y <= chartBounds.height)).toBe(true);
  await reading.focus(); await page.keyboard.press('Home');
  await expect(selected).toContainText('Day 40');
  await expect(selected).toContainText(/360\s+lb/);
  await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft');
  await expect(reading).toHaveValue('1');
  await expect(selected).toContainText('Day 41');
  await expect(selected).toContainText(/420\s+lb/);
  await expect(reading).toHaveAttribute('aria-valuetext', /Day 41.*420/);
  await page.locator('[data-history-copy]').focus(); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__historyClipboard)).not.toBe('');
  let csv = parseCSV(await page.evaluate(() => (window as any).__historyClipboard));
  expect(csv[0].join(' ')).toMatch(/Day.*Workers.*Combined food.*Mite pressure.*Colony stability/);
  expect(csv.slice(1).map(row => row.map(Number))).toEqual([
    [40, 39000, 360, 0, 0], [41, 47000, 420, 12, 35], [42, 55000, 480, 18, 55],
  ]);

  await page.locator('[data-history-window="7"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-history-window="7"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-history-window="30"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-history-row]')).toHaveCount(3);
  await page.locator('[data-history-window="all"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-history-window="all"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-history-row]')).toHaveCount(7);
  await expect(page.locator('[data-history-segment]')).toHaveCount(3);
  expect(await page.locator('[data-history-segment]').evaluateAll(nodes => nodes.map(node => (node.getAttribute('d')!.match(/[ML]/g) || []).length))).toEqual([2, 2, 3]);
  const x = await page.locator('[data-history-point]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.getAttribute('data-day')!, Number(node.getAttribute('x1'))])));
  expect(x['4'] - x['2']).toBeCloseTo(2 * (x['2'] - x['1']), 5);
  await metric.selectOption('mites');
  await expect(page.locator('[data-history-point]')).toHaveCount(6);
  await expect(page.locator('[data-history-point][data-day="5"]')).toHaveCount(0);
  await expect(page.locator('[data-history-point][data-day="1"]')).toHaveAttribute('data-value', '0');
  await expect(page.locator('[data-history-segment]')).toHaveCount(2);
  expect(await page.locator('[data-history-segment]').evaluateAll(nodes => nodes.map(node => (node.getAttribute('d')!.match(/[ML]/g) || []).length))).toEqual([2, 3]);
  await expect(page.locator('[data-history-gap-note]')).toContainText('35 unrecorded days');
  await expect(page.locator('[data-history-gap-note]')).toContainText('1 recorded day missing this metric');
  await openReadings(page);
  await expect(page.locator('[data-history-row="5"]').locator('th, td').nth(3)).toHaveText('Unavailable');
  await expect(page.locator('[data-history-row="1"]').locator('th, td').nth(3)).toHaveText('0');
  await page.locator('[data-history-copy]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__historyClipboard.split('\n').length)).toBeGreaterThanOrEqual(8);
  csv = parseCSV(await page.evaluate(() => (window as any).__historyClipboard));
  expect(csv.slice(1).map(row => Number(row[0]))).toEqual([1, 2, 4, 5, 40, 41, 42]);
  expect(csv.find(row => row[0] === '5')![3]).toBe('');
  expect(csv.find(row => row[0] === '1')![3]).toBe('0');
  await metric.selectOption('stability');
  await reading.focus(); await page.keyboard.press('Home');
  await expect(selected).toContainText('Day 1');
  await expect(selected).toContainText('82 points');
  await page.keyboard.press('End');
  await expect(selected).toContainText('Day 42');
  await expect(selected).toContainText('55 points');
  await expect(page.locator('[data-history-point][data-day="40"]')).toHaveAttribute('data-value', '0');
  expect(await savedState(page)).toBe(initial);
  expect(errors).toEqual([]);
});

test('empty and single-checkpoint history stay honest and react to incoming saved readings', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { day: 0, history: [] });
  const initial = await savedState(page);
  await expect(page.locator('[data-colony-history]')).toContainText('Advance Next Day to record');
  await expect(page.locator('[data-history-chart]')).toHaveCount(0);
  await expect(page.locator('[data-history-selected]')).toHaveCount(0);
  await page.locator('[data-history-metric]').selectOption('mites');
  expect(await savedState(page)).toBe(initial);
  await accessible(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__ctx.setToolData((prev: any) => ({ ...prev, beehive: { ...prev.beehive, day: 1,
      history: [{ d: 1, w: 12000, h: 125, v: 0, m: 0 }] } }));
  });
  await expect(page.locator('[data-history-metric]')).toHaveValue('mites');
  await expect(page.locator('[data-history-selected]')).toContainText('Day 1');
  await expect(page.locator('[data-history-selected]')).toContainText('0 points');
  await expect(page.locator('[data-history-selected]')).toContainText('Window changeUnavailable');
  await expect(page.locator('[data-colony-history]')).toContainText('two different endpoint days');
  await expect(page.locator('[data-history-reading]')).toBeDisabled();
  await expect(page.locator('[data-history-point]')).toHaveCount(1);
  await expect(page.locator('[data-history-point]')).toHaveAttribute('data-value', '0');
  await expect(page.locator('[data-history-segment]')).toHaveCount(0);
  const single = await savedState(page);
  await page.locator('[data-history-metric]').selectOption('food');
  await expect(page.locator('[data-history-selected]')).toContainText('125 lb');
  expect(await savedState(page)).toBe(single);
  await accessible(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__ctx.setToolData((prev: any) => ({ ...prev, beehive: { ...prev.beehive, day: 2,
      history: prev.beehive.history.concat([{ d: 2, w: 14000, h: 130, v: 5, m: 2 }]) } }));
  });
  await expect(page.locator('[data-history-metric]')).toHaveValue('food');
  await expect(page.locator('[data-history-reading]')).toBeEnabled();
  await expect(page.locator('[data-history-row]')).toHaveCount(2);
  await expect(page.locator('[data-history-segment]')).toHaveCount(1);
  const updated = await savedState(page);
  await page.locator('[data-history-reading]').focus(); await page.keyboard.press('End');
  await expect(page.locator('[data-history-selected]')).toContainText('Day 2');
  await expect(page.locator('[data-history-selected]')).toContainText('130 lb');
  await expect(page.locator('[data-history-selected]')).toContainText('Increased 5 lb');
  await page.evaluate(() => {
    (window as any).StemLab.writeClipboard = () => Promise.reject(new Error('Clipboard rejected for fallback verification'));
  });
  await page.locator('[data-history-copy]').click();
  await expect(page.locator('[data-history-copy-status]')).toContainText('Clipboard unavailable');
  const fallback = page.locator('[data-colony-history]').getByRole('textbox', { name: 'Daily readings CSV' });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute('readonly', '');
  expect(parseCSV(await fallback.inputValue()).slice(1).map(row => row.map(Number))).toEqual([
    [1, 12000, 125, 0, 0], [2, 14000, 130, 5, 2],
  ]);
  await fallback.focus();
  expect(await fallback.evaluate(node => ({ start: (node as HTMLTextAreaElement).selectionStart,
    end: (node as HTMLTextAreaElement).selectionEnd, length: (node as HTMLTextAreaElement).value.length })))
    .toEqual({ start: 0, end: (await fallback.inputValue()).length, length: (await fallback.inputValue()).length });
  await expect(page.locator('[data-beehive-focus-panel="report"]')).toHaveCount(0);
  expect(await savedState(page)).toBe(updated);
  expect(errors).toEqual([]);
});

test('history fits a narrow desktop panel and remains accessible in light, dark, large text and forced colors', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; });
  const history = page.locator('[data-colony-history]');
  const initial = await savedState(page);
  await page.locator('[data-history-metric]').selectOption('food');
  await openReadings(page);
  expect(await history.evaluate(node => node.clientWidth)).toBeGreaterThan(240);
  const targets = await history.locator('[data-history-metric], [data-history-window]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(targets.every(height => height >= 44)).toBe(true);
  const tableRegion = page.locator('[data-history-table] [role="region"]');
  await tableRegion.focus(); await expect(tableRegion).toBeFocused();
  await accessible(page);
  await history.screenshot({ path: testInfo.outputPath('colony-history-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await accessible(page);
  await history.screenshot({ path: testInfo.outputPath('colony-history-dark.png') });
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await accessible(page);
  await page.emulateMedia({ forcedColors: 'active' });
  const reading = page.locator('[data-history-reading]');
  await reading.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(reading).toBeFocused();
  await expect(page.locator('[data-history-selected]')).toContainText('Day 41');
  expect(await reading.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
  expect(await history.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.locator('[data-history-window="all"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-history-window="all"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-history-row]')).toHaveCount(7);
  expect(await history.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await savedState(page)).toBe(initial);
  expect(errors).toEqual([]);
});

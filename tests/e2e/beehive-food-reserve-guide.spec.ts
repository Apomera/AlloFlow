import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_RESERVE_ARTIFACTS || '.codex-artifacts/bee-food-reserve-guide-2026-10-14');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });
const guide = (page: Page) => page.locator('[data-colony-reserve-guide]');
const summary = (page: Page) => guide(page).locator('summary');
const card = (page: Page, id: string) => guide(page).locator('[data-reserve-reading="' + id + '"]');
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__reserveAwards); }
async function patch(page: Page, value: Record<string, unknown>) { await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value); }
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__reserveWrites = []; }); }
async function unchanged(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__reserveWrites)).toEqual([]);
}
async function activate(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter') { await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press(key); }
async function openGuide(page: Page) {
  if (!(await guide(page).evaluate(node => (node as HTMLDetailsElement).open))) await activate(page, summary(page));
  await expect(guide(page)).toHaveAttribute('open', '');
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Reserve guide test uses the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 3, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      notebookOpen: false, missionBriefOpen: false, journeyOpen: false, day: 60,
      workers: 24000, queenHealth: 80, varroaLevel: 4, morale: 85, honey: 90, syrup: 40,
      pollen: 12, brood: 6000, capacity: 120, diseaseRisk: 0, actionPoints: 3, activeEvent: null, colonySurvived: true,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 }, honey_harvest: { earned: true, day: 30 } },
      journal: [{ day: 59, text: 'Keep my recorded observation.' }],
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.', explanation: 'Keep my reasoning.', custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: true } }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: true } },
      custom: { retained: 'Saved colony metadata.' },
    }, otherTool: { retained: 'Other saved tool work.' } }));
    w.__reserveAwards = []; w.__reserveWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__reserveAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name]; w.__ctx[name] = function(...args: any[]) { w.__reserveWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(guide(page)).toBeVisible();
}
const round = (value: number) => (Math.round(value * 10) / 10).toLocaleString('en-US');
async function verify(page: Page, honey: number, syrup: number, day = 60) {
  const season = Math.floor(day % 120 / 30), reserve = [18, 25, 60, 45][season];
  const why = ['the spring buildup', 'the dearth before goldenrod', 'overwintering', 'the rest of winter'][season];
  const nectar = honey - Math.max(0, Math.min(syrup, honey)), scale = Math.max(honey, reserve, 1);
  const readings = page.locator('[data-colony-food-origins] > dl > div');
  const expectedCards = [['Combined food', honey], ['Nectar honey', nectar], ['Fed syrup', Math.max(0, Math.min(syrup, honey))], ['Seasonal reserve', reserve]] as const;
  await expect(readings).toHaveCount(4);
  for (let index = 0; index < expectedCards.length; index++) {
    await expect(readings.nth(index).locator('dt')).toHaveText(expectedCards[index][0]);
    await expect(readings.nth(index).locator('dd')).toHaveText(round(expectedCards[index][1]) + ' lb');
  }
  expect(await guide(page).evaluate(node => node.tagName)).toBe('DETAILS');
  await expect(summary(page)).toHaveText('Compare food with the reserve'); await expect(guide(page).locator('li[data-reserve-reading]')).toHaveCount(2);
  await expect(guide(page).locator('[data-reserve-guide-scale]')).toHaveText('Both bars use the same scale. The dashed line marks the ' + reserve + ' lb reserve for ' + why + '.');
  for (const [id, name, value, origin, meterName] of [
    ['combined', 'Food available to the colony', honey, 'Includes fed syrup.', 'Combined food compared with seasonal reserve'],
    ['nectar', 'Nectar honey for harvesting', nectar, 'Excludes fed syrup.', 'Nectar honey compared with seasonal reserve'],
  ] as const) {
    const item = card(page, id), meter = item.locator('[data-reserve-meter="' + id + '"]');
    const state = value < reserve ? 'below' : value > reserve ? 'above' : 'at';
    await expect(item).toContainText(name); await expect(item).toHaveAttribute('data-reserve-state', state);
    await expect(item.locator('[data-reserve-current]')).toHaveText('About ' + round(value) + ' lb');
    await expect(item.locator('[data-reserve-origin]')).toHaveText(origin);
    await expect(item.locator('[data-reserve-status]')).toHaveText(state.charAt(0).toUpperCase() + state.slice(1) + ' the reserve');
    await expect(meter).toHaveAttribute('role', 'meter'); await expect(meter).toHaveAccessibleName(meterName);
    await expect(meter).toHaveAttribute('aria-valuemin', '0'); expect(Number(await meter.getAttribute('aria-valuemax'))).toBe(scale);
    expect(Number(await meter.getAttribute('aria-valuenow'))).toBeCloseTo(value, 10);
    const geometry = await meter.evaluate(node => {
      const box = node.getBoundingClientRect(), css = getComputedStyle(node), fill = node.querySelector('[data-reserve-fill]')!, marker = node.querySelector('[data-reserve-marker]')!;
      const fillBox = fill.getBoundingClientRect(), markerBox = marker.getBoundingClientRect(), markerCss = getComputedStyle(marker);
      const available = box.width - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth) - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      return { available, fill: fillBox.width, fillLeft: fillBox.left - box.left, fillRight: fillBox.right - box.right,
        markerPercent: parseFloat((marker as HTMLElement).style.left), markerCenter: markerBox.left + markerBox.width / 2 - box.left - parseFloat(css.borderLeftWidth),
        dash: markerCss.borderLeftStyle, border: parseFloat(markerCss.borderLeftWidth), width: markerBox.width };
    });
    expect(geometry.available).toBeGreaterThan(0); expect(geometry.fill).toBeCloseTo(geometry.available * value / scale, 0);
    expect(geometry.fillLeft).toBeGreaterThanOrEqual(-1); expect(geometry.fillRight).toBeLessThanOrEqual(1);
    expect(geometry.markerPercent).toBeCloseTo(reserve / scale * 100, 3); expect(geometry.markerCenter).toBeCloseTo(geometry.available * reserve / scale, 0);
    expect(geometry.dash).toBe('dashed'); expect(geometry.border).toBeGreaterThanOrEqual(2); expect(geometry.width).toBeGreaterThanOrEqual(6);
  }
  await expect(guide(page).locator('[data-reserve-guide-rounding]')).toHaveText('Readings are rounded to one decimal place. Bars and reserve comparisons use full readings. Use the harvestable surplus below for the amount available to harvest.');
  await expect(guide(page)).toContainText('A reserve comparison is one part of colony care. Check daily food use and colony condition too.');
}

test('reserve comparisons separate fed syrup from harvestable honey through thresholds, seasons and real management without disclosure writes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const original = await work(page);
  for (const focusLayout of [true, false]) {
    await patch(page, { focusLayout });
    if (await guide(page).evaluate(node => (node as HTMLDetailsElement).open)) await activate(page, summary(page));
    const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await expect(card(page, 'combined')).not.toBeVisible(); await activate(page, summary(page), 'Space');
    await expect(summary(page)).toBeFocused(); await verify(page, 90, 40); await unchanged(page, before, beforeAwards);
    await page.keyboard.press('Enter'); expect(await guide(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(false);
    await expect(summary(page)).toBeFocused(); await unchanged(page, before, beforeAwards);
    await page.keyboard.press('Space'); await verify(page, 90, 40); await unchanged(page, before, beforeAwards);
  }
  for (const day of [15, 45, 60, 90]) {
    await patch(page, { day }); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await verify(page, 90, 40, day); await unchanged(page, before, beforeAwards);
  }
  for (const [honey, syrup, actionPoints] of [[0, 0, 3], [90, 90, 3], [90, 0, 3], [90, 120, 3], [90, -5, 3], [1000000, 40, 3], [60, 0, 3], [100, 40, 3], [105.14, 40.16, 3], [59.99, 0, 3], [60.01, 0, 3], [99.99, 40, 3], [100.01, 40, 3], [105, 40, 0]]) {
    await patch(page, { day: 60, honey, syrup, actionPoints }); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await verify(page, honey, syrup); await unchanged(page, before, beforeAwards);
    if (actionPoints === 0) {
      await expect(page.locator('[data-management-choice="harvest_honey"]')).toBeDisabled();
      await expect(page.locator('[data-colony-harvest-balance]')).toContainText('Need 1 action point');
    }
  }
  await patch(page, { day: 60, honey: 90, syrup: 40, actionPoints: 3, focusLayout: false });
  const beforeFeed = await work(page), feedAwards = await awards(page);
  await activate(page, page.locator('[data-management-choice="feed_bees"]'));
  const fed = await work(page); expect(fed.beehive.honey).toBe(95); expect(fed.beehive.syrup).toBe(45);
  expect(fed.beehive.actionPoints).toBe(beforeFeed.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(60);
  expect(await awards(page)).toEqual([...feedAwards, ['beehive', 3, 'Fed bees']]);
  await openGuide(page); await verify(page, 95, 45); await expect(card(page, 'nectar').locator('[data-reserve-current]')).toHaveText('About 50 lb');
  await patch(page, { honey: 105, syrup: 40, actionPoints: 3 }); const beforeHarvest = await work(page), harvestAwards = await awards(page);
  await activate(page, page.locator('[data-management-choice="harvest_honey"]'));
  const harvested = await work(page); expect(harvested.beehive.honey).toBe(100); expect(harvested.beehive.syrup).toBe(40);
  expect(harvested.beehive.actionPoints).toBe(beforeHarvest.beehive.actionPoints - 1); expect(harvested.beehive.day).toBe(60);
  expect(harvested.beehive.totalHarvested).toBe((beforeHarvest.beehive.totalHarvested || 0) + 5);
  expect(await awards(page)).toEqual([...harvestAwards, ['beehive', 15, 'Harvested Autumn Buckwheat']]);
  for (const state of [fed, harvested]) {
    for (const key of ['notebook', 'queen', 'drone', 'custom']) expect(state.beehive[key]).toEqual(original.beehive[key]);
    expect(state.otherTool).toEqual(original.otherTool);
  }
  await openGuide(page); const finalAwards = await awards(page); await resetWrites(page);
  await verify(page, 100, 40); await unchanged(page, harvested, finalAwards);
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await guide(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const box = node.getBoundingClientRect(), font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => { const rect = el.getBoundingClientRect(), css = getComputedStyle(el); return rect.width > 0 && rect.height > 0 && css.display !== 'none' && css.visibility !== 'hidden'; });
    const words: { word: string; bottoms: number[] }[] = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement; if (!parent) continue;
      const rect = parent.getBoundingClientRect(), css = getComputedStyle(parent);
      if (rect.width <= 0 || rect.height <= 0 || css.display === 'none' || css.visibility === 'hidden') continue;
      for (const match of (textNode.textContent || '').matchAll(/[^\s\-–]+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], bottoms: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => rect.bottom) });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent }] : []; }), words,
      text: Array.from(node.querySelectorAll('summary,[data-reserve-current],[data-reserve-origin],[data-reserve-status],[data-reserve-guide-scale],[data-reserve-guide-rounding]')).map(el => { const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, whiteSpace: css.whiteSpace, overflow: css.overflow, ellipsis: css.textOverflow }; }),
      summary: (() => { const el = node.querySelector('summary')!, rect = el.getBoundingClientRect(), css = getComputedStyle(el); return { width: rect.width, height: rect.height, outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) }; })(),
      meters: Array.from(node.querySelectorAll('[data-reserve-meter]')).map(el => { const css = getComputedStyle(el), fill = getComputedStyle(el.querySelector('[data-reserve-fill]')!), marker = getComputedStyle(el.querySelector('[data-reserve-marker]')!); return { paper: css.backgroundColor, fill: fill.backgroundColor, markerPaper: marker.backgroundColor, markerInk: marker.borderLeftColor, markerStyle: marker.borderLeftStyle, height: el.getBoundingClientRect().height }; }),
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'food-reserve-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.whiteSpace).not.toBe('nowrap'); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) { expect(item.bottoms.length, item.word).toBeGreaterThan(0); for (const bottom of item.bottoms) expect(Math.abs(bottom - item.bottoms[0]), item.word + ' must stay intact').toBeLessThanOrEqual(1); }
  expect(result.summary.width).toBeGreaterThanOrEqual(44); expect(result.summary.height).toBeGreaterThanOrEqual(44); expect(result.summary.outline).not.toBe('none'); expect(result.summary.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(result.meters).toHaveLength(2); for (const meter of result.meters) { expect(meter.height).toBeGreaterThanOrEqual(8); expect(meter.fill).not.toBe(meter.paper); expect(meter.markerInk).not.toBe(meter.markerPaper); expect(meter.markerStyle).toBe('dashed'); }
}
async function capture(page: Page, mode: string) {
  const region = guide(page), pad = 6;
  const position = await region.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(12); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await region.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = 'preview-food-reserve-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 }); tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-food-reserve-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}
test('food reserve comparisons retain readable scales and dashed thresholds in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page); await openGuide(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 }); await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await openGuide(page); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await summary(page).focus(); await page.keyboard.press('Tab'); await summary(page).focus();
    await verify(page, 90, 40); await audit(page, mode); await capture(page, mode); await unchanged(page, before, beforeAwards);
  }
  expect(errors).toEqual([]);
});

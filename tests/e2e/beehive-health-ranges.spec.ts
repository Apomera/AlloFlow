import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_HEALTH_RANGES_ARTIFACTS || '.codex-artifacts/bee-health-ranges-2026-10-14');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });
type Metric = 'varroa' | 'morale' | 'foraging' | 'disease';
const metrics: Metric[] = ['varroa', 'morale', 'foraging', 'disease'];
const keys: Record<Metric, string> = { varroa: 'varroaLevel', morale: 'morale', foraging: 'foragingEfficiency', disease: 'diseaseRisk' };
const initial: Record<Metric, number> = { varroa: 19.9, morale: 39.9, foraging: 70, disease: 45 };
const toggle = (page: Page, id: Metric) => page.locator('[data-colony-stat-toggle="' + id + '"]');
const region = (page: Page, id: Metric) => page.locator('[data-colony-stat-explanation="' + id + '"]');
const card = (page: Page, id: Metric) => toggle(page, id).locator('..');
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__rangeAwards); }
async function patch(page: Page, value: Record<string, unknown>) { await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value); }
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__rangeWrites = []; }); }
async function settle(page: Page) { await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); }); }
async function unchanged(page: Page, before: unknown, beforeAwards: unknown) {
  await settle(page); expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__rangeWrites)).toEqual([]);
}
async function activate(page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter') { await target.focus(); await expect(target).toBeFocused(); await page.keyboard.press(key); }
async function openMetric(page: Page, id: Metric, key: 'Enter' | 'Space' = 'Enter') {
  if (await toggle(page, id).getAttribute('aria-expanded') !== 'true') await activate(page, toggle(page, id), key);
  await expect(toggle(page, id)).toHaveAttribute('aria-expanded', 'true'); await expect(region(page, id)).toBeVisible();
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Health ranges test uses the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 3, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      notebookOpen: false, missionBriefOpen: false, journeyOpen: false, day: 10, statExpand: null,
      workers: 24000, queenHealth: 80, varroaLevel: 19.9, morale: 39.9, foragingEfficiency: 70, diseaseRisk: 45,
      honey: 90, syrup: 40, pollen: 12, brood: 6000, capacity: 120, actionPoints: 3, activeEvent: null, colonySurvived: true,
      experimentEnvironment: { schemaVersion: 1, gardenBonus: 30, trackedFromDay: 0 },
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 }, honey_harvest: { earned: true, day: 30 } },
      journal: [{ day: 9, text: 'Keep my recorded observation.' }],
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.', explanation: 'Keep my reasoning.', custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: true } }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: true } },
      custom: { retained: 'Saved colony metadata.' },
    }, otherTool: { retained: 'Other saved tool work.' } }));
    w.__rangeAwards = []; w.__rangeWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__rangeAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name]; w.__ctx[name] = function(...args: any[]) { w.__rangeWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  for (const id of metrics) await expect(toggle(page, id)).toBeVisible();
}
async function verify(page: Page, id: Metric, value: number, expectedBand: string) {
  const panel = region(page, id), button = toggle(page, id);
  await expect(button).toHaveAttribute('aria-controls', 'beehive-stat-explanation-' + id);
  await expect(panel).toHaveAttribute('role', 'region');
  await expect(panel.locator('[data-stat-current]')).toHaveCount(1);
  const reading = id === 'foraging' ? value + '% base efficiency' : value + ' / 100 ' + (id === 'morale' ? 'stability' : 'pressure') + ' points';
  await expect(panel.locator('[data-stat-reading]')).toHaveText(reading);
  const direction = id === 'foraging' ? 'Higher base efficiency' : id === 'morale' ? 'Higher stability' : 'Lower pressure';
  await expect(panel.locator('[data-stat-direction]')).toHaveText(direction + ' is the healthier direction on this model scale.');
  const bands = panel.locator('.bee-colony-bands > div'); await expect(bands).toHaveCount(3);
  await expect(panel.locator('[data-stat-current-band="true"]')).toHaveCount(1);
  await expect(panel.locator('[data-stat-current-band="false"]')).toHaveCount(2);
  await expect(panel.locator('[data-stat-current-label]')).toHaveCount(1);
  await expect(panel.locator('[data-stat-band="' + expectedBand + '"]')).toHaveAttribute('data-stat-current-band', 'true');
  await expect(panel.locator('[data-stat-band="' + expectedBand + '"] [data-stat-current-label]')).toHaveText('Current range');
  const thresholdText = id === 'varroa' ? ['Below 10 points', '10 to below 20 points', '20+ points'] : id === 'disease' ? ['Below 25 points', '25–45 points', 'Above 45 points'] : id === 'foraging' ? ['70–100%', '40 to below 70%', 'Below 40%'] : ['70–100 points', '40 to below 70 points', 'Below 40 points'];
  for (let index = 0; index < 3; index++) {
    await expect(bands.nth(index)).toHaveAttribute('data-stat-band', ['healthy', 'watch', 'danger'][index]);
    await expect(bands.nth(index)).toContainText(thresholdText[index]);
  }
  await expect(panel.locator('[data-stat-bonus-note]')).toHaveCount(id === 'foraging' ? 1 : 0);
  if (id === 'foraging') await expect(panel.locator('[data-stat-bonus-note]')).toHaveText('The bar includes the garden bonus and stops at 100%. These ranges use base efficiency only.');
}
async function onlyDisclosureChanged(page: Page, before: any, beforeAwards: unknown, expanded: Metric | null) {
  await settle(page);
  expect(await work(page)).toEqual({ ...before, beehive: { ...before.beehive, statExpand: expanded } });
  expect(await awards(page)).toEqual(beforeAwards);
}
async function verifyForageBar(page: Page, base: number, bonus: number) {
  const button = toggle(page, 'foraging');
  await expect(button).toContainText(base + '%' + (bonus > 0 ? ' (+' + bonus + '% garden)' : ''));
  const geometry = await button.locator(':scope > div[aria-hidden="true"] > div').evaluate(fill => {
    const fillBox = fill.getBoundingClientRect(), parent = fill.parentElement!, box = parent.getBoundingClientRect(), css = getComputedStyle(parent);
    return { percent: parseFloat((fill as HTMLElement).style.width), width: fillBox.width,
      available: box.width - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth) - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) };
  });
  expect(geometry.percent).toBeCloseTo(Math.min(100, base + bonus), 8);
  expect(geometry.width).toBeCloseTo(geometry.available * Math.min(100, base + bonus) / 100, 0);
}

test('health range highlights follow exact boundaries and base forage while keyboard disclosures preserve all other saved work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const original = await work(page);
  for (const focusLayout of [true, false]) {
    await patch(page, { focusLayout, statExpand: null });
    for (const id of metrics) {
      const before = await work(page), beforeAwards = await awards(page);
      await activate(page, toggle(page, id), 'Enter'); await expect(toggle(page, id)).toBeFocused();
      await verify(page, id, initial[id], id === 'morale' ? 'danger' : id === 'foraging' ? 'healthy' : 'watch');
      for (const other of metrics.filter(metric => metric !== id)) await expect(region(page, other)).not.toBeVisible();
      await onlyDisclosureChanged(page, before, beforeAwards, id);
      await page.keyboard.press('Space'); await expect(toggle(page, id)).toBeFocused();
      await expect(toggle(page, id)).toHaveAttribute('aria-expanded', 'false'); await expect(region(page, id)).not.toBeVisible();
      await onlyDisclosureChanged(page, before, beforeAwards, null);
    }
  }
  const cases: Record<Metric, [number, string][]> = {
    varroa: [[0, 'healthy'], [9.99, 'healthy'], [10, 'watch'], [19.99, 'watch'], [20, 'danger'], [100, 'danger']],
    morale: [[0, 'danger'], [39.99, 'danger'], [40, 'watch'], [69.99, 'watch'], [70, 'healthy'], [100, 'healthy']],
    foraging: [[0, 'danger'], [39.99, 'danger'], [40, 'watch'], [69.99, 'watch'], [70, 'healthy'], [100, 'healthy']],
    disease: [[0, 'healthy'], [24.99, 'healthy'], [25, 'watch'], [45, 'watch'], [45.01, 'danger'], [100, 'danger']],
  };
  for (const id of metrics) {
    await openMetric(page, id, 'Space');
    for (const [value, band] of cases[id]) {
      await patch(page, { [keys[id]]: value });
      const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
      await verify(page, id, value, band); await unchanged(page, before, beforeAwards);
    }
  }
  await openMetric(page, 'foraging');
  for (const [base, band] of [[39.99, 'danger'], [69.99, 'watch'], [85, 'healthy']] as const) {
    for (const bonus of [0, 30]) {
      await patch(page, { foragingEfficiency: base, experimentEnvironment: { schemaVersion: 1, gardenBonus: bonus, trackedFromDay: 0 } });
      const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
      await verify(page, 'foraging', base, band); await verifyForageBar(page, base, bonus); await unchanged(page, before, beforeAwards);
    }
  }
  const finalState = await work(page);
  for (const key of ['notebook', 'queen', 'drone', 'custom', 'journal', 'actionPoints', 'workers', 'honey', 'day']) expect(finalState.beehive[key]).toEqual(original.beehive[key]);
  expect(finalState.otherTool).toEqual(original.otherTool); expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string, id: Metric) {
  const result = await card(page, id).evaluate(async node => {
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
      text: Array.from(node.querySelectorAll('[data-stat-reading],[data-stat-direction],[data-stat-bonus-note],[data-stat-current-label],.bee-colony-bands > div > div,.bee-colony-explainer > p')).map(el => { const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, whiteSpace: css.whiteSpace, overflow: css.overflow, ellipsis: css.textOverflow }; }),
      toggle: (() => { const el = node.querySelector('button')!, rect = el.getBoundingClientRect(), css = getComputedStyle(el); return { width: rect.width, height: rect.height, outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) }; })(),
      activeBand: (() => { const el = node.querySelector('[data-stat-current-band="true"]')!, css = getComputedStyle(el), label = el.querySelector('[data-stat-current-label]')!, rect = label.getBoundingClientRect(); return { border: Math.max(parseFloat(css.borderTopWidth), parseFloat(css.borderLeftWidth)), borderStyle: css.borderTopStyle, labelWidth: rect.width, labelHeight: rect.height }; })(),
      meter: (() => { const track = node.querySelector('button > div[aria-hidden="true"]')!, fill = track.querySelector(':scope > div')!, trackCss = getComputedStyle(track), fillCss = getComputedStyle(fill), box = fill.getBoundingClientRect(); return { paper: trackCss.backgroundColor, fill: fillCss.backgroundColor, border: trackCss.borderTopColor, borderWidth: parseFloat(trackCss.borderTopWidth), forced: fillCss.forcedColorAdjust, width: box.width, height: box.height }; })(),
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'health-ranges-layout-' + mode + '-' + id + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.text.length).toBeGreaterThanOrEqual(9);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.whiteSpace).not.toBe('nowrap'); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) { expect(item.bottoms.length, item.word).toBeGreaterThan(0); for (const bottom of item.bottoms) expect(Math.abs(bottom - item.bottoms[0]), item.word + ' must stay intact').toBeLessThanOrEqual(1); }
  expect(result.toggle.width).toBeGreaterThanOrEqual(44); expect(result.toggle.height).toBeGreaterThanOrEqual(44); expect(result.toggle.outline).not.toBe('none'); expect(result.toggle.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(result.activeBand.border).toBeGreaterThanOrEqual(3); expect(result.activeBand.borderStyle).toBe('solid'); expect(result.activeBand.labelWidth).toBeGreaterThan(0); expect(result.activeBand.labelHeight).toBeGreaterThan(0);
  if (mode === 'forced') { expect(result.meter.borderWidth).toBeGreaterThanOrEqual(1); expect(result.meter.border).not.toBe(result.meter.paper); expect(result.meter.fill).not.toBe(result.meter.paper); expect(result.meter.forced).toBe('none'); expect(result.meter.width).toBeGreaterThan(0); expect(result.meter.height).toBeGreaterThan(0); }
}
async function capture(page: Page, mode: string, id: Metric) {
  const target = card(page, id), pad = 6, prefix = 'preview-health-ranges-' + mode + '-' + id;
  const position = await target.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(12); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await target.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = prefix + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 }); tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, prefix + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}
test('current health ranges remain clear and readable for every metric in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 }); await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    for (const id of metrics) {
      await openMetric(page, id); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
      await toggle(page, id).focus(); await page.keyboard.press('Tab'); await toggle(page, id).focus();
      await verify(page, id, initial[id], id === 'morale' ? 'danger' : id === 'foraging' ? 'healthy' : 'watch');
      if (id === 'foraging') await verifyForageBar(page, 70, 30);
      await audit(page, mode, id); await capture(page, mode, id); await unchanged(page, before, beforeAwards);
    }
  }
  expect(errors).toEqual([]);
});

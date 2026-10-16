import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_POPULATION_ARTIFACTS || '.codex-artifacts/bee-population-clarity-2026-10-14');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });
const guide = (page: Page) => page.locator('[data-colony-population-guide]');
const queen = (page: Page) => guide(page).locator('[data-colony-queen-condition]');
const initial = { workers: 24000, brood: 6000, drones: 500, queenHealth: 82.5 };
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__populationAwards); }
async function patch(page: Page, value: Record<string, unknown>) { await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value); }
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__populationWrites = []; }); }
async function unchanged(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__populationWrites)).toEqual([]);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Population clarity test uses the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 3, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      notebookOpen: false, missionBriefOpen: false, journeyOpen: false, day: 10,
      workers: 24000, brood: 6000, drones: 500, queenHealth: 82.5, varroaLevel: 4, morale: 85,
      honey: 90, syrup: 40, pollen: 12, capacity: 120, diseaseRisk: 0, actionPoints: 3, activeEvent: null, colonySurvived: true,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 }, honey_harvest: { earned: true, day: 30 } },
      journal: [{ day: 9, text: 'Keep my recorded observation.' }],
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.', explanation: 'Keep my reasoning.', custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: true } }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: true } },
      custom: { retained: 'Saved colony metadata.' },
    }, otherTool: { retained: 'Other saved tool work.' } }));
    w.__populationAwards = []; w.__populationWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__populationAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name]; w.__ctx[name] = function(...args: any[]) { w.__populationWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(guide(page)).toBeVisible();
}
async function verify(page: Page, expected: typeof initial, day = 10) {
  await expect(guide(page).getByRole('heading', { name: 'Population and queen condition', exact: true })).toHaveCount(1);
  await expect(guide(page).locator('[data-population-scope]')).toHaveText('Whole-colony model readings for Day ' + day + '.');
  const cards = guide(page).locator('dl[data-colony-population] > div[data-population-reading]');
  await expect(cards).toHaveCount(3);
  const populations = [
    ['workers', 'Workers', 'adult workers', 'Includes workers doing jobs inside and outside the hive.'],
    ['brood', 'Developing brood', 'developing bees', 'All modeled brood; separate from the adult counts.'],
    ['drones', 'Drones', 'adult drones', 'Adult drones are separate from the worker count.'],
  ] as const;
  for (let index = 0; index < populations.length; index++) {
    const [id, label, unit, context] = populations[index], card = cards.nth(index);
    await expect(card).toHaveAttribute('data-population-reading', id);
    await expect(card.locator('dt')).toHaveText(label);
    await expect(card.locator('dd [data-population-value]')).toHaveText(expected[id].toLocaleString('en-US'));
    await expect(card.locator('dd [data-population-unit]')).toHaveText(unit);
    await expect(card.locator('[data-population-context]')).toHaveText(context);
  }
  await expect(guide(page).locator('dl[data-colony-population] [data-colony-queen-condition]')).toHaveCount(0);
  await expect(queen(page).locator('dl dt')).toHaveText('Queen condition');
  await expect(queen(page).locator('dl dd [data-queen-condition-value]')).toHaveText(expected.queenHealth + ' / 100');
  await expect(queen(page).locator('dl dd [data-queen-condition-unit]')).toHaveText('condition points');
  await expect(queen(page).locator('[data-queen-condition-basis]')).toHaveText('A model condition score, not a population count.');
  await expect(queen(page).locator('[data-queen-condition-direction]')).toHaveText('Higher values indicate better queen condition in this model.');
  const meter = queen(page).locator('[data-queen-condition-meter]');
  await expect(meter).toHaveAttribute('role', 'meter'); await expect(meter).toHaveAccessibleName('Queen condition model score');
  await expect(meter).toHaveAttribute('aria-valuemin', '0'); await expect(meter).toHaveAttribute('aria-valuemax', '100');
  expect(Number(await meter.getAttribute('aria-valuenow'))).toBe(expected.queenHealth);
  await expect(meter).toHaveAttribute('aria-valuetext', expected.queenHealth + ' of 100 condition points. Higher values indicate better modeled condition.');
  const geometry = await meter.evaluate(node => {
    const box = node.getBoundingClientRect(), css = getComputedStyle(node), fill = node.querySelector(':scope > span')!, fillBox = fill.getBoundingClientRect();
    return { percent: parseFloat((fill as HTMLElement).style.width), available: box.width - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth) - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight),
      fill: fillBox.width, left: fillBox.left - box.left, right: fillBox.right - box.right };
  });
  expect(geometry.percent).toBeCloseTo(expected.queenHealth, 8); expect(geometry.available).toBeGreaterThan(0);
  expect(geometry.fill).toBeCloseTo(geometry.available * expected.queenHealth / 100, 0);
  expect(geometry.left).toBeGreaterThanOrEqual(-1); expect(geometry.right).toBeLessThanOrEqual(1);
  await expect(guide(page).locator('button,input,select,textarea,[tabindex="0"]')).toHaveCount(0);
}

test('population counts stay separate from queen condition through live, zero and normalized readings without changing saved work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const original = await work(page);
  const cases: { input: Record<string, unknown>; expected: typeof initial }[] = [
    { input: initial, expected: initial },
    { input: { workers: 0, brood: 0, drones: 0, queenHealth: 0 }, expected: { workers: 0, brood: 0, drones: 0, queenHealth: 0 } },
    { input: { workers: 1, brood: 2, drones: 3, queenHealth: 100 }, expected: { workers: 1, brood: 2, drones: 3, queenHealth: 100 } },
    { input: { workers: 10001.25, brood: 1234.5, drones: 76.125, queenHealth: 49.99 }, expected: { workers: 10001.25, brood: 1234.5, drones: 76.125, queenHealth: 49.99 } },
    { input: { workers: 1000000, brood: 500000, drones: 250000, queenHealth: 100 }, expected: { workers: 1000000, brood: 500000, drones: 250000, queenHealth: 100 } },
    { input: { workers: 2000000, brood: 600000, drones: 300000, queenHealth: 120 }, expected: { workers: 1000000, brood: 500000, drones: 250000, queenHealth: 100 } },
    { input: { workers: -1, brood: -12, drones: -20, queenHealth: -10 }, expected: { workers: 0, brood: 0, drones: 0, queenHealth: 0 } },
    { input: { workers: '40000', brood: null, drones: true, queenHealth: '65' }, expected: { workers: 10000, brood: 3000, drones: 500, queenHealth: 100 } },
    { input: { workers: {}, brood: [], drones: { value: 50 }, queenHealth: false }, expected: { workers: 10000, brood: 3000, drones: 500, queenHealth: 100 } },
  ];
  for (const focusLayout of [true, false]) {
    await patch(page, { focusLayout, day: 10 });
    for (const entry of cases) {
      await patch(page, entry.input); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
      await verify(page, entry.expected); await unchanged(page, before, beforeAwards);
    }
  }
  await patch(page, { ...initial, day: 31 });
  const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
  await verify(page, initial, 31); await unchanged(page, before, beforeAwards);
  const finalState = await work(page);
  for (const key of ['notebook', 'queen', 'drone', 'custom', 'journal', 'actionPoints', 'honey']) expect(finalState.beehive[key]).toEqual(original.beehive[key]);
  expect(finalState.otherTool).toEqual(original.otherTool); expect(errors).toEqual([]);
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
    const meter = node.querySelector('[data-queen-condition-meter]')!, meterCss = getComputedStyle(meter), fill = meter.querySelector(':scope > span')!, fillCss = getComputedStyle(fill);
    const counts = node.querySelector('[data-colony-population]')!.getBoundingClientRect(), queenBox = node.querySelector('[data-colony-queen-condition]')!.getBoundingClientRect();
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent }] : []; }), words,
      text: Array.from(node.querySelectorAll('h4,dt,[data-population-scope],[data-population-value],[data-population-unit],[data-population-context],[data-queen-condition-value],[data-queen-condition-unit],[data-queen-condition-basis],[data-queen-condition-direction]')).map(el => { const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, whiteSpace: css.whiteSpace, overflow: css.overflow, ellipsis: css.textOverflow }; }),
      meter: { background: meterCss.backgroundColor, border: parseFloat(meterCss.borderTopWidth), borderStyle: meterCss.borderTopStyle, fill: fillCss.backgroundColor, forced: fillCss.forcedColorAdjust, height: meter.getBoundingClientRect().height, fillWidth: fill.getBoundingClientRect().width },
      separated: queenBox.top >= counts.bottom - 1 || queenBox.left >= counts.right - 1 || counts.left >= queenBox.right - 1,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'population-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.separated).toBe(true);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.whiteSpace).not.toBe('nowrap'); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) { expect(item.bottoms.length, item.word).toBeGreaterThan(0); for (const bottom of item.bottoms) expect(Math.abs(bottom - item.bottoms[0]), item.word + ' must stay intact').toBeLessThanOrEqual(1); }
  expect(result.meter.height).toBeGreaterThanOrEqual(8); expect(result.meter.fillWidth).toBeGreaterThan(0); expect(result.meter.fill).not.toBe(result.meter.background);
  if (mode === 'forced') { expect(result.meter.forced).toBe('none'); expect(result.meter.border).toBeGreaterThanOrEqual(1); expect(result.meter.borderStyle).not.toBe('none'); }
}
async function capture(page: Page, mode: string) {
  const target = guide(page), pad = 6, prefix = 'preview-population-clarity-' + mode;
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
test('population and queen readings remain distinct and readable in five display modes including maximum counts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 }); await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await patch(page, initial); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await verify(page, initial); await audit(page, mode); await capture(page, mode); await unchanged(page, before, beforeAwards);
    const maximum = { workers: 1000000, brood: 500000, drones: 250000, queenHealth: 100 };
    await patch(page, maximum); const beforeMaximum = await work(page), maximumAwards = await awards(page); await resetWrites(page);
    await verify(page, maximum); await audit(page, mode + '-maximum'); await unchanged(page, beforeMaximum, maximumAwards);
  }
  expect(errors).toEqual([]);
});

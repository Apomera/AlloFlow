import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_WORKFORCE_ARTIFACTS || '.codex-artifacts/bee-workforce-guide-2026-10-14');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });
const guide = (page: Page) => page.locator('[data-colony-role-guide]');
const summary = (page: Page) => guide(page).locator('summary');
const roleIds = ['nurse', 'builder', 'forager', 'guard', 'scout', 'fanner', 'undertaker', 'clusterer'];
const roleLabels = ['Nurses', 'Builders', 'Foragers', 'Guards', 'Scouts', 'Fanners', 'Undertakers', 'Clusterers'];
const roleNotes = [
  'Feed larvae royal jelly + bee bread (ages 3–10 days)', 'Secrete wax + draw comb (ages 11–17 days)',
  'Bring back nectar + pollen + water (ages 21+ days)', 'Sentries at the entrance, recognize sister vs intruder',
  'Find new forage + new nest sites (waggle dance)', 'Beat wings at 230 Hz to cool + evaporate honey moisture',
  'Carry dead bees out of the hive (colony hygiene)', 'Vibrate flight muscles to keep the queen at 95°F all winter',
];
const seasonalShares = [[35, 20, 25, 5, 5, 5, 5, 0], [20, 15, 45, 5, 5, 5, 5, 0], [20, 10, 40, 5, 5, 10, 10, 0], [5, 0, 0, 5, 0, 0, 0, 90]];
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__workforceAwards); }
async function patch(page: Page, value: Record<string, unknown>) { await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value); }
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__workforceWrites = []; }); }
async function unchanged(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__workforceWrites)).toEqual([]);
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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Workforce guide test uses the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 3, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      notebookOpen: false, missionBriefOpen: false, journeyOpen: false, day: 10,
      workers: 24000, queenHealth: 80, varroaLevel: 4, morale: 85, honey: 90, syrup: 40,
      pollen: 12, brood: 6000, capacity: 120, diseaseRisk: 0, actionPoints: 3, activeEvent: null, colonySurvived: true,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 }, honey_harvest: { earned: true, day: 30 } },
      journal: [{ day: 9, text: 'Keep my recorded observation.' }],
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.', explanation: 'Keep my reasoning.', custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: true } }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: true } },
      custom: { retained: 'Saved colony metadata.' },
    }, otherTool: { retained: 'Other saved tool work.' } }));
    w.__workforceAwards = []; w.__workforceWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__workforceAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name]; w.__ctx[name] = function(...args: any[]) { w.__workforceWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(guide(page)).toBeVisible();
}
async function verify(page: Page, workers: number, day: number) {
  const season = Math.floor(day % 120 / 30), shares = seasonalShares[season], name = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'][season];
  expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
  expect(await guide(page).evaluate(node => node.tagName)).toBe('DETAILS');
  await expect(summary(page)).toHaveText('Explore worker roles');
  await expect(guide(page).locator('[data-workforce-basis]')).toHaveText('Based on ' + workers.toLocaleString('en-US') + ' current workers.');
  await expect(guide(page).locator('[data-workforce-template]')).toHaveText(name + ' template: bars compare fixed seasonal shares, not tracked bee assignments.');
  await expect(guide(page).locator('[data-workforce-empty]')).toHaveCount(workers === 0 ? 1 : 0);
  if (workers === 0) await expect(guide(page).locator('[data-workforce-empty]')).toHaveText('There are no current workers to allocate. The bars show the seasonal illustration; all worker estimates are zero.');
  const items = guide(page).locator('ul[data-workforce-roles] > li[data-workforce-role]');
  await expect(items).toHaveCount(8);
  const expectedCounts: number[] = [];
  for (let index = 0; index < roleIds.length; index++) {
    const item = items.nth(index), id = roleIds[index], label = roleLabels[index], share = shares[index], count = Math.round(workers * share / 100);
    expectedCounts.push(count); await expect(item).toHaveAttribute('data-workforce-role', id);
    await expect(item).toHaveAttribute('data-workforce-zero', share === 0 ? 'true' : 'false');
    await expect(item.locator('strong').first()).toHaveText(label);
    await expect(item.locator('[data-workforce-share]')).toHaveText(share + '% of the seasonal allocation');
    await expect(item.locator('[data-workforce-count]')).toHaveText('About ' + count.toLocaleString('en-US') + ' workers');
    await expect(item.locator('[data-workforce-role-note]')).toHaveText(roleNotes[index]);
    await expect(item.locator('[data-workforce-zero-share]')).toHaveCount(share === 0 ? 1 : 0);
    if (share === 0) await expect(item.locator('[data-workforce-zero-share]')).toHaveText('Not allocated in this seasonal illustration.');
    const meter = item.locator('[data-workforce-meter="' + id + '"]');
    await expect(meter).toHaveAttribute('role', 'meter'); await expect(meter).toHaveAccessibleName(label + ' seasonal share');
    await expect(meter).toHaveAttribute('aria-valuemin', '0'); await expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(Number(await meter.getAttribute('aria-valuenow'))).toBe(share);
    await expect(meter).toHaveAttribute('aria-valuetext', share + ' of every 100 workers in this seasonal illustration. About ' + count.toLocaleString('en-US') + ' workers from the current workforce.');
    const geometry = await meter.evaluate(node => {
      const box = node.getBoundingClientRect(), css = getComputedStyle(node), fill = node.querySelector(':scope > span')!, fillBox = fill.getBoundingClientRect();
      return { available: box.width - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth) - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight),
        fill: fillBox.width, left: fillBox.left - box.left, right: fillBox.right - box.right };
    });
    expect(geometry.available).toBeGreaterThan(0); expect(geometry.fill).toBeCloseTo(geometry.available * share / 100, 0);
    expect(geometry.left).toBeGreaterThanOrEqual(-1); expect(geometry.right).toBeLessThanOrEqual(1);
  }
  if (workers === 10001) expect(expectedCounts.reduce((sum, count) => sum + count, 0)).not.toBe(workers);
  await expect(guide(page).locator('[data-workforce-rounding]')).toHaveText('Each worker estimate is rounded separately, so the displayed counts may not add up to the current workforce.');
}

test('seasonal workforce shares explain all eight roles and rounded counts without changing saved work in either layout', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const original = await work(page);
  for (const focusLayout of [true, false]) {
    await patch(page, { focusLayout });
    if (await guide(page).evaluate(node => (node as HTMLDetailsElement).open)) await activate(page, summary(page));
    const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await expect(guide(page).locator('[data-workforce-roles]')).not.toBeVisible(); await activate(page, summary(page), 'Space');
    await expect(summary(page)).toBeFocused(); await verify(page, 24000, 10); await unchanged(page, before, beforeAwards);
    await page.keyboard.press('Enter'); expect(await guide(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(false);
    await expect(summary(page)).toBeFocused(); await unchanged(page, before, beforeAwards);
    await page.keyboard.press('Space'); await verify(page, 24000, 10); await unchanged(page, before, beforeAwards);
  }
  for (const day of [10, 40, 70, 100]) {
    await patch(page, { day, workers: 24000 }); await openGuide(page);
    const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await verify(page, 24000, day); await unchanged(page, before, beforeAwards);
  }
  for (const workers of [0, 1, 10001, 1000000]) {
    await patch(page, { day: 10, workers }); await openGuide(page);
    const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await verify(page, workers, 10); await unchanged(page, before, beforeAwards);
  }
  const finalState = await work(page);
  for (const key of ['notebook', 'queen', 'drone', 'custom', 'journal', 'actionPoints']) expect(finalState.beehive[key]).toEqual(original.beehive[key]);
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
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent }] : []; }), words,
      text: Array.from(node.querySelectorAll('summary,strong,[data-workforce-basis],[data-workforce-template],[data-workforce-share],[data-workforce-count],[data-workforce-role-note],[data-workforce-zero-share],[data-workforce-rounding]')).map(el => { const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, whiteSpace: css.whiteSpace, overflow: css.overflow, ellipsis: css.textOverflow }; }),
      summary: (() => { const el = node.querySelector('summary')!, rect = el.getBoundingClientRect(), css = getComputedStyle(el); return { width: rect.width, height: rect.height, outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) }; })(),
      meters: Array.from(node.querySelectorAll('[data-workforce-meter]')).map(el => { const css = getComputedStyle(el), fill = getComputedStyle(el.querySelector(':scope > span')!); return { paper: css.backgroundColor, fill: fill.backgroundColor, forced: fill.forcedColorAdjust, height: el.getBoundingClientRect().height }; }),
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'workforce-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.whiteSpace).not.toBe('nowrap'); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) { expect(item.bottoms.length, item.word).toBeGreaterThan(0); for (const bottom of item.bottoms) expect(Math.abs(bottom - item.bottoms[0]), item.word + ' must stay intact').toBeLessThanOrEqual(1); }
  expect(result.summary.width).toBeGreaterThanOrEqual(44); expect(result.summary.height).toBeGreaterThanOrEqual(44); expect(result.summary.outline).not.toBe('none'); expect(result.summary.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(result.meters).toHaveLength(8); for (const meter of result.meters) { expect(meter.height).toBeGreaterThanOrEqual(8); expect(meter.fill).not.toBe(meter.paper); if (mode === 'forced') expect(meter.forced).toBe('none'); }
}
async function capture(page: Page, mode: string) {
  const region = guide(page), pad = 6;
  const position = await region.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await region.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset), height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2), file = 'preview-workforce-guide-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 }); tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-workforce-guide-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}
test('workforce role cards keep honest seasonal meters and readable explanations in five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page); await openGuide(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 }); await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await openGuide(page); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await summary(page).focus(); await page.keyboard.press('Tab'); await summary(page).focus();
    await verify(page, 24000, 10); await audit(page, mode); await capture(page, mode); await unchanged(page, before, beforeAwards);
  }
  expect(errors).toEqual([]);
});

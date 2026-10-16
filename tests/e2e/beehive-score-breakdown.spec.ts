import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_SCORE_ARTIFACTS || '.codex-artifacts/bee-score-breakdown-2026-10-14');
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function guide(page: Page) { return page.locator('[data-colony-score-guide]'); }
function summary(page: Page) { return guide(page).locator('summary'); }
function input(page: Page, id: string) { return guide(page).locator('[data-score-input="' + id + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__scoreAwards); }
async function patch(page: Page, value: Record<string, unknown>) {
  await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value);
}
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__scoreWrites = []; }); }
async function assertUnchanged(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__scoreWrites)).toEqual([]);
}
async function activate(page: Page, control: Locator, key: 'Enter' | 'Space' = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key);
}
async function openGuide(page: Page) {
  if (!(await guide(page).evaluate(node => (node as HTMLDetailsElement).open))) await activate(page, summary(page));
  await expect(guide(page)).toHaveAttribute('open', '');
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Score guide test uses the supported graphics fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the score guide test'); };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 3, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      notebookOpen: false, missionBriefOpen: false, journeyOpen: false, day: 40,
      workers: 30000, queenHealth: 20, varroaLevel: 0, morale: 100, honey: 90, syrup: 0,
      pollen: 12, brood: 6000, capacity: 120, diseaseRisk: 0, actionPoints: 3, activeEvent: null,
      queenTransition: null, show3dHive: false, hive3dExploded: false, hive3dFrame: 1,
      hive3dFramesSeen: [0, 1], hive3dPart: null, hive3dFoundQueen: false,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      journal: [{ day: 39, text: 'Keep my recorded observation.' }],
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: false, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false, custom: { retained: true } }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: true } },
      custom: { retained: 'Saved colony metadata.' },
    }, otherTool: { retained: 'Other saved tool work.' } }));
    w.__scoreAwards = []; w.__scoreWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__scoreAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__scoreWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(guide(page)).toBeVisible();
}

type Readings = { workers: number; queenHealth: number; varroaLevel: number; morale: number; honey: number };
const strongWeakQueen: Readings = { workers: 30000, queenHealth: 20, varroaLevel: 0, morale: 100, honey: 90 };
const rounded = (value: number) => String(Math.round(value * 10) / 10);
async function verifyInputs(page: Page, readings: Readings) {
  const expected = [
    { id: 'workers', label: 'workforce', weight: 30, score: Math.min(100, readings.workers / 300), value: readings.workers.toLocaleString('en-US') + ' workers', method: 'Worker count divided by 300, capped at 100' },
    { id: 'queen', label: 'queen condition', weight: 20, score: readings.queenHealth, value: readings.queenHealth + ' / 100', method: 'Current queen condition' },
    { id: 'varroa', label: 'mite control', weight: 20, score: 100 - readings.varroaLevel, value: readings.varroaLevel + ' / 100 mite pressure', method: '100 minus mite pressure' },
    { id: 'morale', label: 'colony stability', weight: 15, score: readings.morale, value: readings.morale + ' / 100', method: 'Current stability index' },
    { id: 'honey', label: 'combined food', weight: 15, score: Math.min(100, readings.honey * 3), value: readings.honey.toLocaleString('en-US') + ' lb', method: 'Combined food in pounds multiplied by 3, capped at 100' },
  ];
  const lowest = Math.min(...expected.map(item => item.score));
  const ties = expected.filter(item => item.score === lowest), allEqual = ties.length === expected.length;
  const total = Math.round(expected.reduce((sum, item) => sum + item.score * (item.weight / 100), 0));
  await expect(summary(page)).toHaveText('How the model score works');
  expect(await guide(page).evaluate(node => node.tagName)).toBe('DETAILS');
  await expect(guide(page).locator('[data-score-inputs] > li')).toHaveCount(5);
  await expect(guide(page).locator('[data-score-scale-note]')).toHaveText('Bars compare input scores on the same 0–100 scale. Weights determine how much each input adds to the total.');
  await expect(guide(page)).toContainText('A strong average can hide a weak system.');
  await expect(guide(page)).toContainText('The food input does not check the seasonal reserve; use Food balance for that decision.');
  for (const item of expected) {
    const card = input(page, item.id), meter = card.locator('[data-score-meter="' + item.id + '"]');
    await expect(card.locator('#beehive-score-input-' + item.id)).toHaveText(item.label.charAt(0).toUpperCase() + item.label.slice(1));
    await expect(card.locator('[data-score-reading]')).toHaveText('Current reading: ' + item.value);
    await expect(card.locator('[data-score-weight]')).toHaveText(item.weight + '% weight');
    await expect(card.locator('[data-score-value]')).toHaveText(rounded(item.score) + '/100 input points');
    await expect(card.locator('[data-score-method]')).toHaveText(item.method + '.');
    await expect(card.locator('[data-score-contribution]')).toHaveText('Adds about ' + rounded(item.score * (item.weight / 100)) + ' of ' + item.weight + ' possible score points');
    await expect(meter).toHaveAttribute('role', 'meter');
    await expect(meter).toHaveAttribute('aria-valuemin', '0'); await expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(Number(await meter.getAttribute('aria-valuenow'))).toBeCloseTo(item.score, 10);
    await expect(meter).toHaveAccessibleName(item.label + ' input score');
    const valueText = await meter.getAttribute('aria-valuetext');
    expect(valueText).toBeTruthy(); expect(valueText).toContain(rounded(item.score));
    const geometry = await meter.evaluate(node => {
      const fill = node.querySelector('span')!, box = node.getBoundingClientRect(), inner = fill.getBoundingClientRect();
      const css = getComputedStyle(node);
      return { width: box.width, fill: inner.width, available: box.width - parseFloat(css.borderLeftWidth) - parseFloat(css.borderRightWidth) - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight),
        style: fill.getAttribute('style'), left: inner.left - box.left, right: inner.right - box.right };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.fill).toBeCloseTo(geometry.available * item.score / 100, 0);
    expect(geometry.left).toBeGreaterThanOrEqual(-1); expect(geometry.right).toBeLessThanOrEqual(1);
    if (item.score === lowest && !allEqual) {
      await expect(card).toHaveAttribute('data-score-lowest', 'true');
      await expect(card.locator('[data-score-lowest-label]')).toHaveText(ties.length > 1 ? 'Joint lowest input' : 'Lowest input');
    } else {
      expect(await card.getAttribute('data-score-lowest')).not.toBe('true');
      await expect(card.locator('[data-score-lowest-label]')).toHaveCount(0);
    }
  }
  await expect(guide(page).locator('[data-score-lowest="true"]')).toHaveCount(allEqual ? 0 : ties.length);
  if (allEqual) await expect(guide(page).locator('[data-score-equal]')).toHaveText('All five input scores are equal.');
  else await expect(guide(page).locator('[data-score-equal]')).toHaveCount(0);
  const diagnosis = page.locator('[data-colony-diagnosis]');
  if (allEqual) {
    await expect(diagnosis).toContainText('All five input scores are equal.');
    expect(await diagnosis.textContent()).not.toContain('Lowest scoring input:');
    expect(await diagnosis.textContent()).not.toContain('Joint lowest scoring inputs:');
  } else if (ties.length > 1) {
    await expect(diagnosis).toContainText('Joint lowest scoring inputs: ' + ties.map(item => item.label + ' (' + item.value + ')').join('; ') + '.');
    expect(await diagnosis.textContent()).not.toContain('Lowest scoring input:');
  } else {
    await expect(diagnosis).toContainText('Lowest scoring input: ' + ties[0].label + ' (' + ties[0].value + ').');
  }
  if (total < 55 && (allEqual || ties.length > 1)) {
    await expect(diagnosis).toContainText('Review these inputs and the next step in the coach.');
    expect(await diagnosis.textContent()).not.toContain('Also review');
  }
  await expect(guide(page).locator('[data-score-total] strong')).toHaveText('Overall model score: ' + total + '/100');
  await expect(guide(page).locator('[data-score-total]')).toContainText('Contributions are shown to at most one decimal place. The total uses full values, then rounds once.');
  await expect(page.locator('[data-colony-dashboard] .bee-colony-heading')).toContainText('Model score ' + total + '/100');
  return total;
}

test('weighted score meters explain real inputs, ties and feeding while disclosure preserves saved work in both layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  const initial = await work(page);
  for (const focusLayout of [true, false]) {
    await patch(page, { focusLayout, ...strongWeakQueen });
    if (await guide(page).evaluate(node => (node as HTMLDetailsElement).open)) await activate(page, summary(page));
    const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await expect(guide(page).locator('[data-score-inputs]')).not.toBeVisible();
    await activate(page, summary(page), 'Space'); await expect(summary(page)).toBeFocused();
    await expect(guide(page)).toHaveAttribute('open', ''); expect(await verifyInputs(page, strongWeakQueen)).toBe(84);
    await assertUnchanged(page, before, beforeAwards);
    await page.keyboard.press('Enter'); expect(await guide(page).evaluate(node => (node as HTMLDetailsElement).open)).toBe(false);
    await expect(summary(page)).toBeFocused(); await assertUnchanged(page, before, beforeAwards);
    await page.keyboard.press('Space'); await verifyInputs(page, strongWeakQueen); await assertUnchanged(page, before, beforeAwards);
  }
  const cases: Readings[] = [
    { workers: 30000, queenHealth: 20, varroaLevel: 80, morale: 100, honey: 90 },
    { workers: 12000, queenHealth: 20, varroaLevel: 80, morale: 35, honey: 10 },
    { workers: 0, queenHealth: 0, varroaLevel: 100, morale: 0, honey: 0 },
    { workers: 30000, queenHealth: 100, varroaLevel: 0, morale: 100, honey: 100 / 3 },
    { workers: 1000000, queenHealth: 64, varroaLevel: 13, morale: 78, honey: 1000000 },
    { workers: 12345, queenHealth: 63.4, varroaLevel: 7.3, morale: 78.2, honey: 7.13 },
  ];
  for (const readings of cases) {
    await patch(page, readings); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await openGuide(page); await verifyInputs(page, readings); await assertUnchanged(page, before, beforeAwards);
    if (readings.workers === 0) expect(before.beehive.colonySurvived).toBe(false);
  }
  // A real management action changes the model; opening this explanation never does.
  // The zero-worker boundary intentionally ends this day-40 colony. Later
  // reading fixtures do not revive it, so start the feeding fixture alive.
  const feeding = { workers: 24000, queenHealth: 70, varroaLevel: 4, morale: 80, honey: 10 };
  await patch(page, { ...feeding, syrup: 0, focusLayout: false, colonySurvived: true }); await openGuide(page); await verifyInputs(page, feeding);
  await activate(page, page.locator('[data-hive-interior-open]'));
  const interior = page.locator('[data-hive-interior]');
  await expect(interior).toBeVisible(); await activate(page, interior.locator('[data-interior-hold]'));
  await expect(interior.locator('[data-interior-held-diagram]')).toBeVisible();
  const held = await interior.locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]));
  const beforeFeed = await work(page), beforeFeedAwards = await awards(page);
  expect(beforeFeed.beehive.colonySurvived).toBe(true);
  await expect(interior.locator('[data-interior-management]')).toBeEnabled();
  await interior.locator('[data-interior-management]').click();
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees'); await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); await page.keyboard.press('Enter');
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(15); expect(fed.beehive.syrup).toBe(5); expect(fed.beehive.morale).toBe(85);
  expect(fed.beehive.actionPoints).toBe(beforeFeed.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(beforeFeed.beehive.day);
  expect(fed.beehive.notebook).toEqual(initial.beehive.notebook); expect(fed.beehive.queen).toEqual(initial.beehive.queen);
  expect(fed.beehive.drone).toEqual(initial.beehive.drone); expect(fed.otherTool).toEqual(initial.otherTool);
  expect(await awards(page)).toEqual([...beforeFeedAwards, ['beehive', 3, 'Fed bees']]);
  await page.locator('[data-management-return-interior]').click();
  expect(await interior.locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]))).toEqual(held);
  await openGuide(page); const afterFeedAwards = await awards(page); await resetWrites(page);
  await verifyInputs(page, { ...feeding, honey: 15, morale: 85 }); await assertUnchanged(page, fed, afterFeedAwards);
  await expect(input(page, 'honey').locator('[data-score-contribution]')).toHaveText('Adds about 6.8 of 15 possible score points');
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await guide(page).evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const box = node.getBoundingClientRect(), font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const descendants = Array.from(node.querySelectorAll('*'));
    const visible = descendants.filter(el => { const rect = el.getBoundingClientRect(), css = getComputedStyle(el); return rect.width > 0 && rect.height > 0 && css.display !== 'none' && css.visibility !== 'hidden'; });
    const words: { word: string; context: string; bottoms: number[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement;
      if (!parent || parent.closest('svg')) continue;
      const rect = parent.getBoundingClientRect(), css = getComputedStyle(parent);
      if (rect.width <= 0 || rect.height <= 0 || css.display === 'none' || css.visibility === 'hidden') continue;
      for (const match of (textNode.textContent || '').matchAll(/[^\s\-–]+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], context: parent.textContent || '', bottoms: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => rect.bottom) });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflow: [node, ...visible].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.flatMap(el => { const rect = el.getBoundingClientRect(); return rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1 ? [{ tag: el.tagName, text: el.textContent, left: rect.left - box.left, right: rect.right - box.right }] : []; }),
      words,
      text: Array.from(node.querySelectorAll('summary,[data-score-reading],[data-score-weight],[data-score-value],[data-score-contribution],[data-score-method],[data-score-scale-note],[data-score-lowest-label],[data-score-total]')).map(el => { const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, whiteSpace: css.whiteSpace, overflow: css.overflow, ellipsis: css.textOverflow }; }),
      summary: (() => { const el = node.querySelector('summary')!, rect = el.getBoundingClientRect(), css = getComputedStyle(el); return { width: rect.width, height: rect.height, outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth), ink: css.color, paper: css.backgroundColor }; })(),
      meters: Array.from(node.querySelectorAll('[data-score-meter]')).map(el => { const fill = el.querySelector('span')!, css = getComputedStyle(el), fillCss = getComputedStyle(fill); return { paper: css.backgroundColor, fill: fillCss.backgroundColor, border: css.borderTopColor, borderWidth: parseFloat(css.borderTopWidth), height: el.getBoundingClientRect().height, adjustment: css.forcedColorAdjust, fillAdjustment: fillCss.forcedColorAdjust }; }),
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'score-breakdown-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.whiteSpace).not.toBe('nowrap'); expect(item.overflow).not.toBe('hidden'); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.words) {
    expect(item.bottoms.length, item.word + ' in ' + item.context).toBeGreaterThan(0);
    for (const bottom of item.bottoms) expect(Math.abs(bottom - item.bottoms[0]), item.word + ' must stay intact in ' + item.context).toBeLessThanOrEqual(1);
  }
  expect(result.summary.width).toBeGreaterThanOrEqual(44); expect(result.summary.height).toBeGreaterThanOrEqual(44);
  expect(result.summary.outline).not.toBe('none'); expect(result.summary.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(result.meters).toHaveLength(5);
  for (const meter of result.meters) {
    expect(meter.height).toBeGreaterThanOrEqual(8); expect(meter.fill).not.toBe(meter.paper);
    if (mode === 'forced') { expect(meter.borderWidth).toBeGreaterThan(0); expect(meter.border).not.toBe(meter.paper); }
  }
}
async function capture(page: Page, mode: string) {
  const region = guide(page), pad = 6;
  const position = await region.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: Math.max(0, box.top + window.scrollY - pad), height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await region.boundingBox(); expect(box).not.toBeNull(); const y = Math.max(0, box!.y - pad + offset);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2);
    const file = 'preview-score-breakdown-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-score-breakdown-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('score breakdown remains readable in five display modes with honest meter geometry and contrast', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page); await openGuide(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await openGuide(page); const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
    await summary(page).focus(); await page.keyboard.press('Tab'); await summary(page).focus();
    await verifyInputs(page, strongWeakQueen); await audit(page, mode); await capture(page, mode);
    await assertUnchanged(page, before, beforeAwards);
  }
  expect(errors).toEqual([]);
});

import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_LENS_VERDICT_ARTIFACTS || '.codex-artifacts/bee-lens-verdict-2026-10-14');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function status(page: Page) { return panel(page).locator('[data-interior-pattern-status]'); }
function matching(page: Page) { return status(page).locator('[data-interior-inspect-matching]'); }
function viewCells(page: Page) { return lens(page).locator('[data-interior-lens-view-cells]'); }
function results(page: Page) { return lens(page).locator('[data-interior-lens-results]'); }
function resultsTitle(page: Page) { return results(page).locator('[data-interior-lens-results-title]'); }
function returnControls(page: Page) { return results(page).locator('[data-interior-lens-return-controls]'); }
function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function lensToggle(page: Page) { return panel(page).locator('[data-interior-lens-toggle]'); }
function heading(page: Page) { return lens(page).locator('[data-interior-lens-title]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__lensVerdictAwards); }
async function patch(page: Page, value: Record<string, unknown>) {
  await page.evaluate(value => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', value)); }, value);
}
async function position(page: Page) { return { row: Number(await row(page).inputValue()), col: Number(await column(page).inputValue()) }; }
async function selection(page: Page) {
  return panel(page).locator('[data-interior-topic][aria-pressed="true"], [data-interior-role][aria-pressed="true"]').evaluateAll(nodes => nodes.map(node => ({
    topic: node.getAttribute('data-interior-topic'), role: node.getAttribute('data-interior-role'),
  })));
}
async function heldMarks(page: Page) {
  return panel(page).locator('[data-held-cell]').evaluateAll(nodes => nodes.map(node => ({ position: node.getAttribute('data-interior-cell-position'), role: node.getAttribute('data-held-cell') })));
}
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__lensVerdictWrites = []; }); }
async function noWrites(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__lensVerdictWrites)).toEqual([]);
}
async function keyboardActivate(page: Page, control: Locator, key: 'Enter' | 'Space') {
  await page.keyboard.press('Tab'); await control.focus(); await expect(control).toBeFocused();
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).not.toBe('none'); await page.keyboard.press(key);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive lens verdict fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the lens verdict test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 40, workers: 12000, capacity: 80,
      honey: 15, syrup: 0, pollen: 12, brood: 6000, queenHealth: 100,
      queenTransition: null, activeEvent: null, actionPoints: 3,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      show3dHive: false, hive3dExploded: false, hive3dFrame: 1,
      hive3dFramesSeen: [0, 1], hive3dPart: null, hive3dFoundQueen: false,
      inspectionDraft: { brood: 'spotty', cells: 'no' }, inspectionsDone: 2,
      lastInspection: { day: 40, framesRead: 1, queenFound: false, brood: 'solid', cells: 'yes', broodCorrect: true, cellsCorrect: true },
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Other saved tool work.' } }));
    w.__lensVerdictAwards = []; w.__lensVerdictWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__lensVerdictAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__lensVerdictWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed', { timeout: 30000 });
  await keyboardActivate(page, topic(page, 'brood'), 'Enter');
}

async function figures(page: Page) {
  return results(page).locator('figure').evaluateAll(nodes => nodes.map(node => ({
    caption: node.querySelector('figcaption')?.textContent,
    current: !!node.querySelector('[data-interior-current-lens]'), held: !!node.querySelector('[data-interior-held-lens]'),
    viewBox: node.querySelector('[data-interior-current-lens],[data-interior-held-lens]')?.getAttribute('viewBox'),
    label: node.querySelector('[data-interior-current-lens],[data-interior-held-lens]')?.getAttribute('aria-label'),
    marks: Array.from(node.querySelectorAll('[data-lens-current-cell],[data-lens-held-cell]')).map(mark => ({
      current: mark.getAttribute('data-lens-current-cell'), held: mark.getAttribute('data-lens-held-cell'), position: mark.getAttribute('data-lens-position'),
    })),
  })));
}
async function focusOutline(control: Locator) {
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).toBe('solid');
}
async function visibleDestination(page: Page, control: Locator) {
  const box = await control.boundingBox(); expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
}
async function verdict(page: Page, expected: 'same' | 'changed' | 'unavailable' | 'none') {
  const card = results(page).locator('[data-interior-lens-verdict]');
  const paired = expected !== 'none', at = await position(page), state = await work(page);
  await expect(resultsTitle(page)).toHaveAttribute('aria-describedby', 'beehive-interior-lens-results-context' + (paired ? ' beehive-interior-lens-verdict' : ''));
  await expect(results(page).locator('[data-interior-lens-results-context]')).toHaveText('Frame ' + (state.beehive.hive3dFrame + 1) + ' · Illustration row ' + (at.row + 1) + ', column ' + (at.col + 1) + '. ' + (paired ? 'Both close-ups use this same position.' : 'The close-up uses this illustration position.'));
  expect((await figures(page)).map(figure => figure.held ? 'held' : 'current')).toEqual(paired ? ['held', 'current'] : ['current']);
  if (!paired) { await expect(card).toHaveCount(0); return; }
  await expect(card).toHaveAttribute('id', 'beehive-interior-lens-verdict');
  await expect(card).toHaveAttribute('data-interior-lens-verdict', expected);
  expect(await card.evaluate(node => ({ before: node.previousElementSibling?.hasAttribute('data-interior-lens-results-context'), after: node.nextElementSibling?.classList.contains('bee-interior-lens-pair'), controls: node.querySelectorAll('button,input,select,a').length, live: node.hasAttribute('aria-live') || node.getAttribute('role') === 'status' }))).toEqual({ before: true, after: true, controls: 0, live: false });
  await expect(card.locator('[data-lens-verdict-title]')).toHaveText(expected === 'same' ? 'Same diagram mark' : expected === 'changed' ? 'Different diagram marks' : 'Cannot compare marks');
  if (expected === 'unavailable') {
    await expect(card.locator('[data-lens-verdict-detail]')).toHaveText((await panel(page).locator('[data-interior-diagram-status]').textContent())!);
    await expect(card.locator('[data-lens-verdict-limit]')).toHaveCount(0);
    await expect(card).not.toContainText('Same diagram mark'); await expect(card).not.toContainText('Different diagram marks');
    return;
  }
  const held = (await results(page).locator('[data-lens-mark="held"]').textContent())!.replace(/^Held mark: /, '');
  const current = (await results(page).locator('[data-lens-mark="current"]').textContent())!.replace(/^Current mark: /, '');
  await expect(card.locator('[data-lens-verdict-detail]')).toHaveText('Held mark: ' + held + ' → Current mark: ' + current + '.');
  await expect(card.locator('[data-lens-verdict-limit]')).toHaveText('Diagram categories, not tracked physical cells. Small reading changes may leave marks unchanged.');
  const coordinate = at.row + ':' + at.col;
  const heldRole = await results(page).locator('[data-lens-held-cell][data-lens-position="' + coordinate + '"]').getAttribute('data-lens-held-cell');
  const currentRole = await results(page).locator('[data-lens-current-cell][data-lens-position="' + coordinate + '"]').getAttribute('data-lens-current-cell');
  const normalize = (value: string | null) => value === 'foundation' ? 'empty' : value;
  expect(normalize(heldRole) === normalize(currentRole)).toBe(expected === 'same');
  expect(held === current).toBe(expected === 'same');
}
async function selectPosition(page: Page, at: { row: number; col: number }) {
  // One-based labels overlap zero-based values, so explicitly select by value.
  await row(page).selectOption({ value: String(at.row) }); await column(page).selectOption({ value: String(at.col) });
  expect(await position(page)).toEqual(at);
}
async function readWithoutChanges(page: Page, expected: 'same' | 'changed' | 'unavailable' | 'none', key: 'Enter' | 'Space' = 'Enter') {
  const before = await work(page), beforeAwards = await awards(page), beforeSelection = await selection(page), at = await position(page), held = await heldMarks(page), drawings = await figures(page);
  await resetWrites(page); await keyboardActivate(page, viewCells(page), key);
  await expect(resultsTitle(page)).toBeFocused(); await focusOutline(resultsTitle(page)); await visibleDestination(page, resultsTitle(page));
  await verdict(page, expected);
  await page.keyboard.press('Tab'); await expect(returnControls(page)).toBeFocused(); await page.keyboard.press(key === 'Enter' ? 'Space' : 'Enter');
  await expect(heading(page)).toBeFocused(); await focusOutline(heading(page));
  expect(await position(page)).toEqual(at); expect(await selection(page)).toEqual(beforeSelection);
  expect(await heldMarks(page)).toEqual(held); expect(await figures(page)).toEqual(drawings);
  await noWrites(page, before, beforeAwards);
}
async function differingAndStablePositions(page: Page) {
  return panel(page).evaluate(root => {
    const normalize = (value: string | null) => value === 'foundation' ? 'empty' : value;
    const previous = new Map(Array.from(root.querySelectorAll('[data-held-cell]')).map(node => [node.getAttribute('data-interior-cell-position'), normalize(node.getAttribute('data-held-cell'))]));
    const cells = Array.from(root.querySelectorAll('[data-interior-cell]'));
    const changed = cells.find(node => node.getAttribute('data-interior-cell') === 'honey' && previous.get(node.getAttribute('data-interior-cell-position')) !== 'honey');
    const same = cells.find(node => node.getAttribute('data-interior-cell') === 'capped_brood' && previous.get(node.getAttribute('data-interior-cell-position')) === 'capped_brood');
    const coordinate = (node: Element | undefined) => { if (!node) return null; const [row, col] = node.getAttribute('data-interior-cell-position')!.split(':').map(Number); return { row, col }; };
    return { changed: coordinate(changed), same: coordinate(same) };
  });
}

test('paired close-up verdicts follow the selected drawn marks, preserve work and stay unknown when either pattern is missing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, role(page, 'capped_brood'), 'Enter');
  await keyboardActivate(page, lensToggle(page), 'Space');
  await selectPosition(page, { row: 4, col: 10 });
  await readWithoutChanges(page, 'none');
  const beforeHold = await work(page), beforeAwards = await awards(page); await resetWrites(page);
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  await noWrites(page, beforeHold, beforeAwards);
  const held = await heldMarks(page); expect(held.length).toBeGreaterThan(0);
  await readWithoutChanges(page, 'same', 'Space');
  // A small recorded change may leave every schematic mark unchanged.
  await patch(page, { honey: 15.1 }); expect((await work(page)).beehive.honey).toBe(15.1);
  await expect(lens(page).locator('[data-interior-lens-change-progress]')).toHaveText('No changed marks in this frame.');
  await readWithoutChanges(page, 'same'); expect(await heldMarks(page)).toEqual(held);
  await patch(page, { honey: 15 });
  const beforeFeed = await work(page), selected = await selection(page), at = await position(page);
  // Exercise the real management action; its extra food crosses a drawn-row boundary.
  await panel(page).locator('[data-interior-management]').click();
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees'); await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 10000 }).toBeNull();
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(20); expect(fed.beehive.syrup).toBe(5); expect(fed.beehive.actionPoints).toBe(beforeFeed.beehive.actionPoints - 1);
  for (const name of ['day', 'notebook', 'inspectionDraft', 'lastInspection']) expect(fed.beehive[name]).toEqual(beforeFeed.beehive[name]);
  expect(fed.otherTool).toEqual(beforeFeed.otherTool);
  await page.locator('[data-management-return-interior]').click();
  expect(await position(page)).toEqual(at); expect(await selection(page)).toEqual(selected); expect(await heldMarks(page)).toEqual(held);
  const positions = await differingAndStablePositions(page); expect(positions.changed).not.toBeNull(); expect(positions.same).not.toBeNull();
  const beforeInspection = await work(page), inspectionAwards = await awards(page); await resetWrites(page);
  await selectPosition(page, positions.changed!); await noWrites(page, beforeInspection, inspectionAwards);
  await readWithoutChanges(page, 'changed', 'Space');
  await selectPosition(page, positions.same!);
  await expect(lens(page).locator('[data-interior-lens-change-progress]')).not.toHaveText('No changed marks in this frame.');
  // A difference elsewhere must not describe the selected unchanged mark as changed.
  await readWithoutChanges(page, 'same'); expect(await work(page)).toEqual(fed);
  await patch(page, { pollen: null });
  await expect(results(page).locator('[data-lens-mark="current"]')).toHaveText('Current mark: Pattern unavailable');
  await expect(row(page)).toBeEnabled(); await readWithoutChanges(page, 'unavailable', 'Space'); expect(await heldMarks(page)).toEqual(held);
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  await expect(results(page).locator('[data-lens-mark="held"]')).toHaveText('Held mark: Pattern unavailable');
  await expect(row(page)).toBeDisabled(); await expect(column(page)).toBeDisabled(); await readWithoutChanges(page, 'unavailable');
  await patch(page, { pollen: 12 });
  await expect(results(page).locator('[data-lens-mark="current"]')).not.toHaveText('Current mark: Pattern unavailable');
  await expect(row(page)).toBeEnabled(); await readWithoutChanges(page, 'unavailable', 'Space');
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter'); await readWithoutChanges(page, 'same');
  const current = await work(page); await patch(page, { simulationSeed: current.beehive.simulationSeed + 1 });
  await expect(panel(page).locator('[data-interior-reference-state]')).toHaveText('Comparison unavailable');
  await readWithoutChanges(page, 'none', 'Space');
  await keyboardActivate(page, panel(page).locator('[data-interior-clear]'), 'Enter'); await readWithoutChanges(page, 'none');
  expect(errors).toEqual([]);
});

async function audit(page: Page, region: Locator, mode: string, name: string) {
  const result = await region.evaluate(async node => {
    const checked = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const font = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const words: { word: string; context: string; rects: { bottom: number; width: number }[] }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let textNode: Node | null;
    while ((textNode = walker.nextNode())) {
      // Native option menus and SVG accessible names have no painted text boxes.
      if (textNode.parentElement?.closest('svg,option')) continue;
      const text = textNode.textContent || '';
      // Hyphens allow line breaks; each word part must remain visible and unbroken.
      for (const match of text.matchAll(/[^\s-]+/g)) {
        const range = document.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
        words.push({ word: match[0], context: textNode.parentElement?.textContent || text,
          rects: Array.from(range.getClientRects()).filter(rect => rect.width > 0 && rect.height > 0).map(rect => ({ bottom: rect.bottom, width: rect.width })) });
      }
    }
    return {
      violations: checked.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: [node, ...Array.from(node.querySelectorAll('*'))].filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })), words,
      text: Array.from(node.querySelectorAll('h3,h4,h5,p,label,button,strong,span,figcaption')).filter(el => el.textContent?.trim()).map(el => {
        const css = getComputedStyle(el); return { text: el.textContent, size: parseFloat(css.fontSize) / font, ellipsis: css.textOverflow, whiteSpace: css.whiteSpace };
      }),
      targets: Array.from(node.querySelectorAll('button,select')).map(el => { const box = el.getBoundingClientRect(); return { text: el.textContent, width: box.width, height: box.height }; }),
      forcedAdjustments: window.matchMedia('(forced-colors: active)').matches ? [node, ...Array.from(node.querySelectorAll('*'))].map(el => ({ text: el.textContent, svg: el.namespaceURI === 'http://www.w3.org/2000/svg', adjustment: getComputedStyle(el).forcedColorAdjust })) : [],
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'hive-lens-verdict-layout-' + mode + '-' + name + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  expect(result.words.length).toBeGreaterThan(0);
  for (const item of result.words) {
    expect(item.rects.length, item.word + ' must have visible text in ' + item.context).toBeGreaterThan(0);
    for (const rect of item.rects) expect(Math.abs(rect.bottom - item.rects[0].bottom), item.word + ' must stay on one line in ' + item.context).toBeLessThanOrEqual(1);
  }
  for (const item of result.targets) { expect(item.width, item.text || '').toBeGreaterThanOrEqual(44); expect(item.height, item.text || '').toBeGreaterThanOrEqual(44); }
  // SVG may preserve the parent's adjusted color; no element may disable forced colors.
  for (const item of result.forcedAdjustments) expect(item.svg ? ['auto', 'preserve-parent-color'] : ['auto'], item.text || '').toContain(item.adjustment);
}
async function capture(page: Page, region: Locator, mode: string, name: string) {
  fs.mkdirSync(artifacts, { recursive: true }); const pad = 6;
  const position = await region.evaluate((node, pad) => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY - pad, height: box.height + pad * 2 }; }, pad);
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(16); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await region.boundingBox(); expect(box).not.toBeNull(); const y = box!.y - pad + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const x = Math.max(0, box!.x - pad), width = Math.min(page.viewportSize()!.width - x, box!.width + pad * 2);
    const file = 'preview-hive-lens-verdict-' + mode + '-' + name + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-hive-lens-verdict-' + mode + '-' + name + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('same, different and unavailable close-up verdicts remain readable with paired drawings across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, role(page, 'capped_brood'), 'Enter');
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  const held = await heldMarks(page);
  await keyboardActivate(page, lensToggle(page), 'Enter');
  await patch(page, { honey: 20, syrup: 5 });
  const positions = await differingAndStablePositions(page); expect(positions.changed).not.toBeNull();
  await selectPosition(page, positions.changed!);
  // Choosing a position intentionally selects its current mark and study topic.
  // Reading the result must preserve that established selection afterward.
  const selected = await selection(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    for (const state of ['same', 'changed', 'unavailable'] as const) {
      await patch(page, state === 'same' ? { honey: 15, syrup: 0, pollen: 12 } : { honey: 20, syrup: 5, pollen: state === 'unavailable' ? null : 12 });
      const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
      await keyboardActivate(page, viewCells(page), mode === 'mobile' || mode === 'forced' ? 'Space' : 'Enter');
      await expect(resultsTitle(page)).toBeFocused(); await focusOutline(resultsTitle(page)); await visibleDestination(page, resultsTitle(page));
      await verdict(page, state);
      await audit(page, results(page), mode, state); await capture(page, results(page), mode, state);
      expect(await position(page)).toEqual(positions.changed); expect(await heldMarks(page)).toEqual(held); expect(await selection(page)).toEqual(selected);
      await noWrites(page, before, beforeAwards);
    }
  }
  expect(errors).toEqual([]);
});

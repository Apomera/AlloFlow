import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_LENS_READING_ARTIFACTS || '.codex-artifacts/bee-lens-reading-2026-10-14');

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
async function awards(page: Page) { return page.evaluate(() => (window as any).__lensReadingAwards); }
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
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__lensReadingWrites = []; }); }
async function noWrites(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__lensReadingWrites)).toEqual([]);
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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive lens reading fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the lens reading test'); };
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
    w.__lensReadingAwards = []; w.__lensReadingWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__lensReadingAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__lensReadingWrites.push(name); return original.apply(this, args); };
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
async function context(page: Page, paired: boolean) {
  const at = await position(page), state = await work(page);
  const text = 'Frame ' + (state.beehive.hive3dFrame + 1) + ' · Illustration row ' + (at.row + 1) + ', column ' + (at.col + 1) + '. ' +
    (paired ? 'Both close-ups use this same position.' : 'The close-up uses this illustration position.');
  await expect(resultsTitle(page)).toHaveText('Enlarged cells');
  await expect(resultsTitle(page)).toHaveAttribute('tabindex', '-1');
  await expect(resultsTitle(page)).toHaveAttribute('data-beehive-focus-panel', 'true');
  await expect(resultsTitle(page)).toHaveAttribute('aria-describedby', 'beehive-interior-lens-results-context' + (paired ? ' beehive-interior-lens-verdict' : ''));
  await expect(results(page).locator('[data-interior-lens-results-context]')).toHaveAttribute('id', 'beehive-interior-lens-results-context');
  await expect(results(page).locator('[data-interior-lens-results-context]')).toHaveText(text);
  const currentFigures = await figures(page);
  expect(currentFigures.map(figure => figure.held ? 'held' : 'current')).toEqual(paired ? ['held', 'current'] : ['current']);
  if (paired) expect(currentFigures[0].viewBox).toBe(currentFigures[1].viewBox);
  for (const figure of currentFigures) {
    expect(figure.label).toContain('Illustration row ' + (at.row + 1) + ', column ' + (at.col + 1));
    expect(figure.marks.length).toBeGreaterThan(0);
  }
}
async function roundTrip(page: Page, paired: boolean, key: 'Enter' | 'Space') {
  const before = await work(page), beforeAwards = await awards(page), beforeSelection = await selection(page), beforePosition = await position(page), held = await heldMarks(page), drawings = await figures(page);
  await context(page, paired);
  await expect(viewCells(page)).toHaveAccessibleName('View enlarged cells');
  await expect(viewCells(page)).toHaveAttribute('aria-controls', 'beehive-interior-lens-results');
  await expect(returnControls(page)).toHaveAccessibleName('Back to close-up controls');
  await expect(returnControls(page)).toHaveAttribute('aria-controls', 'beehive-interior-lens-title');
  await expect(viewCells(page)).toBeEnabled(); await expect(returnControls(page)).toBeEnabled();
  await resetWrites(page); await keyboardActivate(page, viewCells(page), key);
  await expect(resultsTitle(page)).toBeFocused(); await focusOutline(resultsTitle(page)); await visibleDestination(page, resultsTitle(page));
  // Starting from a programmatically focused heading, Tab reaches the nearby
  // return control, even when the native row/column selectors are disabled.
  await page.keyboard.press('Tab'); await expect(returnControls(page)).toBeFocused();
  await page.keyboard.press(key === 'Enter' ? 'Space' : 'Enter');
  await expect(heading(page)).toBeFocused(); await focusOutline(heading(page)); await visibleDestination(page, heading(page));
  expect(await selection(page)).toEqual(beforeSelection); expect(await position(page)).toEqual(beforePosition);
  expect(await heldMarks(page)).toEqual(held); expect(await figures(page)).toEqual(drawings);
  await noWrites(page, before, beforeAwards);
}
async function close(page: Page, origin: 'matching' | 'toolbar') {
  const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
  await keyboardActivate(page, lens(page).locator('[data-interior-lens-close]'), 'Enter');
  await expect(lens(page)).toHaveCount(0); await expect(origin === 'matching' ? matching(page) : lensToggle(page)).toBeFocused();
  await noWrites(page, before, beforeAwards);
}

test('enlarged cell shortcuts preserve current and held readings, selected coordinates and close-up origin across missing patterns', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, role(page, 'capped_brood'), 'Enter');
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', 'shown');
  // Earlier duplicate IDs/data markers must not receive this hive's focus.
  await page.evaluate(() => {
    const decoy = document.createElement('div'); decoy.id = 'lens-reading-decoy'; decoy.setAttribute('data-beehive-root', 'true');
    decoy.innerHTML = '<h4 id="beehive-interior-lens-title" data-interior-lens-title="true" tabindex="-1">Other hive controls</h4><h5 id="beehive-interior-lens-results-title" data-interior-lens-results-title="true" tabindex="-1">Other hive enlarged cells</h5>';
    document.body.prepend(decoy);
  });
  await keyboardActivate(page, matching(page), 'Enter'); await expect(heading(page)).toBeFocused();
  await row(page).selectOption({ value: '4' }); await column(page).selectOption({ value: '10' });
  expect(await position(page)).toEqual({ row: 4, col: 10 });
  await roundTrip(page, false, 'Enter'); await close(page, 'matching');
  await keyboardActivate(page, matching(page), 'Space'); await roundTrip(page, false, 'Space'); await close(page, 'matching');

  // The generic opener keeps its own return origin after visiting enlarged cells.
  await keyboardActivate(page, lensToggle(page), 'Enter'); await roundTrip(page, false, 'Enter'); await close(page, 'toolbar');
  await keyboardActivate(page, lensToggle(page), 'Space');
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  const held = await heldMarks(page); expect(held.length).toBeGreaterThan(0);
  await roundTrip(page, true, 'Space');
  // These fixture changes model independently unreadable current/held patterns.
  // Shortcut navigation itself must never write to persisted colony state.
  await patch(page, { pollen: null });
  await expect(lens(page).locator('[data-lens-mark="current"]')).toHaveText('Current mark: Pattern unavailable');
  await expect(row(page)).toBeEnabled(); await roundTrip(page, true, 'Enter');
  expect(await heldMarks(page)).toEqual(held);
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Space');
  await expect(row(page)).toBeDisabled(); await expect(column(page)).toBeDisabled();
  await expect(lens(page).locator('[data-lens-mark="held"]')).toHaveText('Held mark: Pattern unavailable');
  await roundTrip(page, true, 'Space');
  await patch(page, { pollen: 12 });
  await expect(row(page)).toBeEnabled(); await expect(lens(page).locator('[data-lens-mark="current"]')).not.toHaveText('Current mark: Pattern unavailable');
  await roundTrip(page, true, 'Enter');
  await keyboardActivate(page, panel(page).locator('[data-interior-clear]'), 'Enter');
  await roundTrip(page, false, 'Space');
  await patch(page, { pollen: null });
  await expect(row(page)).toBeDisabled(); await expect(column(page)).toBeDisabled(); await roundTrip(page, false, 'Enter');
  await close(page, 'toolbar');
  expect(await page.locator('#lens-reading-decoy').evaluate(node => node.contains(document.activeElement))).toBe(false);
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
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'hive-lens-reading-layout-' + mode + '-' + name + '.json'), JSON.stringify(result, null, 2));
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
    const file = 'preview-hive-lens-reading-' + mode + '-' + name + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-hive-lens-reading-' + mode + '-' + name + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('enlarged cell headings, paired captions and two-way focus shortcuts remain readable across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  await keyboardActivate(page, lensToggle(page), 'Enter');
  await row(page).selectOption({ value: '4' }); await column(page).selectOption({ value: '10' });
  const before = await work(page), beforeAwards = await awards(page), held = await heldMarks(page), drawings = await figures(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await context(page, true); await resetWrites(page);
    await page.keyboard.press('Tab'); await viewCells(page).focus(); await expect(viewCells(page)).toBeFocused(); await focusOutline(viewCells(page));
    await audit(page, lens(page), mode, 'lens'); await capture(page, lens(page), mode, 'lens');
    await page.keyboard.press(mode === 'mobile' || mode === 'forced' ? 'Space' : 'Enter');
    await expect(resultsTitle(page)).toBeFocused(); await focusOutline(resultsTitle(page)); await visibleDestination(page, resultsTitle(page));
    await audit(page, results(page), mode, 'results'); await capture(page, results(page), mode, 'results');
    await page.keyboard.press('Tab'); await expect(returnControls(page)).toBeFocused(); await page.keyboard.press('Enter');
    await expect(heading(page)).toBeFocused(); await visibleDestination(page, heading(page));
    expect(await position(page)).toEqual({ row: 4, col: 10 }); expect(await heldMarks(page)).toEqual(held); expect(await figures(page)).toEqual(drawings);
    await noWrites(page, before, beforeAwards);
  }
  expect(errors).toEqual([]);
});

import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_LENS_UNKNOWN_ARTIFACTS || '.codex-artifacts/bee-lens-unknown-2026-10-14');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function viewCells(page: Page) { return lens(page).locator('[data-interior-lens-view-cells]'); }
function results(page: Page) { return lens(page).locator('[data-interior-lens-results]'); }
function resultsTitle(page: Page) { return results(page).locator('[data-interior-lens-results-title]'); }
function returnControls(page: Page) { return results(page).locator('[data-interior-lens-return-controls]'); }
function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function lensToggle(page: Page) { return panel(page).locator('[data-interior-lens-toggle]'); }
function heading(page: Page) { return lens(page).locator('[data-interior-lens-title]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__lensUnknownAwards); }
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
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__lensUnknownWrites = []; }); }
async function noWrites(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__lensUnknownWrites)).toEqual([]);
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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive lens missing-reading fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the lens missing-reading test'); };
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
    w.__lensUnknownAwards = []; w.__lensUnknownWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__lensUnknownAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__lensUnknownWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed', { timeout: 30000 });
  await keyboardActivate(page, topic(page, 'brood'), 'Enter');
}

const missingHelp = 'The question mark means missing readings, not empty comb.';
const recorded = { honey: 15, syrup: 0, pollen: 12, brood: 6000, queenHealth: 100 };
type Side = 'current' | 'held';
async function selectPosition(page: Page, at: { row: number; col: number }) {
  // One-based labels overlap zero-based values, so explicitly select by value.
  await row(page).selectOption({ value: String(at.row) }); await column(page).selectOption({ value: String(at.col) });
  expect(await position(page)).toEqual(at);
}
async function checkPane(page: Page, side: Side, known: boolean) {
  const at = await position(page), x = 43 + at.col * 25 + (at.row % 2 ? 12.5 : 0), y = 47 + at.row * 22;
  const image = results(page).locator('[data-interior-' + side + '-lens]');
  const artwork = image.locator('[data-lens-artwork="' + side + '"]');
  const unknown = image.locator('[data-lens-unknown="' + side + '"]');
  await expect(image).toHaveAttribute('role', 'img');
  await expect(image).toHaveAttribute('viewBox', (x - 55) + ' ' + (y - 48) + ' 110 96');
  await expect(image).toHaveAccessibleName(new RegExp('Frame 2 of 6\\. Illustration row ' + (at.row + 1) + ', column ' + (at.col + 1)));
  await expect(artwork).toHaveAttribute('aria-hidden', 'true');
  const cells = image.locator('[data-lens-' + side + '-cell]');
  const rendered = await cells.evaluateAll(nodes => nodes.map(node => ({
    role: node.getAttribute('data-lens-current-cell') || node.getAttribute('data-lens-held-cell'),
    position: node.getAttribute('data-lens-position'), visibility: getComputedStyle(node).visibility,
    polygonVisibility: getComputedStyle(node.querySelector('polygon')!).visibility,
    interactive: node.classList.contains('bee-interior-cell-pick') || node.hasAttribute('tabindex'),
  })));
  expect(rendered.length).toBeGreaterThan(0); expect(rendered.length).toBeLessThanOrEqual(25);
  const selected = rendered.find(cell => cell.position === at.row + ':' + at.col); expect(selected).toBeDefined();
  const fullFrame = panel(page).locator(side === 'current' ? '[data-hive-interior-diagram]' : '[data-interior-held-diagram]');
  await expect(fullFrame).toHaveAttribute('viewBox', '0 0 610 325');
  await expect(fullFrame.locator('[data-lens-artwork],[data-lens-unknown],[data-lens-unknown-help]')).toHaveCount(0);
  await expect(fullFrame.locator(side === 'current' ? '[data-interior-cell]' : '[data-held-cell]')).toHaveCount(231);
  if (known) {
    expect(await artwork.getAttribute('visibility')).toBeNull();
    expect(await artwork.evaluate(node => getComputedStyle(node).visibility)).toBe('visible');
    expect(rendered.every(cell => cell.visibility === 'visible' && cell.polygonVisibility === 'visible' && cell.role !== 'unavailable')).toBe(true);
    await expect(unknown).toHaveCount(0);
    await expect(results(page).locator('[data-lens-unknown-help="' + side + '"]')).toHaveCount(0);
    await expect(results(page).locator('[data-lens-caption-symbol="' + side + '"]')).toHaveCount(1);
    await expect(image.locator('[data-lens-ring="' + side + '"]')).toHaveCount(1);
    await expect(panel(page).locator('[data-interior-lens-locator="' + side + '"]')).toHaveCount(1);
    expect(await image.getAttribute('aria-label')).not.toContain(missingHelp);
  } else {
    await expect(artwork).toHaveAttribute('visibility', 'hidden');
    expect(await artwork.evaluate(node => getComputedStyle(node).visibility)).toBe('hidden');
    expect(rendered.every(cell => cell.role === 'unavailable' && cell.visibility === 'hidden' && cell.polygonVisibility === 'hidden' && !cell.interactive)).toBe(true);
    await expect(unknown).toHaveAttribute('aria-hidden', 'true'); await expect(unknown).toBeVisible();
    await expect(unknown.locator('text')).toHaveText('?');
    await expect(unknown.locator('text')).toHaveAttribute('x', String(x));
    await expect(unknown.locator('text')).toHaveAttribute('y', String(y + 13));
    for (const [attribute, value] of Object.entries({ x: x - 45, y: y - 38, width: 90, height: 76 })) {
      await expect(unknown.locator('rect')).toHaveAttribute(attribute, String(value));
    }
    const painted = await unknown.evaluate(node => {
      const rect = node.querySelector('rect')!, text = node.querySelector('text')!;
      const border = getComputedStyle(rect), glyph = getComputedStyle(text);
      return { visibility: getComputedStyle(node).visibility, border: border.stroke, dash: border.strokeDasharray,
        strokeWidth: parseFloat(border.strokeWidth), glyph: glyph.fill, size: parseFloat(glyph.fontSize), pointerEvents: getComputedStyle(node).pointerEvents };
    });
    expect(painted.visibility).toBe('visible'); expect(painted.border).not.toBe('none'); expect(painted.dash).not.toBe('none');
    expect(painted.strokeWidth).toBeGreaterThan(0); expect(painted.glyph).not.toBe('none'); expect(painted.size).toBeGreaterThanOrEqual(40); expect(painted.pointerEvents).toBe('none');
    await expect(results(page).locator('[data-lens-unknown-help="' + side + '"]')).toHaveText(missingHelp);
    await expect(results(page).locator('[data-lens-mark="' + side + '"]')).toHaveText((side === 'held' ? 'Held' : 'Current') + ' mark: Pattern unavailable');
    await expect(results(page).locator('[data-lens-caption-description="' + side + '"]')).toHaveText('No mark can be read because a required colony reading is not recorded.');
    await expect(results(page).locator('[data-lens-caption-symbol="' + side + '"]')).toHaveCount(0);
    await expect(image.locator('[data-lens-ring]')).toHaveCount(0);
    await expect(panel(page).locator('[data-interior-lens-locator="' + side + '"]')).toHaveCount(0);
    expect(await image.getAttribute('aria-label')).toContain(missingHelp);
    // The full frame keeps its existing unavailable cells; only the close-up replaces their artwork.
    expect(await fullFrame.locator('[data-interior-cell],[data-held-cell]').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).visibility === 'visible'))).toBe(true);
  }
  return selected!.role;
}
async function checkPair(page: Page, currentKnown: boolean, heldKnown?: boolean) {
  await checkPane(page, 'current', currentKnown);
  if (heldKnown === undefined) {
    await expect(results(page).locator('[data-interior-held-lens]')).toHaveCount(0);
    await expect(results(page).locator('[data-interior-lens-verdict]')).toHaveCount(0);
  } else {
    await checkPane(page, 'held', heldKnown);
    expect(await results(page).locator('[data-interior-current-lens]').getAttribute('viewBox')).toBe(await results(page).locator('[data-interior-held-lens]').getAttribute('viewBox'));
    if (!currentKnown || !heldKnown) await expect(results(page).locator('[data-interior-lens-verdict]')).toHaveAttribute('data-interior-lens-verdict', 'unavailable');
  }
  if (currentKnown || heldKnown) { await expect(row(page)).toBeEnabled(); await expect(column(page)).toBeEnabled(); }
  else { await expect(row(page)).toBeDisabled(); await expect(column(page)).toBeDisabled(); }
}
async function focusOutline(control: Locator) {
  const focus = await control.evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).toBe('solid');
}
async function visibleDestination(page: Page, control: Locator) {
  const box = await control.boundingBox(); expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
}
async function readWithoutChanges(page: Page, currentKnown: boolean, heldKnown?: boolean, key: 'Enter' | 'Space' = 'Enter') {
  const before = await work(page), beforeAwards = await awards(page), selected = await selection(page), at = await position(page), held = await heldMarks(page);
  await resetWrites(page); await keyboardActivate(page, viewCells(page), key);
  await expect(resultsTitle(page)).toBeFocused(); await focusOutline(resultsTitle(page)); await visibleDestination(page, resultsTitle(page));
  await checkPair(page, currentKnown, heldKnown);
  await page.keyboard.press('Tab'); await expect(returnControls(page)).toBeFocused(); await page.keyboard.press(key === 'Enter' ? 'Space' : 'Enter');
  await expect(heading(page)).toBeFocused(); await focusOutline(heading(page));
  expect(await position(page)).toEqual(at); expect(await selection(page)).toEqual(selected); expect(await heldMarks(page)).toEqual(held);
  await noWrites(page, before, beforeAwards);
}

test('missing-reading close-ups distinguish unknown from empty comb at every edge and preserve current and held study state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, lensToggle(page), 'Enter'); await selectPosition(page, { row: 4, col: 10 });
  await readWithoutChanges(page, true);
  // Recorded zero is valid. Both actual empty comb and foundation remain visible, without question marks.
  await patch(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
  for (const emptyRole of ['empty', 'foundation']) {
    const positionText = await panel(page).locator('[data-interior-cell="' + emptyRole + '"]').first().getAttribute('data-interior-cell-position');
    expect(positionText).not.toBeNull(); const [r, c] = positionText!.split(':').map(Number);
    await selectPosition(page, { row: r, col: c });
    expect(await checkPane(page, 'current', true)).toBe(emptyRole);
    await expect(results(page).locator('[data-lens-mark="current"]')).toHaveText('Current mark: Unmarked comb');
    await readWithoutChanges(page, true, undefined, 'Space');
  }
  await patch(page, recorded); await selectPosition(page, { row: 0, col: 0 });
  await patch(page, { pollen: null });
  await readWithoutChanges(page, false, undefined, 'Space');
  await patch(page, recorded); await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  const heldKnownMarks = await heldMarks(page);
  const missingCases = [
    { field: 'honey', at: { row: 0, col: 0 } }, { field: 'pollen', at: { row: 0, col: 20 } },
    { field: 'brood', at: { row: 10, col: 0 } }, { field: 'queenHealth', at: { row: 10, col: 20 } },
  ];
  for (const item of missingCases) {
    await patch(page, recorded); await selectPosition(page, item.at);
    await patch(page, { [item.field]: null });
    // Selecting a position can intentionally select its role. Reading must preserve that new study.
    await readWithoutChanges(page, false, true, 'Space'); expect(await heldMarks(page)).toEqual(heldKnownMarks);
  }
  // Holding incomplete readings preserves that uncertainty in both views.
  const beforeHold = await work(page), beforeHoldAwards = await awards(page); await resetWrites(page);
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter'); await noWrites(page, beforeHold, beforeHoldAwards);
  await readWithoutChanges(page, false, false);
  await patch(page, recorded);
  for (const at of [{ row: 0, col: 0 }, { row: 10, col: 20 }]) {
    await selectPosition(page, at); await readWithoutChanges(page, true, false, 'Space');
  }
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter'); await readWithoutChanges(page, true, true);
  await keyboardActivate(page, panel(page).locator('[data-interior-clear]'), 'Enter'); await readWithoutChanges(page, true);
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
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'hive-lens-unknown-layout-' + mode + '-' + name + '.json'), JSON.stringify(result, null, 2));
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
    const file = 'preview-hive-lens-unknown-' + mode + '-' + name + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-hive-lens-unknown-' + mode + '-' + name + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('missing current and held close-up drawings stay clear across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, lensToggle(page), 'Enter'); await selectPosition(page, { row: 4, col: 10 });
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    for (const state of ['current-missing', 'held-missing'] as const) {
      await patch(page, recorded);
      if (state === 'held-missing') await patch(page, { pollen: null });
      await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
      await patch(page, { pollen: state === 'current-missing' ? null : 12 });
      const before = await work(page), beforeAwards = await awards(page), selected = await selection(page), at = await position(page), held = await heldMarks(page);
      await resetWrites(page); await keyboardActivate(page, viewCells(page), mode === 'mobile' || mode === 'forced' ? 'Space' : 'Enter');
      await expect(resultsTitle(page)).toBeFocused(); await focusOutline(resultsTitle(page)); await visibleDestination(page, resultsTitle(page));
      await checkPair(page, state === 'held-missing', state === 'current-missing');
      await audit(page, results(page), mode, state); await capture(page, results(page), mode, state);
      expect(await position(page)).toEqual(at); expect(await selection(page)).toEqual(selected); expect(await heldMarks(page)).toEqual(held);
      await noWrites(page, before, beforeAwards);
    }
  }
  expect(errors).toEqual([]);
});

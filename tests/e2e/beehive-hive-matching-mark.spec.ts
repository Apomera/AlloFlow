import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import fs from 'node:fs';
import path from 'node:path';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 980, height: 1800 });
const artifacts = path.resolve(process.env.BEE_MATCHING_MARK_ARTIFACTS || '.codex-artifacts/bee-hive-matching-mark-2026-10-14');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function status(page: Page) { return panel(page).locator('[data-interior-pattern-status]'); }
function action(page: Page) { return status(page).locator('[data-interior-inspect-matching]'); }
function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function lensToggle(page: Page) { return panel(page).locator('[data-interior-lens-toggle]'); }
function heading(page: Page) { return lens(page).locator('[data-interior-lens-title]'); }
function topic(page: Page, id: string) { return panel(page).locator('[data-interior-topic="' + id + '"]'); }
function role(page: Page, id: string) { return panel(page).locator('[data-interior-role="' + id + '"]'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function awards(page: Page) { return page.evaluate(() => (window as any).__matchingMarkAwards); }
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
async function resetWrites(page: Page) { await page.evaluate(() => { (window as any).__matchingMarkWrites = []; }); }
async function noWrites(page: Page, before: unknown, beforeAwards: unknown) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  expect(await page.evaluate(() => (window as any).__matchingMarkWrites)).toEqual([]);
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
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive matching mark fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the matching mark test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: false, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 40, workers: 12000, capacity: 80,
      // Feeding 15 -> 20 crosses the illustrated food arch on shoulder frame 2.
      // A 10 -> 15 change stays within the same illustrated row.
      honey: 15, syrup: 0, pollen: 12, brood: 6000, queenHealth: 100,
      queenTransition: null, activeEvent: null, actionPoints: 3,
      badges: { first_day: { earned: true, day: 1 }, survive_30: { earned: true, day: 30 }, thriving: { earned: true, day: 30 } },
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0,
      hive3dFramesSeen: [0], hive3dPart: null, hive3dFoundQueen: false,
      inspectionDraft: { brood: 'spotty', cells: 'no' }, inspectionsDone: 2,
      lastInspection: { day: 40, framesRead: 1, queenFound: false, brood: 'solid', cells: 'yes', broodCorrect: true, cellsCorrect: true },
      notebook: { beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong>.',
        explanation: 'Keep my reasoning.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' }, synthesis: 'Keep my synthesis.' },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__matchingMarkAwards = []; w.__matchingMarkWrites = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__matchingMarkAwards.push(args); };
    for (const name of ['update', 'updateMulti', 'setToolData', 'setLabToolData']) {
      const original = w.__ctx[name];
      w.__ctx[name] = function(...args: any[]) { w.__matchingMarkWrites.push(name); return original.apply(this, args); };
    }
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-title')).toBeFocused();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed', { timeout: 30000 });
  await keyboardActivate(page, topic(page, 'brood'), 'Enter');
}

// Read the actual illustrated highlighted marks, independently of any shortcut
// helper. Distance is measured in illustration rows/columns, never cell counts.
async function nearestCurrentMark(page: Page, from: { row: number; col: number }) {
  const cells = await panel(page).locator('[data-interior-cell][data-highlighted="true"]').evaluateAll(nodes => nodes.map(node => {
    const [row, col] = node.getAttribute('data-interior-cell-position')!.split(':').map(Number);
    return { row, col, role: node.getAttribute('data-interior-cell') };
  }));
  cells.sort((a, b) => Math.abs(a.row - from.row) + Math.abs(a.col - from.col) - Math.abs(b.row - from.row) - Math.abs(b.col - from.col) || a.row - b.row || a.col - b.col);
  expect(cells.length).toBeGreaterThan(0); return cells[0];
}
async function openMatching(page: Page, from: { row: number; col: number }, key: 'Enter' | 'Space') {
  const target = await nearestCurrentMark(page, from), before = await work(page), beforeAwards = await awards(page), beforeSelection = await selection(page), held = await heldMarks(page);
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', 'shown');
  await expect(action(page)).toHaveAccessibleName('Open matching close-up');
  await expect(action(page)).toHaveAttribute('aria-describedby', 'beehive-interior-pattern-note');
  await expect(action(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(action(page)).not.toHaveAttribute('aria-controls');
  await resetWrites(page); await keyboardActivate(page, action(page), key);
  await expect(action(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(action(page)).toHaveAttribute('aria-controls', 'beehive-interior-cell-lens');
  expect(await position(page)).toEqual({ row: target.row, col: target.col }); expect(await selection(page)).toEqual(beforeSelection);
  await expect(heading(page)).toHaveAttribute('id', 'beehive-interior-lens-title');
  await expect(heading(page)).toHaveAttribute('data-beehive-focus-panel', 'true'); await expect(heading(page)).toBeFocused();
  const focus = await heading(page).evaluate(node => { const css = getComputedStyle(node); return { width: parseFloat(css.outlineWidth), style: css.outlineStyle }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.style).toBe('solid');
  await expect(lens(page).locator('[data-lens-current-cell][data-lens-position="' + target.row + ':' + target.col + '"]')).toHaveAttribute('data-lens-current-cell', target.role!);
  await expect(lens(page).locator('[data-interior-current-lens]')).toHaveAccessibleName(new RegExp('Illustration row ' + (target.row + 1) + ', column ' + (target.col + 1)));
  if (held.length) {
    await expect(lens(page).locator('[data-interior-lens-status]')).toContainText('Both close-ups use this same position.');
    expect(await heldMarks(page)).toEqual(held);
    await expect(lens(page).locator('[data-interior-held-lens]')).toHaveAttribute('viewBox', (await lens(page).locator('[data-interior-current-lens]').getAttribute('viewBox'))!);
  }
  await noWrites(page, before, beforeAwards); return { row: target.row, col: target.col };
}
async function close(page: Page, returnsToShortcut: boolean) {
  const before = await work(page), beforeAwards = await awards(page); await resetWrites(page);
  await keyboardActivate(page, lens(page).locator('[data-interior-lens-close]'), 'Enter');
  await expect(lens(page)).toHaveCount(0); await expect(returnsToShortcut ? action(page) : lensToggle(page)).toBeFocused();
  await noWrites(page, before, beforeAwards);
}

test('matching close-up preserves the selected study, chooses current marks after feeding, and returns keyboard focus without changing saved work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', 'elsewhere'); await expect(action(page)).toHaveCount(0);
  await keyboardActivate(page, status(page).locator('[data-interior-show-matching]'), 'Enter');
  await expect(panel(page).locator('[data-interior-read-title]')).toBeFocused();
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', 'shown');
  await keyboardActivate(page, lensToggle(page), 'Enter'); const start = await position(page); await close(page, false);
  // Earlier duplicate IDs/data markers must never receive another hive's focus.
  await page.evaluate(() => {
    const decoy = document.createElement('div'); decoy.id = 'matching-mark-decoy'; decoy.setAttribute('data-beehive-root', 'true');
    decoy.innerHTML = '<h4 id="beehive-interior-lens-title" data-interior-lens-title="true" tabindex="-1">Other hive close-up</h4><button data-interior-inspect-matching="true">Other hive shortcut</button>';
    document.body.prepend(decoy);
  });
  let at = await openMatching(page, start, 'Enter'); await close(page, true);
  at = await openMatching(page, at, 'Space'); await close(page, true);
  await keyboardActivate(page, role(page, 'capped_brood'), 'Enter');
  // Role controls use the existing nearest-cell behavior; observe its position
  // through the generic lens before testing the new route's preserved filter.
  await keyboardActivate(page, lensToggle(page), 'Enter'); at = await position(page); await close(page, false);
  await openMatching(page, at, 'Space'); await expect(role(page, 'capped_brood')).toHaveAttribute('aria-pressed', 'true');
  await keyboardActivate(page, topic(page, 'queen'), 'Enter'); await expect(action(page)).toHaveCount(0); await close(page, false);
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', 'unmapped');

  await keyboardActivate(page, topic(page, 'food'), 'Enter');
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  const held = await heldMarks(page), beforeFeed = await work(page);
  await panel(page).locator('[data-interior-management]').click();
  await page.locator('[data-management-preview-choice]').selectOption('feed_bees'); await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await work(page)).beehive.bkAnim, { timeout: 10000 }).toBeNull();
  const fed = await work(page);
  expect(fed.beehive.honey).toBe(beforeFeed.beehive.honey + 5); expect(fed.beehive.syrup).toBe(beforeFeed.beehive.syrup + 5);
  expect(fed.beehive.actionPoints).toBe(beforeFeed.beehive.actionPoints - 1); expect(fed.beehive.day).toBe(beforeFeed.beehive.day);
  expect(fed.beehive.notebook).toEqual(beforeFeed.beehive.notebook); expect(fed.beehive.inspectionDraft).toEqual(beforeFeed.beehive.inspectionDraft);
  expect(fed.beehive.lastInspection).toEqual(beforeFeed.beehive.lastInspection); expect(fed.otherTool).toEqual(beforeFeed.otherTool);
  await page.locator('[data-management-return-interior]').click(); expect(await heldMarks(page)).toEqual(held);
  const newFoodPosition = await panel(page).evaluate(root => {
    const previous = new Map(Array.from(root.querySelectorAll('[data-held-cell]')).map(node => [node.getAttribute('data-interior-cell-position'), node.getAttribute('data-held-cell')]));
    const candidate = Array.from(root.querySelectorAll('[data-interior-cell="honey"]')).find(node => previous.get(node.getAttribute('data-interior-cell-position')) !== 'honey');
    if (!candidate) return null;
    const [row, col] = candidate.getAttribute('data-interior-cell-position')!.split(':').map(Number); return { row, col };
  });
  expect(newFoodPosition, 'Feeding should expose a current food mark absent from the held illustration').not.toBeNull();
  await keyboardActivate(page, lensToggle(page), 'Enter');
  // Visible labels are one-based, while option values are zero-based. Select
  // the value explicitly so a string cannot match an earlier visible label.
  await row(page).selectOption({ value: String(newFoodPosition!.row) });
  await expect(row(page)).toHaveValue(String(newFoodPosition!.row));
  await column(page).selectOption({ value: String(newFoodPosition!.col) });
  await expect(column(page)).toHaveValue(String(newFoodPosition!.col));
  expect(await position(page)).toEqual(newFoodPosition);
  await keyboardActivate(page, topic(page, 'food'), 'Enter'); at = await position(page);
  expect(at).toEqual(newFoodPosition); await close(page, false);
  expect(await openMatching(page, at, 'Enter')).toEqual(newFoodPosition);
  const selectedHeld = held.find(cell => cell.position === at.row + ':' + at.col)!;
  expect(selectedHeld.role).not.toBe('honey');
  await expect(lens(page).locator('[data-lens-held-cell][data-lens-position="' + at.row + ':' + at.col + '"]')).toHaveAttribute('data-lens-held-cell', selectedHeld.role!);
  await close(page, true); expect(await work(page)).toEqual(fed);

  await patch(page, { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 });
  await keyboardActivate(page, topic(page, 'brood'), 'Enter');
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', 'absent'); await expect(action(page)).toHaveCount(0);
  await patch(page, { honey: 15, syrup: 0, pollen: 12, brood: 6000, queenHealth: 100 });
  await openMatching(page, at, 'Enter');
  await patch(page, { pollen: null });
  await expect(status(page)).toHaveAttribute('data-interior-pattern-status', 'unavailable'); await expect(action(page)).toHaveCount(0); await close(page, false);
  expect(await heldMarks(page)).toEqual(held);
  expect(await page.locator('#matching-mark-decoy').evaluate(node => node.contains(document.activeElement))).toBe(false);
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
  fs.mkdirSync(artifacts, { recursive: true }); fs.writeFileSync(path.join(artifacts, 'hive-matching-mark-layout-' + mode + '-' + name + '.json'), JSON.stringify(result, null, 2));
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
    const file = 'preview-hive-matching-mark-' + mode + '-' + name + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x, y, width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-hive-matching-mark-' + mode + '-' + name + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('matching close-up action, focus, position controls and paired marks remain clear across five display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await mount(page);
  await keyboardActivate(page, status(page).locator('[data-interior-show-matching]'), 'Enter');
  await keyboardActivate(page, panel(page).locator('[data-interior-hold]'), 'Enter');
  await keyboardActivate(page, lensToggle(page), 'Enter'); let at = await position(page); await close(page, false);
  const before = await work(page), beforeAwards = await awards(page), held = await heldMarks(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    await page.setViewportSize({ width: mode === 'wide' ? 980 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode === 'forced' ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any; w.__ctx.isDark = mode === 'dark'; document.documentElement.style.fontSize = mode === 'large' ? '32px' : ''; w.ReactDOM.flushSync(() => w.__rerender()); }, mode);
    await page.keyboard.press('Tab'); await action(page).focus(); await expect(action(page)).toBeFocused();
    await audit(page, status(page), mode, 'status'); await capture(page, status(page), mode, 'status');
    at = await openMatching(page, at, mode === 'mobile' || mode === 'forced' ? 'Space' : 'Enter');
    await audit(page, lens(page), mode, 'lens'); await capture(page, lens(page), mode, 'lens');
    await close(page, true); expect(await heldMarks(page)).toEqual(held); expect(await work(page)).toEqual(before); expect(await awards(page)).toEqual(beforeAwards);
  }
  expect(errors).toEqual([]);
});

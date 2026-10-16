import { test, expect, Page, Locator } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const artifacts = path.resolve('.codex-artifacts/bee-lens-captions-2026-10-13');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

function panel(page: Page) { return page.locator('[data-hive-interior]'); }
function lens(page: Page) { return panel(page).locator('[data-interior-cell-lens]'); }
function pair(page: Page) { return lens(page).locator('.bee-interior-lens-pair'); }
function row(page: Page) { return lens(page).locator('[data-interior-lens-row]'); }
function column(page: Page) { return lens(page).locator('[data-interior-lens-column]'); }
function step(page: Page, id: string) { return lens(page).locator('[data-interior-lens-step="' + id + '"]'); }
function caption(page: Page, source: string) { return lens(page).locator('[data-lens-caption="' + source + '"]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function heldReadings(page: Page) { return panel(page).locator('[data-change-held]').allTextContents(); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function position(page: Page) { return { row: Number(await row(page).inputValue()), col: Number(await column(page).inputValue()) }; }
async function coordinates(page: Page, r: number, c: number) {
  // Displayed coordinates are one-based, while option values are zero-based.
  // Match values explicitly so a numeric string cannot select an earlier label.
  await row(page).selectOption({ value: String(r) }); await column(page).selectOption({ value: String(c) });
  await expect(row(page)).toHaveValue(String(r)); await expect(column(page)).toHaveValue(String(c));
}
async function mount(page: Page, withHeld = false) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive lens caption test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 2, hive3dFramesSeen: [2],
      hive3dPart: null, hive3dFoundQueen: false,
      notebook: {
        beekeeper: { prediction: 'Keep my prediction.', evidence: 'Keep <strong>my observation</strong> & punctuation.',
          explanation: 'Keep my explanation.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: true } },
        queen: { evidence: 'Keep my network writing.' }, drone: { evidence: 'Keep my flight writing.' },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await page.locator('[data-hive-interior-open]').focus(); await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-3d-bay="hive"]')).toHaveAttribute('data-beehive-3d-status', 'failed');
  const original = await work(page);
  if (withHeld) await panel(page).locator('[data-interior-hold]').click();
  await panel(page).locator('[data-interior-lens-toggle]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
  await coordinates(page, 4, 10); expect(await work(page)).toEqual(original);
}
async function modelLens(page: Page, data?: any) {
  const at = await position(page);
  return page.evaluate(({ data, at }) => {
    const w = window as any, current = w.__toolData.beehive;
    return w.__RR_TEST_EXPORTS__.beehive.bhHiveInteriorLens(data || current, current.hive3dFrame, at.row, at.col);
  }, { data, at });
}
async function assertShape(svg: Locator, role: string) {
  await expect(svg).toHaveAttribute('viewBox', '0 0 32 32');
  await expect(svg).toHaveAttribute('aria-hidden', 'true'); await expect(svg).toHaveAttribute('focusable', 'false');
  await expect(svg).toHaveAttribute('data-role', role); await expect(svg).toHaveClass(/bee-interior-key-symbol/);
  await expect(svg).toHaveClass(/bee-interior-study-symbol/);
  await expect(svg.locator('polygon')).toHaveCount(1);
  await expect(svg.locator('polygon')).toHaveAttribute('points', '16,2 28,9 28,23 16,30 4,23 4,9');
  if (role === 'empty') { await expect(svg.locator('path,circle')).toHaveCount(0); return; }
  if (role === 'honey' || role === 'pollen') {
    await expect(svg.locator('circle')).toHaveCount(0); await expect(svg.locator('path')).toHaveCount(1);
    const d = await svg.locator('path').getAttribute('d') || '';
    expect(d.match(/[a-z]/gi)).toEqual(role === 'honey' ? ['M', 'h', 'M', 'v'] : ['M', 'l']);
    const values = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (role === 'honey') { expect(values[2]).toBeCloseTo(8.4, 8); expect(values[5]).toBeCloseTo(8.4, 8); }
    else { expect(values[2]).toBeCloseTo(8.4, 8); expect(values[3]).toBeCloseTo(-8.4, 8); }
    return;
  }
  await expect(svg.locator('circle')).toHaveCount(1);
  expect(Number(await svg.locator('circle').getAttribute('r'))).toBeCloseTo(role === 'drone_brood' ? 7 : 4.2, 8);
  const fill = await svg.locator('circle').evaluate(node => getComputedStyle(node).fill);
  if (role === 'open_brood') { expect(fill).toBe('none'); await expect(svg.locator('path')).toHaveCount(0); }
  else {
    expect(fill).not.toBe('none'); expect(fill).not.toBe('rgba(0, 0, 0, 0)');
    await expect(svg.locator('path.bee-interior-cap-mark')).toHaveCount(1);
    const d = await svg.locator('path').getAttribute('d') || '';
    expect(d.match(/[a-z]/gi)).toEqual(['M', 'h']);
    expect(Number((d.match(/-?\d+(?:\.\d+)?/g) || [])[2])).toBeCloseTo(4.2, 8);
  }
}
async function assertCaption(page: Page, source: 'held' | 'current', data?: any) {
  const expected = await modelLens(page, data), element = caption(page, source);
  await expect(element).toHaveCount(1); expect(await element.evaluate(node => node.tagName)).toBe('FIGCAPTION');
  await expect(element.locator('[data-lens-mark="' + source + '"]')).toHaveText((source === 'held' ? 'Held' : 'Current') + ' mark: ' + expected.label);
  await expect(element.locator('[data-lens-caption-description="' + source + '"]')).toHaveText(expected.description);
  await expect(element.locator('button,select,input,a[href],[tabindex],[role="status"],[aria-live]')).toHaveCount(0);
  const order = await element.evaluate((node, source) => {
    const figure = node.parentElement!, drawing = figure.querySelector('[data-interior-' + source + '-lens]')!;
    const heading = node.querySelector('.bee-interior-figure-heading')!, label = node.querySelector('.bee-interior-lens-mark-label')!;
    return { single: figure.querySelectorAll('figcaption').length, firstChild: figure.firstElementChild === node,
      beforeDrawing: !!(node.compareDocumentPosition(drawing) & Node.DOCUMENT_POSITION_FOLLOWING),
      headingBeforeLabel: !!(heading.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING) };
  }, source);
  expect(order).toEqual({ single: 1, firstChild: true, beforeDrawing: true, headingBeforeLabel: true });
  const svg = element.locator('[data-lens-caption-symbol="' + source + '"]');
  await expect(svg).toHaveCount(expected.available ? 1 : 0);
  if (expected.available) await assertShape(svg, expected.roleId);
  else await expect(element.locator('svg,polygon,path,circle')).toHaveCount(0);
  return expected;
}

test('close-up captions identify all six marks and normalized foundation before the drawing without changing colony work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await expect(caption(page, 'held')).toHaveCount(0);
  for (const id of ['honey', 'pollen', 'open_brood', 'capped_brood', 'drone_brood', 'empty', 'foundation']) {
    const location = await page.evaluate(id => {
      const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
      for (let frame = 0; frame < 6; frame++) {
        const cell = BH.bhHiveInteriorFrameModel(w.__toolData.beehive, frame).cells.find((item: any) => item.role === id);
        if (cell) return { frame, row: cell.row, col: cell.col };
      }
      return null;
    }, id);
    expect(location, 'fixture must contain ' + id).not.toBeNull();
    await panel(page).locator('[data-interior-frame="' + location!.frame + '"]').click();
    const original = await work(page); await coordinates(page, location!.row, location!.col);
    const expected = await assertCaption(page, 'current'); expect(expected.roleId).toBe(id === 'foundation' ? 'empty' : id);
    await expect(caption(page, 'held')).toHaveCount(0); expect(await work(page)).toEqual(original);
  }
  // Choosing a different topic does not relabel the actual mark at these coordinates.
  await panel(page).locator('[data-interior-topic="queen"]').click();
  const original = await work(page); await assertCaption(page, 'current');
  await row(page).focus(); await page.keyboard.press('ArrowUp'); await expect(row(page)).toBeFocused();
  await assertCaption(page, 'current'); expect(await work(page)).toEqual(original);
  expect(errors).toEqual([]);
});

test('paired close-up captions follow changed marks and independent missing patterns while preserving references and keyboard navigation', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, true); const held = (await work(page)).beehive, heldValues = await heldReadings(page);
  await assertCaption(page, 'held', held); await assertCaption(page, 'current');
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const changed = await work(page);
  const at = await page.evaluate(held => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    return BH.bhHiveInteriorDiagramChanges(BH.bhHiveInteriorSnapshot(held), w.__toolData.beehive, 2).changes[0];
  }, held);
  expect(at).toBeTruthy(); await coordinates(page, at.row, at.col);
  const before = await assertCaption(page, 'held', held), current = await assertCaption(page, 'current');
  expect(before.roleId).not.toBe(current.roleId);
  await expect(lens(page).locator('[data-interior-lens-change]')).toHaveText('Diagram mark changed: ' + before.label + ' → ' + current.label + '.');
  expect(await work(page)).toEqual(changed); expect(await heldReadings(page)).toEqual(heldValues);
  await coordinates(page, 4, 10);
  for (const move of [{ id: 'up', key: 'Enter', r: 3 }, { id: 'down', key: 'Space', r: 4 }]) {
    await step(page, move.id).focus(); await page.keyboard.press(move.key); await expect(step(page, move.id)).toBeFocused();
    expect(await position(page)).toEqual({ row: move.r, col: 10 });
    await assertCaption(page, 'held', held); await assertCaption(page, 'current'); expect(await work(page)).toEqual(changed);
  }
  await fixture(page, { pollen: null }); const missingCurrent = await work(page);
  expect((await assertCaption(page, 'current')).available).toBe(false); expect((await assertCaption(page, 'held', held)).available).toBe(true);
  await step(page, 'down').focus(); await page.keyboard.press('Enter'); await expect(step(page, 'down')).toBeFocused();
  await assertCaption(page, 'held', held); await assertCaption(page, 'current'); expect(await work(page)).toEqual(missingCurrent);
  await panel(page).locator('[data-interior-hold]').click(); const missingHeld = (await work(page)).beehive;
  expect((await assertCaption(page, 'held', missingHeld)).available).toBe(false); await expect(row(page)).toBeDisabled();
  await fixture(page, { pollen: 12 }); const restored = await work(page);
  expect((await assertCaption(page, 'current')).available).toBe(true); expect((await assertCaption(page, 'held', missingHeld)).available).toBe(false);
  await expect(row(page)).toBeEnabled(); await coordinates(page, 3, 8);
  await assertCaption(page, 'current'); await assertCaption(page, 'held', missingHeld); expect(await work(page)).toEqual(restored);
  await fixture(page, { experimentRunSerial: held.experimentRunSerial + 1 }); const anotherRun = await work(page);
  await expect(caption(page, 'held')).toHaveCount(0); await assertCaption(page, 'current');
  await expect(panel(page).locator('[data-interior-comparison-status]')).toContainText('different run, seed or model');
  await panel(page).locator('[data-interior-clear]').click(); await expect(caption(page, 'held')).toHaveCount(0);
  await assertCaption(page, 'current'); expect(await work(page)).toEqual(anotherRun); expect(errors).toEqual([]);
});

async function audit(page: Page) {
  const result = await pair(page).evaluate(async node => {
    const results = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,strong,span,figure,figcaption'))];
    return {
      violations: results.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) })),
      overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: Array.from(node.querySelectorAll('strong,span')).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  await row(page).focus(); await page.keyboard.press('Tab'); await expect(step(page, 'up')).toBeFocused();
  const focus = await step(page, 'up').evaluate(node => { const css = getComputedStyle(node), box = node.getBoundingClientRect(); return { style: css.outlineStyle, outline: parseFloat(css.outlineWidth), width: box.width, height: box.height }; });
  expect(focus.style).not.toBe('none'); expect(focus.outline).toBeGreaterThanOrEqual(2); expect(focus.width).toBeGreaterThanOrEqual(44); expect(focus.height).toBeGreaterThanOrEqual(44);
}
async function captionLayout(page: Page, mode: string) {
  const alignment = await pair(page).evaluate(node => {
    const held = node.querySelector('[data-interior-held-lens]')!, current = node.querySelector('[data-interior-current-lens]')!;
    const a = held.getBoundingClientRect(), b = current.getBoundingClientRect();
    const first = held.closest('figure')!.getBoundingClientRect(), second = current.closest('figure')!.getBoundingClientRect();
    return { sideBySide: first.right <= second.left && Math.abs(first.top - second.top) < 1,
      topDifference: Math.abs(a.top - b.top), bottomDifference: Math.abs(a.bottom - b.bottom) };
  });
  if (mode === 'wide') expect(alignment.sideBySide).toBe(true);
  if (alignment.sideBySide) {
    expect(alignment.topDifference, 'paired drawings align despite different caption lengths').toBeLessThanOrEqual(1);
    expect(alignment.bottomDifference, 'paired drawings share the same bottom edge').toBeLessThanOrEqual(1);
  }
  if (mode === 'large') {
    const words = await pair(page).evaluate(node => {
      const results: { word: string; lineTops: number[] }[] = [];
      for (const element of Array.from(node.querySelectorAll('[data-lens-caption] .bee-interior-figure-heading strong,[data-lens-caption-description]'))) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let text: Node | null;
        while ((text = walker.nextNode())) {
          for (const match of (text.textContent || '').matchAll(/\b(reference|developing)\b/gi)) {
            const range = document.createRange(); range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length);
            results.push({ word: match[0].toLowerCase(), lineTops: Array.from(range.getClientRects()).filter(rect => rect.width > 0).map(rect => rect.top) });
          }
        }
      }
      return results;
    });
    expect(new Set(words.map(item => item.word))).toEqual(new Set(['reference', 'developing']));
    for (const item of words) {
      expect(item.lineTops.length, item.word + ' must remain visible').toBeGreaterThan(0);
      expect(Math.max(...item.lineTops) - Math.min(...item.lineTops), item.word + ' must not split inside the word').toBeLessThanOrEqual(1);
    }
  }
}
async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  const position = await pair(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = [];
  let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await pair(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-lens-captions-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-lens-captions-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('close-up captions remain readable above both diagrams across five accessible display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, true); const held = (await work(page)).beehive;
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const at = await page.evaluate(held => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const changes = BH.bhHiveInteriorDiagramChanges(BH.bhHiveInteriorSnapshot(held), w.__toolData.beehive, 2).changes;
    return changes.find((item: any) => /brood/.test(item.beforeRole) && /brood/.test(item.role)) || changes[0];
  }, held);
  expect(at).toBeTruthy(); await coordinates(page, at.row, at.col);
  const original = await work(page), values = await heldReadings(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await assertCaption(page, 'held', held); await assertCaption(page, 'current'); await audit(page); await captionLayout(page, mode); await capture(page, mode);
    expect(await work(page)).toEqual(mode === 'wide' ? original : { ...original, beehive: { ...original.beehive, focusLayout: false } });
    expect(await heldReadings(page)).toEqual(values); expect(await position(page)).toEqual({ row: at.row, col: at.col });
  }
  expect(errors).toEqual([]);
});

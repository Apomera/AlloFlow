import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import path from 'node:path';
import fs from 'node:fs';

const artifacts = path.resolve('.codex-artifacts/bee-frame-captions-2026-10-13');
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
function pair(page: Page) { return panel(page).locator('.bee-interior-frame-pair'); }
function frame(page: Page, index: number) { return panel(page).locator('[data-interior-frame="' + index + '"]'); }
function caption(page: Page, source: string) { return pair(page).locator('[data-frame-caption="' + source + '"]'); }
function drawing(page: Page, source: string) { return pair(page).locator(source === 'held' ? '[data-interior-held-diagram]' : '[data-hive-interior-diagram]'); }
async function work(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData))); }
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => { const w = window as any; w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch)); }, patch);
}
async function heldReadings(page: Page) { return panel(page).locator('[data-change-held]').allTextContents(); }
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Use the supported hive fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the hive frame caption test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000,
      honey: 40, syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: true, hive3dFrame: 2, hive3dFramesSeen: [2],
      hive3dPart: 'brood_frames', hive3dFoundQueen: false,
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
}
async function chooseFrame(page: Page, index: number) {
  const before = await work(page);
  await frame(page, index).focus(); await page.keyboard.press('Enter'); await expect(frame(page, index)).toBeFocused();
  await expect(frame(page, index)).toHaveAttribute('aria-pressed', 'true');
  expect(await work(page)).toEqual({ ...before, beehive: { ...before.beehive, hive3dFrame: index,
    hive3dPart: 'brood_frames', hive3dExploded: true, hive3dFramesSeen: [...new Set([...before.beehive.hive3dFramesSeen, index])] } });
}
async function hold(page: Page) {
  const before = await work(page);
  await panel(page).locator('[data-interior-hold]').focus(); await page.keyboard.press('Enter');
  await expect(caption(page, 'held')).toBeVisible(); expect(await work(page)).toEqual(before);
  return before.beehive;
}
async function assertCaption(page: Page, source: 'held' | 'current', held?: any) {
  const current = (await work(page)).beehive, data = source === 'held' ? held : current;
  expect(data).toBeTruthy();
  const model = await page.evaluate(({ data, frame }) => (window as any).__RR_TEST_EXPORTS__.beehive.bhHiveInteriorFrameModel(data, frame), { data, frame: current.hive3dFrame });
  const element = caption(page, source), svg = drawing(page, source);
  await expect(element).toHaveCount(1); expect(await element.evaluate(node => node.tagName)).toBe('FIGCAPTION');
  await expect(element.locator('.bee-interior-figure-heading strong')).toHaveText(source === 'held' ? 'Held reference' : 'Current colony');
  await expect(element.locator('.bee-interior-figure-heading span')).toHaveText('Day ' + (Number.isSafeInteger(data.day) && data.day >= 0 ? data.day : 'not recorded') + ' · Frame ' + (current.hive3dFrame + 1));
  const description = !model.patternKnown ? 'Pattern unavailable: one or more colony readings were not recorded.' : source === 'held'
    ? 'A fixed illustration from the held readings. Selecting another frame redraws that same reference.'
    : 'A model pattern, not a photograph or cell census. Six frames simplify a hive. Their layout and cell marks illustrate structure; real layouts vary.';
  await expect(element.locator('[data-frame-caption-description="' + source + '"]')).toHaveText(description);
  await expect(element.locator('button,select,input,a[href],[tabindex],[role="status"],[aria-live],svg')).toHaveCount(0);
  const order = await element.evaluate(node => {
    const figure = node.parentElement!, svg = figure.querySelector(':scope > svg')!;
    return { single: figure.querySelectorAll('figcaption').length, firstChild: figure.firstElementChild === node,
      beforeDrawing: !!(node.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING),
      labelBeforeDrawing: node.getBoundingClientRect().bottom <= svg.getBoundingClientRect().top + 1 };
  });
  expect(order).toEqual({ single: 1, firstChild: true, beforeDrawing: true, labelBeforeDrawing: true });
  await expect(svg).toHaveAttribute('viewBox', '0 0 610 325'); await expect(svg).toHaveAttribute('role', 'img');
  await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  const name = await svg.getAttribute('aria-label');
  expect(name).toContain((source === 'held' ? 'Held reference. ' : 'Current colony. ') + 'Frame ' + (current.hive3dFrame + 1) + ' of 6,');
  expect(name).toContain('Schematic comb pattern.');
  expect(name!.includes('Pattern unavailable.')).toBe(!model.patternKnown);
  const cells = svg.locator(source === 'held' ? '[data-held-cell]' : '[data-interior-cell]');
  const rendered = await cells.evaluateAll((nodes, source) => nodes.map(node => ({
    position: node.getAttribute('data-interior-cell-position'), role: node.getAttribute(source === 'held' ? 'data-held-cell' : 'data-interior-cell'),
    polygons: node.querySelectorAll(':scope > polygon').length, picks: node.classList.contains('bee-interior-cell-pick'),
  })), source);
  expect(rendered).toEqual(model.cells.map((cell: any) => ({ position: cell.row + ':' + cell.col, role: cell.role, polygons: 1, picks: model.patternKnown })));
  expect(rendered).toHaveLength(231);
  return model;
}

test('overview captions identify all frames before their drawings and follow held current and unavailable readings without changing work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await expect(caption(page, 'held')).toHaveCount(0);
  for (let index = 0; index < 6; index++) { await chooseFrame(page, index); await assertCaption(page, 'current'); }
  await chooseFrame(page, 2);
  const initial = await work(page), currentCells = await drawing(page, 'current').locator('[data-interior-cell]').evaluateAll(nodes => nodes.map(node => node.innerHTML));
  let held = await hold(page); const heldValues = await heldReadings(page);
  expect(await drawing(page, 'current').locator('[data-interior-cell]').evaluateAll(nodes => nodes.map(node => node.innerHTML))).toEqual(currentCells);
  await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  for (let index = 0; index < 6; index++) {
    await chooseFrame(page, index); await assertCaption(page, 'held', held); await assertCaption(page, 'current');
    expect(await heldReadings(page)).toEqual(heldValues);
  }
  await chooseFrame(page, 2); const exploring = await work(page);
  // Both overviews still open the matching close-up, with the existing heading receiving focus.
  for (const source of ['held', 'current']) {
    await drawing(page, source).locator('[data-interior-cell-position="4:10"]').click();
    await expect(page.locator('#beehive-interior-lens-title')).toBeFocused();
    await expect(panel(page).locator('[data-interior-lens-row]')).toHaveValue('4');
    await expect(panel(page).locator('[data-interior-lens-column]')).toHaveValue('10');
    await assertCaption(page, 'held', held); await assertCaption(page, 'current');
    await expect(panel(page).locator('.bee-interior-lens-pair [data-lens-caption]')).toHaveCount(2);
    expect(await work(page)).toEqual(exploring);
  }
  await panel(page).locator('[data-interior-topic="queen"]').click();
  await expect(panel(page).locator('[data-interior-highlight-note]')).toHaveText('Queen topic selected. The cutaway does not mark the queen’s location.');
  await expect(pair(page).locator('[data-highlighted="true"]')).toHaveCount(0);
  await assertCaption(page, 'held', held); await assertCaption(page, 'current'); expect(await work(page)).toEqual(exploring);
  held = await hold(page); await assertCaption(page, 'held', held); await assertCaption(page, 'current');
  await fixture(page, { pollen: null }); const missing = await work(page);
  expect((await assertCaption(page, 'current')).patternKnown).toBe(false); expect((await assertCaption(page, 'held', held)).patternKnown).toBe(true);
  expect(await work(page)).toEqual(missing);
  held = await hold(page); expect((await assertCaption(page, 'held', held)).patternKnown).toBe(false);
  await fixture(page, { day: 17, pollen: 12 }); const restored = await work(page);
  expect((await assertCaption(page, 'current')).patternKnown).toBe(true); expect((await assertCaption(page, 'held', held)).patternKnown).toBe(false);
  await panel(page).locator('[data-interior-clear]').click(); await expect(caption(page, 'held')).toHaveCount(0);
  await assertCaption(page, 'current'); expect(await work(page)).toEqual(restored);
  await fixture(page, { day: null }); const missingDay = await work(page); await assertCaption(page, 'current');
  await expect(panel(page).locator('[data-interior-hold]')).toBeDisabled(); expect(await work(page)).toEqual(missingDay);
  expect(missingDay.beehive.notebook).toEqual(initial.beehive.notebook); expect(missingDay.beehive.actionPoints).toBe(initial.beehive.actionPoints);
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await pair(page).evaluate(async node => {
    const results = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const elements = [node, ...Array.from(node.querySelectorAll('div,strong,span,figure,figcaption'))];
    const drawings = Array.from(node.querySelectorAll('figure > svg')).map(svg => {
      const a = svg.getBoundingClientRect(), b = svg.closest('figure')!.getBoundingClientRect();
      return { top: a.top, bottom: a.bottom, left: b.left, right: b.right, figureTop: b.top, width: a.width, height: a.height };
    });
    return {
      violations: results.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => ({ target: entry.target, reason: entry.failureSummary })) })),
      overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      text: Array.from(node.querySelectorAll('strong,span')).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, drawings,
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.pageOverflow).toBeLessThanOrEqual(1);
  for (const item of result.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
  for (const item of result.drawings) { expect(item.width).toBeGreaterThan(100); expect(item.width / item.height).toBeCloseTo(610 / 325, 2); }
  if (result.drawings.length === 2) {
    const [a, b] = result.drawings, sideBySide = a.right <= b.left && Math.abs(a.figureTop - b.figureTop) < 1;
    if (mode === 'wide') expect(sideBySide).toBe(true);
    if (sideBySide) { expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(1); expect(Math.abs(a.bottom - b.bottom)).toBeLessThanOrEqual(1); }
  }
  await frame(page, 2).focus(); await page.keyboard.press('Enter'); await expect(frame(page, 2)).toBeFocused();
  await page.keyboard.press('Tab'); await expect(frame(page, 3)).toBeFocused();
  const focus = await frame(page, 3).evaluate(node => { const css = getComputedStyle(node), box = node.getBoundingClientRect(); return { style: css.outlineStyle, outline: parseFloat(css.outlineWidth), width: box.width, height: box.height }; });
  expect(focus.style).not.toBe('none'); expect(focus.outline).toBeGreaterThanOrEqual(2); expect(focus.width).toBeGreaterThanOrEqual(44); expect(focus.height).toBeGreaterThanOrEqual(44);
  if (mode === 'large') {
    const words = await pair(page).evaluate(node => {
      const results: { word: string; lineTops: number[] }[] = [];
      for (const element of Array.from(node.querySelectorAll('[data-frame-caption] strong,[data-frame-caption-description]'))) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let text: Node | null;
        while ((text = walker.nextNode())) {
          for (const match of (text.textContent || '').matchAll(/\b(reference|photograph|structure)\b/gi)) {
            const range = document.createRange(); range.setStart(text, match.index!); range.setEnd(text, match.index! + match[0].length);
            results.push({ word: match[0].toLowerCase(), lineTops: Array.from(range.getClientRects()).filter(rect => rect.width > 0).map(rect => rect.top) });
          }
        }
      }
      return results;
    });
    expect(new Set(words.map(item => item.word))).toEqual(new Set(['reference', 'photograph', 'structure']));
    for (const item of words) { expect(item.lineTops.length).toBeGreaterThan(0); expect(Math.max(...item.lineTops) - Math.min(...item.lineTops), item.word + ' must not split inside the word').toBeLessThanOrEqual(1); }
  }
}
async function capture(page: Page, mode: string) {
  fs.mkdirSync(artifacts, { recursive: true });
  const position = await pair(page).evaluate(node => { const box = node.getBoundingClientRect(); return { top: box.top + window.scrollY, height: box.height }; });
  const tiles: { file: string; offset: number; height: number }[] = []; let offset = 0;
  while (offset < position.height) {
    expect(tiles.length).toBeLessThan(10); await page.evaluate(top => window.scrollTo(0, Math.floor(top)), position.top + offset);
    const box = await pair(page).boundingBox(); expect(box).not.toBeNull(); const y = box!.y + offset; expect(y).toBeGreaterThanOrEqual(0);
    const height = Math.min(1000, position.height - offset, page.viewportSize()!.height - y); expect(height).toBeGreaterThan(0);
    const file = 'preview-frame-captions-' + mode + (tiles.length ? '-' + (tiles.length + 1) : '') + '.png';
    await page.screenshot({ path: path.join(artifacts, file), animations: 'disabled', fullPage: false, clip: { x: box!.x, y, width: box!.width, height }, timeout: 120000 });
    tiles.push({ file, offset, height }); offset += height;
  }
  fs.writeFileSync(path.join(artifacts, 'preview-frame-captions-' + mode + '-tiles.json'), JSON.stringify({ viewport: page.viewportSize(), contextHeight: position.height, tiles }, null, 2));
}

test('overview captions remain readable before aligned diagrams across five accessible display modes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await assertCaption(page, 'current'); await audit(page, 'wide');
  const held = await hold(page); await fixture(page, { day: 16, honey: 45, brood: 4200, queenHealth: 85 });
  const original = await work(page), values = await heldReadings(page);
  for (const mode of ['wide', 'mobile', 'dark', 'forced', 'large']) {
    if (mode === 'mobile') { await fixture(page, { focusLayout: false }); await page.setViewportSize({ width: 320, height: 1800 }); }
    if (mode === 'dark') await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'large') {
      await page.emulateMedia({ forcedColors: 'none' });
      await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
    }
    await assertCaption(page, 'held', held); await assertCaption(page, 'current'); await audit(page, mode); await capture(page, mode);
    expect(await work(page)).toEqual(mode === 'wide' ? original : { ...original, beehive: { ...original.beehive, focusLayout: false } });
    expect(await heldReadings(page)).toEqual(values);
  }
  expect(errors).toEqual([]);
});
